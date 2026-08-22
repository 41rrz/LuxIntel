import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Lux Intel] UI recovered from an unexpected render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="fatal-shell">
        <section className="fatal-card">
          <div className="fatal-icon"><AlertTriangle size={24} /></div>
          <span className="eyebrow">LUX INTEL RECOVERY</span>
          <h1>A profile module returned something unexpected.</h1>
          <p>
            The interface stopped this error from taking down the entire site. Reload to request a fresh profile payload.
          </p>
          <code>{this.state.error.message}</code>
          <button onClick={() => window.location.reload()}><RefreshCw size={16} /> Reload Lux Intel</button>
        </section>
      </main>
    )
  }
}
