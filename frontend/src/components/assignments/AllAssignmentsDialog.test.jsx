import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AllAssignmentsDialog } from './AllAssignmentsDialog'

afterEach(cleanup)

const tasks = [
  {
    id: 2,
    title: 'Weekend reading',
    course: 'Literature',
    dueDate: '2026-08-30T15:00:00.000Z',
    priority: 'Low',
    isCompleted: false,
  },
  {
    id: 1,
    title: 'Weekday essay',
    course: 'English',
    dueDate: '2026-08-27T16:00:00.000Z',
    priority: 'High',
    isCompleted: false,
  },
]

describe('AllAssignmentsDialog', () => {
  it('sorts weekday and weekend records by due date and selects either record', async () => {
    const user = userEvent.setup()
    const select = vi.fn()
    render(<AllAssignmentsDialog open tasks={tasks} status="ready" onSelect={select} onClose={vi.fn()} />)

    const list = screen.getByRole('list', { name: 'All assignments' })
    const records = within(list).getAllByRole('button')
    expect(records[0]).toHaveTextContent('Weekday essay')
    expect(records[1]).toHaveTextContent('Weekend reading')
    expect(records[0]).toHaveTextContent('Thursday')
    expect(records[1]).toHaveTextContent('Sunday')

    await user.click(records[0])
    await user.click(records[1])
    expect(select).toHaveBeenNthCalledWith(1, tasks[1])
    expect(select).toHaveBeenNthCalledWith(2, tasks[0])
  })

  it('is modal and restores focus to its opener when closed', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(false)
      return <><button type="button" onClick={() => setOpen(true)}>View all assignments</button><AllAssignmentsDialog open={open} tasks={[]} status="ready" onSelect={vi.fn()} onClose={() => setOpen(false)} /></>
    }

    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'View all assignments' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'All assignments' })).toHaveAttribute('aria-modal', 'true')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
