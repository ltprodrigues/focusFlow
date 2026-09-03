const navigationItems = [['⌂', 'Dashboard'], ['✓', 'Assignments'], ['▦', 'Schedule'], ['$', 'Finances'], ['⚙', 'Settings']]

export function Sidebar({ user }) {
  return (
    <aside className="sidebar">
      <a className="brand-mark" href="#dashboard" aria-label="FocusFlow dashboard">FF</a>
      <nav aria-label="Main navigation">
        {navigationItems.map(([symbol, label], index) => (
          <a className={index === 0 ? 'is-active' : ''} href="#dashboard" key={label} aria-label={label}><span aria-hidden="true">{symbol}</span></a>
        ))}
      </nav>
      <div className="profile-avatar"><Avatar user={user} /></div>
    </aside>
  )
}
import { Avatar } from './ProfileMenu'
