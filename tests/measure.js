// Measures computer-player strength and solver accuracy by playing all-computer games.
// Run: node tests/measure.js [games=200] [players=8]
// Prints: good win rate per (good level vs evil level), and how often the solver's top
// Demon pick (from public claims + shared info only) is the real Demon at each day's end.
const E = require('../js/engine.js');
const B = require('../js/bots.js');
const { solve } = require('../js/solver.js');

const GAMES = +(process.argv[2] || 200);
const N = +(process.argv[3] || 8);

function play(seed, goodLv, evilLv, stats) {
  let s = E.createGame({ n: N, seed });
  const rng = B.mkRng(seed * 31 + 7);
  const cache = new Map();
  const ctx = {
    humans: new Set(), mem: {}, rng,
    levels: s.evil.map(e => (e ? evilLv : goodLv)),
    oddsFor(st) {
      const k = B.oddsKey(st);
      if (!cache.has(k)) cache.set(k, solve(E.solverInput(E.view(st, -1), -1)));
      return cache.get(k);
    },
  };
  let guard = 0, lastDay = 0;
  while (!s.winner && guard++ < 5000) {
    // solver check once per day, just before the day ends (after all talk)
    const r = B.step(s, ctx);
    if (r.state.stage === 'night' && s.stage === 'day' && stats && s.t !== lastDay) {
      lastDay = s.t;
      const odds = ctx.oddsFor(s);
      const demon = s.roles.findIndex((x, i) => x === 'imp' && s.alive[i]);
      if (odds && !odds.error && demon >= 0) {
        // top pick: ties share the credit (k players tied, Demon among them -> 1/k)
        let bv = -1;
        for (let i = 0; i < N; i++) if (s.alive[i] && odds.pDemon[i] > bv) bv = odds.pDemon[i];
        const tied = [...Array(N).keys()].filter(i => s.alive[i] && Math.abs(odds.pDemon[i] - bv) < 1e-9);
        stats.days++; if (tied.includes(demon)) stats.top += 1 / tied.length;
        stats.pTrue += odds.pDemon[demon];
        stats.base += 1 / s.alive.filter(Boolean).length;
      } else if (odds && odds.error) stats.errors++;
    }
    s = r.state;
  }
  return s.winner || 'none';
}

const t0 = Date.now();
const out = {};
const stats = { days: 0, top: 0, pTrue: 0, base: 0, errors: 0 };
for (const [g, e] of [['hard', 'hard'], ['easy', 'hard'], ['hard', 'easy'], ['easy', 'easy']]) {
  let good = 0, none = 0;
  for (let i = 0; i < GAMES; i++) {
    const w = play(1000 + i, g, e, g === 'hard' && e === 'hard' ? stats : null);
    if (w === 'good') good++; if (w === 'none') none++;
  }
  out[g + ' good vs ' + e + ' evil'] = (100 * good / GAMES).toFixed(1) + '% good wins' + (none ? ' (' + none + ' unfinished)' : '');
}
console.log('players: ' + N + ', games per pairing: ' + GAMES);
for (const k in out) console.log('  ' + k + ': ' + out[k]);
console.log('solver (hard vs hard, ' + stats.days + ' day-ends): top Demon pick right ' + (100 * stats.top / stats.days).toFixed(1) + '%; avg chance on real Demon ' + (100 * stats.pTrue / stats.days).toFixed(1) + '% vs random ' + (100 * stats.base / stats.days).toFixed(1) + '%; no-fit errors ' + stats.errors);
console.log('time ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
