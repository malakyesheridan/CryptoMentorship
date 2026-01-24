/**
 * Typed route helpers to prevent stringly-typed URLs and ensure consistency
 * between public (slug-based) and admin (ID-based) routes.
 */

export const routes = {
  // Public routes (use slugs)
  public: {
    home: () => '/',
    login: () => '/login',
    dashboard: () => '/dashboard',
    research: () => '/research',
    resources: () => '/learning', // Resources now integrated into Learning Hub
    community: () => '/community',
    notifications: () => '/notifications',
    account: () => '/account',
    saved: () => '/me/saved',
    learning: () => '/learning',
    
    // Events
    events: {
      list: () => '/events',
      detail: (slug: string) => `/events/${slug}`,
      calendar: () => '/events/calendar.ics'
    },
    
    // Learning
    learn: {
      list: () => '/learning',
      track: {
        detail: (trackSlug: string) => `/learn/${trackSlug}`,
        lesson: (trackSlug: string, lessonSlug: string) => `/learn/${trackSlug}/lesson/${lessonSlug}`,
        cohort: (trackSlug: string, cohortSlug: string) => `/learn/${trackSlug}/cohort/${cohortSlug}`
      },
      certificate: (code: string) => `/learn/cert/${code}`
    },
    
    // Portfolio (formerly signals)
    portfolio: {
      list: () => '/portfolio',
      detail: (slug: string) => `/portfolio/${slug}`,
      performance: () => '/portfolio/performance',
      closed: () => '/portfolio/closed'
    },
    
    // Content
    content: {
      detail: (slug: string) => `/content/${slug}`
    },
    
    // Crypto Compass (formerly macro)
    cryptoCompass: {
      list: () => '/crypto-compass',
      detail: (slug: string) => `/crypto-compass/${slug}`
    }
  },
  
  // Admin routes (use IDs with static /admin/ prefix)
  admin: {
    home: () => '/admin',
    announce: () => '/admin/announce',
    roi: () => '/admin/roi',
    
    // Events
    events: {
      list: () => '/admin/events',
      new: () => '/admin/events/new',
      detail: (eventId: string) => `/admin/events/${eventId}`,
      attendees: (eventId: string) => `/admin/events/${eventId}/attendees`
    },
    
    // Learning
    learn: {
      tracks: {
        list: () => '/admin/learn/tracks',
        new: () => '/admin/learn/tracks/new',
        detail: (trackId: string) => `/admin/learn/tracks/${trackId}`
      },
      cohorts: {
        list: () => '/admin/learn/cohorts',
        new: () => '/admin/learn/cohorts/new',
        detail: (cohortId: string) => `/admin/learn/cohorts/${cohortId}`
      }
    },
    
    // Signals
    signals: {
      list: () => '/admin/signals',
      new: () => '/admin/signals/new',
      detail: (signalId: string) => `/admin/signals/${signalId}`,
      import: () => '/admin/signals/import',
      settings: () => '/admin/signals/settings'
    },
    
    // Content
    content: {
      list: () => '/admin/content',
      new: () => '/admin/content/new'
    },
    
    // Episodes
    episodes: {
      list: () => '/admin',
      new: () => '/admin/episodes/new'
    },
    
    // Media
    media: {
      list: () => '/admin/media'
    }
  },
  
  // API routes
  api: {
    // Auth
    auth: {
      nextauth: () => '/api/auth/[...nextauth]'
    },
    
    // Public APIs
    events: {
      list: () => '/api/events',
      detail: (slug: string) => `/api/events/${slug}`,
      ics: (slug: string) => `/api/events/${slug}/ics`
    },
    
    signals: {
      list: () => '/api/signals',
      detail: (slug: string) => `/api/signals/${slug}`,
      performance: () => '/api/signals/performance'
    },
    
    learn: {
      tracks: {
        list: () => '/api/learn/tracks',
        detail: (trackSlug: string) => `/api/learn/tracks/${trackSlug}`
      }
    },
    
    // Admin APIs
    admin: {
      events: {
        list: () => '/api/admin/events',
        detail: (eventId: string) => `/api/admin/events/${eventId}`
      },
      
      learn: {
        tracks: {
          list: () => '/api/admin/learn/tracks',
          detail: (trackId: string) => `/api/admin/learn/tracks/${trackId}`
        }
      },
      
      signals: {
        list: () => '/api/admin/signals',
        detail: (signalId: string) => `/api/admin/signals/${signalId}`,
        import: () => '/api/admin/signals/import',
        export: () => '/api/admin/signals/export.csv',
        settings: () => '/api/admin/signals/settings'
      },

      roi: {
        settings: () => '/api/admin/roi/settings',
        series: () => '/api/admin/roi/series',
        import: () => '/api/admin/roi/series/import',
        allocation: () => '/api/admin/roi/allocation',
        changeLog: () => '/api/admin/roi/change-log',
        preview: () => '/api/admin/roi/preview'
      },
      
      content: () => '/api/admin/content',
      episodes: () => '/api/admin/episodes',
      announce: () => '/api/admin/announce'
    },
    
    // User APIs
    me: {
      bookmarks: () => '/api/me/bookmarks',
      continue: () => '/api/me/continue',
      interests: () => '/api/me/interests',
      notificationPreferences: () => '/api/me/notification-preferences'
    },
    
    // Notifications
    notifications: {
      list: () => '/api/notifications',
      markAllRead: () => '/api/notifications/mark-all-read',
      unreadCount: () => '/api/notifications/unread-count'
    },

    roi: {
      dashboard: () => '/api/roi/dashboard',
      portfolio: () => '/api/roi'
    },
    
    // Certificates
    cert: {
      verify: () => '/api/cert/verify'
    },
    
    // Cron
    cron: {
      eventReminders: () => '/api/cron/event-reminders',
      publish: () => '/api/cron/publish',
      cohortReleases: () => '/api/cron/cohort-releases',
      portfolioRoi: () => '/api/cron/portfolio-roi',
      fastForward: () => '/api/cron/dev/fast-forward'
    }
  }
} as const

// Type helpers for route parameters
export type RouteParams = {
  eventId?: string
  trackId?: string
  signalId?: string
  cohortId?: string
  slug?: string
  trackSlug?: string
  lessonSlug?: string
  cohortSlug?: string
  code?: string
}

// Helper to build URLs with query parameters
export function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return path
  }
  
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}

// Helper to get the current route type (public vs admin)
export function getRouteType(pathname: string): 'public' | 'admin' | 'api' {
  if (pathname.startsWith('/admin/')) return 'admin'
  if (pathname.startsWith('/api/')) return 'api'
  return 'public'
}

// Helper to check if a route requires authentication
export function requiresAuth(pathname: string): boolean {
  return pathname.startsWith('/admin/') || 
         pathname.startsWith('/api/admin/') ||
         pathname.startsWith('/me/') ||
         pathname.startsWith('/dashboard') ||
         pathname.startsWith('/account') ||
         pathname.startsWith('/notifications')
}
