'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Mic, Lightbulb, Delete } from 'lucide-react';
import type {
  IntroExercise, ChoiceExercise, TypingExercise, MatchExercise, OrderExercise, ListenExercise, SpeakExercise, HarmonyExercise, FillExercise, TrueFalseExercise,
} from '@/lib/types';
import { checkAnswer, normalizeTr, similarity } from '@/lib/turkish';
import { speak, listenOnce, sttAvailable, ttsAvailable } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useLang, type DictKey } from '@/lib/i18n';

/** exercises.ts dagi o'zbekcha prompt yorliqlarini lug'at kalitiga moslash */
const SUB_KEYS: Record<string, DictKey> = { 'Tarjimasini tanlang': 'choose_translation', 'Turkchasini tanlang': 'choose_turkish', 'Turkchasini yozing': 'write_turkish', 'Tarjimasi?': 'translation', 'Turkchasi?': 'choose_turkish' };
function useSub() { const { t } = useLang(); return (s?: string) => (s && SUB_KEYS[s] ? t(SUB_KEYS[s]) : s ?? ''); }
export { useSub };

export interface ViewProps<T> {
  ex: T;
  onAnswer: (correct: boolean, meta?: { usedHint?: boolean; detail?: string; pairResults?: { wordId?: number; correct: boolean }[]; skipped?: boolean }) => void;
  answered: boolean;
}

export function SpeakButton({ text, size = 'md', auto = false, className }: { text: string; size?: 'sm' | 'md' | 'lg'; auto?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);
  const ok = ttsAvailable();
  const play = async () => { setBusy(true); await speak(text); setBusy(false); };
  useEffect(() => {
    if (!auto || !ok) return;
    const t = setTimeout(() => { speak(text); }, 250);
    return () => clearTimeout(t);
  }, [auto, ok, text]);
  return (
    <button type="button" onClick={play} disabled={!ok}
      className={cn('grid place-items-center rounded-2xl bg-teal-500/20 text-teal-300 transition hover:bg-teal-500/30 disabled:opacity-40', busy && 'animate-pulse',
        size === 'lg' ? 'h-20 w-20' : size === 'md' ? 'h-12 w-12' : 'h-9 w-9', className)} title="🔊">
      <Volume2 size={size === 'lg' ? 32 : size === 'md' ? 20 : 16} />
    </button>
  );
}

const TR_KEYS = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'İ'];
export function TurkishKeys({ onInsert }: { onInsert: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TR_KEYS.map((k) => (
        <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(k)} className="kbd min-w-8 px-2 py-1.5 text-sm">{k}</button>
      ))}
    </div>
  );
}

// ---------------- INTRO ----------------
export function IntroView({ ex, onAnswer }: ViewProps<IntroExercise>) {
  const { t, l } = useLang();
  return (
    <div className="animate-pop">
      <div className="card-soft p-6 text-center">
        <div className="mb-3 text-xs uppercase tracking-wider text-ink-400">{t('new_word')}</div>
        <div className="font-display text-4xl font-bold text-white">{ex.tr}</div>
        <div className="mt-2 text-xl text-ember-300">{ex.uz}</div>
        <div className="mt-4 flex justify-center"><SpeakButton text={ex.tr} size="lg" auto /></div>
        {ex.example_tr && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/[0.04] p-3 text-left text-sm">
            <SpeakButton text={ex.example_tr} size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-white">{ex.example_tr}</div>
              <div className="text-ink-300">{ex.example_uz}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-500">{l({ uz: 'misol · 🔊 eshiting va takrorlang', tr: 'örnek · 🔊 dinleyin ve tekrarlayın' })}</div>
            </div>
          </div>
        )}
        {ex.cognate && (
          <div className={cn('mt-3 rounded-2xl p-3 text-sm', ex.false_friend ? 'bg-rose-500/15 text-rose-200' : 'bg-teal-500/15 text-teal-200')}>
            {ex.false_friend ? l({ uz: '⚠️ Yolg‘on do‘st: ', tr: '⚠️ Yalancı eşdeğer: ' }) : l({ uz: '🌉 Qarindosh: ', tr: '🌉 Akraba: ' })}{ex.cognate}
          </div>
        )}
      </div>
      <button className="btn-primary mt-4 w-full" onClick={() => onAnswer(true, { skipped: true })}>{t('understood')}</button>
    </div>
  );
}

