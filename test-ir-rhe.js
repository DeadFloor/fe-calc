#!/usr/bin/env node
/* Worked example — Faraday iR / RHE (cathodic |I| convention) */
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

// Example: E_app = -1.00 V vs Ag/AgCl sat (0.197), |I| = 10 mA = 0.01 A, Ru = 10 Ω, f=0, pH=7, slope=0.0591
var Eapp = -1.00, I = 0.01, Ru = 10, f = 0, pH = 7, E0 = 0.197, slope = 0.0591;
var ru = ruUnc(Ru, f);
var Ec = eCorr(Eapp, I, Ru, f);
var Er = eRhe(Ec, E0, pH, slope);
function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-9); }
var ok = near(ru, 10) && near(Ec, -0.9) && near(Er, -0.9 + 0.197 + 0.4137);
// Also signed form: I_signed = -0.01 → E_corr = Eapp - I_signed*Ru = -1 - (-0.01)*10 = -0.9
var Ec2 = Eapp - (-I) * ru;
ok = ok && near(Ec2, Ec);
// 85% compensated → Ru_unc = 10*0.15 = 1.5; E_corr = -1 + 0.01*1.5 = -0.985
var Ec3 = eCorr(Eapp, I, Ru, 85);
ok = ok && near(ruUnc(Ru, 85), 1.5) && near(Ec3, -0.985);
// 100% → skip
ok = ok && near(eCorr(Eapp, I, Ru, 100), Eapp);

console.log(JSON.stringify({ ru: ru, E_corr: Ec, E_RHE: Er, E_corr_85: Ec3, pass: ok }, null, 2));
if (!ok) { console.error("FAIL"); process.exit(1); }
console.log("PASS worked example");
