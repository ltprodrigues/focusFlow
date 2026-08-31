import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssignmentForm } from './AssignmentForm'

afterEach(cleanup)

async function fillRequiredAssignmentFields() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Title'), 'Research essay')
  await user.type(screen.getByLabelText('Course'), 'English')
  await user.type(screen.getByLabelText('Due date and time'), '2026-09-02T14:30')
  return user
}

describe('AssignmentForm', () => {
  it('requires title, course, and due date', async () => {
    const user = userEvent.setup()
    render(<AssignmentForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Course is required')).toBeInTheDocument()
    expect(screen.getByText('Due date and time are required')).toBeInTheDocument()
  })

  it('keeps values when submission fails', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('offline'))
    render(<AssignmentForm onSubmit={submit} onCancel={vi.fn()} />)
    const user = await fillRequiredAssignmentFields()

    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    expect(await screen.findByDisplayValue('Research essay')).toBeInTheDocument()
    expect(screen.getByText('Could not save the assignment. Try again.')).toBeInTheDocument()
  })
})
