import React from 'react'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; error?: unknown }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('App error boundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-foreground bg-background">
          <div className="max-w-lg text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong.</h1>
            <p className="text-sm text-muted-foreground">Please refresh the page. If the issue persists, check the browser console for details.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


