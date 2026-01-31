declare namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET?: string
    DATABASE_URL: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    EMAIL_SERVER?: string
    EMAIL_FROM?: string
    VERCEL_CRON_SECRET?: string
    NEXT_PUBLIC_APP_URL?: string
    EVENTS_PROVIDER?: string
  }
}

