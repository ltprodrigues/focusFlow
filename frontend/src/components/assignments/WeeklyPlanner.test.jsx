import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WeeklyPlanner } from './WeeklyPlanner'
import { AssignmentCard } from './AssignmentCard'

const weekDays = [
  new Date(2026, 7, 24),
  new Date(2026, 7, 25),
  new Date(2026, 7, 26),
  new Date(2026, 7, 27),
  new Date(2026, 7, 28),
]

const essay = {
  id: 1,
  title: 'Research essay',
  course: 'English',
  dueDate: '2026-08-24T16:00:00.000Z',
  priority: 'High',
  isCompleted: false,
}

afterEach(cleanup)

describe('WeeklyPlanner', () => {
  it('uses phrasing content rather than a heading for assignment titles', () => {
    render(<AssignmentCard task={essay} />)

    expect(screen.getByText('Research essay').tagName).toBe('STRONG')
    expect(screen.queryByRole('heading', { name: 'Research essay' })).not.toBeInTheDocument()
  })

  it('places assignments in their weekday and shows empty days', () => {
    render(<WeeklyPlanner days={weekDays} tasks={[essay]} />)

    expect(screen.getByRole('button', { name: /Research essay/ })).toBeInTheDocument()
    expect(screen.getAllByText('No assignments')).toHaveLength(4)
  })

  it('calls week navigation actions', async () => {
    const user = userEvent.setup()
    const previous = vi.fn()
    const next = vi.fn()

    render(
      <WeeklyPlanner
        days={weekDays}
        tasks={[]}
        onPreviousWeek={previous}
        onNextWeek={next}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await user.click(screen.getByRole('button', { name: 'Next week' }))

    expect(previous).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledOnce()
  })

  it('includes the earliest incomplete weekend assignment in the next-deadline reminder', () => {
    const weekendTask = {
      ...essay,
      id: 2,
      title: 'Weekend reading',
      dueDate: '2026-08-29T16:00:00.000Z',
    }

    const completedTask = {
      ...essay,
      id: 3,
      title: 'Completed task',
      dueDate: '2026-08-28T17:00:00.000Z',
      isCompleted: true,
    }

    render(
      <WeeklyPlanner
        days={weekDays}
        tasks={[completedTask, weekendTask]}
        now={new Date(2026, 7, 28, 12)}
      />,
    )

    expect(screen.getByText((_, element) => (
      element?.classList.contains('next-deadline') && element.textContent.includes('Due next: Weekend reading')
    ))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Weekend reading/ })).not.toBeInTheDocument()
  })

  it('shows a retryable section error', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()

    render(<WeeklyPlanner days={weekDays} tasks={[]} error="Assignments could not load." onRetry={retry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Assignments could not load.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('keeps only the weekday grid inside the horizontal scroll region', () => {
    const { container } = render(<WeeklyPlanner days={weekDays} tasks={[]} />)
    const scrollRegion = container.querySelector('.planner-scroll')

    expect(scrollRegion).toContainElement(container.querySelector('.week-grid'))
    expect(scrollRegion).not.toContainElement(container.querySelector('.planner-title-row'))
    expect(scrollRegion).not.toContainElement(container.querySelector('.next-deadline'))
  })
})
