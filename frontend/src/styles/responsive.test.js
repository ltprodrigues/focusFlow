import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

function compactRules(file) {
  const css = readFileSync(resolve(file), 'utf8')
  const breakpoint = css.indexOf('@media (max-width: 520px)')
  expect(breakpoint).toBeGreaterThan(-1)
  return css.slice(breakpoint)
}

it('reflows dashboard actions inside a 390px viewport', () => {
  const mobile = compactRules('src/styles/dashboard.css')
  expect(mobile).toMatch(/\.dashboard-header\s*\{[^}]*flex-direction:\s*column/)
  expect(mobile).toMatch(/\.header-actions\s*\{[^}]*flex-wrap:\s*wrap[^}]*width:\s*100%/)
  expect(mobile).toMatch(/\.add-assignment-button\s*\{[^}]*max-width:\s*100%/)
})

it('wraps planner controls while keeping horizontal scrolling on the week grid wrapper', () => {
  const mobile = compactRules('src/styles/planner.css')
  expect(mobile).toMatch(/\.planner-title-row\s*\{[^}]*flex-wrap:\s*wrap/)
  expect(mobile).toMatch(/\.week-controls\s*\{[^}]*max-width:\s*100%/)
  expect(mobile).toMatch(/\.next-deadline\s*\{[^}]*flex-wrap:\s*wrap/)
  expect(mobile).toMatch(/\.next-deadline button\s*\{[^}]*white-space:\s*normal/)
  expect(mobile).toMatch(/\.planner-scroll\s*\{[^}]*overflow-x:\s*auto/)
})
