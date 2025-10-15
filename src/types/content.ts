export type MacroEpisodeListItem = {
  slug: string
  title: string
  publishedAt: string | Date
  coverUrl?: string | null
  summary?: string | null
}

export type Resource = {
  slug: string
  title: string
  description?: string | null
  url: string
  coverUrl?: string | null
  tags?: string[] | null
  publishedAt?: string | Date | null
}

