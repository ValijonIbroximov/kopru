'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { fetchMessages, sendMessage, subscribeMessages, type Message, type UserLite } from '@/lib/social';
import { useProfile } from '@/components/AppShell';
import { TurkishKeys } from '@/components/exercises/ExerciseViews';
import { useLang, type L } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const QUICK = ['Merhaba! 👋', 'Hadi, bugün 5 dakika! 🔥', 'Tebrikler! 🎉', 'Düello yapalım mı? ⚔️', 'Kolay gelsin 💪', 'İyi geceler 🌙'];

interface Props { withUser?: UserLite; clubId?: string; title: string; onClose: () => void; members?: Record<string, UserLite> }

export default function ChatPanel({ withUser, clubId, title, onClose, members = {} }: Props) {
  const { profile } = useProfile();
  const { l, lang } = useLang();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<L | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const opts = { withUser: withUser?.id, clubId };

  useEffect(() => {
    let off = () => {};
    (async () => {
      setMsgs(await fetchMessages(opts));
      if (profile) off = subscribeMessages(opts, profile.id, (m) => setMsgs((s) => (s.some((x) => x.id === m.id) ? s : [...s, m])));
    })();
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUser?.id, clubId, profile?.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(t?: string) {
    const body = (t ?? text).trim();
    if (!body || !profile) return;
    setErr(null);
    const optimistic: Message = { id: -Date.now(), sender_id: profile.id, receiver_id: withUser?.id ?? null, club_id: clubId ?? null, text: body, created_at: new Date().toISOString() };
    setMsgs((s) => [...s, optimistic]); setText('');
    const e = await sendMessage(opts, body);
    if (e) { setErr(e); setMsgs((s) => s.filter((m) => m.id !== optimistic.id)); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border border-white/10 bg-ink-900 sm:h-[70vh] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
          <span className="text-2xl">{withUser?.avatar ?? '🏛️'}</span>
          <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{title}</div><div className="text-xs text-ink-400">{withUser ? `Lvl ${withUser.level} · 🔥${withUser.streak}` : l({ uz: 'Klub chati', tr: 'Kulüp sohbeti' })}</div></div>
          <button className="btn-ghost px-2 py-2" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {msgs.length === 0 && <div className="py-8 text-center text-sm text-ink-400">{l({ uz: 'Hali xabar yo‘q. Turkcha yozib ko‘ring — amaliyot! 🇹🇷', tr: 'Henüz mesaj yok. Türkçe yazmayı deneyin — pratik! 🇹🇷' })}</div>}
          {msgs.map((m) => {
            const mine = m.sender_id === profile?.id;
            const who = members[m.sender_id];
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm', mine ? 'bg-ember-500/25 text-white' : 'bg-white/[0.06] text-ink-100')}>
                  {!mine && clubId && who && <div className="text-[10px] text-ink-400">{who.avatar} {who.display_name ?? who.username}</div>}
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className="mt-0.5 text-right text-[10px] text-ink-500">{new Date(m.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">{QUICK.map((q) => <button key={q} className="chip shrink-0" onClick={() => send(q)}>{q}</button>)}</div>
          {err && <div className="mb-2 text-xs text-rose-300">{l(err)}</div>}
          <div className="flex items-end gap-2">
            <textarea className="input max-h-24 resize-none py-2 text-sm" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Türkçe yazın…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn-primary px-3 py-2.5" onClick={() => send()} disabled={!text.trim()}><Send size={16} /></button>
          </div>
          <div className="mt-1.5"><TurkishKeys onInsert={(c) => setText(text + c)} /></div>
        </div>
      </div>
    </div>
  );
}
