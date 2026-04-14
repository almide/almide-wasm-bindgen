# almide-wasm-bindgen

WebAssembly + JS/TS binding generator for [Almide](https://github.com/almide/almide). Written entirely in Almide.

This is a **library** — import it with `import wasm_bindgen`. The CLI is [almide-lander](https://github.com/almide/almide-lander) via `--target wasm`.

## Relationship to other repos

```
almide-bindgen          Native FFI (cdylib + byte-buffer, 21 languages)
almide-wasm-bindgen     WASM target (linear memory + __alloc, JS/TS surface)  ← this repo
almide-lander           CLI that orchestrates both
```

The split mirrors the Rust ecosystem: `wasm-bindgen` is a separate crate from any generic FFI tool because the **target model** is fundamentally different (linear memory, no C ABI, npm packaging).

## What it produces

```bash
almide run almide-lander/src/main.almd -- --target wasm --outdir dist mylib.almd
```

Generates a npm-publishable directory:

```
dist/
├── <mod>.wasm          ← from `almide build --target wasm`
├── <mod>.js            ← ESM glue (init + exported fns + helpers)
├── <mod>.d.ts          ← TypeScript declarations (interfaces + fn sigs)
├── <mod>.wit           ← WebAssembly Interface Types (Component Model)
└── package.json        ← npm metadata
```

Then `cd dist && npm publish` works.

## ABI / type mapping

| Almide type       | WASM ABI                                 | JS surface                       | TS type                  |
|-------------------|------------------------------------------|----------------------------------|--------------------------|
| `Int`             | `i64` (BigInt at boundary)               | `Number(...)` / `BigInt(...)`    | `number`                 |
| `Float`           | `f64`                                    | pass-through                     | `number`                 |
| `Bool`            | `i32` (0/1)                              | `!== 0`                          | `boolean`                |
| `String`          | `i32` ptr → `[len:i32 LE][utf8]`         | `TextEncoder/Decoder`, UTF-8 OK  | `string`                 |
| `Unit`            | dropped                                  | `undefined`                      | `void`                   |
| `List[Int]`       | `[len:i32][i64 LE × len]`                | `number[]` (BigInt round-trip)   | `number[]`               |
| `List[Float]`     | `[len:i32][f64 LE × len]`                | `number[]`                       | `number[]`               |
| `List[Bool]`      | `[len:i32][i32 LE × len]`                | `boolean[]`                      | `boolean[]`              |
| `List[String]`    | `[len:i32][i32 ptr × len]` per-elem      | `string[]`                       | `string[]`               |
| `List[<heap T>]`  | generic `_writeListPtr`/_readListPtr     | `T[]`                            | `T[]` (parens if union)  |
| `Option[T]`       | i32 ptr (0 = None, else inline value)    | `null` or value                  | `T \| null`              |
| `Result[T, String]` | `[tag:i32][value]`                     | Ok→return, Err→`throw new Error` | `T` (Err is thrown)      |
| `effect fn`       | implicit `Result[T, error]` at ABI       | auto-unwrapped (throw on Err)    | `T`                      |
| `Record`          | inline fields, sequential WASM offsets    | plain `{ field: value }` object  | `interface`              |
| `Variant`         | `[tag:i32][payload...]`, max-case alloc  | `{ tag: 'Case', _0, _1, ... }`   | discriminated union      |
| `Tuple[T1, T2, ...]` | packed sequential elements             | `[v1, v2, ...]`                  | `[T1, T2, ...]`          |
| `Matrix`          | `[rows:i32][cols:i32][f64 × rows×cols]`  | `Matrix` class (handle, zero-copy `.data` getter, chain-friendly) | `class Matrix` |
| `Bytes`           | `[len:i32][u8 × len]`                    | `Uint8Array` (detached copy on read) | `Uint8Array`         |
| `Map[K, V]`       | `[len:i32][k][v][k][v]...` packed pairs  | `Map<K, V>` (in either direction) | `Map<K, V>`             |
| `Set[T]`          | `[len:i32][e][e]...` like List           | `Set<T>` (in either direction)   | `Set<T>`                 |

Memory-grow safety: each marshaller fetches `_exports.memory.buffer` fresh at call time, so `__alloc`-induced growth doesn't invalidate pointers. Pointer-typed fields are pre-written before the outer `__alloc`.

## Library API

```almide
import wasm_bindgen

wasm_bindgen.version()                                  -> String
wasm_bindgen.generate_esm(iface_json, module_name)      -> String   // <mod>.js
wasm_bindgen.generate_dts(iface_json, module_name)      -> String   // <mod>.d.ts
wasm_bindgen.generate_wit(iface_json, module_name)      -> String   // <mod>.wit
wasm_bindgen.generate_package_json(module, version)     -> String   // package.json
```

Plus helper predicates / mappers used internally: `ts_type`, `to_wasm`, `from_wasm`, `is_supported_fn`, `effective_return`, `record_supported`, `variant_supported`, etc.

## npm publish workflow

The lander produces a npm-ready `dist/`:

```bash
# Generate, then publish
almide run almide-lander/src/main.almd -- \
  --target wasm --outdir dist --pkg-version 0.1.0 mylib.almd
cd dist && npm publish

# Or one shot
almide run almide-lander/src/main.almd -- \
  --target wasm --outdir dist --pkg-version 0.1.0 --publish mylib.almd

# Smoke test before real publish
almide run almide-lander/src/main.almd -- \
  --target wasm --outdir dist --publish-dry-run mylib.almd
```

## Status

**v0.2** — production-usable, full P1 + most P2 of `JS_TS_FRIENDLY_VISION.md` cleared.

| Capability                                         | Status |
|----------------------------------------------------|--------|
| Primitives (Int / Float / Bool / Unit)             | ✅     |
| String (UTF-8)                                     | ✅     |
| List[T] for primitives + String                    | ✅     |
| List of Record / Option / nested List              | ✅     |
| Option[T]                                          | ✅     |
| Result[T, String] (throw-on-Err)                   | ✅     |
| `effect fn` (auto-wrap as Result at ABI)           | ✅     |
| Record (with primitive / String / nested fields)   | ✅     |
| Variant → TS discriminated union                   | ✅     |
| **Tuple → TS positional `[T1, T2, ...]`**          | ✅ iter 51 |
| **Map[K, V] → `Map<K, V>` (incl. nested values)**   | ✅ iter 52 + 56 + 57 |
| **Set[T] → `Set<T>` (incl. Named / Bytes element)** | ✅ iter 52 + 56 + 57 |
| **Bytes → `Uint8Array`**                            | ✅ iter 53 |
| Matrix → persistent handle class, chain-friendly    | ✅ iter 48 |
| **JS imports via `@extern(wasm, "js", ...)` + auto shim** | ✅ iter 47 |
| TS interfaces / types auto-generated               | ✅     |
| `.d.ts` filtering (no stdlib type leak)            | ✅     |
| JSDoc with Almide signature + `@throws` hint       | ✅     |
| npm `package.json` + publish workflow              | ✅     |
| `wasm-opt -O3` post-process (lander default-on)    | ✅ iter 45 + 46 |
| Minimal WASI shim (`fd_write` → console)           | ✅     |
| Browser fetch path                                 | ✅     |
| WIT generation (Component Model on-ramp)           | ✅     |
| Multi-host (Node / Bun / Deno / wasmtime / Python) | ✅ iter 50 (6 / 7 runtimes verified) |
| `--target component` real Component Model output    | ❌ (Almide compiler — 3 ABI gaps) |
| Closure (function-typed fields/args)               | ❌     |

## Performance vs. Rust+wasm-bindgen

Fresh comparison (Node 22 on M-series Mac, both sides built with `wasm-opt -O3`,
Almide 0.14.2 / wasm-bindgen 0.2):

| Workload                  | Almide | Rust+wasm-bindgen | Result                  |
|---------------------------|-------:|------------------:|-------------------------|
| matmul 256×256            | 4.62 ms | 8.48 ms          | **Almide 1.84× faster** |
| matmul 128×128            | 0.72 ms | 1.04 ms          | **Almide 1.45× faster** |
| axpy (a*ka + b*kb), N=512 | 0.38 ms | 0.36 ms          | Rust 1.05× narrow       |
| compose (3-term), N=512   | 0.58 ms | 0.44 ms          | Rust 1.31×              |
| **wasm binary size**      | **1490 B** | 11225 B       | **Almide 7.53× smaller** |

Notes:

- **Matrix as persistent handle** (iter 48): chained ops (`scale → add → sub …`)
  pass pointers, not data — boundary cost dropped 13×, putting elementwise chains
  in the same league as Rust (was 7× loss in iter 27).
- **Tree-fuse `fma3`** (iter 55): Almide collapses nested `add(scale, sub(neg, scale))`
  into a single 3-term SIMD pass — same memory traffic as Rust's hand-written
  `compose` loop.
- **Size**: Almide's pure-Rust compiler emits much tighter WASM than `rustc → wasm-bindgen`
  even with `wasm-opt -O3 lto=true` on both sides.

See [`_progress/0058-rust-comparison-rerun.md`](https://github.com/almide/almide-js/blob/main/_progress/0058-rust-comparison-rerun.md) for the full benchmark + setup.

## Examples

- `examples/hello/` — minimal greet/add/scale
- `examples/bench/` — matmul / chain / Rust direct comparison
- `examples/browser/` — HTML harness for browser use
- `examples/pack.almd` — full pipeline (compile → wasm → emit) in one CLI

## License

MIT
