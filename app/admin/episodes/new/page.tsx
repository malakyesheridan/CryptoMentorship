import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EpisodeForm } from '@/components/admin/EpisodeForm'

export default function NewEpisodePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Create</span> <span className="gold">Episode</span>
        </h1>
        <p className="text-slate-600">Add new Macro Minute episode</p>
      </div>

      {/* Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Episode Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EpisodeForm />
        </CardContent>
      </Card>
    </div>
  )
}
