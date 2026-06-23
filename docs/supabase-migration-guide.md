# Collabi Supabase Migration Guide

This guide is an implementation roadmap for moving the Collabi Expo React Native app from the dedicated REST/Socket.IO backend at `https://collabi-backend.onrender.com/api` to Supabase.

The current app uses:

- `src/api/http.ts` for REST calls.
- `src/api/services/*` for modular service operations.
- `src/api/mappers.ts` for backend-to-app type conversion.
- `src/data/mockDb.ts` and `src/data/cache.ts` for local cache/mock state.
- Socket.IO in `chatService.ts` for realtime chat and notifications.
- Async Storage for session persistence.
- Redux Toolkit and TanStack React Query for app state and server-state caching.

The migration goal is to preserve the current app flows while replacing the REST API, Socket.IO server, upload endpoints, and admin backend logic with Supabase Auth, Postgres, RLS, Realtime, Storage, RPC functions, and Edge Functions.

## Guiding Architecture

Use Supabase as the source of truth:

- Supabase Auth owns identity and sessions.
- `public.users` mirrors `auth.users` and stores role/status/display identity used by Collabi.
- Domain tables live in `public`.
- RLS is enabled on every app table and storage bucket.
- App services call Supabase directly for simple reads/writes.
- Postgres functions handle transactional workflows that must be atomic.
- Edge Functions handle workflows that need privileged access, custom validation, side effects, or future integrations.
- TanStack React Query remains the client cache layer.
- `src/api/mappers.ts` remains useful as a compatibility boundary while the database column names are normalized.

## Dependencies

Install Supabase client packages:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

Use environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Do not ship service-role or secret keys in the mobile app. Use Edge Functions or database functions for privileged actions.

## New Client Module Structure

Replace `src/api/http.ts` with Supabase-specific modules:

```text
src/api/
  supabase.ts
  errors.ts
  database.types.ts
  mappers.ts
  services/
    adminService.ts
    authService.ts
    chatService.ts
    collaborationService.ts
    lookupService.ts
    notificationService.ts
    profileService.ts
    projectService.ts
    reportService.ts
    taskService.ts
    uploadService.ts
```

Example `src/api/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

Example `src/api/errors.ts`:

```ts
import { PostgrestError } from '@supabase/supabase-js';

export class ApiError extends Error {
  status: number;
  errors?: unknown[];

  constructor(message: string, status = 500, errors?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export const throwIfSupabaseError = (error: PostgrestError | Error | null) => {
  if (!error) return;

  const status =
    'code' in error && typeof error.code === 'string' && error.code.startsWith('PGRST')
      ? 400
      : 500;

  throw new ApiError(error.message, status, 'details' in error ? [error.details] : undefined);
};

export const requireData = <T>(data: T | null, message = 'Record not found') => {
  if (data === null) {
    throw new ApiError(message, 404);
  }

  return data;
};
```

## Shared SQL Foundation

Run this foundation before phase-specific migrations.

```sql
create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin');
create type public.user_status as enum ('active', 'suspended', 'deleted');
create type public.project_status as enum ('open', 'in_progress', 'completed', 'cancelled', 'closed');
create type public.project_visibility as enum ('public', 'private', 'department_only');
create type public.availability_status as enum ('available', 'busy', 'unavailable');
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.membership_status as enum ('active', 'left', 'removed');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.report_status as enum ('pending', 'reviewed', 'resolved', 'dismissed');
create type public.report_target_type as enum ('user', 'project', 'message');
create type public.notification_type as enum (
  'application',
  'invitation',
  'team',
  'task',
  'message',
  'mention',
  'announcement',
  'report'
);
create type public.announcement_audience as enum ('all', 'students', 'admins');
create type public.conversation_type as enum ('private', 'project');
create type public.file_context as enum ('profile', 'project', 'task', 'chat', 'general');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  )
$$;

create or replace function public.is_active_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'student'
      and status = 'active'
  )
$$;

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and owner_id = auth.uid()
  )
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where memberships.project_id = p_project_id
      and memberships.student_id = auth.uid()
      and memberships.status = 'active'
  )
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    left join public.users u on u.id = auth.uid()
    where p.id = p_project_id
      and (
        p.visibility = 'public'
        or public.is_admin()
        or p.owner_id = auth.uid()
        or public.is_project_member(p.id)
        or (
          p.visibility = 'department_only'
          and u.department_id = p.department_id
          and u.status = 'active'
        )
      )
  )
$$;
```

## Phase 1: Authentication and Core Data Tables

### Phase 1 Schema

```sql
create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, name)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references public.faculties(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, name)
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  email text not null unique,
  faculty_id uuid references public.faculties(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  level text,
  avatar_url text,
  is_verified boolean not null default false,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_student_school_fields check (
    role = 'admin'
    or (faculty_id is not null and department_id is not null and level is not null)
  )
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text not null default '',
  availability public.availability_status not null default 'available',
  preferred_roles text[] not null default '{}',
  portfolio_links text[] not null default '{}',
  visibility public.project_visibility not null default 'public',
  photo_url text,
  completed_projects_count integer not null default 0 check (completed_projects_count >= 0),
  active_projects_count integer not null default 0 check (active_projects_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_profile_skills (
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (profile_id, skill_id)
);

create table public.student_profile_interests (
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  primary key (profile_id, interest_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) >= 10),
  category_id uuid not null references public.categories(id),
  faculty_id uuid not null references public.faculties(id),
  department_id uuid not null references public.departments(id),
  max_team_size integer not null check (max_team_size between 1 and 20),
  deadline date not null,
  visibility public.project_visibility not null default 'public',
  tags text[] not null default '{}',
  status public.project_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_required_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (project_id, skill_id)
);

create table public.project_optional_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (project_id, skill_id)
);

create table public.project_bookmarks (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  message text not null default '',
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null default '',
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  role_name text not null default 'Contributor',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, student_id)
);

