# Collabi Mobile App

Collabi is an Expo React Native mobile application for student project collaboration. It helps students discover project ideas, build teams, coordinate project work, and communicate with teammates, while giving administrators moderation and platform oversight tools.

The current app is named `collabi` in `package.json` and `Collabi` in `app.json`.

## What the Application Does

Collabi is built around a university or school project workflow:

- Students can create accounts, verify email OTPs, sign in, reset passwords, and manage their account.
- Students can build public profiles with faculty, department, level, skills, interests, availability, preferred roles, portfolio links, and profile visibility.
- Students can browse and search other profiles for possible collaborators.
- Students can create, edit, save, browse, and manage projects.
- Project owners can define required skills, optional skills, categories, faculty, department, deadline, team size, visibility, tags, and attachments.
- Students can apply to join projects or invite other students to their own projects.
- Project teams can manage members, member roles, applications, invitations, and team exits.
- Team members can track project tasks through task boards, task details, priorities, due dates, comments, attachments, and progress.
- Students can use private and project chat for collaboration.
- Students receive notifications for messages, invitations, applications, team updates, tasks, mentions, announcements, and reports.
- Students can report users, projects, or messages.
- Admins can manage users, moderate projects, review reports, view analytics, inspect audit logs, configure settings, and send announcements.

## Current Tech Stack

- Expo 56
- React Native 0.85
- React 19
- React Navigation
- Redux Toolkit
- TanStack React Query
- NativeWind and Tailwind CSS
- React Hook Form and Yup
- Async Storage for local session storage
- Socket.IO client for realtime chat and notifications

## Current Backend Shape

The app currently talks to a dedicated hosted backend:

```ts
API_BASE_URL = 'https://collabi-backend.onrender.com/api';
SOCKET_BASE_URL = 'https://collabi-backend.onrender.com';
```

The mobile app expects REST endpoints for authentication, projects, profiles, collaboration, tasks, chat, notifications, reports, admin tools, uploads, and lookup data. Realtime chat and notification updates currently use Socket.IO.

The app also contains local mock/cache data in `src/data/mockDb.ts` and `src/data/cache.ts`. That mock data supports local state hydration and UI behavior, but the service layer is already written around backend API calls.

## Can Supabase Replace the Dedicated Backend?

Yes, it is possible to use Supabase instead of a dedicated backend for this app, but it would be a migration rather than a simple configuration change.

Supabase is a good fit for Collabi because the product is mostly data-driven: users, profiles, projects, memberships, applications, invitations, tasks, messages, notifications, reports, announcements, settings, and audit logs can all be represented cleanly in Postgres tables. Supabase also provides built-in authentication, row-level security, realtime subscriptions, and Edge Functions. Collabi uses Cloudinary for direct mobile uploads.

## What Supabase Can Handle Directly

Supabase can replace these backend responsibilities:

- Authentication: student sign-up, sign-in, password reset, email verification, session refresh, and logout.
- Database: profiles, projects, skills, faculties, departments, categories, applications, invitations, memberships, tasks, task comments, conversations, messages, notifications, reports, settings, announcements, and audit logs.
- Authorization: Row Level Security policies can enforce student/admin access, project ownership, team membership access, private profile visibility, and admin-only moderation.
- Realtime: Supabase Realtime can replace most Socket.IO usage for new messages, conversation updates, notifications, typing-style signals, and read state updates.
- File uploads: Cloudinary handles profile photos, project attachments, task attachments, and chat attachments through unsigned direct uploads.
- Admin queries: admin dashboards, analytics, user moderation, project moderation, report review, announcements, and settings can be built from secured tables, views, RPC functions, and Edge Functions.

## What May Still Need Server Logic

Some behavior should not live only in the mobile client. With Supabase, this logic would usually move into Postgres functions, triggers, or Supabase Edge Functions:

- Accepting an application and atomically creating a project membership.
- Enforcing max team size during application acceptance or invitation acceptance.
- Preventing duplicate active applications, invitations, memberships, saved projects, and conversations.
- Creating notifications when messages, applications, invitations, reports, or announcements are created.
- Maintaining audit logs for admin actions.
- Moderation workflows that change multiple records together.
- Secure admin analytics and aggregate metrics.
- Custom OTP behavior if the app must keep its current OTP flow exactly.
- Push notifications, if the app later sends device-level alerts through Expo push notifications.

## Recommended Supabase Data Model

A Supabase version would likely need tables similar to:

- `users` or `profiles`
- `faculties`
- `departments`
- `skills`
- `interests`
- `categories`
- `student_profiles`
- `projects`
- `project_required_skills`
- `project_optional_skills`
- `project_bookmarks`
- `project_attachments`
- `applications`
- `invitations`
- `memberships`
- `tasks`
- `task_assignees`
- `task_comments`
- `conversations`
- `conversation_participants`
- `messages`
- `message_attachments`
- `notifications`
- `reports`
- `settings`
- `announcements`
- `audit_logs`

The most important part would be designing Row Level Security policies correctly, because this app has different permissions for public users, signed-in students, project owners, team members, and admins.

## Migration Approach

A practical Supabase migration would look like this:

1. Create the Supabase schema for the core entities.
2. Enable RLS and write policies for students, project owners, team members, and admins.
3. Replace `src/api/http.ts` with a Supabase client module.
4. Rewrite the service files in `src/api/services/` to call Supabase tables, RPC functions, Storage, and Realtime subscriptions instead of REST endpoints.
5. Replace Socket.IO chat wiring in `chatService` with Supabase Realtime channels.
6. Move sensitive multi-step workflows into Postgres functions or Edge Functions.
7. Migrate file uploads to Cloudinary unsigned direct uploads.
8. Test student flows, project owner flows, admin flows, realtime chat, notifications, and moderation.

## Supabase vs Dedicated Backend

Supabase would reduce backend maintenance because authentication, database, storage, and realtime are managed in one platform. It is a strong option for an MVP, school deployment, or early production version of Collabi.

A dedicated backend is still useful if Collabi needs highly custom business logic, complex background jobs, advanced notification orchestration, custom audit/event pipelines, third-party integrations, or very specific API contracts. If those needs are limited, Supabase can realistically replace the dedicated backend.

## Local Development

Install dependencies:

```bash
npm install
```

Create an Expo environment file with the public Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Cloudinary uploads are signed by the `cloudinary-signature` Supabase Edge Function. Configure
its server-side secrets and deploy it:

```bash
supabase secrets set \
  CLOUDINARY_CLOUD_NAME=your_cloud_name \
  CLOUDINARY_API_KEY=your_api_key \
  CLOUDINARY_API_SECRET=your_rotated_api_secret \
  CLOUDINARY_FOLDER=collabi
supabase functions deploy cloudinary-signature --no-verify-jwt
```

Never put `CLOUDINARY_API_SECRET` in an Expo variable or commit it to Git.
The function performs its own session validation with `supabase.auth.getUser()`.

Apply the database schema, RLS policies, functions, realtime publication configuration, and
lookup seed data with:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Start the Expo development server:

```bash
npm run start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

Run lint and formatting checks:

```bash
npm run lint
```
