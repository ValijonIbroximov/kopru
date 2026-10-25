# 3-bosqich: AI xatolarini boshqarish va to‘rt ko‘nikma mashqlari

2026-10-25. Ushbu ZIP **1-, 2- va 3-bosqich o‘zgarishlarini birga** o‘z ichiga oladi.
Asos: foydalanuvchi yuborgan kopru-main.zip, b52d924f9fb9ee475477b2a08742901c380af71a.

## O‘rnatish

ZIPni oching. Ichidagi fayl/papkalarni loyihangizda `package.json` turgan
papkaga ko‘chiring, almashtirishni tanlang va push qiling. Oldingi ikki paketni
alohida qo‘llash shart emas. Yangi npm paketi yoki SQL migratsiyasi kerak emas.
Mavjud `.env.local` o‘zgartirilmaydi. ZIPda kalitlar va node_modules yo‘q.
Agar shu fayllarga o‘zingiz ham o‘zgarish kiritgan bo‘lsangiz, Git diff bilan
birlashtiring; almashtirish aynan shu fayldagi shaxsiy tahrirni bosib ketadi.

## AI o‘qituvchidagi 429

Rasmdagi Mistral `Rate limit exceeded` — tashqi xizmat cheklovi. Dastur tuzatishi
hisobning haqiqiy so‘rov/token limitini olib tashlamaydi. Mistral bepul rejimi
cheklangan: https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them

- Retry-After soniya yoki HTTP sana ko‘rinishida o‘qiladi. Aniq berilgan kutish
  muddati har xatoda yana ko‘paytirilmaydi.
- Oddiy RESOURCE_EXHAUSTED xatosi endi avtomatik kunlik limit deb olinmaydi.
  Limit turi/muddati noma’lum bo‘lsa dastlab 60 soniya kutish tavsiya qilinadi;
  bu xizmat aynan shuncha vaqtda tiklanishi kafolati emas.
- Keyingi sozlangan provayder mavjud bo‘lsa zanjir undan foydalanadi. Bu faqat
  siz ilgari kalit kiritgan, yoqilgan provayderlarga taalluqli. Kalit yaratilmaydi,
  pullik obuna yoqilmaydi. Faqat bitta Mistral kaliti bo‘lsa kutish kerak bo‘lishi mumkin.
- Foydalanuvchi raw JSON o‘rniga tushunarli izoh oladi. Texnik tafsilot serverdagi
  admin holatiga yoziladi. Kalit/tarmoq xatosi oddiy 429 bilan bir xil ko‘rsatilmaydi.
- Muvaffaqiyatsiz xabar suhbatda qoladi. Shu ochiq sahifada aynan uni takrorlamay
  qayta yuborish tugmasi bor; kutish vaqtida qayta so‘rov yuborilmaydi.
- AI so‘rovi oxirgi 6 xabar va ixcham o‘quv holatini olib boradi. Tarixning qolgan
  qismi interfeysda saqlanadi, ammo modelga har safar hammasi uzatilmaydi.
- Har muvaffaqiyatli interaktiv so‘rovdan keyin avtomatik qo‘shimcha navbat ishi
  yuborish olib tashlandi. Mavjud cron/jobs oqimi saqlangan; cron yoqilmagan bo‘lsa
  navbatdagi hikoyalar o‘z-o‘zidan bajarilmaydi.
- Avval bazaga yozilgan uzun cooldown ushbu yangilanishda majburan bekor qilinmaydi.

## /certificate — yangi mashq sahifasi

Kirish: “Imtihon” sahifasidagi “To‘rt ko‘nikma” tugmasi.
Ikki original qisqa to‘plam: A1–A2 kutubxona, B1–B2 shahar transporti.

1. Yangi lug‘at tarjimasi va audio bilan tanishtiriladi; foydalanuvchi roziligidan
   keyingina mashqlar ochiladi. Bu faqat shaxsiy tanish so‘zlardan iborat rejim emas.
2. O‘qish: yaxlit matn, har to‘plamda 2 savol, javobdan keyin o‘zbekcha dalil/izoh.
3. Tinglash: alohida e’lon/xabar, 2 savol, ixtiyoriy transkript va qayta tinglash.
4. Yozish: vazifa, so‘z hisoblagichi, hisob va mavzu bo‘yicha brauzerda avtomatik
   saqlanadigan qoralama, to‘rt bandli o‘zini tekshirish ro‘yxati.
5. Gapirish: uchta savol, fikr–sabab–misol tayanchi, o‘zini tekshirish ro‘yxati.
   Mikrofon yozuvi yoki avtomatik talaffuz bahosi qo‘shilmagan.

AI kaliti kerak emas; audio mavjud TTS tizimidan foydalanadi va internet/qurilma
ovoziga bog‘liq. Matn va mashqlar uchun AI chaqiruvi yo‘q. Yozma qoralama boshqa
qurilmaga sinxronlanmaydi. Bular qisqa o‘quv mashqlari; to‘liq rasmiy variantlar
banki yoki CEFR sertifikatsiyasi emas. So‘z va vaqt maqsadlari shu mashq uchungina.
Rasmiy yangi format va mezonlarga havola sahifada berilgan:
https://gov.uz/oz/uzbmb/sections/view/49531 (2026-01-26 yangilangan sahifa).
Turk tili uchun amaldagi rasmiy topshiriqlar bilan to‘liq bir xillik da’vo qilinmaydi.

## Eski /exam tuzatishlari

- Haqiqiy user_words tarixi yuklanadi: oldingi bo‘sh lug‘at xatosi tuzatildi.
- Grammatika faqat tugatilgan darslardan olinadi.
- Ma’lumot yuklash xatosi yoki yetarli so‘z yo‘qligi tushuntiriladi, sahifa qotmaydi.
- AI yozma javob shakli tekshiriladi. AI baholamagan yozma qism nol hisoblanmaydi;
  o‘rtacha faqat baholangan qismlardan olinadi, yetishmagan qism “—” bo‘ladi.
- Bir report ochilishida takroriy effekt XPni qayta berishining oldi olindi.
- Natija rasmiy sertifikat bali emasligi, gapirish mosligi esa nutqning to‘liq
  bahosi emasligi ko‘rsatiladi.

## Tekshiruv va qolgan ish

`npm run typecheck`, `node tests/regression.cjs`, `node tests/stage2.cjs`,
`node tests/stage3.cjs`, `npm run build` muvaffaqiyatli bajarildi.
Yangi testlar: Retry-After soniya/sana, kunlik va oddiy limit farqi, xatolarni
soddalashtirish, mock 429 dan keyingi provayderga o‘tish va cooldownni hurmat qilish,
baholanmagan qismlarni o‘rtachadan chiqarish, yozma JSON, o‘quv kontenti yaxlitligi.

Haqiqiy Mistral hisobingizda live so‘rov yoki qurilmalarda audio/mobil interfeys
sinovi bajarilmadi. Build tekshiruvi bunday tekshiruvning o‘rnini bosmaydi.
Qolgan 4-bosqich: interfeys/mobil ko‘rinish, haqiqiy qurilmadagi ovoz, akkaunt bilan
boshidan oxirigacha tekshirish. Hozirgi paket saytga avtomatik joylashtirilmagan.
