/* On-device experiment history (v1.4.0). IndexedDB → localStorage fallback. No network. */
(function (root) {
  "use strict";
  var DB = "fecalc-history", STORE = "experiments", LSKEY = "fecalc.history.v1", FORMAT = "fecalc-backup";

  /* ---------- storage backends (Promise API: all, put, del) ---------- */
  function memStore() { var m = {}; return {
    kind: "memory",
    all: function () { return Promise.resolve(Object.keys(m).map(function (k) { return JSON.parse(m[k]); })); },
    put: function (r) { m[r.id] = JSON.stringify(r); return Promise.resolve(r); },
    del: function (id) { delete m[id]; return Promise.resolve(); } }; }
  function lsStore(ls) {
    function read() { try { return JSON.parse(ls.getItem(LSKEY)) || {}; } catch (e) { return {}; } }
    function write(o) { ls.setItem(LSKEY, JSON.stringify(o)); }
    return { kind: "localStorage",
      all: function () { var o = read(); return Promise.resolve(Object.keys(o).map(function (k) { return o[k]; })); },
      put: function (r) { var o = read(); o[r.id] = r; write(o); return Promise.resolve(r); },
      del: function (id) { var o = read(); delete o[id]; write(o); return Promise.resolve(); } };
  }
  function idbStore(idb) {
    var dbp = new Promise(function (res, rej) {
      var q = idb.open(DB, 1);
      q.onupgradeneeded = function () { q.result.createObjectStore(STORE, { keyPath: "id" }); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    });
    function tx(mode, fn) { return dbp.then(function (db) { return new Promise(function (res, rej) {
      var t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s);
      t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { rej(t.error); }; }); }); }
    return { kind: "IndexedDB",
      all: function () { return tx("readonly", function (s) { return s.getAll(); }); },
      put: function (r) { return tx("readwrite", function (s) { s.put(r); }).then(function () { return r; }); },
      del: function (id) { return tx("readwrite", function (s) { s.delete(id); }); } };
  }
  function openStore() {
    try { if (root.indexedDB) { var s = idbStore(root.indexedDB); return s.all().then(function () { return s; }, function () { return lsStore(root.localStorage); }); } } catch (e) {}
    try { if (root.localStorage) return Promise.resolve(lsStore(root.localStorage)); } catch (e) {}
    return Promise.resolve(memStore());
  }

  /* ---------- pure core ---------- */
  function uid() { return "exp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function makeRecord(meta, state, snapshot, now) {
    now = now || new Date().toISOString();
    return { id: uid(), name: (meta.name || "").trim() || ("Experiment " + now.slice(0, 10)),
      catalyst: meta.catalyst || "", electrolyte: meta.electrolyte || "",
      createdAt: now, updatedAt: now, appVersion: root.APP_VERSION || "",
      state: JSON.parse(JSON.stringify(state)), snapshot: snapshot || null };
  }
  function duplicate(rec, now) {
    var d = JSON.parse(JSON.stringify(rec)); now = now || new Date().toISOString();
    d.id = uid(); d.name = rec.name + " (copy)"; d.createdAt = d.updatedAt = now; return d;
  }
  function backupJSON(list) {
    return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), appVersion: root.APP_VERSION || "", experiments: list }, null, 2);
  }
  function parseBackup(text) {
    var o = JSON.parse(text);
    var arr = Array.isArray(o) ? o : (o && o.experiments);
    if (!Array.isArray(arr)) throw new Error("Not a FE calculator backup file.");
    return arr.filter(function (r) { return r && r.id && r.state; });
  }
  function mergeInto(store, incoming) {
    return store.all().then(function (have) {
      var ids = {}; have.forEach(function (r) { ids[r.id] = 1; });
      var add = incoming.filter(function (r) { return !ids[r.id]; });
      return Promise.all(add.map(function (r) { return store.put(r); })).then(function () { return { added: add.length, skipped: incoming.length - add.length }; });
    });
  }
  function filterSort(list, q, sort) {
    q = (q || "").toLowerCase().trim();
    var out = list.filter(function (r) {
      if (!q) return true;
      return [r.name, r.catalyst, r.electrolyte, r.state && r.state.notes].join(" ").toLowerCase().indexOf(q) > -1;
    });
    out.sort(function (a, b) { return sort === "old" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt); });
    return out;
  }
  var H = { memStore: memStore, lsStore: lsStore, idbStore: idbStore, openStore: openStore, makeRecord: makeRecord, duplicate: duplicate, backupJSON: backupJSON,
    parseBackup: parseBackup, mergeInto: mergeInto, filterSort: filterSort };
  if (typeof module !== "undefined" && module.exports) { module.exports = H; return; }
  root.FEHistory = H;

  /* ---------- UI ---------- */
  var store, GC, list = [], dirty = false, currentId = null, suppress = false;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sig(x, d) { return x == null || !isFinite(x) ? "—" : String(+x.toPrecision(d || 3)); }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } }
  function toast(msg) { var t = $("hx-toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 2600); }
  function refresh() { return store.all().then(function (a) { list = a; render(); }); }
  function setDirty(v) { dirty = v; var b = $("hx-dirty"); if (b) b.hidden = !v; }

  function render() {
    var box = $("hx-list"); if (!box) return;
    var rows = filterSort(list, $("hx-q").value, $("hx-sort").value);
    $("hx-count").textContent = list.length + (list.length === 1 ? " experiment" : " experiments");
    if (!rows.length) { box.innerHTML = '<p class="hx-empty">' + (list.length ? "No matches." : "No saved experiments yet. Use “Save experiment” after a run.") + "</p>"; return; }
    box.innerHTML = rows.map(function (r) {
      var s = r.snapshot || {}, st = r.state || {};
      var cond = st.technique === "CP" ? ("CP · " + esc(s.I || ((st.Iset || "") + " mA"))) : ("CA · E " + esc(st.Eset || "—") + " V");
      var top = (s.top || []).map(function (t) { return esc(t.name) + " " + sig(t.fe, 3) + "%"; }).join(" · ");
      var meta = [r.catalyst, r.electrolyte].filter(Boolean).map(esc).join(" · ");
      return '<article class="hx-card' + (r.id === currentId ? " is-current" : "") + '" data-id="' + esc(r.id) + '">' +
        '<div class="hx-card__head"><h3 class="hx-card__name">' + esc(r.name) + '</h3><span class="hx-card__fe">ΣFE ' + (s.feTotal != null ? sig(s.feTotal, 3) + "%" : "—") + "</span></div>" +
        '<p class="hx-card__meta">' + esc(fmtDate(r.createdAt)) + " · " + cond + (meta ? " · " + meta : "") + "</p>" +
        (top ? '<p class="hx-card__top">' + top + "</p>" : "") +
        '<div class="hx-card__actions">' +
        '<button type="button" class="btn btn--cta" data-act="open">Open</button>' +
        '<button type="button" class="btn btn--ghost" data-act="dup">Duplicate</button>' +
        '<button type="button" class="btn btn--ghost" data-act="csv">CSV</button>' +
        '<button type="button" class="btn btn--ghost" data-act="xlsx">XLSX</button>' +
        '<button type="button" class="btn btn--ghost" data-act="rename">Rename</button>' +
        '<button type="button" class="btn btn--ghost hx-danger" data-act="del">Delete</button></div></article>';
    }).join("");
  }
  function find(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function withState(state, fn) { var cur = GC.getState(); suppress = true; GC.load(state); try { fn(); } finally { GC.load(cur); suppress = false; } }
  function openDlg(id) { var d = $(id); if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  function closeDlg(id) { var d = $(id); if (d.close) d.close(); else d.removeAttribute("open"); }

  function openSave(afterSave) {
    var st = GC.getState(), cur = currentId && find(currentId);
    $("hx-s-name").value = cur ? cur.name : "";
    $("hx-s-cat").value = cur ? cur.catalyst : "";
    $("hx-s-elec").value = cur ? cur.electrolyte : "";
    $("hx-s-date").textContent = fmtDate(new Date().toISOString());
    $("hx-s-cond").textContent = st.technique === "CP" ? ("CP · " + (st.cpmode === "j" ? st.jset + " mA cm⁻²" : st.Iset + " mA")) : ("CA · E " + (st.Eset || "—") + " V");
    $("hx-s-notes").textContent = st.notes ? st.notes : "(no observations entered)";
    $("hx-s-update").hidden = !cur;
    $("hx-save-dlg")._after = afterSave || null;
    openDlg("hx-save-dlg");
    setTimeout(function () { $("hx-s-name").focus(); }, 50);
  }
  function doSave(asNew) {
    var meta = { name: $("hx-s-name").value, catalyst: $("hx-s-cat").value.trim(), electrolyte: $("hx-s-elec").value.trim() };
    var cur = !asNew && currentId && find(currentId), rec;
    if (cur) { rec = cur; rec.name = meta.name.trim() || rec.name; rec.catalyst = meta.catalyst; rec.electrolyte = meta.electrolyte;
      rec.state = GC.getState(); rec.snapshot = GC.snapshot(); rec.updatedAt = new Date().toISOString(); rec.appVersion = root.APP_VERSION || ""; }
    else rec = makeRecord(meta, GC.getState(), GC.snapshot());
    return store.put(rec).then(function () { currentId = rec.id; setDirty(false); closeDlg("hx-save-dlg"); toast("Saved “" + rec.name + "” on this device"); var a = $("hx-save-dlg")._after; if (a) a(); return refresh(); });
  }
  function newExperiment() {
    function go() { suppress = true; GC.reset(); suppress = false; currentId = null; setDirty(false); toast("New experiment — inputs cleared"); }
    if (dirty && confirm("Save the current experiment before clearing?\nOK = save first · Cancel = continue")) { openSave(go); return; }
    if (!dirty || confirm("Clear all inputs and start a new experiment?")) go();
  }
  function act(id, a) {
    var r = find(id); if (!r) return;
    if (a === "open") { if (dirty && !confirm("Unsaved changes in the calculator will be replaced. Continue?")) return;
      suppress = true; GC.load(r.state); suppress = false; currentId = r.id; setDirty(false); closeDlg("hx-list-dlg"); toast("Opened “" + r.name + "”"); render(); }
    else if (a === "dup") { var d = duplicate(r); store.put(d).then(refresh).then(function () { toast("Duplicated as “" + d.name + "”"); }); }
    else if (a === "csv") withState(r.state, GC.csv);
    else if (a === "xlsx") withState(r.state, GC.xlsx);
    else if (a === "rename") { var n = prompt("Rename experiment", r.name); if (n && n.trim()) { r.name = n.trim(); r.updatedAt = new Date().toISOString(); store.put(r).then(refresh); } }
    else if (a === "del") { if (confirm("Delete “" + r.name + "” from this device? This cannot be undone.")) store.del(r.id).then(function () { if (currentId === r.id) currentId = null; return refresh(); }).then(function () { toast("Deleted"); }); }
  }
  function backup() {
    store.all().then(function (all) {
      var name = "fe-calc-backup_" + new Date().toISOString().slice(0, 10) + ".json";
      var blob = new Blob([backupJSON(all)], { type: "application/json" });
      var file; try { file = new File([blob], name, { type: "application/json" }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        navigator.share({ files: [file], title: "FE calculator backup" }).catch(function () {});
      } else {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }
      toast("Backup of " + all.length + " experiment(s) created");
    });
  }
  function restore(file) {
    var rd = new FileReader();
    rd.onload = function () {
      var inc; try { inc = parseBackup(rd.result); } catch (e) { alert("Could not read backup: " + e.message); return; }
      mergeInto(store, inc).then(function (r) { toast("Restored " + r.added + " · skipped " + r.skipped + " duplicate(s)"); return refresh(); });
    };
    rd.readAsText(file);
  }
  function demoRecs() {
    function mk(id, name, days, E, fe, top, cat, el) { var r = makeRecord({ name: name, catalyst: cat, electrolyte: el }, { technique: "CA", Eset: E, notes: "" }, { n: 4, feTotal: fe, top: top }, new Date(Date.now() - days * 864e5).toISOString()); r.id = id; return r; }
    return [mk("demo-a", "Cu GDE −1.0 V run 3", 0, "-1.00", 92.8, [{ name: "Carbon monoxide (CO)", fe: 45.4 }, { name: "Hydrogen (H₂)", fe: 23.5 }, { name: "Ethylene (C₂H₄)", fe: 17.2 }], "Cu nanoparticles", "0.1 M KHCO₃"),
      mk("demo-b", "Ag foil −0.9 V", 2, "-0.90", 97.1, [{ name: "Carbon monoxide (CO)", fe: 88.0 }, { name: "Hydrogen (H₂)", fe: 9.1 }], "Ag foil", "0.5 M KHCO₃"),
      mk("demo-c", "SnO₂ formate screen", 6, "-1.10", 84.3, [{ name: "Formate (HCOO⁻)", fe: 61.2 }, { name: "Hydrogen (H₂)", fe: 18.0 }], "SnO₂/C", "1 M KOH")];
  }
  function init() {
    GC = root.GCFE; if (!GC || !$("hx-open")) return;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(function (ok) { var e = $("hx-persist"); if (e) e.textContent = ok ? "Persistent storage granted." : "Browser may evict data under storage pressure."; }); } catch (e) {}
    GC.onChange = function () { if (!suppress) setDirty(true); };
    (/[#&]hxdemo/.test(location.hash) ? Promise.resolve(memStore()) : openStore()).then(function (s) { store = s; $("hx-backend").textContent = s.kind;
      /* #hxdemo: preview-only sample cards (used for screenshots); never runs otherwise */
      if (/[#&]hxdemo/.test(location.hash)) return Promise.all(demoRecs().map(function (r) { return s.put(r); })).then(refresh);
      return refresh(); });
    $("hx-open").addEventListener("click", function () { refresh(); openDlg("hx-list-dlg"); });
    $("hx-save").addEventListener("click", function () { openSave(); });
    $("hx-new").addEventListener("click", newExperiment);
    $("hx-save-form").addEventListener("submit", function (e) { e.preventDefault(); doSave(false); });
    $("hx-s-update").addEventListener("click", function () { doSave(true); });
    document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { closeDlg(b.getAttribute("data-close")); }); });
    $("hx-q").addEventListener("input", render); $("hx-sort").addEventListener("change", render);
    $("hx-list").addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (!b) return; act(b.closest(".hx-card").getAttribute("data-id"), b.getAttribute("data-act")); });
    $("hx-backup").addEventListener("click", backup);
    $("hx-restore-file").addEventListener("change", function (e) { var f = e.target.files[0]; if (f) restore(f); e.target.value = ""; });
    if (/[#&]hx=list/.test(location.hash)) setTimeout(function () { openDlg("hx-list-dlg"); }, 300);
    if (/[#&]hx=save/.test(location.hash)) setTimeout(function () { openSave(); }, 300);
  }
  root.FEHistoryUI = { _act: act, _refresh: function () { return refresh(); }, _store: function () { return store; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
