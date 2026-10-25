# ⚡ TezBil — 7-yangilanish: tezlik, nutq diagnostikasi, ovozli AI suhbat, model narvoni, jiddiy xato tuzatish

**© VALIJON IBROXIMOV** · 2026-10-25 · Asos: GitHub `main` (20d16df — ChatGPT 1–3-bosqichlari qo‘shilgan holat).

Bu ZIP’da **faqat o‘zgargan va yangi fayllar** bor. Ichidagilarni `package.json` turgan papkaga ko‘chiring → «barchasini almashtirish» → `push.bat`.
**Yangi npm paketi yo‘q. Yangi SQL migratsiya yo‘q. Majburiy env o‘zgarishi yo‘q.** (Avvalgi 003/004 SQL bajarilgan bo‘lishi kerak.)

---

## 1. Nima tuzatildi / qo‘shildi (qisqa)

| # | Muammo (siz yozgan) | Yechim |
|---|---|---|
| 1 | **Sayt qotyapti, har sahifada hammasi qayta yuklanayotgandek** | Asosiy sabab topildi: `middleware.ts` **har bir sahifa almashinuvida** (va har AI so‘rovida) Supabase Auth serveriga tarmoq so‘rovi yuborardi (`getUser()`), bu +200…600 ms. Endi: faqat to‘liq sahifa yuklanishida tekshiriladi; klient-navigatsiya, prefetch va `/api/*` tekshiruvsiz; cookie yo‘q bo‘lsa tarmoqsiz redirect. Qo‘shimcha: kartalardagi `backdrop-blur` olib tashlandi (telefon GPU’si uchun eng og‘ir effekt), shisha effekti faqat kuchli qurilmalarda; kontent (so‘zlar/darslar/grammatika) **localStorage’da 30 daqiqa keshlanadi** — sahifa darhol ochiladi, yangilanish fonda; fon rejimi qurilmaga qarab avtomatik (telefon → yengil statik, kuchli kompyuter → jonli). |
| 2 | **Logo bosilganda bosh sahifaga o‘tmaydi** | Ilova ichidagi logo → `/dashboard` (to‘g‘ridan-to‘g‘ri). Landing’da kirgan foydalanuvchi uchun tugmalar «Bosh panel →» bo‘ladi. Logo chizmasi ham tuzatildi (yashirin yon paneldagi gradient id to‘qnashuvi sabab mobil sarlavhada chaqmoq ko‘rinmasdi). |
| 3 | **Dars sahifasi ochilmay qolishi** (ChatGPT yangilanishidan keyin) | `learn/[id]`da jiddiy xato: `active` nomli ikki o‘zgaruvchi to‘qnashgan — davom etadigan sessiya bo‘lmasa sahifa **abadiy «yuklanmoqda»**da qolardi. Tuzatildi. |
| 4 | **Talaffuz yomon** | Server TTS zanjiri endi **ko‘rinadigan**: `/api/tts/status` har manbani tekshiradi; Profil → Ovoz bo‘limida «Hozirgi ovoz manbai: …» ko‘rinadi; Admin → AI sahifasida TTS kartasi. Agar u **Google** yoki **Brauzer** desa — Microsoft neyron ovoz ishlamayapti; yechim pastda (§3). Edge TTS 403 (soat farqi) uchun avtomatik tuzatish; **Azure Speech** (rasmiy, bepul 500 000 belgi/oy) ixtiyoriy provayder sifatida qo‘shildi — kalit bo‘lsa birinchi navbatda ishlatiladi. |
| 5 | **AI «dam olmoqda», Mistral 429** | **Model narvoni**: bitta model limiti tugasa shu provayderning boshqa bepul modeli (Groq: 70B → gpt-oss-120b → Llama-4-Scout → Qwen3-32B → 8B; Gemini: 2.5 Flash-Lite → 2.5 Flash → 2.0 Flash-Lite; Mistral: Nemo → Small) — keyin keyingi provayder. Qisqa `Retry-After` (≤3 s, Mistral «1 so‘rov/soniya») bo‘lsa kutib bir marta qayta uriladi. Xato matnida qaysi provayderlar sozlangani va maslahat ko‘rinadi. |
| 6 | **Bepul AI chatbot + og‘zaki suhbat** | AI o‘qituvchida **🎙️ Ovozli suhbat** rejimi: mikrofon (brauzer nutqni tanish, bepul) → turkcha matn → AI javobi → neyron ovoz → yana tinglaydi (hands-free). «To‘xtatish», jim turganda pauza, yozma rejimda ham «ovoz» tugmasi (javob avtomatik o‘qiladi). |
| 7 | **O‘tilmagan so‘zlar** | ChatGPT’ning «faqat SRS’da mashq qilingan so‘zlar» qoidasi saqlandi; «yangi so‘zlar ham» rejimida o‘yin oldidan tanishtirish **ko‘pi bilan 10 ta yangi so‘z** (avval 81 ta karta chiqardi — charchatadi). |

