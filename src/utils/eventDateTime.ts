const EVENT_DISPLAY_TIMEZONE = 'America/Vancouver'

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_DISPLAY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

function getTimeZoneOffsetMs(timestampMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date(timestampMs))

  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  const asUtcMs = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )

  return asUtcMs - timestampMs
}

function getZonedParts(dateString: string) {
  const parts = dateTimeFormatter.formatToParts(new Date(dateString))
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }
  return map
}

export function getEventDisplayTimezone() {
  return EVENT_DISPLAY_TIMEZONE
}

export function formatEventDateInTimezone(dateString: string, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date(dateString))
}

export function formatEventTimeInTimezone(dateString: string, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dateString))
}

export function formatEventDateTimeInTimezone(dateString: string, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(dateString))
}

export function getEventDateKeyInTimezone(dateString: string) {
  const p = getZonedParts(dateString)
  return `${p.year}-${p.month}-${p.day}`
}

export function getEventDatePartsForCard(dateString: string, locale = 'zh-CN') {
  const date = new Date(dateString)
  const month = new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    month: 'long'
  }).format(date)
  const day = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: EVENT_DISPLAY_TIMEZONE,
      day: '2-digit'
    }).format(date)
  )
  const dayOfWeek = new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_DISPLAY_TIMEZONE,
    weekday: 'long'
  }).format(date)

  return { month, day, dayOfWeek }
}

export function getEventYearMonthInTimezone(dateString: string) {
  const p = getZonedParts(dateString)
  return { year: Number(p.year), month: Number(p.month) }
}

export function convertUtcIsoToEventInputValue(isoString: string) {
  if (!isoString) return ''
  const p = getZonedParts(isoString)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

export function convertEventInputValueToUtcIso(inputValue: string) {
  if (!inputValue) return null
  const [datePart, timePart] = inputValue.split('T')
  if (!datePart || !timePart) return null

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  let utcMsGuess = Date.UTC(year, month - 1, day, hour, minute, 0)

  // 两次迭代即可稳定到目标时区偏移
  for (let i = 0; i < 2; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(utcMsGuess, EVENT_DISPLAY_TIMEZONE)
    utcMsGuess = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMs
  }

  return new Date(utcMsGuess).toISOString()
}
