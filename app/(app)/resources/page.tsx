import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { formatContentDate, canViewContent } from '@/lib/content'
import Link from 'next/link'
import { BookOpen, Lock, Eye, Calendar, ArrowRight, FileText, Download, Search, Filter, Users, Clock, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AdminResourceUploadWrapper from '@/components/AdminResourceUploadWrapper'
import ResourceFilters from '@/components/ResourceFilters'
import ResourceCard from '@/components/ResourceCard'
import ResourcesClient from '@/components/ResourcesClient'

export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  const resourceRecords = await prisma.content.findMany({
    where: { kind: 'resource' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      tags: true,
      publishedAt: true,
      locked: true,
      kind: true,
      minTier: true,
    }
  })
  const session = await getSession()
  const userRole = session?.user?.role || 'guest'
  const userTier = (session?.user as any)?.membershipTier || null

  const resources = resourceRecords.map((resource) => ({
    slug: resource.slug ?? resource.id,
    title: resource.title,
    description: resource.excerpt ?? null,
    url: `/content/${resource.slug ?? resource.id}`,
    coverUrl: resource.coverUrl ?? '/images/placeholders/resource-cover.jpg',
    tags: resource.tags ?? null,
    publishedAt: resource.publishedAt ?? null,
    id: resource.id,
    locked: resource.locked,
    kind: resource.kind,
    minTier: resource.minTier,
  }))

  // Calculate stats
  const totalResources = resources.length
  const publicResources = resources.filter(r => !r.locked).length
  const memberResources = resources.filter(r => r.locked && r.minTier === 'T1').length
  const premiumResources = resources.filter(r => r.locked && ['T2', 'T3'].includes(r.minTier || '')).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20"></div>
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6">
              <span className="text-white">Resource</span>
              <span className="text-yellow-400 ml-4">Library</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Comprehensive collection of guides, tools, and educational materials
            </p>
            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{totalResources} Resources</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <span className="font-medium">{publicResources} Public</span>
              </div>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">{memberResources + premiumResources} Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Admin Upload Section */}
        <AdminResourceUploadWrapper userRole={userRole} />

        {/* Resources with Search and Filter */}
        <ResourcesClient 
          resources={resources} 
          userRole={userRole} 
          userTier={userTier} 
        />
      </div>
    </div>
  )
}
