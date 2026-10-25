# Köprü / TezBil — 1-bosqich: o‘quv mantiqi, talaffuz va barqarorlik

Tayyorlangan: 2026-10-25. Asos: foydalanuvchi yuborgan kopru-main.zip,
GitHub arxiv reviziyasi b52d924f9fb9ee475477b2a08742901c380af71a.

## O‘rnatish — ko‘chirish va almashtirish

1. Hozirgi loyiha papkangiz nusxasini saqlang yoki Git commit qiling.
2. ZIPni oching. Ichidagi `src`, `tests`, `.env.example` va ushbu yo‘riqnomani
   loyihangizning **package.json turgan papkasiga** ko‘chiring. `src` ichiga yana
   bitta `src` joylab yubormang. Almashtirish so‘ralsa, barchasini almashtiring.
3. Odatdagidek push qiling. Vercel yangi versiyani yig‘adi.
4. Saytni bir marta yangilang. Bosh paneldagi “Bugungi kichik g‘alabangiz”
   kartasi orqali **Shaxsiy murabbiy**ga kiring (`/coach`).

SQL migratsiya va yangi npm kutubxonasi talab etilmaydi. `.env.local`, haqiqiy
kalitlar, foydalanuvchi ma’lumotlari va Supabase kontenti ZIPga qo‘shilmagan.
`.env.example` — faqat namuna; uni o‘z haqiqiy sozlamalaringiz ustiga yozmang.
Bu to‘liq loyiha emas: faqat qo‘shilgan/o‘zgargan fayllar.
Agar berilgan ZIPdan keyin aynan shu fayllarni o‘zingiz tahrirlagan bo‘lsangiz,
shu fayllardagi o‘zgarishlarni almashtirishdan oldin solishtiring.

## Nimalar o‘zgardi

### 1. Haqiqiy o‘rganilgan so‘zlar

- Oddiy mashqlar SRS tarixiga yozilmay qolishiga sabab bo‘lgan `if/else`
  bog‘lanishi tuzatildi. Faqat juftlash emas, tanlash/yozish/tinglash ham yoziladi.
- Darsni ochish yoki yakunlash undagi barcha so‘zlarni avtomatik “tanish” qilmaydi.
  O‘yinlarning “tanish” havzasi amalda mashq qilingan so‘zlardan olinadi.
- Oddiy lug‘at darsida har bir so‘z guruhi avval tanishtiriladi; variantlar faqat
  tanish yoki shu sessiyada tanishtirilgan so‘zlardan tuziladi.
- Takrorlash va uyg‘unlik rejimlarining yashirin “butun bazadan to‘ldirish”
  zaxiralari olib tashlandi. Qarindosh so‘zlarda avval tanishtirish bor.
- Grammatika takrori va rol o‘ynash tugallangan darslarga bog‘landi.
- Tugallangan darsni qayta ochish uning completed holatini pasaytirmaydi.
- SRS yozuvlari ketma-ket saqlanadi. Saqlash xatosi bo‘lsa sessiya yakunida
  ogohlantirish va qayta urinish tugmasi chiqadi; muvaffaqiyat jim taxmin qilinmaydi.

Eski xato sabab saqlanmagan tarixni ishonchli qayta yaratib bo‘lmaydi. Yangilashdan
keyin tanish so‘zlar kam ko‘rinsa, oldingi darsdagi 4–8 so‘zni qayta mashq qiling.
“Kengaytirilgan” havza foydalanuvchi tanlovi sifatida saqlangan. Duel/chaqiriq,
imtihon va erkin AI hikoya alohida kontent rejimlari; bu paket ularning barcha
savollarini individual lug‘atga qat’iy cheklaydi degan da’vo qilmaydi.

### 2. Shaxsiy murabbiy — AI kalitisiz

- Yangi `/coach` sahifasi va bosh panelda tez kirish kartasi.
- 3 / 5 / 10 daqiqalik taxminiy sessiyalar, majburiy taymersiz.
- Ustuvorlik: takrorlash vaqti kelgan → ko‘p xato qilingan → uzoq vaqt
  takrorlanmagan so‘zlar.
