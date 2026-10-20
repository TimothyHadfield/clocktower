// Trouble Brewing as a game object for the shared online layer (_online/online.js).
// Wraps the pure engine: night = the seat the Storyteller is waking; vote = everyone who
// still has a vote; day = every seat that hasn't said "done" yet. The day ends when all
// seats are done (computers are done once they have nothing more to say or do).
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const E = isNode ? require('./engine.js') : root.CT.engine;
  const B = isNode ? require('./bots.js') : root.CT.bots;
  const SV = isNode ? require('./solver.js') : root.CT.solver;

  const oddsCache = new Map();
  function pubOdds(s) {
    const k = B.oddsKey(s);
    if (!oddsCache.has(k)) {
      oddsCache.set(k, SV.solve(E.solverInput(E.view(s, -1), -1)));
      if (oddsCache.size > 60) oddsCache.delete(oddsCache.keys().next().value);
    }
    return oddsCache.get(k);
  }
  const mem = {}; // computer memory, kept by the host's browser only

  function canVote(s, i) { return s.alive[i] || s.ghost[i]; }
  function voters(s) { return [...Array(s.n).keys()].filter(i => canVote(s, i) && s.day.vote.votes[i] === undefined); }

  const game = {
    id: 'clocktower',
    minSeats: 5, maxSeats: 12,
    setup(n, options, rng, seats) {
      // names must tell players apart in the log: a blank name gets the seat number, a repeated name
      // gets its seat number added, and nobody may be called "You" (the log would say "You nominate")
      const names = [];
      seats.forEach((x, i) => {
        let nm = String((x && x.name) || '').trim();
        if (!nm || /^you$/i.test(nm)) nm = 'Seat ' + (i + 1);
        if (names.some(y => y.toLowerCase() === nm.toLowerCase())) nm = nm.slice(0, 11) + ' ' + (i + 1);
        names.push(nm);
      });
      const s = E.createGame({ n, names, kinds: seats.map(x => (x.kind === 'computer' ? 'bot' : 'online')), seed: Math.floor(rng() * 2147483647) });
      s.done = Array(n).fill(false);
      s.level = (options && options.level) || 'hard';
      return s;
    },
    toAct(s) {
      if (s.winner) return [];
      if (s.stage === 'night') return s.pending ? [s.pending.seat] : [];
      if (s.day.vote) return voters(s);
      return [...Array(s.n).keys()].filter(i => !s.done[i]);
    },
    apply(s, seat, action) {
      const a = Object.assign({}, action, { seat });
      if (s.stage === 'day' && !s.day.vote && (a.type === 'endDay' || a.type === 'pass')) {
        s.done[seat] = true;
        if (s.done.every(Boolean)) { s = E.apply(s, { type: 'endDay', seat: -1 }); s.done = Array(s.n).fill(false); }
        return s;
      }
      if (a.type === 'endDay' || a.type === 'pass' || a.type === 'close') throw new Error('Not now.');
      const before = s.stage, t = s.t;
      const done = s.done;
      let ns = E.apply(s, a);
      if (ns.error) throw new Error(ns.error);
      ns.done = done;
      // something new was said or done: computers get to react again
      if (ns.stage === 'day') for (let i = 0; i < ns.n; i++) if (ns.kinds[i] === 'bot') ns.done[i] = false;
      if (ns.stage === 'day' && ns.day.vote && voters(ns).length === 0) { ns = E.apply(ns, { type: 'close', seat: -1 }); ns.done = done; }
      if (ns.stage !== before || ns.t !== t) ns.done = Array(ns.n).fill(false);
      return ns;
    },
    publicView(s) { return Object.assign(E.view(s, -1), { done: s.done }); },
    privateView(s, seat) {
      if (seat == null || seat < 0) return null;
      const v = E.view(s, seat);
      return { me: v.me, pending: v.pending || null };
    },
    bot(ctx, seat, rng) {
      const s = ctx.state;
      const v = E.view(s, seat);
      const m = (mem[seat] = mem[seat] || {});
      const a = B.decide(v, { level: s.level || 'hard', odds: pubOdds(s), rng, mem: m });
      if (s.stage === 'day' && s.day.vote) return a && a.type === 'vote' ? a : { type: 'vote', yes: false };
      if (s.stage === 'day' && (!a || !s.alive[seat])) return { type: 'pass' };
      if (!a) return { type: 'pass' };
      // a refused action becomes "done" so the room never stalls
      const test = E.apply(s, Object.assign({}, a, { seat }));
      if (test.error) return s.stage === 'day' ? { type: 'pass' } : a;
      return a;
    },
    isOver(s) { return !!s.winner; },
  };

  if (isNode) module.exports = { game };
  else root.CT = Object.assign(root.CT || {}, { onlineGame: game });
})(typeof window !== 'undefined' ? window : globalThis);
