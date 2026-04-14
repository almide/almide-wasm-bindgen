# browser demo

Run `hello.almd` in a real browser.

```bash
# 1. Generate the dist package next to index.html
almide run ../../../almide-lander/src/main.almd -- \
  --target wasm --outdir . \
  ../../../almide-js/examples/hello/hello.almd

# 2. Serve the directory over HTTP (wasm MIME type matters)
python3 -m http.server 8000

# 3. Open http://localhost:8000 in a browser and check devtools console
```

Expected output in the page / devtools:

```
✓ init() succeeded
greet("world") = Hello, world!
greet("日本語") = Hello, 日本語!
add(3, 4) = 7
scale(2.5) = 5
is_positive(-5) = false
is_positive(7) = true
```

This exercises the browser branch of `init()` — `fetch()` for the `.wasm`
bytes instead of the Node `fs/promises` path — verifying that the generated
ESM really is browser-portable.
