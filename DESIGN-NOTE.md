# Authentication Implementation Design Note

## Overview
Implemented real authentication with Google OAuth and Email magic link while preserving demo fallback functionality. All authentication is handled server-side with NextAuth.js and Prisma adapter.

## Provider Configuration

### Google OAuth
- **Conditional Enablement**: Only enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables are present
- **Client-side Detection**: Uses `NEXT_PUBLIC_GOOGLE_ENABLED` to show/hide UI elements
- **Role Assignment**: New Google users default to 'member' role with T1 trial membership

### Email Magic Link
- **Conditional Enablement**: Only enabled when `EMAIL_SERVER` and `EMAIL_FROM` environment variables are present
- **SMTP Configuration**: Supports any SMTP provider (tested with Mailtrap for development)
- **Client-side Detection**: Uses `NEXT_PUBLIC_EMAIL_ENABLED` to show/hide UI elements
- **Role Assignment**: New email users default to 'member' role with T1 trial membership

### Demo Credentials Provider
- **Development Only**: Only available when `NODE_ENV !== 'production'`
- **Two Accounts**: Demo Member (role: member) and Demo Admin (role: admin)
- **Full Access**: Both accounts have T2 active membership for testing

## Server-Side Security

### Authentication Guards
- **`requireUser()`**: Ensures user is authenticated, redirects to login if not
- **`requireRole(role)`**: Enforces specific role requirements
- **`hasRole(user, role)`**: Checks if user has required role level
- **`canView(content, user)`**: Determines content access based on user role and content lock status

### Middleware Protection
- **Route Protection**: All `/dashboard`, `/research`, `/macro`, `/signals`, `/resources`, `/community`, `/account`, `/content/*` routes require authentication
- **Public Routes**: `/login`, `/api/auth/*`, static assets remain public
- **No Double Redirects**: Respects NextAuth's own callback handling

### API Security
- **Message Creation**: Requires authentication with rate limiting (10 messages/minute)
- **Content Access**: Server-side role checking before content delivery
- **Session Validation**: All protected endpoints validate NextAuth session

## Role Hierarchy
```
Guest → Member → Admin
```

- **Guest**: No access to protected routes
- **Member**: Access to unlocked content, community features
- **Admin**: Full access including locked content

## Database Schema
- **NextAuth Tables**: Account, Session, VerificationToken (via Prisma adapter)
- **Custom Tables**: User (with role field), Membership, Content, Episode, Channel, Message
- **Role Storage**: User.role field with enum values ('guest', 'member', 'admin')
- **Membership Integration**: Membership tier affects content access

## Testing Strategy
- **Playwright Tests**: Smoke tests for authentication flows
- **Test Coverage**: Guest redirect, member access, admin access, content gating, community posting
- **Test Data**: Uses demo accounts for consistent testing

## Environment Configuration
- **Required**: `NEXTAUTH_SECRET` (generated via script)
- **Optional**: Google OAuth credentials, Email SMTP settings
- **Public Flags**: `NEXT_PUBLIC_GOOGLE_ENABLED`, `NEXT_PUBLIC_EMAIL_ENABLED`
- **Development**: Demo provider automatically enabled

## Security Considerations
- **JWT Strategy**: Uses JWT sessions for stateless authentication
- **Secure Cookies**: Configured for production with proper domain settings
- **Rate Limiting**: Implemented on message creation endpoint
- **Input Sanitization**: OAuth profile fields are sanitized
- **CSRF Protection**: NextAuth handles CSRF protection automatically

## Migration Path
- **Backward Compatibility**: Existing demo functionality preserved
- **Gradual Rollout**: Can enable providers one at a time
- **Data Migration**: Existing users maintain their roles and memberships
- **Zero Downtime**: No breaking changes to existing functionality
