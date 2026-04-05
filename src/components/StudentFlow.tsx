'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, BookOpen } from 'lucide-react'
import { QuizPlayer } from './QuizPlayer'
import { SmartSlides } from './SmartSlides'
import { FinalQuizPlayer } from './FinalQuizPlayer'
import { ResultsScreen } from './ResultsScreen'
import type { Student, Quiz, QuizQuestion, SmartSlide, TimeEntry, WrongAnswer, PerceivedDifficulty } from '@/types/database'

type Step =
  | 'loading'
  | 'quiz'
  | 'slides'
  | 'generating-final-quiz'
  | 'final-quiz'
  | 'results'

const FUN_FACTS = [
  "Le cerveau humain peut stocker environ 2,5 pétaoctets d'informations !",
  "Lire à voix haute aide à mémoriser 10 fois mieux qu'en lisant silencieusement.",
  "Les erreurs sont la meilleure façon d'apprendre — chaque faute renforce la mémoire.",
  "Faire des pauses régulières améliore la concentration et la rétention.",
  "Le sommeil consolide les souvenirs : réviser avant de dormir est très efficace.",
  "Expliquer une notion à quelqu'un d'autre est la meilleure façon de la maîtriser.",
  "Dessiner des schémas aide le cerveau à organiser et retenir l'information.",
]

function FunFactLoader({ color, title, subtitle }: { color: string; title: string; subtitle: string }) {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FUN_FACTS.length))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % FUN_FACTS.length)
        setVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <Loader2 className={`w-10 h-10 ${color} animate-spin mb-4`} />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm max-w-xs mb-8">{subtitle}</p>
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Le saviez-vous ?</p>
        <p
          className="text-sm text-gray-700 leading-relaxed transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {FUN_FACTS[factIndex]}
        </p>
      </div>
    </div>
  )
}

interface StudentFlowProps {
  student: Student
  quiz: Quiz | null
}

export function StudentFlow({ student, quiz }: StudentFlowProps) {
  // Determine initial step from quiz state
  function getInitialStep(): Step {
    if (!quiz || !quiz.initial_quiz_json) return 'loading'
    if (quiz.final_score !== null) return 'results'
    if (quiz.final_quiz_json) return 'final-quiz'
    // Both quiz + slides are pre-loaded — start with quiz
    return 'quiz'
  }

  const [step, setStep] = useState<Step>(getInitialStep)
  const [error, setError] = useState<string | null>(null)

  // Data flowing through the pipeline
  const [quizQuestions] = useState<QuizQuestion[]>(
    quiz?.initial_quiz_json?.quiz_questions ?? []
  )
  const [courseSlides] = useState<SmartSlide[]>(
    quiz?.generated_course_json?.smart_slides ?? []
  )
  const [finalQuizQuestions, setFinalQuizQuestions] = useState<QuizQuestion[]>(
    quiz?.final_quiz_json?.quiz_questions ?? []
  )
  const [initialScore, setInitialScore] = useState<number>(quiz?.initial_score ?? 0)
  const [finalScore, setFinalScore] = useState<number>(quiz?.final_score ?? 0)

  // Time logs for the initial quiz (stored to submit combined later)
  const [initialTimeLog, setInitialTimeLog] = useState<TimeEntry[]>([])

  // Wrong answers from initial quiz (needed for final quiz generation)
  const wrongAnswersRef = useRef<WrongAnswer[]>([])

  const quizId = quiz?.id

  // --- Step handlers ---

  function handleQuizComplete(score: number, wrongAnswers: WrongAnswer[], timeLog: TimeEntry[]) {
    setInitialScore(score)
    setInitialTimeLog(timeLog)
    wrongAnswersRef.current = wrongAnswers
    setError(null)

    // Slides are already pre-generated, go directly to slides
    setStep('slides')
  }

  async function handleSlidesComplete() {
    setStep('generating-final-quiz')
    setError(null)

    try {
      const res = await fetch('/api/generate-final-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          wrong_answers: wrongAnswersRef.current,
          initial_score: initialScore,
        }),
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

  async function handleFinalQuizComplete(score: number, _wrongAnswers: WrongAnswer[], timeLog: TimeEntry[], perceivedDifficulty: PerceivedDifficulty) {
    setFinalScore(score)
    setError(null)

    // Combine initial quiz time log and final quiz time log
    // Initial: question_index 0–11, Final: question_index 12–23
    const combinedTimeLog = [
      ...initialTimeLog,
      ...timeLog.map(t => ({ ...t, question_index: t.question_index + 12 })),
    ]

    try {
      await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          final_score: score,
          time_spent_per_question: combinedTimeLog,
          perceived_difficulty: perceivedDifficulty,
        }),
      })
    } catch {
      // Score save failure shouldn't block the results screen
    }

    // Fire-and-forget WhatsApp notification — never blocks results screen
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId }),
    }).catch(() => {
      // Notification failure is silent
    })

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
          {quiz?.unit && (
            <span className="text-xs text-gray-400 border-l border-gray-200 pl-2" dir="rtl">
              {quiz.unit}
            </span>
          )}
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

      {step === 'slides' && courseSlides.length > 0 && (
        <SmartSlides slides={courseSlides} unit={quiz?.unit} grade={quiz?.grade} onComplete={handleSlidesComplete} />
      )}

      {step === 'generating-final-quiz' && (
        <FunFactLoader
          color="text-amber-500"
          title="Préparation du quiz final…"
          subtitle="Encore un petit effort ! Un dernier quiz pour voir ta progression."
        />
      )}

      {step === 'final-quiz' && finalQuizQuestions.length > 0 && (
        <FinalQuizPlayer questions={finalQuizQuestions} onComplete={handleFinalQuizComplete} />
      )}

      {step === 'results' && (
        <ResultsScreen
          initialScore={initialScore}
          finalScore={finalScore}
          studentName={student.name}
          totalQuestions={12}
        />
      )}
    </div>
  )
}
