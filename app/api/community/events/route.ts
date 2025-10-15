import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { addConnection, removeConnection } from '@/lib/community/sse'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  
  if (!channelId) {
    return new Response('Missing channelId', { status: 400 })
  }

  // Verify channel exists
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true }
  })

  if (!channel) {
    return new Response('Channel not found', { status: 404 })
  }

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        channelId,
        userId: session.user.id,
        timestamp: new Date().toISOString()
      })
      
      controller.enqueue(`data: ${data}\n\n`)

      // Add connection to channel
      addConnection(channelId, controller)

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })
          controller.enqueue(`data: ${heartbeatData}\n\n`)
        } catch (error) {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Clean up on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        removeConnection(channelId, controller)
        try {
          controller.close()
        } catch (error) {
          // Controller might already be closed
        }
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

