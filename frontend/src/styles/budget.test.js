import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('hides secondary categories at the approved mobile breakpoint', () => {
  const css = readFileSync(resolve('src/styles/budget.css'), 'utf8')
  const mobile = css.slice(css.indexOf('@media (max-width: 800px)'))
  expect(mobile).toMatch(/\.budget-category-secondary\s*\{[^}]*display:\s*none/)
  expect(mobile).toMatch(/\.budget-totals\s*\{[^}]*justify-content:\s*space-between/)
  expect(mobile).toMatch(/\.budget-add-expense\s*\{[^}]*grid-row:\s*1/)
})
