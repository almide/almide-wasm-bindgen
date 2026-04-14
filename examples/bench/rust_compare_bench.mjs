import { matmul as rustMatmul, scale_add as rustScaleAdd } from './rust_matmul.js';
import initMatmul, { matmul as almideMatmul } from '/tmp/bench_pkg/bench.js';
import initChain, { scale_add as almideScaleAdd } from '/tmp/chain_pkg/chain.js';
await initMatmul();
await initChain();

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

console.log('--- matmul: Almide vs Rust+wasm-bindgen ---');
console.log('size   iters    almide (ms)  rust (ms)   rust/almide');
console.log('-----  -------  -----------  ----------  -----------');
for (const n of [16, 64, 128, 256]) {
  const iters = Math.max(5, Math.floor(200 * (32 / n) ** 3));
  const a = makeRandom(n, n, 1);
  const b = makeRandom(n, n, 2);
  const alm = timeIt(() => almideMatmul(a, b), iters);
  const rust = timeIt(() => rustMatmul(a.data, b.data, n, n, n), iters);
  console.log(`${String(n).padStart(5)}  ${String(iters).padStart(7)}  ${alm.toFixed(3).padStart(11)}  ${rust.toFixed(3).padStart(10)}  ${(rust/alm).toFixed(2).padStart(6)}x`);
}

console.log('\n--- scale_add (elementwise chain) ---');
console.log('size   iters    almide (ms)  rust (ms)   rust/almide');
console.log('-----  -------  -----------  ----------  -----------');
for (const n of [64, 128, 256, 512]) {
  const iters = Math.max(20, Math.floor(2000 * (64 / n) ** 2));
  const a = makeRandom(n, n, 1);
  const b = makeRandom(n, n, 2);
  const alm = timeIt(() => almideScaleAdd(a, b, 1.5, -0.5), iters);
  const rust = timeIt(() => rustScaleAdd(a.data, b.data, 1.5, -0.5), iters);
  console.log(`${String(n).padStart(5)}  ${String(iters).padStart(7)}  ${alm.toFixed(3).padStart(11)}  ${rust.toFixed(3).padStart(10)}  ${(rust/alm).toFixed(2).padStart(6)}x`);
}

console.log('\n--- wasm binary size ---');
import { statSync } from 'node:fs';
console.log(`Almide  (matmul+scale2):  ${statSync('/tmp/bench_pkg/bench.wasm').size} bytes`);
console.log(`Almide  (chain):           ${statSync('/tmp/chain_pkg/chain.wasm').size} bytes`);
console.log(`Rust+wasm-bindgen:        ${statSync('/tmp/rust_bench/pkg/rust_matmul_bg.wasm').size} bytes`);
