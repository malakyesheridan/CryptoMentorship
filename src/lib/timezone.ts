// Timezone utility functions for event handling
export function formatEventTime(
  date: Date, 
  timezone: string, 
  format: string = 'PPP p'
): string {
  try {
    // Use native Intl.DateTimeFormat for timezone formatting
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date)
  } catch (error) {
    // Fallback to regular formatting if timezone is invalid
    console.warn('Invalid timezone:', timezone, error)
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date)
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
