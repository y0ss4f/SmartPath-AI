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

---

### Sprint 1: Architecture & DB ✅ (Completed)
* Next.js setup, Tailwind, Supabase connection, Auth schema execution.

---

### Sprint 2: Core Auth & Parent Dashboard Foundation ✅ (Completed)
> *Goal: Build the basic shell so we have parents and students in the system.*
* Implement `/login` for Parents (Email/Password via Supabase Auth).
* Build `/dashboard/parent` (Server Component — fetch and display children).
* Build "Ajouter un enfant" form (Client Component — insert into `students` with auto-generated `qr_code_hash`).

---

### Sprint 3: The AI Engine (Backend Validation) ✅ (Completed)
> *Goal: Write the Gemini logic first, test without UI, ensure prompts reliably return strict JSON.*
* Built `/api/generate-quiz` — OCR-based photo → 5 initial questions (now refactored in Sprint 6).
* Built `/api/generate-course` — wrong answers → Smart Slides (now deprecated in Sprint 6).
* Built `/api/generate-final-quiz` — slides → 5 final questions (now refactored in Sprint 6).
* Tested all routes via Postman/cURL.

---

### Sprint 4: The Core Student Experience (UI Integration) ✅ (Completed)
> *Goal: Connect the robust backend to the frontend UI.*
* Built `/student/[qr_code_hash]/page.tsx` — 7-state machine orchestrator.
* Built `<QuizPlayer />`, `<SmartSlides />`, `<FinalQuizPlayer />`, `<ResultsScreen />`.
* Saved `initial_score` and `final_score` to Supabase.

---

### Sprint 5: Notifications & Handoff Mechanics ✅ (Completed)
> *Goal: Complete the loop — notify parents and add smooth handoff features.*
* Built `/api/notify` — WhatsApp message via Meta Cloud API with score delta.
* Added "Afficher le QR Code" button (renders QR on parent dashboard).
* Added "Passer l'appareil" button (navigates to `/student/[hash]` on same device).
* Added loading states and error boundaries.

---

### Sprint 6: Math-Only Structured Quiz Engine ✅ (Completed)
> *Goal: Replace the OCR photo-upload flow with a curriculum-driven structured quiz engine. Math only, Grades 1–6.*

**Architecture decisions (locked):**
* **No more photo upload.** Parents select Subject → Unit from a dropdown. Grade is auto-read from `students.grade_level`. The `generate-quiz` route accepts a JSON body `{ student_id, grade, unit }` — no multipart/form-data.
* **Single Gemini call.** `generate-quiz` generates both the **12-question quiz** and the **Smart Slides** in one call. The old `generate-course` route is deprecated (`410 Gone`).
* **12-question structure.** Both the initial quiz and final quiz contain exactly 12 MCQ, split across 4 difficulty tiers: 3 Easy (سهل) + 3 Medium (متوسط) + 3 Hard (صعب) + 3 Expert (خبير). Each question carries a `difficulty` tag.
* **Always Arabic.** All AI-generated content is in Arabic, always RTL, always using Latin numerals. No language auto-detection.
* **Per-question timer.** A count-up stopwatch is displayed on each question. Time spent per question `{ question_index, seconds }` is recorded and saved to the DB.
* **Perceived difficulty rating.** After the final quiz, a non-graded screen asks: `"كيف وجدت هذا الاختبار؟"` with emoji options: 😊 سهل | 😐 عادي | 😓 صعب. Saved to `quizzes.perceived_difficulty`.
* **Simplified state machine:** `loading → quiz → slides → generating-final-quiz → final-quiz → results`. The `generating-course` state is removed.
* **Hardcoded curriculum.** Unit lists per grade are defined in `src/constants/mathCurriculum.ts` (Arabic unit names, Tunisian Grade 1–6 program). Zero token overhead — not fetched at runtime.

**All tasks completed.** ✅

---

### Sprint 7: RAG Agent — Textbook-Grounded Generation 🔄 (Current)
> *Goal: Ground quiz and slide generation in official Tunisian textbook content using Gemini's native multimodal document understanding.*

**Architecture (Gemini Native Multimodal — Option A):**
* Upload 6 PDF math textbooks (Grades 1–6) to the Gemini File API as full documents.
* Store file URIs in the `textbook_files` Supabase table (`grade` → `gemini_file_uri` + `gemini_file_name`).
* At generation time, look up the grade's textbook URI and pass the entire PDF as `fileData` context alongside the Gemini prompt.
* Automatic re-upload: Gemini files expire after ~48 hours. The `src/utils/textbook.ts` utility detects expired files and re-uploads from disk automatically.
* No pgvector, no text extraction, no chunking — Gemini reads the PDF natively with full visual+text understanding.

**Why Option A (not pgvector RAG):**
* Arabic math text extraction from PDFs is notoriously unreliable (garbled RTL + broken equations).
* Gemini processes the full PDF layout natively — diagrams, tables, exercise boxes all preserved.
* Zero infrastructure overhead: no embedding pipeline, no vector database, no chunk management.

**RAG Agent Capabilities:**
* Base quiz questions on the exact methodology and problem types found in the official textbook.
* Base Smart Slides explanations on how the textbook teaches each unit.
* Cite specific textbook pages in Smart Slides via `page_reference` field.
* Ensure quiz questions are accurate and curriculum-aligned.

**Database setup:**
```sql
CREATE TABLE IF NOT EXISTS textbook_files (
  grade TEXT PRIMARY KEY,
  gemini_file_uri TEXT NOT NULL,
  gemini_file_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE textbook_files ENABLE ROW LEVEL SECURITY;
```

**Tasks:**
* [x] Create `textbook_files` Supabase table.
* [x] Create `scripts/upload-textbooks.ts` — one-time upload of 6 PDFs to Gemini File API.
* [x] Create `src/utils/textbook.ts` — file URI retrieval with auto-re-upload on expiry.
* [x] Update `/api/generate-quiz` — attach textbook PDF as Gemini fileData context.
* [x] Update `/api/generate-final-quiz` — attach textbook PDF for grounded final quiz.
* [x] Update `src/types/database.ts` — add `page_reference` to `SmartSlide` type.
* [x] Update `src/components/SmartSlides.tsx` — display textbook page citation badge.
* [ ] Run upload script to populate `textbook_files` table.
* [ ] End-to-end test: generate quiz with textbook grounding, verify page citations.

---

## Why This Plan Works
1. **Risk Mitigation:** Hardcoded curriculum constant eliminates the most fragile part (OCR on handwriting). Gemini now works from clean, structured input.
2. **Data Richness:** Per-question timing + perceived difficulty create a behavioral dataset that no standard quiz platform collects — this becomes a competitive moat.
3. **Textbook Grounding:** By passing the official PDF directly to Gemini, all generated content is curriculum-aligned without the fragility of Arabic PDF text extraction.
4. **Single source of truth:** All curriculum data lives in one TS constant. The textbook PDF provides deep contextual grounding without replacing the curriculum structure.

