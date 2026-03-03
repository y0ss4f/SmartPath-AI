# SMARTPATH AI - MASTER PROJECT CONTEXT & SYSTEM DIRECTIVES

## 1. PROJECT METADATA
* **Project Name:** SmartPath AI
* **Domain:** EdTech (Primary School Ecosystem)
* **Target Audience:** Students, Parents, and Teachers in Tunisia.
* **Platforms:** Fully responsive Web App (Mobile-first design optimized for Parents/Students; Desktop/Tablet optimized for Teacher dashboards).
* **Core Value Proposition:** Replacing manual data entry with an AI pipeline that converts notebook photos into an initial evaluation quiz. Based on the quiz results, AI diagnoses pain points and generates a dynamic "Smart Slide" micro-course. After reviewing the course, the student takes a **Final Re-evaluation Quiz**, followed by an automated WhatsApp notification to parents.
* **Architecture State:** Minimum Viable Product (MVP) - Sprint-based development.

---

## 2. SYSTEM DIRECTIVES FOR AI IDE (ANTIGRAVITY)
**CRITICAL INSTRUCTIONS FOR CODE GENERATION:**
1. **Context Scope:** You MUST read this entire document before generating code, database schemas, or architectural logic to ensure perfect alignment with the project state.
2. **Modularity:** DO NOT write monolithic files. Break logic into modular Next.js Server Components, Client Components (`"use client"`), distinct API routes, and isolated utility functions.
3. **Strict Sprint Isolation:** ONLY generate code for the specific feature requested in the user's prompt. Do not spontaneously write backend logic if asked for a UI component, and vice versa.
4. **Code Delivery:** Always output complete, runnable code blocks. NEVER use placeholders like `// ... rest of the code`. If an `npm install` is required, state it clearly before the code.
5. **Localization Strictness:** The main App UI MUST be strictly in French. However, the AI-generated content (Quizzes and Smart Slides) must dynamically match the language of the handwritten text in the uploaded photo (French or Arabic). Ensure the UI gracefully handles both Left-to-Right (LTR) and Right-to-Left (RTL) text rendering for the AI content.

---

