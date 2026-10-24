/**
 * Turk tili dvigateli: unli uyg'unligi, undosh uyg'unligi, yumshash, qo'shimchalar.
 * "Uyg'unlik" o'yini va grammatika mashqlari shu yerdan quvvat oladi.
 */

export const BACK_VOWELS = 'aıou';
export const FRONT_VOWELS = 'eiöü';
export const VOWELS = BACK_VOWELS + FRONT_VOWELS;
export const VOICELESS = 'çfhkpsşt'; // FıSTıKÇı ŞaHaP

export function lastVowel(word: string): string | null {
  const w = word.toLowerCase();
  for (let i = w.length - 1; i >= 0; i--) if (VOWELS.includes(w[i])) return w[i];
  return null;
}

export function endsWithVowel(word: string) {
  const c = word.toLowerCase().slice(-1);
  return VOWELS.includes(c);
}

export function endsWithVoiceless(word: string) {
  const c = word.toLowerCase().slice(-1);
  return VOICELESS.includes(c);
}

/** Istisnolar: oxirgi unlisi qalin bo'lsa ham ingichka qo'shimcha oladigan o'zlashma so'zlar */
const FRONT_I = new Set(['saat', 'kalp', 'harf', 'dikkat', 'hakikat', 'seyahat', 'sıhhat', 'hal', 'hayal', 'hilal', 'misal', 'ihtimal', 'istikbal', 'moral', 'normal', 'sual', 'ziraat', 'cemaat', 'ticaret', 'şefkat', 'kabahat', 'liyakat', 'sadakat', 'faaliyet']);
const FRONT_U = new Set(['rol', 'gol', 'alkol', 'petrol', 'sembol', 'kontrol', 'kabul', 'usul', 'mahsul', 'meşgul', 'resul']);

function exceptionKey(word: string) {
  const w = word.toLowerCase();
  if (FRONT_I.has(w)) return 'i';
  if (FRONT_U.has(w)) return 'ü';
  return null;
}

/** 2 lik uyg'unlik: a / e */
export function harmony2(word: string): 'a' | 'e' {
  if (exceptionKey(word)) return 'e';
  const v = lastVowel(word);
  if (!v) return 'e';
  return BACK_VOWELS.includes(v) ? 'a' : 'e';
}

/** 4 lik uyg'unlik: ı / i / u / ü */
export function harmony4(word: string): 'ı' | 'i' | 'u' | 'ü' {
  const ex = exceptionKey(word);
  if (ex) return ex as 'i' | 'ü';
  const v = lastVowel(word);
  if (!v) return 'i';
  if ('aı'.includes(v)) return 'ı';
  if ('ei'.includes(v)) return 'i';
  if ('ou'.includes(v)) return 'u';
  return 'ü';
}

/** Yumshash: p→b, ç→c, t→d, k→ğ (ko'p bo'g'inli so'zlar, unli qo'shimcha oldidan) */
const NO_SOFTEN = new Set(['saat', 'millet', 'devlet', 'sanat', 'hukuk', 'sepet', 'top', 'at', 'ot', 'et', 'süt', 'ip', 'kök', 'yat', 'kat', 'tat', 'ek', 'bilet', 'paket', 'market', 'internet', 'rapor', 'hesap', 'hukuk', 'sanat', 'cumhuriyet', 'ticaret', 'kuvvet', 'servet', 'sohbet']);
const FORCE_SOFTEN = new Set(['çok', 'renk', 'yurt', 'kalp', 'kurt', 'kap', 'uç', 'genç', 'güç', 'taç', 'kağıt', 'armut']);

/** Unli tushadigan va boshqa noqonuniy o'zaklar — egalik/kelishik o'yinida chetlab o'tiladi */
export const IRREGULAR_STEMS = new Set(['karın', 'burun', 'ağız', 'oğul', 'şehir', 'resim', 'isim', 'akıl', 'boyun', 'göğüs', 'alın', 'omuz', 'beyin', 'gönül', 'nehir', 'fikir', 'ömür', 'vakit', 'sabır', 'şükür', 'kayıt', 'su', 'ne', 'ben', 'sen', 'o']);

export function countSyllables(word: string) {
  return [...word.toLowerCase()].filter((c) => VOWELS.includes(c)).length;
}

export function soften(word: string): string {
  const w = word.toLowerCase();
  if (NO_SOFTEN.has(w)) return word;
  const last = w.slice(-1);
  if (!'pçtk'.includes(last)) return word;
  const multi = countSyllables(w) > 1;
  if (!multi && !FORCE_SOFTEN.has(w)) return word;
  if (last === 'p') return word.slice(0, -1) + 'b';
  if (last === 'ç') return word.slice(0, -1) + 'c';
  if (last === 't') {
    if (w.endsWith('et') && !FORCE_SOFTEN.has(w)) return word; // arabcha o'zlashmalar: millet, devlet...
    return word.slice(0, -1) + 'd';
  }
  // k
  if (w.endsWith('nk')) return word.slice(0, -1) + 'g';
  return word.slice(0, -1) + 'ğ';
}

