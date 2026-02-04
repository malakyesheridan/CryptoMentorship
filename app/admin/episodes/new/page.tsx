import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EpisodeForm } from '@/components/admin/EpisodeForm'
import { AdminBackLink } from '@/components/admin/AdminBackLink'

export default function NewEpisodePage() {
  return (
    <div className="space-y-8">
      <AdminBackLink href="/admin" label="Back to Dashboard" />

      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Create</span> <span className="gold">Episode</span>
        </h1>
        <p className="text-slate-600">Add new Crypto Compass episode</p>
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
