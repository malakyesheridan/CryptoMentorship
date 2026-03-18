'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResourceFilters from '@/components/ResourceFilters'
import ResourceCard from '@/components/ResourceCard'

interface Resource {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  coverUrl: string
  tags: string | null
  publishedAt: Date | null
  locked: boolean
  kind: string
  minTier: string | null
}

interface ResourcesClientProps {
  resources: Resource[]
  userRole: string
  userTier: string | null
}

export default function ResourcesClient({ resources, userRole, userTier }: ResourcesClientProps) {
  const [filteredResources, setFilteredResources] = useState(resources)

  return (
    <>
      {/* Search and Filter Section */}
      <ResourceFilters 
        resources={resources} 
        onFilteredResources={setFilteredResources} 
      />

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const canView = !resource.locked || ['admin', 'editor'].includes(userRole) || (userTier && ['T2', 'T3'].includes(userTier)) || false

            return (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                canView={canView} 
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-[#1a1815] rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">No Resources Found</h3>
          <p className="text-[var(--text-strong)] mb-6">Try adjusting your search or filter criteria.</p>
          {['admin', 'editor'].includes(userRole) && (
            <Button className="bg-gold-500 hover:bg-gold-600 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Upload First Resource
            </Button>
          )}
        </div>
      )}
    </>
  )
}
