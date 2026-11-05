/*
  O‘qituvchi paneli: PIN, natijalar ro‘yxati, CSV nusxalash.
  Natijalar faqat shu brauzerda (localStorage) saqlanadi.
  PIN sahifa kodida ochiq turgani uchun u faqat tasodifiy kirishdan himoya qiladi.
*/
window.Teacher = (() => {
  "use strict";

  const { $, el, store, dateTime, report, csv, copyText, HOW, show } = window.U;
  const LS_RESULTS = "nazoratchi.results";
  let unlocked = false;
  let clearTimer = 0;

  const copyBtn = () => $("#t-copy");
  const clearBtn = () => $("#t-clear");

  function resetClear() {
    clearTimeout(clearTimer);
    clearBtn().dataset.armed = "0";
    clearBtn().textContent = "Hammasini tozalash";
  }

  function render() {
    const list = $("#t-list");
    list.replaceChildren();
    const results = store.get(LS_RESULTS, []).slice().reverse();
    $("#t-empty").hidden = results.length > 0;
    copyBtn().disabled = results.length === 0;
    clearBtn().disabled = results.length === 0;

    results.forEach((a) => {
      const item = el("details", "t-item");
      const head = el("summary", "t-head");
      const who = el("span", "t-who");
      who.append(el("strong", "", a.name), el("span", "t-meta", `${a.group || "Guruhsiz"} · ${dateTime(a.startedAt)}`));
      const badge = el("span", "badge", HOW[a.how] || "—");
      badge.dataset.kind = a.how === "cancelled" ? "bad" : "ok";
      head.append(
        who,
        el("span", "t-score", `${a.score}/${a.order.length}`),
        el("span", "t-viol", `${a.violations.length} ta chiqish`),
        badge
      );
      item.append(head, el("pre", "report", report(a)));
      list.append(item);
    });
  }

  function open() {
    show("teacher");
    $("#pin-form").hidden = unlocked;
    $("#t-panel").hidden = !unlocked;
    if (unlocked) {
      resetClear();
      render();
    } else {
      $("#pin").focus();
    }
  }

  function init() {
    $("#pin-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("#pin").value === String(window.EXAM.teacherPin)) {
        unlocked = true;
        $("#pin").value = "";
        $("#pin-error").hidden = true;
        open();
      } else {
        $("#pin-error").hidden = false;
        $("#pin").select();
      }
    });

    copyBtn().addEventListener("click", () => {
      copyText(csv(store.get(LS_RESULTS, [])), (ok) => {
        copyBtn().textContent = ok ? "Nusxalandi" : "Nusxalab bo‘lmadi";
        setTimeout(() => {
          copyBtn().textContent = "CSV nusxalash";
        }, 2000);
      });
    });

    clearBtn().addEventListener("click", () => {
      if (clearBtn().dataset.armed !== "1") {
        clearBtn().dataset.armed = "1";
        clearBtn().textContent = "Aniq tozalaysizmi? Yana bosing";
        clearTimer = setTimeout(resetClear, 4000);
        return;
      }
      store.del(LS_RESULTS);
      resetClear();
      render();
    });

    $("#t-lock").addEventListener("click", () => {
      unlocked = false;
      location.hash = "";
    });
  }

  return { init, open };
})();
