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

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

export interface SmartSlide {
  type: 'concept';
  title: string;
  content: string;
}

export interface Quiz {
  id: string;
  student_id: string;
  subject: string | null;
  raw_ocr_text: string | null;
  initial_quiz_json: { status: string; quiz_questions: QuizQuestion[] } | null;
  generated_course_json: {
    status: string;
    pain_points_identified: string[];
    smart_slides: SmartSlide[];
  } | null;
  final_quiz_json: { status: string; quiz_questions: QuizQuestion[] } | null;
  initial_score: number | null;
  final_score: number | null;
  created_at: string;
}
