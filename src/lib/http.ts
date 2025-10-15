export async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!res.ok) {
    let detail: unknown
    try {
      detail = await res.json()
    } catch {
      // ignore parse failures
    }

    const message = (detail as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`
    throw new Error(message)
  }

  return res.json() as Promise<T>
}
