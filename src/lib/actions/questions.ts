'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const createQuestionSchema = z.object({
  eventId: z.string(),
  body: z.string().min(1).max(1000),
})

const voteQuestionSchema = z.object({
  questionId: z.string(),
})

const answerQuestionSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1).max(2000),
})

const archiveQuestionSchema = z.object({
  questionId: z.string(),
  archived: z.boolean(),
})

export async function createQuestion(data: z.infer<typeof createQuestionSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Rate limiting
    const rateLimitResult = await rateLimit.limit(session.user.id, 'question-create')
    if (!rateLimitResult.success) {
      return { error: 'Too many questions created. Please wait before creating another.' }
    }

    const { eventId, body } = createQuestionSchema.parse(data)

    // Verify event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, visibility: true }
    })

    if (!event) {
      return { error: 'Event not found' }
    }

    // Check visibility permissions
    if (event.visibility === 'admin' && session.user.role !== 'admin') {
      return { error: 'Forbidden' }
    }

    // Create question
    const question = await prisma.question.create({
      data: {
        eventId,
        userId: session.user.id,
        body
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    return { 
      success: true, 
      question: {
        ...question,
        voteCount: question._count.votes,
        userVoted: false,
        _count: undefined
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error creating question:', error)
    return { error: 'Internal server error' }
  }
}

export async function voteQuestion(data: z.infer<typeof voteQuestionSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Rate limiting
    const rateLimitResult = await rateLimit.limit(session.user.id, 'question-vote')
    if (!rateLimitResult.success) {
      return { error: 'Too many votes. Please wait before voting again.' }
    }

    const { questionId } = voteQuestionSchema.parse(data)

    // Verify question exists and get event info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        event: {
          select: {
            id: true,
            visibility: true
          }
        }
      }
    })

    if (!question) {
      return { error: 'Question not found' }
    }

    // Check if question is archived
    if (question.archivedAt) {
      return { error: 'Cannot vote on archived question' }
    }

    // Check event visibility permissions
    if (question.event.visibility === 'admin' && session.user.role !== 'admin') {
      return { error: 'Forbidden' }
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId
        }
      }
    })

    if (existingVote) {
      // Remove vote
      await prisma.vote.delete({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId
          }
        }
      })

      // Get updated vote count
      const voteCount = await prisma.vote.count({
        where: { questionId }
      })

      return { success: true, voted: false, voteCount }
    } else {
      // Add vote
      await prisma.vote.create({
        data: {
          userId: session.user.id,
          questionId
        }
      })

      // Get updated vote count
      const voteCount = await prisma.vote.count({
        where: { questionId }
      })

      return { success: true, voted: true, voteCount }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error voting on question:', error)
    return { error: 'Internal server error' }
  }
}

export async function answerQuestion(data: z.infer<typeof answerQuestionSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const { questionId, answer } = answerQuestionSchema.parse(data)

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    if (!question) {
      return { error: 'Question not found' }
    }

    // Update question with answer
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        answer,
        answeredAt: new Date(),
        answeredBy: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    return { 
      success: true, 
      question: {
        ...updatedQuestion,
        voteCount: updatedQuestion._count.votes,
        _count: undefined
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error answering question:', error)
    return { error: 'Internal server error' }
  }
}

export async function archiveQuestion(data: z.infer<typeof archiveQuestionSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const { questionId, archived } = archiveQuestionSchema.parse(data)

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    if (!question) {
      return { error: 'Question not found' }
    }

    // Update question archive status
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        archivedAt: archived ? new Date() : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    return { 
      success: true, 
      question: {
        ...updatedQuestion,
        voteCount: updatedQuestion._count.votes,
        _count: undefined
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input', details: error.issues }
    }
    console.error('Error archiving question:', error)
    return { error: 'Internal server error' }
  }
}
