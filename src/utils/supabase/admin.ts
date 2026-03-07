import { createClient } from '@supabase/supabase-js'

// Admin client using the service role key — bypasses RLS entirely.
// ONLY use this in server-side API routes (/api/**) for operations that
// must succeed for unauthenticated users (e.g. student quiz writes).
// NEVER import this in client components or expose the key to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
