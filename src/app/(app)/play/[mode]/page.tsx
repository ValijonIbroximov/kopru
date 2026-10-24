'use client';
import { use } from 'react';
import { notFound } from 'next/navigation';
import GamePage, { type GameContext } from '@/components/exercises/GamePage';
import { fetchDue } from '@/lib/data';
import {
  buildReviewSession, buildMatchSession, buildBuilderSession, buildHarmonySession, buildListenSession, buildSpeakSession, buildGrammarSession,
  intro, choiceTrToUz, typingUzToTr, trueFalseExercise,
} from '@/lib/exercises';
import type { Exercise } from '@/lib/types';
import { shuffle } from '@/lib/utils';
import type { HowToStep } from '@/components/games/HowToPlay';

const HOWTO: Record<string, HowToStep[]> = {
  review: [
    { icon: '🧠', title: 'Unutish arafasidagi so‘zlar', text: 'Algoritm (FSRS) qaysi so‘zni bugun eslamasangiz unutilishini biladi — aynan ularni beradi. Shuning uchun navbat har kuni boshqa.' },
    { icon: '🎲', title: 'Har so‘z — boshqa mashq', text: 'Tanlov, tinglash, yozish, to‘g‘ri/noto‘g‘ri, uyg‘unlik aralash keladi. Enter — davom etish, 1–4 — variant.' },
    { icon: '⏱️', title: 'Tezlik ham baho', text: 'Tez va to‘g‘ri = "Oson" (so‘z uzoqqa ketadi), sekin = "Qiyin", xato = 5 daqiqadan keyin qaytadi. Ishora ishlatsangiz baho pasayadi.' },
  ],
  match: [
    { icon: '🔗', title: 'Juftlarni ulang', text: 'Chapda turkcha, o‘ngda o‘zbekcha. Bittasini bosib, juftini bosing. To‘g‘ri bo‘lsa yashil bo‘lib yo‘qoladi.' },
    { icon: '🎯', title: 'Xatosiz raund', text: '1 ta xatogacha — so‘zlar "Yaxshi" bahosi oladi. 4 raund, har raund 5 juft. Tez va yengil rejim.' },
  ],
  builder: [
    { icon: '🧩', title: 'Gapni tuzing', text: 'Yuqorida o‘zbekcha gap. Pastdagi turkcha so‘zlarni to‘g‘ri tartibda bosing — ular yuqoridagi qatorga ko‘chadi.' },
    { icon: '🪤', title: 'Ortiqcha so‘zlar bor', text: 'Ikki so‘z chalg‘ituvchi — ehtiyot bo‘ling. Noto‘g‘ri bosgan so‘zni yuqoridan bosib qaytaring.' },
    { icon: '📐', title: 'So‘z tartibi', text: 'Turkcha tartib o‘zbekcha bilan deyarli bir xil: Ega → to‘ldiruvchi → kesim. "Ben okula gidiyorum" = "Men maktabga boryapman".' },
  ],
  harmony: [
    { icon: '🎼', title: 'Qo‘shimcha tanlang', text: 'So‘z va kerakli qo‘shimcha turi beriladi (masalan -da, -lar, -im). 4 variantdan uyg‘unlikka mos shaklni bosing.' },
    { icon: '🔤', title: 'Qoida', text: 'Oxirgi unli qalin (a ı o u) → a/ı/u; ingichka (e i ö ü) → e/i/ü. Jarangsizdan (ç f h k p s ş t) keyin d→t. p ç t k unli oldidan yumshaydi.' },
    { icon: '⚡', title: 'Refleks', text: '12 ta zarba, javobdan keyin qoida izohi chiqadi. Maqsad — o‘ylamay to‘g‘ri tanlash.' },
  ],
  listen: [
    { icon: '🎧', title: 'Eshiting', text: 'So‘z turkcha ovozda o‘qiladi (🔊 qayta eshitish, 🐢 sekin). Variantlardan eshitganingizni tanlang.' },
    { icon: '⌨️', title: 'Diktant', text: 'Har 3-mashq — yozish: eshitganingizni tering. Turkcha harflar tugmachalari pastda. Kichik imlo xatosi "deyarli" deb qabul qilinadi.' },
  ],
  speak: [
    { icon: '🎙️', title: 'Mikrofonni bosing', text: 'Jumlani ko‘ring, avval 🔊 eshiting, keyin mikrofonni bosib ovoz chiqarib o‘qing. Brauzer nutqingizni taniydi.' },
    { icon: '📊', title: 'O‘xshashlik', text: '72% dan yuqori — qabul. 3 urinish bor. Nutqni tanish bo‘lmasa — ovoz chiqarib 3 marta takrorlab "davom" bosing.' },
  ],
  grammar: [
    { icon: '📐', title: 'Bo‘sh joyni to‘ldiring', text: 'Gapda ___ joy bor. 4 ta qo‘shimcha variantidan to‘g‘risini bosing. Har javobdan keyin izoh.' },
    { icon: '🌉', title: 'O‘zbekcha qoidani eslang', text: '-da/-dan/-ga/-ni/-ning → -da/-dan/-a/-ı/-ın; keldim → geldim. Farq faqat uyg‘unlikda.' },
  ],
  cognates: [
    { icon: '🪢', title: 'Siz bilgan so‘zlar', text: 'O‘zbek va turk tillari qarindosh: ko‘z→göz, qush→kuş, tog‘→dağ. Tovush mosliklarini ilg‘asangiz yuzlab so‘z tayyor.' },
    { icon: '⚠️', title: 'Yolg‘on do‘stlar', text: 'Ba’zi so‘zlar o‘xshaydi, lekin ma’nosi boshqa: olmak = bo‘lmoq, bulmak = topmoq, hazır = tayyor, dede = bobo, el = qo‘l. Ular alohida belgilangan.' },
  ],
};

