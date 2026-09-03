export function DashboardHeader({ onAddAssignment, addButtonRef }) {
  return (
    <header className="dashboard-header">
      <div><h1>Good morning, Maya</h1><p>Here’s what’s happening this week.</p></div>
      <div className="header-actions">
        <button className="notification-button" type="button" aria-label="Notifications">♢</button>
        <button className="add-assignment-button" type="button" onClick={onAddAssignment} ref={addButtonRef}>+ Add assignment</button>
      </div>
    </header>
  )
}