create unique index applications_one_pending_per_student_project
  on public.applications(project_id, student_id)
  where status = 'pending';

create unique index invitations_one_pending_per_student_project
  on public.invitations(project_id, student_id)
  where status = 'pending';

create index users_role_status_idx on public.users(role, status);
create index users_faculty_department_idx on public.users(faculty_id, department_id);
create index projects_owner_idx on public.projects(owner_id);
create index projects_discovery_idx on public.projects(status, visibility, faculty_id, department_id, created_at desc);
create index applications_project_status_idx on public.applications(project_id, status);
create index applications_student_status_idx on public.applications(student_id, status);
create index invitations_student_status_idx on public.invitations(student_id, status);
create index invitations_sender_idx on public.invitations(sender_id);
create index memberships_project_status_idx on public.memberships(project_id, status);
create index memberships_student_status_idx on public.memberships(student_id, status);

create trigger faculties_set_updated_at before update on public.faculties
  for each row execute function public.set_updated_at();
create trigger departments_set_updated_at before update on public.departments
  for each row execute function public.set_updated_at();
create trigger skills_set_updated_at before update on public.skills
  for each row execute function public.set_updated_at();
create trigger interests_set_updated_at before update on public.interests
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger student_profiles_set_updated_at before update on public.student_profiles
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
```

Project owners should not be able to apply to their own projects. PostgreSQL check constraints cannot use subqueries, so implement that rule as a trigger:

```sql
create or replace function public.prevent_owner_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.projects
    where id = new.project_id
      and owner_id = new.student_id
  ) then
    raise exception 'Project owners cannot apply to their own projects';
  end if;

  return new;
end;
$$;

create trigger applications_prevent_owner
before insert or update on public.applications
for each row execute function public.prevent_owner_application();
```

### Phase 1 RLS

```sql
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.skills enable row level security;
alter table public.interests enable row level security;
alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_profile_skills enable row level security;
alter table public.student_profile_interests enable row level security;
alter table public.projects enable row level security;
alter table public.project_required_skills enable row level security;
alter table public.project_optional_skills enable row level security;
alter table public.project_bookmarks enable row level security;
alter table public.applications enable row level security;
alter table public.invitations enable row level security;
alter table public.memberships enable row level security;

create policy "lookup rows are public readable" on public.faculties for select using (true);
create policy "lookup rows are public readable" on public.departments for select using (true);
create policy "lookup rows are public readable" on public.skills for select using (true);
create policy "lookup rows are public readable" on public.interests for select using (true);
create policy "lookup rows are public readable" on public.categories for select using (true);

create policy "admins manage faculties" on public.faculties for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage departments" on public.departments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage skills" on public.skills for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage interests" on public.interests for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "users can view active users" on public.users
for select using (
  status = 'active'
  or id = auth.uid()
  or public.is_admin()
);

create policy "users can update own basic user row" on public.users
for update using (id = auth.uid() and status = 'active')
with check (id = auth.uid());

create or replace function public.prevent_non_admin_user_protected_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
    and (
      old.role is distinct from new.role
      or old.status is distinct from new.status
      or old.is_verified is distinct from new.is_verified
      or old.email is distinct from new.email
    )
  then
    raise exception 'Only admins can change protected user fields';
  end if;

  return new;
end;
$$;

create trigger users_prevent_non_admin_protected_field_change
before update of role, status, is_verified, email on public.users
for each row execute function public.prevent_non_admin_user_protected_field_change();

create policy "admins manage users" on public.users
for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles visible by visibility" on public.student_profiles
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'department_only'
    and exists (
      select 1
      from public.users viewer
      join public.users owner on owner.id = student_profiles.user_id
      where viewer.id = auth.uid()
        and viewer.department_id = owner.department_id
        and viewer.status = 'active'
        and owner.status = 'active'
    )
  )
);

create policy "students insert own profile" on public.student_profiles
for insert with check (user_id = auth.uid() and public.is_active_student());

create policy "students update own profile" on public.student_profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admins manage profiles" on public.student_profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "profile skill rows visible with profile" on public.student_profile_skills
for select using (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and (
        public.is_admin()
        or p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'department_only'
          and exists (
            select 1
            from public.users viewer
            join public.users owner on owner.id = p.user_id
            where viewer.id = auth.uid()
              and viewer.department_id = owner.department_id
              and viewer.status = 'active'
              and owner.status = 'active'
          )
        )
      )
  )
);

create policy "profile owners manage skills" on public.student_profile_skills
for all using (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
);

create policy "profile interest rows visible with profile" on public.student_profile_interests
for select using (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and (
        public.is_admin()
        or p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'department_only'
          and exists (
            select 1
            from public.users viewer
            join public.users owner on owner.id = p.user_id
            where viewer.id = auth.uid()
              and viewer.department_id = owner.department_id
              and viewer.status = 'active'
              and owner.status = 'active'
          )
        )
      )
  )
);

create policy "profile owners manage interests" on public.student_profile_interests
for all using (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.student_profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
);

create policy "projects visible by access rules" on public.projects
for select using (public.can_view_project(id));

create policy "students create own projects" on public.projects
for insert with check (owner_id = auth.uid() and public.is_active_student());

create policy "owners update own projects" on public.projects
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners delete own projects" on public.projects
for delete using (owner_id = auth.uid());

create policy "admins manage projects" on public.projects
for all using (public.is_admin()) with check (public.is_admin());

create policy "project skills visible when project visible" on public.project_required_skills
for select using (public.can_view_project(project_id));

create policy "owners manage required skills" on public.project_required_skills
for all using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));

create policy "project optional skills visible when project visible" on public.project_optional_skills
for select using (public.can_view_project(project_id));

create policy "owners manage optional skills" on public.project_optional_skills
for all using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));

create policy "users view own bookmarks" on public.project_bookmarks
for select using (user_id = auth.uid());

