// Single source of truth for the user-facing display name of every system.
// Internal slugs (mrs / mars / tars / dhrs / sdca / tfars) stay as-is across
// the database, ingest API, snapshot keys, and email templates. Only render
// the result of brandName() to users — never the raw slug or the legacy
// system-registry shortName field.

export const BRAND: Record<string, string> = {
  sdca: 'Stewart & Co Cycle',
  mrs: 'Stewart & Co Majors',
  mars: 'Stewart & Co Core',
  tars: 'Stewart & Co Select',
  tfars: 'Stewart & Co Extended',
  dhrs: 'Stewart & Co Broad',
}

export function brandName(key: string): string {
  return BRAND[key] ?? key.toUpperCase()
}
