import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { geminiModel, extractJSON } from '@/utils/gemini';

export const maxDuration = 60;

interface WrongAnswer {
  question: string;
  selected: string;
  correct: string;
}

interface GenerateCourseRequest {
  quiz_id: string;
  initial_score: number;
  wrong_answers: WrongAnswer[];
}

interface GenerateCourseResponse {
  status: string;
  pain_points_identified: string[];
  smart_slides: { type: 'concept'; title: string; content: string }[];
}

export async function POST(request: NextRequest) {
  try {
    // --- Parse JSON body ---
    const body: GenerateCourseRequest = await request.json();
    const { quiz_id, initial_score, wrong_answers } = body;

    if (!quiz_id || initial_score === undefined || !Array.isArray(wrong_answers)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les champs quiz_id, initial_score et wrong_answers sont requis.' },
        { status: 400 }
      );
    }

    // --- Fetch existing quiz row ---
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id, student_id, initial_quiz_json, raw_ocr_text')
      .eq('id', quiz_id)
      .single();
    if (fetchError || !quiz) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Quiz introuvable.' },
        { status: 404 }
      );
    }

    // --- Build prompt ---
    const wrongAnswersList = wrong_answers
      .map((wa, i) => `${i + 1}. Question: "${wa.question}"\n   L'élève a répondu: "${wa.selected}"\n   Bonne réponse: "${wa.correct}"`)
      .join('\n');

    const contextText = quiz.raw_ocr_text
      ? `\nOriginal lesson text:\n${quiz.raw_ocr_text}\n`
      : '';

    const prompt = `You are a pedagogical AI assistant for primary school students.

A student just completed an initial evaluation quiz and scored ${initial_score} out of 5.
${contextText}
Here are the questions they got WRONG:
${wrongAnswersList || 'The student answered all questions correctly.'}

Your tasks:
1. Identify the specific pedagogical pain points (concepts the student struggles with).
2. Generate 3 to 5 "Smart Slides" — short, clear micro-lessons that explain each concept simply.
   - Each slide should teach ONE concept at a time.
   - Use simple language appropriate for a primary school student.
   - If the student got a perfect score, generate reinforcement slides that deepen understanding.

CRITICAL RULES:
- Auto-detect the language from the questions (French or Arabic) and respond in the SAME language.
- Return ONLY valid JSON, no additional text or markdown.
- Each slide must have type: "concept".

Return this exact JSON structure:
{
  "status": "success",
  "pain_points_identified": ["pain point 1", "pain point 2"],
  "smart_slides": [
    {
      "type": "concept",
      "title": "slide title",
      "content": "clear explanation of the concept"
    }
  ]
}`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = extractJSON<GenerateCourseResponse>(responseText);

    // --- Validate parsed response ---
    if (!parsed.smart_slides || !Array.isArray(parsed.smart_slides) || parsed.smart_slides.length === 0) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: 'Gemini n\'a pas retourné de slides valides.' },
        { status: 502 }
      );
    }

    // --- Update quizzes row ---
    const { error: dbError } = await supabaseAdmin
      .from('quizzes')
      .update({
        initial_score,
        generated_course_json: {
          status: 'success',
          pain_points_identified: parsed.pain_points_identified,
          smart_slides: parsed.smart_slides,
        },
      })
      .eq('id', quiz_id);

    if (dbError) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Échec de la mise à jour du quiz.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz_id,
      pain_points_identified: parsed.pain_points_identified,
      smart_slides: parsed.smart_slides,
    });
  } catch (error) {
    console.error('[generate-course] Error:', error);
    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: 'Erreur lors de la génération du cours.' },
      { status: 500 }
    );
  }
}
