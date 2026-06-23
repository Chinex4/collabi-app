insert into public.faculties (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Engineering'),
  ('10000000-0000-0000-0000-000000000002', 'Science'),
  ('10000000-0000-0000-0000-000000000003', 'Management Sciences'),
  ('10000000-0000-0000-0000-000000000004', 'Arts & Design')
on conflict (name) do nothing;

insert into public.departments (faculty_id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  ('10000000-0000-0000-0000-000000000001', 'Electrical Engineering'),
  ('10000000-0000-0000-0000-000000000002', 'Computer Science'),
  ('10000000-0000-0000-0000-000000000002', 'Statistics'),
  ('10000000-0000-0000-0000-000000000003', 'Marketing'),
  ('10000000-0000-0000-0000-000000000003', 'Accounting'),
  ('10000000-0000-0000-0000-000000000004', 'Industrial Design')
on conflict (faculty_id, name) do nothing;

insert into public.skills (name, category) values
  ('React Native', 'Software'), ('UI/UX Design', 'Design'), ('Node.js', 'Software'),
  ('Firebase', 'Software'), ('Machine Learning', 'Research'), ('Data Analysis', 'Research'),
  ('Product Management', 'Leadership'), ('Figma', 'Design'), ('Pitch Decks', 'Business'),
  ('Academic Research', 'Research')
on conflict (name) do nothing;

insert into public.interests (name) values
  ('HealthTech'), ('EdTech'), ('FinTech'), ('Sustainability'),
  ('Artificial Intelligence'), ('IoT'), ('Entrepreneurship')
on conflict (name) do nothing;

insert into public.categories (faculty_id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Mobile App Development'),
  ('10000000-0000-0000-0000-000000000002', 'Research Innovation'),
  ('10000000-0000-0000-0000-000000000004', 'Design & Branding'),
  ('10000000-0000-0000-0000-000000000003', 'Business Venture')
on conflict (faculty_id, name) do nothing;
