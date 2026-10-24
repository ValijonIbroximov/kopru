# ⚡ TezBil — Turk tili akademiyasi (o‘zbeklar uchun)

**© VALIJON IBROXIMOV**

> O‘yinli, sun’iy intellektli, to‘liq statistikali turk tili o‘rganish platformasi.
> Maqsad: **Milliy sertifikat (Multi-level, A1 → C1)**. Tez boshlab, keyin shijoati so‘nib qoladigan odamlar uchun yaratilgan.
> Stack: **Next.js 15 + Supabase (bepul) + Vercel (bepul) + 5 ta bepul AI provayder + Microsoft neyron TTS (bepul)**. Infratuzilma narxi: **0 so‘m**.
> Interfeys: **O‘zbekcha / Turkcha**. Dizayn: **7 ta mavzu** (qorong‘i va yorug‘), har foydalanuvchi o‘ziga sozlaydi.

---

## 1. Nima bor (qisqacha)

| Blok | Imkoniyat |
|---|---|
| 🧠 **Xotira** | FSRS-4.5 (Anki’ning zamonaviy algoritmi) — har so‘z aynan unutish arafasida qaytadi |
| 🌉 **Ko‘prik effekti** | O‘zbek–turk qarindosh so‘zlar (q→k, o‘→ö, g‘→ğ, j→c…) va **yolg‘on do‘stlar** (olmak=bo‘lmoq, bulmak=topmoq, hazır=tayyor, dede=bobo…) |
| 🎮 **21 ta rejim** | Dars, Takrorlash, Juftlash, Jumla quruvchi, Uyg‘unlik, Tinglash, Gapirish, AI hikoya, Duel (real vaqt), AI o‘qituvchi, Grammatika, Qarindosh so‘zlar, Sinov imtihoni |
| 🔥 **Gamifikatsiya** | XP, darajalar, streak + muzlatish, kunlik/haftalik questlar, 18 ta yutuq, 4 liga (haftalik), combo, konfetti |
| 📉 **Zerikish detektori** | Faollik trendi, aniqlik, rejim monotoniyasi → sessiya qisqaradi, yangi rejim tavsiya qilinadi, qaytganda XP ×2 |
| 🤖 **AI (bepul)** | Groq → Gemini → Cerebras → OpenRouter → Mistral zanjiri. Limit tugasa keyingisi; hammasi tugasa — **kesh + navbat** (hech narsa yo‘qolmaydi) |
| 📊 **Statistika** | Faollik xaritasi, so‘z boyligi (yangi/o‘rganilmoqda/takrorlashda/mukammal), ko‘nikmalar aniqligi, qiziqishlar, xato so‘zlar, motivatsiya indeksi, sertifikatga tayyorlik |
| 🛠️ **Admin panel** | Foydalanuvchilar, kontent (bo‘lim/dars/so‘z/grammatika/mashq/quest/yutuq) — qo‘shish, tahrirlash, o‘chirish, JSON import/eksport; AI provayderlar; tizim sozlamalari; loglar; fikrlar |
| 🗺️ **Moslashuvchan reja** | Maqsad daraja + imtihon sanasi → kuniga nechta so‘z, qaysi o‘yin, qachon sinov imtihoni; har kun qayta hisoblanadi (oldinda / reja bo‘yicha / ortda) |
| 🔊 **Tabiiy turkcha nutq** | Microsoft neyron ovozlar (Emel / Ahmet) server orqali, Supabase Storage keshi, Google TTS va brauzer ovozi zaxirada |
| 🎨 **Mavzular** | 7 ta dizayn (Tun, Grafit, Binafsha, Tong, Osmon, Qog‘oz, Yashil), jonli canvas fon (neyron tarmoq, harflar, to‘lqinlar), To‘liq/Yengil/O‘chiq |
| 🌐 **Ko‘p tillilik** | Interfeys O‘zbekcha va Turkcha; birinchi kirishda va profilda tanlanadi |
| 📱 **PWA** | Telefon bosh ekraniga o‘rnatiladi, mobil-birinchi dizayn |
| 💾 **Sessiya tiklanishi** | Har javobdan keyin holat saqlanadi — chiqib ketsangiz ham aynan shu joydan davom etasiz |

