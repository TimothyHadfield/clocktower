// FROZEN COPY of js/solver.js as of build 12 (before the speed-up). Only tests/solver-match.test.js
// uses it: the fast solver must give the same numbers. Never edit.
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
  const CT = (typeof module !== 'undefined' && module.exports) ? require('../js/roles.js') : root.CT;
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
  function solve(game, opts) {
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
    for (const e of entries) e.lf = lFake(e, n);
    const ftMentioned = new Set();
    for (const e of entries) if (e.kind === 'fortuneteller') { ftMentioned.add(e.a); ftMentioned.add(e.b); }

    const bc = baseCounts(n);
    const mCount = bc.M;

    // results
    const res = {
      n, demon: new Array(n).fill(0), evil: new Array(n).fill(0), drunk: new Array(n).fill(0),
      minion: Array.from({ length: n }, () => ({})), poisonedNeeded: new Array(n).fill(0),
      total: 0, lineups: 0, checked: 0, teams: new Map(), error: null,
    };
    if (n < 5 || n > 15) { res.error = 'Needs 5 to 15 players.'; return finish(res, t0); }

    const seats = [...Array(n).keys()];
    const role = new Array(n);
    const isEvil = new Array(n);
    const minionPerms = perms(MINIONS, mCount);

    const mustGivers = entries.filter(e => !e.derived && claims[e.giver] !== e.kind).map(e => e.giver);
    let ci = -1;
    for (const d of seats) {
      if (d === me || sure[d] === 'good') continue;
      const rest = seats.filter(s => s !== d && s !== me && sure[s] !== 'good');
      for (const S of combos(rest, mCount)) {
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

          // --- Drunk options with prior weights
          const dOpts = [];
          if (claimedDrunk >= 0) dOpts.push({ seat: claimedDrunk, w: 1, ok: r <= u });
          else {
            const pD = r >= 1 && freeTypes > 0 ? Math.min(1, r / freeTypes) : 0;
            const pos = tf.length + u;
            const each = pos > 0 ? pD / pos : 0;
            dOpts.push({ seat: -1, w: 1 - each * tf.length, ok: r <= u });
            if (each > 0) for (const s of tf) if (s !== me || meMayBeDrunk) dOpts.push({ seat: s, w: each, ok: r - 1 <= u });
          }

          // --- Demon succession branches
          const branches = successions(d, sw, S, P, deaths, deathT, n);
          if (!branches.length) continue;

          for (const dop of dOpts) {
            if (!dop.ok || dop.w <= 0) continue;
            const drunk = dop.seat;
            for (const br of branches) {
              const W = {
                n, role, isEvil, spy, recluse, drunk, poisoner, deathT, O, oc, u, M: mCount, changes: br.changes,
                demonAt(t) { let cur = d; for (const c of br.changes) if (c[0] <= t) cur = c[1]; return cur; },
                demonBefore(t) { let cur = d; for (const c of br.changes) if (c[0] < t) cur = c[1]; return cur; },
                roleAt(s, t) { for (const c of br.changes) if (c[1] === s && c[0] <= t) return 'imp'; return s === drunk ? 'drunk' : role[s]; },
              };
              const pw = scoreWorld(W, entries, ftMentioned, penalty);
              if (pw.w <= 0) continue;
              const w = dop.w * br.w * pw.w;
              res.total += w; res.lineups++;
              const cur = br.changes.length ? br.changes[br.changes.length - 1][1] : d;
              res.demon[cur] += w;
              for (let s = 0; s < n; s++) if (isEvil[s]) res.evil[s] += w;
              if (drunk >= 0) res.drunk[drunk] += w;
              for (let i = 0; i < S.length; i++) res.minion[S[i]][P[i]] = (res.minion[S[i]][P[i]] || 0) + w;
              for (const g of pw.poisoned) res.poisonedNeeded[g] += w;
              const key = ((ci * minionPerms.length + pi) * (n + 1) + drunk + 1) * (n + 1) + cur;
              const tm = res.teams.get(key);
              if (tm) tm.w += w; else res.teams.set(key, { demon: d, now: cur, minions: S.map((s, i) => [s, P[i]]), drunk, w });
            }
          }
        }
      }
    }
    return finish(res, t0);
  }

  function finish(res, t0) {
    const T = res.total;
    res.pDemon = res.demon.map(x => (T > 0 ? x / T : 0));
    res.pEvil = res.evil.map(x => (T > 0 ? x / T : 0));
    res.pDrunk = res.drunk.map(x => (T > 0 ? x / T : 0));
    res.pMinion = res.minion.map(o => { const m = {}; for (const k in o) m[k] = T > 0 ? o[k] / T : 0; return m; });
    res.topTeams = [...res.teams.values()].sort((a, b) => b.w - a.w).slice(0, 8).map(x => Object.assign(x, { p: T > 0 ? x.w / T : 0 }));
    delete res.teams;
    res.ms = Date.now() - t0;
    if (!res.error && T <= 0) res.error = 'Nothing fits. Something recorded can\'t all be true — check for a typo, or a good player who lied.';
    return res;
  }

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
  function canReg(W, s, roleId, t) {
    if (s == null || s < 0 || s >= W.n) return false;
    const r = W.roleAt(s, t);
    if (r === roleId) return true;
    const ty = typeOf(roleId);
    if (r === null && !W.isEvil[s]) return (ty === 'T' || ty === 'O'); // an unclaimed good player could be it
    if (s === W.spy && r === 'spy' && (ty === 'T' || ty === 'O')) return true;
    if (s === W.recluse && (ty === 'M' || ty === 'D')) return true;
    return false;
  }
  // possible "shows as evil" values for a seat at time t: bit 1 = can be evil, bit 2 = can be good
  function evilOpts(W, s, t) {
    if (W.isEvil[s]) return (s === W.spy && W.roleAt(s, t) === 'spy') ? 3 : 1;
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
    const f1 = W.spy >= 0 && W.roleAt(W.spy, 1) === 'spy' ? W.spy : -1;
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
        return canReg(W, e.a, e.shown, 1) || canReg(W, e.b, e.shown, 1);
      case 'librarian':
        if (e.none) {
          if (W.O === 0) return true;
          if (W.O === 1 && W.drunk < 0) return W.oc === 1 ? W.recluse >= 0 : true;
          return false;
        }
        return canReg(W, e.a, e.shown, 1) || canReg(W, e.b, e.shown, 1);
      case 'chef': return chefPossible(W, e.count);
      case 'empath': {
        const nb = livingNeighbours(W, e.giver, e.t);
        const [lo, hi] = countSet(W, nb, e.t);
        return e.count >= lo && e.count <= hi;
      }
      case 'fortuneteller': {
        const dm = W.demonAt(e.t);
        const inPair = s => s === e.a || s === e.b;
        if (e.yes) return inPair(dm) || inPair(W.recluse) || (rh != null && (rh === -2 ? false : inPair(rh)));
        return !inPair(dm) && !(rh != null && rh !== -2 && inPair(rh));
      }
      case 'undertaker': return canReg(W, e.seat, e.shown, e.t - 1);
      case 'ravenkeeper': return canReg(W, e.seat, e.shown, e.t);
      case 'slayer': {
        const target = e.seat;
        // the Demon just before the shot (the shot itself may hand the Demon on)
        const before = W.demonBefore(e.t);
        const isDemon = before === target || target === W.recluse;
        return e.died ? isDemon : before !== target;
      }
      case 'virgin': {
        const s = e.seat;
        const r = W.roleAt(s, e.t);
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

  function scoreWorld(W, entries, ftMentioned, penalty) {
    // red herring candidates
    let rhs = [null];
    const ftActive = entries.some(e => e.kind === 'fortuneteller' && !W.isEvil[e.giver] && e.giver !== W.drunk);
    if (ftActive) {
      rhs = [];
      let other = false;
      for (let s = 0; s < W.n; s++) if (!W.isEvil[s]) { if (ftMentioned.has(s)) rhs.push(s); else other = true; }
      if (other) rhs.push(-2);
    }
    let bestW = 0, bestP = null;
    for (const rh of rhs) {
      let ok = true;
      // fails: list of [pn, giver]; hard: list of [pn, giver] that must stay sober
      let fails = null, hards = null, like = 1;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const free = W.isEvil[e.giver] || e.giver === W.drunk;
        if (free) { if (e.hard) { ok = false; break; } like *= e.lf; continue; }
        const v = check(W, e, rh);
        if (e.hard) {
          if (!v) { ok = false; break; }
          (hards || (hards = [])).push(e.pn, e.giver);
        } else if (v) like *= lTrue(W, e);
        else {
          like *= e.lf;
          if (!fails) fails = [];
          // one poison per night: two different failing givers on the same night is impossible
          let seen = false;
          for (let j = 0; j < fails.length; j += 2) if (fails[j] === e.pn) { seen = true; if (fails[j + 1] !== e.giver) ok = false; break; }
          if (!ok) break;
          if (!seen) fails.push(e.pn, e.giver);
        }
      }
      if (!ok) continue;
      let forced = 0;
      if (fails) {
        for (let j = 0; j < fails.length && ok; j += 2) {
          const pn = fails[j], g = fails[j + 1];
          if (!poisonerActive(W, pn)) { ok = false; break; }
          if (hards) for (let k = 0; k < hards.length; k += 2) if (hards[k] === pn && hards[k + 1] === g) { ok = false; break; }
          forced++;
        }
      }
      if (!ok) continue;
      const w = Math.pow(penalty, forced) * like;
      if (w > bestW) { bestW = w; bestP = fails; }
      if (!fails) break; // nothing failed: no other red herring can do better
    }
    const poisoned = [];
    if (bestP) for (let j = 1; j < bestP.length; j += 2) poisoned.push(bestP[j]);
    return { w: bestW, poisoned };
  }

  function poisonerActive(W, pn) {
    const p = W.poisoner;
    if (p < 0 || pn < 1 || !isNight(pn)) return false;
    if (W.deathT[p] < pn) return false;
    for (const c of W.changes) if (c[1] === p && c[0] < pn) return false;
    return true;
  }

  const api = { solve, timeLabel, nightOf, dayOf, isNight, buildEntries, MINIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { solver: api });
})(typeof window !== 'undefined' ? window : globalThis);
