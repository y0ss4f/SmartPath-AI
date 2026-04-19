/**
 * One-time script: Upload Tunisian math textbook PDFs to the Gemini File API
 * and store the resulting file URIs in the Supabase `textbook_files` table.
 *
 * Usage:
 *   npx tsx scripts/upload-textbooks.ts
 *
 * Prerequisites:
 *   - 6 PDF files in /textbooks/ folder (grade-1.pdf through grade-6.pdf)
 *   - GEMINI_API_KEY set in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in .env.local
 *   - Supabase `textbook_files` table created (see ROADMAP.md)
 *
 * The Gemini File API stores files for 48 hours. The app's textbook utility
 * (`src/utils/textbook.ts`) handles automatic re-uploads when files expire.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { createClient } from '@supabase/supabase-js';

// --- Config ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY in .env.local');
if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');

const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map filenames to grade_level strings (matching students.grade_level in DB)
const GRADE_MAP: Record<string, string> = {
  'grade-1.pdf': '1ère année',
  'grade-2.pdf': '2ème année',
  'grade-3.pdf': '3ème année',
  'grade-4.pdf': '4ème année',
  'grade-5.pdf': '5ème année',
  'grade-6.pdf': '6ème année',
};

async function waitForFileActive(fileName: string, maxAttempts = 30): Promise<void> {
  console.log(`  ⏳ Waiting for ${fileName} to become ACTIVE...`);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fileInfo = await fileManager.getFile(fileName);
    if (fileInfo.state === FileState.ACTIVE) {
      console.log(`  ✅ ${fileName} is ACTIVE`);
      return;
    }
    if (fileInfo.state === FileState.FAILED) {
      throw new Error(`File ${fileName} processing FAILED: ${JSON.stringify(fileInfo.error)}`);
    }
    // Wait 2 seconds before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for ${fileName} to become ACTIVE`);
}

async function main() {
  const textbooksDir = path.resolve(__dirname, '..', 'textbooks');

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SmartPath AI — Textbook Upload Pipeline     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📂 Textbooks directory: ${textbooksDir}\n`);

  const files = Object.keys(GRADE_MAP);
  let successCount = 0;

  for (const filename of files) {
    const grade = GRADE_MAP[filename];
    const filePath = path.join(textbooksDir, filename);

    console.log(`\n── Grade: ${grade} (${filename}) ──`);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ File not found: ${filePath}`);
      continue;
    }

    const stats = fs.statSync(filePath);
    console.log(`  📄 Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    try {
      // Upload to Gemini File API
      console.log('  📤 Uploading to Gemini File API...');
      const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType: 'application/pdf',
        displayName: `SmartPathAI - Math Textbook ${grade}`,
      });

      const geminiFileUri = uploadResult.file.uri;
      const geminiFileName = uploadResult.file.name;
      console.log(`  ✅ Upload complete → URI: ${geminiFileUri}`);

      // Wait for the file to be processed and reach ACTIVE state
      await waitForFileActive(geminiFileName);

      // Upsert into Supabase textbook_files table
      console.log('  💾 Saving to Supabase textbook_files...');
      const { error: dbError } = await supabase
        .from('textbook_files')
        .upsert(
          {
            grade,
            gemini_file_uri: geminiFileUri,
            gemini_file_name: geminiFileName,
            uploaded_at: new Date().toISOString(),
          },
          { onConflict: 'grade' }
        );

      if (dbError) {
        console.error(`  ❌ Supabase error: ${dbError.message}`);
        continue;
      }

      console.log(`  ✅ Saved to DB: grade="${grade}" → ${geminiFileUri}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n${'═'.repeat(48)}`);
  console.log(`✅ Done! ${successCount}/${files.length} textbooks uploaded successfully.`);

  if (successCount < files.length) {
    console.log('⚠️  Some uploads failed. Re-run the script to retry.');
  }

  // Verify by listing all rows
  const { data: rows } = await supabase
    .from('textbook_files')
    .select('grade, gemini_file_uri, uploaded_at')
    .order('grade');

  if (rows && rows.length > 0) {
    console.log('\n📋 Current textbook_files table:');
    rows.forEach((r) => {
      console.log(`  ${r.grade} → ${r.gemini_file_uri} (uploaded: ${new Date(r.uploaded_at).toLocaleString()})`);
    });
  }
}

main().catch(console.error);
