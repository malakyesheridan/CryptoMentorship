import nodemailer from 'nodemailer'
import { env } from './env'
import { logger } from './logger'

/**
 * Create a nodemailer transporter based on EMAIL_SERVER configuration
 * Supports SMTP URLs like: smtp://user:pass@smtp.example.com:587
 */
function createTransporter() {
  if (!env.EMAIL_SERVER) {
    throw new Error('EMAIL_SERVER is not configured')
  }

  let url: URL
  try {
    // Parse SMTP URL format: smtp://user:pass@host:port
    url = new URL(env.EMAIL_SERVER)
  } catch (error) {
    throw new Error(`Invalid EMAIL_SERVER format: ${error instanceof Error ? error.message : String(error)}. Expected format: smtp://username:password@host:port`)
  }
  
  // Decode URL-encoded username and password (handles special characters)
  // Note: URL() automatically decodes, but we do it explicitly to be safe
  const username = decodeURIComponent(url.username || '')
  const password = decodeURIComponent(url.password || '')
  
  // Validate that we have credentials
  if (!username || !password) {
    throw new Error('EMAIL_SERVER must include both username and password in the format: smtp://username:password@host:port')
  }
  
  const port = parseInt(url.port || '587', 10)
  const isSecurePort = port === 465
  
  // Configure transporter with proper TLS settings
  // ProtonMail requires STARTTLS on port 587
  // Note: Some SMTP servers handle STARTTLS automatically, so we don't force requireTLS
  const transporter = nodemailer.createTransport({
    host: url.hostname,
    port: port,
    secure: isSecurePort, // true for 465 (SSL), false for other ports (STARTTLS)
    // Don't explicitly require TLS - let the server negotiate it
    // requireTLS can cause issues with some providers
    tls: {
      rejectUnauthorized: true, // Reject unauthorized certificates
    },
    auth: {
      user: username,
      pass: password,
    },
  })

  return transporter
}

/**
 * Send an email using the configured email server
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  if (!env.EMAIL_SERVER || !env.EMAIL_FROM) {
    // In development, log the email instead of sending
    if (env.NODE_ENV === 'development') {
      logger.info('Email would be sent (EMAIL_SERVER not configured)', {
        to,
        subject,
        html,
        text,
      })
      return
    }
    throw new Error('Email server is not configured')
  }

  try {
    const transporter = createTransporter()
    
    // Don't verify connection - some SMTP servers (like ProtonMail) don't support verify()
    // and it can cause authentication issues. We'll catch errors during sendMail instead.
    
    const from = env.EMAIL_FROM.includes('<') 
      ? env.EMAIL_FROM 
      : `Stewart & Co <${env.EMAIL_FROM}>`

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    })

    logger.info('Email sent successfully', { to, subject })
  } catch (error) {
    // Enhanced error logging for SMTP authentication issues
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const isAuthError = errorMessage.includes('authentication failed') || 
                       errorMessage.includes('Invalid login') ||
                       errorMessage.includes('535') ||
                       errorMessage.includes('Authentication failed')
    
    if (isAuthError) {
      const url = env.EMAIL_SERVER ? new URL(env.EMAIL_SERVER) : null
      const errorObj = error instanceof Error ? error : new Error(errorMessage)
      logger.error('SMTP authentication failed - check EMAIL_SERVER credentials', errorObj, {
        hostname: url?.hostname || 'unknown',
        port: url?.port || 'unknown',
        usernameProvided: url ? (url.username ? 'yes' : 'no') : 'unknown',
        passwordProvided: url ? (url.password ? 'yes' : 'no') : 'unknown',
        hint: 'For ProtonMail: Ensure you\'re using an SMTP token (not password), and the username is your full email address. Format: smtp://email@domain.com:TOKEN@smtp.protonmail.ch:587',
      })
    } else {
      const errorObj = error instanceof Error ? error : new Error(errorMessage)
      logger.error('Failed to send email', errorObj)
    }
    throw error
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: {
  to: string
  resetUrl: string
  userName?: string | null
}): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FFFDF7 0%, #FBF9F3 100%); padding: 40px 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #d4af37; margin: 0 0 10px 0; font-size: 28px;">Reset Your Password</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            ${greeting}
          </p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #d4af37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748b;">
            Or copy and paste this link into your browser:
          </p>
          <p style="margin: 5px 0 20px 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <p style="margin: 30px 0 0 0; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          
          <p style="margin: 20px 0 0 0; font-size: 14px; color: #64748b;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Stewart & Co Portal. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Reset Your Password

${greeting}

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Stewart & Co Portal. All rights reserved.
  `.trim()

  await sendEmail({
    to,
    subject: 'Reset Your Password - Stewart & Co Portal',
    html,
    text,
  })
}

