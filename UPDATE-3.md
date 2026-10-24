# ⚡ TezBil — 3-yangilanish: xato tuzatish, neyron turkcha nutq, moslashuvchan reja, 7 ta dizayn, UZ/TR interfeys, faqat o‘rganilgan so‘zlar, reyting → profil

**© VALIJON IBROXIMOV**

Bu arxivda **faqat o‘zgargan va yangi fayllar** bor. Loyiha papkasiga ustiga ko‘chiring (mavjud fayllar almashadi), keyin `push.bat` yoki terminal orqali push qiling.

---

## 1. O‘rnatish ketma-ketligi (≈ 7 daqiqa)

### 1.1 Fayllarni joylash
```
tezbil-update-3.zip  →  ochib, ichidagi hamma narsani loyiha papkasiga (package.json turgan joyga) ustiga tashlang.
```
**Ikki fayl o‘chirilishi kerak** (endi ishlatilmaydi, qolsa ham zarar qilmaydi, lekin toza bo‘lsin):
```
src/components/visual/SceneBackground.tsx
src/components/visual/scenes.ts
```
(Windows: Explorer’da o‘chiring yoki `del src\components\visual\SceneBackground.tsx src\components\visual\scenes.ts`.)

### 1.2 Paketlar (MAJBURIY — yangi paket `ws`)
```bash
npm install
```
`package.json` ga `ws` (WebSocket klienti — neyron TTS uchun) va `@types/ws` qo‘shildi. Vercel `npm install`ni o‘zi bajaradi, lekin lokal ishga tushirsangiz kerak. `package-lock.json` ham arxivda — ustiga yozing.

### 1.3 Supabase migratsiyalari (MAJBURIY — 2 ta fayl)
Supabase → **SQL Editor** → **New query** → faylni to‘liq nusxalab → **Run** (har biri alohida):

| # | Fayl | Nima qiladi |
|---|---|---|
| 1 | `supabase/migrations/003_tts_storage.sql` | `tts` nomli **public Storage bucket** (audio/mpeg, 2 MB) + o‘qish ruxsati. Bir marta sintez qilingan har so‘z/jumla shu yerda keshlanadi. |
| 2 | `supabase/migrations/004_public_profile.sql` | `public_profile(username)` RPC — reytingdan foydalanuvchi profiliga o‘tish (yutuqlar, rekordlar, klub, do‘stlik holati) uchun. |

> Ikkalasini qayta ishga tushirish xavfsiz (`on conflict do nothing` / `create or replace`).
> Agar v2 migratsiyasini (`002_social.sql`) hali bajarmagan bo‘lsangiz — avval uni bajaring.

### 1.4 Vercel env (ixtiyoriy)
Yangi majburiy env **yo‘q**. Ixtiyoriy:
| Env | Qiymat | Nima qiladi |
|---|---|---|
| `TTS_PROVIDER` | (bo‘sh) | Standart: Microsoft neyron → Google → brauzer |
| `TTS_PROVIDER` | `google` | Microsoft’ni o‘tkazib yuboradi (Google TTS → brauzer) |
| `TTS_PROVIDER` | `browser` | Server TTS butunlay o‘chiq, faqat brauzer ovozi |

`SUPABASE_SERVICE_ROLE_KEY` allaqachon bo‘lishi kerak (v1) — TTS keshini Storage’ga yozish uchun u ishlatiladi. Bo‘lmasa ham ishlaydi (faqat instansiya xotirasida keshlanadi).

### 1.5 Push
`push.bat` ni ikki marta bosing (Windows) yoki:
```bash
git add -A
git commit -m "v3: TezBil — realtime xato tuzatildi, neyron TTS, moslashuvchan reja, 7 mavzu, UZ/TR"
git push
```
Vercel 1–3 daqiqada deploy qiladi. Deploy tugagach brauzerda **Ctrl+F5** (eski CSS keshi tushib ketishi uchun).

