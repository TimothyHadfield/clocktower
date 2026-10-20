// Hand-worked puzzles for the Trouble Brewing solver. Run: node tests/solver.test.js
// Each expected number was worked out by hand (see the comments) before the solver ran.
const { solve } = require('../js/solver.js');
let fails = 0, passes = 0;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
function t(name, fn) {
  try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); }
}
function eq(a, b, msg) { if (!(typeof a === 'number' ? near(a, b) : a === b)) throw new Error((msg || '') + ' got ' + a + ' expected ' + b); }

const five = ['washerwoman', 'chef', 'empath', 'investigator', 'librarian'];

t('no info, 5 players: Demon spread evenly over the other four', () => {
  const r = solve({ n: 5, claims: five, me: 0, meMayBeDrunk: false, deaths: [], infos: [] });
  eq(r.pDemon[0], 0, 'me');
  for (let s = 1; s < 5; s++) eq(r.pDemon[s], 0.25, 'seat ' + s);
  // 4 Demon seats x 3 Minion seats x 3 Minion roles (Baron can't fit: no room for 2 Outsiders) = 36
  eq(r.lineups, 36, 'lineups');
});

// q = weight of one needed poisoning = penalty 0.25 x chance of that made-up reading
t('Empath 0 at night 1 (hand: 3q / 5+2q / 5+2q / 3q, q = 0.25/3)', () => {
  const q = 0.25 / 3, T = 6 * q + 10 + 4 * q;
  const claims = ['empath', 'chef', 'washerwoman', 'investigator', 'librarian'];
  const r = solve({ n: 5, claims, me: 0, meMayBeDrunk: false, deaths: [], infos: [{ giver: 0, kind: 'empath', t: 1, count: 0 }] });
  eq(r.pDemon[1], 3 * q / T, 'seat1'); eq(r.pDemon[2], (5 + 2 * q) / T, 'seat2');
  eq(r.pDemon[3], (5 + 2 * q) / T, 'seat3'); eq(r.pDemon[4], 3 * q / T, 'seat4');
});

t('Chef 1 at night 1 (hand: 3+2q / 6+q / 6+q / 3+2q, q = 0.25/3)', () => {
  const q = 0.25 / 3, T = 18 + 6 * q;
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian'];
  const r = solve({ n: 5, claims, me: 0, meMayBeDrunk: false, deaths: [], infos: [{ giver: 0, kind: 'chef', t: 1, count: 1 }] });
  eq(r.pDemon[1], (3 + 2 * q) / T); eq(r.pDemon[2], (6 + q) / T); eq(r.pDemon[3], (6 + q) / T); eq(r.pDemon[4], (3 + 2 * q) / T);
});

t('Fortune Teller yes(1,2) night 1, no(1,3) night 2 with red herring (hand: 9 / 6+q / 3q / 3q, q = 0.25/2)', () => {
  const claims = ['fortuneteller', 'chef', 'empath', 'investigator', 'librarian'];
  const r = solve({ n: 5, claims, me: 0, meMayBeDrunk: false, deaths: [], infos: [
    { giver: 0, kind: 'fortuneteller', t: 1, a: 1, b: 2, yes: true },
    { giver: 0, kind: 'fortuneteller', t: 3, a: 1, b: 3, yes: false },
  ] });
  const q = 0.125, T = 15 + 7 * q;
  eq(r.pDemon[2], 9 / T, 'seat2'); eq(r.pDemon[4], (6 + q) / T, 'seat4'); eq(r.pDemon[1], 3 * q / T, 'seat1'); eq(r.pDemon[3], 3 * q / T, 'seat3');
});

t('Execution of the Demon with 7 alive: Scarlet Woman takes over (hand: 16/80 each, executed seat 0)', () => {
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian', 'monk', 'mayor'];
  const r = solve({ n: 7, claims, me: 0, deaths: [{ seat: 3, t: 2, how: 'exec' }], infos: [] });
  eq(r.pDemon[3], 0, 'executed'); for (const s of [1, 2, 4, 5, 6]) eq(r.pDemon[s], 16 / 80, 'seat ' + s);
  eq(r.pEvil[3], 20 / 80, 'evil executed');
});

