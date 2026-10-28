/* ctprofile.js: Clocktower's part of the player profile (shared kit js/profile.js, never edit that one here):
 * the computer levels' ratings, the achievements, the Daily game and turning a game into a result.
 *
 * What counts: one whole Trouble Brewing game vs computers. Starting a new game (or quitting) after you
 * have made a move counts as a loss. A game where you used Undo counts as "with help" and isn't rated.
 * The guided first game isn't counted. Online games aren't counted.
 * Plain script: window.CT.profile in the browser, module.exports in node (tests/profile.test.js). */
(function (root) {
  'use strict';
  // Elo of each level from measured all-computer games (tests/measure.js, 8 players, 200 games a pairing,
  // progress.md): Hard plays both teams against Easy; its fair share p is the mean of its two win rates:
  //   Hard good vs Easy evil: good wins 59.5%.  Hard evil vs Easy good: evil wins 97.0% (good 3.0%).
  //   p = (59.5 + 97.0) / 2 = 78.3%  ->  400·log10(p / (1 − p)) = +223  ->  rounded to 10: +220. Easy anchored at 1200.
  const LEVELS = [{ id: 'easy', name: 'Easy', rating: 1200 }, { id: 'hard', name: 'Hard', rating: 1420 }];

  const won = c => !!(c.last && c.last.won);
  const ex = c => (c.last && c.last.extra) || {};
  const ACH = [
    { id: 'first', title: 'First win', desc: 'Win a game of Trouble Brewing', test: c => c.stats.wins >= 1 },
    { id: 'hard', title: 'Seasoned', desc: 'Win against Hard computers', test: c => won(c) && c.last.level === 'hard' },
    { id: 'good', title: 'Town hero', desc: 'Win on the good team', test: c => won(c) && ex(c).team === 'good' },
    { id: 'demon', title: 'Unseen hand', desc: 'Win as the Demon', test: c => won(c) && ex(c).demon },
    { id: 'minion', title: 'Loyal servant', desc: 'Win as a Minion', test: c => won(c) && ex(c).minion },
    { id: 'slayer', title: 'Silver bolt', desc: 'As the Slayer, shoot the Demon', test: c => !!ex(c).slayedDemon },
    { id: 'quick', title: 'First light', desc: 'Execute the Demon on day 1', test: c => !!ex(c).day1Demon },
    { id: 'alive', title: 'Survivor', desc: 'Win and be alive at the end', test: c => won(c) && ex(c).alive },
    { id: 'crowd', title: 'Full town', desc: 'Win a game with 12 or more players', test: c => won(c) && ex(c).players >= 12 },
    { id: 'streak', title: 'Hat trick', desc: 'Win 3 in a row', test: c => c.stats.bestStreak >= 3 },
    { id: 'daily', title: 'Night watch', desc: '3-day Daily streak', test: c => c.daily.streak >= 3 },
  ];

  // Today's Daily game: the same deal and seat for everyone that day. You + 7 Hard computers.
  const DAILY = { level: 'hard', n: 8 };

  function init(onDaily) {
    if (!root.Profile) return false;
    root.Profile.init({
      game: 'clocktower', levels: LEVELS, achievements: ACH, draws: false,
      modes: { computer: { name: 'vs computer' }, help: { name: 'With help' } },
      daily: { title: 'Daily game', onPlay: () => onDaily && onDaily() },
    });
    return true;
  }

  /** A finished (or abandoned) game vs computers -> Profile.recordResult input.
   *  g: the engine state; me: your seat; meta: { level, helped, daily } */
  function result(g, me, meta) {
    meta = meta || {};
    const good = !g.evil[me];
    const team = good ? 'good' : 'evil';
    const over = !!g.winner;
    const w = over && g.winner === team;
    const mode = meta.helped ? 'help' : 'computer';
    const level = mode === 'computer' && LEVELS.some(l => l.id === meta.level) ? meta.level : null;
    const pub = g.pub || [];
    const imps = new Set(g.roles.map((r, i) => (r === 'imp' ? i : -1)).filter(i => i >= 0));
    const slayedDemon = pub.some(p => p.kind === 'slaydeath' && g.roles[p.seat] === 'imp' && pub.some(q => q.kind === 'slay' && q.by === me && q.on === p.seat && q.t === p.t));
    const day1Demon = (g.deaths || []).some(d => d.how === 'exec' && d.t === 2 && imps.has(d.seat)) && good;
    const startRole = (g.priv && g.priv[me] && g.priv[me][0] && g.priv[me][0].data && g.priv[me][0].data.role) || g.roles[me];
    const extra = {
      role: g.roles[me], team, alive: !!g.alive[me], players: g.n, day: Math.ceil(g.t / 2),
      demon: g.roles[me] === 'imp', minion: g.evil[me] && g.roles[me] !== 'imp' && startRole !== 'imp',
      slayedDemon, day1Demon,
    };
    if (!over) extra.quit = true;
    return { mode, level, won: w, daily: !!meta.daily, extra };
  }

  const api = { LEVELS, ACH, DAILY, init, result };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { profile: api });
})(typeof window !== 'undefined' ? window : globalThis);