---

## 2. O‘rnatish (3 daqiqa)
1. ZIP → loyiha papkasiga, almashtirish → `push.bat`.
2. Deploy tugagach brauzerda **Ctrl+F5**.
3. Tekshirish: `https://SAYT/api/tts/status` → `"active": "edge"` yoki `"azure"` bo‘lsa neyron ovoz ishlayapti.

---

## 3. 🔊 Talaffuz: nima qilish kerak (aniq ketma-ketlik)

`/api/tts/status` natijasiga qarab:

| `active` | Ma’nosi | Qadam |
|---|---|---|
| `azure` | Rasmiy Microsoft neyron ovoz (Emel/Ahmet) | Hech narsa kerak emas — eng yaxshi holat |
| `edge` | Microsoft neyron ovoz (Edge protokoli) | Yaxshi. Protokol o‘zgarsa avtomatik Google’ga tushadi — shuning uchun Azure kalitini zaxira sifatida qo‘shib qo‘ying |
| `google` | Google TTS (sifat o‘rtacha) | Microsoft ishlamayapti → **Azure kalitini qo‘shing** (pastda) |
| `browser` | Server TTS umuman ishlamayapti | `providers.*.error` matnini o‘qing; Vercel loglarini ko‘ring |

**Azure Speech bepul kaliti (10 daqiqa, karta talab qilinishi mumkin — lekin F0 tarif 0 so‘m):**
1. https://portal.azure.com → **Create a resource** → «Speech» → Pricing tier **Free (F0)**, Region **West Europe** (yoki yaqin region).
2. Resource → **Keys and Endpoint** → KEY 1 va Location/Region (masalan `westeurope`).
3. Vercel → Project → Settings → Environment Variables:
   - `AZURE_SPEECH_KEY` = KEY 1
   - `AZURE_SPEECH_REGION` = `westeurope`
4. **Redeploy**. `/api/tts/status` → `"active": "azure"`.
F0 limiti: oyiga 500 000 belgi neyron ovoz — kesh (Supabase Storage) tufayli har so‘z bir marta sintez qilinadi; bu minglab foydalanuvchiga yetadi.

Talabalar uchun: **Azure for Students** (institut emaili bilan, kartasiz, $100 kredit) ham ishlaydi.

---

## 4. 🤖 Bepul AI: obunalar haqida to‘g‘ri javob

**ChatGPT Pro, Claude Pro, Gemini (Google AI Pro) obunalari saytga ulanmaydi.** Ular — shaxsiy chat ilovalari uchun; dasturlar uchun **API** alohida, alohida hisob-kitob bilan. Saytdagi foydalanuvchilar sizning obunangiz orqali so‘rov yubora olmaydi (texnik ham, shartnoma bo‘yicha ham).

