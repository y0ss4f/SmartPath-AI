import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Called by the unauthenticated student page after grading the final quiz.
// quiz_id (UUID) serves as the implicit access token — unguessable by design.
// The final_score stored here is consumed by Sprint 5's /api/notify route.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id, final_score } = body;

    if (!quiz_id || final_score === undefined || typeof final_score !== 'number') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les champs quiz_id et final_score (nombre) sont requis.' },
        { status: 400 }
      );
    }

    if (final_score < 0 || final_score > 5 || !Number.isInteger(final_score)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'final_score doit être un entier entre 0 et 5.' },
        { status: 400 }
      );
    }

    // Verify the quiz exists before updating
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id, final_quiz_json')
      .eq('id', quiz_id)
      .single();

    if (fetchError || !quiz) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Quiz introuvable.' },
        { status: 404 }
      );
    }

    if (!quiz.final_quiz_json) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le quiz final n\'a pas encore été généré.' },
        { status: 400 }
      );
    }

    const { error: dbError } = await supabaseAdmin
      .from('quizzes')
      .update({ final_score })
      .eq('id', quiz_id);

    if (dbError) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Échec de la sauvegarde du score final.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ quiz_id, final_score });
  } catch (error) {
    console.error('[submit-score] Error:', error);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Erreur lors de la sauvegarde du score.' },
      { status: 500 }
    );
  }
}
