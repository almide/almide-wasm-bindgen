# almide-wasm-bindgen benchmarks

## matmul benchmark

Almide WASM matrix multiply vs pure-JS naive matmul, measured on macOS
with Node 22.

## Run

```bash
# 1. Build the WASM + JS bindings
almide run ../../../almide-lander/src/main.almd -- \
  --target wasm --outdir . matmul.almd

# 2. Run the benchmark
node matmul_bench.mjs
```

## Result (M-series Mac, Node 22.16)

| size     | wasm (ms) | pure-JS (ms) | speedup |
|:--------:|----------:|-------------:|:-------:|
| 16×16    |     0.003 |        0.006 |  1.97×  |
| 64×64    |     0.068 |        0.302 |  4.46×  |
| 128×128  |     0.517 |        2.444 |  4.72×  |
| 256×256  |     4.012 |       19.284 |  4.81×  |

Almide's WASM matmul is consistently ~**5× faster** than a naive Float64Array
pure-JS triple loop for 64×64 and larger, with zero-copy Float64Array views
on both input and output so no marshalling overhead enters the hot path.

Smaller matrices (16×16) show a smaller ratio because call overhead becomes
the bottleneck — still ~2×.

## Notes

- JS baseline uses `Float64Array` with straightforward `i, k, j` ordering
  (the cache-friendly access pattern). This is the strongest naive JS can do
  without WASM or SIMD.
- WASM matmul is the `matrix.mul` stdlib which uses tiled block
  multiplication for cache locality (`calls_matrix.rs:260`).
- No SIMD yet on either side. Future: enable WASM SIMD128 for a further 2–4×.

---

## chain fusion benchmark

Tests how Almide handles chained elementwise ops
(`matrix.add(matrix.scale(a, ka), matrix.scale(b, kb))`) vs a pure-JS
implementation that fuses the whole chain into one loop.

```bash
node chain_bench.mjs
```

### Result

| chain                     | 256×256 wasm | 256×256 fused JS | ratio  |
|---------------------------|-------------:|-----------------:|:------:|
| scale + scale + add       |    0.768 ms  |        0.103 ms  | 0.13× (JS wins) |
| (m-shift)*k, then m·mᵀ    |      (128×128) 0.925 ms | 2.834 ms | 3.06×  |

### Takeaway

- **Pure elementwise chains lose to hand-fused JS** — Almide's current
  codegen emits each stdlib call as a separate allocation + loop, so a
  3-op chain does 3 passes and 3 allocations.
- **When the chain contains a compute-heavy op** (matmul), WASM wins
  because the O(n³) inner op dominates allocation overhead.
- **This is the exact case that fusion passes fix**. Implementing linear
  algebra fusion in Almide's codegen would close the gap to pure JS and
  push past it.

---

## Rust vs Almide direct comparison

Same computation done two ways: Almide via stdlib, Rust via hand-written
`wasm-bindgen` functions.

```bash
# Build Rust side
(cd rust_matmul && wasm-pack build --target nodejs --release)

# Run comparison
node rust_compare_bench.mjs
```

### Results

```
matmul 256×256         — Almide 4.24 ms  vs Rust 8.66 ms  (Almide 2.04× faster)
scale_add 256×256      — Almide 0.66 ms  vs Rust 0.10 ms  (Rust  6.8× faster)

wasm size
  Almide bench.wasm       3,412 bytes
  Almide chain.wasm       4,260 bytes
  Rust  rust_matmul_bg    12,608 bytes   (3.7× larger)
```

Almide wins compute-heavy ops (stdlib tiled matmul) and binary size;
Rust wins elementwise chains (fused single-pass loop). Fusion-pass
implementation in Almide would close the elementwise gap.

