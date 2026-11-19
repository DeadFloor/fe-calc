#!/usr/bin/env node
/* Worked examples — stability page: schedule maths, swaps, exclusions, gas FE block averaging, liquid windows,
   stability check, .DTA parsing, and that the product list / formulas still match app.js. */
var fs = require("fs"), vm = require("vm"), path = require("path");
var S = require("./stability/stability-core.js");
function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-9); }
var fails = [];
function ok(cond, msg) { if (!cond) fails.push(msg); }

/* --- 0. product list + constants identical to app.js (GC module exported to module.exports) --- */
var sandbox = { module: { exports: {} }, document: { readyState: "loading", addEventListener: function () {} }, window: undefined, console: console };
sandbox.self = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), sandbox);
var GC = sandbox.module.exports;
ok(GC && GC.PRESETS, "app.js GC module loads in node");
ok(JSON.stringify(GC.PRESETS) === JSON.stringify(S.PRESETS), "PRESETS identical to app.js");
ok(JSON.stringify(GC.EREF) === JSON.stringify(S.EREF), "EREF identical to app.js");
ok(GC.F === S.F && GC.R === S.R, "F and R identical to app.js");
ok(near(GC.fe(10000, 2, 1.5e-5, 0.05), S.fe(10000, 2, 1.5e-5, 0.05)) && near(GC.feLiquid(100, 10, 15, 15, 12, 1000), S.feLiquid(100, 10, 15, 15, 12, 1000)), "fe/feLiquid match app.js");
ok(near(GC.eCorr(-1, 0.01, 10, 0), S.eCorr(-1, 0.01, 10, 0)) && near(GC.eRhe(-0.9, 0.197, 7, 0.0591), S.eRhe(-0.9, 0.197, 7, 0.0591)), "eCorr/eRhe match app.js");
/* Ne = 4C + H − 2O for every preset */
Object.keys(S.PRESETS).forEach(function (id) {
  var f = S.PRESETS[id].formula, c = +(f.match(/C(\d*)/) || [0, 0])[1] || (/C/.test(f) ? 1 : 0), h = +((f.match(/H(\d*)/) || [0, 0])[1] || (/H/.test(f) ? 1 : 0)), o = +((f.match(/O(\d*)/) || [0, 0])[1] || (/O/.test(f) ? 1 : 0));
  ok(S.PRESETS[id].n === 4 * c + h - 2 * o, "Ne rule for " + id);
});

