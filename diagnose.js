const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use admin to bypass RLS for the insert, but also test WITH the anon key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnose() {
    // 1. Check what policies exist on students table
    console.log('--- CHECKING LIVE POLICIES ---');
    const { data: policies, error: polErr } = await supabaseAdmin.rpc('pg_policies_check');
    if (polErr) console.log('RPC not available, skipping');

    // 2. Login as the test user
    const { data: auth } = await supabaseAnon.auth.signInWithPassword({
        email: 'test2@test.com',
        password: 'password123'
    });
    const user = auth.user;
    console.log('Auth UID:', user.id);

    // 3. Try a direct REST insert with Authorization header to simulate Next.js SSR
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${auth.session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            parent_id: user.id,
            name: 'Debug Child 999',
            grade_level: '1ère année',
            qr_code_hash: 'debug-unique-hash-999'
        })
    });
    const text = await res.text();
    console.log('REST INSERT status:', res.status);
    console.log('REST INSERT body:', text);
}

diagnose();