## 3. TECHNOLOGY STACK & CONVENTIONS
* **Framework:** Next.js (Strictly use the **App Router** `app/` directory).
* **Styling:** Tailwind CSS. 
    * *Responsive Convention:* Strict mobile-first approach. Base classes apply to mobile. Use `sm:`, `md:`, and `lg:` breakpoints to scale up for tablets and desktop displays.
    * *Aesthetic:* Clean, modern, student-friendly aesthetics (soft rounded corners, accessible contrast ratios).
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security). Use `@supabase/ssr` for secure server-side auth flows.
* **AI Engine:** Google Gemini API (`gemini-1.5-flash` for multimodal Vision OCR and JSON generation).
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
```

## 5. USER ROLES & ROUTING LOGIC
* **`/login`**: Shared Auth entry point (Email/Password) for Parents and Teachers.
* **`/dashboard/parent`**: Protected route. Fetches students where parent_id == current_user.id. Displays child profiles, allows uploading preexisting photos from the device's camera roll.
* **`/dashboard/teacher`**: Protected route. Fetches students via the teacher_students junction. Includes a search bar to claim students. Allows photo uploads from camera roll.
* **`/student/[qr_code_hash]`**: Unauthenticated, persistent route strictly for students. Bypasses standard login. This route is accessed via two methods:
    1. **Pass the Device:** The Parent/Teacher clicks a button in their dashboard to instantly route to this page, handing their own device to the child.
    2. **Scan QR:** The Parent/Teacher displays the QR code on their screen, and the student scans it with a separate device.

## 6. AI AGENT WORKFLOWS & API CONTRACTS

**Flow A: Initial Evaluation Pipeline (`/api/generate-quiz`)**
* **Trigger:** Parent/Teacher uploads a preexisting notebook photo.
* **Process:** The image and a prompt are sent to `gemini-1.5-flash`.
* **Agent 1 (Quiz Generator):** Reads the course text and generates an Initial Evaluation Quiz strictly based on that material to test understanding.
* **Output:** JSON mapping `{"status": "success", "quiz_questions": [...]}`. The UI then prompts the adult to either "Pass the Device" or show the QR Code.

**Flow B: Diagnosis & Micro-Course Pipeline (`/api/generate-course`)**
* **Trigger:** Student submits the Initial Evaluation Quiz.
* **Process:** The student's incorrect answers and score are sent back to Gemini.
* **Agent 2 (Diagnostic & Generation):** Diagnoses the pedagogical pain points and generates a dynamic "Smart Slide" micro-course (concept review).
* **Output Contract (JSON):**
```json
{
  "status": "success",
  "pain_points_identified": ["string"],
  "smart_slides": [
    {
      "type": "concept",
      "title": "string",
      "content": "string (Matches photo language)"
    }
  ]
}
```

**Flow C: Final Re-evaluation Pipeline (`/api/generate-final-quiz`)**
* **Trigger:** Student finishes reading the Smart Slides.
* **Process:** Gemini generates a final quiz to re-evaluate the student based on the pain points and the material they just reviewed in the micro-course.
* **Output Contract (JSON):** Same as Flow A, generating a final array of quiz questions.

**Flow D: Execution & Notification Pipeline (`/api/notify`)**
* **Trigger:** Student finishes the Final Re-Evaluation. Backend calculates final score.
* **Agent 3 (Notification):** Backend triggers Meta's WhatsApp Cloud API.
* **Output:** WhatsApp message to `profiles.phone_number`.
* **Format:** "SmartPath AI: [Student Name] completed their diagnostic and review for [Subject]. Initial Score: [Initial Score]. Final Score after Review: [Final Score]."

## 7. UX/UI & STATE MANAGEMENT RULES
* **Mobile-First Responsiveness (CRITICAL):** Do not hardcode fixed pixel widths. Use Tailwind's utility classes to ensure fluid layouts.
* **File Uploads:** Use standard HTML file inputs for camera roll access. No live webcam APIs necessary.
* **Loading States:** Always implement robust skeletons, spinners, or "Fun Fact" loading screens for the 10-15 second Gemini API latency.
* **Error Boundaries:** Wrap critical components in error boundaries to prevent full-page crashes.
* **Data Fetching:** Prefer React Server Components for initial fetches (Dashboards) and Client Components for interactive states (Quizzes, Smart Slides).

## 8. SPRINT TRACKING
### Sprint 1: Architecture & DB (Completed)
* Next.js setup, Tailwind, Supabase connection, Auth schema execution.

### Sprint 2: Core Auth & Parent Dashboard Foundation
> *Goal: Build the basic shell so we have parents and students in the system.*
* Implement `/login` for Parents.
* Build `/dashboard/parent` (Fetch and display children).
* Build simple UI to "Add a Child" to the database.

### Sprint 3: The AI Engine (Backend Validation)
> *Goal: Write the Gemini logic first, test it without building a UI, and ensure the prompts reliably output the strict JSON schema.*
* Build `/api/generate-quiz` (Flow A: Photo -> Initial Quiz JSON).
* Build `/api/generate-course` (Flow B: Initial Score -> Smart Slides JSON).
* Build `/api/generate-final-quiz` (Flow C: Slides -> Final Quiz JSON).
* *We test these routes via Postman/cURL to guarantee Gemini is consistent before we build React components to render the JSON.*

### Sprint 4: The Core Student Experience (UI Integration)
> *Goal: Connect the robust backend to the frontend UI.*
* Build the unauthenticated `/student/[qr_code_hash]` route.
* Add the photo upload button on the Parent Dashboard to trigger the Flow A API.
* Build the interactive React components to render the Initial Quiz, Smart Slides, and Final Quiz.
* Save the `initial_score` and `final_score` to Supabase.

### Sprint 5: Notifications & Handoff Mechanics (Polish)
> *Goal: Complete the loop by notifying parents and adding the smooth handoff features.*
* Implement Meta's WhatsApp API to send the final score delta (Initial vs. Final).
* Add the "QR Code" and "Pass the Device" buttons to the Parent Dashboard.
* **If time permits:** Replicate the Parent Dashboard layout for the Teacher Dashboard and add the "Claim Student" logic.
