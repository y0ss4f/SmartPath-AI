/**
 * Detects whether a string contains Arabic text and returns the appropriate
 * HTML direction attribute value. Used by Quiz, SmartSlides, and FinalQuiz
 * components to render AI-generated content correctly for both French (LTR)
 * and Arabic (RTL) output.
 */

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function detectDirection(text: string): 'rtl' | 'ltr' {
  return ARABIC_REGEX.test(text) ? 'rtl' : 'ltr';
}