const CONFIG: Record<string, { title: string; icon: string; desc: string; tips: string[]; bonus: number; build: (c: GameContext) => Exercise[] | Promise<Exercise[]> }> = {
  review: {
    title: 'Takrorlash', icon: '🧠', desc: 'FSRS algoritmi unutish arafasidagi so‘zlarni tanlab beradi. Har kuni 5 daqiqa — va so‘zlar abadiy qoladi.',
    tips: ['Tez javob = "Oson" bahosi → so‘z uzoqroq muddatga ketadi', 'Xato = so‘z 5 daqiqadan keyin qaytadi'], bonus: 10,
    build: async (c) => { const due = await fetchDue(c.settings.srs.max_reviews_per_session, c.settings.srs.max_new_per_day); const ws = due.map((d) => d.word); return buildReviewSession(ws.length ? ws : shuffle(c.words).slice(0, 12), c.allWords, c.settings.srs.max_reviews_per_session); },
  },
  match: {
    title: 'Juftlash', icon: '🃏', desc: 'Xotira o‘yini: turkcha so‘zni o‘zbekcha juftiga ulang. 4 raund, tez va yengil.',
    tips: ['Xatosiz raund = so‘zlar "Yaxshi" bahosi oladi', 'Tez rejim — zerikkan paytda ideal'], bonus: 8,
    build: (c) => buildMatchSession(c.words, 4, 5),
  },
  builder: {
    title: 'Jumla quruvchi', icon: '🧩', desc: 'O‘zbekcha gapni ko‘rib, turkcha so‘zlardan to‘g‘ri tartibda gap tuzing. So‘z tartibi: ega → to‘ldiruvchi → kesim (o‘zbekcha kabi!).',
    tips: ['Ortiqcha so‘zlar ham bor — ehtiyot bo‘ling', 'Tartib o‘zbekcha bilan deyarli bir xil'], bonus: 12,
    build: (c) => buildBuilderSession(c.words.length >= 10 ? c.words : c.allWords, 10),
  },
  harmony: {
    title: 'Uyg‘unlik', icon: '🎼', desc: 'Unli uyg‘unligi refleksi: so‘zga to‘g‘ri qo‘shimchani tanlang. 12 ta zarba — qo‘l o‘zi o‘rganadi.',
    tips: ['Qalin: a ı o u → -lar/-da/-dan; ingichka: e i ö ü → -ler/-de/-den', 'Jarangsizdan (ç f h k p s ş t) keyin d → t'], bonus: 10,
    build: (c) => buildHarmonySession(c.allWords, 12),
  },
  listen: {
    title: 'Tinglash', icon: '🎧', desc: 'Brauzer turkcha ovozi bilan eshiting: tanlang yoki yozing. Sekin rejim (🐢) ham bor.',
    tips: ['Chrome/Edge/Safari da turkcha ovoz bor; yo‘q bo‘lsa — tizimga "Türkçe" ovoz o‘rnating', 'Har 3-mashq — yozish (diktant)'], bonus: 10,
    build: (c) => buildListenSession(c.words, 12),
  },
  speak: {
    title: 'Gapirish', icon: '🎙️', desc: 'Jumlani ovoz chiqarib o‘qing — brauzer nutqni taniydi va o‘xshashlikni baholaydi (72%+ = qabul).',
    tips: ['Mikrofonga ruxsat bering', 'Avval 🔊 ni eshiting, keyin takrorlang', '3 urinish bor'], bonus: 12,
    build: (c) => buildSpeakSession(c.words, 8),
  },
  grammar: {
    title: 'Grammatika drillari', icon: '📐', desc: 'Barcha o‘tilgan qoidalar bo‘yicha aralash bo‘sh joy to‘ldirish. Har xato — izoh bilan.',
    tips: ['O‘zbekcha qoidani eslang: -da/-dan/-ga → -da/-dan/-a'], bonus: 10,
    build: (c) => buildGrammarSession(c.grammar, 14),
  },
  cognates: {
    title: 'Qarindosh so‘zlar', icon: '🌉', desc: 'Siz allaqachon bilgan so‘zlar: o‘zbek-turk tovush mosliklari orqali so‘z boyligi bir zumda 2 barobar oshadi. Yolg‘on do‘stlarga diqqat!',
    tips: ['q→k, o‘→ö/u, g‘→ğ, j→c, x→h', '⚠️ olmak = bo‘lmoq, bulmak = topmoq, hazır = tayyor'], bonus: 12,
    build: (c) => {
      const cg = c.allWords.filter((w) => w.cognate);
      const ff = cg.filter((w) => w.false_friend);
      const pick = shuffle(cg.filter((w) => !w.false_friend)).slice(0, 8).concat(shuffle(ff).slice(0, 4));
      const ex: Exercise[] = [];
      for (const w of shuffle(pick)) {
        if (w.false_friend) ex.push(intro(w), trueFalseExercise(w, c.allWords));
        else ex.push(choiceTrToUz(w, c.allWords));
      }
      ex.push(...shuffle(pick).slice(0, 3).map((w) => typingUzToTr(w)));
      return ex;
    },
  },
};

export default function ModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params);
  const cfg = CONFIG[mode];
  if (!cfg) notFound();
  return <GamePage mode={mode} title={cfg.title} icon={cfg.icon} desc={cfg.desc} tips={cfg.tips} bonusXp={cfg.bonus} build={cfg.build} howTo={HOWTO[mode]} />;
}
