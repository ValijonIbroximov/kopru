-- =====================================================================
--  KÖPRÜ — boshlang'ich kontent (A1 → A2). schema.sql dan KEYIN ishga tushiring.
--  Hamma narsa Admin panelda tahrirlanadi: /admin/content
-- =====================================================================

-- ---------------------------------------------------------------------
-- SOZLAMALAR
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
('xp', '{"correct":2,"streak_bonus":1,"lesson":30,"boss":60,"perfect_bonus":15,"review_session":10,"duel_win":40,"duel_lose":10,"story":20,"tutor_turn":3,"exam":50,"comeback_multiplier":2}', 'XP qiymatlari'),
('goals', '{"options":[5,10,15,20,30],"default":10}', 'Kunlik maqsad (daqiqa)'),
('srs', '{"desired_retention":0.9,"max_new_per_day":20,"max_reviews_per_session":25,"mastered_stability_days":21}', 'Takrorlash (FSRS) sozlamalari'),
('flow', '{"target_accuracy":0.82,"min_accuracy":0.65,"max_accuracy":0.93,"session_min_items":8,"session_max_items":20}', 'Qiyinlik moslashuvi (flow kanali)'),
('features', '{"duel":true,"story":true,"tutor":true,"speak":true,"listen":true,"exam":true,"leaderboard":true,"cognates":true,"harmony":true}', 'Funksiyalarni yoqish/o''chirish'),
('motivation', '{"risk_days":2,"comeback_days":3,"nudge_after_wrong_streak":3,"variety_rotation":true}', 'Motivatsiya dvigateli'),
('ai', '{"enabled":true,"daily_user_cap":40,"story_words":120,"tutor_max_turns":12,"cache_ttl_days":30,"queue_enabled":true}', 'AI umumiy sozlamalari'),
('exam', '{"listening":8,"reading":8,"writing":2,"speaking":3,"time_min":25}', 'Sinov imtihoni tuzilmasi (Multi-level)')
on conflict (key) do nothing;

insert into public.ai_provider_state (provider, enabled, priority, model, daily_cap) values
('groq', true, 1, 'llama-3.3-70b-versatile', 1000),
('gemini', true, 2, 'gemini-2.0-flash', 1000),
('cerebras', true, 3, 'llama-3.3-70b', 800),
('openrouter', true, 4, 'meta-llama/llama-3.3-70b-instruct:free', 150),
('mistral', true, 5, 'mistral-small-latest', 500)
on conflict (provider) do nothing;

-- ---------------------------------------------------------------------
-- QUESTLAR
-- ---------------------------------------------------------------------
insert into public.quests (code, title_uz, description_uz, kind, metric, target, xp_reward, icon) values
('d_xp_50', 'Kunlik 50 XP', 'Bugun 50 XP to''plang', 'daily', 'xp', 50, 15, '⚡'),
('d_reviews_20', '20 ta takrorlash', 'Bugun 20 ta so''zni takrorlang', 'daily', 'reviews', 20, 15, '🔁'),
('d_correct_15', '15 ta to''g''ri javob', 'Bugun 15 ta to''g''ri javob bering', 'daily', 'correct', 15, 10, '✅'),
('d_lesson_1', 'Bitta dars', 'Bugun kamida 1 ta darsni yakunlang', 'daily', 'lessons', 1, 20, '📘'),
('d_minutes_10', '10 daqiqa', 'Bugun 10 daqiqa shug''ullaning', 'daily', 'minutes', 10, 15, '⏱️'),
('d_perfect_1', 'Mukammal sessiya', 'Bitta sessiyani xatosiz yakunlang', 'daily', 'perfect', 1, 25, '💎'),
('w_xp_400', 'Haftalik 400 XP', 'Bu hafta 400 XP to''plang', 'weekly', 'xp', 400, 80, '🏆'),
('w_lessons_5', '5 ta dars', 'Bu hafta 5 ta darsni yakunlang', 'weekly', 'lessons', 5, 70, '📚'),
('w_sessions_12', '12 ta sessiya', 'Bu hafta 12 ta o''yin sessiyasi', 'weekly', 'sessions', 12, 60, '🎮'),
('w_reviews_150', '150 ta takrorlash', 'Bu hafta 150 ta takrorlash', 'weekly', 'reviews', 150, 70, '🧠'),
('o_first_lesson', 'Ilk qadam', 'Birinchi darsni yakunlang', 'once', 'lessons', 1, 30, '🚀')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- YUTUQLAR
-- ---------------------------------------------------------------------
insert into public.achievements (code, title_uz, description_uz, icon, rarity, condition, xp_reward) values
('first_lesson', 'Ko''prikka qadam', 'Birinchi darsni yakunladingiz', '🌉', 'common', '{"metric":"lessons_completed","gte":1}', 30),
('streak_3', 'Uch kun ketma-ket', '3 kunlik streak', '🔥', 'common', '{"metric":"streak","gte":3}', 30),
('streak_7', 'Bir hafta!', '7 kunlik streak', '🔥', 'rare', '{"metric":"streak","gte":7}', 80),
('streak_30', 'Temir iroda', '30 kunlik streak', '🏔️', 'epic', '{"metric":"streak","gte":30}', 300),
('streak_100', 'Afsona', '100 kunlik streak', '👑', 'legendary', '{"metric":"streak","gte":100}', 1000),
('words_50', '50 ta so''z', '50 ta so''z bilan tanishdingiz', '📖', 'common', '{"metric":"words_seen","gte":50}', 40),
('words_200', 'So''z boyligi', '200 ta so''z bilan tanishdingiz', '📚', 'rare', '{"metric":"words_seen","gte":200}', 120),
('mastered_25', 'Xotira ustasi', '25 ta so''zni mukammal o''zlashtirdingiz', '🧠', 'rare', '{"metric":"words_mastered","gte":25}', 100),
('mastered_100', 'Lug''at qal''asi', '100 ta so''z mukammal', '🏰', 'epic', '{"metric":"words_mastered","gte":100}', 400),
('lessons_10', 'O''nlik', '10 ta dars yakunlandi', '🎓', 'common', '{"metric":"lessons_completed","gte":10}', 80),
('lessons_30', 'Yo''lovchi', '30 ta dars yakunlandi', '🧭', 'epic', '{"metric":"lessons_completed","gte":30}', 300),
('reviews_500', 'Takrorlash ustasi', '500 ta takrorlash', '🔁', 'rare', '{"metric":"reviews","gte":500}', 150),
('duel_1', 'Birinchi g''alaba', 'Duelda g''alaba qozondingiz', '⚔️', 'common', '{"metric":"duels_won","gte":1}', 50),
('duel_10', 'Jangchi', '10 ta duel g''alabasi', '🛡️', 'epic', '{"metric":"duels_won","gte":10}', 250),
('minutes_300', '5 soat', 'Jami 300 daqiqa shug''ullandingiz', '⏳', 'rare', '{"metric":"minutes","gte":300}', 120),
('modes_6', 'Sinovchi', '6 xil o''yin rejimini sinab ko''rdingiz', '🎲', 'rare', '{"metric":"modes","gte":6}', 100),
('perfect_5', 'Snayper', '5 ta mukammal sessiya', '🎯', 'rare', '{"metric":"perfect","gte":5}', 120),
('level_10', '10-daraja', '10-darajaga yetdingiz', '⭐', 'epic', '{"metric":"level","gte":10}', 200)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- BO'LIMLAR
-- ---------------------------------------------------------------------
insert into public.units (id, slug, title_uz, title_tr, description, cefr, order_index, icon, color) values
(1, 'tanishuv', 'Tanishuv', 'Tanışma', 'Salomlashuv, o''zingizni tanishtirish va siz allaqachon bilgan 100+ so''z', 'A1', 1, '👋', '#ff6a2a'),
(2, 'tovushlar-sonlar', 'Tovushlar va sonlar', 'Sesler ve sayılar', 'Turk alifbosi, unli uyg''unligi va 0–1000 sonlar', 'A1', 2, '🔤', '#14b8a6'),
(3, 'oila-uy', 'Oila va uy', 'Aile ve ev', 'Oila a''zolari, uy buyumlari, egalik qo''shimchalari', 'A1', 3, '🏠', '#f5b400'),
(4, 'kun-tartibi', 'Kun tartibi', 'Günlük hayat', 'Vaqt, kunlar, fe''llar va hozirgi zamon', 'A1', 4, '⏰', '#8b5cf6'),
(5, 'ovqat-bozor', 'Ovqat va bozor', 'Yemek ve pazar', 'Ovqatlar, bozorda savdolashish, kelishiklar', 'A1', 5, '🍲', '#f43f6e'),
(6, 'shahar-yol', 'Shahar va yo''l', 'Şehir ve yol', 'Joylar, yo''nalish so''rash, var/yok, buyruq', 'A1', 6, '🏙️', '#3b82f6'),
(7, 'sifat-rang', 'Sifatlar va ranglar', 'Sıfatlar ve renkler', 'Ranglar, antonimlar, solishtirish', 'A1', 7, '🎨', '#10b981'),
(8, 'otgan-zamon', 'O''tgan zamon', 'Geçmiş zaman', 'Fe''llar #2, -DI qo''shimchasi, dam olish kuni haqida hikoya', 'A1', 8, '📜', '#f97316'),
(9, 'sogliq-sport', 'Sog''liq va sport', 'Sağlık ve spor', 'Tana a''zolari, shifokorda, kelasi zamon', 'A2', 9, '🏃', '#06b6d4'),
(10, 'kasb-aloqa', 'Kasb va aloqa', 'Meslek ve iletişim', 'Kasblar, texnika, aloqa va keng zamon', 'A2', 10, '📡', '#a855f7')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- DARSLAR
-- ---------------------------------------------------------------------
insert into public.lessons (id, unit_id, slug, title_uz, title_tr, kind, order_index, xp_reward, content) values
(1, 1, 'salomlashuv', 'Salomlashuv', 'Selamlaşma', 'vocab', 1, 30,
 '{"intro":"Turkcha salomlashuv o''zbekchaga juda yaqin. \"Merhaba\" — \"marhabo\", \"hoş geldiniz\" — \"xush kelibsiz\". Diqqat: turkcha \"hayır\" = \"yo''q\" (o''zbekcha \"xayr\" emas!).","tip":"Ovozli mashqlarda jumlani ovoz chiqarib takrorlang — talaffuz xotirani 2 barobar mustahkamlaydi.","hook":"Birinchi darsdan keyin siz turkcha salomlashib, o''zingizni tanishtira olasiz."}'),
(2, 1, 'qarindosh-sozlar', 'Siz allaqachon bilasiz!', 'Zaten biliyorsunuz!', 'cognates', 2, 40,
 '{"intro":"O''zbek va turk tillari bir oilaga mansub: minglab so''zlar o''xshash. Bu dars sizga tayyor \"so''z boyligi\"ni ochib beradi — faqat tovush mosliklarini ilg''ash kerak: q→k (qo''l→kol), o''→ö/u (ko''z→göz), g''→ğ (tog''→dağ).","tip":"Yolg''on do''stlarga ehtiyot bo''ling: \"olmak\" = bo''lmoq, \"bulmak\" = topmoq, \"dede\" = bobo, \"hazır\" = tayyor.","hook":"Bu darsdan so''ng 60+ so''zni bir zumda eslaysiz."}'),
(3, 1, 'olmoshlar', 'Men ... man: olmoshlar va kesim', 'Zamirler ve ek-fiil', 'grammar', 3, 40,
 '{"intro":"ben/sen/o/biz/siz/onlar — men/sen/u/biz/siz/ular. Deyarli bir xil! Kesim qo''shimchalari ham o''zbekchaga o''xshaydi: \"Ben öğrenciyim\" = \"Men talabaman\".","tip":"Qo''shimcha oxirgi unliga qarab o''zgaradi: öğrenci-yim, asker-im, doktor-um, Türk-üm."}'),
(4, 1, 'boss-1', 'Boss: Tanishuv', 'Patron: Tanışma', 'boss', 4, 60,
 '{"intro":"Bo''limdagi barcha so''z va qoidalar aralash keladi. 80%+ natija — 3 yulduz."}'),

(5, 2, 'alifbo', 'Turk alifbosi', 'Türk alfabesi', 'vocab', 1, 30,
 '{"intro":"29 ta harf. Maxsus harflar: ç (ch), ş (sh), ğ (yumshoq g — cho''ziladi), ı (nuqtasiz i — \"ı\" o''zbekcha \"i\"ning qattiq varianti), ö, ü, c (j). \"x\", \"w\", \"q\" yo''q!","tip":"\"c\" = \"j\": cam = jom (shisha), ceket = jaket. \"j\" esa \"zh\": jandarma.","hook":"Harflarni bilsangiz, har qanday so''zni to''g''ri o''qiysiz."}'),
(6, 2, 'unli-uygunligi', 'Unli uyg''unligi — turk tilining yuragi', 'Ünlü uyumu', 'grammar', 2, 50,
 '{"intro":"Turk tilida qo''shimcha so''zning oxirgi unlisiga moslashadi. 2 lik (a/e) va 4 lik (ı/i/u/ü) uyg''unlik. Bu qoidani o''zlashtirsangiz, grammatikaning 70% i ochiladi.","tip":"Qoidani yodlamang — \"Uyg''unlik\" o''yinida 50 ta so''zni urib ko''ring, qo''l o''zi o''rganadi."}'),
