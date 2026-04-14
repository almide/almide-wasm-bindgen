# ts_check

Verifies the generated `.d.ts` is valid under `tsc --strict`, including
discriminated-union narrowing and structural typing.

## Run

```bash
# Build dist/ first (see ../README.md)
cd ../ && almide run ../../../almide-lander/src/main.almd -- \
  --target wasm --outdir dist full_demo.almd
cd ts_check

# Install TS, run strict typecheck
npm install --no-save typescript
./node_modules/.bin/tsc --project tsconfig.json
echo "exit $?"   # 0 means all good
```

## What it asserts

- `use.ts` — basic happy-path imports + return-type inference
- `narrow.ts` — switch-on-`tag` discriminated union narrowing, plus
  `@ts-expect-error` markers verifying that:
  - constructing `{ tag: 'Empty' }._0` is rejected
  - constructing `Shape` value `{ tag: 'Circle' }` (missing `_0`) is rejected

If any of those fail, `tsc` exits non-zero and the test fails.
