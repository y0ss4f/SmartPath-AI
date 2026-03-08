import { GraduationCap, Users } from 'lucide-react'
import type { Student } from '@/types/database'

interface StudentListProps {
    students: Student[]
}

export function StudentList({ students }: StudentListProps) {
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
                    <div
                        key={student.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
                    >
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

                            {/* Status indicator (placeholder for Sprint 4) */}
                            <div className="flex-shrink-0">
                                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                                    En attente
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
