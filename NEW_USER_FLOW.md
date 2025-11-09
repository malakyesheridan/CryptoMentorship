# New User Flow - Sign-Up First Approach

## 🎯 Complete Flow

### 1. **User Visits Homepage**
- Homepage redirects to `/login`
- Login page shows "Get Started" with primary action: **"Create Account"**
- Secondary action: "Sign in with Email & Password"

### 2. **User Clicks "Create Account"**
- Redirects to `/register`
- User fills in: Name (optional), Email, Password
- Clicks "Create Account"
- Account created in database with membership status: `trial`

### 3. **Auto-Login After Registration**
- User automatically signed in using NextAuth
- Redirects to `/subscribe?newuser=true`
- Shows welcome message: "Welcome! Your account has been created. Choose a subscription plan to get started."

### 4. **User Selects Subscription**
- User chooses tier (Foundation/Growth/Elite)
- User chooses billing interval (1/3/6/12 months)
- Clicks "Subscribe Now"
- Redirected to Stripe Checkout

### 5. **Payment Completion**
- User completes payment in Stripe
- Stripe webhook processes `checkout.session.completed`
- Membership updated to `active` status
- User redirected to `/account/subscription?success=true`

### 6. **Access Granted**
- User can now access dashboard and all protected content
- Subscription status checked on each page load

---

## 🔐 Login Flow (Existing Users)

### 1. **User Clicks "Sign in with Email & Password"**
- Login form appears
- User enters email and password
- Clicks "Sign In"

### 2. **Subscription Check**
- After successful login, system checks subscription status
- **If NO subscription:**
  - Shows error: "You need an active subscription to access the platform. Please sign up for a subscription."
  - After 2 seconds, redirects to `/subscribe?required=true`
  - Shows warning banner: "Subscription Required - You need an active subscription to access the platform."
  
- **If HAS subscription:**
  - Redirects to dashboard (or callback URL)
  - Full access granted

---

## 📋 Key Changes Made

### 1. **Login Page** (`app/(auth)/login/page.tsx`)
- ✅ Primary action: "Create Account" button (links to `/register`)
- ✅ Secondary action: "Sign in with Email & Password"
- ✅ Added subscription check after login
- ✅ Redirects to `/subscribe?required=true` if no subscription

### 2. **Register Page** (`app/(auth)/register/page.tsx`)
- ✅ Auto-logs in user after successful registration
- ✅ Redirects to `/subscribe?newuser=true` instead of login page
- ✅ Success message updated: "Redirecting to choose your subscription..."

### 3. **Subscribe Page** (`app/(app)/subscribe/page.tsx`)
- ✅ Shows welcome banner for new users (`?newuser=true`)
- ✅ Shows warning banner for existing users without subscription (`?required=true`)

### 4. **Homepage** (`app/(app)/page.tsx`)
- ✅ Redirects to `/login` instead of `/dashboard`

---

## ✅ Benefits

1. **Security**: Every new user must subscribe before accessing content
2. **Clear UX**: Sign-up is the primary action, login is secondary
3. **Seamless Flow**: Auto-login after registration → Subscribe → Access
4. **Prevents Free Access**: Login checks subscription and blocks access if none
5. **Clear Messaging**: Users know exactly what they need to do

---

## 🧪 Testing Checklist

- [ ] New user visits homepage → Redirected to login
- [ ] New user clicks "Create Account" → Goes to register page
- [ ] User registers → Auto-logged in → Redirected to subscribe page
- [ ] User completes subscription → Redirected to dashboard
- [ ] Existing user without subscription logs in → Prompted to subscribe
- [ ] Existing user with subscription logs in → Access granted
- [ ] User tries to access dashboard without subscription → Redirected to subscribe

