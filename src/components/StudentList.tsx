import { Users } from 'lucide-react'
import { StudentCard } from './StudentCard'
import type { Student, Quiz } from '@/types/database'

interface StudentListProps {
    students: Student[]
    quizzesByStudent: Record<string, Quiz[]>
}

export function StudentList({ students, quizzesByStudent }: StudentListProps) {
    if (students.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                    Aucun enfant ajouté
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                    Commencez par ajouter le profil de votre enfant ci-dessus.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-800 px-1">
                Mes enfants ({students.length})
            </h3>

            <div className="grid gap-3">
                {students.map((student) => (
                    <StudentCard key={student.id} student={student} quizzes={quizzesByStudent[student.id] || []} />
                ))}
            </div>
        </div>
    )
}