// ---------------- CHOICE ----------------
export function ChoiceView({ ex, onAnswer, answered }: ViewProps<ChoiceExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const sub = useSub();
  const choose = (i: number) => { if (answered || picked !== null) return; setPicked(i); onAnswer(i === ex.answer); };
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{sub(ex.promptSub)}</div>
      <div className="mb-5 flex items-center gap-3">
        <div className="font-display text-3xl font-bold text-white">{ex.prompt}</div>
        {ex.tts && <SpeakButton text={ex.tts} size="sm" />}
      </div>
      <div className="grid gap-2">
        {ex.options.map((o, i) => (
          <button key={i} type="button" onClick={() => choose(i)} disabled={picked !== null}
            className={cn('option', picked !== null && i === ex.answer && 'option-correct', picked === i && i !== ex.answer && 'option-wrong', picked !== null && i !== ex.answer && picked !== i && 'option-dim')}>
            <span className="mr-2 text-ink-400">{i + 1}.</span>{o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- TYPING ----------------
export function TypingView({ ex, onAnswer, answered }: ViewProps<TypingExercise>) {
  const [v, setV] = useState('');
  const [hint, setHint] = useState(false);
  const sub = useSub();
  const { t, l } = useLang();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = () => {
    if (answered || !v.trim()) return;
    const r = checkAnswer(v, ex.answer, ex.accept);
    onAnswer(r !== 'wrong', { usedHint: hint, detail: r === 'close' ? l({ uz: `Deyarli! To‘g‘ri yozilishi: ${ex.answer}`, tr: `Neredeyse! Doğru yazılışı: ${ex.answer}` }) : undefined });
  };
  const insert = (c: string) => { const el = ref.current; if (!el) return setV(v + c); const s = el.selectionStart ?? v.length; const e = el.selectionEnd ?? v.length; const nv = v.slice(0, s) + c + v.slice(e); setV(nv); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); }); };
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{sub(ex.promptSub)}</div>
      <div className="mb-4 font-display text-3xl font-bold text-white">{ex.prompt}</div>
      <input ref={ref} className="input text-lg" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={l({ uz: 'turkcha yozing…', tr: 'Türkçe yazın…' })} disabled={answered} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <TurkishKeys onInsert={insert} />
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setHint(true)} disabled={answered}><Lightbulb size={14} /> {t('hint')}</button>
      </div>
      {hint && !answered && <div className="mt-2 text-sm text-gold-300">{l({ uz: 'Birinchi harf', tr: 'İlk harf' })}: <b>{ex.answer[0]}</b>, {l({ uz: 'uzunligi', tr: 'uzunluk' })}: {ex.answer.replace(/\s/g, '').length}</div>}
      {answered && normalizeTr(v) !== normalizeTr(ex.answer) && <div className="mt-3 text-sm text-ink-200">{t('correct_answer')}: <b className="text-white">{ex.answer}</b></div>}
      {!answered && <button className="btn-primary mt-4 w-full" onClick={submit} disabled={!v.trim()}>{t('check')}</button>}
    </div>
  );
}

