// Clocktower: notebook + Demon odds, a full Trouble Brewing game vs computer players,
// a Storyteller grimoire and the role reference. One state object, render() writes HTML,
// one delegated click handler (data-act).
(function () {
  'use strict';
  const CT = window.CT;
  const { ROLES, rolesOf, TYPE_NAME, adjustedCounts, nightOrder } = CT;
  const art = CT.art, E = CT.engine, B = CT.bots, SV = CT.solver;
  const KEY = 'clocktower:v1';
  const BUILD = 'v1.0 · 2026-10-19';
  const NAMES = ['Ann', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jo', 'Kai', 'Lea', 'Max', 'Nia', 'Oz'];
  const TB = rolesOf('tb');
  const INFO_KINDS = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper', 'slayer', 'virgin'];
  const FIRST_ONLY = new Set(['washerwoman', 'librarian', 'investigator', 'chef']);
  const DAY_KINDS = new Set(['slayer', 'virgin']);

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, type) => art.roleIcon(id, type || (ROLES[id] && ROLES[id].type));
  const rname = id => (ROLES[id] ? ROLES[id].name : '');
  const rtype = id => (ROLES[id] ? ROLES[id].type : '');
  const pct = p => (p >= 0.995 ? '100%' : p < 0.005 && p > 0 ? '<1%' : Math.round(p * 100) + '%');
  // red (likely Demon) -> green (unlikely); tight range: 50%+ is full red
  const heat = p => 'hsl(' + Math.round(130 * (1 - Math.min(1, p / 0.5))) + ',72%,58%)';
  const phaseLabel = t => E.label(t);
  const isNight = t => t % 2 === 1;

  // ------------------------------------------------------------------ state
  function defNb(n) {
    return { n, names: NAMES.slice(0, n), claims: Array(n).fill(null), sure: Array(n).fill(null), me: 0, meMayBeDrunk: true, t: 1, deaths: [], noms: [], infos: [], notes: Array(n).fill(''), nextId: 1 };
  }
  function defSt() { return { n: 8, script: 'tb', chosen: [], gf: -1, seats: null, bluffs: [], view: 'setup', first: true }; }
  let state = { v: 1, tab: 'town', townView: 'circle', nb: defNb(8), practice: null, st: defSt(), play: null, playSetup: { n: 8, level: 'hard' }, rolesScript: 'tb', rolesQ: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1 && s.nb) state = Object.assign(state, s); }
  } catch (e) { /* private mode: start fresh */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ } }

  // ------------------------------------------------------------------ solver worker
  let worker = null;
  try { worker = new Worker('js/worker.js?v=3'); } catch (e) { worker = null; }
  const pending = {};
  let seq = 0;
  function runSolve(tag, input, cb) {
    const id = ++seq;
    pending[tag] = { id, cb };
    if (worker) worker.postMessage({ id, tag, input });
    else setTimeout(() => done({ id, tag, r: SV.solve(input) }), 0);
  }
  function done(d) {
    const p = pending[d.tag];
    if (!p || p.id !== d.id) return;
    delete pending[d.tag];
    p.cb(d.r);
  }
  if (worker) {
    worker.onmessage = e => done(e.data);
    worker.onerror = () => { worker = null; Object.keys(pending).forEach(k => { const p = pending[k]; delete pending[k]; }); nbOddsKey = ''; requestNbOdds(); };
  }

  // notebook odds
  let nbOdds = null, nbOddsKey = '', nbBusy = false;
  function nbInput(nb) {
    return {
      n: nb.n, claims: nb.claims, sure: nb.sure, me: nb.me, meMayBeDrunk: nb.meMayBeDrunk,
      deaths: nb.deaths.map(d => ({ seat: d.seat, t: d.t, how: d.how })),
      infos: nb.infos.map(x => Object.assign({}, x)),
    };
  }
  function requestNbOdds() {
    const input = nbInput(state.nb);
    const key = JSON.stringify(input);
    if (key === nbOddsKey) return;
    nbOddsKey = key; nbBusy = true;
    runSolve('nb', input, r => { nbOdds = r; nbBusy = false; if (state.tab === 'town' || state.tab === 'odds') render(); });
  }

  // ------------------------------------------------------------------ rendering helpers
  function ring(o) {
    // o: { n, tokens:[{seat, cls, ic, type, name, cl, badge, extra}], center }
    const n = o.n;
    const size = Math.min(15, 150 / n);
    let h = '<div class="ring" style="--ts:' + size + 'cqw">';
    for (const t of o.tokens) {
      const a = (-90 + (360 * t.seat) / n) * Math.PI / 180;
      const x = 50 + 39 * Math.cos(a), y = 50 + 37.5 * Math.sin(a);
      h += '<button class="tok t-' + (t.type || 'x') + ' ' + (t.cls || '') + '" style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;width:' + size + 'cqw;height:' + size + 'cqw" data-act="' + o.act + '" data-seat="' + t.seat + '" aria-label="' + esc(t.name) + '">' +
        '<span class="ic">' + t.ic + '</span>' +
        (t.cl ? '<span class="cl">' + esc(t.cl) + '</span>' : '') +
        '<span class="nm">' + esc(t.name) + '</span>' +
        (t.badge ? '<span class="badge" style="background:' + t.badge.color + '">' + t.badge.text + '</span>' : '') +
        (t.dead ? '<span class="shroud">' + art.roleIcon('dead') + '</span>' : '') +
        (t.extra || '') + '</button>';
    }
    h += '<div class="center">' + (o.center || '') + '</div></div>';
    return '<div class="ringbox">' + h + '</div>';
  }
  function seg(act, items, cur, extra) {
    return '<div class="seg ' + (extra || '') + '">' + items.map(([v, l]) => '<button data-act="' + act + '" data-v="' + v + '" class="' + (String(cur) === String(v) ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  }
  const helpBtn = key => '<button class="help" data-act="help" data-k="' + key + '" aria-label="Why?">?</button>';
  const sw = (act, on, extra) => '<button class="switch ' + (on ? 'on' : '') + '" data-act="' + act + '" ' + (extra || '') + ' role="switch" aria-checked="' + !!on + '"></button>';

  const HELP = {
    odds: ['How the odds work', 'Every possible line-up (who is the Imp, which Minion each evil player is, who is the Drunk) is checked against everything you logged. Line-ups that can\'t be true are dropped. The rest are weighed: good players claim their real role and give true info unless they are the Drunk or were poisoned; evil players can claim anything and make info up. A reading that matches is worth more than a made-up one, and every poisoning a line-up needs makes it less likely (×¼). The Spy and Recluse may show up either way. Odds are each player\'s share of the weighted line-ups.'],
    drunk: ['Could you be the Drunk?', 'The Drunk is told a Townsfolk role. If your role is a Townsfolk you can\'t be sure your info is right, so leave this on unless you know the Drunk isn\'t in play.'],
    sure: ['Sure good / evil', 'Use this when the game proved it (e.g. a Slayer shot or the Virgin). The odds then only keep line-ups that agree.'],
    level: ['Computer levels', 'Easy players vote and nominate mostly at random. Hard good players vote with the same odds you see; hard evil players bluff quiet roles, fake info, frame the most-suspected good player and kill trusted info roles.'],
    strong: ['How strong?', 'Measured by playing all-computer games of 8 players (200 per pairing): hard good beat hard evil 59% of the time; easy good beat hard evil 3%; hard good beat easy evil 60%; easy vs easy 10%. So the hard level matters most on the good side: it votes with the odds. At the end of each day the odds (from public claims only) put the real Demon at 19% on average, against 16% for a blind guess; good evil bluffs make the Demon hard to find.'],
    online: ['Online', 'Create a room and share its code. Friends open this page, tap Play and join. Any seat nobody takes is played by a computer, and the computer is always the Storyteller. Each player sees only their own role and info. The day ends when everyone has tapped End day.'],
    practice: ['Practice', 'A computer Storyteller plays a game with computer players, then hands you the town notebook as one good player would see it. Work out the Demon, then tap Reveal to see everyone\'s real role.'],
    counts: ['Setup counts', 'Players 5–15 set how many Townsfolk, Outsiders, Minions and the one Demon are in play. Some roles change the Outsider count: Baron +2, Godfather +1 or −1, Fang Gu +1, Vigormortis −1. Townsfolk fill the rest.'],
    vote: ['Votes', 'A player goes on the block with at least half the living players voting yes (rounded up), and more votes than anyone so far today. A tie takes everyone off. Dead players have one vote left for the whole game.'],
  };

  // ------------------------------------------------------------------ top-level render
  function render() {
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + state.tab));
    $('#headMid').innerHTML = '';
    if (state.tab === 'town') renderTown();
    else if (state.tab === 'odds') renderOdds();
    else if (state.tab === 'play') renderPlay();
    else if (state.tab === 'st') renderSt();
    else if (state.tab === 'roles') renderRoles();
    if (state.tab === 'town' || state.tab === 'odds') requestNbOdds();
  }

  // ------------------------------------------------------------------ TOWN (notebook)
  function topSuspect(odds, n, alive) {
    if (!odds || odds.error) return -1;
    let b = -1, bv = -1;
    for (let i = 0; i < n; i++) if ((!alive || alive[i]) && odds.pDemon[i] > bv) { bv = odds.pDemon[i]; b = i; }
    return b;
  }
  function nbDead(nb) { const d = Array(nb.n).fill(null); for (const x of nb.deaths) if (!d[x.seat]) d[x.seat] = x; return d; }

  function renderTown() {
    const nb = state.nb;
    const dead = nbDead(nb);
    const odds = nbOdds && !nbBusy ? nbOdds : nbOdds;
    const top = topSuspect(odds, nb.n, dead.map(d => !d));
    const P = state.practice;
    const tokens = [];
    for (let i = 0; i < nb.n; i++) {
      const c = nb.claims[i];
      const revealed = P && P.revealed;
      const showRole = revealed ? P.truth.roles[i] : c;
      const p = odds && !odds.error ? odds.pDemon[i] : 0;
      tokens.push({
        seat: i, type: showRole ? rtype(showRole) : '', ic: showRole ? icon(showRole) : art.tokenIcon('T').replace('currentColor', '#3a4260'),
        name: nb.names[i], cl: revealed ? (c && c !== showRole ? 'said ' + rname(c) : rname(showRole)) : (c ? rname(c) : ''),
        cls: (i === nb.me ? 'me ' : '') + (dead[i] ? 'dead ' : '') + (nb.sure[i] ? 'sure-' + nb.sure[i] + ' ' : '') + (i === top && !revealed && p > 0 ? 'top' : ''),
        dead: !!dead[i],
        badge: odds && !odds.error && i !== nb.me && !revealed && !dead[i] ? { text: pct(p), color: heat(p) } : null,
      });
    }
    let center;
    if (P && P.revealed) {
      const d = P.truth.roles.indexOf('imp');
      center = '<div class="lbl">The Demon was</div><div class="big c-D">' + esc(nb.names[d]) + '</div><div class="sub">Odds had them at ' + pct(P.oddsAtReveal != null ? P.oddsAtReveal : 0) + '</div>';
    } else if (!odds || (nbBusy && !odds)) center = '<div class="lbl">Thinking</div><div class="dots"><i></i><i></i><i></i></div>';
    else if (odds.error) center = '<div class="lbl c-D">Nothing fits</div><div class="sub">' + esc(odds.error) + '</div>';
    else center = '<button data-act="tab" data-tab="odds" style="width:100%"><div class="lbl">Demon?</div><div class="big">' + esc(nb.names[top]) + '</div><div class="pct" style="color:' + heat(odds.pDemon[top]) + '">' + pct(odds.pDemon[top]) + '</div><div class="sub">' + odds.lineups.toLocaleString() + ' line-ups fit</div></button>';

    $('#headMid').innerHTML = '<div class="stepper"><button data-act="phase" data-d="-1" aria-label="Earlier">‹</button><span>' + phaseLabel(nb.t) + '</span><button data-act="phase" data-d="1" aria-label="Later">›</button></div>';
    const banner = P ? '<div class="banner"><span class="grow"><b>Practice</b> · ' + (P.revealed ? 'Roles revealed.' : 'Who is the Demon?') + '</span>' +
      (P.revealed ? '<button class="btn small" data-act="practice-exit">Back to my game</button>' : '<button class="btn small warm" data-act="practice-reveal">Reveal</button>') + helpBtn('practice') + '</div>' : '';
    $('#v-town').innerHTML = banner +
      '<div class="townbar phone-only-row">' + seg('townview', [['circle', 'Circle'], ['log', 'Log']], state.townView, 'phone-only') + '</div>' +
      '<div class="split show-' + state.townView + '">' +
      '<div class="ringcol">' + ring({ n: nb.n, tokens, center, act: 'seat' }) +
      '<div class="actions"><button class="btn" data-act="form" data-f="nom">' + plus() + 'Vote</button><button class="btn" data-act="form" data-f="death">' + plus() + 'Death</button><button class="btn" data-act="form" data-f="info">' + plus() + 'Info</button></div></div>' +
      '<div class="side nb-log"><div class="row"><h2 class="sec grow">Log</h2></div><div class="scroll grow" id="logScroll">' + logHTML(nb) + '</div></div>' +
      '</div>';
  }
  const plus = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const xIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function infoText(nb, x) {
    const N = i => nb.names[i] || '?';
    switch (x.kind) {
      case 'slayer': return 'shot ' + N(x.seat) + (x.died ? ': they died.' : ': nothing happened.');
      case 'virgin': return 'nominated by ' + N(x.seat) + (x.executed ? ': ' + N(x.seat) + ' was executed at once.' : ': nothing happened.');
      default: return E.describe({ names: nb.names }, x).replace(/^N\d+: /, '');
    }
  }
  function logHTML(nb) {
    const items = [];
    for (const x of nb.noms) items.push({ t: x.t, id: x.id, kind: 'nom', x });
    for (const x of nb.deaths) if (!x.nomId && !x.infoId) items.push({ t: x.t, id: x.id, kind: 'death', x });
    for (const x of nb.infos) items.push({ t: x.t, id: x.id, kind: 'info', x });
    if (!items.length) return '<div class="muted small" style="padding:10px 2px">Nothing logged yet. Tap a player to set their claim, or add a vote, death or info.</div>';
    items.sort((a, b) => a.t - b.t || a.id - b.id);
    let h = '', lastT = -1;
    for (const it of items) {
      if (it.t !== lastT) { h += '<div class="phase-h">' + phaseLabel(it.t) + '</div>'; lastT = it.t; }
      let ic, txt;
      if (it.kind === 'nom') {
        const x = it.x;
        ic = art.roleIcon('vote');
        txt = '<b>' + esc(nb.names[x.by]) + '</b> nominated <b>' + esc(nb.names[x.on]) + '</b> · ' + x.voters.length + ' vote' + (x.voters.length === 1 ? '' : 's') +
          (x.voters.length ? ' <span class="muted small">(' + x.voters.map(v => esc(nb.names[v])).join(', ') + ')</span>' : '') + (x.exec ? ' · <b class="c-D">executed</b>' : '');
      } else if (it.kind === 'death') {
        ic = art.roleIcon('dead');
        txt = '<b>' + esc(nb.names[it.x.seat]) + '</b> died' + ({ exec: ' (executed)', night: ' in the night', slayer: ' (Slayer)', other: '' }[it.x.how] || '');
      } else {
        const x = it.x;
        ic = icon(x.kind);
        txt = '<b>' + esc(nb.names[x.giver]) + '</b> <span class="muted">' + rname(x.kind) + '</span> ' + esc(infoText(nb, x));
      }
      h += '<div class="li"><span class="ic c-' + (it.kind === 'info' ? rtype(it.x.kind) : 'M') + '">' + ic + '</span><span class="grow small">' + txt + '</span><button class="x" data-act="del" data-kind="' + it.kind + '" data-id="' + it.id + '" aria-label="Delete">' + xIcon + '</button></div>';
    }
    return '<div class="list">' + h + '</div>';
  }

  // ------------------------------------------------------------------ ODDS
  function renderOdds() {
    const nb = state.nb, odds = nbOdds;
    const dead = nbDead(nb);
    let h = '<div class="row"><h2 class="sec grow">Who is the Demon?</h2>' + helpBtn('odds') + '</div>';
    if (!odds) { $('#v-odds').innerHTML = h + '<div class="muted">Working it out <span class="dots"><i></i><i></i><i></i></span></div>'; return; }
    if (odds.error) h += '<div class="banner evil">' + esc(odds.error) + '</div>';
    h += '<div class="small muted">' + odds.lineups.toLocaleString() + ' line-ups fit · ' + (odds.ms / 1000).toFixed(1) + ' s' + (nbBusy ? ' · updating…' : '') + '</div>';
    let rows = '<div class="ohead"><span></span><span>Player</span><span>Demon</span><span>Evil</span></div>';
    for (let i = 0; i < nb.n; i++) {
      const c = nb.claims[i];
      const pd = odds.pDemon[i] || 0, pe = odds.pEvil[i] || 0;
      rows += '<div class="orow" style="' + (dead[i] ? 'opacity:.55' : '') + '"><span class="ic c-' + (c ? rtype(c) : 'T') + '">' + (c ? icon(c) : art.tokenIcon('T')) + '</span>' +
        '<span style="min-width:0"><b>' + esc(nb.names[i]) + '</b>' + (i === nb.me ? ' <span class="tiny muted">you</span>' : '') + '<br><span class="tiny muted">' + (c ? rname(c) : 'no claim') + (dead[i] ? ' · dead' : '') + '</span></span>' +
        '<div class="bar"><i style="width:' + (pd * 100) + '%;background:' + heat(pd) + '"></i><b>' + pct(pd) + '</b></div>' +
        '<div class="bar"><i style="width:' + (pe * 100) + '%;background:' + heat(pe * 0.6) + '"></i><b>' + pct(pe) + '</b></div></div>';
    }
    let teams = '<h2 class="sec">Likely evil teams</h2><div class="list">';
    for (const tm of odds.topTeams.slice(0, 6)) {
      teams += '<div class="team"><span class="p" style="color:' + heat(tm.p) + '">' + pct(tm.p) + '</span><span class="small grow">' +
        '<span class="c-D">Imp</span> ' + esc(nb.names[tm.now]) + (tm.now !== tm.demon ? ' <span class="muted">(was ' + esc(nb.names[tm.demon]) + ')</span>' : '') +
        tm.minions.filter(m => m[0] !== tm.now).map(m => ' · <span class="c-M">' + rname(m[1]) + '</span> ' + esc(nb.names[m[0]])).join('') +
        (tm.drunk >= 0 ? ' · <span class="c-O">Drunk</span> ' + esc(nb.names[tm.drunk]) : '') + '</span></div>';
    }
    teams += '</div>';
    const drunks = odds.pDrunk.map((p, i) => [p, i]).filter(x => x[0] >= 0.05).sort((a, b) => b[0] - a[0]);
    if (drunks.length) teams += '<h2 class="sec" style="margin-top:8px">Maybe the Drunk</h2><div class="chips">' + drunks.map(([p, i]) => '<span class="chip">' + esc(nb.names[i]) + ' ' + pct(p) + '</span>').join('') + '</div>';
    $('#v-odds').innerHTML = h + '<div class="oddsgrid"><div class="scroll">' + rows + '</div><div class="scroll side">' + teams + '</div></div>';
  }

  // ------------------------------------------------------------------ PLAY (vs computer)
  let playTimer = null, pubCache = new Map(), myOdds = null, myOddsKey = '';
  function oddsFor(g) {
    const k = B.oddsKey(g);
    if (pubCache.has(k)) return pubCache.get(k);
    return undefined;
  }
  function requestPub(g) {
    const k = B.oddsKey(g);
    if (pending.pub && pending.pub.key === k) return;
    runSolve('pub', E.solverInput(E.view(g, -1), -1), r => { pubCache.set(k, r); if (pubCache.size > 40) pubCache.delete(pubCache.keys().next().value); scheduleTick(60); });
    pending.pub.key = k;
  }
  // where the game on screen comes from: a local game vs computers, or an online room
  let ON = null; // { room, snap, ui }
  function src() {
    if (ON && ON.snap && ON.snap.pub && ON.snap.mine) {
      const s = ON.snap;
      return { online: true, me: s.mySeat, ui: ON.ui, v: Object.assign({}, s.pub, s.mine, { seat: s.mySeat, pending: s.mine.pending || undefined }) };
    }
    const P = state.play;
    if (!P) return null;
    return { online: false, me: P.me, ui: P, v: E.view(P.g, P.me) };
  }
  function requestMine() {
    const S = src(); if (!S) return;
    const v = S.v;
    const input = E.solverInput(v, v.me.evil ? -1 : S.me);
    const key = JSON.stringify(input);
    if (key === myOddsKey) return;
    myOddsKey = key;
    runSolve('mine', input, r => { myOdds = r; if (state.tab === 'play') renderPlay(); });
  }
  function scheduleTick(ms) { clearTimeout(playTimer); playTimer = setTimeout(tick, ms); }
  function tick() {
    const P = state.play;
    if (ON) { scheduleTick(1500); return; }
    if (!P || P.g.winner) return;
    const ctx = { humans: new Set([P.me]), mem: P.mem, rng: Math.random, levels: P.levels, oddsFor };
    const before = P.g;
    const r = B.step(P.g, ctx);
    if (r.needOdds) { requestPub(P.g); return; }
    if (r.acted) {
      // remember what my odds said about every seat at the end of each day
      if (before.stage === 'day' && r.state.stage !== 'day' && myOdds && !myOdds.error) P.hist.push({ t: before.t, p: myOdds.pDemon.slice() });
      P.g = r.state; save();
      if (state.tab === 'play') renderPlay();
      requestMine();
      scheduleTick(r.state.stage === 'night' ? 260 : 520);
    } else if (state.tab === 'play') renderPlay();
  }
  function startPlay() {
    const S = state.playSetup;
    const n = S.n;
    const me = Math.floor(Math.random() * n);
    const names = NAMES.slice(0, n).map((x, i) => (i === me ? 'You' : x));
    const g = E.createGame({ n, names, kinds: names.map((x, i) => (i === me ? 'you' : 'bot')), seed: (Math.random() * 2 ** 31) | 0 });
    state.play = { g, me, levels: Array(n).fill(S.level), mem: {}, sel: [], mode: null, hist: [] };
    myOdds = null; myOddsKey = ''; pubCache = new Map();
    save(); renderPlay(); requestMine(); scheduleTick(400);
  }
  function myAct(a) {
    const S = src();
    if (S && S.online) {
      const ui = ON.ui; ui.sel = []; ui.mode = null;
      ON.room.act(a).then(r => { if (r && !r.ok && r.message) toast(r.message); });
      renderPlay(); return;
    }
    const P = state.play;
    const ns = E.apply(P.g, Object.assign({ seat: P.me }, a));
    if (ns.error) { toast(ns.error); return; }
    if (P.g.stage === 'day' && ns.stage !== 'day' && myOdds && !myOdds.error) P.hist.push({ t: P.g.t, p: myOdds.pDemon.slice() });
    P.g = ns; P.sel = []; P.mode = null;
    save(); renderPlay(); requestMine(); scheduleTick(300);
  }

  function renderPlay() {
    const SRC = src();
    if (ON && (!SRC || !SRC.online)) { renderLobby(); return; }
    if (!SRC) {
      const S = state.playSetup;
      $('#v-play').innerHTML = '<div class="scroll grow"><div class="panel" style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:14px">' +
        '<div class="row"><span style="width:44px;height:44px;color:var(--dem)">' + icon('imp') + '</span><div class="grow"><b style="font-size:18px">Trouble Brewing</b><div class="small muted">The computer is the Storyteller. Other seats are computers or friends online.</div></div></div>' +
        '<div class="row"><span class="grow">Players</span><div class="stepper"><button data-act="ps-n" data-d="-1">−</button><span>' + S.n + '</span><button data-act="ps-n" data-d="1">+</button></div></div>' +
        '<div class="row"><span class="grow">Computer level ' + helpBtn('level') + '</span>' + seg('ps-level', [['easy', 'Easy'], ['hard', 'Hard']], S.level) + '</div>' +
        '<button class="btn primary" data-act="play-start">Play vs computers</button>' +
        '<h2 class="sec" style="margin-top:4px">Online ' + helpBtn('online') + '</h2>' +
        '<input type="text" id="onName" placeholder="Your name" maxlength="14" autocomplete="off" value="' + esc(S.name || '') + '">' +
        '<div class="row"><button class="btn grow" data-act="on-create">Create room</button></div>' +
        '<div class="row"><input type="text" id="onCode" placeholder="Room code" maxlength="5" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"><button class="btn" data-act="on-join">Join</button></div>' +
        '<div class="row small muted">How strong are the computers? ' + helpBtn('strong') + '</div>' +
        '</div></div>';
      return;
    }
    const P = SRC.ui, me = SRC.me, v = SRC.v, g = v;
    $('#headMid').innerHTML = '<b>' + (g.winner ? 'Game over' : phaseLabel(g.t)) + '</b>';
    const over = !!g.winner;
    const odds = myOdds && !myOdds.error ? myOdds : null;
    const top = topSuspect(odds, g.n, g.alive);
    const tokens = [];
    for (let i = 0; i < g.n; i++) {
      const claim = v.claims[i] && v.claims[i].role;
      const mate = v.me.team && v.me.team.find(x => x.seat === i);
      const isTeam = !!mate;
      const shown = over ? g.roles[i] : (i === me ? v.me.role : (mate && mate.demon && !claim ? 'imp' : claim));
      const p = odds ? odds.pDemon[i] : 0;
      tokens.push({
        seat: i, type: shown ? rtype(shown) : '', ic: shown ? icon(shown) : art.tokenIcon('T').replace('currentColor', '#3a4260'),
        name: g.names[i], cl: over ? (claim && claim !== g.roles[i] ? 'said ' + rname(claim) : rname(g.roles[i])) : (claim ? rname(claim) : ''),
        cls: (i === me ? 'me ' : '') + (!g.alive[i] ? 'dead ' : '') + (P.sel.includes(i) ? 'sel ' : '') + (isTeam && i !== me && !over ? 'sure-evil ' : '') + (i === top && !over && i !== me ? 'top' : ''),
        dead: !g.alive[i], extra: !g.alive[i] && g.ghost[i] ? '<span class="ghost" title="Has a vote"></span>' : '',
        badge: odds && !over && i !== me && g.alive[i] ? { text: pct(p), color: heat(p) } : null,
      });
    }
    let center;
    if (over) center = '<div class="lbl">' + (g.winner === 'good' ? 'Good wins' : 'Evil wins') + '</div><div class="big ' + (g.winner === 'good' ? 'c-T' : 'c-D') + '">' + (g.winner === 'good' ? 'Good' : 'Evil') + '</div><div class="sub">' + esc(g.winReason) + '</div>';
    else if (g.stage === 'night') center = '<div class="lbl">' + phaseLabel(g.t) + '</div><div class="big" style="color:var(--warm)">' + (v.pending ? 'Your move' : 'Sleeping') + '</div>' + (v.pending ? '' : '<div class="dots"><i></i><i></i><i></i></div>');
    else if (g.day && g.day.vote) { const d = g.day.vote; const yes = Object.values(d.votes).filter(Boolean).length; center = '<div class="lbl">Vote</div><div class="big">' + esc(g.names[d.on]) + '</div><div class="sub">' + yes + ' yes · needs ' + v.threshold + '</div>'; }
    else center = '<div class="lbl">' + phaseLabel(g.t) + '</div>' + (g.day.block >= 0 ? '<div class="sub">On the block</div><div class="big c-D">' + esc(g.names[g.day.block]) + '</div>' : (top >= 0 ? '<div class="sub">Demon?</div><div class="big">' + esc(g.names[top]) + '</div><div class="pct" style="color:' + heat(odds.pDemon[top]) + '">' + pct(odds.pDemon[top]) + '</div>' : '<div class="dots"><i></i><i></i><i></i></div>'));

    const r = ROLES[v.me.role];
    let team = '';
    if (v.me.team) team = '<div class="tiny" style="color:var(--min)">Evil team: ' + v.me.team.filter(x => x.seat !== me).map(x => esc(g.names[x.seat]) + (x.demon ? ' (Demon)' : '')).join(', ') + (v.me.bluffs ? ' · Bluffs: ' + v.me.bluffs.map(rname).join(', ') : '') + '</div>';
    const card = '<div class="rolecard"><span class="ic c-' + r.type + '">' + icon(r.id) + '</span><div class="grow"><div class="ttl">You are the ' + r.name + '</div><div class="ab">' + esc(r.ability) + '</div>' + team + '</div></div>';

    // actions
    let act = '';
    if (over) {
      const d = g.roles.indexOf('imp');
      let hist = '';
      if (P.hist.length && d >= 0) hist = '<div class="small muted">' + (g.evil[me] ? 'Town odds on ' : 'Your odds on ') + esc(g.names[d]) + ' (the Demon) each day</div><div class="hist">' + P.hist.map(h => { const p = h.p[d] || 0; return '<div style="height:' + Math.max(4, p * 100) + '%;background:' + heat(p) + '"><span>' + pct(p) + '</span></div>'; }).join('') + '</div>';
      act = '<div class="banner ' + (g.winner === 'good' ? 'good' : 'evil') + '"><b class="grow">' + (g.winner === (g.evil[me] ? 'evil' : 'good') ? 'You win!' : 'You lose.') + '</b><button class="btn small" data-act="' + (SRC.online ? 'on-leave' : 'play-new') + '">' + (SRC.online ? 'Leave room' : 'New game') + '</button></div>' + hist;
    } else if (g.stage === 'night') {
      if (v.pending) {
        const p = v.pending;
        act = '<div class="votebox"><div class="grow"><b>' + esc(p.prompt) + '</b><div class="small muted">' + (P.sel.length ? P.sel.map(i => esc(g.names[i])).join(' + ') : 'Tap ' + (p.picks === 2 ? 'two players' : 'a player') + ' in the circle.') + '</div></div><button class="btn primary" data-act="play-choose" ' + (P.sel.length === p.picks ? '' : 'disabled') + '>Confirm</button></div>';
      } else act = '<div class="votebox" style="border-color:var(--line)"><span class="grow muted">The town sleeps…</span><span class="dots"><i></i><i></i><i></i></span></div>';
    } else if (g.day.vote) {
      const d = g.day.vote;
      const canVote = g.alive[me] || g.ghost[me];
      const mine = d.votes[me];
      act = '<div class="votebox"><div class="grow"><b>' + esc(g.names[d.by]) + ' nominated ' + esc(g.names[d.on]) + '</b><div class="small muted">Needs ' + v.threshold + ' yes ' + helpBtn('vote') + (!g.alive[me] ? ' · ghost vote ' + (g.ghost[me] ? 'left' : 'used') : '') + '</div></div>' +
        (mine === undefined && canVote ? '<button class="btn" data-act="play-vote" data-yes="0">No</button><button class="btn warm" data-act="play-vote" data-yes="1">Yes</button>' : '<span class="small muted">' + (mine === undefined ? 'Waiting' : mine ? 'You voted yes' : 'You voted no') + '</span>') + '</div>';
    } else if (P.mode) {
      act = '<div class="votebox"><span class="grow"><b>' + (P.mode === 'nominate' ? 'Tap a player to nominate' : 'Tap a player to slay') + '</b></span><button class="btn" data-act="play-mode" data-m="">Cancel</button></div>';
    } else {
      const claimed = v.claims[me];
      const unshared = myUnshared(v);
      const amSlayer = v.me.role === 'slayer' && g.alive[me];
      act = '<div class="actbar">' +
        (g.alive[me] ? '<button class="btn" data-act="play-claim">' + (claimed ? 'Claim again' : 'Claim') + '</button>' : '') +
        (g.alive[me] && claimed && unshared.length ? '<button class="btn" data-act="play-share">Share info</button>' : '') +
        (g.alive[me] && !g.day.nominators.includes(me) ? '<button class="btn" data-act="play-mode" data-m="nominate">Nominate</button>' : '') +
        (amSlayer && !P.slayed ? '<button class="btn" data-act="play-mode" data-m="slay">Slay</button>' : '') +
        (SRC.online && v.done && v.done[me] ? '<span class="small muted" style="align-self:center">Waiting for the others…</span>' : '<button class="btn warm" data-act="play-end">End day</button>') + '</div>';
    }
    // feed: public log + my private notes, oldest first
    const feed = [];
    let lastT = 0;
    const merged = g.pub.map((x, i) => ({ t: x.t, o: 0, i, x, pub: true })).concat(v.me.priv.map((x, i) => ({ t: x.t, o: 1, i, x, pub: false })));
    merged.sort((a, b) => a.t - b.t || a.o - b.o || a.i - b.i);
    for (const m of merged) {
      if (m.t !== lastT) { feed.push('<div class="f sys">' + phaseLabel(m.t) + '</div>'); lastT = m.t; }
      if (m.pub && (m.x.kind === 'dusk' || (m.x.kind === 'dawn' && false))) continue;
      feed.push('<div class="f ' + (m.pub ? '' : 'priv') + '">' + esc(m.x.text) + '</div>');
    }
    // update only the parts that changed, so a tap is never lost to a re-render
    const root = $('#v-play');
    if (!root.querySelector('#pCard')) {
      root.innerHTML = '<div id="pCard"></div><div class="split show-circle"><div class="ringcol" id="pRing"></div>' +
        '<div class="side playside"><div id="pAct" style="display:contents"></div><div class="scroll grow feed" id="feed"></div></div></div>';
    }
    const put = (id, html) => { const el = document.getElementById(id); if (el._h !== html) { el.innerHTML = html; el._h = html; return true; } return false; };
    put('pCard', card);
    put('pRing', ring({ n: g.n, tokens, center, act: 'pseat' }));
    put('pAct', act);
    if (put('feed', feed.join(''))) { const f = $('#feed'); f.scrollTop = f.scrollHeight; }
  }
  // ------------------------------------------------------------------ online room (shared _online layer)
  const ONKEY = 'clocktower:online';
  function onLib() { return window.CTOnlineLib || null; }
  function onOpen() {
    if (ON) return ON;
    const lib = onLib();
    if (!lib) { toast('Online is still loading. Try again.'); return null; }
    const room = lib.createOnline({ game: CT.onlineGame, gameId: 'clocktower', botDelayMs: 700 });
    ON = { room, snap: null, ui: { sel: [], mode: null, hist: [], slayed: false } };
    let prev = null;
    room.on('change', snap => {
      if (!ON) return;
      const p = prev && prev.pub;
      if (p && snap.pub && p.stage === 'day' && snap.pub.stage !== 'day' && myOdds && !myOdds.error) ON.ui.hist.push({ t: p.t, p: myOdds.pDemon.slice() });
      prev = snap; ON.snap = snap;
      if (snap.status === 'closed' || snap.status === 'left' || snap.status === 'none') { onDrop(snap.status === 'closed' ? 'The room was closed.' : ''); return; }
      if (state.tab === 'play') renderPlay();
      if (snap.pub && snap.mine) requestMine();
    });
    room.on('error', msg => toast(typeof msg === 'string' ? msg : (msg && msg.message) || 'Online error.'));
    return ON;
  }
  function onDrop(msg) {
    try { localStorage.removeItem(ONKEY); } catch (e) { /* ignore */ }
    ON = null; myOdds = null; myOddsKey = '';
    if (msg) toast(msg);
    if (state.tab === 'play') renderPlay();
  }
  function onName() { const el = $('#onName'); const n = (el ? el.value : state.playSetup.name || '').trim().slice(0, 14); state.playSetup.name = n; save(); return n; }
  function renderLobby() {
    const s = ON && ON.snap;
    let h = '<div class="scroll grow"><div class="panel" style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px">';
    if (!s || s.status === 'joining' || !s.seats) {
      h += '<div class="row"><span class="grow">Connecting</span><span class="dots"><i></i><i></i><i></i></span></div><button class="btn" data-act="on-leave">Cancel</button>';
    } else {
      h += '<div class="small muted">Room code</div><div style="font-size:40px;font-weight:800;letter-spacing:.18em">' + esc(s.code || '') + '</div>' +
        '<div class="small muted">Friends open this page, tap Play, and join with the code. Empty seats become computers.</div><div class="list">';
      s.seats.forEach((x, i) => {
        const kind = x.kind === 'empty' ? 'Empty' : x.kind === 'computer' ? 'Computer' : (x.name || 'Player');
        h += '<div class="li"><span class="grow"><b>' + esc(kind) + '</b>' + (i === s.mySeat ? ' <span class="tiny muted">you</span>' : '') + (x.isHost ? ' <span class="tiny muted">host</span>' : '') + (x.kind === 'human' && !x.online && i !== s.mySeat ? ' <span class="tiny c-D">offline</span>' : '') + '</span>' +
          (s.isHost && x.kind !== 'human' ? '<button class="btn small" data-act="on-seat" data-i="' + i + '" data-k="' + (x.kind === 'empty' ? 'computer' : 'empty') + '">' + (x.kind === 'empty' ? 'Make computer' : 'Open seat') + '</button>' : '') + '</div>';
      });
      h += '</div>' + (s.isHost ? '<button class="btn primary" data-act="on-start">Start game</button>' : '<div class="small muted">Waiting for the host to start…</div>') +
        '<button class="btn" data-act="on-leave">Leave room</button>';
    }
    $('#v-play').innerHTML = h + '</div></div>';
  }
  async function onCreate() {
    const name = onName() || 'Host';
    const o = onOpen(); if (!o) return;
    renderLobby();
    const n = state.playSetup.n;
    const r = await o.room.createRoom({ name, seats: ['human'].concat(Array(n - 1).fill('empty')), options: { level: state.playSetup.level } });
    if (!r.ok) { onDrop(r.message || 'Could not create the room.'); return; }
    try { localStorage.setItem(ONKEY, '1'); } catch (e) { /* ignore */ }
  }
  async function onJoin() {
    const el = $('#onCode'); const code = (el ? el.value : '').trim().toUpperCase();
    if (code.length < 4) { toast('Type the room code.'); return; }
    const name = onName() || 'Guest';
    const o = onOpen(); if (!o) return;
    renderLobby();
    const r = await o.room.joinRoom(code, name);
    if (!r.ok) { onDrop(r.message || 'Could not join.'); return; }
    try { localStorage.setItem(ONKEY, '1'); } catch (e) { /* ignore */ }
  }
  async function onResume() {
    let flag = null; try { flag = localStorage.getItem(ONKEY); } catch (e) { /* ignore */ }
    if (!flag) return;
    const o = onOpen(); if (!o) return;
    const back = await o.room.resume();
    if (!back) onDrop('');
  }
  window.addEventListener('ct-online-ready', () => { onResume(); });
  if (onLib()) onResume();

  function myUnshared(v) {
    const me = v.me.seat;
    return v.me.priv.filter(p => p.kind === 'info' && p.data && p.data.kind !== 'spy' && !v.shared.some(y => y.giver === me && y.kind === p.data.kind && y.t === p.data.t)).map(p => Object.assign({}, p.data));
  }

  // ------------------------------------------------------------------ STORYTELLER / GRIMOIRE
  function stRoles() { return rolesOf(state.st.script); }
  function stCounts() { const st = state.st; return adjustedCounts(st.n, st.chosen, st.gf); }
  function renderSt() {
    const st = state.st;
    const views = [['setup', 'Setup'], ['night', 'Night'], ['grim', 'Grimoire']];
    let h = '<div class="row">' + seg('st-view', views, st.view) + '<span class="grow"></span></div>';
    let main = '';
    if (st.view === 'setup') main = stSetupHTML();
    else if (st.view === 'night') main = stNightHTML();
    else main = stGrimHTML();
    h += '<div class="split" style="flex:1;min-height:0"><div class="ringcol scroll" style="min-height:0">' + main + '</div>' +
      (st.view !== 'night' ? '<div class="side scroll phone-hide">' + stNightHTML() + '</div>' : '') + '</div>';
    $('#v-st').innerHTML = h;
  }
  function stSetupHTML() {
    const st = state.st, c = stCounts();
    const have = { T: 0, O: 0, M: 0, D: 0 };
    for (const id of st.chosen) have[rtype(id)]++;
    const chip = (t, l) => '<span class="count-chip ' + (have[t] === c[t] ? 'ok' : 'bad') + '">' + l + ' ' + have[t] + '/' + c[t] + '</span>';
    let h = '<div class="row" style="flex-wrap:wrap"><span class="grow">Players</span><div class="stepper"><button data-act="st-n" data-d="-1">−</button><span>' + st.n + '</span><button data-act="st-n" data-d="1">+</button></div></div>' +
      '<div class="row">' + seg('st-script', [['tb', 'Trouble Brewing'], ['bmr', 'Bad Moon'], ['snv', 'Sects']], st.script) + '</div>' +
      '<div class="row" style="flex-wrap:wrap;gap:6px">' + chip('T', 'Townsfolk') + chip('O', 'Outsiders') + chip('M', 'Minions') + chip('D', 'Demon') + helpBtn('counts') + '</div>' +
      (c.notes.length ? '<div class="small" style="color:var(--warm)">' + c.notes.map(esc).join(' · ') + '</div>' : '') +
      (st.chosen.includes('godfather') ? '<div class="row"><span class="grow small">Godfather changes Outsiders by</span>' + seg('st-gf', [['-1', '−1'], ['1', '+1']], st.gf) + '</div>' : '') +
      '<div class="row"><button class="btn" data-act="st-random">Random</button><button class="btn" data-act="st-clear">Clear</button><button class="btn primary grow" data-act="st-deal">Deal to seats</button></div>';
    for (const t of ['T', 'O', 'M', 'D']) {
      h += '<h2 class="sec" style="margin-top:4px">' + TYPE_NAME[t] + '</h2><div class="rolegrid">' + stRoles().filter(r => r.type === t).map(r =>
        '<button class="rolebtn ' + (st.chosen.includes(r.id) ? 'on' : '') + '" data-act="st-toggle" data-id="' + r.id + '"><span class="ic c-' + t + '">' + icon(r.id) + '</span>' + r.name + '</button>').join('') + '</div>';
    }
    return '<div style="display:flex;flex-direction:column;gap:10px">' + h + '</div>';
  }
  function stNightHTML() {
    const st = state.st;
    const steps = nightOrder(st.chosen, st.first, st.n);
    const who = id => (st.seats ? st.seats.map((s, i) => (s.role === id ? NAMES[i] && stName(i) : null)).filter(Boolean).join(', ') : '');
    let h = '<div class="row">' + seg('st-first', [['1', 'First night'], ['0', 'Other nights']], st.first ? '1' : '0') + '</div>';
    if (!st.chosen.length) return h + '<div class="muted small">Pick roles in Setup to see the night order.</div>';
    h += '<div class="list" style="gap:4px">' + steps.map((s, i) => '<div class="step"><span class="num">' + (i + 1) + '</span><span class="ic c-' + (s.marker ? 'M' : s.type) + '">' + icon(s.id) + '</span><div class="grow"><b>' + esc(s.name) + '</b>' + (who(s.id) ? ' <span class="tiny muted">' + esc(who(s.id)) + '</span>' : '') + '<div class="small muted">' + esc(s.text) + '</div></div></div>').join('') + '</div>';
    if (!steps.length) h += '<div class="muted small">Nobody wakes.</div>';
    return '<div style="display:flex;flex-direction:column;gap:10px">' + h + '</div>';
  }
  function stName(i) { return state.st.names && state.st.names[i] ? state.st.names[i] : NAMES[i]; }
  function stGrimHTML() {
    const st = state.st;
    if (!st.seats) return '<div class="muted small" style="padding:8px">Deal roles in Setup first.</div>';
    const tokens = st.seats.map((s, i) => ({
      seat: i, type: rtype(s.role), ic: icon(s.role), name: stName(i), cl: rname(s.role) + (s.thinks ? ' → ' + rname(s.thinks) : ''),
      cls: s.dead ? 'dead' : '', dead: s.dead, extra: (s.dead && !s.ghost ? '' : (s.dead ? '<span class="ghost"></span>' : '')) + (s.rem.length ? '<span class="reminders">' + s.rem.map(r => '<span class="rem">' + esc(r) + '</span>').join('') + '</span>' : ''),
    }));
    const center = '<div class="lbl">Bluffs</div><div class="small">' + st.bluffs.map(rname).join('<br>') + '</div>';
    return '<div style="display:flex;flex-direction:column;gap:8px;height:100%;min-height:360px">' + ring({ n: st.seats.length, tokens, center, act: 'gseat' }) + '<div class="small muted" style="text-align:center">Tap a seat for reminders, death and role changes.</div></div>';
  }
  function stRandom() {
    const st = state.st;
    const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const R = stRoles();
    const demons = sh(R.filter(r => r.type === 'D')).slice(0, 1).map(r => r.id);
    const base = adjustedCounts(st.n, [], st.gf);
    const minions = sh(R.filter(r => r.type === 'M')).slice(0, base.M).map(r => r.id);
    st.gf = Math.random() < 0.5 ? -1 : 1;
    const c = adjustedCounts(st.n, demons.concat(minions), st.gf);
    const outs = sh(R.filter(r => r.type === 'O')).slice(0, c.O).map(r => r.id);
    const tfs = sh(R.filter(r => r.type === 'T')).slice(0, c.T).map(r => r.id);
    st.chosen = demons.concat(minions, outs, tfs);
  }
  function stDeal() {
    const st = state.st, c = stCounts();
    const have = { T: 0, O: 0, M: 0, D: 0 };
    for (const id of st.chosen) have[rtype(id)]++;
    if (['T', 'O', 'M', 'D'].some(t => have[t] !== c[t])) { toast('Counts don\'t match yet.'); return; }
    const a = st.chosen.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const R = stRoles();
    const notIn = R.filter(r => (r.type === 'T') && !st.chosen.includes(r.id)).map(r => r.id);
    st.seats = a.map(id => {
      let thinks = null;
      if (id === 'drunk') thinks = notIn[Math.floor(Math.random() * notIn.length)];
      if (id === 'lunatic') thinks = st.chosen.find(x => rtype(x) === 'D');
      return { role: id, thinks, dead: false, ghost: true, rem: [] };
    });
    const pool = R.filter(r => (r.type === 'T' || r.type === 'O') && !st.chosen.includes(r.id) && !st.seats.some(s => s.thinks === r.id) && r.id !== 'drunk').map(r => r.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    st.bluffs = pool.slice(0, 3);
    st.names = state.nb.n === st.n ? state.nb.names.slice() : NAMES.slice(0, st.n);
    st.view = 'grim';
  }

  // ------------------------------------------------------------------ ROLES
  function renderRoles() {
    const q = (state.rolesQ || '').toLowerCase();
    let h = '<div class="row" style="flex-wrap:wrap">' + seg('roles-script', [['tb', 'Trouble Brewing'], ['bmr', 'Bad Moon'], ['snv', 'Sects']], state.rolesScript) + '</div>' +
      '<input type="text" id="rolesQ" placeholder="Search roles" value="' + esc(state.rolesQ) + '" autocomplete="off">';
    let body = '';
    for (const t of ['T', 'O', 'M', 'D']) {
      const rs = rolesOf(state.rolesScript, t).filter(r => !q || r.name.toLowerCase().includes(q) || r.ability.toLowerCase().includes(q));
      if (!rs.length) continue;
      body += '<div class="phase-h">' + TYPE_NAME[t] + (t === 'O' || t === 'M' ? 's' : '') + '</div><div class="rolesgrid list">' + rs.map(r =>
        '<div class="li"><span class="ic c-' + t + '" style="width:32px;height:32px">' + icon(r.id) + '</span><div class="grow"><div class="ttl">' + r.name + '</div><div class="small muted">' + esc(r.ability) + '</div></div></div>').join('') + '</div>';
    }
    $('#v-roles').innerHTML = h + '<div class="scroll grow">' + (body || '<div class="muted">No match.</div>') + '</div>';
  }

  // ------------------------------------------------------------------ sheets
  let sheet = null; // { title, body(), foot() }
  function openSheet(s) { sheet = s; drawSheet(); }
  function closeSheet() { sheet = null; $('#sheetRoot').innerHTML = ''; }
  function drawSheet() {
    if (!sheet) return;
    const old = document.querySelector('.sh-body');
    const st = old ? old.scrollTop : 0;
    const fresh = !old;
    $('#sheetRoot').innerHTML = '<div class="sheet-wrap" data-act="sheet-bg"' + (fresh ? '' : ' style="animation:none"') + '><div class="sheet" role="dialog" aria-modal="true"' + (fresh ? '' : ' style="animation:none"') + '><div class="sh-head"><h3>' + sheet.title + '</h3><button class="iconbtn" data-act="sheet-close" aria-label="Close">' + xIcon + '</button></div><div class="sh-body">' + sheet.body() + '</div>' + (sheet.foot ? '<div class="sh-foot">' + sheet.foot() + '</div>' : '') + '</div></div>';
    const nb = document.querySelector('.sh-body'); if (nb) nb.scrollTop = st;
  }

  function seatChips(k, val, multi, opts) {
    const nb = (opts && opts.names) ? null : state.nb;
    const names = (opts && opts.names) || nb.names;
    const dead = opts && opts.dead ? opts.dead : (nb ? nbDead(nb) : []);
    return '<div class="chips">' + names.map((nm, i) => {
      const on = multi ? (val || []).includes(i) : val === i;
      return '<button class="chip ' + (on ? 'on' : '') + (dead[i] ? ' dead' : '') + '" data-act="f-set" data-k="' + k + '" data-v="' + i + '" data-multi="' + (multi ? 1 : 0) + '">' + esc(nm) + '</button>';
    }).join('') + '</div>';
  }
  function roleChips(k, val, list) {
    return '<div class="chips">' + list.map(r => '<button class="chip ' + (val === r.id ? 'on' : '') + '" data-act="f-set" data-k="' + k + '" data-v="' + r.id + '" data-str="1"><span class="ic c-' + r.type + '">' + icon(r.id) + '</span>' + r.name + '</button>').join('') + '</div>';
  }
  const fld = (label, inner, help) => '<label class="fld"><span class="row">' + label + (help ? ' ' + helpBtn(help) : '') + '</span>' + inner + '</label>';
  const fldDiv = (label, inner, help) => '<div class="fld" style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted);font-weight:600"><span class="row">' + label + (help ? ' ' + helpBtn(help) : '') + '</span>' + inner + '</div>';
  const numStep = (k, v, max) => '<div class="stepper"><button data-act="f-num" data-k="' + k + '" data-d="-1">−</button><span>' + v + '</span><button data-act="f-num" data-k="' + k + '" data-d="1" data-max="' + max + '">+</button></div>';
  const phaseStep = (k, v) => '<div class="stepper"><button data-act="f-phase" data-k="' + k + '" data-d="-1">‹</button><span>' + phaseLabel(v) + '</span><button data-act="f-phase" data-k="' + k + '" data-d="1">›</button></div>';

  let F = null; // current form values
  function openForm(kind, preset) {
    const nb = state.nb;
    if (kind === 'nom') {
      const t = isNight(nb.t) ? nb.t + 1 : nb.t;
      F = Object.assign({ kind, by: null, on: null, voters: [], exec: false, t }, preset);
      openSheet({ title: 'Nomination', body: formBody, foot: () => '<button class="btn" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="f-save">Save</button>' });
    } else if (kind === 'death') {
      F = Object.assign({ kind, seat: null, how: isNight(nb.t) ? 'night' : 'exec', t: nb.t }, preset);
      openSheet({ title: 'Death', body: formBody, foot: () => '<button class="btn" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="f-save">Save</button>' });
    } else {
      const giver = preset && preset.giver != null ? preset.giver : nb.me;
      const c = nb.claims[giver];
      F = Object.assign({ kind: 'info', giver, ik: INFO_KINDS.includes(c) ? c : null, t: nb.t, a: null, b: null, shown: null, count: 0, yes: true, seat: null, none: false, died: false, executed: false }, preset);
      fixInfoT();
      openSheet({ title: 'Info', body: formBody, foot: () => '<button class="btn" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="f-save">Save</button>' });
    }
  }
  function fixInfoT() {
    if (!F || F.kind !== 'info' || !F.ik) return;
    if (FIRST_ONLY.has(F.ik)) F.t = 1;
    else if (DAY_KINDS.has(F.ik)) { if (isNight(F.t)) F.t = F.t + 1; }
    else if (!isNight(F.t)) F.t = F.t - 1;
    if (F.ik === 'undertaker' && F.t < 3) F.t = 3;
  }
  function formBody() {
    const nb = state.nb;
    if (F.kind === 'nom') {
      return fldDiv('When', phaseStep('t', F.t)) + fldDiv('Who nominated', seatChips('by', F.by)) + fldDiv('Who was nominated', seatChips('on', F.on)) +
        fldDiv('Who voted yes (' + F.voters.length + ')', seatChips('voters', F.voters, true), 'vote') +
        '<div class="row"><span class="grow">Executed</span>' + sw('f-bool', F.exec, 'data-k="exec"') + '</div>';
    }
    if (F.kind === 'death') {
      return fldDiv('Who died', seatChips('seat', F.seat)) + fldDiv('How', seg('f-seg', [['exec', 'Executed'], ['night', 'Night'], ['slayer', 'Slayer'], ['other', 'Other']], F.how).replace(/data-act="f-seg"/g, 'data-act="f-seg" data-k="how"')) + fldDiv('When', phaseStep('t', F.t));
    }
    let h = fldDiv('From', seatChips('giver', F.giver));
    h += fldDiv('Their role', roleChips('ik', F.ik, INFO_KINDS.map(id => ROLES[id])));
    if (!F.ik) return h;
    if (!FIRST_ONLY.has(F.ik)) h += fldDiv('When', phaseStep('t', F.t));
    const typeList = { washerwoman: 'T', librarian: 'O', investigator: 'M' }[F.ik];
    if (typeList) {
      if (F.ik === 'librarian') h += '<div class="row"><span class="grow">No Outsiders in play</span>' + sw('f-bool', F.none, 'data-k="none"') + '</div>';
      if (!(F.ik === 'librarian' && F.none)) {
        h += fldDiv('Two players', seatChips('pair', [F.a, F.b].filter(x => x != null), true));
        h += fldDiv('Shown role', roleChips('shown', F.shown, TB.filter(r => r.type === typeList)));
      }
    } else if (F.ik === 'chef') h += fldDiv('Evil pairs', numStep('count', F.count, 4));
    else if (F.ik === 'empath') h += fldDiv('Evil neighbours', numStep('count', F.count, 2));
    else if (F.ik === 'fortuneteller') {
      h += fldDiv('Two players', seatChips('pair', [F.a, F.b].filter(x => x != null), true));
      h += fldDiv('Answer', seg('f-seg', [['1', 'Yes'], ['0', 'No']], F.yes ? '1' : '0').replace(/data-act="f-seg"/g, 'data-act="f-seg" data-k="yes"'));
    } else if (F.ik === 'undertaker' || F.ik === 'ravenkeeper') {
      h += fldDiv(F.ik === 'undertaker' ? 'Executed player' : 'Player picked', seatChips('seat', F.seat));
      h += fldDiv('Shown role', roleChips('shown', F.shown, TB));
    } else if (F.ik === 'slayer') {
      h += fldDiv('Shot at', seatChips('seat', F.seat));
      h += '<div class="row"><span class="grow">They died</span>' + sw('f-bool', F.died, 'data-k="died"') + '</div>';
    } else if (F.ik === 'virgin') {
      h += fldDiv('Nominated by', seatChips('seat', F.seat));
      h += '<div class="row"><span class="grow">Nominator executed at once</span>' + sw('f-bool', F.executed, 'data-k="executed"') + '</div>';
    }
    return h;
  }
  function saveForm() {
    const nb = state.nb;
    const id = () => nb.nextId++;
    const snap = JSON.stringify(nb);
    if (F.kind === 'nom') {
      if (F.by == null || F.on == null) return toast('Pick who nominated whom.');
      const nid = id();
      nb.noms.push({ id: nid, t: F.t, by: F.by, on: F.on, voters: F.voters.slice().sort((a, b) => a - b), exec: F.exec });
      if (F.exec) nb.deaths.push({ id: id(), seat: F.on, t: F.t, how: 'exec', nomId: nid });
    } else if (F.kind === 'death') {
      if (F.seat == null) return toast('Pick who died.');
      nb.deaths.push({ id: id(), seat: F.seat, t: F.t, how: F.how });
    } else {
      if (!F.ik) return toast('Pick their role.');
      const x = { id: id(), giver: F.giver, kind: F.ik, t: F.t };
      const typeList = { washerwoman: 1, librarian: 1, investigator: 1, fortuneteller: 1 }[F.ik];
      if (F.ik === 'librarian' && F.none) x.none = true;
      else if (typeList) {
        if (F.a == null || F.b == null) return toast('Pick two players.');
        x.a = F.a; x.b = F.b;
        if (F.ik === 'fortuneteller') x.yes = !!F.yes;
        else { if (!F.shown) return toast('Pick the shown role.'); x.shown = F.shown; }
      }
      if (F.ik === 'chef' || F.ik === 'empath') x.count = F.count;
      if (F.ik === 'undertaker' || F.ik === 'ravenkeeper') { if (F.seat == null || !F.shown) return toast('Pick the player and role.'); x.seat = F.seat; x.shown = F.shown; }
      if (F.ik === 'slayer') { if (F.seat == null) return toast('Pick who was shot.'); x.seat = F.seat; x.died = !!F.died; }
      if (F.ik === 'virgin') { if (F.seat == null) return toast('Pick the nominator.'); x.seat = F.seat; x.executed = !!F.executed; }
      nb.infos.push(x);
      if (!nb.claims[F.giver]) nb.claims[F.giver] = F.ik;
      const dead = nbDead(nb);
      if (F.ik === 'slayer' && x.died && !dead[x.seat]) nb.deaths.push({ id: id(), seat: x.seat, t: x.t, how: 'slayer', infoId: x.id });
      if (F.ik === 'virgin' && x.executed && !dead[x.seat]) nb.deaths.push({ id: id(), seat: x.seat, t: x.t, how: 'exec', infoId: x.id });
    }
    closeSheet(); save(); render();
    toast('Saved.', () => { state.nb = JSON.parse(snap); save(); render(); });
  }

  // seat sheet (notebook)
  let seatOpen = -1;
  function seatSheet(i) {
    seatOpen = i;
    openSheet({
      title: esc(state.nb.names[i]),
      body: () => {
        const nb = state.nb, d = nbDead(nb)[i];
        const c = nb.claims[i];
        const myInfos = nb.infos.filter(x => x.giver === i);
        let h = '<div class="row"><span class="grow">This is me</span>' + sw('s-me', nb.me === i) + '</div>';
        h += fldDiv('Sure about them', seg('s-sure', [['', 'Not sure'], ['good', 'Good'], ['evil', 'Evil']], nb.sure[i] || ''), 'sure');
        h += '<div class="row"><span class="grow">' + (d ? 'Died ' + phaseLabel(d.t) + ({ exec: ' (executed)', night: ' (night)', slayer: ' (Slayer)', other: '' }[d.how] || '') : 'Alive') + '</span>' +
          (d ? '<button class="btn small" data-act="s-undead">Undo death</button>' : '<button class="btn small" data-act="s-dead">Mark dead</button>') + '</div>';
        h += '<div class="row"><span class="grow fld" style="color:var(--muted);font-size:13px;font-weight:600">Info from them</span>' + (INFO_KINDS.includes(c) ? '<button class="btn small" data-act="s-info">' + plus() + 'Add</button>' : '') + '</div>';
        if (myInfos.length) h += '<div class="list">' + myInfos.map(x => '<div class="li"><span class="grow small">' + phaseLabel(x.t) + ': ' + esc(infoText(nb, x)) + '</span></div>').join('') + '</div>';
        h += fldDiv('Claim', '<div class="rolegrid">' + TB.map(r => {
          const used = nb.claims.some((x, j) => x === r.id && j !== i);
          return '<button class="rolebtn ' + (c === r.id ? 'on' : '') + (used ? ' used' : '') + '" data-act="s-claim" data-id="' + r.id + '"><span class="ic c-' + r.type + '">' + icon(r.id) + '</span>' + r.name + '</button>';
        }).join('') + '</div>');
        h += fld('Name', '<input type="text" id="seatName" value="' + esc(nb.names[i]) + '" maxlength="14" autocomplete="off">');
        h += fld('Notes', '<textarea id="seatNote" maxlength="400">' + esc(nb.notes[i] || '') + '</textarea>');
        return h;
      },
    });
  }

  // grimoire seat sheet
  function gseatSheet(i) {
    openSheet({
      title: esc(stName(i)),
      body: () => {
        const st = state.st, s = st.seats[i];
        const inPlay = st.seats.map(x => x.role);
        const rems = [];
        for (const id of inPlay) for (const r of (ROLES[id].remind || [])) rems.push([id, r]);
        let h = '<div class="row"><span class="grow">Dead</span>' + sw('g-dead', s.dead) + '</div>';
        if (s.dead) h += '<div class="row"><span class="grow">Vote used</span>' + sw('g-ghost', !s.ghost) + '</div>';
        h += fldDiv('Reminders', '<div class="chips">' + rems.map(([id, r]) => { const lab = rname(id) + ': ' + r; return '<button class="chip ' + (s.rem.includes(lab) ? 'on' : '') + '" data-act="g-rem" data-v="' + esc(lab) + '"><span class="ic c-' + rtype(id) + '">' + icon(id) + '</span>' + esc(r) + '</button>'; }).join('') + '</div>');
        h += fldDiv('Role', '<div class="rolegrid">' + stRoles().map(r => '<button class="rolebtn ' + (s.role === r.id ? 'on' : '') + '" data-act="g-role" data-id="' + r.id + '"><span class="ic c-' + r.type + '">' + icon(r.id) + '</span>' + r.name + '</button>').join('') + '</div>');
        return h;
      },
    });
    gOpen = i;
  }
  let gOpen = -1;

  // settings
  function settingsSheet() {
    openSheet({
      title: 'Settings',
      body: () => {
        const nb = state.nb;
        let h = '<h2 class="sec">Notebook</h2>';
        h += '<div class="row"><span class="grow">Players</span><div class="stepper"><button data-act="nb-n" data-d="-1">−</button><span>' + nb.n + '</span><button data-act="nb-n" data-d="1">+</button></div></div>';
        h += fldDiv('You are', seatChips('me', nb.me));
        h += '<div class="row"><span class="grow">I might be the Drunk ' + helpBtn('drunk') + '</span>' + sw('nb-drunk', nb.meMayBeDrunk) + '</div>';
        h += fldDiv('Names', '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">' + nb.names.map((x, i) => '<input type="text" data-name="' + i + '" value="' + esc(x) + '" maxlength="14" autocomplete="off" aria-label="Seat ' + (i + 1) + ' name">').join('') + '</div>');
        h += '<h2 class="sec">Practice ' + helpBtn('practice') + '</h2><div class="row"><button class="btn grow" data-act="practice" data-lv="easy">Easy</button><button class="btn grow" data-act="practice" data-lv="medium">Medium</button><button class="btn grow" data-act="practice" data-lv="hard">Hard</button></div>';
        h += '<button class="btn danger" data-act="nb-new">New notebook</button>';
        h += '<div class="row small muted"><span class="grow">How strong are the computers?</span>' + helpBtn('strong') + '</div>';
        h += '<div class="tiny muted">Clocktower ' + BUILD + ' · fan-made, not affiliated with the game\'s publisher. Role text written in our own words.</div>';
        return h;
      },
    });
    gOpen = -1; seatOpen = -1;
    F = { kind: 'settings', me: state.nb.me };
  }

  function resizeNb(n) {
    const nb = state.nb;
    n = Math.max(5, Math.min(15, n));
    if (n === nb.n) return;
    const keep = i => i < n;
    nb.names = Array.from({ length: n }, (_, i) => nb.names[i] || NAMES[i]);
    nb.claims = Array.from({ length: n }, (_, i) => nb.claims[i] || null);
    nb.sure = Array.from({ length: n }, (_, i) => nb.sure[i] || null);
    nb.notes = Array.from({ length: n }, (_, i) => nb.notes[i] || '');
    nb.deaths = nb.deaths.filter(d => keep(d.seat));
    nb.noms = nb.noms.filter(x => keep(x.by) && keep(x.on)).map(x => Object.assign(x, { voters: x.voters.filter(keep) }));
    nb.infos = nb.infos.filter(x => keep(x.giver) && [x.a, x.b, x.seat].every(s => s == null || keep(s)));
    if (nb.me >= n) nb.me = 0;
    nb.n = n;
  }

  // practice puzzle: a computer game handed over as one good player's notebook
  function makePractice(lv) {
    const n = { easy: 7, medium: 9, hard: 11 }[lv] || 7;
    const days = { easy: 1, medium: 2, hard: 3 }[lv] || 1;
    for (let tries = 0; tries < 40; tries++) {
      let g = E.createGame({ n, seed: (Math.random() * 2 ** 31) | 0 });
      const ctx = { humans: new Set(), mem: {}, rng: Math.random, level: 'hard', oddsFor: () => null };
      let guard = 0;
      while (!g.winner && guard++ < 4000) {
        if (g.stage === 'day' && g.t === 2 * days) {
          // let everyone talk, then stop before nominations
          const r = B.step(g, ctx);
          const last = r.state.pub[r.state.pub.length - 1];
          if (!r.acted || !last || (last.kind !== 'claim' && last.kind !== 'share')) break;
          g = r.state; continue;
        }
        g = B.step(g, ctx).state;
      }
      if (g.winner || g.t !== 2 * days) continue;
      const goods = [...Array(n).keys()].filter(i => !g.evil[i] && g.alive[i] && g.roles[i] !== 'drunk');
      if (!goods.length) continue;
      const me = goods[Math.floor(Math.random() * goods.length)];
      const v = E.view(g, me);
      const nb = defNb(n);
      nb.me = me; nb.meMayBeDrunk = true; nb.t = g.t;
      nb.claims = v.claims.map(c => (c ? c.role : null)); nb.claims[me] = v.me.role;
      const id = () => nb.nextId++;
      // nominations from the public log (an execution is shown on its nomination)
      for (let i = 0; i < g.pub.length; i++) {
        const p = g.pub[i];
        if (p.kind !== 'nom') continue;
        const tally = g.pub.slice(i + 1).find(q => q.kind === 'tally' && q.on === p.on && q.t === p.t);
        const ex = g.pub.find(q => q.kind === 'exec' && q.seat === p.on && q.t === p.t);
        nb.noms.push({ id: id(), t: p.t, by: p.by, on: p.on, voters: tally ? tally.voters : [], exec: !!ex });
      }
      for (const d of g.deaths) {
        const how = d.how === 'self' ? 'night' : d.how;
        const nom = how === 'exec' ? nb.noms.find(x => x.exec && x.on === d.seat && x.t === d.t) : null;
        nb.deaths.push({ id: id(), seat: d.seat, t: d.t, how, nomId: nom ? nom.id : undefined });
      }
      const seen = new Set();
      for (const x of g.shared) { const k = x.giver + x.kind + x.t; if (seen.has(k)) continue; seen.add(k); nb.infos.push(Object.assign({ id: id() }, x)); }
      for (const p of v.me.priv) if (p.kind === 'info' && p.data && !seen.has(me + p.data.kind + p.data.t)) nb.infos.push(Object.assign({ id: id(), giver: me }, p.data));
      for (const x of nb.infos) if (FIRST_ONLY.has(x.kind)) x.t = 1;
      return { nb, truth: { roles: g.roles.slice(), thinks: g.thinks.slice() }, lv };
    }
    return null;
  }

  // ------------------------------------------------------------------ toast + help
  let toastTimer = null;
  function toast(text, undo) {
    clearTimeout(toastTimer);
    $('#toastRoot').innerHTML = '<div class="toast"><span>' + esc(text) + '</span>' + (undo ? '<button data-act="undo">Undo</button>' : '') + '</div>';
    toast.undo = undo || null;
    toastTimer = setTimeout(() => { $('#toastRoot').innerHTML = ''; toast.undo = null; }, undo ? 5000 : 2200);
  }
  function showHelp(k) {
    const h = HELP[k]; if (!h) return;
    const prev = sheet;
    openSheet({ title: h[0], body: () => '<p style="margin:0;line-height:1.5">' + esc(h[1]) + '</p>', foot: () => '<button class="btn" data-act="help-back">' + (prev ? 'Back' : 'Close') + '</button>', prev });
  }

  // ------------------------------------------------------------------ events
  const H = {
    tab(d) { state.tab = d.tab; save(); render(); },
    townview(d) { state.townView = d.v; save(); render(); },
    phase(d) { state.nb.t = Math.max(1, state.nb.t + (+d.d)); save(); render(); },
    seat(d) { seatSheet(+d.seat); },
    form(d) { openForm(d.f); },
    del(d) {
      const nb = state.nb, id = +d.id;
      const snap = JSON.stringify(nb);
      if (d.kind === 'nom') { nb.noms = nb.noms.filter(x => x.id !== id); nb.deaths = nb.deaths.filter(x => x.nomId !== id); }
      if (d.kind === 'death') nb.deaths = nb.deaths.filter(x => x.id !== id);
      if (d.kind === 'info') { nb.infos = nb.infos.filter(x => x.id !== id); nb.deaths = nb.deaths.filter(x => x.infoId !== id); }
      save(); render();
      toast('Deleted.', () => { state.nb = JSON.parse(snap); save(); render(); });
    },
    'sheet-close'() { closeSheet(); },
    'sheet-bg'(d, e) { if (e.target.classList.contains('sheet-wrap')) closeSheet(); },
    help(d) { showHelp(d.k); },
    'help-back'() { const p = sheet && sheet.prev; if (p) { sheet = p; $('#sheetRoot').innerHTML = ''; drawSheet(); } else closeSheet(); },
    undo() { const u = toast.undo; $('#toastRoot').innerHTML = ''; toast.undo = null; if (u) u(); },
    // form fields
    'f-set'(d) {
      const k = d.k; let v = d.str ? d.v : +d.v;
      if (F.kind === 'settings' && k === 'me') { state.nb.me = v; F.me = v; save(); drawSheet(); render(); return; }
      if (k === 'pair') {
        const cur = [F.a, F.b].filter(x => x != null);
        const i = cur.indexOf(v);
        if (i >= 0) cur.splice(i, 1); else { cur.push(v); if (cur.length > 2) cur.shift(); }
        F.a = cur[0] != null ? cur[0] : null; F.b = cur[1] != null ? cur[1] : null;
      } else if (d.multi === '1') {
        const arr = F[k] || (F[k] = []); const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v);
      } else F[k] = F[k] === v && k !== 'giver' ? null : v;
      if (k === 'giver') { const c = state.nb.claims[v]; if (INFO_KINDS.includes(c)) F.ik = c; }
      if (k === 'ik' || k === 'giver') fixInfoT();
      if (k === 'ik') F.shown = null;
      drawSheet();
    },
    'f-num'(d) { const max = +(d.max || 9); F[d.k] = Math.max(0, Math.min(max, (F[d.k] || 0) + (+d.d))); if (d.d === '1' && !d.max) F[d.k] = Math.min(F[d.k], 9); drawSheet(); },
    'f-phase'(d) {
      let t = F[d.k] + (+d.d) * (F.kind === 'info' && F.ik ? 2 : 1);
      F[d.k] = Math.max(1, t);
      if (F.kind === 'info') fixInfoT();
      drawSheet();
    },
    'f-bool'(d) { F[d.k] = !F[d.k]; drawSheet(); },
    'f-seg'(d) { F[d.k] = d.k === 'yes' ? d.v === '1' : d.v; drawSheet(); },
    'f-save'() { saveForm(); },
    // seat sheet
    's-me'() { state.nb.me = seatOpen; save(); drawSheet(); render(); },
    's-sure'(d) { state.nb.sure[seatOpen] = d.v || null; save(); drawSheet(); render(); },
    's-claim'(d) { const nb = state.nb; nb.claims[seatOpen] = nb.claims[seatOpen] === d.id ? null : d.id; save(); drawSheet(); render(); },
    's-dead'() { const i = seatOpen; closeSheet(); openForm('death', { seat: i }); },
    's-undead'() { const nb = state.nb, i = seatOpen; const snap = JSON.stringify(nb); nb.deaths = nb.deaths.filter(x => x.seat !== i); nb.noms.forEach(x => { if (x.on === i) x.exec = false; }); save(); drawSheet(); render(); toast('Death removed.', () => { state.nb = JSON.parse(snap); save(); render(); }); },
    's-info'() { const i = seatOpen; closeSheet(); openForm('info', { giver: i }); },
    // settings
    'nb-n'(d) { const snap = JSON.stringify(state.nb); resizeNb(state.nb.n + (+d.d)); save(); drawSheet(); render(); if (+d.d < 0) toast('Players: ' + state.nb.n, () => { state.nb = JSON.parse(snap); save(); drawSheet(); render(); }); },
    'nb-drunk'() { state.nb.meMayBeDrunk = !state.nb.meMayBeDrunk; save(); drawSheet(); render(); },
    'nb-new'() { const snap = JSON.stringify(state.nb); state.nb = defNb(state.nb.n); state.nb.names = JSON.parse(snap).names; state.practice = null; closeSheet(); save(); render(); toast('New notebook.', () => { state.nb = JSON.parse(snap); save(); render(); }); },
    practice(d) {
      const p = makePractice(d.lv);
      if (!p) { toast('Couldn\'t make a puzzle. Try again.'); return; }
      state.practice = { truth: p.truth, saved: state.practice ? state.practice.saved : state.nb, revealed: false, lv: p.lv };
      state.nb = p.nb; state.tab = 'town'; closeSheet(); save(); render();
    },
    'practice-reveal'() { const P = state.practice; const d = P.truth.roles.indexOf('imp'); P.oddsAtReveal = nbOdds && !nbOdds.error ? nbOdds.pDemon[d] : 0; P.revealed = true; save(); render(); },
    'practice-exit'() { const P = state.practice; state.nb = P.saved || defNb(8); state.practice = null; save(); render(); },
    // play
    'ps-n'(d) { state.playSetup.n = Math.max(5, Math.min(12, state.playSetup.n + (+d.d))); save(); renderPlay(); },
    'ps-level'(d) { state.playSetup.level = d.v; save(); renderPlay(); },
    'play-start'() { startPlay(); },
    'play-new'() { state.play = null; clearTimeout(playTimer); save(); renderPlay(); },
    'on-create'() { onCreate(); },
    'on-join'() { onJoin(); },
    'on-start'() { if (ON) ON.room.start().then(r => { if (r && !r.ok) toast(r.message || 'Could not start.'); }); },
    'on-seat'(d) { if (ON) ON.room.setSeat(+d.i, d.k).then(r => { if (r && !r.ok) toast(r.message || 'Could not change the seat.'); }); },
    'on-leave'() { if (!ON) return; const r = ON.room; onDrop(''); r.leave(); },
    pseat(d) {
      const S = src(); if (!S) return;
      const P = S.ui, i = +d.seat, g = S.v;
      if (g.stage === 'night' && g.pending && g.pending.seat === S.me) {
        const k = P.sel.indexOf(i);
        if (k >= 0) P.sel.splice(k, 1); else { P.sel.push(i); if (P.sel.length > g.pending.picks) P.sel.shift(); }
        renderPlay(); return;
      }
      if (P.mode === 'nominate') { myAct({ type: 'nominate', target: i }); return; }
      if (P.mode === 'slay') { P.slayed = true; myAct({ type: 'slay', target: i }); return; }
    },
    'play-choose'() { const P = src().ui; myAct({ type: 'choose', picks: P.sel.slice() }); },
    'play-vote'(d) { myAct({ type: 'vote', yes: d.yes === '1' }); },
    'play-mode'(d) { src().ui.mode = d.m || null; renderPlay(); },
    'play-end'() { myAct({ type: 'endDay' }); },
    'play-share'() { const v = src().v; myAct({ type: 'share', info: myUnshared(v) }); },
    'play-claim'() {
      const S = src(), v = S.v;
      F = { kind: 'claim', role: v.claims[S.me] ? v.claims[S.me].role : v.me.role, share: true };
      openSheet({
        title: 'Claim a role',
        body: () => '<div class="small muted">Say this out loud to the town. Good players usually tell the truth; evil players bluff.</div>' +
          '<div class="row"><span class="grow">Share my info too</span>' + sw('f-bool', F.share, 'data-k="share"') + '</div>' +
          '<div class="rolegrid">' + TB.filter(r => r.type === 'T' || r.type === 'O').map(r => '<button class="rolebtn ' + (F.role === r.id ? 'on' : '') + '" data-act="f-set" data-k="role" data-v="' + r.id + '" data-str="1"><span class="ic c-' + r.type + '">' + icon(r.id) + '</span>' + r.name + '</button>').join('') + '</div>',
        foot: () => '<button class="btn" data-act="sheet-close">Cancel</button><button class="btn primary" data-act="claim-save">Claim</button>',
      });
    },
    'claim-save'() {
      const v = src().v;
      if (!F.role) return toast('Pick a role.');
      const info = F.share && F.role === v.me.role ? myUnshared(v) : [];
      closeSheet(); myAct({ type: 'claim', role: F.role, info });
    },
    // storyteller
    'st-view'(d) { state.st.view = d.v; save(); renderSt(); },
    'st-n'(d) { const st = state.st; st.n = Math.max(5, Math.min(15, st.n + (+d.d))); st.seats = null; save(); renderSt(); },
    'st-script'(d) { const st = state.st; st.script = d.v; st.chosen = []; st.seats = null; save(); renderSt(); },
    'st-toggle'(d) { const st = state.st; const i = st.chosen.indexOf(d.id); if (i >= 0) st.chosen.splice(i, 1); else st.chosen.push(d.id); st.seats = null; save(); renderSt(); },
    'st-gf'(d) { state.st.gf = +d.v; save(); renderSt(); },
    'st-random'() { stRandom(); state.st.seats = null; save(); renderSt(); },
    'st-clear'() { const snap = state.st.chosen.slice(); state.st.chosen = []; state.st.seats = null; save(); renderSt(); toast('Cleared.', () => { state.st.chosen = snap; save(); renderSt(); }); },
    'st-deal'() { stDeal(); save(); renderSt(); },
    'st-first'(d) { state.st.first = d.v === '1'; save(); renderSt(); },
    gseat(d) { gseatSheet(+d.seat); },
    'g-dead'() { const s = state.st.seats[gOpen]; s.dead = !s.dead; if (!s.dead) s.ghost = true; save(); drawSheet(); renderSt(); },
    'g-ghost'() { const s = state.st.seats[gOpen]; s.ghost = !s.ghost; save(); drawSheet(); renderSt(); },
    'g-rem'(d) { const s = state.st.seats[gOpen]; const i = s.rem.indexOf(d.v); if (i >= 0) s.rem.splice(i, 1); else s.rem.push(d.v); save(); drawSheet(); renderSt(); },
    'g-role'(d) { const s = state.st.seats[gOpen]; s.role = d.id; s.thinks = null; state.st.chosen = state.st.seats.map(x => x.role); save(); drawSheet(); renderSt(); },
    'roles-script'(d) { state.rolesScript = d.v; save(); renderRoles(); },
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = H[el.dataset.act];
    if (!fn) return;
    if (el.dataset.act === 'sheet-bg' && e.target !== el) return;
    fn(el.dataset, e);
  });
  document.getElementById('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) H.tab(b.dataset); });
  $('#gear').addEventListener('click', settingsSheet);
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'seatName' && seatOpen >= 0) { state.nb.names[seatOpen] = t.value.trim().slice(0, 14) || NAMES[seatOpen]; save(); render(); }
    if (t.id === 'seatNote' && seatOpen >= 0) { state.nb.notes[seatOpen] = t.value.slice(0, 400); save(); }
    if (t.dataset && t.dataset.name != null) { const i = +t.dataset.name; state.nb.names[i] = t.value.trim().slice(0, 14) || NAMES[i]; save(); render(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'rolesQ') {
      state.rolesQ = e.target.value;
      const pos = e.target.selectionStart;
      renderRoles();
      const q = $('#rolesQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) { /* ignore */ } }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet) closeSheet(); });
  // Back button closes an open sheet first
  window.addEventListener('popstate', () => { if (sheet) closeSheet(); });

  render();
  if (state.play && !state.play.g.winner) { requestMine(); scheduleTick(500); }
})();
