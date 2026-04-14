import init, { add_int, lighten, area, double_mat, type Color, type Shape, type Matrix } from '../dist/full_demo.js';

await init();
const x: number = add_int(1, 2);
const c: Color = lighten({r: 1, g: 1, b: 1}, 0.5);
const s: Shape = { tag: 'Circle', _0: 3 };
const a: number = area(s);
const m: Matrix = double_mat({rows: 2, cols: 2, data: new Float64Array([1,2,3,4])});
console.log(x, c, a, m.rows);
