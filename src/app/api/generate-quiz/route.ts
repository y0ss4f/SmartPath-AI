import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { geminiModel, extractJSON, fileToGenerativePart } from '@/utils/gemini';

export const maxDuration = 60;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface GenerateQuizResponse {
  status: string;
  raw_ocr_text: string;
  quiz_questions: { question: string; options: string[]; correct_answer: string }[];
}

export async function POST(request: NextRequest) {
  try {
    // --- Auth: verify parent session ---
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Vous devez être connecté.' },
        { status: 401 }
      );
    }

    // --- Parse multipart form data ---
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const studentId = formData.get('student_id') as string | null;
    const subject = (formData.get('subject') as string | null) || null;

    if (!image || !studentId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les champs image et student_id sont requis.' },
        { status: 400 }
      );
    }

    // --- Validate image ---
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: `Type de fichier non supporté: ${image.type}` },
        { status: 400 }
      );
    }
    if (image.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'L\'image dépasse la taille maximale de 10 Mo.' },
        { status: 400 }
      );
    }

    // --- Verify parent owns this student ---
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, parent_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Élève introuvable.' },
        { status: 404 }
      );
    }
    if (student.parent_id !== user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Cet élève ne vous appartient pas.' },
        { status: 403 }
      );
    }

    // --- Send to Gemini Vision ---
    const imagePart = await fileToGenerativePart(image);

    const prompt = `You are an educational AI assistant for primary school students.

Analyze this handwritten notebook photo carefully:
1. Extract ALL the text you can read from the image (OCR).
2. Auto-detect the language (French or Arabic).
3. Generate exactly 5 multiple-choice questions (MCQ) that test the student's understanding of the material shown in the photo.

CRITICAL RULES:
- Each question must have exactly 4 answer options.
- The correct_answer must be one of the 4 options (word-for-word match).
- All questions and options must be in the SAME language as the handwritten text.
- Questions must be based ONLY on the content visible in the photo.
- Return ONLY valid JSON, no additional text or markdown.

Return this exact JSON structure:
{
  "status": "success",
  "raw_ocr_text": "the full extracted text from the image",
  "quiz_questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "the correct option (must match one of the 4 options exactly)"
    }
  ]
}`;

    const result = await geminiModel.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = extractJSON<GenerateQuizResponse>(responseText);

    // --- Validate parsed response ---
    if (!parsed.quiz_questions || !Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length === 0) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: 'Gemini n\'a pas retourné de questions valides.' },
        { status: 502 }
      );
    }

    // --- Insert into quizzes table ---
    const { data: quiz, error: dbError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        student_id: studentId,
        subject,
        raw_ocr_text: parsed.raw_ocr_text || null,
        initial_quiz_json: {
          status: 'success',
          quiz_questions: parsed.quiz_questions,
        },
      })
      .select('id')
      .single();

    if (dbError || !quiz) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Échec de la sauvegarde du quiz.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz_id: quiz.id,
      quiz_questions: parsed.quiz_questions,
    });
  } catch (error: any) {
    console.error('[generate-quiz] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: `Erreur: ${errorMsg}` },
      { status: 500 }
    );
  }
}
