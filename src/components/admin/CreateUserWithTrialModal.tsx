'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { X, Copy, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CreateUserWithTrialModalProps {
  onSuccess?: () => void
  onClose: () => void
}

export function CreateUserWithTrialModal({ onSuccess, onClose }: CreateUserWithTrialModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [tier, setTier] = useState<'T1' | 'T2' | 'T3'>('T1')
  const [durationDays, setDurationDays] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const [createdUser, setCreatedUser] = useState<{
    email: string
    name: string | null
    temporaryPassword: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const copyPassword = async () => {
    if (createdUser?.temporaryPassword) {
      try {
        await navigator.clipboard.writeText(createdUser.temporaryPassword)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Password copied to clipboard')
      } catch (err) {
        toast.error('Failed to copy password')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, tier, durationDays }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setCreatedUser({
        email: data.user.email,
        name: data.user.name,
        temporaryPassword: data.temporaryPassword,
      })

      toast.success(`User created with trial subscription`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCreatedUser(null)
    setEmail('')
    setName('')
    setTier('T1')
    setDurationDays(30)
    onClose()
  }

  // Show success screen with credentials
  if (createdUser) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleClose}>
        <Card className="w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>User Created Successfully</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">User account created with trial subscription</p>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {createdUser.email}
                </div>
                <div>
                  <span className="font-medium">Name:</span> {createdUser.name || 'Not set'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdUser.temporaryPassword}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Share these credentials with the user. They should change their password on first login.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button onClick={handleClose} className="w-full sm:w-auto min-h-[44px]">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show form
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleClose}>
      <Card className="w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Create User + Trial</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as 'T1' | 'T2' | 'T3')}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="T1">T1 - Foundation</option>
                <option value="T2">T2 - Growth</option>
                <option value="T3">T3 - Elite</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="duration">Trial Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                className="mt-1"
              />
              <p className="text-sm text-slate-500 mt-1">
                Default: 30 days (1 month)
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="w-full sm:w-auto min-h-[44px]">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !email} className="w-full sm:w-auto min-h-[44px]">
                {isLoading ? 'Creating...' : 'Create User + Trial'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

