const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'exemple@email.com',
        password: 'password123' // Not sure what the user set, but we can check if it returns invalid credentials
    });
    console.log('Login result:', error ? error.message : 'Success: ' + data.user.id);
}
testLogin();
