export interface WebsiteBlogPayload {
  slug: string
  title: string
  subtitle: string | null
  content_html: string
  content_mdx: string
  excerpt: string | null
  category: string
  tags: string[]
  featured_image: string | null
  published_at: string
  author: string
  reading_time: number | null
  status: 'published'
}

function getWebhookConfig() {
  const webhookUrl = process.env.WEBSITE_BLOG_WEBHOOK_URL
  const webhookSecret = process.env.WEBSITE_WEBHOOK_SECRET

  if (!webhookUrl || !webhookSecret) {
    throw new Error(
      'Website sync not configured — missing WEBSITE_BLOG_WEBHOOK_URL or WEBSITE_WEBHOOK_SECRET environment variables'
    )
  }

  return { webhookUrl, webhookSecret }
}

export async function pushBlogToWebsite(payload: WebsiteBlogPayload): Promise<void> {
  const { webhookUrl, webhookSecret } = getWebhookConfig()

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    throw new Error(`Website sync failed (${response.status}): ${errorBody}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(`Website sync returned error: ${JSON.stringify(result)}`)
  }
}

/**
 * Delete a blog post from the external website.
 * Sends a POST with action: 'delete' to the same webhook endpoint.
 * Silently ignores failures (post may never have been pushed).
 */
export async function deleteBlogFromWebsite(slug: string): Promise<void> {
  let webhookUrl: string
  let webhookSecret: string

  try {
    const config = getWebhookConfig()
    webhookUrl = config.webhookUrl
    webhookSecret = config.webhookSecret
  } catch {
    // Website sync not configured — nothing to delete
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({ action: 'delete', slug }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.warn(`[website-sync] Delete failed for slug "${slug}" (${response.status})`)
    }
  } catch (err) {
    // Don't throw — deletion from website is best-effort
    console.warn('[website-sync] Delete request failed', err)
  }
}