/* --- 1. default schedule: 1287 s from 10:15 SGT, 4 h blocks over 24 h --- */
var st = S.defaults(), sch = S.buildSchedule(st);
ok(sch.ok && st.interval === "1287", "default schedule builds with 1287 s");
ok(sch.injections.length === 67, "67 injections (got " + sch.injections.length + ")");
ok(S.fmtClock(sch.injections[66].ms) === "Fri 27 Nov 09:50:42", "last injection Fri 09:50:42 (got " + S.fmtClock(sch.injections[66].ms) + ")");
ok(near(sch.injections[0].el, 900) && near(sch.injections[1].el, 2187) && near(sch.injections[66].el, 85842), "elapsed t_k = 900 + (k−1)·1287 s");
var ranges = []; for (var b = 0; b < 6; b++) { var a = sch.injections.filter(function (j) { return j.block === b; }); ranges.push(a[0].k + "-" + a[a.length - 1].k); }
ok(ranges.join(" ") === "1-11 12-22 23-33 34-45 46-56 57-67", "block ranges " + ranges.join(" "));
ok(sch.injections.every(function (j) { return j.block === Math.floor(j.el / 14400); }), "block = floor((t − t0)/14400 s)");
/* swaps: defaults are the mid-gap points; none within 5 min of an injection */
ok(sch.warnings.length === 0, "no swap warnings on defaults: " + sch.warnings.join("; "));
var nearest = sch.events.slice(0, 3).map(function (e) { return Math.min.apply(null, sch.injections.map(function (j) { return Math.abs(j.ms - e.ms) / 1000; })); });
ok(nearest.every(function (d) { return d >= 643 && d <= 644; }), "each default swap ≈643.5 s from nearest injection (" + nearest.join(", ") + ")");
ok(JSON.stringify(S.autoSwaps(st)) === JSON.stringify(["2026-11-26T16:08:55", "2026-11-26T21:52:07", "2026-11-27T03:56:46"]), "autoSwaps reproduces the default swap times");
ok(JSON.stringify(Object.keys(sch.defaultEx).map(Number)) === "[18,34,51]", "first injection after each swap excluded by default: " + Object.keys(sch.defaultEx));
ok(sch.windows.length === 4 && near(sch.windows[0].dt, 22135) && near(sch.windows[3].dt, 86400 - 64606), "liquid windows from swap-to-swap times");
/* a swap 2 min from an injection is flagged */
var st2 = S.defaults(); st2.swaps[0].planned = "2026-11-26T16:17:39";
ok(S.buildSchedule(st2).warnings.some(function (w) { return /Swap 1/.test(w) && /#18/.test(w); }), "swap within 5 min of injection #18 flagged");
/* logged actual overrides planned */
var st3 = S.defaults(); st3.swaps[0].actual = "2026-11-26T16:25:00"; var s3 = S.buildSchedule(st3);
ok(s3.events[0].logged && s3.defaultEx[19] && !s3.defaultEx[18], "logged swap after #18 moves exclusion to #19");
/* re-anchor: injection 3 seen at 11:00:00 → first = 11:00:00 − 2·1287 s = 10:17:06 */
ok(S.reanchor(3, "2026-11-26T11:00:00", "1287") === "2026-11-26T10:17:06", "re-anchor injection 3 → 10:17:06");
/* 1300 s drift check (why the default is 1287): k = 67 differs by 66·13 = 858 s */
var st4 = S.defaults(); st4.interval = "1300"; var s4 = S.buildSchedule(st4);
ok(near((s4.injections[65].ms - sch.injections[65].ms) / 1000, 65 * 13), "1300 vs 1287 s drift = 13 s per injection");
/* invalid inputs */
var st5 = S.defaults(); st5.interval = "0"; ok(!S.buildSchedule(st5).ok, "interval 0 rejected");
var st6 = S.defaults(); st6.swaps[1].planned = "2026-11-26T15:00:00"; ok(S.buildSchedule(st6).errors.length > 0, "out-of-order swaps rejected");

/* --- 2. gas FE per injection + block averaging --- */
var g = S.defaults(); g.I_mA = "50"; g.area = "1"; g.flow = "20"; g.pH = "6.8"; g.gasIds = ["H2", "CO", "C2H4"];
var c = S.cond(g), ndot = 101325 * (20e-6 / 60) / (8.314462618 * 273.15);
ok(near(c.ndot, ndot, 1e-15), "ṅ_gas at standard reference");
/* block 1: injections 1..11 with H2 = 3000 + 100·k ppm; injection 5 manually excluded; CO 5000 ppm; C2H4 blank (→ 0) */
for (var k = 1; k <= 11; k++) g.inj[k] = { E: String(-1.85 - 0.001 * k), ppm: { H2: String(3000 + 100 * k), CO: "5000" } };
g.inj[5].ex = true;
g.inj[18] = { E: "-1.9", ppm: { H2: "9000" } };      /* default-excluded */
g.inj[19] = { E: "-1.86", ppm: { H2: "3500", CO: "4800" } };
var M = S.computeAll(g);
var r1 = M.res[0], feH2 = 2 * S.F * 3100e-6 * ndot / 0.05 * 100;
ok(near(r1.fe.H2, feH2, 1e-9) && r1.fe.C2H4 === 0 && r1.included, "FE_H2 injection 1 = n·F·ppm·1e-6·ṅ/|I|·100; blank ppm → 0");
ok(near(r1.j.H2, r1.fe.H2 / 100 * 50, 1e-12), "partial j = FE/100·|I|/A");
ok(near(r1.feC, r1.fe.CO + r1.fe.C2H4, 1e-12) && near(r1.feTot, r1.fe.H2 + r1.feC, 1e-12), "carbon FE excludes H2; total = sum");
ok(near(r1.Er, -1.851 + 0.197 + 0.0591 * 6.8, 1e-12) && near(r1.Ec, -1.851), "CI: E_corr = E; E_RHE = E_corr + E° + 0.0591·pH");
var B0 = M.blocks[0], incK = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11], vals = incK.map(function (k) { return 2 * S.F * (3000 + 100 * k) * 1e-6 * ndot / 0.05 * 100; });
var mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, sd = Math.sqrt(vals.reduce(function (a, v) { return a + (v - mean) * (v - mean); }, 0) / (vals.length - 1));
ok(B0.n === 10 && JSON.stringify(B0.ks) === JSON.stringify(incK), "block 1 averages the 10 included injections (manual exclusion of #5)");
ok(near(B0.fe.H2.m, mean, 1e-9) && near(B0.fe.H2.sd, sd, 1e-9), "block mean and sample SD (n − 1)");
ok(!M.res[17].included && M.res[17].exDefault && M.res[18].included, "#18 excluded by default, #19 included");
ok(M.blocks[1].n === 1 && !isFinite(M.blocks[1].fe.H2.sd), "block 2: n = 1 → SD undefined");
/* manual iR */
var gi = JSON.parse(JSON.stringify(g)); gi.irMode = "manual"; gi.Ru = "4"; gi.fComp = "50";
var Mi = S.computeAll(gi); ok(near(Mi.res[0].Ec, -1.851 + 0.05 * 2, 1e-12), "manual iR: E_corr = E + |I|·Ru·(1 − f)");

/* --- 3. liquid windows: Q = |I|·Δt from actual swap times --- */
g.liqIds = ["EtOH", "nPrOH"]; g.swaps[0].actual = "2026-11-26T16:10:00";
g.liq[0] = { Vw: "14.5", Vc: "15.2", c: { EtOH: { we: "7000", ce: "900" }, nPrOH: { we: "2000" } } };
g.liq[1] = { Vw: "14", Vc: "15", Qm: "1000", c: { EtOH: { we: "6000", ce: "800" } } };
M = S.computeAll(g);
var w0 = M.wins[0], dt0 = 6 * 3600 + 600, Q0 = 0.05 * dt0;
ok(near(w0.dt, dt0) && near(w0.Q, Q0, 1e-9), "window 1 Δt from run start to logged swap; Q = |I|·Δt");
ok(near(w0.fe.EtOH, 12 * S.F * (7000e-6 * 14.5e-3 + 900e-6 * 15.2e-3) / Q0 * 100, 1e-9), "liquid FE = n·F·(c_WE·V_WE + c_CE·V_CE)/Q");
ok(near(w0.fe.nPrOH, 18 * S.F * (2000e-6 * 14.5e-3) / Q0 * 100, 1e-9), "blank anolyte conc → 0");
ok(near(M.wins[1].Q, 1000) && M.wins[1].Qsrc === "measured", "measured Q overrides |I|·Δt");
ok(near(w0.tot, w0.fe.EtOH + w0.fe.nPrOH, 1e-12), "liquid total");

/* --- 4. stability check --- */
var h = S.defaults(); h.I_mA = "50"; h.pH = "7"; h.gasIds = ["H2", "C2H4"]; h.liqIds = ["EtOH"]; var hs = S.buildSchedule(h);
function ppm(fe, n) { return fe / 100 * 0.05 / (n * S.F * ndot) * 1e6; }
var H2byBlock = [20, 21, 23, 26.5, 24, 22];
hs.injections.forEach(function (j) { h.inj[j.k] = { E: String(-1.85 - 0.002 * j.block), ppm: { H2: String(ppm(H2byBlock[j.block], 2)), C2H4: String(ppm(30, 12)) } }; });
hs.windows.forEach(function (w) { h.liq[w.w] = { Vw: "15", Vc: "15", c: { EtOH: { we: String(10 / 100 * 0.05 * w.dt / (12 * S.F) / 0.015 * 1e6) } } }; });
var MH = S.computeAll(h), K = MH.chk;
ok(near(K.driftMV, -10, 1e-6), "E drift = last − first block mean = −10 mV (got " + K.driftMV + ")");
ok(near(K.spreadMV, 10, 1e-6), "E spread = max − min = 10 mV");
ok(JSON.stringify(K.flagged) === "[3]", "H2 flag only on block 4 (+6.5 pp > 5 pp): " + JSON.stringify(K.flagged));
h.h2Thresh = "2.5"; ok(JSON.stringify(S.computeAll(h).chk.flagged) === "[2,3,4]", "editable threshold 2.5 pp flags blocks 3–5");
ok(K.h2Rising === false, "H2 not rising every block");
ok(K.blocks.every(function (b) { return near(b.gasC, 30, 1e-9) && near(b.liqTW, 10, 1e-9) && near(b.carbonTot, 40, 1e-9); }), "carbon FE per block = gas C + time-weighted liquid (30 + 10)");
var ov = S.overlapW(MH.sch, MH.wins, 1); ok(ov.length === 2 && near(ov[0].f + ov[1].f, 1, 1e-12), "block 2 straddles windows 1 and 2; weights sum to 1");
h.swaps[1].salt = true; ok(JSON.stringify(S.computeAll(h).chk.salt) === '["Swap 2"]', "GDE-back droplets/salt recorded per swap");

/* --- 5. Gamry .DTA parsing --- */
var dta = ["EXPLAIN", "TAG\tCHRONOP", "DATE\tLABEL\t11/26/2026\tDate", "TIME\tLABEL\t10:00:01\tTime", "CURVE\tTABLE\t3",
  "\tPt\tT\tVf\tIm\tVu\tSig\tAch\tIERange\tOver", "\t#\ts\tV vs. Ref.\tA\tV\tV\tV\t#\tbits",
  "\t0\t1\t-1,850\t-5.0E-02\t0\t0\t0\t7\t...........", "\t1\t2\t-1.851\t-5.0E-02\t0\t0\t0\t7\t...........", "\t2\t3\t-1.852\t-5.0E-02\t0\t0\t0\t7\t...........",
  "CURVE2\tTABLE\t2", "\tPt\tT\tVf\tIm", "\t#\ts\tV vs. Ref.\tA", "\t0\t0.5\t-1.860\t-0.05", "\t1\t1.5\t-1.861\t-0.05", "EXPERIMENTABORTED\tLABEL\tx"].join("\r\n");
var D = S.parseDTA(dta);
ok(D.n === 5 && D.tables === 2 && D.date === "11/26/2026" && D.time === "10:00:01", "DTA: 2 CURVE tables, 5 points, DATE/TIME read");
ok(near(D.v[0], -1.85) && near(D.t[3], 3.5) && near(D.i[4], -0.05), "DTA: comma decimals, restarted T offset by last T");
var thr = false; try { S.parseDTA("no table here"); } catch (e) { thr = true; } ok(thr, "DTA without CURVE table throws");
var big = { t: [], v: [] }; for (var q = 0; q < 86400; q++) { big.t.push(q); big.v.push(Math.sin(q / 500)); }
var ds = S.downsample(big.t, big.v, 1200); ok(ds.length <= 1200 && ds.length > 1000, "downsample 86400 → ≤1200 points");

/* --- 6. backup round trip --- */
var bk = S.backupJSON([{ id: "stab-1", name: "x", createdAt: "2026-11-26T02:00:00Z", state: S.defaults() }], "1.5.0");
ok(S.parseBackup(bk).length === 1 && JSON.parse(bk).format === "fecalc-stability-backup", "backup JSON round trip");

console.log(JSON.stringify({ injections: sch.injections.length, last: S.fmtClock(sch.injections[66].ms), blocks: ranges, excludedByDefault: Object.keys(sch.defaultEx).map(Number),
  autoSwaps: S.autoSwaps(st), block1_FE_H2: +B0.fe.H2.m.toFixed(4) + " ± " + B0.fe.H2.sd.toFixed(4) + " %", drift_mV: K.driftMV, flagged: K.flagged.map(function (b) { return b + 1; }), pass: !fails.length }, null, 2));
if (fails.length) { console.error("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS stability (schedule + block averaging + liquid windows + stability check + DTA)");
