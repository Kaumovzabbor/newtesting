/* Yordamchi funksiyalar, matnlar va hisobot tuzish. */
window.U = (() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* xotira yopiq bo‘lishi mumkin */
      }
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* xotira yopiq bo‘lishi mumkin */
      }
    },
  };

  const pad = (n) => String(n).padStart(2, "0");

  const clock = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const dateTime = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const mmss = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  };

  const words = (sec) => {
    const s = Math.max(1, Math.round(sec));
    if (s < 60) return `${s} soniya`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} daqiqa ${r} soniya` : `${m} daqiqa`;
  };

  const range = (n) => Array.from({ length: n }, (_, i) => i);

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* Qoidabuzarlik sabablari: log uchun (3-shaxs) va ogohlantirish uchun (2-shaxs). */
  const REASON = {
    hidden: {
      log: "Boshqa varaqqa o‘tdi yoki oynani yig‘di",
      you: "Siz boshqa varaqqa o‘tdingiz yoki oynani yig‘dingiz",
    },
    blur: {
      log: "Boshqa oynaga o‘tdi (Alt+Tab yoki boshqa dastur)",
      you: "Siz boshqa oynaga o‘tdingiz (Alt+Tab yoki boshqa dastur)",
    },
    fullscreen: {
      log: "To‘liq ekrandan chiqdi",
      you: "Siz to‘liq ekran rejimidan chiqdingiz",
    },
    reload: {
      log: "Sahifa qayta yuklandi yoki yopib ochildi",
      you: "Siz sahifani yangiladingiz yoki yopib qayta ochdingiz",
    },
  };

  const BLOCKED = {
    contextmenu: "O‘ng tugma bosildi",
    copy: "Nusxa olishga urinildi",
    cut: "Qirqib olishga urinildi",
    paste: "Qo‘yishga urinildi",
    dragstart: "Matnni sudrashga urinildi",
  };

  const HOW = {
    manual: "Test yakunlandi",
    time: "Vaqt tugadi",
    cancelled: "Qoidabuzarliklar tufayli to‘xtatildi",
  };

  const reasonLog = (v) => (REASON[v.reason] || { log: String(v.reason) }).log;
  const describe = (v) => reasonLog(v) + (v.seconds ? ` (${words(v.seconds)})` : "");

  function report(a) {
    const total = a.order.length;
    const lines = [
      "Nazoratchi hisoboti",
      `Test: ${window.EXAM.title}`,
      `O‘quvchi: ${a.name}${a.group ? ` (${a.group})` : ""}`,
      `Natija: ${a.score}/${total} (${Math.round((a.score / total) * 100)}%)`,
      `Holat: ${HOW[a.how] || "—"}`,
      `Boshlangan: ${dateTime(a.startedAt)}`,
      `Davomiyligi: ${mmss((a.finishedAt - a.startedAt) / 1000)}`,
      `Qoidabuzarliklar: ${a.violations.length}`,
    ];
    a.violations.forEach((v, i) => lines.push(`  ${i + 1}) ${clock(v.at)} — ${describe(v)}`));
    if (a.notes.length) {
      lines.push(`Taqiqlangan urinishlar: ${a.notes.length}`);
      a.notes.forEach((n) => lines.push(`  - ${clock(n.at)} — ${n.text}`));
    }
    return lines.join("\n");
  }

  function csv(results) {
    const cell = (v) => {
      let s = String(v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // jadval dasturida formula sifatida ochilmasin
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const head = ["Ism-familiya", "Guruh", "Boshlangan", "To‘g‘ri javoblar", "Jami savol", "Holat", "Qoidabuzarliklar", "Tafsilot"];
    const rows = results.map((a) => [
      a.name,
      a.group || "",
      dateTime(a.startedAt),
      a.score,
      a.order.length,
      HOW[a.how] || "",
      a.violations.length,
      a.violations.map((v) => `${clock(v.at)} ${describe(v)}`).join("; "),
    ]);
    return [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  }

  function copyText(text, done) {
    const fallback = () => {
      const area = el("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      area.remove();
      done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true), fallback);
    } else {
      fallback();
    }
  }

  const VIEWS = ["start", "test", "result", "teacher"];
  function show(name) {
    VIEWS.forEach((v) => {
      const node = $("#view-" + v);
      if (node) node.hidden = v !== name;
    });
    window.scrollTo(0, 0);
  }

  return { $, el, store, pad, clock, dateTime, mmss, words, range, shuffle, REASON, BLOCKED, HOW, describe, report, csv, copyText, show };
})();
