'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { detectDirection } from '@/utils/rtl'
import type { QuizQuestion } from '@/types/database'

interface WrongAnswer {
  question: string
  selected: string
  correct: string
}

interface QuizPlayerProps {
  questions: QuizQuestion[]
  onComplete: (score: number, wrongAnswers: WrongAnswer[]) => void
}

export function QuizPlayer({ questions, onComplete }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(string | null)[]>(
    new Array(questions.length).fill(null)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const current = questions[currentIndex]
  const dir = detectDirection(current.question)
  const allAnswered = answers.every((a) => a !== null)
  const isLast = currentIndex === questions.length - 1

  function selectOption(option: string) {
    const next = [...answers]
    next[currentIndex] = option
    setAnswers(next)
  }

  function handleSubmit() {
    if (!allAnswered) return
    setIsSubmitting(true)

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

    onComplete(score, wrongAnswers)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentIndex + 1} / {questions.length}</span>
          <span>{answers.filter((a) => a !== null).length} répondue(s)</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" dir={dir}>
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
                className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
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
          onClick={() => setCurrentIndex((i) => i - 1)}
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
            onClick={() => setCurrentIndex((i) => i + 1)}
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
