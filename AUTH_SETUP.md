# Authentication Setup

Better Auth has been integrated into your Students Dashboard application. Here's what was added:

## Features
- Email/password authentication
- Persistent sessions (7 days)
- Login protection for the dashboard
- Logout functionality
- Session management

## Default User

A default user has been created during the initial seed:

**Email:** `secret@gmail.com`  
**Password:** `123456789_password`

You can change this password by editing the seed file at `prisma/seed.ts` before running `npm run db:seed`.

## How to Use

### Login
1. Visit `/login` page
2. Enter your email and password
3. Click "Sign In"

### Logout
Click the "Logout" button in the top-right corner of the dashboard

## Files Added/Modified

### New Files
- `app/api/auth/[...all]/route.ts` - Better Auth API endpoints
- `app/login/page.tsx` - Login page component
- `contexts/session-context.tsx` - Session state management
- `lib/auth.ts` - Better Auth configuration
- `lib/auth-admin.ts` - Utilities for admin user management

### Modified Files
- `prisma/schema.prisma` - Added User and Session models
- `app/layout.tsx` - Added SessionProvider
- `app/page.tsx` - Added logout button and user info display
- `prisma/seed.ts` - Added default user creation

## Database Changes

Two new tables were created:
- `users` - Stores user account information
- `sessions` - Stores session data for logged-in users

## Environment Variables

Make sure your `.env` file has:
```
DATABASE_URL="your-postgres-database-url"
```

## To Change the Default User

1. Edit `prisma/seed.ts` and modify these lines:
```typescript
const defaultEmail = "admin@dashboard.com";
const defaultPassword = "admin123";
```

2. Run the seed again:
```bash
npm run db:seed
```

## API Endpoints

Better Auth provides these endpoints:
- `POST /api/auth/sign-in/email` - Sign in with email
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/change-password` - Change password (optional)
