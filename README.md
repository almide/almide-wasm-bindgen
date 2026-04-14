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

Given an Almide module, `wasm_bindgen.generate_package(iface_json, module_name)` emits everything needed for an npm-publishable directory:

```
dist/
├── <mod>.wasm          ← from `almide build --target wasm`
├── <mod>.js            ← ESM glue (init + exported fns)
├── <mod>.d.ts          ← TypeScript declarations
└── package.json        ← npm metadata
```

## ABI (Almide → WASM → JS)

| Almide type | WASM ABI                              | JS surface               | TS type           |
|-------------|---------------------------------------|--------------------------|-------------------|
| `Int`       | `i64` (BigInt at boundary)            | `Number` via `Number()`  | `number`          |
| `Float`     | `f64`                                 | pass-through             | `number`          |
| `Bool`      | `i32` (0/1)                           | `!== 0`                  | `boolean`         |
| `String`    | `i32` ptr → `[len:i32 LE][utf8]`      | `TextEncoder/Decoder`    | `string`          |
| `Unit`      | (dropped)                             | `undefined`              | `void`            |
| `List[T]`   | planned v0.2                          | `Array<T>`               | `T[]`             |
| `Matrix[T]` | planned v0.3 (zero-copy TypedArray)   | `Float32Array` etc.      | branded `Matrix<T>` |
| `Record`    | planned v0.4                          | plain object             | interface         |
| `Variant`   | planned v0.4                          | discriminated union      | tagged union      |
| `effect fn` | Result at ABI                         | `throw` / `Promise<...>` | returning type    |

Memory growth safety: each marshaller takes `_exports.memory.buffer` fresh at call time, so `__alloc` growth does not invalidate pointers.

## Library API (planned)

```almide
import wasm_bindgen

wasm_bindgen.version()                                -> String
wasm_bindgen.generate_esm(iface_json, module_name)    -> String   // hello.js
wasm_bindgen.generate_dts(iface_json, module_name)    -> String   // hello.d.ts
wasm_bindgen.generate_package_json(module, version)   -> String   // package.json
wasm_bindgen.generate_package(iface_json, module)     -> Record   // { esm, dts, pkg }
```

## Status

**v0.0** — scaffold only. Logic lives in `almide-js/src/generate.mjs` during the port.

Roadmap:
- **v0.1**: Int/Float/Bool/Unit/String (port from `almide-js/src/generate.mjs` — already working there)
- **v0.2**: List[T] pass-through
- **v0.3**: Matrix[T] with zero-copy TypedArray
- **v0.4**: Record / Variant / effect fn (Result → throw / Promise reject)
- **v0.5**: `@import_js("fetch")` and friends — Almide calls Web APIs
- **v0.6**: Component Model output (`--target component`, WIT)

## License

MIT
