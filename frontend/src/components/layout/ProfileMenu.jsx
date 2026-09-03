import { useEffect, useRef, useState } from 'react'

export function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const triggerRef = useRef(null)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && open && !pending) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, pending])

  async function signOut() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await onLogout()
    } catch {
      setError('Could not sign out. Try again.')
      setPending(false)
    }
  }

  return <div className="profile-menu">
    <button
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label="Open profile menu"
      className="profile-menu-trigger"
      onClick={() => { if (!pending) setOpen(value => !value) }}
      ref={triggerRef}
      type="button"
    >
      <Avatar user={user} decorative />
    </button>
    {open && <div className="profile-menu-popover" role="menu">
      <strong>{user.name}</strong>
      <span>{user.email}</span>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending} onClick={signOut} role="menuitem" type="button">
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>}
  </div>
}

export function Avatar({ user, decorative = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  const label = decorative ? undefined : user.name
  if (user.pictureUrl && !imageFailed) {
    return <img alt={label ?? ''} className="profile-image" src={user.pictureUrl}
      onError={() => setImageFailed(true)} />
  }
  return <span aria-label={label} className="profile-initials">{initials(user.name)}</span>
}

function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  return (parts.length ? `${parts[0][0]}${parts.at(-1)[0]}` : 'U').toUpperCase()
}
