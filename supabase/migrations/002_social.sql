-- =====================================================================
--  KÖPRÜ — 2-yangilanish: ijtimoiy qatlam, rekordlar, faollik lentasi
--  Supabase → SQL Editor → to'liq nusxalab "Run". (schema.sql dan KEYIN.)
--  Qayta ishga tushirish xavfsiz (if not exists / or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFIL qo'shimchalari
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists allow_dm boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. DO'STLIK
-- ---------------------------------------------------------------------
create table if not exists public.friendships (
  id bigserial primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_idx on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a)));
$$;

-- ---------------------------------------------------------------------
-- 3. BILDIRISHNOMALAR
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,                -- friend_request, friend_accept, nudge, challenge, challenge_result, reaction, message, club_join, club_message, system
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- Boshqa foydalanuvchiga bildirishnoma yuborish (actor = men)
create or replace function public.notify(p_user uuid, p_kind text, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then return; end if;
  -- spam cheklovi: bir xil turdan 1 daqiqada 1 ta
  if exists (select 1 from public.notifications n where n.user_id = p_user and n.actor_id = auth.uid() and n.kind = p_kind and n.created_at > now() - interval '1 minute') then return; end if;
  insert into public.notifications (user_id, actor_id, kind, payload) values (p_user, auth.uid(), p_kind, p_payload);
end $$;

-- ---------------------------------------------------------------------
-- 4. FAOLLIK LENTASI va REAKSIYALAR
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                -- lesson, achievement, duel_win, streak, level, high_score, club_join, challenge_win
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activities_user_idx on public.activities(user_id, created_at desc);
create index if not exists activities_time_idx on public.activities(created_at desc);

create table if not exists public.reactions (
  activity_id bigint not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👏','🔥','💪','😍','🎉')),
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- ---------------------------------------------------------------------
-- 5. KLUBLAR va XABARLAR
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  code text unique not null,
  emoji text not null default '🏛️',
  description text,
  is_public boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
-- bir foydalanuvchi — bitta klub
create unique index if not exists club_members_user_idx on public.club_members(user_id);

create or replace function public.my_club_id()
returns uuid language sql stable security definer set search_path = public as $$
  select club_id from public.club_members where user_id = auth.uid() limit 1;
$$;

create table if not exists public.messages (
  id bigserial primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now(),
  check ((receiver_id is not null) <> (club_id is not null))
);
create index if not exists messages_dm_idx on public.messages(sender_id, receiver_id, created_at desc);
create index if not exists messages_club_idx on public.messages(club_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. CHAQIRIQLAR (asinxron duel — ikkala tomon o'z vaqtida o'ynaydi)
-- ---------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  game text not null default 'blitz',
  questions jsonb not null default '[]'::jsonb,
  challenger_score integer,
  opponent_score integer,
  status text not null default 'pending' check (status in ('pending','done','declined','expired')),
  winner_id uuid,
  expires_at timestamptz not null default now() + interval '3 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (challenger_id <> opponent_id)
);
create index if not exists challenges_opp_idx on public.challenges(opponent_id, status);
create index if not exists challenges_ch_idx on public.challenges(challenger_id, status);

-- ---------------------------------------------------------------------
-- 7. REKORDLAR (o'yin bo'yicha eng yaxshi natija) va KUNLIK CHAQIRIQ
-- ---------------------------------------------------------------------
create table if not exists public.high_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,                -- blitz, rain, tower, bingo, memory, anagram, bridge, daily:YYYY-MM-DD
  score integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  plays integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);
create index if not exists high_scores_game_idx on public.high_scores(game, score desc);

create or replace function public.submit_score(p_game text, p_score integer, p_meta jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prev integer;
  v_best boolean := false;
  v_rank integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select score into v_prev from public.high_scores where user_id = v_uid and game = p_game;
  if v_prev is null then
    insert into public.high_scores (user_id, game, score, meta) values (v_uid, p_game, p_score, p_meta);
    v_best := true;
  elsif p_score > v_prev then
    update public.high_scores set score = p_score, meta = p_meta, plays = plays + 1, updated_at = now() where user_id = v_uid and game = p_game;
    v_best := true;
  else
    update public.high_scores set plays = plays + 1, updated_at = now() where user_id = v_uid and game = p_game;
  end if;
  if v_best and p_score > 0 and coalesce(v_prev, 0) > 0 and p_game not like 'daily:%' then
    insert into public.activities (user_id, kind, payload) values (v_uid, 'high_score', jsonb_build_object('game', p_game, 'score', p_score));
  end if;
  select count(*) + 1 into v_rank from public.high_scores h where h.game = p_game and h.score > greatest(p_score, coalesce(v_prev, 0));
  return jsonb_build_object('best', v_best, 'prev', v_prev, 'rank', v_rank);
end $$;

-- ---------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------
alter table public.friendships enable row level security;
alter table public.notifications enable row level security;
alter table public.activities enable row level security;
alter table public.reactions enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.messages enable row level security;
alter table public.challenges enable row level security;
alter table public.high_scores enable row level security;

-- friendships
drop policy if exists "fr_select" on public.friendships;
create policy "fr_select" on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());
drop policy if exists "fr_insert" on public.friendships;
create policy "fr_insert" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
drop policy if exists "fr_update" on public.friendships;
create policy "fr_update" on public.friendships for update to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());
drop policy if exists "fr_delete" on public.friendships;
create policy "fr_delete" on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid() or public.is_admin());

