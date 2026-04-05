'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, BookOpen } from 'lucide-react'
import type { Quiz } from '@/types/database'

interface StudentStatsProps {
  quizzes: Quiz[]
}

const PERCEIVED_LABELS: Record<string, { emoji: string; label: string }> = {
  easy: { emoji: '😊', label: 'Facile' },
  okay: { emoji: '😐', label: 'Normal' },
  hard: { emoji: '😓', label: 'Difficile' },
}

export function StudentStats({ quizzes }: StudentStatsProps) {
  const [expanded, setExpanded] = useState(false)

  // Only count completed quizzes (both scores present)
  const completed = quizzes.filter(q => q.initial_score !== null && q.final_score !== null)
  const inProgress = quizzes.filter(q => q.initial_score === null || q.final_score === null)

  if (quizzes.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 italic">Aucun quiz réalisé pour le moment.</p>
      </div>
    )
  }

  const avgInitial = completed.length > 0
    ? completed.reduce((sum, q) => sum + (q.initial_score ?? 0), 0) / completed.length
    : 0
  const avgFinal = completed.length > 0
    ? completed.reduce((sum, q) => sum + (q.final_score ?? 0), 0) / completed.length
    : 0
  const avgImprovement = avgFinal - avgInitial

  const ImprovementIcon = avgImprovement > 0 ? TrendingUp : avgImprovement < 0 ? TrendingDown : Minus
  const improvementColor = avgImprovement > 0 ? 'text-green-600' : avgImprovement < 0 ? 'text-red-600' : 'text-gray-500'
  const improvementBg = avgImprovement > 0 ? 'bg-green-50' : avgImprovement < 0 ? 'bg-red-50' : 'bg-gray-50'

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Total quizzes */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-medium text-blue-700">
              {completed.length} quiz{completed.length !== 1 ? 'z' : ''}
            </span>
          </div>

          {/* Average improvement */}
          {completed.length > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 ${improvementBg} rounded-lg`}>
              <ImprovementIcon className={`w-3.5 h-3.5 ${improvementColor}`} />
              <span className={`text-xs font-medium ${improvementColor}`}>
                {avgImprovement > 0 ? '+' : ''}{avgImprovement.toFixed(1)} moy.
              </span>
            </div>
          )}

          {/* In progress */}
          {inProgress.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg">
              <span className="text-xs font-medium text-amber-700">
                {inProgress.length} en cours
              </span>
            </div>
          )}
        </div>

        <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Score summary cards */}
          {completed.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Score initial</p>
                <p className="text-lg font-bold text-gray-700 mt-0.5">{avgInitial.toFixed(1)}<span className="text-xs text-gray-400">/12</span></p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Score final</p>
                <p className="text-lg font-bold text-gray-700 mt-0.5">{avgFinal.toFixed(1)}<span className="text-xs text-gray-400">/12</span></p>
              </div>
              <div className={`${improvementBg} rounded-xl p-3 text-center`}>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Progrès</p>
                <p className={`text-lg font-bold ${improvementColor} mt-0.5`}>
                  {avgImprovement > 0 ? '+' : ''}{avgImprovement.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Recent quiz history */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historique récent</p>
            {quizzes.slice(0, 5).map((quiz) => (
              <div key={quiz.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 truncate" dir="rtl">
                    {quiz.unit || quiz.subject || 'Sans matière'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {quiz.initial_score !== null && quiz.final_score !== null ? (
                    <>
                      <span className="text-xs text-gray-500">{quiz.initial_score}/12</span>
                      <span className="text-xs text-gray-300">→</span>
                      <span className="text-xs font-semibold text-gray-700">{quiz.final_score}/12</span>
                      {quiz.final_score > quiz.initial_score && (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      )}
                      {quiz.final_score < quiz.initial_score && (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-amber-600 italic">En cours…</span>
                  )}
                  {/* Perceived difficulty */}
                  {quiz.perceived_difficulty && PERCEIVED_LABELS[quiz.perceived_difficulty] && (
                    <span className="text-xs" title={PERCEIVED_LABELS[quiz.perceived_difficulty].label}>
                      {PERCEIVED_LABELS[quiz.perceived_difficulty].emoji}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-1">
                    {new Date(quiz.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
