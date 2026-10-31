/**
 * Pure statistics helpers. No I/O, so they are easy to unit-test.
 */

const BOOL_WORDS = new Set(["true", "false", "yes", "no"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+Z?)?$/;

export function isMissing(v) {
  return v === null || v === undefined || v === "";
}

export function inferType(values) {
  const present = values.filter((v) => !isMissing(v));
  if (!present.length) return "empty";
  if (present.every((v) => typeof v === "number" && Number.isFinite(v))) return "number";
  if (present.every((v) => typeof v === "boolean" || BOOL_WORDS.has(String(v).toLowerCase()))) return "boolean";
  if (present.every((v) => typeof v === "string" && ISO_DATE.test(v))) return "date";
  return "text";
}

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function histogram(sorted, bins = 10) {
  if (!sorted.length) return [];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ from: min, to: max, count: sorted.length }];
  const width = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of sorted) {
    const i = Math.min(bins - 1, Math.floor((v - min) / width));
    out[i].count++;
  }
  return out;
}

const round = (n, d = 4) => (n === null ? null : Number(n.toFixed(d)));

export function profileNumber(values) {
  const nums = values.filter((v) => !isMissing(v)).map(Number).sort((a, b) => a - b);
  const n = nums.length;
  const mean = nums.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1 ? nums.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const q1 = quantile(nums, 0.25);
  const q3 = quantile(nums, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const outliers = iqr === 0 ? 0 : nums.filter((v) => v < lowFence || v > highFence).length;

  return {
    min: round(nums[0]),
    max: round(nums[n - 1]),
    mean: round(mean),
    median: round(quantile(nums, 0.5)),
    std: round(Math.sqrt(variance)),
    q1: round(q1),
    q3: round(q3),
    outliers,
    histogram: histogram(nums).map((b) => ({ ...b, from: round(b.from), to: round(b.to) })),
  };
}

export function profileCategorical(values, top = 5) {
  const counts = new Map();
  for (const v of values) {
    if (isMissing(v)) continue;
    const key = String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return {
    topValues: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([value, count]) => ({ value, count })),
  };
}

export function profileDate(values) {
  const times = values
    .filter((v) => !isMissing(v))
    .map((v) => new Date(v).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!times.length) return {};
  return {
    earliest: new Date(times[0]).toISOString().slice(0, 10),
    latest: new Date(times[times.length - 1]).toISOString().slice(0, 10),
  };
}

export function profileColumn(name, values) {
  const type = inferType(values);
  const total = values.length;
  const missing = values.filter(isMissing).length;
  const unique = new Set(values.filter((v) => !isMissing(v)).map(String)).size;

  const base = {
    name,
    type,
    missing,
    missingPct: total ? round((missing / total) * 100, 1) : 0,
    unique,
  };

  if (type === "number") return { ...base, ...profileNumber(values) };
  if (type === "date") return { ...base, ...profileDate(values) };
  if (type === "text" || type === "boolean") return { ...base, ...profileCategorical(values) };
  return base;
}

export function pearson(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => !isMissing(x) && !isMissing(y));
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

/** Strongest numeric column pairs, by absolute Pearson r. */
export function topCorrelations(rows, columns, limit = 5, minAbs = 0.5) {
  const numeric = columns.filter((c) => c.type === "number").map((c) => c.name);
  const out = [];
  for (let i = 0; i < numeric.length; i++) {
    for (let j = i + 1; j < numeric.length; j++) {
      const r = pearson(rows.map((r_) => r_[numeric[i]]), rows.map((r_) => r_[numeric[j]]));
      if (r !== null && Math.abs(r) >= minAbs) {
        out.push({ a: numeric[i], b: numeric[j], r: round(r, 3) });
      }
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, limit);
}

export function analyze(headers, rows) {
  const columns = headers.map((h) => profileColumn(h, rows.map((r) => r[h])));
  return { columns, correlations: topCorrelations(rows, columns) };
}
