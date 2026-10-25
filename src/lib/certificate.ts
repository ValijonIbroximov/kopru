export interface PracticeQuestion { q: string; options: string[]; answer: number; why: string }
export interface PracticePack {
  id: string; level: string; title: string; glossary: [string,string][];
  reading: string; listening: string; readingQuestions: PracticeQuestion[]; listeningQuestions: PracticeQuestion[];
  writing: string; speaking: string[];
}
// Original short teaching materials. Not official examination items or calibrated CEFR tests.
export const practicePacks: PracticePack[] = [
  { id: 'library', level: 'A1–A2', title: 'Kutubxonada bir kun',
    glossary: [['kütüphane','kutubxona'],['ödünç almak','vaqtincha olib turmoq'],['iade etmek','qaytarib bermoq'],['kapalı','yopiq'],['ücretsiz','bepul']],
    reading: 'Mahalle kütüphanesi hafta içi saat dokuzda açılır ve akşam altıda kapanır. Cumartesi günü yalnızca öğleden sonra açıktır. Pazar günü kapalıdır. Öğrenciler kimlik kartlarıyla ücretsiz üye olabilir. Her üye iki kitabı on dört gün boyunca ödünç alabilir. Kitapları zamanında iade etmek gerekir.',
    listening: 'Merhaba Elif, ben Deniz. Bugün kütüphanede buluşacaktık ama dersim geç bitecek. Saat ikide değil, üçte gelebilirim. Lütfen girişte bekleme. Üst kattaki okuma salonunda buluşalım. Yanımda senin için bir Türkçe hikâye kitabı getireceğim.',
    readingQuestions: [
      {q:'Kütüphane hangi gün kapalıdır?',options:['Pazar','Cumartesi','Pazartesi'],answer:0,why:'Matnda yakshanba kuni yopiq ekani aytilgan.'},
      {q:'Bir üye kitapları kaç gün kullanabilir?',options:['İki gün','On dört gün','Bir ay'],answer:1,why:'“On dört gün” — o‘n to‘rt kun. Ikki soni kitoblar sonini bildiradi.'},
    ],
    listeningQuestions: [
      {q:'Deniz saat kaçta gelecek?',options:['İkide','Altıda','Üçte'],answer:2,why:'Deniz soat ikkida emas, uchda kelishini aytdi.'},
      {q:'Nerede buluşacaklar?',options:['Girişte','Üst kattaki okuma salonunda','Sınıfta'],answer:1,why:'Kirishda kutmaslikni, yuqori qavatdagi o‘qish zalida uchrashishni so‘radi.'},
    ],
    writing:'Bir arkadaşınıza kısa bir mesaj yazın. Kütüphanede buluşmak istediğinizi söyleyin; gün, saat ve yer belirtin. Birlikte ne yapacağınızı anlatın. Mashq maqsadi: 40–60 so‘z.',
    speaking:['Kitap okumayı sever misiniz? Neden?', 'En son okuduğunuz kitabı veya izlediğiniz filmi anlatın.', 'Evde mi, kütüphanede mi çalışmayı tercih edersiniz? Bir neden söyleyin.'],
  },
  { id:'transport',level:'B1–B2',title:'Shahar va transport',
    glossary:[['ulaşım','transport, qatnov'],['sefer','qatnov reysi'],['aktarma','boshqa transportga o‘tish'],['güzergâh','yo‘nalish'],['erişilebilir','foydalanish mumkin bo‘lgan']],
    reading:'Belediye, şehir merkezindeki trafik yoğunluğunu azaltmak için yeni bir otobüs hattını üç ay boyunca deneyecek. Hat, üniversite ile sanayi bölgesini birbirine bağlayacak. Sabah ve akşam saatlerinde seferler daha sık yapılacak. Bazı esnaflar otoparkların azalmasından endişe ediyor. Öğrenciler ise aktarma yapmadan üniversiteye ulaşabilecekleri için projeyi destekliyor. Deneme sonunda yolcu sayıları ve vatandaşların görüşleri değerlendirilecek. Belediye, kararın yalnızca yolcu sayısına göre verilmeyeceğini, yaşlıların ve engelli yolcuların ihtiyaçlarının da dikkate alınacağını açıkladı.',
    listening:'Sayın yolcularımız, yol çalışması nedeniyle on iki numaralı otobüsümüz bu hafta hastane durağına uğramayacaktır. Hastaneye gitmek isteyen yolcular, belediye durağında inerek ücretsiz servis aracına binebilirler. Servisler sabah yediden akşam dokuza kadar yirmi dakikada bir hareket edecektir. Pazar gününden itibaren normal güzergâha dönülmesi planlanmaktadır.',
    readingQuestions:[
      {q:'Projenin geleceği nasıl belirlenecek?',options:['Yalnızca yolcu sayısıyla','Farklı veriler ve ihtiyaçlar birlikte değerlendirilerek','Esnafların tek başına vereceği kararla'],answer:1,why:'Yo‘lovchilar soni bilan birga fikrlar va turli yo‘lovchilar ehtiyojlari hisobga olinadi.'},
      {q:'Öğrenciler projeyi neden destekliyor?',options:['Biletler ücretsiz olduğu için','Otoparklar artacağı için','Aktarma yapmaları gerekmeyeceği için'],answer:2,why:'Matnda bevosita qatnov afzalligi aytilgan; bepul chipta haqida gap yo‘q.'},
    ],
    listeningQuestions:[
      {q:'Hastaneye gitmek için ne yapılmalı?',options:['Belediye durağında servise binilmeli','Üniversiteye yürünmeli','Pazar gününe kadar beklenmeli'],answer:0,why:'E’londa belediye bekatidan bepul servisga o‘tish aytilgan.'},
      {q:'Servisler ne sıklıkla hareket edecek?',options:['Saatte bir','Yirmi dakikada bir','Günde iki kez'],answer:1,why:'“Yirmi dakikada bir” — har yigirma daqiqada.'},
    ],
    writing:'Belediyeye bir e-posta yazın. Mahallenizdeki bir ulaşım sorununu açıklayın, kimleri etkilediğini belirtin ve uygulanabilir bir çözüm önerin. Mashq maqsadi: 120–150 so‘z.',
    speaking:['Şehrinizdeki ulaşımın bir güçlü ve bir zayıf yönünü anlatın.', 'Özel otomobil ile toplu taşımayı karşılaştırın.', 'Şehir merkezinde otomobil kullanımı sınırlandırılmalı mı? Görüşünüzü bir örnekle destekleyin ve karşı görüşe cevap verin.'],
  },
];
export const writingChecklist = ['Topshiriqning barcha qismlariga javob berdim.', 'Fikrlarimni izchil bog‘ladim va misol keltirdim.', 'Fe’l zamonlari va qo‘shimchalarni tekshirdim.', 'Imlo, turkcha harflar va tinish belgilarini tekshirdim.'];
export const speakingChecklist = ['Savolga bevosita javob berdim.', 'Sabab va misol keltirdim.', 'Gaplarni bog‘lab, tushunarli sur’atda aytdim.', 'Bilmagan so‘zimni sodda ifoda bilan tushuntirdim.'];
