import { ProfileMenu } from './ProfileMenu'

export function DashboardHeader({ onAddAssignment, addButtonRef, user, onLogout }) {
  const firstName = user.name.trim().split(/\s+/)[0] || 'there'
  return (
    <header className="dashboard-header">
      <div><h1>Good morning, {firstName}</h1><p>Here’s what’s happening this week.</p></div>
      <div className="header-actions">
        <button className="notification-button" type="button" aria-label="Notifications">♢</button>
        <ProfileMenu user={user} onLogout={onLogout} />
        <button className="add-assignment-button" type="button" onClick={onAddAssignment} ref={addButtonRef}>+ Add assignment</button>
      </div>
    </header>
  )
}
