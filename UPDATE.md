# 🌉 Köprü — 2-yangilanish: o‘yinlar, ijtimoiy qatlam, onboarding, grafika

Bu arxivda **faqat o‘zgargan va yangi fayllar** bor. Loyiha papkasiga ustiga ko‘chiring (mavjud fayllar almashadi), keyin `push.bat` yoki terminal orqali push qiling.

---

## 1. O‘rnatish ketma-ketligi (5 daqiqa)

### 1.1 Fayllarni joylash
```
kopru-update-2.zip  →  ochib, ichidagi hamma narsani loyiha papkasiga (package.json turgan joyga) ustiga tashlang.
```
Hech qanday paket qo‘shilmagan — `npm install` shart emas.

### 1.2 Supabase migratsiyasi (MAJBURIY)
Supabase → **SQL Editor** → **New query** → `supabase/migrations/002_social.sql` ni to‘liq nusxalab → **Run**.

Bu quyidagilarni qo‘shadi: `friendships`, `notifications`, `activities`, `reactions`, `clubs`, `club_members`, `messages`, `challenges`, `high_scores` jadvallari; RLS; RPC funksiyalar (`search_users`, `friends_list`, `create_club`, `join_club`, `submit_score`, `submit_challenge_score`, `friends_feed`…); avtomatik faollik triggerlari; Realtime; 5 ta yangi yutuq; `check_achievements` yangilanishi.

> Qayta ishga tushirish xavfsiz (`if not exists` / `or replace`).

### 1.3 Realtime tekshiruvi
Supabase → **Database → Replication** → `supabase_realtime` publication ichida `duels, notifications, messages, challenges, friendships` bo‘lishi kerak (migratsiya o‘zi qo‘shadi; bo‘lmasa qo‘lda belgilang).

### 1.4 Push
`push.bat` ni ikki marta bosing (Windows) yoki:
```bash
git add .
git commit -m "v2: yangi o'yinlar, do'stlar/klublar/chaqiriqlar, onboarding, manzarali fon"
git push
```
Vercel avtomatik deploy qiladi (1–3 daqiqa). Env o‘zgaruvchilarga o‘zgarish YO‘Q.

---

## 2. Nima qo‘shildi

### 🎮 8 ta yangi o‘yin (jami 21 rejim), har birida «Qanday o‘ynaladi» o‘rgatuvchi
| Rejim | Yo‘l | Mexanika | Rekord |
|---|---|---|---|
| ⚡ Blitz | `/play/blitz` | 60 soniya, 4 variant, tezlik + combo bonusi, har 5 ketma-ket +3 s. **Kunlik chaqiriq** (`?daily=1`): hamma uchun bir xil 40 savol | ✅ |
| 🌧️ So‘z yomg‘iri | `/play/rain` | Tushayotgan turkcha so‘zlardan to‘g‘risini ushlash, 3 jon, tezlashuvchi, 25 so‘z | ✅ |
| 🗼 Minora | `/play/tower` | 20 qavat, qiyinlik oshadi (tanlov → tinglash/uyg‘unlik → grammatika/yozish → jumla), 3 jon, har 5-qavatda +1 jon | ✅ (qavat) |
| 🎱 Bingo | `/play/bingo` | 4×4 karta, chaqiruv (matn yoki faqat 🔊), 6,5 s taymer, qator = BINGO | ✅ |
| 🃏 Xotira kartalari | `/play/memory` | 16 ta yopiq karta, 8 juft, 3 raund, kam yurish = bonus | ✅ |
| 🔡 Harf terish | `/play/anagram` | Aralash harflardan so‘z, ishora (−2), 10 so‘z | ✅ |
| 🌉 So‘z ko‘prigi | `/play/bridge` | Hangman: har xato harf — ko‘prikdan taxta tushadi (6 ta), turkcha klaviatura | ✅ |
| 🎭 Rol o‘yini | `/play/roleplay` | Dars dialoglaridan sahnalar: A gapiradi, siz B javobini tanlaysiz | — |

- Barcha o‘yinlar FSRS ga yozadi (`src/lib/srs-client.ts`) — o‘yin ham takrorlash.
- Mavjud 8 rejimga ham o‘rgatuvchi qo‘shildi (`HowToPlay`, birinchi kirishda avtomatik, keyin «?»).
- O‘yinlar sahifasi kategoriyalar bilan: Arkada, Miya, Asosiy, Ijtimoiy, AI, Imtihon; «Kun o‘yini» (+50% XP) va «yangi» belgilari.

### 🤝 Ijtimoiy qatlam
- **Do‘stlar** (`/friends`): qidirish, so‘rov/qabul, ro‘yxat (kim oldinda), «Hadi!» eslatma, **chat** (faqat do‘stlar, tez xabarlar, turkcha klaviatura).
- **Chaqiriq = asinxron duel** (`/challenge/[id]`): 20 ta bir xil savol, har kim o‘z vaqtida, 3 kun; g‘olib 40 XP, mag‘lub 10, durang 25. Bildirishnoma orqali natija.
- **Faollik lentasi** (do‘stlar + klubdoshlar): dars, yutuq, streak, daraja, rekord, duel/chaqiriq g‘alabasi — avtomatik (DB triggerlar); 👏🔥💪😍🎉 reaksiyalar.
- **Klublar** (`/club`): yaratish/kod bilan kirish, 50 kishigacha, a’zolar haftalik XP, klub chati (realtime), klublar reytingi, egasi chiqarishi mumkin.
- **Bildirishnomalar**: qo‘ng‘iroqcha (desktop va mobil), realtime, o‘qilmaganlar soni, bosilsa tegishli sahifaga.
- **Reyting** (`/leaderboard`): Liga · Do‘stlar · Kunlik · O‘yin rekordlari (o‘yin tanlash) · Klublar · Hammasi.
- Profil: «Do‘stlar menga shaxsiy xabar yoza oladi» (allow_dm).
- Admin: Umumiy sahifada ijtimoiy KPI; Kontent → Klublar, Xabarlar (moderatsiya), Faollik lentasi.