-- notifications: faqat o'ziniki; yozish — notify() orqali
drop policy if exists "nt_own" on public.notifications;
create policy "nt_own" on public.notifications for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- activities: hamma o'qiydi (ochiq lenta), o'ziniki yoziladi
drop policy if exists "ac_select" on public.activities;
create policy "ac_select" on public.activities for select to authenticated using (true);
drop policy if exists "ac_insert" on public.activities;
create policy "ac_insert" on public.activities for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ac_delete" on public.activities;
create policy "ac_delete" on public.activities for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "re_select" on public.reactions;
create policy "re_select" on public.reactions for select to authenticated using (true);
drop policy if exists "re_own" on public.reactions;
create policy "re_own" on public.reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clubs
drop policy if exists "cl_select" on public.clubs;
create policy "cl_select" on public.clubs for select to authenticated using (true);
drop policy if exists "cl_insert" on public.clubs;
create policy "cl_insert" on public.clubs for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "cl_update" on public.clubs;
create policy "cl_update" on public.clubs for update to authenticated using (created_by = auth.uid() or public.is_admin());
drop policy if exists "cl_delete" on public.clubs;
create policy "cl_delete" on public.clubs for delete to authenticated using (created_by = auth.uid() or public.is_admin());

drop policy if exists "cm_select" on public.club_members;
create policy "cm_select" on public.club_members for select to authenticated using (true);
drop policy if exists "cm_insert" on public.club_members;
create policy "cm_insert" on public.club_members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cm_delete" on public.club_members;
create policy "cm_delete" on public.club_members for delete to authenticated
  using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.clubs c where c.id = club_id and c.created_by = auth.uid()));

-- messages: DM — faqat do'stlar; klub — faqat a'zolar
drop policy if exists "ms_select" on public.messages;
create policy "ms_select" on public.messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid() or (club_id is not null and club_id = public.my_club_id()) or public.is_admin());
drop policy if exists "ms_insert" on public.messages;
create policy "ms_insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and (
    (receiver_id is not null and public.are_friends(auth.uid(), receiver_id) and coalesce((select allow_dm from public.profiles where id = receiver_id), true))
    or (club_id is not null and club_id = public.my_club_id())));
drop policy if exists "ms_delete" on public.messages;
create policy "ms_delete" on public.messages for delete to authenticated using (sender_id = auth.uid() or public.is_admin());

