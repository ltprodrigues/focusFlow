export function getWeekRange(input) {
  const date = new Date(input)
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + offset)
  start.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 5 }, (_, index) => {
    const value = new Date(start)
    value.setDate(start.getDate() + index)
    return value
  })

  const end = new Date(days[4])
  end.setHours(23, 59, 59, 999)

  return { start, end, days }
}