Boshlang‘ich kontent: **10 bo‘lim, 40 dars, 392 so‘z/ibora (A1–A2), 13 grammatika mavzusi, 70+ drill, 6 dialog**. Hammasi admin paneldan kengaytiriladi (B1, B2, C1).

---

## 2. Ishga tushirish ketma-ketligi (≈ 20 daqiqa)

### Qadam 0 — Kerakli narsalar
- GitHub akkaunt (bepul) — https://github.com
- Vercel akkaunt (bepul, GitHub orqali kiring) — https://vercel.com
- Supabase akkaunt (bepul) — https://supabase.com
- Kamida 1 ta bepul AI kaliti (pastda)
- Kompyuterda Node.js 20+ (faqat lokal test uchun; Vercel’da shart emas)

### Qadam 1 — Supabase loyihasi (5 daqiqa)
1. https://supabase.com/dashboard → **New project** → nom: `kopru`, parol yarating, region: **Frankfurt (eu-central-1)** (Toshkentga eng yaqin tez hudud).
2. Loyiha tayyor bo‘lgach chap menyu → **SQL Editor** → **New query**.
3. `supabase/schema.sql` faylini **to‘liq** nusxalab qo‘ying → **Run**. ("Success" chiqadi.)
4. Yana **New query** → `supabase/seed.sql` ni nusxalang → **Run**. (Bo‘limlar, darslar, so‘zlar, questlar yuklanadi.)
5. **Authentication → Providers → Email**: tez boshlash uchun **"Confirm email" ni o‘chiring** (keyin yoqishingiz mumkin).
6. **Authentication → URL Configuration**: *Site URL* = Vercel manzilingiz (masalan `https://kopru.vercel.app`), *Redirect URLs* ga `https://kopru.vercel.app/auth/callback` va `http://localhost:3000/auth/callback` qo‘shing. (Vercel manzilni 4-qadamdan keyin qaytib yozasiz.)
7. **Project Settings → API** dan 3 ta qiymatni nusxalab oling:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY` (faqat serverda, hech kimga bermang)

### Qadam 2 — Bepul AI kalitlari (5 daqiqa)
Kamida bittasi yetarli, lekin **2–3 tasini** olib qo‘ying — zanjir shunda ishlaydi.

| Provayder | Qayerdan | Bepul limit (taxminan) | Env nomi |
|---|---|---|---|
| **Groq** (eng tez) | https://console.groq.com/keys | ~14 000 so‘rov/kun | `GROQ_API_KEY` |
| **Google Gemini** | https://aistudio.google.com/apikey | ~1 500 so‘rov/kun | `GEMINI_API_KEY` |
| **Cerebras** | https://cloud.cerebras.ai | bepul tier | `CEREBRAS_API_KEY` |
| **OpenRouter** | https://openrouter.ai/keys | `:free` modellar ~50–200/kun | `OPENROUTER_API_KEY` |
| **Mistral** | https://console.mistral.ai | "Experiment" rejasi bepul | `MISTRAL_API_KEY` |

Model nomlari `.env.example` da — provayder model nomini o‘zgartirsa, env yoki Admin → AI sahifasida yangilang.

### Qadam 3 — GitHub’ga yuklash (3 daqiqa)
```bash
# zip ni oching, papkaga kiring
cd kopru
git init
git add .
git commit -m "Köprü: boshlang'ich versiya"
# GitHub'da bo'sh repo yarating (masalan kopru), keyin:
git remote add origin https://github.com/SIZNING_LOGIN/kopru.git
git branch -M main
git push -u origin main
```
(Git o‘rnatilmagan bo‘lsa: GitHub Desktop → *Add local repository* → *Publish*.)

### Qadam 4 — Vercel’ga deploy (5 daqiqa)
1. https://vercel.com/new → **Import** → `kopru` repozitoriyasini tanlang.
2. Framework avtomatik **Next.js** bo‘ladi. Build sozlamalarini o‘zgartirmang.
3. **Environment Variables** bo‘limiga `.env.example` dagi hamma qatorni kiriting (qiymatlari bilan):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   AI_PROVIDER_ORDER=groq,gemini,cerebras,openrouter,mistral
   GROQ_API_KEY=gsk_...
   GEMINI_API_KEY=AIza...
   CRON_SECRET=uzun-tasodifiy-satr-32-belgi
   NEXT_PUBLIC_SITE_URL=https://kopru.vercel.app
   ```
