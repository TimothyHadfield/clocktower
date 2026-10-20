// Rules tests for the Trouble Brewing engine. Run: node tests/engine.test.js
const E = require('../js/engine.js');
const { ROLES, baseCounts } = require('../js/roles.js');
let fails = 0, passes = 0;
function t(name, fn) { try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || '') + ' got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }
function ok(c, msg) { if (!c) throw new Error(msg || 'not ok'); }
function run(s, acts) { for (const a of acts) { s = E.apply(s, a); if (s.error) throw new Error('action ' + JSON.stringify(a) + ': ' + s.error); } return s; }
const type = id => ROLES[id].type;

t('setup table matches the rulebook (5-15 players: Townsfolk/Outsiders/Minions/Demon)', () => {
  // official table, also in bra1n/townsquare src/game.json (see docs/rules-check.md)
  const RULEBOOK = { 5: [3, 0, 1, 1], 6: [3, 1, 1, 1], 7: [5, 0, 1, 1], 8: [5, 1, 1, 1], 9: [5, 2, 1, 1], 10: [7, 0, 2, 1], 11: [7, 1, 2, 1], 12: [7, 2, 2, 1], 13: [9, 0, 3, 1], 14: [9, 1, 3, 1], 15: [9, 2, 3, 1] };
  for (let n = 5; n <= 15; n++) {
    const c = baseCounts(n);
    const got = Array.isArray(c) ? c : [c.T, c.O, c.M, c.D];
    if (JSON.stringify(got) !== JSON.stringify(RULEBOOK[n])) throw new Error(n + ' players: ' + got + ' should be ' + RULEBOOK[n]);
  }
});
t('setup counts are right for 5-15 players over 400 deals (Baron adds 2 Outsiders)', () => {
  for (let n = 5; n <= 15; n++) for (let seed = 1; seed <= 40; seed++) {
    const s = E.createGame({ n, seed: seed * 7919 + n });
    const c = baseCounts(n);
    const cnt = { T: 0, O: 0, M: 0, D: 0 };
    s.roles.forEach(r => cnt[type(r)]++);
    const baron = s.roles.includes('baron');
    eq(cnt.D, 1, 'demon'); eq(cnt.M, c.M, 'minions n=' + n);
    eq(cnt.O, Math.min(c.O + (baron ? 2 : 0), c.T + c.O), 'outsiders n=' + n + ' baron=' + baron);
    eq(cnt.T + cnt.O + cnt.M + cnt.D, n);
    eq(new Set(s.roles).size, n, 'no duplicate roles');
    const di = s.roles.indexOf('drunk');
    if (di >= 0) { ok(type(s.thinks[di]) === 'T' && !s.roles.includes(s.thinks[di]), 'drunk thinks a TF not in play'); }
    ok(!s.evil[s.redHerring], 'red herring is good');
    for (const b of s.bluffs) ok(!s.roles.includes(b) && (type(b) === 'T' || type(b) === 'O'), 'bluff not in play');
  }
});

const R7 = ['imp', 'scarletwoman', 'washerwoman', 'chef', 'empath', 'monk', 'saint'];
t('night 1 info is true when nobody is drunk or poisoned', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = E.createGame({ n: 7, roles: R7, seed });
    const info = k => s.priv.flatMap(p => p).find(p => p.kind === 'info' && p.data.kind === k).data;
    // chef: evil seats 0 and 1 sit together -> 1 pair
    eq(info('chef').count, 1, 'chef');
    // empath at seat 4: neighbours 3 (chef) and 5 (monk) -> 0
    eq(info('empath').count, 0, 'empath');
    const w = info('washerwoman');
    ok([w.a, w.b].some(i => s.roles[i] === w.shown) && type(w.shown) === 'T' && w.a !== 2 && w.b !== 2, 'washerwoman');
    eq(s.stage, 'day'); eq(s.t, 2);
  }
});

t('minions and demon learn each other only with 7+ players', () => {
  const s7 = E.createGame({ n: 7, roles: R7, seed: 3 });
  ok(s7.priv[0].some(p => p.kind === 'team'), 'demon learns minions at 7');
  const s5 = E.createGame({ n: 5, roles: ['imp', 'scarletwoman', 'washerwoman', 'chef', 'empath'], seed: 3 });
  ok(!s5.priv[0].some(p => p.kind === 'team'), 'no demon info at 5');
});

