// Play options (Settings): Computer speed and Day timer.
// The timer ends a day early with endDay at a random moment; the engine, the computers and the computer
// Storyteller must cope with that at every table size (node self-play, no browser).
const E = require('../js/engine.js');
const B = require('../js/bots.js');

let passes = 0, fails = 0;
function t(name, fn) { try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } }
function ok(c, msg) { if (!c) throw new Error(msg || 'not ok'); }

t('computer speed: slow > normal > fast, normal unchanged (260 night / 520 day)', () => {
  ok(B.pause('night', 'normal') === 260 && B.pause('day', 'normal') === 520, 'normal');
  ok(B.pause('day', undefined) === 520, 'missing setting = normal');
  ok(B.pause('day', 'slow') > 520 && B.pause('day', 'fast') < 520 && B.pause('day', 'fast') > 0, 'order');
  ok(B.pause('night', 'fast') < B.pause('night', 'slow'), 'night order');
});

t('day timer: ends only by day, with no vote open, when time is up', () => {
  const g = E.createGame({ n: 7, names: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], kinds: Array(7).fill('bot'), seed: 7 });
  let s = g, k = 0;
  const ctx = { humans: new Set(), mem: {}, rng: B.mkRng(3), level: 'easy', oddsFor: () => null };
  ok(s.stage === 'night' || s.stage === 'day');
  while (s.stage !== 'day' && k++ < 500) s = B.step(s, ctx).state;
  ok(s.stage === 'day', 'reached day');
  ok(B.timerDue(s, 0) === 'end' && B.timerDue(s, 1000) === 'wait', 'day, no vote');
  // open a vote: the timer waits for it
  const by = s.alive.indexOf(true), on = s.alive.indexOf(true, by + 1);
  const sv = E.apply(s, { type: 'nominate', seat: by, target: on });
  ok(!sv.error, sv.error);
  ok(sv.day.vote && B.timerDue(sv, -5000) === 'wait', 'vote open waits');
  ok(B.TIMERS[0] === 0 && B.TIMERS.length >= 3, 'off first');
});

t('self-play: days cut short at random still finish every game, 5-15 players, Easy and Hard', () => {
  let games = 0, cut = 0;
  for (let n = 5; n <= 15; n++) {
    for (let r = 0; r < 14; r++) {
      const seed = n * 1000 + r;
      const rng = B.mkRng(seed);
      const names = Array.from({ length: n }, (_, i) => 'P' + i);
      let s = E.createGame({ n, names, kinds: Array(n).fill('bot'), seed });
      const ctx = { humans: new Set(), mem: {}, rng, level: r % 2 ? 'hard' : 'easy', oddsFor: () => null };
      let k = 0;
      while (!s.winner && k++ < 6000) {
        if (B.timerDue(s, rng() < 0.08 ? 0 : 1) === 'end') { const ns = E.apply(s, { type: 'endDay', seat: 0 }); ok(!ns.error, ns.error); s = ns; cut++; continue; }
        const st = B.step(s, ctx);
        ok(!st.state.error, st.state.error);
        ok(st.acted, 'stuck at ' + s.stage + ' t' + s.t);
        s = st.state;
      }
      ok(s.winner === 'good' || s.winner === 'evil', 'n=' + n + ' seed ' + seed + ' never ended');
      ok(JSON.parse(JSON.stringify(s)).winner === s.winner, 'state survives JSON');
      games++;
    }
  }
  ok(cut > 100, 'only ' + cut + ' days cut short');
  console.log('  ' + games + ' games, ' + cut + ' days cut short by the timer');
});

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
