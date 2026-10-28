// The fast solver must give the same numbers as the old one (tests/solver-ref.js, frozen copy of
// build 12) on real line-ups from all-computer games, plus notebook-style twists (sure good / sure
// evil marks, "no Outsiders" Librarian, a claimed Drunk, "I might be the Drunk").
// Also: the job runs in small steps (so a page without a worker never freezes), and the worst
// 15-player case is fast. Run: node tests/solver-match.test.js   (CT_FULL=1: many more games)
const NEW = require('../js/solver.js');
const REF = require('./solver-ref.js');
const { corpus } = require('./solver-corpus.js');
const B = require('../js/bots.js');

let fails = 0, passes = 0, worst = 0, compared = 0;
function t(name, fn) { try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } }
const FULL = !!process.env.CT_FULL;
const plan = FULL ? [[5, 40], [6, 20], [7, 20], [8, 20], [9, 12], [10, 12], [11, 8], [12, 8], [13, 4], [14, 3], [15, 4]]
  : [[5, 8], [6, 4], [7, 4], [8, 4], [9, 3], [10, 3], [11, 2], [12, 2], [13, 1], [15, 1]];

function same(a, b, where) {
  if (a.error !== b.error) throw new Error(where + ': error ' + a.error + ' vs ' + b.error);
  if (a.lineups !== b.lineups) throw new Error(where + ': lineups ' + a.lineups + ' vs ' + b.lineups);
  if (a.checked !== b.checked) throw new Error(where + ': checked ' + a.checked + ' vs ' + b.checked);
  let e = 0;
  for (const k of ['pDemon', 'pEvil', 'pDrunk']) for (let i = 0; i < b[k].length; i++) e = Math.max(e, Math.abs(a[k][i] - b[k][i]));
  for (let i = 0; i < b.pMinion.length; i++) for (const m of new Set([...Object.keys(a.pMinion[i]), ...Object.keys(b.pMinion[i])])) e = Math.max(e, Math.abs((a.pMinion[i][m] || 0) - (b.pMinion[i][m] || 0)));
  if (a.topTeams.length !== b.topTeams.length) throw new Error(where + ': top teams ' + a.topTeams.length + ' vs ' + b.topTeams.length);
  a.topTeams.forEach((x, j) => {
    const y = b.topTeams[j];
    e = Math.max(e, Math.abs(x.p - y.p));
    // a different team in a slot is only fine when the two weigh the same (a tie)
    if ((x.demon !== y.demon || x.now !== y.now || x.drunk !== y.drunk || JSON.stringify(x.minions) !== JSON.stringify(y.minions)) && Math.abs(x.p - y.p) > 1e-12) throw new Error(where + ': top team ' + j + ' differs');
  });
  if (e > 1e-9) throw new Error(where + ': odds differ by ' + e);
  worst = Math.max(worst, e); compared++;
}

// notebook-style twists on a real input (seeded, so every run checks the same cases)
function twist(inp, rng) {
  const x = JSON.parse(JSON.stringify(inp));
  const n = x.n, r = () => rng();
  if (r() < 0.5) { x.sure = Array(n).fill(null); const s = Math.floor(r() * n); if (s !== x.me) x.sure[s] = r() < 0.5 ? 'good' : 'evil'; }
  if (r() < 0.3) x.meMayBeDrunk = false;
  if (r() < 0.25) { const g = Math.floor(r() * n); x.infos.push({ giver: g, kind: 'librarian', t: 1, none: true }); x.claims[g] = 'librarian'; }
  if (r() < 0.25) { const s = Math.floor(r() * n); if (s !== x.me) x.claims[s] = 'drunk'; }
  if (r() < 0.25) { const s = Math.floor(r() * n); if (s !== x.me) x.claims[s] = 'recluse'; }
  if (r() < 0.2) { const g = Math.floor(r() * n); x.infos.push({ giver: g, kind: 'chef', t: 1, count: Math.floor(r() * 3) }); }
  return x;
}

t('same odds as the old solver on real games and notebook twists', () => {
  const rng = B.mkRng(424242);
  for (const [n, games] of plan) {
    const inputs = corpus(n, games, 7000 + n * 100, inp => NEW.solve(inp));
    for (let i = 0; i < inputs.length; i++) {
      same(NEW.solve(inputs[i]), REF.solve(inputs[i]), n + ' players, input ' + i);
      if (n <= 12 || i % 4 === 0) { const tw = twist(inputs[i], rng); same(NEW.solve(tw), REF.solve(tw), n + ' players, twisted input ' + i); }
    }
  }
  console.log('  compared ' + compared + ' inputs, largest difference ' + worst.toExponential(1));
});

const worst15 = { n: 15, claims: ['saint', 'monk', 'virgin', null, null, null, 'fortuneteller', 'soldier', 'librarian', 'mayor', 'recluse', 'empath', 'washerwoman', 'undertaker', 'slayer'], me: -1, deaths: [], infos: [
  { kind: 'fortuneteller', a: 0, b: 1, yes: true, t: 1, giver: 6 }, { kind: 'librarian', a: 10, b: 4, shown: 'drunk', t: 1, giver: 8 },
  { kind: 'empath', count: 0, t: 1, giver: 11 }, { kind: 'washerwoman', a: 14, b: 1, shown: 'monk', t: 1, giver: 12 }] };

t('a job runs in small steps (no step over 50 ms on the worst 15-player record)', () => {
  if (typeof NEW.start !== 'function') throw new Error('no stepwise solver (start)');
  const job = NEW.start(worst15);
  let steps = 0, longest = 0, more = true;
  while (more) { const t0 = process.hrtime.bigint(); more = job.step(); longest = Math.max(longest, Number(process.hrtime.bigint() - t0) / 1e6); steps++; }
  const r = job.result();
  same(r, NEW.solve(worst15), 'stepped vs whole');
  console.log('  ' + steps + ' steps, longest ' + longest.toFixed(1) + ' ms');
  const lim = process.env.CT_SLOW ? 200 : 50;
  if (longest > lim) throw new Error('a step took ' + longest.toFixed(0) + ' ms');
});

t('worst 15-player record (680k line-ups) under 1 s (CT_SLOW=1: 3 s)', () => {
  NEW.solve(worst15);   // warm up
  const t0 = Date.now(); const r = NEW.solve(worst15); const ms = Date.now() - t0;
  console.log('  worst 15-player solve: ' + ms + ' ms, ' + r.lineups + ' line-ups');
  if (ms > (process.env.CT_SLOW ? 3000 : 1000)) throw new Error('took ' + ms + ' ms');
});

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
