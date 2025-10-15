import { prisma } from '../prisma'
import { emit } from '../events'

export async function publishScheduledContent() {
  const now = new Date()
  
  // Find content that should be published
  const contentToPublish = await prisma.content.findMany({
    where: {
      publishAt: {
        lte: now,
        not: null,
      },
      publishedAt: {
        lt: now, // Only update if not already published
      },
    },
  })

  // Find episodes that should be published
  const episodesToPublish = await prisma.episode.findMany({
    where: {
      publishAt: {
        lte: now,
        not: null,
      },
      publishedAt: {
        lt: now, // Only update if not already published
      },
    },
  })

  const results = {
    content: 0,
    episodes: 0,
    errors: [] as string[],
  }

  // Publish content
  for (const content of contentToPublish) {
    try {
      await prisma.content.update({
        where: { id: content.id },
        data: {
          publishedAt: now,
          publishAt: null, // Clear the scheduled time
        },
      })
      
      // Emit notification event
      const eventType = content.kind === 'research' ? 'research_published' : 
                      content.kind === 'signal' ? 'signal_published' : null
      
      if (eventType) {
        await emit({ type: eventType, contentId: content.id })
      }
      
      results.content++
    } catch (error) {
      results.errors.push(`Failed to publish content ${content.id}: ${error}`)
    }
  }

  // Publish episodes
  for (const episode of episodesToPublish) {
    try {
      await prisma.episode.update({
        where: { id: episode.id },
        data: {
          publishedAt: now,
          publishAt: null, // Clear the scheduled time
        },
      })
      
      // Emit notification event
      await emit({ type: 'episode_published', episodeId: episode.id })
      
      results.episodes++
    } catch (error) {
      results.errors.push(`Failed to publish episode ${episode.id}: ${error}`)
    }
  }

  return results
}

// Helper function to check if content should be visible
export function isContentPublished(content: { publishedAt: Date; publishAt?: Date | null }) {
  const now = new Date()
  
  // If publishAt is set and in the future, treat as draft
  if (content.publishAt && content.publishAt > now) {
    return false
  }
  
  // Otherwise, check publishedAt
  return content.publishedAt <= now
}
