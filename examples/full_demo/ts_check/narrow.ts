import { area, type Shape } from '../dist/full_demo.js';

function describe(s: Shape): string {
  switch (s.tag) {
    case 'Circle':
      // s is narrowed to { tag: 'Circle'; _0: number }
      return `circle r=${s._0}`;
    case 'Square':
      return `square ${s._0}x${s._0}`;
    case 'Empty':
      // s is narrowed to { tag: 'Empty' } — accessing _0 should fail
      // @ts-expect-error — Empty has no _0 field
      return `empty ${s._0}`;
  }
}

const a = area({ tag: 'Circle', _0: 5 });
console.log(describe({ tag: 'Square', _0: 3 }), a);

// Bad: missing _0 on Circle should fail
// @ts-expect-error — Circle requires _0
const bad: Shape = { tag: 'Circle' };
console.log(bad);