### 1.6 Tekshirish (1 daqiqa)
0. Supabase → SQL Editor → `select public.public_profile('SIZNING_USERNAME');` — JSON qaytsa 004 ishlagan.
1. `https://SAYT/` — landing TezBil logotipi bilan ochiladi, yuqorida UZ/TR tugmasi va mavzu nuqtalari bor.
2. `https://SAYT/dashboard` — **xato yo‘q**, bosh sahifa ochiladi.
3. `https://SAYT/api/tts?text=Merhaba%20d%C3%BCnya` — brauzer mp3 ni ijro etadi (javob sarlavhasida `X-TTS-Source: edge` → neyron ovoz; `google` → zaxira).
4. Profil → Ko‘rinish → mavzuni bosing — sahifa darhol o‘zgaradi → Saqlash.
5. Profil → Til → Turkcha → interfeys turkchaga o‘tadi.

---

## 2. Nima tuzatildi — `cannot add postgres_changes callbacks … after subscribe()`

**Sabab.** Bildirishnoma qo‘ng‘irog‘i (`NotificationBell`) ikki joyda render bo‘lardi (yon panel + mobil sarlavha) va ikkalasi bir xil nomli realtime kanal (`notif:<user-id>`) ochardi. Supabase ikkinchi chaqiruvda **o‘sha, allaqachon obuna bo‘lgan** kanalni qaytaradi; unga yana `.on('postgres_changes')` qo‘shish — xato. Xato render ichida bo‘lgani uchun butun sahifa qulardi.

**Yechim.**
- `NotificationsProvider` — obuna **bitta joyda** (AppShell), ikkala qo‘ng‘iroq shu kontekstdan o‘qiydi.
- `social.ts`: `subscribeNotifications` / `subscribeMessages` kanal nomlariga noyob qo‘shimcha (`notif:<id>:<rand>`), `try/catch`, `removeChannel` bilan tozalash.
- Duel sahifasi: kanal ref, `busyRef` (ikki marta bosishdan himoya), chiqishda va «Yana duel»da kanallar yopiladi.
- `src/app/(app)/error.tsx` — klient xatosi bo‘lsa butun sayt o‘rniga «Qayta urinish / Bosh sahifa» kartasi chiqadi.

---

## 3. 🔊 Tabiiy turkcha nutq (TTS)

| Qatlam | Nima | Sifat |
|---|---|---|
| 1 | **Microsoft neyron ovozlar** — `tr-TR-EmelNeural` (ayol), `tr-TR-AhmetNeural` (erkak), Edge «Read Aloud» protokoli (bepul, kalitsiz) | ⭐⭐⭐⭐⭐ |
| 2 | Google Translate TTS (zaxira) | ⭐⭐⭐ |
| 3 | Brauzer ovozi (oflayn zaxira) | qurilmaga bog‘liq |

- Yo‘l: `GET /api/tts?text=…&voice=emel|ahmet&rate=slow|normal` → `audio/mpeg`, 1 yil keshlanadi (URL matn bo‘yicha deterministik).
- Kesh: instansiya xotirasi (300 ta) → **Supabase Storage `tts`** → sintez. Bir so‘z bir marta sintez qilinadi.
- Klient (`speech.ts`): `speak()` avval `/api/tts` ni ishlatadi; server 2 daqiqa javob bermasa brauzer ovoziga o‘tadi va keyin yana sinaydi. «Sekin» tugmasi `rate=slow` (−30%).
- Ovoz tanlovi: Onboarding (6-qadam) va Profil → 🔊 Turkcha ovoz: Emel / Ahmet / Brauzer, har biri 🔊 bilan sinab ko‘riladi; profilga saqlanadi.
- Barcha o‘yinlar (tinglash, bingo, yomg‘ir, xotira, rol o‘yini, darslar, hikoya) avtomatik yangi ovozdan foydalanadi — kod o‘zgarishi kerak emas.

> Microsoft protokoli norasmiy; agar bir kun o‘zgarsa — avtomatik Google → brauzer zaxirasi ishlaydi, sayt to‘xtamaydi. `Sec-MS-GEC-Version` dagi brauzer versiyasi `src/lib/tts/edge.ts` da bitta konstanta (`CHROMIUM`).

---

## 4. 🗺️ Moslashuvchan reja (`/plan`)

