-- =====================================================================
--  KÖPRÜ — Turk tili akademiyasi — Supabase sxemasi
--  Supabase → SQL Editor → bu faylni to'liq nusxalab "Run" qiling.
--  (Keyin seed.sql ni ham ishga tushiring.)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILLAR
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar text not null default '🦉',
  role text not null default 'user' check (role in ('user','admin')),
  level_cefr text not null default 'A1' check (level_cefr in ('A1','A2','B1','B2','C1')),
  xp integer not null default 0,
  level integer not null default 1,
  weekly_xp integer not null default 0,
  league text not null default 'bronze' check (league in ('bronze','silver','gold','diamond')),
  streak integer not null default 0,
  best_streak integer not null default 0,
  streak_freezes integer not null default 1,
  last_active_date date,
  daily_goal_min integer not null default 10,
  tz text not null default 'Asia/Tashkent',
  interests jsonb not null default '{}'::jsonb,   -- rejimlar bo'yicha o'yin soni
  settings jsonb not null default '{}'::jsonb,
  onboarded boolean not null default false,
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Ro'yxatdan o'tganda profil yaratish. Birinchi foydalanuvchi avtomatik ADMIN bo'ladi.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_role text;
begin
  v_username := coalesce(nullif(new.raw_user_meta_data->>'username',''), 'user_' || substr(replace(new.id::text,'-',''),1,8));
  v_username := regexp_replace(lower(v_username), '[^a-z0-9_]', '', 'g');
  if v_username = '' then v_username := 'user_' || substr(replace(new.id::text,'-',''),1,8); end if;
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(new.id::text,'-',''),1,4);
  end if;
  select case when count(*) = 0 then 'admin' else 'user' end into v_role from public.profiles;
  insert into public.profiles (id, username, display_name, avatar, role)
  values (new.id, v_username,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email,'o''quvchi'),'@',1)),
          coalesce(nullif(new.raw_user_meta_data->>'avatar',''), '🦉'),
          v_role)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Foydalanuvchi o'z XP/level/role maydonlarini to'g'ridan-to'g'ri o'zgartira olmaydi (faqat RPC orqali).
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_setting('kopru.bypass', true) = '1' then
    new.updated_at := now();
    return new;
  end if;
  if auth.uid() = old.id and not public.is_admin() then
    new.xp := old.xp; new.level := old.level; new.role := old.role; new.league := old.league;
    new.weekly_xp := old.weekly_xp; new.streak := old.streak; new.best_streak := old.best_streak;
    new.streak_freezes := old.streak_freezes; new.banned := old.banned;
    new.last_active_date := old.last_active_date; new.interests := old.interests;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- 2. KONTENT: bo'limlar, darslar, so'zlar, grammatika, mashqlar
-- ---------------------------------------------------------------------
create table if not exists public.units (
  id serial primary key,
  slug text unique not null,
  title_uz text not null,
  title_tr text,
  description text,
  cefr text not null default 'A1',
  order_index integer not null default 0,
  icon text not null default '📘',
  color text not null default '#ff6a2a',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id serial primary key,
  unit_id integer not null references public.units(id) on delete cascade,
  slug text unique not null,
  title_uz text not null,
  title_tr text,
  kind text not null default 'vocab' check (kind in ('vocab','grammar','dialog','culture','boss','cognates')),
  order_index integer not null default 0,
  content jsonb not null default '{}'::jsonb,   -- kirish matni, dialog, maslahatlar
  xp_reward integer not null default 30,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id serial primary key,
  lesson_id integer references public.lessons(id) on delete set null,
  tr text not null,
  uz text not null,
  pos text default 'noun',            -- noun, verb, adj, adv, phrase, number, pron
  example_tr text,
  example_uz text,
  cognate text,                       -- qarindosh so'z / yolg'on do'st izohi
  false_friend boolean not null default false,
  tags text[] not null default '{}',
  difficulty integer not null default 1,
  cefr text not null default 'A1',
  created_at timestamptz not null default now()
);
create index if not exists words_lesson_idx on public.words(lesson_id);
create index if not exists words_cefr_idx on public.words(cefr);
create unique index if not exists words_lesson_tr_idx on public.words(lesson_id, tr);

