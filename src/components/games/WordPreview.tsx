'use client';
import { useState } from 'react';
import type { Word } from '@/lib/types';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { useLang } from '@/lib/i18n';
export default function WordPreview({ words, onDone, onBack }: { words: Word[]; onDone: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0); const { l } = useLang(); const word=words[index];
  if (!word) return <button className="btn-primary" onClick={onDone}>Davom etish</button>;
  return <section className="card mx-auto max-w-xl p-6 text-center"><div className="text-xs uppercase tracking-wider text-teal-300">{l({uz:'Avval tanishamiz',tr:'Önce öğrenelim'})} · {index+1}/{words.length}</div><h1 lang="tr" className="mt-8 font-display text-4xl font-bold">{word.tr}</h1><p className="mt-3 text-xl text-ember-300">{word.uz}</p><div className="my-6 flex justify-center"><SpeakButton text={word.tr} size="lg"/></div>{word.example_tr && <div className="card-soft mb-6 p-4 text-sm"><p lang="tr">{word.example_tr}</p><p className="mt-2 text-ink-400">{word.example_uz}</p></div>}<p className="mb-5 text-xs text-ink-400">{l({uz:'So‘zni ovoz chiqarib takrorlang. Hozir baholanmaysiz; keyin o‘yinda mashq qilasiz.',tr:'Kelimeyi sesli tekrarlayın. Şimdi puan yok; sonra oyunda çalışacaksınız.'})}</p><button className="btn-primary w-full" onClick={()=>index+1<words.length?setIndex(index+1):onDone()}>{index+1<words.length?l({uz:'Keyingi so‘z',tr:'Sonraki kelime'}):l({uz:'Tayyor — o‘yinni boshlash',tr:'Hazırım — oyuna başla'})}</button><button className="btn-ghost mt-2 w-full" onClick={onBack}>{l({uz:'Orqaga',tr:'Geri'})}</button></section>;
}
