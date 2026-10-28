#!/usr/bin/env node
/* Save / load / backup round-trip tests for history.js (memory + localStorage backends) */
var H = require("./history.js");
var assert = require("assert");
function fakeLS() { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, _m: m }; }
var state = { schema: 5, technique: "CA", Eset: "-1.00", pH: "6.8", irMode: "manual", Ru: "10", fComp: "0", notes: "mild bubbling",
  sched: { t1: "900", ana: "12", post: "180", count: 2 }, inj: [{ j: "100.4", ppm: { H2: "7200", CO: "16800" } }, { j: "98.7", ppm: { H2: "7900" } }],
  products: [{ id: "H2", name: "Hydrogen", label: "H₂", n: 2 }] };
var snap = { n: 2, feTotal: 92.8, top: [{ name: "Carbon monoxide (CO)", fe: 45.4 }] };
(async function () {
  for (var mk of [function () { return H.memStore(); }, function () { return H.lsStore(fakeLS()); }]) {
    var s = mk();
    var r = H.makeRecord({ name: "Cu −1.0 V", catalyst: "Cu NP", electrolyte: "0.1 M KHCO3" }, state, snap);
    state.Eset = "MUTATED"; /* saved copy must be deep */
    await s.put(r);
    var all = await s.all();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].state.Eset, "-1.00", "deep copy on save");
    assert.deepStrictEqual(all[0].state.inj[0].ppm, { H2: "7200", CO: "16800" }, "load returns full state");
    assert.strictEqual(all[0].state.notes, "mild bubbling");
    state.Eset = "-1.00";
    var d = H.duplicate(all[0]); await s.put(d);
    assert.notStrictEqual(d.id, r.id); assert.ok(/\(copy\)$/.test(d.name));
    /* backup round-trip into an empty store */
    var json = H.backupJSON(await s.all());
    var parsed = H.parseBackup(json); assert.strictEqual(parsed.length, 2);
    var s2 = mk(); var res = await H.mergeInto(s2, parsed);
    assert.deepStrictEqual(res, { added: 2, skipped: 0 });
    var again = await H.mergeInto(s2, parsed);
    assert.deepStrictEqual(again, { added: 0, skipped: 2 }, "skip duplicates by id");
    var back = (await s2.all()).find(function (x) { return x.id === r.id; });
    assert.deepStrictEqual(back.state, all[0].state, "state identical after backup/restore");
    assert.deepStrictEqual(back.snapshot, snap);
    await s2.del(r.id); assert.strictEqual((await s2.all()).length, 1, "delete");
    /* search/sort */
    var a = H.makeRecord({ name: "Ag run" }, state, null, "2026-10-01T00:00:00Z"), b = H.makeRecord({ name: "Cu run" }, state, null, "2026-10-20T00:00:00Z");
    assert.deepStrictEqual(H.filterSort([a, b], "", "new").map(function (x) { return x.name; }), ["Cu run", "Ag run"]);
    assert.deepStrictEqual(H.filterSort([a, b], "ag", "new").map(function (x) { return x.name; }), ["Ag run"]);
  }
  assert.throws(function () { H.parseBackup('{"foo":1}'); });
  console.log("PASS history save/load/duplicate/backup/restore (memory + localStorage)");
})().catch(function (e) { console.error("FAIL", e); process.exit(1); });
/* IndexedDB backend round-trip (fake-indexeddb if available) */
try {
  require.resolve("fake-indexeddb/auto");
} catch (e) { try { module.paths.push("/tmp/idbt/node_modules"); require.resolve("fake-indexeddb/auto"); } catch (e2) { console.log("SKIP IndexedDB test (fake-indexeddb not installed)"); return; } }
require("fake-indexeddb/auto");
(async function () {
  var s = H.idbStore(indexedDB), r = H.makeRecord({ name: "idb" }, { technique: "CA", Eset: "-1" }, null);
  await s.put(r); var a = await s.all(); assert.strictEqual(a.length, 1); assert.deepStrictEqual(a[0].state, r.state);
  var res = await H.mergeInto(s, H.parseBackup(H.backupJSON(a))); assert.deepStrictEqual(res, { added: 0, skipped: 1 });
  await s.del(r.id); assert.strictEqual((await s.all()).length, 0);
  console.log("PASS IndexedDB backend save/load/backup/delete");
})().catch(function (e) { console.error("FAIL idb", e); process.exit(1); });
