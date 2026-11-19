/* Stability test UI (v1.5.0). Vanilla JS, offline. State autosaves to localStorage; "Save run" adds a new record
   to IndexedDB (localStorage fallback); the loaded .DTA trace is kept in IndexedDB only (too large for every record). */
(function (root) {
  "use strict";
  var C = root.StabCore, CUR = "fecalc.stability.current.v1", DB = "fecalc-stability", LSRUNS = "fecalc.stability.runs.v1";
  var S, M, DTA = null, DTAds = null, sel = 1, dirty = false, store = null, blobs = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sig(x, s) { if (x == null || !isFinite(x)) return "—"; if (x === 0) return "0"; var a = Math.abs(x), d = Math.max(0, (s || 3) - 1 - Math.floor(Math.log10(a))); return x.toFixed(Math.min(d, 4)); }
  function f2(x, d) { return x == null || !isFinite(x) ? "—" : x.toFixed(d == null ? 2 : d); }
  function pm(st, d) { return isFinite(st.m) ? f2(st.m, d) + (isFinite(st.sd) ? " ± " + f2(st.sd, d) : "") : "—"; }
  function pn(p) { return C.prodDisplay(p); }
  function toast(m) { var t = $("st-toast"); t.textContent = m; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 2600); }
  function nowMs() { return root.__stabNow ? root.__stabNow() : Date.now(); }

  /* ---------- storage ---------- */
  function lsRuns() {
    function rd() { try { return JSON.parse(localStorage.getItem(LSRUNS)) || {}; } catch (e) { return {}; } }
    return { kind: "localStorage", all: function () { var o = rd(); return Promise.resolve(Object.keys(o).map(function (k) { return o[k]; })); },
      put: function (r) { var o = rd(); o[r.id] = r; localStorage.setItem(LSRUNS, JSON.stringify(o)); return Promise.resolve(r); },
      del: function (id) { var o = rd(); delete o[id]; localStorage.setItem(LSRUNS, JSON.stringify(o)); return Promise.resolve(); } };
  }
  function idb() {
    var dbp = new Promise(function (res, rej) {
      var q = indexedDB.open(DB, 1);
      q.onupgradeneeded = function () { var d = q.result; if (!d.objectStoreNames.contains("runs")) d.createObjectStore("runs", { keyPath: "id" }); if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs"); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    });
    function tx(name, mode, fn) { return dbp.then(function (db) { return new Promise(function (res, rej) { var t = db.transaction(name, mode), s = t.objectStore(name), out = fn(s); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); }; t.onerror = function () { rej(t.error); }; }); }); }
    return {
      runs: { kind: "IndexedDB", all: function () { return tx("runs", "readonly", function (s) { return s.getAll(); }); }, put: function (r) { return tx("runs", "readwrite", function (s) { s.put(r); }).then(function () { return r; }); }, del: function (id) { return tx("runs", "readwrite", function (s) { s.delete(id); }); } },
      blobs: { get: function (k) { return tx("blobs", "readonly", function (s) { return s.get(k); }); }, put: function (k, v) { return tx("blobs", "readwrite", function (s) { s.put(v, k); }); }, del: function (k) { return tx("blobs", "readwrite", function (s) { s.delete(k); }); } }
    };
  }
  function openStores() {
    try { if (root.indexedDB) { var d = idb(); return d.runs.all().then(function () { store = d.runs; blobs = d.blobs; }, function () { store = lsRuns(); }); } } catch (e) {}
    store = lsRuns(); return Promise.resolve();
  }
  function uid() { try { if (crypto.randomUUID) return "stab-" + crypto.randomUUID(); } catch (e) {} return "stab-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  /* ---------- state ---------- */
  function load() {
    var d = C.defaults();
    try { var s = JSON.parse(localStorage.getItem(CUR)); if (s && s.schema === 1) { Object.keys(d).forEach(function (k) { if (s[k] == null) s[k] = d[k]; }); return s; } } catch (e) {}
    return d;
  }
  function persist() { try { localStorage.setItem(CUR, JSON.stringify(S)); } catch (e) {} }
  function setDirty(v) { dirty = v; $("st-dirty").hidden = !v; }
  function changed() { persist(); setDirty(true); compute(); }

  /* ---------- compute + render outputs ---------- */
  function compute() {
    M = C.computeAll(S, DTA);
    renderMsgs(); renderCond(); renderBlocksTable(); renderScheduleList(); renderSwapInfo(); renderInjList(); renderInjOut();
    renderBlockCards(); renderWindowsOut(); renderCheck(); renderCharts(); tick();
  }
  function renderMsgs() {
    var h = "";
    M.sch.errors.forEach(function (e) { h += '<p class="st-msg st-msg--err">' + esc(e) + "</p>"; });
    M.sch.warnings.forEach(function (e) { h += '<p class="st-msg st-msg--warn">' + esc(e) + "</p>"; });
    $("st-msgs").innerHTML = h;
  }
  function renderCond() {
    var c = M.c;
    document.querySelectorAll(".st-gas-custom").forEach(function (e) { e.hidden = S.gasRef !== "custom"; });
    document.querySelectorAll(".st-ir-manual").forEach(function (e) { e.hidden = S.irMode !== "manual"; });
    document.querySelector(".st-ci-note").hidden = S.irMode === "manual";
    document.querySelector(".st-e0").hidden = S.eref !== "custom";
    document.querySelectorAll("[data-seg]").forEach(function (g) { var k = g.getAttribute("data-seg"); g.querySelectorAll(".seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.v === S[k]); b.setAttribute("aria-checked", b.dataset.v === S[k]); }); });
    $("st-cond").innerHTML = "|j| = " + sig(c.jtot, 4) + " mA cm⁻² · ṅ<sub>gas</sub> = " + (isFinite(c.ndot) ? c.ndot.toExponential(4) : "—") + " mol s⁻¹ · E basis: " + (c.basis === "RHE" ? "E<sub>RHE</sub>" : "E<sub>corr</sub> vs ref (enter pH for RHE)") + (c.okGas ? "" : ' · <b class="st-warn-t">enter |I| and flow to compute FE</b>');
  }
  function renderBlocksTable() {
    if (!M.sch.ok) { $("st-blocks").innerHTML = ""; return; }
    var rows = M.blocks.map(function (b) {
      var a = M.sch.injections.filter(function (j) { return j.block === b.b; });
      return "<tr><td>" + (b.b + 1) + "</td><td>" + (a.length ? a[0].k + "–" + a[a.length - 1].k : "—") + "</td><td>" + (a.length ? C.fmtClock(a[0].ms, true) : "—") + "</td><td>" + (a.length ? C.fmtClock(a[a.length - 1].ms, true) : "—") + "</td></tr>";
    }).join("");
    var last = M.sch.injections[M.sch.injections.length - 1];
    $("st-blocks").innerHTML = '<table class="st-table"><thead><tr><th>Block</th><th>Inj.</th><th>First</th><th>Last</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="gc-hint">' + M.sch.injections.length + " injections · last #" + (last ? last.k + " at " + C.fmtClock(last.ms) : "—") + " · run ends " + C.fmtClock(M.sch.tEnd) + "</p>";
  }
  function renderScheduleList() {
    if (!M.sch.ok) { $("st-schedule").innerHTML = ""; return; }
    var ev = M.sch.events.map(function (e) { return { ms: e.ms, ev: e }; }), inj = M.sch.injections.map(function (j) { return { ms: j.ms, j: j }; });
    var all = inj.concat(ev).sort(function (a, b) { return a.ms - b.ms; });
    $("st-schedule").innerHTML = '<table class="st-table st-table--sched"><thead><tr><th>#</th><th>Clock (SGT)</th><th>t (s)</th><th>Blk</th></tr></thead><tbody>' + all.map(function (x) {
      if (x.ev) return '<tr class="st-ev"><td colspan="4">' + esc(x.ev.label) + " · " + C.fmtClock(x.ms, true) + (x.ev.logged ? " (logged)" : "") + "</td></tr>";
      var j = x.j, ex = M.sch.defaultEx[j.k];
      return "<tr" + (ex ? ' class="st-ex"' : "") + "><td>" + j.k + "</td><td>" + C.fmtClock(j.ms, true) + "</td><td>" + Math.round(j.el) + "</td><td>" + (j.block + 1) + "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  /* ---------- swaps ---------- */
  function swapSrc(i) { return i < S.swaps.length ? S.swaps[i] : S.final; }
  function renderSwaps() {
    var n = S.swaps.length + 1, h = "";
    for (var i = 0; i < n; i++) {
      var s = swapSrc(i), fin = i === S.swaps.length, lab = fin ? "Final collection" : "Swap " + (i + 1);
      h += '<section class="st-swap" data-sw="' + i + '"><h3 class="st-swap__h">' + lab + ' <span class="st-swap__st" id="sw-st-' + i + '"></span></h3>' +
        '<div class="st-grid2"><label class="field"><span class="field__label">Planned (SGT)</span><input class="input" type="datetime-local" step="1" data-swf="planned" value="' + esc(s.planned) + '"></label>' +
        '<label class="field"><span class="field__label">Logged actual (SGT)</span><input class="input" type="datetime-local" step="1" data-swf="actual" value="' + esc(s.actual) + '"></label></div>' +
        '<div class="st-row"><button type="button" class="btn btn--cta st-grow" data-swact="now">Log ' + (fin ? "collection" : "swap") + ' now</button><button type="button" class="btn btn--ghost" data-swact="clear">Clear</button></div>' +
        '<p class="gc-hint" id="sw-info-' + i + '"></p>' +
        '<label class="st-check"><input type="checkbox" data-swf="salt"' + (s.salt ? " checked" : "") + '><span>Droplets or salt seen on the back of the GDE</span></label>' +
        '<label class="field"><span class="field__label">Observation note</span><input class="input" data-swf="note" autocomplete="off" value="' + esc(s.note) + '" placeholder="e.g. back dry; electrolyte level"></label></section>';
    }
    $("st-swaps").innerHTML = h;
  }
  function renderSwapInfo() {
    M.sch.events.forEach(function (e, i) {
      var info = $("sw-info-" + i), stt = $("sw-st-" + i); if (!info) return;
      var w = M.sch.windows[i], t = [];
      t.push("Using " + (e.logged ? "logged" : "planned") + " time " + C.fmtClock(e.ms));
      if (w) t.push("window " + (i + 1) + ": " + (w.dt / 3600).toFixed(2) + " h");
      if (e.firstAfter) t.push("injection #" + e.firstAfter + " excluded by default");
      if (e.near && e.near.length && e.type === "swap") t.push("⚠ within " + Math.round(M.sch.guard / 60) + " min of injection " + e.near.map(function (n) { return "#" + n.k + " (" + Math.round(Math.abs(n.dt)) + " s)"; }).join(", "));
      info.textContent = t.join(" · ");
      info.classList.toggle("st-warn-t", !!(e.near && e.near.length && e.type === "swap"));
      stt.textContent = e.logged ? "logged" : "planned"; stt.className = "st-swap__st" + (e.logged ? " is-logged" : "");
    });
  }

  /* ---------- products ---------- */
  function renderProdPick() {
    function list(ids, phase) {
      return C.PRESET_ORDER.filter(function (id) { return C.PRESETS[id].phase === phase; }).map(function (id) {
        return '<label class="st-check st-check--sm"><input type="checkbox" data-prod="' + phase + '" value="' + id + '"' + (ids.indexOf(id) > -1 ? " checked" : "") + '><span>' + esc(pn(C.P(id))) + " · n = " + C.PRESETS[id].n + "</span></label>";
      }).join("");
    }
    $("st-prodpick").innerHTML = '<p class="st-sub">Gas (GC ppm)</p><div class="st-prodgrid">' + list(S.gasIds, "gas") + '</div><p class="st-sub">Liquid (HSGC / HPLC μM)</p><div class="st-prodgrid">' + list(S.liqIds, "liquid") + "</div>";
  }

  /* ---------- injections ---------- */
  function currentInj() { if (!M.sch.ok) return 1; var t = nowMs(), k = 1; M.sch.injections.forEach(function (j) { if (j.ms <= t + 60e3) k = j.k; }); return k; }
  function renderInjSelect() {
    if (!M.sch.ok) { $("ij-sel").innerHTML = ""; return; }
    if (sel > M.sch.injections.length) sel = M.sch.injections.length || 1;
    $("ij-sel").innerHTML = M.sch.injections.map(function (j) { return '<option value="' + j.k + '"' + (j.k === sel ? " selected" : "") + ">#" + j.k + " · " + C.fmtClock(j.ms, true) + " · block " + (j.block + 1) + "</option>"; }).join("");
  }
  function renderInjEditor() {
    var box = $("st-inj-editor"); if (!M.sch.ok || !M.sch.injections.length) { box.innerHTML = ""; return; }
    var j = M.sch.injections[sel - 1], rec = S.inj[sel] || {}, dEx = M.sch.defaultEx[sel];
    var ex = rec.ex == null ? !!dEx : !!rec.ex;
    box.innerHTML = '<div class="st-injhead"><b>Injection #' + sel + "</b> · " + C.fmtClock(j.ms) + " · t = " + Math.round(j.el) + " s · block " + (j.block + 1) + "</div>" +
      '<label class="field"><span class="field__label">E at this injection (V vs ' + esc(M.c.refLabel) + ')</span><input class="input" inputmode="decimal" data-inj="E" value="' + esc(rec.E || "") + '" placeholder="e.g. −1.85"></label>' +
      '<p class="gc-hint" id="ij-e-out"></p>' +
      S.gasIds.map(function (id) { var p = C.P(id); return '<label class="field st-ppm"><span class="field__label"><i class="st-sw" style="background:' + p.hex + '"></i>' + esc(pn(p)) + ' · ppm</span><input class="input" inputmode="decimal" data-ppm="' + id + '" value="' + esc(rec.ppm && rec.ppm[id] || "") + '"><span class="field__help st-fe-out" id="ij-fe-' + id + '"></span></label>'; }).join("") +
      '<label class="st-check"><input type="checkbox" id="ij-ex"' + (ex ? " checked" : "") + '><span>Exclude from block average' + (dEx ? " (default: first injection after " + esc(dEx.toLowerCase()) + ")" : "") + "</span></label>" +
      (rec.ex != null ? '<button type="button" class="btn btn--ghost st-full" id="ij-ex-reset">Reset exclusion to default</button>' : "") +
      '<p class="st-injtot" id="ij-tot"></p>';
  }
  function renderInjOut() {
    if (!M.res.length) return;
    var r = M.res[sel - 1]; if (!r) return;
    var eo = $("ij-e-out"); if (eo) eo.innerHTML = "E<sub>corr</sub> = " + sig(r.Ec, 4) + " V vs ref · E<sub>RHE</sub> = " + sig(r.Er, 4) + " V";
    S.gasIds.forEach(function (id) { var e = $("ij-fe-" + id); if (e) e.textContent = r.has && isFinite(r.fe[id]) ? "FE " + f2(r.fe[id]) + " % · j " + sig(r.j[id], 3) + " mA cm⁻²" : ""; });
    var t = $("ij-tot"); if (t) t.innerHTML = r.has ? "Σ gas FE <b>" + f2(r.feTot) + " %</b> · carbon " + f2(r.feC) + " % · " + (r.included ? "included" : '<span class="st-warn-t">' + esc(r.reason) + "</span>") : '<span class="st-muted">No ppm entered yet.</span>';
  }
  function renderInjList() {
    if (!M.res.length) { $("st-inj-list").innerHTML = ""; return; }
    $("st-inj-list").innerHTML = '<table class="st-table st-table--inj"><thead><tr><th>#</th><th>Clock</th><th>Blk</th><th>E</th><th>Σ FE</th><th>Use</th></tr></thead><tbody>' + M.res.map(function (r) {
      return '<tr data-goto="' + r.k + '" class="' + (r.ex ? "st-ex" : "") + (r.k === sel ? " is-sel" : "") + '"><td>' + r.k + "</td><td>" + C.fmtClock(r.ms, true).slice(4, 9) + "</td><td>" + (r.block + 1) + "</td><td>" + (isFinite(r.E) ? r.E.toFixed(3) : "—") + "</td><td>" + (r.has ? f2(r.feTot, 1) : "—") + "</td><td>" + (r.included ? "✓" : r.ex ? "ex" : "") + "</td></tr>";
    }).join("") + "</tbody></table><p class=\"gc-hint\">Tap a row to edit it.</p>";
  }

  /* ---------- blocks ---------- */
  function renderBlockCards() {
    $("st-blockcards").innerHTML = M.blocks.map(function (b) {
      return '<section class="st-bcard"><h3>Block ' + (b.b + 1) + ' <span>' + b.tStart.toFixed(0) + "–" + b.tEnd.toFixed(0) + " h · n = " + b.n + "</span></h3>" +
        S.gasIds.map(function (id) { var p = C.P(id); return '<p class="st-kv"><span><i class="st-sw" style="background:' + p.hex + '"></i>' + esc(pn(p)) + "</span><b>" + pm(b.fe[id]) + " %</b></p>"; }).join("") +
        '<p class="st-kv st-kv--tot"><span>Σ gas FE</span><b>' + pm(b.tot) + ' %</b></p><p class="st-kv"><span>Gas carbon products</span><b>' + pm(b.carbon) + ' %</b></p>' +
        '<p class="st-kv"><span>E (' + (M.c.basis === "RHE" ? "V vs RHE" : "V vs ref") + ")</span><b>" + pm(b.Eb, 3) + "</b></p></section>";
    }).join("");
  }

  /* ---------- liquid windows ---------- */
  var openWins = {};
  function curWin() { if (!M.sch.ok) return 0; var t = nowMs(), k = 0; M.sch.windows.forEach(function (w) { if (w.startMs <= t) k = w.w; }); return k; }
  function renderWindows() {
    if (!M.sch.ok) { $("st-windows").innerHTML = ""; return; }
    $("st-windows").innerHTML = M.sch.windows.map(function (w) {
      var L = S.liq[w.w] || {};
      var open = openWins[w.w] != null ? openWins[w.w] : (w.w === curWin());
      return '<details class="st-win" data-win="' + w.w + '"' + (open ? " open" : "") + '><summary class="st-win__sum"><span class="st-swap__h">Window ' + (w.w + 1) + '</span> <span class="st-fe-out" id="wn-sum-' + w.w + '"></span><span class="st-muted st-win__h" id="wn-h-' + w.w + '"></span></summary>' +
        '<div class="st-grid2"><label class="field"><span class="field__label">V catholyte, WE (mL)</span><input class="input" inputmode="decimal" data-wf="Vw" value="' + esc(L.Vw || "") + '"></label>' +
        '<label class="field"><span class="field__label">V anolyte, CE (mL)</span><input class="input" inputmode="decimal" data-wf="Vc" value="' + esc(L.Vc || "") + '"></label></div>' +
        '<label class="field"><span class="field__label">Measured Q (C), optional</span><input class="input" inputmode="decimal" data-wf="Qm" value="' + esc(L.Qm || "") + '" placeholder="blank → |I|·Δt"></label>' +
        S.liqIds.map(function (id) { var p = C.P(id), cc = (L.c || {})[id] || {};
          return '<div class="st-liqp"><p class="st-liqp__n"><i class="st-sw" style="background:' + p.hex + '"></i>' + esc(pn(p)) + ' <span class="st-fe-out" id="wn-fe-' + w.w + "-" + id + '"></span></p><div class="st-grid2">' +
            '<label class="field"><span class="field__label">Catholyte WE (μM)</span><input class="input" inputmode="decimal" data-wc="' + id + '" data-side="we" value="' + esc(cc.we || "") + '"></label>' +
            '<label class="field"><span class="field__label">Anolyte CE (μM)</span><input class="input" inputmode="decimal" data-wc="' + id + '" data-side="ce" value="' + esc(cc.ce || "") + '"></label></div></div>'; }).join("") +
        '<p class="st-injtot" id="wn-tot-' + w.w + '"></p></details>';
    }).join("");
  }
  function renderWindowsOut() {
    M.wins.forEach(function (w) {
      var h = $("wn-h-" + w.w); if (!h) return;
      h.textContent = C.fmtClock(w.startMs, true) + " → " + C.fmtClock(w.endMs, true) + " · " + (w.dt / 3600).toFixed(2) + " h · Q " + sig(w.Q, 4) + " C (" + w.Qsrc + ")";
      S.liqIds.forEach(function (id) { var e = $("wn-fe-" + w.w + "-" + id); if (e) e.textContent = w.fe[id] != null && isFinite(w.fe[id]) ? "FE " + f2(w.fe[id]) + " %" : ""; });
      $("wn-sum-" + w.w).textContent = isFinite(w.tot) ? "Σ " + f2(w.tot) + " %" : "";
      $("wn-tot-" + w.w).innerHTML = isFinite(w.tot) ? "Σ liquid FE <b>" + f2(w.tot) + " %</b>" : (w.any ? '<span class="st-warn-t">Enter both volumes.</span>' : '<span class="st-muted">No concentrations yet.</span>');
    });
  }

  /* ---------- stability check ---------- */
  function renderCheck() {
    var k = M.chk; if (!k) { $("st-check").innerHTML = ""; return; }
    var eU = k.basis === "RHE" ? "E<sub>RHE</sub>" : "E<sub>corr</sub> vs ref", warn = "";
    if (k.flagged.length) warn += '<div class="st-alert" role="alert"><b>H₂ FE rising.</b> Block ' + k.flagged.map(function (b) { return b + 1; }).join(", ") + " exceed" + (k.flagged.length === 1 ? "s" : "") + " block " + (k.h2Base + 1) + " by more than " + k.thr + " percentage points. Check the GDE for flooding or salt before claiming stability.</div>";
    else if (k.h2Rising) warn += '<div class="st-alert st-alert--soft" role="status"><b>H₂ FE rises in every block</b> (still within ' + k.thr + " pp of block " + (k.h2Base + 1) + ").</div>";
    if (k.salt.length) warn += '<div class="st-alert st-alert--soft" role="status"><b>Droplets or salt</b> seen on the GDE back at: ' + esc(k.salt.join(", ")) + ".</div>";
    var rows = k.blocks.map(function (b) {
      return "<tr" + (b.flag ? ' class="st-flag"' : "") + "><td>" + (b.b + 1) + "</td><td>" + f2(b.h2, 1) + "</td><td>" + (isFinite(b.dH2) ? (b.dH2 >= 0 ? "+" : "") + b.dH2.toFixed(1) : "—") + (b.flag ? " ⚠" : "") + "</td><td>" + f2(b.gasC, 1) + "</td><td>" + f2(b.liqTW, 1) + "</td><td><b>" + f2(b.carbonTot, 1) + "</b></td></tr>";
    }).join("");
    $("st-check").innerHTML = warn +
      '<div class="st-metrics"><div class="st-metric"><span>E drift (last − first block)</span><b>' + (isFinite(k.driftMV) ? (k.driftMV >= 0 ? "+" : "") + k.driftMV.toFixed(1) + " mV" : "—") + "</b><small>" + eU + (k.first && k.last ? " · block " + (k.first.b + 1) + " → " + (k.last.b + 1) : "") + "</small></div>" +
      '<div class="st-metric"><span>E spread (max − min)</span><b>' + (isFinite(k.spreadMV) ? k.spreadMV.toFixed(1) + " mV" : "—") + "</b><small>included injections</small></div></div>" +
      '<table class="st-table st-table--chk"><thead><tr><th>Blk</th><th>H₂ FE %</th><th>Δ pp</th><th>Gas C %</th><th>Liq. %</th><th>C total %</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="gc-hint">Hydrogen (H₂) FE per block vs the first block with data. Gas C = gas carbon products (all tracked gases except H₂). Liq. = liquid FE of the overlapping electrolyte windows, time-weighted (|I| constant, so charge ∝ time); blank until those windows have data. C total = gas C + Liq.</p>';
  }

  /* ---------- charts (SVG) ---------- */
  function nice(m) { var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function stacked(el, groups, prods, xlab, title) {
    var W = 360, H = 230, L = 40, Rm = 8, T = 22, B = 40, pw = W - L - Rm, ph = H - T - B;
    var tops = groups.map(function (g) { var s = 0; prods.forEach(function (p) { var v = g.v[p.id]; if (isFinite(v) && v > 0) s += v; }); return s + (isFinite(g.sd) ? g.sd : 0); });
    var ymax = nice(Math.max(10, Math.max.apply(null, tops.concat([0])) * 1.08)), y = function (v) { return T + ph - v / ymax * ph; };
    var bw = pw / Math.max(1, groups.length), s = '<svg viewBox="0 0 ' + W + " " + H + '" class="st-svg" role="img" aria-label="' + esc(title) + '"><text x="' + L + '" y="14" class="st-svg__t">' + esc(title) + "</text>";
    for (var q = 0; q <= 4; q++) { var v = ymax * q / 4, yy = y(v); s += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + yy + '" y2="' + yy + '" class="st-grid"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" class="st-ax" text-anchor="end">' + +v.toFixed(1) + "</text>"; }
    groups.forEach(function (g, i) {
      var x = L + i * bw + bw * 0.18, w = bw * 0.64, acc = 0;
      prods.forEach(function (p) { var v = g.v[p.id]; if (!(isFinite(v) && v > 0)) return; s += '<rect x="' + x.toFixed(1) + '" y="' + y(acc + v).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(acc) - y(acc + v)).toFixed(1) + '" fill="' + p.hex + '"><title>' + esc(pn(p)) + ": " + v.toFixed(2) + " %</title></rect>"; acc += v; });
      if (isFinite(g.sd) && acc > 0) { var cx = x + w / 2; s += '<line x1="' + cx + '" x2="' + cx + '" y1="' + y(acc + g.sd) + '" y2="' + y(Math.max(0, acc - g.sd)) + '" class="st-whisk"/><line x1="' + (cx - 4) + '" x2="' + (cx + 4) + '" y1="' + y(acc + g.sd) + '" y2="' + y(acc + g.sd) + '" class="st-whisk"/>'; }
      s += '<text x="' + (x + w / 2) + '" y="' + (T + ph + 13) + '" class="st-ax" text-anchor="middle">' + esc(g.label) + "</text>";
    });
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" class="st-ax" text-anchor="middle">' + esc(xlab) + '</text><text x="10" y="' + (T + ph / 2) + '" class="st-ax" transform="rotate(-90 10 ' + (T + ph / 2) + ')" text-anchor="middle">FE (%)</text></svg>';
    var leg = '<div class="st-legend">' + prods.map(function (p) { return '<span><i class="st-sw" style="background:' + p.hex + '"></i>' + esc(pn(p)) + "</span>"; }).join("") + "</div>";
    el.innerHTML = s + leg;
  }
  function renderCharts() {
    var gp = S.gasIds.map(C.P), lp = S.liqIds.map(C.P);
    stacked($("ch-gas"), M.blocks.map(function (b) { var v = {}; S.gasIds.forEach(function (id) { v[id] = b.fe[id].m; }); return { label: "B" + (b.b + 1), v: v, sd: b.tot.sd }; }), gp, "Gas block (whisker = SD of Σ FE)", "Stacked gas FE by block");
    stacked($("ch-liq"), M.wins.map(function (w) { var v = {}; S.liqIds.forEach(function (id) { v[id] = w.fe[id]; }); return { label: "W" + (w.w + 1), v: v }; }), lp, "Electrolyte window", "Liquid FE by window");
    renderET();
  }
  function renderET() {
    var el = $("ch-et"); if (!M.sch.ok) { el.innerHTML = ""; return; }
    var c = M.c, rhe = c.basis === "RHE", pts = M.res.filter(function (r) { return isFinite(rhe ? r.Er : r.Ec); }).map(function (r) { return { x: r.h, y: rhe ? r.Er : r.Ec, ex: !r.included }; });
    var tr = [];
    if (DTAds) tr = DTAds.map(function (p) { var e = C.eChain(p[1], c, p[2]); return { x: p[0] / 3600, y: rhe ? e.Er : e.Ec }; }).filter(function (p) { return isFinite(p.y); });
    var ys = pts.map(function (p) { return p.y; }).concat(tr.map(function (p) { return p.y; }));
    var W = 360, H = 230, L = 50, Rm = 8, T = 22, B = 40, pw = W - L - Rm, ph = H - T - B, xmax = M.sch.runS / 3600;
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="st-svg" role="img" aria-label="E vs t"><text x="' + L + '" y="14" class="st-svg__t">E vs t' + (DTAds ? " (DTA trace + injections)" : " (at each injection)") + "</text>";
    var lo = ys.length ? Math.min.apply(null, ys) : -1, hi = ys.length ? Math.max.apply(null, ys) : 0; if (hi - lo < 0.02) { var mid = (hi + lo) / 2; lo = mid - 0.01; hi = mid + 0.01; } var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    var X = function (v) { return L + v / xmax * pw; }, Y = function (v) { return T + ph - (v - lo) / (hi - lo) * ph; };
    for (var q = 0; q <= 4; q++) { var v = lo + (hi - lo) * q / 4; s += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="st-grid"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3) + '" class="st-ax" text-anchor="end">' + v.toFixed(3) + "</text>"; }
    var step = xmax > 12 ? 4 : xmax > 4 ? 2 : 1;
    for (var t = 0; t <= xmax + 1e-9; t += step) s += '<text x="' + X(t) + '" y="' + (T + ph + 13) + '" class="st-ax" text-anchor="middle">' + t + "</text>";
    M.sch.events.forEach(function (e) { var x = X(e.el / 3600); if (e.type === "swap") s += '<line x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (T + ph) + '" class="st-swapline"><title>' + esc(e.label) + " " + C.fmtClock(e.ms, true) + "</title></line>"; });
    if (tr.length) s += '<path d="' + tr.map(function (p, i) { return (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1); }).join("") + '" class="st-trace"/>';
    pts.forEach(function (p) { s += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="2.6" class="' + (p.ex ? "st-pt st-pt--ex" : "st-pt") + '"/>'; });
    if (!ys.length) s += '<text x="' + (L + pw / 2) + '" y="' + (T + ph / 2) + '" class="st-ax" text-anchor="middle">Enter E at each injection</text>';
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" class="st-ax" text-anchor="middle">t (h) · dashed = electrolyte swap</text><text x="10" y="' + (T + ph / 2) + '" class="st-ax" transform="rotate(-90 10 ' + (T + ph / 2) + ')" text-anchor="middle">' + (rhe ? "E (V vs RHE)" : "E_corr (V vs ref)") + "</text></svg>";
    el.innerHTML = s;
  }

  /* ---------- live countdowns ---------- */
  function tick() {
    if (!M || !M.sch.ok) { ["lv-inj", "lv-swap", "lv-run"].forEach(function (i) { $(i).textContent = "—"; }); return; }
    var t = nowMs(), nx = null; M.sch.injections.some(function (j) { if (j.ms > t) { nx = j; return true; } return false; });
    $("lv-inj").textContent = nx ? "#" + nx.k + " · " + C.fmtClock(nx.ms, true) : "none left";
    $("lv-inj-s").textContent = nx ? "in " + C.fmtDur((nx.ms - t) / 1000) + " · block " + (nx.block + 1) : "";
    var ns = null; M.sch.events.some(function (e) { if (!e.logged && e.ms > t) { ns = e; return true; } return false; });
    $("lv-swap").textContent = ns ? ns.label + " · " + C.fmtClock(ns.ms, true) : "none pending";
    $("lv-swap-s").textContent = ns ? "in " + C.fmtDur((ns.ms - t) / 1000) : "";
    var el = (t - M.sch.t0) / 1000;
    $("lv-run").textContent = el < 0 ? "starts " + C.fmtClock(M.sch.t0, true) : el > M.sch.runS ? "finished" : C.fmtDur(el) + " elapsed";
    $("lv-run-s").textContent = el < 0 ? "in " + C.fmtDur(-el) : el > M.sch.runS ? "" : "block " + (Math.min(M.sch.nBlocks - 1, Math.floor(el / M.sch.blockS)) + 1) + " of " + M.sch.nBlocks;
  }

  /* ---------- full render (inputs) ---------- */
  function syncInputs() {
    document.querySelectorAll("[data-s]").forEach(function (e) { var k = e.getAttribute("data-s"); if (document.activeElement !== e) e.value = S[k] == null ? "" : S[k]; });
  }
  function renderAll() {
    syncInputs(); renderSwaps(); renderProdPick(); M = C.computeAll(S, DTA); renderInjSelect(); renderInjEditor(); renderWindows(); compute();
  }

  /* ---------- DTA ---------- */
  function setDTA(d, quiet) {
    DTA = d; DTAds = null;
    if (d) { var ds = C.downsample(d.t, d.v, 1200), idx = {}; d.t.forEach(function (t, k) { idx[t] = k; }); DTAds = ds.map(function (p) { return [p[0], p[1], d.i[idx[p[0]]]]; }); }
    $("dta-info").textContent = d ? "Loaded " + (d.name || "trace") + ": " + d.n + " points over " + (d.t[d.n - 1] / 3600).toFixed(2) + " h (" + d.tables + " table" + (d.tables > 1 ? "s" : "") + "), file DATE/TIME " + (d.date || "?") + " " + (d.time || "?") + ". Shown downsampled; exported in full. T taken as seconds from the run start." : "No .DTA loaded. T in the file is taken as seconds from the run start.";
    if (!quiet) compute();
  }

  /* ---------- export ---------- */
  function dl(blob, name) {
    var touch = matchMedia("(pointer: coarse)").matches || matchMedia("(display-mode: standalone)").matches;
    try { var file = new File([blob], name, { type: blob.type }); if (touch && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function () {}); return; } } catch (e) {}
    var a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function stamp() { return C.toInputSGT(Date.now()).replace(/[:T]/g, "-").slice(0, 16); }
  function exportXlsx() {
    if (!M.sch.ok) { toast("Fix the schedule errors first."); return Promise.resolve(); }
    if (!root.ExcelJS) { toast("Excel library not loaded."); return Promise.resolve(); }
    var wb = C.buildWorkbook(root.ExcelJS, C.computeAll(S, DTA), { version: root.APP_VERSION || "" });
    return wb.xlsx.writeBuffer().then(function (buf) {
      root.__lastXlsx = buf;
      if (root.__noDownload) return;
      dl(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Stability_" + (S.runName ? S.runName.replace(/[^\w.-]+/g, "_").slice(0, 40) + "_" : "") + stamp() + ".xlsx");
    });
  }

  /* ---------- saved runs ---------- */
  function saveRun() {
    var now = new Date().toISOString(), k = M.chk;
    var rec = { id: uid(), name: (S.runName || "").trim() || "Stability run " + C.fmtISO(Date.now()).slice(0, 16), createdAt: now, appVersion: root.APP_VERSION || "",
      state: JSON.parse(JSON.stringify(S)), summary: { driftMV: k ? k.driftMV : null, nInj: M.res.filter(function (r) { return r.has; }).length, flagged: k ? k.flagged.length : 0 } };
    return store.put(rec).then(function () { setDirty(false); toast("Saved as a new record: " + rec.name); });
  }
  function renderRuns() {
    return store.all().then(function (list) {
      list.sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
      $("st-backend").textContent = store.kind;
      $("st-runs").innerHTML = list.length ? list.map(function (r) {
        var s = r.summary || {};
        return '<article class="hx-card" data-id="' + esc(r.id) + '"><div class="hx-card__head"><h3 class="hx-card__name">' + esc(r.name) + '</h3><span class="hx-card__fe">' + (s.nInj || 0) + ' inj.</span></div>' +
          '<p class="hx-card__meta">' + esc(C.fmtISO(Date.parse(r.createdAt))) + " SGT · drift " + (isFinite(s.driftMV) && s.driftMV != null ? s.driftMV.toFixed(1) + " mV" : "—") + (s.flagged ? " · H₂ flag" : "") + "</p>" +
          '<div class="hx-card__actions"><button type="button" class="btn btn--secondary" data-act="open">Open</button><button type="button" class="btn btn--ghost" data-act="json">.json</button><button type="button" class="btn btn--ghost" data-act="del">Delete</button></div></article>';
      }).join("") : '<p class="hx-empty">No saved runs yet. “Save run” stores a new record each time.</p>';
      return list;
    });
  }
  function runAct(id, a) {
    store.all().then(function (list) {
      var r = list.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      if (a === "open") { if (dirty && !confirm("Replace the current unsaved inputs with “" + r.name + "”?")) return; S = Object.assign(C.defaults(), JSON.parse(JSON.stringify(r.state))); persist(); setDirty(false); renderAll(); closeDlg(); toast("Opened " + r.name); }
      else if (a === "json") dl(new Blob([C.backupJSON([r], root.APP_VERSION)], { type: "application/json" }), "stability-run_" + r.id.slice(-8) + ".json");
      else if (a === "del" && confirm("Delete “" + r.name + "” from this device? This cannot be undone.")) store.del(id).then(renderRuns).then(function () { toast("Deleted"); });
    });
  }
  function closeDlg() { var d = $("st-runs-dlg"); if (d.close) d.close(); else d.removeAttribute("open"); }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("input", function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute("data-s"))) { S[k] = t.value; if (k === "eref") { var r = C.EREF[t.value]; if (r && r.E0 != null) S.E0 = String(r.E0); } var structural = /^(runStart|firstInj|interval|blockH|runH)$/.test(k); persist(); setDirty(true); if (structural) { M = C.computeAll(S, DTA); renderInjSelect(); renderInjEditor(); renderWindows(); } compute(); return; }
      var sw = t.closest("[data-sw]");
      if (sw && t.getAttribute("data-swf")) { var src = swapSrc(+sw.getAttribute("data-sw")), f = t.getAttribute("data-swf"); src[f] = f === "salt" ? t.checked : t.value; persist(); setDirty(true); if (f === "planned" || f === "actual") { M = C.computeAll(S, DTA); renderWindows(); renderInjEditor(); } compute(); return; }
      if (t.getAttribute("data-inj") === "E") { (S.inj[sel] = S.inj[sel] || { ppm: {} }).E = t.value; changed(); return; }
      if ((k = t.getAttribute("data-ppm"))) { var rec = S.inj[sel] = S.inj[sel] || { ppm: {} }; rec.ppm = rec.ppm || {}; rec.ppm[k] = t.value; changed(); return; }
      if (t.id === "ij-ex") { var r2 = S.inj[sel] = S.inj[sel] || { ppm: {} }; r2.ex = t.checked; changed(); renderInjEditor(); renderInjOut(); return; }
      var win = t.closest("[data-win]");
      if (win) { var w = +win.getAttribute("data-win"), L = S.liq[w] = S.liq[w] || { c: {} }; L.c = L.c || {};
        if (t.getAttribute("data-wf")) L[t.getAttribute("data-wf")] = t.value;
        else if ((k = t.getAttribute("data-wc"))) { (L.c[k] = L.c[k] || {})[t.getAttribute("data-side")] = t.value; }
        changed(); return; }
      if ((k = t.getAttribute("data-prod"))) { var key = k === "gas" ? "gasIds" : "liqIds", ids = []; document.querySelectorAll('[data-prod="' + k + '"]:checked').forEach(function (c) { ids.push(c.value); });
        S[key] = C.PRESET_ORDER.filter(function (id) { return ids.indexOf(id) > -1; }); persist(); setDirty(true); M = C.computeAll(S, DTA); renderInjEditor(); renderWindows(); compute(); }
    });
    document.addEventListener("change", function (e) { if (e.target.type === "checkbox" && e.target.closest("[data-sw]")) e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest("button, tr[data-goto]"); if (!b) return;
      var seg = b.closest("[data-seg]");
      if (seg && b.classList.contains("seg__btn")) { S[seg.getAttribute("data-seg")] = b.dataset.v; changed(); return; }
      var sw = b.closest("[data-sw]");
      if (sw && b.getAttribute("data-swact")) { var i = +sw.getAttribute("data-sw"), src = swapSrc(i);
        if (b.getAttribute("data-swact") === "now") { src.actual = C.toInputSGT(Math.floor(nowMs() / 1000) * 1000); toast((i < S.swaps.length ? "Swap " + (i + 1) : "Final collection") + " logged at " + C.fmtClock(nowMs(), true)); }
        else src.actual = "";
        sw.querySelector('[data-swf="actual"]').value = src.actual; persist(); setDirty(true); M = C.computeAll(S, DTA); renderWindows(); renderInjEditor(); compute(); return; }
      if (b.hasAttribute("data-goto")) { sel = +b.getAttribute("data-goto"); renderInjSelect(); renderInjEditor(); compute(); $("st-inj-editor").scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      var hc = b.closest(".hx-card"); if (hc && b.getAttribute("data-act")) { runAct(hc.getAttribute("data-id"), b.getAttribute("data-act")); return; }
      if (b.hasAttribute("data-close")) { closeDlg(); return; }
      switch (b.id) {
        case "ij-prev": if (sel > 1) { sel--; renderInjSelect(); renderInjEditor(); compute(); } break;
        case "ij-next": if (sel < M.sch.injections.length) { sel++; renderInjSelect(); renderInjEditor(); compute(); } break;
        case "ij-now": sel = currentInj(); renderInjSelect(); renderInjEditor(); compute(); break;
        case "ij-ex-reset": if (S.inj[sel]) delete S.inj[sel].ex; changed(); renderInjEditor(); renderInjOut(); break;
        case "an-now": $("an-t").value = C.toInputSGT(Math.floor(nowMs() / 1000) * 1000); break;
        case "an-apply": var v = C.reanchor($("an-k").value, $("an-t").value, S.interval); if (!v) { toast("Enter an injection number and a valid time."); break; } S.firstInj = v; persist(); setDirty(true); syncInputs(); M = C.computeAll(S, DTA); renderInjSelect(); renderInjEditor(); renderWindows(); compute(); toast("First injection re-anchored to " + C.fmtClock(C.parseSGT(v))); break;
        case "sw-auto": var a = C.autoSwaps(S); if (!a.length) { toast("Fix the schedule first."); break; } if (!confirm("Set the planned swap times to " + a.map(function (x) { return C.fmtClock(C.parseSGT(x), true); }).join(", ") + "? Logged times are kept.")) break;
          while (S.swaps.length < a.length) S.swaps.push({ planned: "", actual: "", salt: false, note: "" }); S.swaps.length = a.length; a.forEach(function (x, k) { S.swaps[k].planned = x; }); S.final.planned = C.toInputSGT(C.parseSGT(S.runStart) + C.pnum(S.runH) * 3600e3);
          persist(); setDirty(true); renderAll(); break;
        case "dta-clear": setDTA(null); if (blobs) blobs.del("dta").catch(function () {}); break;
        case "st-export": exportXlsx(); break;
        case "st-save": saveRun(); break;
        case "st-open": renderRuns().then(function () { var d = $("st-runs-dlg"); if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }); break;
        case "st-backup": store.all().then(function (l) { dl(new Blob([C.backupJSON(l, root.APP_VERSION)], { type: "application/json" }), "stability-backup_" + stamp() + ".json"); }); break;
        case "st-new": if (!confirm("Clear all inputs and start a new run? Save first if you want to keep this one.")) break; S = C.defaults(); sel = 1; persist(); setDirty(false); setDTA(null, true); if (blobs) blobs.del("dta").catch(function () {}); renderAll(); break;
      }
    });
    document.addEventListener("toggle", function (e) { var d = e.target; if (d.matches && d.matches("details[data-win]")) openWins[+d.getAttribute("data-win")] = d.open; }, true);
    $("ij-sel").addEventListener("change", function (e) { sel = +e.target.value; renderInjEditor(); compute(); });
    $("dta-file").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var d = C.parseDTA(rd.result); d.name = f.name; setDTA(d); if (blobs) blobs.put("dta", d).catch(function () {}); toast("Loaded " + d.n + " points"); } catch (err) { toast(err.message); } };
      rd.readAsText(f); e.target.value = "";
    });
    $("st-restore").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var inc = C.parseBackup(rd.result); store.all().then(function (have) { var ids = {}; have.forEach(function (r) { ids[r.id] = 1; }); var add = inc.filter(function (r) { return !ids[r.id]; }); return Promise.all(add.map(function (r) { return store.put(r); })).then(function () { toast("Restored " + add.length + " · skipped " + (inc.length - add.length) + " duplicate(s)"); return renderRuns(); }); }); } catch (err) { toast(err.message); } };
      rd.readAsText(f); e.target.value = "";
    });
  }

  function init() {
    S = load();
    $("st-eref").innerHTML = Object.keys(C.EREF).map(function (k) { return '<option value="' + k + '">' + esc(C.EREF[k].label) + "</option>"; }).join("");
    bind(); M = C.computeAll(S, DTA); sel = currentInj(); renderAll();
    setInterval(tick, 1000);
    openStores().then(function () { if (blobs) return blobs.get("dta").then(function (d) { if (d && d.n) setDTA(d); }); }).catch(function () {});
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    root.StabUI = { state: function () { return S; }, model: function () { return M; }, exportXlsx: exportXlsx, setDTA: setDTA, saveRun: saveRun, runs: function () { return store.all(); }, select: function (k) { sel = k; renderInjSelect(); renderInjEditor(); compute(); }, renderAll: renderAll, load: function (st) { S = st; persist(); renderAll(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
