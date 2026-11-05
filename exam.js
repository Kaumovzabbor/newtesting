/*
  Nazoratchi: test sozlamalari va savollar.
  O‘z testingizni yozish uchun faqat shu faylni tahrirlang.
  Quyidagi savollar namuna sifatida berilgan.
*/
window.EXAM = {
  title: "Umumiy bilim testi",
  minutes: 15,          // test davomiyligi (daqiqa)
  maxViolations: 3,     // shuncha marta chiqib ketilsa, test to‘xtatiladi
  graceSeconds: 0.5,    // bundan qisqa chiqib ketish hisobga olinmaydi
  fullscreen: true,     // to‘liq ekran rejimini talab qilish
  shuffle: true,        // savollar va variantlar tartibini aralashtirish
  sound: true,          // qoidabuzarlikda ovozli signal
  teacherPin: "2468",   // o‘qituvchi paneli uchun PIN (sahifa manzili oxiriga #oqituvchi)
  endpoint: "",         // natijalarni qabul qiluvchi manzil (ixtiyoriy, README ga qarang)

  // answer: to‘g‘ri variantning tartib raqami (0 dan boshlanadi)
  questions: [
    {
      q: "Amir Temur qaysi yilda tug‘ilgan?",
      options: ["1336-yil", "1370-yil", "1405-yil", "1219-yil"],
      answer: 0,
    },
    {
      q: "12 × 8 nechaga teng?",
      options: ["88", "96", "108", "112"],
      answer: 1,
    },
    {
      q: "Quyosh tizimidagi eng katta sayyora qaysi?",
      options: ["Saturn", "Neptun", "Yupiter", "Yer"],
      answer: 2,
    },
    {
      q: "Quyidagi sonlardan qaysi biri tub son?",
      options: ["21", "27", "33", "29"],
      answer: 3,
    },
    {
      q: "«O‘tkan kunlar» romanining muallifi kim?",
      options: ["Cho‘lpon", "Abdulla Qodiriy", "Oybek", "G‘afur G‘ulom"],
      answer: 1,
    },
    {
      q: "Suv dengiz sathida necha daraja Selsiyda qaynaydi?",
      options: ["90", "100", "110", "120"],
      answer: 1,
    },
    {
      q: "Tomoni 7 sm bo‘lgan kvadratning yuzi qancha?",
      options: ["14 sm²", "28 sm²", "49 sm²", "56 sm²"],
      answer: 2,
    },
    {
      q: "Eng katta va eng chuqur okean qaysi?",
      options: ["Atlantika okeani", "Hind okeani", "Tinch okeani", "Shimoliy Muz okeani"],
      answer: 2,
    },
    {
      q: "Orol dengizi qaysi ikki davlat hududida joylashgan?",
      options: [
        "O‘zbekiston va Qozog‘iston",
        "O‘zbekiston va Turkmaniston",
        "Qozog‘iston va Qirg‘iziston",
        "Tojikiston va O‘zbekiston",
      ],
      answer: 0,
    },
    {
      q: "Suvning kimyoviy formulasi qaysi?",
      options: ["CO2", "O2", "NaCl", "H2O"],
      answer: 3,
    },
  ],
};
