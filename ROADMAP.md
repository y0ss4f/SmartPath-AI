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

### Sprint 6: Math-Only Structured Quiz Engine 🔄 (Current)
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
* **Quiz history.** A `<QuizHistory />` component on the parent dashboard shows all past quiz sessions per student (newest first): Unit | Scores | Date | Perceived Difficulty.

**Database migration (run before coding UI):**
```sql
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS time_spent_per_question JSONB,
  ADD COLUMN IF NOT EXISTS perceived_difficulty TEXT CHECK (perceived_difficulty IN ('easy', 'okay', 'hard'));
```

**Tasks:**
* [ ] Run Supabase migration — add `grade`, `unit`, `time_spent_per_question`, `perceived_difficulty` columns.
* [ ] Create `src/constants/mathCurriculum.ts` — full Tunisian math curriculum, Grades 1–6, Arabic unit names.
* [ ] Update `src/types/database.ts` — add `difficulty` to `QuizQuestion`, new `Quiz` columns, `TimeEntry` type.
* [ ] Refactor `/api/generate-quiz` — JSON body, 12Q + slides in one call, Arabic, difficulty-tagged.
* [ ] Deprecate `/api/generate-course` — return `410 Gone`.
* [ ] Refactor `/api/generate-final-quiz` — 12Q, Arabic, difficulty-tagged, reads `grade`/`unit` from DB.
* [ ] Extend `/api/submit-score` — accept and save `time_spent_per_question` + `perceived_difficulty`.
* [ ] Refactor `<StudentCard />` — replace file input with Subject/Unit dropdown + "Générer" button.
* [ ] Refactor `<QuizPlayer />` — add count-up timer per question + difficulty badges.
* [ ] Refactor `<FinalQuizPlayer />` — add timer + post-submit perceived difficulty emoji screen.
* [ ] Simplify `<StudentFlow />` — remove `generating-course` state, load slides from initial fetch.
* [ ] Build `<QuizHistory />` — per-student quiz history table on parent dashboard.

---

### Sprint 7: RAG Agent — PDF-Backed Course Material 🔜 (Planned)
> *Goal: Ground quiz and slide generation in official Tunisian textbook content via semantic retrieval.*

**Architecture (Supabase pgvector + Next.js API):**
* Ingest 6 PDF math textbooks (Grades 1–6) → chunk by section → embed via Gemini Embeddings API.
* Store embeddings in a new Supabase table `course_chunks` (with `pgvector` extension).
* Build `/api/rag-retrieve` — receives `{ grade, unit }`, returns top-K semantically relevant text chunks.
* Update `generate-quiz` prompt to include retrieved chunks (textbook context).
* Update `generate-final-quiz` to also leverage retrieved context.

**RAG Agent Capabilities:**
* Match exercises to official Tunisian learning objectives.
* Cite specific textbook pages in Smart Slides.
* Ensure quiz questions are accurate and curriculum-aligned.

**Tasks (deferred):**
* [ ] Set up pgvector extension in Supabase.
* [ ] Build PDF ingestion + chunking + embedding pipeline script.
* [ ] Create `course_chunks` table with embedding column.
* [ ] Build `/api/rag-retrieve` route.
* [ ] Integrate retrieval into `generate-quiz` and `generate-final-quiz` prompts.
* [ ] Display textbook page citations in `<SmartSlides />`.

---

## Why This Plan Works
1. **Risk Mitigation:** Hardcoded curriculum constant eliminates the most fragile part (OCR on handwriting). Gemini now works from clean, structured input.
2. **Data Richness:** Per-question timing + perceived difficulty create a behavioral dataset that no standard quiz platform collects — this becomes a competitive moat.
3. **Scalable RAG foundation:** Sprint 6 establishes the clean `{ grade, unit }` contract that Sprint 7 simply extends — the RAG layer slots in without breaking existing flows.
4. **Single source of truth:** All curriculum data lives in one TS constant. When Sprint 7 upgrades it to a live RAG retrieval, only one file changes.
