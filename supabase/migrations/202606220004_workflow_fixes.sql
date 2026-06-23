-- Atomic profile editing used by profileService.updateProfile.
create or replace function public.update_student_profile(
  p_bio text default null,
  p_availability public.availability_status default null,
  p_skill_ids uuid[] default null,
  p_interest_ids uuid[] default null,
  p_preferred_roles text[] default null,
  p_portfolio_links text[] default null,
  p_visibility public.project_visibility default null,
  p_photo_url text default null
)
returns public.student_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile public.student_profiles;
begin
  update public.student_profiles
  set bio = coalesce(p_bio, bio),
      availability = coalesce(p_availability, availability),
      preferred_roles = coalesce(p_preferred_roles, preferred_roles),
      portfolio_links = coalesce(p_portfolio_links, portfolio_links),
      visibility = coalesce(p_visibility, visibility),
      photo_url = coalesce(p_photo_url, photo_url)
  where user_id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'Student profile not found';
  end if;

  if p_skill_ids is not null then
    delete from public.student_profile_skills where profile_id = v_profile.id;
    insert into public.student_profile_skills (profile_id, skill_id)
    select v_profile.id, unnest(p_skill_ids);
  end if;

  if p_interest_ids is not null then
    delete from public.student_profile_interests where profile_id = v_profile.id;
    insert into public.student_profile_interests (profile_id, interest_id)
    select v_profile.id, unnest(p_interest_ids);
  end if;

  return v_profile;
end;
$$;

-- Invitation acceptance creates membership atomically and enforces capacity.
create or replace function public.accept_invitation(p_invitation_id uuid)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations;
  v_project public.projects;
  v_active_members integer;
  v_membership public.memberships;
begin
  select * into v_invitation
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then raise exception 'Invitation not found'; end if;
  if v_invitation.student_id <> auth.uid() then raise exception 'Invitation does not belong to this user'; end if;
  if v_invitation.status <> 'pending' then raise exception 'Invitation is no longer pending'; end if;

  select * into v_project from public.projects where id = v_invitation.project_id for update;
  select count(*) into v_active_members from public.memberships
    where project_id = v_project.id and status = 'active';
  if v_active_members >= v_project.max_team_size then raise exception 'Team size limit reached'; end if;

  insert into public.memberships (project_id, student_id, role_name, status)
  values (v_project.id, auth.uid(), 'Contributor', 'active')
  on conflict (project_id, student_id)
  do update set status = 'active', updated_at = now()
  returning * into v_membership;

  update public.invitations set status = 'accepted' where id = p_invitation_id;
  return v_membership;
end;
$$;

create policy "conversation creators add participants" on public.conversation_participants
for insert with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.created_by = auth.uid()
  )
);

create policy "users delete own notifications" on public.notifications
for delete using (user_id = auth.uid());

create policy "task creators owners admins delete tasks" on public.tasks
for delete using (
  created_by = auth.uid() or public.is_project_owner(project_id) or public.is_admin()
);

create policy "comment authors owners admins delete comments" on public.task_comments
for delete using (
  author_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.tasks t
    where t.id = task_id and public.is_project_owner(t.project_id)
  )
);

-- Internal trigger helpers must not be directly callable through the API.
revoke all on function public.create_notification(uuid, public.notification_type, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.after_message_insert() from public, anon, authenticated;
revoke all on function public.prevent_owner_application() from public, anon, authenticated;
revoke all on function public.prevent_non_admin_user_protected_field_change() from public, anon, authenticated;

grant execute on function public.update_student_profile(text, public.availability_status, uuid[], uuid[], text[], text[], public.project_visibility, text) to authenticated;
grant execute on function public.create_project_with_skills(text, text, uuid, uuid, uuid, uuid[], uuid[], integer, date, public.project_visibility, text[]) to authenticated;
grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