(7, 2, 'sonlar', 'Sonlar 0–1000', 'Sayılar', 'vocab', 3, 30,
 '{"intro":"Sonlar deyarli o''zbekcha: bir, iki (ikki), üç (uch), dört (to''rt), beş (besh), altı (olti), yedi (yetti), sekiz (sakkiz), dokuz (to''qqiz), on (o''n).","tip":"Telefon raqamingizni turkcha ayting — eng tez yodlash usuli."}'),
(8, 2, 'boss-2', 'Boss: Tovushlar va sonlar', 'Patron: Sesler', 'boss', 4, 60, '{"intro":"Alifbo, uyg''unlik va sonlar — aralash sinov."}'),

(9, 3, 'oila', 'Oila a''zolari', 'Aile üyeleri', 'vocab', 1, 30,
 '{"intro":"Diqqat, yolg''on do''stlar: \"baba\" = ota, \"dede\" = bobo, \"kardeş\" = aka-uka/opa-singil (qarindosh emas).","hook":"Oilangiz haqida 5 ta gap tuza olasiz."}'),
(10, 3, 'uy', 'Uy va buyumlar', 'Ev ve eşyalar', 'vocab', 2, 30,
 '{"intro":"\"ev\" = uy, \"oda\" = xona, \"kapı\" = eshik, \"pencere\" = deraza (o''zbekcha \"panjara\" emas!)."}'),
(11, 3, 'egalik', 'Egalik qo''shimchalari', 'İyelik ekleri', 'grammar', 3, 40,
 '{"intro":"-(i)m, -(i)n, -(s)i, -(i)miz, -(i)niz, -leri. Evim = uyim, evin = uying, evi = uyi. O''zbekchaga qaraganda faqat uyg''unlik qo''shiladi."}'),
(12, 3, 'boss-3', 'Boss: Oila va uy', 'Patron: Aile', 'boss', 4, 60, '{"intro":"Oila, uy va egalik — aralash sinov."}'),

(13, 4, 'vaqt', 'Vaqt: kunlar, oylar, soat', 'Zaman', 'vocab', 1, 30,
 '{"intro":"Hafta kunlari deyarli bir xil: Pazartesi (dushanba), Salı (seshanba), Çarşamba (chorshanba), Perşembe (payshanba), Cuma (juma), Cumartesi (shanba), Pazar (yakshanba). Diqqat: \"gece\" = tun, \"dün\" = kecha."}'),
(14, 4, 'fellar-1', 'Fe''llar #1: har kungi harakatlar', 'Fiiller 1', 'vocab', 2, 35,
 '{"intro":"Fe''llar -mak/-mek bilan tugaydi (o''zbekcha -moq): gelmek = kelmoq, gitmek = ketmoq, almak = olmoq. Yolg''on do''stlar: olmak = bo''lmoq, bulmak = topmoq, yapmak = qilmoq."}'),
(15, 4, 'hozirgi-zamon', 'Hozirgi zamon: -(I)yor', 'Şimdiki zaman', 'grammar', 3, 50,
 '{"intro":"gel-iyor-um = kel-yap-man. Shakl: fe''l o''zagi + (ı/i/u/ü)yor + shaxs. Savol: -mu? Inkor: -mıyor."}'),
(16, 4, 'boss-4', 'Boss: Kun tartibi', 'Patron: Günlük hayat', 'boss', 4, 60, '{"intro":"Vaqt, fe''llar va hozirgi zamon."}'),

(17, 5, 'ovqat', 'Ovqatlar va ichimliklar', 'Yemekler', 'vocab', 1, 30,
 '{"intro":"Taomlar o''xshash: çay, pilav, çorba, kebap, süt, şeker. Diqqat: \"ekmek\" = non, \"et\" = go''sht, \"yumurta\" = tuxum."}'),
(18, 5, 'bozorda', 'Dialog: bozorda', 'Pazarda', 'dialog', 2, 35,
 '{"intro":"Savdolashish — turk madaniyatining bir qismi. \"Ne kadar?\" = qancha? \"Çok pahalı!\" = juda qimmat!","dialog":[{"who":"A","tr":"Merhaba, karpuz kaç lira?","uz":"Salom, tarvuz necha lira?"},{"who":"B","tr":"Kilosu on lira.","uz":"Kilosi o''n lira."},{"who":"A","tr":"Çok pahalı. Sekiz lira olur mu?","uz":"Juda qimmat. Sakkiz lira bo''ladimi?"},{"who":"B","tr":"Tamam, dokuz lira olsun.","uz":"Mayli, to''qqiz lira bo''lsin."},{"who":"A","tr":"İki kilo lütfen. Buyurun.","uz":"Ikki kilo, iltimos. Marhamat."},{"who":"B","tr":"Teşekkürler, afiyet olsun!","uz":"Rahmat, yoqimli ishtaha!"}]}'),
(19, 5, 'kelishiklar', 'Kelishiklar: -da, -dan, -a, -i, -nin', 'Hâl ekleri', 'grammar', 3, 50,
 '{"intro":"O''zbekcha -da/-dan/-ga/-ni/-ning bilan deyarli bir xil: evde (uyda), evden (uydan), eve (uyga), evi (uyni), evin (uyning). Faqat uyg''unlik va jarangsizdan keyin t: kitapta, sokakta."}'),
(20, 5, 'boss-5', 'Boss: Ovqat va bozor', 'Patron: Pazar', 'boss', 4, 60, '{"intro":"Ovqat, savdo va kelishiklar."}'),

(21, 6, 'joylar', 'Shahardagi joylar', 'Şehirde', 'vocab', 1, 30,
 '{"intro":"hastane (kasalxona — xasta=kasal), eczane (dorixona), cami (masjid — jome), köprü (ko''prik)."}'),
(22, 6, 'yol-sorash', 'Dialog: yo''l so''rash', 'Yol sormak', 'dialog', 2, 35,
 '{"intro":"Affedersiniz = kechirasiz. Sağ = o''ng, sol = chap, düz = to''g''ri.","dialog":[{"who":"A","tr":"Affedersiniz, hastane nerede?","uz":"Kechirasiz, kasalxona qayerda?"},{"who":"B","tr":"Düz gidin, sonra sağa dönün.","uz":"To''g''ri boring, keyin o''ngga buriling."},{"who":"A","tr":"Uzak mı?","uz":"Uzoqmi?"},{"who":"B","tr":"Hayır, çok yakın. Beş dakika.","uz":"Yo''q, juda yaqin. Besh daqiqa."},{"who":"A","tr":"Çok teşekkür ederim.","uz":"Katta rahmat."},{"who":"B","tr":"Rica ederim, iyi günler!","uz":"Arzimaydi, xayrli kun!"}]}'),
(23, 6, 'var-yok', 'var / yok va buyruq mayli', 'Var/yok ve emir', 'grammar', 3, 45,
 '{"intro":"\"var\" = bor, \"yok\" = yo''q — aynan o''zbekcha! Buyruq: gel! (kel!), gelin! (keling!), gelme! (kelma!)."}'),
(24, 6, 'boss-6', 'Boss: Shahar va yo''l', 'Patron: Şehir', 'boss', 4, 60, '{"intro":"Joylar, yo''nalish, var/yok."}'),

(25, 7, 'ranglar', 'Ranglar', 'Renkler', 'vocab', 1, 25,
 '{"intro":"kırmızı (qizil), mavi (ko''k — moviy), yeşil (yashil), sarı (sariq), siyah (qora), beyaz (oq)."}'),
(26, 7, 'sifatlar', 'Sifatlar: antonimlar', 'Sıfatlar', 'vocab', 2, 30,
 '{"intro":"büyük/küçük, iyi/kötü, sıcak/soğuk, yeni/eski. Diqqat: \"zor\" = qiyin (o''zbekcha \"zo''r\" emas!)."}'),
(27, 7, 'solishtirish', 'Solishtirish: daha, en', 'Karşılaştırma', 'grammar', 3, 40,
 '{"intro":"daha büyük = kattaroq, en büyük = eng katta. \"-dan daha\" = \"-dan ko''ra\": İstanbul Ankara''dan daha büyük."}'),
(28, 7, 'boss-7', 'Boss: Sifatlar va ranglar', 'Patron: Sıfatlar', 'boss', 4, 60, '{"intro":"Ranglar, sifatlar, solishtirish."}'),

(29, 8, 'fellar-2', 'Fe''llar #2', 'Fiiller 2', 'vocab', 1, 35, '{"intro":"Yana 25 ta eng kerakli fe''l. Ko''pi o''zbekcha bilan bir xil: öğrenmek (o''rganmoq), başlamak (boshlamoq), unutmak (unutmoq)."}'),
(30, 8, 'otgan-zamon-di', 'O''tgan zamon: -DI', 'Geçmiş zaman -DI', 'grammar', 2, 50,
 '{"intro":"gel-di-m = kel-di-m. Aynan o''zbekcha! Faqat uyg''unlik: geldim, aldım, gördüm, okudum. Jarangsizdan keyin t: gittim, baktım."}'),
(31, 8, 'dam-olish', 'Dialog: dam olish kunim', 'Hafta sonum', 'dialog', 3, 35,
 '{"intro":"O''tgan zamon bilan kichik hikoya.","dialog":[{"who":"A","tr":"Hafta sonu ne yaptın?","uz":"Dam olish kuni nima qilding?"},{"who":"B","tr":"Cumartesi arkadaşlarımla parka gittim.","uz":"Shanba kuni do''stlarim bilan parkka bordim."},{"who":"A","tr":"Hava nasıldı?","uz":"Ob-havo qanday edi?"},{"who":"B","tr":"Çok güzeldi. Futbol oynadık, çay içtik.","uz":"Juda yaxshi edi. Futbol o''ynadik, choy ichdik."},{"who":"A","tr":"Pazar günü?","uz":"Yakshanba kuni-chi?"},{"who":"B","tr":"Evde kaldım, kitap okudum ve dinlendim.","uz":"Uyda qoldim, kitob o''qidim va dam oldim."}]}'),
(32, 8, 'boss-8', 'Boss: O''tgan zamon (A1 final)', 'Patron: A1 final', 'boss', 4, 100, '{"intro":"A1 darajasining yakuniy sinovi. 80%+ — A2 ga o''tasiz!"}'),

(33, 9, 'tana-sogliq', 'Tana va sog''liq', 'Vücut ve sağlık', 'vocab', 1, 35, '{"intro":"baş (bosh), göz (ko''z), kulak (quloq), el (qo''l), ayak (oyoq). Hasta = kasal, ilaç = dori."}'),
(34, 9, 'shifokorda', 'Dialog: shifokorda', 'Doktorda', 'dialog', 2, 40,
 '{"intro":"Shikoyat qilish: Başım ağrıyor = boshim og''riyapti.","dialog":[{"who":"A","tr":"Doktor Bey, başım ağrıyor ve ateşim var.","uz":"Doktor, boshim og''riyapti va isitmam bor."},{"who":"B","tr":"Ne zamandan beri?","uz":"Qachondan beri?"},{"who":"A","tr":"İki gündür.","uz":"Ikki kundan beri."},{"who":"B","tr":"Grip olmuşsunuz. Bu ilacı günde iki kez alın.","uz":"Gripp bo''libsiz. Bu dorini kuniga ikki marta iching."},{"who":"A","tr":"Teşekkür ederim, geçmiş olsun demeyeceksiniz?","uz":"Rahmat, \"tuzalib keting\" demaysizmi?"},{"who":"B","tr":"Geçmiş olsun, bol bol dinlenin!","uz":"Tuzalib keting, ko''proq dam oling!"}]}'),
(35, 9, 'kelasi-zamon', 'Kelasi zamon: -(y)AcAk', 'Gelecek zaman', 'grammar', 3, 50,
 '{"intro":"gel-eceğ-im = kelaman (kelajakda). Ünsüz yumshaydi: geleceğim, ama gelecek. Savol: gelecek misin?"}'),
(36, 9, 'boss-9', 'Boss: Sog''liq va sport', 'Patron: Sağlık', 'boss', 4, 70, '{"intro":"Tana, sog''liq, kelasi zamon."}'),

(37, 10, 'kasblar', 'Kasblar', 'Meslekler', 'vocab', 1, 35, '{"intro":"mühendis (muhandis), asker (askar), subay (ofitser), doktor, öğretmen, avukat (advokat)."}'),
(38, 10, 'aloqa-texnika', 'Aloqa va texnika', 'İletişim ve teknoloji', 'vocab', 2, 40, '{"intro":"telsiz (ratsiya), frekans (chastota), şifre (parol — shifr), ağ (tarmoq), bilgisayar (kompyuter), yazılım (dasturiy ta''minot)."}'),
(39, 10, 'keng-zamon', 'Keng zamon: -(A/I)r', 'Geniş zaman', 'grammar', 3, 50,
 '{"intro":"Odat va umumiy haqiqat: Her sabah çay içerim = Har tong choy ichaman. Inkor maxsus: içmem, içmezsin."}'),
