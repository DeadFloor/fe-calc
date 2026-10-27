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
  /* Product catalog from Steve's analysis workbook (Ne = 4·C + H − 2·O; AJ38=4, AJ39=1, AJ40=−2).
     phase: "gas" (GC ppm) | "liquid" (HPLC/HSGC μM). detector noted for legend/UI. */
  var PRESETS = {
    H2: { name: "H2", label: "H₂", formula: "H2", n: 2, phase: "gas", detector: "GC", hex: "#3b82c4" },
    CO: { name: "CO", label: "CO", formula: "CO", n: 2, phase: "gas", detector: "GC", hex: "#f28c28" },
    CH4: { name: "CH4", label: "CH₄", formula: "CH4", n: 8, phase: "gas", detector: "GC", hex: "#2f9e6e" },
    C2H4: { name: "C2H4", label: "C₂H₄", formula: "C2H4", n: 12, phase: "gas", detector: "GC", hex: "#8b5cf6" },
    C2H6: { name: "C2H6", label: "C₂H₆", formula: "C2H6", n: 14, phase: "gas", detector: "GC", hex: "#0891b2" },
    C3H8: { name: "C3H8", label: "C₃H₈", formula: "C3H8", n: 20, phase: "gas", detector: "GC", hex: "#a16207" },
    C3H6: { name: "C3H6", label: "C₃H₆", formula: "C3H6", n: 18, phase: "gas", detector: "GC", hex: "#16a34a" },
    iC4H10: { name: "Isobutane", label: "i-C₄H₁₀", formula: "C4H10", n: 26, phase: "gas", detector: "GC", hex: "#db2777" },
    nC4H10: { name: "n-Butane", label: "n-C₄H₁₀", formula: "C4H10", n: 26, phase: "gas", detector: "GC", hex: "#e11d48" },
    t2C4H8: { name: "trans-2-Butene", label: "t-2-C₄H₈", formula: "C4H8", n: 24, phase: "gas", detector: "GC", hex: "#2563eb" },
    "1C4H8": { name: "1-Butene", label: "1-C₄H₈", formula: "C4H8", n: 24, phase: "gas", detector: "GC", hex: "#9333ea" },
    iC4H8: { name: "Isobutene", label: "i-C₄H₈", formula: "C4H8", n: 24, phase: "gas", detector: "GC", hex: "#ea580c" },
    c2C4H8: { name: "cis-2-Butene", label: "c-2-C₄H₈", formula: "C4H8", n: 24, phase: "gas", detector: "GC", hex: "#0d9488" },
    iC5H12: { name: "Isopentane", label: "i-C₅H₁₂", formula: "C5H12", n: 32, phase: "gas", detector: "GC", hex: "#ca8a04" },
    nC5H12: { name: "n-Pentane", label: "n-C₅H₁₂", formula: "C5H12", n: 32, phase: "gas", detector: "GC", hex: "#475569" },
    C4H6: { name: "1,3-Butadiene", label: "1,3-C₄H₆", formula: "C4H6", n: 22, phase: "gas", detector: "GC", hex: "#be185d" },
    t2C5H10: { name: "trans-2-Pentene", label: "t-2-C₅H₁₀", formula: "C5H10", n: 30, phase: "gas", detector: "GC", hex: "#1d4ed8" },
    "2Me2C4": { name: "2-Methyl-2-butene", label: "2-Me-2-C₄", formula: "C5H10", n: 30, phase: "gas", detector: "GC", hex: "#15803d" },
    "1C5H10": { name: "1-Pentene", label: "1-C₅H₁₀", formula: "C5H10", n: 30, phase: "gas", detector: "GC", hex: "#7c3aed" },
    c2C5H10: { name: "cis-2-Pentene", label: "c-2-C₅H₁₀", formula: "C5H10", n: 30, phase: "gas", detector: "GC", hex: "#c2410c" },
    C6H14: { name: "Hexane", label: "C₆H₁₄", formula: "C6H14", n: 38, phase: "gas", detector: "GC", hex: "#0f766e" },
    "1C6H12": { name: "1-Hexene", label: "1-C₆H₁₂", formula: "C6H12", n: 36, phase: "gas", detector: "GC", hex: "#854d0e" },
    c2C6H12: { name: "c-2-Hexene", label: "c-2-C₆H₁₂", formula: "C6H12", n: 36, phase: "gas", detector: "GC", hex: "#334155" },
    t2C6H12: { name: "t-2-Hexene", label: "t-2-C₆H₁₂", formula: "C6H12", n: 36, phase: "gas", detector: "GC", hex: "#9f1239" },
    HCOO: { name: "Formate", label: "HCOO⁻", formula: "CH2O2", n: 2, phase: "liquid", detector: "HPLC", hex: "#f59e0b" },
    AcO: { name: "Acetate", label: "AcO⁻", formula: "C2H4O2", n: 8, phase: "liquid", detector: "HPLC", hex: "#14b8a6" },
    MeCHO: { name: "Acetaldehyde", label: "MeCHO", formula: "C2H4O", n: 10, phase: "liquid", detector: "HSGC", hex: "#f43f5e" },
    EtCHO: { name: "Propionaldehyde", label: "EtCHO", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#6366f1" },
    Me2CO: { name: "Acetone", label: "Me₂CO", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#84cc16" },
    BuCHO: { name: "Butanal", label: "BuCHO", formula: "C4H8O", n: 22, phase: "liquid", detector: "HSGC", hex: "#06b6d4" },
    MeOH: { name: "Methanol", label: "MeOH", formula: "CH4O", n: 6, phase: "liquid", detector: "HSGC", hex: "#d946ef" },
    iPrOH: { name: "Isopropanol", label: "i-PrOH", formula: "C3H8O", n: 18, phase: "liquid", detector: "HSGC", hex: "#f97316" },
    EtOH: { name: "Ethanol", label: "EtOH", formula: "C2H6O", n: 12, phase: "liquid", detector: "HSGC", hex: "#64748b" },
    PeCHO: { name: "Pentanal", label: "PeCHO", formula: "C5H10O", n: 28, phase: "liquid", detector: "HSGC", hex: "#1e40af" },
    nPrOH: { name: "n-Propanol", label: "n-PrOH", formula: "C3H8O", n: 18, phase: "liquid", detector: "HSGC", hex: "#166534" },
    AllylOH: { name: "Allyl Alcohol", label: "AllylOH", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#6d28d9" },
    "1BuOH": { name: "1-Butanol", label: "1-BuOH", formula: "C4H10O", n: 24, phase: "liquid", detector: "HSGC", hex: "#9a3412" },
    "2Me1BuOH": { name: "2-Methyl-1-Butanol", label: "2-Me-1-BuOH", formula: "C5H12O", n: 30, phase: "liquid", detector: "HSGC", hex: "#115e59" },
    PeOH: { name: "Pentanol", label: "PeOH", formula: "C5H12O", n: 30, phase: "liquid", detector: "HSGC", hex: "#1e293b" },
    "1HexOH": { name: "1-Hexanol", label: "1-HexOH", formula: "C6H14O", n: 36, phase: "liquid", detector: "HSGC", hex: "#b45309" }
  };
  var CUSTOM_HEX = ["#64748b", "#db2777", "#0891b2", "#a16207", "#6366f1", "#14b8a6"];
  var PRESET_ORDER = ["H2","CO","CH4","C2H4","C2H6","C3H8","C3H6","iC4H10","nC4H10","t2C4H8","1C4H8","iC4H8","c2C4H8","iC5H12","nC5H12","C4H6","t2C5H10","2Me2C4","1C5H10","c2C5H10","C6H14","1C6H12","c2C6H12","t2C6H12","HCOO","AcO","MeCHO","EtCHO","Me2CO","BuCHO","MeOH","iPrOH","EtOH","PeCHO","nPrOH","AllylOH","1BuOH","2Me1BuOH","PeOH","1HexOH"];

  /* Pure math (also used by node tests) */
  function molarFlow(flow_mL_min, T, P) { return P * (flow_mL_min * 1e-6 / 60) / (R * T); }
  function fe(ppm, n, ndotGas, I_A) { return n * F * (ppm * 1e-6) * ndotGas / I_A * 100; }
  /* Liquid FE from sheet: Q_i = (c_μM/10^6)·(V_mL/10^3)·Ne·F ; FE = (Q_WE + Q_CE)/Q_total·100.
     Matches rows 28–30 of Steve's workbook. */
  function feLiquid(c_we_uM, c_ce_uM, Vw_mL, Vc_mL, n, Q_C) {
    var qw = (c_we_uM / 1e6) * (Vw_mL / 1e3) * n * F;
    var qc = (c_ce_uM / 1e6) * (Vc_mL / 1e3) * n * F;
    return (qw + qc) / Q_C * 100;
  }
  /* t_k = t_1 + (k-1)·(t_analysis + t_post); k is 0-based here */
  function schedTime(k, sc) { var p = function (v) { return parseFloat(String(v).replace(",", ".")); }; return p(sc.t1) + k * (p(sc.ana) + p(sc.post)); }
  var GC = { R: R, F: F, molarFlow: molarFlow, fe: fe, feLiquid: feLiquid, schedTime: schedTime };
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
  function prodFromPreset(id) {
    var P = PRESETS[id];
    return { id: id, name: P.name, label: P.label, formula: P.formula, n: P.n, phase: P.phase, detector: P.detector, hex: P.hex };
  }
  function defaults() {
    return {
      imode: "j", j: "100", area: "1", Itot: "100", flow: "20", ref: "std", T: "298.15", P: "101325",
      Q: "", Vw: "15", Vc: "15",
      liq: {},
      products: ["H2", "CO", "CH4", "C2H4"].map(prodFromPreset),
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
    if (!S.liq) S.liq = {};
    if (S.Q == null) S.Q = "";
    if (S.Vw == null) S.Vw = "15";
    if (S.Vc == null) S.Vc = "15";
    S.products.forEach(function (p) {
      if (!p.phase) p.phase = (PRESETS[p.id] && PRESETS[p.id].phase) || "gas";
      if (!p.detector && PRESETS[p.id]) p.detector = PRESETS[p.id].detector;
      if (!p.formula && PRESETS[p.id]) p.formula = PRESETS[p.id].formula;
      if (p.phase === "liquid" && !S.liq[p.id]) S.liq[p.id] = { we: "", ce: "" };
    });
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
  function isGas(p) { return (p.phase || "gas") !== "liquid"; }
  function compute(inj, c0) {
    var rc = rowCur(inj, c0), c = { ok: rc.ok, ndot: c0.ndot, I_A: rc.I_A, j: rc.j };
    var out = { per: {}, total: 0, any: false, j: rc.j, I_mA: rc.I_A * 1000 };
    S.products.forEach(function (p) {
      if (!isGas(p)) { out.per[p.id] = null; return; }
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
  /* Liquid FE (sheet rows 28–30): experiment-level, not per injection. j_i = FE/100 · |j|. */
  function computeLiquid(c) {
    var Q = pnum(S.Q), Vw = pnum(S.Vw), Vc = pnum(S.Vc), out = {}, ok = Q > 0 && isFinite(Q) && isFinite(Vw) && isFinite(Vc);
    S.products.forEach(function (p) {
      if (isGas(p)) return;
      var slot = S.liq[p.id] || {}, we = pnum(slot.we), ce = pnum(slot.ce);
      if (!ok || (!isFinite(we) && !isFinite(ce))) return;
      if (!isFinite(we)) we = 0; if (!isFinite(ce)) ce = 0;
      if (we === 0 && ce === 0) return;
      var f = feLiquid(we, ce, Vw, Vc, p.n, Q);
      out[p.id] = { fe: f, j: f / 100 * c.j };
    });
    return out;
  }
  function barSVG(res, h) {
    var x = 0, s = "";
    S.products.forEach(function (p) {
      if (!isGas(p)) return;
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
  function renderChart(results, order, c, liqRes) {
    var el = $("gc-chart"); if (!el) return;
    liqRes = liqRes || {};
    var data = order.filter(function (o) { return results[o.i].any; }).map(function (o) { return { t: o.v.t, r: results[o.i] }; });
    var isFE = chartMode === "fe", key = isFE ? "fe" : "j";
    var dual = isFE; /* FE bars (left) + j_i lines (right) */
    var avg = chartView === "avg" && data.length > 0, xTitle = "Injection time (min)";
    if (avg) {
      var ag = aggregate(data, c);
      /* Fold liquid products into the mean stack (experiment-level FE from sheet). */
      Object.keys(liqRes).forEach(function (id) {
        var L = liqRes[id]; if (!L || !isFinite(L.fe)) return;
        ag.per[id] = { fe: L.fe, j: L.j, sd_fe: NaN, sd_j: NaN, n: 1 };
        ag.tot.fe.m = (isFinite(ag.tot.fe.m) ? ag.tot.fe.m : 0) + L.fe;
        ag.tot.j.m = (isFinite(ag.tot.j.m) ? ag.tot.j.m : 0) + L.j;
      });
      xTitle = "Average of " + data.length + " injection" + (data.length > 1 ? "s" : "") + " (" + data.map(function (d) { return esc(d.t); }).join(", ") + " min)";
      data = [{ t: "Mean (n = " + data.length + ")", r: ag }];
    }
    var present = S.products.filter(function (p) {
      return data.some(function (d) { var x = d.r.per[p.id]; return x && x[key] > 0; });
    });
    if (!present.length) present = S.products.filter(function (p) {
      return data.some(function (d) { var x = d.r.per[p.id]; return x && (x.fe > 0 || x.j > 0); });
    });
    var maxFE = 0, maxJ = 0;
    data.forEach(function (d) {
      var s = 0, top = 0;
      S.products.forEach(function (p) {
        var x = d.r.per[p.id]; if (!x) return;
        if (x.fe > 0) { s += x.fe; if (avg && isFinite(x.sd_fe)) top = Math.max(top, s + x.sd_fe); }
        if (x.j > 0) maxJ = Math.max(maxJ, x.j + (avg && isFinite(x.sd_j) ? x.sd_j : 0));
      });
      if (avg && d.r.tot) {
        var ts = d.r.tot.fe; s = Math.max(s, top, ts.m + (isFinite(ts.sd) ? ts.sd : 0));
      }
      maxFE = Math.max(maxFE, s);
      if (!isFE) {
        var sj = 0, topj = 0;
        S.products.forEach(function (p) { var x = d.r.per[p.id]; if (x && x.j > 0) { sj += x.j; if (avg && isFinite(x.sd_j)) topj = Math.max(topj, sj + x.sd_j); } });
        maxFE = Math.max(maxFE, sj, topj); /* reuse maxFE as bar max when j-mode */
      }
    });
    var ymaxL = isFE ? Math.max(100, Math.ceil(maxFE * 1.04 / 10) * 10) : nice(Math.max(maxFE, c.j || 0, 1e-9) * 1.08);
    var ymaxR = nice(Math.max(maxJ, 1e-9) * 1.15);
    var W = 360, H = dual ? 268 : 250, L = 46, Rm = dual ? 44 : 10, T = 18, B = 46, pw = W - L - Rm, ph = H - T - B;
    var yL = function (v) { return T + ph - v / ymaxL * ph; };
    var yR = function (v) { return T + ph - v / ymaxR * ph; };
    var yBar = isFE ? yL : yL;
    var stepL = isFE ? (ymaxL > 150 ? 50 : 20) : ymaxL / 5, g = "";
    for (var v = 0; v <= ymaxL + 1e-9; v += stepL) {
      g += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + yL(v) + '" y2="' + yL(v) + '" stroke="#d8dee6" stroke-width="0.6"/>' +
        '<text x="' + (L - 5) + '" y="' + (yL(v) + 3.5) + '" text-anchor="end" font-size="10" fill="#3d4a5c">' + (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : sig(v, 3)) + "</text>";
    }
    var gR = "";
    if (dual) {
      var stepR = ymaxR / 5;
      for (var vr = 0; vr <= ymaxR + 1e-9; vr += stepR) {
        gR += '<text x="' + (W - Rm + 5) + '" y="' + (yR(vr) + 3.5) + '" text-anchor="start" font-size="10" fill="#3d4a5c">' + (Math.abs(vr - Math.round(vr)) < 1e-9 ? Math.round(vr) : sig(vr, 3)) + "</text>";
      }
    }
    function whisk(x, lo, hi, w, col, yfn) {
      yfn = yfn || yBar;
      return '<g stroke="' + col + '" stroke-width="1.3"><line x1="' + x + '" x2="' + x + '" y1="' + yfn(Math.max(lo, 0)) + '" y2="' + yfn(hi) + '"/>' +
        '<line x1="' + (x - w) + '" x2="' + (x + w) + '" y1="' + yfn(hi) + '" y2="' + yfn(hi) + '"/><line x1="' + (x - w) + '" x2="' + (x + w) + '" y1="' + yfn(Math.max(lo, 0)) + '" y2="' + yfn(Math.max(lo, 0)) + '"/></g>';
    }
    var n = Math.max(data.length, 1), slot = pw / n, bw = avg ? Math.min(110, pw * 0.42) : Math.min(46, slot * 0.62), bars = "", errs = "", lines = "", markers = "";
    var seriesPts = {}; /* id -> [{cx, j, sd}] */
    present.forEach(function (p) { seriesPts[p.id] = []; });
    data.forEach(function (d, k) {
      var cx = L + slot * (k + 0.5), acc = 0;
      S.products.forEach(function (p) {
        var x = d.r.per[p.id]; if (!x || x[key] <= 0) return;
        var vv = x[key], y0 = yBar(acc + vv), hh = yBar(acc) - y0; acc += vv;
        var lab = avg
          ? esc(p.label) + " mean (n = " + x.n + "): FE " + pm({ m: x.fe, sd: x.sd_fe }, 3) + " %, j " + pm({ m: x.j, sd: x.sd_j }, 3) + " mA cm⁻²"
          : esc(p.label) + " @ " + esc(d.t) + " min: FE " + sig(x.fe, 3) + " %, j " + sig(x.j, 3) + " mA cm⁻²";
        bars += '<rect class="gc-seg" x="' + (cx - bw / 2) + '" y="' + y0 + '" width="' + bw + '" height="' + Math.max(hh, 0) + '" fill="' + p.hex + '" stroke="#fff" stroke-width="0.6" data-tip="' + lab + '"><title>' + lab + "</title></rect>";
        if (avg && isFinite(x["sd_" + key])) errs += whisk(cx + bw / 2 - 10, acc - x["sd_" + key], acc + x["sd_" + key], 4, "#14213d", yBar);
        /* Segment label: product name + value when tall enough */
        if (hh > 14) {
          var txt = esc(p.label) + " " + sig(vv, 3);
          var fill = "#ffffff";
          /* dark text on light segments */
          var lum = (function (h) { h = h.replace("#",""); if (h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16); return 0.299*r+0.587*g+0.114*b; })(p.hex);
          if (lum > 160) fill = "#14213d";
          var fs = txt.length > 10 && bw < 90 ? 8 : 9;
          bars += '<text x="' + cx + '" y="' + (y0 + hh / 2 + 3.2) + '" text-anchor="middle" font-size="' + fs + '" font-weight="600" fill="' + fill + '" pointer-events="none">' + txt + "</text>";
        }
        if (dual && x.j > 0) seriesPts[p.id].push({ cx: cx, j: x.j, sd: x.sd_j, tip: lab });
      });
      var totTxt, topV = acc, col = isFE && acc > 100 ? "#c2410c" : "#14213d";
      if (avg && d.r.tot) {
        var ts = d.r.tot[key] || d.r.tot.fe;
        totTxt = pm(isFE ? d.r.tot.fe : d.r.tot.j, 3) + (isFE ? " %" : "");
        if (isFE && isFinite(d.r.tot.fe.sd)) { errs += whisk(cx, d.r.tot.fe.m - d.r.tot.fe.sd, d.r.tot.fe.m + d.r.tot.fe.sd, 7, "#c2410c", yBar); topV = Math.max(acc, d.r.tot.fe.m + d.r.tot.fe.sd); }
        col = isFE && d.r.tot.fe.m > 100 ? "#c2410c" : "#14213d";
      } else totTxt = sig(acc, 3) + (isFE ? " %" : "");
      bars += '<text x="' + cx + '" y="' + (yBar(topV) - 5) + '" text-anchor="middle" font-size="' + (avg ? 12 : 10) + '" font-weight="700" fill="' + col + '">' + totTxt + "</text>" +
        '<text x="' + cx + '" y="' + (T + ph + 14) + '" text-anchor="middle" font-size="10" fill="#3d4a5c">' + esc(d.t) + "</text>";
    });
    if (dual) {
      present.forEach(function (p) {
        var pts = seriesPts[p.id]; if (!pts || !pts.length) return;
        var dpath = pts.map(function (pt, i) { return (i ? "L" : "M") + pt.cx + " " + yR(pt.j); }).join(" ");
        lines += '<path d="' + dpath + '" fill="none" stroke="' + p.hex + '" stroke-width="1.8" stroke-dasharray="5 3" stroke-linecap="round"/>';
        pts.forEach(function (pt) {
          markers += '<circle cx="' + pt.cx + '" cy="' + yR(pt.j) + '" r="3.4" fill="#fff" stroke="' + p.hex + '" stroke-width="1.8" data-tip="' + pt.tip + '"><title>' + pt.tip + "</title></circle>";
          if (avg && isFinite(pt.sd) && pt.sd > 0) errs += whisk(pt.cx, pt.j - pt.sd, pt.j + pt.sd, 4, p.hex, yR);
        });
      });
    }
    var ref = isFE ? 100 : c.j;
    var refl = (ref && isFinite(ref) && isFE) ? '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + yL(ref) + '" y2="' + yL(ref) + '" stroke="#c2410c" stroke-width="1.2" stroke-dasharray="5 3"/>' +
      '<text x="' + (L + 4) + '" y="' + (yL(ref) - 3) + '" text-anchor="start" font-size="9" fill="#c2410c">100 %</text>' : "";
    var empty = data.length ? "" : '<text x="' + (L + pw / 2) + '" y="' + (T + ph / 2) + '" text-anchor="middle" font-size="12" fill="#8492a3">Enter ppm values to plot</text>';
    var axisR = dual ? '<line x1="' + (W - Rm) + '" x2="' + (W - Rm) + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#14213d"/>' +
      '<text transform="translate(' + (W - 8) + " " + (T + ph / 2) + ') rotate(90)" text-anchor="middle" font-size="11" font-weight="600" fill="#14213d">j_i (mA cm⁻²)</text>' : "";
    el.innerHTML = '<svg id="gc-chart-svg" data-view="' + (avg ? "avg" : "per") + '" data-mode="' + chartMode + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" font-family="IBM Plex Sans, sans-serif" width="100%">' +
      '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' + g + gR + refl + bars + lines + markers + errs + empty +
      '<line x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#14213d"/><line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '" stroke="#14213d"/>' + axisR +
      '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" font-weight="600" fill="#14213d">' + xTitle + "</text>" +
      '<text transform="translate(12 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" font-weight="600" fill="#14213d">' + (isFE ? "FE (%)" : "j_i (mA cm⁻²)") + "</text></svg>";
    /* Legend: only products present; distinguish FE (bars) vs j (line) */
    var leg = "";
    if (dual) {
      leg += '<span class="gc-leg gc-leg--group">FE (bars)</span>';
      present.forEach(function (p) {
        leg += '<span class="gc-leg"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + "</span>";
      });
      leg += '<span class="gc-leg gc-leg--group">j (line)</span>';
      present.forEach(function (p) {
        leg += '<span class="gc-leg"><span class="gc-line" style="border-color:' + p.hex + '"><span class="gc-line__dot" style="background:' + p.hex + ';border-color:' + p.hex + '"></span></span>' + esc(p.label) + "</span>";
      });
    } else {
      present.forEach(function (p) {
        leg += '<span class="gc-leg"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + "</span>";
      });
    }
    if (isFE) leg += '<span class="gc-leg"><span class="gc-dash"></span>100 % ref</span>';
    if (avg) leg += '<span class="gc-leg">error bars: ± 1 SD (n − 1)</span>';
    $("gc-legend").innerHTML = leg;
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
      var tag = p.phase === "liquid" ? (p.detector || "liq") : "GC";
      return '<div class="gc-prod"><span class="gc-dot" style="background:' + p.hex + '"></span>' +
        '<input class="input" aria-label="Product name" data-pk="' + k + '" data-f="name" value="' + esc(p.label) + '">' +
        '<input class="input" aria-label="n electrons" inputmode="numeric" data-pk="' + k + '" data-f="n" value="' + p.n + '" title="electrons transferred (n)">' +
        '<span class="gc-phase" title="' + esc(p.formula || "") + '">' + esc(tag) + '</span>' +
        '<button type="button" class="gc-x" data-rmp="' + k + '" aria-label="Remove product">×</button></div>';
    }).join("");
    renderPresetSelect();
    renderLiquid();
  }
  function renderPresetSelect() {
    var sel = $("gc-preset-select"); if (!sel) return;
    var used = {}; S.products.forEach(function (p) { used[p.id] = true; });
    var gas = "", liq = "";
    PRESET_ORDER.forEach(function (id) {
      var P = PRESETS[id]; if (!P || used[id]) return;
      var opt = '<option value="' + id + '">' + esc(P.label) + " (n=" + P.n + ")</option>";
      if (P.phase === "liquid") liq += opt; else gas += opt;
    });
    sel.innerHTML = '<option value="">+ Add product…</option>' +
      (gas ? '<optgroup label="Gas (GC)">' + gas + "</optgroup>" : "") +
      (liq ? '<optgroup label="Liquid (HPLC / HSGC)">' + liq + "</optgroup>" : "") +
      '<option value="custom">+ Custom</option>';
  }
  function renderLiquid() {
    var box = $("gc-liquid"); if (!box) return;
    var liquids = S.products.filter(function (p) { return !isGas(p); });
    if (!liquids.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    var rows = liquids.map(function (p) {
      var slot = S.liq[p.id] || { we: "", ce: "" };
      return '<label class="gc-cell"><span class="gc-cell__lab"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + " WE (μM)</span>" +
        '<input class="input" inputmode="decimal" data-liq="' + p.id + '" data-side="we" value="' + esc(slot.we) + '" placeholder="μM">' +
        '<span class="gc-cell__out" id="gc-lo-' + p.id + '">FE —</span></label>' +
        '<label class="gc-cell"><span class="gc-cell__lab">' + esc(p.label) + " CE (μM)</span>" +
        '<input class="input" inputmode="decimal" data-liq="' + p.id + '" data-side="ce" value="' + esc(slot.ce == null ? "" : slot.ce) + '" placeholder="μM"></label>';
    }).join("");
    box.innerHTML = '<header class="calc-card__header" style="padding:0 0 8px"><h3 class="calc-card__title" style="font-size:1rem">Liquid products</h3>' +
      '<p class="calc-card__desc" style="margin:0">FE = n·F·(c_WE·V_W + c_CE·V_C)/Q · 100 (sheet formula). Concentrations in μM, volumes in mL, Q in C.</p></header>' +
      '<div class="gc-grid">' +
      '<label class="field"><span class="field__label">Total charge Q (C)</span><input class="input" inputmode="decimal" id="gc-Q" value="' + esc(S.Q) + '"></label>' +
      '<label class="field"><span class="field__label">V_W catholyte (mL)</span><input class="input" inputmode="decimal" id="gc-Vw" value="' + esc(S.Vw) + '"></label>' +
      '<label class="field"><span class="field__label">V_C anolyte (mL)</span><input class="input" inputmode="decimal" id="gc-Vc" value="' + esc(S.Vc) + '"></label>' +
      '</div><div class="gc-inj__rows" style="padding-top:8px">' + rows + "</div>";
    ["Q", "Vw", "Vc"].forEach(function (k) {
      var el = $("gc-" + k); if (!el || el._bound) return;
      el._bound = true;
      el.addEventListener("input", function (e) { S[k] = e.target.value; update(); });
    });
  }
  function renderInj() {
    var gases = S.products.filter(isGas);
    $("gc-injections").innerHTML = S.inj.map(function (inj, k) {
      return '<div class="gc-inj" data-k="' + k + '"><div class="gc-inj__top"><span class="gc-inj__title">#' + (k + 1) + '</span>' +
        '<label class="sr-only" for="gc-t-' + k + '">Injection time (min)</label>' +
        '<input class="input gc-inj__t" id="gc-t-' + k + '" inputmode="decimal" data-ik="' + k + '" data-f="t" value="' + esc(inj.t) + '" placeholder="t (min)"' + (inj.manual ? "" : " readonly") + '>' +
        '<span class="field__label">min</span><button type="button" class="gc-edit' + (inj.manual ? " is-on" : "") + '" data-man="' + k + '" aria-pressed="' + !!inj.manual + '" title="Edit time manually">' + (inj.manual ? "manual" : "edit") + '</button><span class="gc-inj__tot" id="gc-it-' + k + '">—</span>' +
        '<button type="button" class="gc-x" data-rmi="' + k + '" aria-label="Remove injection">×</button></div>' +
        '<div class="gc-inj__rows">' + (S.imode === "j"
          ? '<label class="gc-cell gc-cell--cur"><span class="gc-cell__lab">|j| (mA cm⁻²)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="j" value="' + esc(inj.j == null ? "" : inj.j) + '" placeholder="' + esc(S.j) + '"><span class="gc-cell__out" id="gc-c-' + k + '">I —</span></label>'
          : '<label class="gc-cell gc-cell--cur"><span class="gc-cell__lab">|I| (mA)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="I" value="' + esc(inj.I == null ? "" : inj.I) + '" placeholder="' + esc(S.Itot) + '"><span class="gc-cell__out" id="gc-c-' + k + '">j —</span></label>') + gases.map(function (p) {
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
    var liqRes = computeLiquid(c);
    results.forEach(function (r, k) {
      S.products.forEach(function (p) {
        if (!isGas(p)) return;
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
        var x = isGas(p) ? latest.r.per[p.id] : liqRes[p.id]; if (!x) return "";
        return '<span class="gc-chip"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(p.label) + " " + sig(x.fe, 3) + "%</span>";
      }).join("");
      Object.keys(liqRes).forEach(function (id) {
        var o = $("gc-lo-" + id), L = liqRes[id];
        if (o) o.innerHTML = L ? "FE <b>" + sig(L.fe, 3) + "%</b> · j " + sig(L.j, 3) : "FE —";
      });
      sum.classList.toggle("is-warning", tot > 100);
      if (tot > 100) { flag.hidden = false; flag.className = "gc-flag warn"; flag.textContent = "Total FE > 100% — check flow calibration, current, or GC response factors."; }
      else if (tot < 90) { flag.hidden = false; flag.className = "gc-flag note"; flag.textContent = "Total FE < 90% — liquid products (formate, EtOH, …) or losses unaccounted."; }
      else flag.hidden = true;
    } else {
      $("gc-total").textContent = "—"; $("gc-unacc").textContent = "—"; $("gc-sum-bar").innerHTML = ""; $("gc-sum-chips").innerHTML = "";
      $("gc-sum-label").textContent = "enter a ppm value"; flag.hidden = true; sum.classList.remove("is-warning");
    }
    // table
    var gases = S.products.filter(isGas);
    var head = "<tr><th>t_inj (min)</th>" + gases.map(function (p) { return "<th>FE_" + esc(p.name) + " (%)</th>"; }).join("") + "<th>FE_total (%)</th></tr>";
    var rows = "", sums = {}, cnt = {}, tsum = 0, tc = 0;
    order.forEach(function (o) {
      var r = results[o.i]; if (!r.any) return;
      rows += "<tr><td>" + esc(o.v.t) + "</td>" + gases.map(function (p) {
        var x = r.per[p.id]; if (x) { sums[p.id] = (sums[p.id] || 0) + x.fe; cnt[p.id] = (cnt[p.id] || 0) + 1; }
        return "<td>" + (x ? sig(x.fe, 3) : "") + "</td>";
      }).join("") + '<td class="' + (r.total > 100 ? "warn" : "") + '">' + sig(r.total, 3) + "</td></tr>";
      tsum += r.total; tc++;
    });
    if (tc) {
      var AG = aggregate(order.filter(function (o) { return results[o.i].any; }).map(function (o) { return { t: o.v.t, r: results[o.i] }; }), c);
      rows += '<tr class="avg"><td>mean ± SD (n = ' + tc + ')</td>' + gases.map(function (p) { var x = AG.per[p.id]; return "<td>" + (x ? pm({ m: x.fe, sd: x.sd_fe }, 3) : "") + "</td>"; }).join("") +
        "<td>" + pm(AG.tot.fe, 3) + "</td></tr>";
    }
    var liqKeys = Object.keys(liqRes);
    if (liqKeys.length) {
      rows += '<tr class="avg"><td>liquid (Q-based)</td>' + gases.map(function () { return "<td></td>"; }).join("") + "<td></td></tr>";
      S.products.filter(function (p) { return !isGas(p) && liqRes[p.id]; }).forEach(function (p) {
        var L = liqRes[p.id];
        rows += "<tr><td>" + esc(p.label) + "</td>" + gases.map(function () { return "<td></td>"; }).join("") + "<td>" + sig(L.fe, 3) + "</td></tr>";
      });
    }
    $("gc-table").innerHTML = "<thead>" + head + "</thead><tbody>" + (rows || '<tr><td colspan="99" style="text-align:left">No data yet</td></tr>') + "</tbody>";
    renderChart(results, order, c, liqRes);
    GC._last = { c: c, results: results, order: order, liq: liqRes };
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
    function addProduct(p) {
      if (p === "custom") {
        var id = "X" + Date.now().toString(36);
        S.products.push({ id: id, name: "custom", label: "custom", n: 2, phase: "gas", detector: "GC", formula: "", hex: CUSTOM_HEX[S.products.length % CUSTOM_HEX.length] });
      } else {
        if (!p || S.products.some(function (q) { return q.id === p; })) return;
        var item = prodFromPreset(p);
        S.products.push(item);
        if (item.phase === "liquid") S.liq[p] = S.liq[p] || { we: "", ce: "" };
      }
      renderProducts(); renderInj(); update();
    }
    var presetBox = $("gc-presets");
    if (presetBox) presetBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-p]"); if (!b) return; addProduct(b.dataset.p);
    });
    var presetSel = $("gc-preset-select");
    if (presetSel) presetSel.addEventListener("change", function (e) {
      var v = e.target.value; if (!v) return; addProduct(v); e.target.value = "";
    });
    var liqBox = $("gc-liquid");
    if (liqBox) liqBox.addEventListener("input", function (e) {
      var id = e.target.dataset.liq; if (!id) return;
      if (!S.liq[id]) S.liq[id] = { we: "", ce: "" };
      S.liq[id][e.target.dataset.side] = e.target.value; update();
    });
    $("gc-products").addEventListener("input", function (e) {
      var k = e.target.dataset.pk; if (k == null) return; var p = S.products[k];
      if (e.target.dataset.f === "n") p.n = pnum(e.target.value) || 0;
      else { p.label = e.target.value; p.name = e.target.value.replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); }).replace(/[^A-Za-z0-9_]/g, "") || "custom"; }
      renderInj(); update();
    });
    $("gc-products").addEventListener("click", function (e) {
      var k = e.target.dataset.rmp; if (k == null) return;
      var gone = S.products.splice(k, 1)[0];
      if (gone && S.liq) delete S.liq[gone.id];
      renderProducts(); renderInj(); update();
    });
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
