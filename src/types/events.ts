// src/types/events.ts
export type EventDetail = {
  slug: string
  title: string
  date: string | Date
  location?: string | null
  coverUrl?: string | null
  summary?: string | null
  transcript?: string | null
  videoUrl?: string | null
  tags?: string[] | null
}

