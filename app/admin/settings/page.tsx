import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Database,
  Shield,
  Bell,
  Mail,
  CreditCard,
  FileText,
  Globe
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

        {/* Database Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database
            </CardTitle>
            <CardDescription>
              Database connection and management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Provider</p>
                <p className="text-xs text-slate-500">SQLite</p>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Status</p>
                <p className="text-xs text-slate-500">Connected</p>
              </div>
              <Badge className="badge-preview">Healthy</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Database Tools
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
            <Link href="/admin/signals/settings">
              <Button variant="outline" className="w-full">
                Payment Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Content Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Management
            </CardTitle>
            <CardDescription>
              Content types and publishing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Content Types</p>
                <p className="text-xs text-slate-500">Research, Signals, Resources</p>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Episodes</p>
                <p className="text-xs text-slate-500">Crypto Compass</p>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
            <Link href="/admin/content">
              <Button variant="outline" className="w-full">
                Manage Content
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Notification preferences and channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">In-App</p>
                <p className="text-xs text-slate-500">Enabled</p>
              </div>
              <Badge className="badge-preview">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Email</p>
                <p className="text-xs text-slate-500">Configured</p>
              </div>
              <Badge variant="outline">Available</Badge>
            </div>
            <Button variant="outline" className="w-full" disabled>
              Notification Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/announce">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Send Announcement
              </Button>
            </Link>
            <Link href="/admin/signals/settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Portfolio Settings
              </Button>
            </Link>
            <Link href="/admin/media">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Media Library
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