-- challenges
drop policy if exists "ch_select" on public.challenges;
create policy "ch_select" on public.challenges for select to authenticated using (challenger_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());
drop policy if exists "ch_insert" on public.challenges;
create policy "ch_insert" on public.challenges for insert to authenticated with check (challenger_id = auth.uid() and public.are_friends(auth.uid(), opponent_id));
drop policy if exists "ch_update" on public.challenges;
create policy "ch_update" on public.challenges for update to authenticated using (challenger_id = auth.uid() or opponent_id = auth.uid() or public.is_admin());

-- high_scores: hamma o'qiydi (rekordlar jadvali), yozish — submit_score()
drop policy if exists "hs_select" on public.high_scores;
create policy "hs_select" on public.high_scores for select to authenticated using (true);
drop policy if exists "hs_admin" on public.high_scores;
create policy "hs_admin" on public.high_scores for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 9. RPC: qidirish, do'stlar/klub liderlari, klub yaratish/qo'shilish, chaqiriq yakuni
-- ---------------------------------------------------------------------
create or replace function public.search_users(q text)
returns table (id uuid, username text, display_name text, avatar text, level integer, league text, streak integer, weekly_xp integer, relation text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, p.level, p.league, p.streak, p.weekly_xp,
    coalesce((select case when f.status = 'accepted' then 'friend'
                          when f.status = 'pending' and f.requester_id = auth.uid() then 'sent'
                          when f.status = 'pending' then 'incoming'
                          else f.status end
              from public.friendships f
              where (f.requester_id = auth.uid() and f.addressee_id = p.id) or (f.requester_id = p.id and f.addressee_id = auth.uid()) limit 1), 'none') as relation
  from public.profiles p
  where p.id <> auth.uid() and not p.banned and (p.username ilike '%' || q || '%' or p.display_name ilike '%' || q || '%')
  order by p.weekly_xp desc limit 20;
$$;

create or replace function public.friends_list()
returns table (id uuid, username text, display_name text, avatar text, level integer, league text, streak integer, weekly_xp integer, xp integer, last_active_date date, friendship_id bigint, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, p.level, p.league, p.streak, p.weekly_xp, p.xp, p.last_active_date, f.id, f.updated_at
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.weekly_xp desc;
$$;

create or replace function public.respond_friend(p_friendship bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare f public.friendships%rowtype;
begin
  select * into f from public.friendships where id = p_friendship and addressee_id = auth.uid() and status = 'pending';
  if f.id is null then return; end if;
  if p_accept then
    update public.friendships set status = 'accepted', updated_at = now() where id = f.id;
    insert into public.notifications (user_id, actor_id, kind) values (f.requester_id, auth.uid(), 'friend_accept');
  else
    delete from public.friendships where id = f.id;
  end if;
end $$;

create or replace function public.create_club(p_name text, p_emoji text, p_description text, p_public boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.club_members where user_id = auth.uid()) then raise exception 'Siz allaqachon klubdasiz'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.clubs (name, code, emoji, description, is_public, created_by) values (p_name, v_code, coalesce(p_emoji, '🏛️'), p_description, p_public, auth.uid()) returning id into v_id;
  insert into public.club_members (club_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.join_club(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.clubs%rowtype; v_count integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.club_members where user_id = auth.uid()) then raise exception 'Siz allaqachon klubdasiz — avval chiqing'; end if;
  select * into c from public.clubs where upper(code) = upper(p_code);
  if c.id is null then raise exception 'Klub topilmadi'; end if;
  select count(*) into v_count from public.club_members where club_id = c.id;
  if v_count >= 50 then raise exception 'Klub to''lgan (50)'; end if;
  insert into public.club_members (club_id, user_id) values (c.id, auth.uid());
  insert into public.activities (user_id, kind, payload) values (auth.uid(), 'club_join', jsonb_build_object('club', c.name, 'emoji', c.emoji));
  insert into public.notifications (user_id, actor_id, kind, payload) values (c.created_by, auth.uid(), 'club_join', jsonb_build_object('club', c.name));
  return jsonb_build_object('id', c.id, 'name', c.name);
end $$;

create or replace function public.leave_club()
returns void language plpgsql security definer set search_path = public as $$
declare v_club uuid; v_owner uuid; v_next uuid;
begin
  select club_id into v_club from public.club_members where user_id = auth.uid();
  if v_club is null then return; end if;
  delete from public.club_members where user_id = auth.uid();
  select created_by into v_owner from public.clubs where id = v_club;
  if v_owner = auth.uid() then
    select user_id into v_next from public.club_members where club_id = v_club order by joined_at limit 1;
    if v_next is null then delete from public.clubs where id = v_club;
    else update public.clubs set created_by = v_next where id = v_club; update public.club_members set role = 'owner' where club_id = v_club and user_id = v_next; end if;
  end if;
end $$;

create or replace function public.clubs_leaderboard()
returns table (id uuid, name text, emoji text, code text, is_public boolean, members bigint, weekly_xp bigint, total_xp bigint, streak_avg numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.emoji, c.code, c.is_public, count(m.user_id), coalesce(sum(p.weekly_xp),0), coalesce(sum(p.xp),0), round(coalesce(avg(p.streak),0),1)
  from public.clubs c left join public.club_members m on m.club_id = c.id left join public.profiles p on p.id = m.user_id
  group by c.id order by coalesce(sum(p.weekly_xp),0) desc, count(m.user_id) desc limit 50;
$$;

create or replace function public.club_members_list(p_club uuid)
returns table (id uuid, username text, display_name text, avatar text, level integer, streak integer, weekly_xp integer, xp integer, role text, last_active_date date)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, p.level, p.streak, p.weekly_xp, p.xp, m.role, p.last_active_date
  from public.club_members m join public.profiles p on p.id = m.user_id where m.club_id = p_club order by p.weekly_xp desc;
$$;

-- Chaqiriqda natija yozish; ikkalasi o'ynagach g'olib + XP + bildirishnoma + faollik
create or replace function public.submit_challenge_score(p_id uuid, p_score integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.challenges%rowtype; v_uid uuid := auth.uid(); v_winner uuid; v_xp jsonb;
begin
  select * into c from public.challenges where id = p_id for update;
  if c.id is null or (c.challenger_id <> v_uid and c.opponent_id <> v_uid) then raise exception 'forbidden'; end if;
  if c.status <> 'pending' then return jsonb_build_object('status', c.status, 'winner_id', c.winner_id); end if;
  if v_uid = c.challenger_id and c.challenger_score is null then update public.challenges set challenger_score = p_score, updated_at = now() where id = c.id;
  elsif v_uid = c.opponent_id and c.opponent_score is null then update public.challenges set opponent_score = p_score, updated_at = now() where id = c.id;
  end if;
  select * into c from public.challenges where id = p_id;
  if c.challenger_score is not null and c.opponent_score is not null then
    v_winner := case when c.challenger_score > c.opponent_score then c.challenger_id when c.opponent_score > c.challenger_score then c.opponent_id else null end;
    update public.challenges set status = 'done', winner_id = v_winner, updated_at = now() where id = c.id;
    insert into public.notifications (user_id, actor_id, kind, payload)
      values (case when v_uid = c.challenger_id then c.opponent_id else c.challenger_id end, v_uid, 'challenge_result', jsonb_build_object('id', c.id, 'winner_id', v_winner, 'a', c.challenger_score, 'b', c.opponent_score));
    if v_winner is not null then
      insert into public.activities (user_id, kind, payload) values (v_winner, 'challenge_win', jsonb_build_object('score', greatest(c.challenger_score, c.opponent_score), 'vs', case when v_winner = c.challenger_id then c.opponent_id else c.challenger_id end));
    end if;
    -- XP: g'olib 40, mag'lub 10 (ikkinchi o'yinchi o'z XP sini oladi; birinchisi keyingi kirishda bildirishnoma orqali)
    v_xp := public.add_xp(case when v_winner = v_uid then 40 when v_winner is null then 25 else 10 end, 'challenge', jsonb_build_object('id', c.id));
    return jsonb_build_object('status', 'done', 'winner_id', v_winner, 'xp', v_xp, 'a', c.challenger_score, 'b', c.opponent_score);
  else
    insert into public.notifications (user_id, actor_id, kind, payload)
      values (case when v_uid = c.challenger_id then c.opponent_id else c.challenger_id end, v_uid, 'challenge', jsonb_build_object('id', c.id, 'score', p_score));
    return jsonb_build_object('status', 'pending');
  end if;
end $$;

-- Chaqiriq g'olibi (birinchi o'ynagan tomon) keyin XP ni "claim" qiladi
create or replace function public.claim_challenge_xp(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.challenges%rowtype; v_uid uuid := auth.uid(); v_amount integer;
begin
  select * into c from public.challenges where id = p_id and status = 'done' and (challenger_id = v_uid or opponent_id = v_uid);
  if c.id is null then return jsonb_build_object('ok', false); end if;
  if exists (select 1 from public.xp_events x where x.user_id = v_uid and x.reason = 'challenge' and x.meta->>'id' = c.id::text) then return jsonb_build_object('ok', false, 'already', true); end if;
  v_amount := case when c.winner_id = v_uid then 40 when c.winner_id is null then 25 else 10 end;
  return jsonb_build_object('ok', true, 'xp', public.add_xp(v_amount, 'challenge', jsonb_build_object('id', c.id)));
end $$;

-- Do'stlar lentasi (do'stlar + o'zim + klubdoshlar)
create or replace function public.friends_feed(p_limit integer default 40)
returns table (id bigint, user_id uuid, username text, display_name text, avatar text, kind text, payload jsonb, created_at timestamptz, reactions jsonb, my_reaction text)
language sql stable security definer set search_path = public as $$
  select a.id, a.user_id, p.username, p.display_name, p.avatar, a.kind, a.payload, a.created_at,
    coalesce((select jsonb_object_agg(e, n) from (select emoji e, count(*) n from public.reactions r where r.activity_id = a.id group by emoji) s), '{}'::jsonb),
    (select emoji from public.reactions r where r.activity_id = a.id and r.user_id = auth.uid())
  from public.activities a join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid() or public.are_friends(auth.uid(), a.user_id)
     or (public.my_club_id() is not null and a.user_id in (select user_id from public.club_members where club_id = public.my_club_id()))
  order by a.created_at desc limit p_limit;
$$;

-- ---------------------------------------------------------------------
-- 10. TRIGGERLAR: avtomatik faollik yozuvlari
-- ---------------------------------------------------------------------
create or replace function public.trg_activity_achievement()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.achievements%rowtype;
begin
  select * into a from public.achievements where id = new.achievement_id;
  insert into public.activities (user_id, kind, payload) values (new.user_id, 'achievement', jsonb_build_object('code', a.code, 'title', a.title_uz, 'icon', a.icon, 'rarity', a.rarity));
  return new;
end $$;
drop trigger if exists on_achievement_activity on public.user_achievements;
create trigger on_achievement_activity after insert on public.user_achievements for each row execute function public.trg_activity_achievement();

create or replace function public.trg_activity_lesson()
returns trigger language plpgsql security definer set search_path = public as $$
declare l public.lessons%rowtype;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    select * into l from public.lessons where id = new.lesson_id;
    insert into public.activities (user_id, kind, payload) values (new.user_id, 'lesson', jsonb_build_object('title', l.title_uz, 'kind', l.kind, 'stars', new.stars, 'score', new.best_score));
  end if;
  return new;
end $$;
drop trigger if exists on_lesson_activity on public.lesson_progress;
create trigger on_lesson_activity after insert or update on public.lesson_progress for each row execute function public.trg_activity_lesson();

create or replace function public.trg_activity_duel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status <> 'done' and new.winner_id is not null then
    insert into public.activities (user_id, kind, payload) values (new.winner_id, 'duel_win', jsonb_build_object('host', new.host_score, 'guest', new.guest_score));
  end if;
  return new;
end $$;
drop trigger if exists on_duel_activity on public.duels;
create trigger on_duel_activity after update on public.duels for each row execute function public.trg_activity_duel();

-- streak va daraja: profiles yangilanishida
create or replace function public.trg_activity_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.streak <> old.streak and new.streak in (3, 7, 14, 30, 50, 100, 200, 365) then
    insert into public.activities (user_id, kind, payload) values (new.id, 'streak', jsonb_build_object('days', new.streak));
  end if;
  if new.level > old.level and (new.level % 5 = 0 or new.level <= 3) then
    insert into public.activities (user_id, kind, payload) values (new.id, 'level', jsonb_build_object('level', new.level));
  end if;
  return new;
end $$;
drop trigger if exists on_profile_activity on public.profiles;
create trigger on_profile_activity after update on public.profiles for each row execute function public.trg_activity_profile();

-- ---------------------------------------------------------------------
-- 11. ADMIN: ijtimoiy statistika + tozalash
-- ---------------------------------------------------------------------
create or replace function public.admin_social_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'friendships', (select count(*) from public.friendships where status = 'accepted'),
    'pending', (select count(*) from public.friendships where status = 'pending'),
    'clubs', (select count(*) from public.clubs),
    'club_members', (select count(*) from public.club_members),
    'messages_7d', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'challenges_7d', (select count(*) from public.challenges where created_at > now() - interval '7 days'),
    'activities_7d', (select count(*) from public.activities where created_at > now() - interval '7 days'),
    'scores', (select count(*) from public.high_scores));
end $$;

-- Realtime
do $$
declare t text;
begin
  foreach t in array array['notifications','messages','challenges','friendships'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
exception when others then null;
end $$;

-- Grants
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Yangi yutuqlar (ijtimoiy)
insert into public.achievements (code, title_uz, description_uz, icon, rarity, condition, xp_reward) values
('friends_3', 'Jamoaviy ruh', '3 ta do‘st orttirdingiz', '🤝', 'common', '{"metric":"friends","gte":3}', 40),
('challenge_5', 'Chaqiriqchi', '5 ta chaqiriqda g‘alaba', '🥊', 'rare', '{"metric":"challenge_wins","gte":5}', 120),
('blitz_30', 'Chaqmoq', 'Blitzda 30+ ball', '⚡', 'rare', '{"metric":"blitz_best","gte":30}', 100),
('tower_20', 'Minora ustasi', 'Minorada 20-qavat', '🗼', 'epic', '{"metric":"tower_best","gte":20}', 200),
('club_member', 'Klub a‘zosi', 'Klubga qo‘shildingiz', '🏛️', 'common', '{"metric":"in_club","gte":1}', 30)
on conflict (code) do nothing;

-- check_achievements ga yangi metrikalar
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
    'perfect', (select count(*) from public.sessions s where s.user_id = v_uid and s.status = 'done' and s.total > 0 and s.score = s.total),
    'friends', (select count(*) from public.friendships f where f.status = 'accepted' and (f.requester_id = v_uid or f.addressee_id = v_uid)),
    'challenge_wins', (select count(*) from public.challenges c where c.winner_id = v_uid),
    'blitz_best', (select coalesce(max(score),0) from public.high_scores h where h.user_id = v_uid and h.game = 'blitz'),
    'tower_best', (select coalesce(max(score),0) from public.high_scores h where h.user_id = v_uid and h.game = 'tower'),
    'in_club', (select count(*) from public.club_members m where m.user_id = v_uid)
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

-- Yangi questlar
insert into public.quests (code, title_uz, description_uz, kind, metric, target, xp_reward, icon) values
('d_sessions_3', '3 xil sessiya', 'Bugun 3 ta o‘yin sessiyasi o‘ynang', 'daily', 'sessions', 3, 20, '🎲')
on conflict (code) do nothing;
