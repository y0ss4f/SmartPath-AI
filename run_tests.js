const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTests() {
  console.log('--- Logging in to get fresh session ---');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test4@exemple.com', // Let's try test2 or test4, whatever is in DB. We will just create a new one to be sure.
    password: 'password123'
  });

  let user = auth?.user;
  let session = auth?.session;

  if (authError || !user) {
    console.log('Login failed, creating a brand new test user...');
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: 'apitest@exemple.com',
      password: 'password123',
      options: { data: { role: 'parent', phone_number: '+21699999999' } }
    });
    if (signUpErr) return console.error('Failed to create test user:', signUpErr);
    user = signUpData.user;
    session = signUpData.session;
  }
  
  if (!session) return console.error('Could not get session.');
  console.log('Logged in as:', user.email);

  // 1. We need a student_id. Let's create one since we bypassed the UI.
  console.log('--- Creating a test student ---');
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: student, error: studentErr } = await supabaseAdmin.from('students').insert({
    parent_id: user.id,
    name: 'API Test Child',
    grade_level: '1ère année',
    qr_code_hash: 'api-test-hash-' + Date.now()
  }).select('id').single();

  if (studentErr) return console.error('Failed to create student:', studentErr);
  const studentId = student.id;
  console.log('Student created:', studentId);

  const BASE_URL = 'http://localhost:3000';
  
  // Create a proper FormData payload for Flow A
  const FormData = require('form-data');
  const form = new FormData();
  form.append('student_id', studentId);
  form.append('subject', 'Mathématiques');
  
  // Create a dummy image file if test_notebook.jpeg doesn't exist
  if (!fs.existsSync('./test_notebook.jpeg')) {
    fs.writeFileSync('./dummy.txt', 'dummy image');
    form.append('image', fs.createReadStream('./dummy.txt'), { filename: 'test_notebook.jpeg', contentType: 'image/jpeg' });
  } else {
    form.append('image', fs.createReadStream('./test_notebook.jpeg'));
  }

  console.log('\n▶ Test 1: Flow A (Generate Quiz)');
  const resA = await fetch(`${BASE_URL}/api/generate-quiz`, {
    method: 'POST',
    // In Next.js App Router API, we need the cookies chunked exactly as Supabase SSR sets them.
    // However, for standard Next.js API routes using @supabase/ssr, passing the JWT in the Authorization header 
    // MIGHT work if the route checks headers. Wait, `createClient` from `@supabase/ssr` ONLY checks cookies in Server Actions/Route Handlers!
    // It DOES NOT check the Authorization header. IT STRICTLY CHECKS COOKIES.
    // We must manually construct the supabase chunked cookies. 
    // Actually, @supabase/ssr reads `sb-[id]-auth-token` chunks.
    // Let's format the session into the exact base64 JSON string Supabase expects.
    headers: {
      'Cookie': `sb-liajsiovdjseguzmgqid-auth-token=${Buffer.from(JSON.stringify(session)).toString('base64')}`,
      ...form.getHeaders()
    },
    body: form
  });

  const bodyA = await resA.text();
  console.log('Flow A Status:', resA.status);
  console.log('Flow A Response:', bodyA);
  
  let quizId;
  try { quizId = JSON.parse(bodyA).quiz_id; } catch(e) {}
  
  if (!quizId) return console.log('Stopping. Flow A did not return a quiz_id.');

  console.log('\n▶ Test 2: Flow B (Generate Course)');
  const resB = await fetch(`${BASE_URL}/api/generate-course`, {
    method: 'POST',
    headers: {
      'Cookie': `sb-liajsiovdjseguzmgqid-auth-token=${Buffer.from(JSON.stringify(session)).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quiz_id: quizId,
      initial_score: 3,
      wrong_answers: [ { question: "Q1", selected: "A", correct: "B" } ]
    })
  });
  console.log('Flow B Status:', resB.status);
  console.log('Flow B Response:', await resB.text());

  console.log('\n▶ Test 3: Flow C (Generate Final Quiz)');
  const resC = await fetch(`${BASE_URL}/api/generate-final-quiz`, {
    method: 'POST',
    headers: {
      'Cookie': `sb-liajsiovdjseguzmgqid-auth-token=${Buffer.from(JSON.stringify(session)).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ quiz_id: quizId })
  });
  console.log('Flow C Status:', resC.status);
  console.log('Flow C Response:', await resC.text());
}

runTests();