4. **Deploy** → 2–3 daqiqa → `https://kopru-xxx.vercel.app` manzil chiqadi.
5. Manzilni Supabase **URL Configuration** ga (Qadam 1.6) yozing va **Redeploy** shart emas — faqat Supabase tomonida saqlang.
6. **Cron** (`vercel.json` da bor): Vercel → Project → *Settings → Cron Jobs* da `/api/cron/daily` ko‘rinadi (Hobby rejada kuniga 1 marta — biz 01:00 UTC = 06:00 Toshkentga qo‘yganmiz). Vercel avtomatik `Authorization: Bearer CRON_SECRET` yuboradi.

### Qadam 5 — Birinchi kirish
1. Saytga kiring → **Ro‘yxat** → email + parol.
2. **Birinchi ro‘yxatdan o‘tgan foydalanuvchi avtomatik ADMIN** bo‘ladi (`handle_new_user` triggeri).
   Keyinchalik boshqa odamni admin qilish: Admin → Foydalanuvchilar → Rol → `admin`, yoki SQL:
   ```sql
   update public.profiles set role = 'admin' where username = 'valijon';
   ```
3. `https://sizning-sayt/api/health` — sozlamalar tekshiruvi (qaysi kalitlar bor, cron secret bormi).
4. Admin → AI sahifasida provayderlar 🟢 bo‘lishi kerak.

### Lokal ishga tushirish (ixtiyoriy)
```bash
cp .env.example .env.local   # qiymatlarni to'ldiring
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production tekshiruvi
```
**Demo rejim:** `.env.local` siz ham ishlaydi — progress brauzer `localStorage` da saqlanadi (AI, duel, liderlar jadvali o‘chiq).

---

## 3. AI limiti tugaganda nima bo‘ladi (muhim)

```
so'rov → [kesh bormi?] → ha: 0 limit sarflanadi, darhol javob
                      → yo'q: Groq → (429/limit) → Gemini → Cerebras → OpenRouter → Mistral
                                → hammasi band: javob {reason:'quota', retryAt, queued:true}
                                   • so'rov `ai_jobs` navbatiga tushadi
                                   • foydalanuvchi AI'siz mashqlarni davom ettiradi
                                   • keyingi muvaffaqiyatli AI so'rov (piggyback) yoki kunlik cron navbatni bajaradi
                                   • natija `ai_cache` ga tushadi → Bosh sahifada "AI material tayyorladi"
```
- **Cooldown**: 429 javobdagi `retry-after` / "try again in 7s" o‘qiladi; "per day" bo‘lsa — ertangi 00:00 UTC gacha o‘chadi. Holat `ai_provider_state` jadvalida (bir nechta Vercel instansiyasi ham ko‘radi).
- **Kontent banki**: bir foydalanuvchi uchun yaratilgan hikoya **hamma** uchun keshlanadi (`ai_cache`, kalit = kind+payload xeshi). Shuning uchun 100 ta foydalanuvchi ham kuniga bir necha o‘nlab so‘rov bilan kifoyalanadi.
- **Shaxsiy limit**: `app_settings.ai.daily_user_cap` (standart 40/kun) — bitta odam hamma limitni yeb qo‘ymaydi.
- **Cron** har kuni 2 ta "kun hikoyasi" (A1, A2) ni oldindan tayyorlab qo‘yadi.
- Admin → AI: provayderni o‘chirish/yoqish, tartib, kunlik cap, model, cooldown reset, navbatni "Hozir bajarish", keshni tozalash.

---

## 4. Pedagogik asos (nima uchun shunday qurilgan)

