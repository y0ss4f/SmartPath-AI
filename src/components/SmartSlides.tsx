'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle } from 'lucide-react'
import type { SmartSlide } from '@/types/database'

interface SmartSlidesProps {
  slides: SmartSlide[]
  unit?: string | null
  grade?: string | null
  onComplete: () => void
}

export function SmartSlides({ slides, unit, grade, onComplete }: SmartSlidesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const current = slides[currentIndex]
  const isLast = currentIndex === slides.length - 1

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Unit/Grade context header */}
      {unit && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-sm" dir="rtl">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-emerald-800">
              {unit}
            </span>
            {grade && (
              <span className="text-emerald-500 text-xs">
                — {grade}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Leçon {currentIndex + 1} / {slides.length}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Slide card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" dir="rtl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full mb-4">
          <BookOpen className="w-3 h-3" />
          مفهوم
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {current.title}
        </h3>

        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
          {current.content}
        </div>

        {/* Textbook page reference citation */}
        {current.page_reference && (
          <div className="mt-4 pt-3 border-t border-gray-100" dir="rtl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">
              📖 {current.page_reference}
            </span>
          </div>
        )}
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
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            J&apos;ai compris !
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
