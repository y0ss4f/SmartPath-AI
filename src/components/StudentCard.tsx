'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2, ArrowRight, Link as LinkIcon, QrCode, X, Check, BookOpen, ChevronDown, Sparkles } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { StudentStats } from './StudentStats'
import { MATH_CURRICULUM, SUBJECTS } from '@/constants/mathCurriculum'
import type { Student, Quiz } from '@/types/database'

interface StudentCardProps {
  student: Student
  quizzes: Quiz[]
}

type CardState = 'idle' | 'selecting' | 'generating' | 'success'

export function StudentCard({ student, quizzes }: StudentCardProps) {
  const router = useRouter()

  const [state, setState] = useState<CardState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection state
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathématiques')
  const [selectedUnit, setSelectedUnit] = useState<string>('')

  // Units available for this student's grade
  const cleanGrade = student.grade_level?.trim() || ''
  const availableUnits = MATH_CURRICULUM[cleanGrade] || []

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  // Reset unit when switching back to selecting
  useEffect(() => {
    if (state === 'selecting') {
      setSelectedUnit('')
    }
  }, [state])

  async function handleGenerate() {
    if (!selectedUnit) return

    setError(null)
    setState('generating')

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          grade: student.grade_level,
          unit: selectedUnit,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la génération du quiz.')
      }

      setQuizId(data.quiz_id)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setState('selecting')
    }
  }

  function handlePassDevice() {
    router.push(`/student/${student.qr_code_hash}?quiz_id=${quizId}`)
  }

  function getStudentUrl() {
    return `${window.location.origin}/student/${student.qr_code_hash}?quiz_id=${quizId}`
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(getStudentUrl())
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg">
            {student.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {student.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {student.grade_level}
            </span>
          </div>
        </div>

        {/* Launch quiz button */}
        {state === 'idle' && (
          <button
            onClick={() => setState('selecting')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Lancer un quiz</span>
            <span className="sm:hidden">Quiz</span>
          </button>
        )}

        {/* Loading state */}
        {state === 'generating' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Génération du quiz…</span>
            <span className="sm:hidden">En cours…</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Unit selection panel */}
      {state === 'selecting' && (
        <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Choisir une unité
            </h5>
            <button
              onClick={() => setState('idle')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subject dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Matière</label>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value} disabled={!s.enabled}>
                    {s.label}{!s.enabled ? ' (bientôt)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Unit dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unité</label>
            <div className="relative">
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
                dir="rtl"
              >
                <option value="">— اختر الوحدة —</option>
                {availableUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedUnit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Générer le quiz
          </button>
        </div>
      )}

      {/* Success: handoff buttons */}
      {state === 'success' && quizId && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-medium text-green-800 mb-3">
            Quiz généré avec succès ! Choisissez comment transmettre le quiz :
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePassDevice}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              Passer l&apos;appareil
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                copied
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Lien copié !
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Copier le lien
                </>
              )}
            </button>
            <button
              onClick={() => setShowQR((v) => !v)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              {showQR ? (
                <>
                  <X className="w-4 h-4" />
                  Masquer le QR
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Afficher le QR
                </>
              )}
            </button>
          </div>

          {/* QR Code display */}
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-3 pt-4 border-t border-green-200">
              <p className="text-xs text-green-700 font-medium">
                Scannez ce code QR avec l&apos;appareil de l&apos;élève
              </p>
              <div className="p-3 bg-white rounded-xl shadow-sm border border-green-100">
                <QRCodeSVG value={getStudentUrl()} size={180} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <StudentStats quizzes={quizzes} />
    </div>
  )
}
