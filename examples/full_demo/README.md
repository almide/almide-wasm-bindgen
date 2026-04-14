# full_demo

A single Almide module exercising every type the generator currently supports:
primitives, strings, lists, options, results, records (with nested fields),
variants, matrix, and effect functions.

## Run

```bash
# Generate dist/
almide run ../../../almide-lander/src/main.almd -- \
  --target wasm --outdir dist full_demo.almd

# Verify all 16 expectations
node run.mjs
```

## Expected output

```
✓ add_int(40, 2): 42
✓ flip(true): false
✓ upper("hello"): "HELLO"
✓ try_div(10, 3): 3
✓ try_div(10, 0): null
✓ safe_parse("42"): 42
✓ safe_parse("abc") threw: "invalid number"
✓ sum([1..5]): 15
✓ reverse_strs: ["c","b","a"]
✓ drop_nones: [1,3,5]
✓ lighten: {"r":0.5,"g":0.25,"b":0.125}
✓ box_label: "apple (200g)"
✓ area Circle 3: true
✓ area Square 4: 16
✓ area Empty: 0
✓ double_mat data: [2,4,6,8]
✓ double_mat is Float64Array view: true

done.
```

This is the canonical integration test for the generator.