create table if not exists public.grammar_topics (
  id serial primary key,
  lesson_id integer references public.lessons(id) on delete set null,
  code text unique not null,
  title_uz text not null,
  title_tr text,
  cefr text not null default 'A1',
  explanation_md text not null,
  rules jsonb not null default '{}'::jsonb,       -- jadval / qoidalar
  drills jsonb not null default '[]'::jsonb,       -- {sentence, answer, options, explain}
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id serial primary key,
  lesson_id integer references public.lessons(id) on delete cascade,
  type text not null,
  data jsonb not null,
  difficulty integer not null default 1,
  source text not null default 'manual' check (source in ('manual','ai')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. FOYDALANUVCHI HOLATI
-- ---------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id integer not null references public.lessons(id) on delete cascade,
  status text not null default 'available' check (status in ('locked','available','in_progress','completed')),
  best_score integer not null default 0,
  stars integer not null default 0,
  attempts integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- FSRS holati (so'z bo'yicha)
create table if not exists public.user_words (
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id integer not null references public.words(id) on delete cascade,
  stability double precision not null default 0,
  difficulty double precision not null default 5,
  due timestamptz not null default now(),
  reps integer not null default 0,
  lapses integer not null default 0,
  state text not null default 'new' check (state in ('new','learning','review','relearning')),
  last_review timestamptz,
  primary key (user_id, word_id)
);
create index if not exists user_words_due_idx on public.user_words(user_id, due);

create table if not exists public.reviews (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id integer references public.words(id) on delete set null,
  grade integer not null,              -- 1 Again, 2 Hard, 3 Good, 4 Easy
  correct boolean not null,
  response_ms integer,
  mode text,
  elapsed_days double precision,
  created_at timestamptz not null default now()
);
create index if not exists reviews_user_idx on public.reviews(user_id, created_at desc);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  lesson_id integer references public.lessons(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','done','abandoned')),
  score integer not null default 0,
  total integer not null default 0,
  xp_earned integer not null default 0,
  duration_sec integer not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists sessions_user_idx on public.sessions(user_id, status, updated_at desc);

create table if not exists public.xp_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);

create table if not exists public.daily_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  minutes integer not null default 0,
  reviews integer not null default 0,
  correct integer not null default 0,
  sessions integer not null default 0,
  modes jsonb not null default '{}'::jsonb,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------
-- 4. GAMIFIKATSIYA: questlar va yutuqlar
-- ---------------------------------------------------------------------
create table if not exists public.quests (
  id serial primary key,
  code text unique not null,
  title_uz text not null,
  description_uz text,
  kind text not null default 'daily' check (kind in ('daily','weekly','once')),
  metric text not null,          -- xp, reviews, correct, lessons, minutes, sessions, duels, perfect, modes
  target integer not null default 1,
  xp_reward integer not null default 20,
  icon text not null default '🎯',
  is_active boolean not null default true
);

create table if not exists public.user_quests (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id integer not null references public.quests(id) on delete cascade,
  period_key text not null,       -- 'YYYY-MM-DD' | 'YYYY-Www' | 'once'
  progress integer not null default 0,
  completed_at timestamptz,
  claimed boolean not null default false,
  unique (user_id, quest_id, period_key)
);

create table if not exists public.achievements (
  id serial primary key,
  code text unique not null,
  title_uz text not null,
  description_uz text,
  icon text not null default '🏅',
  rarity text not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  condition jsonb not null,       -- {"metric":"streak","gte":7}
  xp_reward integer not null default 50,
  is_active boolean not null default true
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id integer not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------
-- 5. DUEL (real vaqt, Supabase Realtime)
-- ---------------------------------------------------------------------
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','playing','done','cancelled')),
  questions jsonb not null default '[]'::jsonb,
  host_score integer not null default 0,
  guest_score integer not null default 0,
  winner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. AI: kesh, navbat, provayder holati
-- ---------------------------------------------------------------------
create table if not exists public.ai_cache (
  key text primary key,
  kind text not null,
  request jsonb not null,
  response jsonb not null,
  provider text,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_cache_kind_idx on public.ai_cache(kind, created_at desc);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  result jsonb,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_jobs_status_idx on public.ai_jobs(status, created_at);

create table if not exists public.ai_provider_state (
  provider text primary key,
  enabled boolean not null default true,
  priority integer not null default 10,
  model text,
  daily_cap integer not null default 1000,
  used_today integer not null default 0,
  day date not null default current_date,
  cooldown_until timestamptz,
  last_error text,
  total_calls bigint not null default 0,
  total_errors bigint not null default 0,
  avg_latency_ms integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id bigserial primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  rating integer check (rating between 1 and 5),
  text text,
  page text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. RLS (xavfsizlik)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.words enable row level security;
alter table public.grammar_topics enable row level security;
alter table public.exercises enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.user_words enable row level security;
alter table public.reviews enable row level security;
alter table public.sessions enable row level security;
alter table public.xp_events enable row level security;
alter table public.daily_stats enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.duels enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_provider_state enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_logs enable row level security;
alter table public.feedback enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles for delete to authenticated using (public.is_admin());

-- kontent: hamma o'qiydi (faqat chop etilgan), admin yozadi
do $$
declare t text;
begin
  foreach t in array array['units','lessons'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (is_published or public.is_admin())', t, t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format('create policy "%s_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
  foreach t in array array['words','grammar_topics','exercises','quests','achievements'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format('create policy "%s_admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
  -- foydalanuvchi holati: faqat o'ziniki (admin hammasini)
  foreach t in array array['lesson_progress','user_words','reviews','sessions','xp_events','daily_stats','user_quests','user_achievements','ai_jobs','feedback'] loop
    execute format('drop policy if exists "%s_own" on public.%I', t, t);
    execute format('create policy "%s_own" on public.%I for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin())', t, t);
  end loop;
end $$;

-- duels: ishtirokchilar ko'radi/yangilaydi, hamma yaratadi, kod bo'yicha qo'shilish uchun waiting holatini o'qish mumkin
drop policy if exists "duels_select" on public.duels;
create policy "duels_select" on public.duels for select to authenticated using (true);
drop policy if exists "duels_insert" on public.duels;
create policy "duels_insert" on public.duels for insert to authenticated with check (host_id = auth.uid());
drop policy if exists "duels_update" on public.duels;
create policy "duels_update" on public.duels for update to authenticated
  using (host_id = auth.uid() or guest_id = auth.uid() or (status = 'waiting' and guest_id is null) or public.is_admin());
drop policy if exists "duels_delete" on public.duels;
create policy "duels_delete" on public.duels for delete to authenticated using (host_id = auth.uid() or public.is_admin());

-- ai_cache: hamma o'qiydi va yozadi (umumiy kontent banki), admin o'chiradi
drop policy if exists "ai_cache_select" on public.ai_cache;
create policy "ai_cache_select" on public.ai_cache for select to authenticated using (true);
drop policy if exists "ai_cache_insert" on public.ai_cache;
create policy "ai_cache_insert" on public.ai_cache for insert to authenticated with check (true);
drop policy if exists "ai_cache_update" on public.ai_cache;
create policy "ai_cache_update" on public.ai_cache for update to authenticated using (true) with check (true);
drop policy if exists "ai_cache_delete" on public.ai_cache;
create policy "ai_cache_delete" on public.ai_cache for delete to authenticated using (public.is_admin());

-- provayder holati, sozlamalar, loglar
drop policy if exists "aps_select" on public.ai_provider_state;
create policy "aps_select" on public.ai_provider_state for select to authenticated using (true);
drop policy if exists "aps_admin" on public.ai_provider_state;
create policy "aps_admin" on public.ai_provider_state for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_select" on public.app_settings;
create policy "settings_select" on public.app_settings for select to authenticated using (true);
drop policy if exists "settings_admin" on public.app_settings;
create policy "settings_admin" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "logs_admin" on public.admin_logs;
create policy "logs_admin" on public.admin_logs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 8. YORDAMCHI FUNKSIYALAR
-- ---------------------------------------------------------------------
create or replace function public.user_today(p_user uuid)
returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select tz from public.profiles where id = p_user), 'Asia/Tashkent'))::date;
$$;

create or replace function public.level_for_xp(p_xp integer)
returns integer language sql immutable as $$
  select greatest(1, floor(sqrt(greatest(p_xp,0) / 75.0))::integer + 1);
$$;

-- Questlarni oshirish
create or replace function public.bump_quests(p_metric text, p_inc integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
  v_uid uuid := auth.uid();
  v_today date;
  v_key text;
begin
  if v_uid is null then return; end if;
  v_today := public.user_today(v_uid);
  for q in select * from public.quests where is_active and metric = p_metric loop
    v_key := case q.kind when 'daily' then v_today::text
                         when 'weekly' then to_char(v_today, 'IYYY-"W"IW')
                         else 'once' end;
    insert into public.user_quests (user_id, quest_id, period_key, progress)
    values (v_uid, q.id, v_key, least(p_inc, q.target))
    on conflict (user_id, quest_id, period_key) do update
      set progress = least(public.user_quests.progress + p_inc, q.target);
    update public.user_quests set completed_at = now()
      where user_id = v_uid and quest_id = q.id and period_key = v_key
        and completed_at is null and progress >= q.target;
  end loop;
end $$;

-- XP qo'shish + streak + daraja + kunlik statistika
create or replace function public.add_xp(p_amount integer, p_reason text, p_meta jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles%rowtype;
  v_today date;
  v_new_xp integer;
  v_new_level integer;
  v_streak integer;
  v_freezes integer;
  v_streak_event text := 'none';
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into p from public.profiles where id = v_uid for update;
  v_today := public.user_today(v_uid);

  v_streak := p.streak; v_freezes := p.streak_freezes;
  if p.last_active_date is null or p.last_active_date < v_today - 2 then
    if p.last_active_date is not null and p.streak > 0 then v_streak_event := 'reset'; else v_streak_event := 'start'; end if;
    v_streak := 1;
  elsif p.last_active_date = v_today - 1 then
    v_streak := p.streak + 1; v_streak_event := 'extended';
  elsif p.last_active_date = v_today - 2 then
    if v_freezes > 0 then v_freezes := v_freezes - 1; v_streak := p.streak + 1; v_streak_event := 'freeze_used';
    else v_streak := 1; v_streak_event := 'reset'; end if;
  end if;

  v_new_xp := p.xp + greatest(p_amount, 0);
  v_new_level := public.level_for_xp(v_new_xp);

  perform set_config('kopru.bypass', '1', true);
  update public.profiles set
    xp = v_new_xp,
    level = v_new_level,
    weekly_xp = weekly_xp + greatest(p_amount, 0),
    streak = v_streak,
    best_streak = greatest(best_streak, v_streak),
    streak_freezes = v_freezes,
    last_active_date = v_today
  where id = v_uid;
  perform set_config('kopru.bypass', '0', true);

  insert into public.xp_events (user_id, amount, reason, meta) values (v_uid, p_amount, p_reason, p_meta);

  insert into public.daily_stats (user_id, day, xp) values (v_uid, v_today, greatest(p_amount,0))
  on conflict (user_id, day) do update set xp = public.daily_stats.xp + greatest(p_amount,0);

  perform public.bump_quests('xp', greatest(p_amount,0));

  return jsonb_build_object(
    'xp', v_new_xp, 'level', v_new_level, 'leveled_up', v_new_level > p.level,
    'streak', v_streak, 'streak_event', v_streak_event, 'freezes', v_freezes);
end $$;

-- Takrorlash natijasini yozish (FSRS hisob-kitobi klientda, saqlash serverda)
create or replace function public.record_review(
  p_word_id integer, p_grade integer, p_correct boolean,
  p_stability double precision, p_difficulty double precision, p_due timestamptz, p_state text,
  p_response_ms integer default null, p_mode text default 'review', p_elapsed_days double precision default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_today := public.user_today(v_uid);
  insert into public.user_words (user_id, word_id, stability, difficulty, due, reps, lapses, state, last_review)
  values (v_uid, p_word_id, p_stability, p_difficulty, p_due, 1, case when p_grade = 1 then 1 else 0 end, p_state, now())
  on conflict (user_id, word_id) do update set
    stability = excluded.stability, difficulty = excluded.difficulty, due = excluded.due,
    reps = public.user_words.reps + 1,
    lapses = public.user_words.lapses + case when p_grade = 1 then 1 else 0 end,
    state = excluded.state, last_review = now();
  insert into public.reviews (user_id, word_id, grade, correct, response_ms, mode, elapsed_days)
  values (v_uid, p_word_id, p_grade, p_correct, p_response_ms, p_mode, p_elapsed_days);
  insert into public.daily_stats (user_id, day, reviews, correct) values (v_uid, v_today, 1, case when p_correct then 1 else 0 end)
  on conflict (user_id, day) do update set reviews = public.daily_stats.reviews + 1,
    correct = public.daily_stats.correct + case when p_correct then 1 else 0 end;
  perform public.bump_quests('reviews', 1);
  if p_correct then perform public.bump_quests('correct', 1); end if;
end $$;

-- Sessiya tugadi: daqiqalar, rejim statistikasi, qiziqishlar
create or replace function public.finish_session(p_session_id uuid, p_mode text, p_minutes integer, p_perfect boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_today := public.user_today(v_uid);
  insert into public.daily_stats (user_id, day, minutes, sessions, modes)
  values (v_uid, v_today, greatest(p_minutes,0), 1, jsonb_build_object(p_mode, 1))
  on conflict (user_id, day) do update set
    minutes = public.daily_stats.minutes + greatest(p_minutes,0),
    sessions = public.daily_stats.sessions + 1,
    modes = public.daily_stats.modes || jsonb_build_object(p_mode, coalesce((public.daily_stats.modes->>p_mode)::int,0) + 1);
  perform set_config('kopru.bypass', '1', true);
  update public.profiles set interests = interests || jsonb_build_object(p_mode, coalesce((interests->>p_mode)::int,0) + 1)
    where id = v_uid;
  perform set_config('kopru.bypass', '0', true);
  if p_session_id is not null then
    update public.sessions set status = 'done', ended_at = now(), updated_at = now() where id = p_session_id and user_id = v_uid;
  end if;
  perform public.bump_quests('minutes', greatest(p_minutes,0));
  perform public.bump_quests('sessions', 1);
  if p_perfect then perform public.bump_quests('perfect', 1); end if;
end $$;

-- Dars yakunlash: progress, keyingi darsni ochish
create or replace function public.complete_lesson(p_lesson_id integer, p_score integer, p_stars integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_next integer;
  v_unit integer;
  v_order integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.lesson_progress (user_id, lesson_id, status, best_score, stars, attempts, completed_at)
  values (v_uid, p_lesson_id, 'completed', p_score, p_stars, 1, now())
  on conflict (user_id, lesson_id) do update set
    status = 'completed', best_score = greatest(public.lesson_progress.best_score, p_score),
    stars = greatest(public.lesson_progress.stars, p_stars),
    attempts = public.lesson_progress.attempts + 1, completed_at = coalesce(public.lesson_progress.completed_at, now()), updated_at = now();
  select unit_id, order_index into v_unit, v_order from public.lessons where id = p_lesson_id;
  select l.id into v_next from public.lessons l
    join public.units u on u.id = l.unit_id
    where l.is_published and (u.order_index, l.order_index) > ((select order_index from public.units where id = v_unit), v_order)
    order by u.order_index, l.order_index limit 1;
  if v_next is not null then
    insert into public.lesson_progress (user_id, lesson_id, status) values (v_uid, v_next, 'available')
    on conflict (user_id, lesson_id) do nothing;
  end if;
  perform public.bump_quests('lessons', 1);
  return jsonb_build_object('next_lesson_id', v_next);
end $$;

-- Quest mukofotini olish
create or replace function public.claim_quest(p_user_quest_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uq public.user_quests%rowtype;
  q public.quests%rowtype;
begin
  select * into uq from public.user_quests where id = p_user_quest_id and user_id = auth.uid() for update;
  if uq.id is null or uq.completed_at is null or uq.claimed then return jsonb_build_object('ok', false); end if;
  select * into q from public.quests where id = uq.quest_id;
  update public.user_quests set claimed = true where id = uq.id;
  return jsonb_build_object('ok', true, 'xp', public.add_xp(q.xp_reward, 'quest', jsonb_build_object('quest', q.code)));
end $$;

-- Yutuqlarni tekshirish (yangi ochilganlarni qaytaradi)
create or replace function public.check_achievements()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a record;
  v_metrics jsonb;
  v_val numeric;
  v_new jsonb := '[]'::jsonb;
begin
  if v_uid is null then return v_new; end if;
  select jsonb_build_object(
    'streak', p.best_streak, 'xp', p.xp, 'level', p.level,
    'words_mastered', (select count(*) from public.user_words w where w.user_id = v_uid and w.state = 'review' and w.stability >= 21),
    'words_seen', (select count(*) from public.user_words w where w.user_id = v_uid),
    'lessons_completed', (select count(*) from public.lesson_progress lp where lp.user_id = v_uid and lp.status = 'completed'),
    'reviews', (select count(*) from public.reviews r where r.user_id = v_uid),
    'duels_won', (select count(*) from public.duels d where d.winner_id = v_uid),
    'minutes', (select coalesce(sum(minutes),0) from public.daily_stats ds where ds.user_id = v_uid),
    'modes', (select count(*) from jsonb_object_keys(p.interests)),
    'perfect', (select count(*) from public.sessions s where s.user_id = v_uid and s.status = 'done' and s.total > 0 and s.score = s.total)
  ) into v_metrics from public.profiles p where p.id = v_uid;

  for a in select * from public.achievements where is_active
           and id not in (select achievement_id from public.user_achievements where user_id = v_uid) loop
    v_val := coalesce((v_metrics->>(a.condition->>'metric'))::numeric, 0);
    if v_val >= coalesce((a.condition->>'gte')::numeric, 1) then
      insert into public.user_achievements (user_id, achievement_id) values (v_uid, a.id) on conflict do nothing;
      perform public.add_xp(a.xp_reward, 'achievement', jsonb_build_object('code', a.code));
      v_new := v_new || jsonb_build_object('code', a.code, 'title', a.title_uz, 'icon', a.icon, 'xp', a.xp_reward, 'rarity', a.rarity);
    end if;
  end loop;
  return v_new;
end $$;

-- Foydalanuvchi statistikasi (bitta so'rovda)
create or replace function public.get_user_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  res jsonb;
begin
  if v_uid is null then return '{}'::jsonb; end if;
  v_today := public.user_today(v_uid);
  select jsonb_build_object(
    'today', (select to_jsonb(d) from public.daily_stats d where d.user_id = v_uid and d.day = v_today),
    'heatmap', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'xp', xp, 'minutes', minutes, 'reviews', reviews) order by day), '[]'::jsonb)
                from public.daily_stats where user_id = v_uid and day >= v_today - 120),
    'words', jsonb_build_object(
      'new', (select count(*) from public.user_words where user_id = v_uid and state = 'new'),
      'learning', (select count(*) from public.user_words where user_id = v_uid and state in ('learning','relearning')),
      'review', (select count(*) from public.user_words where user_id = v_uid and state = 'review' and stability < 21),
      'mastered', (select count(*) from public.user_words where user_id = v_uid and state = 'review' and stability >= 21),
      'due', (select count(*) from public.user_words where user_id = v_uid and due <= now()),
      'total_words', (select count(*) from public.words)),
    'modes', (select coalesce(jsonb_object_agg(mode, jsonb_build_object('total', total, 'correct', correct)), '{}'::jsonb)
              from (select mode, count(*) total, sum(case when correct then 1 else 0 end) correct
                    from public.reviews where user_id = v_uid and mode is not null group by mode) m),
    'lessons', jsonb_build_object(
      'completed', (select count(*) from public.lesson_progress where user_id = v_uid and status = 'completed'),
      'total', (select count(*) from public.lessons where is_published)),
    'totals', jsonb_build_object(
      'minutes', (select coalesce(sum(minutes),0) from public.daily_stats where user_id = v_uid),
      'reviews', (select coalesce(sum(reviews),0) from public.daily_stats where user_id = v_uid),
      'correct', (select coalesce(sum(correct),0) from public.daily_stats where user_id = v_uid),
      'sessions', (select coalesce(sum(sessions),0) from public.daily_stats where user_id = v_uid),
      'active_days', (select count(*) from public.daily_stats where user_id = v_uid and (xp > 0 or minutes > 0)),
      'duels_won', (select count(*) from public.duels where winner_id = v_uid),
      'duels', (select count(*) from public.duels where (host_id = v_uid or guest_id = v_uid) and status = 'done')),
    'recent_errors', (select coalesce(jsonb_agg(jsonb_build_object('tr', w.tr, 'uz', w.uz, 'lapses', uw.lapses) order by uw.lapses desc), '[]'::jsonb)
                      from (select * from public.user_words where user_id = v_uid and lapses > 0 order by lapses desc limit 10) uw
                      join public.words w on w.id = uw.word_id),
    'achievements', (select coalesce(jsonb_agg(jsonb_build_object('code', a.code, 'title', a.title_uz, 'icon', a.icon, 'rarity', a.rarity, 'unlocked_at', ua.unlocked_at)), '[]'::jsonb)
                     from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where ua.user_id = v_uid),
    'rank', (select count(*) + 1 from public.profiles p2 where p2.weekly_xp > (select weekly_xp from public.profiles where id = v_uid) and not p2.banned)
  ) into res;
  return res;
end $$;

-- Admin umumiy ko'rinish
create or replace function public.admin_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'dau', (select count(distinct user_id) from public.daily_stats where day = current_date),
    'wau', (select count(distinct user_id) from public.daily_stats where day >= current_date - 6),
    'at_risk', (select count(*) from public.profiles where last_active_date is not null and last_active_date between current_date - 6 and current_date - 2),
    'churned', (select count(*) from public.profiles where last_active_date < current_date - 6),
    'reviews_today', (select coalesce(sum(reviews),0) from public.daily_stats where day = current_date),
    'minutes_today', (select coalesce(sum(minutes),0) from public.daily_stats where day = current_date),
    'xp_today', (select coalesce(sum(xp),0) from public.daily_stats where day = current_date),
    'words', (select count(*) from public.words),
    'lessons', (select count(*) from public.lessons),
    'units', (select count(*) from public.units),
    'ai_cache', (select count(*) from public.ai_cache),
    'ai_cache_hits', (select coalesce(sum(hits),0) from public.ai_cache),
    'ai_jobs_queued', (select count(*) from public.ai_jobs where status = 'queued'),
    'ai_jobs_failed', (select count(*) from public.ai_jobs where status = 'failed'),
    'sessions_today', (select coalesce(sum(sessions),0) from public.daily_stats where day = current_date),
    'daily_series', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'users', users, 'xp', xp, 'minutes', minutes) order by day), '[]'::jsonb)
                     from (select day, count(distinct user_id) users, sum(xp) xp, sum(minutes) minutes from public.daily_stats where day >= current_date - 29 group by day) s),
    'modes', (select coalesce(jsonb_object_agg(mode, c), '{}'::jsonb) from (select mode, count(*) c from public.reviews where created_at >= now() - interval '30 days' group by mode) m),
    'providers', (select coalesce(jsonb_agg(to_jsonb(s) order by priority), '[]'::jsonb) from public.ai_provider_state s)
  ) into res;
  return res;
end $$;

-- Haftalik liga (cron, service role bilan chaqiriladi)
create or replace function public.reset_weekly_leagues()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_promoted integer := 0; v_demoted integer := 0;
  lg record;
  r record;
  v_count integer;
  v_rank integer;
  v_new text;
begin
  perform set_config('kopru.bypass', '1', true);
  for lg in select league, count(*) c from public.profiles where not banned group by league loop
    v_rank := 0; v_count := lg.c;
    for r in select id, league from public.profiles where league = lg.league and not banned order by weekly_xp desc loop
      v_rank := v_rank + 1;
      v_new := r.league;
      if v_rank <= greatest(1, ceil(v_count * 0.2)) and r.league <> 'diamond' then
        v_new := case r.league when 'bronze' then 'silver' when 'silver' then 'gold' else 'diamond' end;
        v_promoted := v_promoted + 1;
      elsif v_rank > v_count - ceil(v_count * 0.15) and v_count >= 5 and r.league <> 'bronze' then
        v_new := case r.league when 'diamond' then 'gold' when 'gold' then 'silver' else 'bronze' end;
        v_demoted := v_demoted + 1;
      end if;
      if v_new <> r.league then
        update public.profiles set league = v_new where id = r.id;
      end if;
    end loop;
  end loop;
  update public.profiles set weekly_xp = 0;
  perform set_config('kopru.bypass', '0', true);
  return jsonb_build_object('promoted', v_promoted, 'demoted', v_demoted);
end $$;

-- Admin: foydalanuvchi progressini tozalash
create or replace function public.admin_reset_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.user_words where user_id = p_user;
  delete from public.reviews where user_id = p_user;
  delete from public.lesson_progress where user_id = p_user;
  delete from public.sessions where user_id = p_user;
  delete from public.xp_events where user_id = p_user;
  delete from public.daily_stats where user_id = p_user;
  delete from public.user_quests where user_id = p_user;
  delete from public.user_achievements where user_id = p_user;
  perform set_config('kopru.bypass', '1', true);
  update public.profiles set xp = 0, level = 1, weekly_xp = 0, streak = 0, best_streak = 0, last_active_date = null, interests = '{}'::jsonb where id = p_user;
  perform set_config('kopru.bypass', '0', true);
  insert into public.admin_logs (admin_id, action, target) values (auth.uid(), 'reset_user', p_user::text);
end $$;

-- Haftalik liderlar jadvali
create or replace view public.leaderboard_weekly with (security_invoker = true) as
  select id, username, display_name, avatar, level, league, weekly_xp, xp, streak
  from public.profiles where not banned order by weekly_xp desc, xp desc;

-- Realtime: duel jadvali o'zgarishlarini eshitish
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'duels') then
    alter publication supabase_realtime add table public.duels;
  end if;
exception when others then null;
end $$;

-- Grants
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
