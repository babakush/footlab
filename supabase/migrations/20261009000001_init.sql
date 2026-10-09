-- FOOTLAB · esquema inicial
-- Tablas privadas protegidas con Row Level Security: cada usuario solo puede
-- leer y modificar sus propios datos. La biblioteca de ejercicios es pública
-- (solo ejercicios gratuitos) y los ejercicios Pro se filtran en la base de datos.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  -- Solo guardamos la edad (no la fecha de nacimiento) para minimizar datos.
  age smallint check (age between 14 and 70),
  onboarding_completed boolean not null default false,
  privacy_accepted_at timestamptz,
  -- Para menores (14-17): confirma que un tutor o entrenador está informado.
  guardian_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- subscriptions (escrita solo desde el servidor mediante el webhook de Stripe)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive' check (
    status in ('inactive', 'incomplete', 'incomplete_expired', 'trialing', 'active',
               'past_due', 'canceled', 'unpaid', 'paused')
  ),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Fuente de verdad del plan Pro. No se expone a clientes con un uid arbitrario.
create or replace function public.has_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

revoke execute on function public.has_pro(uuid) from public, anon, authenticated;

-- Versión para el usuario actual (usada en políticas RLS y desde el servidor).
create or replace function public.current_user_is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then false else public.has_pro(auth.uid()) end;
$$;