- Kamida 4 ta tanish so‘z kerak; bo‘lmasa avval darsga yo‘naltiradi.
- Tanlash, yozish va ixtiyoriy tinglash aralashmasi. Xatolar yana qaytadi.
- “Nega aynan shu so‘zlar?” oynasi va talaffuz tugmalari.
- Yangi murabbiy sahifasining asosiy matnlari o‘zbekcha va turkcha.

Bu rejimdagi savol so‘zlari deterministik tanlanadi. Erkin generativ AI suhbatida
esa pedagogik qoidalar modelga beriladi, lekin modelning har bir gapi semantik
jihatdan xatosiz bo‘lishi kafolatlanmaydi.

### 3. AI o‘qituvchi

- Daraja, haqiqiy lug‘at, xatolar va tugallangan darslar autentifikatsiyalangan
  foydalanuvchi uchun serverda olinadi. Brauzer yuborgan yolg‘on tarixga tayanmaydi.
- “Bilmaganini avval tushuntir, so‘ng so‘ra”, bitta savol va sodda izoh qoidalari.
- Tarix yuklanmasa, modelga taxminiy tarix bilan savol berish o‘rniga xato ko‘rsatadi.
- Tutor JSON javobidagi matn, tuzatish va yangi so‘zlar tuzilmasi tekshiriladi.
- AI keshi ichki obyektlarni to‘g‘ri hisoblaydi; turli lug‘atdagi so‘rovlar
  tasodifan bir xil kesh kalitiga tushmaydi.
- So‘rov hajmi, xabar uzunligi va provayder kutish vaqti chegaralangan.
- Suhbat tarixi akkaunt bo‘yicha ajratilgan; yuklashdan oldin bo‘sh tarix bilan
  ustiga yozish, parallel yuborish va so‘rov payti ssenariyni almashtirish tuzatildi.
- Eski Gemini 2.0 Flash tanlovi ishlatilsa yangi Flash-Lite tanloviga yo‘naltiriladi.

### 4. Talaffuz

- Ovoz ustma-ust chiqishi, eski so‘rovning keyinroq qayta jonlanishi va javobsiz
  qolgan playback promise holatlari tuzatildi.
- Boshqa mashq/sahifaga o‘tilganda oldingi nutq to‘xtaydi.
- Turkcha ovoz bo‘lmasa inglizcha/ruscha standart ovozda noto‘g‘ri o‘qimaydi.
- Google zaxirasida 200 belgidan uzun matn jim kesilmaydi; bo‘lib o‘qiladi.
- Google zaxirasiga ham sekin rejim uzatiladi; server va audio timeoutlari moslandi.
- Kesh v2 orqali eski audio keshi chetlab o‘tiladi; matn registri saqlanadi.
- Ovoz ishlamasa qo‘lda tinglash va ovoz tanlashda ko‘rinadigan xabar chiqadi.
- TTS so‘rovi uchun middleware har safar Supabase sessiyasini tekshirmaydi.

Emel/Ahmet ishlamasa Google yoki qurilmadagi turkcha ovoz eshitilishi mumkin.
Google va Edge integratsiyalari norasmiy: ularning kelajakdagi mavjudligi
kafolatlanmaydi. Brauzer ovozi qurilmaga bog‘liq; mikrofon nutqni tanishi
professional fonetik baholash yoki sertifikat bali hisoblanmaydi.

### 5. Tezlik va qulaylik

- O‘zgarmas dars/lug‘at kontenti 60 soniya xotirada keshlanadi, bir paytdagi
  takroriy yuklashlar birlashtiriladi. Xato javob keshda saqlanmaydi.
- Profil va SRS ma’lumotlari bu umumiy kontent keshiga qo‘shilmaydi.
- Dars/o‘yin paytida statik fon, yangi foydalanuvchilar uchun yengil fon.
- Jonli fon ko‘pi bilan taxminan 30 FPS; reduced-motion qo‘llab-quvvatlanadi.
- Sahifa yuklanish indikatori, klaviatura fokuslari va zoom imkoniyati.
- Landing logosi haqiqiy havola. Ilovadagi logo `/`ga olib boradi;
  tizimga kirgan foydalanuvchini mavjud middleware bosh panelga yo‘naltiradi.
- Do‘stga chaqiriq ochishda to‘liq sahifani qayta yuklash o‘rniga Next router.

