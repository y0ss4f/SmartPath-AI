'use client'

import { useState } from 'react'
import { Loader2, BookOpen } from 'lucide-react'
import { QuizPlayer } from './QuizPlayer'
import { SmartSlides } from './SmartSlides'
import { FinalQuizPlayer } from './FinalQuizPlayer'
import { ResultsScreen } from './ResultsScreen'
import type { Student, Quiz, QuizQuestion, SmartSlide } from '@/types/database'

type Step =
  | 'loading'
  | 'quiz'
  | 'generating-course'
  | 'slides'
  | 'generating-final-quiz'
  | 'final-quiz'
  | 'results'

interface StudentFlowProps {
  student: Student
  quiz: Quiz | null
}

interface WrongAnswer {
  question: string
  selected: string
  correct: string
}

export function StudentFlow({ student, quiz }: StudentFlowProps) {
  // Determine initial step from quiz state
  function getInitialStep(): Step {
    if (!quiz || !quiz.initial_quiz_json) return 'loading'
    if (quiz.final_score !== null) return 'results'
    if (quiz.final_quiz_json) return 'final-quiz'
    if (quiz.generated_course_json) return 'slides'
    return 'quiz'
  }

  const [step, setStep] = useState<Step>(getInitialStep)
  const [error, setError] = useState<string | null>(null)

  // Data flowing through the pipeline
  const [quizQuestions] = useState<QuizQuestion[]>(
    quiz?.initial_quiz_json?.quiz_questions ?? []
  )
  const [courseSlides, setCourseSlides] = useState<SmartSlide[]>(
    quiz?.generated_course_json?.smart_slides ?? []
  )
  const [finalQuizQuestions, setFinalQuizQuestions] = useState<QuizQuestion[]>(
    quiz?.final_quiz_json?.quiz_questions ?? []
  )
  const [initialScore, setInitialScore] = useState<number>(quiz?.initial_score ?? 0)
  const [finalScore, setFinalScore] = useState<number>(quiz?.final_score ?? 0)

  const quizId = quiz?.id

  // --- Step handlers ---

  async function handleQuizComplete(score: number, wrongAnswers: WrongAnswer[]) {
    setInitialScore(score)
    setStep('generating-course')
    setError(null)

    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          initial_score: score,
          wrong_answers: wrongAnswers,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la génération du cours.')

      setCourseSlides(data.smart_slides)
      setStep('slides')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setStep('quiz')
    }
  }

  async function handleSlidesComplete() {
    setStep('generating-final-quiz')
    setError(null)

    try {
      const res = await fetch('/api/generate-final-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la génération du quiz final.')

      setFinalQuizQuestions(data.quiz_questions)
      setStep('final-quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setStep('slides')
    }
  }

  async function handleFinalQuizComplete(score: number) {
    setFinalScore(score)
    setError(null)

    try {
      await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, final_score: score }),
      })
    } catch {
      // Score save failure shouldn't block the results screen
    }

    setStep('results')
  }

  // --- Render ---

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm text-sm text-gray-600 mb-3">
          <BookOpen className="w-4 h-4 text-blue-500" />
          {student.name} — {student.grade_level}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 'quiz' && quizQuestions.length > 0 && (
        <QuizPlayer questions={quizQuestions} onComplete={handleQuizComplete} />
      )}

      {step === 'generating-course' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Analyse de tes réponses…
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            L&apos;IA prépare une leçon personnalisée pour t&apos;aider à progresser.
          </p>
        </div>
      )}

      {step === 'slides' && courseSlides.length > 0 && (
        <SmartSlides slides={courseSlides} onComplete={handleSlidesComplete} />
      )}

      {step === 'generating-final-quiz' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Préparation du quiz final…
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Encore un petit effort ! Un dernier quiz pour voir ta progression.
          </p>
        </div>
      )}

      {step === 'final-quiz' && finalQuizQuestions.length > 0 && (
        <FinalQuizPlayer questions={finalQuizQuestions} onComplete={handleFinalQuizComplete} />
      )}

      {step === 'results' && (
        <ResultsScreen
          initialScore={initialScore}
          finalScore={finalScore}
          studentName={student.name}
          totalQuestions={quizQuestions.length || 5}
        />
      )}
    </div>
  )
}