// ---------------- MATCH ----------------
export function MatchView({ ex, onAnswer, answered }: ViewProps<MatchExercise>) {
  const left = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ i, t: p.a }))), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ i, t: p.b }))), [ex]);
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const mistakes = useRef(0);
  const { t, l } = useLang();

  useEffect(() => {
    if (selL === null || selR === null) return;
    if (selL === selR) {
      setFlash('ok');
      const nd = new Set(done); nd.add(selL); setDone(nd);
      if (selL !== null) speak(ex.pairs[selL].a);
      setTimeout(() => { setFlash(null); setSelL(null); setSelR(null); }, 250);
      if (nd.size === ex.pairs.length) {
        setTimeout(() => onAnswer(mistakes.current <= 1, { pairResults: ex.pairs.map((p, i) => ({ wordId: p.wordId, correct: !wrong.has(i) })) }), 400);
      }
    } else {
      mistakes.current += 1;
      setFlash('bad');
      const nw = new Set(wrong); nw.add(selL); nw.add(selR); setWrong(nw);
      setTimeout(() => { setFlash(null); setSelL(null); setSelR(null); }, 450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selL, selR]);

  const cls = (i: number, side: 'l' | 'r') => {
    const sel = side === 'l' ? selL : selR;
    return cn('option py-3 text-center', done.has(i) && 'option-correct opacity-50 pointer-events-none', sel === i && !done.has(i) && (flash === 'bad' ? 'option-wrong' : 'border-ember-400 bg-ember-500/20'));
  };
  return (
    <div>
      <div className="mb-4 text-xs uppercase tracking-wider text-ink-400">{t('find_pairs')} · {l({ uz: 'xatolar', tr: 'hatalar' })}: {mistakes.current}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">{left.map((x) => <button key={'l' + x.i} type="button" disabled={answered} className={cls(x.i, 'l')} onClick={() => setSelL(x.i)}>{x.t}</button>)}</div>
        <div className="grid gap-2">{right.map((x) => <button key={'r' + x.i} type="button" disabled={answered} className={cls(x.i, 'r')} onClick={() => setSelR(x.i)}>{x.t}</button>)}</div>
      </div>
    </div>
  );
}

// ---------------- ORDER ----------------
export function OrderView({ ex, onAnswer, answered }: ViewProps<OrderExercise>) {
  const { t, l } = useLang();
  const [pool, setPool] = useState(ex.tokens.map((tok, i) => ({ t: tok, i })));
  const [chosen, setChosen] = useState<{ t: string; i: number }[]>([]);
  const submit = () => {
    const a = chosen.map((c) => normalizeTr(c.t)).join(' ');
    const b = ex.answer.map((tok) => normalizeTr(tok)).join(' ');
    onAnswer(a === b);
  };
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{t('order_words')}</div>
      <div className="mb-4 font-display text-2xl font-bold text-white">{ex.prompt}</div>
      <div className="min-h-16 rounded-2xl border border-dashed border-white/15 p-2">
        <div className="flex flex-wrap gap-2">
          {chosen.map((c, k) => (
            <button key={c.i} type="button" disabled={answered} className="chip py-2 text-base text-white" onClick={() => { setChosen(chosen.filter((_, j) => j !== k)); setPool([...pool, c]); }}>{c.t}</button>
          ))}
          {!chosen.length && <span className="px-2 py-2 text-sm text-ink-400">{l({ uz: 'bu yerga so‘zlarni bosing…', tr: 'kelimelere dokunun…' })}</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {pool.map((p, k) => (
          <button key={p.i} type="button" disabled={answered} className="option w-auto py-2" onClick={() => { setPool(pool.filter((_, j) => j !== k)); setChosen([...chosen, p]); }}>{p.t}</button>
        ))}
      </div>
      {answered && <div className="mt-3 flex items-center gap-2 text-sm text-ink-200">{t('true_')}: <b className="text-white">{ex.answer.join(' ')}</b> {ex.tts && <SpeakButton text={ex.tts} size="sm" />}</div>}
      {!answered && <button className="btn-primary mt-4 w-full" onClick={submit} disabled={!chosen.length}>{t('check')}</button>}
    </div>
  );
}

// ---------------- LISTEN ----------------
export function ListenView({ ex, onAnswer, answered }: ViewProps<ListenExercise>) {
  const { t, l } = useLang();
  const [v, setV] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const insert = (c: string) => setV(v + c);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{ex.options ? t('listen_choose') : t('listen_write')}</div>
      <div className="mb-4 flex items-center gap-3">
        <SpeakButton text={ex.tts} size="lg" auto />
        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={async () => { setSlow(true); await speak(ex.tts, { rate: 0.6 }); setSlow(false); }} disabled={slow}>🐢 {t('slow')}</button>
      </div>
      {ex.options ? (
        <div className="grid gap-2">
          {ex.options.map((o, i) => (
            <button key={i} type="button" disabled={picked !== null} onClick={() => { setPicked(i); onAnswer(normalizeTr(o) === normalizeTr(ex.answer)); }}
              className={cn('option', picked !== null && normalizeTr(o) === normalizeTr(ex.answer) && 'option-correct', picked === i && normalizeTr(o) !== normalizeTr(ex.answer) && 'option-wrong')}>{o}</button>
          ))}
        </div>
      ) : (
        <>
          <input ref={ref} className="input text-lg" value={v} onChange={(e) => setV(e.target.value)} disabled={answered} placeholder={l({ uz: 'eshitganingizni yozing…', tr: 'duyduğunuzu yazın…' })} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Enter' && v.trim() && !answered) { const r = checkAnswer(v, ex.answer); onAnswer(r !== 'wrong', { detail: r === 'close' ? `${l({ uz: 'Deyarli!', tr: 'Neredeyse!' })} ${ex.answer}` : undefined }); } }} />
          <div className="mt-2"><TurkishKeys onInsert={insert} /></div>
          {!answered && <button className="btn-primary mt-4 w-full" disabled={!v.trim()} onClick={() => { const r = checkAnswer(v, ex.answer); onAnswer(r !== 'wrong', { detail: r === 'close' ? `${l({ uz: 'Deyarli!', tr: 'Neredeyse!' })} ${ex.answer}` : undefined }); }}>{t('check')}</button>}
        </>
      )}
      {answered && <div className="mt-3 text-sm text-ink-200">{l({ uz: 'Matn', tr: 'Metin' })}: <b className="text-white">{ex.answer}</b>{ex.translation && <span className="text-ink-300"> — {ex.translation}</span>}</div>}
    </div>
  );
}

