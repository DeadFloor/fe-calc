/**
 * eCO2RR Calculator Suite — calculation + UI wiring (vanilla JS, offline)
 * F = 96485 C/mol per project brief.
 */
(function () {
  "use strict";

  var F = 96485;
  var R = 8.314462618;

  function $(id) { return document.getElementById(id); }

  function fmt(x, digits) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    var d = digits == null ? 5 : digits;
    var ax = Math.abs(x);
    if (ax !== 0 && (ax < 1e-3 || ax >= 1e6)) return x.toExponential(3);
    return String(parseFloat(Number(x).toPrecision(d)));
  }

  function num(id) {
    var el = $(id);
    if (!el) return NaN;
    var v = String(el.value).trim();
    if (v === "") return NaN;
    return Number(v);
  }

  function setText(id, value, digits) {
    var el = $(id);
    if (el) el.textContent = fmt(value, digits);
  }

  function setBanner(el, on) {
    if (!el) return;
    el.classList.toggle("is-visible", !!on);
  }

  function setEmpty(row, empty) {
    if (row) row.classList.toggle("is-empty", !!empty);
  }

  function setInvalid(fieldEl, invalid) {
    if (fieldEl) fieldEl.classList.toggle("is-invalid", !!invalid);
  }

  function toMoles(amount, unit) {
    switch (unit) {
      case "nmol": return amount * 1e-9;
      case "umol": return amount * 1e-6;
      case "mmol": return amount * 1e-3;
      case "mol": return amount;
      default: return NaN;
    }
  }

  function toKelvin(T, unit) { return unit === "K" ? T : T + 273.15; }

  function toPascal(P, unit) {
    switch (unit) {
      case "Pa": return P;
      case "kPa": return P * 1e3;
      case "bar": return P * 1e5;
      case "atm": return P * 101325;
      default: return NaN;
    }
  }

  function volumeToM3(V, unit) {
    return unit === "L" ? V * 1e-3 : V * 1e-6;
  }

  function molesFromGas(V, Vu, T, Tu, P, Pu) {
    var Vm3 = volumeToM3(V, Vu);
    var Tk = toKelvin(T, Tu);
    var Pa = toPascal(P, Pu);
    if (!(Vm3 > 0) || !(Tk > 0) || !(Pa > 0)) return NaN;
    return (Pa * Vm3) / (R * Tk);
  }

  function toCoulombs(Q, unit) {
    switch (unit) {
      case "C": return Q;
      case "mC": return Q * 1e-3;
      case "uC": return Q * 1e-6;
      case "mAh": return Q * 3.6;
      case "Ah": return Q * 3600;
      default: return NaN;
    }
  }

  function fromCoulombs(Qc, unit) {
    switch (unit) {
      case "C": return Qc;
      case "mC": return Qc * 1e3;
      case "mAh": return Qc / 3.6;
      case "Ah": return Qc / 3600;
      default: return NaN;
    }
  }

  function toAmperes(I, unit) {
    switch (unit) {
      case "A": return I;
      case "mA": return I * 1e-3;
      case "uA": return I * 1e-6;
      default: return NaN;
    }
  }

  function toSeconds(t, unit) {
    switch (unit) {
      case "s": return t;
      case "min": return t * 60;
      case "h": return t * 3600;
      default: return NaN;
    }
  }

  function fromSeconds(ts, unit) {
    switch (unit) {
      case "s": return ts;
      case "min": return ts / 60;
      case "h": return ts / 3600;
      default: return NaN;
    }
  }

  function to_mA_cm2(j, unit) {
    switch (unit) {
      case "mA_cm2": return j;
      case "A_cm2": return j * 1000;
      case "A_m2": return j * 0.1;
      default: return NaN;
    }
  }

  function to_cm2(A, unit) {
    return unit === "m2" ? A * 1e4 : A;
  }

  /* ----- tabs ----- */
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"][data-tab]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
    var select = $("tab-select");

    function activate(id) {
      tabs.forEach(function (tab) {
        var on = tab.getAttribute("data-tab") === id;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel) {
        var on = panel.getAttribute("data-section") === id;
        panel.classList.toggle("is-active", on);
        if (on) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      });
      if (select && select.value !== id) select.value = id;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab.getAttribute("data-tab"));
      });
      tab.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          activate(next.getAttribute("data-tab"));
        }
      });
    });

    if (select) {
      select.addEventListener("change", function () {
        activate(select.value);
      });
    }
  }

  /* ----- n presets ----- */
  function initPresets(groupId, inputId) {
    var group = $(groupId);
    var input = $(inputId);
    if (!group || !input) return;

    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".preset-btn");
      if (!btn) return;
      group.querySelectorAll(".preset-btn").forEach(function (b) {
        b.classList.remove("is-active");
      });
      btn.classList.add("is-active");
      var n = btn.getAttribute("data-n");
      if (n === "custom") {
        input.removeAttribute("readonly");
        input.focus();
      } else {
        input.value = n;
        input.setAttribute("readonly", "readonly");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  /* ----- FE ----- */
  function syncFeMode() {
    if (!$("fe-product-mode")) return;
    var mode = $("fe-product-mode").value;
    var moleMode = mode === "moles";
    var molesBlock = $("fe-moles-block");
    var gasBlock = $("fe-gas-block");
    if (molesBlock) {
      if (moleMode) molesBlock.removeAttribute("hidden");
      else molesBlock.setAttribute("hidden", "");
    }
    if (gasBlock) {
      if (moleMode) gasBlock.setAttribute("hidden", "");
      else gasBlock.removeAttribute("hidden");
    }
  }

  function calcFE() {
    var n = num("fe-n-electrons");
    var mode = $("fe-product-mode").value;
    var moles;
    if (mode === "moles") {
      moles = toMoles(num("fe-n-product"), $("fe-n-product-unit").value);
    } else {
      moles = molesFromGas(
        num("fe-gas-volume"), $("fe-gas-volume-unit").value,
        num("fe-gas-temp"), $("fe-gas-temp-unit").value,
        num("fe-gas-pressure"), $("fe-gas-pressure-unit").value
      );
    }
    var Q = toCoulombs(num("fe-charge"), $("fe-charge-unit").value);

    var nField = document.querySelector('#form-fe [data-field="n-electrons"]');
    var qField = document.querySelector('#form-fe [data-field="charge"]');
    var badN = !(n >= 1);
    var badQ = !(Q > 0);
    var badM = !(moles >= 0) || !isFinite(moles);
    setInvalid(nField, badN);
    setInvalid(qField, badQ);

    var warn = $("fe-warning");
    var ok = $("fe-ok");
    var row = $("fe-result-row");

    if (badN || badQ || badM) {
      setText("fe-result-value", null);
      setText("fe-moles-value", null);
      setText("fe-qth-value", null);
      setText("fe-mol-e-value", null);
      setEmpty(row, true);
      setEmpty($("fe-moles-row"), true);
      setEmpty($("fe-qth-row"), true);
      row && row.classList.remove("is-warning");
      setBanner(warn, false);
      setBanner(ok, false);
      return;
    }

    var Qth = n * F * moles;
    var FE = (Qth / Q) * 100;
    var molE = Q / F;

    setText("fe-result-value", FE);
    setText("fe-moles-value", moles);
    setText("fe-qth-value", Qth);
    setText("fe-mol-e-value", molE);
    setEmpty(row, false);
    setEmpty($("fe-moles-row"), false);
    setEmpty($("fe-qth-row"), false);

    if (FE > 100.5) {
      row.classList.add("is-warning");
      setBanner(warn, true);
      setBanner(ok, false);
      var wt = $("fe-warning-text");
      if (wt) wt.textContent = "FE = " + fmt(FE, 4) + "%. Check product quantification, n, charge integration, or gas T/P.";
    } else if (FE > 100) {
      row.classList.add("is-warning");
      setBanner(warn, true);
      setBanner(ok, false);
    } else {
      row.classList.remove("is-warning");
      setBanner(warn, false);
      setBanner(ok, true);
      var ot = $("fe-ok-text");
      if (ot) ot.textContent = "FE = " + fmt(FE, 4) + "% (within physical range).";
    }
  }

  /* ----- Partial j ----- */
  function syncPcdMode() {
    if (!$("pcd-mode")) return;
    var mode = $("pcd-mode").value;
    var jBlock = $("pcd-j-block");
    var iBlock = $("pcd-I-block");
    if (mode === "j") {
      if (jBlock) jBlock.style.display = "";
      if (iBlock) iBlock.setAttribute("hidden", "");
    } else {
      if (jBlock) jBlock.style.display = "none";
      if (iBlock) iBlock.removeAttribute("hidden");
    }
  }

  function calcPcd() {
    var FE = num("pcd-fe");
    var mode = $("pcd-mode").value;
    var jTot = NaN;
    var I_mA = NaN;
    var area = NaN;

    if (mode === "j") {
      jTot = to_mA_cm2(num("pcd-j-total"), $("pcd-j-total-unit").value);
    } else {
      var IA = toAmperes(num("pcd-I-total"), $("pcd-I-total-unit").value);
      area = to_cm2(num("pcd-area"), $("pcd-area-unit").value);
      if (isFinite(IA) && area > 0) {
        I_mA = IA * 1000;
        jTot = I_mA / area;
      }
    }

    var row = $("pcd-result-row");
    var warn = $("pcd-warning");
    var bad = !(FE >= 0) || !isFinite(jTot);

    if (bad) {
      setText("pcd-result-value", null);
      setText("pcd-jtot-value", null);
      setText("pcd-Ii-value", null);
      setEmpty(row, true);
      setEmpty($("pcd-jtot-row"), true);
      setBanner(warn, false);
      $("pcd-Ii-row").hidden = true;
      return;
    }

    var ji = (FE / 100) * jTot;
    setText("pcd-result-value", ji);
    setText("pcd-jtot-value", jTot);
    setEmpty(row, false);
    setEmpty($("pcd-jtot-row"), false);
    $("pcd-result-unit").textContent = "mA·cm⁻²";

    if (mode === "I" && area > 0) {
      $("pcd-Ii-row").hidden = false;
      setText("pcd-Ii-value", (FE / 100) * I_mA);
      setEmpty($("pcd-Ii-row"), false);
    } else {
      $("pcd-Ii-row").hidden = true;
    }

    setBanner(warn, FE > 100.5);
    row.classList.toggle("is-warning", FE > 100.5);
  }

  /* ----- Production rate ----- */
  function calcRate() {
    var IA = toAmperes(num("rate-current"), $("rate-current-unit").value);
    var FE = num("rate-fe");
    var n = num("rate-n-electrons");
    var areaRaw = num("rate-area");
    var area = isFinite(areaRaw) && areaRaw > 0
      ? to_cm2(areaRaw, $("rate-area-unit").value)
      : NaN;
    var MM = num("rate-molar-mass");

    var row = $("rate-result-row");
    if (!(IA > 0) || !(FE >= 0) || !(n >= 1)) {
      setText("rate-result-value", null);
      setText("rate-umolh-value", null);
      setText("rate-areal-value", null);
      setText("rate-Ii-value", null);
      setText("rate-mass-value", null);
      setEmpty(row, true);
      setEmpty($("rate-umolh-row"), true);
      setEmpty($("rate-Ii-row"), true);
      $("rate-areal-row").hidden = true;
      $("rate-mass-row").hidden = true;
      return;
    }

    var IiA = IA * (FE / 100);
    var mols = IiA / (n * F);
    var umolh = mols * 1e6 * 3600;

    setText("rate-result-value", mols);
    $("rate-result-unit").textContent = "mol·s⁻¹";
    setText("rate-umolh-value", umolh);
    setText("rate-Ii-value", IiA * 1000);
    setEmpty(row, false);
    setEmpty($("rate-umolh-row"), false);
    setEmpty($("rate-Ii-row"), false);

    if (isFinite(area) && area > 0) {
      $("rate-areal-row").hidden = false;
      setText("rate-areal-value", umolh / area);
      setEmpty($("rate-areal-row"), false);
    } else {
      $("rate-areal-row").hidden = true;
    }

    if (isFinite(MM) && MM > 0) {
      $("rate-mass-row").hidden = false;
      // µg/h = umol/h * g/mol = umol/h * MM
      setText("rate-mass-value", umolh * MM);
      setEmpty($("rate-mass-row"), false);
    } else {
      $("rate-mass-row").hidden = true;
    }
  }

  /* ----- Converter ----- */
  function syncConvSolve() {
    var solve = $("conv-solve-for").value;
    ["conv-field-current", "conv-field-time", "conv-field-charge"].forEach(function (id) {
      var el = $(id);
      if (el) el.classList.remove("is-solved");
    });
    if (solve === "I") $("conv-field-current").classList.add("is-solved");
    if (solve === "t") $("conv-field-time").classList.add("is-solved");
    if (solve === "Q") $("conv-field-charge").classList.add("is-solved");
  }

  function calcConvert() {
    var solve = $("conv-solve-for").value;
    var Qu = $("conv-charge-unit").value;
    var Iu = $("conv-current-unit").value;
    var tu = $("conv-time-unit").value;
    var Qv = num("conv-charge");
    var Iv = num("conv-current");
    var tv = num("conv-time");

    var Qc = NaN;
    var label = "Solved value";
    var unit = "";
    var main = NaN;
    var ok = false;

    if (solve === "convert") {
      if (isFinite(Qv) && Qv >= 0) {
        Qc = toCoulombs(Qv, Qu);
        label = "Q (input)";
        unit = Qu === "C" ? "C" : Qu === "mAh" ? "mA·h" : "A·h";
        main = Qv;
        ok = true;
      }
    } else if (solve === "t") {
      if (isFinite(Qv) && Qv > 0 && isFinite(Iv) && Iv !== 0) {
        Qc = toCoulombs(Qv, Qu);
        var IA = toAmperes(Iv, Iu);
        var ts = Qc / IA;
        main = fromSeconds(ts, tu);
        label = "Time";
        unit = tu;
        ok = true;
      }
    } else if (solve === "Q") {
      if (isFinite(Iv) && Iv !== 0 && isFinite(tv) && tv > 0) {
        var IA2 = toAmperes(Iv, Iu);
        var ts2 = toSeconds(tv, tu);
        Qc = IA2 * ts2;
        main = fromCoulombs(Qc, Qu);
        label = "Charge";
        unit = Qu === "C" ? "C" : Qu === "mAh" ? "mA·h" : "A·h";
        ok = true;
      }
    } else if (solve === "I") {
      if (isFinite(Qv) && Qv > 0 && isFinite(tv) && tv > 0) {
        Qc = toCoulombs(Qv, Qu);
        var ts3 = toSeconds(tv, tu);
        var IA3 = Qc / ts3;
        if (Iu === "mA") { main = IA3 * 1000; unit = "mA"; }
        else if (Iu === "uA") { main = IA3 * 1e6; unit = "µA"; }
        else { main = IA3; unit = "A"; }
        label = "Current";
        ok = true;
      }
    }

    var row = $("conv-result-row");
    $("conv-result-label").textContent = label;
    if (ok) {
      setText("conv-result-value", main, 6);
      $("conv-result-unit").textContent = unit;
      setEmpty(row, false);
      setText("conv-C-value", Qc, 6);
      setText("conv-mAh-value", Qc / 3.6, 6);
      setText("conv-Ah-value", Qc / 3600, 6);
      setEmpty($("conv-C-row"), false);
      setEmpty($("conv-mAh-row"), false);
      setEmpty($("conv-Ah-row"), false);
    } else {
      setText("conv-result-value", null);
      $("conv-result-unit").textContent = "";
      setEmpty(row, true);
      setText("conv-C-value", null);
      setText("conv-mAh-value", null);
      setText("conv-Ah-value", null);
      setEmpty($("conv-C-row"), true);
      setEmpty($("conv-mAh-row"), true);
      setEmpty($("conv-Ah-row"), true);
    }
  }

  /* ----- bind ----- */
  function bindLive(ids, fn) {
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", fn);
      el.addEventListener("change", fn);
    });
  }

  function wireForm(formId, calcFn, defaultsFn) {
    var form = $(formId);
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      calcFn();
    });
    form.addEventListener("reset", function () {
      setTimeout(function () {
        if (defaultsFn) defaultsFn();
        calcFn();
      }, 0);
    });
  }

  function init() {
    initTabs();
    initPresets("fe-presets", "fe-n-electrons");
    initPresets("rate-presets", "rate-n-electrons");

    $("fe-product-mode").addEventListener("change", function () {
      syncFeMode();
      calcFE();
    });
    syncFeMode();

    $("pcd-mode").addEventListener("change", function () {
      syncPcdMode();
      calcPcd();
    });
    syncPcdMode();

    $("conv-solve-for").addEventListener("change", function () {
      syncConvSolve();
      calcConvert();
    });
    syncConvSolve();

    bindLive([
      "fe-n-electrons", "fe-product-mode", "fe-n-product", "fe-n-product-unit",
      "fe-gas-volume", "fe-gas-volume-unit", "fe-gas-temp", "fe-gas-temp-unit",
      "fe-gas-pressure", "fe-gas-pressure-unit", "fe-charge", "fe-charge-unit"
    ], calcFE);

    bindLive([
      "pcd-mode", "pcd-j-total", "pcd-j-total-unit", "pcd-I-total", "pcd-I-total-unit",
      "pcd-area", "pcd-area-unit", "pcd-fe"
    ], calcPcd);

    bindLive([
      "rate-current", "rate-current-unit", "rate-fe", "rate-n-electrons",
      "rate-area", "rate-area-unit", "rate-molar-mass"
    ], calcRate);

    bindLive([
      "conv-solve-for", "conv-current", "conv-current-unit", "conv-time", "conv-time-unit",
      "conv-charge", "conv-charge-unit"
    ], calcConvert);

    wireForm("form-fe", calcFE, function () {
      $("fe-n-electrons").value = "2";
      $("fe-n-electrons").setAttribute("readonly", "readonly");
      $("fe-product-mode").value = "moles";
      syncFeMode();
      var g = $("fe-presets");
      if (g) {
        g.querySelectorAll(".preset-btn").forEach(function (b, i) {
          b.classList.toggle("is-active", i === 0);
        });
      }
    });
    wireForm("form-pcd", calcPcd, syncPcdMode);
    wireForm("form-rate", calcRate, function () {
      $("rate-n-electrons").value = "2";
      $("rate-n-electrons").setAttribute("readonly", "readonly");
    });
    wireForm("form-converter", calcConvert, syncConvSolve);

    calcFE();
    calcPcd();
    calcRate();
    calcConvert();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ===== GC online FE (ppm-based) ===== */
(function (root) {
  "use strict";
  var R = 8.314462618, F = 96485.33212;
  var PRESETS = {
    H2: { name: "H2", label: "H₂", n: 2, color: "var(--chip-h2)", hex: "#3b82c4" },
    CO: { name: "CO", label: "CO", n: 2, color: "var(--chip-co)", hex: "#f28c28" },
    CH4: { name: "CH4", label: "CH₄", n: 8, color: "var(--chip-ch4)", hex: "#2f9e6e" },
    C2H4: { name: "C2H4", label: "C₂H₄", n: 12, color: "var(--chip-c2h4)", hex: "#8b5cf6" }
  };
  var CUSTOM_HEX = ["#64748b", "#db2777", "#0891b2", "#a16207"];

  /* Pure math (also used by node tests) */
  function molarFlow(flow_mL_min, T, P) { return P * (flow_mL_min * 1e-6 / 60) / (R * T); }
  function fe(ppm, n, ndotGas, I_A) { return n * F * (ppm * 1e-6) * ndotGas / I_A * 100; }
  /* t_k = t_1 + (k-1)·(t_analysis + t_post); k is 0-based here */
  function schedTime(k, sc) { var p = function (v) { return parseFloat(String(v).replace(",", ".")); }; return p(sc.t1) + k * (p(sc.ana) + p(sc.post)); }
  var GC = { R: R, F: F, molarFlow: molarFlow, fe: fe, schedTime: schedTime };
  if (typeof module !== "undefined" && module.exports) { module.exports = GC; return; }
  root.GCFE = GC;

  function sig(x, s) {
    if (x === null || !isFinite(x)) return "—";
    if (x === 0) return "0";
    var a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(s - 1).replace("e", "×10^");
    var d = Math.max(0, s - 1 - Math.floor(Math.log10(a)));
    return x.toFixed(Math.min(d, 6));
  }
  function pnum(v) { if (v === "" || v == null) return NaN; return parseFloat(String(v).replace(",", ".")); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var KEY = "gcfe.v1";
  function defaults() {
    return {
      imode: "j", j: "100", area: "1", Itot: "100", flow: "20", ref: "std", T: "298.15", P: "101325",
      products: [{ id: "H2", name: "H2", label: "H₂", n: 2, hex: PRESETS.H2.hex }, { id: "CO", name: "CO", label: "CO", n: 2, hex: PRESETS.CO.hex },
        { id: "CH4", name: "CH4", label: "CH₄", n: 8, hex: PRESETS.CH4.hex }, { id: "C2H4", name: "C2H4", label: "C₂H₄", n: 12, hex: PRESETS.C2H4.hex }],
      sched: { t1: "15", ana: "12", post: "3", count: 4 },
      inj: [{ ppm: {} }, { ppm: {} }, { ppm: {} }, { ppm: {} }]
    };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch (e) { S = defaults(); }
  if (typeof location !== "undefined" && location.hash.indexOf("#demo") === 0) {
    S = defaults();
    S.inj = [{ j: "100.4", ppm: { H2: "7200", CO: "16800", CH4: "520", C2H4: "1050" } },
      { j: "98.7", ppm: { H2: "7900", CO: "16100", CH4: "560", C2H4: "1010" } },
      { j: "101.6", ppm: { H2: "8600", CO: "15400", CH4: "610", C2H4: "980" } },
      { j: "99.2", ppm: { H2: "9100", CO: "14900", CH4: "640", C2H4: "960" } }];
  }
  function migrate() {
    if (!S.sched) S.sched = { t1: "15", ana: "12", post: "3", count: S.inj.length || 4 };
    S.inj.forEach(function (r) { if (r.t != null && r.manual == null) r.manual = false; });
    applySched();
  }
  function applySched() {
    var n = Math.max(1, Math.min(6, parseInt(S.sched.count, 10) || 1)); S.sched.count = n;
    while (S.inj.length < n) S.inj.push({ ppm: {} });
    S.inj.length = n;
    S.inj.forEach(function (r, k) { if (!r.manual) { var v = schedTime(k, S.sched); r.t = isFinite(v) ? String(+v.toPrecision(6)) : ""; } });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }

  function cond() {
    var jt = pnum(S.j), A = pnum(S.area), I_mA = S.imode === "j" ? jt * A : pnum(S.Itot);
    if (S.imode === "I") jt = (pnum(S.area) > 0) ? I_mA / pnum(S.area) : NaN;
    var T = S.ref === "std" ? 273.15 : pnum(S.T), P = S.ref === "std" ? 101325 : pnum(S.P);
    var nd = molarFlow(pnum(S.flow), T, P);
    return { I_A: Math.abs(I_mA) / 1000, I_mA: Math.abs(I_mA), j: Math.abs(jt), ndot: nd, ok: I_mA !== 0 && isFinite(I_mA) && isFinite(nd) && nd > 0 };
  }
  /* per-row current: row j (or row I in Total-I mode), falling back to the global value */
  function rowCur(inj, c) {
    var A = pnum(S.area), jr, Ir;
    if (S.imode === "j") { jr = isFinite(pnum(inj.j)) ? Math.abs(pnum(inj.j)) : c.j; Ir = jr * A; }
    else { Ir = isFinite(pnum(inj.I)) ? Math.abs(pnum(inj.I)) : c.I_mA; jr = A > 0 ? Ir / A : NaN; }
    return { j: jr, I_A: Ir / 1000, ok: c.ok && Ir > 0 && isFinite(Ir) };
  }
  function compute(inj, c0) {
    var rc = rowCur(inj, c0), c = { ok: rc.ok, ndot: c0.ndot, I_A: rc.I_A, j: rc.j };
    var out = { per: {}, total: 0, any: false, j: rc.j, I_mA: rc.I_A * 1000 };
    S.products.forEach(function (p) {
      var ppm = pnum(inj.ppm[p.id]);
      if (!isFinite(ppm) || !c.ok) { out.per[p.id] = null; return; }
      var f = fe(ppm, p.n, c.ndot, c.I_A);
      out.per[p.id] = { fe: f, j: f / 100 * c.j };
      out.total += f; out.any = true;
    });
    if (!out.any) out.total = null;
    out.jtot = out.any ? out.total / 100 * rc.j : null;
    return out;
  }
  function barSVG(res, h) {
    var x = 0, s = "";
    S.products.forEach(function (p) {
      var r = res.per[p.id]; if (!r) return;
      var w = Math.max(0, Math.min(r.fe, 100 - x)); if (w <= 0) return;
      s += '<rect x="' + x + '" y="0" width="' + w + '" height="' + h + '" fill="' + p.hex + '"/>'; x += w;
    });
    return s;
  }

  var chartMode = "fe";
  function nice(m) { var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  var chartView = "avg";
  function mstat(a) {
    var n = a.length, m = 0, s = 0; if (!n) return { m: NaN, sd: NaN, n: 0 };
    a.forEach(function (v) { m += v; }); m /= n;
    if (n > 1) { a.forEach(function (v) { s += (v - m) * (v - m); }); s = Math.sqrt(s / (n - 1)); } else s = NaN;
    return { m: m, sd: s, n: n };
  }
  function aggregate(data, c) {
    var agg = { per: {}, any: data.length > 0 };
    S.products.forEach(function (p) {
      var fa = [], ja = [];
      data.forEach(function (d) { var x = d.r.per[p.id]; if (x) { fa.push(x.fe); ja.push(x.j); } });
      if (fa.length) { var a = mstat(fa), b = mstat(ja); agg.per[p.id] = { fe: a.m, j: b.m, sd_fe: a.sd, sd_j: b.sd, n: a.n }; }
    });
    agg.tot = { fe: mstat(data.map(function (d) { return d.r.total; })), j: mstat(data.map(function (d) { return d.r.jtot; })) };
    return agg;
  }
  GC.mstat = mstat;
  function pm(s, d) { return sig(s.m, d) + (isFinite(s.sd) ? " ± " + sig(s.sd, 2) : ""); }
  function renderChart(results, order, c) {
    var el = $("gc-chart"); if (!el) return;
    var data = order.filter(function (o) { return results[o.i].any; }).map(function (o) { return { t: o.v.t, r: results[o.i] }; });
    var isFE = chartMode === "fe", key = isFE ? "fe" : "j";
    var avg = chartView === "avg" && data.length > 0, xTitle = "Injection time (min)";
    if (avg) {
      var ag = aggregate(data, c);
      xTitle = "Average of " + data.length + " injection" + (data.length > 1 ? "s" : "") + " (" + data.map(function (d) { return esc(d.t); }).join(", ") + " min)";
      data = [{ t: "Mean (n = " + data.length + ")", r: ag }];
    }
    var maxT = 0;
    data.forEach(function (d) {
      var s = 0, top = 0;
      S.products.forEach(function (p) { var x = d.r.per[p.id]; if (x && x[key] > 0) { s += x[key]; if (avg && isFinite(x["sd_" + key])) top = Math.max(top, s + x["sd_" + key]); } });
      if (avg) { var ts = d.r.tot[key]; s = Math.max(s, top, ts.m + (isFinite(ts.sd) ? ts.sd : 0)); }
      maxT = Math.max(maxT, s);
    });
    var ref = isFE ? 100 : c.j;
    var ymax = isFE ? Math.max(100, Math.ceil(maxT * 1.04 / 10) * 10) : nice(Math.max(maxT, ref || 0, 1e-9) * 1.08);
    var W = 360, H = 250, L = 46, Rm = 10, T = 18, B = 42, pw = W - L - Rm, ph = H - T - B;
    var y = function (v) { return T + ph - v / ymax * ph; };
    var step = isFE ? (ymax > 150 ? 50 : 20) : ymax / 5, g = "";
    for (var v = 0; v <= ymax + 1e-9; v += step) {
      g += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#d8dee6" stroke-width="0.6"/>' +
        '<text x="' + (L - 5) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="#3d4a5c">' + (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : sig(v, 3)) + "</text>";
    }
    function whisk(x, lo, hi, w, col) {
      return '<g stroke="' + col + '" stroke-width="1.3"><line x1="' + x + '" x2="' + x + '" y1="' + y(Math.max(lo, 0)) + '" y2="' + y(hi) + '"/>' +
        '<line x1="' + (x - w) + '" x2="' + (x + w) + '" y1="' + y(hi) + '" y2="' + y(hi) + '"/><line x1="' + (x - w) + '" x2="' + (x + w) + '" y1="' + y(Math.max(lo, 0)) + '" y2="' + y(Math.max(lo, 0)) + '"/></g>';
    }
    var n = Math.max(data.length, 1), slot = pw / n, bw = avg ? 96 : Math.min(46, slot * 0.62), bars = "", errs = "";
    data.forEach(function (d, k) {
      var cx = L + slot * (k + 0.5), acc = 0;
      S.products.forEach(function (p) {
        var x = d.r.per[p.id]; if (!x || x[key] <= 0) return;
        var v = x[key], y0 = y(acc + v), hh = y(acc) - y0; acc += v;
        var lab = avg
          ? esc(p.label) + " mean (n = " + x.n + "): FE " + pm({ m: x.fe, sd: x.sd_fe }, 3) + " %, j " + pm({ m: x.j, sd: x.sd_j }, 3) + " mA cm⁻²"
          : esc(p.label) + " @ " + esc(d.t) + " min: FE " + sig(x.fe, 3) + " %, j " + sig(x.j, 3) + " mA cm⁻²";
        bars += '<rect class="gc-seg" x="' + (cx - bw / 2) + '" y="' + y0 + '" width="' + bw + '" height="' + Math.max(hh, 0) + '" fill="' + p.hex + '" stroke="#fff" stroke-width="0.6" data-tip="' + lab + '"><title>' + lab + "</title></rect>";
        if (avg && isFinite(x["sd_" + key])) errs += whisk(cx + bw / 2 - 10, acc - x["sd_" + key], acc + x["sd_" + key], 4, "#14213d");
        if (avg && hh > 13) bars += '<text x="' + (cx - bw / 2 - 5) + '" y="' + (y0 + hh / 2 + 3.5) + '" text-anchor="end" font-size="9" fill="#3d4a5c">' + sig(v, 3) + "</text>";
      });
      var totTxt, topV = acc, col = isFE && acc > 100 ? "#c2410c" : "#14213d";
      if (avg) {
        var ts = d.r.tot[key]; totTxt = pm(ts, 3) + (isFE ? " %" : "");
        if (isFinite(ts.sd)) { errs += whisk(cx, ts.m - ts.sd, ts.m + ts.sd, 7, "#c2410c"); topV = Math.max(acc, ts.m + ts.sd); }
        col = isFE && ts.m > 100 ? "#c2410c" : "#14213d";
      } else totTxt = sig(acc, 3);
      bars += '<text x="' + cx + '" y="' + (y(topV) - 5) + '" text-anchor="middle" font-size="' + (avg ? 12 : 10) + '" font-weight="700" fill="' + col + '">' + totTxt + "</text>" +
        '<text x="' + cx + '" y="' + (T + ph + 14) + '" text-anchor="middle" font-size="10" fill="#3d4a5c">' + esc(d.t) + "</text>";
    });
    var refl = (ref && isFinite(ref)) ? '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + y(ref) + '" y2="' + y(ref) + '" stroke="#c2410c" stroke-width="1.2" stroke-dasharray="5 3"/>' +
      '<text x="' + (W - Rm) + '" y="' + (y(ref) - 3) + '" text-anchor="end" font-size="9" fill="#c2410c">' + (isFE ? "100 %" : "j_total " + sig(ref, 3)) + "</text>" : "";
    var empty = data.length ? "" : '<text x="' + (L + pw / 2) + '" y="' + (T + ph / 2) + '" text-anchor="middle" font-size="12" fill="#8492a3">Enter ppm values to plot</text>';
    el.innerHTML = '<svg id="gc-chart-svg" data-view="' + (avg ? "avg" : "per") + '" data-mode="' + chartMode + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" font-family="IBM Plex Sans, sans-serif" width="100%">' +
      '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' + g + refl + bars + errs + empty +
      '<line x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#14213d"/><line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '" stroke="#14213d"/>' +
      '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#14213d">' + xTitle + "</text>" +
      '<text transform="translate(12 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" font-weight="600" fill="#14213d">' + (isFE ? "FE (%)" : "j_i (mA cm⁻²)") + "</text></svg>";
    $("gc-legend").innerHTML = S.products.map(function (p) { return '<span class="gc-leg"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + "</span>"; }).join("") +
      '<span class="gc-leg"><span class="gc-dash"></span>' + (isFE ? "100 % ref" : "j_total") + "</span>" +
      (avg ? '<span class="gc-leg">error bars: ± 1 SD (n − 1); navy = product, red-orange = total</span>' : "");
  }
  /* Save a file: Web Share API (level 2, files) first on touch devices / installed app — the reliable path in
     iOS Safari and Android standalone mode — then fall back to an <a download>. */
  function anchorDl(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function dl(blob, name) {
    var mobile = (root.matchMedia && (root.matchMedia("(pointer: coarse)").matches || root.matchMedia("(display-mode: standalone)").matches)) || navigator.standalone;
    var file = null;
    try { file = new File([blob], name, { type: blob.type || "application/octet-stream" }); } catch (e) {}
    if (mobile && file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function (err) { if (err && err.name !== "AbortError") anchorDl(blob, name); });
      return;
    }
    anchorDl(blob, name);
  }
  function exportSVG() { var s = $("gc-chart-svg"); if (s) dl(new Blob([new XMLSerializer().serializeToString(s)], { type: "image/svg+xml" }), "GC_distribution_" + chartMode + ".svg"); }
  function exportPNG() {
    var s = $("gc-chart-svg"); if (!s) return;
    var img = new Image(), url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(s)], { type: "image/svg+xml" }));
    img.onload = function () { var cv = document.createElement("canvas"); cv.width = 1440; cv.height = 1000; var x = cv.getContext("2d"); x.drawImage(img, 0, 0, 1440, 1000); cv.toBlob(function (b) { dl(b, "GC_distribution_" + chartMode + ".png"); }); URL.revokeObjectURL(url); };
    img.src = url;
  }
  function sortedInj() {
    return S.inj.map(function (v, i) { return { v: v, i: i }; }).sort(function (a, b) { return (pnum(a.v.t) || 0) - (pnum(b.v.t) || 0); });
  }

  function renderProducts() {
    $("gc-products").innerHTML = S.products.map(function (p, k) {
      return '<div class="gc-prod"><span class="gc-dot" style="background:' + p.hex + '"></span>' +
        '<input class="input" aria-label="Product name" data-pk="' + k + '" data-f="name" value="' + esc(p.label) + '">' +
        '<input class="input" aria-label="n electrons" inputmode="numeric" data-pk="' + k + '" data-f="n" value="' + p.n + '" title="electrons transferred (n)">' +
        '<button type="button" class="gc-x" data-rmp="' + k + '" aria-label="Remove product">×</button></div>';
    }).join("");
  }
  function renderInj() {
    $("gc-injections").innerHTML = S.inj.map(function (inj, k) {
      return '<div class="gc-inj" data-k="' + k + '"><div class="gc-inj__top"><span class="gc-inj__title">#' + (k + 1) + '</span>' +
        '<label class="sr-only" for="gc-t-' + k + '">Injection time (min)</label>' +
        '<input class="input gc-inj__t" id="gc-t-' + k + '" inputmode="decimal" data-ik="' + k + '" data-f="t" value="' + esc(inj.t) + '" placeholder="t (min)"' + (inj.manual ? "" : " readonly") + '>' +
        '<span class="field__label">min</span><button type="button" class="gc-edit' + (inj.manual ? " is-on" : "") + '" data-man="' + k + '" aria-pressed="' + !!inj.manual + '" title="Edit time manually">' + (inj.manual ? "manual" : "edit") + '</button><span class="gc-inj__tot" id="gc-it-' + k + '">—</span>' +
        '<button type="button" class="gc-x" data-rmi="' + k + '" aria-label="Remove injection">×</button></div>' +
        '<div class="gc-inj__rows">' + (S.imode === "j"
          ? '<label class="gc-cell gc-cell--cur"><span class="gc-cell__lab">|j| (mA cm⁻²)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="j" value="' + esc(inj.j == null ? "" : inj.j) + '" placeholder="' + esc(S.j) + '"><span class="gc-cell__out" id="gc-c-' + k + '">I —</span></label>'
          : '<label class="gc-cell gc-cell--cur"><span class="gc-cell__lab">|I| (mA)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="I" value="' + esc(inj.I == null ? "" : inj.I) + '" placeholder="' + esc(S.Itot) + '"><span class="gc-cell__out" id="gc-c-' + k + '">j —</span></label>') + S.products.map(function (p) {
          return '<label class="gc-cell"><span class="gc-cell__lab"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + ' (ppm)</span>' +
            '<input class="input" inputmode="decimal" data-ik="' + k + '" data-pid="' + p.id + '" value="' + esc(inj.ppm[p.id] == null ? "" : inj.ppm[p.id]) + '" placeholder="ppm">' +
            '<span class="gc-cell__out" id="gc-o-' + k + '-' + p.id + '">FE — · j —</span></label>';
        }).join("") + '</div><svg class="gc-bar" id="gc-b-' + k + '" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"></svg></div>';
    }).join("");
  }
  function update() {
    var c = cond();
    $("gc-I").textContent = c.ok ? sig(c.I_mA, 4) + " mA" : "—";
    $("gc-ndot").textContent = c.ok ? sig(c.ndot * 1e6, 4) + " µmol s⁻¹" : "—";
    var results = S.inj.map(function (inj) { return compute(inj, c); });
    results.forEach(function (r, k) {
      S.products.forEach(function (p) {
        var o = $("gc-o-" + k + "-" + p.id), x = r.per[p.id];
        if (o) o.innerHTML = x ? "FE <b>" + sig(x.fe, 3) + "%</b> · j " + sig(x.j, 3) + " mA cm⁻²" : "FE — · j —";
      });
      var cc = $("gc-c-" + k);
      if (cc) cc.innerHTML = S.imode === "j" ? "I <b>" + sig(r.I_mA, 4) + "</b> mA" : "j <b>" + sig(r.j, 4) + "</b> mA cm⁻²";
      var t = $("gc-it-" + k);
      if (t) { t.textContent = r.total == null ? "—" : "Σ " + sig(r.total, 3) + "%"; t.classList.toggle("warn", r.total > 100); }
      var b = $("gc-b-" + k); if (b) b.innerHTML = barSVG(r, 8);
    });
    // summary: latest injection with data
    var order = sortedInj(), latest = null;
    order.forEach(function (o) { if (results[o.i].any) latest = { r: results[o.i], t: o.v.t }; });
    var sum = $("gc-summary"), flag = $("gc-flag");
    if (latest) {
      var tot = latest.r.total;
      $("gc-total").textContent = sig(tot, 3) + " %";
      $("gc-sum-label").textContent = "t = " + (latest.t || "?") + " min";
      $("gc-unacc").textContent = sig(100 - tot, 3) + " %";
      $("gc-sum-bar").innerHTML = barSVG(latest.r, 8);
      $("gc-sum-chips").innerHTML = S.products.map(function (p) {
        var x = latest.r.per[p.id]; if (!x) return "";
        return '<span class="gc-chip"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + " " + sig(x.fe, 3) + "%</span>";
      }).join("");
      sum.classList.toggle("is-warning", tot > 100);
      if (tot > 100) { flag.hidden = false; flag.className = "gc-flag warn"; flag.textContent = "Total FE > 100% — check flow calibration, current, or GC response factors."; }
      else if (tot < 90) { flag.hidden = false; flag.className = "gc-flag note"; flag.textContent = "Total FE < 90% — liquid products (formate, EtOH, …) or losses unaccounted."; }
      else flag.hidden = true;
    } else {
      $("gc-total").textContent = "—"; $("gc-unacc").textContent = "—"; $("gc-sum-bar").innerHTML = ""; $("gc-sum-chips").innerHTML = "";
      $("gc-sum-label").textContent = "enter a ppm value"; flag.hidden = true; sum.classList.remove("is-warning");
    }
    // table
    var head = "<tr><th>t_inj (min)</th>" + S.products.map(function (p) { return "<th>FE_" + esc(p.name) + " (%)</th>"; }).join("") + "<th>FE_total (%)</th></tr>";
    var rows = "", sums = {}, cnt = {}, tsum = 0, tc = 0;
    order.forEach(function (o) {
      var r = results[o.i]; if (!r.any) return;
      rows += "<tr><td>" + esc(o.v.t) + "</td>" + S.products.map(function (p) {
        var x = r.per[p.id]; if (x) { sums[p.id] = (sums[p.id] || 0) + x.fe; cnt[p.id] = (cnt[p.id] || 0) + 1; }
        return "<td>" + (x ? sig(x.fe, 3) : "") + "</td>";
      }).join("") + '<td class="' + (r.total > 100 ? "warn" : "") + '">' + sig(r.total, 3) + "</td></tr>";
      tsum += r.total; tc++;
    });
    if (tc) {
      var AG = aggregate(order.filter(function (o) { return results[o.i].any; }).map(function (o) { return { t: o.v.t, r: results[o.i] }; }), c);
      rows += '<tr class="avg"><td>mean ± SD (n = ' + tc + ')</td>' + S.products.map(function (p) { var x = AG.per[p.id]; return "<td>" + (x ? pm({ m: x.fe, sd: x.sd_fe }, 3) : "") + "</td>"; }).join("") +
        "<td>" + pm(AG.tot.fe, 3) + "</td></tr>";
    }
    $("gc-table").innerHTML = "<thead>" + head + "</thead><tbody>" + (rows || '<tr><td colspan="99" style="text-align:left">No data yet</td></tr>') + "</tbody>";
    renderChart(results, order, c);
    GC._last = { c: c, results: results, order: order };
    save();
  }
  /* ===== EXPORT TEMPLATE (single source of truth for CSV + XLSX column layout) =====
     Each column: { header, field, perProduct? }.  In headers, {p} → product name (e.g. CO).
     field ∈ "t" (t_inj, min) | "j" (|j_k|, mA cm^-2) | "I" (I_k, mA) | "ppm" | "fe" (FE_i, %) |
             "ji" (j_i, mA cm^-2) | "fe_total" (Σ FE, %).
     summaryRows: which stat rows to append after the injection rows ("mean", "SD" = sample SD, n−1).
     To remap to another format, edit only this object. */
  var EXPORT_TEMPLATE = {
    sheetName: "GC_FE",
    fileStem: "GC_FE",
    sigFigs: 5,
    columns: [
      { header: "t_inj (min)", field: "t" },
      { header: "j (mA cm^-2)", field: "j" },
      { header: "I (mA)", field: "I" },
      { header: "ppm_{p} (ppm)", field: "ppm", perProduct: true },
      { header: "FE_{p} (%)", field: "fe", perProduct: true },
      { header: "j_{p} (mA cm^-2)", field: "ji", perProduct: true },
      { header: "FE_total (%)", field: "fe_total" }
    ],
    summaryRows: ["mean", "SD"]
  };
  GC.EXPORT_TEMPLATE = EXPORT_TEMPLATE;

  function buildExport(tpl) {
    tpl = tpl || EXPORT_TEMPLATE;
    var L = GC._last, c = L.c, cols = [];
    tpl.columns.forEach(function (col) {
      if (col.perProduct) S.products.forEach(function (p) { cols.push({ h: col.header.replace(/\{p\}/g, p.name), f: col.field, p: p }); });
      else cols.push({ h: col.header, f: col.field });
    });
    var D = L.order.filter(function (o) { return L.results[o.i].any; });
    function rowVal(o, col) {
      var r = L.results[o.i], x = col.p && r.per[col.p.id];
      switch (col.f) {
        case "t": return pnum(o.v.t);
        case "j": return r.j;
        case "I": return r.I_mA;
        case "ppm": return pnum(o.v.ppm[col.p.id]);
        case "fe": return x ? x.fe : NaN;
        case "ji": return x ? x.j : NaN;
        case "fe_total": return r.total;
      }
      return NaN;
    }
    var round = function (v) { return isFinite(v) ? +(+v).toPrecision(tpl.sigFigs) : null; };
    var aoa = [cols.map(function (c2) { return c2.h; })];
    D.forEach(function (o) { aoa.push(cols.map(function (col) { return round(rowVal(o, col)); })); });
    if (D.length) (tpl.summaryRows || []).forEach(function (lab) {
      aoa.push(cols.map(function (col, ci) {
        if (ci === 0 && col.f === "t") return lab + " (n=" + D.length + ")";
        var s = mstat(D.map(function (o) { return rowVal(o, col); }).filter(isFinite));
        return round(lab === "SD" ? s.sd : s.m);
      }));
    });
    return aoa;
  }
  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"); }
  function csv() {
    var aoa = buildExport();
    var lines = aoa.map(function (r) { return r.map(function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); });
    GC._csv = lines;
    if (GC._nodl) return;
    dl(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }), EXPORT_TEMPLATE.fileStem + "_" + stamp() + ".csv");
  }
  function xlsx() {
    if (!root.XLSX) { alert("XLSX library not loaded (vendor/xlsx.full.min.js)."); return; }
    var aoa = buildExport(), ws = root.XLSX.utils.aoa_to_sheet(aoa), wb = root.XLSX.utils.book_new();
    ws["!cols"] = aoa[0].map(function (h) { return { wch: Math.max(10, String(h).length + 2) }; });
    root.XLSX.utils.book_append_sheet(wb, ws, EXPORT_TEMPLATE.sheetName);
    GC._xlsxAoa = aoa;
    if (GC._nodl) { GC._xlsxB64 = root.XLSX.write(wb, { type: "base64", bookType: "xlsx" }); return; }
    var out = root.XLSX.write(wb, { type: "array", bookType: "xlsx" });
    dl(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), EXPORT_TEMPLATE.fileStem + "_" + stamp() + ".xlsx");
  }

  function syncControls() {
    ["j", "area", "Itot", "flow", "T", "P"].forEach(function (k) { $("gc-" + k).value = S[k]; });
    document.querySelectorAll("#gc-imode .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.imode); });
    document.querySelectorAll("#gc-ref .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.ref); });
    document.querySelectorAll(".gc-j").forEach(function (e) { e.hidden = S.imode !== "j"; });
    document.querySelector(".gc-i").hidden = S.imode !== "I";
    if (S.imode === "I") $("gc-area").closest(".field").hidden = false;
    document.querySelectorAll(".gc-tp").forEach(function (e) { e.hidden = S.ref === "std"; });
  }
  function syncSched() { ["t1", "ana", "post", "count"].forEach(function (f) { $("gc-s-" + f).value = S.sched[f]; }); }
  function full() { migrate(); syncSched(); syncControls(); renderProducts(); renderInj(); update(); }

  function init() {
    if (!$("section-gc")) return;
    ["j", "area", "Itot", "flow", "T", "P"].forEach(function (k) { $("gc-" + k).addEventListener("input", function (e) { S[k] = e.target.value; if (k === "j" || k === "Itot") document.querySelectorAll('[data-f="' + (k === "j" ? "j" : "I") + '"]').forEach(function (i) { i.placeholder = S[k]; }); update(); }); });
    $("gc-imode").addEventListener("click", function (e) { var b = e.target.closest(".seg__btn"); if (b) { S.imode = b.dataset.v; syncControls(); renderInj(); update(); } });
    $("gc-ref").addEventListener("click", function (e) { var b = e.target.closest(".seg__btn"); if (b) { S.ref = b.dataset.v; syncControls(); update(); } });
    $("gc-presets").addEventListener("click", function (e) {
      var b = e.target.closest("[data-p]"); if (!b) return;
      var p = b.dataset.p;
      if (p === "custom") {
        var id = "X" + Date.now().toString(36);
        S.products.push({ id: id, name: "custom", label: "custom", n: 2, hex: CUSTOM_HEX[S.products.length % CUSTOM_HEX.length] });
      } else {
        if (S.products.some(function (q) { return q.id === p; })) return;
        var P = PRESETS[p]; S.products.push({ id: p, name: P.name, label: P.label, n: P.n, hex: P.hex });
      }
      renderProducts(); renderInj(); update();
    });
    $("gc-products").addEventListener("input", function (e) {
      var k = e.target.dataset.pk; if (k == null) return; var p = S.products[k];
      if (e.target.dataset.f === "n") p.n = pnum(e.target.value) || 0;
      else { p.label = e.target.value; p.name = e.target.value.replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); }).replace(/[^A-Za-z0-9_]/g, "") || "custom"; }
      renderInj(); update();
    });
    $("gc-products").addEventListener("click", function (e) { var k = e.target.dataset.rmp; if (k != null) { S.products.splice(k, 1); renderProducts(); renderInj(); update(); } });
    $("gc-injections").addEventListener("input", function (e) {
      var k = e.target.dataset.ik; if (k == null) return;
      var f = e.target.dataset.f;
      if (f === "t" || f === "j" || f === "I") S.inj[k][f] = e.target.value; else S.inj[k].ppm[e.target.dataset.pid] = e.target.value;
      update();
    });
    $("gc-injections").addEventListener("click", function (e) {
      var k = e.target.dataset.rmi;
      if (k != null && S.inj.length > 1) { S.inj.splice(k, 1); S.sched.count = S.inj.length; syncSched(); applySched(); renderInj(); update(); return; }
      var m = e.target.dataset.man;
      if (m != null) { S.inj[m].manual = !S.inj[m].manual; applySched(); renderInj(); update(); }
    });
    ["t1", "ana", "post", "count"].forEach(function (f) {
      $("gc-s-" + f).addEventListener("input", function (e) { S.sched[f] = e.target.value; if (f === "count") { var n = parseInt(e.target.value, 10); if (!(n >= 1 && n <= 6)) return; } applySched(); renderInj(); update(); });
    });
    $("gc-add-inj").addEventListener("click", function () {
      if (S.inj.length >= 6) return;
      S.sched.count = S.inj.length + 1; syncSched(); applySched(); renderInj(); update();
      var el = document.querySelector('.gc-inj[data-k="' + (S.inj.length - 1) + '"] input[data-pid]'); if (el) el.focus();
    });
    $("gc-csv").addEventListener("click", csv);
    $("gc-xlsx").addEventListener("click", xlsx);
    $("gc-png").addEventListener("click", exportPNG);
    $("gc-svg").addEventListener("click", exportSVG);
    $("gc-chart-mode").addEventListener("click", function (e) { var b = e.target.closest(".seg__btn"); if (!b) return; chartMode = b.dataset.v;
      document.querySelectorAll("#gc-chart-mode .seg__btn").forEach(function (q) { q.classList.toggle("is-active", q === b); }); update(); });
    $("gc-chart-view").addEventListener("click", function (e) { var b = e.target.closest(".seg__btn"); if (!b) return; chartView = b.dataset.v;
      document.querySelectorAll("#gc-chart-view .seg__btn").forEach(function (q) { q.classList.toggle("is-active", q === b); }); update(); });
    $("gc-chart").addEventListener("click", function (e) { var t = e.target.getAttribute && e.target.getAttribute("data-tip"); if (t) $("gc-tip").textContent = t; });
    if (location.hash.indexOf("chartonly") > -1) document.body.classList.add("chart-only");
    $("gc-reset").addEventListener("click", function () { if (confirm("Clear all GC inputs?")) { S = defaults(); full(); } });
    full();
  }
  GC.load = function (state) { S = state; full(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