**Kirish:** maqsad daraja (A2…C1), imtihon sanasi (ixtiyoriy), kunlik daqiqa, maqsadlar (sertifikat/sayohat/ish/qiziqish).
**Hisob (`src/lib/plan.ts`, har renderda qayta):**
- Daraja uchun so‘z boyligi maqsadi: A1 500 · A2 1200 · B1 2500 · B2 4000 · C1 6000.
- Hozirgi sur‘at = (tanish so‘zlar / faol kunlar) × (oxirgi 14 kundagi faollik ulushi).
- Kerakli sur‘at = qolgan so‘zlar / qolgan kunlar (sana bo‘lmasa — daqiqadan).
- Holat: **oldinda / reja bo‘yicha / ortda / sana yo‘q / bajarildi** → tavsiya etilgan daqiqa, prognoz sana.
- **7 kunlik jadval**: har kun takrorlash; darslar haftada 3/5/6 kun (holatga qarab); zaif ko‘nikma o‘yini (aniqlik eng pastidan); yakshanba — sinov imtihoni yoki AI hikoya; shanba — qiziqarli o‘yin; budjet ≥ 30 daq bo‘lsa AI o‘qituvchi.
- **Bosqichlar** (A1→C1) sanalari bilan, **tuzatish maslahatlari** («kuniga +5 daqiqa qo‘shing», «grammatika qoqilyapti → Uyg‘unlik»…).
- **Bosh sahifadagi «Bugungi reja»** endi shu rejadan oziqlanadi (reja yo‘q bo‘lsa — eski 3 qadam). Onboarding’da 5-qadam reja tuzadi; keyin `/plan` da o‘zgartiriladi.

---

## 5. 🎨 7 ta dizayn mavzusi + jonli fon

| Mavzu | Rejim | Xarakter |
|---|---|---|
| 🌌 Tun | qorong‘i | chuqur ko‘k, zarg‘aldoq urg‘u (klassik) |
| ⬛ Grafit | qorong‘i | neytral kulrang, yashil-ko‘k urg‘u |
| 🔮 Binafsha | qorong‘i | binafsha nebula |
| 🌅 Tong | yorug‘ | iliq krem, shaftoli |
| ☁️ Osmon | yorug‘ | havorang, salqin |
| 📄 Qog‘oz | yorug‘ | oq, minimal, kontrast |
| 🌿 Yashil | yorug‘ | yashil-ko‘k, tabiat |

- **Jonli canvas fon** (`ThemeBackground`, namunaviy kod asosida): oldindan chizilgan gradient + nebula yog‘dulari + (ixtiyoriy) setka/yulduzlar + vinyetka; ustida suzuvchi yorug‘ tugunlar tarmog‘i (impulslar bilan), ko‘tarilgan turkcha harflar, pastda ikki garmonik to‘lqin. Adaptiv sifat (FPS pastlasa zarrachalar kamayadi), DPR cheklovi, tab yopiq bo‘lsa pauza, `prefers-reduced-motion` → statik.
- **To‘liq / Yengil / O‘chiq** — profil va onboarding’da.
- **Butun interfeys yorug‘ mavzularga avtomatik moslashadi**: Tailwind `white` va `ink-*` ranglari endi CSS o‘zgaruvchilar (`--fg`, `--ink-*`, `--accent`) orqali — yorug‘ mavzuda «oq» matn avtomatik qora bo‘ladi, shisha kartalar oq bo‘ladi, rangli matnlar (`text-teal-300` kabi) to‘qlashtiriladi.
- **Miltillashsiz**: `layout.tsx` dagi inline skript mavzuni localStorage’dan **birinchi bo‘yashdan oldin** qo‘llaydi.
- **Birinchi kirishda tanlash**: Onboarding 1-qadam — 7 karta, bosilganda butun sahifa darhol o‘zgaradi. Landing’da ham mavzu tugmalari bor.
- Profilda tanlov darhol ko‘rinadi, «Saqlash» profilga yozadi (boshqa qurilmalarda ham shu).

---

## 6. 🌐 Interfeys tili: O‘zbekcha / Turkcha

