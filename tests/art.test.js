// Every role in every script has its own original icon, and every icon is clean SVG.
// Run: node tests/art.test.js
const { ROLES, LIST } = require('../js/roles.js');
const art = require('../js/art.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };

const seen = new Map();
for (const r of LIST) {
  const svg = art.roleIcon(r.id, r.type);
  ok(typeof svg === 'string' && svg.startsWith('<svg') && svg.endsWith('</svg>'), r.id + ': icon is an svg');
  ok(!/<script|on\w+=|href=|<image|<foreignObject/i.test(svg), r.id + ': icon has no script, links or images');
  ok(art.PATHS[r.id], r.id + ': has its own drawing (not the type fallback)');
  const body = art.PATHS[r.id];
  if (body) { ok(!seen.has(body), r.id + ': drawing differs from ' + seen.get(body)); seen.set(body, r.id); }
  // balanced tags
  const open = (svg.match(/<(path|circle|rect|ellipse|line|polyline|polygon|g)\b[^>]*[^/]>/g) || []).length;
  const close = (svg.match(/<\/(path|circle|rect|ellipse|line|polyline|polygon|g)>/g) || []).length;
  ok(open === close, r.id + ': tags balanced');
}
// each base script has 13 Townsfolk, 4 Outsiders, 4 Minions and 4 Demons (TB: 13/4/4/1)
const want = { tb: [13, 4, 4, 1], bmr: [13, 4, 4, 4], snv: [13, 4, 4, 4] };
for (const s in want) {
  const got = ['T', 'O', 'M', 'D'].map(t => LIST.filter(r => r.script === s && r.type === t).length);
  ok(JSON.stringify(got) === JSON.stringify(want[s]), s + ' role counts ' + got + ' should be ' + want[s]);
}
for (const m of ['dead', 'vote']) ok(art.roleIcon(m).startsWith('<svg'), 'marker ' + m);
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
