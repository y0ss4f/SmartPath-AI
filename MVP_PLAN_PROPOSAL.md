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

### Sprint 2: Core Auth & Parent Dashboard Foundation
> *Goal: Build the basic shell so we have parents and students in the system.*
* Implement `/login` for Parents (Email/Password via Supabase Auth).
* Build `/dashboard/parent` (Server Component — fetch and display children).
* Build "Ajouter un enfant" form (Client Component — insert into `students` with auto-generated `qr_code_hash`).

### Sprint 3: The AI Engine (Backend Validation)
> *Goal: Write the Gemini logic first, test without UI, ensure prompts reliably return strict JSON.*
* Create shared Gemini client utility (`src/utils/gemini.ts`).
* Build `/api/generate-quiz` (Flow A: Photo → Initial Quiz JSON).
* Build `/api/generate-course` (Flow B: Initial Score → Smart Slides JSON).
* Build `/api/generate-final-quiz` (Flow C: Slides → Final Quiz JSON).
* Test all routes via Postman/cURL with real French/Arabic notebook photos.
* **Risk checkpoint:** If Gemini OCR struggles, evaluate fallbacks (image preprocessing, Cloud Vision pre-step).

### Sprint 4: The Core Student Experience (UI Integration)
> *Goal: Connect the robust backend to the frontend UI.*
* Build the unauthenticated `/student/[qr_code_hash]` route.
* Add photo upload button on Parent Dashboard to trigger Flow A API.
* Build `<QuizPlayer />` Client Component (renders quiz JSON, collects answers).
* Build `<SmartSlides />` Client Component (slide navigation with prev/next).
* Build `<FinalQuizPlayer />` Client Component (final re-evaluation).
* Wire full end-to-end flow and save `initial_score` + `final_score` to Supabase.

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
