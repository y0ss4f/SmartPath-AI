// TypeScript interfaces matching the Supabase schema in supabase_schema.sql

export interface Profile {
  id: string;
  role: 'super_admin' | 'teacher' | 'parent';
  phone_number: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  parent_id: string;
  name: string;
  grade_level: string;
  qr_code_hash: string;
  created_at: string;
}

export interface TeacherStudent {
  teacher_id: string;
  student_id: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: Difficulty;
}

export interface SmartSlide {
  type: 'concept';
  title: string;
  content: string;
  page_reference?: string;
}

export interface TimeEntry {
  question_index: number;
  seconds: number;
}

export type PerceivedDifficulty = 'easy' | 'okay' | 'hard';

export interface WrongAnswer {
  question: string;
  selected: string;
  correct: string;
}

export interface Quiz {
  id: string;
  student_id: string;
  subject: string | null;
  grade: string | null;
  unit: string | null;
  raw_ocr_text: string | null;
  initial_quiz_json: { status: 'success' | 'error'; quiz_questions: QuizQuestion[] } | null;
  generated_course_json: {
    status: 'success' | 'error';
    pain_points_identified: string[];
    smart_slides: SmartSlide[];
  } | null;
  final_quiz_json: { status: 'success' | 'error'; quiz_questions: QuizQuestion[] } | null;
  initial_score: number | null;
  final_score: number | null;
  time_spent_per_question: TimeEntry[] | null;
  perceived_difficulty: PerceivedDifficulty | null;
  created_at: string;
}
