'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { PageHeader } from '@/components/ui';
import { SpeakButton } from '@/components/exercises/ExerciseViews';
import { stopSpeech } from '@/lib/speech';
import { practicePacks, writingChecklist, speakingChecklist, type PracticeQuestion } from '@/lib/certificate';

function Questions({ items }: { items: PracticeQuestion[] }) {
  const [answers,setAnswers] = useState<Record<number,number>>({});
  const [checked,setChecked] = useState(false);
  return <div className="space-y-4">{items.map((item,i) => <fieldset key={i} className="rounded-xl border border-white/10 p-3"><legend className="px-2 font-semibold">{i+1}. {item.q}</legend>{item.options.map((option,j) => <label key={j} className="my-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white/5"><input type="radio" name={`question-${i}`} checked={answers[i]===j} disabled={checked} onChange={()=>setAnswers({...answers,[i]:j})}/>{option}</label>)}{checked && <p role="status" className="mt-2 text-sm text-teal-200">{answers[i]===item.answer?'✓ To‘g‘ri.':'Qayta o‘rganing.'} {item.why} Javob: {item.options[item.answer]}.</p>}</fieldset>)}<button className="btn-primary" disabled={checked || Object.keys(answers).length!==items.length} onClick={()=>setChecked(true)}>Javoblarni tekshirish</button>{checked && <p>{items.filter((item,i)=>answers[i]===item.answer).length}/{items.length} to‘g‘ri. Bu faqat shu mashq natijasi.</p>}</div>;
}
function Checklist({items}:{items:string[]}) {return <div className="space-y-3">{items.map(item=><label key={item} className="flex items-start gap-3"><input type="checkbox" className="mt-1"/>{item}</label>)}</div>;}
export default function CertificatePage(){
  const {profile}=useProfile();
  const [packIndex,setPackIndex]=useState(0);
  const [skill,setSkill]=useState(0);
  const [transcript,setTranscript]=useState(false);
  const [introduced,setIntroduced]=useState(false);
  const [draft,setDraft]=useState('');
  const [loaded,setLoaded]=useState('');
  const [saveError,setSaveError]=useState(false);
  const pack=practicePacks[packIndex];
  const key=`kopru.certificate.v1:${profile?.id ?? 'local'}:${pack.id}`;
  useEffect(()=>{setLoaded('');try{setDraft(localStorage.getItem(key)??'');setSaveError(false);}catch{setDraft('');setSaveError(true);}setLoaded(key);},[key]);
  useEffect(()=>{if(loaded!==key)return;try{localStorage.setItem(key,draft);setSaveError(false);}catch{setSaveError(true);}},[draft,key,loaded]);
  useEffect(()=>()=>stopSpeech(),[skill,packIndex]);
  return <div className="mx-auto max-w-3xl space-y-5"><PageHeader title="Sertifikatga tayyorgarlik" sub="To‘rt ko‘nikma uchun qisqa mashqlar. AI kaliti kerak emas. Bu rasmiy imtihon varianti yoki sertifikat bali emas."/><Link href="/exam" className="text-teal-200 underline">← Mashq sinovi</Link>
    <div className="card p-5"><label htmlFor="pack" className="label">Mavzu va mashq darajasi</label><select id="pack" className="input" value={packIndex} onChange={e=>{setPackIndex(Number(e.target.value));setSkill(0);setTranscript(false);setIntroduced(false);}}>{practicePacks.map((p,i)=><option key={p.id} value={i}>{p.level} · {p.title}</option>)}</select><p className="mt-3 text-sm text-ink-300">Bu mavzuli matnlarda yangi so‘zlar ham bor. Avval quyidagi lug‘at bilan tanishing; savollar faqat shu sahifadagi materialga tegishli.</p><div className="my-3 grid gap-2 sm:grid-cols-2">{pack.glossary.map(([tr,uz])=><div key={tr} className="flex items-center gap-2 rounded-xl bg-white/5 p-2"><SpeakButton text={tr} size="sm"/><span><b>{tr}</b> — {uz}</span></div>)}</div><label className="flex items-center gap-3"><input type="checkbox" checked={introduced} onChange={e=>setIntroduced(e.target.checked)}/>Lug‘at bilan tanishdim, mashqni boshlayman.</label></div>
    {introduced && <><nav aria-label="Ko‘nikmalar" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['📖 O‘qish','🎧 Tinglash','✍️ Yozish','🎙️ Gapirish'].map((label,i)=><button key={label} aria-pressed={skill===i} className={skill===i?'btn-primary':'btn-secondary'} onClick={()=>setSkill(i)}>{label}</button>)}</nav>
    <section key={`${pack.id}-${skill}`} className="card space-y-5 p-5">
      {skill===0 && <><h2 className="text-xl font-semibold">Matnni tushunish</h2><p lang="tr" className="rounded-xl bg-white/5 p-4 leading-8">{pack.reading}</p><Questions items={pack.readingQuestions}/></>}
      {skill===1 && <><h2 className="text-xl font-semibold">Asosiy ma’lumotni tinglab toping</h2><p className="text-sm text-ink-300">Avval savollarni o‘qing. Audioni tinglang, keyin javob bering. Ovoz ishlamasa, matnni ochib o‘qish mashqi sifatida davom eting.</p><SpeakButton text={pack.listening}/><button className="btn-ghost block" aria-expanded={transcript} onClick={()=>setTranscript(!transcript)}>{transcript?'Matnni yashirish':'Audio matnini ochish'}</button>{transcript&&<p lang="tr" className="rounded-xl bg-white/5 p-4 leading-8">{pack.listening}</p>}<Questions items={pack.listeningQuestions}/></>}
      {skill===2 && <><h2 className="text-xl font-semibold">Yozma fikrni tartiblang</h2><p>{pack.writing}</p><textarea aria-label="Yozma mashq javobi" className="input min-h-64" maxLength={6000} value={loaded===key?draft:''} disabled={loaded!==key} onChange={e=>setDraft(e.target.value)} placeholder="Türkçe yazın…"/><p className="text-sm text-ink-300">{draft.trim().split(/\s+/).filter(Boolean).length} so‘z · {saveError?'Saqlanmadi: matnni nusxalab oling.':'Matn shu brauzerda avtomatik saqlanadi.'}</p><h3 className="font-semibold">O‘zingiz tekshiring</h3><Checklist items={writingChecklist}/><p className="text-sm text-ink-300">Ro‘yxat bajarilganini belgilash — o‘z-o‘zini tekshirish. Avtomatik til bahosi berilmaydi.</p></>}
      {skill===3 && <><h2 className="text-xl font-semibold">Fikr → sabab → misol</h2><p>Har savol uchun 30 soniya reja tuzing, keyin 1 daqiqa ovoz chiqarib javob bering. Bu mashq vaqti, rasmiy imtihon vaqti emas.</p>{pack.speaking.map((q,i)=><div key={q} className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><SpeakButton text={q} size="sm"/><p>{i+1}. {q}</p></div>)}<Checklist items={speakingChecklist}/><p className="text-sm text-ink-300">Tayanch iboralar: Bence… Çünkü… Örneğin… Ancak… Sonuç olarak…</p><p className="text-sm text-ink-300">Bu mashq ovozingizni yozib olmaydi va talaffuzga avtomatik ball bermaydi.</p></>}
    </section></>}
    <footer className="card p-5 text-sm text-ink-300"><b className="text-white">Rasmiy talablar</b><p className="my-2">Amaldagi topshiriqlar va baholash mezonlarini Agentlik manbasidan tekshiring. Yuqoridagi qisqa materiallar Köprü uchun tuzilgan o‘quv mashqlaridir.</p><a className="text-teal-200 underline" href="https://gov.uz/oz/uzbmb/sections/view/49531" target="_blank" rel="noopener noreferrer">UZBMB: baholash mezonlari va yangi format tafsilotlari ↗</a></footer>
  </div>;
}
