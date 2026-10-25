'use client';
import { useState } from 'react';
import { speak, setVoicePref, type VoicePref } from '@/lib/speech';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const SAMPLE = 'Merhaba! Ben Türkçe öğreniyorum. Nasılsınız?';

/** Turkcha ovoz tanlash — har varianti 🔊 bilan sinab ko'rish mumkin */
export function VoicePicker({ value, onChange }: { value: VoicePref; onChange: (v: VoicePref) => void }) {
  const { l } = useLang();
  const [playing, setPlaying] = useState<VoicePref | null>(null);
  const [error, setError] = useState(false);
  const opts: { v: VoicePref; t: { uz: string; tr: string }; d: { uz: string; tr: string } }[] = [
    { v: 'emel', t: { uz: '👩 Emel — neyron', tr: '👩 Emel — nöral' }, d: { uz: 'Tabiiy ayol ovozi (Microsoft Neural). Tavsiya etiladi.', tr: 'Doğal kadın sesi (Microsoft Neural). Önerilir.' } },
    { v: 'ahmet', t: { uz: '👨 Ahmet — neyron', tr: '👨 Ahmet — nöral' }, d: { uz: 'Tabiiy erkak ovozi (Microsoft Neural).', tr: 'Doğal erkek sesi (Microsoft Neural).' } },
    { v: 'browser', t: { uz: '💻 Brauzer ovozi', tr: '💻 Tarayıcı sesi' }, d: { uz: 'Oflayn, qurilmaning o‘z ovozi (sifati qurilmaga bog‘liq).', tr: 'Çevrimdışı, cihazın kendi sesi (kalite cihaza bağlı).' } },
  ];
  async function test(v: VoicePref) {
    setVoicePref(v); onChange(v); setPlaying(v);
    setError(false);
    const ok = await speak(SAMPLE).catch(() => false);
    setError(!ok); setPlaying(null);
  }
  return (
    <div className="grid gap-2">
      <p className="text-xs text-ink-400">Neyron ovoz ochilmasa, Google yoki qurilmadagi turkcha ovoz ishlatiladi.</p>
      {error && <p role="status" className="text-xs text-amber-300">Ovoz ochilmadi. Internetni yoki qurilmadagi turkcha ovozni tekshiring.</p>}
      {opts.map((o) => (
        <div key={o.v} className={cn('option flex items-center gap-3 text-left', value === o.v && 'border-accent bg-accent/15')} onClick={() => { setVoicePref(o.v); onChange(o.v); }} role="button" aria-pressed={value === o.v} tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setVoicePref(o.v); onChange(o.v); } }}>
          <div className="min-w-0 flex-1"><div className="font-semibold">{l(o.t)}</div><div className="text-xs font-normal text-ink-300">{l(o.d)}</div></div>
          <button type="button" className={cn('btn-secondary shrink-0 px-3 py-2 text-xs', playing === o.v && 'animate-pulse')} onClick={(e) => { e.stopPropagation(); test(o.v); }}>🔊 {l({ uz: 'Sinash', tr: 'Dene' })}</button>
        </div>
      ))}
    </div>
  );
}
