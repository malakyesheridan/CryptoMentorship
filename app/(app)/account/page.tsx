'use client'

import { useSession } from 'next-auth/react'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Calendar } from 'lucide-react'
import { NotificationPreferences } from '@/components/NotificationPreferences'

export default function AccountPage() {
  const { data: session } = useSession()

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Account Settings" 
        subtitle="Manage your profile and membership information"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="card p-6">
          <h3 className="heading-2 text-xl mb-6">Profile Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-800">{session?.user?.name || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-800">{session?.user?.email || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Role</p>
                <Badge variant={session?.user?.role === 'admin' ? 'preview' : 'default'}>
                  {session?.user?.role || 'guest'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Membership Information */}
        <div className="card p-6">
          <h3 className="heading-2 text-xl mb-6">Membership</h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Tier</p>
                <Badge variant="preview">T2 Premium</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Member Since</p>
                <p className="font-medium text-slate-800">January 2024</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gold-50 rounded-lg border border-gold-200">
            <h4 className="font-semibold text-slate-800 mb-2">Membership Benefits</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Access to all research reports</li>
              <li>• Weekly Macro Minute episodes</li>
              <li>• Trading signals and model portfolio</li>
              <li>• Community access and support</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div>
        <h2 className="heading-2 text-2xl mb-6">Notification Preferences</h2>
        <NotificationPreferences />
      </div>
    </div>
  )
}
