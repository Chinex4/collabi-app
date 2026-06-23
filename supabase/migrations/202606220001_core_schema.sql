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