create policy "users manage own bookmarks" on public.project_bookmarks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "applications visible to applicant owner admin" on public.applications
for select using (
  student_id = auth.uid()
  or public.is_project_owner(project_id)
  or public.is_admin()
);

create policy "students apply to visible projects" on public.applications
for insert with check (
  student_id = auth.uid()
  and public.is_active_student()
  and public.can_view_project(project_id)
);

create policy "students withdraw own pending applications" on public.applications
for update using (student_id = auth.uid() and status = 'pending')
with check (student_id = auth.uid() and status in ('pending', 'withdrawn'));

create policy "owners update project applications" on public.applications
for update using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "invitations visible to target sender owner admin" on public.invitations
for select using (
  student_id = auth.uid()
  or sender_id = auth.uid()
  or public.is_project_owner(project_id)
  or public.is_admin()
);

create policy "owners invite students" on public.invitations
for insert with check (
  sender_id = auth.uid()
  and public.is_project_owner(project_id)
);

create policy "invited students update own invitation response" on public.invitations
for update using (student_id = auth.uid() and status = 'pending')
with check (student_id = auth.uid() and status in ('accepted', 'declined'));

create policy "owners cancel invitations" on public.invitations
for update using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "memberships visible to project participants" on public.memberships
for select using (
  student_id = auth.uid()
  or public.is_project_owner(project_id)
  or public.is_project_member(project_id)
  or public.is_admin()
);

create policy "owners manage memberships" on public.memberships
for all using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));

create policy "members can leave team" on public.memberships
for update using (student_id = auth.uid() and status = 'active')
with check (student_id = auth.uid() and status in ('active', 'left'));
```

### Phase 1 Auth Flow

Supabase Auth can replace the current login, refresh, logout, password reset, and email verification endpoints. The existing app-level session shape can be preserved by mapping Supabase sessions into the current `Session` type.

Example `authService.ts`:

```ts
import { cache } from '@/data/cache';
import { AuthResponse, Session } from '@/types';

import { ApiError, requireData, throwIfSupabaseError } from '../errors';
import { mapUser } from '../mappers';
import { supabase } from '../supabase';

const buildAuthResponse = async (): Promise<AuthResponse> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new ApiError(sessionError.message, 401);

  const authSession = requireData(sessionData.session, 'No active session');

  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authSession.user.id)
    .single();
  throwIfSupabaseError(error);

  const user = mapUser(requireData(userRow));
  cache.syncUsers([user]);

  return {
    session: {
      accessToken: authSession.access_token,
      refreshToken: authSession.refresh_token,
      role: user.role,
      userId: user.id,
    },
    user,
  };
};

export const authService = {
  async studentLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError(error.message, 401);
    return buildAuthResponse();
  },

  async adminLogin(email: string, password: string) {
    const result = await this.studentLogin(email, password);
    if (result.user.role !== 'admin') {
      await supabase.auth.signOut();
      throw new ApiError('Admin access required', 403);
    }
    return result;
  },

  async registerStudent(payload: {
    fullName: string;
    email: string;
    password: string;
    facultyId: string;
    departmentId: string;
    level: string;
  }) {
    const { error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          role: 'student',
          faculty_id: payload.facultyId,
          department_id: payload.departmentId,
          level: payload.level,
        },
      },
    });

    if (error) throw new ApiError(error.message, 422);
    return { email: payload.email, message: 'Check your email for verification instructions.' };
  },

  async verifyEmailOtp(email: string, otp: string) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) throw new ApiError(error.message, 422);
    return buildAuthResponse();
  },

  async resendVerificationOtp(email: string) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new ApiError(error.message, 422);
    return { message: 'Verification code sent.' };
  },

  async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new ApiError(error.message, 422);
    return { email, message: 'Password reset instructions sent.' };
  },

  async resetPassword(email: string, otp: string, password: string) {
    const verify = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (verify.error) throw new ApiError(verify.error.message, 422);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ApiError(error.message, 422);
    return { message: 'Password updated.' };
  },

  async refreshSession(session: Session) {
    const { error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (error) throw new ApiError(error.message, 401);
    return buildAuthResponse();
  },

  async getCurrentUser() {
    const response = await buildAuthResponse();
    return response.user;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new ApiError(error.message, 500);
    return { success: true };
  },
};
```

Create user/profile rows from Auth with a trigger:

```sql
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    role,
    full_name,
    email,
    faculty_id,
    department_id,
    level,
    is_verified,
    status
  )
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'faculty_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
    new.raw_user_meta_data->>'level',
    new.email_confirmed_at is not null,
    'active'
  );

  if coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then
    insert into public.student_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set is_verified = new.email_confirmed_at is not null,
      email = new.email,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_auth_user_verified();
```

### Phase 1 Service Examples

`profileService.ts`:

```ts
import { cache } from '@/data/cache';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapProfile, mapUser } from '../mappers';
import { supabase } from '../supabase';

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*),
        skills:student_profile_skills(skill:skills(*)),
        interests:student_profile_interests(interest:interests(*))
      `)
      .eq('user_id', userId)
      .single();

    throwIfSupabaseError(error);
    const profile = mapProfile(requireData(data));
    cache.syncProfiles([profile]);
    if (data?.user) cache.syncUsers([mapUser(data.user)]);
    return profile;
  },

  async searchProfiles(search = '') {
    const query = supabase
      .from('student_profiles')
      .select(`
        *,
        user:users(*),
        skills:student_profile_skills(skill:skills(*)),
        interests:student_profile_interests(interest:interests(*))
      `)
      .order('updated_at', { ascending: false })
      .limit(50);

    const { data, error } = search
      ? await query.textSearch('bio', search, { type: 'websearch' })
      : await query;

    throwIfSupabaseError(error);
    const profiles = (data ?? []).map(mapProfile);
    cache.replaceProfiles(profiles);
    return profiles;
  },

  async updateProfile(userId: string, payload: {
    bio: string;
    availability: string;
    preferredRoles: string[];
    portfolioLinks: string[];
    visibility: string;
    skillIds: string[];
    interestIds: string[];
  }) {
    const { data, error } = await supabase.rpc('update_student_profile', {
      p_user_id: userId,
      p_bio: payload.bio,
      p_availability: payload.availability,
      p_preferred_roles: payload.preferredRoles,
      p_portfolio_links: payload.portfolioLinks,
      p_visibility: payload.visibility,
      p_skill_ids: payload.skillIds,
      p_interest_ids: payload.interestIds,
    });

    throwIfSupabaseError(error);
    return this.getProfile(data as string);
  },
};
```

