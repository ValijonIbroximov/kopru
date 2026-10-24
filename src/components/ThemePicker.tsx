'use client';
import { THEMES, applyTheme, applyAmbient, type Ambient } from '@/lib/themes';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Mavzu (dizayn) tanlash paneli — jonli oldindan ko'rish: bosilganda butun sahifa darhol o'zgaradi.
 * Onboarding va Profil sahifalarida ishlatiladi.
 */
export function ThemePicker({ value, onChange, compact = false }: { value: string; onChange: (id: string) => void; compact?: boolean }) {
  const { l } = useLang();
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3')}>
      {THEMES.map((th) => {
        const active = th.id === value;
        return (
          <button key={th.id} type="button" onClick={() => { applyTheme(th.id); onChange(th.id); }} title={l(th.desc)}
            className={cn('group relative overflow-hidden rounded-2xl border text-left transition active:scale-[0.98]', active ? 'border-accent ring-2 ring-accent/50' : 'border-white/10 hover:border-white/30')}>
            {/* mini-preview: gradient + 'oyna' */}
            <div className={cn('relative w-full', compact ? 'h-12' : 'h-20')} style={{ background: `linear-gradient(135deg, ${th.swatch[0]}, ${th.swatch[1]} 60%, ${th.swatch[2]})` }}>
              <div className="absolute left-2 top-2 h-1.5 w-8 rounded-full" style={{ background: th.mode === 'dark' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)' }} />
              <div className="absolute left-2 top-5 h-1.5 w-12 rounded-full" style={{ background: th.mode === 'dark' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.2)' }} />
              <div className="absolute bottom-2 right-2 h-5 w-9 rounded-md" style={{ background: `rgb(${th.vars['--accent']})`, opacity: 0.95 }} />
              <div className="absolute bottom-2 left-2 h-5 w-5 rounded-full" style={{ background: `rgb(${th.vars['--accent-2']})`, opacity: 0.9 }} />
              {active && <div className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-ink-950">✓</div>}
            </div>
            {!compact && (
              <div className="px-3 py-2">
                <div className="flex items-center justify-between text-sm font-semibold text-white"><span>{l(th.name)}</span><span className="text-[10px] font-normal text-ink-400">{th.mode === 'dark' ? '🌙' : '☀️'}</span></div>
                <div className="truncate text-[11px] text-ink-400">{l(th.desc)}</div>
              </div>
            )}
            {compact && <div className="truncate px-1.5 py-1 text-center text-[10px] text-ink-300">{l(th.name)}</div>}
          </button>
        );
      })}
    </div>
  );
}

export function AmbientPicker({ value, onChange }: { value: Ambient; onChange: (a: Ambient) => void }) {
  const { l } = useLang();
  const opts: { v: Ambient; t: { uz: string; tr: string }; d: { uz: string; tr: string } }[] = [
    { v: 'full', t: { uz: '✨ To‘liq', tr: '✨ Tam' }, d: { uz: 'jonli fon: tarmoq, harflar, to‘lqinlar', tr: 'canlı arka plan: ağ, harfler, dalgalar' } },
    { v: 'lite', t: { uz: '🌙 Yengil', tr: '🌙 Hafif' }, d: { uz: 'statik fon, animatsiyasiz (kuchsiz telefon, batareya)', tr: 'statik arka plan, animasyonsuz (zayıf telefon, pil)' } },
    { v: 'off', t: { uz: '⬛ O‘chiq', tr: '⬛ Kapalı' }, d: { uz: 'faqat bir xil rang', tr: 'yalnızca düz renk' } },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => <button key={o.v} type="button" onClick={() => { applyAmbient(o.v); onChange(o.v); }} title={l(o.d)} className={cn('chip py-2 text-sm', value === o.v && 'border-accent bg-accent/15 text-white')}>{l(o.t)}</button>)}
    </div>
  );
}
