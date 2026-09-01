const EMPTY_CHART = 'conic-gradient(#e8e8df 0% 100%)'
const CUSTOM_CATEGORY_COLOR = '#b8b8ad'

const CATEGORY_COLORS = Object.freeze({
  Food: '#e4a070',
  Transport: '#6f9fba',
  School: '#7fb17b',
  Entertainment: '#b28db8',
  Housing: '#d0aa58',
  Other: '#9c9c92',
})

function percent(value) {
  return String(Math.round(value * 10000) / 10000)
}

export function buildConicGradient(categories, totalSpent) {
  const total = Number(totalSpent)
  if (!Number.isFinite(total) || total <= 0) {
    return EMPTY_CHART
  }

  const entries = (Array.isArray(categories) ? categories : [])
    .map(({ category, amount }) => ({ category, amount: Number(amount) }))
    .filter(({ amount }) => Number.isFinite(amount) && amount > 0)

  if (entries.length === 0) {
    return EMPTY_CHART
  }

  let cumulative = 0
  const stops = entries.map(({ category, amount }, index) => {
    const start = Math.min(100, (cumulative / total) * 100)
    cumulative += amount
    const calculatedEnd = Math.min(100, (cumulative / total) * 100)
    const end = index === entries.length - 1 && Math.abs(cumulative - total) < 1e-9
      ? 100
      : calculatedEnd
    const color = CATEGORY_COLORS[category] ?? CUSTOM_CATEGORY_COLOR
    return `${color} ${percent(start)}% ${percent(end)}%`
  })

  return `conic-gradient(${stops.join(', ')})`
}
