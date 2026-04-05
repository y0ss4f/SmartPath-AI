'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Clock } from 'lucide-react'
import type { QuizQuestion, TimeEntry, WrongAnswer } from '@/types/database'

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

interface QuizPlayerProps {
  questions: QuizQuestion[]
  onComplete: (score: number, wrongAnswers: WrongAnswer[], timeLog: TimeEntry[]) => void
}

export function QuizPlayer({ questions, onComplete }: QuizPlayerProps) {
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

  const current = questions[currentIndex]
  const allAnswered = answers.every((a) => a !== null)
  const isLast = currentIndex === questions.length - 1
  const difficulty = DIFFICULTY_CONFIG[current.difficulty] || DIFFICULTY_CONFIG.easy

  // Start/restart timer for current question
  const startTimer = useCallback(() => {
    questionStartRef.current = Date.now()
    setElapsedSeconds(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - questionStartRef.current) / 1000))
    }, 1000)
  }, [])

  // Record time for current question and stop timer
  const recordTime = useCallback(() => {
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000)
    timeLogRef.current[currentIndex] += elapsed
    if (timerRef.current) clearInterval(timerRef.current)
  }, [currentIndex])

  // Start timer on mount and when question changes
  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, startTimer])

  function selectOption(option: string) {
    const next = [...answers]
    next[currentIndex] = option
    setAnswers(next)
  }

  function navigateTo(newIndex: number) {
    recordTime()
    setCurrentIndex(newIndex)
  }

  function handleSubmit() {
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

    const timeLog: TimeEntry[] = timeLogRef.current.map((seconds, index) => ({
      question_index: index,
      seconds,
    }))

    onComplete(score, wrongAnswers, timeLog)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentIndex + 1} / {questions.length}</span>
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
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" dir="rtl">
        {/* Difficulty badge */}
        <div className="flex items-center justify-between mb-4" dir="rtl">
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
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
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
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Terminer
            </button>
            {!allAnswered && (
              <p className="text-xs text-blue-600">
                Réponds aux {questions.length - answers.filter(a => a !== null).length} question(s) restante(s)
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigateTo(currentIndex + 1)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
