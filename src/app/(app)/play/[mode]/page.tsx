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
  return <GamePage mode={mode} title={cfg.title} icon={cfg.icon} desc={cfg.desc} tips={cfg.tips} bonusXp={cfg.bonus} build={cfg.build} />;
}
