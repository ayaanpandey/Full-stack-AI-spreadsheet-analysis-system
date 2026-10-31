import test from "node:test";
import assert from "node:assert/strict";
import { inferType, profileColumn, pearson, topCorrelations, quantile, analyze } from "../src/services/stats.js";
import { statisticalInsights, parseJsonLoose } from "../src/services/ai.js";

test("inferType detects numbers, dates, booleans, text and empty", () => {
  assert.equal(inferType([1, 2, null, 3.5]), "number");
  assert.equal(inferType(["2024-01-02", "2024-02-03"]), "date");
  assert.equal(inferType(["yes", "No", "true"]), "boolean");
  assert.equal(inferType(["a", 1]), "text");
  assert.equal(inferType([null, ""]), "empty");
});

test("quantile interpolates", () => {
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
});

test("profileColumn computes numeric stats and flags outliers", () => {
  const p = profileColumn("x", [1, 2, 3, 4, 5, 6, 7, 8, 9, 1000, null]);
  assert.equal(p.type, "number");
  assert.equal(p.missing, 1);
  assert.equal(p.median, 5.5);
  assert.equal(p.outliers, 1);
  assert.equal(p.histogram.reduce((s, b) => s + b.count, 0), 10);
});

test("profileColumn returns top values for text", () => {
  const p = profileColumn("c", ["a", "b", "a", "a", "b", "c"]);
  assert.deepEqual(p.topValues[0], { value: "a", count: 3 });
  assert.equal(p.unique, 3);
});

test("pearson finds perfect correlation and handles constants", () => {
  assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]).toFixed(6), "1.000000");
  assert.equal(pearson([1, 2, 3, 4], [4, 3, 2, 1]).toFixed(6), "-1.000000");
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
});

test("topCorrelations only reports strong numeric pairs", () => {
  const rows = [1, 2, 3, 4, 5].map((n) => ({ a: n, b: n * 2, c: [5, 1, 4, 2, 3][n - 1] }));
  const { columns } = analyze(["a", "b", "c"], rows);
  const corr = topCorrelations(rows, columns, 5, 0.9);
  assert.equal(corr.length, 1);
  assert.deepEqual([corr[0].a, corr[0].b], ["a", "b"]);
});

test("statisticalInsights warns about missing data and outliers", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ price: i === 9 ? 900 : 10 + i, note: i < 5 ? null : "x" }));
  const { columns, correlations } = analyze(["price", "note"], rows);
  const out = statisticalInsights({ name: "t", rowCount: 10, columns, correlations });
  assert.ok(out.items.some((i) => i.severity === "warning" && i.title.includes("note")));
  assert.ok(out.items.some((i) => i.title.includes("outlier")));
  assert.equal(out.source, "statistical");
});

test("parseJsonLoose tolerates markdown fences", () => {
  const obj = parseJsonLoose('```json\n{"summary":"ok","items":[]}\n```');
  assert.equal(obj.summary, "ok");
});
