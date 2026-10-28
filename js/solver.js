// Trouble Brewing solver. Lists every line-up (who is the Demon, which Minion each evil player is,
// who is the Drunk) that fits everything recorded, then turns them into odds per player.
//
// Time: night k = 2k-1, day k = 2k  (Night 1 = 1, Day 1 = 2, Night 2 = 3 ...)
//
// Model (shown to the player behind a ?):
//  - Good players claim their real role. The Drunk claims the Townsfolk they think they are.
//  - Evil players may claim anything; their "info" counts for nothing.
//  - A good player's info is true unless they are the Drunk or were poisoned that night.
//  - The Poisoner poisons one player per night (while alive). Each poisoning the line-up NEEDS
//    makes it less likely (x poisonPenalty).
//  - The Spy may show up as good / any Townsfolk or Outsider; the Recluse as evil / any Minion or Demon.
//  - The Fortune Teller's red herring is some good player, fixed for the game.
//  - Scarlet Woman takes over when the Demon dies with 5+ alive; Imp self-kill passes to a Minion.
(function (root) {
  'use strict';
  const CT = (typeof module !== 'undefined' && module.exports) ? require('./roles.js') : root.CT;
  const { ROLES, baseCounts } = CT;

  const MINIONS = ['poisoner', 'spy', 'scarletwoman', 'baron'];
  const TB_OUTSIDERS = ['butler', 'drunk', 'recluse', 'saint'];
  const typeOf = id => (ROLES[id] ? ROLES[id].type : null);
  const isTBGood = id => !!ROLES[id] && ROLES[id].script === 'tb' && (ROLES[id].type === 'T' || ROLES[id].type === 'O');

  const nightOf = k => 2 * k - 1;
  const dayOf = k => 2 * k;
  const isNight = t => (t % 2) === 1;
  function timeLabel(t) { return (isNight(t) ? 'Night ' : 'Day ') + Math.ceil(t / 2); }

  function combos(arr, k) {
    const out = [];
    const rec = (start, cur) => {
      if (cur.length === k) { out.push(cur.slice()); return; }
      for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
    };
    rec(0, []);
    return out;
  }
  function perms(arr, k) {
    const out = [];
    const used = new Array(arr.length).fill(false);
    const rec = cur => {
      if (cur.length === k) { out.push(cur.slice()); return; }
      for (let i = 0; i < arr.length; i++) if (!used[i]) { used[i] = true; cur.push(arr[i]); rec(cur); cur.pop(); used[i] = false; }
    };
    rec([]);
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Turn the recorded info into checkable entries.
  // entry: { giver, kind, pn (night whose poison affects it), hard, ...data }
  function buildEntries(g) {
    const E = [];
    for (const inf of g.infos || []) {
      const e = Object.assign({}, inf);
      if (e.giver == null || e.giver < 0 || e.giver >= g.n) continue;
      e.t = e.t || 1;
      e.pn = isNight(e.t) ? e.t : e.t - 1;
      if (e.kind === 'slayer') e.hard = !!e.died;
      else if (e.kind === 'virgin') e.hard = !!e.executed;
      else e.hard = false;
      E.push(e);
    }
    // Derived: a claimed Soldier killed at night, a claimed Saint executed while the game goes on.
    for (const d of g.deaths || []) {
      const c = g.claims[d.seat];
      if (c === 'soldier' && d.how === 'night' && isNight(d.t)) E.push({ giver: d.seat, kind: 'soldierdied', t: d.t, pn: d.t, hard: false, derived: true });
      if (c === 'saint' && d.how === 'exec' && !isNight(d.t)) E.push({ giver: d.seat, kind: 'saintexec', t: d.t, pn: d.t - 1, hard: false, derived: true });
    }
    return E;
  }

  // ---------------------------------------------------------------------------------------------
  // The whole job in one go.
  function solve(game, opts) {
    const job = start(game, opts);
    while (job.step()) { /* next Demon seat */ }
    return job.result();
  }

  // The same job in small steps (one Demon seat each), so a page without a worker can give the
  // browser a breath between steps: job.step() returns true while there is more to do.
  function start(game, opts) {
    const t0 = Date.now();
    opts = opts || {};
    const n = game.n;
    const penalty = opts.poisonPenalty != null ? opts.poisonPenalty : 0.25;
    const claims = game.claims.slice(0, n);
    while (claims.length < n) claims.push(null);
    const sure = (game.sure || []).slice(0, n);
    const me = game.me != null && game.me >= 0 ? game.me : -1;
    const meMayBeDrunk = game.meMayBeDrunk !== false;

    const deathT = new Array(n).fill(Infinity);
    const deathHow = new Array(n).fill(null);
    const deaths = (game.deaths || []).filter(d => d.seat >= 0 && d.seat < n).slice().sort((a, b) => a.t - b.t);
    for (const d of deaths) if (deathT[d.seat] === Infinity) { deathT[d.seat] = d.t; deathHow[d.seat] = d.how; }
    const realDeaths = deaths.filter(d => deathT[d.seat] === d.t);

    const entries = buildEntries({ n, claims, infos: game.infos, deaths: realDeaths });
    for (const e of entries) {
      e.lf = lFake(e, n);
      e.st = e.shown ? typeOf(e.shown) : null;
      if (e.kind === 'empath') e.nb = livingNeighbours({ n, deathT }, e.giver, e.t);
    }
    const ftMentioned = new Set();
    for (const e of entries) if (e.kind === 'fortuneteller') { ftMentioned.add(e.a); ftMentioned.add(e.b); }

    const bc = baseCounts(n);
    const mCount = bc.M;

    // results
    const res = {
      n, demon: new Array(n).fill(0), evil: new Array(n).fill(0), drunk: new Array(n).fill(0),
      minion: Array.from({ length: n }, () => ({})), poisonedNeeded: new Array(n).fill(0),
      total: 0, lineups: 0, checked: 0, top: [], error: null,
    };
    if (n < 5 || n > 15) { res.error = 'Needs 5 to 15 players.'; const out = finish(res, t0); return { step: () => false, result: () => out, n: 0, done: 0 }; }

    const seats = [...Array(n).keys()];
    const role = new Array(n);
    const isEvil = new Array(n);
    const minionPerms = perms(MINIONS, mCount);
    const PC = minionPerms.map(P => P.map(x => MINIONS.indexOf(x)));
    const mAcc = new Float64Array(n * 4);   // Minion weight per seat, in MINIONS order
    const dSeat = new Array(n + 1), dW = new Array(n + 1);   // Drunk options of one line-up
    const tAgg = new Array(n).fill(0), tOrd = new Array(n); let nt = 0;   // team rows of one Drunk option

    // Seats whose being the Drunk can change a line-up's score: givers, and seats whose character a
    // reading names. Any other seat as the Drunk scores exactly like "no Drunk" (worked out once).
    const touched = new Array(n).fill(false);
    let allTouched = false;
    for (const e of entries) {
      touched[e.giver] = true;
      if (e.kind === 'librarian' && e.none) allTouched = true;
      for (const x of [e.a, e.b, e.seat]) if (x != null && x >= 0 && x < n) touched[x] = true;
    }
    if (allTouched) touched.fill(true);
    const basePw = [], baseFails = [];
    // Minion line-ups that look the same to every recorded reading score the same, so a team's
    // scores are remembered by what the readings can see: the Poisoner's seat, the Outsider count
    // (Baron), the Spy's seat where a reading could be fooled by it, the Scarlet Woman's seat when
    // someone has died, and the Minion character of any seat a reading names.
    const named = new Array(n).fill(false), spySeen = new Array(n).fill(false);
    let anyChef = false;
    for (const e of entries) {
      if (e.kind === 'chef') anyChef = true;
      if (e.kind === 'empath') for (const x of e.nb) spySeen[x] = true;
      if (e.kind === 'washerwoman' || e.kind === 'investigator' || e.kind === 'librarian' || e.kind === 'undertaker' || e.kind === 'ravenkeeper' || e.kind === 'virgin')
        for (const x of [e.a, e.b, e.seat]) if (x != null && x >= 0 && x < n) { named[x] = true; spySeen[x] = true; }
    }
    if (anyChef) spySeen.fill(true);
    const swSeen = deaths.length > 0;
    const MCODE = { poisoner: 1, spy: 2, scarletwoman: 3, baron: 4 };

    const mustGivers = entries.filter(e => !e.derived && claims[e.giver] !== e.kind).map(e => e.giver);
    let ci = -1;
    // the evil teams with Demon d: every way to pick the Minion seats
    function teams(d) {
      if (d === me || sure[d] === 'good') return [];
      return combos(seats.filter(s => s !== d && s !== me && sure[s] !== 'good'), mCount);
    }
    // teams list[from..to) with Demon d
    function run(d, list, from, to) {
      for (let k = from; k < to; k++) {
        const S = list[k];
        ci++;
        // every "sure evil" seat must be on the evil team
        let ok = true;
        for (let s = 0; s < n; s++) if (sure[s] === 'evil' && s !== d && S.indexOf(s) < 0) { ok = false; break; }
        if (!ok) continue;
        for (let s = 0; s < n; s++) { isEvil[s] = false; role[s] = null; }
        isEvil[d] = true;
        for (const s of S) isEvil[s] = true;
        // info from a role the giver doesn't claim can only come from an evil player
        if (mustGivers.some(g => !isEvil[g])) continue;
        // --- good players: claims must be real, unique TB good roles
        const taken = new Set();
        let oc = 0, u = 0, recluse = -1, claimedDrunk = -1;
        const tf = [];
        for (let s = 0; s < n; s++) {
          if (isEvil[s]) continue;
          const c = claims[s];
          if (!c) { u++; continue; }
          if (!isTBGood(c) || taken.has(c)) { ok = false; break; }
          taken.add(c); role[s] = c;
          if (typeOf(c) === 'O') { oc++; if (c === 'recluse') recluse = s; if (c === 'drunk') claimedDrunk = s; }
          else tf.push(s);
        }
        if (!ok) continue;
        const freeTypes = TB_OUTSIDERS.filter(x => !taken.has(x)).length;
        // red-herring candidates depend only on who is evil: work them out once per team
        const rhAll = [];
        { let other = false; for (let s = 0; s < n; s++) if (!isEvil[s]) { if (ftMentioned.has(s)) rhAll.push(s); else other = true; } if (other) rhAll.push(-2); }
        // one world object per team, changed in place (no allocation per line-up)
        const W = { n, role, isEvil, spy: -1, recluse, drunk: -1, poisoner: -1, deathT, O: 0, oc, u, M: mCount, changes: NOCH, d, rhAll, chefMemo: new Map() };
        const memo = new Map();
        for (let pi = 0; pi < minionPerms.length; pi++) {
          const P = minionPerms[pi];
          res.checked++;
          // --- build the line-up
          role[d] = 'imp';
          let spy = -1, sw = -1, poisoner = -1, baron = false;
          for (let i = 0; i < S.length; i++) {
            const s = S[i]; role[s] = P[i];
            if (P[i] === 'spy') spy = s; else if (P[i] === 'scarletwoman') sw = s; else if (P[i] === 'poisoner') poisoner = s; else if (P[i] === 'baron') baron = true;
          }

          let O = bc.O + (baron ? 2 : 0);
          O = Math.min(O, bc.T + bc.O);
          const r = O - oc;
          if (r < 0) continue;

          // --- Drunk options with prior weights (seat -1 = nobody among the claimers)
          let nd = 0;
          if (claimedDrunk >= 0) { if (r <= u) { dSeat[0] = claimedDrunk; dW[0] = 1; nd = 1; } }
          else {
            const pD = r >= 1 && freeTypes > 0 ? Math.min(1, r / freeTypes) : 0;
            const pos = tf.length + u;
            const each = pos > 0 ? pD / pos : 0;
            const w0 = 1 - each * tf.length;
            if (r <= u && w0 > 0) { dSeat[nd] = -1; dW[nd] = w0; nd++; }
            if (each > 0 && r - 1 <= u) for (const s of tf) if (s !== me || meMayBeDrunk) { dSeat[nd] = s; dW[nd] = each; nd++; }
          }
          if (!nd) continue;

          // --- Demon succession branches
          const branches = successions(d, sw, S, P, deaths, deathT, n);
          if (!branches.length) continue;

          W.spy = spy; W.poisoner = poisoner; W.O = O;
          let mk = ((O * 17 + poisoner + 1) * 17 + (spy >= 0 && spySeen[spy] ? spy + 1 : 0)) * 17 + (swSeen ? sw + 1 : 0);
          for (let i = 0; i < S.length; i++) mk = mk * 5 + (named[S[i]] ? MCODE[P[i]] : 0);
          let rec = memo.get(mk);
          const hit = rec !== undefined;
          if (!hit) { rec = { pw: [], f: [] }; memo.set(mk, rec); }
          const nb = branches.length;
          let groupW = 0, haveBase = false;
          for (let di = 0; di < nd; di++) {
            const drunk = dSeat[di];
            const useBase = drunk < 0 || !touched[drunk];
            if (!hit && useBase && !haveBase) {
              W.drunk = -1;
              for (let bi = 0; bi < branches.length; bi++) { W.changes = branches[bi].changes; basePw[bi] = scoreWorld(W, entries, penalty); baseFails[bi] = lastFails; }
              haveBase = true;
            }
            W.drunk = drunk;
            // line-ups that differ only in the Demon's succession share a "team" row when they end on the same Demon
            for (let bi = 0; bi < branches.length; bi++) {
              const br = branches[bi];
              let pw;
              if (hit) { pw = rec.pw[di * nb + bi]; lastFails = rec.f[di * nb + bi]; }
              else {
                if (useBase) { pw = basePw[bi]; lastFails = baseFails[bi]; }
                else { W.changes = br.changes; pw = scoreWorld(W, entries, penalty); }
                rec.pw[di * nb + bi] = pw; rec.f[di * nb + bi] = lastFails;
              }
              if (pw <= 0) continue;
              const w = dW[di] * br.w * pw;
              res.total += w; res.lineups++; groupW += w;
              const cur = br.changes.length ? br.changes[br.changes.length - 1][1] : d;
              res.demon[cur] += w;
              if (drunk >= 0) res.drunk[drunk] += w;
              for (let j = 1; j < lastFails.length; j += 2) res.poisonedNeeded[lastFails[j]] += w;
              if (!(tAgg[cur] > 0)) { tAgg[cur] = w; tOrd[nt++] = cur; } else tAgg[cur] += w;
            }
            for (let k = 0; k < nt; k++) { const c = tOrd[k]; teamTop(res, d, c, S, P, drunk, tAgg[c]); tAgg[c] = 0; }
            nt = 0;
          }
          if (groupW > 0) {
            for (let s = 0; s < n; s++) if (isEvil[s]) res.evil[s] += groupW;
            for (let i = 0; i < S.length; i++) mAcc[S[i] * 4 + PC[pi][i]] += groupW;
          }
        }
      }
    }
    // steps: up to STEP teams each (a 15-player game has 14 x 286 teams of 24 Minion line-ups)
    const STEP = 32;
    let d = 0, list = teams(0), k = 0, out = null;
    const more = () => d < n;
    function step() {
      if (!more()) return false;
      const to = Math.min(list.length, k + STEP);
      run(d, list, k, to);
      k = to;
      while (d < n && k >= list.length) { d++; k = 0; list = d < n ? teams(d) : []; }
      return more();
    }
    return {
      n, step,
      result() {
        if (out) return out;
        while (step()) { /* finish */ }
        // per-seat Minion weights, keyed by character
        for (let s = 0; s < n; s++) for (let k = 0; k < 4; k++) if (mAcc[s * 4 + k] > 0) res.minion[s][MINIONS[k]] = mAcc[s * 4 + k];
        out = finish(res, t0);
        return out;
      },
    };
  }

  function finish(res, t0) {
    const T = res.total;
    res.pDemon = res.demon.map(x => (T > 0 ? x / T : 0));
    res.pEvil = res.evil.map(x => (T > 0 ? x / T : 0));
    res.pDrunk = res.drunk.map(x => (T > 0 ? x / T : 0));
    res.pMinion = res.minion.map(o => { const m = {}; for (const k in o) m[k] = T > 0 ? o[k] / T : 0; return m; });
    res.topTeams = res.top.map(x => Object.assign(x, { p: T > 0 ? x.w / T : 0 }));
    delete res.top;
    res.ms = Date.now() - t0;
    if (!res.error && T <= 0) res.error = 'Nothing fits. Something recorded can\'t all be true — check for a typo, or a good player who lied.';
    return res;
  }

  // The 8 heaviest team rows, kept as they come (ties keep the earlier row, like a stable sort).
  const TOPK = 8;
  function teamTop(res, d, cur, S, P, drunk, w) {
    const top = res.top;
    if (top.length === TOPK && !(w > top[TOPK - 1].w)) return;
    let i = top.length;
    while (i > 0 && top[i - 1].w < w) i--;
    top.splice(i, 0, { demon: d, now: cur, minions: S.map((s, k) => [s, P[k]]), drunk, w });
    if (top.length > TOPK) top.pop();
  }
  const NOCH = [];

  // Who is the Demon over time. Returns [{changes:[[t, seat]...], w}] or [] if the game would have ended.
  function successions(d, sw, S, P, deaths, deathT, n) {
    let branches = [{ cur: d, changes: [], w: 1 }];
    for (const dd of deaths) {
      if (deathT[dd.seat] !== dd.t) continue;
      const next = [];
      for (const b of branches) {
        if (dd.seat !== b.cur) { next.push(b); continue; }
        const t = dd.t;
        let alive = 0;
        for (let s = 0; s < n; s++) if (deathT[s] >= t) alive++;
        if (t === 1) continue; // the Demon can't die on the first night in Trouble Brewing
        const swOk = sw >= 0 && sw !== b.cur && deathT[sw] > t && alive >= 5 && !b.changes.some(c => c[1] === sw);
        if (swOk) { next.push({ cur: sw, changes: b.changes.concat([[t, sw]]), w: b.w }); continue; }
        if (isNight(t) && t > 1) {
          // Imp killed itself (the Imp doesn't act on the first night): a living Minion catches the star
          const cands = S.filter(s => s !== b.cur && deathT[s] > t && !b.changes.some(c => c[1] === s));
          for (const s of cands) next.push({ cur: s, changes: b.changes.concat([[t, s]]), w: b.w / cands.length });
        }
        // otherwise the game would have ended: this branch is impossible
      }
      branches = next;
      if (!branches.length) break;
    }
    return branches;
  }

  // ---------------------------------------------------------------------------------------------
  // Registration helpers
  function demonAt(W, t) { let cur = W.d; const ch = W.changes; for (let i = 0; i < ch.length; i++) if (ch[i][0] <= t) cur = ch[i][1]; return cur; }
  function demonBefore(W, t) { let cur = W.d; const ch = W.changes; for (let i = 0; i < ch.length; i++) if (ch[i][0] < t) cur = ch[i][1]; return cur; }
  function roleAt(W, s, t) { const ch = W.changes; for (let i = 0; i < ch.length; i++) if (ch[i][1] === s && ch[i][0] <= t) return 'imp'; return s === W.drunk ? 'drunk' : W.role[s]; }
  function canReg(W, s, roleId, t, ty) {
    if (s == null || s < 0 || s >= W.n) return false;
    const r = roleAt(W, s, t);
    if (r === roleId) return true;
    if (r === null && !W.isEvil[s]) return (ty === 'T' || ty === 'O'); // an unclaimed good player could be it
    if (s === W.spy && r === 'spy' && (ty === 'T' || ty === 'O')) return true;
    if (s === W.recluse && (ty === 'M' || ty === 'D')) return true;
    return false;
  }
  // possible "shows as evil" values for a seat at time t: bit 1 = can be evil, bit 2 = can be good
  function evilOpts(W, s, t) {
    if (W.isEvil[s]) return (s === W.spy && roleAt(W, s, t) === 'spy') ? 3 : 1;
    return s === W.recluse ? 3 : 2;
  }
  function countSet(W, seatsList, t) {
    // seatsList: list of seats (with repeats allowed for pairs handled by caller)
    let lo = 0, hi = 0;
    for (const s of seatsList) { const o = evilOpts(W, s, t); if (o === 1) { lo++; hi++; } else if (o === 3) hi++; }
    return [lo, hi];
  }
  function chefPossible(W, count) {
    const n = W.n;
    // at most two seats can flip (Spy, Recluse)
    const f1 = W.spy >= 0 && roleAt(W, W.spy, 1) === 'spy' ? W.spy : -1;
    const f2 = W.recluse;
    for (let mask = 0; mask < 4; mask++) {
      if ((mask & 1) && f1 < 0) continue;
      if ((mask & 2) && f2 < 0) continue;
      let c = 0;
      for (let s = 0; s < n; s++) {
        const s2 = (s + 1) % n;
        if (evAt(W, s, mask, f1, f2) && evAt(W, s2, mask, f1, f2)) c++;
      }
      if (c === count) return true;
    }
    return false;
  }
  // mask bit1: the Spy shows as good; bit2: the Recluse shows as evil
  function evAt(W, s, mask, f1, f2) {
    if (s === f1) return !(mask & 1);
    if (s === f2) return !!(mask & 2);
    return W.isEvil[s];
  }
  function livingNeighbours(W, giver, t) {
    const n = W.n, out = [];
    for (let k = 1; k < n; k++) { const s = (giver - k + n) % n; if (W.deathT[s] > t) { out.push(s); break; } }
    for (let k = 1; k < n; k++) { const s = (giver + k) % n; if (W.deathT[s] > t) { if (out[0] !== s) out.push(s); break; } }
    return out;
  }

  function check(W, e, rh) {
    switch (e.kind) {
      case 'washerwoman': case 'investigator':
        return canReg(W, e.a, e.shown, 1, e.st) || canReg(W, e.b, e.shown, 1, e.st);
      case 'librarian':
        if (e.none) {
          if (W.O === 0) return true;
          if (W.O === 1 && W.drunk < 0) return W.oc === 1 ? W.recluse >= 0 : true;
          return false;
        }
        return canReg(W, e.a, e.shown, 1, e.st) || canReg(W, e.b, e.shown, 1, e.st);
      case 'chef': {
        // depends only on the evil team, the Spy's seat and the Recluse: remembered per team
        const m = W.chefMemo, k = (W.spy + 1) * 64 + Math.min(e.count, 63);
        let v = m.get(k);
        if (v === undefined) { v = chefPossible(W, e.count); m.set(k, v); }
        return v;
      }
      case 'empath': {
        const nb = e.nb;
        let lo = 0, hi = 0;
        for (let i = 0; i < nb.length; i++) { const o = evilOpts(W, nb[i], e.t); if (o === 1) { lo++; hi++; } else if (o === 3) hi++; }
        return e.count >= lo && e.count <= hi;
      }
      case 'fortuneteller': {
        const dm = demonAt(W, e.t), a = e.a, b = e.b, rc = W.recluse;
        const rhIn = rh != null && rh !== -2 && (rh === a || rh === b);
        if (e.yes) return dm === a || dm === b || rc === a || rc === b || rhIn;
        return !(dm === a || dm === b) && !rhIn;
      }
      case 'undertaker': return canReg(W, e.seat, e.shown, e.t - 1, e.st);
      case 'ravenkeeper': return canReg(W, e.seat, e.shown, e.t, e.st);
      case 'slayer': {
        const target = e.seat;
        // the Demon just before the shot (the shot itself may hand the Demon on)
        const before = demonBefore(W, e.t);
        const isDemon = before === target || target === W.recluse;
        return e.died ? isDemon : before !== target;
      }
      case 'virgin': {
        const s = e.seat;
        const r = roleAt(W, s, e.t);
        const canTF = (!W.isEvil[s] && (r === null || typeOf(r) === 'T')) || (s === W.spy && r === 'spy');
        const mustTF = !W.isEvil[s] && r !== null && typeOf(r) === 'T';
        return e.executed ? canTF : !mustTF;
      }
      case 'soldierdied': case 'saintexec': return false;
      default: return true;
    }
  }

  // Best weight for this world over red-herring choices and poison targets.
  // Likelihoods: how likely is exactly this reading?
  //  made-up (evil, Drunk, poisoned): one of all the readings that could be said
  //  true (sober good player): one of the few readings that are true in this world
  const C2 = k => (k * (k - 1)) / 2;
  function lFake(e, n) {
    switch (e.kind) {
      case 'washerwoman': return 1 / (13 * C2(n - 1));
      case 'librarian': return 1 / (4 * C2(n - 1) + 1);
      case 'investigator': return 1 / (4 * C2(n - 1));
      case 'chef': case 'empath': return 1 / 3;
      case 'fortuneteller': return 1 / 2;
      case 'undertaker': case 'ravenkeeper': return 1 / 22;
      default: return 1;
    }
  }
  function lTrue(W, e) {
    const n = W.n;
    switch (e.kind) {
      case 'washerwoman': return 1 / (Math.max(1, n - 1 - W.M - W.O - 1) * (n - 2));
      case 'librarian': return W.O === 0 ? 1 : 1 / (W.O * (n - 2));
      case 'investigator': return 1 / (W.M * (n - 2));
      default: return 1;
    }
  }

  // Returns the weight; the poisonings it needs are left in lastFails ([night, giver, ...]).
  // Only the Fortune Teller's readings depend on the red herring, so everything else is checked
  // once and the red-herring choices only re-check those readings.
  let lastFails = NOCH;
  const ftIdx = [];
  // add one failed (made-up) reading to fails; false if another giver already failed that night
  function addFail(fails, e) {
    for (let j = 0; j < fails.length; j += 2) if (fails[j] === e.pn) return fails[j + 1] === e.giver;
    fails.push(e.pn, e.giver);
    return true;
  }
  function settle(W, fails, hards, like, penalty) {
    let forced = 0;
    if (fails) {
      for (let j = 0; j < fails.length; j += 2) {
        const pn = fails[j], g = fails[j + 1];
        if (!poisonerActive(W, pn)) return 0;
        if (hards) for (let k = 0; k < hards.length; k += 2) if (hards[k] === pn && hards[k + 1] === g) return 0;
        forced++;
      }
    }
    return Math.pow(penalty, forced) * like;
  }
  function scoreWorld(W, entries, penalty) {
    lastFails = NOCH;
    let fails = null, hards = null, like = 1, nft = 0;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const free = W.isEvil[e.giver] || e.giver === W.drunk;
      if (free) { if (e.hard) return 0; like *= e.lf; continue; }
      if (e.kind === 'fortuneteller') { ftIdx[nft++] = i; continue; }
      const v = check(W, e, null);
      if (e.hard) {
        if (!v) return 0;
        (hards || (hards = [])).push(e.pn, e.giver);
      } else if (v) like *= lTrue(W, e);
      else {
        like *= e.lf;
        if (!addFail(fails || (fails = []), e)) return 0;
      }
    }
    if (!nft) { const w = settle(W, fails, hards, like, penalty); if (w > 0) lastFails = fails || NOCH; return w; }
    const rhs = W.rhAll;
    let bestW = 0, bestP = null;
    for (let ri = 0; ri < rhs.length; ri++) {
      const rh = rhs[ri];
      let f = fails, l = like, ok = true;
      for (let k = 0; k < nft; k++) {
        const e = entries[ftIdx[k]];
        if (check(W, e, rh)) continue;   // a true reading: lTrue is 1
        l *= e.lf;
        if (f === fails) f = fails ? fails.slice() : [];
        if (!addFail(f, e)) { ok = false; break; }
      }
      if (!ok) continue;
      const w = settle(W, f, hards, l, penalty);
      if (w <= 0) continue;
      if (w > bestW) { bestW = w; bestP = f; }
      if (!f) break; // nothing failed: no other red herring can do better
    }
    lastFails = bestP || NOCH;
    return bestW;
  }

  function poisonerActive(W, pn) {
    const p = W.poisoner;
    if (p < 0 || pn < 1 || !isNight(pn)) return false;
    if (W.deathT[p] < pn) return false;
    for (const c of W.changes) if (c[1] === p && c[0] < pn) return false;
    return true;
  }

  const api = { solve, start, timeLabel, nightOf, dayOf, isNight, buildEntries, MINIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { solver: api });
})(typeof window !== 'undefined' ? window : globalThis);