`projectService.ts`:

```ts
import { cache } from '@/data/cache';
import { PaginatedResult, Project, ProjectFilterInput, ProjectStatus } from '@/types';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapProject } from '../mappers';
import { supabase } from '../supabase';

const projectSelect = `
  *,
  owner:users(*),
  category:categories(*),
  faculty:faculties(*),
  department:departments(*),
  required_skills:project_required_skills(skill:skills(*)),
  optional_skills:project_optional_skills(skill:skills(*)),
  bookmarks:project_bookmarks(user_id),
  memberships(*)
`;

export const projectService = {
  async getProjects(filters: ProjectFilterInput = {}, currentUserId?: string): Promise<PaginatedResult<Project>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('projects')
      .select(projectSelect, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (filters.search) query = query.ilike('title', `%${filters.search}%`);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.departmentId) query = query.eq('department_id', filters.departmentId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.visibility) query = query.eq('visibility', filters.visibility);

    const { data, error, count } = await query;
    throwIfSupabaseError(error);

    const items = (data ?? []).map((row) => mapProject(row, currentUserId));
    cache.syncProjects(items);
    return { items, total: count ?? items.length, page, pageSize };
  },

  async getProjectById(projectId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .eq('id', projectId)
      .single();

    throwIfSupabaseError(error);
    const project = mapProject(requireData(data));
    cache.syncProjects([project]);
    return project;
  },

  async createProject(_ownerId: string, payload: any) {
    const { data, error } = await supabase.rpc('create_project_with_skills', {
      p_title: payload.title,
      p_description: payload.description,
      p_category_id: payload.categoryId,
      p_department_id: payload.departmentId,
      p_faculty_id: payload.facultyId,
      p_required_skill_ids: payload.requiredSkillIds,
      p_optional_skill_ids: payload.optionalSkillIds,
      p_max_team_size: payload.teamSizeLimit,
      p_deadline: payload.deadline,
      p_visibility: payload.visibility,
      p_tags: payload.tags,
    });

    throwIfSupabaseError(error);
    return this.getProjectById(data as string);
  },

  async changeProjectStatus(projectId: string, status: ProjectStatus) {
    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId);
    throwIfSupabaseError(error);
    return this.getProjectById(projectId);
  },

  async toggleBookmark(projectId: string, userId: string) {
    const { data: existing, error: readError } = await supabase
      .from('project_bookmarks')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    throwIfSupabaseError(readError);

    if (existing) {
      const { error } = await supabase
        .from('project_bookmarks')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      throwIfSupabaseError(error);
    } else {
      const { error } = await supabase
        .from('project_bookmarks')
        .insert({ project_id: projectId, user_id: userId });
      throwIfSupabaseError(error);
    }

    return this.getProjectById(projectId);
  },
};
```

### Phase 1 RPC Functions

```sql
create or replace function public.create_project_with_skills(
  p_title text,
  p_description text,
  p_category_id uuid,
  p_department_id uuid,
  p_faculty_id uuid,
  p_required_skill_ids uuid[],
  p_optional_skill_ids uuid[],
  p_max_team_size integer,
  p_deadline date,
  p_visibility public.project_visibility,
  p_tags text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  insert into public.projects (
    owner_id,
    title,
    description,
    category_id,
    department_id,
    faculty_id,
    max_team_size,
    deadline,
    visibility,
    tags
  )
  values (
    auth.uid(),
    p_title,
    p_description,
    p_category_id,
    p_department_id,
    p_faculty_id,
    p_max_team_size,
    p_deadline,
    p_visibility,
    coalesce(p_tags, '{}')
  )
  returning id into v_project_id;

  insert into public.memberships (project_id, student_id, role_name)
  values (v_project_id, auth.uid(), 'Owner');

  insert into public.project_required_skills (project_id, skill_id)
  select v_project_id, unnest(coalesce(p_required_skill_ids, '{}'));

  insert into public.project_optional_skills (project_id, skill_id)
  select v_project_id, unnest(coalesce(p_optional_skill_ids, '{}'));

  return v_project_id;
end;
$$;
```

### Phase 1 Migration Checklist

- Create Supabase project and configure email templates.
- Add environment variables to Expo config.
- Apply shared foundation and Phase 1 migrations in a staging Supabase project.
- Generate `database.types.ts` with Supabase CLI.
- Seed lookup tables from existing backend or `mockDb.ts`.
- Export current users, profiles, projects, skills, applications, invitations, memberships, and bookmarks.
- Map existing backend IDs to Supabase UUIDs. If current IDs are not UUIDs, create `legacy_id` columns during migration, then keep them only until cutover verification is complete.
- Run RLS tests for anonymous, student, project owner, project member, and admin sessions.
- Refactor `authService.ts`, `profileService.ts`, `lookupService.ts`, `projectService.ts`, and `collaborationService.ts`.
- Keep old REST services behind a feature flag until Phase 1 passes on staging.
- Verify login, signup, OTP, profile edit, project discovery, project create/edit, bookmarks, applications, invitations, and team member views.
- Rollback plan: switch the feature flag back to REST services and leave Supabase writes disabled until data is reconciled.

## Phase 2: Realtime Chat and Notifications

### Phase 2 Schema

