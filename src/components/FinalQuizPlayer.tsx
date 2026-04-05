'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Loader2, Clock } from 'lucide-react'
import type { QuizQuestion, TimeEntry, WrongAnswer, PerceivedDifficulty } from '@/types/database'

const DIFFICULTY_CONFIG = {
  easy: { label: 'سهل', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  hard: { label: 'صعب', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  expert: { label: 'خبير', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
} as const

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

interface FinalQuizPlayerProps {
  questions: QuizQuestion[]
  onComplete: (score: number, wrongAnswers: WrongAnswer[], timeLog: TimeEntry[], perceivedDifficulty: PerceivedDifficulty) => void
}

type FinalQuizStep = 'quiz' | 'rating'

export function FinalQuizPlayer({ questions, onComplete }: FinalQuizPlayerProps) {
  const [step, setStep] = useState<FinalQuizStep>('quiz')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(
    new Array(questions.length).fill(null)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const questionStartRef = useRef<number>(Date.now())
  const timeLogRef = useRef<number[]>(new Array(questions.length).fill(0))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scoring state (saved after quiz grading, used in rating step)
  const scoreRef = useRef(0)
  const wrongAnswersRef = useRef<WrongAnswer[]>([])

  const current = questions[currentIndex]
  const allAnswered = answers.every((a) => a !== null)
  const isLast = currentIndex === questions.length - 1
  const difficulty = current ? (DIFFICULTY_CONFIG[current.difficulty] || DIFFICULTY_CONFIG.easy) : DIFFICULTY_CONFIG.easy

  // Start/restart timer
  const startTimer = useCallback(() => {
    questionStartRef.current = Date.now()
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartRef.current) / 1000))
    }, 1000)
  }, [])

  const recordTime = useCallback(() => {
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000)
    timeLogRef.current[currentIndex] += elapsed
    if (timerRef.current) clearInterval(timerRef.current)
  }, [currentIndex])

  useEffect(() => {
    if (step === 'quiz') {
      startTimer()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, step, startTimer])

  function selectOption(option: string) {
    const next = [...answers]
    next[currentIndex] = option
    setAnswers(next)
  }

  function navigateTo(newIndex: number) {
    recordTime()
    setCurrentIndex(newIndex)
  }

  function handleSubmitQuiz() {
    if (!allAnswered) return
    setIsSubmitting(true)
    recordTime()

    let score = 0
    const wrongAnswers: WrongAnswer[] = []

    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) {
        score++
      } else {
        wrongAnswers.push({
          question: q.question,
          selected: answers[i]!,
          correct: q.correct_answer,
        })
      }
    })

    scoreRef.current = score
    wrongAnswersRef.current = wrongAnswers

    // Show the perceived difficulty rating screen
    setStep('rating')
    setIsSubmitting(false)
  }

  function handleRatingSelected(rating: PerceivedDifficulty) {
    const timeLog: TimeEntry[] = timeLogRef.current.map((seconds, index) => ({
      question_index: index,
      seconds,
    }))

    onComplete(scoreRef.current, wrongAnswersRef.current, timeLog, rating)
  }

  // --- Rating screen ---
  if (step === 'rating') {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-2xl flex items-center justify-center shadow-lg">
          <Trophy className="w-8 h-8 text-amber-600" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          أحسنت! أتممت الاختبار
        </h3>
        <p className="text-gray-500 text-sm mb-8" dir="rtl">
          كيف وجدت هذا الاختبار؟
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleRatingSelected('easy')}
            className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">😊</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-emerald-700" dir="rtl">سهل</span>
          </button>
          <button
            onClick={() => handleRatingSelected('okay')}
            className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-all group"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">😐</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-amber-700" dir="rtl">عادي</span>
          </button>
          <button
            onClick={() => handleRatingSelected('hard')}
            className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all group"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">😓</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-red-700" dir="rtl">صعب</span>
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Cette réponse ne sera pas notée — elle nous aide à mieux comprendre ton expérience.
        </p>
      </div>
    )
  }

  // --- Quiz screen ---
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Quiz final — Question {currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-mono font-medium text-gray-600">{formatTime(elapsedSeconds)}</span>
            </div>
            <span>{answers.filter((a) => a !== null).length} répondue(s)</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" dir="rtl">
        {/* Difficulty badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${difficulty.bg} ${difficulty.text} ${difficulty.border}`}>
            {difficulty.label}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-5">
          {current.question}
        </h3>

        <div className="space-y-3">
          {current.options.map((option) => {
            const isSelected = answers[currentIndex] === option
            return (
              <button
                key={option}
                onClick={() => selectOption(option)}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all font-medium ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => navigateTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        {isLast ? (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSubmitQuiz}
              disabled={!allAnswered || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              Voir mes résultats
            </button>
            {!allAnswered && (
              <p className="text-xs text-amber-600">
                Réponds aux {questions.length - answers.filter(a => a !== null).length} question(s) restante(s)
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigateTo(currentIndex + 1)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-600 rounded-xl hover:bg-amber-50 transition-all"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
