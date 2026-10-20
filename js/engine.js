// Trouble Brewing game engine with a computer Storyteller.
// Pure: apply(state, action) -> new state; view(state, seat) hides other players' secrets.
// Seats can be a person on this phone, a computer player, or (later) an online player:
// the engine doesn't care who sends an action.
//
// Time: night k = 2k-1, day k = 2k.
(function (root) {
  'use strict';
  const CT = (typeof module !== 'undefined' && module.exports) ? require('./roles.js') : root.CT;
  const { ROLES, rolesOf, baseCounts } = CT;

  const TB_T = rolesOf('tb', 'T').map(r => r.id);
  const TB_O = rolesOf('tb', 'O').map(r => r.id);
  const TB_M = rolesOf('tb', 'M').map(r => r.id);
  const FIRST = ['minioninfo', 'demoninfo', 'poisoner', 'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'butler', 'spy'];
  const OTHER = ['poisoner', 'monk', 'scarletwoman', 'imp', 'ravenkeeper', 'empath', 'fortuneteller', 'undertaker', 'butler', 'spy'];
  const typeOf = id => ROLES[id] ? ROLES[id].type : null;
  const nm = id => ROLES[id] ? ROLES[id].name : id;
  const isNight = t => t % 2 === 1;
  const label = t => (isNight(t) ? 'Night ' : 'Day ') + Math.ceil(t / 2);

  // ------------------------------------------------------------------ rng (kept in state => pure)
  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let x = s.seed;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  const pick = (s, arr) => arr[Math.floor(rnd(s) * arr.length)];
  function shuffle(s, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ------------------------------------------------------------------ setup
  // opts: { n, names?, kinds? ('you'|'bot'|'online'), seed?, roles? (force the deal, for tests) }
  function createGame(opts) {
    const n = Math.max(5, Math.min(15, opts.n | 0));
    const s = {
      v: 1, script: 'tb', n, seed: (opts.seed >>> 0) || (Date.now() >>> 0),
      names: (opts.names || []).slice(0, n), kinds: (opts.kinds || []).slice(0, n),
      roles: [], thinks: [], evil: [], alive: [], ghost: [],
      redHerring: -1, bluffs: [], t: 1, stage: 'night', step: -1, steps: [],
      pending: null, poisoned: -1, poisonedT: 0, monk: -1, killedTonight: [], executedToday: -1,
      slayerUsed: false, virginUsed: false, butlerMaster: -1,
      day: null, claims: Array(n).fill(null), shared: [], pub: [], priv: Array.from({ length: n }, () => []),
      deaths: [], winner: null, winReason: '', version: 0,
    };
    for (let i = 0; i < n; i++) { if (!s.names[i]) s.names[i] = 'Seat ' + (i + 1); if (!s.kinds[i]) s.kinds[i] = 'bot'; }
    let roles = opts.roles;
    if (!roles) {
      const c = baseCounts(n);
      const minions = shuffle(s, TB_M).slice(0, c.M);
      let O = c.O + (minions.includes('baron') ? 2 : 0);
      const outs = shuffle(s, TB_O).slice(0, O);
      const tfs = shuffle(s, TB_T).slice(0, n - 1 - c.M - O);
      roles = shuffle(s, ['imp'].concat(minions, outs, tfs));
    }
    s.roles = roles.slice();
    const inPlay = new Set(s.roles);
    const notIn = TB_T.filter(r => !inPlay.has(r));
    for (let i = 0; i < n; i++) {
      s.evil[i] = typeOf(s.roles[i]) === 'M' || typeOf(s.roles[i]) === 'D';
      s.alive[i] = true; s.ghost[i] = true;
      s.thinks[i] = s.roles[i];
    }
    const di = s.roles.indexOf('drunk');
    if (di >= 0) s.thinks[di] = opts.drunkThinks || pick(s, notIn);
    const goodSeats = [...Array(n).keys()].filter(i => !s.evil[i]);
    s.redHerring = opts.redHerring != null ? opts.redHerring : pick(s, goodSeats);
    const bluffPool = TB_T.concat(TB_O).filter(r => !inPlay.has(r) && r !== s.thinks[di] && r !== 'drunk');
    s.bluffs = shuffle(s, bluffPool).slice(0, 3);
    for (let i = 0; i < n; i++) msg(s, i, 'role', 'You are the ' + nm(s.thinks[i]) + '.', { role: s.thinks[i] });
    log(s, 'Night 1 begins. ' + n + ' players.');
    startNight(s);
    return s;
  }

  // ------------------------------------------------------------------ helpers
  function log(s, text, extra) { s.pub.push(Object.assign({ t: s.t, text }, extra || {})); }
  // "Ben nominates" / "You nominate": the player's own seat may be named "You"
  function who(s, i, he, you) { return s.names[i] + ' ' + (s.names[i] === 'You' ? you : he); }
  function msg(s, seat, kind, text, data) { s.priv[seat].push({ t: s.t, kind, text, data: data || null }); }
  const aliveCount = s => s.alive.filter(Boolean).length;
  const seatsWith = (s, role) => s.roles.map((r, i) => (r === role ? i : -1)).filter(i => i >= 0);
  const demonSeat = s => s.roles.indexOf('imp');
  // poisoned tonight / tomorrow, or the Drunk: abilities fail
  function sober(s, seat) {
    if (s.roles[seat] === 'drunk') return false;
    // the poison lasts until dusk of the next day, and ends at once if the Poisoner dies
    if (s.poisoned === seat && (s.t === s.poisonedT || s.t === s.poisonedT + 1) && s.roles.some((r, i) => r === 'poisoner' && s.alive[i])) return false;
    return true;
  }
  // Storyteller choices about the Spy and Recluse: 50/50 each time
  function showsEvil(s, i) {
    if (s.roles[i] === 'spy') return rnd(s) < 0.5;
    if (s.roles[i] === 'recluse') return rnd(s) < 0.5;
    return s.evil[i];
  }
  function showsAs(s, i, type) {
    // returns a role this seat shows as, preferring its real one
    const r = s.roles[i];
    if (r === 'spy' && (type === 'T' || type === 'O') && rnd(s) < 0.5) return pick(s, type === 'T' ? TB_T : TB_O);
    if (r === 'recluse' && (type === 'M' || type === 'D') && rnd(s) < 0.5) return type === 'D' ? 'imp' : pick(s, TB_M);
    return r;
  }
  function others(s, seat) { return [...Array(s.n).keys()].filter(i => i !== seat); }
  function neighbours(s, seat) {
    const out = [];
    for (let k = 1; k < s.n; k++) { const i = (seat - k + s.n) % s.n; if (s.alive[i] && i !== seat) { out.push(i); break; } }
    for (let k = 1; k < s.n; k++) { const i = (seat + k) % s.n; if (s.alive[i] && i !== seat) { if (out[0] !== i) out.push(i); break; } }
    return out;
  }

  // ------------------------------------------------------------------ deaths and win checks
  function kill(s, seat, how) {
    if (!s.alive[seat]) return;
    const wasDemon = s.roles[seat] === 'imp';
    const before = aliveCount(s);
    s.alive[seat] = false;
    s.deaths.push({ seat, t: s.t, how });
    if (wasDemon) {
      const sw = seatsWith(s, 'scarletwoman').find(i => s.alive[i] && sober(s, i));
      if (sw != null && before >= 5) {
        s.roles[sw] = 'imp'; s.thinks[sw] = 'imp';
        msg(s, sw, 'role', 'The Demon died. You are now the Imp.', { role: 'imp' });
      } else if (how === 'self') {
        const mins = [...Array(s.n).keys()].filter(i => s.alive[i] && typeOf(s.roles[i]) === 'M');
        if (mins.length) {
          const m = pick(s, mins);
          s.roles[m] = 'imp'; s.thinks[m] = 'imp';
          msg(s, m, 'role', 'The Imp passed the star to you. You are now the Imp.', { role: 'imp' });
        }
      }
    }
    checkWin(s);
  }
  function checkWin(s) {
    if (s.winner) return;
    const d = s.roles.findIndex((r, i) => r === 'imp' && s.alive[i]);
    if (d < 0) return end(s, 'good', 'The Demon is dead.');
    if (aliveCount(s) <= 2) return end(s, 'evil', 'Only two players are left alive.');
  }
  function end(s, who, why) {
    s.winner = who; s.winReason = why; s.stage = 'over'; s.pending = null;
    log(s, (who === 'good' ? 'Good wins! ' : 'Evil wins! ') + why, { kind: 'end' });
  }

  // ------------------------------------------------------------------ night
  function startNight(s) {
    s.stage = 'night';
    s.killedTonight = [];
    s.monk = -1;
    s.steps = isNight(s.t) && s.t === 1 ? FIRST.slice() : OTHER.slice();
    s.step = -1;
    advance(s);
  }

  // run night steps until someone has to choose, or the night ends
  function advance(s) {
    while (!s.winner && s.stage === 'night' && !s.pending) {
      s.step++;
      if (s.step >= s.steps.length) { startDay(s); return; }
      runStep(s, s.steps[s.step]);
    }
  }

  function actorsFor(s, role) {
    return seatsWith(s, role).filter(i => s.alive[i] || (role === 'ravenkeeper' && s.killedTonight.includes(i)));
  }
  // the Drunk "acts" as the role they think they are
  function thinkersFor(s, role) {
    const real = actorsFor(s, role);
    const di = s.roles.indexOf('drunk');
    if (di >= 0 && s.thinks[di] === role && (s.alive[di] || (role === 'ravenkeeper' && s.killedTonight.includes(di)))) real.push(di);
    return real;
  }

  function runStep(s, step) {
    const n = s.n;
    if (step === 'minioninfo' || step === 'demoninfo') {
      if (n < 7) return;
      const d = demonSeat(s);
      const mins = [...Array(n).keys()].filter(i => typeOf(s.roles[i]) === 'M');
      if (step === 'minioninfo') for (const m of mins) msg(s, m, 'team', 'Your Demon is ' + s.names[d] + '.' + (mins.length > 1 ? ' Other Minions: ' + mins.filter(x => x !== m).map(x => s.names[x]).join(', ') + '.' : ''), { demon: d, minions: mins });
      else msg(s, d, 'team', 'Your Minions: ' + mins.map(x => s.names[x]).join(', ') + '. Not in play: ' + s.bluffs.map(nm).join(', ') + '.', { minions: mins, bluffs: s.bluffs });
      return;
    }
    if (step === 'scarletwoman') return; // handled at the moment the Demon dies
    if (step === 'undertaker' && s.executedToday < 0) return;
    if (step === 'ravenkeeper') {
      const rk = thinkersFor(s, 'ravenkeeper').filter(i => s.killedTonight.includes(i));
      if (rk.length) s.pending = { seat: rk[0], role: 'ravenkeeper', picks: 1, prompt: 'You died tonight. Pick a player to learn their role.' };
      return;
    }
    const chooser = { poisoner: 1, monk: 1, imp: 1, fortuneteller: 2, butler: 1 }[step];
    const actors = (typeOf(step) === 'T' || typeOf(step) === 'O') ? thinkersFor(s, step) : actorsFor(s, step);
    if (!actors.length) return;
    if (chooser) {
      if (step === 'imp' && s.t === 1) return;
      if (step === 'monk' && s.t === 1) return;
      const prompts = { poisoner: 'Pick a player to poison.', monk: 'Pick a player to protect from the Demon.', imp: 'Pick a player to kill.', fortuneteller: 'Pick two players: is either the Demon?', butler: 'Pick your master for tomorrow.' };
      s.pending = { seat: actors[0], role: step, picks: chooser, prompt: prompts[step], notSelf: step === 'monk' || step === 'butler' };
      return;
    }
    for (const a of actors) giveInfo(s, a, step, null);
  }

  // ---- info (true if sober, made-up if drunk/poisoned)
  function giveInfo(s, seat, role, picks) {
    const ok = sober(s, seat);
    const n = s.n;
    let data = null, text = '';
    const two = (x) => { let y = pick(s, others(s, seat).filter(i => i !== x)); return rnd(s) < 0.5 ? [x, y] : [y, x]; };
    if (role === 'washerwoman' || role === 'librarian' || role === 'investigator') {
      const type = { washerwoman: 'T', librarian: 'O', investigator: 'M' }[role];
      const pool = TB_T.concat(TB_O, TB_M).filter(r => typeOf(r) === type);
      let a, b, shown, none = false;
      if (ok) {
        const cands = others(s, seat).map(i => [i, showsAs(s, i, type)]).filter(([, r]) => typeOf(r) === type);
        if (!cands.length) none = true;
        else { const [x, r] = pick(s, cands); [a, b] = two(x); shown = r; }
      } else {
        if (role === 'librarian' && rnd(s) < 0.25) none = true;
        else { const x = pick(s, others(s, seat)); [a, b] = two(x); const wrong = pool.filter(r => r !== s.roles[a] && r !== s.roles[b]); shown = pick(s, wrong.length ? wrong : pool); }
      }
      if (none) { data = { kind: role, none: true }; text = 'There are no Outsiders in play.'; }
      else { data = { kind: role, a, b, shown }; text = 'One of ' + s.names[a] + ' and ' + s.names[b] + ' is the ' + nm(shown) + '.'; }
    } else if (role === 'chef') {
      let c = 0; const ev = [...Array(n).keys()].map(i => showsEvil(s, i));
      for (let i = 0; i < n; i++) if (ev[i] && ev[(i + 1) % n]) c++;
      // made-up numbers stay believable: never more pairs than the evil team could make
      const evilN = s.evil.filter(Boolean).length;
      if (!ok) c = pick(s, [...Array(evilN).keys()].filter(x => x !== c));
      data = { kind: 'chef', count: c }; text = c + ' pair' + (c === 1 ? '' : 's') + ' of evil players sit together.';
    } else if (role === 'empath') {
      let c = neighbours(s, seat).filter(i => showsEvil(s, i)).length;
      if (!ok) c = pick(s, [0, 1, 2].filter(x => x !== c && x <= s.evil.filter(Boolean).length));
      data = { kind: 'empath', count: c }; text = c + ' of your living neighbours ' + (c === 1 ? 'is' : 'are') + ' evil.';
    } else if (role === 'fortuneteller') {
      const [a, b] = picks;
      let yes = [a, b].some(i => s.roles[i] === 'imp' || i === s.redHerring || (s.roles[i] === 'recluse' && rnd(s) < 0.5));
      if (!ok) yes = rnd(s) < 0.5;
      data = { kind: 'fortuneteller', a, b, yes }; text = (yes ? 'Yes' : 'No') + ': ' + s.names[a] + ' or ' + s.names[b] + (yes ? ' might be' : ' is not') + ' the Demon.';
    } else if (role === 'undertaker') {
      const x = s.executedToday;
      let shown = s.roles[x];
      if (s.roles[x] === 'spy' && rnd(s) < 0.3) shown = pick(s, TB_T);
      if (s.roles[x] === 'recluse' && rnd(s) < 0.5) shown = pick(s, TB_M.concat(['imp']));
      if (!ok) shown = pick(s, TB_T.concat(TB_O, TB_M, ['imp']).filter(r => r !== s.roles[x]));
      data = { kind: 'undertaker', seat: x, shown }; text = s.names[x] + ', executed today, was the ' + nm(shown) + '.';
    } else if (role === 'ravenkeeper') {
      const x = picks[0];
      let shown = s.roles[x];
      if (s.roles[x] === 'spy' && rnd(s) < 0.3) shown = pick(s, TB_T);
      if (s.roles[x] === 'recluse' && rnd(s) < 0.5) shown = pick(s, TB_M.concat(['imp']));
      if (!ok) shown = pick(s, TB_T.concat(TB_O, TB_M, ['imp']).filter(r => r !== s.roles[x]));
      data = { kind: 'ravenkeeper', seat: x, shown }; text = s.names[x] + ' is the ' + nm(shown) + '.';
    } else if (role === 'spy') {
      data = { kind: 'spy', roles: s.roles.slice() };
      text = 'Grimoire: ' + s.roles.map((r, i) => s.names[i] + ' ' + nm(r)).join(', ') + '.';
    } else return;
    data.t = s.t;
    msg(s, seat, 'info', text, data);
  }

  function resolveChoice(s, p, picks) {
    const seat = p.seat;
    const ok = sober(s, seat);
    switch (p.role) {
      case 'poisoner':
        s.poisoned = picks[0]; s.poisonedT = s.t;
        msg(s, seat, 'done', 'You poisoned ' + s.names[picks[0]] + '.');
        break;
      case 'monk':
        if (ok) s.monk = picks[0];
        msg(s, seat, 'done', 'You protect ' + s.names[picks[0]] + ' tonight.');
        break;
      case 'butler':
        s.butlerMaster = ok ? picks[0] : -1;
        msg(s, seat, 'done', 'Your master is ' + s.names[picks[0]] + '.');
        break;
      case 'imp': {
        let x = picks[0];
        msg(s, seat, 'done', 'You attacked ' + s.names[x] + '.');
        if (!ok || !s.alive[x]) break;
        if (x === seat) { s.killedTonight.push(x); kill(s, x, 'self'); break; }
        // a Mayor the Monk protects doesn't die, so nobody dies in their place
        if (s.roles[x] === 'mayor' && sober(s, x) && x !== s.monk && rnd(s) < 0.5) {
          const alt = [...Array(s.n).keys()].filter(i => s.alive[i] && i !== x && i !== seat);
          if (alt.length) x = pick(s, alt);
        }
        if (x === s.monk) break;
        if (s.roles[x] === 'soldier' && sober(s, x)) break;
        s.killedTonight.push(x); kill(s, x, 'night');
        break;
      }
      case 'fortuneteller': giveInfo(s, seat, 'fortuneteller', picks); break;
      case 'ravenkeeper': giveInfo(s, seat, 'ravenkeeper', picks); break;
    }
  }

  // ------------------------------------------------------------------ day
  function startDay(s) {
    s.t++;
    s.stage = 'day';
    s.executedToday = -1;
    const dead = s.killedTonight.filter(i => !s.alive[i]);
    log(s, label(s.t) + ' begins. ' + (dead.length ? dead.map(i => s.names[i]).join(' and ') + ' died in the night.' : 'Nobody died.'), { kind: 'dawn', dead });
    s.day = { nominators: [], nominees: [], vote: null, top: 0, block: -1, history: [] };
    checkWin(s);
  }

  function threshold(s) { return Math.ceil(aliveCount(s) / 2); }

  function closeVote(s) {
    const v = s.day.vote;
    if (!v) return;
    let yes = 0;
    const voters = [];
    for (const k in v.votes) {
      const i = +k;
      if (!v.votes[k]) continue;
      // the Butler (sober) only counts if their master votes yes too
      if (s.roles[i] === 'butler' && sober(s, i) && s.butlerMaster >= 0 && s.butlerMaster !== i && !v.votes[s.butlerMaster]) continue;
      if (!s.alive[i]) { if (!s.ghost[i]) continue; s.ghost[i] = false; }
      yes++; voters.push(i);
    }
    const need = threshold(s);
    let result;
    if (yes >= need && yes > s.day.top) { s.day.top = yes; s.day.block = v.on; result = 'on the block'; }
    else if (yes >= need && yes === s.day.top) { s.day.block = -1; result = 'tied: nobody is on the block'; }
    else result = 'not enough';
    s.day.history.push({ by: v.by, on: v.on, yes, voters, need });
    log(s, s.names[v.on] + ' got ' + yes + ' vote' + (yes === 1 ? '' : 's') + ' (needs ' + need + '): ' + result + '.', { kind: 'tally', on: v.on, yes, voters });
    s.day.vote = null;
  }

  function endDay(s) {
    if (s.day.vote) closeVote(s);
    const x = s.day.block;
    if (x >= 0) {
      log(s, who(s, x, 'is', 'are') + ' executed.', { kind: 'exec', seat: x });
      s.executedToday = x;
      if (s.roles[x] === 'saint' && s.alive[x] && sober(s, x)) { s.alive[x] = false; s.deaths.push({ seat: x, t: s.t, how: 'exec' }); return end(s, 'evil', 'The Saint was executed.'); }
      kill(s, x, 'exec');
    } else {
      log(s, 'Nobody is executed today.', { kind: 'noexec' });
      const mayor = s.roles.findIndex((r, i) => r === 'mayor' && s.alive[i]);
      if (aliveCount(s) === 3 && mayor >= 0 && sober(s, mayor)) return end(s, 'good', 'Three players left, no execution, and the Mayor lives.');
    }
    if (s.winner) return;
    s.t++;
    log(s, label(s.t) + ' begins.', { kind: 'dusk' });
    startNight(s);
  }

  // ------------------------------------------------------------------ apply
  function apply(state, a) {
    const s = clone(state);
    const err = e => { s.error = e; return s; };
    s.error = null;
    if (s.winner) return err('The game is over.');
    const seat = a.seat;
    switch (a.type) {
      case 'choose': {
        const p = s.pending;
        if (!p || p.seat !== seat) return err('Not your turn to choose.');
        const picks = (a.picks || []).map(x => x | 0);
        if (picks.length !== p.picks || picks.some(x => x < 0 || x >= s.n)) return err('Pick ' + p.picks + ' player' + (p.picks > 1 ? 's' : '') + '.');
        if (p.notSelf && picks.includes(seat)) return err('You can\'t pick yourself.');
        if (p.picks === 2 && picks[0] === picks[1]) return err('Pick two different players.');
        s.pending = null;
        resolveChoice(s, p, picks);
        advance(s);
        break;
      }
      case 'claim': {
        if (s.stage !== 'day') return err('Claims are made by day.');
        if (!ROLES[a.role]) return err('Unknown role.');
        s.claims[seat] = { role: a.role, t: s.t };
        const info = (a.info || []).filter(x => x && x.kind);
        for (const x of info) s.shared.push(Object.assign({}, x, { giver: seat }));
        log(s, who(s, seat, 'says they are', 'say you are') + ' the ' + nm(a.role) + '.' + (info.length ? ' ' + info.map(x => describe(s, x)).join(' ') : ''), { kind: 'claim', seat, role: a.role, info });
        break;
      }
      case 'share': {
        if (s.stage !== 'day') return err('Share info by day.');
        const info = (a.info || []).filter(x => x && x.kind);
        for (const x of info) s.shared.push(Object.assign({}, x, { giver: seat }));
        if (info.length) log(s, s.names[seat] + ': ' + info.map(x => describe(s, x)).join(' '), { kind: 'share', seat, info });
        break;
      }
      case 'nominate': {
        const d = s.day;
        if (s.stage !== 'day') return err('Nominations happen by day.');
        if (d.vote) return err('A vote is open.');
        if (!s.alive[seat]) return err('Dead players can\'t nominate.');
        if (d.nominators.includes(seat)) return err('You already nominated today.');
        const x = a.target | 0;
        if (x < 0 || x >= s.n) return err('Pick a player.');
        if (d.nominees.includes(x)) return err(s.names[x] + ' was already nominated today.');
        d.nominators.push(seat); d.nominees.push(x);
        log(s, who(s, seat, 'nominates', 'nominate') + ' ' + s.names[x] + '.', { kind: 'nom', by: seat, on: x });
        if (s.roles[x] === 'virgin' && s.alive[x] && !s.virginUsed) {
          s.virginUsed = true;
          const tf = typeOf(s.roles[seat]) === 'T' || (s.roles[seat] === 'spy' && rnd(s) < 0.5);
          if (sober(s, x) && tf) {
            log(s, who(s, seat, 'is', 'are') + ' executed at once!', { kind: 'exec', seat, virgin: true });
            s.executedToday = seat;
            kill(s, seat, 'exec');
            if (s.winner) return s;
            s.t++;
            log(s, label(s.t) + ' begins.', { kind: 'dusk' });
            startNight(s);
            return s;
          }
        }
        d.vote = { by: seat, on: x, votes: {} };
        break;
      }
      case 'vote': {
        const v = s.day && s.day.vote;
        if (!v) return err('No vote is open.');
        if (!s.alive[seat] && !s.ghost[seat] && a.yes) return err('Your ghost vote is used.');
        v.votes[seat] = !!a.yes;
        break;
      }
      case 'close': closeVote(s); break;
      case 'slay': {
        if (s.stage !== 'day') return err('Only by day.');
        if (!s.alive[seat]) return err('Dead players can\'t.');
        const x = a.target | 0;
        log(s, who(s, seat, 'tries', 'try') + ' to slay ' + s.names[x] + '.', { kind: 'slay', by: seat, on: x });
        const real = s.roles[seat] === 'slayer' && !s.slayerUsed;
        if (s.roles[seat] === 'slayer' || s.thinks[seat] === 'slayer') s.slayerUsed = s.slayerUsed || s.roles[seat] === 'slayer';
        const hit = real && sober(s, seat) && s.alive[x] && (s.roles[x] === 'imp' || (s.roles[x] === 'recluse' && rnd(s) < 0.5));
        if (hit) { log(s, who(s, x, 'dies', 'die') + '!', { kind: 'slaydeath', seat: x }); kill(s, x, 'slayer'); }
        else log(s, 'Nothing happens.', { kind: 'slaymiss' });
        break;
      }
      case 'endDay':
        if (s.stage !== 'day') return err('It is not day.');
        endDay(s);
        break;
      default: return err('Unknown action.');
    }
    s.version++;
    return s;
  }

  function describe(s, x) {
    const N = i => s.names[i];
    switch (x.kind) {
      case 'washerwoman': case 'investigator': return 'N1: ' + N(x.a) + ' or ' + N(x.b) + ' is the ' + nm(x.shown) + '.';
      case 'librarian': return x.none ? 'N1: no Outsiders.' : 'N1: ' + N(x.a) + ' or ' + N(x.b) + ' is the ' + nm(x.shown) + '.';
      case 'chef': return 'N1: ' + x.count + ' evil pair' + (x.count === 1 ? '' : 's') + '.';
      case 'empath': return 'N' + Math.ceil(x.t / 2) + ': ' + x.count + ' evil neighbour' + (x.count === 1 ? '' : 's') + '.';
      case 'fortuneteller': return 'N' + Math.ceil(x.t / 2) + ': ' + N(x.a) + ' + ' + N(x.b) + ' = ' + (x.yes ? 'yes' : 'no') + '.';
      case 'undertaker': return 'N' + Math.ceil(x.t / 2) + ': ' + N(x.seat) + ' was the ' + nm(x.shown) + '.';
      case 'ravenkeeper': return N(x.seat) + ' is the ' + nm(x.shown) + '.';
      default: return '';
    }
  }

  // ------------------------------------------------------------------ view (what one seat may see)
  // seat: a seat number, -1 = spectator, 'st' = Storyteller (everything)
  function view(s, seat) {
    const v = {
      n: s.n, names: s.names, kinds: s.kinds, alive: s.alive, ghost: s.ghost, t: s.t, stage: s.stage,
      claims: s.claims, shared: s.shared, pub: s.pub, deaths: s.deaths, day: s.day, winner: s.winner, winReason: s.winReason,
      version: s.version, seat, threshold: threshold(s), waitingFor: s.pending ? (s.stage === 'night' ? 'night' : null) : null,
    };
    if (seat === 'st' || s.winner) {
      v.roles = s.roles; v.evil = s.evil; v.thinks = s.thinks; v.redHerring = s.redHerring; v.bluffs = s.bluffs; v.poisoned = s.poisoned;
    }
    if (seat === 'st') { v.priv = s.priv; v.pending = s.pending; }
    else if (typeof seat === 'number' && seat >= 0) {
      v.me = { seat, role: s.thinks[seat], evil: s.evil[seat], priv: s.priv[seat] };
      if (s.evil[seat]) {
        // the evil team know each other (7+ players); the Demon knows the bluffs
        if (s.n >= 7) v.me.team = [...Array(s.n).keys()].filter(i => s.evil[i]).map(i => ({ seat: i, role: typeOf(s.roles[i]) === 'D' ? 'imp' : (seat === i ? s.roles[i] : null), demon: s.roles[i] === 'imp' }));
        if (s.roles[seat] === 'imp') v.me.bluffs = s.bluffs;
      }
      if (s.pending && s.pending.seat === seat) v.pending = s.pending;
    }
    return clone(v);
  }

  // who must act right now (for the driver: bots act, people get asked)
  function needs(s) {
    if (s.winner) return [];
    if (s.stage === 'night' && s.pending) return [s.pending.seat];
    return [];
  }

  // Public record in the solver's format (claims + shared info + deaths)
  function solverInput(v, meSeat) {
    const claims = v.claims.map(c => (c ? c.role : null));
    const infos = [];
    for (const x of v.shared) {
      const e = Object.assign({}, x);
      if (e.kind === 'washerwoman' || e.kind === 'librarian' || e.kind === 'investigator' || e.kind === 'chef') e.t = 1;
      infos.push(e);
    }
    const deaths = v.deaths.map(d => ({ seat: d.seat, t: d.t, how: d.how === 'self' ? 'night' : d.how }));
    if (meSeat != null && meSeat >= 0 && v.me) {
      claims[meSeat] = v.me.role;
      for (const p of v.me.priv) if (p.kind === 'info' && p.data && p.data.kind !== 'spy' && !v.shared.some(x => x.giver === meSeat && x.kind === p.data.kind && x.t === p.data.t)) infos.push(Object.assign({}, p.data, { giver: meSeat }));
    }
    return { n: v.n, claims, infos, deaths, me: meSeat != null ? meSeat : -1 };
  }

  const api = { createGame, apply, view, needs, solverInput, describe, label, isNight, TB_T, TB_O, TB_M, rnd, pick, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { engine: api });
})(typeof window !== 'undefined' ? window : globalThis);
