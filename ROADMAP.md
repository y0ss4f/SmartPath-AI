# SmartPath AI — MVP Sprint Plan

### Phase 0: Foundation Fixes (Pre-Sprint) ✅
> *Goal: Clean up scaffolding issues before building features.*
* Fix `lang="fr"` in root layout (French-first UI).
* Add `.env.example` with all required environment variables.
* Create shared TypeScript interfaces (`src/types/database.ts`) matching the DB schema.
* Add Row Level Security (RLS) policies to `supabase_schema.sql` for all 4 tables.
* Wire up explicit `/student/*` public route bypass in middleware.
* Remove unused dependencies (`react-webcam`, `twilio`).
* Replace default Next.js boilerplate landing page.

### Sprint 1: Architecture & DB ✅ (Completed)
* Next.js setup, Tailwind, Supabase connection, Auth schema execution.

### Sprint 2: Core Auth & Parent Dashboard Foundation ✅ (Completed)
> *Goal: Build the basic shell so we have parents and students in the system.*
* Implement `/login` for Parents (Email/Password via Supabase Auth).
* Build `/dashboard/parent` (Server Component — fetch and display children).
* Build "Ajouter un enfant" form (Client Component — insert into `students` with auto-generated `qr_code_hash`).

### Sprint 3: The AI Engine (Backend Validation)
> *Goal: Write the Gemini logic first, test without UI, ensure prompts reliably return strict JSON.*
* ~~Create shared Gemini client utility (`src/utils/gemini.ts`).~~ ✅ Done (pre-sprint)
* Build `/api/generate-quiz` — Flow A.
  * Input: `multipart/form-data { image, student_id, subject? }`
  * Action: Send image to Gemini Vision → **INSERT** new row in `quizzes` table.
  * Output: `{ quiz_id, quiz_questions[] }`
  * Add `export const maxDuration = 60` to handle Gemini latency.
* Build `/api/generate-course` — Flow B.
  * Input: `{ quiz_id, wrong_answers[], initial_score }`
  * Action: Send wrong answers to Gemini → **UPDATE** `quizzes` row (`generated_course_json`, `initial_score`).
  * Output: `{ quiz_id, pain_points_identified[], smart_slides[] }`
  * Add `export const maxDuration = 60`.
* Build `/api/generate-final-quiz` — Flow C.
  * Input: `{ quiz_id }`
  * Action: Fetch slides from DB → Send to Gemini → **UPDATE** `quizzes` row (`final_quiz_json`).
  * Output: `{ quiz_id, quiz_questions[] }`
  * Add `export const maxDuration = 60`.
* Test all routes via Postman/cURL with real French/Arabic notebook photos.
* **Risk checkpoint:** If Gemini OCR struggles, evaluate fallbacks (image preprocessing, Cloud Vision pre-step).

### Sprint 4: The Core Student Experience (UI Integration) ✅ (Completed)
> *Goal: Connect the robust backend to the frontend UI.*

**Architecture decisions (locked before Sprint 4):**
* **Handoff URL:** Parent dashboard navigates to `/student/[hash]?quiz_id=...`. The `quiz_id` query param is read by the student page and also encoded in the QR code — covers both "Pass the Device" and QR scan on separate device.
* **Auth on Flows B & C:** None. The `quiz_id` (UUID v4) is the implicit access token. Only the parent who ran Flow A knows it.
* **`final_score` saving:** `<FinalQuizPlayer />` calls `POST /api/submit-score` after grading — this is what Sprint 5's notify route will read.
* **Photo upload UX:** Per-student "Télécharger une photo" button in `<StudentList />`. On click → file picker → upload triggers Flow A → loading screen (10–15s) → on success, display handoff options ("Passer l'appareil" / "Afficher le QR Code").
* **Student page state machine:** Single `step` state variable drives all rendering. States: `loading` → `quiz` → `generating-course` → `slides` → `generating-final-quiz` → `final-quiz` → `results`. On page refresh, state is lost and student restarts (MVP acceptable).
* **RTL support:** All 3 components import `detectDirection()` from `src/utils/rtl.ts` and apply `dir` attribute to content containers.

**Tasks:**
* Build `/student/[qr_code_hash]/page.tsx` — reads `quiz_id` from `searchParams`, orchestrates 7-state machine.
* Add per-student photo upload button to `<StudentList />` → calls `/api/generate-quiz` → on success navigates to handoff options.
* Build `<QuizPlayer />` Client Component — renders quiz JSON, collects answers, computes score, calls `/api/generate-course`.
* Build `<SmartSlides />` Client Component — slide navigation (prev/next), calls `/api/generate-final-quiz` on completion.
* Build `<FinalQuizPlayer />` Client Component — renders final quiz, grades answers, calls `/api/submit-score`.
* Build `<ResultsScreen />` — displays initial vs. final score delta.
* All components: apply `detectDirection()` for Arabic/French RTL support.

### Sprint 5: Notifications & Handoff Mechanics (Polish)
> *Goal: Complete the loop by notifying parents and adding smooth handoff features.*
* Build `/api/notify` — send WhatsApp message via Meta Cloud API with score delta.
* Add "Afficher le QR Code" button (renders QR on parent dashboard).
* Add "Passer l'appareil" button (navigates to `/student/[hash]` on same device).
* Add loading states (skeletons/spinners) for Gemini API latency (~10-15s).
* Add error boundaries around Quiz, Slides, and API-dependent components.
* **If time permits:** Build `/dashboard/teacher` with student claim logic.

---

## Why This Plan Works
1. **Risk Mitigation:** If Gemini struggles with cursive French/Arabic, we discover it in Sprint 3 — *before* building Quiz UI in Sprint 4.
2. **Clearer Milestones:** Each sprint is a distinctly testable block (Phase 0: foundation, Sprint 2: auth, Sprint 3: AI, Sprint 4: UI, Sprint 5: polish).
3. **Simpler MVP:** The Parent → Student → WhatsApp notification loop is a complete, impressive MVP by itself. The Teacher "Claim" flow is secondary.