```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default '',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_conversation_has_project check (
    (type = 'project' and project_id is not null)
    or (type = 'private' and project_id is null)
  )
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_read_at timestamptz,
  typing_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  read_by uuid[] not null default '{}',
  constraint message_body_or_deleted check (body <> '' or deleted_at is not null)
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  bucket_id text not null default 'chat-attachments',
  object_path text not null,
  name text not null,
  mime_type text not null,
  size_kb integer not null check (size_kb >= 0),
  uploaded_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index conversations_one_project_conversation
  on public.conversations(project_id)
  where type = 'project';

create index conversation_participants_user_idx on public.conversation_participants(user_id, conversation_id);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index messages_sender_idx on public.messages(sender_id);
create index notifications_user_unread_idx on public.notifications(user_id, is_read, created_at desc);

create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
```

### Phase 2 RLS

```sql
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_conversation_participant(conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_participants.conversation_id = is_conversation_participant.conversation_id
      and user_id = auth.uid()
  )
$$;

create policy "participants view conversations" on public.conversations
for select using (
  public.is_conversation_participant(id)
  or public.is_admin()
);

create policy "students create conversations" on public.conversations
for insert with check (
  created_by = auth.uid()
  and public.is_active_student()
);

create policy "project owners and admins update conversations" on public.conversations
for update using (
  public.is_admin()
  or (project_id is not null and public.is_project_owner(project_id))
);

create policy "participants view participant rows" on public.conversation_participants
for select using (
  user_id = auth.uid()
  or public.is_conversation_participant(conversation_id)
  or public.is_admin()
);

create policy "participants update own read and typing state" on public.conversation_participants
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "participants view messages" on public.messages
for select using (
  public.is_conversation_participant(conversation_id)
  or public.is_admin()
);

create policy "participants send messages" on public.messages
for insert with check (
  sender_id = auth.uid()
  and public.is_conversation_participant(conversation_id)
);

create policy "senders edit own messages" on public.messages
for update using (
  sender_id = auth.uid()
  and deleted_at is null
) with check (sender_id = auth.uid());

create policy "participants view message attachments" on public.message_attachments
for select using (
  exists (
    select 1 from public.messages m
    where m.id = message_id
      and public.is_conversation_participant(m.conversation_id)
  )
  or public.is_admin()
);

create policy "senders add message attachments" on public.message_attachments
for insert with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
);

create policy "users view own notifications" on public.notifications
for select using (user_id = auth.uid() or public.is_admin());

create policy "users update own notification read state" on public.notifications
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "admins manage notifications" on public.notifications
for all using (public.is_admin()) with check (public.is_admin());
```

### Phase 2 Functions and Triggers

```sql
create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, entity_type, entity_id)
  values (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.after_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  update public.conversation_participants
  set unread_count = unread_count + 1
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id;

  insert into public.notifications (user_id, type, title, body, entity_type, entity_id)
  select cp.user_id, 'message', 'New message', left(new.body, 140), 'message', new.id
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id;

  return new;
end;
$$;

create trigger messages_after_insert
after insert on public.messages
for each row execute function public.after_message_insert();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversation_participants
  set unread_count = 0,
      last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid();

  update public.messages
  set read_by = array(
    select distinct unnest(read_by || auth.uid())
  )
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid();
end;
$$;
```

### Phase 2 Realtime Service Examples

`chatService.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

import { QUERY_KEYS } from '@/constants';
import { cache } from '@/data/cache';
import { Message } from '@/types';

import { throwIfSupabaseError } from '../errors';
import { mapConversation, mapMessage } from '../mappers';
import { supabase } from '../supabase';

let channels: RealtimeChannel[] = [];
let client: QueryClient | null = null;

const removeChannels = () => {
  channels.forEach((channel) => supabase.removeChannel(channel));
  channels = [];
};

export const chatService = {
  connect(_accessToken: string, queryClient: QueryClient) {
    client = queryClient;
    return supabase.channel('collabi-chat-presence');
  },

  disconnect() {
    removeChannels();
    client = null;
  },

  subscribeToConversation(conversationId: string) {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = mapMessage(payload.new);
          cache.syncMessages([message]);
          client?.setQueryData(
            [...QUERY_KEYS.messages, conversationId],
            (current: Message[] = []) => [...current.filter((item) => item.id !== message.id), message]
          );
          client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => client?.invalidateQueries({ queryKey: QUERY_KEYS.conversations })
      )
      .subscribe();

    channels.push(channel);
    return channel;
  },

  async getInbox() {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(*, user:users(*)),
        messages(*)
      `)
      .order('updated_at', { ascending: false })
      .limit(50);

    throwIfSupabaseError(error);
    const conversations = (data ?? []).map(mapConversation);
    cache.replaceConversations(conversations);
    return conversations;
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users(*), attachments:message_attachments(*)')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    throwIfSupabaseError(error);
    const messages = (data ?? []).map(mapMessage);
    cache.replaceMessages(messages);
    return messages;
  },

  async sendMessage(conversationId: string, senderId: string, body: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body })
      .select('*, sender:users(*), attachments:message_attachments(*)')
      .single();

    throwIfSupabaseError(error);
    return mapMessage(data);
  },

  async markRead(conversationId: string) {
    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });
    throwIfSupabaseError(error);
  },

  async setTyping(conversationId: string, isTyping: boolean) {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ typing_until: isTyping ? new Date(Date.now() + 5000).toISOString() : null })
      .eq('conversation_id', conversationId);
    throwIfSupabaseError(error);
  },
};
```

`notificationService.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

import { QUERY_KEYS } from '@/constants';
import { cache } from '@/data/cache';

import { throwIfSupabaseError } from '../errors';
import { mapNotification } from '../mappers';
import { supabase } from '../supabase';

let channel: RealtimeChannel | null = null;

