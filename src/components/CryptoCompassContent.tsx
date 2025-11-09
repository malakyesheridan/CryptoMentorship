'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Lock, Eye, Calendar, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import CryptoCompassSearchFilter from './CryptoCompassSearchFilter'
import { formatContentDate } from '@/lib/content-utils'

interface CryptoCompassContentProps {
  episodes: any[]
  videos: any[]
  userRole: string
  userTier: string | null
}

export default function CryptoCompassContent({ episodes, videos, userRole, userTier }: CryptoCompassContentProps) {
  const [filteredEpisodes, setFilteredEpisodes] = useState(episodes)
  const [filteredVideos, setFilteredVideos] = useState(videos)

  return (
    <>
      {/* Search and Filter */}
      <CryptoCompassSearchFilter
        episodes={episodes}
        videos={videos}
        onFilteredEpisodes={setFilteredEpisodes}
        onFilteredVideos={setFilteredVideos}
      />

      {/* Episodes Section */}
      {filteredEpisodes.length > 0 && (
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between">
            <h2 className="heading-two-tone text-2xl">
              <span>Latest</span> <span className="gold">Episodes</span>
            </h2>
            <Badge variant="outline" className="text-sm">
              {filteredEpisodes.length} episodes
            </Badge>
          </div>
          
          <div className="space-y-6">
            {filteredEpisodes.map((episode) => {
              const canView = !episode.locked || userRole === 'admin' || (userTier && ['T2', 'T3'].includes(userTier))

              return (
                <Link key={episode.slug} href={`/crypto-compass/${episode.slug}`}>
                  <article className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100 overflow-hidden">
                    <div className="flex items-center space-x-6 p-6">
                      <div className="flex-shrink-0">
                        <div className="relative group/image">
                          <img
                            src={episode.coverUrl ?? '/images/placeholders/episode-cover.jpg'}
                            alt={episode.title}
                            className="w-24 h-24 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-gold-500 text-white text-xs px-2 py-1">
                              <Play className="w-3 h-3 mr-1" />
                              Episode
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {episode.locked && (
                            <Badge className={canView ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                              {canView ? <Eye className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                              {canView ? 'Preview' : 'Locked'}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            <Calendar className="w-3 h-3" />
                            {formatContentDate(episode.publishedAt)}
                          </div>
                        </div>

                        <h3 className="heading-2 text-xl mb-3 group-hover:text-gold-600 transition-colors duration-300">
                          {episode.title}
                        </h3>

                        {episode.summary && (
                          <p className="text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                            {episode.summary}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gold-400 rounded-full"></div>
                              <span>Crypto Compass Analysis</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 group-hover:text-gold-500 transition-colors">
                            <span className="text-sm font-medium">Watch</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {filteredVideos.length > 0 && (
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="heading-two-tone text-3xl mb-2">
              <span>Crypto Compass</span> <span className="gold">Videos</span>
            </h2>
            <p className="text-slate-600">Latest video content and analysis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => {
              const canView = video.visibility === 'public' || 
                             (video.visibility === 'member' && (userRole === 'admin' || userTier)) ||
                             userRole === 'admin'

              return (
                <Link key={video.id} href={`/videos/${video.id}`}>
                  <article className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100 overflow-hidden">
                    <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 aspect-video flex items-center justify-center overflow-hidden">
                      <Play className="w-16 h-16 text-slate-400 group-hover:text-gold-500 transition-colors duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-3 left-3">
                        <Badge className={`text-xs px-2 py-1 ${video.visibility === 'public' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {video.visibility}
                        </Badge>
                      </div>
                      {!canView && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-red-100 text-red-700 text-xs px-2 py-1">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 space-y-3">
                      <h3 className="heading-2 text-lg mb-2 group-hover:text-gold-600 transition-colors duration-300 line-clamp-2">
                        {video.title}
                      </h3>

                      {video.description && (
                        <p className="text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span className="font-medium">{video._count.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatContentDate(video.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-gold-500 transition-colors">
                          <span className="text-xs font-medium">Watch</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEpisodes.length === 0 && filteredVideos.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No content found</h3>
          <p className="text-slate-500 mb-6">Try adjusting your search or filter criteria</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </>
  )
}
