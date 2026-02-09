import { nanoid } from 'nanoid'

export function normalizeTrackSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function buildTrackSlugSuggestion(
  baseInput: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = normalizeTrackSlug(baseInput) || 'track'

  const baseTaken = await exists(baseSlug)
  if (!baseTaken) {
    return baseSlug
  }

  for (let suffix = 2; suffix <= 20; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`
    if (!(await exists(candidate))) {
      return candidate
    }
  }

  return `${baseSlug}-${nanoid(6).toLowerCase()}`
}

