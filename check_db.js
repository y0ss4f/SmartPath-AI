const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
    console.log('--- USERS ---');
    const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
    if (err1) console.error('Error fetching users:', err1);
    else console.log(users.users.map(u => ({ id: u.id, email: u.email, confirmed: u.email_confirmed_at != null })));

    console.log('\n--- PROFILES ---');
    const { data: profiles, error: err2 } = await supabase.from('profiles').select('*');
    if (err2) console.error('Error fetching profiles:', err2);
    else console.log(profiles);
}

checkDb();
