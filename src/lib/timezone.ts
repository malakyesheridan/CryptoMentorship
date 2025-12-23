// Timezone utility functions for event handling
export function formatEventTime(
  date: Date, 
  timezone: string, 
  format: string = 'PPP p'
): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)
    const get = (type: string) => parts.find(part => part.type === type)?.value || ''
    const datePart = `${get('day')}-${get('month')}-${get('year')}`
    const timePart = get('dayPeriod') ? `${get('hour')}:${get('minute')} ${get('dayPeriod')}` : `${get('hour')}:${get('minute')}`
    return `${datePart} ${timePart}`.trim()
  } catch (error) {
    // Fallback to regular formatting if timezone is invalid
    console.warn('Invalid timezone:', timezone, error)
    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)
    const get = (type: string) => parts.find(part => part.type === type)?.value || ''
    const datePart = `${get('day')}-${get('month')}-${get('year')}`
    const timePart = get('dayPeriod') ? `${get('hour')}:${get('minute')} ${get('dayPeriod')}` : `${get('hour')}:${get('minute')}`
    return `${datePart} ${timePart}`.trim()
  }
}

export function getTimezoneDisplay(timezone: string): string {
  const timezoneNames: Record<string, string> = {
    'UTC': 'UTC',
    'America/New_York': 'Eastern Time',
    'America/Chicago': 'Central Time', 
    'America/Denver': 'Mountain Time',
    'America/Los_Angeles': 'Pacific Time',
    'Europe/London': 'London',
    'Europe/Paris': 'Paris',
    'Asia/Tokyo': 'Tokyo',
    'Australia/Sydney': 'Sydney'
  }
  
  return timezoneNames[timezone] || timezone
}

export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return 'UTC'
}

export function isTimezoneValid(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (error) {
    return false
  }
}
