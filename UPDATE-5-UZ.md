# 2-bosqich — individual o‘quv ketma-ketligi

2026-10-25. Bu paket **1-bosqichni ham o‘z ichiga oladi**.
Asos: yuborilgan kopru-main.zip (b52d924f9fb9ee475477b2a08742901c380af71a).

## O‘rnatish

ZIP ichidagi `src`, `tests`, `.env.example` va yo‘riqnoma fayllarini loyihangizning
`package.json` turgan papkasiga ko‘chiring, almashtirishni tanlang va odatdagidek
push qiling. Birinchi paketni oldin qo‘llagan bo‘lsangiz ham shu tartib ishlaydi.
SQL migratsiya yoki yangi npm paketlari kerak emas. `.env.local`ni almashtirmang.
Pushdan oldin mavjud loyihangizning nusxasini yoki Git commitini saqlang.
Bu ZIPdan tashqari o‘zingiz kiritgan tahrirlar aynan shu fayllarda bo‘lsa, ularni
solishtirib birlashtiring.

## Qo‘shilganlar

### Mening lug‘atim — /vocabulary

Mashq qilingan so‘zlar, bugun takrorlanadiganlar, tarixda xato bo‘lganlar va
mustahkamlangan so‘zlar alohida ko‘rinadi. Turkcha/o‘zbekcha qidirish, tinglash,
takrorlar soni, xatolar soni, navbatdagi sana va tegishli dars havolasi bor.
Katta lug‘at birdan to‘liq chizilmaydi — 30 tadan ochiladi.
Kirish: yon menyudagi “Mening lug‘atim” yoki “Shaxsiy murabbiy” pastidagi tugma.
Mustahkamlik — SRSning taxminiy xotira ko‘rsatkichi; CEFR bahosi emas.

### O‘yinlardagi begona so‘zlar

Harf terish, ko‘prik, Bingo, xotira kartalari, yomg‘ir, minora va shaxsiy Blitzda
“kam bo‘lsa butun bazadan ol” yo‘llari olib tashlandi. Minorada chalg‘ituvchi
variantlar ham tanlangan lug‘at havzasidan olinadi.

Harf o‘yinlariga 3–10 harfli mos turkcha so‘zlargina hisoblanadi. Masalan,
“iyi geceler” lug‘atda borligi harf o‘yiniga yetarli bitta so‘z deb hisoblanmaydi.
Bir xil yoziladigan so‘zlar takrorlanmaydi; dublikat bo‘lsa tanish nusxa ustun.
Yetarli mos so‘z yo‘q bo‘lsa o‘yinni boshlash o‘rniga darsga yo‘naltiradi.

### Avval tanishtirish, keyin o‘yin

“Yangi so‘zlar ham”ni tanlasangiz, arcade o‘yini oldidan yangi so‘zlar tarjima,
misol va tinglash tugmasi bilan bittadan ko‘rsatiladi. So‘ng o‘yin boshlanadi.
Oddiy mashq rejimlarida yangi so‘zlar tanishtirish kartalari sifatida qo‘shiladi.
Faqat kartani ochish “o‘zlashtirdi” deb yozilmaydi; mashq natijasi SRSga yoziladi.

### Darslarning tartibi

Darslar bo‘limning haqiqiy order_index qiymatiga ko‘ra tartiblanadi, tasodifiy ID
raqamiga qarab emas. Darslar ro‘yxati va bevosita /learn/ID havolasi bir xil
ketma-ketlik qoidasidan foydalanadi. Hali ochilmagan darsga to‘g‘ridan-to‘g‘ri
havola bilan o‘tilsa tushuntirish chiqadi.
Bu pedagogik UI cheklovi; yangi server xavfsizlik/SQL siyosati emas.
Darslar o‘rtasida o‘tishda eski yuklash javobi yangi dars ekranini almashtirmaydi.

### O‘yinlar xotirasi

SRS yordamchisi oldingi tarix kelmasidan turib bo‘sh xotira bilan baholamaydi.
Bir so‘zga ketma-ket javoblar tartib bilan saqlanadi. Arcade o‘yini yakunida
saqlanmagan javoblar aniqlansa, ko‘rinadigan ogohlantirish va qayta saqlash
imkoniyati bor. Bu tarmoq uzilganda yo‘qolmaydigan disk outbox tizimi emas:
sahifani yopishdan oldin saqlash tugaganini tekshiring.

