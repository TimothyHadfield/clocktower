// Real solver inputs from all-computer games (fixed seeds), for the speed + accuracy tests.
// corpus(n, games, seed0) -> list of distinct inputs: the public record at every step, plus one
// seat's own view (good player with their private info) at every day's end.
const E = require('../js/engine.js');
const B = require('../js/bots.js');

function corpus(N, GAMES, seed0, solveFn) {
  const out = [], seen = new Set();
  const add = inp => { const k = JSON.stringify(inp); if (!seen.has(k)) { seen.add(k); out.push(inp); } };
  for (let gi = 0; gi < GAMES; gi++) {
    const seed = seed0 + gi;
    let s = E.createGame({ n: N, seed });
    const rng = B.mkRng(seed * 31 + 7);
    const cache = new Map();
    const ctx = {
      humans: new Set(), mem: {}, rng,
      levels: s.evil.map(() => 'hard'),
      oddsFor(st) {
        const k = B.oddsKey(st);
        if (!cache.has(k)) { const inp = E.solverInput(E.view(st, -1), -1); add(inp); cache.set(k, solveFn(inp)); }
        return cache.get(k);
      },
    };
    let guard = 0;
    while (!s.winner && guard++ < 5000) {
      const r = B.step(s, ctx);
      if (r.state.stage === 'night' && s.stage === 'day') {
        // a good seat's own odds (what the "mine" badges compute)
        const good = [...Array(N).keys()].filter(i => !s.evil[i]);
        const me = good[(s.t + gi) % good.length];
        const v = E.view(s, me);
        add(E.solverInput(v, v.me.evil ? -1 : me));
      }
      s = r.state;
    }
  }
  return out;
}
module.exports = { corpus };
