'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Clock3, Target, Volume2, BookOpen, Sparkles } from 'lucide-react';
import { useProfile } from '@/components/AppShell';
import { fetchWords, fetchUserWords } from '@/lib/data';
import { coachWords } from '@/lib/coach';
import { choiceTrToUz, choiceUzToTr, typingUzToTr, listenExercise } from '@/lib/exercises';
import ExerciseRunner from '@/components/exercises/ExerciseRunner';
import SessionEnd from '@/components/exercises/SessionEnd';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import type { Exercise, Word, UserWord, SessionSummary } from '@/lib/types';
import { useLang } from '@/lib/i18n';

export default function CoachPage() {
  const { profile } = useProfile();
  const { l } = useLang();
  const [words, setWords] = useState<Word[]>([]);
  const [states, setStates] = useState<UserWord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [audio, setAudio] = useState(true);
  const [queue, setQueue] = useState<Exercise[] | null>(null);
  const [end, setEnd] = useState<{ summary: SessionSummary; id: string | null } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!profile) return;
    let active = true; setReady(false); setError('');
    Promise.all([fetchWords(), fetchUserWords()]).then(([w,s]) => { if (active) { setWords(coachWords(w,s)); setStates(s); setReady(true); } }).catch(() => { if (active) setError('Ma’lumot yuklanmadi. Internetni tekshirib qayta urinib ko‘ring.'); });
    return () => { active = false; };
  }, [profile?.id, reload]);
  const due = states.filter(s => s.state !== 'new' && Date.parse(s.due) <= Date.now()).length;
  const weak = states.filter(s => s.lapses > 0).length;
  function start() {
    const selected = words.slice(0, minutes === 3 ? 4 : minutes === 5 ? 7 : 12);
    const result: Exercise[] = [];
    selected.forEach((w,i) => {
      result.push(i % 2 ? choiceUzToTr(w, words) : choiceTrToUz(w, words));
      result.push(audio && i % 2 === 0 ? listenExercise(w, words) : typingUzToTr(w));
    });
    setQueue(result);
  }
  if (end) return <SessionEnd summary={end.summary} sessionId={end.id} nextHref="/dashboard" nextLabel={l({uz:'Bosh sahifa',tr:'Ana sayfa'})} onRetry={() => { setEnd(null); setQueue(null); setReload(v=>v+1); }} mistakes={words.filter(w => end.summary.results.some(r=>r.wordId===w.id && !r.correct)).map(w=>({tr:w.tr,uz:w.uz}))} />;
  if (queue) return <ExerciseRunner exercises={queue} mode="coach" title={l({uz:'Shaxsiy mashq',tr:'Kişisel çalışma'})} exitHref="/dashboard" onFinish={(summary,id)=>{setEnd({summary,id});setQueue(null);}} />;
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="flex items-center justify-between text-xs text-ink-400"><span className="flex items-center gap-2"><Brain size={16}/> {l({uz:'SIZNING O‘QUV MUHITINGIZ',tr:'ÖĞRENME ALANINIZ'})}</span><span className="chip">{l({uz:'AI kalitisiz ishlaydi',tr:'AI anahtarı gerekmez'})}</span></div>
    <section className="relative overflow-hidden rounded-[28px] border border-teal-400/20 bg-gradient-to-br from-teal-500/15 via-ink-900 to-ink-950 p-6 sm:p-9">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1 text-xs text-teal-300"><Sparkles size={14}/>{l({uz:'Kichik qadam. Aniq natija.',tr:'Küçük adım. Net sonuç.'})}</div>
      <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{l({uz:'Bugun o‘zingizdan',tr:'Bugün kendinizden'})}<br/><span className="text-teal-300">{l({uz:'bir qadam oldinga.',tr:'bir adım ileri.'})}</span></h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-ink-300">{l({uz:'Avval unutish arafasidagi so‘zlar, keyin qiyin bo‘lganlari. Faqat oldin mashq qilgan lug‘atingiz. Shoshilish va taymer yo‘q.',tr:'Önce tekrar zamanı gelen, sonra zorlandığınız kelimeler. Yalnızca çalıştığınız sözcükler. Acele ve sayaç yok.'})}</p>
      <div className="mt-7 grid grid-cols-3 gap-3">{[[words.length,'Tanish so‘z','Bilinen'],[due,'Takrorlash','Tekrar'],[weak,'Qiyin so‘z','Zor kelime']].map(([n,uz,tr])=><div key={String(uz)} className="rounded-2xl border border-white/5 bg-white/[0.04] p-3"><div className="font-display text-2xl font-bold">{ready?n:'—'}</div><div className="mt-1 text-[11px] text-ink-300">{l({uz:String(uz),tr:String(tr)})}</div></div>)}</div>
    </section>
    {error ? <div role="alert" className="card p-5">{error}<button className="btn-secondary mt-3" onClick={()=>setReload(v=>v+1)}>Qayta urinish</button></div> : !ready ? <p role="status" className="animate-pulse text-sm text-ink-400">{l({uz:'Shaxsiy reja tayyorlanmoqda…',tr:'Kişisel plan hazırlanıyor…'})}</p> : words.length < 4 ? <section className="card p-6"><BookOpen className="text-teal-300"/><h2 className="mt-3 text-xl font-bold">{l({uz:'Avval tanishib olaylik',tr:'Önce öğrenelim'})}</h2><p className="mt-2 text-sm text-ink-300">{l({uz:'Mashq uchun kamida 4 ta tanish so‘z kerak. Birinchi darsda so‘zlarni o‘rganing — keyin murabbiy ularni eslab qolishga yordam beradi.',tr:'En az 4 bilinen kelime gerekli. Önce bir derste kelimeleri öğrenin.'})}</p><Link href="/learn" className="btn-primary mt-4">{l({uz:'Darsni ochish',tr:'Derse git'})}<ArrowRight size={16}/></Link></section> : <section className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Clock3 size={18}/>{l({uz:'Qancha vaqt ajratamiz?',tr:'Ne kadar çalışalım?'})}</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">{[3,5,10].map(n=><button key={n} aria-pressed={minutes===n} onClick={()=>setMinutes(n)} className={`rounded-2xl border p-4 text-left transition ${minutes===n?'border-teal-400 bg-teal-500/15':'border-white/10 hover:bg-white/5'}`}><b className="text-xl">{n}</b><span className="ml-1 text-xs">{l({uz:'daq.',tr:'dk.'})}</span><div className="mt-1 text-xs text-ink-400">{n===3?l({uz:'Yengil',tr:'Hafif'}):n===5?l({uz:'Muvozanat',tr:'Dengeli'}):l({uz:'Chuqurroq',tr:'Yoğun'})}</div></button>)}</div>
      <label className="mt-5 flex items-center gap-3 text-sm text-ink-300"><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)} className="h-4 w-4 accent-teal-400"/><Volume2 size={16}/>{l({uz:'Tinglash mashqlarini qo‘shish',tr:'Dinleme alıştırmaları ekle'})}</label>
      <button onClick={start} className="btn-primary mt-5 w-full py-4">{l({uz:'Shaxsiy mashqni boshlash',tr:'Kişisel çalışmaya başla'})}<ArrowRight size={18}/></button>
      <p className="mt-2 text-center text-[11px] text-ink-400">{l({uz:'Vaqt taxminiy. Xato so‘zlar sessiya oxirida yana qaytadi.',tr:'Süre tahminidir. Hatalar oturum sonunda tekrarlanır.'})}</p>
    </section>}
    {ready && words.length>0 && <details className="card p-5"><summary className="cursor-pointer text-sm font-semibold">{l({uz:'Nega aynan shu so‘zlar?',tr:'Neden bu kelimeler?'})}</summary><p className="my-3 text-xs text-ink-400">{l({uz:'Takrorlash muddati → xatolar ulushi → oxirgi mashq sanasi.',tr:'Tekrar zamanı → hata oranı → son çalışma tarihi.'})}</p><div className="grid gap-2 sm:grid-cols-2">{words.slice(0,8).map(w=><div key={w.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3"><div><b lang="tr">{w.tr}</b><p className="text-xs text-ink-400">{w.uz}</p></div><SpeakButton text={w.tr} size="sm"/></div>)}</div></details>}
    <footer className="flex items-start gap-3 rounded-2xl border border-white/5 p-4 text-xs leading-5 text-ink-400"><Target size={20} className="shrink-0 text-teal-300"/><p>{l({uz:'Sertifikatga tayyorgarlik — lug‘at bilan birga tinglash, o‘qish, yozish va gapirish. Bu mashq rasmiy imtihon yoki sertifikat bahosi emas.',tr:'Sertifika hazırlığı: kelime, dinleme, okuma, yazma ve konuşma. Bu alıştırma resmî sınav puanı değildir.'})} <Link href="/plan" className="text-teal-300 underline">{l({uz:'Rejam',tr:'Planım'})}</Link></p></footer>
  </div>;
}
