'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n';

/** Mijoz tomonidagi xato butun ilovani "oq ekran" qilmasin — do'stona tiklanish ekrani */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { l, t } = useLang();
  useEffect(() => { console.error('[TezBil] sahifa xatosi:', error); }, [error]);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <div className="text-5xl">🧯</div>
      <h1 className="title mt-4">{l({ uz: 'Nimadir noto‘g‘ri ketdi', tr: 'Bir şeyler ters gitti' })}</h1>
      <p className="subtitle mt-2">{l({ uz: 'Sahifa yuklanishida xato. Progress saqlangan — qayta urinib ko‘ring.', tr: 'Sayfa yüklenirken hata oluştu. İlerlemeniz kayıtlı — tekrar deneyin.' })}</p>
      <pre className="mt-3 max-w-full overflow-x-auto rounded-xl bg-white/5 p-3 text-left text-[11px] text-ink-300">{error.message}</pre>
      <div className="mt-5 flex gap-2">
        <button className="btn-primary" onClick={reset}>{t('retry')}</button>
        <Link href="/dashboard" className="btn-secondary">{l({ uz: 'Bosh sahifa', tr: 'Ana sayfa' })}</Link>
      </div>
    </div>
  );
}
