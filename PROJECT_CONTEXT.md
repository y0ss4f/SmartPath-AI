# SMARTPATH AI - MASTER PROJECT CONTEXT & SYSTEM DIRECTIVES

## 1. PROJECT METADATA
* **Project Name:** SmartPath AI
* **Domain:** EdTech (Primary School Ecosystem)
* **Target Audience:** Students, Parents, and Teachers in Tunisia.
* **Platforms:** Fully responsive Web App (Mobile-first design optimized for Parents/Students; Desktop/Tablet optimized for Teacher dashboards).
* **Core Value Proposition:** A curriculum-driven AI quiz engine that generates structured math assessments and Smart Slide micro-courses based on the student's grade and unit. Based on the quiz results, AI diagnoses pain points and generates a personalized final re-evaluation quiz. The full loop ends with an automated WhatsApp notification to parents showing the score delta.
* **Architecture State:** Minimum Viable Product (MVP) - Sprint-based development. Currently on Sprint 6.
* **Scope (Sprint 6+):** Mathematics only, Grades 1–6 primary school (السنة الأولى → السادسة ابتدائي). Tunisian national curriculum.

---

## 2. SYSTEM DIRECTIVES FOR AI IDE (ANTIGRAVITY)
**CRITICAL INSTRUCTIONS FOR CODE GENERATION:**
1. **Context Scope:** You MUST read this entire document before generating code, database schemas, or architectural logic to ensure perfect alignment with the project state.
2. **Modularity:** DO NOT write monolithic files. Break logic into modular Next.js Server Components, Client Components (`"use client"`), distinct API routes, and isolated utility functions.
3. **Strict Sprint Isolation:** ONLY generate code for the specific feature requested in the user's prompt. Do not spontaneously write backend logic if asked for a UI component, and vice versa.
4. **Code Delivery:** Always output complete, runnable code blocks. NEVER use placeholders like `// ... rest of the code`. If an `npm install` is required, state it clearly before the code.
5. **Language Rules (CRITICAL):**
   - The main App UI (labels, buttons, navigation) MUST be in **French**.
   - All AI-generated content (quiz questions, Smart Slides, answer options) is **always in Arabic** — no auto-detection, no French fallback.
   - All quiz/slide components **always render RTL** (`dir="rtl"`). Do not use `detectDirection()` for AI content — it is always Arabic.
   - Use **Latin numerals** (1, 2, 3...) inside Arabic math content — not Arabic-Indic (١, ٢, ٣).

---

## 3. TECHNOLOGY STACK & CONVENTIONS
* **Framework:** Next.js (Strictly use the **App Router** `app/` directory).
* **Styling:** Tailwind CSS.
    * *Responsive Convention:* Strict mobile-first approach. Base classes apply to mobile. Use `sm:`, `md:`, and `lg:` breakpoints to scale up for tablets and desktop displays.
    * *Aesthetic:* Clean, modern, student-friendly aesthetics (soft rounded corners, accessible contrast ratios).
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security). Use `@supabase/ssr` for secure server-side auth flows.
* **AI Engine:** Google Gemini API (`gemini-1.5-flash` for structured JSON generation). **No image/OCR input from Sprint 6 onward.**
* **Notifications:** Meta's WhatsApp Cloud API (Free tier/test numbers for MVP).
* **Icons:** `lucide-react`.

---

## 4. DATABASE SCHEMA (SUPABASE POSTGRESQL)
*Use this exact schema when writing SQL migrations, fetching data, or typing TypeScript interfaces.*

```sql
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
  grade_level TEXT NOT NULL, -- e.g. "1ere", "2eme", ..., "6eme"
  qr_code_hash TEXT UNIQUE NOT NULL,
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
  subject TEXT,                    -- Always "Mathématiques" (Sprint 6+)
  grade TEXT,                      -- e.g. "6eme" — auto-read from student.grade_level
  unit TEXT,                       -- e.g. "الكسور" — selected by parent
  raw_ocr_text TEXT,               -- Legacy field, NULL for all new quizzes
  initial_quiz_json JSONB,         -- 12-question initial quiz array
  generated_course_json JSONB,     -- Smart Slides array (generated upfront with quiz)
  final_quiz_json JSONB,           -- 12-question final re-evaluation quiz
  initial_score INTEGER,           -- Out of 12
  final_score INTEGER,             -- Out of 12
  time_spent_per_question JSONB,   -- Array of { question_index, seconds } — covers both quizzes
  perceived_difficulty TEXT CHECK (perceived_difficulty IN ('easy', 'okay', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sprint 6 Migration (run in Supabase SQL editor)
```sql
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS time_spent_per_question JSONB,
  ADD COLUMN IF NOT EXISTS perceived_difficulty TEXT CHECK (perceived_difficulty IN ('easy', 'okay', 'hard'));
