// Online adapter tests: computer-only games run to the end through the same checks
// online.js makes, state survives JSON, nobody's secrets leak, and a real local room finishes.
// Run: node tests/online.test.mjs
import { createRequire } from 'module';
import { createLocal } from '../js/online.js';
const require = createRequire(import.meta.url);
const { game } = require('../js/ctonline.js');
const B = require('../js/bots.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };

function play(n, seed, level, humanSeat) {
  const rng = B.mkRng(seed);
  const seats = Array.from({ length: n }, (_, i) => ({ kind: i === humanSeat ? 'human' : 'computer', name: 'P' + i }));
  let s = game.setup(n, { level }, rng, seats);
  let moves = 0, leak = false, emptyToAct = false, json = true;
  while (!game.isOver(s) && moves < 3000) {
    const to = game.toAct(s);
    if (!to.length) { emptyToAct = true; break; }
    for (const seat of to) {
      if (game.isOver(s) || !game.toAct(s).includes(seat)) continue;
      const a = seat === humanSeat ? humanMove(s, seat, rng) : game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat), state: s }, seat, rng);
      s = game.apply(JSON.parse(JSON.stringify(s)), seat, a, rng); // throws on an illegal move
      moves++;
    }
    const round = JSON.parse(JSON.stringify(s));
    if (JSON.stringify(round) !== JSON.stringify(s)) json = false;
    // secrecy: the public view never names a living player's real role before the end
    if (!s.winner) {
      const pub = game.publicView(s);
      if (pub.roles || pub.evil || pub.thinks || pub.redHerring || pub.priv) leak = true;
      for (let i = 0; i < n; i++) {
        const mine = JSON.stringify(game.privateView(s, i));
        for (let j = 0; j < n; j++) if (j !== i && JSON.stringify(s.priv[j]).length > 2 && s.priv[j].length && mine.includes(JSON.stringify(s.priv[j][0]))) leak = true;
      }
    }
  }
  return { s, moves, leak, emptyToAct, json };
}
// a "human" who answers prompts and votes, and says done
function humanMove(s, seat, rng) {
  if (s.stage === 'night') { const p = s.pending; const others = [...Array(s.n).keys()].filter(i => i !== seat); const picks = []; while (picks.length < p.picks) { const x = others[Math.floor(rng() * others.length)]; if (!picks.includes(x)) picks.push(x); } return { type: 'choose', picks }; }
  if (s.day.vote) return { type: 'vote', yes: rng() < 0.5 };
  return { type: 'endDay' };
}

let finished = 0, good = 0, games = 0;
for (let n = 5; n <= 12; n++) {
  for (let k = 0; k < 6; k++) {
    const r = play(n, 500 + n * 100 + k, k % 2 ? 'easy' : 'hard', k % 3 === 0 ? (k % n) : -1);
    games++;
    if (r.s.winner) finished++;
    if (r.s.winner === 'good') good++;
    ok(!r.emptyToAct, n + 'p seed ' + k + ': toAct empty before the end');
    ok(!r.leak, n + 'p seed ' + k + ': secret leaked');
    ok(r.json, n + 'p seed ' + k + ': state did not survive JSON');
  }
}
ok(finished === games, 'all ' + games + ' adapter games finish (got ' + finished + ')');

// illegal moves throw
{
  const rng = B.mkRng(9);
  const s = game.setup(7, {}, rng, Array.from({ length: 7 }, () => ({ kind: 'computer' })));
  let threw = false;
  try { game.apply(s, (s.pending.seat + 1) % 7, { type: 'choose', picks: [0] }, rng); } catch (e) { threw = true; }
  ok(threw, 'acting out of turn at night throws');
  let threw2 = false;
  try { game.apply(s, s.pending.seat, { type: 'endDay' }, rng); } catch (e) { threw2 = true; }
  ok(threw2, 'ending the day at night throws');
}

// a real local room (online.js) with all computers plays to "finished"
await new Promise((resolve) => {
  const room = createLocal({ game, seats: Array(6).fill('computer'), options: { level: 'easy' }, botDelayMs: 0, rng: B.mkRng(77) });
  let done = false;
  const to = setTimeout(() => { if (!done) { ok(false, 'local room did not finish in 60 s'); resolve(); } }, 60000);
  room.on('error', (e) => { ok(false, 'local room error: ' + (e && e.message)); done = true; clearTimeout(to); resolve(); });
  room.on('change', (snap) => { if (!done && snap.status === 'finished') { done = true; clearTimeout(to); ok(!!snap.pub.winner, 'local room has a winner'); room.close(); resolve(); } });
  room.start();
});

console.log(games + ' adapter games, good won ' + good + '; ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
