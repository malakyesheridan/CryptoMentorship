import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { addUserConnection, removeUserConnection, addTrackConnection, removeTrackConnection } from '@/lib/learning/sse'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const trackId = url.searchParams.get('trackId')
  const type = url.searchParams.get('type') || 'user' // 'user' or 'track'
  
  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connected',
        userId: session.user.id,
        trackId: trackId || null,
        timestamp: new Date().toISOString()
      })
      
      controller.enqueue(`data: ${data}\n\n`)

      // Add connection based on type
      if (type === 'track' && trackId) {
        addTrackConnection(trackId, controller)
      } else {
        addUserConnection(session.user.id, controller)
      }

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
        if (type === 'track' && trackId) {
          removeTrackConnection(trackId, controller)
        } else {
          removeUserConnection(session.user.id, controller)
        }
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
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