1. **Spaced repetition (FSRS-4.5)** — `src/lib/fsrs.ts`. Baho: xato=Again, ishora/sekin=Hard, to‘g‘ri=Good, tez=Easy. "Mukammal" = stability ≥ 21 kun.
2. **Retrieval practice** — har so‘z tanib olish → tinglash → eslash → yozish → jumla ketma-ketligida (recognition → production).
3. **Interleaving** — yangi dars ichiga eski navbatdagi so‘zlar aralashtiriladi (har 6 mashqdan keyin).
4. **Comprehensible input (i+1)** — AI hikoya faqat bilgan so‘zlaringiz + 6 ta yangi so‘z bilan yoziladi.
5. **L1 transfer** — o‘zbek–turk qarindoshligi: tovush mosliklari jadvali, 60+ qarindosh so‘z 2-darsda, yolg‘on do‘stlar alohida belgilangan (`words.false_friend`).
6. **Desirable difficulty / flow kanali** — aniqlik 65–93% oralig‘ida ushlab turiladi (`app_settings.flow`); juda oson → qiyinroq rejim, juda qiyin → yengil rejim.
7. **Micro-sessions** — 4–8 daqiqalik sessiyalar, kunlik maqsad 5–30 daqiqa (10 tavsiya).
8. **Variable reward + novelty** — kunlik rejim rotatsiyasi, "hali sinalmagan" rejimlar, combo konfetti, yutuqlar (common→legendary).
9. **Loss aversion, lekin shafqatli** — streak muzlatish (1 ta), qaytganda jazo emas, **XP ×2 bonus** (comeback).
10. **Xatolar ustida ishlash** — xato so‘z sessiya oxirida yana keladi (1 marta), statistikada "eng ko‘p xato so‘zlar".
11. **Multi-modal** — TTS (brauzer turkcha ovozi), STT (nutqni tanish), yozish, o‘qish, tinglash, gapirish — sertifikatning 4 bo‘limiga mos.
12. **Zeigarnik effekti** — tugallanmagan sessiya "Davom ettirish (12/26)" sifatida ko‘rsatiladi.

---

## 5. Admin panel (`/admin`)

| Sahifa | Nima qilish mumkin |
|---|---|
| Umumiy | Foydalanuvchilar, DAU/WAU, xavf ostidagilar, bugungi XP/daqiqa, 30 kunlik grafiklar, rejimlar, AI holati |
| Foydalanuvchilar | Rol, daraja, XP, streak, muzlatish, blok, vaqt zonasi, qiziqishlar; progressni **Reset**; o‘chirish |
| Kontent | Bo‘limlar, darslar, so‘zlar, grammatika (Markdown + drillar), qo‘lda mashqlar, questlar, yutuqlar — qo‘shish/tahrirlash/o‘chirish, qidirish, dars bo‘yicha filtr, **JSON import/eksport** |
| AI | Provayderlar (yoqish, tartib, model, kunlik cap, cooldown reset), umumiy AI sozlamalari, kontent banki, navbat |
| Sozlamalar | `xp`, `goals`, `srs`, `flow`, `features` (rejimlarni o‘chirish), `motivation`, `exam` — JSON |
| Loglar | Admin amallari va foydalanuvchi fikrlari |

### B1/B2 kontent qo‘shish (eng tez yo‘l)
1. Admin → Kontent → Bo‘limlar → **Qo‘shish** (cefr: B1).
2. Darslar → Qo‘shish (unit_id, kind: `vocab`/`grammar`/`dialog`/`boss`).
3. So‘zlar → **Import** — JSON massiv (istalgan AI’dan shu formatda so‘rang):
```json
[
  {"lesson_id": 41, "tr": "başvurmak", "uz": "murojaat qilmoq", "pos": "verb",
   "example_tr": "Üniversiteye başvurdum.", "example_uz": "Universitetga murojaat qildim.",
   "cognate": null, "false_friend": false, "tags": ["work"], "cefr": "B1"}
]
```
4. Grammatika → drillar formati: `[{"sentence":"Ben eve gel___.","answer":"dim","options":["dim","dım","tim","di"],"explain":"gel → e → -dim"}]`.
5. Mashq generatori (`src/lib/exercises.ts`) yangi so‘zlardan avtomatik 10 xil mashq yasaydi — qo‘lda mashq yozish shart emas.

