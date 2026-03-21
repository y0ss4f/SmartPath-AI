import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { geminiModel, extractJSON } from '@/utils/gemini';

export const maxDuration = 60;

interface GenerateFinalQuizResponse {
  status: string;
  quiz_questions: { question: string; options: string[]; correct_answer: string }[];
}

export async function POST(request: NextRequest) {
  try {
    // --- Parse JSON body ---
    const body = await request.json();
    const { quiz_id } = body;

    if (!quiz_id) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le champ quiz_id est requis.' },
        { status: 400 }
      );
    }

    // --- Fetch quiz with generated course ---
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id, student_id, generated_course_json, raw_ocr_text')
      .eq('id', quiz_id)
      .single();
    if (fetchError || !quiz) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Quiz introuvable.' },
        { status: 404 }
      );
    }

    if (!quiz.generated_course_json) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le cours n\'a pas encore été généré pour ce quiz. Complétez d\'abord l\'étape B.' },
        { status: 400 }
      );
    }

    const course = quiz.generated_course_json as {
      pain_points_identified: string[];
      smart_slides: { type: string; title: string; content: string }[];
    };

    // --- Build prompt ---
    const painPointsList = course.pain_points_identified
      .map((pp: string, i: number) => `${i + 1}. ${pp}`)
      .join('\n');

    const slidesSummary = course.smart_slides
      .map((s: { title: string; content: string }, i: number) => `Slide ${i + 1}: "${s.title}"\n${s.content}`)
      .join('\n\n');

    const prompt = `You are a pedagogical AI assistant for primary school students.

A student just reviewed a micro-course (Smart Slides) designed to address their weak points.

Pain points that were identified:
${painPointsList}

Smart Slides the student reviewed:
${slidesSummary}

Your task: Generate exactly 5 NEW multiple-choice questions (MCQ) that specifically re-evaluate the student on the pain points above. The questions should test whether the student understood the concepts from the Smart Slides.

CRITICAL RULES:
- Each question must have exactly 4 answer options.
- The correct_answer must be one of the 4 options (word-for-word match).
- Questions must be DIFFERENT from the initial quiz — do NOT repeat questions.
- Auto-detect the language from the slides (French or Arabic) and respond in the SAME language.
- Return ONLY valid JSON, no additional text or markdown.

Return this exact JSON structure:
{
  "status": "success",
  "quiz_questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "the correct option (must match one of the 4 options exactly)"
    }
  ]
}`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = extractJSON<GenerateFinalQuizResponse>(responseText);

    // --- Validate parsed response ---
    if (!parsed.quiz_questions || !Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length === 0) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: 'Gemini n\'a pas retourné de questions valides.' },
        { status: 502 }
      );
    }

    // --- Update quizzes row ---
    const { error: dbError } = await supabaseAdmin
      .from('quizzes')
      .update({
        final_quiz_json: {
          status: 'success',
          quiz_questions: parsed.quiz_questions,
        },
      })
      .eq('id', quiz_id);

    if (dbError) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Échec de la mise à jour du quiz final.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz_id,
      quiz_questions: parsed.quiz_questions,
    });
  } catch (error) {
    console.error('[generate-final-quiz] Error:', error);
    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: 'Erreur lors de la génération du quiz final.' },
      { status: 500 }
    );
  }
}
