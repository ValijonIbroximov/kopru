'use client';
/**
 * Ijtimoiy qatlam: do'stlar, bildirishnomalar, faollik lentasi, klublar, xabarlar,
 * chaqiriqlar (asinxron duel), rekordlar. Demo rejimda — bo'sh / localStorage.
 */
import { supabaseBrowser } from './supabase/client';
import { isLocal } from './data';
import type { Exercise } from './types';

export interface UserLite { id: string; username: string; display_name: string | null; avatar: string; level: number; league?: string; streak: number; weekly_xp: number; xp?: number; last_active_date?: string | null }
export interface SearchResult extends UserLite { relation: 'none' | 'friend' | 'sent' | 'incoming' | 'blocked' }
export interface Friend extends UserLite { friendship_id: number; since: string; xp: number }
export interface FriendRequest { id: number; requester: UserLite; created_at: string }
export interface Notification { id: number; user_id: string; actor_id: string | null; kind: string; payload: Record<string, unknown>; read: boolean; created_at: string; actor?: UserLite | null }
export interface Activity { id: number; user_id: string; username: string; display_name: string | null; avatar: string; kind: string; payload: Record<string, unknown>; created_at: string; reactions: Record<string, number>; my_reaction: string | null }
export interface Club { id: string; name: string; code: string; emoji: string; description: string | null; is_public: boolean; created_by: string; created_at: string }
export interface ClubRow { id: string; name: string; emoji: string; code: string; is_public: boolean; members: number; weekly_xp: number; total_xp: number; streak_avg: number }
export interface ClubMember extends UserLite { role: 'owner' | 'member'; xp: number }
export interface Message { id: number; sender_id: string; receiver_id: string | null; club_id: string | null; text: string; created_at: string }
export interface Challenge { id: string; challenger_id: string; opponent_id: string; game: string; questions: Exercise[]; challenger_score: number | null; opponent_score: number | null; status: 'pending' | 'done' | 'declined' | 'expired'; winner_id: string | null; expires_at: string; created_at: string; challenger?: UserLite; opponent?: UserLite }
export interface HighScore { user_id: string; game: string; score: number; meta: Record<string, unknown>; plays: number; updated_at: string; profile?: UserLite }

const LS_SCORES = 'kopru.scores.v1';

async function me() {
  const { data } = await supabaseBrowser().auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Do'stlar ----------
export async function searchUsers(q: string): Promise<SearchResult[]> {
  if (isLocal() || q.trim().length < 2) return [];
  const { data } = await supabaseBrowser().rpc('search_users', { q: q.trim() });
  return (data as SearchResult[]) ?? [];
}
export async function sendFriendRequest(userId: string) {
  if (isLocal()) return;
  const uid = await me();
  if (!uid) return;
  const sb = supabaseBrowser();
  const { error } = await sb.from('friendships').insert({ requester_id: uid, addressee_id: userId });
  if (!error) await sb.rpc('notify', { p_user: userId, p_kind: 'friend_request', p_payload: {} });
  return error?.message;
}
export async function respondFriend(friendshipId: number, accept: boolean) {
  if (isLocal()) return;
  await supabaseBrowser().rpc('respond_friend', { p_friendship: friendshipId, p_accept: accept });
}
export async function removeFriend(friendshipId: number) {
  if (isLocal()) return;
  await supabaseBrowser().from('friendships').delete().eq('id', friendshipId);
}
export async function fetchFriends(): Promise<Friend[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().rpc('friends_list');
  return (data as Friend[]) ?? [];
}
export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  if (isLocal()) return [];
  const uid = await me();
  if (!uid) return [];
  const { data } = await supabaseBrowser().from('friendships').select('id, created_at, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp)').eq('addressee_id', uid).eq('status', 'pending').order('created_at', { ascending: false });
  return ((data ?? []) as unknown as { id: number; created_at: string; requester: UserLite }[]).map((r) => ({ id: r.id, created_at: r.created_at, requester: r.requester }));
}
export async function nudge(userId: string, text?: string) {
  if (isLocal()) return;
  await supabaseBrowser().rpc('notify', { p_user: userId, p_kind: 'nudge', p_payload: { text: text ?? 'Hadi! Bugun 5 daqiqa turkcha 🌉' } });
}

