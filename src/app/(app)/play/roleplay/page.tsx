'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import GameShell, { Hud, type GameData, type GameResult } from '@/components/games/GameShell';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import type { DialogLine, Lesson } from '@/lib/types';
import { shuffle, cn } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { useLang } from '@/lib/i18n';

const HOWTO = [
  { icon: '🎭', title: { uz: 'Siz — dialog qahramoni', tr: 'Siz — diyalog kahramanı' }, text: { uz: 'Suhbatdosh (A) turkcha gapiradi (🔊). Siz B rolida — 3 variantdan suhbatga mos TO‘G‘RI javobni tanlaysiz.', tr: 'Karşı taraf (A) Türkçe konuşur (🔊). Siz B rolünde — 3 seçenekten sohbete uygun DOĞRU cevabı seçersiniz.' } },
  { icon: '💬', title: { uz: 'Kontekst muhim', tr: 'Bağlam önemli' }, text: { uz: 'Variantlar boshqa dialoglardan olinadi — ma’noga qarang.', tr: 'Seçenekler başka diyaloglardan alınır — anlama bakın.' } },
  { icon: '🎙️', title: { uz: 'Ovoz chiqarib takrorlang', tr: 'Sesli tekrarlayın' }, text: { uz: 'To‘g‘ri javobdan keyin 🔊 eshitib, ovoz chiqarib o‘qing. Har to‘g‘ri javob +10, tez javob +5.', tr: 'Doğru cevaptan sonra 🔊 dinleyip sesli okuyun. Her doğru cevap +10, hızlı cevap +5.' } },
];

interface Scene { lesson: Lesson; lines: DialogLine[] }

