import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContentForm } from '@/components/admin/ContentForm'
import { AdminBackLink } from '@/components/admin/AdminBackLink'

export default function NewContentPage() {
  return (
    <div className="space-y-8">
      <AdminBackLink href="/admin" label="Back to Dashboard" />

      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Create</span> <span className="gold">Content</span>
        </h1>
        <p className="text-slate-600">Add new research, signals, or resources</p>
      </div>

      {/* Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentForm />
        </CardContent>
      </Card>
    </div>
  )
}
