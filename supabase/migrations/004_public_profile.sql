-- =====================================================================
-- TezBil — 004: ochiq foydalanuvchi profili (reytingdan profilga o'tish, do'stlik, chat, klub taklifi)
-- Supabase → SQL Editor → New query → to'liq nusxalab → Run. Qayta ishga tushirish xavfsiz.
-- =====================================================================

-- Boshqa foydalanuvchi profilini bitta chaqiruvda olish (RLS ichidagi yutuqlar/so'zlar/darslar uchun security definer)
create or replace function public.public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; p public.profiles%rowtype; uid uuid := auth.uid();
begin
  if uid is null then return null; end if;
  select * into p from public.profiles where lower(username) = lower(trim(p_username)) and not banned limit 1;
  if p.id is null then return null; end if;
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar', p.avatar,
    'level', p.level, 'league', p.league, 'xp', p.xp, 'weekly_xp', p.weekly_xp, 'streak', p.streak, 'best_streak', p.best_streak,
    'level_cefr', p.level_cefr, 'created_at', p.created_at, 'last_active_date', p.last_active_date,
    'allow_dm', coalesce(p.allow_dm, true),
    'relation', case when p.id = uid then 'me' else coalesce((
        select case when f.status = 'accepted' then 'friend'
                    when f.status = 'pending' and f.requester_id = uid then 'sent'
                    when f.status = 'pending' then 'incoming'
                    else f.status end
        from public.friendships f
        where (f.requester_id = uid and f.addressee_id = p.id) or (f.requester_id = p.id and f.addressee_id = uid)
        limit 1), 'none') end,
    'friendship_id', (select f.id from public.friendships f where (f.requester_id = uid and f.addressee_id = p.id) or (f.requester_id = p.id and f.addressee_id = uid) limit 1),
    'words_known', (select count(*) from public.user_words w where w.user_id = p.id and w.state <> 'new'),
    'words_mastered', (select count(*) from public.user_words w where w.user_id = p.id and w.state = 'review' and w.stability >= 21),
    'lessons_done', (select count(*) from public.lesson_progress lp where lp.user_id = p.id and lp.status = 'completed'),
    'rank', (select count(*) + 1 from public.profiles x where not x.banned and (x.weekly_xp > p.weekly_xp or (x.weekly_xp = p.weekly_xp and x.xp > p.xp))),
    'achievements', coalesce((
        select jsonb_agg(jsonb_build_object('code', a.code, 'icon', a.icon, 'title', a.title_uz, 'rarity', a.rarity) order by ua.unlocked_at desc)
        from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where ua.user_id = p.id), '[]'::jsonb),
    'scores', coalesce((
        select jsonb_agg(jsonb_build_object('game', h.game, 'score', h.score, 'plays', h.plays) order by h.score desc)
        from public.high_scores h where h.user_id = p.id and h.game not like 'daily:%'), '[]'::jsonb),
    'club', (select jsonb_build_object('id', c.id, 'name', c.name, 'emoji', c.emoji, 'code', c.code, 'is_public', c.is_public, 'members', (select count(*) from public.club_members m where m.club_id = c.id))
             from public.club_members cm join public.clubs c on c.id = cm.club_id where cm.user_id = p.id limit 1),
    'my_club', (select jsonb_build_object('id', c.id, 'name', c.name, 'emoji', c.emoji, 'code', c.code, 'is_owner', cm.role = 'owner')
             from public.club_members cm join public.clubs c on c.id = cm.club_id where cm.user_id = uid limit 1)
  ) into v;
  return v;
end $$;
grant execute on function public.public_profile(text) to authenticated;

-- Klubga taklif: bildirishnoma (kind = 'club_invite', payload: club, code). notify() allaqachon spamdan himoyalangan.
-- Hech qanday yangi jadval kerak emas — NotificationBell 'club_invite' ni /club?join=KOD ga yo'naltiradi.
