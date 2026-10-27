#!/usr/bin/env node
/* Worked examples — Faraday iR/RHE + CI skip + schedule (s) */
var R = 8.314462618, F = 96485.33212;
function ruUnc(Ru, fPct) {
  var f = fPct == null || fPct === "" ? 0 : Number(fPct);
  if (!isFinite(Ru) || Ru < 0) return NaN;
  if (!isFinite(f) || f < 0) f = 0;
  if (f >= 100) return 0;
  if (f > 95) f = 95;
  return Ru * (1 - f / 100);
}
function eCorr(Eapp, I_A_abs, Ru, fPct) {
  var f = fPct == null || fPct === "" ? 0 : Number(fPct);
  if (isFinite(f) && f >= 100) return Eapp;
  var ru = ruUnc(Ru, fPct);
  return Eapp + Math.abs(I_A_abs) * ru;
}
function eRhe(Ec, E0, pH, slope) { return Ec + E0 + slope * pH; }
function schedTime(k, sc) {
  return Number(sc.t1) + k * (Number(sc.ana) * 60 + Number(sc.post));
}
function fmtT(t_s) {
  var s = Number(t_s);
  return s + " s (" + (s / 60) + " min)";
}
function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-9); }

var Eapp = -1.00, I = 0.01, Ru = 10, f = 0, pH = 7, E0 = 0.197, slope = 0.0591;
var ru = ruUnc(Ru, f);
var Ec = eCorr(Eapp, I, Ru, f);
var Er = eRhe(Ec, E0, pH, slope);
var ok = near(ru, 10) && near(Ec, -0.9) && near(Er, -0.9 + 0.197 + 0.4137);
ok = ok && near(Eapp - (-I) * ru, Ec);
ok = ok && near(ruUnc(Ru, 85), 1.5) && near(eCorr(Eapp, I, Ru, 85), -0.985);
ok = ok && near(eCorr(Eapp, I, Ru, 100), Eapp);

/* CI: no post-run correction — E_corr = E_applied, Ru_unc = 0 */
function computeCI(E_applied) { return { E_corr: E_applied, Ru_unc: 0, label: "iR-compensated in real time (CI)" }; }
var ci = computeCI(Eapp);
ok = ok && near(ci.E_corr, Eapp) && near(ci.Ru_unc, 0);

/* Schedule: t1=900 s, ana=12 min, post=180 s → 900, 1800, 2700 */
var sc = { t1: 900, ana: 12, post: 180 };
ok = ok && near(schedTime(0, sc), 900) && near(schedTime(1, sc), 1800) && near(schedTime(2, sc), 2700);
ok = ok && fmtT(900) === "900 s (15 min)";
/* migrate min→s */
ok = ok && near(15 * 60, 900) && near(3 * 60, 180);

console.log(JSON.stringify({
  ru: ru, E_corr: Ec, E_RHE: Er,
  CI: ci, t0: schedTime(0, sc), t1: schedTime(1, sc), fmt: fmtT(900),
  pass: ok
}, null, 2));
if (!ok) { console.error("FAIL"); process.exit(1); }
console.log("PASS worked example (iR + CI + schedule s)");
