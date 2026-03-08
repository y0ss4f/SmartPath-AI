const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectError() {
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'test2@test.com',
        password: 'password123'
    });

    const user = authData.user;

    const { data, error } = await supabase.rpc('get_my_uid'); // We don't have this

    // Let's just do a fetch using the access_token to profile endpoint
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
    const res = await fetch(url, {
        headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${authData.session.access_token}`
        }
    });
    const json = await res.json();
    console.log('Rest profile fetch:', json);
}

inspectError();
