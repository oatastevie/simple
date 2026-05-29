create table users (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamptz default now(),
  goal text,
  age integer,
  sex text,
  job_type text,
  lifting_frequency text,
  cardio_frequency text,
  cardio_types text[],
  height numeric,
  weight numeric,
  unit_preference text default 'metric',
  body_fat_percentage numeric,
  areas_to_avoid text[],
  preferred_ai_model text default 'chrome'
);

create table programme (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users on delete cascade,
  created_at timestamptz default now(),
  week_number integer,
  is_active boolean default true,
  generated_by text,
  raw_json jsonb
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users on delete cascade,
  programme_id uuid references programme on delete set null,
  created_at timestamptz default now(),
  scheduled_date date,
  completed_at timestamptz,
  ai_generated boolean default true,
  notes text
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts on delete cascade,
  name text,
  muscle_group text,
  equipment text,
  target_sets integer,
  target_reps integer,
  target_weight_kg numeric,
  completed boolean default false,
  skipped boolean default false,
  order_index integer,
  notes text
);

create table sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references exercises on delete cascade,
  set_number integer,
  reps_completed integer,
  weight_kg numeric,
  skipped boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Row level security
alter table users enable row level security;
alter table programme enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table sets enable row level security;

create policy "users can access own data" on users for all using (auth.uid() = id);
create policy "users can access own programmes" on programme for all using (auth.uid() = user_id);
create policy "users can access own workouts" on workouts for all using (auth.uid() = user_id);
create policy "users can access own exercises" on exercises for all using (
  auth.uid() = (select user_id from workouts where id = exercises.workout_id)
);
create policy "users can access own sets" on sets for all using (
  auth.uid() = (select w.user_id from exercises e join workouts w on w.id = e.workout_id where e.id = sets.exercise_id)
);