t('vote needs half the living players (rounded up); a tie puts nobody on the block', () => {
  let s = E.createGame({ n: 7, roles: R7, seed: 5 });
  eq(E.view(s, -1).threshold, 4);
  s = run(s, [{ type: 'nominate', seat: 2, target: 3 }]);
  for (const i of [0, 1, 2, 4]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'close', seat: -1 }]);
  eq(s.day.block, 3, 'on the block with 4');
  s = run(s, [{ type: 'nominate', seat: 4, target: 5 }]);
  for (const i of [0, 1, 2, 3]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'close', seat: -1 }]);
  eq(s.day.block, -1, 'tie clears the block');
  s = run(s, [{ type: 'endDay', seat: -1 }]);
  ok(s.alive.every(Boolean), 'nobody executed on a tie');
});

t('each player nominates once and is nominated once per day; dead cannot nominate', () => {
  let s = E.createGame({ n: 7, roles: R7, seed: 5 });
  s = run(s, [{ type: 'nominate', seat: 2, target: 3 }, { type: 'close', seat: -1 }]);
  ok(E.apply(s, { type: 'nominate', seat: 2, target: 4 }).error, 'second nomination by same player');
  ok(E.apply(s, { type: 'nominate', seat: 5, target: 3 }).error, 'same nominee twice');
});

t('executing the Saint loses the game for good', () => {
  let s = E.createGame({ n: 7, roles: R7, seed: 5 });
  s = run(s, [{ type: 'nominate', seat: 2, target: 6 }]);
  for (const i of [0, 1, 2, 3]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'endDay', seat: -1 }]);
  eq(s.winner, 'evil');
});

t('executing the Imp with 5+ alive makes the Scarlet Woman the Imp; without her good wins', () => {
  let s = E.createGame({ n: 7, roles: R7, seed: 5 });
  s = run(s, [{ type: 'nominate', seat: 2, target: 0 }]);
  for (const i of [1, 2, 3, 4]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'endDay', seat: -1 }]);
  eq(s.winner, null); eq(s.roles[1], 'imp', 'SW became the Imp');
  let g = E.createGame({ n: 7, roles: ['imp', 'baron', 'washerwoman', 'chef', 'empath', 'monk', 'saint'], seed: 5 });
  g = run(g, [{ type: 'nominate', seat: 2, target: 0 }]);
  for (const i of [1, 2, 3, 4]) g = run(g, [{ type: 'vote', seat: i, yes: true }]);
  g = run(g, [{ type: 'endDay', seat: -1 }]);
  eq(g.winner, 'good');
});

t('Virgin: a Townsfolk nominator is executed at once and the day ends', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'washerwoman', 'chef', 'empath', 'virgin', 'saint'], seed: 9 });
  s = run(s, [{ type: 'nominate', seat: 3, target: 5 }]);
  ok(!s.alive[3], 'chef executed'); eq(s.stage, 'night'); eq(s.t, 3);
});

t('Virgin: a non-Townsfolk nominator just starts a normal vote', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'washerwoman', 'chef', 'empath', 'virgin', 'saint'], seed: 9 });
  s = run(s, [{ type: 'nominate', seat: 6, target: 5 }]);
  ok(s.alive[6] && s.day.vote, 'vote open');
});

t('Imp cannot kill a sober Soldier; Monk protection works', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'washerwoman', 'chef', 'soldier', 'monk', 'saint'], seed: 9 });
  s = run(s, [{ type: 'endDay', seat: -1 }]);
  eq(s.pending.role, 'monk');
  s = run(s, [{ type: 'choose', seat: 5, picks: [2] }]);
  eq(s.pending.role, 'imp');
  const a = run(s, [{ type: 'choose', seat: 0, picks: [4] }]);
  ok(a.alive[4], 'soldier lives');
  const b = run(s, [{ type: 'choose', seat: 0, picks: [2] }]);
  ok(b.alive[2], 'monked player lives');
  const c = run(s, [{ type: 'choose', seat: 0, picks: [3] }]);
  ok(!c.alive[3], 'chef dies'); eq(c.stage, 'day');
});

t('Imp self-kill passes the star to a Minion', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'washerwoman', 'chef', 'soldier', 'monk', 'saint'], seed: 9 });
  s = run(s, [{ type: 'endDay', seat: -1 }, { type: 'choose', seat: 5, picks: [2] }, { type: 'choose', seat: 0, picks: [0] }]);
  eq(s.roles[1], 'imp'); eq(s.winner, null);
});

