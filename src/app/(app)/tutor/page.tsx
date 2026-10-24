'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { callAi, addXp, finishSession, isLocal } from '@/lib/data';
import { TurkishKeys, SpeakButton } from '@/components/exercises/ExerciseViews';
import { PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { AiFailure } from '@/lib/types';

interface TutorReply { reply_tr: string; reply_uz: string; corrections?: { wrong: string; right: string; why: string }[]; new_words?: { tr: string; uz: string }[]; praise?: string }
interface Msg { role: 'user' | 'assistant'; content: string; data?: TutorReply }

const SCENARIOS = [
  { id: 'tanishuv', t: '👋 Tanishuv', s: 'Yangi tanishuv: ism, qayerdan, kasb' },
  { id: 'kafe', t: '☕ Kafeda', s: 'Kafeda buyurtma berish' },
  { id: 'bozor', t: '🍉 Bozorda', s: 'Bozorda narx so‘rash va savdolashish' },
  { id: 'yol', t: '🗺️ Yo‘l so‘rash', s: 'Shaharda yo‘l so‘rash' },
  { id: 'shifokor', t: '🏥 Shifokorda', s: 'Shifokorga shikoyat aytish' },
  { id: 'ish', t: '💼 Ish suhbati', s: 'Oddiy ish suhbati (A2)' },
  { id: 'erkin', t: '💬 Erkin suhbat', s: 'erkin suhbat' },
];
const KEY = 'kopru.tutor.v1';

export default function TutorPage() {
  const { profile, settings } = useProfile();
  const { push } = useToast();
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<AiFailure | null>(null);
  const [showUz, setShowUz] = useState(true);
  const [turns, setTurns] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); setMsgs(s.msgs ?? []); setTurns(s.turns ?? 0); const sc = SCENARIOS.find((x) => x.id === s.scenario); if (sc) setScenario(sc); } } catch { /* noop */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ msgs: msgs.slice(-24), turns, scenario: scenario.id })); } catch { /* noop */ } bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, turns, scenario]);

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput(''); setFail(null);
    const next: Msg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setBusy(true);
    const res = await callAi<TutorReply>('tutor', { level: profile?.level_cefr ?? 'A1', scenario: scenario.s, messages: next.map((m) => ({ role: m.role, content: m.content })) });
    setBusy(false);
    if (res.ok) {
      setMsgs([...next, { role: 'assistant', content: res.data.reply_tr, data: res.data }]);
      const nt = turns + 1; setTurns(nt);
      if (nt <= settings.ai.tutor_max_turns) {
        await finishSession(null, 'tutor', 1, false);
        const r = await addXp(settings.xp.tutor_turn ?? 3, 'tutor');
        if (r?.leveled_up) push({ kind: 'xp', icon: '🆙', title: `${r.level}-daraja!` });
      }
    } else setFail(res);
  }

  const insert = (c: string) => { const el = ref.current; if (!el) return setInput(input + c); const s = el.selectionStart ?? input.length; setInput(input.slice(0, s) + c + input.slice(el.selectionEnd ?? s)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); }); };

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: 'calc(100vh - 9rem)' }}>
      <PageHeader title="🤖 AI o‘qituvchi" sub={`Turkcha yozing (xato bo‘lsa ham!). Tuzatadi, tarjima qiladi, savol beradi. Har xabar +${settings.xp.tutor_turn} XP (kuniga ${settings.ai.tutor_max_turns} tagacha).`}
        right={<button className="chip" onClick={() => setShowUz(!showUz)}>{showUz ? 'UZ: yoqilgan' : 'UZ: o‘chiq'}</button>} />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SCENARIOS.map((s) => <button key={s.id} onClick={() => { setScenario(s); setMsgs([]); }} className={cn('chip shrink-0 py-1.5 text-sm', scenario.id === s.id && 'border-fuchsia-400 bg-fuchsia-500/20 text-white')}>{s.t}</button>)}
      </div>

      <div className="card flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-ink-300">
            <div className="text-3xl">🤖</div>
            <p className="mt-2">Ssenariy: <b className="text-white">{scenario.s}</b>.</p>
            <p className="mt-1">Boshlang: <button className="underline" onClick={() => send('Merhaba! Ben ' + (profile?.display_name ?? 'Valijon') + '. Nasılsın?')}>«Merhaba! Ben {profile?.display_name ?? '…'}. Nasılsın?»</button></p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-2xl p-3 text-sm', m.role === 'user' ? 'bg-ember-500/20 text-white' : 'bg-white/[0.05]')}>
              <div className="flex items-start gap-2">
                <div className="flex-1 text-white">{m.content}</div>
                {m.role === 'assistant' && <SpeakButton text={m.content} size="sm" />}
              </div>
              {m.data && showUz && <div className="mt-1 text-xs text-teal-200">{m.data.reply_uz}</div>}
              {m.data?.corrections && m.data.corrections.length > 0 && m.data.corrections.some((c) => c.wrong) && (
                <div className="mt-2 rounded-xl bg-rose-500/10 p-2 text-xs">
                  <div className="mb-1 font-semibold text-rose-200">✏️ Tuzatishlar</div>
                  {m.data.corrections.filter((c) => c.wrong).map((c, k) => <div key={k} className="text-ink-200"><s className="text-rose-300">{c.wrong}</s> → <b className="text-teal-300">{c.right}</b> — {c.why}</div>)}
                </div>
              )}
              {m.data?.new_words && m.data.new_words.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.data.new_words.filter((w) => w.tr).map((w, k) => <span key={k} className="chip text-[11px]">{w.tr} — {w.uz}</span>)}</div>}
              {m.data?.praise && <div className="mt-1 text-xs text-gold-300">{m.data.praise}</div>}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-ink-400">AI yozmoqda…</div>}
        {fail && (
          <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-3 text-sm text-gold-100">
            <b>{fail.reason === 'quota' ? '⏳ AI dam olmoqda.' : fail.reason === 'disabled' ? '🔌 AI sozlanmagan.' : '⚠️ Xato.'}</b> {fail.message}
            {fail.retryAt && <div className="text-xs">Qayta: {new Date(fail.retryAt).toLocaleTimeString('uz-UZ')}</div>}
            <div className="mt-1 text-xs">Shu paytda <Link className="underline" href="/learn">dialog darslari</Link>ni o‘ynang — ular AI’siz ishlaydi.</div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 mt-3 rounded-2xl border border-white/10 bg-ink-900 p-2">
        <textarea ref={ref} className="input resize-none py-2" rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Türkçe yazın…" disabled={isLocal()}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <TurkishKeys onInsert={insert} />
          <div className="flex gap-1">
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setMsgs([]); setTurns(0); }}>Tozalash</button>
            <button className="btn-primary px-3 py-2" onClick={() => send()} disabled={busy || !input.trim()}><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