- `src/lib/i18n.tsx`: `LangProvider`, `useLang()` → `t('key')` (umumiy lug‘at) va `l({ uz, tr })` (joyida ikki tilli matn), `LangSwitch`.
- Til: Onboarding 0-qadam, yon panel pastidagi UZ/TR tugmasi, Profil → Til. Tanlov profilga (`settings.lang`) va localStorage’ga yoziladi; brauzer turkcha bo‘lsa avtomatik `tr`.
- Hamma sahifalar, o‘yinlar («Qanday o‘ynaladi» ham), mashq ko‘rinishlari, maslahatlar, sayohat, bildirishnomalar, reja, statistika — ikki tilda. **O‘quv kontenti** (so‘zlar, dars tushuntirishlari) o‘zbekcha qoladi — bu o‘rgatish tili; dars/bo‘lim sarlavhalari `title_tr` bo‘lsa turkchada ko‘rinadi.
- Yangi til qo‘shish: `Lang` turiga qo‘shing, `DICT`ga ustun, `LANGS` ro‘yxatiga yozuv — `l({uz,tr})` chaqiruvlari uchun fallback `uz`.

---

## 6a. 📚 O‘yinlarda faqat o‘rganilgan so‘zlar

**Muammo.** O‘yinlarda hali o‘rganilmagan so‘zlar chiqardi. Sabab: «tanish so‘zlar» hisobida **ochiq, lekin hali o‘tilmagan** darslar (`available`) ham sanalardi, yetmasa esa indamay keyingi darslardan to‘ldirilardi.

**Yechim (`src/lib/wordpool.ts`).**
- **O‘rganilgan so‘z** = boshlangan/yakunlangan darslar so‘zlari **+** SRS’da kamida bir marta ko‘rilgan so‘zlar.
- Har o‘yinning boshlanish ekranida **havza paneli**: `📚 N tanish so‘z` va rejim tugmasi — **«✓ faqat o‘rganilgan»** (standart) / **«＋ yangi so‘zlar ham»**. Tanlov saqlanadi (`tezbil.pool`).
- So‘z yetarli bo‘lmasa «Boshlash» o‘chiq bo‘ladi va ikkita yo‘l taklif qilinadi: **📘 Keyingi darsga** yoki **＋ Yangi so‘zlar bilan o‘ynash** (ongli tanlov — indamay emas).
- Chalg‘ituvchi variantlar ham imkon qadar tanish so‘zlardan; Xotira kartalari raundlari so‘z soniga moslashadi (8 → 1 raund, 16 → 2, 24+ → 3); Minora/Uyg‘unlik grammatika mashqlari ham avval tanish so‘zlardan.
- Istisno: **Kunlik Blitz** (hamma uchun bir xil A1 savollar) va **Qarindosh so‘zlar** (maqsadi — hali o‘rganilmagan, lekin o‘zbekchaga o‘xshash so‘zlar).

## 6b. 🔊 Misollarni eshitish
- Yangi so‘z kartasida (dars ichida) misol jumlasi yonida 🔊 — neyron ovozda eshitiladi.
- Dars → «So‘zlar» ro‘yxatida har so‘zning misoli alohida 🔊 tugmali qator sifatida.
- Mashqdan keyingi izohda (misol jumla) 🔊 tugmasi.

## 6c. 🏆 Umumiy reyting → profil → do‘stlik / chat / klub
- **Statistika** sahifasida «Umumiy reyting» bo‘limi: top-7 + sizning o‘rningiz, to‘liq jadvalga havola.
- **Reyting** sahifasida har qatorda ism → profil; ➕ do‘stlik so‘rovi; 💬 chat (do‘stlar bilan). Ochiq klublarga «Qo‘shilish».
- **Yangi sahifa `/u/[username]`** — ochiq profil: daraja, liga, XP, streak, tanish so‘zlar, darslar, yutuqlar, rekordlar, klub. Tugmalar: **Do‘st qo‘shish / qabul qilish**, **Xabar yozish** (chat paneli), **Chaqiriq**, **Hadi!**, **Klubga taklif** (sizning klubingizga — unga bildirishnoma boradi, kod bilan bir bosishda qo‘shiladi) yoki **Guruh (klub) yaratish**.
- Do‘stlar, so‘rovlar, klub a’zolari, chaqiriq natijasi — hammasida ism profilga olib boradi.

