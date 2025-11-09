#!/usr/bin/env node

/**
 * Test the actual NextAuth login API endpoint
 * This simulates what the browser does when you click "Sign In"
 */

const TEST_EMAIL = 'malakye@easyflow.au'
const TEST_PASSWORD = 'Sainters12!!'
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function testLoginAPI() {
  console.log('='.repeat(80))
  console.log('TESTING NEXTAUTH LOGIN API')
  console.log('='.repeat(80))
  console.log('Base URL:', BASE_URL)
  console.log()

  try {
    // Step 1: Get CSRF token
    console.log('Step 1: Getting CSRF token...')
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    if (!csrfResponse.ok) {
      throw new Error(`CSRF endpoint returned ${csrfResponse.status}`)
    }
    const csrfData = await csrfResponse.json()
    console.log('✅ CSRF token:', csrfData.csrfToken.substring(0, 20) + '...')
    console.log()

    // Step 2: Get session cookie from CSRF request
    const csrfCookies = csrfResponse.headers.get('set-cookie')
    console.log('Cookies set by CSRF request:', csrfCookies ? 'Yes' : 'No')
    if (csrfCookies) {
      console.log('  Cookies:', csrfCookies.split(',').map(c => c.split(';')[0]).join(', '))
    }
    console.log()

    // Step 3: Attempt login
    console.log('Step 2: Attempting login...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfResponse.headers.get('set-cookie') || '',
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        csrfToken: csrfData.csrfToken,
        json: 'true',
      }),
    })

    console.log('Login response status:', loginResponse.status)
    console.log('Login response headers:', Object.fromEntries(loginResponse.headers.entries()))

    // Check for cookies in response
    const setCookieHeaders = loginResponse.headers.get('set-cookie')
    console.log()
    console.log('Cookies set by login response:', setCookieHeaders ? 'Yes' : 'No')
    if (setCookieHeaders) {
      const cookies = setCookieHeaders.split(',').map(c => c.trim())
      cookies.forEach(cookie => {
        const name = cookie.split('=')[0]
        const hasValue = cookie.includes('=')
        console.log(`  - ${name}: ${hasValue ? 'Has value' : 'No value'}`)
      })
      
      // Look for session token
      const sessionCookie = cookies.find(c => c.includes('session-token'))
      if (sessionCookie) {
        console.log('  ✅ Session cookie found!')
        console.log('     Full cookie:', sessionCookie.substring(0, 100) + '...')
      } else {
        console.log('  ❌ No session-token cookie found!')
      }
    } else {
      console.log('  ❌ No cookies set in login response!')
    }
    console.log()

    // Step 4: Check response body
    const responseText = await loginResponse.text()
    console.log('Response body (first 500 chars):', responseText.substring(0, 500))
    console.log()

    // Step 5: Try to get session after login
    if (setCookieHeaders) {
      console.log('Step 3: Testing session endpoint with cookies...')
      const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
        headers: {
          'Cookie': setCookieHeaders,
        },
      })
      
      console.log('Session response status:', sessionResponse.status)
      const sessionData = await sessionResponse.json()
      console.log('Session data:', JSON.stringify(sessionData, null, 2))
      console.log()
    }

    // Summary
    console.log('='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    if (loginResponse.ok && setCookieHeaders && setCookieHeaders.includes('session-token')) {
      console.log('✅ Login appears successful!')
      console.log('✅ Session cookie was set')
    } else {
      console.log('❌ Login may have failed or cookie not set')
      console.log('   Check the response status and cookies above')
    }
    console.log()

  } catch (error) {
    console.error('❌ Error during API test:', error.message)
    console.error('   Make sure the dev server is running: npm run dev')
    throw error
  }
}

testLoginAPI().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})

