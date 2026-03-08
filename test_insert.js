const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    if (!users?.users?.length) return console.log('No users to test with');

    const parentId = users.users[0].id;

    console.log('Testing insert for parent:', parentId);

    const { error } = await supabaseAdmin.from('students').insert({
        parent_id: parentId,
        name: 'Test Child',
        grade_level: '1ère année',
        qr_code_hash: 'test-hash-123'
    });

    if (error) {
        console.error('INSERT FAILED:', error.message, error.details, error.hint);
    } else {
        console.log('INSERT SUCCESSFUL');
    }
}

testInsert();
