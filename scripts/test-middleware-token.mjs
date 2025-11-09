#!/usr/bin/env node

/**
 * Test if middleware can read the session token from a cookie
 */

// Note: Can't import Next.js types in plain Node.js
// We'll test via HTTP requests instead

const TEST_SESSION_TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..pT1htvJJr5Y35Zmy.NhWML7CuesFjSAaJqjQLJVsRi-J4HVRwXXw4B9iTiFAyaZvl-RRyVuLQSttBrwOYKcxI9pE_ASBgEHH9Hx9qKEXKr0ozKhjYR_2E9FL4Lei74alNJXeUqZrPQ0vVBSn2U8s9-qg3kfY_wv9uvY2NQMY-DqgrWTpmMHvwnh1b2WgBccAk22Ct-Nrg9gy-Ui1Eo_KpeK-zKjoX1enojNlzYZUPI4fkdSAnq5fX8EqupGK_9aNfsaqkJb9OZypz__LrawVyoriAppUu6WFOzosNlBNgrRxbazvORJzoLA6SVPgSybxNffDlrMzDHX3IyNPyd9tvcwby.rkzuAIyKXSEXPuaX5KlXhw'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function testMiddlewareToken() {
  console.log('='.repeat(80))
  console.log('TESTING MIDDLEWARE TOKEN READING')
  console.log('='.repeat(80))
  console.log()

  try {
    // Step 1: Get a fresh session token by logging in
    console.log('Step 1: Getting fresh session token...')
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfResponse.headers.get('set-cookie') || '',
      },
      body: new URLSearchParams({
        email: 'malakye@easyflow.au',
        password: 'Sainters12!!',
        csrfToken: csrfData.csrfToken,
        json: 'true',
      }),
    })

    const setCookieHeader = loginResponse.headers.get('set-cookie')
    if (!setCookieHeader) {
      throw new Error('No cookies set in login response')
    }

    // Extract session token from cookie
    const sessionCookieMatch = setCookieHeader.match(/next-auth\.session-token=([^;]+)/)
    if (!sessionCookieMatch) {
      throw new Error('Session token not found in cookies')
    }

    const sessionToken = sessionCookieMatch[1]
    console.log('✅ Session token extracted:', sessionToken.substring(0, 50) + '...')
    console.log()

    // Step 2: Test what secret would be used
    console.log('Step 2: Checking secret configuration...')
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    const calculatedSecret = !nextAuthSecret || nextAuthSecret.length < 32
      ? 'dev-secret-key-for-local-development-only-not-for-production-use'
      : nextAuthSecret
    
    console.log('NEXTAUTH_SECRET from env:', nextAuthSecret ? `${nextAuthSecret.substring(0, 10)}... (${nextAuthSecret.length} chars)` : 'NOT SET')
    console.log('Calculated secret (what middleware uses):', calculatedSecret.substring(0, 10) + '... (' + calculatedSecret.length + ' chars)')
    console.log()

    // Step 3: Test if middleware can read the token by accessing a protected route
    console.log('Step 3: Testing middleware with protected route...')
    try {
      const dashboardResponse = await fetch(`${BASE_URL}/dashboard`, {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`,
        },
        redirect: 'manual', // Don't follow redirects
      })

      console.log('Dashboard response status:', dashboardResponse.status)
      console.log('Response headers:', {
        location: dashboardResponse.headers.get('location'),
        'set-cookie': dashboardResponse.headers.get('set-cookie') ? 'Yes' : 'No',
      })

      if (dashboardResponse.status === 200) {
        console.log('✅ Middleware allowed access - token is valid!')
      } else if (dashboardResponse.status === 307 || dashboardResponse.status === 302) {
        const location = dashboardResponse.headers.get('location')
        console.log('❌ Middleware redirected (likely to login)')
        console.log('   Redirect location:', location)
        console.log('   This means middleware could NOT read the token')
      } else {
        console.log('⚠️  Unexpected status:', dashboardResponse.status)
      }
    } catch (error) {
      console.log('❌ Error accessing dashboard:', error.message)
    }
    console.log()

    // Step 4: Test session endpoint with the cookie
    console.log('Step 4: Testing session endpoint with cookie...')
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`,
      },
    })

    console.log('Session endpoint status:', sessionResponse.status)
    const sessionData = await sessionResponse.json()
    console.log('Session data:', JSON.stringify(sessionData, null, 2))
    
    if (sessionData && sessionData.user) {
      console.log('✅ Session endpoint returns user data')
    } else {
      console.log('❌ Session endpoint returns empty or no user')
    }
    console.log()

    // Summary
    console.log('='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log('If token decryption works but session endpoint returns empty:')
    console.log('  - The secret is correct')
    console.log('  - But there might be an issue with the session callback')
    console.log()
    console.log('If token decryption fails:')
    console.log('  - Secret mismatch between NextAuth and middleware')
    console.log('  - Or cookie format issue')
    console.log()

  } catch (error) {
    console.error('❌ Error during test:', error.message)
    throw error
  }
}

testMiddlewareToken().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})

