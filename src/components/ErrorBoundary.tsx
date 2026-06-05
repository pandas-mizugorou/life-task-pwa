import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

/** Top-level error boundary so an unexpected render error shows a recoverable
 *  screen instead of a blank white page (important on mobile). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[life-task-pwa] render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-bold text-ink">問題が発生しました</p>
          <p className="max-w-xs text-sm leading-relaxed text-sub">
            アプリの表示中にエラーが発生しました。お手数ですが再読み込みしてください。
          </p>
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      )
    }
    return this.props.children
  }
}