Tezlik bo‘yicha real qurilmada oldin/keyin benchmark qilinmagan; aniq foizli
tezlashish va’da qilinmaydi.

## Bepul xizmatlar va sozlash

Yangi pullik API yoki pullik kutubxona qo‘shilmadi. Murabbiy va oddiy mashqlar
AI kalitisiz ishlaydi. Onlayn erkin AI suhbat uchun avvalgi server kalitlaringiz
kerak. Supabase yo‘q bo‘lsa mavjud lokal demo rejimi ishlaydi.

- OpenRouter standart model: `openrouter/free`. Admin yoki env orqali pullik
  OpenRouter modeli qo‘yilsa ushbu zanjir uni ishlatmaydi; `:free` modellari mumkin.
- Gemini standart model: `gemini-3.5-flash-lite`, bepul API tierida ishlatish uchun.
- Groq va boshqa avvalgi adapterlar saqlangan. Ularning bepul limiti akkaunt va
  modelga bog‘liq. Kod tashqi hisobingiz billing holatini tekshira olmaydi;
  bepul hisob/proyekt kalitlarini ishlating, pullik billingni yoqmang.
- Limit tugasa murabbiy/dars/o‘yinlar orqali davom etish mumkin.
- Free tier cheksiz emas. Supabase/Vercel foydalanish limitlari ham saqlanadi.

Rasmiy manbalar (2026-10-25 tekshirildi):
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/deprecations
- https://console.groq.com/docs/rate-limits
- https://nextjs.org/docs/app/getting-started/linking-and-navigating
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices

## Tekshiruv natijalari

- `npm run typecheck` — o‘tdi.
- `npm run build` — o‘tdi, Next.js 15.5.28, 40 ta statik sahifa.
- `node tests/regression.cjs` — o‘tdi: tanish havza, dars oldidan tanishtirish,
  begona variantlar, murabbiy ustuvorligi, ichki obyektli AI keshi, tutor JSON,
  kontent so‘rovlari keshi, SRS saqlash tartibi/qayta urinish, if/else regressiyasi,
  audio bekor qilish va boshqa tildagi ovozga tushmaslik.
- Google TTS: haqiqiy “Merhaba! Türkçe öğreniyorum.” matniga 23424 bayt audio
  qaytdi. Ovoz sifati inson tomonidan tinglab baholanmagan.
- Edge TTS: ushbu ish muhitida DNS/tarmoq xatosi; haqiqiy neyron audio tasdiqlanmadi.
- Joriy Vercel landing sahifasi brauzerda ko‘rildi. Yangi versiya brauzer QA si
  bajarilmadi: preview xizmati Next.js ga qo‘llanmaydigan `--host/--strictPort`
  parametrlarini uzatdi. Ishlayotgan loyiha faqat preview uchun o‘zgartirilmadi.
- Haqiqiy Supabase akkaunti, server AI kalitlari va Android/iOS mikrofonlari
  bilan end-to-end sinov o‘tkazilmadi. Push/publish bajarilmadi.

## Pushdan keyingi 5 daqiqalik tekshiruv

1. Logoni bosing: bosh sahifa/bosh panel ochilsin.
2. Bir darsda 4 ta so‘zga javob bering; Murabbiyda ular ko‘rinsin.
3. Tanish havzadagi o‘yinda boshqa dars so‘zlari chiqmasin.
4. Profil → ovozda Emel/Ahmetni, darsda oddiy/sekin ovozni sinang.
5. Audio ketayotganda boshqa sahifaga o‘ting: oldingi nutq to‘xtasin.
6. Tutor bilan qisqa suhbat qiling; noma’lum so‘zni tushuntirishini tekshiring.
7. Brauzerni qayta oching: SRS tarixi va akkauntingizga tegishli suhbat saqlansin.

## Keyingi bosqich chegarasi

Bu paket asosiy xatolar va o‘qish oqimini tuzatadigan 1-bosqichdir.
To‘liq B2/C1 kontent auditi, Milliy sertifikatning amaldagi rasmiy topshiriqlari
bilan moslik, ekspert tekshirgan talaffuz audio banki, barcha o‘yinlarning
individual so‘z/grammatika cheklovlari va real qurilma sinovlari alohida ish.
Saytdagi ball yoki taxminiy CEFR rasmiy sertifikat natijasi emas.
