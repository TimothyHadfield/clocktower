// The improvement-pass pieces that live outside the shared kits: the Storyteller's record (end-of-game story),
// turning a game into a My stats result, the guided game's deal, the rules sheet's table, and Undo-safe
// determinism (the engine's next state depends only on the state, so a restored snapshot replays the same).
// Run: node tests/kits.test.js
const E = require('../js/engine.js');
const B = require('../js/bots.js');
const { baseCounts, ROLES } = require('../js/roles.js');
let P = null, C = null;
try { P = require('../js/ctprofile.js'); } catch (e) { /* missing on old code */ }
try { C = require('../js/ctcoach.js'); } catch (e) { /* missing on old code */ }
let fails = 0, passes = 0;
function t(name, fn) { try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } }
function ok(c, msg) { if (!c) throw new Error(msg || 'not ok'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || '') + ' got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }

// a whole all-computer game (no odds, Easy), like measure.js but quick
function playOut(n, seed) {
  let s = E.createGame({ n, seed });
  const ctx = { humans: new Set(), mem: {}, rng: B.mkRng ? B.mkRng(seed) : Math.random, level: 'easy', oddsFor: () => null };
  let guard = 0;
  while (!s.winner && guard++ < 6000) s = B.step(s, ctx).state;
  return s;
}
const games = [];
for (let seed = 1; seed <= 60; seed++) games.push(playOut(8 + (seed % 5), seed * 131));

t('every game finishes', () => { for (const g of games) ok(g.winner, 'no winner'); });

t('the Storyteller record logs every Imp attack after night 1', () => {
  let attacks = 0;
  for (const g of games) {
    ok(Array.isArray(g.grim), 'state.grim missing');
    const nights = new Set(g.grim.filter(x => x.kind === 'attack').map(x => x.t));
    for (let t = 3; t < g.t; t += 2) if (g.alive.some(Boolean)) ok(nights.has(t) || g.grim.some(x => x.kind === 'star' && x.t === t), 'night ' + t + ' has no attack');
    attacks += nights.size;
    for (const x of g.grim.filter(y => y.kind === 'attack')) ok(['killed', 'monk', 'soldier', 'poisoned', 'dead', 'self'].includes(x.res), 'bad res ' + x.res);
  }
  ok(attacks > 60, 'only ' + attacks + ' attacks over 60 games');
});

t('false info is marked: a Drunk\'s or poisoned player\'s info is never ok:true', () => {
  let falses = 0, infos = 0;
  for (const g of games) for (const x of g.grim.filter(y => y.kind === 'info')) {
    infos++;
    if (x.drunk) ok(!x.ok, 'drunk info marked ok');
    if (g.roles[x.seat] === 'drunk') ok(x.drunk, 'drunk flag missing');
    if (!x.ok) falses++;
    ok(typeof x.text === 'string' && x.text.length > 3, 'info text');
    ok(x.role !== 'spy', 'Spy grimoire must not be in the story');
  }
  ok(infos > 200 && falses > 5, infos + ' infos, ' + falses + ' false');
});

t('every executed player in the log has a matching death', () => {
  for (const g of games) for (const p of g.pub.filter(q => q.kind === 'exec')) ok(g.deaths.some(d => d.seat === p.seat && d.t === p.t), 'exec without death');
});

t('players never see the Storyteller record mid-game; everyone sees it at game over', () => {
  const s = E.createGame({ n: 8, seed: 5 });
  for (let i = 0; i < 8; i++) ok(!E.view(s, i).grim, 'seat ' + i + ' sees grim mid-game');
  for (const g of games.slice(0, 5)) for (let i = 0; i < g.n; i++) ok(Array.isArray(E.view(g, i).grim), 'seat ' + i + ' cannot see it at the end');
});

t('a restored snapshot replays identically (Undo is safe)', () => {
  let s = E.createGame({ n: 9, seed: 42 });
  const ctx = () => ({ humans: new Set(), mem: {}, rng: (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })(), level: 'easy', oddsFor: () => null });
  const c1 = ctx(); for (let i = 0; i < 25; i++) s = B.step(s, c1).state;
  const snap = JSON.parse(JSON.stringify(s));
  const a = E.apply(JSON.parse(JSON.stringify(snap)), { type: 'endDay', seat: -1 });
  const b = E.apply(JSON.parse(JSON.stringify(snap)), { type: 'endDay', seat: -1 });
  eq(JSON.stringify(a.roles) + a.t + JSON.stringify(a.alive) + a.grim.length, JSON.stringify(b.roles) + b.t + JSON.stringify(b.alive) + b.grim.length);
});

t('My stats: win / loss / quit / with help', () => {
  ok(P, 'js/ctprofile.js missing');
  const g = games.find(x => x.winner === 'good');
  const goodSeat = g.evil.indexOf(false), evilSeat = g.evil.indexOf(true);
  const w = P.result(g, goodSeat, { level: 'hard' });
  eq([w.mode, w.level, w.won, w.extra.team], ['computer', 'hard', true, 'good']);
  const l = P.result(g, evilSeat, { level: 'easy' });
  eq([l.won, l.extra.team], [false, 'evil']);
  const h = P.result(g, goodSeat, { level: 'hard', helped: true });
  eq([h.mode, h.level], ['help', null], 'Undo games are not rated');
  const mid = E.createGame({ n: 8, seed: 9 });
  const q = P.result(mid, 0, { level: 'easy' });
  eq([q.won, q.extra.quit], [false, true], 'quitting is a loss');
  const d = P.result(g, goodSeat, { level: 'hard', daily: '2026-10-27' });
  ok(d.daily, 'daily flag');
});

t('My stats: level ratings follow the measured fair share (Hard above Easy)', () => {
  ok(P, 'js/ctprofile.js missing');
  const r = Object.fromEntries(P.LEVELS.map(l => [l.id, l.rating]));
  ok(r.hard - r.easy >= 150 && r.hard - r.easy <= 300, 'gap ' + (r.hard - r.easy));
  eq(P.DAILY.level, 'hard');
});

t('guided game deal is a legal 7-player Trouble Brewing setup with you good', () => {
  ok(C, 'js/ctcoach.js missing');
  const c = baseCounts(7);
  const cnt = { T: 0, O: 0, M: 0, D: 0 };
  C.ROLES.forEach(r => cnt[ROLES[r].type]++);
  eq([cnt.T, cnt.O, cnt.M, cnt.D], [c.T, c.O, c.M, c.D]);
  eq(C.ROLES[C.ME], 'empath');
  const s = E.createGame({ n: 7, seed: C.SEED, roles: C.ROLES });
  ok(!s.evil[C.ME], 'you must be good');
  // your first reading is true (no Poisoner, not the Drunk) and names one evil neighbour (Ben the Imp)
  const info = s.priv[C.ME].find(m => m.kind === 'info');
  ok(info && /1/.test(info.text), 'empath reading: ' + (info && info.text));
});

t('rules sheet table matches the setup table for 5-15 players', () => {
  ok(C, 'js/ctcoach.js missing');
  const html = C.rules().sections.find(x => x.id === 'setup').html;
  for (let n = 5; n <= 15; n++) {
    const c = baseCounts(n);
    ok(html.includes('<tr><td>' + n + '</td><td>' + c.T + '</td><td>' + c.O + '</td><td>' + c.M + '</td><td>1</td></tr>'), 'row ' + n);
  }
});

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