export const notificationService = {
  subscribe(userId: string, queryClient: QueryClient) {
    if (channel) supabase.removeChannel(channel);

    channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          cache.syncNotifications([mapNotification(payload.new)]);
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe() {
    if (channel) supabase.removeChannel(channel);
    channel = null;
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    throwIfSupabaseError(error);
    const notifications = (data ?? []).map(mapNotification);
    cache.replaceNotifications(notifications);
    return notifications;
  },

  async markRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    throwIfSupabaseError(error);
  },
};
```

### Phase 2 Migration Checklist

- Enable Realtime publication for `messages`, `conversation_participants`, and `notifications`.
- Migrate existing conversations, participants, messages, and read state.
- Backfill project conversations for projects that have team chat.
- Replace Socket.IO connection lifecycle with Supabase channel lifecycle.
- Subscribe only to the active conversation and current user's notifications.
- Use paginated queries for message history.
- Verify private chat, project chat, read receipts, unread counts, typing indicators, notification inserts, and disconnect cleanup.
- Rollback plan: keep Socket.IO backend active until Phase 2 passes staging and production shadow testing.

## Phase 3: Admin Tools and File Uploads

### Phase 3 Schema

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date date not null,
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.memberships(id) on delete cascade,
  primary key (task_id, member_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bucket_id text not null default 'project-attachments',
  object_path text not null,
  name text not null,
  mime_type text not null,
  size_kb integer not null check (size_kb >= 0),
  uploaded_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  bucket_id text not null default 'task-attachments',
  object_path text not null,
  name text not null,
  mime_type text not null,
  size_kb integer not null check (size_kb >= 0),
  uploaded_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  description text,
  status public.report_status not null default 'pending',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  value text not null,
  description text not null default '',
  category text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience public.announcement_audience not null default 'all',
  created_by uuid not null references public.users(id) on delete cascade,
  is_sent boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tasks_project_status_idx on public.tasks(project_id, status, due_date);
create index task_comments_task_idx on public.task_comments(task_id, created_at);
create index reports_status_created_idx on public.reports(status, created_at desc);
create index reports_target_idx on public.reports(target_type, target_id);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger task_comments_set_updated_at before update on public.task_comments
  for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
```

### Phase 3 RLS

```sql
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.project_attachments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

create policy "project members view tasks" on public.tasks
for select using (public.is_project_member(project_id) or public.is_project_owner(project_id) or public.is_admin());

create policy "project members create tasks" on public.tasks
for insert with check (
  created_by = auth.uid()
  and (public.is_project_member(project_id) or public.is_project_owner(project_id))
);

create policy "task creators owners admins update tasks" on public.tasks
for update using (
  created_by = auth.uid()
  or public.is_project_owner(project_id)
  or public.is_admin()
) with check (
  created_by = auth.uid()
  or public.is_project_owner(project_id)
  or public.is_admin()
);

create policy "task assignees visible to task viewers" on public.task_assignees
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (public.is_project_member(t.project_id) or public.is_project_owner(t.project_id) or public.is_admin())
  )
);

create policy "task creators manage assignees" on public.task_assignees
for all using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.created_by = auth.uid() or public.is_project_owner(t.project_id) or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (t.created_by = auth.uid() or public.is_project_owner(t.project_id) or public.is_admin())
  )
);

create policy "project members view task comments" on public.task_comments
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (public.is_project_member(t.project_id) or public.is_project_owner(t.project_id) or public.is_admin())
  )
);

create policy "project members create task comments" on public.task_comments
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (public.is_project_member(t.project_id) or public.is_project_owner(t.project_id))
  )
);

create policy "authors update own task comments" on public.task_comments
for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "project attachments visible by project visibility" on public.project_attachments
for select using (public.can_view_project(project_id));

create policy "project members upload project attachments" on public.project_attachments
for insert with check (
  uploaded_by = auth.uid()
  and (public.is_project_owner(project_id) or public.is_project_member(project_id))
);

create policy "task attachments visible to task viewers" on public.task_attachments
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (public.is_project_member(t.project_id) or public.is_project_owner(t.project_id) or public.is_admin())
  )
);

create policy "task viewers upload task attachments" on public.task_attachments
for insert with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and (public.is_project_member(t.project_id) or public.is_project_owner(t.project_id))
  )
);

create policy "users create reports" on public.reports
for insert with check (reporter_id = auth.uid() and public.is_active_student());

create policy "users view own reports" on public.reports
for select using (reporter_id = auth.uid() or public.is_admin());

create policy "admins manage reports" on public.reports
for all using (public.is_admin()) with check (public.is_admin());

create policy "settings readable to authenticated users" on public.settings
for select using (auth.uid() is not null);

create policy "admins manage settings" on public.settings
for all using (public.is_admin()) with check (public.is_admin());

create policy "announcements readable by audience" on public.announcements
for select using (
  is_sent
  and (
    audience = 'all'
    or (audience = 'students' and public.current_user_role() = 'student')
    or (audience = 'admins' and public.current_user_role() = 'admin')
  )
);

create policy "admins manage announcements" on public.announcements
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins view audit logs" on public.audit_logs
for select using (public.is_admin());
```

### Supabase Storage

Create buckets:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-attachments', 'project-attachments', false, 20971520, null),
  ('task-attachments', 'task-attachments', false, 20971520, null),
  ('chat-attachments', 'chat-attachments', false, 20971520, null)
on conflict (id) do nothing;
```

Storage policies:

```sql
create policy "users upload own profile photos"
on storage.objects for insert
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "profile photos are readable"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "users update own profile photos"
on storage.objects for update
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "project attachment readers"
on storage.objects for select
using (
  bucket_id = 'project-attachments'
  and public.can_view_project(((storage.foldername(name))[1])::uuid)
);

create policy "project attachment writers"
on storage.objects for insert
with check (
  bucket_id = 'project-attachments'
  and (
    public.is_project_owner(((storage.foldername(name))[1])::uuid)
    or public.is_project_member(((storage.foldername(name))[1])::uuid)
  )
);

create policy "task attachment readers"
on storage.objects for select
using (
  bucket_id = 'task-attachments'
  and exists (
    select 1
    from public.tasks t
    where t.id = ((storage.foldername(name))[1])::uuid
      and (public.is_project_owner(t.project_id) or public.is_project_member(t.project_id) or public.is_admin())
  )
);

