import init, { matmul, scale2 } from './bench.js';
await init();

// Pure-JS matmul baseline (same row-major layout)
function jsMatmul(a, b) {
  const rows = a.rows, inner = a.cols, cols = b.cols;
  const out = new Float64Array(rows * cols);
  const ad = a.data, bd = b.data;
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = ad[i * inner + k];
      for (let j = 0; j < cols; j++) {
        out[i * cols + j] += aik * bd[k * cols + j];
      }
    }
  }
  return { rows, cols, data: out };
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

function timeIt(label, fn, iters) {
  // warmup
  for (let i = 0; i < Math.min(3, iters); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const t1 = performance.now();
  const total = t1 - t0;
  console.log(`${label.padEnd(30)} ${(total / iters).toFixed(3)} ms/iter (${iters} iters, total ${total.toFixed(1)} ms)`);
  return total / iters;
}

const sizes = [16, 64, 128, 256];
console.log('Matrix multiplication: Almide WASM vs pure JS\n');
console.log('size   iters     wasm (ms)   js (ms)      ratio (js/wasm)');
console.log('-----  --------  ----------  -----------  ----------------');
for (const n of sizes) {
  const iters = Math.max(5, Math.floor(200 * (32 / n) ** 3));
  const a = makeRandom(n, n, 1);
  const b = makeRandom(n, n, 2);
  const wasmMs = timeIt(`  wasm matmul ${n}x${n}`, () => matmul(a, b), iters);
  const jsMs = timeIt(`  js   matmul ${n}x${n}`, () => jsMatmul(a, b), iters);
  console.log(`${String(n).padStart(5)}  ${String(iters).padStart(8)}  ${wasmMs.toFixed(3).padStart(10)}  ${jsMs.toFixed(3).padStart(11)}  ${(jsMs / wasmMs).toFixed(2).padStart(6)}x\n`);
}
