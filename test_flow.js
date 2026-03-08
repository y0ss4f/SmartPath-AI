const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugFlow() {
    console.log('--- LOGGING IN ---');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test2@test.com',
        password: 'password123'
    });

    if (authError) {
        return console.error('LOGIN FAILED:', authError.message);
    }

    const user = authData.user;
    console.log('Logged in as:', user.email, 'ID:', user.id);

    console.log('\n--- TESTING INSERT WITH SESSION ---');
    const { error: insertError } = await supabase.from('students').insert({
        parent_id: user.id,
        name: 'Debug Child',
        grade_level: '2ème année',
        qr_code_hash: 'debug-hash-456'
    });

    if (insertError) {
        console.error('INSERT FAILED:', insertError);
    } else {
        console.log('INSERT SUCCESSFUL');
    }

    console.log('\n--- TESTING PROFILE READ (MIDDLEWARE SIMULATION) ---');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profileError) {
        console.error('PROFILE READ FAILED:', profileError);
    } else {
        console.log('PROFILE READ SUCCESSFUL:', profile);
    }
}

debugFlow();
