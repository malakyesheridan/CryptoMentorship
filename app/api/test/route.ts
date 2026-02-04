import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Test API route called')
    }
    return NextResponse.json({ ok: true, message: 'Test API working' })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { ok: false, message: 'Test API failed' },
      { status: 500 }
    )
  }
}
