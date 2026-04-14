import init, { scale_add, shift_scale_square } from './chain.js';
await init();

function jsScaleAdd(a, b, ka, kb) {
  const n = a.data.length;
  const out = new Float64Array(n);
  const ad = a.data, bd = b.data;
  for (let i = 0; i < n; i++) out[i] = ad[i] * ka + bd[i] * kb;
  return { rows: a.rows, cols: a.cols, data: out };
}

function jsShiftScaleSquare(m, shift, k) {
  const rows = m.rows, cols = m.cols;
  const n = rows * cols;
  const scaled = new Float64Array(n);
  const md = m.data;
  for (let i = 0; i < n; i++) scaled[i] = (md[i] - shift) * k;
  // scaled * scaled^T
  const out = new Float64Array(rows * rows);
  for (let i = 0; i < rows; i++) {
    for (let k2 = 0; k2 < cols; k2++) {
      const v = scaled[i * cols + k2];
      for (let j = 0; j < rows; j++) {
        out[i * rows + j] += v * scaled[j * cols + k2];
      }
    }
  }
  return { rows, cols: rows, data: out };
}

function makeRandom(rows, cols, seed = 1) {
  const data = new Float64Array(rows * cols);
  let s = seed;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return { rows, cols, data };
}

function timeIt(fn, iters) {
  for (let i = 0; i < Math.min(3, iters); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  return (performance.now() - t0) / iters;
}

console.log('--- scale_add (2 scales + 1 add, elementwise) ---');
console.log('size   iters   wasm (ms)   js (ms)    js/wasm');
console.log('-----  ------  ----------  ---------  --------');
for (const n of [64, 128, 256, 512]) {
  const iters = Math.max(20, Math.floor(2000 * (64 / n) ** 2));
  const a = makeRandom(n, n, 1);
  const b = makeRandom(n, n, 2);
  const w = timeIt(() => scale_add(a, b, 1.5, -0.5), iters);
  const j = timeIt(() => jsScaleAdd(a, b, 1.5, -0.5), iters);
  console.log(`${String(n).padStart(5)}  ${String(iters).padStart(6)}  ${w.toFixed(3).padStart(10)}  ${j.toFixed(3).padStart(9)}  ${(j/w).toFixed(2).padStart(6)}x`);
}

console.log('\n--- shift_scale_square ((m-shift)*k) then m * m^T ---');
console.log('size   iters   wasm (ms)   js (ms)    js/wasm');
console.log('-----  ------  ----------  ---------  --------');
for (const n of [32, 64, 128]) {
  const iters = Math.max(5, Math.floor(100 * (32 / n) ** 3));
  const m = makeRandom(n, n, 3);
  const w = timeIt(() => shift_scale_square(m, 0.1, 2.0), iters);
  const j = timeIt(() => jsShiftScaleSquare(m, 0.1, 2.0), iters);
  console.log(`${String(n).padStart(5)}  ${String(iters).padStart(6)}  ${w.toFixed(3).padStart(10)}  ${j.toFixed(3).padStart(9)}  ${(j/w).toFixed(2).padStart(6)}x`);
}
