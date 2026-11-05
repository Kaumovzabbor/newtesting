/* Nazoratchi: test jarayoni, ogohlantirish oynasi va natija. */
(() => {
  "use strict";

  const EXAM = window.EXAM;
  const Guard = window.Guard;
  const { $, el, store, clock, mmss, words, range, shuffle, REASON, BLOCKED, HOW, describe, report, copyText, show } = window.U;

  const LS_ACTIVE = "nazoratchi.active";
  const LS_RESULTS = "nazoratchi.results";
  const LETTERS = ["A", "B", "C", "D", "E", "F"];
  const pageLoadedAt = Date.now();

  let attempt = null;
  let phase = "idle"; // idle: test boshlanmagan | test | done
  let tickTimer = 0;
  let audioCtx = null;

  const appRoot = $("#app");
  const alertBox = $("#alert");

  /* ---------- Holat belgisi, varaq sarlavhasi va ikonka ---------- */

  function setPresence(state) {
    document.querySelectorAll("[data-presence]").forEach((n) => {
      n.dataset.state = state;
    });
    document.querySelectorAll("[data-presence-text]").forEach((n) => {
      n.textContent = state === "here" ? "Siz saytdasiz" : "Siz firibgarsiz!";
    });
  }

  const baseTitle = document.title;
  const favicon = document.querySelector('link[rel="icon"]');
  const okIcon = favicon ? favicon.getAttribute("href") : "";
  const awayIcon =
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#c4122f'/>" +
        "<rect x='14' y='6' width='4' height='13' rx='2' fill='#fff'/><circle cx='16' cy='25' r='2.6' fill='#fff'/></svg>"
    );
  let blinkTimer = 0;

  /* Boshqa varaqda turganda ham brauzer varaqlar qatorida "Siz firibgarsiz!" ko‘rinib turadi. */
  function tabAlarm(on) {
    clearInterval(blinkTimer);
    if (favicon) favicon.setAttribute("href", on ? awayIcon : okIcon);
    if (!on) {
      document.title = baseTitle;
      return;
    }
    let flip = false;
    const tick = () => {
      document.title = flip ? "Qaytib keling!" : "⚠ Siz firibgarsiz!";
      flip = !flip;
    };
    tick();
    blinkTimer = setInterval(tick, 1000);
  }

  /* ---------- Ovoz va xabarlar ---------- */

  function beep() {
    if (!EXAM.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t0 = audioCtx.currentTime;
      [[880, 0], [660, 0.2], [440, 0.4]].forEach(([freq, delay]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + delay);
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.17);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0 + delay);
        osc.stop(t0 + delay + 0.18);
      });
    } catch (err) {
      /* ovoz ishlamasa ham davom etamiz */
    }
  }

  let toastTimer = 0;
  function toast(text) {
    const box = $("#toast");
    box.textContent = text;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      box.hidden = true;
    }, 2800);
  }

  /* ---------- Qizil ogohlantirish oynasi ---------- */

  let alertTimer = 0;
  let alertAction = null;

  function showAlert(o) {
    clearInterval(alertTimer);
    alertAction = o.onOk || null;
    $("#alert-kicker").textContent = o.kicker;
    $("#alert-title").textContent = o.title;
    $("#alert-detail").textContent = o.detail;
    $("#alert-meta").textContent = o.meta || "";
    alertBox.hidden = false;
    appRoot.inert = true;

    const card = alertBox.querySelector(".alert-card");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");

    const ok = $("#alert-ok");
    let left = o.lock || 0;
    const paint = () => {
      ok.disabled = left > 0;
      ok.textContent = left > 0 ? `${o.okLabel} (${left})` : o.okLabel;
    };
    paint();
    if (left > 0) {
      alertTimer = setInterval(() => {
        left -= 1;
        paint();
        if (left <= 0) {
          clearInterval(alertTimer);
          ok.focus();
        }
      }, 1000);
    } else {
      ok.focus();
    }
  }

  function hideAlert() {
    clearInterval(alertTimer);
    alertAction = null;
    alertBox.hidden = true;
    appRoot.inert = false;
  }

  $("#alert-ok").addEventListener("click", () => {
    const action = alertAction;
    hideAlert();
    if (action) action();
    // Tugma bosilishi foydalanuvchi harakati hisoblanadi: to‘liq ekranga qaytamiz.
    if (phase === "test" && EXAM.fullscreen && Guard.supportsFullscreen() && !Guard.isFullscreen()) {
      Guard.enterFullscreen();
    }
  });

  /* ---------- Test urinishi ---------- */

  function createAttempt(name, group) {
    const n = EXAM.questions.length;
    const order = EXAM.shuffle ? shuffle(range(n)) : range(n);
    const optOrder = {};
    range(n).forEach((qi) => {
      const count = EXAM.questions[qi].options.length;
      optOrder[qi] = EXAM.shuffle ? shuffle(range(count)) : range(count);
    });
    const now = Date.now();
    return {
      id: now.toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      group,
      startedAt: now,
      deadline: now + EXAM.minutes * 60000,
      order,
      optOrder,
      answers: {},
      pos: 0,
      violations: [],
      notes: [],
      status: "running",
    };
  }

  function persist() {
    if (attempt && attempt.status === "running") store.set(LS_ACTIVE, attempt);
  }

  const answeredCount = () => Object.keys(attempt.answers).length;
  const scoreOf = (a) => a.order.reduce((n, qi) => n + (a.answers[qi] === EXAM.questions[qi].answer ? 1 : 0), 0);

  /* ---------- Natijani serverga yuborish (ixtiyoriy) ---------- */

  function send(event, extra) {
    if (!EXAM.endpoint || !attempt) return Promise.resolve(false);
    const body = Object.assign(
      {
        event,
        id: attempt.id,
        exam: EXAM.title,
        name: attempt.name,
        group: attempt.group,
        startedAt: attempt.startedAt,
        total: attempt.order.length,
        score: attempt.score === undefined ? null : attempt.score,
        status: attempt.status,
        how: attempt.how || "",
        violations: attempt.violations,
        at: Date.now(),
      },
      extra || {}
    );
    return fetch(EXAM.endpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    }).then(
      () => true,
      () => false
    );
  }

  /* ---------- Qoidabuzarlik ---------- */

  function addViolation(reason, seconds) {
    const v = { at: Date.now(), reason, seconds: seconds ? Math.round(seconds * 10) / 10 : 0 };
    attempt.violations.push(v);
    persist();
    renderLog();
    renderHud();
    send("violation", { violation: v });
    return attempt.violations.length >= EXAM.maxViolations;
  }

  function flag(reason, seconds) {
    const limit = addViolation(reason, seconds);
    const n = attempt.violations.length;
    const left = EXAM.maxViolations - n;
    beep();
    showAlert({
      kicker: `Qoidabuzarlik ${n} / ${EXAM.maxViolations}`,
      title: "Siz firibgarsiz!",
      detail: seconds ? `${REASON[reason].you}. Sahifadan ${words(seconds)} davomida tashqarida bo‘ldingiz.` : `${REASON[reason].you}.`,
      meta: limit
        ? "Ruxsat etilgan qoidabuzarliklar soni tugadi. Test to‘xtatiladi."
        : `Yana ${left} ta qoidabuzarlikdan keyin test to‘xtatiladi. Har bir chiqish hisobotga yozilmoqda.`,
      okLabel: limit ? "Natijani ko‘rish" : "Tushundim, davom etaman",
      lock: 3,
      onOk: limit ? () => finish("cancelled") : null,
    });
  }

  Guard.on("away", () => {
    setPresence("away");
    tabAlarm(true);
  });

  Guard.on("back", ({ reason, seconds, counted }) => {
    setPresence("here");
    tabAlarm(false);
    if (!counted) return;
    if (phase === "test" && attempt && attempt.status === "running") {
      flag(reason, seconds);
    } else if (phase === "idle") {
      beep();
      showAlert({
        kicker: "Sinov rejimi",
        title: "Siz firibgarsiz!",
        detail: `${REASON[reason].you}. Sahifadan ${words(seconds)} davomida tashqarida bo‘ldingiz.`,
        meta: "Test hali boshlanmagan, shuning uchun bu hisobga olinmadi. Test boshlangach har bir chiqish hisobotga yoziladi.",
        okLabel: "Tushunarli",
        lock: 0,
      });
    }
  });

  Guard.on("fullscreen-exit", () => {
    if (phase !== "test" || !attempt || attempt.status !== "running") return;
    // Varaq almashtirish bilan birga sodir bo‘lgan bo‘lsa, alohida qoidabuzarlik yozilmaydi.
    if (Guard.awayRecently(1500)) return;
    flag("fullscreen", 0);
  });

  Guard.on("blocked", ({ kind }) => {
    if (phase !== "test" || !attempt) return;
    const text = BLOCKED[kind] || `Taqiqlangan tugma: ${kind}`;
    attempt.notes.push({ at: Date.now(), text });
    persist();
    renderLog();
    toast(`${text}. Bu hisobotga yozildi.`);
  });

  /* ---------- Test oynasi ---------- */

  function renderHud() {
    const n = attempt.violations.length;
    $("#hud-viol").textContent = `${n} / ${EXAM.maxViolations}`;
    $("#hud-viol-wrap").dataset.level = n === 0 ? "ok" : n >= EXAM.maxViolations - 1 ? "high" : "mid";
  }

  function tick() {
    if (!attempt || attempt.status !== "running") return;
    const left = Math.ceil((attempt.deadline - Date.now()) / 1000);
    const box = $("#hud-time");
    box.textContent = mmss(left);
    box.dataset.low = left <= 60 ? "1" : "0";
    if (left <= 0) finish("time");
  }

  function renderLog() {
    const list = $("#log");
    list.replaceChildren();
    const items = attempt.violations
      .map((v) => ({ at: v.at, text: describe(v), hard: true }))
      .concat(attempt.notes.map((n) => ({ at: n.at, text: n.text, hard: false })))
      .sort((a, b) => a.at - b.at);
    $("#log-empty").hidden = items.length > 0;
    items.forEach((it) => {
      const li = el("li", it.hard ? "log-hard" : "log-soft");
      li.append(el("time", "", clock(it.at)), el("span", "", it.text));
      list.append(li);
    });
  }

  function markOptions() {
    const qi = attempt.order[attempt.pos];
    document.querySelectorAll("#options .option").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.oi) === attempt.answers[qi]));
    });
  }

  function renderQuestion() {
    const qi = attempt.order[attempt.pos];
    const q = EXAM.questions[qi];
    $("#q-pos").textContent = `Savol ${attempt.pos + 1} / ${attempt.order.length}`;
    $("#q-text").textContent = q.q;
    const list = $("#options");
    list.replaceChildren();
    attempt.optOrder[qi].forEach((oi, k) => {
      const li = el("li");
      const btn = el("button", "option");
      btn.type = "button";
      btn.dataset.oi = String(oi);
      btn.append(el("span", "bubble", LETTERS[k] || String(k + 1)), el("span", "opt-text", q.options[oi]));
      btn.addEventListener("click", () => answer(qi, oi));
      li.append(btn);
      list.append(li);
    });
    markOptions();
    $("#prev").disabled = attempt.pos === 0;
    $("#next").disabled = attempt.pos === attempt.order.length - 1;
  }

  function buildSheet() {
    const grid = $("#sheet");
    grid.replaceChildren();
    attempt.order.forEach((qi, pos) => {
      const cell = el("button", "cell", String(pos + 1));
      cell.type = "button";
      cell.dataset.pos = String(pos);
      cell.setAttribute("aria-label", `${pos + 1}-savol`);
      cell.addEventListener("click", () => go(pos));
      grid.append(cell);
    });
  }

  function markSheet() {
    document.querySelectorAll("#sheet .cell").forEach((cell) => {
      const pos = Number(cell.dataset.pos);
      cell.classList.toggle("done", attempt.answers[attempt.order[pos]] !== undefined);
      if (pos === attempt.pos) cell.setAttribute("aria-current", "step");
      else cell.removeAttribute("aria-current");
    });
    $("#sheet-count").textContent = `${answeredCount()} / ${attempt.order.length} savolga javob belgilandi`;
  }

  function go(pos) {
    if (pos < 0 || pos >= attempt.order.length) return;
    attempt.pos = pos;
    persist();
    renderQuestion();
    markSheet();
  }

  function answer(qi, oi) {
    if (attempt.answers[qi] === oi) delete attempt.answers[qi];
    else attempt.answers[qi] = oi;
    persist();
    markOptions();
    markSheet();
  }

  $("#prev").addEventListener("click", () => go(attempt.pos - 1));
  $("#next").addEventListener("click", () => go(attempt.pos + 1));

  $("#finish-btn").addEventListener("click", () => {
    const left = attempt.order.length - answeredCount();
    $("#finish-text").textContent = left
      ? `${left} ta savolga javob belgilanmagan. Baribir yakunlaysizmi?`
      : "Barcha savollarga javob berildi. Testni yakunlaysizmi?";
    $("#finish-bar").hidden = false;
    $("#finish-yes").focus();
  });
  $("#finish-no").addEventListener("click", () => {
    $("#finish-bar").hidden = true;
    $("#finish-btn").focus();
  });
  $("#finish-yes").addEventListener("click", () => finish("manual"));

  function beginTest() {
    phase = "test";
    $("#hud").hidden = false;
    $(".foot").hidden = true;
    $("#finish-bar").hidden = true;
    buildSheet();
    renderQuestion();
    markSheet();
    renderLog();
    renderHud();
    tick();
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 500);
    Guard.start({ fullscreen: EXAM.fullscreen });
    show("test");
  }

  /* ---------- Yakunlash va natija ---------- */

  function finish(how) {
    if (!attempt || attempt.status !== "running") return;
    clearInterval(tickTimer);
    attempt.status = how === "cancelled" ? "cancelled" : "finished";
    attempt.how = how;
    attempt.finishedAt = Date.now();
    attempt.score = scoreOf(attempt);
    phase = "done";
    Guard.stop();
    hideAlert();
    setPresence("here");
    tabAlarm(false);

    const results = store.get(LS_RESULTS, []);
    results.push(attempt);
    store.set(LS_RESULTS, results);
    store.del(LS_ACTIVE);

    $("#hud").hidden = true;
    $(".foot").hidden = false;
    renderResult();
    show("result");

    if (EXAM.endpoint) {
      const note = $("#res-sent");
      note.hidden = false;
      note.textContent = "Natija o‘qituvchiga yuborilmoqda…";
      send("final").then((ok) => {
        note.textContent = ok ? "Natija o‘qituvchiga jo‘natildi." : "Natijani yuborib bo‘lmadi. Hisobotni nusxalab o‘qituvchiga bering.";
      });
    }
  }

  function renderResult() {
    const a = attempt;
    const total = a.order.length;
    $("#res-name").textContent = a.name;
    $("#res-score").textContent = `${a.score} / ${total}`;
    $("#res-pct").textContent = `${Math.round((a.score / total) * 100)}%`;
    $("#res-time").textContent = mmss((a.finishedAt - a.startedAt) / 1000);
    $("#res-viol").textContent = String(a.violations.length);
    const badge = $("#res-status");
    badge.textContent = HOW[a.how];
    badge.dataset.kind = a.how === "cancelled" ? "bad" : "ok";
    $("#res-report").textContent = report(a);
  }

  $("#res-copy").addEventListener("click", () => {
    const btn = $("#res-copy");
    copyText(report(attempt), (ok) => {
      btn.textContent = ok ? "Nusxalandi" : "Nusxalab bo‘lmadi";
      setTimeout(() => {
        btn.textContent = "Hisobotni nusxalash";
      }, 2000);
    });
  });
  $("#res-again").addEventListener("click", () => location.reload());

  /* ---------- Boshlash va tiklash ---------- */

  $("#start-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#name").value.trim().replace(/\s+/g, " ");
    const group = $("#group").value.trim();
    const error = $("#start-error");
    if (name.length < 3) {
      error.textContent = "Ism va familiyangizni to‘liq yozing.";
      error.hidden = false;
      $("#name").focus();
      return;
    }
    error.hidden = true;

    // To‘liq ekran va ovoz faqat foydalanuvchi bosishi ichida ruxsat etiladi.
    const fullscreen = EXAM.fullscreen ? Guard.enterFullscreen() : Promise.resolve(true);
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
    } catch (err) {
      /* ovozsiz davom etamiz */
    }

    hideAlert();
    attempt = createAttempt(name, group);
    persist();
    send("start");
    beginTest();
    fullscreen.then((ok) => {
      if (!ok && EXAM.fullscreen && Guard.supportsFullscreen()) toast("To‘liq ekranga o‘tib bo‘lmadi. F11 tugmasini bosing.");
    });
  });

  function resume(saved) {
    attempt = saved;
    phase = "test";
    if (Date.now() >= attempt.deadline) {
      finish("time");
      return;
    }
    beginTest();
    flag("reload", 0);
  }

  function route() {
    if (phase === "test") return;
    if (location.hash === "#oqituvchi") window.Teacher.open();
    else show(phase === "done" ? "result" : "start");
  }

  function boot() {
    $("#exam-title").textContent = EXAM.title;
    $("#rule-limit").textContent = String(EXAM.maxViolations);
    const facts = $("#facts");
    [`${EXAM.questions.length} ta savol`, `${EXAM.minutes} daqiqa`, `${EXAM.maxViolations} ta ogohlantirish`].forEach((t) => {
      facts.append(el("li", "", t));
    });

    Guard.configure({ grace: EXAM.graceSeconds, fullscreen: EXAM.fullscreen });
    window.Teacher.init();
    window.addEventListener("hashchange", route);

    const onsite = $("#onsite");
    setInterval(() => {
      onsite.textContent = mmss((Date.now() - pageLoadedAt) / 1000);
    }, 1000);

    const saved = store.get(LS_ACTIVE, null);
    if (saved && saved.status === "running") resume(saved);
    else route();
  }

  boot();
})();
