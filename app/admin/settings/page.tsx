import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Shield,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-4xl mb-2">
          <span>Admin</span> <span className="gold">Settings</span>
        </h1>
        <p className="subhead">Configure system settings and preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic application configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Site Name</p>
                <p className="text-xs text-slate-500">STEWART & CO</p>
              </div>
              <Badge variant="outline">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Environment</p>
                <p className="text-xs text-slate-500">
                  {process.env.NODE_ENV || 'production'}
                </p>
              </div>
              <Badge variant="outline">Read-only</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Edit Settings
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Authentication and access control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Authentication</p>
                <p className="text-xs text-slate-500">NextAuth.js</p>
              </div>
              <Badge className="badge-preview">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Session Management</p>
                <p className="text-xs text-slate-500">JWT-based</p>
              </div>
              <Badge variant="outline">Configured</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Security Settings
            </Button>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payments
            </CardTitle>
            <CardDescription>
              Stripe payment configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Provider</p>
                <p className="text-xs text-slate-500">Stripe</p>
              </div>
              <Badge variant="outline">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Status</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
              <Badge className="badge-preview">Live</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Payment Settings
            </Button>
          </CardContent>
        </Card>

        {/* Portfolio Settings */}
        <Card className="card opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Portfolio Settings
            </CardTitle>
            <CardDescription>
              Configure performance calculation parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Base Capital</p>
                <p className="text-xs text-slate-500">For performance calculations</p>
              </div>
              <Badge variant="outline">Locked</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Position Sizing</p>
                <p className="text-xs text-slate-500">Risk-based calculations</p>
              </div>
              <Badge variant="outline">Locked</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Portfolio Settings (Locked)
            </Button>
            <p className="text-xs text-slate-400 text-center">
              Performance stats are not currently displayed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

