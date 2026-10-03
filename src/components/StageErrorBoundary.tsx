import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** WebGL can be unavailable (blocklisted GPU, disabled hardware acceleration). Fail readable. */
export class StageErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[VoidShift] stage failed', error, info.componentStack)
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="stage-fallback" role="alert">
          <p>VoidShift needs WebGL 2, which is unavailable in this browser.</p>
          <p className="stage-fallback__hint">Enable hardware acceleration or try a current Chrome, Edge, Firefox or Safari.</p>
        </div>
      )
    }
    return this.props.children
  }
}
