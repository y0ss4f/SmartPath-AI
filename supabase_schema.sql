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

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- PROFILES: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- STUDENTS: Parents can CRUD their own children
CREATE POLICY "Parents can view own children"
  ON students FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
  ON students FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
  ON students FOR DELETE
  USING (auth.uid() = parent_id);

-- STUDENTS: Teachers can view students they are linked to
CREATE POLICY "Teachers can view linked students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_students
      WHERE teacher_students.student_id = students.id
      AND teacher_students.teacher_id = auth.uid()
    )
  );

-- STUDENTS: Public read access by qr_code_hash (for unauthenticated student route)
CREATE POLICY "Anyone can view student by qr_code_hash"
  ON students FOR SELECT
  USING (true);

-- TEACHER_STUDENTS: Teachers can manage their own links
CREATE POLICY "Teachers can view own links"
  ON teacher_students FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own links"
  ON teacher_students FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own links"
  ON teacher_students FOR DELETE
  USING (auth.uid() = teacher_id);

-- QUIZZES: Parents can view quizzes for their children
CREATE POLICY "Parents can view quizzes for own children"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = quizzes.student_id
      AND students.parent_id = auth.uid()
    )
  );

-- QUIZZES: Teachers can view quizzes for linked students
CREATE POLICY "Teachers can view quizzes for linked students"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_students
      WHERE teacher_students.student_id = quizzes.student_id
      AND teacher_students.teacher_id = auth.uid()
    )
  );

-- QUIZZES: Allow insert/update for quiz flow (parents create quizzes for their children)
CREATE POLICY "Authenticated users can insert quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = quizzes.student_id
      AND students.parent_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update quizzes"
  ON quizzes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = quizzes.student_id
      AND students.parent_id = auth.uid()
    )
  );

