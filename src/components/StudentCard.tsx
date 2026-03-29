'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Camera, Loader2, ArrowRight, Link as LinkIcon, QrCode, X, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { StudentStats } from './StudentStats'
import type { Student, Quiz } from '@/types/database'

interface StudentCardProps {
  student: Student
  quizzes: Quiz[]
}

type CardState = 'idle' | 'uploading' | 'success'

export function StudentCard({ student, quizzes }: StudentCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<CardState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setState('uploading')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('student_id', student.id)

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Erreur lors de la génération du quiz.')
      }

      setQuizId(data.quiz_id)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setState('idle')
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
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

        {/* Upload button */}
        {state === 'idle' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Télécharger une photo</span>
            <span className="sm:hidden">Photo</span>
          </button>
        )}

        {/* Loading state */}
        {state === 'uploading' && (
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  )
}
