'use client';
import { useEffect, useState } from 'react';
import { isLocal } from '@/lib/data';
import { speak, setVoicePref, type VoicePref } from '@/lib/speech';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const SAMPLE = 'Merhaba! Ben Türkçe öğreniyorum. Nasılsınız?';

/** Turkcha ovoz tanlash — har varianti 🔊 bilan sinab ko'rish mumkin */
export function VoicePicker({ value, onChange }: { value: VoicePref; onChange: (v: VoicePref) => void }) {
  const { l } = useLang();
  const [playing, setPlaying] = useState<VoicePref | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<{ active: string; activeLabel: string; providers: Record<string, { ok: boolean; ms: number | null; error: string | null; configured: boolean }> } | null>(null);
  const [statusErr, setStatusErr] = useState(false);
  useEffect(() => {
    if (isLocal()) return;
    let alive = true;
    fetch('/api/tts/status').then((r) => r.json()).then((j) => { if (alive) setStatus(j); }).catch(() => { if (alive) setStatusErr(true); });
    return () => { alive = false; };
  }, []);
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
      <p className="text-xs text-ink-400">{l({ uz: 'Neyron ovoz ochilmasa, Google yoki qurilmadagi turkcha ovoz ishlatiladi.', tr: 'Nöral ses açılmazsa Google ya da cihazdaki Türkçe ses kullanılır.' })}</p>
      {!isLocal() && (
        <div className={cn('rounded-2xl border px-3 py-2 text-xs', status ? (status.active === 'azure' || status.active === 'edge' ? 'border-teal-400/30 bg-teal-500/10 text-teal-100' : status.active === 'google' ? 'border-gold-400/30 bg-gold-400/10 text-gold-100' : 'border-rose-400/30 bg-rose-500/10 text-rose-100') : 'border-white/10 bg-white/[0.03] text-ink-300')}>
          {status ? (
            <>
              <div className="font-semibold">{l({ uz: 'Hozirgi ovoz manbai', tr: 'Şu anki ses kaynağı' })}: {status.activeLabel}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] opacity-90">
                {(['azure', 'edge', 'google'] as const).map((k) => { const pr = status.providers?.[k]; if (!pr) return null; return <span key={k} title={pr.error ?? ''}>{pr.ok ? '✅' : pr.configured ? '❌' : '⚪'} {k === 'azure' ? 'Azure' : k === 'edge' ? 'Microsoft Edge' : 'Google'}{pr.ok && pr.ms !== null ? ` ${pr.ms} ms` : ''}</span>; })}
              </div>
              {status.active === 'google' && <div className="mt-1 text-[11px]">{l({ uz: 'Microsoft neyron ovoz hozir ishlamayapti — Google zaxirasi eshitilyapti. Yechim: bepul Azure Speech kalitini qo‘shing (UPDATE-7 → TTS).', tr: 'Microsoft nöral ses şu an çalışmıyor — Google yedeği duyuluyor. Çözüm: ücretsiz Azure Speech anahtarı ekleyin (UPDATE-7 → TTS).' })}</div>}
              {status.active === 'browser' && <div className="mt-1 text-[11px]">{l({ uz: 'Server TTS ishlamayapti — qurilma ovozi eshitilyapti. /api/tts/status ni oching va xatoni ko‘ring.', tr: 'Sunucu TTS çalışmıyor — cihaz sesi duyuluyor. /api/tts/status adresini açıp hatayı görün.' })}</div>}
            </>
          ) : statusErr ? l({ uz: 'TTS holatini olib bo‘lmadi.', tr: 'TTS durumu alınamadı.' }) : l({ uz: 'TTS manbalari tekshirilmoqda…', tr: 'TTS kaynakları kontrol ediliyor…' })}
        </div>
      )}
      {error && <p role="status" className="text-xs text-amber-300">{l({ uz: 'Ovoz ochilmadi. Internetni yoki qurilmadagi turkcha ovozni tekshiring.', tr: 'Ses açılmadı. İnterneti ya da cihazdaki Türkçe sesi kontrol edin.' })}</p>}
      {opts.map((o) => (
        <div key={o.v} className={cn('option flex items-center gap-3 text-left', value === o.v && 'border-accent bg-accent/15')} onClick={() => { setVoicePref(o.v); onChange(o.v); }} role="button" aria-pressed={value === o.v} tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setVoicePref(o.v); onChange(o.v); } }}>
          <div className="min-w-0 flex-1"><div className="font-semibold">{l(o.t)}</div><div className="text-xs font-normal text-ink-300">{l(o.d)}</div></div>
          <button type="button" className={cn('btn-secondary shrink-0 px-3 py-2 text-xs', playing === o.v && 'animate-pulse')} onClick={(e) => { e.stopPropagation(); test(o.v); }}>🔊 {l({ uz: 'Sinash', tr: 'Dene' })}</button>
        </div>
      ))}
    </div>
  );
}
