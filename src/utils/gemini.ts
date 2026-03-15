import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel: GenerativeModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

/**
 * Strips markdown code fences from Gemini output and parses the result as JSON.
 * Gemini often wraps JSON in ```json ... ``` blocks, which breaks JSON.parse().
 * Throws if the extracted text cannot be parsed as valid JSON.
 */
export function extractJSON<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Converts a File/Blob to the inline data format required by the Gemini Vision API.
 */
export async function fileToGenerativePart(
  file: File
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const buffer = await file.arrayBuffer();
  const data = Buffer.from(buffer).toString('base64');
  return {
    inlineData: {
      data,
      mimeType: file.type,
    },
  };
}
