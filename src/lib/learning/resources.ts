export type PdfResource = {
  title: string
  url: string
}

export function normalizePdfResources(value: unknown): PdfResource[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      title: typeof item?.title === 'string' ? item.title : '',
      url: typeof item?.url === 'string' ? item.url : ''
    }))
    .filter((item) => item.title && item.url)
}
