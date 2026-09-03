import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error" role="alert">
          <h1>FocusFlow hit an unexpected problem.</h1>
          <p>Your data is still safe. Reload the app to try again.</p>
          <button type="button" onClick={() => (this.props.onReload ?? (() => window.location.reload()))()}>Reload FocusFlow</button>
        </main>
      )
    }
    return this.props.children
  }
}
