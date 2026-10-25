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
import { useLang } from '@/lib/i18n';

interface TutorReply { reply_tr: string; reply_uz: string; corrections?: { wrong: string; right: string; why: string }[]; new_words?: { tr: string; uz: string }[]; praise?: string }
interface Msg { role: 'user' | 'assistant'; content: string; data?: TutorReply }

// s — AI promptiga boradigan ssenariy (o'zbekcha qoladi, prompt o'zbekcha); t — UI nomi ikki tilda
const SCENARIOS = [
  { id: 'tanishuv', t: { uz: '👋 Tanishuv', tr: '👋 Tanışma' }, s: 'Yangi tanishuv: ism, qayerdan, kasb', sl: { uz: 'Yangi tanishuv: ism, qayerdan, kasb', tr: 'Yeni tanışma: isim, nereli, meslek' } },
  { id: 'kafe', t: { uz: '☕ Kafeda', tr: '☕ Kafede' }, s: 'Kafeda buyurtma berish', sl: { uz: 'Kafeda buyurtma berish', tr: 'Kafede sipariş verme' } },
  { id: 'bozor', t: { uz: '🍉 Bozorda', tr: '🍉 Pazarda' }, s: 'Bozorda narx so‘rash va savdolashish', sl: { uz: 'Bozorda narx so‘rash va savdolashish', tr: 'Pazarda fiyat sorma ve pazarlık' } },
  { id: 'yol', t: { uz: '🗺️ Yo‘l so‘rash', tr: '🗺️ Yol sorma' }, s: 'Shaharda yo‘l so‘rash', sl: { uz: 'Shaharda yo‘l so‘rash', tr: 'Şehirde yol sorma' } },
  { id: 'shifokor', t: { uz: '🏥 Shifokorda', tr: '🏥 Doktorda' }, s: 'Shifokorga shikoyat aytish', sl: { uz: 'Shifokorga shikoyat aytish', tr: 'Doktora şikâyet anlatma' } },
  { id: 'ish', t: { uz: '💼 Ish suhbati', tr: '💼 İş görüşmesi' }, s: 'Oddiy ish suhbati (A2)', sl: { uz: 'Oddiy ish suhbati (A2)', tr: 'Basit iş görüşmesi (A2)' } },
  { id: 'erkin', t: { uz: '💬 Erkin suhbat', tr: '💬 Serbest sohbet' }, s: 'erkin suhbat', sl: { uz: 'erkin suhbat', tr: 'serbest sohbet' } },
];
const KEY = 'kopru.tutor.v2';