### 🧭 Onboarding va takliflar
- `/onboarding` ustasi (5 qadam): salom + 4 tamoyil, daraja, maqsad (nega), kunlik daqiqa, ism/avatar → bosh sahifa **coach-mark sayohati** (6 nuqta).
- `Tip` — bir martalik kontekstli maslahatlar (o‘yinlar, do‘stlar, chaqiriqlar, klub, reyting, statistika, lenta).
- **Murabbiy taklifi** (`src/lib/suggestions.ts`): chaqiriq kutmoqda, navbat to‘plandi, kunlik Blitz, kech bo‘ldi — 5 daqiqa yetadi, do‘st qo‘shing, grammatika qoqilyapti, gapirmadingiz, yangi o‘yin, birinchi dars.
- **Bugungi reja**: 3 qadam (takrorlash → dars → o‘yin), bajarilgani belgilanadi.
- Profil → «Maslahat va sayohatni qayta ko‘rsatish», «Boshlang‘ich sozlash».
- Yangi foydalanuvchi uchun noto‘g‘ri «Qaytganingiz bilan» xatosi tuzatildi.

### 🎨 Grafika
- **8 ta animatsion manzara** (`src/components/visual/scenes.ts`): Bosfor ko‘prigi, Kapadokiya sharlari, Pamukkale, O‘rta yer dengizi, Toros tog‘lari, Anado‘li tunlari, Ipak yo‘li karvoni, Qora dengiz choyzorlari. Har kirishda (yangi tab) boshqasi; osmon kun vaqtiga moslashadi (tong/kun/oqshom/tun); yulduzlar miltillaydi, bulutlar suzadi, sharlar uchadi, to‘lqinlar, tuman, uchar yulduz, qushlar.
- **Parallax**: scroll bilan landshaft qatlamlari turli tezlikda siljiydi.
- **Scroll-reveal** (`Reveal`): kartalar paydo bo‘ladi (up/left/right/scale), `CountUp` raqamlar, `ScrollProgress` chizig‘i, marquee, glass panellar, tilt-hover, nurlar (`.rays`), aurora matn.
- Landing sahifa qayta dizayn: sahna almashinuvi (9 s), sticky «Bir kun — 15 daqiqa» bo‘limi, ijtimoiy blok, CTA.
- Profil → **Ko‘rinish**: To‘liq / Yengil / O‘chiq; manzara tanlash yoki «har kirishda boshqa». `prefers-reduced-motion` hurmat qilinadi.

---

## 3. O‘zgargan / yangi fayllar
```
UPDATE.md, push.bat, README.md (9-bo‘lim)
supabase/migrations/002_social.sql                      (YANGI — ishga tushiring!)
src/app/globals.css                                      (fon shaffofligi, animatsiyalar)
src/app/page.tsx                                         (landing)
src/components/AppShell.tsx                              (fon, bell, nav, onboarding redirect)
src/components/Tip.tsx, Tour.tsx                         (YANGI)
src/components/visual/{scenes.ts, SceneBackground.tsx, Reveal.tsx}   (YANGI)
src/components/games/{GameShell.tsx, HowToPlay.tsx, BlitzEngine.tsx} (YANGI)
src/components/social/{ChatPanel.tsx, Feed.tsx, NotificationBell.tsx} (YANGI)
src/components/exercises/GamePage.tsx                    (howTo)
src/lib/{social.ts, suggestions.ts, srs-client.ts}       (YANGI)
src/lib/motivation.ts                                    (21 rejim, kategoriyalar, comeback tuzatish)
src/lib/local.ts                                         (demo: onboarded=false)
src/app/(app)/dashboard/page.tsx, play/page.tsx, leaderboard/page.tsx, profile/page.tsx, stats/page.tsx
src/app/(app)/play/[mode]/page.tsx                       (o‘rgatuvchilar)
src/app/(app)/play/{blitz,rain,anagram,memory,bingo,tower,roleplay,bridge}/page.tsx (YANGI)
src/app/(app)/{friends,club,onboarding}/page.tsx, challenge/[id]/page.tsx (YANGI)
src/app/(app)/admin/page.tsx, admin/content/page.tsx
```

## 4. Tekshiruv ro‘yxati (deploydan keyin)
1. Yangi akkaunt → `/onboarding` chiqadimi → bosh sahifa sayohati.
2. `/play/blitz` → o‘rgatuvchi → 60 s → natija → `/leaderboard?tab=games&game=blitz` da rekord.
3. Ikki akkaunt: A qidiradi B ni → so‘rov → B qabul qiladi → A «Chaqiriq» → o‘ynaydi → B ga bildirishnoma → B o‘ynaydi → ikkalasida natija + XP.
4. Klub yaratish → kod bilan boshqa akkaunt kiradi → chat → `/leaderboard?tab=clubs`.
5. Profil → Ko‘rinish → manzara almashtirish.

## 5. Keyingi g‘oyalar
- Push-bildirishnomalar (web-push) va Telegram bot eslatmalari.
- Haftalik turnir (klublar o‘rtasida) va mavsumiy mukofotlar.
- Krossvord generatori, «Hikoya tanlovi» (AI tarmoqlanuvchi dialog).
- Ovozli xabarlar chatda (talaffuz amaliyoti).