### Umumiy musobaqalar va hikoya

- Duel va do‘stga chaqiriq yaratish uchun yaratuvchining kamida 10 ta haqiqatan
  mashq qilingan so‘zi kerak; savollar butun katalogdan yashirin to‘ldirilmaydi.
- Duelga qo‘shilishda va chaqiriqda savol so‘zlari hali o‘tilmagan bo‘lsa,
  foydalanuvchi umumiy musobaqaga roziligini belgilaydi.
- Bu tekshiruv savolning wordId maydoniga asoslanadi; barcha chalg‘ituvchi
  variantlarning leksik tarkibini tekshirish yoki ikki kishining to‘liq lug‘at
  kesishmasini serverda hisoblash bu bosqichga kirmaydi.
- Kunlik Blitz hamma uchun bir xil A1 savollari ekanini, yangi so‘zlar uchrashi
  mumkinligini ochiq bildiradi. Shaxsiy mashq uchun Erkin rejim bor.
- AI hikoya tayyorlashda haqiqiy SRS tarixi uzatiladi; tarix yuklanmasa kutish
  ekrani abadiy qolmaydi. Umumiy hikoyalar banki shaxsiy test hisoblanmaydi.

## Oldingi sessiyalar

1-bosqichgacha yoki 1-bosqichda boshlanib, hali yakunlanmagan mashq navbatida
eski generator savollari bo‘lishi mumkin. Bunday eski navbatni davom ettirish
chiqmaydi: yangi navbat tuziladi. Tugallangan darslar, XP va saqlangan so‘zlar
bazadan o‘chirilmaydi.

## Tekshiruv

- `npm run typecheck` — muvaffaqiyatli.
- `node tests/regression.cjs` — 1-bosqich regressiyalari muvaffaqiyatli.
- `node tests/stage2.cjs` — mos so‘zlarni saralash, dublikatlar, kengaytirish,
  dars/bo‘lim tartibi, darsga kirish, lug‘at, yashirin arcade zaxiralarini
  aniqlash, SRS yuklash poygasi va qayta saqlash testlari muvaffaqiyatli.
- `npm run build` — muvaffaqiyatli, 41 ta statik sahifa.
- Yangi UI uchun haqiqiy brauzer/mobil sinov bajarilmadi: avvalgi bosqichdagi
  preview xizmatining Next.js parametrlariga mos kelmasligi saqlanmoqda.
- Ikki haqiqiy Supabase akkaunti bilan duel/chaqiriq sinovi va server
  provayder kalitlari bilan AI sinovi bajarilmadi. Vercelga push qilinmadi.

## Pushdan keyin tekshirish

1. /vocabulary sahifasini oching; tanish so‘zlar va qidirishni tekshiring.
2. Bir darsda bir nechta so‘zni mashq qiling; lug‘atda ular ko‘rinsin.
3. Harf o‘yini uchun mos so‘z kam bo‘lsa start yopiq bo‘lsin.
4. “Yangi so‘zlar ham”ni tanlang: o‘yindan oldin tanishtirish chiqsin.
5. Minorada va shaxsiy Blitzda boshqa havzadan yashirin so‘z chiqmasin.
6. Qulflangan dars havolasini oching: avvalgi darsni tugatish tavsiyasi chiqsin.
7. Duel/chaqiriqda yangi savol so‘zlari bo‘lsa ogohlantirish ko‘rinsin.

## Qolgan ishlar

3-bosqich: sertifikatga tayyorgarlik kontenti, to‘rt ko‘nikma bo‘yicha tizimli
mashqlar va amaldagi rasmiy talablar bilan moslik auditi.
4-bosqich: interfeysni yakunlash, mobil qulaylik, haqiqiy qurilmadagi talaffuz,
real akkauntlar bilan to‘liq funksional sinov va qolgan xatolarni tuzatish.

Barcha asosiy yangi funksiyalar AI kalitisiz ishlaydi. 1-bosqichdagi bepul
API cheklovlari va o‘rnatish izohlari UPDATE-4-UZ.md ichida saqlangan.
