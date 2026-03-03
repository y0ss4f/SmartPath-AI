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

## 3. Why this plan is safer and faster:
1. **Risk Mitigation:** If Gemini struggles to read cursive French/Arabic notebooks, we find out in Sprint 3 *before* spending days building Quiz UI components in Sprint 4.
2. **Clearer Milestones:** Each sprint provides a distinctly testable block (Sprint 2 tests Auth, Sprint 3 tests the AI Prompts, Sprint 4 tests the UI components).
3. **Simpler MVP:** If we run out of time, proving the Parent-Student-WhatsApp loop is a complete, impressive MVP by itself. The Teacher "Claim" flow is secondary to that core value proposition.