function RolePlay({ data, onEnd }: { data: GameData; onEnd: (r: GameResult) => void }) {
  const scenes = useMemo<Scene[]>(() => shuffle(data.lessons.filter((l) => l.content?.dialog && l.content.dialog.length >= 4).map((l) => ({ lesson: l, lines: l.content.dialog! }))), [data]);
  const allB = useMemo(() => scenes.flatMap((s) => s.lines.filter((l) => l.who === 'B')), [scenes]);
  const [si, setSi] = useState(0);
  const [li, setLi] = useState(0);         // joriy A satri indeksi (B javobi li+1)
  const [history, setHistory] = useState<DialogLine[]>([]);
  const [options, setOptions] = useState<DialogLine[]>([]);
  const [picked, setPicked] = useState<DialogLine | null>(null);
  const [score, setScore] = useState(0);
  const [showUz, setShowUz] = useState(true);
  const st = useRef({ correct: 0, wrong: 0, started: Date.now(), shown: Date.now() });
  const { l } = useLang();
  const scene = scenes[si];

  useEffect(() => {
    if (!scene) return;
    const a = scene.lines[li];
    const b = scene.lines[li + 1];
    if (!a || !b) return;
    setHistory((h) => [...h, a]);
    speak(a.tr);
    const dis = shuffle(allB.filter((x) => x.tr !== b.tr && !scene.lines.some((l) => l.tr === x.tr))).slice(0, 2);
    setOptions(shuffle([b, ...dis]));
    setPicked(null);
    st.current.shown = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, li]);

  if (!scene) return <div className="card p-6 text-center text-ink-300">{l({ uz: 'Dialogli darslar topilmadi. Admin → Kontent → Darslar → content.dialog qo‘shing.', tr: 'Diyaloglu ders bulunamadı. Yönetici → İçerik → Dersler → content.dialog ekleyin.' })}</div>;
  const correctLine = scene.lines[li + 1];

  function choose(o: DialogLine) {
    if (picked) return;
    setPicked(o);
    const ms = Date.now() - st.current.shown;
    const ok = o.tr === correctLine.tr;
    if (ok) { st.current.correct += 1; setScore((s) => s + 10 + (ms < 5000 ? 5 : 0)); speak(o.tr); } else { st.current.wrong += 1; }
  }
  function next() {
    setHistory((h) => [...h, correctLine]);
    const nextA = li + 2;
    if (nextA + 1 < scene.lines.length) { setLi(nextA); return; }
    // sahna tugadi
    if (si + 1 >= Math.min(4, scenes.length)) {
      const s = st.current;
      onEnd({ score, correct: s.correct, total: s.correct + s.wrong, xp: Math.min(40, s.correct * 4), durationSec: Math.round((Date.now() - s.started) / 1000), perfect: s.wrong === 0,
        details: [{ label: { uz: 'Sahnalar', tr: 'Sahneler' }, value: si + 1 }, { label: { uz: 'To‘g‘ri', tr: 'Doğru' }, value: s.correct }, { label: { uz: 'Xato', tr: 'Hata' }, value: s.wrong }] });
      return;
    }
    setHistory([]); setLi(0); setSi(si + 1);
  }

  return (
    <div>
      <Hud score={score} extra={<><span className="card-soft px-3 py-1.5 text-xs text-ink-300">{l({ uz: 'Sahna', tr: 'Sahne' })} {si + 1}/{Math.min(4, scenes.length)}</span><button className="card-soft px-3 py-1.5 text-xs text-ink-300" onClick={() => setShowUz(!showUz)}>{showUz ? 'UZ ✓' : 'UZ ✗'}</button></>} />
      <div className="card-soft mb-3 p-3 text-center text-sm"><span className="text-ink-400">{l({ uz: 'Sahna', tr: 'Sahne' })}:</span> <b className="text-white">{scene.lesson.title_uz}</b> <span className="text-ink-400">· {scene.lesson.content.intro?.slice(0, 80)}</span></div>
      <div className="card max-h-[38vh] space-y-2 overflow-y-auto p-4">
        {history.map((ln, k) => (
          <div key={k} className={cn('flex items-end gap-2', ln.who === 'B' && 'flex-row-reverse')}>
            <div className="text-2xl">{ln.who === 'A' ? '🧑' : '🫵'}</div>
            <div className={cn('max-w-[80%] rounded-2xl p-3 text-sm', ln.who === 'A' ? 'bg-white/[0.06]' : 'bg-ember-500/20')}>
              <div className="flex items-start gap-2"><span className="text-white">{ln.tr}</span><SpeakButton text={ln.tr} size="sm" className="h-7 w-7 shrink-0" /></div>
              {showUz && <div className="mt-1 text-xs text-ink-300">{ln.uz}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">{l({ uz: 'Siz nima deysiz? (B)', tr: 'Siz ne dersiniz? (B)' })}</div>
        <div className="grid gap-2">
          {options.map((o) => (
            <button key={o.tr} type="button" disabled={Boolean(picked)} onClick={() => choose(o)}
              className={cn('option text-left', picked && o.tr === correctLine.tr && 'option-correct', picked?.tr === o.tr && o.tr !== correctLine.tr && 'option-wrong')}>
              <div>{o.tr}</div>{(picked || showUz) && <div className="text-xs font-normal text-ink-300">{o.uz}</div>}
            </button>
          ))}
        </div>
        {picked && (
          <div className={cn('mt-3 rounded-2xl p-3 text-sm', picked.tr === correctLine.tr ? 'bg-teal-500/15 text-teal-200' : 'bg-rose-500/15 text-rose-200')}>
            {picked.tr === correctLine.tr ? l({ uz: '✓ To‘g‘ri! Endi ovoz chiqarib takrorlang: ', tr: '✓ Doğru! Şimdi sesli tekrarlayın: ' }) : l({ uz: '✗ Mos javob: ', tr: '✗ Uygun cevap: ' })}<b className="text-white">{correctLine.tr}</b>
            <button className="btn-teal mt-2 w-full" onClick={next}>{l({ uz: 'Davom etish', tr: 'Devam et' })}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolePlayPage() {
  return (
    <GameShell id="roleplay" title={{ uz: 'Rol o‘yini', tr: 'Rol oyunu' }} icon="🎭" desc={{ uz: 'Haqiqiy vaziyatlar: bozor, shifokor, yo‘l so‘rash… Suhbatdoshga mos javobni tanlang — nutq madaniyati va kontekst.', tr: 'Gerçek durumlar: pazar, doktor, yol sorma… Karşı tarafa uygun cevabı seçin — konuşma kültürü ve bağlam.' }} howTo={HOWTO} minWords={0}>
      {(data, onEnd) => <RolePlay data={data} onEnd={onEnd} />}
    </GameShell>
  );
}
