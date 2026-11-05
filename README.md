# Nazoratchi

Onlayn test sayti. Test paytida o‘quvchi boshqa varaqqa o‘tsa, Alt+Tab bossa, oynani yig‘sa yoki to‘liq ekrandan chiqsa, sayt buni aniqlaydi, qaytganda butun ekranni qoplaydigan **«Siz firibgarsiz!»** ogohlantirishini ko‘rsatadi va hisobotga yozib qo‘yadi.

Sayt kirganda **«Siz saytdasiz»** deb turadi. Boshqa varaqqa o‘tilgan zahoti brauzer varaqlar qatorida sarlavha «⚠ Siz firibgarsiz!» ga almashadi va ikonka qizil bo‘ladi.

## Nimalar aniqlanadi

| Harakat | Natija |
| --- | --- |
| Yangi varaq ochish, boshqa varaqqa o‘tish, oynani yig‘ish | Qoidabuzarlik, chiqib ketgan vaqt bilan |
| Alt+Tab, boshqa dastur yoki ikkinchi monitordagi oynaga bosish | Qoidabuzarlik |
| To‘liq ekrandan chiqish (Esc, F11) | Qoidabuzarlik |
| Sahifani yangilash yoki yopib qayta ochish | Qoidabuzarlik, vaqt to‘xtamaydi |
| Nusxa olish, qo‘yish, o‘ng tugma, F12, Ctrl+U/S/P, PrintScreen | To‘siladi va hisobotga yoziladi |

`exam.js` da belgilangan miqdordan ko‘p qoidabuzarlik bo‘lsa (odatda 3), test avtomatik to‘xtatiladi. 0,5 soniyadan qisqa chiqishlar hisobga olinmaydi.

Test boshlanmaguncha **sinov rejimi** ishlaydi: ogohlantirish chiqadi, lekin hech narsa yozilmaydi. Tizimni shu rejimda o‘zingiz sinab ko‘rishingiz mumkin.

## Ishga tushirish

Hech qanday o‘rnatish kerak emas, bu oddiy statik sayt.

**GitHub Pages orqali (tavsiya etiladi):**
1. Repo sahifasida **Settings → Pages** ga kiring.
2. **Source** ni `Deploy from a branch` qiling, branch `main`, papka `/ (root)` ni tanlang va saqlang.
3. Bir-ikki daqiqadan keyin sayt `https://<foydalanuvchi>.github.io/newtesting/` manzilida ochiladi. Shu havolani o‘quvchilarga bering.

**Kompyuterda:** `index.html` faylini brauzerda oching.

## Testni o‘zgartirish

Hammasi `exam.js` faylida: nom, vaqt, ruxsat etilgan qoidabuzarliklar soni, savollar, O‘qituvchi PIN-kodi.

```js
{
  q: "12 × 8 nechaga teng?",
  options: ["88", "96", "108", "112"],
  answer: 1, // to‘g‘ri variantning raqami, 0 dan boshlanadi
}
```

Savollar va variantlar tartibi har bir o‘quvchiga aralashtirib beriladi (`shuffle: true`).

## Natijalarni yig‘ish

Sukut bo‘yicha natija faqat o‘quvchining brauzerida saqlanadi. O‘quvchi test tugagach hisobotni nusxalab sizga yuborishi mumkin. O‘qituvchi paneli (`.../index.html#oqituvchi`, PIN bilan) esa faqat shu qurilmada topshirilgan natijalarni ko‘rsatadi.

Hamma o‘quvchilarning natijasi bitta joyga tushishi uchun Google Sheets ishlating:

1. Yangi Google Sheet oching, **Extensions → Apps Script** ga kiring.
2. Quyidagi kodni qo‘ying:

```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
    new Date(),
    d.event, // start, violation yoki final
    d.name,
    d.group,
    d.score === null ? "" : d.score + "/" + d.total,
    d.how,
    d.violations.length,
    d.violations.map(v => v.reason + " (" + v.seconds + " s)").join("; "),
  ]);
  return ContentService.createTextOutput("ok");
}
```

3. **Deploy → New deployment → Web app** ni tanlang, **Who has access** ni `Anyone` qiling va chiqqan manzilni nusxalang.
4. Shu manzilni `exam.js` dagi `endpoint: ""` ga yozing.

Shundan keyin jadvalga test boshlanishi, har bir qoidabuzarlik va yakuniy natija o‘quvchi test yechayotgan paytning o‘zida tushib boradi.

## Cheklovlar

Bu sayt firibgarlikni **to‘sa olmaydi**, uni faqat aniqlaydi va yozib qo‘yadi. Brauzer sayt ichidan boshqa narsani boshqarishga ruxsat bermaydi.

- Telefon, kitob, yonidagi odam yoki ikkinchi qurilmadan foydalanish aniqlanmaydi.
- Ekran rasmi, virtual mashina va masofaviy ulanish aniqlanmaydi.
- Hamma narsa o‘quvchi brauzerida bajariladi. Texnik bilimli o‘quvchi kodni o‘zgartirishi mumkin. PIN ham sahifa kodida ochiq turadi.
- Natija to‘g‘ri javoblar bilan birga brauzerga yuklanadi, shuning uchun jiddiy imtihon uchun javoblarni serverda tekshirish kerak.

Sinf ichidagi oddiy test va mashq uchun bu yetarli. Ahamiyati katta imtihonlarda nazoratchi o‘qituvchi o‘rnini hech narsa bosmaydi.

## Fayllar

| Fayl | Vazifasi |
| --- | --- |
| `index.html` | Sahifa tuzilmasi |
| `style.css` | Ko‘rinish (yorug‘ va qorong‘i mavzu) |
| `exam.js` | Sozlamalar va savollar |
| `guard.js` | Varaq, fokus, to‘liq ekran va taqiqlangan harakatlarni aniqlash |
| `app.js` | Test jarayoni, ogohlantirish oynasi, natija |
| `teacher.js` | O‘qituvchi paneli |
| `util.js` | Yordamchi funksiyalar va hisobot matni |