```

---

## 5. USER ROLES & ROUTING LOGIC
* **`/login`**: Shared Auth entry point (Email/Password) for Parents and Teachers.
* **`/dashboard/parent`**: Protected route. Displays child profiles with a unit-selection quiz launcher and quiz history per student.
* **`/dashboard/teacher`**: Protected route. (Future sprint) Teacher student management.
* **`/student/[qr_code_hash]`**: Unauthenticated, persistent route strictly for students. Accessed via:
    1. **Pass the Device:** Parent clicks button → routes to this page on the same device.
    2. **Scan QR:** Parent shows QR code → student scans on a separate device.

---

## 6. MATH CURRICULUM CONSTANT
All available units per grade are defined in `src/constants/mathCurriculum.ts`. This is the **single source of truth** for what units are available. It is hardcoded to:
- Minimize token usage (no runtime fetching)
- Ensure deterministic unit names in Gemini prompts
- Power the parent dashboard unit dropdown

The constant is keyed by grade string (`"1ere"` → `"6eme"`) and values are Arabic unit name arrays.

---

## 7. AI AGENT WORKFLOWS & API CONTRACTS

### ✅ Flow A: Initial Assessment Pipeline (`/api/generate-quiz`)
* **Input:** `application/json { student_id: string, grade: string, unit: string }`
* **Auth:** Requires parent session. Validates parent owns the student.
* **Process:** Single Gemini call generates 12 questions + Smart Slides together.
* **Quiz Structure:** Exactly 12 MCQ, split into 4 difficulty tiers:
  - 3 × Easy (سهل)
  - 3 × Medium (متوسط)
  - 3 × Hard (صعب)
  - 3 × Expert (خبير)
* **Language:** Always Arabic. Always RTL. Latin numerals.
* **DB Action:** `INSERT` into `quizzes` with `grade`, `unit`, `initial_quiz_json`, `generated_course_json`.
* **Output:** `{ quiz_id, quiz_questions[], smart_slides[] }`

```json
{
  "quiz_id": "uuid",
  "quiz_questions": [
    {
      "question": "Arabic question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "difficulty": "easy"
    }
  ],
  "smart_slides": [
    {
      "type": "concept",
      "title": "Arabic slide title",
      "content": "Arabic explanation text"
    }
  ]
}
```

### 🚫 Flow B: Diagnosis & Micro-Course Pipeline (`/api/generate-course`) — DEPRECATED
* **Status:** Returns `410 Gone`. Slides are now generated upfront in Flow A.
* Do not call this route. Do not use it in any UI component.

### ✅ Flow C: Final Re-evaluation Pipeline (`/api/generate-final-quiz`)
* **Input:** `{ quiz_id: string, wrong_answers: WrongAnswer[], initial_score: number }`
* **Auth:** None (quiz_id is the implicit token).
* **Process:** Fetches `generated_course_json`, `grade`, `unit` from DB → Gemini generates 12 new Arabic questions based on the student's wrong answers and the slides they reviewed.
* **Quiz Structure:** Same 12-question / 4-tier format as Flow A. Questions must be different from the initial quiz.
* **DB Action:** `UPDATE quizzes` with `final_quiz_json`.
* **Output:** `{ quiz_id, quiz_questions[] }`

### ✅ Flow D: Score Submission (`/api/submit-score`)
* **Input:**
```json
{
  "quiz_id": "uuid",
  "final_score": 9,
  "time_spent_per_question": [{ "question_index": 0, "seconds": 42 }, ...],
  "perceived_difficulty": "okay"
}
```
* **DB Action:** `UPDATE quizzes` with `final_score`, `time_spent_per_question`, `perceived_difficulty`.

### ✅ Flow E: Notification Pipeline (`/api/notify`)
* **Trigger:** After score submission.
* **Output:** WhatsApp message to `profiles.phone_number`.
* **Format:** `"SmartPath AI: [Nom] a terminé son évaluation en [Unité] ([Niveau]). Score initial: X/12. Score final: Y/12."`

---

## 8. STUDENT EXPERIENCE — STATE MACHINE

Single `step` state variable in `StudentFlow.tsx`:

```
loading → quiz → slides → generating-final-quiz → final-quiz → results
```

| State | Component | Notes |
|-------|-----------|-------|
| `loading` | Spinner | Fetches quiz row from DB by `quiz_id` |
| `quiz` | `<QuizPlayer />` | 12 questions, count-up timer per question, difficulty badges |
| `slides` | `<SmartSlides />` | Pre-generated, fetched from `generated_course_json` |
| `generating-final-quiz` | Loading screen | Calls `/api/generate-final-quiz` |
| `final-quiz` | `<FinalQuizPlayer />` | 12 questions + timer + perceived difficulty emoji screen |
| `results` | `<ResultsScreen />` | Score delta, calls `/api/notify` |

**`generating-course` state has been removed.** It no longer exists.

---

## 9. UI/UX RULES
* **Mobile-First Responsiveness (CRITICAL):** Do not hardcode fixed pixel widths.
* **Timer (QuizPlayer & FinalQuizPlayer):** Count-up stopwatch per question. `useRef` stores question start time. On navigation, push `{ question_index, seconds }` to `timeLog` array. Display live count in a top badge (e.g. `⏱ 00:42`). Non-blocking — no cutoff.
* **Difficulty Badges:** Each question card shows a pill badge for its tier: سهل (green) / متوسط (yellow) / صعب (orange) / خبير (red).
* **Perceived Difficulty Screen:** Shown after final quiz grading. Non-graded. Arabic text: `"كيف وجدت هذا الاختبار؟"`. Three large emoji buttons: 😊 سهل | 😐 عادي | 😓 صعب.
* **Loading States:** Always implement skeletons/spinners for Gemini API latency (~10–20s).
* **Error Boundaries:** Wrap Quiz, Slides, and Final Quiz components.
* **Quiz History (`<QuizHistory />`):** Shown on parent dashboard per student. All attempts listed (newest first). Shows: Unit | Score | Date | Perceived Difficulty tag.

---

## 10. SPRINT TRACKING

### ✅ Sprint 1: Architecture & DB (Completed)
### ✅ Sprint 2: Core Auth & Parent Dashboard Foundation (Completed)
### ✅ Sprint 3: The AI Engine — Backend Validation (Completed)
### ✅ Sprint 4: The Core Student Experience — UI Integration (Completed)
### ✅ Sprint 5: Notifications & Handoff Mechanics (Completed)

### 🔄 Sprint 6: Math-Only Structured Quiz Engine (Current)
> *Goal: Replace OCR flow with curriculum-driven unit selection. Restructure quiz to 12Q/4-tier. Add per-question timing and perceived difficulty.*
* Run Supabase migration (add `grade`, `unit`, `time_spent_per_question`, `perceived_difficulty` columns).
* Create `src/constants/mathCurriculum.ts` with Tunisian Grade 1–6 unit lists in Arabic.
* Refactor `/api/generate-quiz` — JSON body, single Gemini call, 12Q + slides.
* Deprecate `/api/generate-course` — return `410 Gone`.
* Refactor `/api/generate-final-quiz` — 12 questions, Arabic, difficulty-tagged.
* Extend `/api/submit-score` — accept `time_spent_per_question` and `perceived_difficulty`.
* Update TypeScript types in `src/types/database.ts`.
* Refactor `<StudentCard />` — replace file upload with unit dropdown.
* Refactor `<QuizPlayer />` — add per-question timer + difficulty badges.
* Refactor `<FinalQuizPlayer />` — add timer + perceived difficulty screen.
* Simplify `<StudentFlow />` — remove `generating-course` state.
* Build `<QuizHistory />` — quiz history list on parent dashboard.

### 🔜 Sprint 7: RAG Agent — PDF-Backed Course Material
> *Goal: Ingest Tunisian math textbooks (PDF, Grades 1–6), embed into Supabase pgvector, and use semantic retrieval to ground quiz generation and Smart Slides in official textbook content.*
* Ingest 6 PDF textbooks → chunk → embed via Gemini Embeddings API.
* Store embeddings in Supabase `course_chunks` table with pgvector.
* Build `/api/rag-retrieve` route — semantic search given `{ grade, unit }`.
* Update `generate-quiz` prompt to include retrieved textbook excerpts.
* RAG agent capabilities: cite textbook pages, match exercises to learning standards.
