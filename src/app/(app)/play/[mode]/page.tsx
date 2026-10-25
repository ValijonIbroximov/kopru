'use client';
import { use } from 'react';
import { notFound } from 'next/navigation';
import GamePage, { type GameContext } from '@/components/exercises/GamePage';
import { fetchDue } from '@/lib/data';
import {
  buildReviewSession, buildMatchSession, buildBuilderSession, buildHarmonySession, buildListenSession, buildSpeakSession, buildGrammarSession,
  intro, choiceTrToUz, typingUzToTr, trueFalseExercise, harmonyEligible } from '@/lib/exercises';
import type { Exercise } from '@/lib/types';
import { shuffle } from '@/lib/utils';
import type { HowToStep } from '@/components/games/HowToPlay';
import type { L } from '@/lib/i18n';

const HOWTO: Record<string, HowToStep[]> = {
  review: [
    { icon: '🧠', title: { uz: 'Unutish arafasidagi so‘zlar', tr: 'Unutulmak üzere olan kelimeler' }, text: { uz: 'Algoritm (FSRS) qaysi so‘zni bugun eslamasangiz unutilishini biladi — aynan ularni beradi. Navbat har kuni boshqa.', tr: 'Algoritma (FSRS) hangi kelimeyi bugün hatırlamazsanız unutulacağını bilir — tam onları verir. Sıra her gün farklı.' } },
    { icon: '🎲', title: { uz: 'Har so‘z — boshqa mashq', tr: 'Her kelime — farklı alıştırma' }, text: { uz: 'Tanlov, tinglash, yozish, to‘g‘ri/noto‘g‘ri, uyg‘unlik aralash keladi. Enter — davom, 1–4 — variant.', tr: 'Seçim, dinleme, yazma, doğru/yanlış, ünlü uyumu karışık gelir. Enter — devam, 1–4 — seçenek.' } },
    { icon: '⏱️', title: { uz: 'Tezlik ham baho', tr: 'Hız da puandır' }, text: { uz: 'Tez va to‘g‘ri = "Oson" (so‘z uzoqqa ketadi), sekin = "Qiyin", xato = 5 daqiqadan keyin qaytadi.', tr: 'Hızlı ve doğru = "Kolay" (kelime uzağa gider), yavaş = "Zor", hata = 5 dakika sonra döner.' } },
  ],
  match: [
    { icon: '🔗', title: { uz: 'Juftlarni ulang', tr: 'Eşleri bağlayın' }, text: { uz: 'Chapda turkcha, o‘ngda o‘zbekcha. Bittasini bosib, juftini bosing. To‘g‘ri bo‘lsa yashil bo‘lib yo‘qoladi.', tr: 'Solda Türkçe, sağda Özbekçe. Birine basın, eşine basın. Doğruysa yeşil olup kaybolur.' } },
    { icon: '🎯', title: { uz: 'Xatosiz raund', tr: 'Hatasız tur' }, text: { uz: '1 ta xatogacha — so‘zlar "Yaxshi" bahosi oladi. 4 raund, har raund 5 juft.', tr: '1 hataya kadar — kelimeler "İyi" puanı alır. 4 tur, her turda 5 eş.' } },
  ],
  builder: [
    { icon: '🧩', title: { uz: 'Gapni tuzing', tr: 'Cümleyi kurun' }, text: { uz: 'Yuqorida o‘zbekcha gap. Pastdagi turkcha so‘zlarni to‘g‘ri tartibda bosing.', tr: 'Üstte Özbekçe cümle. Alttaki Türkçe kelimelere doğru sırayla basın.' } },
    { icon: '🪤', title: { uz: 'Ortiqcha so‘zlar bor', tr: 'Fazla kelimeler var' }, text: { uz: 'Ikki so‘z chalg‘ituvchi. Noto‘g‘ri bosgan so‘zni yuqoridan bosib qaytaring.', tr: 'İki kelime çeldirici. Yanlış bastığınız kelimeyi üstten basıp geri alın.' } },
    { icon: '📐', title: { uz: 'So‘z tartibi', tr: 'Kelime sırası' }, text: { uz: 'Turkcha tartib o‘zbekcha bilan deyarli bir xil: Ega → to‘ldiruvchi → kesim.', tr: 'Türkçe sıra Özbekçeyle hemen hemen aynı: Özne → tümleç → yüklem.' } },
  ],
  harmony: [
    { icon: '🎼', title: { uz: 'Qo‘shimcha tanlang', tr: 'Eki seçin' }, text: { uz: 'So‘z va kerakli qo‘shimcha turi beriladi. 4 variantdan uyg‘unlikka mos shaklni bosing.', tr: 'Kelime ve gereken ek türü verilir. 4 seçenekten uyuma uygun biçime basın.' } },
    { icon: '🔤', title: { uz: 'Qoida', tr: 'Kural' }, text: { uz: 'Oxirgi unli qalin (a ı o u) → a/ı/u; ingichka (e i ö ü) → e/i/ü. Jarangsizdan keyin d→t.', tr: 'Son ünlü kalın (a ı o u) → a/ı/u; ince (e i ö ü) → e/i/ü. Sert ünsüzden sonra d→t.' } },
    { icon: '⚡', title: { uz: 'Refleks', tr: 'Refleks' }, text: { uz: '12 ta zarba, javobdan keyin qoida izohi. Maqsad — o‘ylamay to‘g‘ri tanlash.', tr: '12 vuruş, cevaptan sonra kural açıklaması. Amaç — düşünmeden doğru seçmek.' } },
  ],
  listen: [
    { icon: '🎧', title: { uz: 'Eshiting', tr: 'Dinleyin' }, text: { uz: 'So‘z turkcha neyron ovozda o‘qiladi (🔊 qayta, 🐢 sekin). Variantlardan eshitganingizni tanlang.', tr: 'Kelime Türkçe nöral sesle okunur (🔊 tekrar, 🐢 yavaş). Seçeneklerden duyduğunuzu seçin.' } },
    { icon: '⌨️', title: { uz: 'Diktant', tr: 'Dikte' }, text: { uz: 'Har 3-mashq — yozish: eshitganingizni tering. Kichik imlo xatosi "deyarli" deb qabul qilinadi.', tr: 'Her 3. alıştırma — yazma: duyduğunuzu yazın. Küçük yazım hatası "neredeyse" sayılır.' } },
  ],
  speak: [
    { icon: '🎙️', title: { uz: 'Mikrofonni bosing', tr: 'Mikrofona basın' }, text: { uz: 'Avval 🔊 eshiting, keyin mikrofonni bosib ovoz chiqarib o‘qing. Brauzer nutqingizni taniydi.', tr: 'Önce 🔊 dinleyin, sonra mikrofona basıp sesli okuyun. Tarayıcı konuşmanızı tanır.' } },
    { icon: '📊', title: { uz: 'O‘xshashlik', tr: 'Benzerlik' }, text: { uz: '72% dan yuqori — qabul. 3 urinish bor.', tr: '%72 üzeri — kabul. 3 deneme hakkı var.' } },
  ],
  grammar: [
    { icon: '📐', title: { uz: 'Bo‘sh joyni to‘ldiring', tr: 'Boşluğu doldurun' }, text: { uz: 'Gapda ___ joy bor. 4 ta qo‘shimcha variantidan to‘g‘risini bosing. Har javobdan keyin izoh.', tr: 'Cümlede ___ var. 4 ek seçeneğinden doğrusuna basın. Her cevaptan sonra açıklama.' } },
    { icon: '🌉', title: { uz: 'O‘zbekcha qoidani eslang', tr: 'Özbekçe kuralı hatırlayın' }, text: { uz: '-da/-dan/-ga/-ni/-ning → -da/-dan/-a/-ı/-ın; keldim → geldim. Farq faqat uyg‘unlikda.', tr: 'Özbekçe -da/-dan/-ga/-ni/-ning → Türkçe -da/-dan/-a/-ı/-ın. Fark yalnızca uyumda.' } },
  ],
  cognates: [
    { icon: '🪢', title: { uz: 'Siz bilgan so‘zlar', tr: 'Bildiğiniz kelimeler' }, text: { uz: 'O‘zbek va turk tillari qarindosh: ko‘z→göz, qush→kuş, tog‘→dağ. Tovush mosliklarini ilg‘asangiz yuzlab so‘z tayyor.', tr: 'Özbekçe ve Türkçe akraba: ko‘z→göz, qush→kuş, tog‘→dağ. Ses eşleşmelerini kavrarsanız yüzlerce kelime hazır.' } },
    { icon: '⚠️', title: { uz: 'Yolg‘on do‘stlar', tr: 'Yalancı eşdeğerler' }, text: { uz: 'olmak = bo‘lmoq, bulmak = topmoq, hazır = tayyor, dede = bobo, el = qo‘l. Ular alohida belgilangan.', tr: 'olmak ≠ Özbekçe olmoq (almak), bulmak = topmoq, hazır = tayyor, dede = bobo. Ayrıca işaretlenmiştir.' } },
  ],
};

