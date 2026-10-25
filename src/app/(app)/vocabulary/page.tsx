'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { fetchWords, fetchUserWords } from '@/lib/data';
import { useProfile } from '@/components/AppShell';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { useLang } from '@/lib/i18n';
import type { Word, UserWord } from '@/lib/types';
import { normalizeTr } from '@/lib/turkish';
import { vocabularyRows, type VocabularyFilter } from '@/lib/vocabulary';

export default function VocabularyPage() {
 const { profile }=useProfile();const { l }=useLang();
 const [words,setWords]=useState<Word[]>([]);const [states,setStates]=useState<UserWord[]>([]);
 const [ready,setReady]=useState(false);const [error,setError]=useState(false);const [reload,setReload]=useState(0);
 const [query,setQuery]=useState('');const [filter,setFilter]=useState<VocabularyFilter>('all');const [limit,setLimit]=useState(30);
 useEffect(()=>{if(!profile)return;let active=true;setReady(false);setError(false);
 Promise.all([fetchWords(),fetchUserWords()]).then(([w,s])=>{if(active){setWords(w);setStates(s);setReady(true);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[profile?.id,reload]);
 const all=useMemo(()=>vocabularyRows(words,states),[words,states]);
 const result=useMemo(()=>all.filter(({word,state})=>{
 const match=!query.trim()||normalizeTr(word.tr+' '+word.uz).includes(normalizeTr(query));
 return match && (filter==='all'||filter==='due'&&Date.parse(state.due)<=Date.now()||filter==='weak'&&state.lapses>0||filter==='stable'&&state.state==='review'&&state.stability>=21);
 }),[all,query,filter]);
 const chips: {id:VocabularyFilter;uz:string;tr:string;count:number}[]=[
 {id:'all',uz:'Barchasi',tr:'Tümü',count:all.length},
 {id:'due',uz:'Bugun takrorlash',tr:'Bugün tekrar',count:all.filter(x=>Date.parse(x.state.due)<=Date.now()).length},
 {id:'weak',uz:'Xato bo‘lgan',tr:'Hata yapılan',count:all.filter(x=>x.state.lapses>0).length},
 {id:'stable',uz:'Mustahkam',tr:'Güçlü',count:all.filter(x=>x.state.state==='review'&&x.state.stability>=21).length}];
 return <div className="mx-auto max-w-3xl space-y-5">
 <header className="rounded-3xl border border-teal-400/20 bg-gradient-to-br from-teal-500/15 to-transparent p-6"><div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-teal-300"><BookOpen size={16}/>{l({uz:'O‘quv xotirangiz',tr:'Öğrenme hafızanız'})}</div><h1 className="font-display text-3xl font-bold">{l({uz:'Mening lug‘atim',tr:'Kelimelerim'})}</h1><p className="mt-3 text-sm leading-6 text-ink-300">{l({uz:'Qaysi so‘zlarni mashq qildingiz, qaysi biri qiyin va qachon takrorlash kerak — hammasi bir joyda.',tr:'Çalıştığınız kelimeler, zorlandıklarınız ve tekrar zamanı — hepsi burada.'})}</p><Link href="/coach" className="btn-primary mt-5">{l({uz:'Shaxsiy takrorlash',tr:'Kişisel tekrar'})}<ArrowRight size={16}/></Link></header>
 {error?<div role="alert" className="card p-5">Ma’lumot yuklanmadi.<button className="btn-secondary mt-3" onClick={()=>setReload(n=>n+1)}>Qayta urinish</button></div>:!ready?<p role="status" className="animate-pulse text-ink-400">{l({uz:'Lug‘at yuklanmoqda…',tr:'Kelimeler yükleniyor…'})}</p>:<>
 <div className="flex flex-wrap gap-2">{chips.map(c=><button key={c.id} aria-pressed={filter===c.id} onClick={()=>{setFilter(c.id);setLimit(30);}} className={`chip py-2 ${filter===c.id?'border-teal-400 bg-teal-500/15 text-teal-200':''}`}>{l(c)} <b>{c.count}</b></button>)}</div>
 <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4"><Search size={18} className="text-ink-400"/><input aria-label={l({uz:'So‘z qidirish',tr:'Kelime ara'})} className="w-full bg-transparent py-4 text-sm outline-none" placeholder={l({uz:'Turkcha yoki o‘zbekcha qidiring…',tr:'Türkçe veya Özbekçe arayın…'})} value={query} onChange={e=>{setQuery(e.target.value);setLimit(30);}}/></label>
 <p role="status" className="text-xs text-ink-400">{result.length} {l({uz:'ta so‘z',tr:'kelime'})}</p>
 {!result.length?<div className="card p-7 text-center"><p>{l({uz:'Bu yerda hozircha so‘z yo‘q.',tr:'Henüz kelime yok.'})}</p><Link href="/learn" className="btn-secondary mt-4">{l({uz:'Darslarni ochish',tr:'Derslere git'})}</Link></div>:<div className="grid gap-3 sm:grid-cols-2">{result.slice(0,limit).map(({word,state})=><article key={word.id} className="card p-4"><div className="flex items-start justify-between gap-3"><div><h2 lang="tr" className="text-xl font-semibold">{word.tr}</h2><p className="mt-1 text-sm text-teal-300">{word.uz}</p></div><SpeakButton text={word.tr} size="sm"/></div><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-400"><span className="chip">{state.reps} {l({uz:'takror',tr:'tekrar'})}</span><span className="chip">{state.lapses} {l({uz:'xato',tr:'hata'})}</span></div><p className="mt-3 text-xs text-ink-400">{l({uz:'Keyingi takror:',tr:'Sonraki tekrar:'})} {Date.parse(state.due)<=Date.now()?l({uz:'hozir',tr:'şimdi'}):new Date(state.due).toLocaleDateString('uz-UZ')}</p>{word.lesson_id&&<Link className="mt-3 inline-block text-xs text-ember-300 underline" href={`/learn/${word.lesson_id}`}>{l({uz:'So‘zning darsi',tr:'Kelimenin dersi'})} →</Link>}</article>)}</div>}
 {limit<result.length&&<button className="btn-secondary w-full" onClick={()=>setLimit(n=>n+30)}>{l({uz:'Yana 30 ta ko‘rsatish',tr:'30 kelime daha göster'})}</button>}
 <p className="text-xs leading-5 text-ink-400">{l({uz:'“Mustahkam” — SRS barqarorligi kamida 21 kun bo‘lgan so‘zlar. Bu taxminiy xotira ko‘rsatkichi; CEFR darajasi yoki sertifikat bali emas. “Xato bo‘lgan” tarixdagi xatolarni bildiradi.',tr:'“Güçlü”: SRS kararlılığı en az 21 gün. Tahmini hafıza göstergesidir; CEFR veya sertifika puanı değildir.'})}</p>
 </>}
 </div>;
}
