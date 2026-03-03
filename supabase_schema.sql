-- Profiles (Extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT CHECK (role IN ('super_admin', 'teacher', 'parent')) NOT NULL,
  phone_number TEXT, -- For Meta WhatsApp alerts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students (Belongs to Parents)
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  qr_code_hash TEXT UNIQUE NOT NULL, -- For instant, passwordless student login
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher_Students (Junction Table)
CREATE TABLE teacher_students (
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, student_id)
);

-- Quizzes (AI Generated Content & Results)
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT,
  raw_ocr_text TEXT, 
  initial_quiz_json JSONB, -- Stores the initial evaluation quiz
  generated_course_json JSONB, -- Stores the "Smart Slides" array after diagnosis
  final_quiz_json JSONB, -- Stores the final re-evaluation quiz
  initial_score INTEGER,
  final_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
