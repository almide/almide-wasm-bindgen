import init, {
  add_int, flip, upper,
  try_div, safe_parse,
  sum, reverse_strs, drop_nones,
  lighten, box_label,
  area,
  double_mat,
} from './dist/full_demo.js';
await init();

const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? '✓' : '✗'} ${label}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
  if (!ok) process.exitCode = 1;
};

// primitives
expect('add_int(40, 2)', add_int(40, 2), 42);
expect('flip(true)', flip(true), false);
expect('upper("hello")', upper('hello'), 'HELLO');

// optional
expect('try_div(10, 3)', try_div(10, 3), 3);
expect('try_div(10, 0)', try_div(10, 0), null);

// effect fn
expect('safe_parse("42")', safe_parse('42'), 42);
let threw = '';
try { safe_parse('abc'); } catch (e) { threw = e.message; }
expect('safe_parse("abc") threw', threw, 'invalid number');

// lists
expect('sum([1..5])', sum([1, 2, 3, 4, 5]), 15);
expect('reverse_strs', reverse_strs(['a', 'b', 'c']), ['c', 'b', 'a']);
expect('drop_nones', drop_nones([1, null, 3, null, 5]), [1, 3, 5]);

// records (nested)
expect('lighten', lighten({r: 1, g: 0.5, b: 0.25}, 0.5), {r: 0.5, g: 0.25, b: 0.125});
expect('box_label', box_label({topleft: {r:0, g:0, b:0}, label: 'apple', weight: 200}), 'apple (200g)');

// variants
expect('area Circle 3', Math.abs(area({tag: 'Circle', _0: 3}) - 28.27431) < 0.001, true);
expect('area Square 4', area({tag: 'Square', _0: 4}), 16);
expect('area Empty', area({tag: 'Empty'}), 0);

// matrix
const dm = double_mat({rows: 2, cols: 2, data: new Float64Array([1, 2, 3, 4])});
expect('double_mat data', Array.from(dm.data), [2, 4, 6, 8]);
expect('double_mat is Float64Array view', dm.data instanceof Float64Array, true);

console.log('\ndone.');
