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


-- Make application realtime subscriptions receive these tables.
do $$
begin
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.conversation_participants;
exception
  when duplicate_object then null;
end
$$;

