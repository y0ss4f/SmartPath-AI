/**
 * Textbook file retrieval utility.
 *
 * Fetches the Gemini File API URI for a given grade from the
 * `textbook_files` Supabase table. If the cached file has expired
 * (Gemini files last ~48 hours), it automatically re-uploads the
 * PDF from disk and updates the database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { supabaseAdmin } from './supabase/admin';

// Lazy-init file manager (only created when needed, server-side only)
let _fileManager: GoogleAIFileManager | null = null;

function getFileManager(): GoogleAIFileManager {
  if (!_fileManager) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }
    _fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
  }
  return _fileManager;
}

// Grade string → PDF filename mapping
const GRADE_TO_FILE: Record<string, string> = {
  '1ère année': 'grade-1.pdf',
  '2ème année': 'grade-2.pdf',
  '3ème année': 'grade-3.pdf',
  '4ème année': 'grade-4.pdf',
  '5ème année': 'grade-5.pdf',
  '6ème année': 'grade-6.pdf',
};

/**
 * Checks whether a Gemini file is still alive by calling getFile().
 * Returns true if the file exists and is in ACTIVE state.
 */
async function isFileActive(geminiFileName: string): Promise<boolean> {
  try {
    const fileManager = getFileManager();
    const info = await fileManager.getFile(geminiFileName);
    return info.state === FileState.ACTIVE;
  } catch {
    // File not found or expired
    return false;
  }
}

/**
 * Re-uploads a textbook PDF to Gemini and updates the DB row.
 * Returns the new file URI.
 */
async function reuploadTextbook(grade: string): Promise<string> {
  const filename = GRADE_TO_FILE[grade];
  if (!filename) {
    throw new Error(`No textbook mapping for grade: ${grade}`);
  }

  // Resolve path relative to project root
  const filePath = path.resolve(process.cwd(), 'textbooks', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Textbook file not found: ${filePath}`);
  }

  console.log(`[textbook] Re-uploading ${filename} for grade "${grade}"...`);
  const fileManager = getFileManager();

  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: 'application/pdf',
    displayName: `SmartPathAI - Math Textbook ${grade}`,
  });

  const newUri = uploadResult.file.uri;
  const newName = uploadResult.file.name;

  // Poll until ACTIVE (max 60 seconds)
  for (let i = 0; i < 30; i++) {
    const info = await fileManager.getFile(newName);
    if (info.state === FileState.ACTIVE) break;
    if (info.state === FileState.FAILED) {
      throw new Error(`Re-upload of ${filename} failed during processing`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Update the database
  await supabaseAdmin
    .from('textbook_files')
    .upsert(
      {
        grade,
        gemini_file_uri: newUri,
        gemini_file_name: newName,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'grade' }
    );

  console.log(`[textbook] Re-upload complete: ${grade} → ${newUri}`);
  return newUri;
}

/**
 * Returns the Gemini File API URI for a given grade's textbook.
 *
 * 1. Looks up the `textbook_files` table for the grade.
 * 2. Validates the cached file is still ACTIVE in Gemini.
 * 3. If expired or missing, re-uploads the PDF from disk automatically.
 * 4. Returns the valid, active `fileUri` string.
 *
 * Returns `null` if the grade has no textbook configured AND no PDF on disk.
 */
export async function getTextbookFileUri(grade: string): Promise<string | null> {
  // 1. Check the database
  const { data: row } = await supabaseAdmin
    .from('textbook_files')
    .select('gemini_file_uri, gemini_file_name')
    .eq('grade', grade)
    .single();

  if (row?.gemini_file_uri && row?.gemini_file_name) {
    // 2. Validate it's still active in Gemini
    const active = await isFileActive(row.gemini_file_name);
    if (active) {
      return row.gemini_file_uri;
    }

    // 3. Expired — re-upload
    console.log(`[textbook] File expired for grade "${grade}", re-uploading...`);
    try {
      return await reuploadTextbook(grade);
    } catch (err) {
      console.error(`[textbook] Re-upload failed for grade "${grade}":`, err);
      return null;
    }
  }

  // 4. No DB row at all — try to upload from disk
  if (GRADE_TO_FILE[grade]) {
    try {
      return await reuploadTextbook(grade);
    } catch (err) {
      console.error(`[textbook] Initial upload failed for grade "${grade}":`, err);
      return null;
    }
  }

  return null;
}
