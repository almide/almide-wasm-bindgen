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
| `Matrix`          | `[rows:i32][cols:i32][f64 × rows×cols]`  | `{ rows, cols, data: Float64Array }` (zero-copy view) | `Matrix` interface |

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

**v0.1** — production-usable for almost everything in `JS_TS_FRIENDLY_VISION.md`.

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
| Matrix → `{rows, cols, data: Float64Array}` zero-copy view | ✅     |
| TS interfaces / types auto-generated               | ✅     |
| `.d.ts` filtering (no stdlib type leak)            | ✅     |
| npm `package.json` + publish workflow              | ✅     |
| Minimal WASI shim (`fd_write` → console)           | ✅     |
| Browser fetch path                                 | ✅     |
| WIT generation (Component Model on-ramp)           | ✅     |
| `@import_js("fetch")` / arbitrary JS imports       | ❌ (Almide compiler) |
| `--target component` real Component Model output    | ❌ (Almide compiler) |
| Closure (function-typed fields/args)               | ❌     |

## Performance vs. pure JS / Rust+wasm-bindgen

(Measured on M-series Mac, Node 22, see `examples/bench/`.)

- **matmul 256×256**: 4.81× faster than pure-JS, **2.04× faster than naive Rust+wasm-bindgen**
- **elementwise chain (scale+scale+add)**: pure-JS is 7× faster than Almide today (fusion pass未実装が原因 — Almide本体側のタスク)
- **wasm binary size**: Almide modules ~3-4KB vs Rust+wasm-bindgen ~12-13KB (**3.7× smaller**)

## Examples

- `examples/hello/` — minimal greet/add/scale
- `examples/bench/` — matmul / chain / Rust direct comparison
- `examples/browser/` — HTML harness for browser use
- `examples/pack.almd` — full pipeline (compile → wasm → emit) in one CLI

## License

MIT
