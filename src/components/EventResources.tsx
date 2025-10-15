'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Download, ExternalLink, FileText } from 'lucide-react'

interface EventResourcesProps {
  recordingUrl?: string
  resources?: Array<{
    title: string
    url: string
  }>
  eventTitle: string
}

export function EventResources({ recordingUrl, resources, eventTitle }: EventResourcesProps) {
  if (!recordingUrl && (!resources || resources.length === 0)) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="heading-2 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Event Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording */}
        {recordingUrl && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Play className="h-5 w-5 text-slate-600" />
                <div>
                  <h4 className="font-medium text-slate-800">Event Recording</h4>
                  <p className="text-sm text-slate-600">
                    Watch the replay of &ldquo;{eventTitle}&rdquo;
                  </p>
                </div>
              </div>
              <Button asChild>
                <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Recording
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Resources */}
        {resources && resources.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-800 mb-3">Additional Resources</h4>
            <div className="space-y-2">
              {resources.map((resource, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-800">{resource.title}</p>
                      <p className="text-xs text-slate-500">
                        {resource.url.includes('drive.google.com') ? 'Google Drive' :
                         resource.url.includes('dropbox.com') ? 'Dropbox' :
                         resource.url.includes('youtube.com') ? 'YouTube' :
                         'External Link'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download All */}
        {(recordingUrl || (resources && resources.length > 0)) && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-3">
              Download all resources for offline access
            </p>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download All Resources
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
