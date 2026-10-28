#!/usr/bin/env node
/* Regression for 1.4.0 bug: every save overwrote the previous record. */
var H = require("./history.js"), assert = require("assert");
(async function () {
  var s = H.memStore(), openId = null, st = function (E) { return { technique: "CA", Eset: E, inj: [] }; };
  // 1) first save (nothing open)
  var a = await H.saveRun(s, { mode: "new", openId: openId, meta: { name: "Run A" }, state: st("-0.9") }); openId = a.id;
  // 2) second save while A is "current" (the old bug overwrote A here)
  var b = await H.saveRun(s, { mode: "new", openId: openId, meta: { name: "Run B" }, state: st("-1.0") }); openId = b.id;
  // 3) Open A, then save as new
  openId = a.id;
  var c = await H.saveRun(s, { mode: "new", openId: openId, meta: { name: "Run C (from A)" }, state: st("-1.1") }); openId = c.id;
  // 4) "+ New" clears open id, then save
  openId = null;
  var d = await H.saveRun(s, { mode: "new", openId: openId, meta: { name: "Run D" }, state: st("-1.2") });
  var all = await s.all();
  assert.strictEqual(all.length, 4, "4 distinct records");
  assert.strictEqual(new Set(all.map(function (r) { return r.id; })).size, 4, "unique ids");
  assert.deepStrictEqual(all.map(function (r) { return r.name; }).sort(), ["Run A", "Run B", "Run C (from A)", "Run D"]);
  assert.strictEqual(all.find(function (r) { return r.name === "Run A"; }).state.Eset, "-0.9", "A untouched");
  // 5) explicit update only touches the opened record
  var u = await H.saveRun(s, { mode: "update", openId: b.id, meta: { name: "Run B v2" }, state: st("-1.05") });
  all = await s.all();
  assert.strictEqual(all.length, 4); assert.strictEqual(u.id, b.id);
  assert.strictEqual(all.find(function (r) { return r.id === b.id; }).state.Eset, "-1.05");
  // 6) update with no open run falls back to new
  await H.saveRun(s, { mode: "update", openId: null, meta: { name: "Run E" }, state: st("-1.3") });
  assert.strictEqual((await s.all()).length, 5);
  // 7) uid uniqueness
  var ids = new Set(); for (var i = 0; i < 5000; i++) ids.add(H.uid()); assert.strictEqual(ids.size, 5000);
  console.log("PASS regression: distinct saves (incl. after Open and after New), explicit-only update, 5000 unique ids");
})().catch(function (e) { console.error("FAIL", e); process.exit(1); });
