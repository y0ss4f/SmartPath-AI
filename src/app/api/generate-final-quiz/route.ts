import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { geminiModel, extractJSON } from '@/utils/gemini';
import { getTextbookFileUri } from '@/utils/textbook';

export const maxDuration = 60;

interface QuizQuestionResponse {
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface GenerateFinalQuizResponse {
  status: string;
  quiz_questions: QuizQuestionResponse[];
}

interface WrongAnswer {
  question: string;
  selected: string;
  correct: string;
}

export async function POST(request: NextRequest) {
  try {
    // --- Parse JSON body ---
    const body = await request.json();
    const { quiz_id, wrong_answers, initial_score } = body;

    if (!quiz_id) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le champ quiz_id est requis.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(wrong_answers)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le champ wrong_answers (tableau) est requis.' },
        { status: 400 }
      );
    }

    if (initial_score === undefined || typeof initial_score !== 'number') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le champ initial_score (nombre) est requis.' },
        { status: 400 }
      );
    }

    // --- Fetch quiz with generated course, grade, and unit ---
    const { data: quiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('id, student_id, generated_course_json, grade, unit')
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
        { error: 'INVALID_INPUT', message: 'Les slides n\'ont pas encore été générées pour ce quiz.' },
        { status: 400 }
      );
    }

    const rawCourse = quiz.generated_course_json as Record<string, unknown>;
    if (!rawCourse || !Array.isArray(rawCourse.smart_slides) || rawCourse.smart_slides.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les slides du cours sont malformées ou vides.' },
        { status: 400 }
      );
    }
    const course = rawCourse as {
      pain_points_identified: string[];
      smart_slides: { type: string; title: string; content: string }[];
    };

    // --- Save initial score ---
    await supabaseAdmin
      .from('quizzes')
      .update({ initial_score })
      .eq('id', quiz_id);

    // --- Build wrong answers and slides context ---
    const wrongAnswersList = (wrong_answers as WrongAnswer[])
      .map((wa: WrongAnswer, i: number) => `${i + 1}. السؤال: "${wa.question}"\n   إجابة التلميذ: "${wa.selected}"\n   الإجابة الصحيحة: "${wa.correct}"`)
      .join('\n');

    const slidesSummary = course.smart_slides
      .map((s: { title: string; content: string }, i: number) => `الشريحة ${i + 1}: "${s.title}"\n${s.content}`)
      .join('\n\n');

    // --- Fetch textbook context (RAG via Gemini File API) ---
    let textbookFileUri: string | null = null;
    try {
      if (quiz.grade) {
        textbookFileUri = await getTextbookFileUri(quiz.grade);
        if (textbookFileUri) {
          console.log(`[generate-final-quiz] Textbook found for grade "${quiz.grade}": ${textbookFileUri}`);
        }
      }
    } catch (err) {
      console.warn('[generate-final-quiz] Textbook retrieval failed, continuing without:', err);
    }

    const textbookInstruction = textbookFileUri
      ? `\n\nIMPORTANT — TEXTBOOK GROUNDING:
The attached PDF is the official Tunisian math textbook for grade ${quiz.grade}.
- You MUST base your questions on the methodology, terminology, and problem types found in the textbook's chapter on "${quiz.unit || 'unknown'}".
- Ensure the re-evaluation questions align with the textbook's teaching approach.
- Generate questions that test the same skills the textbook emphasizes.`
      : '';

    const prompt = `You are a Tunisian primary school math teacher AI.

A student in grade ${quiz.grade || 'unknown'} just completed an initial evaluation quiz on the unit "${quiz.unit || 'unknown'}" and scored ${initial_score} out of 12.${textbookInstruction}

They then reviewed these Smart Slides:
${slidesSummary}

Here are the questions they got WRONG:
${wrongAnswersList || 'The student answered all questions correctly.'}

Your task: Generate exactly 12 NEW multiple-choice questions (MCQ) that specifically re-evaluate the student on the concepts from "${quiz.unit || 'unknown'}". The questions should focus on areas where the student struggled, while also testing the concepts covered in the Smart Slides.

The 12 questions must be split into 4 difficulty levels:
- 3 Easy (سهل) — basic recall and direct application  
- 3 Medium (متوسط) — application requiring one reasoning step
- 3 Hard (صعب) — multi-step reasoning and problem solving
- 3 Expert (خبير) — complex, novel problems requiring deep understanding

CRITICAL RULES:
- ALL text must be in Arabic.
- Use Latin numerals (1, 2, 3, +, -, ×, ÷, =) for all mathematical expressions.
- Each question must have exactly 4 answer options.
- The correct_answer must be one of the 4 options (word-for-word match).
- The difficulty field must be exactly one of: "easy", "medium", "hard", "expert".
- Questions must be DIFFERENT from the initial quiz — do NOT repeat questions.
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
  ]
}`;

    // --- Call Gemini (with or without textbook file) ---
    const contentParts: Parameters<typeof geminiModel.generateContent>[0] = textbookFileUri
      ? [
          {
            fileData: {
              mimeType: 'application/pdf',
              fileUri: textbookFileUri,
            },
          },
          { text: prompt },
        ]
      : prompt;

    let responseText = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await geminiModel.generateContent(contentParts);
        responseText = result.response.text();
        break;
      } catch (err: unknown) {
        if (attempt === 3) throw err;
        console.warn(`[generate-final-quiz] Gemini error on attempt ${attempt}, retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const parsed = extractJSON<GenerateFinalQuizResponse>(responseText);

    // --- Validate parsed response ---
    if (!parsed.quiz_questions || !Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length < 12) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: `Gemini n'a retourné que ${parsed.quiz_questions?.length ?? 0} questions au lieu de 12.` },
        { status: 502 }
      );
    }

    // Ensure exactly 12 questions
    const quiz_questions = parsed.quiz_questions.slice(0, 12);

    // Validate internal structure of each question
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    for (let i = 0; i < quiz_questions.length; i++) {
      const q = quiz_questions[i];
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return NextResponse.json(
          { error: 'GEMINI_ERROR', message: `Question ${i + 1} n'a pas exactement 4 options.` },
          { status: 502 }
        );
      }
      if (!q.options.includes(q.correct_answer)) {
        return NextResponse.json(
          { error: 'GEMINI_ERROR', message: `Question ${i + 1}: correct_answer ne correspond à aucune des options.` },
          { status: 502 }
        );
      }
      if (!validDifficulties.includes(q.difficulty)) {
        return NextResponse.json(
          { error: 'GEMINI_ERROR', message: `Question ${i + 1}: difficulty invalide "${q.difficulty}".` },
          { status: 502 }
        );
      }
    }

    // --- Update quizzes row ---
    const { error: dbError } = await supabaseAdmin
      .from('quizzes')
      .update({
        final_quiz_json: {
          status: 'success',
          quiz_questions,
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
      quiz_questions,
    });
  } catch (error) {
    console.error('[generate-final-quiz] Error:', error);
    return NextResponse.json(
      { error: 'GEMINI_ERROR', message: 'Erreur lors de la génération du quiz final.' },
      { status: 500 }
    );
  }
}
