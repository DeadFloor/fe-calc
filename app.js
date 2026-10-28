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
    /* name = chemical name (IUPAC/common); label = unicode formula for "Name (formula)" display */
    H2: { name: "Hydrogen", label: "H₂", formula: "H2", n: 2, phase: "gas", detector: "GC", hex: "#3b82c4" },
    CO: { name: "Carbon monoxide", label: "CO", formula: "CO", n: 2, phase: "gas", detector: "GC", hex: "#f28c28" },
    CH4: { name: "Methane", label: "CH₄", formula: "CH4", n: 8, phase: "gas", detector: "GC", hex: "#2f9e6e" },
    C2H4: { name: "Ethylene", label: "C₂H₄", formula: "C2H4", n: 12, phase: "gas", detector: "GC", hex: "#8b5cf6" },
    C2H6: { name: "Ethane", label: "C₂H₆", formula: "C2H6", n: 14, phase: "gas", detector: "GC", hex: "#0891b2" },
    C3H8: { name: "Propane", label: "C₃H₈", formula: "C3H8", n: 20, phase: "gas", detector: "GC", hex: "#a16207" },
    C3H6: { name: "Propylene", label: "C₃H₆", formula: "C3H6", n: 18, phase: "gas", detector: "GC", hex: "#16a34a" },
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
    c2C6H12: { name: "cis-2-Hexene", label: "c-2-C₆H₁₂", formula: "C6H12", n: 36, phase: "gas", detector: "GC", hex: "#334155" },
    t2C6H12: { name: "trans-2-Hexene", label: "t-2-C₆H₁₂", formula: "C6H12", n: 36, phase: "gas", detector: "GC", hex: "#9f1239" },
    HCOO: { name: "Formate", label: "HCOO⁻", formula: "CH2O2", n: 2, phase: "liquid", detector: "HPLC", hex: "#f59e0b" },
    AcO: { name: "Acetate", label: "CH₃COO⁻", formula: "C2H4O2", n: 8, phase: "liquid", detector: "HPLC", hex: "#14b8a6" },
    MeCHO: { name: "Acetaldehyde", label: "CH₃CHO", formula: "C2H4O", n: 10, phase: "liquid", detector: "HSGC", hex: "#f43f5e" },
    EtCHO: { name: "Propionaldehyde (propanal)", label: "C₃H₆O", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#6366f1" },
    Me2CO: { name: "Acetone", label: "CH₃COCH₃", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#84cc16" },
    BuCHO: { name: "Butyraldehyde (butanal)", label: "C₄H₈O", formula: "C4H8O", n: 22, phase: "liquid", detector: "HSGC", hex: "#06b6d4" },
    MeOH: { name: "Methanol", label: "CH₃OH", formula: "CH4O", n: 6, phase: "liquid", detector: "HSGC", hex: "#d946ef" },
    iPrOH: { name: "2-Propanol (isopropanol)", label: "C₃H₈O", formula: "C3H8O", n: 18, phase: "liquid", detector: "HSGC", hex: "#f97316" },
    EtOH: { name: "Ethanol", label: "C₂H₅OH", formula: "C2H6O", n: 12, phase: "liquid", detector: "HSGC", hex: "#64748b" },
    PeCHO: { name: "Pentanal (valeraldehyde)", label: "C₅H₁₀O", formula: "C5H10O", n: 28, phase: "liquid", detector: "HSGC", hex: "#1e40af" },
    nPrOH: { name: "1-Propanol", label: "C₃H₇OH", formula: "C3H8O", n: 18, phase: "liquid", detector: "HSGC", hex: "#166534" },
    AllylOH: { name: "Allyl alcohol", label: "C₃H₅OH", formula: "C3H6O", n: 16, phase: "liquid", detector: "HSGC", hex: "#6d28d9" },
    "1BuOH": { name: "1-Butanol", label: "C₄H₉OH", formula: "C4H10O", n: 24, phase: "liquid", detector: "HSGC", hex: "#9a3412" },
    "2Me1BuOH": { name: "2-Methyl-1-butanol", label: "C₅H₁₁OH", formula: "C5H12O", n: 30, phase: "liquid", detector: "HSGC", hex: "#115e59" },
    PeOH: { name: "1-Pentanol", label: "C₅H₁₁OH", formula: "C5H12O", n: 30, phase: "liquid", detector: "HSGC", hex: "#1e293b" },
    "1HexOH": { name: "1-Hexanol", label: "C₆H₁₃OH", formula: "C6H14O", n: 36, phase: "liquid", detector: "HSGC", hex: "#b45309" }
  };
  var CUSTOM_HEX = ["#64748b", "#db2777", "#0891b2", "#a16207", "#6366f1", "#14b8a6"];
  var PRESET_ORDER = ["H2","CO","CH4","C2H4","C2H6","C3H8","C3H6","iC4H10","nC4H10","t2C4H8","1C4H8","iC4H8","c2C4H8","iC5H12","nC5H12","C4H6","t2C5H10","2Me2C4","1C5H10","c2C5H10","C6H14","1C6H12","c2C6H12","t2C6H12","HCOO","AcO","MeCHO","EtCHO","Me2CO","BuCHO","MeOH","iPrOH","EtOH","PeCHO","nPrOH","AllylOH","1BuOH","2Me1BuOH","PeOH","1HexOH"];

  /* Display: "Full name (formula)". Chart segments may use formula alone when space is tight. */
  function prodSym(p) { return (p && (p.label || p.formula || p.name)) || ""; }
  function prodFull(p) { return (p && (p.name || p.label)) || ""; }
  function prodDisplay(p) {
    if (!p) return "";
    var n = prodFull(p), s = prodSym(p);
    if (!n) return s;
    if (!s || s === n) return n;
    return n + " (" + s + ")";
  }
  function prodExportName(p) { return prodDisplay(p); }

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
  /* iR / RHE — Faraday guidance.
     Convention: cathodic current is negative. App stores |I|; equivalent forms:
       E_corr = E_applied − I_signed·Ru_unc   (I_signed = −|I|)
       E_corr = E_applied + |I|·Ru_unc
     Ru_unc = Ru·(1 − f_comp) with f_comp in [0,1]; if f_comp ≥ 1 (100%), skip correction. */
  var EREF = {
    agcl_sat: { label: "Ag/AgCl sat. KCl", E0: 0.197 },
    agcl_3m: { label: "Ag/AgCl 3 M KCl", E0: 0.210 },
    agcl_35m: { label: "Ag/AgCl 3.5 M KCl", E0: 0.205 },
    hgoh: { label: "Hg/HgO 1 M KOH/NaOH", E0: 0.098 },
    rhe: { label: "vs RHE already", E0: 0, noPh: true },
    custom: { label: "Custom", E0: null }
  };
  function ruUnc(Ru_ohm, f_comp_pct) {
    var f = (f_comp_pct == null || f_comp_pct === "") ? 0 : Number(f_comp_pct);
    if (!isFinite(Ru_ohm) || Ru_ohm < 0) return NaN;
    if (!isFinite(f) || f < 0) f = 0;
    if (f >= 100) return 0; /* skip correction sentinel handled by caller via f>=100 */
    if (f > 95) f = 95;
    return Ru_ohm * (1 - f / 100);
  }
  function eCorr(E_applied, I_A_abs, Ru_ohm, f_comp_pct) {
    /* I_A_abs = |I| in amperes. Cathodic: E_corr = E_app + |I|·Ru_unc */
    if (!isFinite(E_applied)) return NaN;
    var f = (f_comp_pct == null || f_comp_pct === "") ? 0 : Number(f_comp_pct);
    if (isFinite(f) && f >= 100) return E_applied;
    var ru = ruUnc(Ru_ohm, f_comp_pct);
    if (!isFinite(ru) || !isFinite(I_A_abs)) return NaN;
    return E_applied + Math.abs(I_A_abs) * ru;
  }
  function nernstSlope(mode, T_K) {
    if (mode === "nernst") {
      var T = isFinite(T_K) ? T_K : 298.15;
      return 2.303 * R * T / F;
    }
    return 0.0591;
  }
  function eRhe(E_corr, E0_ref, pH, slope, alreadyRhe) {
    if (!isFinite(E_corr)) return NaN;
    if (alreadyRhe) return E_corr;
    if (!isFinite(E0_ref)) return NaN;
    if (!isFinite(pH)) return NaN; /* need pH for RHE */
    return E_corr + E0_ref + slope * pH;
  }
  /* t_k (s) = t1_s + (k-1)·(analysis_min·60 + postrun_s); k is 0-based here */
  function schedTime(k, sc) {
    var p = function (v) { return parseFloat(String(v).replace(",", ".")); };
    return p(sc.t1) + k * (p(sc.ana) * 60 + p(sc.post));
  }
  function fmtT(t_s) {
    var s = Number(String(t_s == null ? "" : t_s).replace(",", "."));
    if (!isFinite(s)) return "—";
    var m = s / 60;
    var ss = (Math.abs(s) >= 100 || s === 0) ? String(+s.toPrecision(6)) : String(+s.toPrecision(4));
    var mm = String(+m.toPrecision(3));
    return ss + " s (" + mm + " min)";
  }
  var GC = { R: R, F: F, molarFlow: molarFlow, fe: fe, feLiquid: feLiquid, schedTime: schedTime, fmtT: fmtT, prodDisplay: prodDisplay, prodSym: prodSym, ruUnc: ruUnc, eCorr: eCorr, nernstSlope: nernstSlope, eRhe: eRhe, EREF: EREF, PRESETS: PRESETS };
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
  var SCHEMA = 5; /* 5 = full chemical names Name (formula) */
  function defaults() {
    return {
      schema: SCHEMA,
      technique: "CA", cpmode: "I",
      Eset: "-1.0", Iset: "10", jset: "10",
      eref: "agcl_sat", E0: "0.197",
      pH: "", slopeMode: "0591",
      irMode: "ci", Ru: "", fComp: "0",
      notes: "",
      imode: "j", j: "", area: "1", Itot: "", flow: "20", ref: "std", T: "298.15", P: "101325",
      Q: "", Vw: "15", Vc: "15",
      liq: {},
      products: PRESET_ORDER.map(prodFromPreset),
      sched: { t1: "900", ana: "12", post: "180", count: 4 },
      inj: [{ ppm: {} }, { ppm: {} }, { ppm: {} }, { ppm: {} }]
    };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch (e) { S = defaults(); }
  if (typeof location !== "undefined" && location.hash.indexOf("#demo") === 0) {
    S = defaults();
    S.technique = "CA"; S.Eset = "-1.00"; S.eref = "agcl_sat"; S.pH = "6.8"; S.Ru = "10"; S.fComp = "0";
    S.notes = "Demo run — mild bubbling; no flooding.";
    S.inj = [{ j: "100.4", E: "-1.00", ppm: { H2: "7200", CO: "16800", CH4: "520", C2H4: "1050" } },
      { j: "98.7", E: "-1.00", ppm: { H2: "7900", CO: "16100", CH4: "560", C2H4: "1010" } },
      { j: "101.6", E: "-1.00", ppm: { H2: "8600", CO: "15400", CH4: "610", C2H4: "980" } },
      { j: "99.2", E: "-1.00", ppm: { H2: "9100", CO: "14900", CH4: "640", C2H4: "960" } }];
  }
  function migrate() {
    if (!S.sched) S.sched = { t1: "900", ana: "12", post: "180", count: S.inj.length || 4 };
    if (!S.liq) S.liq = {};
    if (S.Q == null) S.Q = "";
    if (S.Vw == null) S.Vw = "15";
    if (S.Vc == null) S.Vc = "15";
    if (!S.technique) S.technique = "CA";
    if (!S.cpmode) S.cpmode = "I";
    if (S.Eset == null) S.Eset = "";
    if (S.Iset == null) S.Iset = S.Itot || "";
    if (S.jset == null) S.jset = S.j || "";
    if (!S.imode) S.imode = "j";
    if (!S.eref) S.eref = "agcl_sat";
    if (S.E0 == null) S.E0 = "0.197";
    if (S.pH == null) S.pH = "";
    if (!S.slopeMode) S.slopeMode = "0591";
    if (!S.irMode) S.irMode = "ci";
    if (S.Ru == null) S.Ru = "";
    if (S.fComp == null) S.fComp = "0";
    if (S.notes == null) S.notes = "";
    /* Schema < 4: schedule t1/post and auto inj.t were in minutes → convert to seconds. */
    if (!(S.schema >= 4)) {
      var sc0 = S.sched || {};
      var t1m = parseFloat(String(sc0.t1 == null ? "" : sc0.t1).replace(",", "."));
      var postm = parseFloat(String(sc0.post == null ? "" : sc0.post).replace(",", "."));
      if (isFinite(t1m)) S.sched.t1 = String(+(t1m * 60).toPrecision(8));
      if (isFinite(postm)) S.sched.post = String(+(postm * 60).toPrecision(8));
      (S.inj || []).forEach(function (r) {
        var tv = parseFloat(String(r.t == null ? "" : r.t).replace(",", "."));
        if (isFinite(tv)) r.t = String(+(tv * 60).toPrecision(8));
      });
    }
    /* One-shot: expand saved product lists to the full workbook catalog, keeping user values. */
    if (!(S.schema >= SCHEMA)) {
      var byId = {};
      (S.products || []).forEach(function (p) { byId[p.id] = p; });
      var next = [];
      PRESET_ORDER.forEach(function (id) {
        if (byId[id]) {
          var keep = byId[id], P = PRESETS[id];
          if (!keep.phase) keep.phase = P.phase;
          if (!keep.detector) keep.detector = P.detector;
          if (!keep.formula) keep.formula = P.formula;
          if (!keep.hex) keep.hex = P.hex;
          keep.name = P.name;
          keep.label = P.label;
          if (keep.n == null) keep.n = P.n;
          next.push(keep);
          delete byId[id];
        } else next.push(prodFromPreset(id));
      });
      Object.keys(byId).forEach(function (id) { next.push(byId[id]); });
      S.products = next;
      S.schema = SCHEMA;
    }
    S.products.forEach(function (p) {
      var P = PRESETS[p.id];
      if (P) {
        /* Refresh catalog spelling on upgrade; keep custom user edits only for unknown ids */
        p.name = P.name;
        p.label = P.label;
        p.formula = P.formula;
        if (p.n == null) p.n = P.n;
        if (!p.phase) p.phase = P.phase;
        if (!p.detector) p.detector = P.detector;
        if (!p.hex) p.hex = P.hex;
      } else {
        if (!p.phase) p.phase = "gas";
      }
      if (p.phase === "liquid" && !S.liq[p.id]) S.liq[p.id] = { we: "", ce: "" };
    });
    S.inj.forEach(function (r) { if (r.t != null && r.manual == null) r.manual = false; if (!r.ppm) r.ppm = {}; });
    applySched();
  }
  function applySched() {
    var n = Math.max(1, Math.min(6, parseInt(S.sched.count, 10) || 1)); S.sched.count = n;
    while (S.inj.length < n) S.inj.push({ ppm: {} });
    S.inj.length = n;
    S.inj.forEach(function (r, k) { if (!r.manual) { var v = schedTime(k, S.sched); r.t = isFinite(v) ? String(+v.toPrecision(6)) : ""; } });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (GC.onChange) GC.onChange(); }
  function $(id) { return document.getElementById(id); }

  function cond() {
    var A = pnum(S.area);
    var T = S.ref === "std" ? 273.15 : pnum(S.T), P = S.ref === "std" ? 101325 : pnum(S.P);
    var nd = molarFlow(pnum(S.flow), T, P);
    /* No global default j/I — current is per-injection (CA) or CP setpoint. */
    return { I_A: NaN, I_mA: NaN, j: NaN, ndot: nd, area: A, ok: isFinite(nd) && nd > 0 && isFinite(A) && A > 0 };
  }
  /* per-row current: CA uses measured j/I only (blank → no calc); CP uses setpoint (or row override) */
  function rowCur(inj, c) {
    var A = pnum(S.area), jr, Ir;
    if (S.technique === "CP") {
      if (S.cpmode === "j") {
        jr = isFinite(pnum(inj.j)) ? Math.abs(pnum(inj.j)) : Math.abs(pnum(S.jset));
        Ir = jr * A;
      } else {
        Ir = isFinite(pnum(inj.I)) ? Math.abs(pnum(inj.I)) : Math.abs(pnum(S.Iset));
        jr = A > 0 ? Ir / A : NaN;
      }
    } else if (S.imode === "j") {
      jr = Math.abs(pnum(inj.j)); Ir = jr * A;
    } else {
      Ir = Math.abs(pnum(inj.I)); jr = A > 0 ? Ir / A : NaN;
    }
    return { j: jr, I_A: Ir / 1000, ok: isFinite(Ir) && Ir > 0 && isFinite(c.ndot) && c.ndot > 0 && isFinite(A) && A > 0 };
  }
  function resolveE0() {
    var key = S.eref || "agcl_sat", meta = EREF[key] || EREF.agcl_sat;
    if (key === "custom") return { E0: pnum(S.E0), noPh: false, label: "Custom" };
    return { E0: meta.E0, noPh: !!meta.noPh, label: meta.label };
  }
  function injEapplied(inj) {
    if (S.technique === "CP") return isFinite(pnum(inj.E)) ? pnum(inj.E) : NaN;
    return isFinite(pnum(inj.E)) ? pnum(inj.E) : pnum(S.Eset);
  }
  function computeIRRow(inj, rc) {
    var Eapp = injEapplied(inj), I_A = rc.I_A, Ru = pnum(S.Ru), f = pnum(S.fComp);
    if (!isFinite(f)) f = 0;
    var ru, Ec, ci = (S.irMode === "ci");
    if (ci) {
      /* Current interrupt: compensated in real time — no post-run correction */
      ru = 0; Ec = Eapp;
    } else {
      ru = (isFinite(f) && f >= 100) ? 0 : ruUnc(Ru, f);
      Ec = eCorr(Eapp, I_A, Ru, f);
    }
    var T = S.ref === "std" ? 298.15 : pnum(S.T);
    if (S.slopeMode === "nernst") T = pnum(S.T) || 298.15;
    var slope = nernstSlope(S.slopeMode, T);
    var ref = resolveE0(), pH = pnum(S.pH);
    var Erhe = ref.noPh ? (isFinite(Ec) ? Ec : NaN) : eRhe(Ec, ref.E0, pH, slope, false);
    return {
      E_applied: Eapp, I_mA: isFinite(rc.I_A) ? rc.I_A * 1000 : NaN, I_A: rc.I_A, j: rc.j,
      Ru: ci ? 0 : Ru, fComp: ci ? 0 : f, Ru_unc: ru,
      E_corr: Ec, E_RHE: Erhe, E0: ref.E0, slope: slope, refLabel: ref.label, noPh: ref.noPh,
      ci: ci
    };
  }
  function isGas(p) { return (p.phase || "gas") !== "liquid"; }
  function compute(inj, c0) {
    var rc = rowCur(inj, c0), c = { ok: rc.ok, ndot: c0.ndot, I_A: rc.I_A, j: rc.j };
    var out = { per: {}, total: 0, any: false, j: rc.j, I_mA: rc.I_A * 1000, ir: computeIRRow(inj, rc) };
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
    var avg = chartView === "avg" && data.length > 0, xTitle = "Injection time (s)";
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
          ? esc(prodDisplay(p)) + " mean (n = " + x.n + "): FE " + pm({ m: x.fe, sd: x.sd_fe }, 3) + " %, j " + pm({ m: x.j, sd: x.sd_j }, 3) + " mA cm⁻²"
          : esc(prodDisplay(p)) + " @ " + esc(fmtT(d.t)) + ": FE " + sig(x.fe, 3) + " %, j " + sig(x.j, 3) + " mA cm⁻²";
        bars += '<rect class="gc-seg" x="' + (cx - bw / 2) + '" y="' + y0 + '" width="' + bw + '" height="' + Math.max(hh, 0) + '" fill="' + p.hex + '" stroke="#fff" stroke-width="0.6" data-tip="' + lab + '"><title>' + lab + "</title></rect>";
        if (avg && isFinite(x["sd_" + key])) errs += whisk(cx + bw / 2 - 10, acc - x["sd_" + key], acc + x["sd_" + key], 4, "#14213d", yBar);
        /* Segment label: product name + value when tall enough */
        if (hh > 14) {
          /* Prefer formula on narrow segments; full name when the bar is wide enough */
          var segLab = (bw >= 100 && hh > 22) ? prodDisplay(p) : prodSym(p);
          var txt = esc(segLab) + " " + sig(vv, 3);
          var fill = "#ffffff";
          var lum = (function (h) { h = h.replace("#",""); if (h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16); return 0.299*r+0.587*g+0.114*b; })(p.hex);
          if (lum > 160) fill = "#14213d";
          var fs = txt.length > 14 && bw < 110 ? 8 : 9;
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
    /* Legend: only products with data; compact when many (one swatch = FE bar + j line). */
    var leg = "";
    if (dual) leg += '<span class="gc-leg gc-leg--group">■ FE · ┄ j</span>';
    present.forEach(function (p) {
      if (dual) {
        leg += '<span class="gc-leg"><span class="gc-dot" style="background:' + p.hex + '"></span>' +
          '<span class="gc-line" style="border-color:' + p.hex + '"><span class="gc-line__dot" style="background:' + p.hex + ';border-color:' + p.hex + '"></span></span>' +
          esc(prodDisplay(p)) + "</span>";
      } else {
        leg += '<span class="gc-leg"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(prodDisplay(p)) + "</span>";
      }
    });
    if (isFE) leg += '<span class="gc-leg"><span class="gc-dash"></span>100 % ref</span>';
    if (avg) leg += '<span class="gc-leg">± 1 SD (n − 1)</span>';
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

  function prodCard(p, k) {
    var tag = p.phase === "liquid" ? (p.detector || "liq") : "GC";
    return '<div class="gc-prod"><span class="gc-dot" style="background:' + p.hex + '"></span>' +
      '<span class="gc-prod__name" title="' + esc(prodDisplay(p)) + '">' + esc(prodDisplay(p)) + '</span>' +
      '<input class="input gc-prod__n" aria-label="n electrons" inputmode="numeric" data-pk="' + k + '" data-f="n" value="' + p.n + '" title="electrons transferred (n)">' +
      '<span class="gc-phase" title="' + esc(prodDisplay(p)) + '">' + esc(tag) + '</span>' +
      '<button type="button" class="gc-x" data-rmp="' + k + '" aria-label="Remove ' + esc(prodDisplay(p)) + '">×</button></div>';
  }
  function renderProducts() {
    var gasHtml = "", liqHtml = "", gN = 0, lN = 0;
    S.products.forEach(function (p, k) {
      if (isGas(p)) { gasHtml += prodCard(p, k); gN++; }
      else { liqHtml += prodCard(p, k); lN++; }
    });
    $("gc-products").innerHTML =
      '<details class="gc-fold" open><summary class="gc-fold__sum">Gas / GC products <span class="gc-fold__n">' + gN + "</span></summary>" +
      '<div class="gc-prod-scroll">' + (gasHtml || '<p class="gc-hint">None — add from the catalog.</p>') + "</div></details>" +
      '<details class="gc-fold" open><summary class="gc-fold__sum">Liquid products <span class="gc-fold__n">' + lN + "</span></summary>" +
      '<div class="gc-prod-scroll">' + (liqHtml || '<p class="gc-hint">None — add formate, alcohols, …</p>') + "</div></details>";
    renderPresetSelect();
    renderLiquid();
  }
  function renderPresetSelect() {
    var sel = $("gc-preset-select"); if (!sel) return;
    var used = {}; S.products.forEach(function (p) { used[p.id] = true; });
    var gas = "", liq = "";
    PRESET_ORDER.forEach(function (id) {
      var P = PRESETS[id]; if (!P || used[id]) return;
      var opt = '<option value="' + id + '">' + esc(prodDisplay(P)) + " · n=" + P.n + "</option>";
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
      return '<label class="gc-cell gc-cell--compact"><span class="gc-cell__lab"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(prodDisplay(p)) + "</span>" +
        '<div class="gc-liq-pair">' +
        '<input class="input" inputmode="decimal" data-liq="' + p.id + '" data-side="we" value="' + esc(slot.we) + '" placeholder="WE μM" aria-label="' + esc(prodDisplay(p)) + ' WE μM">' +
        '<input class="input" inputmode="decimal" data-liq="' + p.id + '" data-side="ce" value="' + esc(slot.ce == null ? "" : slot.ce) + '" placeholder="CE μM" aria-label="' + esc(prodDisplay(p)) + ' CE μM">' +
        '</div><span class="gc-cell__out" id="gc-lo-' + p.id + '">FE —</span></label>';
    }).join("");
    box.innerHTML = '<details class="gc-fold" open><summary class="gc-fold__sum">Liquid FE inputs <span class="gc-fold__n">' + liquids.length + "</span></summary>" +
      '<p class="gc-hint">FE = n·F·(c_WE·V_W + c_CE·V_C)/Q · 100. Concentrations μM, volumes mL, Q in C.</p>' +
      '<div class="gc-grid">' +
      '<label class="field"><span class="field__label">Total charge Q (C)</span><input class="input" inputmode="decimal" id="gc-Q" value="' + esc(S.Q) + '"></label>' +
      '<label class="field"><span class="field__label">V_W catholyte (mL)</span><input class="input" inputmode="decimal" id="gc-Vw" value="' + esc(S.Vw) + '"></label>' +
      '<label class="field"><span class="field__label">V_C anolyte (mL)</span><input class="input" inputmode="decimal" id="gc-Vc" value="' + esc(S.Vc) + '"></label>' +
      '</div><div class="gc-liq-scroll">' + rows + "</div></details>";
    ["Q", "Vw", "Vc"].forEach(function (k) {
      var el = $("gc-" + k); if (!el || el._bound) return;
      el._bound = true;
      el.addEventListener("input", function (e) { S[k] = e.target.value; update(); });
    });
  }
  var injTab = 0;
  function renderInj() {
    var gases = S.products.filter(isGas);
    var liquids = S.products.filter(function (p) { return !isGas(p); });
    if (injTab >= S.inj.length) injTab = Math.max(0, S.inj.length - 1);
    var tabs = S.inj.map(function (inj, k) {
      return '<button type="button" class="gc-inj-tab' + (k === injTab ? " is-active" : "") + '" data-inj-tab="' + k + '" aria-selected="' + (k === injTab) + '">#' + (k + 1) + '<span class="gc-inj-tab__t">' + esc(fmtT(inj.t)) + "</span></button>";
    }).join("");
    var inj = S.inj[injTab] || { ppm: {} }, k = injTab;
    var useJ = S.technique === "CP" ? S.cpmode === "j" : S.imode === "j";
    var phJ = useJ ? "e.g. 100" : "e.g. 10";
    var cur;
    if (S.technique === "CP") {
      var setLab = S.cpmode === "j" ? ("|j| set " + esc(S.jset || "—")) : ("|I| set " + esc(S.Iset || "—"));
      cur = '<label class="gc-ppm-row gc-ppm-row--cur"><span class="gc-ppm-row__name">E (V vs ref)</span>' +
        '<input class="input" inputmode="decimal" data-ik="' + k + '" data-f="E" value="' + esc(inj.E == null ? "" : inj.E) + '" placeholder="e.g. −1.00">' +
        '<span class="gc-cell__out" id="gc-c-' + k + '">' + setLab + "</span></label>";
    } else {
      cur = useJ
        ? '<label class="gc-ppm-row gc-ppm-row--cur"><span class="gc-ppm-row__name">|j| (mA cm⁻²)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="j" value="' + esc(inj.j == null ? "" : inj.j) + '" placeholder="' + phJ + '"><span class="gc-cell__out" id="gc-c-' + k + '">I —</span></label>'
        : '<label class="gc-ppm-row gc-ppm-row--cur"><span class="gc-ppm-row__name">|I| (mA)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="I" value="' + esc(inj.I == null ? "" : inj.I) + '" placeholder="' + phJ + '"><span class="gc-cell__out" id="gc-c-' + k + '">j —</span></label>';
    }
    function prodRow(p, kind) {
      if (kind === "gas") {
        return '<label class="gc-ppm-row"><span class="gc-ppm-row__name"><span class="gc-dot" style="background:' + p.hex + '"></span><span class="gc-ppm-row__label">' + esc(prodDisplay(p)) + '</span><span class="gc-ppm-row__n">n=' + esc(p.n) + "</span></span>" +
          '<input class="input" inputmode="decimal" data-ik="' + k + '" data-pid="' + p.id + '" value="' + esc(inj.ppm[p.id] == null ? "" : inj.ppm[p.id]) + '" placeholder="ppm" aria-label="' + esc(prodDisplay(p)) + ' ppm">' +
          '<span class="gc-ppm-row__out" id="gc-o-' + k + '-' + p.id + '">—</span></label>';
      }
      return "";
    }
    var gasBlock = gases.length
      ? '<div class="gc-ppm-group"><div class="gc-ppm-group__h">Gas products (GC ppm)</div>' + gases.map(function (p) { return prodRow(p, "gas"); }).join("") + "</div>"
      : "";
    var html = '<div class="gc-inj-panel">' +
      '<div class="gc-inj-tabs" role="tablist">' + tabs + "</div>" +
      '<div class="gc-inj" data-k="' + k + '">' +
      '<div class="gc-inj__top"><span class="gc-inj__title">Injection #' + (k + 1) + "</span>" +
      '<label class="sr-only" for="gc-t-' + k + '">Injection time (s)</label>' +
      '<input class="input gc-inj__t" id="gc-t-' + k + '" inputmode="decimal" data-ik="' + k + '" data-f="t" value="' + esc(inj.t) + '" placeholder="t (s)"' + (inj.manual ? "" : " readonly") + ">" +
      '<span class="gc-inj__tunit" id="gc-tunit-' + k + '">' + esc(fmtT(inj.t)) + "</span>" +
      '<button type="button" class="gc-edit' + (inj.manual ? " is-on" : "") + '" data-man="' + k + '" aria-pressed="' + !!inj.manual + '" title="Edit time manually">' + (inj.manual ? "manual" : "edit") + "</button>" +
      '<span class="gc-inj__tot" id="gc-it-' + k + '">—</span>' +
      '<button type="button" class="gc-x" data-rmi="' + k + '" aria-label="Remove injection">×</button></div>' +
      '<div class="gc-inj__cur">' + cur + "</div>" +
      gasBlock +
      '<svg class="gc-bar" id="gc-b-' + k + '" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"></svg></div></div>';
    $("gc-injections").innerHTML = html;
  }
  function update() {
    var c = cond();
    var results = S.inj.map(function (inj) { return compute(inj, c); });
    var repJ = NaN, repI = NaN;
    results.forEach(function (r) {
      if (r && isFinite(r.j) && r.j > 0) { repJ = r.j; repI = r.I_mA; }
    });
    var cLiq = { j: isFinite(repJ) ? repJ : NaN, ndot: c.ndot, ok: c.ok };
    $("gc-I").textContent = isFinite(repI) ? sig(repI, 4) + " mA" : "—";
    $("gc-ndot").textContent = c.ok ? sig(c.ndot * 1e6, 4) + " µmol s⁻¹" : "—";
    var liqRes = computeLiquid(cLiq);
    results.forEach(function (r, k) {
      S.products.forEach(function (p) {
        if (!isGas(p)) return;
        var o = $("gc-o-" + k + "-" + p.id), x = r.per[p.id];
        if (o) o.innerHTML = x ? "FE <b>" + sig(x.fe, 3) + "%</b> · j " + sig(x.j, 3) + " mA cm⁻²" : "FE — · j —";
      });
      var cc = $("gc-c-" + k);
      if (cc) cc.innerHTML = S.imode === "j" ? "I <b>" + sig(r.I_mA, 4) + "</b> mA" : "j <b>" + sig(r.j, 4) + "</b> mA cm⁻²";
      var co = $("gc-cur-out-" + k);
      if (co) {
        var ir = r.ir || {};
        co.innerHTML = "E_corr <b>" + sig(ir.E_corr, 3) + "</b>" + (isFinite(ir.E_RHE) ? (" · RHE " + sig(ir.E_RHE, 3)) : "");
      }
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
      $("gc-sum-label").textContent = "t = " + fmtT(latest.t);
      $("gc-unacc").textContent = sig(100 - tot, 3) + " %";
      $("gc-sum-bar").innerHTML = barSVG(latest.r, 8);
      $("gc-sum-chips").innerHTML = S.products.map(function (p) {
        var x = isGas(p) ? latest.r.per[p.id] : liqRes[p.id]; if (!x) return "";
        return '<span class="gc-chip"><span class="gc-dot" style="background:' + p.hex + '"></span>' + esc(prodDisplay(p)) + " " + sig(x.fe, 3) + "%</span>";
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
    /* Product × injection table: sticky product-name column, no name truncation */
    var head = '<tr><th class="gc-sticky-col">Product</th>' + order.map(function (o, i) {
      return "<th>#" + (o.i + 1) + "<br><span class=\"gc-th-sub\">" + esc(fmtT(o.v.t)) + "</span></th>";
    }).join("") + "<th>mean ± SD</th></tr>";
    var rows = "", tc = 0;
    order.forEach(function (o) { if (results[o.i].any) tc++; });
    var AG = tc ? aggregate(order.filter(function (o) { return results[o.i].any; }).map(function (o) { return { t: o.v.t, r: results[o.i] }; }), c) : { per: {}, tot: { fe: { m: NaN, sd: NaN } } };
    var showEmpty = !!S.showEmpty;
    gases.forEach(function (p) {
      var hasAny = order.some(function (o) { return results[o.i].per[p.id]; });
      if (!showEmpty && !hasAny) return;
      rows += '<tr><th class="gc-sticky-col"><span class="gc-dot" style="background:' + p.hex + '"></span> ' + esc(prodDisplay(p)) + "</th>";
      order.forEach(function (o) {
        var x = results[o.i].per[p.id];
        rows += "<td>" + (x ? sig(x.fe, 3) : "—") + "</td>";
      });
      var ax = AG.per[p.id];
      rows += "<td>" + (ax ? pm({ m: ax.fe, sd: ax.sd_fe }, 3) : "—") + "</td></tr>";
    });
    if (tc) {
      rows += '<tr class="avg"><th class="gc-sticky-col">Σ FE</th>' + order.map(function (o) {
        var r = results[o.i];
        return '<td class="' + (r.any && r.total > 100 ? "warn" : "") + '">' + (r.any ? sig(r.total, 3) : "—") + "</td>";
      }).join("") + "<td>" + pm(AG.tot.fe, 3) + "</td></tr>";
    }
    var liqKeys = Object.keys(liqRes);
    if (liqKeys.length) {
      rows += '<tr class="avg"><th class="gc-sticky-col">Liquids (Q-based)</th>' + order.map(function () { return "<td></td>"; }).join("") + "<td></td></tr>";
      S.products.filter(function (p) { return !isGas(p) && liqRes[p.id]; }).forEach(function (p) {
        var L = liqRes[p.id];
        rows += '<tr><th class="gc-sticky-col"><span class="gc-dot" style="background:' + p.hex + '"></span> ' + esc(prodDisplay(p)) + "</th>" +
          order.map(function () { return "<td>—</td>"; }).join("") + "<td>" + sig(L.fe, 3) + "</td></tr>";
      });
    }
    $("gc-table").innerHTML = "<thead>" + head + "</thead><tbody>" + (rows || '<tr><td colspan="99" style="text-align:left">No data yet</td></tr>') + "</tbody>";
    var cChart = { I_A: isFinite(repI) ? repI / 1000 : NaN, I_mA: repI, j: repJ, ndot: c.ndot, ok: c.ok, area: c.area };
    renderChart(results, order, cChart, liqRes);
    renderIRTable();
    GC._last = { c: cChart, results: results, order: order, liq: liqRes };
    save();
  }
  /* ===== EXPORT TEMPLATE (single source of truth for CSV + XLSX column layout) =====
     Each column: { header, field, perProduct? }.  In headers, {p} → product name (e.g. CO).
     field ∈ "t" (t_inj, s) | "j" (|j_k|, mA cm^-2) | "I" (I_k, mA) | "ppm" | "fe" (FE_i, %) |
             "ji" (j_i, mA cm^-2) | "fe_total" (Σ FE, %).
     summaryRows: which stat rows to append after the injection rows ("mean", "SD" = sample SD, n−1).
     To remap to another format, edit only this object. */
  var EXPORT_TEMPLATE = {
    sheetName: "GC_FE",
    fileStem: "GC_FE",
    sigFigs: 5,
    columns: [
      { header: "t_inj (s)", field: "t" },
      { header: "E_applied (V)", field: "Eapp" },
      { header: "j (mA cm^-2)", field: "j" },
      { header: "I (mA)", field: "I" },
      { header: "Ru_unc (ohm)", field: "Ru_unc" },
      { header: "E_corr_vs_ref (V)", field: "Ecorr" },
      { header: "E_corr_vs_RHE (V)", field: "Erhe" },
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
      if (col.perProduct) S.products.forEach(function (p) { cols.push({ h: col.header.replace(/\{p\}/g, prodExportName(p)), f: col.field, p: p }); });
      else cols.push({ h: col.header, f: col.field });
    });
    var D = L.order.filter(function (o) { return L.results[o.i].any; });
    function rowVal(o, col) {
      var r = L.results[o.i], x = col.p && r.per[col.p.id];
      switch (col.f) {
        case "t": return pnum(o.v.t);
        case "j": return r.j;
        case "I": return r.I_mA;
        case "Eapp": return r.ir ? r.ir.E_applied : NaN;
        case "Ru_unc": return r.ir ? r.ir.Ru_unc : NaN;
        case "Ecorr": return r.ir ? r.ir.E_corr : NaN;
        case "Erhe": return r.ir ? r.ir.E_RHE : NaN;
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
  function metaRows() {
    var ref = resolveE0();
    var ci = S.irMode === "ci";
    return [
      ["technique", S.technique],
      ["E_set (V)", S.Eset],
      ["I_set (mA)", S.Iset],
      ["j_set (mA cm^-2)", S.jset],
      ["current_entry", S.imode],
      ["reference", ref.label],
      ["E0_ref (V vs SHE)", ref.E0],
      ["pH", S.pH],
      ["slope_mode", S.slopeMode],
      ["ir_mode", ci ? "CI" : "manual"],
      ["Ru (ohm)", ci ? "" : S.Ru],
      ["f_comp (%)", ci ? "" : S.fComp],
      ["Ru_unc_note", ci ? "0 (iR-compensated in real time)" : "Ru*(1-f_comp/100)"],
      ["sched_t1 (s)", S.sched.t1],
      ["sched_analysis (min)", S.sched.ana],
      ["sched_post (s)", S.sched.post],
      ["area (cm2)", S.area],
      ["flow (sccm)", S.flow],
      ["T (K)", S.T],
      ["P (Pa)", S.P],
      ["notes", S.notes || ""],
      ["formula_E_corr", ci ? "CI: E_corr = E_applied (Ru_unc = 0)" : "E_corr = E_applied + |I|*Ru_unc  (cathodic; equiv. E_app - I_signed*Ru_unc)"],
      ["formula_Ru_unc", ci ? "Ru_unc = 0 (CI real-time)" : "Ru_unc = Ru*(1 - f_comp/100); skip if f_comp = 100%"],
      ["formula_E_RHE", "E_RHE = E_corr + E0_ref + slope*pH"],
      ["formula_sched", "t_k (s) = t1_s + (k-1)*(analysis_min*60 + postrun_s)"]
    ];
  }
  function csv() {
    var aoa = buildExport(), meta = metaRows();
    var escCell = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = aoa.map(function (r) { return r.map(escCell).join(","); });
    lines.push(""); lines.push("Meta / notes");
    meta.forEach(function (r) { lines.push(r.map(escCell).join(",")); });
    GC._csv = lines;
    if (GC._nodl) return;
    dl(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }), EXPORT_TEMPLATE.fileStem + "_" + stamp() + ".csv");
  }
  /* ===== Reference-layout sheet (mirrors Steve's analysis workbook, sheet "22 N2 FNi BARE CP-10mA") =====
     Same cell positions/labels/sections/product order; live Excel formulas where the reference uses formulas.
     Rows shift down by (N−4) when there are more than 4 injections. Custom products → flat sheet only. */
  var REF_GAS = ["CH4","C2H6","C2H4","C3H8","C3H6","iC4H10","nC4H10","t2C4H8","1C4H8","iC4H8","c2C4H8","iC5H12","nC5H12","C4H6","t2C5H10","2Me2C4","1C5H10","c2C5H10","C6H14","1C6H12","c2C6H12","t2C6H12","CO","H2"];
  var REF_GAS_LBL = ["CH4","C2H6","C2H4","C3H8","C3H6","Isobutane","n-Butane","trans-2-Butene","1-Butene","Isobutene","cis-2-Butene","Isopentane","n-Pentane","1,3-Butadiene","trans-2-Pentene","2-Methyl-2-butene","1-Pentene","cis-2-Pentene","Hexane","1-Hexene","c-2-Hexene","t-2-Hexene","CO","H2"];
  /* Liquids table (row 25) order and the Overall-Data column holding each liquid's Ne */
  var REF_LIQ = ["HCOO","AcO","MeCHO","EtCHO","Me2CO","BuCHO","MeOH","iPrOH","EtOH","PeCHO","nPrOH","AllylOH","1BuOH","2Me1BuOH","PeOH","1HexOH"];
  var REF_LIQ_LBL = ["Formate","Acetate","Acetaldehyde","Propionaldehyde","Acetone","Butanal","Methanol","Isopropanol","Ethanol","Pentanal","n-Propanol","Allyl Alcohol","1-Butanol","2-Methyl-1-Butanol","Pentanol","1-Hexanol"];
  var REF_OV_LIQ = ["HCOO","AcO","MeCHO","EtCHO","Me2CO","MeOH","EtOH","nPrOH","AllylOH","1BuOH"]; /* Z..AI, rows 34-41 */
  var REF_OV_LIQ_LBL = ["Formate","Acetate","Acetaldehyde","Propionaldehyde","Acetone","Methanol","Ethanol","1-Propanol","Allyl Alcohol","1-Butanol"];
  var REF_EXTRA = ["BuCHO","iPrOH","PeCHO","2Me1BuOH","PeOH","1HexOH"]; /* B..G, rows 42-48 */
  var REF_EXTRA_LBL = ["Butanal","Isopropanol","Pentanal","2-Methyl-1-Butanol","Pentanol","1-Hexanol"];
  function colL(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function colI(L) { var n = 0; for (var k = 0; k < L.length; k++) n = n * 26 + (L.charCodeAt(k) - 64); return n - 1; }
  function cho(formula) {
    var o = { C: 0, H: 0, O: 0 }, re = /([A-Z][a-z]?)(\d*)/g, m;
    while ((m = re.exec(formula || ""))) { if (!m[1]) break; if (o.hasOwnProperty(m[1])) o[m[1]] += m[2] ? +m[2] : 1; }
    return o;
  }
  function buildRefSheet(meta) {
    var X = root.XLSX, ws = {}, merges = [], maxR = 0, maxC = 0;
    var L = GC._last, D = L.order.filter(function (o) { return L.results[o.i].any; });
    var N = Math.max(D.length, 1), off = Math.max(0, N - 4);
    var byId = {}; S.products.forEach(function (p) { byId[p.id] = p; });
    var T = S.ref === "std" ? 273.15 : pnum(S.T), P = S.ref === "std" ? 101325 : pnum(S.P);
    function put(a1, v) {
      var m = /^([A-Z]+)(\d+)$/.exec(a1), c = colI(m[1]), r = +m[2] - 1; maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
      var cell;
      if (v && typeof v === "object") { cell = { t: "n", f: v.f }; if (isFinite(v.v)) cell.v = v.v; }
      else if (typeof v === "number") { if (!isFinite(v)) return; cell = { t: "n", v: v }; }
      else if (v == null || v === "") return;
      else cell = { t: "s", v: String(v) };
      ws[a1] = cell;
    }
    function F(f, v) { return { f: f, v: v }; }
    function mg(a, b) { merges.push(X.utils.decode_range(a + ":" + b)); }
    function RR(r) { return r >= 24 ? r + 2 * off : r > 10 ? r + off : r; } /* rows below the GC block shift by off, below the FE block by 2·off */
    var rFirst = 11, rLast = 10 + N, rAvgPpm = RR(15), rFeH1 = RR(16), rFeH2 = RR(17), rFe0 = RR(18), rFeAvg = rFe0 + N;
    var rLiqT = RR(24), rLiqH = RR(25), rWE = RR(26), rCE = RR(27), rQw = RR(28), rQc = RR(29), rLFE = RR(30);
    var rOv = RR(33), rOvH = RR(34), rOvFE = RR(35), rOvJ = RR(36), rFm = RR(37), rC = RR(38), rH = RR(39), rO = RR(40), rNe = RR(41);
    var rEx = RR(42), rExFE = RR(43), rExJ = RR(44), rExC = RR(45), rExH = RR(46), rExO = RR(47), rExNe = RR(48);
    /* --- header rows 1-7 --- */
    var mt = meta || GC.exportMeta || {};
    put("A1", "Sample ID"); put("B1", mt.name || "");
    put("C1", "Feedstock"); put("D1", "CO2");
    put("E1", "WE"); put("F1", mt.catalyst || "");
    put("I1", "Electrolyte"); put("J1", mt.electrolyte || "");
    put("M1", "CE"); put("O1", "GDL");
    put("R1", "Parameters & Constants"); mg("R1", "W1");
    put("R2", "p (Pa)"); put("S2", P); put("T2", "R"); put("U2", R); put("V2", "T (K)"); put("W2", T);
    put("R3", "V1 (mL)"); put("S3", 1); put("T3", "V2 (mL)"); put("U3", 1); put("V3", "V3 (mL)"); put("W3", 1);
    var n1 = P * 1e-6 / (R * T);
    put("R4", "n1 (mol)"); put("S4", F("($S$2*(S3/10^6))/($U$2*$W$2)", n1));
    put("T4", "n2 (mol)"); put("U4", F("($S$2*(U3/10^6))/($U$2*$W$2)", n1));
    put("V4", "n3 (mol)"); put("W4", F("($S$2*(W3/10^6))/($U$2*$W$2)", n1));
    put("R5", "F (C/mol)"); put("S5", GC.F); put("T5", "v0 (sccm)"); put("U5", pnum(S.flow)); put("V5", "t0 (s)");
    put("R6", "S (cm2)"); put("S6", pnum(S.area)); put("T6", "Vw (mL)"); put("U6", pnum(S.Vw)); put("V6", "Vc (mL)"); put("W6", pnum(S.Vc));
    var irs = D.map(function (o) { return L.results[o.i].ir; }), ir0 = irs[0] || {}, ci = S.irMode === "ci";
    var sc = S.sched || {}, gap = pnum(sc.ana) * 60 + pnum(sc.post), fC = ci ? NaN : pnum(S.fComp);
    put("G1", "If CI is used, V RHE"); put("K1", "If no CI is used, V SHE");
    put("H2", ci ? "with CI" : "without CI"); put("J2", "pH"); put("K2", pnum(S.pH));
    put("T2", "R (J K-1 mol-1)");
    put("A3", "Catalyst loading"); put("C3", "Mass loading (mg cm-2)"); put("E3", "Vulcan 72 amount (mg/cm2)");
    put("I3", "cathode"); put("J3", pnum(S.Vw)); put("K3", "anode"); put("L3", pnum(S.Vc));
    put("M3", "Gas pressure (PSIA)"); put("O3", "Flooding"); put("X3", ir0.slope);
    put("H4", "Fill in only if CI isn't used");
    put("A5", "1st Injection Time (s)"); put("B5", pnum(sc.t1));
    put("C5", "Gas Transit Volume (mL)"); put("E5", "Gas Delay (s)"); put("F5", gap);
    put("H5", "Value of Ru before"); put("H7", "Value of Ru after");
    if (!ci) { put("I5", pnum(S.Ru)); put("I7", pnum(S.Ru)); }
    put("J5", "V RHE uncompensated");
    var eunc = irs.map(function (x) { return x.noPh ? x.E_applied : x.E_applied + x.E0 + x.slope * pnum(S.pH); }).filter(isFinite);
    put("K5", eunc.length ? mstat(eunc).m : NaN);
    put("L5", "Average Current (A)"); put("M5", F("AVERAGE(D" + rFirst + ":D" + rLast + ")"));
    put("N5", "Potential  vs RHE"); put("O5", F("K5-M7"));
    put("J6", ci ? "Average Ru (CI: compensated in real time → 0)" : "Average Ru (" + (isFinite(fC) ? fC : 0) + "% Ru Compensation → Ru·(1−f/100))");
    put("K6", ci ? 0 : F("AVERAGE(I5,I7)*(1-" + (isFinite(fC) ? fC : 0) + "/100)"));
    put("L7", "Effective Voltage"); put("M7", F("K6*M5"));
    var jabs = D.map(function (o) { return Math.abs(L.results[o.i].j); }).filter(isFinite), jm = jabs.length ? mstat(jabs).m : NaN;
    put("A7", "Total Charge (Take from Gamry CA Data)"); put("B7", pnum(S.Q));
    put("C7", "Max Current (A)"); put("D7", F("-MIN(D" + rFirst + ":D" + rLast + ")"));
    put("E7", "J (mA/cm2)"); put("F7", jm);
    /* --- GC block rows 9-14 --- */
    put("A9", "Vial"); mg("A9", "A10"); put("B9", "t (s)"); mg("B9", "B10"); put("C9", "E (V vs ref)"); mg("C9", "C10"); put("D9", "I (A)"); mg("D9", "D10");
    put("E9", "Conc. From GC (ppm)"); mg("E9", "AB9");
    put("AC9", "V (sccm)"); mg("AC9", "AC10"); put("AD9", "t1 (s)"); put("AE9", "t2 (s)"); put("AF9", "t3 (s)");
    put("AG9", "It1 (C)"); put("AH9", "It2 (C)"); put("AI9", "It3 (C)");
    put("AJ9", "Total Charge to Generate Product [n1*Conc.*Ne*F (C)]"); mg("AJ9", "BG9");
    REF_GAS.forEach(function (k, g) { put(colL(4 + g) + "10", REF_GAS_LBL[g]); put(colL(35 + g) + "10", REF_GAS_LBL[g]); });
    D.forEach(function (o, i) {
      var r = rFirst + i, res = L.results[o.i], ir = res.ir || {}, flow = pnum(S.flow), Ia = -res.I_mA / 1000;
      put("A" + r, i + 1);
      var tv = pnum(o.v.t), tSch = pnum(sc.t1) + i * gap;
      put("B" + r, isFinite(tv) && Math.abs(tv - tSch) < 1e-6 ? F(i ? "B" + (r - 1) + "+$F$5" : "B5", tv) : tv); put("C" + r, ir.E_applied); put("D" + r, Ia);
      put("AC" + r, flow);
      ["AD", "AE", "AF"].forEach(function (cl, z) { put(cl + r, F("$" + ["S", "U", "W"][z] + "$3/AC" + r + "*60", 60 / flow)); });
      ["AG", "AH", "AI"].forEach(function (cl, z) { put(cl + r, F("D" + r + "*" + ["AD", "AE", "AF"][z] + r, Ia * 60 / flow)); });
      REF_GAS.forEach(function (k, g) {
        var p = byId[k]; if (!p) return; var ppm = pnum(o.v.ppm[k]); if (!isFinite(ppm)) return;
        put(colL(4 + g) + r, ppm);
        var nref = k === "CO" ? "$U$4" : k === "H2" ? "$W$4" : "$S$4";
        put(colL(35 + g) + r, F(nref + "*(" + colL(4 + g) + r + "/10^6)*" + colL(1 + g) + "$" + rNe + "*$S$5", n1 * ppm * 1e-6 * p.n * GC.F));
        var it = k === "CO" ? "AH" : k === "H2" ? "AI" : "$AG";
        var x = res.per[k];
        put(colL(3 + g) + (rFe0 + i), F("-" + colL(35 + g) + r + "/" + it + r + "*100", x ? x.fe : NaN));
      });
      /* FE table row */
      var rr = rFe0 + i;
      put("A" + rr, i + 1); put("B" + rr, ir.E_RHE); put("C" + rr, F("D" + r + "/$S$6*10^3", -res.j));
      put("AB" + rr, F("SUM(D" + rr + ":AA" + rr + ")", res.total));
    });
    /* Average ppm row (reference grouping: C4 and C5/C6 isomers summed) */
    put("A" + rAvgPpm, "Average Total C1-C6 (ppm)"); mg("A" + rAvgPpm, "D" + rAvgPpm);
    var av = function (c) { return "AVERAGE(" + c + rFirst + ":" + c + rLast + ")"; };
    var hasCol = function (cs) { return cs.some(function (c) { for (var r = rFirst; r <= rLast; r++) if (ws[c + r]) return true; return false; }); };
    [["E"], ["F"], ["G"], ["H"], ["I"], ["J", "K"], ["L", "M", "N", "O"], ["P", "Q"], ["S", "T", "U", "V"], ["W"], ["X", "Y", "Z"]].forEach(function (grp) {
      var have = grp.filter(function (c) { return hasCol([c]); }); if (!have.length) return;
      put(grp[0] + rAvgPpm, F(have.map(av).join("+")));
    });
    ["AA", "AB"].forEach(function (c) { if (hasCol([c])) put(c + rAvgPpm, F(av(c))); });
    /* FE header + average */
    put("A" + rFeH1, "Vial"); mg("A" + rFeH1, "A" + rFeH2); put("B" + rFeH1, "E (V vs RHE)"); mg("B" + rFeH1, "B" + rFeH2);
    put("C" + rFeH1, "j (mA/cm2)"); mg("C" + rFeH1, "C" + rFeH2); put("D" + rFeH1, "FE (%)"); mg("D" + rFeH1, "AB" + rFeH1);
    put("AG" + rFeH1, "Experimental Comments"); if (S.notes) put("AG" + rFeH2, S.notes);
    REF_GAS.forEach(function (k, g) { put(colL(3 + g) + rFeH2, REF_GAS_LBL[g]); }); put("AB" + rFeH2, "Sum");
    put("A" + rFeAvg, "Average (1-" + N + ")");
    var fa = function (c) { return "AVERAGE(" + c + rFe0 + ":" + c + (rFe0 + N - 1) + ")"; };
    ["B", "C"].forEach(function (c) { put(c + rFeAvg, F(fa(c))); });
    var agFE = {};
    REF_GAS.forEach(function (k, g) {
      var c = colL(3 + g), have = false; for (var i = 0; i < N; i++) if (ws[c + (rFe0 + i)]) have = true;
      if (!have) return;
      var vals = D.map(function (o) { var x = L.results[o.i].per[k]; return x ? x.fe : NaN; }).filter(isFinite);
      agFE[k] = mstat(vals).m; put(c + rFeAvg, F(fa(c), agFE[k]));
    });
    put("AB" + rFeAvg, F(fa("AB")));
    /* --- Liquids rows 24-30 --- */
    put("A" + rLiqT, "Liquid Products (HPLC -FA ; HSGC - Oxygenates)");
    put("A" + rWE, "Conc. of Products from Working Electrode (μM)"); put("A" + rCE, "Conc of Products from Counter Electrode (μM)");
    put("A" + rQw, "Cw*Vw*Ne*F (C)"); put("A" + rQc, "Cc*Vc*Ne*F (C)"); put("A" + rLFE, "FE (%)");
    function neRef(k) { var i = REF_OV_LIQ.indexOf(k); if (i >= 0) return colL(25 + i) + rNe; return colL(1 + REF_EXTRA.indexOf(k)) + rExNe; }
    function ovFERef(k) { var i = REF_OV_LIQ.indexOf(k); if (i >= 0) return colL(25 + i) + rOvFE; return colL(1 + REF_EXTRA.indexOf(k)) + rExFE; }
    var liqCols = [];
    REF_LIQ.forEach(function (k, i) {
      var c = colL(1 + i); put(c + rLiqH, REF_LIQ_LBL[i]);
      var p = byId[k], slot = S.liq[k]; if (!p || !slot) return;
      var we = pnum(slot.we), ce = pnum(slot.ce); if (!isFinite(we) && !isFinite(ce)) return;
      put(c + rWE, isFinite(we) ? we : 0); put(c + rCE, isFinite(ce) ? ce : 0);
      put(c + rQw, F("(" + c + rWE + "/10^6)*($U$6/10^3)*" + neRef(k) + "*$S$5"));
      put(c + rQc, F("(" + c + rCE + "/10^6)*($W$6/10^3)*" + neRef(k) + "*$S$5")); /* reference used $U$6 (Vw) for some CE cells — corrected to Vc */
      var lr = L.liq && L.liq[k];
      put(c + rLFE, F("(" + c + rQw + "+" + c + rQc + ")/$B$7*100", lr ? lr.fe : NaN)); liqCols.push(c);
    });
    put("R" + rLiqH, "Sum"); put("R" + rLFE, F("SUM(B" + rLFE + ":Q" + rLFE + ")"));
    /* --- Overall data rows 33-48 --- */
    put("A" + rOv, "Overall Data");
    ["FE (%)", "j (mA/cm2)", "Formula", "C number", "H number", "O number", "Ne"].forEach(function (lab, i) { put("A" + (rOvFE + i), lab); });
    function ovCol(c, k, lbl, isLiq, rows) {
      var p = byId[k] || (PRESETS[k] ? prodFromPreset(k) : null), f = PRESETS[k] ? PRESETS[k].formula : (p && p.formula), a = cho(f);
      put(c + rows.h, lbl);
      if (rows.f) put(c + rows.f, f);
      put(c + rows.C, a.C); put(c + rows.H, a.H); put(c + rows.O, a.O);
      var neF = 4 * a.C + a.H - 2 * a.O, nUse = p ? p.n : neF;
      if (nUse === neF) put(c + rows.Ne, F("$AJ$" + rC + "*" + c + rows.C + "+$AJ$" + rH + "*" + c + rows.H + "+$AJ$" + rO + "*" + c + rows.O, neF));
      else put(c + rows.Ne, nUse); /* user-edited n in the app overrides 4C+H−2O */
      var have = isLiq ? (L.liq && L.liq[k]) : (k in agFE);
      if (have) {
        var src = isLiq ? (colL(1 + REF_LIQ.indexOf(k)) + rLFE) : (colL(3 + REF_GAS.indexOf(k)) + rFeAvg);
        put(c + rows.FE, F(src, isLiq ? L.liq[k].fe : agFE[k]));
        put(c + rows.j, F("$F$7*" + c + rows.FE + "/100"));
      }
    }
    var mainRows = { h: rOvH, FE: rOvFE, j: rOvJ, f: rFm, C: rC, H: rH, O: rO, Ne: rNe };
    REF_GAS.forEach(function (k, g) { ovCol(colL(1 + g), k, REF_GAS_LBL[g], false, mainRows); });
    REF_OV_LIQ.forEach(function (k, i) { ovCol(colL(25 + i), k, REF_OV_LIQ_LBL[i], true, mainRows); });
    put("AJ" + rOvH, "Total"); put("AJ" + rOvFE, F("SUM(B" + rOvFE + ":AI" + rOvFE + ")+SUM(B" + rExFE + ":G" + rExFE + ")"));
    put("AJ" + rOvJ, F("SUM(B" + rOvJ + ":AI" + rOvJ + ",B" + rExJ + ":G" + rExJ + ")"));
    put("AK" + rOvH, "CO2R"); put("AK" + rOvFE, F("SUM(B" + rOvFE + ":X" + rOvFE + ",Z" + rOvFE + ":AI" + rOvFE + ",B" + rExFE + ":G" + rExFE + ")"));
    put("AK" + rOvJ, F("SUM(B" + rOvJ + ":X" + rOvJ + ",Z" + rOvJ + ":AI" + rOvJ + ",B" + rExJ + ":G" + rExJ + ")"));
    put("AJ" + (rOvFE + 2), "e number"); put("AJ" + rC, 4); put("AJ" + rH, 1); put("AJ" + rO, -2);
    /* C1..C6 sums of CO2R products by carbon number; HC = Σ C1..C6 */
    var byC = {}; function addC(cell, k, exRow) { if (k === "H2") return; var n = cho(PRESETS[k].formula).C; (byC[n] = byC[n] || []).push({ c: cell, ex: exRow }); }
    REF_GAS.forEach(function (k, g) { addC(colL(1 + g), k, false); });
    REF_OV_LIQ.forEach(function (k, i) { addC(colL(25 + i), k, false); });
    REF_EXTRA.forEach(function (k, i) { addC(colL(1 + i), k, true); });
    for (var cn = 1; cn <= 6; cn++) {
      var cl = colL(colI("AL") + cn - 1), L2 = byC[cn] || [];
      put(cl + rOvH, "C" + cn);
      put(cl + rOvFE, F("SUM(" + L2.map(function (e) { return e.c + (e.ex ? rExFE : rOvFE); }).join(",") + ")"));
      put(cl + rOvJ, F("SUM(" + L2.map(function (e) { return e.c + (e.ex ? rExJ : rOvJ); }).join(",") + ")"));
    }
    put("AR" + rOvH, "HC"); put("AR" + rOvFE, F("SUM(AL" + rOvFE + ":AQ" + rOvFE + ")")); put("AR" + rOvJ, F("SUM(AL" + rOvJ + ":AQ" + rOvJ + ")"));
    put("A" + rEx, "Liquid (cont.)");
    ["FE (%)", "j (mA/cm2)", "C number", "H number", "O number", "Ne"].forEach(function (lab, i) { put("A" + (rExFE + i), lab); });
    REF_EXTRA.forEach(function (k, i) { ovCol(colL(1 + i), k, REF_EXTRA_LBL[i], true, { h: rEx, FE: rExFE, j: rExJ, C: rExC, H: rExH, O: rExO, Ne: rExNe }); });
    ws["!ref"] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: Math.max(maxC, 58) } });
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 24 }];
    var nm = String(mt.name || "Run").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || "Run";
    return { ws: ws, name: nm, merges: merges, rows: { first: rFirst, last: rLast, avgPpm: rAvgPpm, feH1: rFeH1, feH2: rFeH2, fe0: rFe0, feAvg: rFeAvg, liqT: rLiqT, liqH: rLiqH, we: rWE, ce: rCE, qw: rQw, qc: rQc, lfe: rLFE, ov: rOv, ovH: rOvH, ovFE: rOvFE, ovJ: rOvJ, fm: rFm, C: rC, H: rH, O: rO, Ne: rNe, ex: rEx, exFE: rExFE, exJ: rExJ, exC: rExC, exNe: rExNe } };
  }
  GC.buildRefSheet = buildRefSheet; GC.prodFromPreset = prodFromPreset;
  function fullMeta(ref) {
    var meta = metaRows(); meta.unshift(["field", "value"]);
    meta.push(["sheet_layout", "Sheet '" + ref.name + "' mirrors the reference analysis workbook (same cells/labels/product order, live formulas). GC_FE = Origin-ready flat table (same as CSV)."]);
    meta.push(["layout_rows", "When N > 4 injections, rows 15-22 shift down by (N-4) and rows 24+ by 2*(N-4) (here N = " + (ref.rows.feAvg - ref.rows.fe0) + ")."]);
    meta.push(["layout_corrections", "vs reference: Ne refs aligned per product column; CE charge uses Vc ($W$6) for every liquid; averages span all injections (1-N); Pentanol O = 1; no external-workbook links; chain-growth (alpha) block omitted."]);
    meta.push(["layout_constants", "R and F written at app precision (8.314462618, 96485.33212) so sheet formulas reproduce the app's FE; T/P from the app (STP mode: 273.15 K / 101325 Pa)."]);
    meta.push(["layout_custom", "Custom (non-catalog) products appear only in GC_FE."]);
    return meta;
  }
  function xlsxPlain() {
    if (!root.XLSX) { alert("XLSX library not loaded (vendor/xlsx.full.min.js)."); return; }
    var aoa = buildExport(), ws = root.XLSX.utils.aoa_to_sheet(aoa), wb = root.XLSX.utils.book_new();
    var ref = buildRefSheet();
    root.XLSX.utils.book_append_sheet(wb, ref.ws, ref.name === EXPORT_TEMPLATE.sheetName || ref.name === "Meta_notes" ? ref.name + "_" : ref.name);
    wb.Workbook = { CalcPr: { fullCalcOnLoad: true } };
    ws["!cols"] = aoa[0].map(function (h) { return { wch: Math.max(10, String(h).length + 2) }; });
    root.XLSX.utils.book_append_sheet(wb, ws, EXPORT_TEMPLATE.sheetName);
    var meta = fullMeta(ref);
    root.XLSX.utils.book_append_sheet(wb, root.XLSX.utils.aoa_to_sheet(meta), "Meta_notes");
    GC._xlsxAoa = aoa;
    if (GC._nodl) { GC._xlsxB64 = root.XLSX.write(wb, { type: "base64", bookType: "xlsx" }); return; }
    var out = root.XLSX.write(wb, { type: "array", bookType: "xlsx" });
    dl(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), EXPORT_TEMPLATE.fileStem + "_" + stamp() + ".xlsx");
  }
  /* ===== Styled export (ExcelJS, vendored offline; MIT) ===== */
  var XS = {
    navy: "FF14213D", grey: "FFE9ECEF", yellow: "FFFFF6CC", orange: "FFFDE8D0", white: "FFFFFFFF",
    thin: { style: "thin", color: { argb: "FFB8BEC6" } }
  };
  function fill(argb) { return { type: "pattern", pattern: "solid", fgColor: { argb: argb } }; }
  function box() { return { top: XS.thin, left: XS.thin, bottom: XS.thin, right: XS.thin }; }
  function xlsxStyled() {
    var X = root.XLSX, EJ = root.ExcelJS, ref = buildRefSheet(), aoa = buildExport(), meta = fullMeta(ref), R = ref.rows;
    var wb = new EJ.Workbook(); wb.creator = "FE Calculator " + (root.APP_VERSION || ""); wb.calcProperties = { fullCalcOnLoad: true };
    var nm = (ref.name === EXPORT_TEMPLATE.sheetName || ref.name === "Meta_notes") ? ref.name + "_" : ref.name;
    var s1 = wb.addWorksheet(nm, { views: [{ showGridLines: false }] });
    var font = { name: "Calibri", size: 10 };
    /* values + formulas */
    Object.keys(ref.ws).forEach(function (a1) {
      if (a1.charAt(0) === "!") return;
      var c = ref.ws[a1], cell = s1.getCell(a1);
      cell.value = c.f ? (isFinite(c.v) ? { formula: c.f, result: c.v } : { formula: c.f }) : c.v;
      cell.font = font;
    });
    var CL = X.utils.encode_col, CI = X.utils.decode_col;
    function rng(c0, r0, c1, r1, fn) { for (var r = r0; r <= r1; r++) for (var c = CI(c0); c <= CI(c1); c++) fn(s1.getCell(CL(c) + r), r, CL(c)); }
    function fmt(c0, r0, c1, r1, f) { rng(c0, r0, c1, r1, function (x) { x.numFmt = f; }); }
    function table(c0, r0, c1, r1) { rng(c0, r0, c1, r1, function (x) { x.border = box(); }); }
    function head(c0, r0, c1, r1, argb) { rng(c0, r0, c1, r1, function (x) { x.fill = fill(argb || XS.grey); x.font = { name: "Calibri", size: 10, bold: true }; x.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; }); }
    function hl(c0, r0, c1, r1) { rng(c0, r0, c1, r1, function (x) { x.fill = fill(XS.orange); x.font = { name: "Calibri", size: 10, bold: true }; }); }
    function title(a1, toCol) {
      var r = +a1.replace(/[A-Z]+/, ""), c = a1.replace(/\d+/, "");
      if (toCol) { try { s1.mergeCells(a1 + ":" + toCol + r); } catch (e) {} }
      var x = s1.getCell(a1); x.fill = fill(XS.navy); x.font = { name: "Calibri", size: 11, bold: true, color: { argb: XS.white } }; x.alignment = { vertical: "middle" };
    }
    (ref.merges || []).forEach(function (m) { try { s1.mergeCells(X.utils.encode_range(m)); } catch (e) {} });
    /* header & parameters (rows 1-7): labels bold grey, values soft yellow */
    rng("A", 1, "W", 7, function (x, r, c) {
      if (x.value == null || x.isMerged && x.master !== x) return;
      if (typeof x.value === "string") { x.font = { name: "Calibri", size: 10, bold: true }; x.fill = fill(XS.grey); x.alignment = { wrapText: true, vertical: "middle" }; }
      else { x.fill = fill(XS.yellow); }
      x.border = box();
    });
    title("R1");
    fmt("S", 4, "W", 4, "0.000E+00"); ["F7", "K5", "M7", "O5", "X3"].forEach(function (a) { s1.getCell(a).numFmt = "0.000"; });
    ["M5", "D7"].forEach(function (a) { s1.getCell(a).numFmt = "0.0000"; }); ["B5", "F5", "B7"].forEach(function (a) { s1.getCell(a).numFmt = "0"; });
    /* GC block */
    head("A", 9, "BG", 10); s1.getCell("E9").fill = fill(XS.yellow); s1.getCell("AJ9").fill = fill(XS.yellow);
    table("A", 9, "BG", R.last);
    fmt("A", R.first, "A", R.last, "0"); fmt("B", R.first, "B", R.last, "0"); fmt("C", R.first, "C", R.last, '0.000" V"');
    fmt("D", R.first, "D", R.last, "0.0000"); fmt("E", R.first, "AB", R.last, "0"); fmt("AC", R.first, "AC", R.last, "0.0");
    fmt("AD", R.first, "AF", R.last, "0"); fmt("AG", R.first, "AI", R.last, "0.000"); fmt("AJ", R.first, "BG", R.last, "0.000E+00");
    table("A", R.avgPpm, "AB", R.avgPpm); hl("A", R.avgPpm, "AB", R.avgPpm); fmt("E", R.avgPpm, "AB", R.avgPpm, "0");
    /* FE table */
    head("A", R.feH1, "AB", R.feH2); s1.getCell("D" + R.feH1).fill = fill(XS.yellow);
    title("AG" + R.feH1, "AL"); rng("AG", R.feH2, "AL", R.feH2 + 3, function (x) { x.border = box(); x.alignment = { wrapText: true, vertical: "top" }; });
    try { s1.mergeCells("AG" + R.feH2 + ":AL" + (R.feH2 + 3)); } catch (e) {}
    table("A", R.fe0, "AB", R.feAvg);
    fmt("A", R.fe0, "A", R.feAvg - 1, "0"); fmt("B", R.fe0, "B", R.feAvg, '0.000" V"'); fmt("C", R.fe0, "C", R.feAvg, "0.000"); fmt("D", R.fe0, "AB", R.feAvg, "0.00");
    hl("AB", R.fe0, "AB", R.feAvg - 1); hl("A", R.feAvg, "AB", R.feAvg);
    /* Liquids */
    title("A" + R.liqT, "R");
    head("A", R.liqH, "R", R.liqH); table("A", R.liqH, "R", R.lfe);
    rng("A", R.we, "A", R.lfe, function (x) { x.font = { name: "Calibri", size: 10, bold: true }; x.alignment = { wrapText: true }; });
    fmt("B", R.we, "Q", R.ce, "0"); fmt("B", R.qw, "Q", R.qc, "0.000"); fmt("B", R.lfe, "R", R.lfe, "0.00"); hl("R", R.liqH, "R", R.lfe);
    /* Overall data */
    title("A" + R.ov, "AR");
    head("A", R.ovH, "AR", R.ovH); table("A", R.ovH, "AR", R.Ne);
    rng("A", R.ovFE, "A", R.Ne, function (x) { x.font = { name: "Calibri", size: 10, bold: true }; });
    fmt("B", R.ovFE, "AR", R.ovFE, "0.00"); fmt("B", R.ovJ, "AR", R.ovJ, "0.000"); fmt("B", R.C, "AI", R.Ne, "0");
    hl("AJ", R.ovH, "AR", R.ovJ); rng("AJ", R.fm, "AJ", R.O, function (x) { x.fill = fill(XS.yellow); x.font = { name: "Calibri", size: 10, bold: true }; });
    head("A", R.ex, "G", R.ex); table("A", R.ex, "G", R.exNe);
    rng("A", R.exFE, "A", R.exNe, function (x) { x.font = { name: "Calibri", size: 10, bold: true }; });
    fmt("B", R.exFE, "G", R.exFE, "0.00"); fmt("B", R.exJ, "G", R.exJ, "0.000"); fmt("B", R.exC, "G", R.exNe, "0");
    /* widths / heights */
    for (var c = 1; c <= 59; c++) s1.getColumn(c).width = 11;
    s1.getColumn(1).width = 30; s1.getRow(9).height = 30; s1.getRow(R.ovH).height = 28; s1.getRow(R.liqH).height = 28; s1.getRow(R.feH2).height = 28;
    s1.views = [{ showGridLines: false, state: "frozen", xSplit: 1, ySplit: 0 }];

    /* GC_FE: plain, one header row, no merges — Origin-ready */
    var s2 = wb.addWorksheet(EXPORT_TEMPLATE.sheetName, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
    var hdr = aoa[0];
    function colFmt(h) {
      if (/^t_inj/.test(h)) return "0"; if (/^ppm_/.test(h)) return "0"; if (/^FE_/.test(h)) return "0.00";
      if (/^E_/.test(h)) return '0.000'; if (/^j/.test(h) || /^I \(/.test(h)) return "0.000"; if (/^Ru/.test(h)) return "0.00"; return "General";
    }
    aoa.forEach(function (row, ri) {
      var r = s2.addRow(row.map(function (v) { return v == null ? null : v; }));
      r.eachCell({ includeEmpty: true }, function (x, ci) {
        x.font = { name: "Calibri", size: 10, bold: ri === 0 }; x.border = box();
        if (ri === 0) { x.fill = fill(XS.grey); x.alignment = { wrapText: true, vertical: "middle", horizontal: "center" }; }
        else x.numFmt = colFmt(hdr[ci - 1]);
      });
      if (ri > 0 && typeof row[0] === "string") r.eachCell({ includeEmpty: true }, function (x) { x.fill = fill(XS.orange); x.font = { name: "Calibri", size: 10, bold: true }; });
    });
    s2.getRow(1).height = 45;
    hdr.forEach(function (h, i) { s2.getColumn(i + 1).width = Math.min(22, Math.max(10, String(h).length * 0.55 + 4)); });
    s2.getColumn(1).width = 13;

    /* Meta_notes */
    var s3 = wb.addWorksheet("Meta_notes");
    s3.columns = [{ width: 28 }, { width: 100 }];
    meta.forEach(function (row, ri) {
      var r = s3.addRow([row[0], row[1] == null ? "" : row[1]]);
      r.getCell(1).font = { name: "Calibri", size: 10, bold: true }; r.getCell(2).font = { name: "Calibri", size: 10 };
      r.eachCell({ includeEmpty: true }, function (x) { x.alignment = { wrapText: true, vertical: "top" }; x.border = box(); });
      if (ri === 0) r.eachCell(function (x) { x.fill = fill(XS.navy); x.font = { name: "Calibri", size: 11, bold: true, color: { argb: XS.white } }; });
    });
    GC._xlsxAoa = aoa;
    return wb.xlsx.writeBuffer().then(function (buf) {
      if (GC._nodl) { var b = new Uint8Array(buf), s = ""; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); GC._xlsxB64 = btoa(s); return; }
      dl(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), EXPORT_TEMPLATE.fileStem + "_" + stamp() + ".xlsx");
    });
  }
  function xlsx() {
    if (root.ExcelJS && root.XLSX) return xlsxStyled().catch(function (e) { console.error(e); return xlsxPlain(); });
    return Promise.resolve(xlsxPlain());
  }

  function syncControls() {
    ["area", "flow", "T", "P", "Eset", "Iset", "jset", "E0", "pH", "Ru", "fComp"].forEach(function (k) {
      var el = $("gc-" + k); if (el && S[k] != null) el.value = S[k];
    });
    var notes = $("gc-notes"); if (notes) notes.value = S.notes || "";
    var eref = $("gc-eref"); if (eref) eref.value = S.eref || "agcl_sat";
    var eref2 = $("gc-eref-cp"); if (eref2) eref2.value = S.eref || "agcl_sat";
    document.querySelectorAll("#gc-imode .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.imode); });
    document.querySelectorAll("#gc-ref .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.ref); });
    document.querySelectorAll("#gc-tech .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.technique); });
    document.querySelectorAll("#gc-cpmode .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.cpmode); });
    document.querySelectorAll("#gc-irmode .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.irMode); });
    document.querySelectorAll("#gc-slope .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S.slopeMode); });
    var ci = S.irMode === "ci";
    document.querySelectorAll(".gc-ir-manual").forEach(function (e) { e.hidden = ci; });
    var cin = $("gc-ir-ci-note"); if (cin) cin.hidden = !ci;
    document.querySelectorAll(".gc-tp").forEach(function (e) { e.hidden = S.ref === "std"; });
    document.querySelectorAll(".gc-ca-only").forEach(function (e) { e.hidden = S.technique === "CP"; });
    document.querySelectorAll(".gc-cp-only").forEach(function (e) { e.hidden = S.technique !== "CP"; });
    document.querySelectorAll(".gc-cp-I").forEach(function (e) { e.hidden = S.cpmode !== "I"; });
    document.querySelectorAll(".gc-cp-j").forEach(function (e) { e.hidden = S.cpmode !== "j"; });
    document.querySelectorAll(".gc-e0-custom").forEach(function (e) { e.hidden = S.eref !== "custom"; });
    var help = $("gc-tech-help");
    if (help) help.textContent = S.technique === "CP"
      ? "CP: apply a fixed current; measure potential at each GC injection."
      : "CA: apply a fixed potential; measure current at each GC injection.";
    var irSum = $("gc-ir-summary");
    if (irSum) irSum.textContent = ci
      ? "Current interrupt: iR-compensated in real time (CI). E_corr = E_applied (Ru_unc = 0), then convert to RHE with the chosen reference and measured pH."
      : "At each GC injection, E_corr = E_applied − I·Ru_uncorrected (cathodic I negative), then convert to RHE with the chosen reference and measured pH.";
  }
  function syncSched() { ["t1", "ana", "post", "count"].forEach(function (f) { $("gc-s-" + f).value = S.sched[f]; }); }
  /* —— Guided / Expert UI —— */
  var UI_KEY = "gcfe.uiMode";
  var WIZ_HINTS = {
    1: "Choose CA (fix E, measure I) or CP (fix I, measure E).",
    2: "Enter measured electrolyte pH for RHE conversion (optional).",
    3: "CI = real-time (no Ru entry). Manual = enter Ru / % compensated.",
    4: "Geometric area, CO₂ flow, and T/P for molar flow.",
    5: "t₁ & post-run in seconds; analysis in minutes. Times show s and min.",
    6: "Read chrono values at each injection time from the plot.",
    7: "Confirm products and enter GC ppm (and liquid μM / Q).",
    8: "Review FE, iR-corrected potentials, chart, notes, and export."
  };
  function getUiMode() {
    try { return localStorage.getItem(UI_KEY) || "guided"; } catch (e) { return "guided"; }
  }
  function setUiMode(m) {
    try { localStorage.setItem(UI_KEY, m); } catch (e) {}
    var sec = $("section-gc"); if (!sec) return;
    sec.setAttribute("data-ui-mode", m);
    document.querySelectorAll("#gc-ui-mode .seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === m); });
    var hint = $("gc-mode-hint");
    if (hint) hint.textContent = m === "guided" ? "Step-by-step for first-time eCO₂R users. Switch to Expert anytime." : "All panels visible. Switch to Guided for a step-by-step tour.";
    if (m === "guided") setWizStep(parseInt(sec.getAttribute("data-wiz-step"), 10) || 1);
  }
  function setWizStep(n) {
    n = Math.max(1, Math.min(8, n | 0));
    var sec = $("section-gc"); if (!sec) return;
    sec.setAttribute("data-wiz-step", String(n));
    document.querySelectorAll("#gc-wiz-progress li").forEach(function (li) {
      var s = parseInt(li.dataset.s, 10);
      li.classList.toggle("is-active", s === n);
      li.classList.toggle("is-done", s < n);
    });
    var h = $("gc-wiz-step-hint"); if (h) h.textContent = WIZ_HINTS[n] || "";
    var back = $("gc-wiz-back"), next = $("gc-wiz-next");
    if (back) back.disabled = n <= 1;
    if (next) next.textContent = n >= 8 ? "Open Expert view" : "Next";
    renderSchedPreview();
    renderCurrentStep();
    var w = $("gc-wiz-warn"); if (w && n !== 8) { w.hidden = true; w.textContent = ""; }
    if (n === 8) validateWizStep(8, true);
    try { sec.querySelector(".gc-wizard").scrollIntoView({ block: "nearest" }); } catch (e) {}
  }
  function renderSchedPreview() {
    var el = $("gc-sched-preview"); if (!el) return;
    applySched();
    var times = S.inj.map(function (r, i) { return "#" + (i + 1) + " → " + fmtT(r.t); });
    el.textContent = times.length ? ("Auto times: " + times.join(" · ")) : "Enter schedule values to preview times.";
  }
  function renderCurrentStep() {
    var box = $("gc-current-step"); if (!box) return;
    applySched();
    var ca = S.technique !== "CP";
    var desc = $("gc-chrono-desc");
    if (desc) desc.textContent = ca
      ? "CA: enter measured |j| or |I| at each injection (no global default). Empty → blank FE for that point."
      : "CP: enter measured E (V vs ref). Current is prefilled from the step-1 setpoint.";
    var useJ = S.imode === "j";
    box.innerHTML = S.inj.map(function (inj, k) {
      var cur;
      if (ca) {
        cur = useJ
          ? '<label class="field" style="margin:0"><span class="field__label">|j| (mA cm⁻²)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="j" value="' + esc(inj.j == null ? "" : inj.j) + '" placeholder="e.g. 100"></label>'
          : '<label class="field" style="margin:0"><span class="field__label">|I| (mA)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="I" value="' + esc(inj.I == null ? "" : inj.I) + '" placeholder="e.g. 10"></label>';
        cur += '<span class="gc-cell__out">E<sub>app</sub> ' + esc(S.Eset || "—") + " V</span>";
      } else {
        var phJ = S.cpmode === "j" ? esc(S.jset) : esc(S.Iset);
        var lab = S.cpmode === "j" ? "|j| set" : "|I| set";
        cur = '<label class="field" style="margin:0"><span class="field__label">E (V vs ref)</span><input class="input" inputmode="decimal" data-ik="' + k + '" data-f="E" value="' + esc(inj.E == null ? "" : inj.E) + '" placeholder="e.g. −1.00"></label>' +
          '<span class="gc-cell__out">' + lab + " " + phJ + "</span>";
      }
      return '<div class="gc-cur-row" data-k="' + k + '"><span class="gc-cur-row__t">' + esc(fmtT(inj.t)) + "</span>" + cur +
        '<span class="gc-cell__out" id="gc-cur-out-' + k + '">—</span></div>';
    }).join("");
    renderIRTable();
  }
  function renderIRTable() {
    var tbl = $("gc-ir-table"); if (!tbl) return;
    var c = cond(), rows = "", er = [], rr = [];
    S.inj.forEach(function (inj, k) {
      var rc = rowCur(inj, c), ir = computeIRRow(inj, rc);
      if (isFinite(ir.E_corr)) er.push(ir.E_corr);
      if (isFinite(ir.E_RHE)) rr.push(ir.E_RHE);
      rows += "<tr><td>" + esc(fmtT(inj.t)) + "</td><td>" + sig(ir.E_applied, 4) + "</td><td>" + sig(ir.I_mA, 4) + "</td><td>" + (ir.ci ? "0 (CI)" : sig(ir.Ru_unc, 4)) + "</td><td>" + sig(ir.E_corr, 4) + "</td><td>" + (isFinite(ir.E_RHE) ? sig(ir.E_RHE, 4) : "—") + "</td></tr>";
    });
    var em = mstat(er), rm = mstat(rr);
    tbl.querySelector("thead").innerHTML = "<tr><th>t</th><th>E_app (V)</th><th>|I| (mA)</th><th>Ru_unc (Ω)</th><th>E_corr vs ref</th><th>E_corr vs RHE</th></tr>";
    tbl.querySelector("tbody").innerHTML = rows +
      (er.length ? '<tr class="avg"><td>mean ± SD</td><td></td><td></td><td></td><td>' + pm(em, 4) + "</td><td>" + (rr.length ? pm(rm, 4) : "—") + "</td></tr>" : "");
  }
  function validateWizStep(n, soft) {
    var warn = $("gc-wiz-warn"), msg = "";
    if (n === 1) {
      if (S.technique === "CA" && !isFinite(pnum(S.Eset))) msg = "Enter the applied potential E for CA.";
      else if (S.technique === "CP" && S.cpmode === "I" && !(pnum(S.Iset) > 0)) msg = "Enter the applied |I| for CP.";
      else if (S.technique === "CP" && S.cpmode === "j" && !(pnum(S.jset) > 0)) msg = "Enter the applied |j| for CP.";
    } else if (n === 3) {
      if (S.irMode !== "ci") {
        var f = pnum(S.fComp); if (!isFinite(f)) f = 0;
        if (f < 100 && !(pnum(S.Ru) >= 0 && isFinite(pnum(S.Ru)))) msg = "Enter Ru (Ω), or set % compensated to 100 to skip iR correction.";
      }
    } else if (n === 4) {
      if (!(pnum(S.area) > 0)) msg = "Enter a geometric area greater than 0 cm².";
      else if (!(pnum(S.flow) > 0)) msg = "Enter a CO₂ flow greater than 0 sccm.";
    } else if (n === 5) {
      if (!isFinite(pnum(S.sched.t1)) || pnum(S.sched.t1) < 0) msg = "Enter the time of the first injection (s).";
      else if (!isFinite(pnum(S.sched.ana)) || pnum(S.sched.ana) < 0) msg = "Enter GC analysis time (min).";
      else if (!isFinite(pnum(S.sched.post)) || pnum(S.sched.post) < 0) msg = "Enter post-run time (s).";
    } else if (n === 6) {
      var c = cond(), ok = false;
      if (S.technique === "CP") ok = S.inj.some(function (inj) { return isFinite(pnum(inj.E)); });
      else ok = S.inj.some(function (inj) { return rowCur(inj, c).ok; });
      if (!ok) msg = S.technique === "CP" ? "Enter measured E for at least one injection." : "Enter measured |j| or |I| for at least one injection.";
    } else if (n === 7) {
      var anyPpm = S.inj.some(function (inj) {
        return S.products.some(function (p) { return isGas(p) && isFinite(pnum(inj.ppm[p.id])); });
      });
      var anyLiq = Object.keys(computeLiquid(cond())).length > 0;
      if (!anyPpm && !anyLiq) msg = "Enter at least one GC ppm (or liquid concentration) to calculate FE.";
    } else if (n === 8) {
      var L = GC._last;
      if (L && L.results) {
        var last = null;
        L.order.forEach(function (o) { if (L.results[o.i].any) last = L.results[o.i]; });
        if (last && isFinite(last.total)) {
          if (last.total > 110) msg = "Σ FE is " + sig(last.total, 3) + "% (>110%). Check flow, current, or GC calibration.";
          else if (last.total < 80) msg = "Σ FE is " + sig(last.total, 3) + "% (<80%). Liquid products or losses may be missing — that can be normal.";
        }
      }
    }
    if (warn) {
      if (msg) { warn.hidden = false; warn.textContent = msg; }
      else { warn.hidden = true; warn.textContent = ""; }
    }
    return soft ? true : !msg;
  }
  function bindInfoTips() {
    var pop = document.getElementById("gc-info-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "gc-info-pop"; pop.className = "info-pop"; pop.hidden = true; pop.setAttribute("role", "tooltip");
      document.body.appendChild(pop);
    }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".info-i");
      if (!btn) { pop.hidden = true; return; }
      e.preventDefault(); e.stopPropagation();
      pop.textContent = btn.getAttribute("data-info") || "";
      pop.hidden = false;
      var r = btn.getBoundingClientRect();
      var x = Math.min(window.innerWidth - 16, Math.max(8, r.left));
      var y = Math.max(8, r.top - 8);
      pop.style.left = x + "px";
      pop.style.top = "0px";
      requestAnimationFrame(function () {
        var h = pop.offsetHeight;
        pop.style.top = Math.max(8, r.top - h - 10) + "px";
        pop.style.setProperty("--arrow-x", Math.min(pop.offsetWidth - 16, Math.max(12, r.left - parseFloat(pop.style.left) + 4)) + "px");
      });
    });
  }

  function full() { migrate(); syncSched(); syncControls(); renderProducts(); renderInj(); renderCurrentStep(); renderSchedPreview(); update(); }


  function init() {
    if (!$("section-gc")) return;
    bindInfoTips();
    setUiMode(getUiMode());
    var uiMode = $("gc-ui-mode");
    if (uiMode) uiMode.addEventListener("click", function (e) {
      var b = e.target.closest(".seg__btn"); if (!b) return;
      setUiMode(b.dataset.v);
    });
    var wizBack = $("gc-wiz-back"), wizNext = $("gc-wiz-next");
    if (wizBack) wizBack.addEventListener("click", function () {
      var n = parseInt($("section-gc").getAttribute("data-wiz-step"), 10) || 1;
      setWizStep(n - 1);
    });
    if (wizNext) wizNext.addEventListener("click", function () {
      var n = parseInt($("section-gc").getAttribute("data-wiz-step"), 10) || 1;
      if (n >= 8) { setUiMode("expert"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (!validateWizStep(n, false)) return;
      setWizStep(n + 1);
    });
    var curBox = $("gc-current-step");
    if (curBox) curBox.addEventListener("input", function (e) {
      var k = e.target.dataset.ik; if (k == null) return;
      var f = e.target.dataset.f; if (f === "j" || f === "I" || f === "E") { S.inj[k][f] = e.target.value; renderInj(); update(); renderIRTable(); }
    });
    function bindVal(id, key, cb) {
      var el = $(id); if (!el) return;
      el.addEventListener("input", function (e) { S[key] = e.target.value; if (cb) cb(); else { syncControls(); renderCurrentStep(); update(); } });
      el.addEventListener("change", function (e) { S[key] = e.target.value; if (cb) cb(); else { syncControls(); renderCurrentStep(); update(); } });
    }
    ["area", "flow", "T", "P", "Eset", "Iset", "jset", "E0", "pH", "Ru", "fComp"].forEach(function (k) {
      bindVal("gc-" + k, k, function () { renderCurrentStep(); update(); });
    });
    bindVal("gc-notes", "notes", function () { save(); });
    ["gc-eref", "gc-eref-cp"].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener("change", function (e) { S.eref = e.target.value; syncControls(); renderCurrentStep(); update(); });
    });
    function segBind(id, key) {
      var el = $(id); if (!el) return;
      el.addEventListener("click", function (e) {
        var b = e.target.closest(".seg__btn"); if (!b) return;
        S[key] = b.dataset.v; syncControls(); renderInj(); renderCurrentStep(); update();
      });
    }
    segBind("gc-imode", "imode");
    segBind("gc-tech", "technique");
    segBind("gc-cpmode", "cpmode");
    segBind("gc-irmode", "irMode");
    segBind("gc-slope", "slopeMode");
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
      if (e.target.dataset.f === "n") { p.n = pnum(e.target.value) || 0; renderInj(); update(); }
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
      if (f === "t" || f === "j" || f === "I" || f === "E") {
        S.inj[k][f] = e.target.value;
        if (f === "t") { var u = $("gc-tunit-" + k); if (u) u.textContent = fmtT(e.target.value); }
      } else if (e.target.dataset.pid) S.inj[k].ppm[e.target.dataset.pid] = e.target.value;
      update();
    });
    $("gc-injections").addEventListener("click", function (e) {
      var tab = e.target.closest("[data-inj-tab]");
      if (tab) { injTab = parseInt(tab.getAttribute("data-inj-tab"), 10) || 0; renderInj(); update(); return; }
      var k = e.target.dataset.rmi;
      if (k != null && S.inj.length > 1) {
        S.inj.splice(k, 1); S.sched.count = S.inj.length;
        if (injTab >= S.inj.length) injTab = S.inj.length - 1;
        syncSched(); applySched(); renderInj(); update(); return;
      }
      var m = e.target.dataset.man;
      if (m != null) { S.inj[m].manual = !S.inj[m].manual; applySched(); renderInj(); update(); }
    });
    ["t1", "ana", "post", "count"].forEach(function (f) {
      $("gc-s-" + f).addEventListener("input", function (e) { S.sched[f] = e.target.value; if (f === "count") { var n = parseInt(e.target.value, 10); if (!(n >= 1 && n <= 6)) return; } applySched(); renderInj(); renderCurrentStep(); renderSchedPreview(); update(); });
    });
    $("gc-add-inj").addEventListener("click", function () {
      if (S.inj.length >= 6) return;
      S.sched.count = S.inj.length + 1; syncSched(); applySched();
      injTab = S.inj.length - 1; renderInj(); update();
      var el = document.querySelector(".gc-inj input[data-pid]"); if (el) el.focus();
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
    var se = $("gc-show-empty");
    if (se) { se.checked = !!S.showEmpty; se.addEventListener("change", function (e) { S.showEmpty = e.target.checked; update(); }); }
    $("gc-reset").addEventListener("click", function () { if (confirm("Clear all GC inputs?")) { S = defaults(); full(); } });
    full();
    if (getUiMode() === "guided") setWizStep(1);
    var wm = typeof location !== "undefined" && location.hash.match(/(?:^#|[?&,])wiz[=:](\d+)/);
    if (wm) setWizStep(parseInt(wm[1], 10));
  }
  GC.load = function (state) { S = JSON.parse(JSON.stringify(state)); full(); };
  GC.getState = function () { return JSON.parse(JSON.stringify(S)); };
  GC.reset = function () { S = defaults(); full(); };
  GC.csv = csv; GC.xlsx = xlsx;
  /* Compact results snapshot for history cards */
  GC.snapshot = function () {
    var L = GC._last || {}, res = L.results || [], order = L.order || [];
    var D = order.filter(function (o) { return res[o.i] && res[o.i].any; });
    var tot = D.map(function (o) { return res[o.i].total; });
    var per = {};
    S.products.forEach(function (p) {
      var a = D.map(function (o) { var x = res[o.i].per[p.id]; return x ? x.fe : null; }).filter(function (v) { return v != null; });
      if (a.length) per[p.id] = { name: prodDisplay(p), fe: mstat(a).m };
    });
    var top = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.fe - a.fe; }).slice(0, 3);
    var ts = mstat(tot);
    return { n: D.length, feTotal: isFinite(ts.m) ? ts.m : null, feTotalSD: isFinite(ts.sd) ? ts.sd : null, top: top,
      technique: S.technique, E: S.Eset, I: S.technique === "CP" ? (S.cpmode === "j" ? S.jset + " mA cm⁻²" : S.Iset + " mA") : "" };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
