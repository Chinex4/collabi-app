-- The app no longer uses email verification as part of student onboarding.
-- Keep the public profile flag true regardless of Supabase auth email confirmation state.

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
    true,
    'active'
  );

  if coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then
    insert into public.student_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

create or replace function public.sync_auth_user_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set is_verified = true,
      email = new.email,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

update public.users
set is_verified = true
where is_verified = false;
