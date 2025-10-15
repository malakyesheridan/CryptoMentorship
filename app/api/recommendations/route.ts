import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { 
  getPersonalizedRecommendations, 
  getContentRecommendations, 
  getEpisodeRecommendations, 
  getTrackRecommendations,
  getContinueLearningRecommendations 
} from '@/lib/actions/recommendations'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'all'
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const excludeIds = url.searchParams.get('excludeIds')?.split(',') || []

  try {
    let recommendations

    switch (type) {
      case 'content':
        recommendations = await getContentRecommendations(session.user.id, limit)
        break
      case 'episode':
        recommendations = await getEpisodeRecommendations(session.user.id, limit)
        break
      case 'track':
        recommendations = await getTrackRecommendations(session.user.id, limit)
        break
      case 'continue':
        recommendations = await getContinueLearningRecommendations(session.user.id)
        break
      case 'all':
      default:
        recommendations = await getPersonalizedRecommendations({
          userId: session.user.id,
          limit,
          excludeIds
        })
        break
    }

    return Response.json({
      recommendations,
      userId: session.user.id,
      type,
      limit,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
