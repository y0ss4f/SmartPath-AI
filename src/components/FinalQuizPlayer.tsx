'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Loader2 } from 'lucide-react'
import { detectDirection } from '@/utils/rtl'
import type { QuizQuestion } from '@/types/database'

interface FinalQuizPlayerProps {
  questions: QuizQuestion[]
  onComplete: (score: number) => void
}

export function FinalQuizPlayer({ questions, onComplete }: FinalQuizPlayerProps) {
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
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) score++
    })

    onComplete(score)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Quiz final — Question {currentIndex + 1} / {questions.length}</span>
          </div>
          <span>{answers.filter((a) => a !== null).length} répondue(s)</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
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
            onClick={() => setCurrentIndex((i) => i + 1)}
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
