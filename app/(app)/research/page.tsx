import { getContent } from '@/lib/content'
import { formatContentDate } from '@/lib/content'
import { getSession } from '@/lib/auth-server'
import { canViewContent } from '@/lib/content'
import { getPaginationParams, createPaginationResult } from '@/lib/pagination'
import { ResearchFilters } from '@/components/ResearchFilters'
import { EmptyState } from '@/components/EmptyState'
import { PaginationControls } from '@/components/PaginationControls'
import AdminResearchUploadWrapper from '@/components/AdminResearchUploadWrapper'
import Link from 'next/link'
import { Calendar, Tag, Lock, Eye, ArrowRight, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

interface ResearchPageProps {
  searchParams: {
    q?: string
    tags?: string
    sort?: string
    page?: string
    limit?: string
  }
}

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  const pagination = getPaginationParams(new URLSearchParams(searchParams as any))
  const filters = {
    kind: 'research' as const,
    search: searchParams.q,
    tags: searchParams.tags ? searchParams.tags.split(',') : undefined,
    ...pagination,
  }
  
  try {
    const result = await getContent(filters)
    const researchContent = Array.isArray(result) ? result : result.data
    const paginationInfo = Array.isArray(result) ? null : result.pagination
    
    const session = await getSession()
    const userRole = session?.user?.role || 'guest'
    const userTier = (session?.user as any)?.membershipTier || null

    // Calculate research stats
    const totalResearch = researchContent.length
    const publicResearch = researchContent.filter(r => !r.locked).length
    const memberResearch = researchContent.filter(r => r.locked).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-white">Crypto</span>
              <span className="text-yellow-400 ml-4">Research</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              In-depth market analysis and cryptocurrency insights from our expert team
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{totalResearch} Research Articles</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <span className="font-medium">{publicResearch} Public</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                <span className="font-medium">{memberResearch} Member Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Admin Upload Section */}
        <AdminResearchUploadWrapper userRole={userRole} />

        {/* Filters */}
        <ResearchFilters />
      
        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {researchContent.map((content) => {
            const canView = canViewContent(userRole, userTier, null, content.locked)

            return (
              <Link key={content.id} href={`/content/${content.id}`}>
                <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 relative">
                  {/* Research Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <Badge className={`text-xs px-2 py-1 ${content.locked ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                            {content.locked ? 'Member' : 'Public'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-yellow-600 transition-colors line-clamp-2">
                          {content.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                          {content.excerpt || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    {/* Research Metadata */}
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatContentDate(content.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Research</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-yellow-500 transition-colors">
                        <span className="font-medium">Read</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
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
      
        {researchContent.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Research Articles Available</h3>
            <p className="text-slate-500">Check back soon for new research insights and analysis.</p>
          </div>
        ) : (
          <>
            {/* Pagination Controls */}
            {paginationInfo && (
              <PaginationControls
                pagination={paginationInfo}
                baseUrl="/research"
                searchParams={searchParams}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error fetching research data:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Research</h1>
          <p className="text-slate-600 mb-8">Unable to load research content at this time. Please try again later.</p>
        </div>
      </div>
    )
  }
}