t('dead players have one ghost vote', () => {
  let s = E.createGame({ n: 7, roles: R7, seed: 5 });
  s = run(s, [{ type: 'nominate', seat: 2, target: 3 }]);
  for (const i of [0, 1, 2, 4]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'endDay', seat: -1 }]); // chef (3) executed
  ok(!s.alive[3]);
  s = run(s, [{ type: 'choose', seat: 5, picks: [2] }, { type: 'choose', seat: 0, picks: [4] }]); // monk, imp kills empath
  s = run(s, [{ type: 'nominate', seat: 2, target: 6 }, { type: 'vote', seat: 3, yes: true }, { type: 'close', seat: -1 }]);
  eq(s.ghost[3], false, 'ghost vote spent');
  ok(E.apply(Object.assign({}, s), { type: 'nominate', seat: 3, target: 5 }).error, 'dead cannot nominate');
  s = run(s, [{ type: 'nominate', seat: 5, target: 1 }]);
  ok(E.apply(s, { type: 'vote', seat: 3, yes: true }).error, 'second ghost vote refused');
});

t('only two alive with the Demon alive: evil wins', () => {
  let s = E.createGame({ n: 5, roles: ['imp', 'baron', 'chef', 'empath', 'monk'], seed: 2 });
  // day 1: execute chef
  s = run(s, [{ type: 'nominate', seat: 3, target: 2 }]);
  for (const i of [0, 1, 3]) s = run(s, [{ type: 'vote', seat: i, yes: true }]);
  s = run(s, [{ type: 'endDay', seat: -1 }, { type: 'choose', seat: 4, picks: [1] }, { type: 'choose', seat: 0, picks: [3] }]);
  eq(s.alive.filter(Boolean).length, 3);
  s = run(s, [{ type: 'nominate', seat: 0, target: 4 }, { type: 'vote', seat: 0, yes: true }, { type: 'vote', seat: 1, yes: true }, { type: 'endDay', seat: -1 }]);
  eq(s.winner, 'evil');
});

t('Slayer kills the Imp (no Scarlet Woman): good wins; a fake Slayer does nothing', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'slayer', 'chef', 'empath', 'monk', 'saint'], seed: 2 });
  const fake = run(s, [{ type: 'slay', seat: 3, target: 0 }]);
  ok(fake.alive[0], 'fake slayer');
  s = run(s, [{ type: 'slay', seat: 2, target: 0 }]);
  eq(s.winner, 'good');
});

t('the Butler\'s yes only counts if the master votes yes', () => {
  let s = E.createGame({ n: 7, roles: ['imp', 'baron', 'butler', 'chef', 'empath', 'monk', 'saint'], seed: 2 });
  // night 1: butler picks master = chef (3)
  eq(s.pending && s.pending.role, 'butler');
  s = run(s, [{ type: 'choose', seat: 2, picks: [3] }]);
  s = run(s, [{ type: 'nominate', seat: 4, target: 6 }, { type: 'vote', seat: 2, yes: true }, { type: 'vote', seat: 3, yes: false }, { type: 'close', seat: -1 }]);
  eq(s.day.history[0].yes, 0, 'butler vote not counted');
});

t('view hides other roles until the game ends', () => {
  const s = E.createGame({ n: 7, roles: R7, seed: 5 });
  const v = E.view(s, 3);
  ok(!v.roles, 'no roles'); eq(v.me.role, 'chef'); ok(!v.priv);
  ok(v.me.priv.every(p => true));
  const ev = E.view(s, 1);
  ok(ev.me.team && ev.me.team.find(x => x.demon).seat === 0, 'minion sees demon');
  ok(!ev.me.bluffs, 'minion does not see bluffs');
  ok(E.view(s, 0).me.bluffs.length === 3, 'demon sees 3 bluffs');
});

t('the Drunk is told the role they think they are, and gets made-up info', () => {
  const s = E.createGame({ n: 7, roles: ['imp', 'baron', 'drunk', 'chef', 'empath', 'monk', 'saint'], seed: 4, drunkThinks: 'washerwoman' });
  eq(E.view(s, 2).me.role, 'washerwoman');
  ok(s.priv[2].some(p => p.kind === 'info' && p.data.kind === 'washerwoman'), 'drunk got washerwoman info');
});

t('apply is pure (does not change the old state)', () => {
  const s = E.createGame({ n: 7, roles: R7, seed: 5 });
  const before = JSON.stringify(s);
  E.apply(s, { type: 'nominate', seat: 2, target: 3 });
  eq(JSON.stringify(s), before);
});

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
