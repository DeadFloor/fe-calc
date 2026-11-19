/* Stability test core (v1.5.0) — pure maths, schedule, Gamry .DTA parser and Origin-ready workbook builder.
   UMD: window.StabCore in the browser, module.exports in node (test-stability.js, make-sample-stability.js).
   Product catalog, F, R, reference electrodes and iR/RHE formulas are copied verbatim from app.js (GC online FE);
   test-stability.js checks that the copy still matches app.js. */
(function (root) {
  "use strict";
  var R = 8.314462618, F = 96485.33212;
  /* ---- copied from app.js (PRESETS, CUSTOM_HEX, PRESET_ORDER) ---- */
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
  /* ---- copied from app.js (EREF) ---- */
  var EREF = {
    agcl_sat: { label: "Ag/AgCl sat. KCl", E0: 0.197 },
    agcl_3m: { label: "Ag/AgCl 3 M KCl", E0: 0.210 },
    agcl_35m: { label: "Ag/AgCl 3.5 M KCl", E0: 0.205 },
    hgoh: { label: "Hg/HgO 1 M KOH/NaOH", E0: 0.098 },
    rhe: { label: "vs RHE already", E0: 0, noPh: true },
    custom: { label: "Custom", E0: null }
  };

  /* ---- same formulas as app.js (GC online FE) ---- */
  function prodSym(p) { return (p && (p.label || p.formula || p.name)) || ""; }
  function prodFull(p) { return (p && (p.name || p.label)) || ""; }
  function prodDisplay(p) {
    if (!p) return "";
    var n = prodFull(p), s = prodSym(p);
    if (!n) return s;
    if (!s || s === n) return n;
    return n + " (" + s + ")";
  }
  function molarFlow(flow_mL_min, T, P) { return P * (flow_mL_min * 1e-6 / 60) / (R * T); }
  function fe(ppm, n, ndotGas, I_A) { return n * F * (ppm * 1e-6) * ndotGas / I_A * 100; }
  function feLiquid(c_we_uM, c_ce_uM, Vw_mL, Vc_mL, n, Q_C) {
    var qw = (c_we_uM / 1e6) * (Vw_mL / 1e3) * n * F;
    var qc = (c_ce_uM / 1e6) * (Vc_mL / 1e3) * n * F;
    return (qw + qc) / Q_C * 100;
  }
  function ruUnc(Ru_ohm, f_comp_pct) {
    var f = (f_comp_pct == null || f_comp_pct === "") ? 0 : Number(f_comp_pct);
    if (!isFinite(Ru_ohm) || Ru_ohm < 0) return NaN;
    if (!isFinite(f) || f < 0) f = 0;
    if (f >= 100) return 0;
    if (f > 95) f = 95;
    return Ru_ohm * (1 - f / 100);
  }
  function eCorr(E_applied, I_A_abs, Ru_ohm, f_comp_pct) {
    if (!isFinite(E_applied)) return NaN;
    var f = (f_comp_pct == null || f_comp_pct === "") ? 0 : Number(f_comp_pct);
    if (isFinite(f) && f >= 100) return E_applied;
    var ru = ruUnc(Ru_ohm, f_comp_pct);
    if (!isFinite(ru) || !isFinite(I_A_abs)) return NaN;
    return E_applied + Math.abs(I_A_abs) * ru;
  }
  function nernstSlope(mode, T_K) {
    if (mode === "nernst") { var T = isFinite(T_K) ? T_K : 298.15; return 2.303 * R * T / F; }
    return 0.0591;
  }
  function eRhe(E_corr, E0_ref, pH, slope, alreadyRhe) {
    if (!isFinite(E_corr)) return NaN;
    if (alreadyRhe) return E_corr;
    if (!isFinite(E0_ref)) return NaN;
    if (!isFinite(pH)) return NaN;
    return E_corr + E0_ref + slope * pH;
  }

  /* ---- helpers ---- */
  function pnum(v) { if (v === "" || v == null) return NaN; return parseFloat(String(v).replace(",", ".")); }
  function P(id) { var p = PRESETS[id]; return p ? { id: id, name: p.name, label: p.label, formula: p.formula, n: p.n, phase: p.phase, detector: p.detector, hex: p.hex } : null; }
  function isCarbon(id) { var p = PRESETS[id]; return !!p && /C/.test(p.formula); }
  function mstat(a) {
    a = a.filter(isFinite); var n = a.length, m = 0, s = 0;
    if (!n) return { n: 0, m: NaN, sd: NaN };
    a.forEach(function (v) { m += v; }); m /= n;
    if (n > 1) { a.forEach(function (v) { s += (v - m) * (v - m); }); s = Math.sqrt(s / (n - 1)); } else s = NaN;
    return { n: n, m: m, sd: s };
  }

  /* ---- time: all clock times are Singapore time (UTC+8, no DST), independent of the device zone ---- */
  var SGT = 8 * 3600e3, WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseSGT(s) {
    var m = String(s == null ? "" : s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - SGT;
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function parts(ms) { var d = new Date(Math.round(ms / 1000) * 1000 + SGT); return { Y: d.getUTCFullYear(), M: d.getUTCMonth(), D: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay() }; }
  function toInputSGT(ms) { if (!isFinite(ms)) return ""; var q = parts(ms); return q.Y + "-" + p2(q.M + 1) + "-" + p2(q.D) + "T" + p2(q.h) + ":" + p2(q.m) + ":" + p2(q.s); }
  function fmtISO(ms) { return isFinite(ms) ? toInputSGT(ms).replace("T", " ") : ""; }
  function fmtClock(ms, noDate) {
    if (!isFinite(ms)) return "—"; var q = parts(ms), t = p2(q.h) + ":" + p2(q.m) + ":" + p2(q.s);
    return noDate ? WD[q.wd] + " " + t : WD[q.wd] + " " + q.D + " " + MO[q.M] + " " + t;
  }
  function fmtDur(s) {
    if (!isFinite(s)) return "—"; var neg = s < 0; s = Math.round(Math.abs(s));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (neg ? "−" : "") + (h ? h + ":" + p2(m) : m) + ":" + p2(x);
  }

  /* ---- defaults ---- */
  var DEFAULT_GAS = ["H2", "CO", "CH4", "C2H4"];
  var DEFAULT_LIQ = ["MeOH", "EtOH", "nPrOH", "MeCHO", "AllylOH"];
  function defaults() {
    return {
      schema: 1, runName: "", notes: "",
      I_mA: "", area: "1", flow: "20", gasRef: "std", T: "298.15", P: "101325",
      pH: "", eref: "agcl_sat", E0: "0.197", slopeMode: "0591", irMode: "ci", Ru: "", fComp: "0",
      runStart: "2026-11-26T10:00:00", firstInj: "2026-11-26T10:15:00", interval: "1287", blockH: "4", runH: "24", liqH: "6",
      swaps: [
        { planned: "2026-11-26T16:08:55", actual: "", salt: false, note: "" },
        { planned: "2026-11-26T21:52:07", actual: "", salt: false, note: "" },
        { planned: "2026-11-27T03:56:46", actual: "", salt: false, note: "" }
      ],
      final: { planned: "2026-11-27T10:00:00", actual: "", salt: false, note: "" },
      gasIds: DEFAULT_GAS.slice(), liqIds: DEFAULT_LIQ.slice(),
      inj: {}, liq: {}, h2Thresh: "5", guardS: "300"
    };
  }

  /* ---- schedule ----
     t_k = t_first + (k − 1)·Δt_inj (k = 1…N, all t_k ≤ run end); elapsed el_k = t_k − t0;
     block b_k = floor(el_k / block length) (0-based; shown 1-based). */
  function buildSchedule(st) {
    var t0 = parseSGT(st.runStart), t1 = parseSGT(st.firstInj), iv = pnum(st.interval);
    var bl = pnum(st.blockH) * 3600, rl = pnum(st.runH) * 3600, guard = isFinite(pnum(st.guardS)) ? pnum(st.guardS) : 300;
    var out = { ok: false, errors: [], warnings: [], injections: [], events: [], windows: [], defaultEx: {}, t0: t0, tEnd: NaN, blockS: bl, runS: rl, interval: iv, nBlocks: 0, guard: guard };
    if (!isFinite(t0)) out.errors.push("Run start time is not a valid date/time.");
    if (!isFinite(t1)) out.errors.push("First injection time is not a valid date/time.");
    if (!(iv > 0)) out.errors.push("Injection interval must be > 0 s.");
    if (!(bl > 0)) out.errors.push("Gas block length must be > 0 h.");
    if (!(rl > 0)) out.errors.push("Run length must be > 0 h.");
    if (out.errors.length) return out;
    var tEnd = t0 + rl * 1000; out.tEnd = tEnd;
    if (t1 < t0) out.errors.push("First injection is before the run start.");
    if (t1 > tEnd) out.errors.push("First injection is after the run end.");
    if (out.errors.length) return out;
    out.nBlocks = Math.max(1, Math.ceil(rl / bl - 1e-9));
    for (var k = 1; k < 5000; k++) {
      var ms = t1 + (k - 1) * iv * 1000; if (ms > tEnd + 1e-6) break;
      var el = (ms - t0) / 1000, b = Math.min(out.nBlocks - 1, Math.floor(el / bl + 1e-9));
      out.injections.push({ k: k, ms: ms, el: el, h: el / 3600, block: b });
    }
    var evs = (st.swaps || []).map(function (s, i) { return { type: "swap", idx: i, label: "Swap " + (i + 1), src: s }; });
    evs.push({ type: "final", idx: evs.length, label: "Final collection", src: st.final || { planned: toInputSGT(tEnd) } });
    var prev = t0;
    evs.forEach(function (e) {
      var pl = parseSGT(e.src.planned), ac = parseSGT(e.src.actual);
      e.planned = pl; e.actual = ac; e.logged = isFinite(ac); e.ms = isFinite(ac) ? ac : pl; e.el = (e.ms - t0) / 1000;
      e.salt = !!e.src.salt; e.note = e.src.note || "";
      if (!isFinite(e.ms)) { out.errors.push(e.label + ": time is not valid."); return; }
      if (e.ms <= prev) out.errors.push(e.label + " (" + fmtClock(e.ms) + ") must be after the previous change.");
      if (e.ms > tEnd + 1e-6 && e.type === "swap") out.warnings.push(e.label + " is after the run end.");
      prev = e.ms;
      e.near = out.injections.filter(function (j) { return Math.abs(j.ms - e.ms) < guard * 1000; }).map(function (j) { return { k: j.k, dt: (e.ms - j.ms) / 1000 }; });
      if (e.near.length && e.type === "swap") out.warnings.push(e.label + " at " + fmtClock(e.ms, true) + " is within " + Math.round(guard / 60) + " min of injection " + e.near.map(function (n) { return "#" + n.k; }).join(", ") + ".");
      e.firstAfter = null;
      if (e.type === "swap") { for (var q = 0; q < out.injections.length; q++) if (out.injections[q].ms > e.ms) { e.firstAfter = out.injections[q].k; break; } }
      if (e.firstAfter) out.defaultEx[e.firstAfter] = e.label;
    });
    out.events = evs;
    if (out.errors.length) return out;
    var bounds = [t0].concat(evs.map(function (e) { return e.ms; }));
    for (var w = 0; w < bounds.length - 1; w++) out.windows.push({ w: w, startMs: bounds[w], endMs: bounds[w + 1], dt: (bounds[w + 1] - bounds[w]) / 1000, endEvent: evs[w] });
    out.ok = true;
    return out;
  }
  /* Place swaps at the midpoint of the injection gap that contains each liquid-window mark (t0 + m·liqH). */
  function autoSwaps(st, liqH) {
    var s = buildSchedule(Object.assign({}, st, { swaps: [], final: { planned: st.final && st.final.planned || "" } }));
    if (!s.injections.length) return [];
    liqH = liqH || pnum(st.liqH) || 6; var out = [], marks = Math.floor(s.runS / (liqH * 3600) - 1e-9);
    for (var m = 1; m <= marks; m++) {
      var mark = s.t0 + m * liqH * 3600e3, a = null, b = null;
      s.injections.forEach(function (j) { if (j.ms <= mark) a = j; else if (!b) b = j; });
      var t = (a && b) ? (a.ms + b.ms) / 2 : mark;
      out.push(toInputSGT(Math.floor(t / 1000) * 1000));
    }
    return out;
  }
  /* Re-anchor: injection #k actually happened at timeStr → new first-injection time. */
  function reanchor(k, timeStr, interval) {
    var t = parseSGT(timeStr), iv = pnum(interval); k = Math.max(1, Math.round(pnum(k) || 1));
    if (!isFinite(t) || !(iv > 0)) return "";
    return toInputSGT(t - (k - 1) * iv * 1000);
  }

  /* ---- run conditions ---- */
  function cond(st) {
    var I_mA = pnum(st.I_mA), A = pnum(st.area), flow = pnum(st.flow);
    var std = st.gasRef !== "custom", T = std ? 273.15 : pnum(st.T), Pa = std ? 101325 : pnum(st.P);
    var ref = EREF[st.eref] || EREF.agcl_sat, E0 = st.eref === "custom" ? pnum(st.E0) : ref.E0;
    var ci = st.irMode !== "manual", Ru = pnum(st.Ru), fC = st.fComp;
    var c = { I_mA: I_mA, IA: I_mA / 1000, A: A, jtot: I_mA / A, flow: flow, T: T, P: Pa, ndot: molarFlow(flow, T, Pa),
      E0: E0, refLabel: ref.label, noPh: !!ref.noPh, pH: pnum(st.pH), slope: nernstSlope(st.slopeMode, std ? 298.15 : T),
      ci: ci, Ru: Ru, fComp: fC, RuUnc: ci ? 0 : ((pnum(fC) >= 100) ? 0 : ruUnc(Ru, fC)) };
    c.okGas = c.I_mA > 0 && c.ndot > 0 && isFinite(c.ndot);
    c.basis = (c.noPh || isFinite(c.pH)) && (c.noPh || isFinite(E0)) ? "RHE" : "ref";
    return c;
  }
  function eChain(E, c, I_A) {
    var IA = isFinite(I_A) ? Math.abs(I_A) : c.IA;
    var Ec = c.ci ? (isFinite(E) ? E : NaN) : eCorr(E, IA, c.Ru, c.fComp);
    return { E: E, Ec: Ec, Er: eRhe(Ec, c.E0, c.pH, c.slope, c.noPh) };
  }

  /* ---- per-injection gas FE ----
     ṅ_gas = P·(flow·1e-6/60)/(R·T);  FE_i = n_i·F·ppm_i·1e-6·ṅ_gas/|I|·100;  j_i = FE_i/100·|I|/A.
     A blank ppm in an injection that has any ppm entered counts as 0 (not detected). */
  function hasPpm(rec, ids) { return !!rec && !!rec.ppm && ids.some(function (id) { return isFinite(pnum(rec.ppm[id])); }); }
  function computeInjections(st, sch, c) {
    c = c || cond(st);
    return sch.injections.map(function (j) {
      var rec = (st.inj || {})[j.k] || {}, has = hasPpm(rec, st.gasIds), dEx = sch.defaultEx[j.k];
      var ex = rec.ex == null ? !!dEx : !!rec.ex;
      var r = { k: j.k, ms: j.ms, el: j.el, h: j.h, block: j.block, has: has, ex: ex, exDefault: !!dEx,
        reason: ex ? (rec.ex === true && !dEx ? "excluded (manual)" : rec.ex == null ? "first after " + dEx.toLowerCase() : "excluded (manual)") : (has ? "" : "no GC data"),
        fe: {}, j: {}, ppm: {}, feTot: NaN, feC: NaN };
      var e = eChain(pnum(rec.E), c); r.E = e.E; r.Ec = e.Ec; r.Er = e.Er; r.Eb = c.basis === "RHE" ? e.Er : e.Ec;
      if (has && c.okGas) {
        var tot = 0, cs = 0;
        st.gasIds.forEach(function (id) {
          var p = PRESETS[id], ppm = pnum(rec.ppm[id]); if (!isFinite(ppm)) ppm = 0;
          var f = fe(ppm, p.n, c.ndot, c.IA); r.ppm[id] = ppm; r.fe[id] = f; r.j[id] = f / 100 * c.jtot; tot += f; if (isCarbon(id)) cs += f;
        });
        r.feTot = tot; r.feC = cs;
      }
      r.included = has && !ex && c.okGas;
      return r;
    });
  }
  /* ---- block averages: mean ± sample SD (n − 1) over included injections ---- */
  function blockStats(st, sch, res) {
    var out = [];
    for (var b = 0; b < sch.nBlocks; b++) {
      var inc = res.filter(function (r) { return r.block === b && r.included; }), all = res.filter(function (r) { return r.block === b; });
      var s = { b: b, tStart: b * sch.blockS / 3600, tEnd: Math.min((b + 1) * sch.blockS, sch.runS) / 3600, ks: inc.map(function (r) { return r.k; }),
        kFirst: all.length ? all[0].k : null, kLast: all.length ? all[all.length - 1].k : null, nAll: all.length, n: inc.length, fe: {}, j: {} };
      s.tMid = (s.tStart + s.tEnd) / 2;
      st.gasIds.forEach(function (id) { s.fe[id] = mstat(inc.map(function (r) { return r.fe[id]; })); s.j[id] = mstat(inc.map(function (r) { return r.j[id]; })); });
      s.tot = mstat(inc.map(function (r) { return r.feTot; })); s.carbon = mstat(inc.map(function (r) { return r.feC; }));
      s.Ec = mstat(inc.map(function (r) { return r.Ec; })); s.Er = mstat(inc.map(function (r) { return r.Er; })); s.Eb = mstat(inc.map(function (r) { return r.Eb; }));
      out.push(s);
    }
    return out;
  }
  /* ---- liquid FE per electrolyte window ----
     Q = |I|·Δt (CP; Δt from the actual swap-to-swap times) unless a measured Q is entered;
     FE_i = n_i·F·(c_WE·V_WE + c_CE·V_CE)/Q·100 with c in μM → mol L⁻¹ ×1e-6 and V in mL → L ×1e-3. */
  function liquidWindows(st, sch, c) {
    c = c || cond(st);
    return sch.windows.map(function (w) {
      var L = (st.liq || {})[w.w] || {}, Qc = c.IA * w.dt, Qm = pnum(L.Qm), Q = Qm > 0 ? Qm : Qc;
      var Vw = pnum(L.Vw), Vc = pnum(L.Vc), o = { w: w.w, startMs: w.startMs, endMs: w.endMs, dt: w.dt, tStart: (w.startMs - sch.t0) / 3600e3, tEnd: (w.endMs - sch.t0) / 3600e3,
        Qcalc: Qc, Qm: Qm, Q: Q, Qsrc: Qm > 0 ? "measured" : "|I|·Δt", Vw: Vw, Vc: Vc, c: {}, fe: {}, tot: NaN, any: false };
      o.tMid = (o.tStart + o.tEnd) / 2;
      var tot = 0, nOk = 0;
      st.liqIds.forEach(function (id) {
        var cc = (L.c || {})[id] || {}, cw = pnum(cc.we), ce = pnum(cc.ce);
        o.c[id] = { we: cw, ce: ce };
        if (!isFinite(cw) && !isFinite(ce)) return;
        o.any = true;
        var f = (isFinite(Vw) && isFinite(Vc) && Q > 0) ? feLiquid(isFinite(cw) ? cw : 0, isFinite(ce) ? ce : 0, Vw, Vc, PRESETS[id].n, Q) : NaN;
        o.fe[id] = f; if (isFinite(f)) { tot += f; nOk++; }
      });
      o.tot = nOk ? tot : NaN;
      return o;
    });
  }
  /* ---- stability check ----
     E drift = (mean E of last block with data − mean E of first block with data)·1000 mV (E_RHE if pH known, else E_corr vs ref);
     spread = (max − min) of included injection E ·1000 mV; ΔFE_H2,b = FE_H2,b − FE_H2,first (pp), flagged when > threshold;
     liquid FE on a block = Σ_w FE_liq,w · overlap(w,b)/block duration (constant |I| ⇒ charge ∝ time); blank if any overlapping window is missing. */
  function overlapW(sch, wins, b) {
    var bs = sch.t0 + b * sch.blockS * 1000, be = sch.t0 + Math.min((b + 1) * sch.blockS, sch.runS) * 1000, d = be - bs;
    return wins.map(function (w) { return { w: w.w, f: Math.max(0, Math.min(be, w.endMs) - Math.max(bs, w.startMs)) / d }; }).filter(function (x) { return x.f > 1e-12; });
  }
  function stabilityCheck(st, sch, res, blocks, wins) {
    var thr = pnum(st.h2Thresh); if (!isFinite(thr)) thr = 5;
    var withE = blocks.filter(function (b) { return isFinite(b.Eb.m); });
    var o = { thr: thr, basis: cond(st).basis, first: withE[0] || null, last: withE.length ? withE[withE.length - 1] : null };
    o.driftMV = withE.length >= 2 ? (o.last.Eb.m - o.first.Eb.m) * 1000 : NaN;
    var Es = res.filter(function (r) { return r.included && isFinite(r.Eb); }).map(function (r) { return r.Eb; });
    o.spreadMV = Es.length >= 2 ? (Math.max.apply(null, Es) - Math.min.apply(null, Es)) * 1000 : NaN;
    o.spreadKs = res.filter(function (r) { return r.included && isFinite(r.Eb); }).map(function (r) { return r.k; });
    var hasH2 = st.gasIds.indexOf("H2") > -1, h2b = blocks.filter(function (b) { return hasH2 && isFinite(b.fe.H2 && b.fe.H2.m); });
    var base = h2b.length ? h2b[0].fe.H2.m : NaN; o.h2Base = h2b.length ? h2b[0].b : null;
    o.blocks = blocks.map(function (b) {
      var h = hasH2 && b.fe.H2 ? b.fe.H2 : { m: NaN, sd: NaN, n: 0 }, d = h.m - base;
      var ov = overlapW(sch, wins, b.b), liq = 0, okL = ov.length > 0;
      ov.forEach(function (x) { var t = wins[x.w].tot; if (isFinite(t)) liq += t * x.f; else okL = false; });
      var lt = okL ? liq : NaN;
      return { b: b.b, tMid: b.tMid, n: b.n, E: b.Eb.m, dE: isFinite(b.Eb.m) && o.first ? (b.Eb.m - o.first.Eb.m) * 1000 : NaN,
        h2: h.m, h2sd: h.sd, dH2: d, flag: isFinite(d) && d > thr, gasC: b.carbon.m, liqTW: lt, ov: ov,
        carbonTot: isFinite(b.carbon.m) && isFinite(lt) ? b.carbon.m + lt : NaN, feTot: isFinite(b.tot.m) && isFinite(lt) ? b.tot.m + lt : NaN };
    });
    o.flagged = o.blocks.filter(function (b) { return b.flag; }).map(function (b) { return b.b; });
    var seq = o.blocks.filter(function (b) { return isFinite(b.h2); });
    o.h2Rising = seq.length >= 3 ? seq.every(function (b, i) { return i === 0 || b.h2 > seq[i - 1].h2; }) : null;
    o.salt = sch.events.filter(function (e) { return e.salt; }).map(function (e) { return e.label; });
    return o;
  }

  /* ---- Gamry .DTA (CP) parser: tab-separated table after a "CURVE…<TAB>TABLE" line,
     then a column-name row (Pt T Vf Im …) and a units row. Several CURVE tables are concatenated;
     if T restarts in a later table it is offset by the previous table's last T. ---- */
  function parseDTA(text) {
    var lines = String(text).split(/\r?\n/), out = { t: [], v: [], i: [], date: "", time: "", tables: 0, units: {} }, offset = 0;
    for (var x = 0; x < lines.length; x++) {
      var ln = lines[x], f0 = ln.split("\t");
      if (f0[0] === "DATE" && !out.date) out.date = (f0[2] || "").trim();
      if (f0[0] === "TIME" && !out.time) out.time = (f0[2] || "").trim();
      if (!/^CURVE\w*\tTABLE/i.test(ln)) continue;
      var hdr = (lines[x + 1] || "").split("\t").map(function (s) { return s.trim(); }), un = (lines[x + 2] || "").split("\t").map(function (s) { return s.trim(); });
      var iT = hdr.indexOf("T"), iV = hdr.indexOf("Vf"), iI = hdr.indexOf("Im");
      if (iT < 0 || iV < 0 || iI < 0) continue;
      out.units = { T: un[iT] || "s", Vf: un[iV] || "V vs. Ref.", Im: un[iI] || "A" };
      out.tables++;
      var first = true, last = out.t.length ? out.t[out.t.length - 1] : 0;
      for (var y = x + 3; y < lines.length; y++) {
        var row = lines[y]; if (!/^\s/.test(row) || !row.trim()) { if (row.trim()) break; else continue; }
        var c = row.split("\t"), t = pnum(c[iT]), v = pnum(c[iV]), i = pnum(c[iI]);
        if (!isFinite(t) || !isFinite(v) || !isFinite(i)) continue;
        if (first) { if (out.t.length && t < last) offset = last; first = false; }
        out.t.push(t + offset); out.v.push(v); out.i.push(i);
        x = y;
      }
    }
    out.n = out.t.length;
    if (!out.n) throw new Error("No CURVE table with T, Vf and Im columns found in this file.");
    return out;
  }
  /* min/max decimation for display (full data kept for export) */
  function downsample(t, y, maxPts) {
    var n = t.length; maxPts = maxPts || 1200;
    if (n <= maxPts) return t.map(function (v, k) { return [v, y[k]]; });
    var buckets = Math.floor(maxPts / 2), size = n / buckets, out = [];
    for (var b = 0; b < buckets; b++) {
      var s = Math.floor(b * size), e = Math.min(n, Math.floor((b + 1) * size)), lo = s, hi = s;
      for (var k = s; k < e; k++) { if (y[k] < y[lo]) lo = k; if (y[k] > y[hi]) hi = k; }
      if (lo < hi) { out.push([t[lo], y[lo]]); out.push([t[hi], y[hi]]); } else if (lo > hi) { out.push([t[hi], y[hi]]); out.push([t[lo], y[lo]]); } else out.push([t[lo], y[lo]]);
    }
    return out;
  }

  /* ---- everything at once ---- */
  function computeAll(st, dta) {
    var sch = buildSchedule(st), c = cond(st);
    if (!sch.ok) return { st: st, sch: sch, c: c, res: [], blocks: [], wins: [], chk: null, dta: dta || null };
    var res = computeInjections(st, sch, c), blocks = blockStats(st, sch, res), wins = liquidWindows(st, sch, c);
    return { st: st, sch: sch, c: c, res: res, blocks: blocks, wins: wins, chk: stabilityCheck(st, sch, res, blocks, wins), dta: dta || null };
  }

  /* ---- backup format ---- */
  var BACKUP = "fecalc-stability-backup";
  function backupJSON(list, ver) { return JSON.stringify({ format: BACKUP, version: 1, exportedAt: new Date().toISOString(), appVersion: ver || "", runs: list }, null, 2); }
  function parseBackup(text) {
    var o = JSON.parse(text), arr = Array.isArray(o) ? o : o && (o.runs || o.experiments);
    if (!Array.isArray(arr)) throw new Error("Not a stability-test backup file.");
    return arr.filter(function (r) { return r && r.id && r.state && r.state.swaps; });
  }

  /* ===== Origin-ready workbook (ExcelJS) =====
     Flat sheets, one header row (name + units), no merged cells, header frozen; formulas carry cached results
     so Origin (which reads cached values) and Excel (recalculates on load) agree. Style follows app.js export. */
  var XS = { navy: "FF14213D", grey: "FFE9ECEF", yellow: "FFFFF6CC", orange: "FFFDE8D0", red: "FFFDE2E1", white: "FFFFFFFF", thin: { style: "thin", color: { argb: "FFB8BEC6" } } };
  function xfill(a) { return { type: "pattern", pattern: "solid", fgColor: { argb: a } }; }
  function xbox() { return { top: XS.thin, left: XS.thin, bottom: XS.thin, right: XS.thin }; }
  function colL(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function fin(v) { return typeof v === "number" ? (isFinite(v) ? v : null) : v; }
  function Fm(f, v) { v = fin(v); return v == null || v === "" ? { formula: f } : { formula: f, result: v }; }
  function Sheet(wb, name) {
    var ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: 0, ySplit: 1 }] }), cols = [];
    return {
      ws: ws, cols: cols,
      col: function (h, fmt, w) { cols.push({ h: h, fmt: fmt || "General", w: w }); return colL(cols.length - 1); },
      gap: function () { cols.push({ h: null, gap: true, w: 3 }); return colL(cols.length - 1); },
      idx: function (h) { for (var i = 0; i < cols.length; i++) if (cols[i].h === h) return colL(i); return null; },
      set: function (a1, v) { var c = ws.getCell(a1); c.value = v == null ? null : (typeof v === "number" && !isFinite(v) ? null : v); return c; },
      finish: function (maxRowByCol) {
        cols.forEach(function (c, i) {
          var L = colL(i), hc = ws.getCell(L + "1"); ws.getColumn(i + 1).width = c.w || Math.min(26, Math.max(10, String(c.h || "").length * 0.6 + 3));
          if (c.gap) return;
          hc.value = c.h; hc.font = { name: "Calibri", size: 10, bold: true }; hc.fill = xfill(XS.grey); hc.border = xbox();
          hc.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
          var last = maxRowByCol && maxRowByCol[i] != null ? maxRowByCol[i] : ws.rowCount, big = last > 3000;
          for (var r = 2; r <= last; r++) {
            var x = ws.getCell(L + r); x.numFmt = c.fmt;
            if (!big) { x.font = { name: "Calibri", size: 10 }; x.border = xbox(); }
          }
        });
        ws.getRow(1).height = 45;
      }
    };
  }
  function buildWorkbook(EJ, M, opts) {
    opts = opts || {};
    var st = M.st, sch = M.sch, c = M.c, res = M.res, blocks = M.blocks, wins = M.wins, chk = M.chk, dta = M.dta;
    var gas = st.gasIds.map(P), liq = st.liqIds.map(P), ver = opts.version || "";
    var wb = new EJ.Workbook(); wb.creator = "FE Calculator " + ver + " — Stability test"; wb.calcProperties = { fullCalcOnLoad: true };
    var shE = Sheet(wb, "E_t"), shG = Sheet(wb, "GC_injections"), shB = Sheet(wb, "GC_block_avg"), shL = Sheet(wb, "Liquid_windows"),
      shS = Sheet(wb, "Stability_summary"), shC = Sheet(wb, "Schedule"), shM = Sheet(wb, "Meta_notes");
    var sampleTag = opts.sampleLabel || "";

    /* ---------- Meta_notes (built first: other sheets reference its cells) ---------- */
    shM.col("Parameter", "General", 34); shM.col("Value", "General", 30); shM.col("Unit", "General", 14); shM.col("Note", "General", 90);
    var mrow = {}, mr = 2;
    function meta(key, label, val, unit, note, fmt) {
      mrow[key] = mr;
      shM.set("A" + mr, label); var cell = shM.set("B" + mr, val); shM.set("C" + mr, unit || ""); shM.set("D" + mr, note || "");
      if (fmt) cell.numFmt = fmt;
      if (opts.inputKeys && opts.inputKeys.indexOf(key) > -1) cell.fill = xfill(XS.yellow);
      mr++;
    }
    function MR(key) { return "Meta_notes!$B$" + mrow[key]; }
    var num = function (v) { var x = pnum(v); return isFinite(x) ? x : null; };
    if (sampleTag) meta("sample", "DATA LABEL", sampleTag, "", "Every number in this workbook is illustrative example data, not a measurement.");
    meta("name", "Run name", st.runName || "", "", "");
    meta("F", "Faraday constant F", F, "C mol^-1", "Same constant as the FE calculator (app.js).", "0.00000");
    meta("R", "Gas constant R", R, "J mol^-1 K^-1", "", "0.000000000");
    meta("I", "CP current |I|", num(st.I_mA), "mA", "Constant applied current magnitude (chronopotentiometry).", "0.000");
    meta("A", "Geometric area", num(st.area), "cm^2", "Exposed geometric area (not ECSA).", "0.000");
    meta("j", "|j| total", Fm(MR("I") + "/" + MR("A"), c.jtot), "mA cm^-2", "= |I| / A", "0.000");
    meta("flow", "CO2 flow", num(st.flow), "sccm (mL min^-1)", "Outlet flow assumed ≈ inlet CO2 flow.", "0.00");
    meta("T", "Gas T for flow", c.T, "K", st.gasRef === "custom" ? "Custom T" : "Standard reference (273.15 K)", "0.00");
    meta("P", "Gas P for flow", c.P, "Pa", st.gasRef === "custom" ? "Custom P" : "Standard reference (101325 Pa)", "0");
    meta("ndot", "Molar gas flow ṅ_gas", Fm(MR("P") + "*(" + MR("flow") + "*1E-6/60)/(" + MR("R") + "*" + MR("T") + ")", c.ndot), "mol s^-1", "ṅ_gas = P·(flow·1e-6/60)/(R·T)", "0.000E+00");
    meta("eref", "Reference electrode", c.refLabel, "", "");
    meta("E0", "E°ref (vs SHE)", isFinite(c.E0) ? c.E0 : null, "V", "", "0.000");
    meta("rhe", "E already vs RHE (1 = yes)", c.noPh ? 1 : 0, "", "", "0");
    meta("pH", "Electrolyte pH", num(st.pH), "", "Blank → no RHE conversion.", "0.00");
    meta("slope", "Nernst slope", c.slope, "V per pH", st.slopeMode === "nernst" ? "2.303·R·T/F" : "0.0591 V (25 °C)", "0.00000");
    meta("ir", "iR mode", c.ci ? "CI" : "Manual", "", c.ci ? "Current interrupt: compensated in real time, E_corr = E (Ru_unc = 0)." : "Manual: E_corr = E + |I|·Ru_unc (cathodic).");
    meta("Ru", "Ru", num(st.Ru), "Ω", "", "0.00");
    meta("f", "% compensated during run", num(st.fComp), "%", "Capped at 95 %; 100 → no correction.", "0");
    meta("Ruu", "Ru_unc", Fm('IF(' + MR("ir") + '="CI",0,IF(N(' + MR("f") + ')>=100,0,IF(' + MR("Ru") + '="","",' + MR("Ru") + '*(1-MIN(N(' + MR("f") + '),95)/100))))', c.RuUnc), "Ω", "Ru_unc = Ru·(1 − min(f,95)/100)", "0.000");
    meta("t0", "Run start (SGT)", fmtISO(sch.t0), "UTC+8", "All clock times in this workbook are Singapore time.");
    meta("t1", "First injection (SGT)", fmtISO(parseSGT(st.firstInj)), "UTC+8", "");
    meta("iv", "Injection interval", num(st.interval), "s", "t_k = t_first + (k − 1)·interval", "0.###");
    meta("bl", "Gas block length", num(st.blockH), "h", "block = floor((t_k − t0)/block length)", "0.##");
    meta("rl", "Run length", num(st.runH), "h", "", "0.##");
    meta("guard", "Swap–injection guard", sch.guard, "s", "Swaps closer than this to an injection are flagged.", "0");
    meta("thr", "H2 FE warning threshold", num(st.h2Thresh), "percentage points", "Flag a block when FE_H2 exceeds the first block with data by more than this.", "0.0");
    gas.concat(liq).forEach(function (p) { meta("n_" + p.id, "n_e " + prodDisplay(p), p.n, "e^-", "Ne = 4C + H − 2O (" + p.formula + "); " + p.phase + " product", "0"); });
    var notes = [
      ["Gas FE", "FE_i (%) = n_i·F·(ppm_i·1e-6)·ṅ_gas / |I| ·100. A blank ppm in an injection with any ppm entered counts as 0 (not detected)."],
      ["Partial j", "j_i (mA cm^-2) = FE_i/100 · |I|/A"],
      ["Potential", "E_corr = E (CI) or E + |I|·Ru_unc (manual);  E_RHE = E_corr + E°ref + slope·pH"],
      ["Blocks", "Block averages = arithmetic mean and sample SD (n − 1) over included injections. Included = has GC data and not excluded. The first injection after each electrolyte swap is excluded by default. Block formulas reference the rows included at export; re-export from the app after changing exclusions."],
      ["Liquid FE", "FE_i (%) = n_i·F·(c_WE·1e-6·V_WE·1e-3 + c_CE·1e-6·V_CE·1e-3)/Q ·100; Q = |I|·Δt from the actual swap-to-swap times unless a measured Q is entered. c_WE = catholyte, c_CE = anolyte; volumes as measured at each swap."],
      ["Liquid FE on blocks", "Stability_summary liquid FE per block = Σ_w FE_liq,w × (overlap of window w with the block)/(block duration). Valid because |I| is constant (charge ∝ time); blank if any overlapping window has no liquid data."],
      ["E drift", "E drift = mean E of the last block with data − mean E of the first block with data (mV). Spread = max − min of included injection E (mV). Uses E_RHE if pH is known, else E_corr vs reference."],
      ["Stability claim", "Under chronopotentiometry a flat E alone does not prove stability: the potentiostat holds the current, so a degrading cathode (flooding, salt precipitation, catalyst restructuring) can keep a near-constant E while selectivity shifts towards H2. The stability claim rests on the E drift together with the H2 FE trend and the carbon-product FE trend (gas + liquid) across blocks, plus the GDE-back observations at each swap."],
      ["E vs t", "E_t holds the potential at each injection (live during the run)" + (dta ? " and the full Gamry .DTA CP trace (" + dta.n + " points, values not formulas)." : "; no Gamry .DTA trace was loaded.")],
      ["Storage", "Generated offline in the FE calculator; data stays on the device."]
    ];
    if (dta) notes.push(["DTA", "DTA T is taken as elapsed time from the run start (T = 0 at " + fmtISO(sch.t0) + " SGT). File DATE/TIME labels: " + (dta.date || "?") + " " + (dta.time || "?") + "."]);
    notes.forEach(function (n) { mrow["note_" + n[0]] = mr; shM.set("A" + mr, n[0]); shM.set("D" + mr, n[1]); mr++; });

    /* ---------- GC_injections ---------- */
    var G = {};
    G.k = shG.col("Injection #", "0", 11); G.b = shG.col("Block", "0", 8); G.clk = shG.col("Clock (SGT)", "@", 20); G.ts = shG.col("t (s)", "0", 10); G.th = shG.col("t (h)", "0.000", 9);
    G.inc = shG.col("Included (1/0)", "0", 10); G.st = shG.col("Status", "@", 20); G.has = shG.col("Has GC data (1/0)", "0", 10);
    G.E = shG.col("E (V vs ref)", "0.000", 11); G.Ec = shG.col("E_corr (V vs ref)", "0.000", 12); G.Er = shG.col("E_RHE (V)", "0.000", 11);
    G.fe = {}; gas.forEach(function (p) { G.fe[p.id] = shG.col("FE " + prodDisplay(p) + " (%)", "0.00"); });
    G.tot = shG.col("FE total gas (%)", "0.00"); G.cb = shG.col("FE gas carbon products (%)", "0.00");
    G.j = {}; gas.forEach(function (p) { G.j[p.id] = shG.col("j " + prodDisplay(p) + " (mA cm^-2)", "0.000"); });
    G.ppm = {}; gas.forEach(function (p) { G.ppm[p.id] = shG.col("ppm " + prodDisplay(p) + " (ppm)", "0"); });
    var feCols = gas.map(function (p) { return G.fe[p.id]; }), rowOf = {};
    res.forEach(function (r, i) {
      var n = i + 2, rec = (st.inj || {})[r.k] || {}; rowOf[r.k] = n;
      shG.set(G.k + n, r.k); shG.set(G.b + n, r.block + 1); shG.set(G.clk + n, fmtISO(r.ms)); shG.set(G.ts + n, Math.round(r.el * 1000) / 1000);
      shG.set(G.th + n, Fm(G.ts + n + "/3600", r.el / 3600)); shG.set(G.inc + n, r.included ? 1 : 0); shG.set(G.st + n, r.reason || "included"); shG.set(G.has + n, r.has ? 1 : 0);
      shG.set(G.E + n, isFinite(r.E) ? r.E : null);
      shG.set(G.Ec + n, Fm('IF(OR(' + G.E + n + '="",' + MR("Ruu") + '=""),"",' + G.E + n + "+" + MR("I") + "/1000*" + MR("Ruu") + ")", r.Ec));
      shG.set(G.Er + n, Fm('IF(' + G.Ec + n + '="","",IF(' + MR("rhe") + "=1," + G.Ec + n + ',IF(' + MR("pH") + '="","",' + G.Ec + n + "+" + MR("E0") + "+" + MR("slope") + "*" + MR("pH") + ")))", r.Er));
      gas.forEach(function (p) {
        shG.set(G.fe[p.id] + n, Fm("IF($" + G.has + n + '=0,"",' + MR("n_" + p.id) + "*" + MR("F") + "*" + G.ppm[p.id] + n + "*1E-6*" + MR("ndot") + "/(" + MR("I") + "/1000)*100)", r.has ? r.fe[p.id] : ""));
        shG.set(G.j[p.id] + n, Fm("IF($" + G.has + n + '=0,"",' + G.fe[p.id] + n + "/100*" + MR("j") + ")", r.has ? r.j[p.id] : ""));
        var pv = pnum(rec.ppm && rec.ppm[p.id]); shG.set(G.ppm[p.id] + n, isFinite(pv) ? pv : null);
      });
      shG.set(G.tot + n, Fm("IF($" + G.has + n + '=0,"",SUM(' + feCols[0] + n + ":" + feCols[feCols.length - 1] + n + "))", r.has ? r.feTot : ""));
      var cParts = gas.filter(function (p) { return isCarbon(p.id); }).map(function (p) { return G.fe[p.id] + n; });
      shG.set(G.cb + n, Fm("IF($" + G.has + n + '=0,"",' + (cParts.length ? "SUM(" + cParts.join(",") + ")" : "0") + ")", r.has ? r.feC : ""));
      if (r.ex || !r.has) [G.st].forEach(function (L) { shG.ws.getCell(L + n).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF9A3412" } }; });
    });
    shG.finish(); shG.ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
    res.forEach(function (r, i) { if (r.ex) shG.ws.getCell(G.st + (i + 2)).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF9A3412" } }; });

    /* ---------- GC_block_avg ---------- */
    function refs(col, ks) { return ks.map(function (k) { return "GC_injections!" + col + rowOf[k]; }).join(","); }
    function avg(col, ks, v) { return ks.length ? Fm("IFERROR(AVERAGE(" + refs(col, ks) + '),"")', v) : null; }
    function sd(col, ks, v) { return ks.length ? Fm("IFERROR(STDEV(" + refs(col, ks) + '),"")', ks.length > 1 ? v : "") : null; }
    var B = {};
    B.b = shB.col("Block", "0", 8); B.mid = shB.col("t_mid block (h)", "0.00", 10); B.s = shB.col("t_start (h)", "0.00", 9); B.e = shB.col("t_end (h)", "0.00", 9);
    B.kr = shB.col("Injections in block", "@", 12); B.n = shB.col("n included", "0", 9);
    B.Ec = shB.col("E_corr mean (V vs ref)", "0.000"); B.Ecs = shB.col("E_corr SD (V)", "0.000"); B.Er = shB.col("E_RHE mean (V)", "0.000"); B.Ers = shB.col("E_RHE SD (V)", "0.000");
    B.fe = {}; B.fes = {}; gas.forEach(function (p) { B.fe[p.id] = shB.col("FE " + prodDisplay(p) + " mean (%)", "0.00"); B.fes[p.id] = shB.col("FE " + prodDisplay(p) + " SD (%)", "0.00"); });
    B.tot = shB.col("FE total gas mean (%)", "0.00"); B.tots = shB.col("FE total gas SD (%)", "0.00");
    B.cb = shB.col("FE gas carbon mean (%)", "0.00"); B.cbs = shB.col("FE gas carbon SD (%)", "0.00");
    B.j = {}; B.js = {}; gas.forEach(function (p) { B.j[p.id] = shB.col("j " + prodDisplay(p) + " mean (mA cm^-2)", "0.000"); B.js[p.id] = shB.col("j " + prodDisplay(p) + " SD (mA cm^-2)", "0.000"); });
    blocks.forEach(function (b, i) {
      var n = i + 2, ks = b.ks;
      shB.set(B.b + n, b.b + 1); shB.set(B.s + n, b.tStart); shB.set(B.e + n, b.tEnd); shB.set(B.mid + n, Fm("(" + B.s + n + "+" + B.e + n + ")/2", b.tMid));
      shB.set(B.kr + n, b.kFirst ? b.kFirst + "–" + b.kLast : ""); shB.set(B.n + n, ks.length ? Fm("COUNT(" + refs(G.tot, ks) + ")", ks.length) : 0);
      shB.set(B.Ec + n, avg(G.Ec, ks, b.Ec.m)); shB.set(B.Ecs + n, sd(G.Ec, ks, b.Ec.sd)); shB.set(B.Er + n, avg(G.Er, ks, b.Er.m)); shB.set(B.Ers + n, sd(G.Er, ks, b.Er.sd));
      gas.forEach(function (p) {
        shB.set(B.fe[p.id] + n, avg(G.fe[p.id], ks, b.fe[p.id].m)); shB.set(B.fes[p.id] + n, sd(G.fe[p.id], ks, b.fe[p.id].sd));
        shB.set(B.j[p.id] + n, avg(G.j[p.id], ks, b.j[p.id].m)); shB.set(B.js[p.id] + n, sd(G.j[p.id], ks, b.j[p.id].sd));
      });
      shB.set(B.tot + n, avg(G.tot, ks, b.tot.m)); shB.set(B.tots + n, sd(G.tot, ks, b.tot.sd)); shB.set(B.cb + n, avg(G.cb, ks, b.carbon.m)); shB.set(B.cbs + n, sd(G.cb, ks, b.carbon.sd));
    });
    shB.finish();

    /* ---------- Liquid_windows ---------- */
    var L = {};
    L.w = shL.col("Window", "0", 8); L.s = shL.col("Start (SGT)", "@", 20); L.e = shL.col("End (SGT)", "@", 20); L.ev = shL.col("Ends at", "@", 15);
    L.ts = shL.col("t_start (h)", "0.000", 9); L.te = shL.col("t_end (h)", "0.000", 9); L.tm = shL.col("t_mid (h)", "0.000", 9); L.dt = shL.col("Δt (s)", "0", 9);
    L.I = shL.col("|I| (mA)", "0.000", 9); L.Qc = shL.col("Q = |I|·Δt (C)", "0.00", 11); L.Qm = shL.col("Q measured (C)", "0.00", 11); L.Q = shL.col("Q used (C)", "0.00", 10);
    L.Vw = shL.col("V catholyte WE (mL)", "0.00", 11); L.Vc = shL.col("V anolyte CE (mL)", "0.00", 11);
    L.fe = {}; liq.forEach(function (p) { L.fe[p.id] = shL.col("FE " + prodDisplay(p) + " (%)", "0.00"); });
    L.tot = shL.col("FE total liquid (%)", "0.00");
    L.cw = {}; L.cc = {}; liq.forEach(function (p) { L.cw[p.id] = shL.col("c " + prodDisplay(p) + " catholyte WE (μM)", "0.0"); L.cc[p.id] = shL.col("c " + prodDisplay(p) + " anolyte CE (μM)", "0.0"); });
    var lRow = {};
    wins.forEach(function (w, i) {
      var n = i + 2, ev = sch.events[i]; lRow[w.w] = n;
      shL.set(L.w + n, w.w + 1); shL.set(L.s + n, fmtISO(w.startMs)); shL.set(L.e + n, fmtISO(w.endMs)); shL.set(L.ev + n, ev ? ev.label + (ev.logged ? " (logged)" : " (planned)") : "");
      shL.set(L.ts + n, w.tStart); shL.set(L.te + n, w.tEnd); shL.set(L.tm + n, Fm("(" + L.ts + n + "+" + L.te + n + ")/2", w.tMid)); shL.set(L.dt + n, Math.round(w.dt * 1000) / 1000);
      shL.set(L.I + n, Fm(MR("I"), c.I_mA)); shL.set(L.Qc + n, Fm(L.I + n + "/1000*" + L.dt + n, w.Qcalc)); shL.set(L.Qm + n, w.Qm > 0 ? w.Qm : null);
      shL.set(L.Q + n, Fm("IF(N(" + L.Qm + n + ")>0," + L.Qm + n + "," + L.Qc + n + ")", w.Q));
      shL.set(L.Vw + n, isFinite(w.Vw) ? w.Vw : null); shL.set(L.Vc + n, isFinite(w.Vc) ? w.Vc : null);
      liq.forEach(function (p) {
        var cw = L.cw[p.id] + n, cc = L.cc[p.id] + n, cv = w.c[p.id] || {};
        shL.set(cw, isFinite(cv.we) ? cv.we : null); shL.set(cc, isFinite(cv.ce) ? cv.ce : null);
        shL.set(L.fe[p.id] + n, Fm('IF(AND(' + cw + '="",' + cc + '=""),"",IF(OR(' + L.Vw + n + '="",' + L.Vc + n + '=""),"",' + MR("n_" + p.id) + "*" + MR("F") + "*(N(" + cw + ")*1E-6*" + L.Vw + n + "*1E-3+N(" + cc + ")*1E-6*" + L.Vc + n + "*1E-3)/" + L.Q + n + "*100))", w.fe[p.id] != null ? w.fe[p.id] : ""));
      });
      var fl = liq.map(function (p) { return L.fe[p.id] + n; });
      shL.set(L.tot + n, fl.length ? Fm("IF(COUNT(" + fl.join(",") + ')=0,"",SUM(' + fl.join(",") + "))", w.tot) : null);
    });
    shL.finish(); shL.ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

    /* ---------- Stability_summary ---------- */
    var S = {};
    S.b = shS.col("Block", "0", 8); S.mid = shS.col("t_mid block (h)", "0.00", 10); S.n = shS.col("n included", "0", 9);
    var eLab = chk && chk.basis === "RHE" ? "E_RHE" : "E_corr", eUnit = chk && chk.basis === "RHE" ? "V vs RHE" : "V vs ref", eBcol = chk && chk.basis === "RHE" ? B.Er : B.Ec, eGcol = chk && chk.basis === "RHE" ? G.Er : G.Ec;
    S.E = shS.col(eLab + " block mean (" + eUnit + ")", "0.000", 12); S.dE = shS.col("Δ" + eLab + " vs first block (mV)", "0.0", 12);
    var hasH2 = st.gasIds.indexOf("H2") > -1;
    S.h2 = shS.col("FE Hydrogen (H₂) mean (%)", "0.00", 12); S.h2s = shS.col("FE Hydrogen (H₂) SD (%)", "0.00", 11); S.dh = shS.col("ΔFE H₂ vs first block (pp)", "0.00", 12);
    S.fl = shS.col("H₂ flag", "@", 18); S.gc = shS.col("FE gas carbon mean (%)", "0.00", 12); S.lq = shS.col("FE liquid, time-weighted (%)", "0.00", 13);
    S.ct = shS.col("FE carbon products total (%)", "0.00", 13); S.ft = shS.col("FE total gas + liquid (%)", "0.00", 13);
    S.g1 = shS.gap(); S.mk = shS.col("Metric", "@", 34); S.mv = shS.col("Value", "0.0", 12); S.mu = shS.col("Unit", "@", 10); S.mn = shS.col("How it is calculated", "@", 48);
    S.g2 = shS.gap(); S.oe = shS.col("Event", "@", 16); S.oc = shS.col("Clock (SGT)", "@", 20); S.os = shS.col("Droplets or salt on GDE back", "@", 13); S.on = shS.col("Observation note", "@", 40);
    var firstRow = chk && chk.first ? chk.first.b + 2 : null, lastRow = chk && chk.last ? chk.last.b + 2 : null, h2BaseRow = chk && chk.h2Base != null ? chk.h2Base + 2 : null;
    (chk ? chk.blocks : []).forEach(function (x, i) {
      var n = i + 2;
      shS.set(S.b + n, x.b + 1); shS.set(S.mid + n, Fm("GC_block_avg!" + B.mid + n, x.tMid)); shS.set(S.n + n, Fm("GC_block_avg!" + B.n + n, x.n));
      shS.set(S.E + n, Fm('IF(GC_block_avg!' + eBcol + n + '="","",GC_block_avg!' + eBcol + n + ")", isFinite(x.E) ? x.E : ""));
      shS.set(S.dE + n, firstRow ? Fm('IF(OR(' + S.E + n + '="",' + S.E + firstRow + '=""),"",(' + S.E + n + "-" + S.E + firstRow + ")*1000)", isFinite(x.dE) ? x.dE : "") : null);
      if (hasH2) {
        shS.set(S.h2 + n, Fm('IF(GC_block_avg!' + B.fe.H2 + n + '="","",GC_block_avg!' + B.fe.H2 + n + ")", isFinite(x.h2) ? x.h2 : ""));
        shS.set(S.h2s + n, Fm('IF(GC_block_avg!' + B.fes.H2 + n + '="","",GC_block_avg!' + B.fes.H2 + n + ")", isFinite(x.h2sd) ? x.h2sd : ""));
        shS.set(S.dh + n, h2BaseRow ? Fm('IF(OR(' + S.h2 + n + '="",' + S.h2 + h2BaseRow + '=""),"",' + S.h2 + n + "-" + S.h2 + h2BaseRow + ")", isFinite(x.dH2) ? x.dH2 : "") : null);
        shS.set(S.fl + n, Fm('IF(' + S.dh + n + '="","",IF(' + S.dh + n + ">" + MR("thr") + ',"H2 above threshold",""))', x.flag ? "H2 above threshold" : ""));
      }
      shS.set(S.gc + n, Fm('IF(GC_block_avg!' + B.cb + n + '="","",GC_block_avg!' + B.cb + n + ")", isFinite(x.gasC) ? x.gasC : ""));
      var lt = x.ov.map(function (o) { return { ref: "Liquid_windows!" + L.tot + lRow[o.w], f: o.f }; });
      shS.set(S.lq + n, lt.length ? Fm("IF(COUNT(" + lt.map(function (o) { return o.ref; }).join(",") + ")<" + lt.length + ',"",' + lt.map(function (o) { return o.ref + "*" + (+o.f.toPrecision(12)); }).join("+") + ")", isFinite(x.liqTW) ? x.liqTW : "") : null);
      shS.set(S.ct + n, Fm('IF(OR(' + S.gc + n + '="",' + S.lq + n + '=""),"",' + S.gc + n + "+" + S.lq + n + ")", isFinite(x.carbonTot) ? x.carbonTot : ""));
      shS.set(S.ft + n, Fm('IF(OR(GC_block_avg!' + B.tot + n + '="",' + S.lq + n + '=""),"",GC_block_avg!' + B.tot + n + "+" + S.lq + n + ")", isFinite(x.feTot) ? x.feTot : ""));
      if (x.flag) [S.dh, S.fl].forEach(function (Lc) { shS.ws.getCell(Lc + n).fill = xfill(XS.red); });
    });
    var nb = chk ? chk.blocks.length : 0, spreadRefs = chk ? refs(eGcol, chk.spreadKs) : "";
    var metrics = [
      ["Potential basis", eLab + " (" + eUnit + ")", "", chk && chk.basis === "RHE" ? "pH known: E_RHE used" : "pH not entered: E_corr vs reference used"],
      ["E drift (last − first block mean)", firstRow && lastRow && firstRow !== lastRow ? Fm("IFERROR((" + S.E + lastRow + "-" + S.E + firstRow + ')*1000,"")', chk.driftMV) : null, "mV", "Block " + (chk && chk.first ? chk.first.b + 1 : "?") + " → block " + (chk && chk.last ? chk.last.b + 1 : "?") + " mean E"],
      ["E spread (max − min, included injections)", chk && chk.spreadKs.length > 1 ? Fm("IFERROR((MAX(" + spreadRefs + ")-MIN(" + spreadRefs + '))*1000,"")', chk.spreadMV) : null, "mV", "Over all included injections"],
      ["H2 warning threshold", Fm(MR("thr"), chk ? chk.thr : null), "pp", "Editable in the app"],
      ["Blocks with H2 above threshold", hasH2 && nb ? Fm("COUNTIF(" + S.fl + "2:" + S.fl + (nb + 1) + ',"H2*")', chk.flagged.length) : null, "blocks", "ΔFE_H2 vs first block > threshold"],
      ["H2 FE rises every block", chk && chk.h2Rising != null ? (chk.h2Rising ? "Yes" : "No") : "n/a", "", "Needs ≥ 3 blocks with H2 data"],
      ["Swaps with droplets/salt on GDE back", chk ? chk.salt.length : null, "events", chk && chk.salt.length ? chk.salt.join(", ") : "none recorded"],
      ["Note", "", "", "A flat E alone does not prove stability under CP; read E drift together with the H2 and carbon FE trends."]
    ];
    metrics.forEach(function (m, i) { var n = i + 2; shS.set(S.mk + n, m[0]); shS.set(S.mv + n, m[1]); shS.set(S.mu + n, m[2]); shS.set(S.mn + n, m[3]); });
    sch.events.forEach(function (e, i) { var n = i + 2; shS.set(S.oe + n, e.label); shS.set(S.oc + n, fmtISO(e.ms)); shS.set(S.os + n, e.salt ? "Yes" : "No"); shS.set(S.on + n, e.note || ""); if (e.salt) shS.ws.getCell(S.os + n).fill = xfill(XS.red); });
    var iMk = shS.cols.map(function (q) { return q.h; }).indexOf("Metric"), iEv = shS.cols.map(function (q) { return q.h; }).indexOf("Event");
    var maxRows = shS.cols.map(function (cc, i) { return i >= iEv ? sch.events.length + 1 : i >= iMk ? metrics.length + 1 : nb + 1; });
    shS.finish(maxRows);

    /* ---------- Schedule ---------- */
    var C = {};
    C.ev = shC.col("Event", "@", 16); C.i = shC.col("#", "0", 6); C.clk = shC.col("Clock (SGT)", "@", 20); C.ts = shC.col("t (s)", "0", 10); C.th = shC.col("t (h)", "0.000", 9);
    C.b = shC.col("Block", "0", 7); C.dx = shC.col("Excluded by default (1/0)", "0", 11); C.pl = shC.col("Planned (SGT)", "@", 20); C.ac = shC.col("Logged actual (SGT)", "@", 20);
    C.w = shC.col("Warning", "@", 34); C.salt = shC.col("Droplets or salt on GDE back", "@", 13); C.note = shC.col("Observation note", "@", 34);
    var rows = [{ ev: "Run start", ms: sch.t0 }];
    sch.injections.forEach(function (j) { rows.push({ ev: "Injection", i: j.k, ms: j.ms, b: j.block + 1, dx: sch.defaultEx[j.k] ? 1 : 0 }); });
    sch.events.forEach(function (e, i) { rows.push({ ev: e.label, i: e.type === "swap" ? i + 1 : null, ms: e.ms, pl: fmtISO(e.planned), ac: e.logged ? fmtISO(e.actual) : "", w: e.near && e.near.length && e.type === "swap" ? "within " + Math.round(sch.guard / 60) + " min of injection " + e.near.map(function (x) { return "#" + x.k; }).join(", ") : "", salt: e.salt ? "Yes" : "No", note: e.note, ev2: e }); });
    if (!sch.events.some(function (e) { return e.type === "final" && Math.abs(e.ms - sch.tEnd) < 1; })) rows.push({ ev: "Run end", ms: sch.tEnd });
    rows.sort(function (a, b) { return a.ms - b.ms || (a.ev === "Injection" ? -1 : 1); });
    rows.forEach(function (x, i) {
      var n = i + 2, el = (x.ms - sch.t0) / 1000;
      shC.set(C.ev + n, x.ev); shC.set(C.i + n, x.i == null ? null : x.i); shC.set(C.clk + n, fmtISO(x.ms)); shC.set(C.ts + n, Math.round(el * 1000) / 1000); shC.set(C.th + n, Fm(C.ts + n + "/3600", el / 3600));
      shC.set(C.b + n, x.b || null); shC.set(C.dx + n, x.dx == null ? null : x.dx); shC.set(C.pl + n, x.pl || ""); shC.set(C.ac + n, x.ac || ""); shC.set(C.w + n, x.w || "");
      shC.set(C.salt + n, x.salt || ""); shC.set(C.note + n, x.note || "");
      if (x.ev !== "Injection") shC.ws.getRow(n).eachCell({ includeEmpty: false }, function (cell) { cell.font = { name: "Calibri", size: 10, bold: true }; });
    });
    shC.finish();
    rows.forEach(function (x, i) { if (x.ev !== "Injection") for (var q = 0; q < shC.cols.length; q++) { var cell = shC.ws.getCell(colL(q) + (i + 2)); cell.fill = xfill(x.w ? XS.red : XS.orange); cell.font = { name: "Calibri", size: 10, bold: true }; } });

    /* ---------- E_t ---------- */
    var E = {};
    E.k = shE.col("Injection #", "0", 10); E.ts = shE.col("t (s)", "0", 10); E.th = shE.col("t (h)", "0.000", 9); E.E = shE.col("E (V vs ref)", "0.000", 11); E.Ec = shE.col("E_corr (V vs ref)", "0.000", 12);
    E.Er = shE.col("E_RHE (V)", "0.000", 11); E.inc = shE.col("Included (1/0)", "0", 10);
    shE.gap(); E.sw = shE.col("Swap event", "@", 16); E.swt = shE.col("Swap t (h)", "0.000", 10);
    if (dta) { shE.gap(); E.dt = shE.col("DTA T (s)", "0.0", 10); E.dth = shE.col("DTA t (h)", "0.0000", 10); E.dv = shE.col("DTA Vf (V vs ref)", "0.0000", 12); E.di = shE.col("DTA Im (A)", "0.000E+00", 12); E.dec = shE.col("DTA E_corr (V vs ref)", "0.0000", 12); E.der = shE.col("DTA E_RHE (V)", "0.0000", 12); }
    res.forEach(function (r, i) {
      var n = i + 2, g = rowOf[r.k];
      shE.set(E.k + n, r.k); shE.set(E.ts + n, Fm("GC_injections!" + G.ts + g, Math.round(r.el * 1000) / 1000)); shE.set(E.th + n, Fm(E.ts + n + "/3600", r.el / 3600));
      [[E.E, G.E, r.E], [E.Ec, G.Ec, r.Ec], [E.Er, G.Er, r.Er]].forEach(function (z) { shE.set(z[0] + n, Fm('IF(GC_injections!' + z[1] + g + '="","",GC_injections!' + z[1] + g + ")", isFinite(z[2]) ? z[2] : "")); });
      shE.set(E.inc + n, Fm("GC_injections!" + G.inc + g, r.included ? 1 : 0));
    });
    sch.events.forEach(function (e, i) { shE.set(E.sw + (i + 2), e.label); shE.set(E.swt + (i + 2), e.el / 3600); });
    if (dta) {
      for (var q = 0; q < dta.n; q++) {
        var n = q + 2, ch = eChain(dta.v[q], c, dta.i[q]);
        shE.set(E.dt + n, dta.t[q]); shE.set(E.dth + n, dta.t[q] / 3600); shE.set(E.dv + n, dta.v[q]); shE.set(E.di + n, dta.i[q]);
        shE.set(E.dec + n, isFinite(ch.Ec) ? ch.Ec : null); shE.set(E.der + n, isFinite(ch.Er) ? ch.Er : null);
      }
    }
    var eMax = shE.cols.map(function (cc, i) { if (i < 7) return res.length + 1; if (i < 10) return sch.events.length + 1; return dta ? dta.n + 1 : 1; });
    shE.finish(eMax);

    shM.finish(); shM.ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
    for (var r2 = 2; r2 < mr; r2++) { shM.ws.getCell("A" + r2).font = { name: "Calibri", size: 10, bold: true }; ["B", "D"].forEach(function (L2) { shM.ws.getCell(L2 + r2).alignment = { wrapText: true, vertical: "top" }; }); }
    if (mrow.sample) ["A", "B", "C", "D"].forEach(function (L2) { var x = shM.ws.getCell(L2 + mrow.sample); x.fill = xfill(XS.orange); x.font = { name: "Calibri", size: 11, bold: true }; });
    var stab = shM.ws.getCell("D" + mrow["note_Stability claim"]); stab.font = { name: "Calibri", size: 10, bold: true }; stab.fill = xfill(XS.yellow);
    return wb;
  }

  var API = { R: R, F: F, PRESETS: PRESETS, PRESET_ORDER: PRESET_ORDER, EREF: EREF, CUSTOM_HEX: CUSTOM_HEX, prodDisplay: prodDisplay, prodSym: prodSym, P: P, isCarbon: isCarbon,
    molarFlow: molarFlow, fe: fe, feLiquid: feLiquid, ruUnc: ruUnc, eCorr: eCorr, nernstSlope: nernstSlope, eRhe: eRhe, pnum: pnum, mstat: mstat,
    parseSGT: parseSGT, toInputSGT: toInputSGT, fmtISO: fmtISO, fmtClock: fmtClock, fmtDur: fmtDur,
    defaults: defaults, buildSchedule: buildSchedule, autoSwaps: autoSwaps, reanchor: reanchor, cond: cond, eChain: eChain,
    computeInjections: computeInjections, blockStats: blockStats, liquidWindows: liquidWindows, stabilityCheck: stabilityCheck, overlapW: overlapW, computeAll: computeAll,
    parseDTA: parseDTA, downsample: downsample, backupJSON: backupJSON, parseBackup: parseBackup, buildWorkbook: buildWorkbook, BACKUP: BACKUP };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.StabCore = API;
})(typeof window !== "undefined" ? window : this);
