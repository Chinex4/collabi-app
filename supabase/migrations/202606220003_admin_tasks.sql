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