(40, 10, 'boss-10', 'Boss: Kasb va aloqa (A2)', 'Patron: A2', 'boss', 4, 100, '{"intro":"A2 yakuniy sinovi."}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- GRAMMATIKA MAVZULARI
-- ---------------------------------------------------------------------
insert into public.grammar_topics (code, lesson_id, title_uz, title_tr, cefr, order_index, explanation_md, rules, drills) values
('pronouns_predicate', 3, 'Shaxs olmoshlari va kesim qo''shimchalari', 'Zamirler ve ek-fiil', 'A1', 1,
'**Olmoshlar** deyarli o''zbekcha:

| Turkcha | O''zbekcha |
|---|---|
| ben | men |
| sen | sen |
| o | u |
| biz | biz |
| siz | siz |
| onlar | ular |

**Kesim (ek-fiil)** — "men talabaman" shakli: so''z + qo''shimcha. Qo''shimcha oxirgi unliga moslashadi (4 lik uyg''unlik):

- Ben öğrenci**yim** (unlidan keyin **y** qo''shiladi) — Men talabaman
- Sen asker**sin** — Sen askarsan
- O doktor — U doktor (qo''shimcha yo''q, yoki rasmiy: doktor**dur**)
- Biz Türk**üz** / Özbek**iz** — Biz turkmiz / o''zbekmiz
- Siz öğretmen**siniz** — Siz o''qituvchisiz
- Onlar öğrenci**ler** — Ular talabalar

**Inkor:** değil — "emas": Ben doktor değil**im** (Men doktor emasman).
**Savol:** mı/mi/mu/mü alohida yoziladi: Sen asker **misin**?',
'{"table":[["ben","-(y)Im","öğrenciyim, askerim, doktorum, Türküm"],["sen","-sIn","öğrencisin, askersin, doktorsun, Türksün"],["o","— / -DIr","öğrenci(dir)"],["biz","-(y)Iz","öğrenciyiz, askeriz, doktoruz, Türküz"],["siz","-sInIz","öğrencisiniz, askersiniz, doktorsunuz, Türksünüz"],["onlar","-lAr","öğrenciler, askerler"]]}',
'[{"sentence":"Ben öğrenci___.","answer":"yim","options":["yim","sin","yiz","im"],"explain":"Unli (i) dan keyin -yim: öğrenciyim."},{"sentence":"Sen asker___.","answer":"sin","options":["sin","sın","sun","sün"],"explain":"asker — oxirgi unli e → -sin."},{"sentence":"Biz Özbek___.","answer":"iz","options":["iz","ız","uz","üz"],"explain":"Özbek — oxirgi unli e → -iz."},{"sentence":"Siz doktor___.","answer":"sunuz","options":["sunuz","sınız","siniz","sünüz"],"explain":"doktor — oxirgi unli o → -sunuz."},{"sentence":"Ben Türk___.","answer":"üm","options":["üm","im","um","ım"],"explain":"Türk — oxirgi unli ü → -üm."},{"sentence":"O öğretmen ___.","answer":"değil","options":["değil","yok","hayır","değilim"],"explain":"Inkor: değil (3-shaxsda qo''shimchasiz)."},{"sentence":"Sen Türk ___?","answer":"müsün","options":["müsün","musun","misin","mısın"],"explain":"Türk → ü → mü + sün."},{"sentence":"Ben Taşkentli___.","answer":"yim","options":["yim","yım","yum","im"],"explain":"Taşkentli — oxirgi unli i → -yim."}]'),

('vowel_harmony', 6, 'Unli uyg''unligi', 'Ünlü uyumu', 'A1', 2,
'Turk tilida qo''shimcha **so''zning oxirgi unlisiga** qarab o''zgaradi.

**Qalin unlilar:** a, ı, o, u  **Ingichka unlilar:** e, i, ö, ü

### 2 lik uyg''unlik (a / e)
Qo''shimchalar: -lar/-ler, -da/-de, -dan/-den, -a/-e
- oxirgi unli qalin (a ı o u) → **a**: kitap**lar**, okul**da**, araba**dan**
- oxirgi unli ingichka (e i ö ü) → **e**: ev**ler**, göz**de**, köprü**den**, Taşkent**te**

### 4 lik uyg''unlik (ı / i / u / ü)
Qo''shimchalar: -(y)ım, -sın, -mı?, -(y)ı, -(n)ın, -dı
- a, ı → **ı**: kız**ım**, al**dı**m
- e, i → **i**: ev**im**, gel**di**m
- o, u → **u**: okul**um**, oku**du**m
- ö, ü → **ü**: göz**üm**, gör**dü**m

### Undosh uyg''unligi
Jarangsiz undoshlardan (**ç f h k p s ş t** — "FıSTıKÇı ŞaHaP") keyin **d → t, c → ç**: kitap**ta**, sokak**tan**, Taşkent**te**, ağaç**ta**.

### Yumshash
p, ç, t, k bilan tugagan ko''p bo''g''inli so''zlarga unli qo''shilsa: kitap → kita**b**ım, ağaç → ağa**c**ı, kalem → (o''zgarmaydi), ekmek → ekme**ğ**i.',
'{"back":"a ı o u","front":"e i ö ü","two":{"a":"a ı o u","e":"e i ö ü"},"four":{"ı":"a ı","i":"e i","u":"o u","ü":"ö ü"},"voiceless":"ç f h k p s ş t"}',
'[{"sentence":"kitap___ (ko''plik)","answer":"lar","options":["lar","ler"],"explain":"a → qalin → -lar."},{"sentence":"ev___ (ko''plik)","answer":"ler","options":["lar","ler"],"explain":"e → ingichka → -ler."},{"sentence":"okul___ (-da)","answer":"da","options":["da","de","ta","te"],"explain":"u → qalin, l jarangli → -da."},{"sentence":"kitap___ (-da)","answer":"ta","options":["ta","da","te","de"],"explain":"a → qalin; p jarangsiz → -ta."},{"sentence":"göz___ (-im)","answer":"üm","options":["üm","im","um","ım"],"explain":"ö → ü."},{"sentence":"Taşkent___ (-dan)","answer":"ten","options":["ten","tan","den","dan"],"explain":"e → ingichka; t jarangsiz → -ten."},{"sentence":"köprü___ (-de)","answer":"de","options":["de","da","te","ta"],"explain":"ü → ingichka → -de."},{"sentence":"ağaç___ (-da)","answer":"ta","options":["ta","te","da","de"],"explain":"a → qalin; ç jarangsiz → -ta."},{"sentence":"okul___ (-mı?)","answer":"mu","options":["mu","mı","mi","mü"],"explain":"u → mu."},{"sentence":"Türk___ (-ım)","answer":"üm","options":["üm","um","im","ım"],"explain":"ü → ü."}]'),

('plural', 6, 'Ko''plik: -lar / -ler', 'Çoğul eki', 'A1', 3,
'Ko''plik qo''shimchasi **-lar / -ler** — 2 lik uyg''unlik:
- kitap → kitap**lar**, öğrenci → öğrenci**ler**, göz → göz**ler**, oda → oda**lar**

Sonlardan keyin ko''plik **qo''shilmaydi** (o''zbekchadagi kabi!): üç kitap (uchta kitob), beş öğrenci.',
'{}',
'[{"sentence":"üç ___","answer":"kitap","options":["kitap","kitaplar","kitapler"],"explain":"Sondan keyin birlik: üç kitap."},{"sentence":"göz___","answer":"ler","options":["ler","lar"],"explain":"ö → ingichka."},{"sentence":"soru___","answer":"lar","options":["lar","ler"],"explain":"u → qalin."}]'),

('possessive', 11, 'Egalik qo''shimchalari', 'İyelik ekleri', 'A1', 4,
'| Shaxs | Undoshdan keyin | Unlidan keyin | Misol |
|---|---|---|---|
| benim | -ım/-im/-um/-üm | -m | evim, odam, gözüm, arabam |
| senin | -ın/-in/-un/-ün | -n | evin, odan, arabanın? → araban |
| onun | -ı/-i/-u/-ü | -sı/-si/-su/-sü | evi, odası, arabası |
| bizim | -ımız/-imiz/… | -mız/-miz/… | evimiz, arabamız |
| sizin | -ınız/-iniz/… | -nız/-niz/… | eviniz, arabanız |
| onların | -ları/-leri | -ları/-leri | evleri, arabaları |

O''zbekcha bilan solishtiring: ev**im** = uy**im**, ev**in** = uy**ing**, ev**i** = uy**i**.

Yumshash: kitap → kita**b**ım, ağaç → ağa**c**ım.',
'{}',
'[{"sentence":"benim ev___","answer":"im","options":["im","ım","um","üm"],"explain":"e → i."},{"sentence":"senin kitab___","answer":"ın","options":["ın","in","un","ün"],"explain":"kitap → kitab + ın (a → ı)."},{"sentence":"onun araba___","answer":"sı","options":["sı","ı","si","su"],"explain":"Unlidan keyin 3-shaxs: -sı."},{"sentence":"bizim okul___","answer":"umuz","options":["umuz","ımız","imiz","ümüz"],"explain":"u → u."},{"sentence":"sizin göz___","answer":"ünüz","options":["ünüz","unuz","iniz","ınız"],"explain":"ö → ü."},{"sentence":"onların ders___","answer":"leri","options":["leri","ları","i","si"],"explain":"e → ingichka → -leri."}]'),

('present_yor', 15, 'Hozirgi zamon: -(I)yor', 'Şimdiki zaman', 'A1', 5,
'**Shakl:** fe''l o''zagi + **(ı/i/u/ü)yor** + shaxs qo''shimchasi.

- gel-mek → gel**iyor**um (kelyapman), gel**iyor**sun, gel**iyor**, gel**iyor**uz, gel**iyor**sunuz, gel**iyor**lar
- al-mak → al**ıyor**um, oku-mak → oku**yor**um (unlidan keyin to''g''ridan-to''g''ri -yor), gör-mek → gör**üyor**um

**Diqqat:** a/e bilan tugagan o''zaklar torayadi: başla → başl**ıyor**, bekle → bekl**iyor**, ye → y**iyor**, de → d**iyor**.

**Inkor:** -mıyor / -miyor / -muyor / -müyor: gel**miyor**um, al**mıyor**um.
**Savol:** gel**iyor musun**? (mu alohida).',
'{}',
'[{"sentence":"Ben her gün Türkçe çalış___.","answer":"ıyorum","options":["ıyorum","iyorum","uyorum","yorum"],"explain":"çalış → ı → -ıyorum."},{"sentence":"Sen ne yap___?","answer":"ıyorsun","options":["ıyorsun","iyorsun","yorsun","uyorsun"],"explain":"yap → a → ı."},{"sentence":"O kitap oku___.","answer":"yor","options":["yor","uyor","ıyor","iyor"],"explain":"oku unlidan keyin to''g''ridan-to''g''ri -yor."},{"sentence":"Biz çay iç___.","answer":"iyoruz","options":["iyoruz","ıyoruz","üyoruz","yoruz"],"explain":"iç → i."},{"sentence":"Onlar parkta bekl___.","answer":"iyorlar","options":["iyorlar","eyorlar","iyor","ıyorlar"],"explain":"bekle → e tushadi → bekliyorlar."},{"sentence":"Ben et ye___.","answer":"miyorum","options":["miyorum","mıyorum","muyorum","yorum"],"explain":"Inkor: ye + miyor + um."},{"sentence":"Sen Türkçe biliyor ___?","answer":"musun","options":["musun","mısın","misin","müsün"],"explain":"biliyor → o → mu + sun."}]'),

('question_mi', 15, 'Savol: mı / mi / mu / mü', 'Soru eki', 'A1', 6,
'Savol yuklamasi **alohida yoziladi** va 4 lik uyg''unlikka bo''ysunadi:
- Sen öğrenci **misin**? — Sen talabamisan?
- Bu kitap **mı**? — Bu kitobmi?
- Türk **müsün**? Doktor **musun**?

Ha/yo''q javoblar: **Evet** / **Hayır** (diqqat: hayır = yo''q!).',
'{}',
'[{"sentence":"Bu ev ___?","answer":"mi","options":["mi","mı","mu","mü"],"explain":"ev → e → mi."},{"sentence":"Sen asker ___?","answer":"misin","options":["misin","mısın","musun","müsün"],"explain":"asker → e → misin."},{"sentence":"O doktor ___?","answer":"mu","options":["mu","mı","mi","mü"],"explain":"doktor → o → mu."}]'),

('negation', 15, 'Inkor: -ma/-me va değil', 'Olumsuzluk', 'A1', 7,
'**Fe''lda** inkor: -ma / -me (o''zbekcha -ma!): gel**me**! (kelma!), git**me**!
Hozirgi zamonda: gel**mi**yorum (ma → mı/mi torayadi).
**Ot/sifatda** inkor: **değil** — "emas": Bu ev değil (Bu uy emas). Ben hazır değilim.
**Mavjudlik** inkori: **yok** — "yo''q": Param yok (Pulim yo''q).',
'{}',
'[{"sentence":"Ben hazır ___.","answer":"değilim","options":["değilim","yokum","mıyım","hayırım"],"explain":"Sifat + değil + im."},{"sentence":"Param ___.","answer":"yok","options":["yok","değil","hayır","yoktur değil"],"explain":"Mavjudlik: yok."},{"sentence":"Oraya git___!","answer":"me","options":["me","ma","değil","yok"],"explain":"git → i → -me."}]'),

('cases', 19, 'Kelishiklar', 'Hâl ekleri', 'A1', 8,
'| Kelishik | Turkcha | O''zbekcha | Misol |
|---|---|---|---|
| O''rin | -da/-de (-ta/-te) | -da | evde, okulda, kitapta |
| Chiqish | -dan/-den (-tan/-ten) | -dan | evden, Taşkent''ten |
| Jo''nalish | -(y)a/-(y)e | -ga | eve, okula, arabaya |
| Tushum | -(y)ı/-i/-u/-ü | -ni | evi, kitabı, arabayı |
| Qaratqich | -(n)ın/-in/-un/-ün | -ning | evin, kitabın, arabanın |

Unlidan keyin **y** (jo''nalish, tushum) yoki **n** (qaratqich) qo''yiladi. Jarangsizdan keyin d → t.',
'{}',
'[{"sentence":"Ben okul___ gidiyorum.","answer":"a","options":["a","e","da","ya"],"explain":"Jo''nalish: okul + a."},{"sentence":"Kitap masa___.","answer":"da","options":["da","de","ta","te"],"explain":"masa → a → -da."},{"sentence":"Taşkent___ geliyorum.","answer":"ten","options":["ten","tan","den","dan"],"explain":"t jarangsiz, e ingichka → -ten."},{"sentence":"Araba___ gördüm.","answer":"yı","options":["yı","ı","yi","i"],"explain":"Unlidan keyin -yı."},{"sentence":"Ali''___ evi büyük.","answer":"nin","options":["nin","nın","in","ın"],"explain":"Unlidan keyin -nin (i)."},{"sentence":"Kitab___ oku.","answer":"ı","options":["ı","i","yı","u"],"explain":"kitap → kitab (yumshash) + ı (tushum)."}]'),

('var_yok_imperative', 23, 'var / yok va buyruq mayli', 'Var-yok ve emir kipi', 'A1', 9,
'**var** = bor, **yok** = yo''q — aynan o''zbekcha:
- Evde süt **var**. — Uyda sut bor. Param **yok**. — Pulim yo''q.
- Savol: Çay var **mı**? Ekmek yok **mu**?

**Buyruq mayli:**
| Shaxs | Shakl | Misol |
|---|---|---|
| sen | o''zak | gel! al! otur! |
| siz | -(y)in/-(y)ın/-(y)un/-(y)ün | gelin! alın! oturun! |
| siz (rasmiy) | -(y)iniz | geliniz! |
| inkor | -ma/-me | gelme! almayın! |

O''zbekcha: kel! keling! kelma! — mantiq bir xil.',
'{}',
'[{"sentence":"Evde ekmek ___ mı?","answer":"var","options":["var","yok","değil","evet"],"explain":"Savol: bor-mi?"},{"sentence":"Lütfen otur___.","answer":"un","options":["un","ın","in","ün"],"explain":"otur → u → -un."},{"sentence":"Buraya gel___!","answer":"me","options":["me","ma","mi","mı"],"explain":"Inkor buyruq: gelme!"},{"sentence":"Param ___.","answer":"yok","options":["yok","var değil","hayır","yoksa"],"explain":"yo''q = yok."}]'),

('comparison', 27, 'Solishtirish: daha / en', 'Karşılaştırma', 'A1', 10,
'- **daha** + sifat = -roq: daha büyük (kattaroq), daha güzel (chiroyliroq)
- **en** + sifat = eng: en büyük (eng katta), en iyi (eng yaxshi)
- "-dan ko''ra": **-dan/-den daha**: Taşkent Buhara''**dan daha** büyük.
- **kadar** = -dek/kabi: Ali Veli **kadar** uzun (Ali Veli kabi uzun).',
'{}',
'[{"sentence":"İstanbul Ankara''dan ___ büyük.","answer":"daha","options":["daha","en","kadar","çok"],"explain":"Solishtirish: daha."},{"sentence":"Bu ___ güzel şehir.","answer":"en","options":["en","daha","kadar","çok"],"explain":"Eng: en."},{"sentence":"Çay kahve___ daha ucuz.","answer":"den","options":["den","dan","de","ten"],"explain":"kahve → e → -den."}]'),

('past_di', 30, 'O''tgan zamon: -DI', 'Geçmiş zaman -DI', 'A1', 11,
'**Shakl:** o''zak + **dı/di/du/dü** (jarangsizdan keyin **tı/ti/tu/tü**) + shaxs.

| | gel-mek | al-mak | gör-mek | oku-mak | git-mek |
|---|---|---|---|---|---|
| ben | geldim | aldım | gördüm | okudum | gittim |
| sen | geldin | aldın | gördün | okudun | gittin |
| o | geldi | aldı | gördü | okudu | gitti |
| biz | geldik | aldık | gördük | okuduk | gittik |
| siz | geldiniz | aldınız | gördünüz | okudunuz | gittiniz |
| onlar | geldiler | aldılar | gördüler | okudular | gittiler |

O''zbekcha **-di** bilan bir xil: keldim = geldim! **Inkor:** gel**me**dim. **Savol:** geldin **mi**?',
'{}',
'[{"sentence":"Dün parka git___.","answer":"tim","options":["tim","dim","tım","dım"],"explain":"git → t jarangsiz, i → -tim."},{"sentence":"Sen kitap oku___ mu?","answer":"dun","options":["dun","dın","din","tun"],"explain":"oku → u → -dun."},{"sentence":"Biz çay iç___.","answer":"tik","options":["tik","dik","tık","dık"],"explain":"ç jarangsiz, i → -tik."},{"sentence":"Onlar eve gel___.","answer":"diler","options":["diler","dılar","tiler","di"],"explain":"gel → e → -diler."},{"sentence":"Ben hiçbir şey gör___.","answer":"medim","options":["medim","madım","dim","medi"],"explain":"Inkor: gör + me + dim."},{"sentence":"Siz Türkçe öğren___.","answer":"diniz","options":["diniz","dınız","tiniz","dunuz"],"explain":"öğren → e → -diniz."}]'),

('future_acak', 35, 'Kelasi zamon: -(y)AcAk', 'Gelecek zaman', 'A2', 12,
'**Shakl:** o''zak + **(y)acak / (y)ecek** + shaxs. Unli qo''shimcha kelsa **k → ğ**.
- gel-ecek → geleceğim, geleceksin, gelecek, geleceğiz, geleceksiniz, gelecekler
- yap-acak → yapacağım, yapacaksın, yapacak
- oku-yacak → okuyacağım (unlidan keyin y)
**Inkor:** gel**meyeceğ**im. **Savol:** gelecek **misin**?',
'{}',
'[{"sentence":"Yarın İstanbul''a gid___.","answer":"eceğim","options":["eceğim","acağım","ecek","eceğiz"],"explain":"git → gid (yumshash) + eceğim."},{"sentence":"Sen ne yap___?","answer":"acaksın","options":["acaksın","eceksin","acak","yacaksın"],"explain":"yap → a → -acaksın."},{"sentence":"Biz kitap oku___.","answer":"yacağız","options":["yacağız","acağız","yeceğiz","yacak"],"explain":"Unlidan keyin y; biz → -ız → ğ."}]'),

('aorist', 39, 'Keng zamon: -(A/I)r', 'Geniş zaman', 'A2', 13,
'Odat, umumiy haqiqat, kelajakdagi va''da:
- Her sabah çay iç**er**im. — Har tong choy ichaman.
- Su 100 derecede kayn**ar**. — Suv 100 darajada qaynaydi.

**Shakl:** unli bilan tugasa **-r** (oku-r), bir bo''g''inli undosh bilan tugasa odatda **-ar/-er** (gel-ir ❗istisno, al-ır ❗, bil-ir ❗, gör-ür ❗ — 13 ta istisno), ko''p bo''g''inli **-ır/-ir/-ur/-ür** (çalış-ır, öğren-ir).
**Inkor maxsus:** ben iç**me**m, sen iç**mez**sin, o iç**mez**, biz iç**mey**iz, siz iç**mez**siniz, onlar iç**mez**ler.',
'{}',
'[{"sentence":"Her gün Türkçe çalış___.","answer":"ırım","options":["ırım","arım","ırum","erim"],"explain":"Ko''p bo''g''inli: -ır + ım."},{"sentence":"O süt iç___.","answer":"mez","options":["mez","mem","maz","miyor"],"explain":"Inkor 3-shaxs: -mez."},{"sentence":"Ben et ye___.","answer":"mem","options":["mem","mez","meyim","rim"],"explain":"Inkor 1-shaxs: -mem."},{"sentence":"Sen her sabah erken kalk___?","answer":"ar mısın","options":["ar mısın","ır mısın","ar misin","armısın"],"explain":"kalk → bir bo''g''in → -ar; savol alohida."}]')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- SO'ZLAR (lesson_id, tr, uz, pos, example_tr, example_uz, cognate, false_friend, tags, cefr)
-- ---------------------------------------------------------------------
insert into public.words (lesson_id, tr, uz, pos, example_tr, example_uz, cognate, false_friend, tags, cefr) values
-- 1. Salomlashuv
(1,'merhaba','salom','phrase','Merhaba, ben Ali.','Salom, men Ali.','marhabo',false,'{greeting}','A1'),
(1,'selam','salom (norasmiy)','phrase','Selam! Nasılsın?','Salom! Qalaysan?','salom',false,'{greeting}','A1'),
(1,'günaydın','xayrli tong','phrase','Günaydın, iyi dersler!','Xayrli tong, darslaringiz yaxshi o''tsin!','gün = kun',false,'{greeting}','A1'),
(1,'iyi akşamlar','xayrli kech','phrase','İyi akşamlar, hoş geldiniz.','Xayrli kech, xush kelibsiz.','akşam = oqshom',false,'{greeting}','A1'),
(1,'iyi geceler','xayrli tun','phrase','İyi geceler, tatlı rüyalar.','Xayrli tun, shirin tushlar.','gece = tun (o''zb. "kecha" emas!)',true,'{greeting}','A1'),
(1,'nasılsın','qalaysan','phrase','Nasılsın? — İyiyim, teşekkürler.','Qalaysan? — Yaxshiman, rahmat.',null,false,'{greeting}','A1'),
(1,'iyiyim','yaxshiman','phrase','İyiyim, sen nasılsın?','Yaxshiman, sen qalaysan?',null,false,'{greeting}','A1'),
(1,'teşekkür ederim','rahmat','phrase','Teşekkür ederim, çok naziksiniz.','Rahmat, juda mehribonsiz.','tashakkur',false,'{greeting}','A1'),
(1,'lütfen','iltimos','adv','Bir çay, lütfen.','Bitta choy, iltimos.',null,false,'{greeting}','A1'),
(1,'evet','ha','adv','Evet, doğru.','Ha, to''g''ri.',null,false,'{basic}','A1'),
(1,'hayır','yo''q','adv','Hayır, bilmiyorum.','Yo''q, bilmayman.','"xayr" EMAS — yo''q degani!',true,'{basic}','A1'),
(1,'hoşça kal','xayr (ketayotgan kishi)','phrase','Hoşça kal, görüşürüz.','Xayr, ko''rishguncha.','xush',false,'{greeting}','A1'),
(1,'güle güle','xayr (qolayotgan kishi)','phrase','Güle güle!','Xayr (yaxshi boring)!','gül- = kul-',false,'{greeting}','A1'),
(1,'görüşürüz','ko''rishguncha','phrase','Yarın görüşürüz.','Ertaga ko''rishamiz.','görüş- = ko''rish-',false,'{greeting}','A1'),
(1,'adın ne?','isming nima?','phrase','Adın ne? — Adım Valijon.','Isming nima? — Ismim Valijon.','ad = ot (ism)',false,'{intro}','A1'),
(1,'memnun oldum','tanishganimdan xursandman','phrase','Memnun oldum!','Tanishganimdan xursandman!','mamnun',false,'{intro}','A1'),
(1,'nerelisin?','qayerliksan?','phrase','Nerelisin? — Özbekistanlıyım.','Qayerliksan? — O''zbekistonlikman.',null,false,'{intro}','A1'),
(1,'Özbekistanlıyım','o''zbekistonlikman','phrase','Ben Özbekistanlıyım, Taşkent''te yaşıyorum.','Men o''zbekistonlikman, Toshkentda yashayman.',null,false,'{intro}','A1'),
(1,'hoş geldiniz','xush kelibsiz','phrase','Hoş geldiniz!','Xush kelibsiz!','xush kelibsiz',false,'{greeting}','A1'),
(1,'hoş bulduk','rahmat (javob)','phrase','Hoş bulduk, teşekkürler.','Rahmat (xush kelibsizga javob).',null,false,'{greeting}','A1'),
(1,'affedersiniz','kechirasiz','phrase','Affedersiniz, saat kaç?','Kechirasiz, soat necha?','afv',false,'{greeting}','A1'),
(1,'rica ederim','arzimaydi','phrase','Teşekkürler! — Rica ederim.','Rahmat! — Arzimaydi.',null,false,'{greeting}','A1'),

-- 2. Qarindosh so'zlar
(2,'göz','ko''z','noun','Gözlerim yeşil.','Ko''zlarim yashil.','ko''z (o'' → ö)',false,'{body,cognate}','A1'),
(2,'el','qo''l','noun','Elimde kitap var.','Qo''limda kitob bor.','"el" o''zbekchada xalq! Bu yerda — qo''l',true,'{body,cognate}','A1'),
(2,'ayak','oyoq','noun','Ayağım ağrıyor.','Oyog''im og''riyapti.','oyoq (q → k)',false,'{body,cognate}','A1'),
(2,'baş','bosh','noun','Başım ağrıyor.','Boshim og''riyapti.','bosh',false,'{body,cognate}','A1'),
(2,'yürek','yurak','noun','Yüreğim hızlı atıyor.','Yuragim tez uryapti.','yurak',false,'{body,cognate}','A1'),
(2,'su','suv','noun','Bir bardak su, lütfen.','Bir stakan suv, iltimos.','suv',false,'{food,cognate}','A1'),
(2,'süt','sut','noun','Her sabah süt içiyorum.','Har tong sut ichaman.','sut',false,'{food,cognate}','A1'),
(2,'ekmek','non','noun','Ekmek alıyorum.','Non olyapman.','"ekmoq" EMAS — non!',true,'{food,cognate}','A1'),
(2,'et','go''sht','noun','Et yemiyorum.','Go''sht yemayman.','"et-" (qilmoq) EMAS — go''sht!',true,'{food,cognate}','A1'),
(2,'tuz','tuz','noun','Tuz ver, lütfen.','Tuz ber, iltimos.','tuz',false,'{food,cognate}','A1'),
(2,'taş','tosh','noun','Bu taş çok ağır.','Bu tosh juda og''ir.','tosh',false,'{nature,cognate}','A1'),
(2,'dağ','tog''','noun','Dağa çıkıyoruz.','Toqqa chiqyapmiz.','tog'' (g'' → ğ)',false,'{nature,cognate}','A1'),
(2,'deniz','dengiz','noun','Deniz çok güzel.','Dengiz juda chiroyli.','dengiz',false,'{nature,cognate}','A1'),
(2,'gün','kun','noun','Bugün güzel bir gün.','Bugun go''zal kun.','kun',false,'{time,cognate}','A1'),
(2,'yıl','yil','noun','Bu yıl Türkçe öğreniyorum.','Bu yil turkcha o''rganyapman.','yil',false,'{time,cognate}','A1'),
(2,'ay','oy','noun','Ay çok parlak.','Oy juda yorqin.','oy (ham oy=month)',false,'{time,cognate}','A1'),
(2,'kuş','qush','noun','Kuşlar uçuyor.','Qushlar uchyapti.','qush',false,'{nature,cognate}','A1'),
(2,'at','ot','noun','At çok hızlı.','Ot juda tez.','ot',false,'{nature,cognate}','A1'),
(2,'balık','baliq','noun','Balık seviyorum.','Baliq yaxshi ko''raman.','baliq',false,'{food,cognate}','A1'),
(2,'yol','yo''l','noun','Yol uzun.','Yo''l uzun.','yo''l',false,'{city,cognate}','A1'),
(2,'ev','uy','noun','Evim büyük.','Uyim katta.','uy',false,'{home,cognate}','A1'),
(2,'kız','qiz','noun','Kızım beş yaşında.','Qizim besh yoshda.','qiz',false,'{family,cognate}','A1'),
(2,'oğul','o''g''il','noun','Oğlum okula gidiyor.','O''g''lim maktabga boryapti.','o''g''il',false,'{family,cognate}','A1'),
(2,'kitap','kitob','noun','Bu kitap çok ilginç.','Bu kitob juda qiziq.','kitob',false,'{school,cognate}','A1'),
(2,'kalem','qalam','noun','Kalemim nerede?','Qalamim qayerda?','qalam',false,'{school,cognate}','A1'),
(2,'okumak','o''qimoq','verb','Kitap okuyorum.','Kitob o''qiyapman.','o''qimoq',false,'{verb,cognate}','A1'),
(2,'yazmak','yozmoq','verb','Mektup yazıyorum.','Xat yozyapman.','yozmoq',false,'{verb,cognate}','A1'),
(2,'gelmek','kelmoq','verb','Yarın geliyorum.','Ertaga kelaman.','kelmoq',false,'{verb,cognate}','A1'),
(2,'gitmek','ketmoq, bormoq','verb','Okula gidiyorum.','Maktabga boryapman.','ketmoq',false,'{verb,cognate}','A1'),
(2,'almak','olmoq','verb','Ekmek alıyorum.','Non olyapman.','olmoq',false,'{verb,cognate}','A1'),
(2,'vermek','bermoq','verb','Bana su ver.','Menga suv ber.','bermoq',false,'{verb,cognate}','A1'),
(2,'bilmek','bilmoq','verb','Türkçe biliyorum.','Turkcha bilaman.','bilmoq',false,'{verb,cognate}','A1'),
(2,'bulmak','topmoq','verb','Anahtarı buldum.','Kalitni topdim.','"bo''lmoq" EMAS — topmoq!',true,'{verb,cognate}','A1'),
(2,'olmak','bo''lmoq','verb','Doktor olmak istiyorum.','Doktor bo''lishni xohlayman.','"olmoq" EMAS — bo''lmoq!',true,'{verb,cognate}','A1'),
(2,'görmek','ko''rmoq','verb','Seni görmek istiyorum.','Seni ko''rishni xohlayman.','ko''rmoq',false,'{verb,cognate}','A1'),
(2,'gülmek','kulmoq','verb','Çocuk gülüyor.','Bola kulyapti.','kulmoq',false,'{verb,cognate}','A1'),
(2,'uyumak','uxlamoq','verb','Erken uyuyorum.','Erta uxlayman.','uyqu',false,'{verb,cognate}','A1'),
(2,'hazır','tayyor','adj','Yemek hazır!','Ovqat tayyor!','"hozir" EMAS — tayyor!',true,'{adj,cognate}','A1'),
(2,'şimdi','hozir','adv','Şimdi ders çalışıyorum.','Hozir dars qilyapman.',null,false,'{time}','A1'),
(2,'dede','bobo','noun','Dedem köyde yaşıyor.','Bobom qishloqda yashaydi.','"dada" EMAS — bobo!',true,'{family,cognate}','A1'),
(2,'baba','ota','noun','Babam asker.','Otam askar.','"buva" EMAS — ota!',true,'{family,cognate}','A1'),
(2,'anne','ona','noun','Annem öğretmen.','Onam o''qituvchi.','ona',false,'{family,cognate}','A1'),
(2,'kardeş','aka-uka, opa-singil','noun','İki kardeşim var.','Ikki aka-ukam bor.','"qarindosh" emas — aka-uka/opa-singil',true,'{family,cognate}','A1'),
(2,'aile','oila','noun','Ailem Taşkent''te.','Oilam Toshkentda.','oila',false,'{family,cognate}','A1'),
(2,'arkadaş','do''st','noun','Arkadaşım çok iyi.','Do''stim juda yaxshi.','"arqadosh" — orqadosh (yonma-yon yuruvchi)',false,'{people,cognate}','A1'),
(2,'öğretmen','o''qituvchi','noun','Öğretmen sınıfta.','O''qituvchi sinfda.','o''rgat- = öğret-',false,'{school,cognate}','A1'),
(2,'öğrenci','o''quvchi, talaba','noun','Ben öğrenciyim.','Men talabaman.','o''rgan- = öğren-',false,'{school,cognate}','A1'),
(2,'ders','dars','noun','Ders saat dokuzda.','Dars soat to''qqizda.','dars',false,'{school,cognate}','A1'),
(2,'soru','savol','noun','Bir sorum var.','Bir savolim bor.','so''ra- = sor-',false,'{school,cognate}','A1'),
(2,'cevap','javob','noun','Cevap doğru.','Javob to''g''ri.','javob (j → c)',false,'{school,cognate}','A1'),
(2,'doğru','to''g''ri','adj','Bu cevap doğru.','Bu javob to''g''ri.','to''g''ri',false,'{adj,cognate}','A1'),
(2,'yanlış','noto''g''ri','adj','Bu yanlış.','Bu noto''g''ri.','yanglish',false,'{adj,cognate}','A1'),
(2,'iş','ish','noun','İşim var.','Ishim bor.','ish',false,'{work,cognate}','A1'),
(2,'para','pul','noun','Param yok.','Pulim yo''q.',null,false,'{money}','A1'),
(2,'köprü','ko''prik','noun','Köprü çok uzun.','Ko''prik juda uzun.','ko''prik',false,'{city,cognate}','A1'),
(2,'çok','ko''p, juda','adv','Çok güzel!','Juda chiroyli!','ko''p',false,'{basic,cognate}','A1'),
(2,'az','oz, kam','adv','Az konuşuyor.','Kam gapiradi.','oz',false,'{basic,cognate}','A1'),
(2,'zor','qiyin','adj','Türkçe zor değil.','Turkcha qiyin emas.','"zo''r" EMAS — qiyin!',true,'{adj}','A1'),
(2,'kolay','oson','adj','Bu ders kolay.','Bu dars oson.',null,false,'{adj}','A1'),

-- 5. Alifbo (harf-so'zlar)
(5,'çay','choy','noun','Çay içelim mi?','Choy ichaylikmi?','choy (ç = ch)',false,'{food,alphabet}','A1'),
(5,'şehir','shahar','noun','Taşkent büyük bir şehir.','Toshkent katta shahar.','shahar (ş = sh)',false,'{city,alphabet}','A1'),
(5,'ağaç','daraxt','noun','Ağaç yeşil.','Daraxt yashil.','yog''och (ğ — cho''ziq)',false,'{nature,alphabet}','A1'),
(5,'ılık','iliq','adj','Su ılık.','Suv iliq.','iliq (ı = qattiq i)',false,'{adj,alphabet}','A1'),
(5,'ödev','uy vazifasi','noun','Ödevim var.','Uy vazifam bor.',null,false,'{school,alphabet}','A1'),
(5,'üzüm','uzum','noun','Üzüm tatlı.','Uzum shirin.','uzum (ü)',false,'{food,alphabet}','A1'),
(5,'cam','oyna, shisha','noun','Cam kırıldı.','Oyna sindi.','jom (c = j)',false,'{home,alphabet}','A1'),
(5,'ceket','kurtka, pidjak','noun','Ceketim mavi.','Kurtkam ko''k.','jaket (c = j)',false,'{clothes,alphabet}','A1'),
(5,'jandarma','jandarm','noun','Jandarma geldi.','Jandarm keldi.','j = zh',false,'{alphabet}','A1'),
(5,'yıldız','yulduz','noun','Gökyüzünde yıldız var.','Osmonda yulduz bor.','yulduz',false,'{nature,alphabet}','A1'),
(5,'harf','harf','noun','Türkçede 29 harf var.','Turkchada 29 ta harf bor.','harf',false,'{school,alphabet}','A1'),
(5,'kelime','so''z','noun','Yeni kelime öğrendim.','Yangi so''z o''rgandim.','kalima',false,'{school,alphabet}','A1'),
(5,'cümle','gap, jumla','noun','Bir cümle kur.','Bir gap tuz.','jumla',false,'{school,alphabet}','A1'),
(5,'dil','til','noun','Türk dili kolay.','Turk tili oson.','til',false,'{school,alphabet}','A1'),

-- 7. Sonlar
(7,'bir','bir','number','Bir çay lütfen.','Bitta choy iltimos.','bir',false,'{number}','A1'),
(7,'iki','ikki','number','İki kardeşim var.','Ikki aka-ukam bor.','ikki',false,'{number}','A1'),
(7,'üç','uch','number','Üç kitap aldım.','Uchta kitob oldim.','uch',false,'{number}','A1'),
(7,'dört','to''rt','number','Dört oda var.','To''rtta xona bor.','to''rt',false,'{number}','A1'),
(7,'beş','besh','number','Beş dakika bekle.','Besh daqiqa kut.','besh',false,'{number}','A1'),
(7,'altı','olti','number','Saat altı.','Soat olti.','olti',false,'{number}','A1'),
(7,'yedi','yetti','number','Yedi gün.','Yetti kun.','yetti',false,'{number}','A1'),
(7,'sekiz','sakkiz','number','Sekiz lira.','Sakkiz lira.','sakkiz',false,'{number}','A1'),
(7,'dokuz','to''qqiz','number','Dokuz öğrenci.','To''qqizta talaba.','to''qqiz',false,'{number}','A1'),
(7,'on','o''n','number','On yaşındayım.','O''n yoshdaman.','o''n',false,'{number}','A1'),
(7,'yirmi','yigirma','number','Yirmi lira.','Yigirma lira.','yigirma',false,'{number}','A1'),
(7,'otuz','o''ttiz','number','Otuz gün.','O''ttiz kun.','o''ttiz',false,'{number}','A1'),
(7,'kırk','qirq','number','Kırk kişi.','Qirq kishi.','qirq',false,'{number}','A1'),
(7,'elli','ellik','number','Elli lira.','Ellik lira.','ellik',false,'{number}','A1'),
(7,'altmış','oltmish','number','Altmış dakika.','Oltmish daqiqa.','oltmish',false,'{number}','A1'),
(7,'yetmiş','yetmish','number','Yetmiş yıl.','Yetmish yil.','yetmish',false,'{number}','A1'),
(7,'seksen','sakson','number','Seksen kilometre.','Sakson kilometr.','sakson',false,'{number}','A1'),
(7,'doksan','to''qson','number','Doksan puan.','To''qson ball.','to''qson',false,'{number}','A1'),
(7,'yüz','yuz','number','Yüz lira.','Yuz lira.','yuz',false,'{number}','A1'),
(7,'bin','ming','number','Bin yıl.','Ming yil.','ming',false,'{number}','A1'),
(7,'sıfır','nol','number','Sıfır derece.','Nol daraja.','sifr',false,'{number}','A1'),
(7,'kaç?','nechta? necha?','pron','Kaç yaşındasın?','Necha yoshdasan?',null,false,'{number}','A1'),
(7,'yarım','yarim','number','Yarım saat.','Yarim soat.','yarim',false,'{number}','A1'),

-- 9. Oila
(9,'abi','aka','noun','Abim mühendis.','Akam muhandis.',null,false,'{family}','A1'),
(9,'abla','opa','noun','Ablam doktor.','Opam shifokor.',null,false,'{family}','A1'),
(9,'teyze','xola','noun','Teyzem geldi.','Xolam keldi.',null,false,'{family}','A1'),
(9,'hala','amma','noun','Halam İstanbul''da.','Ammam Istanbulda.',null,false,'{family}','A1'),
(9,'amca','amaki','noun','Amcam asker.','Amakim askar.',null,false,'{family}','A1'),
(9,'dayı','tog''a','noun','Dayım çiftçi.','Tog''am dehqon.',null,false,'{family}','A1'),
(9,'nine','buvi','noun','Ninem çay yapıyor.','Buvim choy damlayapti.',null,false,'{family}','A1'),
(9,'çocuk','bola','noun','Çocuk oynuyor.','Bola o''ynayapti.',null,false,'{family}','A1'),
(9,'bebek','chaqaloq','noun','Bebek uyuyor.','Chaqaloq uxlayapti.',null,false,'{family}','A1'),
(9,'eş','turmush o''rtog''i','noun','Eşim öğretmen.','Turmush o''rtog''im o''qituvchi.',null,false,'{family}','A1'),
(9,'koca','er','noun','Kocam çalışıyor.','Erim ishlayapti.',null,false,'{family}','A1'),
(9,'karı','xotin','noun','Karım doktor.','Xotinim shifokor.',null,false,'{family}','A1'),
(9,'torun','nevara','noun','Torunum beş yaşında.','Nevaram besh yoshda.',null,false,'{family}','A1'),
(9,'adam','erkak; odam','noun','O adam uzun.','U erkak baland.','odam',false,'{people}','A1'),
(9,'kadın','ayol','noun','Kadın çay içiyor.','Ayol choy ichyapti.',null,false,'{people}','A1'),
(9,'genç','yosh','adj','O çok genç.','U juda yosh.',null,false,'{people}','A1'),
(9,'yaşlı','keksa','adj','Dedem yaşlı.','Bobom keksa.','yosh-',false,'{people}','A1'),
(9,'evli','turmush qurgan','adj','Abim evli.','Akam uylangan.','uy-li',false,'{family}','A1'),
(9,'bekâr','bo''ydoq','adj','Ben bekârım.','Men bo''ydoqman.',null,false,'{family}','A1'),

-- 10. Uy
(10,'oda','xona','noun','Odam küçük.','Xonam kichik.',null,false,'{home}','A1'),
(10,'kapı','eshik','noun','Kapıyı kapat.','Eshikni yop.',null,false,'{home}','A1'),
(10,'pencere','deraza','noun','Pencereyi aç.','Derazani och.','"panjara" EMAS — deraza!',true,'{home}','A1'),
(10,'masa','stol','noun','Kitap masada.','Kitob stolda.',null,false,'{home}','A1'),
(10,'sandalye','stul','noun','Sandalyeye otur.','Stulga o''tir.',null,false,'{home}','A1'),
(10,'yatak','karavot','noun','Yatak rahat.','Karavot qulay.','yot- = yat-',false,'{home}','A1'),
(10,'mutfak','oshxona','noun','Annem mutfakta.','Onam oshxonada.',null,false,'{home}','A1'),
(10,'banyo','hammom, vanna','noun','Banyo temiz.','Hammom toza.',null,false,'{home}','A1'),
(10,'salon','mehmonxona (zal)','noun','Salonda televizyon var.','Zalda televizor bor.',null,false,'{home}','A1'),
(10,'bahçe','bog''','noun','Bahçede ağaç var.','Bog''da daraxt bor.','bog''cha',false,'{home}','A1'),
(10,'anahtar','kalit','noun','Anahtarım nerede?','Kalitim qayerda?',null,false,'{home}','A1'),
(10,'lamba','chiroq','noun','Lambayı aç.','Chiroqni yoq.',null,false,'{home}','A1'),
(10,'telefon','telefon','noun','Telefonum çalıyor.','Telefonim jiringlayapti.','telefon',false,'{home}','A1'),
(10,'televizyon','televizor','noun','Televizyon izliyorum.','Televizor ko''ryapman.','televizor',false,'{home}','A1'),
(10,'duvar','devor','noun','Duvar beyaz.','Devor oq.','devor',false,'{home}','A1'),
(10,'halı','gilam','noun','Halı kırmızı.','Gilam qizil.',null,false,'{home}','A1'),
(10,'temiz','toza','adj','Oda temiz.','Xona toza.',null,false,'{adj}','A1'),
(10,'kirli','kir, iflos','adj','Elbise kirli.','Kiyim kir.','kir',false,'{adj}','A1'),

-- 13. Vaqt
(13,'Pazartesi','dushanba','noun','Pazartesi ders var.','Dushanba dars bor.',null,false,'{time,day}','A1'),
(13,'Salı','seshanba','noun','Salı günü spor yapıyorum.','Seshanba kuni sport qilaman.',null,false,'{time,day}','A1'),
(13,'Çarşamba','chorshanba','noun','Çarşamba sınav var.','Chorshanba imtihon bor.','chorshanba',false,'{time,day}','A1'),
(13,'Perşembe','payshanba','noun','Perşembe toplantı var.','Payshanba yig''ilish bor.','payshanba',false,'{time,day}','A1'),
(13,'Cuma','juma','noun','Cuma günü tatil.','Juma kuni dam.','juma',false,'{time,day}','A1'),
(13,'Cumartesi','shanba','noun','Cumartesi parka gidiyoruz.','Shanba parkka boramiz.',null,false,'{time,day}','A1'),
(13,'Pazar','yakshanba; bozor','noun','Pazar günü dinleniyorum.','Yakshanba dam olaman.','bozor (ikki ma''no!)',true,'{time,day}','A1'),
(13,'bugün','bugun','adv','Bugün hava güzel.','Bugun havo yaxshi.','bugun',false,'{time}','A1'),
(13,'yarın','ertaga','adv','Yarın görüşürüz.','Ertaga ko''rishamiz.',null,false,'{time}','A1'),
(13,'dün','kecha','adv','Dün yağmur yağdı.','Kecha yomg''ir yog''di.',null,false,'{time}','A1'),
(13,'sabah','ertalab','noun','Sabah kahvaltı yapıyorum.','Ertalab nonushta qilaman.','sabo',false,'{time}','A1'),
(13,'öğle','tush (peshin)','noun','Öğle yemeği saat birde.','Tushlik soat birda.',null,false,'{time}','A1'),
(13,'akşam','kech, oqshom','noun','Akşam eve dönüyorum.','Kechqurun uyga qaytaman.','oqshom',false,'{time}','A1'),
(13,'gece','tun','noun','Gece sessiz.','Tun jim.','"kecha" EMAS — tun!',true,'{time}','A1'),
(13,'saat','soat','noun','Saat kaç? — Saat üç.','Soat necha? — Soat uch.','soat',false,'{time}','A1'),
(13,'dakika','daqiqa','noun','Beş dakika bekle.','Besh daqiqa kut.','daqiqa',false,'{time}','A1'),
(13,'hafta','hafta','noun','Haftada iki ders.','Haftada ikki dars.','hafta',false,'{time}','A1'),
(13,'her gün','har kuni','adv','Her gün Türkçe çalışıyorum.','Har kuni turkcha o''rganaman.','har kun',false,'{time}','A1'),
(13,'şimdi','hozir','adv','Şimdi evdeyim.','Hozir uydaman.',null,false,'{time}','A1'),
(13,'sonra','keyin','adv','Dersten sonra parka gidiyorum.','Darsdan keyin parkka boraman.','so''ng',false,'{time}','A1'),
(13,'önce','oldin','adv','Yemekten önce ellerini yıka.','Ovqatdan oldin qo''lingni yuv.',null,false,'{time}','A1'),
(13,'erken','erta','adv','Erken kalkıyorum.','Erta turaman.','erta',false,'{time}','A1'),
(13,'geç','kech','adv','Geç kaldım.','Kech qoldim.','kech',false,'{time}','A1'),
(13,'Ocak','yanvar','noun','Ocak ayında kar yağıyor.','Yanvar oyida qor yog''adi.',null,false,'{time,month}','A1'),
(13,'Mart','mart','noun','Mart ayında Nevruz var.','Mart oyida Navro''z bor.','mart',false,'{time,month}','A1'),
(13,'Eylül','sentabr','noun','Eylül''de okul başlıyor.','Sentabrda maktab boshlanadi.',null,false,'{time,month}','A1'),

-- 14. Fe'llar #1
(14,'yemek','yemoq; ovqat','verb','Pilav yiyorum.','Palov yeyapman.','yemoq',false,'{verb}','A1'),
(14,'içmek','ichmoq','verb','Çay içiyorum.','Choy ichyapman.','ichmoq',false,'{verb}','A1'),
(14,'konuşmak','gapirmoq','verb','Türkçe konuşuyorum.','Turkcha gapiryapman.',null,false,'{verb}','A1'),
(14,'dinlemek','tinglamoq','verb','Müzik dinliyorum.','Musiqa tinglayapman.','tinglamoq',false,'{verb}','A1'),
(14,'anlamak','tushunmoq','verb','Seni anlıyorum.','Seni tushunyapman.','anglamoq',false,'{verb}','A1'),
(14,'sevmek','sevmoq, yoqtirmoq','verb','Çayı seviyorum.','Choyni yoqtiraman.','sevmoq',false,'{verb}','A1'),
(14,'istemek','istamoq, xohlamoq','verb','Su istiyorum.','Suv xohlayman.','istamoq',false,'{verb}','A1'),
(14,'yapmak','qilmoq','verb','Ödev yapıyorum.','Uy vazifasi qilyapman.','"yopmoq" EMAS — qilmoq!',true,'{verb}','A1'),
(14,'koşmak','yugurmoq','verb','Parkta koşuyorum.','Parkda yuguryapman.',null,false,'{verb}','A1'),
(14,'yürümek','yurmoq, piyoda bormoq','verb','Okula yürüyorum.','Maktabga piyoda boraman.','yurmoq',false,'{verb}','A1'),
(14,'oturmak','o''tirmoq; yashamoq','verb','Taşkent''te oturuyorum.','Toshkentda yashayman.','o''tirmoq',false,'{verb}','A1'),
(14,'kalkmak','turmoq','verb','Saat yedide kalkıyorum.','Soat yettida turaman.',null,false,'{verb}','A1'),
(14,'uyanmak','uyg''onmoq','verb','Erken uyanıyorum.','Erta uyg''onaman.','uyg''onmoq',false,'{verb}','A1'),
(14,'giymek','kiymoq','verb','Ceket giyiyorum.','Kurtka kiyyapman.','kiymoq',false,'{verb}','A1'),
(14,'açmak','ochmoq','verb','Kapıyı açıyorum.','Eshikni ochyapman.','ochmoq',false,'{verb}','A1'),
(14,'kapatmak','yopmoq','verb','Pencereyi kapatıyorum.','Derazani yopyapman.',null,false,'{verb}','A1'),
(14,'beklemek','kutmoq','verb','Otobüs bekliyorum.','Avtobus kutyapman.',null,false,'{verb}','A1'),
(14,'aramak','qidirmoq; qo''ng''iroq qilmoq','verb','Seni arıyorum.','Senga qo''ng''iroq qilyapman.',null,false,'{verb}','A1'),
(14,'çalışmak','ishlamoq; dars qilmoq','verb','Çok çalışıyorum.','Ko''p ishlayapman.',null,false,'{verb}','A1'),
(14,'yıkamak','yuvmoq','verb','Elimi yıkıyorum.','Qo''limni yuvyapman.','yuvmoq',false,'{verb}','A1'),
(14,'bakmak','qaramoq','verb','Pencereden bakıyorum.','Derazadan qarayapman.','boqmoq',false,'{verb}','A1'),
(14,'sormak','so''ramoq','verb','Soru soruyorum.','Savol so''rayapman.','so''ramoq',false,'{verb}','A1'),

-- 17. Ovqat
(17,'kahve','kofe, qahva','noun','Kahve içer misin?','Kofe ichasanmi?','qahva',false,'{food}','A1'),
(17,'şeker','shakar','noun','Çaya şeker koyuyorum.','Choyga shakar solaman.','shakar',false,'{food}','A1'),
(17,'yumurta','tuxum','noun','Sabah yumurta yiyorum.','Ertalab tuxum yeyman.',null,false,'{food}','A1'),
(17,'peynir','pishloq','noun','Peynir seviyorum.','Pishloq yoqtiraman.',null,false,'{food}','A1'),
(17,'meyve','meva','noun','Meyve sağlıklı.','Meva foydali.','meva',false,'{food}','A1'),
(17,'sebze','sabzavot','noun','Sebze yemiyor.','Sabzavot yemaydi.','sabzavot',false,'{food}','A1'),
(17,'elma','olma','noun','Elma kırmızı.','Olma qizil.','olma',false,'{food}','A1'),
(17,'karpuz','tarvuz','noun','Karpuz tatlı.','Tarvuz shirin.','tarvuz',false,'{food}','A1'),
(17,'kavun','qovun','noun','Kavun çok lezzetli.','Qovun juda mazali.','qovun',false,'{food}','A1'),
(17,'soğan','piyoz','noun','Soğan doğruyorum.','Piyoz to''g''rayapman.',null,false,'{food}','A1'),
(17,'patates','kartoshka','noun','Patates kızartıyorum.','Kartoshka qovuryapman.',null,false,'{food}','A1'),
(17,'pilav','palov','noun','Pilav yiyoruz.','Palov yeyapmiz.','palov',false,'{food}','A1'),
(17,'çorba','sho''rva','noun','Çorba sıcak.','Sho''rva issiq.','sho''rva',false,'{food}','A1'),
(17,'tavuk','tovuq','noun','Tavuk eti.','Tovuq go''shti.','tovuq',false,'{food}','A1'),
(17,'kahvaltı','nonushta','noun','Kahvaltı hazır.','Nonushta tayyor.',null,false,'{food}','A1'),
(17,'öğle yemeği','tushlik','noun','Öğle yemeği saat birde.','Tushlik soat birda.',null,false,'{food}','A1'),
(17,'akşam yemeği','kechki ovqat','noun','Akşam yemeği yedik.','Kechki ovqatni yedik.',null,false,'{food}','A1'),
(17,'aç','och','adj','Çok açım.','Juda ochman.','och',false,'{food,adj}','A1'),
(17,'tok','to''q','adj','Tokum, teşekkürler.','To''qman, rahmat.','to''q',false,'{food,adj}','A1'),
(17,'lezzetli','mazali','adj','Çorba çok lezzetli.','Sho''rva juda mazali.','lazzatli',false,'{food,adj}','A1'),
(17,'tatlı','shirin; shirinlik','adj','Üzüm tatlı.','Uzum shirin.','totli',false,'{food,adj}','A1'),
(17,'tuzlu','sho''r','adj','Çorba tuzlu.','Sho''rva sho''r.','tuzli',false,'{food,adj}','A1'),
(17,'acı','achchiq','adj','Biber acı.','Qalampir achchiq.','achchiq',false,'{food,adj}','A1'),
(17,'afiyet olsun','yoqimli ishtaha','phrase','Afiyet olsun!','Yoqimli ishtaha!','ofiyat',false,'{food,phrase}','A1'),

-- 18. Bozorda
(18,'ne kadar?','qancha?','phrase','Bu ne kadar?','Bu qancha?',null,false,'{shopping}','A1'),
(18,'kaç lira?','necha lira?','phrase','Elma kaç lira?','Olma necha lira?',null,false,'{shopping}','A1'),
(18,'pahalı','qimmat','adj','Çok pahalı!','Juda qimmat!','baho',false,'{shopping,adj}','A1'),
(18,'ucuz','arzon','adj','Bu ucuz.','Bu arzon.',null,false,'{shopping,adj}','A1'),
(18,'pazar','bozor','noun','Pazara gidiyorum.','Bozorga boryapman.','bozor',false,'{shopping}','A1'),
(18,'market','do''kon (supermarket)','noun','Marketten süt al.','Do''kondan sut ol.',null,false,'{shopping}','A1'),
(18,'kilo','kilo','noun','İki kilo elma.','Ikki kilo olma.','kilo',false,'{shopping}','A1'),
(18,'buyurun','marhamat','phrase','Buyurun, ne istersiniz?','Marhamat, nima xohlaysiz?','buyur-',false,'{shopping}','A1'),
(18,'tamam','mayli, xo''p','adv','Tamam, alıyorum.','Mayli, olaman.','tamom',false,'{shopping}','A1'),
(18,'hesap','hisob (chek)','noun','Hesap lütfen.','Hisobni keltiring.','hisob',false,'{shopping}','A1'),
(18,'indirim','chegirma','noun','İndirim var mı?','Chegirma bormi?',null,false,'{shopping}','A1'),
(18,'satın almak','sotib olmoq','verb','Ekmek satın alıyorum.','Non sotib olyapman.','sotib olmoq',false,'{shopping,verb}','A1'),
(18,'satmak','sotmoq','verb','Meyve satıyor.','Meva sotadi.','sotmoq',false,'{shopping,verb}','A1'),
(18,'ödemek','to''lamoq','verb','Nakit ödüyorum.','Naqd to''layman.',null,false,'{shopping,verb}','A1'),
(18,'olur mu?','bo''ladimi?','phrase','Sekiz lira olur mu?','Sakkiz lira bo''ladimi?','bo''l-',false,'{shopping}','A1'),

-- 21. Shahardagi joylar
(21,'sokak','ko''cha','noun','Sokak dar.','Ko''cha tor.','so''qmoq',false,'{city}','A1'),
(21,'cadde','katta ko''cha','noun','Cadde çok kalabalık.','Katta ko''cha gavjum.','jodda',false,'{city}','A1'),
(21,'meydan','maydon','noun','Meydanda konser var.','Maydonda konsert bor.','maydon',false,'{city}','A1'),
(21,'otobüs','avtobus','noun','Otobüs geliyor.','Avtobus kelyapti.','avtobus',false,'{city}','A1'),
(21,'durak','bekat','noun','Durak nerede?','Bekat qayerda?',null,false,'{city}','A1'),
(21,'metro','metro','noun','Metroya biniyorum.','Metroga chiqyapman.','metro',false,'{city}','A1'),
(21,'taksi','taksi','noun','Taksi çağır.','Taksi chaqir.','taksi',false,'{city}','A1'),
(21,'hastane','kasalxona','noun','Hastane uzak mı?','Kasalxona uzoqmi?','xasta-xona',false,'{city}','A1'),
(21,'eczane','dorixona','noun','Eczane kapalı.','Dorixona yopiq.',null,false,'{city}','A1'),
(21,'postane','pochta','noun','Postaneye gidiyorum.','Pochtaga boryapman.','pochta-xona',false,'{city}','A1'),
(21,'banka','bank','noun','Banka saat dokuzda açılıyor.','Bank soat to''qqizda ochiladi.','bank',false,'{city}','A1'),
(21,'cami','masjid','noun','Cami çok güzel.','Masjid juda chiroyli.','jome',false,'{city}','A1'),
(21,'park','park, bog''','noun','Parkta koşuyorum.','Parkda yuguraman.','park',false,'{city}','A1'),
(21,'müze','muzey','noun','Müzeye gidelim.','Muzeyga boraylik.','muzey',false,'{city}','A1'),
(21,'otel','mehmonxona','noun','Otel pahalı.','Mehmonxona qimmat.','otel',false,'{city}','A1'),
(21,'havalimanı','aeroport','noun','Havalimanı uzak.','Aeroport uzoq.','havo limani',false,'{city}','A1'),
(21,'istasyon','vokzal','noun','İstasyonda bekliyorum.','Vokzalda kutyapman.','stansiya',false,'{city}','A1'),
(21,'okul','maktab','noun','Okul yakın.','Maktab yaqin.','o''qu-',false,'{city}','A1'),
(21,'üniversite','universitet','noun','Üniversitede okuyorum.','Universitetda o''qiyman.','universitet',false,'{city}','A1'),
(21,'kütüphane','kutubxona','noun','Kütüphanede ders çalışıyorum.','Kutubxonada dars qilaman.','kutubxona',false,'{city}','A1'),

-- 22. Yo'l so'rash
(22,'nerede?','qayerda?','pron','Durak nerede?','Bekat qayerda?',null,false,'{direction}','A1'),
(22,'burada','bu yerda','adv','Burada bekle.','Bu yerda kut.','bu yer',false,'{direction}','A1'),
(22,'orada','u yerda','adv','Orada bir cami var.','U yerda masjid bor.','u yer',false,'{direction}','A1'),
(22,'sağ','o''ng','noun','Sağa dön.','O''ngga buril.',null,false,'{direction}','A1'),
(22,'sol','chap','noun','Sola dön.','Chapga buril.','so''l',false,'{direction}','A1'),
(22,'düz','to''g''ri','adv','Düz git.','To''g''ri bor.',null,false,'{direction}','A1'),
(22,'ileri','oldinga','adv','İleri git.','Oldinga yur.','ilgari',false,'{direction}','A1'),
(22,'geri','orqaga','adv','Geri dön.','Orqaga qayt.',null,false,'{direction}','A1'),
(22,'yakın','yaqin','adj','Okul çok yakın.','Maktab juda yaqin.','yaqin',false,'{direction,adj}','A1'),
(22,'uzak','uzoq','adj','Havalimanı uzak.','Aeroport uzoq.','uzoq',false,'{direction,adj}','A1'),
(22,'dönmek','burilmoq; qaytmoq','verb','Sağa dönüyorum.','O''ngga burilyapman.',null,false,'{direction,verb}','A1'),
(22,'geçmek','o''tmoq','verb','Köprüden geçiyorum.','Ko''prikdan o''tyapman.','kech-',false,'{direction,verb}','A1'),
(22,'karşı','qarshi','adv','Karşıda eczane var.','Qarshida dorixona bor.','qarshi',false,'{direction}','A1'),
(22,'yan','yon','noun','Bankanın yanında.','Bankning yonida.','yon',false,'{direction}','A1'),
(22,'var','bor','adj','Burada bir park var.','Bu yerda park bor.','bor',false,'{basic}','A1'),
(22,'yok','yo''q','adj','Burada eczane yok.','Bu yerda dorixona yo''q.','yo''q',false,'{basic}','A1'),

-- 25. Ranglar
(25,'kırmızı','qizil','adj','Elma kırmızı.','Olma qizil.',null,false,'{color}','A1'),
(25,'mavi','ko''k (moviy)','adj','Gökyüzü mavi.','Osmon ko''k.','moviy',false,'{color}','A1'),
(25,'yeşil','yashil','adj','Ağaç yeşil.','Daraxt yashil.','yashil',false,'{color}','A1'),
(25,'sarı','sariq','adj','Limon sarı.','Limon sariq.','sariq',false,'{color}','A1'),
(25,'siyah','qora','adj','Araba siyah.','Mashina qora.','siyoh',false,'{color}','A1'),
(25,'beyaz','oq','adj','Kar beyaz.','Qor oq.','bo''z',false,'{color}','A1'),
(25,'turuncu','to''q sariq','adj','Portakal turuncu.','Apelsin to''q sariq.',null,false,'{color}','A1'),
(25,'mor','binafsha','adj','Çiçek mor.','Gul binafsha.',null,false,'{color}','A1'),
(25,'pembe','pushti','adj','Elbise pembe.','Ko''ylak pushti.',null,false,'{color}','A1'),
(25,'gri','kulrang','adj','Hava gri.','Havo kulrang.',null,false,'{color}','A1'),
(25,'kahverengi','jigarrang','adj','Masa kahverengi.','Stol jigarrang.','kahve rangi',false,'{color}','A1'),
(25,'renk','rang','noun','En sevdiğin renk ne?','Eng yoqtirgan ranging qaysi?','rang',false,'{color}','A1'),

-- 26. Sifatlar
(26,'büyük','katta','adj','Ev büyük.','Uy katta.','buyuk (ma''no: katta)',false,'{adj}','A1'),
(26,'küçük','kichik','adj','Oda küçük.','Xona kichik.','kichik',false,'{adj}','A1'),
(26,'iyi','yaxshi','adj','Bu kitap iyi.','Bu kitob yaxshi.',null,false,'{adj}','A1'),
(26,'kötü','yomon','adj','Hava kötü.','Havo yomon.',null,false,'{adj}','A1'),
(26,'güzel','chiroyli, go''zal','adj','Şehir güzel.','Shahar chiroyli.','go''zal',false,'{adj}','A1'),
(26,'çirkin','xunuk','adj','Bu bina çirkin.','Bu bino xunuk.',null,false,'{adj}','A1'),
(26,'sıcak','issiq','adj','Çay sıcak.','Choy issiq.','issiq',false,'{adj}','A1'),
(26,'soğuk','sovuq','adj','Su soğuk.','Suv sovuq.','sovuq',false,'{adj}','A1'),
(26,'yeni','yangi','adj','Yeni araba.','Yangi mashina.','yangi',false,'{adj}','A1'),
(26,'eski','eski','adj','Eski ev.','Eski uy.','eski',false,'{adj}','A1'),
(26,'uzun','uzun','adj','Yol uzun.','Yo''l uzun.','uzun',false,'{adj}','A1'),
(26,'kısa','qisqa','adj','Ders kısa.','Dars qisqa.','qisqa',false,'{adj}','A1'),
(26,'hızlı','tez','adj','Araba hızlı.','Mashina tez.',null,false,'{adj}','A1'),
(26,'yavaş','sekin','adj','Yavaş konuş.','Sekin gapir.',null,false,'{adj}','A1'),
(26,'açık','ochiq','adj','Kapı açık.','Eshik ochiq.','ochiq',false,'{adj}','A1'),
(26,'kapalı','yopiq','adj','Market kapalı.','Do''kon yopiq.',null,false,'{adj}','A1'),
(26,'ağır','og''ir','adj','Çanta ağır.','Sumka og''ir.','og''ir',false,'{adj}','A1'),
(26,'hafif','yengil','adj','Kitap hafif.','Kitob yengil.',null,false,'{adj}','A1'),
(26,'zengin','boy','adj','O zengin.','U boy.',null,false,'{adj}','A1'),
(26,'fakir','kambag''al','adj','Fakir ama mutlu.','Kambag''al, lekin baxtli.','faqir',false,'{adj}','A1'),
(26,'mutlu','baxtli','adj','Çok mutluyum.','Juda baxtliman.',null,false,'{adj}','A1'),
(26,'yorgun','charchagan','adj','Yorgunum.','Charchadim.',null,false,'{adj}','A1'),

-- 29. Fe'llar #2
(29,'öğrenmek','o''rganmoq','verb','Türkçe öğreniyorum.','Turkcha o''rganyapman.','o''rganmoq',false,'{verb}','A1'),
(29,'öğretmek','o''rgatmoq','verb','Matematik öğretiyorum.','Matematika o''rgataman.','o''rgatmoq',false,'{verb}','A1'),
(29,'başlamak','boshlamoq','verb','Ders başlıyor.','Dars boshlanyapti.','boshlamoq',false,'{verb}','A1'),
(29,'bitirmek','tugatmoq, bitirmoq','verb','Ödevi bitirdim.','Vazifani tugatdim.','bitirmoq',false,'{verb}','A1'),
(29,'düşünmek','o''ylamoq','verb','Seni düşünüyorum.','Seni o''ylayapman.','tushunmoq EMAS — o''ylamoq',true,'{verb}','A1'),
(29,'unutmak','unutmoq','verb','Kelimeyi unuttum.','So''zni unutdim.','unutmoq',false,'{verb}','A1'),
(29,'hatırlamak','eslamoq','verb','Adını hatırlıyorum.','Ismini eslayman.','xotira',false,'{verb}','A1'),
(29,'cevap vermek','javob bermoq','verb','Soruya cevap verdim.','Savolga javob berdim.','javob bermoq',false,'{verb}','A1'),
(29,'yardım etmek','yordam bermoq','verb','Bana yardım et.','Menga yordam ber.','yordam',false,'{verb}','A1'),
(29,'oynamak','o''ynamoq','verb','Futbol oynadık.','Futbol o''ynadik.','o''ynamoq',false,'{verb}','A1'),
(29,'dinlenmek','dam olmoq','verb','Pazar günü dinlendim.','Yakshanba dam oldim.',null,false,'{verb}','A1'),
(29,'kalmak','qolmoq','verb','Evde kaldım.','Uyda qoldim.','qolmoq',false,'{verb}','A1'),
(29,'dönmek','qaytmoq','verb','Eve döndüm.','Uyga qaytdim.',null,false,'{verb}','A1'),
(29,'seyretmek','tomosha qilmoq','verb','Film seyrettik.','Film tomosha qildik.','sayr',false,'{verb}','A1'),
(29,'yüzmek','suzmoq','verb','Denizde yüzdüm.','Dengizda suzdim.',null,false,'{verb}','A1'),
(29,'gezmek','sayr qilmoq','verb','Şehri gezdik.','Shaharni aylandik.','kezmoq',false,'{verb}','A1'),
(29,'yağmak','yog''moq','verb','Kar yağdı.','Qor yog''di.','yog''moq',false,'{verb}','A1'),
(29,'ağlamak','yig''lamoq','verb','Bebek ağladı.','Chaqaloq yig''ladi.',null,false,'{verb}','A1'),
(29,'yaşamak','yashamoq','verb','Taşkent''te yaşıyorum.','Toshkentda yashayman.','yashamoq',false,'{verb}','A1'),
(29,'ölmek','o''lmoq','verb','Çiçek öldü.','Gul so''ldi.','o''lmoq',false,'{verb}','A1'),
(29,'inanmak','ishonmoq','verb','Sana inanıyorum.','Senga ishonaman.','inonmoq',false,'{verb}','A1'),
(29,'korkmak','qo''rqmoq','verb','Köpekten korkuyorum.','Itdan qo''rqaman.','qo''rqmoq',false,'{verb}','A1'),
(29,'kazanmak','yutmoq; topmoq (pul)','verb','Maçı kazandık.','O''yinda yutdik.','qozonmoq',false,'{verb}','A1'),
(29,'kaybetmek','yo''qotmoq; yutqazmoq','verb','Anahtarımı kaybettim.','Kalitimni yo''qotdim.',null,false,'{verb}','A1'),

-- 33. Tana va sog'liq (A2)
(33,'kulak','quloq','noun','Kulağım ağrıyor.','Qulog''im og''riyapti.','quloq',false,'{body}','A2'),
(33,'burun','burun','noun','Burnum akıyor.','Burnim oqyapti.','burun',false,'{body}','A2'),
(33,'ağız','og''iz','noun','Ağzını aç.','Og''zingni och.','og''iz',false,'{body}','A2'),
(33,'diş','tish','noun','Dişim ağrıyor.','Tishim og''riyapti.','tish',false,'{body}','A2'),
(33,'kol','qo''l (bilak)','noun','Kolum kırıldı.','Qo''lim sindi.','qo''l',false,'{body}','A2'),
(33,'bacak','oyoq (son)','noun','Bacağım ağrıyor.','Oyog''im og''riyapti.',null,false,'{body}','A2'),
(33,'karın','qorin','noun','Karnım ağrıyor.','Qornim og''riyapti.','qorin',false,'{body}','A2'),
(33,'saç','soch','noun','Saçım siyah.','Sochim qora.','soch',false,'{body}','A2'),
(33,'hasta','kasal','adj','Bugün hastayım.','Bugun kasalman.','xasta',false,'{health}','A2'),
(33,'sağlıklı','sog''lom','adj','Sağlıklı yaşıyorum.','Sog''lom yashayman.','sog''liq',false,'{health}','A2'),
(33,'ilaç','dori','noun','İlaç içtim.','Dori ichdim.','iloj',false,'{health}','A2'),
(33,'ağrı','og''riq','noun','Baş ağrısı.','Bosh og''rig''i.','og''riq',false,'{health}','A2'),
(33,'ateş','isitma; olov','noun','Ateşim var.','Isitmam bor.','otash',false,'{health}','A2'),
(33,'grip','gripp','noun','Grip oldum.','Gripp bo''ldim.','gripp',false,'{health}','A2'),
(33,'doktor','shifokor','noun','Doktora gittim.','Shifokorga bordim.','doktor',false,'{health}','A2'),
(33,'spor','sport','noun','Her gün spor yapıyorum.','Har kuni sport qilaman.','sport',false,'{sport}','A2'),
(33,'futbol','futbol','noun','Futbol oynuyoruz.','Futbol o''ynaymiz.','futbol',false,'{sport}','A2'),
(33,'koşu','yugurish','noun','Sabah koşusu.','Ertalabki yugurish.',null,false,'{sport}','A2'),
(33,'güçlü','kuchli','adj','Çok güçlü.','Juda kuchli.','kuchli',false,'{adj}','A2'),
(33,'geçmiş olsun','tuzalib keting','phrase','Geçmiş olsun!','Tuzalib keting!',null,false,'{health,phrase}','A2'),

-- 37. Kasblar (A2)
(37,'meslek','kasb','noun','Mesleğin ne?','Kasbing nima?','maslak',false,'{job}','A2'),
(37,'mühendis','muhandis','noun','Abim mühendis.','Akam muhandis.','muhandis',false,'{job}','A2'),
(37,'asker','askar','noun','Babam asker.','Otam askar.','askar',false,'{job}','A2'),
(37,'subay','ofitser','noun','Subay emir verdi.','Ofitser buyruq berdi.',null,false,'{job}','A2'),
(37,'polis','politsiya','noun','Polis geldi.','Politsiya keldi.','politsiya',false,'{job}','A2'),
(37,'avukat','advokat','noun','Avukat konuşuyor.','Advokat gapiryapti.','advokat',false,'{job}','A2'),
(37,'hemşire','hamshira','noun','Hemşire ilaç verdi.','Hamshira dori berdi.','hamshira',false,'{job}','A2'),
(37,'aşçı','oshpaz','noun','Aşçı pilav yapıyor.','Oshpaz palov qilyapti.','oshpaz',false,'{job}','A2'),
(37,'şoför','haydovchi','noun','Şoför bekliyor.','Haydovchi kutyapti.','shofyor',false,'{job}','A2'),
(37,'çiftçi','dehqon','noun','Çiftçi tarlada.','Dehqon dalada.',null,false,'{job}','A2'),
(37,'işçi','ishchi','noun','İşçi çalışıyor.','Ishchi ishlayapti.','ishchi',false,'{job}','A2'),
(37,'müdür','direktor','noun','Müdür toplantıda.','Direktor yig''ilishda.','mudir',false,'{job}','A2'),
(37,'sınav','imtihon','noun','Yarın sınav var.','Ertaga imtihon bor.','sinov',false,'{school}','A2'),
(37,'mezun','bitiruvchi','noun','Üniversiteden mezun oldum.','Universitetni bitirdim.',null,false,'{school}','A2'),
(37,'maaş','maosh','noun','Maaşım iyi.','Maoshim yaxshi.','maosh',false,'{job}','A2'),
(37,'ordu','armiya','noun','Orduda görev yapıyorum.','Armiyada xizmat qilaman.','o''rda',false,'{job}','A2'),

-- 38. Aloqa va texnika (A2)
(38,'bilgisayar','kompyuter','noun','Bilgisayar açık.','Kompyuter yoqilgan.','bilgi = bilim',false,'{tech}','A2'),
(38,'yazılım','dasturiy ta''minot','noun','Yazılım güncellendi.','Dastur yangilandi.','yoz-',false,'{tech}','A2'),
(38,'ağ','tarmoq','noun','Ağ bağlantısı yok.','Tarmoq ulanishi yo''q.',null,false,'{tech}','A2'),
(38,'şifre','parol','noun','Şifreyi unuttum.','Parolni unutdim.','shifr',false,'{tech}','A2'),
(38,'telsiz','ratsiya','noun','Telsizle konuşuyor.','Ratsiya orqali gapiryapti.','tel-siz (simsiz)',false,'{tech,comm}','A2'),
(38,'frekans','chastota','noun','Frekansı değiştir.','Chastotani o''zgartir.',null,false,'{tech,comm}','A2'),
(38,'sinyal','signal','noun','Sinyal zayıf.','Signal kuchsiz.','signal',false,'{tech,comm}','A2'),
(38,'iletişim','aloqa','noun','İletişim kesildi.','Aloqa uzildi.',null,false,'{comm}','A2'),
(38,'haber','xabar','noun','Haber aldım.','Xabar oldim.','xabar',false,'{comm}','A2'),
(38,'mesaj','xabar (SMS)','noun','Mesaj gönder.','Xabar yubor.','message',false,'{comm}','A2'),
(38,'harita','xarita','noun','Haritaya bak.','Xaritaga qara.','xarita',false,'{tech}','A2'),
(38,'görev','vazifa','noun','Görev tamamlandı.','Vazifa bajarildi.',null,false,'{comm}','A2'),
(38,'emir','buyruq','noun','Emir aldım.','Buyruq oldim.','amr',false,'{comm}','A2'),
(38,'güvenlik','xavfsizlik','noun','Güvenlik önemli.','Xavfsizlik muhim.',null,false,'{comm}','A2'),
(38,'nöbet','navbatchilik','noun','Bu gece nöbetçiyim.','Bu kecha navbatchiman.','navbat',false,'{comm}','A2'),
(38,'rapor','hisobot (raport)','noun','Rapor yazdım.','Raport yozdim.','raport',false,'{comm}','A2'),
(38,'bağlantı','ulanish','noun','Bağlantı kesildi.','Ulanish uzildi.','bog''lanish',false,'{tech}','A2'),
(38,'göndermek','yubormoq','verb','Dosya gönderdim.','Fayl yubordim.',null,false,'{tech,verb}','A2'),
(38,'almak (sinyal)','qabul qilmoq','verb','Sinyal alıyoruz.','Signal qabul qilyapmiz.','olmoq',false,'{tech,verb}','A2'),
(38,'teknoloji','texnologiya','noun','Teknoloji hızlı gelişiyor.','Texnologiya tez rivojlanyapti.','texnologiya',false,'{tech}','A2')
on conflict (lesson_id, tr) do nothing;

-- Sequence'larni to'g'rilash
select setval('public.units_id_seq', (select coalesce(max(id),1) from public.units));
select setval('public.lessons_id_seq', (select coalesce(max(id),1) from public.lessons));
select setval('public.words_id_seq', (select coalesce(max(id),1) from public.words));
select setval('public.grammar_topics_id_seq', (select coalesce(max(id),1) from public.grammar_topics));