create policy "task attachment writers"
on storage.objects for insert
with check (
  bucket_id = 'task-attachments'
  and exists (
    select 1
    from public.tasks t
    where t.id = ((storage.foldername(name))[1])::uuid
      and (public.is_project_owner(t.project_id) or public.is_project_member(t.project_id))
  )
);

create policy "chat attachment readers"
on storage.objects for select
using (
  bucket_id = 'chat-attachments'
  and exists (
    select 1
    from public.messages m
    join public.message_attachments ma on ma.message_id = m.id
    where ma.object_path = storage.objects.name
      and public.is_conversation_participant(m.conversation_id)
  )
);

create policy "chat attachment writers"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
);
```

Recommended object paths:

```text
profile-photos/{userId}/avatar-{timestamp}.jpg
project-attachments/{projectId}/{uuid}-{fileName}
task-attachments/{taskId}/{uuid}-{fileName}
chat-attachments/{conversationId}/{messageId}/{uuid}-{fileName}
```

### Phase 3 Service Examples

`uploadService.ts`:

```ts
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { ApiError, throwIfSupabaseError } from '../errors';
import { supabase } from '../supabase';

const uploadBlob = async (bucket: string, path: string, uri: string, mimeType: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: false });

  throwIfSupabaseError(error);
  return data.path;
};

const makeObjectId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const uploadService = {
  async uploadProfilePhoto(userId: string) {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (picked.canceled) throw new ApiError('Upload cancelled', 400);

    const asset = picked.assets[0];
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    const objectPath = await uploadBlob('profile-photos', path, asset.uri, asset.mimeType ?? 'image/jpeg');

    const { data } = supabase.storage.from('profile-photos').getPublicUrl(objectPath);
    return data.publicUrl;
  },

  async pickDocument(ownerId: string, context: 'project' | 'task' | 'chat') {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled) throw new ApiError('Upload cancelled', 400);

    const file = picked.assets[0];
    const bucket =
      context === 'project'
        ? 'project-attachments'
        : context === 'task'
          ? 'task-attachments'
          : 'chat-attachments';

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `${ownerId}/${makeObjectId()}-${safeName}`;

    await uploadBlob(bucket, objectPath, file.uri, file.mimeType ?? 'application/octet-stream');

    return {
      name: file.name,
      url: objectPath,
      type: file.mimeType ?? 'application/octet-stream',
      sizeKb: Math.ceil((file.size ?? 0) / 1024),
    };
  },
};
```

`taskService.ts`:

```ts
import { cache } from '@/data/cache';

import { throwIfSupabaseError } from '../errors';
import { mapTask } from '../mappers';
import { supabase } from '../supabase';

const taskSelect = '*, assignees:task_assignees(*, member:memberships(*)), comments:task_comments(*), attachments:task_attachments(*)';

export const taskService = {
  async getProjectTasks(projectId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(taskSelect)
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });
    throwIfSupabaseError(error);

    const tasks = (data ?? []).map(mapTask);
    cache.replaceTasks(tasks);
    return tasks;
  },

  async createTask(projectId: string, createdBy: string, payload: any) {
    const { data, error } = await supabase.rpc('create_task_with_assignees', {
      p_project_id: projectId,
      p_created_by: createdBy,
      p_title: payload.title,
      p_description: payload.description,
      p_priority: payload.priority,
      p_due_date: payload.dueDate,
      p_assigned_member_ids: payload.assignedMemberIds,
    });
    throwIfSupabaseError(error);
    return this.getTask(data as string);
  },

  async getTask(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(taskSelect)
      .eq('id', taskId)
      .single();
    throwIfSupabaseError(error);
    return mapTask(data);
  },
};
```

`reportService.ts`:

```ts
import { throwIfSupabaseError } from '../errors';
import { mapReport } from '../mappers';
import { supabase } from '../supabase';

export const reportService = {
  async createReport(payload: {
    reporterId: string;
    targetType: 'user' | 'project' | 'message';
    targetId: string;
    reason: string;
    description?: string;
  }) {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: payload.reporterId,
        target_type: payload.targetType,
        target_id: payload.targetId,
        reason: payload.reason,
        description: payload.description,
      })
      .select('*')
      .single();

    throwIfSupabaseError(error);
    return mapReport(data);
  },
};
```

`adminService.ts`:

```ts
import { throwIfSupabaseError } from '../errors';
import { mapProject, mapReport, mapUser } from '../mappers';
import { supabase } from '../supabase';

export const adminService = {
  async getDashboard() {
    const { data, error } = await supabase.rpc('admin_dashboard_metrics');
    throwIfSupabaseError(error);
    return data;
  },

  async getUsers(search = '') {
    let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
    if (search) query = query.ilike('full_name', `%${search}%`);

    const { data, error } = await query;
    throwIfSupabaseError(error);
    return (data ?? []).map(mapUser);
  },

  async changeUserStatus(userId: string, status: 'active' | 'suspended' | 'deleted') {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select('*')
      .single();
    throwIfSupabaseError(error);
    return mapUser(data);
  },

  async getProjects(search = '') {
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(100);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    throwIfSupabaseError(error);
    return (data ?? []).map(mapProject);
  },

  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    throwIfSupabaseError(error);
    return (data ?? []).map(mapReport);
  },
};
```

### Phase 3 Edge Function Template

Use Edge Functions for multi-step workflows that require privileged checks or future external side effects. The service role key must stay on the server.

Example `supabase/functions/accept-application/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Body = {
  applicationId: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ message: 'Method not allowed' }, { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ message: 'Missing authorization header' }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const body = (await req.json()) as Body;
  if (!body.applicationId) {
    return Response.json({ message: 'applicationId is required' }, { status: 422 });
  }

  const { data, error } = await admin.rpc('accept_application', {
    p_application_id: body.applicationId,
  });

  if (error) {
    return Response.json({ message: error.message }, { status: 422 });
  }

  return Response.json({ data });
});
```

Back it with a Postgres function:

```sql
create or replace function public.accept_application(p_application_id uuid)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications;
  v_project public.projects;
  v_active_members integer;
  v_membership public.memberships;
