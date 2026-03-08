'use client'

import { useState } from 'react'
import { addStudent } from '@/app/dashboard/parent/actions'
import { UserPlus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export function AddStudentForm() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        const result = await addStudent(formData)

        if (result?.error) {
            setError(result.error)
        } else {
            setSuccess(true)
            setIsOpen(false)
            // Reset the success after 3 seconds
            setTimeout(() => setSuccess(false), 3000)
        }

        setIsLoading(false)
    }

    return (
        <div className="space-y-3">
            {/* Success Message */}
            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center animate-fade-in">
                    ✅ Élève ajouté avec succès !
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen)
                    setError(null)
                }}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">Ajouter un enfant</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Expandable Form */}
            {isOpen && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 space-y-4 animate-fade-in">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="student-name"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Nom de l&apos;enfant
                            </label>
                            <input
                                id="student-name"
                                name="name"
                                type="text"
                                required
                                placeholder="ex: Ahmed, Fatma..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="grade-level"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Niveau scolaire
                            </label>
                            <select
                                id="grade-level"
                                name="grade_level"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                                <option value="">Choisir le niveau</option>
                                <option value="1ère année">1ère année</option>
                                <option value="2ème année">2ème année</option>
                                <option value="3ème année">3ème année</option>
                                <option value="4ème année">4ème année</option>
                                <option value="5ème année">5ème année</option>
                                <option value="6ème année">6ème année</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Ajout en cours...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Ajouter
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