---

## 6. Loyiha tuzilmasi

```
supabase/schema.sql      jadvallar, RLS, trigger, RPC (add_xp, record_review, complete_lesson, get_user_stats, admin_overview, reset_weekly_leagues…)
supabase/seed.sql        boshlang'ich kontent va sozlamalar
src/lib/fsrs.ts          FSRS-4.5 rejalashtiruvchi
src/lib/turkish.ts       unli/undosh uyg'unligi, yumshash, qo'shimchalar, o'xshashlik, tovush mosliklari
src/lib/exercises.ts     mashq generatorlari (dars, takrorlash, boss, duel, imtihon…)
src/lib/motivation.ts    zerikish detektori, rejim rotatsiyasi, flow kanali
src/lib/plan.ts          moslashuvchan reja dvigateli (sur'at, kerakli tezlik, 7 kunlik jadval, bosqichlar)
src/lib/themes.ts        7 ta mavzu: CSS o'zgaruvchilar + canvas fon parametrlari + boot skript
src/lib/i18n.tsx         UZ/TR lug'at, LangProvider, useLang (t/l), LangSwitch
src/lib/speech.ts        TTS/STT: /api/tts (neyron) → brauzer zaxirasi; ovoz tanlovi
src/lib/tts/edge.ts      Microsoft Edge neyron TTS protokoli (WebSocket), Google TTS zaxirasi
src/app/api/tts          audio keshi: xotira → Supabase Storage (tts bucket) → sintez
src/lib/ai/              provayderlar, promptlar, shlyuz (zanjir + cooldown + kesh + navbat)
src/lib/data.ts          yagona ma'lumot qatlami (Supabase yoki localStorage demo)
src/components/exercises ExerciseRunner (dvigatel), 10 ta mashq ko'rinishi, SessionEnd, GamePage
src/app/(app)/           dashboard, learn, play/[mode], story, duel, tutor, exam, stats, leaderboard, profile, admin/*
src/app/api/             ai, ai/jobs, tts, cron/daily, health
```

**Xavfsizlik:** RLS hamma jadvalda; foydalanuvchi XP/role/streak ni to‘g‘ridan-to‘g‘ri o‘zgartira olmaydi (`protect_profile_columns` triggeri) — faqat RPC orqali; AI kalitlari faqat serverda; `service_role` brauzerga chiqmaydi.

---

## 7. Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|---|---|
| Ro‘yxatdan o‘tgach "Email not confirmed" | Supabase → Auth → Providers → Email → *Confirm email* ni o‘chiring (yoki pochtadagi havolani bosing) |
| Login’dan keyin qayta login’ga qaytaradi | Supabase *URL Configuration* da Site URL / Redirect URL noto‘g‘ri; Vercel env’da `NEXT_PUBLIC_SUPABASE_*` tekshiring |
| AI "sozlanmagan" deydi | Vercel env’da `*_API_KEY` yo‘q yoki noto‘g‘ri; `/api/health` ga qarang; env o‘zgargach **Redeploy** |
| AI "Model/so‘rov xatosi (404)" | Provayder model nomini o‘zgartirgan — Admin → AI → Model maydonini yangilang |
| Turkcha ovoz chiqmaydi / sifati past | `supabase/migrations/003_tts_storage.sql` ishga tushirilganmi? `/api/tts?text=merhaba` ni brauzerda oching — mp3 kelishi kerak. Profil → Ovoz → Emel/Ahmet. Zaxira: Chrome/Edge brauzer ovozi (Android: *Google Text-to-speech* → Türkçe) |
| Mikrofon ishlamaydi | Faqat HTTPS (Vercel’da bor) va Chrome/Edge/Safari; ruxsat bering |
| Cron ishlamayapti | Vercel → Settings → Cron Jobs; `CRON_SECRET` env mavjudligi; Hobby rejada kuniga 1 marta |
| `permission denied` SQL xatosi | schema.sql ni to‘liq, bir marta, yuqoridan pastgacha ishga tushiring |

---