export type SuffixKind = 'plural' | 'locative' | 'ablative' | 'dative' | 'accusative' | 'genitive' | 'question' | 'poss1' | 'poss2' | 'poss3' | 'with';

export const SUFFIX_LABELS: Record<SuffixKind, { label: string; uz: string; rule: string }> = {
  plural: { label: '-lar / -ler', uz: 'ko‘plik (-lar)', rule: 'Oxirgi unli qalin (a ı o u) → -lar, ingichka (e i ö ü) → -ler.' },
  locative: { label: '-da / -de / -ta / -te', uz: 'o‘rin (-da)', rule: 'Qalin → -da, ingichka → -de. Jarangsiz undoshdan (ç f h k p s ş t) keyin d → t.' },
  ablative: { label: '-dan / -den / -tan / -ten', uz: 'chiqish (-dan)', rule: 'Qalin → -dan, ingichka → -den. Jarangsizdan keyin t.' },
  dative: { label: '-a / -e / -ya / -ye', uz: 'jo‘nalish (-ga)', rule: 'Qalin → -a, ingichka → -e. Unlidan keyin y qo‘shiladi. p/ç/t/k yumshaydi.' },
  accusative: { label: '-ı / -i / -u / -ü (-yı…)', uz: 'tushum (-ni)', rule: '4 lik uyg‘unlik. Unlidan keyin y. p/ç/t/k yumshaydi.' },
  genitive: { label: '-ın / -in / -un / -ün (-nın…)', uz: 'qaratqich (-ning)', rule: '4 lik uyg‘unlik. Unlidan keyin n. p/ç/t/k yumshaydi.' },
  question: { label: 'mı / mi / mu / mü', uz: 'savol (-mi)', rule: '4 lik uyg‘unlik, alohida yoziladi.' },
  poss1: { label: '-ım / -im / -um / -üm (-m)', uz: 'mening … (-im)', rule: '4 lik. Unlidan keyin faqat -m. p/ç/t/k yumshaydi.' },
  poss2: { label: '-ın / -in / -un / -ün (-n)', uz: 'sening … (-ing)', rule: '4 lik. Unlidan keyin faqat -n.' },
  poss3: { label: '-ı / -i / -u / -ü (-sı…)', uz: 'uning … (-i)', rule: '4 lik. Unlidan keyin -sı/-si/-su/-sü.' },
  with: { label: '-la / -le (-yla / -yle)', uz: 'bilan (-la)', rule: '2 lik. Unlidan keyin y.' },
};

export function attach(word: string, kind: SuffixKind): string {
  const h2 = harmony2(word);
  const h4 = harmony4(word);
  const vowelEnd = endsWithVowel(word);
  const voiceless = endsWithVoiceless(word);
  switch (kind) {
    case 'plural':
      return word + 'l' + h2 + 'r';
    case 'locative':
      return word + (voiceless ? 't' : 'd') + h2;
    case 'ablative':
      return word + (voiceless ? 't' : 'd') + h2 + 'n';
    case 'dative':
      return vowelEnd ? word + 'y' + h2 : soften(word) + h2;
    case 'accusative':
      return vowelEnd ? word + 'y' + h4 : soften(word) + h4;
    case 'genitive':
      return vowelEnd ? word + 'n' + h4 + 'n' : soften(word) + h4 + 'n';
    case 'question':
      return word + ' m' + h4;
    case 'poss1':
      return vowelEnd ? word + 'm' : soften(word) + h4 + 'm';
    case 'poss2':
      return vowelEnd ? word + 'n' : soften(word) + h4 + 'n';
    case 'poss3':
      return vowelEnd ? word + 's' + h4 : soften(word) + h4;
    case 'with':
      return vowelEnd ? word + 'yl' + h2 : word + 'l' + h2;
  }
}

