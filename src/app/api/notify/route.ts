import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Flow D: Notification Pipeline
// Called after final_score is saved. Sends a WhatsApp message to the parent
// via Meta Cloud API. Returns 200 even on WhatsApp failure so the student
// results screen is never blocked by a notification error.

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id } = body;

    if (!quiz_id) {
      console.error('[notify] Missing quiz_id in request body');
      return NextResponse.json({ status: 'error', reason: 'missing_quiz_id' });
    }

    // 1. Fetch the quiz row
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('id, subject, initial_score, final_score, student_id')
      .eq('id', quiz_id)
      .single();

    if (quizError || !quiz) {
      console.error('[notify] Quiz not found:', quiz_id, quizError?.message);
      return NextResponse.json({ status: 'error', reason: 'quiz_not_found' });
    }

    if (quiz.initial_score === null || quiz.final_score === null) {
      console.error('[notify] Scores missing for quiz:', quiz_id, { initial: quiz.initial_score, final: quiz.final_score });
      return NextResponse.json({ status: 'skipped', reason: 'scores_missing' });
    }

    // 2. Fetch the student to get parent_id
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, parent_id')
      .eq('id', quiz.student_id)
      .single();

    if (studentError || !student) {
      console.error('[notify] Student not found:', quiz.student_id, studentError?.message);
      return NextResponse.json({ status: 'error', reason: 'student_not_found' });
    }

    // 3. Get phone number — check profiles first, then fall back to auth metadata
    // (accounts created before the DB trigger was wired have phone in auth metadata only)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .eq('id', student.parent_id)
      .single();

    let rawPhone = profile?.phone_number ?? null;

    if (!rawPhone) {
      // Fallback: read from Supabase Auth user metadata
      console.log('[notify] phone_number null in profiles, checking auth metadata for parent:', student.parent_id);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(student.parent_id);

      if (authError || !authData?.user) {
        console.error('[notify] Could not fetch auth user:', student.parent_id, authError?.message);
        return NextResponse.json({ status: 'skipped', reason: 'no_phone_number' });
      }

      rawPhone = authData.user.user_metadata?.phone_number ?? null;

      if (rawPhone) {
        // Backfill profiles so future calls don't need this fallback
        console.log('[notify] Backfilling phone_number into profiles for parent:', student.parent_id);
        await supabaseAdmin
          .from('profiles')
          .update({ phone_number: rawPhone })
          .eq('id', student.parent_id);
      }
    }

    if (!rawPhone) {
      console.warn('[notify] No phone number found anywhere for parent:', student.parent_id);
      return NextResponse.json({ status: 'skipped', reason: 'no_phone_number' });
    }

    // Meta WhatsApp API v19 expects the number WITHOUT the leading '+'
    // e.g. +21698XXXXXX → 21698XXXXXX
    const phoneNumber = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;

    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.error('[notify] META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_NUMBER_ID not set in env');
      return NextResponse.json({ status: 'skipped', reason: 'whatsapp_not_configured' });
    }

    const subject = quiz.subject ?? 'la matière étudiée';
    const initialScore = quiz.initial_score;
    const finalScore = quiz.final_score;
    const delta = finalScore - initialScore;

    const suffix =
      delta > 0
        ? `Bravo, une progression de +${delta} point(s) ! 🎉`
        : delta === 0
        ? `Score stable. Continuez à pratiquer ! 💪`
        : `Encouragez-le à revoir la leçon. 📚`;

    const messageText =
      `SmartPath AI : ${student.name} a terminé son diagnostic et sa révision pour ${subject}. ` +
      `Score initial : ${initialScore}/12. ` +
      `Score final après révision : ${finalScore}/12. ` +
      suffix;

    console.log('[notify] Sending WhatsApp to:', phoneNumber, '| message:', messageText);

    const whatsappRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: messageText },
        }),
      }
    );

    const responseBody = await whatsappRes.text();

    if (!whatsappRes.ok) {
      console.error('[notify] WhatsApp API rejected request. Status:', whatsappRes.status, '| Body:', responseBody);
      return NextResponse.json({ status: 'whatsapp_error', code: whatsappRes.status, detail: responseBody });
    }

    console.log('[notify] ✅ WhatsApp sent to:', phoneNumber, '| API response:', responseBody);
    return NextResponse.json({ status: 'sent', to: phoneNumber });

  } catch (error) {
    console.error('[notify] Unexpected error:', error);
    return NextResponse.json({ status: 'error', message: String(error) });
  }
}
