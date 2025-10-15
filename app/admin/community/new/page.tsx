import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChannelForm } from '@/components/admin/ChannelForm'

export default function NewChannelPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-two-tone text-3xl mb-2">
          <span>Create</span> <span className="gold">Channel</span>
        </h1>
        <p className="text-slate-600">Add a new community channel for discussions</p>
      </div>

      {/* Form */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelForm />
        </CardContent>
      </Card>
    </div>
  )
}
