import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { geminiModel, extractJSON } from '@/utils/gemini';
import { MATH_CURRICULUM } from '@/constants/mathCurriculum';

export const maxDuration = 60;

interface QuizQuestionResponse {
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface SmartSlideResponse {
  type: 'concept';
  title: string;
  content: string;
}

interface GenerateQuizResponse {
  status: string;
  quiz_questions: QuizQuestionResponse[];
  smart_slides: SmartSlideResponse[];
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

    // --- Parse JSON body ---
    const body = await request.json();
    const { student_id, grade, unit } = body;

    if (!student_id || !grade || !unit) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les champs student_id, grade et unit sont requis.' },
        { status: 400 }
      );
    }

    // --- Validate grade and unit against curriculum ---
    const validUnits = MATH_CURRICULUM[grade];
    if (!validUnits) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: `Niveau scolaire invalide: ${grade}` },
        { status: 400 }
      );
    }
    if (!validUnits.includes(unit)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: `Unité invalide pour le niveau ${grade}: ${unit}` },
        { status: 400 }
      );
    }

    // --- Verify parent owns this student ---
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, parent_id, grade_level')
      .eq('id', student_id)
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

    // --- Send to Gemini ---
    const prompt = `You are a Tunisian primary school math teacher AI. You create assessments aligned with the official Tunisian math curriculum.

Grade: ${grade}
Unit: ${unit}

Generate a complete structured assessment in ARABIC containing:

1. QUIZ: Exactly 12 multiple-choice questions (MCQ) about "${unit}" for a ${grade} student, tagged by difficulty:
   - 3 Easy (سهل) — basic recall and direct application
   - 3 Medium (متوسط) — application requiring one reasoning step  
   - 3 Hard (صعب) — multi-step reasoning and problem solving
   - 3 Expert (خبير) — complex, novel problems requiring deep understanding

2. SMART SLIDES: 4 to 6 teaching slides covering the key concepts of "${unit}". Each slide should:
   - Teach ONE concept at a time
   - Use simple Arabic language appropriate for a ${grade} primary school student
   - Include worked examples with step-by-step solutions
   - Use Latin numerals (1, 2, 3...) for all numbers, NOT Arabic-Indic numerals (١, ٢, ٣)

CRITICAL RULES:
- ALL text (questions, options, slides) MUST be in Arabic.
- Use Latin numerals (1, 2, 3, +, -, ×, ÷, =) for all mathematical expressions.
- Each question must have exactly 4 answer options.
- The correct_answer must be one of the 4 options (word-for-word match).
- The difficulty field must be exactly one of: "easy", "medium", "hard", "expert".
- Questions must progress from easy to expert in order.
- Return ONLY valid JSON, no additional text or markdown.

Return this exact JSON structure:
{
  "status": "success",
  "quiz_questions": [
    {
      "question": "Arabic question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "the correct option (must match one of the 4 options exactly)",
      "difficulty": "easy"
    }
  ],
  "smart_slides": [
    {
      "type": "concept",
      "title": "Arabic slide title",
      "content": "Arabic explanation with examples using Latin numerals"
    }
  ]
}`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = extractJSON<GenerateQuizResponse>(responseText);

    // --- Validate parsed response ---
    if (!parsed.quiz_questions || !Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length < 12) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: `Gemini n'a retourné que ${parsed.quiz_questions?.length ?? 0} questions au lieu de 12.` },
        { status: 502 }
      );
    }

    if (!parsed.smart_slides || !Array.isArray(parsed.smart_slides) || parsed.smart_slides.length === 0) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: 'Gemini n\'a pas retourné de slides.' },
        { status: 502 }
      );
    }

    // Ensure exactly 12 questions (trim if Gemini returned more)
    const quiz_questions = parsed.quiz_questions.slice(0, 12);

    // --- Insert into quizzes table ---
    const { data: quiz, error: dbError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        student_id,
        subject: 'Mathématiques',
        grade,
        unit,
        initial_quiz_json: {
          status: 'success',
          quiz_questions,
        },
        generated_course_json: {
          status: 'success',
          pain_points_identified: [],
          smart_slides: parsed.smart_slides,
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
      quiz_questions,
      smart_slides: parsed.smart_slides,
    });
  } catch (error: unknown) {
    console.error('[generate-quiz] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: `Erreur: ${errorMsg}` },
      { status: 500 }
    );
  }
}