/** Noto'g'ri variantlar (distraktorlar) — uyg'unlik xatolari bilan */
export function harmonyDistractors(word: string, kind: SuffixKind, correct: string): string[] {
  const out = new Set<string>();
  const vowelEnd = endsWithVowel(word);
  const h2 = harmony2(word);
  const h4 = harmony4(word);
  const wrong2 = h2 === 'a' ? 'e' : 'a';
  const wrong4s = ['ı', 'i', 'u', 'ü'].filter((v) => v !== h4);
  const voiceless = endsWithVoiceless(word);
  switch (kind) {
    case 'plural':
      out.add(word + 'l' + wrong2 + 'r');
      out.add(word + 'l' + h2 + 'r' + 'l' + h2 + 'r');
      break;
    case 'locative':
      out.add(word + (voiceless ? 'd' : 't') + h2);
      out.add(word + (voiceless ? 't' : 'd') + wrong2);
      out.add(word + (voiceless ? 'd' : 't') + wrong2);
      break;
    case 'ablative':
      out.add(word + (voiceless ? 'd' : 't') + h2 + 'n');
      out.add(word + (voiceless ? 't' : 'd') + wrong2 + 'n');
      out.add(word + (voiceless ? 'd' : 't') + wrong2 + 'n');
      break;
    case 'dative':
      out.add(vowelEnd ? word + 'y' + wrong2 : word + h2);
      out.add(vowelEnd ? word + h2 : soften(word) + wrong2);
      out.add(word + 'y' + wrong2);
      break;
    case 'accusative':
    case 'poss3':
      for (const v of wrong4s) out.add(vowelEnd ? word + (kind === 'poss3' ? 's' : 'y') + v : soften(word) + v);
      out.add(vowelEnd ? word + h4 : word + h4);
      break;
    case 'genitive':
      for (const v of wrong4s) out.add(vowelEnd ? word + 'n' + v + 'n' : soften(word) + v + 'n');
      break;
    case 'question':
      for (const v of wrong4s) out.add(word + ' m' + v);
      break;
    case 'poss1':
    case 'poss2': {
      const last = kind === 'poss1' ? 'm' : 'n';
      if (vowelEnd) {
        // unli bilan tugagan o'zak: bufer harf xatolari
        out.add(word + h4 + last);
        out.add(word + 'y' + h4 + last);
        out.add(word + 's' + h4 + last);
      } else {
        for (const v of wrong4s) out.add(soften(word) + v + last);
        out.add(word + h4 + last); // yumshashsiz (kitapım)
      }
      break;
    }
    case 'with':
      out.add(vowelEnd ? word + 'yl' + wrong2 : word + 'l' + wrong2);
      out.add(vowelEnd ? word + 'l' + h2 : word + 'yl' + h2);
      break;
  }
  out.delete(correct);
  return [...out];
}

/** Matnni solishtirish uchun normallashtirish (diakritikalarni saqlab, bo'sh joy/belgini olib tashlash) */
export function normalizeTr(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`´]/g, '')
    .replace(/[.,!?;:…"«»()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Diakritikasiz (ş→s, ç→c…) — talaffuz/yozuvda kichik xatolarga yon berish uchun */
export function stripDiacritics(s: string) {
  return normalizeTr(s)
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

export function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** 0..1 o'xshashlik */
export function similarity(a: string, b: string) {
  const x = stripDiacritics(a);
  const y = stripDiacritics(b);
  if (!x.length && !y.length) return 1;
  const d = levenshtein(x, y);
  return 1 - d / Math.max(x.length, y.length);
}

/** Javobni tekshirish: aniq / kichik xato (diakritika) / noto'g'ri */
export function checkAnswer(input: string, answer: string, accept: string[] = []): 'exact' | 'close' | 'wrong' {
  const candidates = [answer, ...accept];
  const inN = normalizeTr(input);
  for (const c of candidates) if (normalizeTr(c) === inN) return 'exact';
  for (const c of candidates) if (stripDiacritics(c) === stripDiacritics(input)) return 'close';
  for (const c of candidates) if (similarity(input, c) >= 0.86 && c.length >= 5) return 'close';
  return 'wrong';
}

/** Tovush mosliklari — "Qarindosh so'zlar" darsi uchun */
export const SOUND_MAP: { uz: string; tr: string; example: string }[] = [
  { uz: 'q', tr: 'k', example: 'qo‘l → kol, qiz → kız, qush → kuş' },
  { uz: 'o‘', tr: 'ö / u / o', example: 'ko‘z → göz, o‘n → on, to‘rt → dört' },
  { uz: 'g‘', tr: 'ğ', example: 'tog‘ → dağ, og‘iz → ağız' },
  { uz: 'x', tr: 'h', example: 'xabar → haber, xarita → harita' },
  { uz: 'j', tr: 'c', example: 'javob → cevap, jome → cami' },
  { uz: 'ch', tr: 'ç', example: 'choy → çay, uch → üç' },
  { uz: 'sh', tr: 'ş', example: 'shahar → şehir, besh → beş' },
  { uz: 'y-', tr: 'y-', example: 'yil → yıl, yo‘l → yol, yuz → yüz' },
  { uz: 'k- (bosh)', tr: 'g- (bosh)', example: 'kelmoq → gelmek, ko‘rmoq → görmek, kulmoq → gülmek' },
  { uz: 't- (bosh)', tr: 'd- (bosh)', example: 'tog‘ → dağ, tengiz → deniz, to‘rt → dört' },
];
