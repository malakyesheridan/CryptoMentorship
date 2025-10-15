import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Award,
  Calendar,
  User,
  BookOpen,
  CheckCircle
} from 'lucide-react'
import { CertificateActions } from '@/components/CertificateActions'
import Link from 'next/link'

async function getCertificate(code: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { code },
    include: {
      user: {
        select: { name: true, email: true },
      },
      track: {
        select: { title: true, slug: true },
      },
    },
  })

  return certificate
}

export default async function CertificatePage({
  params
}: {
  params: { code: string }
}) {
  const certificate = await getCertificate(params.code)
  
  if (!certificate) {
    redirect('/learn')
  }

  const { user, track } = certificate

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/learn">
            <div className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
              <BookOpen className="h-4 w-4" />
              Back to Learning
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Certificate of Completion</h1>
          <p className="text-slate-600">Verify this certificate at /learn/cert/{params.code}</p>
        </div>

        {/* Certificate */}
        <Card className="bg-gradient-to-br from-gold-50 to-ivory-50 border-2 border-gold-200 shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              {/* Certificate Header */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-600 rounded-full mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-2">
                  Certificate of Completion
                </h2>
                <p className="text-lg text-slate-600">
                  This certifies that
                </p>
              </div>

              {/* Student Name */}
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-gold-700 mb-2">
                  {user.name || 'Student'}
                </h3>
                <p className="text-lg text-slate-600">
                  has successfully completed the learning track
                </p>
              </div>

              {/* Track Title */}
              <div className="mb-8">
                <h4 className="text-2xl font-semibold text-slate-900 mb-4">
                  &ldquo;{track.title}&rdquo;
                </h4>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-gold-600" />
                  <span className="text-gold-800 font-medium">Completed</span>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-600">Issued On</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-600">Certificate ID</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 font-mono">
                    {certificate.code}
                  </p>
                </div>
              </div>

              {/* Verification Notice */}
              <div className="border-t border-slate-200 pt-6">
                <p className="text-sm text-slate-600 mb-2">
                  This certificate can be verified at:
                </p>
                <p className="text-sm font-mono text-slate-500">
                  /learn/cert/{params.code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <CertificateActions trackTitle={track.title} />

        {/* Verification API Info */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Certificate Verification</CardTitle>
              <CardDescription>
                This certificate is verified using blockchain-style verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Certificate ID</span>
                  <span className="text-sm font-mono text-slate-900">{certificate.code}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Track</span>
                  <span className="text-sm text-slate-900">{track.title}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Issued</span>
                  <span className="text-sm text-slate-900">
                    {new Date(certificate.issuedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Verified Certificate</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
