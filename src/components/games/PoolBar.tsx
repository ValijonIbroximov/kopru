'use client';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import type { Pool, PoolMode } from '@/lib/wordpool';
import { cn } from '@/lib/utils';

/**
 * O'yin boshlanish ekranidagi so'z havzasi paneli:
 * tanish so'zlar soni, "faqat o'rganilgan / yangi so'zlar ham" tugmasi, kam bo'lsa darsga havola.
 */
export default function PoolBar({ pool, mode, onMode, minWords, nextLesson }: { pool: Pool; mode: PoolMode; onMode: (m: PoolMode) => void; minWords: number; nextLesson: number | null }) {
  const { l, t } = useLang();
  const few = pool.known.length < minWords;
  return (
    <div className="mt-4 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">📚 {pool.known.length} {t('known_words')}</span>
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
          <button type="button" onClick={() => onMode('known')} className={cn('rounded-full px-2.5 py-1 font-medium transition', mode === 'known' ? 'bg-teal-500/25 text-white' : 'text-ink-400 hover:text-white')} title={l({ uz: 'Faqat o‘rgangan so‘zlaringiz chiqadi', tr: 'Yalnızca öğrendiğiniz kelimeler çıkar' })}>{l({ uz: '✓ faqat o‘rganilgan', tr: '✓ yalnızca öğrenilen' })}</button>
          <button type="button" onClick={() => onMode('extended')} className={cn('rounded-full px-2.5 py-1 font-medium transition', mode === 'extended' ? 'bg-ember-500/25 text-white' : 'text-ink-400 hover:text-white')} title={l({ uz: 'Keyingi darslardan yangi so‘zlar ham qo‘shiladi', tr: 'Sonraki derslerden yeni kelimeler de eklenir' })}>{l({ uz: '＋ yangi so‘zlar ham', tr: '＋ yeni kelimeler de' })}</button>
        </div>
        {pool.extended && <span className="chip text-ember-300">{pool.words.length - pool.known.length} {l({ uz: 'yangi so‘z qo‘shildi', tr: 'yeni kelime eklendi' })}</span>}
      </div>
      {few && mode === 'known' && (
        <div className="rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-200">
          {l({ uz: `Bu o‘yin uchun kamida ${minWords} ta o‘rganilgan so‘z kerak (hozir ${pool.known.length}). Darsni o‘ting — yoki «yangi so‘zlar ham» rejimida o‘ynang.`, tr: `Bu oyun için en az ${minWords} öğrenilmiş kelime gerekir (şu an ${pool.known.length}). Ders tamamlayın — ya da «yeni kelimeler de» modunda oynayın.` })}
          <div className="mt-2 flex flex-wrap gap-2">
            {nextLesson && <Link href={`/learn/${nextLesson}`} className="btn-teal px-3 py-1.5 text-xs">📘 {l({ uz: 'Keyingi darsga', tr: 'Sonraki derse' })}</Link>}
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => onMode('extended')}>＋ {l({ uz: 'Yangi so‘zlar bilan o‘ynash', tr: 'Yeni kelimelerle oyna' })}</button>
          </div>
        </div>
      )}
    </div>
  );
}
