import { supabaseAdmin } from '@/utils/supabase/admin'
import { StudentFlow } from '@/components/StudentFlow'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BookOpen } from 'lucide-react'
import type { Student, Quiz } from '@/types/database'

interface PageProps {
  params: Promise<{ qr_code_hash: string }>
  searchParams: Promise<{ quiz_id?: string }>
}

export default async function StudentPage({ params, searchParams }: PageProps) {
  const { qr_code_hash } = await params
  const { quiz_id } = await searchParams

  // Look up student by qr_code_hash
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('qr_code_hash', qr_code_hash)
    .single()

  if (studentError || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Élève introuvable
          </h1>
          <p className="text-gray-500 text-sm">
            Ce lien n&apos;est pas valide. Demande à ton parent de te donner un nouveau lien.
          </p>
        </div>
      </div>
    )
  }

  // Fetch quiz if quiz_id provided
  let quiz: Quiz | null = null

  if (quiz_id) {
    const { data: quizData } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quiz_id)
      .eq('student_id', student.id)
      .single()

    quiz = (quizData as Quiz) ?? null
  }

  // If no quiz_id, try to find the latest quiz for this student
  if (!quiz) {
    const { data: latestQuiz } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    quiz = (latestQuiz as Quiz) ?? null
  }

  if (!quiz || !quiz.initial_quiz_json) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Salut {student.name} !
          </h1>
          <p className="text-gray-500 text-sm">
            Aucun quiz n&apos;est prêt pour toi. Demande à ton parent de télécharger une photo de ton cahier.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <StudentFlow student={student as Student} quiz={quiz} />
    </ErrorBoundary>
  )
}