// ---------------- SPEAK ----------------
export function SpeakView({ ex, onAnswer, answered }: ViewProps<SpeakExercise>) {
  const [rec, setRec] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const ok = sttAvailable();
  const { t, l } = useLang();
  const start = async () => {
    setRec(true); setHeard(null);
    const r = await listenOnce(8000);
    setRec(false);
    setTries((t) => t + 1);
    if (!r) { setHeard(''); return; }
    const s = similarity(r.transcript, ex.text);
    setHeard(r.transcript); setScore(s);
    if (s >= 0.72) onAnswer(true, { detail: `${l({ uz: 'O‘xshashlik', tr: 'Benzerlik' })}: ${Math.round(s * 100)}%` });
    else if (tries >= 2) onAnswer(false, { detail: `${l({ uz: 'Eshitildi', tr: 'Duyulan' })}: "${r.transcript}" (${Math.round(s * 100)}%)` });
  };
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{t('read_aloud')}</div>
      <div className="mb-1 flex items-center gap-3">
        <div className="font-display text-2xl font-bold text-white">{ex.text}</div>
        <SpeakButton text={ex.text} size="sm" />
      </div>
      <div className="mb-5 text-sm text-ink-300">{ex.translation}</div>
      {ok ? (
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={start} disabled={rec || answered}
            className={cn('grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-ember-500 text-white shadow-glow transition', rec && 'animate-pulse scale-110')}>
            <Mic size={36} />
          </button>
          <div className="text-xs text-ink-400">{rec ? l({ uz: 'Tinglayapman…', tr: 'Dinliyorum…' }) : l({ uz: 'Mikrofonni bosing va gapiring', tr: 'Mikrofona basın ve konuşun' })}</div>
          {heard !== null && (
            <div className={cn('w-full rounded-2xl p-3 text-center text-sm', score !== null && score >= 0.72 ? 'bg-teal-500/15 text-teal-200' : 'bg-white/5 text-ink-200')}>
              {heard ? <>{l({ uz: 'Eshitildi', tr: 'Duyulan' })}: <b>{heard}</b>{score !== null && <> · {Math.round(score * 100)}%</>}</> : l({ uz: 'Hech narsa eshitilmadi. Yana urinib ko‘ring.', tr: 'Hiçbir şey duyulmadı. Tekrar deneyin.' })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-200">{l({ uz: 'Brauzeringizda nutqni tanish yo‘q (Chrome/Edge/Safari’da ishlaydi). Jumlani 3 marta ovoz chiqarib takrorlang va davom eting.', tr: 'Tarayıcınızda konuşma tanıma yok (Chrome/Edge/Safari’de çalışır). Cümleyi 3 kez sesli tekrarlayın ve devam edin.' })}</div>
      )}
      {!answered && <button className="btn-secondary mt-4 w-full" onClick={() => onAnswer(true, { skipped: true })}>{l({ uz: 'O‘qidim, davom →', tr: 'Okudum, devam →' })}</button>}
    </div>
  );
}

// ---------------- HARMONY ----------------
export function HarmonyView({ ex, onAnswer, answered }: ViewProps<HarmonyExercise>) {
  const [picked, setPicked] = useState<string | null>(null);
  const { t } = useLang();
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{t('vowel_harmony')} · {ex.suffixLabel}</div>
      <div className="mb-1 font-display text-3xl font-bold text-white">{ex.stem} <span className="text-ember-400">+ ?</span></div>
      <div className="mb-5 text-sm text-ink-300">{ex.stemUz}</div>
      <div className="grid grid-cols-2 gap-2">
        {ex.options.map((o) => (
          <button key={o} type="button" disabled={picked !== null} onClick={() => { setPicked(o); onAnswer(o === ex.answer); speak(ex.answer); }}
            className={cn('option text-center', picked !== null && o === ex.answer && 'option-correct', picked === o && o !== ex.answer && 'option-wrong')}>{o}</button>
        ))}
      </div>
      {answered && <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-ink-200">📐 {ex.rule}</div>}
    </div>
  );
}

// ---------------- FILL ----------------
export function FillView({ ex, onAnswer, answered }: ViewProps<FillExercise>) {
  const [picked, setPicked] = useState<string | null>(null);
  const { t } = useLang();
  const parts = ex.sentence.split('___');
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-wider text-ink-400">{t('fill_blank')}</div>
      <div className="mb-5 font-display text-2xl font-bold leading-relaxed text-white">
        {parts[0]}<span className={cn('mx-1 inline-block min-w-16 rounded-lg border-b-2 px-2 text-center', picked ? (picked === ex.answer ? 'border-teal-400 text-teal-300' : 'border-rose-500 text-rose-300') : 'border-ember-400 text-ember-300')}>{picked ?? '…'}</span>{parts[1] ?? ''}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ex.options.map((o) => (
          <button key={o} type="button" disabled={picked !== null} onClick={() => { setPicked(o); onAnswer(o === ex.answer); }}
            className={cn('option text-center', picked !== null && o === ex.answer && 'option-correct', picked === o && o !== ex.answer && 'option-wrong')}>{o}</button>
        ))}
      </div>
      {answered && picked !== ex.answer && <div className="mt-3 text-sm text-ink-200">{t('true_')}: <b className="text-white">{ex.sentence.replace('___', ex.answer)}</b></div>}
    </div>
  );
}

// ---------------- TRUE/FALSE ----------------
export function TrueFalseView({ ex, onAnswer, answered }: ViewProps<TrueFalseExercise>) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const { t } = useLang();
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-wider text-ink-400">{t('true_false')}</div>
      <div className="mb-6 font-display text-3xl font-bold text-white">{ex.statement}</div>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((b) => (
          <button key={String(b)} type="button" disabled={picked !== null} onClick={() => { setPicked(b); onAnswer(b === ex.answer); }}
            className={cn('option py-5 text-center text-lg', picked !== null && b === ex.answer && 'option-correct', picked === b && b !== ex.answer && 'option-wrong')}>{b ? `✅ ${t('true_')}` : `❌ ${t('false_')}`}</button>
        ))}
      </div>
    </div>
  );
}

export function BackspaceIcon() { return <Delete size={16} />; }
