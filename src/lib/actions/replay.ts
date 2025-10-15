'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseTranscript } from '@/lib/captions'

const chapterSchema = z.object({
  title: z.string().min(1).max(200),
  startMs: z.number().min(0),
})

const chaptersBatchSchema = z.object({
  eventId: z.string(),
  chapters: z.array(z.object({
    id: z.string().optional(), // For updates
    title: z.string().min(1).max(200),
    startMs: z.number().min(0),
    _delete: z.boolean().optional(), // For deletions
  }))
})

const transcriptUploadSchema = z.object({
  eventId: z.string(),
  content: z.string().min(1),
  source: z.enum(['manual', 'vtt', 'srt']).default('manual'),
})

const transcriptPasteSchema = z.object({
  eventId: z.string(),
  lines: z.string().min(1),
})

export async function updateChapters(data: z.infer<typeof chaptersBatchSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const { eventId, chapters } = chaptersBatchSchema.parse(data)

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true }
    })

    if (!event) {
      return { error: 'Event not found' }
    }

    // Process chapters in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const operations = []

      for (const chapter of chapters) {
        if (chapter._delete && chapter.id) {
          // Delete existing chapter
          operations.push(
            tx.chapter.delete({
              where: { id: chapter.id }
            })
          )
        } else if (chapter.id) {
          // Update existing chapter
          operations.push(
            tx.chapter.update({
              where: { id: chapter.id },
              data: {
                title: chapter.title,
                startMs: chapter.startMs
              }
            })
          )
        } else {
          // Create new chapter
          operations.push(
            tx.chapter.create({
              data: {
                eventId,
                title: chapter.title,
                startMs: chapter.startMs
              }
            })
          )
        }
      }

      return Promise.all(operations)
    })

    // Get updated chapters list
    const updatedChapters = await prisma.chapter.findMany({
      where: { eventId },
      orderBy: { startMs: 'asc' }
    })

    return { success: true, chapters: updatedChapters }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error updating chapters:', error)
    return { error: 'Internal server error' }
  }
}

export async function uploadTranscript(data: z.infer<typeof transcriptUploadSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const { eventId, content, source } = transcriptUploadSchema.parse(data)

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true }
    })

    if (!event) {
      return { error: 'Event not found' }
    }

    // Parse transcript content
    let segments
    try {
      // Map 'manual' to 'plain' for parseTranscript
      const transcriptSource = source === 'manual' ? 'plain' : source
      segments = parseTranscript(content, transcriptSource)
    } catch (error) {
      return { 
        error: 'Failed to parse transcript', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    if (segments.length === 0) {
      return { 
        error: 'No valid segments found in transcript' 
      }
    }

    // Create or update transcript in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing transcript and segments
      await tx.transcriptSegment.deleteMany({
        where: {
          transcript: {
            eventId
          }
        }
      })

      await tx.transcript.deleteMany({
        where: { eventId }
      })

      // Create new transcript
      const transcript = await tx.transcript.create({
        data: {
          eventId,
          source,
          uploadedBy: session.user.id
        }
      })

      // Create segments
      const segmentData = segments.map(segment => ({
        transcriptId: transcript.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text
      }))

      await tx.transcriptSegment.createMany({
        data: segmentData
      })

      return transcript
    })

    // Get the complete transcript with segments
    const transcript = await prisma.transcript.findUnique({
      where: { id: result.id },
      include: {
        segments: {
          orderBy: { startMs: 'asc' }
        }
      }
    })

    return { success: true, transcript }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error uploading transcript:', error)
    return { error: 'Internal server error' }
  }
}

export async function pasteTranscript(data: z.infer<typeof transcriptPasteSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const { eventId, lines } = transcriptPasteSchema.parse(data)

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true }
    })

    if (!event) {
      return { error: 'Event not found' }
    }

    // Parse plain text transcript
    let segments
    try {
      segments = parseTranscript(lines, 'plain')
    } catch (error) {
      return { 
        error: 'Failed to parse transcript', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    if (segments.length === 0) {
      return { 
        error: 'No valid segments found in transcript' 
      }
    }

    // Create or update transcript in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing transcript and segments
      await tx.transcriptSegment.deleteMany({
        where: {
          transcript: {
            eventId
          }
        }
      })

      await tx.transcript.deleteMany({
        where: { eventId }
      })

      // Create new transcript
      const transcript = await tx.transcript.create({
        data: {
          eventId,
          source: 'manual',
          uploadedBy: session.user.id
        }
      })

      // Create segments
      const segmentData = segments.map(segment => ({
        transcriptId: transcript.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text
      }))

      await tx.transcriptSegment.createMany({
        data: segmentData
      })

      return transcript
    })

    // Get the complete transcript with segments
    const transcript = await prisma.transcript.findUnique({
      where: { id: result.id },
      include: {
        segments: {
          orderBy: { startMs: 'asc' }
        }
      }
    })

    return { success: true, transcript }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error pasting transcript:', error)
    return { error: 'Internal server error' }
  }
}
