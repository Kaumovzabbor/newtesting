/*
  Nazorat mexanizmi.
  - Varaq almashtirish, boshqa oynaga o‘tish (Alt+Tab), oynani yig‘ish
  - To‘liq ekrandan chiqish
  - Nusxa olish, o‘ng tugma, F12 va boshqa taqiqlangan harakatlar

  Chiqib ketish holati ikki manbadan aniqlanadi: sahifa ko‘rinmay qolishi
  (visibilityState) va oynadan fokus ketishi (hasFocus). Har ikkisi hodisalar va
  har 0,4 soniyada tekshiruv orqali kuzatiladi.
*/
window.Guard = (() => {
  "use strict";

  const handlers = {};
  const opts = { grace: 0.5, fullscreen: true };
  let armed = false; // sahifa birinchi marta fokusda bo‘lgandan keyin yoqiladi
  let running = false; // test davomida true
  let away = false;
  let awaySince = 0;
  let lastAwayAt = 0;
  let reason = "blur";

  const on = (name, fn) => {
    (handlers[name] = handlers[name] || []).push(fn);
  };

  const emit = (name, data) => {
    (handlers[name] || []).forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const hiddenNow = () => document.visibilityState !== "visible";
  const awayNow = () => hiddenNow() || !document.hasFocus();

  function check() {
    const gone = awayNow();
    if (!armed) {
      if (!gone) armed = true;
      return;
    }
    if (gone && !away) {
      away = true;
      awaySince = Date.now();
      lastAwayAt = awaySince;
      reason = hiddenNow() ? "hidden" : "blur";
      emit("away", { reason });
    } else if (gone && away) {
      lastAwayAt = Date.now();
      if (reason === "blur" && hiddenNow()) reason = "hidden";
    } else if (!gone && away) {
      away = false;
      lastAwayAt = Date.now();
      const seconds = (lastAwayAt - awaySince) / 1000;
      emit("back", { reason, seconds, counted: seconds >= opts.grace });
    }
  }

  document.addEventListener("visibilitychange", check);
  window.addEventListener("blur", check);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  setInterval(check, 400);
  check();

  /* To‘liq ekran */
  const root = document.documentElement;
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const supportsFullscreen = () => !!(root.requestFullscreen || root.webkitRequestFullscreen);

  function enterFullscreen() {
    try {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) return Promise.resolve(false);
      return Promise.resolve(request.call(root)).then(
        () => true,
        () => false
      );
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  function exitFullscreen() {
    try {
      if (!fsElement()) return;
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (err) {
      /* ahamiyatsiz */
    }
  }

  function onFullscreenChange() {
    if (!running || !opts.fullscreen || !supportsFullscreen()) return;
    emit(fsElement() ? "fullscreen-enter" : "fullscreen-exit", {});
  }
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  /* Taqiqlangan harakatlar */
  ["contextmenu", "copy", "cut", "paste", "dragstart"].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (!running) return;
      e.preventDefault();
      emit("blocked", { kind: type });
    });
  });

  document.addEventListener("keydown", (e) => {
    if (!running) return;
    const key = (e.key || "").toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    let kind = "";
    if (key === "f12") kind = "F12";
    else if (mod && e.shiftKey && ["i", "j", "c"].includes(key)) kind = "DevTools";
    else if (mod && ["u", "s", "p"].includes(key)) kind = "Ctrl+" + key.toUpperCase();
    if (!kind) return;
    e.preventDefault();
    emit("blocked", { kind });
  });

  document.addEventListener("keyup", (e) => {
    if (!running || e.key !== "PrintScreen") return;
    try {
      const pending = navigator.clipboard && navigator.clipboard.writeText(" ");
      if (pending && pending.catch) pending.catch(() => {});
    } catch (err) {
      /* ahamiyatsiz */
    }
    emit("blocked", { kind: "PrintScreen" });
  });

  window.addEventListener("beforeunload", (e) => {
    if (!running) return;
    e.preventDefault();
    e.returnValue = "";
  });

  return {
    on,
    configure(options) {
      Object.assign(opts, options);
    },
    start(options) {
      Object.assign(opts, options);
      running = true;
      check();
    },
    stop() {
      running = false; // avval to‘xtatamiz, so‘ng ekrandan chiqamiz: qoidabuzarlik yozilmasin
      exitFullscreen();
    },
    enterFullscreen,
    supportsFullscreen,
    isFullscreen: () => !!fsElement(),
    isAway: () => away,
    awayRecently: (ms) => away || Date.now() - lastAwayAt < ms,
  };
})();