begin
  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  select * into v_project
  from public.projects
  where id = v_application.project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if v_project.owner_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the project owner can accept applications';
  end if;

  if v_application.status <> 'pending' then
    raise exception 'Application is no longer pending';
  end if;

  select count(*) into v_active_members
  from public.memberships
  where project_id = v_project.id
    and status = 'active';

  if v_active_members >= v_project.max_team_size then
    raise exception 'Team size limit reached';
  end if;

  insert into public.memberships (project_id, student_id, role_name, status)
  values (v_project.id, v_application.student_id, 'Contributor', 'active')
  on conflict (project_id, student_id)
  do update set status = 'active', updated_at = now()
  returning * into v_membership;

  update public.applications
  set status = 'accepted'
  where id = p_application_id;

  update public.applications
  set status = 'rejected'
  where project_id = v_project.id
    and student_id = v_application.student_id
    and status = 'pending'
    and id <> p_application_id;

  perform public.create_notification(
    v_application.student_id,
    'application',
    'Application accepted',
    'You have been added to the project team.',
    'project',
    v_project.id
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'application.accepted',
    'application',
    p_application_id,
    jsonb_build_object('project_id', v_project.id, 'student_id', v_application.student_id)
  );

  return v_membership;
end;
$$;
```

### Phase 3 Migration Checklist

- Apply Phase 3 schema and RLS.
- Create storage buckets and policies.
- Migrate task data, comments, attachments, reports, settings, announcements, and audit logs.
- Replace upload endpoints with Supabase Storage.
- Replace admin REST endpoints with table queries, RPC calls, and Edge Functions.
- Verify admin dashboards against old backend counts.
- Verify file upload/download permissions for owner, member, unrelated student, anonymous user, and admin.
- Load test chat and notification subscriptions with realistic class/project sizes.
- Cut over production behind a feature flag.
- Keep old backend read-only for a defined rollback window.
- Rollback plan: freeze Supabase writes, switch mobile config back to REST, replay Supabase delta writes into old backend if production traffic used the Supabase path.

## Testing Strategy

### Database and RLS Tests

Use SQL fixtures for:

- Anonymous user.
- Active student.
- Suspended student.
- Project owner.
- Project member.
- Unrelated student in same department.
- Unrelated student in different department.
- Admin.

Validate:

- Anonymous users can read only public lookup/project/profile data intended for public discovery.
- Students cannot read private profiles or private projects they do not own or belong to.
- Students cannot mutate other users, projects, memberships, tasks, messages, reports, settings, announcements, or audit logs.
- Project owners can manage only their own projects and team workflows.
- Team members can access project tasks and project chat but cannot perform owner-only moderation.
- Admins can access moderation and platform management data.

### Mobile Integration Tests

For each phase:

- Start from a clean install with no Async Storage session.
- Verify session restore.
- Verify React Query cache invalidation after mutations.
- Verify offline/error states use existing UI patterns.
- Verify service method return shapes match existing app types.
- Verify `src/api/mappers.ts` covers Supabase nested response shapes.

### Realtime Tests

- Subscribe only to current user's notification channel and active chat channels.
- Confirm channel cleanup on logout and screen unmount.
- Confirm no duplicate message insertion after reconnect.
- Confirm unread counters and read state update without polling.
- Confirm RLS blocks subscribing to another user's private data.

## Backwards Compatibility Strategy

Introduce a backend mode flag:

```ts
export const BACKEND_MODE =
  process.env.EXPO_PUBLIC_BACKEND_MODE === 'supabase' ? 'supabase' : 'rest';
```

During migration, either:

- Keep parallel service implementations such as `projectService.rest.ts` and `projectService.supabase.ts`, then export based on `BACKEND_MODE`.
- Or keep a service adapter layer and gradually move method bodies.

Recommended order:

1. Move lookup reads first.
2. Move auth and current-user reads.
3. Move profiles and project discovery.
4. Move project mutations and collaboration workflows.
5. Move chat and notifications.
6. Move uploads.
7. Move admin tools.

Avoid dual writes from the mobile client. If dual writes are required, do them from server-side migration code or Edge Functions to avoid client-side partial failures.

## Performance and Scalability Notes

- Index every RLS join path used in policies.
- Prefer RPC functions for writes that touch multiple tables.
- Use `limit` and pagination on feed, chat, admin, and report queries.
- Subscribe to narrow Realtime filters, not entire tables.
- Keep project chat subscriptions scoped to the active project.
- Avoid querying attachments as large nested payloads in list screens.
- Use materialized views or RPC aggregates for admin analytics if raw aggregate queries become slow.
- Add `EXPLAIN ANALYZE` checks for project discovery, admin reports, and chat history.

## Deployment Runbook

1. Create staging Supabase project.
2. Apply Phase 1 migration.
3. Import staging data.
4. Generate database TypeScript types.
5. Refactor Phase 1 services behind `BACKEND_MODE`.
6. Run mobile regression tests.
7. Repeat for Phase 2 and Phase 3.
8. Create production Supabase project.
9. Freeze writes on old backend during final data export.
10. Import data into Supabase.
11. Run data reconciliation counts and sampled record comparisons.
12. Enable Supabase mode for internal builds.
13. Enable Supabase mode for production build.
14. Monitor auth errors, RLS denials, Realtime channel counts, slow queries, storage errors, and Edge Function failures.
15. Keep old backend in read-only rollback mode until confidence window closes.

## Official References

- Supabase Expo React Native setup: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Supabase React Native Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime Postgres changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Edge Functions: https://supabase.com/docs/guides/functions/quickstart
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