Saytda ishlaydigan **bepul API tier**lar (hozirgi zanjir): Groq, Google Gemini (AI Studio bepul kaliti — obunasiz ham bor), Cerebras, OpenRouter `:free`, Mistral Experiment. Sizning deployingizda `/api/health` ko‘ra: Groq, Gemini, OpenRouter, Mistral sozlangan. **Cerebras** kalitini ham qo‘shing (https://cloud.cerebras.ai — bepul, kuniga ~1M token): `CEREBRAS_API_KEY`.

Nega 429 bo‘lgan edi: Groq’ning `llama-3.3-70b-versatile` modeli bepul tarifda **kuniga 100 000 token** — bir necha o‘nlab suhbatdan keyin tugaydi; keyin Gemini (kuniga ~250–1500 so‘rov), OpenRouter free (~50 so‘rov/kun) ham tugasa Mistral «1 so‘rov/soniya» cheklovi bilan qolardi. Endi Groq ichida model narvoni (har model alohida limitli) va qisqa kutish bilan qayta urinish bor — amalda kunlik sig‘im bir necha barobar.

**Og‘zaki suhbat** — mavjud variantlar:
- ✅ Hozir qo‘shilgan (bepul): brauzer nutqni tanish (Chrome/Edge/Safari) + AI zanjiri + neyron TTS. Kechikish ~2–4 s.
- Keyingi bosqich (ixtiyoriy): **Gemini Live API** — haqiqiy real vaqt audio suhbat, bepul tierda bir vaqtda 3 ta sessiya cheklovi; brauzerdan WebSocket + ephemeral token kerak. Istasangiz keyingi yangilanishda qo‘shaman.

---

## 5. Texnik tafsilot (fayl → nima)

```
src/middleware.ts                         auth tekshiruvi faqat to'liq yuklanishda; RSC/prefetch/API tekshiruvsiz; cookie yo'q → tarmoqsiz redirect
src/lib/content-cache.ts                  xotira 60 s + localStorage 30 daq (stale-while-revalidate)
src/app/globals.css                       .card blur yo'q; .glass blur faqat (min-width:768px) and (hover:hover); data-ambient=lite/off → blur yo'q
src/lib/themes.ts                         autoAmbient(), currentAmbient(), applyAmbient → <html data-ambient>
src/components/AppShell.tsx               logo → /dashboard; adaptiv fon; Logo gradient id noyob (useId)
src/app/page.tsx                          kirgan foydalanuvchi uchun «Bosh panel →»; adaptiv fon
src/app/(app)/onboarding/page.tsx         fon rejimi qurilmaga qarab
src/app/(app)/learn/[id]/page.tsx         `active` to'qnashuvi tuzatildi (dars ochilmay qolishi)
src/lib/tts/edge.ts                       403 → soat farqini tuzatib qayta urinish; azureSynthesize(), azureConfigured()
src/lib/tts/status.ts                     manbalar statistikasi (yangi)
src/app/api/tts/route.ts                  zanjir: Storage → Azure → Edge → Google; natijalar status'ga yoziladi
src/app/api/tts/status/route.ts           diagnostika endpointi (yangi, 60 s kesh)
src/components/VoicePicker.tsx            «Hozirgi ovoz manbai» kartasi + maslahat
src/app/(app)/admin/ai/page.tsx           TTS holati kartasi
src/lib/ai/gateway.ts                     MODEL_LADDER, qisqa Retry-After bilan qayta urinish, detail xabari
src/lib/types.ts                          AiResult.model, AiFailure.detail
src/lib/speech.ts                         listenLive() — oraliq natijali tinglash (suhbat rejimi)
src/app/(app)/tutor/page.tsx              🎙️ Ovozli suhbat rejimi, avtomatik o'qish, ikki tilli murabbiy bloki, xato tafsiloti
src/lib/wordpool.ts                       MAX_NEW_PER_GAME = 10; so'zma-so'z to'ldirish
```

Tekshiruv: `npm run typecheck` ✓, `npm run build` ✓ (43 sahifa), `node tests/regression.cjs` ✓, `node tests/stage2.cjs` ✓, `node tests/stage3.cjs` ✓, Playwright smoke (landing → onboarding → dashboard → reja → profil → 21 o‘yin, UZ/TR, mobil 390px) — 0 xato.

Cheklov: Microsoft Edge TTS va Supabase bilan to‘liq end-to-end sinov bu muhitda tarmoq cheklovi sabab bajarilmadi — shuning uchun `/api/tts/status` qo‘shildi: deploydan keyin 10 soniyada haqiqiy holatni ko‘rasiz.
