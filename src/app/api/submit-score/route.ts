import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Called by the unauthenticated student page after grading the final quiz.
// quiz_id (UUID) serves as the implicit access token — unguessable by design.

interface TimeEntry {
  question_index: number;
  seconds: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id, final_score, time_spent_per_question, perceived_difficulty } = body;

    if (!quiz_id || final_score === undefined || typeof final_score !== 'number') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Les champs quiz_id et final_score (nombre) sont requis.' },
        { status: 400 }
      );
    }

    if (final_score < 0 || final_score > 12 || !Number.isInteger(final_score)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'final_score doit être un entier entre 0 et 12.' },
        { status: 400 }
      );
    }

    // Validate perceived_difficulty if provided
    if (perceived_difficulty && !['easy', 'okay', 'hard'].includes(perceived_difficulty)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'perceived_difficulty doit être "easy", "okay" ou "hard".' },
        { status: 400 }
      );
    }

    // Validate time_spent_per_question if provided
    if (time_spent_per_question) {
      if (!Array.isArray(time_spent_per_question)) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'time_spent_per_question doit être un tableau.' },
          { status: 400 }
        );
      }
      const isValid = time_spent_per_question.every(
        (entry: TimeEntry) =>
          typeof entry.question_index === 'number' &&
          Number.isInteger(entry.question_index) &&
          typeof entry.seconds === 'number' &&
          entry.seconds >= 0
      );
      if (!isValid) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'Chaque entrée de time_spent_per_question doit avoir question_index (entier) et seconds (nombre >= 0).' },
          { status: 400 }
        );
      }
      // Ensure all 24 questions (initial + final) are represented with no gaps or duplicates
      const indices = time_spent_per_question.map((e: TimeEntry) => e.question_index);
      const uniqueIndices = new Set(indices);
      if (
        uniqueIndices.size !== 24 ||
        Math.min(...indices) !== 0 ||
        Math.max(...indices) !== 23
      ) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: 'time_spent_per_question doit contenir exactement 24 entrées avec des indices 0 à 23 sans doublons.' },
          { status: 400 }
        );
      }
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

    // Build update object dynamically
    const updateData: Record<string, unknown> = { final_score };

    if (time_spent_per_question) {
      updateData.time_spent_per_question = time_spent_per_question;
    }

    if (perceived_difficulty) {
      updateData.perceived_difficulty = perceived_difficulty;
    }

    const { error: dbError } = await supabaseAdmin
      .from('quizzes')
      .update(updateData)
      .eq('id', quiz_id);

    if (dbError) {
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Échec de la sauvegarde du score final.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ quiz_id, final_score, perceived_difficulty: perceived_difficulty || null });
  } catch (error) {
    console.error('[submit-score] Error:', error);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Erreur lors de la sauvegarde du score.' },
      { status: 500 }
    );
  }
}
