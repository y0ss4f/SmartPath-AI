'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Une erreur s&apos;est produite
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Quelque chose s&apos;est mal passé. Recharge la page pour réessayer.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