grant execute on function public.current_user_is_pro() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- player_preferences
-- ---------------------------------------------------------------------------
create table public.player_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  position text not null check (position in ('portero', 'central', 'lateral', 'mediocentro', 'extremo', 'delantero')),
  level text not null check (level in ('principiante', 'amateur', 'juvenil_competitivo', 'semiprofesional')),
  goal text not null check (goal in ('velocidad', 'fuerza', 'resistencia', 'tecnica', 'agilidad', 'rendimiento_general')),
  equipment text not null check (equipment in ('gimnasio', 'material_basico', 'sin_material')),
  -- Días ISO: 1 = lunes ... 7 = domingo
  available_days smallint[] not null default '{}' check (available_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  team_days smallint[] not null default '{}' check (team_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  match_day smallint check (match_day between 1 and 7),
  -- Objetivos personalizados (Pro)
  weekly_sessions_target smallint check (weekly_sessions_target between 1 and 14),
  weekly_minutes_target smallint check (weekly_minutes_target between 30 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger player_preferences_updated_at before update on public.player_preferences
  for each row execute function public.set_updated_at();

-- Los objetivos personalizados son una función Pro: se verifica en la base de datos.
create or replace function public.enforce_pro_targets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.weekly_sessions_target is not null or new.weekly_minutes_target is not null)
     and (tg_op = 'INSERT'
          or new.weekly_sessions_target is distinct from old.weekly_sessions_target
          or new.weekly_minutes_target is distinct from old.weekly_minutes_target)
     and not public.has_pro(new.user_id) then
    raise exception 'PRO_REQUIRED' using errcode = 'P0001',
      hint = 'Los objetivos personalizados forman parte del plan Pro.';
  end if;
  return new;
end;
$$;

create trigger player_preferences_pro_targets
  before insert or update on public.player_preferences
  for each row execute function public.enforce_pro_targets();

-- ---------------------------------------------------------------------------
-- exercise_library (contenido público)
-- ---------------------------------------------------------------------------
create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  category text not null check (category in ('aceleracion', 'fuerza_piernas', 'core', 'movilidad',
                                             'coordinacion', 'tecnica', 'cambios_direccion', 'resistencia')),
  goal text not null check (goal in ('velocidad', 'fuerza', 'resistencia', 'tecnica', 'agilidad', 'rendimiento_general')),
  muscle_group text not null check (muscle_group in ('piernas', 'gluteos', 'isquiotibiales', 'cuadriceps',
                                                     'gemelos', 'core', 'cadera', 'tren_superior', 'cuerpo_completo')),
  exercise_type text not null check (exercise_type in ('fuerza', 'pliometria', 'sprint', 'movilidad',
                                                       'tecnica', 'resistencia', 'estabilidad', 'coordinacion')),
  equipment text not null check (equipment in ('sin_material', 'material_basico', 'gimnasio')),
  equipment_detail text,
  difficulty text not null check (difficulty in ('basico', 'intermedio', 'avanzado')),
  duration_min smallint not null check (duration_min between 1 and 60),
  summary text not null,
  instructions text[] not null,
  prescription text,
  rest text,
  common_mistakes text[] not null default '{}',
  easier_variant text,
  harder_variant text,
  safety_notes text[] not null default '{}',
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

create index exercise_library_category_idx on public.exercise_library (category);
create index exercise_library_goal_idx on public.exercise_library (goal);

-- Catálogo sin detalles: permite mostrar ejercicios Pro como bloqueados
-- sin revelar su contenido a usuarios del plan gratuito.
create or replace function public.exercise_catalog()
returns table (
  id uuid, slug text, name text, category text, goal text, muscle_group text, exercise_type text,
  equipment text, difficulty text, duration_min smallint, summary text, is_pro boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.slug, e.name, e.category, e.goal, e.muscle_group, e.exercise_type,
         e.equipment, e.difficulty, e.duration_min,
         case when e.is_pro and not public.current_user_is_pro() then null else e.summary end,
         e.is_pro
  from public.exercise_library e
  order by e.category, e.name;
$$;

grant execute on function public.exercise_catalog() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- training_sessions
-- ---------------------------------------------------------------------------
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  session_date date not null,
  session_type text not null check (session_type in ('fuerza', 'velocidad', 'agilidad', 'resistencia', 'tecnica',
                                                     'movilidad', 'recuperacion', 'equipo', 'partido')),
  title text not null check (char_length(title) between 1 and 80),
  planned_minutes smallint check (planned_minutes between 5 and 300),
  status text not null default 'pendiente' check (status in ('pendiente', 'completada', 'descansada')),
  actual_minutes smallint check (actual_minutes between 1 and 400),
  rpe smallint check (rpe between 1 and 10),
  distance_km numeric(5, 2) check (distance_km > 0 and distance_km <= 100),
  notes text check (char_length(notes) <= 1000),
  source text not null default 'manual' check (source in ('manual', 'sugerida')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completed_requires_minutes check (status <> 'completada' or actual_minutes is not null)
);

create index training_sessions_user_date_idx on public.training_sessions (user_id, session_date);
create index training_sessions_user_status_idx on public.training_sessions (user_id, status);

create trigger training_sessions_updated_at before update on public.training_sessions
  for each row execute function public.set_updated_at();

-- Plan gratuito: máximo 5 sesiones personales por semana (los entrenamientos de
-- equipo y los partidos no cuentan). Se comprueba en la base de datos.
create or replace function public.enforce_free_weekly_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  week_start date := date_trunc('week', new.session_date)::date;
  existing int;
begin
  if new.session_type in ('equipo', 'partido') then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.session_date = old.session_date and new.session_type = old.session_type then
    return new;
  end if;
  if public.has_pro(new.user_id) then
    return new;
  end if;
  select count(*) into existing
  from public.training_sessions t
  where t.user_id = new.user_id
    and t.session_date >= week_start
    and t.session_date < week_start + 7
    and t.session_type not in ('equipo', 'partido')
    and t.id <> new.id;
  if existing >= 5 then
    raise exception 'FREE_PLAN_WEEKLY_LIMIT' using errcode = 'P0001',
      hint = 'El plan gratuito permite 5 sesiones personales por semana.';
  end if;
  return new;
end;
$$;

create trigger training_sessions_free_limit
  before insert or update on public.training_sessions
  for each row execute function public.enforce_free_weekly_limit();

-- ---------------------------------------------------------------------------
-- session_exercises
-- ---------------------------------------------------------------------------
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exercise_id uuid references public.exercise_library (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  prescription text check (char_length(prescription) <= 60),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_user_idx on public.session_exercises (user_id);

-- ---------------------------------------------------------------------------
-- daily_recovery_logs
-- ---------------------------------------------------------------------------
create table public.daily_recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  log_date date not null,
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 16),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  energy smallint check (energy between 1 and 5),
  muscle_fatigue smallint check (muscle_fatigue between 1 and 5),
  motivation smallint check (motivation between 1 and 5),
  hydration_liters numeric(3, 1) check (hydration_liters between 0 and 10),
  significant_pain boolean not null default false,
  dizziness boolean not null default false,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create trigger daily_recovery_logs_updated_at before update on public.daily_recovery_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- personal_records
-- ---------------------------------------------------------------------------
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  value numeric(10, 2) not null check (value >= 0),
  unit text not null check (char_length(unit) between 1 and 15),
  recorded_on date not null,
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);

create index personal_records_user_idx on public.personal_records (user_id, recorded_on desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.player_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.exercise_library enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.daily_recovery_logs enable row level security;
alter table public.personal_records enable row level security;

-- Los visitantes anónimos no tienen acceso a ninguna tabla privada.
revoke all on public.profiles, public.player_preferences, public.subscriptions,
  public.training_sessions, public.session_exercises, public.daily_recovery_logs,
  public.personal_records from anon;

-- Las suscripciones solo las escribe el servidor (service role).
revoke insert, update, delete on public.subscriptions from authenticated;
-- La biblioteca es de solo lectura para los clientes.
revoke insert, update, delete on public.exercise_library from anon, authenticated;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- player_preferences
create policy "prefs_select_own" on public.player_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "prefs_insert_own" on public.player_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prefs_update_own" on public.player_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- subscriptions: solo lectura propia
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- exercise_library: ejercicios gratuitos para todos; Pro solo con suscripción activa
create policy "exercise_library_read" on public.exercise_library
  for select to anon, authenticated using (not is_pro or public.current_user_is_pro());

-- training_sessions
create policy "sessions_select_own" on public.training_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sessions_insert_own" on public.training_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sessions_update_own" on public.training_sessions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions_delete_own" on public.training_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- session_exercises: además, la sesión debe pertenecer al usuario
create policy "session_exercises_select_own" on public.session_exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "session_exercises_insert_own" on public.session_exercises
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.training_sessions t
                where t.id = session_id and t.user_id = (select auth.uid()))
  );
create policy "session_exercises_update_own" on public.session_exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.training_sessions t
                where t.id = session_id and t.user_id = (select auth.uid()))
  );
create policy "session_exercises_delete_own" on public.session_exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- daily_recovery_logs
create policy "recovery_select_own" on public.daily_recovery_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recovery_insert_own" on public.daily_recovery_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "recovery_update_own" on public.daily_recovery_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recovery_delete_own" on public.daily_recovery_logs
  for delete to authenticated using (user_id = (select auth.uid()));

-- personal_records
create policy "records_select_own" on public.personal_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "records_insert_own" on public.personal_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "records_update_own" on public.personal_records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "records_delete_own" on public.personal_records
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Borrado de cuenta (derecho de supresión). Elimina el usuario de auth.users;
-- todas las tablas privadas se borran en cascada.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