## 8. Keyingi qadamlar (g‘oyalar)
- Telegram bot orqali kunlik eslatma va mini-mashq (Vercel route + Telegram webhook).
- Push-bildirishnomalar (web-push, VAPID).
- Klub/jamoa musobaqalari (duel kodini guruhga kengaytirish).
- Sertifikat formatidagi to‘liq rasmiy namunalar (uzbmb.uz materiallari asosida) — Admin → Kontent → mashqlar.
- Ovozli hikoyalar — AI hikoyani to‘liq audio-kitob sifatida (TTS allaqachon bor, faqat bo‘lim-bo‘lim o‘qish kerak).
- Interfeysga yangi tillar (rus, ingliz) — `src/lib/i18n.tsx` da `Lang` turi va `DICT`ga ustun qo‘shish kifoya.

---

© VALIJON IBROXIMOV · TezBil — "O‘zbekdan turkka — tez va o‘yin orqali"

---

## 9. 2-yangilanish (v2) — qisqacha

> To‘liq tavsif va o‘rnatish ketma-ketligi: **UPDATE.md**. Majburiy qadam: Supabase SQL Editor → `supabase/migrations/002_social.sql` → Run.

- **21 ta o‘yin rejimi** (8 ta yangi: Blitz + kunlik chaqiriq, So‘z yomg‘iri, Minora, Bingo, Xotira kartalari, Harf terish, So‘z ko‘prigi, Rol o‘yini), har birida «Qanday o‘ynaladi» o‘rgatuvchisi va rekordlar jadvali.
- **Ijtimoiy qatlam**: do‘stlar, chat, «Hadi!» eslatma, asinxron chaqiriq-duel, faollik lentasi + reaksiyalar, klublar (50 kishigacha, klub chati, reyting), realtime bildirishnomalar.
- **Onboarding**: 5 qadamli usta, bosh sahifa coach-mark sayohati, kontekstli maslahatlar, murabbiy takliflari, kunlik 3 qadamli reja.
- **Grafika**: 8 ta animatsion manzara (har kirishda boshqasi, kun vaqtiga mos osmon), parallax, scroll-reveal, yangi landing. Profil → Ko‘rinish: To‘liq/Yengil/O‘chiq.
- `push.bat` — Windows’da bir bosishda commit + push.

---

## 10. 3-yangilanish (v3) — qisqacha

> To‘liq tavsif va o‘rnatish ketma-ketligi: **UPDATE-3.md**. Majburiy qadamlar: `npm install` (yangi paket `ws`) va Supabase SQL Editor → `003_tts_storage.sql` va `004_public_profile.sql` → Run.

- **Nom: TezBil**, muallif **© VALIJON IBROXIMOV** (logo, manifest, barcha sahifalar).
- **Xato tuzatildi**: `cannot add postgres_changes callbacks … after subscribe()` — bitta realtime kanal ikki marta ochilayotgan edi; endi bitta provayder, noyob kanal nomlari, to‘g‘ri yopish, xato chegarasi (`error.tsx`).
- **Tabiiy turkcha nutq**: Microsoft neyron ovozlar (Emel/Ahmet) → `/api/tts` → Supabase Storage kesh; zaxira Google TTS → brauzer.
- **Moslashuvchan reja** (`/plan`): maqsad daraja, imtihon sanasi, kunlik daqiqa → kerakli sur‘at, 7 kunlik jadval, bosqichlar, tuzatish maslahatlari; bosh sahifadagi «Bugungi reja» shundan oziqlanadi.
- **7 ta dizayn mavzusi** + jonli canvas fon (namunaviy kod asosida), birinchi kirishda tanlash, profilda jonli oldindan ko‘rish; yorug‘ mavzular uchun butun interfeys avtomatik moslashadi.
- **Interfeys tili: O‘zbekcha / Turkcha** — onboarding, yon panel va profilda almashtiriladi, profilga saqlanadi.
- **O‘yinlarda faqat o‘rganilgan so‘zlar** (havza paneli: «faqat o‘rganilgan» / «yangi so‘zlar ham»), misol jumlalarini 🔊 eshitish.
- **Reyting → profil**: statistikada umumiy reyting, `/u/username` ochiq profil, do‘st qo‘shish, chat, chaqiriq, klubga taklif.
