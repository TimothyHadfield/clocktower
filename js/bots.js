// Computer players for Trouble Brewing, plus a step driver that moves bot seats forward.
// Easy = mostly random. Hard = good bots vote with the solver; evil bots bluff quiet roles,
// frame the most-suspected good player and kill trusted info players.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const CT = isNode ? Object.assign({}, require('./roles.js'), { engine: require('./engine.js') }) : root.CT;
  const E = CT.engine;
  const { ROLES } = CT;
  const INFO_ROLES = new Set(['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper']);
  const QUIET = ['monk', 'soldier', 'mayor', 'ravenkeeper', 'slayer', 'undertaker', 'virgin'];

  function mkRng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6D2B79F5) | 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (rng, a) => a[Math.floor(rng() * a.length)];

  // demon odds from this bot's point of view: public odds with itself (and known teammates) removed
  function suspicion(v, odds, self) {
    const n = v.n;
    const p = new Array(n).fill(0);
    if (odds && !odds.error) for (let i = 0; i < n; i++) p[i] = odds.pDemon[i];
    else for (let i = 0; i < n; i++) p[i] = 1;
    p[self] = 0;
    let s = 0; for (let i = 0; i < n; i++) if (v.alive[i]) s += p[i];
    for (let i = 0; i < n; i++) p[i] = s > 0 && v.alive[i] ? p[i] / s : 0;
    return p;
  }
  function argmaxAlive(v, p, exclude) {
    let best = -1, bv = -1;
    for (let i = 0; i < v.n; i++) if (v.alive[i] && !(exclude && exclude.includes(i)) && p[i] > bv) { bv = p[i]; best = i; }
    return best;
  }
  const teamOf = v => (v.me && v.me.team ? v.me.team.map(x => x.seat) : (v.me ? [v.me.seat] : []));

  // ---------------------------------------------------------------- one bot's decision
  // ctx: { level, odds, rng, mem } ; mem keeps per-bot memory between calls (claims shared etc.)
  function decide(v, ctx) {
    const me = v.me.seat, rng = ctx.rng, hard = ctx.level !== 'easy';
    const mem = ctx.mem;
    const evil = v.me.evil;
    const team = teamOf(v);
    const others = [...Array(v.n).keys()].filter(i => i !== me);
    const aliveOthers = others.filter(i => v.alive[i]);

    // ---- night choices
    if (v.pending) {
      const p = v.pending;
      const sus = suspicion(v, ctx.odds, me);
      const claimed = i => v.claims[i] && v.claims[i].role;
      const nonTeam = aliveOthers.filter(i => !team.includes(i));
      let picks;
      switch (p.role) {
        case 'poisoner': {
          const info = nonTeam.filter(i => INFO_ROLES.has(claimed(i)));
          picks = [hard && info.length ? pick(rng, info) : pick(rng, nonTeam.length ? nonTeam : aliveOthers)];
          break;
        }
        case 'imp': {
          let c = nonTeam.filter(i => claimed(i) !== 'soldier');
          if (hard) {
            // kill the most trusted info players (lowest suspicion)
            const info = c.filter(i => INFO_ROLES.has(claimed(i)) || claimed(i) === 'slayer');
            if (info.length) c = info;
            c.sort((a, b) => sus[a] - sus[b]);
            c = c.slice(0, Math.max(1, Math.ceil(c.length / 2)));
          }
          picks = [pick(rng, c.length ? c : (nonTeam.length ? nonTeam : aliveOthers))];
          break;
        }
        case 'monk': {
          let c = aliveOthers;
          if (hard) { const info = c.filter(i => INFO_ROLES.has(claimed(i))); if (info.length) c = info.sort((a, b) => sus[a] - sus[b]).slice(0, 2); }
          picks = [pick(rng, c)];
          break;
        }
        case 'fortuneteller': {
          if (hard) {
            const a = argmaxAlive(v, sus, [me]);
            const b = argmaxAlive(v, sus, [me, a]);
            picks = [a, b >= 0 ? b : pick(rng, others.filter(i => i !== a))];
          } else { const a = pick(rng, others); picks = [a, pick(rng, others.filter(i => i !== a))]; }
          break;
        }
        case 'ravenkeeper': picks = [hard ? argmaxAlive(v, sus, [me]) : pick(rng, others)]; if (picks[0] < 0) picks = [others[0]]; break;
        default: picks = [pick(rng, p.notSelf ? others : [me].concat(others))];
      }
      return { type: 'choose', seat: me, picks };
    }
    if (v.stage !== 'day' || !v.alive[me] && !(v.day && v.day.vote)) return null;

    // ---- claim + share
    if (v.alive[me] && !v.claims[me]) {
      if (!evil) {
        mem.sharedT = v.t;
        return { type: 'claim', seat: me, role: v.me.role, info: myInfo(v) };
      }
      const taken = new Set(v.claims.filter(Boolean).map(c => c.role));
      let pool;
      if (v.me.bluffs && v.me.bluffs.length) pool = v.me.bluffs.filter(r => !taken.has(r));
      else if (hard) pool = QUIET.filter(r => !taken.has(r));
      else pool = E.TB_T.filter(r => !taken.has(r));
      if (!pool || !pool.length) pool = E.TB_T.filter(r => !taken.has(r));
      if (!pool.length) pool = E.TB_T;
      mem.bluff = pick(rng, pool);
      mem.sharedT = v.t;
      return { type: 'claim', seat: me, role: mem.bluff, info: fakeInfo(v, mem.bluff, team, rng, true) };
    }
    if (v.alive[me] && (mem.sharedT || 0) < v.t) {
      mem.sharedT = v.t;
      const fresh = evil ? fakeInfo(v, mem.bluff, team, rng, false)
        : myInfo(v).filter(x => !v.shared.some(y => y.giver === me && y.kind === x.kind && y.t === x.t));
      if (fresh.length) return { type: 'share', seat: me, info: fresh };
    }

    const sus = suspicion(v, ctx.odds, me);
    const d = v.day;

    // ---- vote on the open nomination
    if (d && d.vote) {
      if (d.vote.votes[me] !== undefined) return null;
      const x = d.vote.on;
      let yes;
      if (evil) {
        if (team.includes(x)) yes = false;
        else yes = hard ? true : rng() < 0.6;
      } else if (!hard) yes = rng() < 0.45;
      else {
        const top = Math.max(...sus);
        yes = x !== me && sus[x] >= 0.8 * top && sus[x] > 0;
        if (yes && !v.alive[me]) yes = sus[x] >= 0.5; // save the ghost vote for a strong case
        if (yes && d.block >= 0 && d.block !== x && sus[d.block] >= sus[x]) yes = false;
      }
      if (!v.alive[me] && !v.ghost[me]) yes = false;
      return { type: 'vote', seat: me, yes };
    }
    if (!v.alive[me]) return null;

    // ---- Slayer (real or Drunk-thinks) takes a shot at the top suspect
    if (!evil && v.me.role === 'slayer' && !mem.slayed && v.t >= 2) {
      const x = argmaxAlive(v, sus, [me]);
      if (x >= 0 && (sus[x] >= 0.45 || !hard)) { mem.slayed = true; return { type: 'slay', seat: me, target: x }; }
    }

    // ---- nominate
    if (d && !d.nominators.includes(me)) {
      const free = i => v.alive[i] && !d.nominees.includes(i) && i !== me;
      if (evil) {
        const goods = [...Array(v.n).keys()].filter(i => free(i) && !team.includes(i));
        if (!goods.length) return null;
        if (d.block >= 0 && !team.includes(d.block)) return null; // a good player is already on the block
        const x = hard ? goods.sort((a, b) => sus[b] - sus[a])[0] : pick(rng, goods);
        if (hard || rng() < 0.4) return { type: 'nominate', seat: me, target: x };
        return null;
      }
      if (!hard) {
        const c = [...Array(v.n).keys()].filter(free);
        if (c.length && rng() < 0.25 && d.nominees.length < 3) return { type: 'nominate', seat: me, target: pick(rng, c) };
        return null;
      }
      const x = argmaxAlive(v, sus, [me]);
      if (x >= 0 && free(x) && d.block !== x && sus[x] > 0) return { type: 'nominate', seat: me, target: x };
    }
    return null;
  }

  // Made-up info an evil player gives for the role they bluff. It tends to point at good players.
  function fakeInfo(v, role, team, rng, firstDay) {
    const me = v.me.seat, n = v.n;
    const night = v.t - 1;
    const goods = [...Array(n).keys()].filter(i => i !== me && !team.includes(i));
    const any = [...Array(n).keys()].filter(i => i !== me);
    const two = () => { const a = pick(rng, goods.length ? goods : any); const b = pick(rng, any.filter(i => i !== a)); return rng() < 0.5 ? [a, b] : [b, a]; };
    const claimOf = i => v.claims[i] && v.claims[i].role;
    const out = [];
    if (firstDay) {
      if (role === 'washerwoman') { const [a, b] = two(); const c = claimOf(a); out.push({ kind: role, t: 1, a, b, shown: c && ROLES[c].type === 'T' && c !== role ? c : pick(rng, E.TB_T.filter(r => r !== role)) }); }
      if (role === 'librarian') { if (rng() < 0.3) out.push({ kind: role, t: 1, none: true }); else { const [a, b] = two(); out.push({ kind: role, t: 1, a, b, shown: pick(rng, E.TB_O) }); } }
      if (role === 'investigator') { const [a, b] = two(); out.push({ kind: role, t: 1, a, b, shown: pick(rng, E.TB_M) }); }
      if (role === 'chef') out.push({ kind: role, t: 1, count: rng() < 0.6 ? 0 : 1 });
    }
    if (role === 'empath') out.push({ kind: role, t: night, count: rng() < 0.5 ? 0 : 1 });
    if (role === 'fortuneteller') { const [a, b] = two(); out.push({ kind: role, t: night, a, b, yes: rng() < 0.3 }); }
    if (role === 'undertaker' && !firstDay) {
      const ex = [...v.pub].reverse().find(p => p.kind === 'exec' && p.t === v.t - 2);
      if (ex) { const c = claimOf(ex.seat); out.push({ kind: role, t: night, seat: ex.seat, shown: c || pick(rng, E.TB_T) }); }
    }
    return out;
  }

  function myInfo(v) {
    return v.me.priv.filter(p => p.kind === 'info' && p.data && p.data.kind !== 'spy').map(p => Object.assign({}, p.data));
  }

  // ---------------------------------------------------------------- driver
  // Moves the game forward by ONE bot action. Returns { state, acted, needOdds, waiting }.
  //  - needOdds: the caller should compute odds for oddsKey(state) and call again
  //  - waiting: a person must act (night choice, vote, or end of day)
  // ctx: { level (or levels per seat), oddsFor(state) -> odds|null, rng, mem: {} , humans: Set }
  function oddsKey(s) { return s.claims.map(c => (c ? c.role : '')).join(',') + '|' + s.shared.length + '|' + s.deaths.length; }

  function step(s, ctx) {
    if (s.winner) return { state: s, acted: false, done: true };
    const bot = i => !ctx.humans.has(i) && s.kinds[i] !== 'online';
    const lv = i => (ctx.levels && ctx.levels[i]) || ctx.level || 'hard';
    const memFor = i => (ctx.mem[i] = ctx.mem[i] || {});
    const odds = ctx.oddsFor(s);
    if (odds === undefined) return { state: s, acted: false, needOdds: true };

    if (s.stage === 'night') {
      const p = s.pending;
      if (!p) return { state: s, acted: false };
      if (!bot(p.seat)) return { state: s, acted: false, waiting: 'night' };
      const a = decide(E.view(s, p.seat), { level: lv(p.seat), odds, rng: ctx.rng, mem: memFor(p.seat) });
      return { state: E.apply(s, a), acted: true };
    }
    // day: open vote -> bots vote, then close once every eligible seat has voted
    if (s.day.vote) {
      for (let i = 0; i < s.n; i++) {
        if (!bot(i) || s.day.vote.votes[i] !== undefined) continue;
        const a = decide(E.view(s, i), { level: lv(i), odds, rng: ctx.rng, mem: memFor(i) });
        if (a) return { state: E.apply(s, a), acted: true };
        return { state: E.apply(s, { type: 'vote', seat: i, yes: false }), acted: true };
      }
      const pendingHuman = [...ctx.humans].some(i => s.day.vote.votes[i] === undefined && (s.alive[i] || s.ghost[i]));
      if (pendingHuman) return { state: s, acted: false, waiting: 'vote' };
      return { state: E.apply(s, { type: 'close', seat: -1 }), acted: true };
    }
    // claims and shares first (in seat order), then nominations
    for (const phase of ['talk', 'act']) {
      for (let k = 0; k < s.n; k++) {
        const i = (k + (s.t * 3)) % s.n; // rotate who speaks first each day
        if (!bot(i) || !s.alive[i]) continue;
        const v = E.view(s, i);
        const a = decide(v, { level: lv(i), odds, rng: ctx.rng, mem: memFor(i) });
        if (!a) continue;
        const talk = a.type === 'claim' || a.type === 'share';
        if ((phase === 'talk') !== talk) continue;
        const ns = E.apply(s, a);
        if (ns.error) continue;
        return { state: ns, acted: true };
      }
    }
    if (ctx.humans.size && [...ctx.humans].some(i => s.alive[i] || true)) return { state: s, acted: false, waiting: 'day' };
    return { state: E.apply(s, { type: 'endDay', seat: -1 }), acted: true };
  }

  const api = { decide, step, oddsKey, mkRng, suspicion };
  if (isNode) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { bots: api });
})(typeof window !== 'undefined' ? window : globalThis);