interface Cfg { title: L; icon: string; desc: L; tips: L[]; bonus: number; build: (c: GameContext) => Exercise[] | Promise<Exercise[]> }

const CONFIG: Record<string, Cfg> = {
  review: {
    title: { uz: 'Takrorlash', tr: 'Tekrar' }, icon: '🧠', desc: { uz: 'FSRS algoritmi unutish arafasidagi so‘zlarni tanlab beradi. Har kuni 5 daqiqa — va so‘zlar abadiy qoladi.', tr: 'FSRS algoritması unutulmak üzere olan kelimeleri seçer. Her gün 5 dakika — kelimeler kalıcı olur.' },
    tips: [{ uz: 'Tez javob = "Oson" bahosi → so‘z uzoqroq muddatga ketadi', tr: 'Hızlı cevap = "Kolay" → kelime daha uzun süre sonra döner' }, { uz: 'Xato = so‘z 5 daqiqadan keyin qaytadi', tr: 'Hata = kelime 5 dakika sonra döner' }], bonus: 10,
    build: async (c) => { const due = await fetchDue(c.settings.srs.max_reviews_per_session, 0); const ws = due.map((d) => d.word); return buildReviewSession(ws.length ? ws : shuffle(c.words).slice(0, 12), c.words, c.settings.srs.max_reviews_per_session); },
  },
  match: {
    title: { uz: 'Juftlash', tr: 'Eşleştirme' }, icon: '🔗', desc: { uz: 'Turkcha so‘zni o‘zbekcha juftiga ulang. 4 raund, tez va yengil.', tr: 'Türkçe kelimeyi Özbekçe eşine bağlayın. 4 tur, hızlı ve hafif.' },
    tips: [{ uz: 'Xatosiz raund = so‘zlar "Yaxshi" bahosi oladi', tr: 'Hatasız tur = kelimeler "İyi" puanı alır' }], bonus: 8,
    build: (c) => buildMatchSession(c.words, 4, 5),
  },
  builder: {
    title: { uz: 'Jumla quruvchi', tr: 'Cümle kurucu' }, icon: '🧩', desc: { uz: 'O‘zbekcha gapni ko‘rib, turkcha so‘zlardan to‘g‘ri tartibda gap tuzing.', tr: 'Özbekçe cümleyi görüp Türkçe kelimelerden doğru sırada cümle kurun.' },
    tips: [{ uz: 'Ortiqcha so‘zlar ham bor — ehtiyot bo‘ling', tr: 'Fazla kelimeler de var — dikkat' }], bonus: 12,
    build: (c) => buildBuilderSession(c.words, 10),
  },
  harmony: {
    title: { uz: 'Uyg‘unlik', tr: 'Ünlü uyumu' }, icon: '🎼', desc: { uz: 'Unli uyg‘unligi refleksi: so‘zga to‘g‘ri qo‘shimchani tanlang. 12 ta zarba.', tr: 'Ünlü uyumu refleksi: kelimeye doğru eki seçin. 12 vuruş.' },
    tips: [{ uz: 'Qalin: a ı o u → -lar/-da; ingichka: e i ö ü → -ler/-de', tr: 'Kalın: a ı o u → -lar/-da; ince: e i ö ü → -ler/-de' }], bonus: 10,
    build: (c) => buildHarmonySession(c.words, 12),
  },
  listen: {
    title: { uz: 'Tinglash', tr: 'Dinleme' }, icon: '🎧', desc: { uz: 'Neyron turkcha ovoz bilan eshiting: tanlang yoki yozing. Sekin rejim (🐢) ham bor.', tr: 'Nöral Türkçe sesle dinleyin: seçin ya da yazın. Yavaş mod (🐢) da var.' },
    tips: [{ uz: 'Har 3-mashq — yozish (diktant)', tr: 'Her 3. alıştırma — yazma (dikte)' }], bonus: 10,
    build: (c) => buildListenSession(c.words, 12),
  },
  speak: {
    title: { uz: 'Gapirish', tr: 'Konuşma' }, icon: '🎙️', desc: { uz: 'Jumlani ovoz chiqarib o‘qing — brauzer nutqni taniydi va o‘xshashlikni baholaydi (72%+ = qabul).', tr: 'Cümleyi sesli okuyun — tarayıcı konuşmayı tanır ve benzerliği puanlar (%72+ = kabul).' },
    tips: [{ uz: 'Mikrofonga ruxsat bering · 3 urinish bor', tr: 'Mikrofona izin verin · 3 deneme' }], bonus: 12,
    build: (c) => buildSpeakSession(c.words, 8),
  },
  grammar: {
    title: { uz: 'Grammatika drillari', tr: 'Dil bilgisi alıştırmaları' }, icon: '📐', desc: { uz: 'Barcha o‘tilgan qoidalar bo‘yicha aralash bo‘sh joy to‘ldirish. Har xato — izoh bilan.', tr: 'Tüm işlenen kurallardan karışık boşluk doldurma. Her hata — açıklamalı.' },
    tips: [], bonus: 10,
    build: (c) => buildGrammarSession(c.grammar.filter(g => c.progress.some(p => p.lesson_id === g.lesson_id && p.status === 'completed')), 14),
  },
  cognates: {
    title: { uz: 'Qarindosh so‘zlar', tr: 'Akraba kelimeler' }, icon: '🪢', desc: { uz: 'Siz allaqachon bilgan so‘zlar: o‘zbek–turk tovush mosliklari orqali so‘z boyligi 2 barobar. Yolg‘on do‘stlarga diqqat!', tr: 'Zaten bildiğiniz kelimeler: Özbekçe–Türkçe ses eşleşmeleriyle kelime dağarcığı 2 kat. Yalancı eşdeğerlere dikkat!' },
    tips: [{ uz: 'q→k, o‘→ö/u, g‘→ğ, j→c, x→h', tr: 'q→k, o‘→ö/u, g‘→ğ, j→c, x→h' }], bonus: 12,
    build: (c) => {
      const cg = c.allWords.filter((w) => w.cognate);
      const ff = cg.filter((w) => w.false_friend);
      const pick = shuffle(cg.filter((w) => !w.false_friend)).slice(0, 8).concat(shuffle(ff).slice(0, 4));
      const ex: Exercise[] = [];
      for (const w of pick) ex.push(intro(w));
      for (const w of shuffle(pick)) ex.push(w.false_friend ? trueFalseExercise(w, pick) : choiceTrToUz(w, pick));
      ex.push(...shuffle(pick).slice(0, 3).map((w) => typingUzToTr(w)));
      return ex;
    },
  },
};

export default function ModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params);
  const cfg = CONFIG[mode];
  if (!cfg) notFound();
  // minimal so'z talabi: takrorlash (SRS navbati) / grammatika / qarindosh so'zlar — havza paneli kerak emas
  const MIN: Record<string, number> = { review: 0, grammar: 0, cognates: 0, match: 10, builder: 10, harmony: 8, listen: 8, speak: 6 };
  return <GamePage mode={mode} title={cfg.title} icon={cfg.icon} desc={cfg.desc} tips={cfg.tips} bonusXp={cfg.bonus} build={cfg.build} howTo={HOWTO[mode]} minWords={MIN[mode] ?? 8} />;
}