// ---------- Bildirishnomalar ----------
export async function fetchNotifications(limit = 30): Promise<Notification[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().from('notifications').select('*, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp)').order('created_at', { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as Notification[]);
}
export async function markNotificationsRead(ids?: number[]) {
  if (isLocal()) return;
  const uid = await me();
  if (!uid) return;
  let q = supabaseBrowser().from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
  if (ids?.length) q = q.in('id', ids);
  await q;
}
export function subscribeNotifications(userId: string, onNew: (n: Notification) => void) {
  if (isLocal()) return () => {};
  const ch = supabaseBrowser().channel(`notif:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => onNew(p.new as Notification))
    .subscribe();
  return () => { ch.unsubscribe(); };
}

// ---------- Faollik ----------
export async function fetchFeed(limit = 40): Promise<Activity[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().rpc('friends_feed', { p_limit: limit });
  return (data as Activity[]) ?? [];
}
export async function react(activityId: number, emoji: string | null, ownerId: string) {
  if (isLocal()) return;
  const uid = await me();
  if (!uid) return;
  const sb = supabaseBrowser();
  if (!emoji) { await sb.from('reactions').delete().eq('activity_id', activityId).eq('user_id', uid); return; }
  await sb.from('reactions').upsert({ activity_id: activityId, user_id: uid, emoji }, { onConflict: 'activity_id,user_id' });
  if (ownerId !== uid) await sb.rpc('notify', { p_user: ownerId, p_kind: 'reaction', p_payload: { emoji, activity_id: activityId } });
}

// ---------- Klublar ----------
export async function fetchMyClub(): Promise<{ club: Club; members: ClubMember[]; myRole: string } | null> {
  if (isLocal()) return null;
  const uid = await me();
  if (!uid) return null;
  const sb = supabaseBrowser();
  const { data: cm } = await sb.from('club_members').select('club_id, role').eq('user_id', uid).maybeSingle();
  if (!cm) return null;
  const [{ data: club }, { data: members }] = await Promise.all([sb.from('clubs').select('*').eq('id', cm.club_id).maybeSingle(), sb.rpc('club_members_list', { p_club: cm.club_id })]);
  if (!club) return null;
  return { club: club as Club, members: (members as ClubMember[]) ?? [], myRole: cm.role };
}
export async function createClub(name: string, emoji: string, description: string, isPublic: boolean) {
  const { data, error } = await supabaseBrowser().rpc('create_club', { p_name: name, p_emoji: emoji, p_description: description, p_public: isPublic });
  if (error) throw new Error(error.message);
  return data as { id: string; code: string };
}
export async function joinClub(code: string) {
  const { data, error } = await supabaseBrowser().rpc('join_club', { p_code: code });
  if (error) throw new Error(error.message);
  return data as { id: string; name: string };
}
export async function leaveClub() { await supabaseBrowser().rpc('leave_club'); }
export async function fetchClubsLeaderboard(): Promise<ClubRow[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().rpc('clubs_leaderboard');
  return (data as ClubRow[]) ?? [];
}
export async function kickMember(clubId: string, userId: string) {
  await supabaseBrowser().from('club_members').delete().eq('club_id', clubId).eq('user_id', userId);
}
export async function updateClub(id: string, patch: Partial<Club>) {
  await supabaseBrowser().from('clubs').update(patch).eq('id', id);
}

// ---------- Xabarlar ----------
export async function fetchMessages(opts: { withUser?: string; clubId?: string }, limit = 60): Promise<Message[]> {
  if (isLocal()) return [];
  const uid = await me();
  if (!uid) return [];
  let q = supabaseBrowser().from('messages').select('*').order('created_at', { ascending: false }).limit(limit);
  if (opts.clubId) q = q.eq('club_id', opts.clubId);
  else if (opts.withUser) q = q.or(`and(sender_id.eq.${uid},receiver_id.eq.${opts.withUser}),and(sender_id.eq.${opts.withUser},receiver_id.eq.${uid})`);
  const { data } = await q;
  return ((data as Message[]) ?? []).reverse();
}
export async function sendMessage(opts: { withUser?: string; clubId?: string }, text: string) {
  const uid = await me();
  if (!uid) return 'Kirish kerak';
  const sb = supabaseBrowser();
  const { error } = await sb.from('messages').insert({ sender_id: uid, receiver_id: opts.withUser ?? null, club_id: opts.clubId ?? null, text: text.trim().slice(0, 500) });
  if (error) return error.message.includes('row-level') ? 'Faqat do‘stlarga yoki o‘z klubingizga yozish mumkin' : error.message;
  if (opts.withUser) await sb.rpc('notify', { p_user: opts.withUser, p_kind: 'message', p_payload: { text: text.slice(0, 80) } });
  return null;
}
export function subscribeMessages(opts: { withUser?: string; clubId?: string }, myId: string, onNew: (m: Message) => void) {
  if (isLocal()) return () => {};
  const filter = opts.clubId ? `club_id=eq.${opts.clubId}` : `receiver_id=eq.${myId}`;
  const ch = supabaseBrowser().channel(`msg:${opts.clubId ?? opts.withUser}:${myId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (p) => {
      const m = p.new as Message;
      if (opts.withUser && m.sender_id !== opts.withUser) return;
      onNew(m);
    }).subscribe();
  return () => { ch.unsubscribe(); };
}

// ---------- Chaqiriqlar ----------
export async function createChallenge(opponentId: string, questions: Exercise[], game = 'blitz'): Promise<string | null> {
  if (isLocal()) return null;
  const uid = await me();
  if (!uid) return null;
  const { data, error } = await supabaseBrowser().from('challenges').insert({ challenger_id: uid, opponent_id: opponentId, game, questions }).select('id').maybeSingle();
  if (error) throw new Error(error.message.includes('row-level') ? 'Faqat do‘stlarni chaqirish mumkin' : error.message);
  return data?.id ?? null;
}
export async function fetchChallenges(): Promise<Challenge[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().from('challenges')
    .select('*, challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp), opponent:profiles!challenges_opponent_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp)')
    .order('created_at', { ascending: false }).limit(30);
  return ((data ?? []) as unknown as Challenge[]);
}
export async function fetchChallenge(id: string): Promise<Challenge | null> {
  if (isLocal()) return null;
  const { data } = await supabaseBrowser().from('challenges')
    .select('*, challenger:profiles!challenges_challenger_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp), opponent:profiles!challenges_opponent_id_fkey(id, username, display_name, avatar, level, streak, weekly_xp)')
    .eq('id', id).maybeSingle();
  return (data as unknown as Challenge) ?? null;
}
export async function submitChallengeScore(id: string, score: number) {
  const { data, error } = await supabaseBrowser().rpc('submit_challenge_score', { p_id: id, p_score: score });
  if (error) throw new Error(error.message);
  return data as { status: string; winner_id?: string | null; a?: number; b?: number; xp?: unknown };
}
export async function claimChallengeXp(id: string) {
  const { data } = await supabaseBrowser().rpc('claim_challenge_xp', { p_id: id });
  return data as { ok: boolean; already?: boolean } | null;
}
export async function declineChallenge(id: string) {
  await supabaseBrowser().from('challenges').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', id);
}

// ---------- Rekordlar ----------
export async function submitScore(game: string, score: number, meta: Record<string, unknown> = {}): Promise<{ best: boolean; prev: number | null; rank: number }> {
  if (isLocal()) {
    try {
      const all = JSON.parse(localStorage.getItem(LS_SCORES) ?? '{}') as Record<string, number>;
      const prev = all[game] ?? null;
      const best = prev === null || score > prev;
      if (best) { all[game] = score; localStorage.setItem(LS_SCORES, JSON.stringify(all)); }
      return { best, prev, rank: 1 };
    } catch { return { best: true, prev: null, rank: 1 }; }
  }
  const { data } = await supabaseBrowser().rpc('submit_score', { p_game: game, p_score: score, p_meta: meta });
  return (data as { best: boolean; prev: number | null; rank: number }) ?? { best: false, prev: null, rank: 0 };
}
export async function fetchMyBest(game: string): Promise<number | null> {
  if (isLocal()) { try { return (JSON.parse(localStorage.getItem(LS_SCORES) ?? '{}') as Record<string, number>)[game] ?? null; } catch { return null; } }
  const uid = await me();
  if (!uid) return null;
  const { data } = await supabaseBrowser().from('high_scores').select('score').eq('user_id', uid).eq('game', game).maybeSingle();
  return data?.score ?? null;
}
export async function fetchHighScores(game: string, limit = 50): Promise<HighScore[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().from('high_scores').select('*, profile:profiles(id, username, display_name, avatar, level, streak, weekly_xp)').eq('game', game).order('score', { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as HighScore[]);
}

export function dailyKey(d = new Date()) {
  return `daily:${d.toISOString().slice(0, 10)}`;
}

export const GAME_LABELS: Record<string, { title: string; icon: string; unit: string }> = {
  blitz: { title: 'Blitz', icon: '⚡', unit: 'ball' },
  rain: { title: 'So‘z yomg‘iri', icon: '🌧️', unit: 'ball' },
  tower: { title: 'Minora', icon: '🗼', unit: 'qavat' },
  bingo: { title: 'Bingo', icon: '🎱', unit: 'ball' },
  memory: { title: 'Xotira kartalari', icon: '🧠', unit: 'ball' },
  anagram: { title: 'Harf terish', icon: '🔡', unit: 'ball' },
  bridge: { title: 'So‘z ko‘prigi', icon: '🌉', unit: 'ball' },
  roleplay: { title: 'Rol o‘yini', icon: '🎭', unit: 'ball' },
};
