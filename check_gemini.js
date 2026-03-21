require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return console.log('API KEY IS INVALID OR PLACEHOLDER');
  }
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (data.error) {
      console.log('API Error:', data.error.message);
      return;
    }
    
    const models = data.models.map(m => m.name);
    console.log('Available Models for this API Key:');
    models.forEach(m => console.log('  - ' + m));
    
    const hasFlash = models.includes('models/gemini-1.5-flash');
    console.log('\nDoes it have gemini-1.5-flash? ->', hasFlash ? 'YES' : 'NO');
  } catch (err) {
    console.log('Fetch error:', err.message);
  }
}

listModels();
