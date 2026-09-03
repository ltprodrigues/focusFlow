export function LoginScreen({ error = false, onLogin, onRetry }) {
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand" aria-hidden="true">FF</div>
        <p className="auth-eyebrow">FOCUSFLOW</p>
        <h1 id="auth-title">Plan school. Understand your spending.</h1>
        <p className="auth-copy">Keep assignments, deadlines, budgets, and expenses together in your own private workspace.</p>
        {error && <div className="auth-error" role="alert">
          <strong>Could not check your session.</strong>
          <span>Check that the FocusFlow API is running, then try again.</span>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>}
        <button className="google-login-button" type="button" onClick={onLogin}>
          <span className="google-mark" aria-hidden="true">G</span>
          Sign in with Google
        </button>
        <p className="auth-note">Google is the only sign-in method. Your school tasks and finances stay separate from every other account.</p>
      </section>
    </main>
  )
}