export default function TutorPage() {
  const { profile, settings } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const [hydratedKey, setHydratedKey] = useState('');
  const sending = useRef(false);
  const generation = useRef(0);
  const historyKey = `${KEY}:${profile?.id ?? 'local'}`;
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<AiFailure | null>(null);
  const [showUz, setShowUz] = useState(true);
  const [turns, setTurns] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!profile) return;
    generation.current++; sending.current = false; setBusy(false); setHydratedKey(''); setMsgs([]); setTurns(0);
    try { const raw = localStorage.getItem(historyKey); if (raw) { const v = JSON.parse(raw); if (Array.isArray(v.msgs)) setMsgs(v.msgs.filter((m: Msg) => m && typeof m.content === 'string' && ['user','assistant'].includes(m.role)).slice(-24)); setTurns(v.day === new Date().toISOString().slice(0,10) ? Number(v.turns) || 0 : 0); const sc = SCENARIOS.find(x => x.id === v.scenario); if (sc) setScenario(sc); } } catch { /* damaged local history */ }
    setHydratedKey(historyKey);
  }, [historyKey, profile?.id]);
  useEffect(() => {
    if (hydratedKey !== historyKey) return;
    try { localStorage.setItem(historyKey, JSON.stringify({ msgs: msgs.slice(-24), turns, scenario: scenario.id, day: new Date().toISOString().slice(0,10) })); } catch { /* storage unavailable */ }
    bottom.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, [msgs, turns, scenario, hydratedKey, historyKey]);

  useEffect(() => () => { generation.current++; }, []);

  async function send(text?: string) {
    const body = (text ?? input).trim();
    if (!body || sending.current || hydratedKey !== historyKey) return;
    sending.current = true; const requestGeneration = generation.current;
    setInput(''); setFail(null);
    const next: Msg[] = [...msgs, { role: 'user', content: body }];
    setMsgs(next); setBusy(true);
    const res = await callAi<TutorReply>('tutor', { level: profile?.level_cefr ?? 'A1', scenario: scenario.s, messages: next.map((m) => ({ role: m.role, content: m.content })) });
    if (requestGeneration !== generation.current) return;
    sending.current = false; setBusy(false);
    if (res.ok) {
      setMsgs([...next, { role: 'assistant', content: res.data.reply_tr, data: res.data }]);
      const nt = turns + 1; setTurns(nt);
      if (nt <= settings.ai.tutor_max_turns) {
        await finishSession(null, 'tutor', 1, false);
        const r = await addXp(settings.xp.tutor_turn ?? 3, 'tutor');
        if (r?.leveled_up) push({ kind: 'xp', icon: '🆙', title: l({ uz: `${r.level}-daraja!`, tr: `${r.level}. seviye!` }) });
      }
    } else setFail(res);
  }

  const insert = (c: string) => { const el = ref.current; if (!el) return setInput(input + c); const s = el.selectionStart ?? input.length; setInput(input.slice(0, s) + c + input.slice(el.selectionEnd ?? s)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); }); };

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: 'calc(100vh - 9rem)' }}>
      <PageHeader title={`🤖 ${t('tutor')}`} sub={l({ uz: `Turkcha yozing (xato bo‘lsa ham!). Tuzatadi, tarjima qiladi, savol beradi. Har xabar +${settings.xp.tutor_turn} XP (kuniga ${settings.ai.tutor_max_turns} tagacha).`, tr: `Türkçe yazın (hatalı olsa da!). Düzeltir, çevirir, soru sorar. Her mesaj +${settings.xp.tutor_turn} XP (günde en fazla ${settings.ai.tutor_max_turns}).` })}
        right={<button className="chip" onClick={() => setShowUz(!showUz)}>{showUz ? l({ uz: 'UZ: yoqilgan', tr: 'UZ: açık' }) : l({ uz: 'UZ: o‘chiq', tr: 'UZ: kapalı' })}</button>} />
      <div className="mb-4 rounded-2xl border border-teal-400/20 bg-teal-500/10 p-4 text-sm"><b>Shaxsiy murabbiy</b><p className="mt-1 text-ink-300">Suhbat o‘rganilgan so‘zlaringiz va xatolaringizga moslanadi. Faqat tanish so‘zlardan aniq mashq uchun:</p><Link href="/coach" className="mt-2 inline-flex text-teal-300 underline">5 daqiqalik shaxsiy mashq →</Link></div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SCENARIOS.map((s) => <button key={s.id} disabled={busy} onClick={() => { setScenario(s); setMsgs([]); }} className={cn('chip shrink-0 py-1.5 text-sm', scenario.id === s.id && 'border-fuchsia-400 bg-fuchsia-500/20 text-white')}>{l(s.t)}</button>)}
      </div>

      <div className="card flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-ink-300">
            <div className="text-3xl">🤖</div>
            <p className="mt-2">{l({ uz: 'Ssenariy', tr: 'Senaryo' })}: <b className="text-white">{l(scenario.sl)}</b>.</p>
            <p className="mt-1">{l({ uz: 'Boshlang', tr: 'Başlayın' })}: <button className="underline" onClick={() => send('Merhaba! Ben ' + (profile?.display_name ?? 'Valijon') + '. Nasılsın?')}>«Merhaba! Ben {profile?.display_name ?? '…'}. Nasılsın?»</button></p>
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
                  <div className="mb-1 font-semibold text-rose-200">✏️ {l({ uz: 'Tuzatishlar', tr: 'Düzeltmeler' })}</div>
                  {m.data.corrections.filter((c) => c.wrong).map((c, k) => <div key={k} className="text-ink-200"><s className="text-rose-300">{c.wrong}</s> → <b className="text-teal-300">{c.right}</b> — {c.why}</div>)}
                </div>
              )}
              {m.data?.new_words && m.data.new_words.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.data.new_words.filter((w) => w.tr).map((w, k) => <span key={k} className="chip text-[11px]">{w.tr} — {w.uz}</span>)}</div>}
              {m.data?.praise && <div className="mt-1 text-xs text-gold-300">{m.data.praise}</div>}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-ink-400">{l({ uz: 'AI yozmoqda…', tr: 'AI yazıyor…' })}</div>}
        {fail && (
          <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-3 text-sm text-gold-100">
            <b>{fail.reason === 'quota' ? l({ uz: '⏳ AI dam olmoqda.', tr: '⏳ AI dinleniyor.' }) : fail.reason === 'disabled' ? l({ uz: '🔌 AI sozlanmagan.', tr: '🔌 AI ayarlanmamış.' }) : `⚠️ ${t('error')}.`}</b> {fail.message}
            {fail.retryAt && <div className="text-xs">{l({ uz: 'Qayta', tr: 'Tekrar' })}: {new Date(fail.retryAt).toLocaleTimeString('uz-UZ')}</div>}
            <div className="mt-1 text-xs">{l({ uz: 'Shu paytda ', tr: 'Bu arada ' })}<Link className="underline" href="/learn">{l({ uz: 'dialog darslari', tr: 'diyalog dersleri' })}</Link>{l({ uz: 'ni o‘ynang — ular AI’siz ishlaydi.', tr: ' oynayın — AI olmadan çalışır.' })}</div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 mt-3 rounded-2xl border border-white/10 bg-ink-900 p-2">
        <textarea aria-label="Turkcha xabar" maxLength={2000} ref={ref} className="input resize-none py-2" rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Türkçe yazın…" disabled={isLocal()}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <TurkishKeys onInsert={insert} />
          <div className="flex gap-1">
            <button disabled={busy} className="btn-ghost px-2 py-1 text-xs" onClick={() => { setMsgs([]); }}>{l({ uz: 'Tozalash', tr: 'Temizle' })}</button>
            <button className="btn-primary px-3 py-2" onClick={() => send()} disabled={busy || !input.trim()}><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
