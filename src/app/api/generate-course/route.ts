import { NextResponse } from 'next/server';

// This route is DEPRECATED as of Sprint 6.
// Smart Slides are now generated upfront in /api/generate-quiz.
// Keeping this route alive to return a clear 410 Gone instead of a confusing 404.

export async function POST() {
  return NextResponse.json(
    {
      error: 'GONE',
      message:
        'Cette route est obsolète. Les Smart Slides sont désormais générées avec le quiz initial via /api/generate-quiz.',
    },
    { status: 410 }
  );
}
