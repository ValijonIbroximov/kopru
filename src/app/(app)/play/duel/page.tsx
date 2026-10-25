'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fetchUserWords, fetchWords, fetchLessonProgress, fetchLessons, addXp, finishSession, checkAchievements, isLocal } from '@/lib/data';
import { knownWords } from '@/components/exercises/GamePage';
import { buildDuelQuestions } from '@/lib/exercises';
import type { ChoiceExercise, Duel } from '@/lib/types';
import { PageHeader, Empty } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SpeakButton, useSub } from '@/components/exercises/ExerciseViews';
import { useLang } from '@/lib/i18n';

type Phase = 'lobby' | 'waiting' | 'playing' | 'done';
interface Peer { id: string; name: string; avatar: string; score: number; index: number; done: boolean }

function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join(''); }

export default function DuelPage() {
  const { profile, settings } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const sub = useSub();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [duel, setDuel] = useState<Duel | null>(null);
  const [commonAccepted, setCommonAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [me, setMe] = useState<Peer | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const chan = useRef<RealtimeChannel | null>(null);
  const shownAt = useRef(Date.now());
  const meRef = useRef<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const finalized = useRef(false);

  const rowChan = useRef<RealtimeChannel | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code');
    if (c) setCode(c.toUpperCase());
    return () => {
      const sb = supabaseBrowser();
      if (chan.current) sb.removeChannel(chan.current).catch(() => {});
      if (rowChan.current) sb.removeChannel(rowChan.current).catch(() => {});
    };
  }, []);

  const subscribe = useCallback((d: Duel, self: Peer) => {
    const sb = supabaseBrowser();
    if (chan.current) { sb.removeChannel(chan.current).catch(() => {}); chan.current = null; }
    // presence topic ikkala o'yinchida bir xil bo'lishi shart (duel kodi); bitta sahifada faqat bir marta ochiladi
    const ch = sb.channel(`duel:${d.code}`, { config: { presence: { key: self.id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState<Peer>();
      const others = Object.values(st).flat().filter((p) => p.id !== self.id);
      if (others[0]) { const p = { ...others[0], score: peerRef.current?.score ?? 0, index: peerRef.current?.index ?? 0, done: peerRef.current?.done ?? false }; peerRef.current = p; setPeer(p); }
    });
    ch.on('broadcast', { event: 'start' }, () => { setPhase('playing'); shownAt.current = Date.now(); });
    ch.on('broadcast', { event: 'progress' }, ({ payload }) => {
      const p = payload as Peer;
      if (p.id === self.id) return;
      peerRef.current = { ...(peerRef.current ?? p), ...p };
      setPeer({ ...peerRef.current });
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ id: self.id, name: self.name, avatar: self.avatar, score: 0, index: 0, done: false });
    });
    chan.current = ch;
  }, []);

  async function createDuel() {
    if (!profile || busyRef.current) return;
    busyRef.current = true;
    setErr(null);
    try {
      const [all, lp, lessons, uw] = await Promise.all([fetchWords(), fetchLessonProgress(), fetchLessons(), fetchUserWords()]);
      if (knownWords(all, lessons, lp, 0, uw).length < 10) throw new Error('Avval kamida 10 ta so‘zni darslarda mashq qiling.');
      const qs = buildDuelQuestions(knownWords(all, lessons, lp, 30, uw), 10);
      const c = genCode();
      const { data, error } = await supabaseBrowser().from('duels').insert({ code: c, host_id: profile.id, questions: qs }).select('*').maybeSingle();
      if (error || !data) { setErr(error?.message ?? t('error')); return; }
      const self: Peer = { id: profile.id, name: profile.display_name ?? profile.username, avatar: profile.avatar, score: 0, index: 0, done: false };
      meRef.current = self; setMe(self);
      setDuel(data as Duel); setPhase('waiting');
      subscribe(data as Duel, self);
      // mehmon qo'shilganini kuzatish (noyob topic — takroriy obuna xatosiz)
      const sb = supabaseBrowser();
      if (rowChan.current) sb.removeChannel(rowChan.current).catch(() => {});
      rowChan.current = sb.channel(`duel-row:${c}:${Math.random().toString(36).slice(2, 7)}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `code=eq.${c}` }, (p) => {
        const row = p.new as Duel;
        if (row.guest_id && row.status === 'playing') { setDuel(row); setPhase('playing'); shownAt.current = Date.now(); chan.current?.send({ type: 'broadcast', event: 'start', payload: {} }); }
      }).subscribe();
    } catch (e) { setErr(String((e as Error).message)); } finally { busyRef.current = false; }
  }

  async function joinDuel() {
    if (!profile || busyRef.current) return;
    busyRef.current = true;
    try {
    setErr(null);
    const c = code.trim().toUpperCase();
    const { data } = await supabaseBrowser().from('duels').select('*').eq('code', c).eq('status', 'waiting').maybeSingle();
    if (!data) { setErr(l({ uz: 'Bunday kod topilmadi yoki duel allaqachon boshlangan.', tr: 'Böyle bir kod bulunamadı ya da düello zaten başladı.' })); return; }
    if (data.host_id === profile.id) { setErr(l({ uz: 'O‘zingiz bilan duel qila olmaysiz 🙂', tr: 'Kendinizle düello yapamazsınız 🙂' })); return; }
    const uw = await fetchUserWords();
    const known = new Set(uw.filter(w=>w.state!=='new').map(w=>w.word_id));
    if ((data.questions as ChoiceExercise[]).some(q=>q.wordId && !known.has(q.wordId)) && !commonAccepted) { setErr('Duelda siz hali mashq qilmagan so‘zlar bor. Quyidagi umumiy musobaqa roziligini belgilang yoki avval darslarni o‘ting.'); return; }
    const { data: upd, error } = await supabaseBrowser().from('duels').update({ guest_id: profile.id, status: 'playing', updated_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'waiting').is('guest_id', null).select('*').maybeSingle();
    if (error || !upd) { setErr(error?.message ?? l({ uz: 'Qo‘shilib bo‘lmadi', tr: 'Katılma başarısız oldu' })); return; }
    const self: Peer = { id: profile.id, name: profile.display_name ?? profile.username, avatar: profile.avatar, score: 0, index: 0, done: false };
    meRef.current = self; setMe(self);
    setDuel(upd as Duel);
    subscribe(upd as Duel, self);
    setTimeout(() => { chan.current?.send({ type: 'broadcast', event: 'start', payload: {} }); setPhase('playing'); shownAt.current = Date.now(); }, 600);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Duelga qo‘shilib bo‘lmadi.'); } finally { busyRef.current = false; }
  }

  const questions = (duel?.questions ?? []) as ChoiceExercise[];
  const q = questions[idx];

  async function answer(i: number) {
    if (!q || picked !== null || !meRef.current) return;
    setPicked(i);
    const secs = (Date.now() - shownAt.current) / 1000;
    const pts = i === q.answer ? 10 + Math.max(0, Math.round(5 - secs)) : 0;
    const nextIdx = idx + 1;
    const done = nextIdx >= questions.length;
    const m: Peer = { ...meRef.current, score: meRef.current.score + pts, index: nextIdx, done };
    meRef.current = m; setMe({ ...m });
    chan.current?.send({ type: 'broadcast', event: 'progress', payload: m });
    setTimeout(() => { setPicked(null); if (done) setPhase('done'); else { setIdx(nextIdx); shownAt.current = Date.now(); } }, 700);
  }

  // Yakun: ikkala tomon ham tugaganda natijani yozish
  useEffect(() => {
    if (phase !== 'done' || !duel || !me || finalized.current) return;
    const p = peerRef.current;
    const bothDone = p?.done;
    const timer = setTimeout(async () => {
      if (finalized.current) return;
      finalized.current = true;
      const peerScore = p?.score ?? 0;
      const iAmHost = duel.host_id === me.id;
      const win = me.score > peerScore;
      const tie = me.score === peerScore;
      if (iAmHost) {
        const winner = tie ? null : win ? me.id : (duel.guest_id ?? p?.id ?? null);
        await supabaseBrowser().from('duels').update({ status: 'done', host_score: me.score, guest_score: peerScore, winner_id: winner, updated_at: new Date().toISOString() }).eq('id', duel.id);
      }
      const xp = tie ? Math.round((settings.xp.duel_win + settings.xp.duel_lose) / 2) : win ? settings.xp.duel_win : settings.xp.duel_lose;
      await finishSession(null, 'duel', 3, false);
      await addXp(xp, 'duel', { win, tie });
      push({ kind: 'xp', icon: win ? '🏆' : tie ? '🤝' : '⚔️', title: `+${xp} XP`, body: win ? l({ uz: 'G‘alaba!', tr: 'Kazandınız!' }) : tie ? l({ uz: 'Durang', tr: 'Berabere' }) : l({ uz: 'Keyingi safar!', tr: 'Bir dahaki sefere!' }) });
      const ach = await checkAchievements();
      for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `${l({ uz: 'Yutuq', tr: 'Başarı' })}: ${a.title}`, body: `+${a.xp} XP` });
    }, bothDone ? 300 : 20000); // raqib 20 soniyada tugatmasa ham yakunlaymiz
    return () => clearTimeout(timer);
  }, [phase, peer, duel, me, settings, push, l]);

  if (isLocal()) return <Empty icon="⚔️" title={l({ uz: 'Duel Supabase talab qiladi', tr: 'Düello Supabase gerektirir' })} body={l({ uz: 'Demo rejimda real vaqt o‘yini ishlamaydi. README.md bo‘yicha Supabase ulang.', tr: 'Demo modunda gerçek zamanlı oyun çalışmaz. README.md dosyasına göre Supabase bağlayın.' })} action={<Link href="/play" className="btn-secondary">{t('back')}</Link>} />;
  if (settings.features.duel === false) return <Empty icon="🔒" title={l({ uz: 'Duel o‘chirilgan', tr: 'Düello kapalı' })} body={l({ uz: 'Admin bu rejimni vaqtincha o‘chirgan.', tr: 'Yönetici bu modu geçici olarak kapattı.' })} />;

  if (phase === 'lobby') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={l({ uz: '⚔️ Duel', tr: '⚔️ Düello' })} sub={l({ uz: 'Do‘stingiz bilan bir xil 10 ta savol, real vaqtda. Tezlik ham ball beradi.', tr: 'Arkadaşınızla aynı 10 soru, gerçek zamanlı. Hız da puan kazandırır.' })} />
        <div className="grid gap-3">
          <button className="card p-5 text-left hover:border-ember-400/40" onClick={createDuel}>
            <div className="text-2xl">🎯</div><div className="mt-1 font-display text-lg font-bold">{l({ uz: 'Duel yaratish', tr: 'Düello oluştur' })}</div><div className="text-sm text-ink-300">{l({ uz: 'Kod olasiz — do‘stingizga yuboring.', tr: 'Bir kod alırsınız — arkadaşınıza gönderin.' })}</div>
          </button>
          <div className="card p-5">
            <div className="text-2xl">🔑</div><div className="mt-1 font-display text-lg font-bold">{l({ uz: 'Kod bilan qo‘shilish', tr: 'Kodla katıl' })}</div>
            <div className="mt-2 flex gap-2"><input className="input uppercase tracking-widest" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" /><button className="btn-primary" onClick={joinDuel} disabled={code.length < 6}>{l({ uz: 'Kirish', tr: 'Katıl' })}</button></div>
          </div>
          {phase === 'lobby' && <label className="mb-3 flex items-start gap-2 text-xs text-ink-300"><input type="checkbox" checked={commonAccepted} onChange={e=>setCommonAccepted(e.target.checked)}/>Umumiy duelda menga yangi so‘zlar ham bo‘lishiga roziman.</label>}
        {err && <div className="rounded-2xl bg-rose-500/15 p-3 text-sm text-rose-200">{err}</div>}
        </div>
      </div>
    );
  }

  if (phase === 'waiting' && duel) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center">
          <div className="text-xs uppercase tracking-wider text-ink-400">{l({ uz: 'Duel kodi', tr: 'Düello kodu' })}</div>
          <div className="my-3 font-display text-5xl font-extrabold tracking-[0.3em] text-ember-400">{duel.code}</div>
          <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/play/duel?code=${duel.code}`); push({ kind: 'success', title: t('link_copied') }); }}>{t('copy_link')}</button>
          <div className="mt-6 animate-pulse text-sm text-ink-300">{peer ? l({ uz: `${peer.avatar} ${peer.name} ulandi — boshlanmoqda…`, tr: `${peer.avatar} ${peer.name} bağlandı — başlıyor…` }) : l({ uz: 'Raqib kutilmoqda…', tr: 'Rakip bekleniyor…' })}</div>
          <Link href="/play" className="btn-ghost mt-4">{l({ uz: 'Bekor qilish', tr: 'İptal' })}</Link>
        </div>
      </div>
    );
  }

  if (phase === 'playing' && q && me) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div className="card-soft p-3"><div className="truncate">{me.avatar} {me.name} ({t('you')})</div><div className="font-display text-2xl font-bold text-ember-400">{me.score}</div><div className="text-xs text-ink-400">{me.index}/{questions.length}</div></div>
          <div className="card-soft p-3 text-right"><div className="truncate">{peer ? `${peer.avatar} ${peer.name}` : '…'}</div><div className="font-display text-2xl font-bold text-teal-400">{peer?.score ?? 0}</div><div className="text-xs text-ink-400">{peer?.index ?? 0}/{questions.length}</div></div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-400">{idx + 1}/{questions.length} · {sub(q.promptSub)}</div>
          <div className="my-3 flex items-center gap-3"><div className="font-display text-3xl font-bold">{q.prompt}</div>{q.tts && <SpeakButton text={q.tts} size="sm" />}</div>
          <div className="grid gap-2">
            {q.options.map((o, i) => (
              <button key={i} disabled={picked !== null} onClick={() => answer(i)} className={cn('option', picked !== null && i === q.answer && 'option-correct', picked === i && i !== q.answer && 'option-wrong')}>{o}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done' && me) {
    const ps = peer?.score ?? 0;
    const win = me.score > ps, tie = me.score === ps;
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center">
          <div className="text-5xl">{win ? '🏆' : tie ? '🤝' : '⚔️'}</div>
          <h2 className="title mt-2">{win ? l({ uz: 'G‘alaba!', tr: 'Kazandınız!' }) : tie ? l({ uz: 'Durang!', tr: 'Berabere!' }) : l({ uz: 'Keyingi safar yutasiz', tr: 'Bir dahaki sefere kazanırsınız' })}</h2>
          <div className="mt-4 flex justify-center gap-8"><div><div className="font-display text-4xl font-bold text-ember-400">{me.score}</div><div className="text-xs text-ink-400">{t('you')}</div></div><div><div className="font-display text-4xl font-bold text-teal-400">{ps}</div><div className="text-xs text-ink-400">{peer?.name ?? l({ uz: 'raqib', tr: 'rakip' })}{peer && !peer.done ? ` (${l({ uz: 'hali tugatmadi', tr: 'henüz bitirmedi' })})` : ''}</div></div></div>
          <div className="mt-6 grid gap-2"><button className="btn-primary" onClick={() => { const sb = supabaseBrowser(); if (chan.current) { sb.removeChannel(chan.current).catch(() => {}); chan.current = null; } if (rowChan.current) { sb.removeChannel(rowChan.current).catch(() => {}); rowChan.current = null; } finalized.current = false; peerRef.current = null; setPeer(null); setIdx(0); setPhase('lobby'); }}>{l({ uz: 'Yana duel', tr: 'Yeniden düello' })}</button><Link href="/play" className="btn-secondary">{t('games')}</Link></div>
        </div>
      </div>
    );
  }
  return null;
}
