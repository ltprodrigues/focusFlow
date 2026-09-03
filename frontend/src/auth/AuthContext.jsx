import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, setAntiforgeryToken, setUnauthorizedHandler } from '../api/http'
import { buildGoogleLoginUrl, getCurrentUser, logout as logoutRequest } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, csrfToken: null })

  const becomeAnonymous = useCallback(() => {
    setAntiforgeryToken(null)
    setState({ status: 'anonymous', user: null, csrfToken: null })
  }, [])

  const acceptProfile = useCallback((profile) => {
    const { antiforgeryToken: token, ...user } = profile
    setAntiforgeryToken(token)
    setState({ status: 'authenticated', user, csrfToken: token })
  }, [])

  const rejectBootstrap = useCallback((error) => {
    if (error instanceof ApiError && error.status === 401) {
      becomeAnonymous()
    } else {
      setState({ status: 'error', user: null, csrfToken: null })
    }
  }, [becomeAnonymous])

  const bootstrap = useCallback(async () => {
    setState(current => ({ ...current, status: 'loading' }))
    try {
      acceptProfile(await getCurrentUser())
    } catch (error) {
      rejectBootstrap(error)
    }
  }, [acceptProfile, rejectBootstrap])

  useEffect(() => {
    let active = true
    setUnauthorizedHandler(() => {
      if (active) becomeAnonymous()
    })
    getCurrentUser()
      .then(profile => {
        if (active) acceptProfile(profile)
      })
      .catch(error => {
        if (active) rejectBootstrap(error)
      })
    return () => {
      active = false
      setUnauthorizedHandler(null)
    }
  }, [acceptProfile, becomeAnonymous, rejectBootstrap])

  const login = useCallback((returnUrl = '/') => {
    window.location.assign(buildGoogleLoginUrl(returnUrl))
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    becomeAnonymous()
  }, [becomeAnonymous])

  const value = useMemo(() => ({
    ...state,
    login,
    logout,
    retry: bootstrap,
    handleUnauthorized: becomeAnonymous,
  }), [state, login, logout, bootstrap, becomeAnonymous])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
