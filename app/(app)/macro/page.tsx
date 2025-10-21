import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import Link from 'next/link'
import { Play, Lock, Eye, Calendar, ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import AdminVideoUploadWrapper from '@/components/AdminVideoUploadWrapper'
import AdminEpisodeUploadWrapper from '@/components/AdminEpisodeUploadWrapper'
import { formatDate } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function CryptoCompassPage() {
  try {
    // Fetch episodes from database
    const episodesRaw = await prisma.episode.findMany({
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverUrl: true,
        publishedAt: true,
        locked: true,
      },
      orderBy: { publishedAt: 'desc' }
    })

    const session = await getSession()
    const userRole = session?.user?.role || 'guest'
    const userTier = (session?.user as any)?.membershipTier || null

    const episodes = episodesRaw.map((episode) => ({
      slug: episode.slug,
      title: episode.title,
      summary: episode.excerpt ?? null,
      coverUrl: episode.coverUrl ?? '/images/placeholders/episode-cover.jpg',
      publishedAt: episode.publishedAt ?? new Date(),
      locked: episode.locked,
    }))

  // Fetch videos for Crypto Compass section
  let videos: any[] = []
  try {
    videos = await prisma.video.findMany({
      where: {
        status: 'ready',
        visibility: { in: ['public', 'member'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { name: true }
        }
      }
    })
  } catch (error) {
    console.error('Error fetching videos:', error)
    videos = []
  }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
          <div className="relative container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
                <span className="text-white">Crypto </span>
                <span className="text-yellow-400">Compass</span>
              </h1>
              <p className="text-xl text-slate-300 mb-8">
                Weekly insights on crypto market trends, macroeconomics, and investment strategies
              </p>
              <div className="flex items-center justify-center gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  <span className="font-medium">{episodes.length} Episodes</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">{videos.length} Videos</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Weekly Updates</span>
                </div>
                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">15min Episodes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Admin Upload Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <AdminEpisodeUploadWrapper userRole={userRole} />
            <AdminVideoUploadWrapper userRole={userRole} />
          </div>

          {/* Episodes Section */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Latest Episodes</h2>
              <div className="flex items-center gap-2 text-slate-600">
                <Play className="w-5 h-5" />
                <span className="font-medium">{episodes.length} Episodes</span>
              </div>
            </div>

            {episodes.length > 0 ? (
              <div className="grid gap-8">
                {episodes.map((episode, index) => {
                  const canView = !episode.locked || userRole === 'admin' || (userTier && ['T2', 'T3'].includes(userTier))

                  return (
                    <Link key={episode.slug} href={`/macro/${episode.slug}`}>
                      <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 relative">
                        <div className="flex flex-col lg:flex-row">
                          {/* Episode Image */}
                          <div className="lg:w-80 lg:h-48 h-64 relative overflow-hidden">
                            <img
                              src={episode.coverUrl ?? '/images/placeholders/episode-cover.jpg'}
                              alt={episode.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-yellow-500 text-white text-sm px-3 py-1 font-medium">
                                Episode {index + 1}
                              </Badge>
                            </div>
                            <div className="absolute top-4 right-4">
                              {!canView && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-sm px-3 py-1 font-medium">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                            </div>
                            <div className="absolute bottom-4 left-4">
                              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                                <Play className="w-6 h-6 text-slate-900 ml-1" />
                              </div>
                            </div>
                          </div>

                          {/* Episode Content */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-yellow-600 transition-colors line-clamp-2">
                                  {episode.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed mb-4 line-clamp-3">
                                  {episode.summary || 'No description available.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(episode.publishedAt, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>~15 min</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-500 transition-colors">
                                <span className="font-medium">Watch</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Access Control Overlay */}
                        {!canView && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center">
                              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm font-medium text-slate-600">Member Only</p>
                              <p className="text-xs text-slate-500">Upgrade to access</p>
                            </div>
                          </div>
                        )}

                        {/* Hover Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Episodes Yet</h3>
                <p className="text-slate-600">Check back soon for new Crypto Compass insights!</p>
              </div>
            )}
          </div>

          {/* Videos Section */}
          {videos.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Crypto Compass Videos</h2>
                <div className="flex items-center gap-2 text-slate-600">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">{videos.length} Videos</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => {
                  const canView = video.visibility === 'public' || userRole === 'admin' || (userTier && ['T2', 'T3'].includes(userTier))

                  return (
                    <Link key={video.id} href={`/videos/${video.id}`}>
                      <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 relative">
                        <div className="aspect-video bg-slate-100 relative overflow-hidden">
                          <img
                            src={video.thumbnail || '/images/placeholders/video-thumbnail.jpg'}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                              <Play className="w-8 h-8 text-slate-900 ml-1" />
                            </div>
                          </div>
                          <div className="absolute top-3 left-3">
                            <Badge className={`text-sm px-3 py-1 font-medium ${video.visibility === 'public' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                              {video.visibility === 'public' ? 'Public' : 'Member'}
                            </Badge>
                          </div>
                          {!canView && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-sm px-3 py-1 font-medium">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2">
                            {video.title}
                          </h3>
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {video.description || 'No description available.'}
                          </p>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>{video.uploader?.name || 'Unknown'}</span>
                            <span>0 views</span>
                          </div>
                        </div>

                        {/* Access Control Overlay */}
                        {!canView && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center">
                              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm font-medium text-slate-600">Member Only</p>
                              <p className="text-xs text-slate-500">Upgrade to access</p>
                            </div>
                          </div>
                        )}

                        {/* Hover Effect Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in CryptoCompassPage:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Error Loading Crypto Compass Page</h1>
          <p className="text-slate-600 mb-8">Something went wrong while loading the Crypto Compass page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
}