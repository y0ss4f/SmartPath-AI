#!/usr/bin/env node
// Full diagnostic for the WhatsApp notification pipeline.
// Run: node test_notify_full.js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Load .env.local ────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  META_WHATSAPP_TOKEN: token,
  META_WHATSAPP_PHONE_NUMBER_ID: phoneNumberId,
} = env

const sb = createClient(url, key)

console.log('\n══════════════════════════════════════════════════')
console.log('  SmartPath AI — Full Notification Diagnostic')
console.log('══════════════════════════════════════════════════\n')

// ── 1. Check env vars ─────────────────────────────────────────────────────────
console.log('── 1. Environment Variables')
console.log(`  Supabase URL        : ${url ? '✅ set' : '❌ MISSING'}`)
console.log(`  Service Role Key    : ${key ? '✅ set' : '❌ MISSING'}`)
console.log(`  META Token (first20): ${token ? token.slice(0, 20) + '...' : '❌ MISSING'}`)
console.log(`  META Phone Number ID: ${phoneNumberId ?? '❌ MISSING'}`)
console.log()

// ── 2. Check all parent profiles for phone numbers ────────────────────────────
console.log('── 2. Profiles — Parent Phone Numbers in DB')
const { data: profiles, error: profilesErr } = await sb
  .from('profiles')
  .select('id, role, phone_number, created_at')
  .eq('role', 'parent')

if (profilesErr) {
  console.log(`  ❌ Error reading profiles: ${profilesErr.message}`)
} else if (!profiles?.length) {
  console.log('  ⚠️  No parent profiles found in the database.')
} else {
  for (const p of profiles) {
    const phone = p.phone_number
    console.log(`  Parent ${p.id.slice(0, 8)}…  phone_number: ${phone ? `✅ ${phone}` : '❌ NULL — no phone stored'}`)
  }
}
console.log()

// ── 3. Check auth metadata for the same parents (fallback source) ─────────────
console.log('── 3. Auth Metadata — phone_number in raw_user_meta_data')
if (profiles?.length) {
  for (const p of profiles) {
    const { data: authUser } = await sb.auth.admin.getUserById(p.id)
    const metaPhone = authUser?.user?.user_metadata?.phone_number ?? null
    console.log(`  Parent ${p.id.slice(0, 8)}…  metadata phone: ${metaPhone ? `✅ ${metaPhone}` : '❌ NULL'}`)
  }
}
console.log()

// ── 4. Find the latest completed quiz ─────────────────────────────────────────
console.log('── 4. Latest Completed Quiz (has both scores)')
const { data: latestQuiz, error: quizErr } = await sb
  .from('quizzes')
  .select('id, student_id, subject, initial_score, final_score, created_at')
  .not('initial_score', 'is', null)
  .not('final_score', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (quizErr || !latestQuiz) {
  console.log('  ⚠️  No completed quiz found. Complete a quiz first to test notification.')
  console.log('  (You can still test the WhatsApp step directly below)\n')
} else {
  console.log(`  Quiz ID     : ${latestQuiz.id}`)
  console.log(`  Subject     : ${latestQuiz.subject ?? '(none)'}`)
  console.log(`  Scores      : ${latestQuiz.initial_score}/5 → ${latestQuiz.final_score}/5`)
  console.log(`  Created     : ${latestQuiz.created_at}`)
  console.log()

  // ── 5. Simulate exactly what /api/notify does ──────────────────────────────
  console.log('── 5. Simulating /api/notify logic for that quiz')

  const { data: student } = await sb.from('students').select('id, name, parent_id').eq('id', latestQuiz.student_id).single()
  if (!student) { console.log('  ❌ Student not found'); process.exit(1) }
  console.log(`  Student     : ${student.name} (${student.id.slice(0, 8)}…)`)

  const { data: profile } = await sb.from('profiles').select('phone_number').eq('id', student.parent_id).single()
  let rawPhone = profile?.phone_number ?? null
  console.log(`  Phone (DB)  : ${rawPhone ?? '❌ NULL in profiles'}`)

  if (!rawPhone) {
    const { data: authUser } = await sb.auth.admin.getUserById(student.parent_id)
    rawPhone = authUser?.user?.user_metadata?.phone_number ?? null
    console.log(`  Phone (auth): ${rawPhone ?? '❌ NULL in auth metadata too'}`)
  }

  if (!rawPhone) {
    console.log('\n  ❌ PROBLEM: No phone number found anywhere for this parent.')
    console.log('  → Update profiles manually via Supabase SQL Editor:')
    console.log(`    UPDATE profiles SET phone_number = '+21698XXXXXX' WHERE id = '${student.parent_id}';`)
    process.exit(1)
  }

  const phoneNumber = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone
  console.log(`  Phone (send): ${phoneNumber}  ('+' stripped for Meta API)`)
  console.log()

  // ── 6. Direct Meta API call ────────────────────────────────────────────────
  if (!token || !phoneNumberId) {
    console.log('── 6. WhatsApp API ❌ — env vars missing, skipping\n')
    process.exit(1)
  }

  console.log('── 6. Direct WhatsApp API Call')
  console.log(`  Sending to  : ${phoneNumber}`)

  const messageText =
    `SmartPath AI : ${student.name} a terminé son diagnostic. ` +
    `Score initial : ${latestQuiz.initial_score}/5. ` +
    `Score final après révision : ${latestQuiz.final_score}/5.`

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: messageText },
    }),
  })

  const body = await res.text()
  console.log(`  HTTP Status : ${res.status}`)
  console.log(`  Response    : ${body}`)
  console.log()

  if (res.ok) {
    console.log('  ✅ SUCCESS — WhatsApp message sent!')
  } else {
    const parsed = JSON.parse(body)
    const code = parsed?.error?.code
    const msg = parsed?.error?.message ?? body
    console.log(`  ❌ Meta API Error (code ${code}): ${msg}`)
    if (code === 131030) {
      console.log('\n  ── HOW TO FIX ──────────────────────────────────────────────')
      console.log('  Your token and Phone Number ID are correct.')
      console.log('  The problem is that +' + phoneNumber + ' is NOT on the Meta sandbox allowlist.')
      console.log()
      console.log('  Step 1: developers.facebook.com → Your App → WhatsApp → API Setup')
      console.log('          Click "Manage phone number list" next to the To: field')
      console.log('          Add: +' + phoneNumber)
      console.log()
      console.log('  Step 2: From the WhatsApp app on +' + phoneNumber + ',')
      console.log('          send any message to your Meta test number.')
      console.log('          (The test number is shown on that same API Setup page)')
      console.log()
      console.log('  Step 3: Run this script again to confirm: node test_notify_full.js')
      console.log('  ────────────────────────────────────────────────────────────\n')
    } else if (code === 190) {
      console.log('\n  ── HOW TO FIX ──────────────────────────────────────────────')
      console.log('  TOKEN IS EXPIRED. Generate a new one:')
      console.log('  developers.facebook.com → Your App → WhatsApp → API Setup')
      console.log('  Copy the new token into META_WHATSAPP_TOKEN in .env.local')
      console.log('  ────────────────────────────────────────────────────────────\n')
    }
  }
}

process.exit(0)
