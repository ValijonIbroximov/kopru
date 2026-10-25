'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { callAi, addXp, finishSession, isLocal } from '@/lib/data';
import { TurkishKeys, SpeakButton } from '@/components/exercises/ExerciseViews';
import { speak, stopSpeech, sttAvailable, listenLive } from '@/lib/speech';
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
  const [pending, setPending] = useState<Msg[] | null>(null);
  const [clock, setClock] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil(((fail?.retryAt ? Date.parse(fail.retryAt) : 0) - clock) / 1000)) || 0;
  useEffect(() => { if (!fail?.retryAt) return; const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, [fail?.retryAt]);
  const [showUz, setShowUz] = useState(true);
  const [turns, setTurns] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  // ---- Ovozli suhbat rejimi: mikrofon → turkcha matn → AI → neyron ovoz → yana mikrofon ----
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [interim, setInterim] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const voiceRef = useRef(false);
  const stopListenRef = useRef<() => void>(() => {});
  const [stt, setStt] = useState(true); // gidratsiya mosligi uchun effektda aniqlanadi
  useEffect(() => { setStt(sttAvailable()); }, []);
  useEffect(() => { try { setAutoSpeak(localStorage.getItem('tezbil.tutor.autospeak') !== '0'); } catch { /* noop */ } }, []);
  useEffect(() => { try { localStorage.setItem('tezbil.tutor.autospeak', autoSpeak ? '1' : '0'); } catch { /* noop */ } }, [autoSpeak]);
  useEffect(() => () => { voiceRef.current = false; stopListenRef.current(); stopSpeech(); }, []);

  function stopVoice() { voiceRef.current = false; setVoiceMode(false); setVoiceState('idle'); setInterim(''); stopListenRef.current(); stopSpeech(); }
  async function listenTurn() {
    if (!voiceRef.current) return;
    setVoiceState('listening'); setInterim('');
    const { result, stop } = listenLive({ onInterim: setInterim, timeoutMs: 12_000 });
    stopListenRef.current = stop;
    const r = await result;
    stopListenRef.current = () => {};
    if (!voiceRef.current) return;
    const text = r?.transcript?.trim();
    if (!text) { setVoiceState('idle'); setInterim(''); return; } // jim turdi — foydalanuvchi qayta bosadi
    setInterim(''); setVoiceState('thinking');
    await send(text);
  }
  function startVoice() {
    if (!stt || isLocal()) return;
    voiceRef.current = true; setVoiceMode(true);
    listenTurn();
  }

  useEffect(() => {
    if (!profile) return;
    generation.current++; sending.current = false; setBusy(false); setHydratedKey(''); setMsgs([]); setTurns(0); setFail(null); setPending(null);
    try { const raw = localStorage.getItem(historyKey); if (raw) { const v = JSON.parse(raw); if (Array.isArray(v.msgs)) setMsgs(v.msgs.filter((m: Msg) => m && typeof m.content === 'string' && ['user','assistant'].includes(m.role)).slice(-24)); setTurns(v.day === new Date().toISOString().slice(0,10) ? Number(v.turns) || 0 : 0); const sc = SCENARIOS.find(x => x.id === v.scenario); if (sc) setScenario(sc); } } catch { /* damaged local history */ }
    setHydratedKey(historyKey);
  }, [historyKey, profile?.id]);
  useEffect(() => {
    if (hydratedKey !== historyKey) return;
    try { localStorage.setItem(historyKey, JSON.stringify({ msgs: msgs.slice(-24), turns, scenario: scenario.id, day: new Date().toISOString().slice(0,10) })); } catch { /* storage unavailable */ }
    bottom.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, [msgs, turns, scenario, hydratedKey, historyKey]);

  useEffect(() => () => { generation.current++; }, []);

  async function send(text?: string, retry = false) {
    const body = (text ?? input).trim();
    if ((!body && !retry) || sending.current || remaining > 0 || isLocal() || hydratedKey !== historyKey) return;
    sending.current = true; const requestGeneration = generation.current;
    if (!retry) setInput(''); setFail(null);
    const next: Msg[] = retry && pending ? pending : [...msgs, { role: 'user', content: body }];
    setPending(next);
    setMsgs(next); setBusy(true);
    const res = await callAi<TutorReply>('tutor', { level: profile?.level_cefr ?? 'A1', scenario: scenario.s, messages: next.slice(-6).map((m) => ({ role: m.role, content: m.content })) });
    if (requestGeneration !== generation.current) return;
    sending.current = false; setBusy(false);
    if (res.ok) {
      setPending(null);
      setMsgs([...next, { role: 'assistant', content: res.data.reply_tr, data: res.data }]);
      const nt = turns + 1; setTurns(nt);
      // Ovozli suhbat: javobni o'qib beramiz, so'ng yana tinglaymiz (hands-free)
      if (voiceRef.current || autoSpeak) {
        setVoiceState('speaking');
        await speak(res.data.reply_tr).catch(() => false);
        if (voiceRef.current) { setTimeout(() => listenTurn(), 250); } else setVoiceState('idle');
      }
      if (nt <= settings.ai.tutor_max_turns) {
        await finishSession(null, 'tutor', 1, false);
        const r = await addXp(settings.xp.tutor_turn ?? 3, 'tutor');
        if (r?.leveled_up) push({ kind: 'xp', icon: '🆙', title: l({ uz: `${r.level}-daraja!`, tr: `${r.level}. seviye!` }) });
      }
    } else { setClock(Date.now()); setFail(res); if (voiceRef.current) { voiceRef.current = false; setVoiceMode(false); setVoiceState('idle'); } }
  }

  const insert = (c: string) => { const el = ref.current; if (!el) return setInput(input + c); const s = el.selectionStart ?? input.length; setInput(input.slice(0, s) + c + input.slice(el.selectionEnd ?? s)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); }); };

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: 'calc(100vh - 9rem)' }}>
      <PageHeader title={`🤖 ${t('tutor')}`} sub={l({ uz: `Turkcha yozing (xato bo‘lsa ham!). Tuzatadi, tarjima qiladi, savol beradi. Har xabar +${settings.xp.tutor_turn} XP (kuniga ${settings.ai.tutor_max_turns} tagacha).`, tr: `Türkçe yazın (hatalı olsa da!). Düzeltir, çevirir, soru sorar. Her mesaj +${settings.xp.tutor_turn} XP (günde en fazla ${settings.ai.tutor_max_turns}).` })}
        right={<div className="flex flex-wrap gap-1.5"><button className="chip" onClick={() => setShowUz(!showUz)}>{showUz ? l({ uz: 'UZ: yoqilgan', tr: 'UZ: açık' }) : l({ uz: 'UZ: o‘chiq', tr: 'UZ: kapalı' })}</button><button className={cn('chip', autoSpeak && 'border-teal-400/50 text-teal-300')} title={l({ uz: 'AI javobini avtomatik o‘qib berish', tr: 'AI cevabını otomatik seslendir' })} onClick={() => { setAutoSpeak(!autoSpeak); if (autoSpeak) stopSpeech(); }}>{autoSpeak ? <Volume2 size={12} /> : <VolumeX size={12} />} {l({ uz: 'ovoz', tr: 'ses' })}</button></div>} />
      <div className="mb-3 rounded-2xl border border-teal-400/20 bg-teal-500/10 p-3 text-sm"><b>{l({ uz: 'Shaxsiy murabbiy', tr: 'Kişisel koç' })}</b> <span className="text-ink-300">{l({ uz: 'Suhbat o‘rganilgan so‘zlaringiz va xatolaringizga moslanadi. Faqat tanish so‘zlardan aniq mashq uchun:', tr: 'Sohbet öğrendiğiniz kelimelere ve hatalarınıza uyarlanır. Yalnızca bilinen kelimelerle kesin alıştırma için:' })}</span> <Link href="/coach" className="text-teal-300 underline">{l({ uz: '5 daqiqalik shaxsiy mashq →', tr: '5 dakikalık kişisel alıştırma →' })}</Link></div>
      {/* Ovozli suhbat paneli */}
      <div className={cn('mb-3 rounded-2xl border p-3 text-sm transition', voiceMode ? 'border-fuchsia-400/40 bg-fuchsia-500/10' : 'border-white/10 bg-white/[0.03]')}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">🎙️ {l({ uz: 'Ovozli suhbat', tr: 'Sesli sohbet' })} <span className="text-xs font-normal text-ink-400">· {l({ uz: 'bepul: brauzer mikrofoni + AI + neyron ovoz', tr: 'ücretsiz: tarayıcı mikrofonu + AI + nöral ses' })}</span></div>
            <div className="text-xs text-ink-300">
              {!stt ? l({ uz: 'Brauzeringiz nutqni tanimaydi — Chrome, Edge yoki Safari ishlating.', tr: 'Tarayıcınız konuşmayı tanımıyor — Chrome, Edge ya da Safari kullanın.' })
                : isLocal() ? t('requires_supabase')
                : voiceState === 'listening' ? <span className="text-fuchsia-200">● {l({ uz: 'Tinglayapman… turkcha gapiring', tr: 'Dinliyorum… Türkçe konuşun' })}{interim ? ` — «${interim}»` : ''}</span>
                : voiceState === 'thinking' ? l({ uz: 'AI o‘ylayapti…', tr: 'AI düşünüyor…' })
                : voiceState === 'speaking' ? l({ uz: '🔊 O‘qituvchi gapiryapti…', tr: '🔊 Öğretmen konuşuyor…' })
                : voiceMode ? l({ uz: 'Jim turdingiz. Mikrofonni bosib davom eting.', tr: 'Sessiz kaldınız. Devam etmek için mikrofona basın.' })
                : l({ uz: 'Bosing, turkcha gapiring — o‘qituvchi javobini ovoz bilan eshitasiz, so‘ng yana sizni tinglaydi.', tr: 'Basın, Türkçe konuşun — öğretmenin cevabını sesli duyarsınız, sonra sizi yeniden dinler.' })}
            </div>
          </div>
          {!voiceMode ? (
            <button className="btn-primary px-4 py-2" disabled={!stt || isLocal() || busy || remaining > 0} onClick={startVoice}><Mic size={16} /> {l({ uz: 'Boshlash', tr: 'Başla' })}</button>
          ) : voiceState === 'idle' ? (
            <div className="flex gap-1.5"><button className="btn-primary px-3 py-2" onClick={() => { voiceRef.current = true; listenTurn(); }}><Mic size={16} /> {l({ uz: 'Gapirish', tr: 'Konuş' })}</button><button className="btn-secondary px-3 py-2" onClick={stopVoice}><MicOff size={16} /></button></div>
          ) : (
            <button className="btn-secondary px-3 py-2 text-rose-300" onClick={stopVoice}><Square size={14} /> {l({ uz: 'To‘xtatish', tr: 'Durdur' })}</button>
          )}
        </div>
        {voiceMode && voiceState === 'listening' && <div className="mt-2 flex items-end gap-0.5">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="w-1.5 rounded-full bg-fuchsia-400/70" style={{ height: 6 + ((i * 7) % 14), animation: `pulse ${0.6 + (i % 5) * 0.15}s ease-in-out ${i * 0.05}s infinite alternate` }} />)}</div>}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SCENARIOS.map((s) => <button key={s.id} disabled={busy} onClick={() => { setScenario(s); setMsgs([]); setPending(null); }} className={cn('chip shrink-0 py-1.5 text-sm', scenario.id === s.id && 'border-fuchsia-400 bg-fuchsia-500/20 text-white')}>{l(s.t)}</button>)}
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
            <b>{fail.reason === 'quota' ? l({ uz: '⏳ AI limiti vaqtincha tugadi.', tr: '⏳ AI dinleniyor.' }) : fail.reason === 'disabled' ? l({ uz: '🔌 AI sozlanmagan.', tr: '🔌 AI ayarlanmamış.' }) : `⚠️ ${t('error')}.`}</b> {fail.message}
            {pending && <button className="btn-secondary mt-2 w-full" disabled={busy || remaining > 0} onClick={() => send(undefined, true)}>{remaining > 0 ? l({ uz: `Qayta urinish: ${remaining} soniyadan so‘ng`, tr: `Tekrar dene: ${remaining} saniye sonra` }) : l({ uz: 'Shu xabarni qayta yuborish', tr: 'Bu mesajı yeniden gönder' })}</button>}
            {fail.retryAt && <div className="text-xs">{l({ uz: 'Qayta', tr: 'Tekrar' })}: {new Date(fail.retryAt).toLocaleTimeString('uz-UZ')}</div>}
            {fail.detail && <div className="mt-1 text-[11px] opacity-70">{fail.detail}</div>}
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
            <button disabled={busy} className="btn-ghost px-2 py-1 text-xs" onClick={() => { setMsgs([]); setPending(null); }}>{l({ uz: 'Tozalash', tr: 'Temizle' })}</button>
            <button className="btn-primary px-3 py-2" onClick={() => send()} aria-label="Xabar yuborish" disabled={busy || remaining > 0 || isLocal() || !input.trim()}><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