t('Slayer kills seat 4 on day 1, game goes on: 4 was the Imp and a Scarlet Woman is the Demon now', () => {
  const claims = ['chef', 'slayer', 'washerwoman', 'investigator', 'librarian', 'monk', 'mayor'];
  const r = solve({ n: 7, claims, me: 0, deaths: [{ seat: 4, t: 2, how: 'slayer' }], infos: [{ giver: 1, kind: 'slayer', t: 2, seat: 4, died: true }] });
  eq(r.pEvil[4], 1, 'seat4 evil'); eq(r.pEvil[1], 0, 'slayer good');
  for (const s of [2, 3, 5, 6]) eq(r.pDemon[s], 0.25, 'seat ' + s);
  eq(r.pDemon[4], 0, 'dead imp');
});

t('Virgin triggers: Virgin is good, and the nominator is evil only as the Spy', () => {
  const claims = ['chef', 'empath', 'virgin', 'investigator', 'librarian', 'monk', 'mayor'];
  const r = solve({ n: 7, claims, me: 0, deaths: [{ seat: 5, t: 2, how: 'exec' }], infos: [{ giver: 2, kind: 'virgin', t: 2, seat: 5, executed: true }] });
  eq(r.pEvil[2], 0, 'virgin good');
  eq(r.pEvil[5], r.pMinion[5].spy || 0, 'nominator evil only as spy');
  if (!(r.pEvil[5] > 0)) throw new Error('spy world should exist');
});

t('Imp kills itself at night: a Minion becomes the Demon', () => {
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian', 'monk', 'mayor'];
  const r = solve({ n: 7, claims, me: 0, deaths: [{ seat: 6, t: 3, how: 'night' }], infos: [], sure: [null, null, null, null, null, null, 'evil'] });
  eq(r.pDemon[6], 0, 'dead imp'); eq(r.pEvil[6], 1);
  let sum = 0; for (let s = 0; s < 7; s++) sum += r.pDemon[s]; eq(sum, 1, 'sums to 1');
});

t('Contradiction gives an error, not NaN', () => {
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian'];
  // seat 1 is "sure good" and "sure evil" can't be satisfied together with everything else sure good
  const r = solve({ n: 5, claims, me: 0, sure: [null, 'good', 'good', 'good', 'good'], deaths: [], infos: [] });
  if (!r.error) throw new Error('expected error'); eq(r.total, 0);
});

t('Drunk prior: 8 players, 1 Outsider slot, nobody claims an Outsider', () => {
  // 8 players: 5T 1O 1M 1D. All 7 others claim Townsfolk, so a good TF claimer must be the Drunk
  // unless Baron... (Baron makes 3 Outsiders: impossible). The Outsider slot has to be filled by a
  // Drunk among the claimers -> some player is the Drunk in every line-up.
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian', 'monk', 'mayor', 'soldier'];
  const r = solve({ n: 8, claims, me: 0, meMayBeDrunk: false, deaths: [], infos: [] });
  let sum = 0; for (let s = 0; s < 8; s++) sum += r.pDrunk[s]; eq(sum, 1, 'someone is the Drunk');
  eq(r.pDrunk[0], 0, 'not me');
});

t('Speed: 15 players with info finishes in time (4 s idle; CT_SLOW=1 allows 15 s on a busy machine)', () => {
  const claims = ['chef', 'empath', 'washerwoman', 'investigator', 'librarian', 'monk', 'mayor', 'soldier', 'fortuneteller', 'undertaker', 'slayer', 'virgin', 'ravenkeeper', 'saint', 'butler'];
  const r = solve({ n: 15, claims, me: 0, deaths: [{ seat: 3, t: 2, how: 'exec' }, { seat: 7, t: 3, how: 'night' }], infos: [
    { giver: 0, kind: 'chef', t: 1, count: 1 }, { giver: 1, kind: 'empath', t: 1, count: 1 },
    { giver: 2, kind: 'washerwoman', t: 1, a: 4, b: 9, shown: 'librarian' },
    { giver: 8, kind: 'fortuneteller', t: 1, a: 10, b: 11, yes: false },
    { giver: 9, kind: 'undertaker', t: 3, seat: 3, shown: 'investigator' },
  ] });
  const lim = process.env.CT_SLOW ? 15000 : 4000; console.log('  15-player solve: ' + r.ms + ' ms'); if (r.ms > lim) throw new Error('took ' + r.ms + ' ms');
  if (r.error) throw new Error(r.error);
  console.log('  15-player solve: ' + r.ms + ' ms, ' + r.lineups + ' line-ups');
});

console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
