'use client'

import { Trophy, TrendingUp, Star } from 'lucide-react'

interface ResultsScreenProps {
  initialScore: number
  finalScore: number
  studentName: string
  totalQuestions: number
}

export function ResultsScreen({ initialScore, finalScore, studentName, totalQuestions }: ResultsScreenProps) {
  const improved = finalScore > initialScore
  const same = finalScore === initialScore
  const delta = finalScore - initialScore

  function getMessage() {
    if (finalScore === totalQuestions) return 'Score parfait ! Tu es un champion !'
    if (improved) return 'Bravo, tu as progressé ! Continue comme ça !'
    if (same) return 'Bon travail ! Reviens t\'entraîner pour progresser encore !'
    return 'Ne t\'inquiète pas, chaque essai te rend plus fort !'
  }

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* Trophy icon */}
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-yellow-200 rounded-2xl flex items-center justify-center shadow-lg">
        <Trophy className="w-10 h-10 text-amber-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Bravo {studentName} !
      </h2>
      <p className="text-gray-500 mb-8">
        {getMessage()}
      </p>

      {/* Score comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-around">
          {/* Initial score */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Score initial</p>
            <p className="text-3xl font-bold text-gray-400">
              {initialScore}<span className="text-lg text-gray-300">/{totalQuestions}</span>
            </p>
          </div>

          {/* Arrow */}
          <div className={`flex flex-col items-center ${improved ? 'text-emerald-500' : same ? 'text-gray-400' : 'text-red-400'}`}>
            <TrendingUp className="w-6 h-6" />
            <span className="text-sm font-bold mt-1">
              {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
            </span>
          </div>

          {/* Final score */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Score final</p>
            <p className={`text-3xl font-bold ${improved ? 'text-emerald-600' : 'text-gray-700'}`}>
              {finalScore}<span className="text-lg text-gray-300">/{totalQuestions}</span>
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <Star
              key={i}
              className={`w-6 h-6 ${i < finalScore ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Tu peux maintenant rendre l&apos;appareil à ton parent.
      </p>
    </div>
  )
}
