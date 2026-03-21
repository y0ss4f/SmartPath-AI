export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { StudentList } from '@/components/StudentList'
import { AddStudentForm } from '@/components/AddStudentForm'
import { BookOpen, LogOut } from 'lucide-react'
import type { Student, Quiz } from '@/types/database'

export default async function ParentDashboard() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch the parent's students
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching students:', error)
    }

    // Fetch quizzes for all students
    const studentIds = (students as Student[] || []).map(s => s.id)
    const quizzesByStudent: Record<string, Quiz[]> = {}

    if (studentIds.length > 0) {
        const { data: quizzes } = await supabaseAdmin
            .from('quizzes')
            .select('*')
            .in('student_id', studentIds)
            .order('created_at', { ascending: false })

        for (const q of (quizzes as Quiz[]) || []) {
            if (!quizzesByStudent[q.student_id]) {
                quizzesByStudent[q.student_id] = []
            }
            quizzesByStudent[q.student_id].push(q)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">SmartPath AI</h1>
                            <p className="text-xs text-gray-500">Espace Parent</p>
                        </div>
                    </div>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Déconnexion</span>
                        </button>
                    </form>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                    <h2 className="text-xl font-bold">Bienvenue 👋</h2>
                    <p className="text-blue-100 mt-1 text-sm">
                        Gérez les profils de vos enfants et suivez leur progression.
                    </p>
                </div>

                {/* Add Student Section */}
                <AddStudentForm />

                {/* Students List */}
                <StudentList students={(students as Student[]) || []} quizzesByStudent={quizzesByStudent} />
            </main>
        </div>
    )
}
