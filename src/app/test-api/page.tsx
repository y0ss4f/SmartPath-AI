'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestAPIPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const log = (msg: string) => setLogs((prev) => [...prev, msg]);

  const runTests = async () => {
    if (!file) {
      alert("Please upload an image of handwriting first!");
      return;
    }
    setLoading(true);
    setLogs([]);
    try {
      log('--- Fetching User ---');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in. Go to /login first.');
      log(`Logged in as: ${user.email}`);

      log('--- Fetching a Student ---');
      const { data: students } = await supabase.from('students').select('id').eq('parent_id', user.id).limit(1);
      if (!students || students.length === 0) throw new Error('No students found. Add one in the dashboard.');
      const studentId = students[0].id;
      log(`Found student: ${studentId}`);

      log('--- Flow A: POST /api/generate-quiz ---');
      const formData = new FormData();
      formData.append('image', file);
      formData.append('student_id', studentId);

      const resA = await fetch('/api/generate-quiz', { method: 'POST', body: formData });
      const dataA = await resA.json();
      log(`Status: ${resA.status}`);
      if (!resA.ok) throw new Error(dataA.message || 'Flow A failed');
      log(`Quiz ID: ${dataA.quiz_id}`);

      log('--- Flow B: POST /api/generate-course ---');
      const resB = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: dataA.quiz_id,
          initial_score: 3,
          wrong_answers: [{ question: "A", selected: "B", correct: "C" }]
        })
      });
      const dataB = await resB.json();
      log(`Status: ${resB.status}`);
      if (!resB.ok) throw new Error(dataB.message || 'Flow B failed');
      log(`Course Generated: ${dataB.pain_points_identified?.length} pain points.`);

      log('--- Flow C: POST /api/generate-final-quiz ---');
      const resC = await fetch('/api/generate-final-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: dataA.quiz_id })
      });
      const dataC = await resC.json();
      log(`Status: ${resC.status}`);
      if (!resC.ok) throw new Error(dataC.message || 'Flow C failed');
      log(`Final Quiz Generated: ${dataC.quiz_questions?.length} questions.`);

      log('--- ALL TESTS PASSED SUCCESSFULLY! ---');

    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">API Test Suite</h1>
      <p className="text-gray-600">This automatically uses your real browser cookies to bypass cURL blocking.</p>
      
      <div className="p-4 border border-dashed border-gray-300 rounded-md">
        <label className="block text-sm font-medium mb-2">Upload Notebook Image</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full"
        />
      </div>

      <button onClick={runTests} disabled={loading || !file} className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md disabled:bg-gray-400">
        {loading ? 'Running Tests...' : 'Run Sprint 3 Full Auto-Test'}
      </button>
      <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm min-h-[400px] rounded-md overflow-y-auto whitespace-pre-wrap">
        {logs.map((L, i) => <div key={i}>{L}</div>)}
      </div>
    </div>
  );
}
