'use client'

import { login, signup } from './actions'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { BookOpen, Loader2, Phone } from 'lucide-react'

function LoginForm() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message')
    const [isLoading, setIsLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        try {
            if (isSignUp) {
                await signup(formData)
            } else {
                await login(formData)
            }
        } catch {
            // redirect() throws a NEXT_REDIRECT error which is expected
        }
        setIsLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">SmartPath AI</h1>
                    <p className="text-gray-500 mt-1">
                        {isSignUp
                            ? 'Créez votre compte parent'
                            : 'Connectez-vous à votre espace'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    {message && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                            {message}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Adresse e-mail
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="parent@email.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Mot de passe
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {isSignUp && (
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    Numéro de téléphone
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                                        <Phone className="w-4 h-4 text-gray-400 mr-1" />
                                        <span className="text-gray-500 text-sm">+216</span>
                                    </div>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        placeholder="XX XXX XXX"
                                        pattern="[0-9]{8}"
                                        maxLength={8}
                                        className="w-full pl-24 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Pour recevoir les notifications WhatsApp</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Chargement...
                                </>
                            ) : isSignUp ? (
                                "Créer un compte"
                            ) : (
                                "Se connecter"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            {isSignUp
                                ? 'Vous avez déjà un compte ? Se connecter'
                                : "Pas encore de compte ? Créer un compte"}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    © 2026 SmartPath AI — Éducation intelligente pour chaque enfant.
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    )
}