## 7. Nom va muallif
- **TezBil** — logotip (⚡ + ko‘prik yoyi), `manifest.json`, `layout.tsx` metadata, barcha sahifalar, AI tizim prompti.
- **© VALIJON IBROXIMOV** — yon panel pastida, landing footer’ida, login sahifasida, manifest’da.

---

## 8. O‘zgargan fayllar (qisqacha xarita)

```
package.json, package-lock.json, next.config.mjs         ws paketi, serverExternalPackages
tailwind.config.ts, src/app/globals.css                   CSS o'zgaruvchili ranglar, yorug' rejim moslashuvi
src/app/layout.tsx                                        TezBil metadata, mavzu boot skripti
src/app/page.tsx                                          landing (TezBil, UZ/TR, mavzu tanlash)
src/app/login/page.tsx                                    TezBil, ikki tilli
src/app/(app)/error.tsx                                   xato chegarasi (yangi)
src/app/(app)/onboarding/page.tsx                         7 qadam: til, dizayn, daraja, maqsad, kunlik, reja, ism/ovoz
src/app/(app)/profile/page.tsx                            mavzu/fon/til/ovoz tanlovlari
src/app/(app)/plan/page.tsx                               moslashuvchan reja (yangi)
src/app/(app)/dashboard/page.tsx                          rejadan oziqlanadigan «Bugungi reja», ikki tilli
src/app/(app)/play/**                                     21 o'yin — ikki tilli
src/app/(app)/learn/**, exam, tutor, friends, club, challenge, leaderboard, stats, story, duel — ikki tilli
src/app/api/tts/route.ts                                  TTS endpoint (yangi)
src/lib/tts/edge.ts                                       Microsoft neyron TTS + Google zaxira (yangi)
src/lib/speech.ts                                         speak() → /api/tts → brauzer
src/lib/themes.ts, src/components/visual/ThemeBackground.tsx   mavzular + canvas fon (yangi)
src/lib/i18n.tsx                                          UZ/TR (yangi)
src/lib/plan.ts                                           reja dvigateli (yangi)
src/lib/motivation.ts, suggestions.ts                     ikki tilli rejim nomlari/takliflar
src/lib/social.ts                                         noyob realtime kanallar, tozalash
src/components/AppShell.tsx                               TezBil, LangProvider, NotificationsProvider, ThemeBackground
src/components/social/NotificationBell.tsx                bitta obuna (xato tuzatish)
src/components/ThemePicker.tsx, VoicePicker.tsx           tanlov panellari (yangi)
src/components/{Tip,Tour,games/*,exercises/*}.tsx         ikki tilli
supabase/migrations/003_tts_storage.sql                   TTS bucket (yangi)
supabase/migrations/004_public_profile.sql                ochiq profil RPC (yangi)
src/lib/wordpool.ts, src/components/games/PoolBar.tsx     o'rganilgan so'zlar havzasi + panel (yangi)
src/app/(app)/u/[username]/page.tsx                       ochiq foydalanuvchi profili (yangi)
src/app/(app)/leaderboard/page.tsx, stats/page.tsx        reyting → profil, ➕ do'st, 💬 chat; statistikada umumiy reyting
public/manifest.json, public/icon.svg                     TezBil
README.md, UPDATE-3.md, push.bat
```

---

## 9. Ma’lum cheklovlar
- Microsoft TTS — norasmiy protokol. Agar Microsoft tomonda o‘zgarsa, `X-TTS-Source: google` bo‘ladi (sifat pastroq, lekin ishlaydi). Keyingi yangilanishda `CHROMIUM` konstantasi yangilanadi.
- Vercel Hobby’da funksiya 10 s (Pro 30 s) — bitta jumla 1–2 s da sintez bo‘ladi; uzun matnlar 400 belgida kesiladi.
- Reja sur‘ati statistikaga asoslangan taxmin: dastlabki 3–4 kunda «sur‘at» noto‘g‘ri ko‘rinishi mumkin, keyin barqarorlashadi.
