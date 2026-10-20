// Clocktower sounds and small animations. Turns a change in what you can see of the game
// (local or online) into FX calls, so every player hears the same events.
// events(prev, cur) is pure (testable in node); play(list, env) runs them with FX.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;

  // ---- atmospheric sounds (synthesised; each under 1.2 s, all "Game sounds") ----
  function defineSounds(FX) {
    if (!FX || !FX.define) return;
    // a church bell: hum, prime, minor third, fifth, nominal partials with long decay
    const bell = (k, f, v, at) => {
      [[1, 1.15, 1], [2, 1.0, 0.7], [2.4, 0.8, 0.4], [3, 0.6, 0.28], [4.1, 0.4, 0.18]].forEach(([m, d, g]) => k.tone({ f: f * m, dur: d, vol: v * g, a: 0.004, at }));
      k.noise({ f: f * 6, q: 2, dur: 0.03, vol: v * 0.5, at });
    };
    FX.define('bellNight', k => bell(k, 196, 0.13, 0), 'moves');             // night falls: one deep toll
    FX.define('bellDawn', k => { bell(k, 523, 0.06, 0); bell(k, 659, 0.05, 0.3); }, 'moves'); // dawn: two light chimes
    FX.define('knell', k => { k.tone({ f: 131, dur: 1.15, vol: 0.16, lp: 900 }); k.tone({ f: 262, dur: 0.9, vol: 0.07, lp: 900 }); k.tone({ f: 314, dur: 0.6, vol: 0.04 }); k.noise({ f: 500, filter: 'lowpass', dur: 0.05, vol: 0.12 }); }, 'moves');
    FX.define('gavel', k => { k.tone({ f: 300, f2: 210, dur: 0.1, vol: 0.26 }); k.tone({ f: 630, dur: 0.03, vol: 0.06, type: 'triangle' }); k.noise({ f: 1500, q: 1.5, dur: 0.03, vol: 0.14 }); }, 'moves');
    FX.define('hand', k => { k.tone({ f: 1250, f2: 1400, dur: 0.05, vol: 0.07, type: 'triangle' }); k.noise({ f: 3500, q: 2, dur: 0.03, vol: 0.06 }); }, 'moves');
    FX.define('whisper', k => { k.noise({ f: 2600, f2: 3600, q: 1.2, dur: 0.45, a: 0.15, vol: 0.12 }); k.tone({ f: 880, dur: 0.5, vol: 0.04, a: 0.1 }); }, 'moves');
  }

  const GOOD = ['#6ea8fe', '#8fd3ff', '#3fb27f', '#e8eaf0'];
  const EVIL = ['#e0453c', '#f0806a', '#f0b354', '#7a1f1a'];

  // What matters for sounds, from a view (E.view or the online snapshot merged view).
  function snap(v, key) {
    if (!v || !v.me) return null;
    const me = v.me.seat;
    const d = v.day && v.day.vote;
    return {
      key, t: v.t, stage: v.stage, me, evil: !!v.me.evil,
      pub: v.pub || [], pubLen: (v.pub || []).length, privLen: (v.me.priv || []).length, priv: v.me.priv || [],
      vote: d ? { by: d.by, on: d.on, votes: Object.assign({}, d.votes) } : null,
      pending: !!v.pending, winner: v.winner || null,
      myVote: !!(d && d.votes[me] === undefined && v.alive && (v.alive[me] || (v.ghost && v.ghost[me]))),
    };
  }

  // Each event: { s: sound, o: play options, a: [anim, target, arg], gap: ms before the next one,
  //               c: celebrate options }. Targets: {seat} | 'card' | 'act' | 'center'.
  function events(prev, cur) {
    if (!cur) return [];
    const out = [];
    const add = (e, gap) => { e.gap = gap == null ? 0 : gap; out.push(e); };
    if (!prev || prev.key !== cur.key) {
      // a fresh game (night 1, nothing public yet): shuffle, deal your role, first toll
      if (cur.t === 1 && cur.stage === 'night' && cur.pubLen <= 1 && !cur.winner) {
        add({ s: 'shuffle' }, 480);
        add({ s: 'cardDeal', a: ['pop', 'card'] }, 450);
        add({ s: 'bellNight', a: ['pulse', 'center'] }, 300);
        if (cur.pending) add({ s: 'turn', a: ['pulse', 'act'] });
      }
      return out; // reload or rejoin mid-game: stay quiet
    }
    const fresh = cur.pub.slice(prev.pubLen);
    const burst = fresh.length > 6; // came back from another tab: only the ending matters
    // votes: one hand-raise tick per yes, rising in pitch around the circle. The voter's own raised
    // hand pops up (a floating word would cover the neighbouring seats on a crowded circle)
    if (!burst && cur.vote) {
      const same = prev.vote && prev.vote.on === cur.vote.on && prev.vote.by === cur.vote.by;
      const before = same ? prev.vote.votes : {};
      let yes = Object.values(before).filter(Boolean).length;
      for (const k of Object.keys(cur.vote.votes)) {
        if (k in before) continue;
        if (cur.vote.votes[k]) { yes++; add({ s: 'hand', o: { pitch: 1 + 0.05 * (yes - 1) }, a: ['raise', { seat: +k }] }, 90); }
      }
    }
    for (const x of fresh) {
      if (burst && x.kind !== 'end') continue;
      switch (x.kind) {
        case 'dusk': add({ s: 'bellNight', a: ['pulse', 'center'] }, 700); break;
        case 'dawn':
          add({ s: 'bellDawn', a: ['pulse', 'center'] }, 750);
          (x.dead || []).forEach(i => add({ s: 'knell', a: ['death', { seat: i }] }, 650));
          break;
        case 'nom': add({ s: 'gavel', a: ['pop', { seat: x.on }] }, 250); break;
        case 'tally':
          if (/on the block/.test(x.text || '')) add({ s: 'gavel', o: { pitch: 0.8 }, a: ['pop', { seat: x.on }] }, 300);
          else add({ a: ['pop', 'center'] }, 200);
          break;
        case 'exec':
          add({ s: 'knell', a: ['death', { seat: x.seat }] }, 650);
          if (x.virgin) add({ c: { kind: 'big', seat: x.seat } }, 300);
          break;
        case 'claim': add({ s: 'cardFlip', o: { vol: 0.7 }, a: ['pop', { seat: x.seat }] }, 200); break;
        case 'share': add({ s: 'cardSlide', o: { vol: 0.6 }, a: ['pop', { seat: x.seat }] }, 200); break;
        case 'slay': add({ s: 'whoosh', o: { vol: 0.6 }, a: ['pop', { seat: x.on }] }, 380); break;
        case 'slaydeath':
          add({ s: 'hit', o: { vol: 0.5 }, a: ['death', { seat: x.seat }] }, 300);
          add({ c: { kind: 'big', seat: x.seat } }, 200);
          break;
        case 'slaymiss': add({ s: 'miss', o: { vol: 0.6 } }, 200); break;
        case 'end': break; // handled below, after the last toll
        default: break;
      }
    }
    if (!burst) {
      // the Storyteller tells you something (night info, or the star passed to you)
      const news = cur.priv.slice(prev.privLen).filter(p => p.kind === 'info' || p.kind === 'role');
      if (news.length) add({ s: 'whisper', a: ['pop', 'card'] }, 300);
      // it became YOUR move: a night pick, or a vote waiting on you
      if ((cur.pending && !prev.pending) || (cur.myVote && !prev.myVote)) add({ s: 'turn', a: ['pulse', 'act'] }, 200);
    }
    if (cur.winner && !prev.winner) {
      const won = cur.winner === (cur.evil ? 'evil' : 'good');
      add({ c: { kind: won ? 'win' : 'lose', colors: cur.winner === 'good' ? GOOD : EVIL } });
    }
    return out;
  }

  // Run a list of events. env: { FX, find(target) -> element|null, later(fn, ms) }.
  function play(list, env) {
    const FX = env.FX;
    if (!FX || !list.length) return;
    const later = env.later || ((fn, ms) => setTimeout(fn, ms));
    const fast = FX.settings && FX.settings.animSpeed === 'fast';
    let at = 0;
    for (const e of list) {
      later(() => run(e, env, FX), Math.round(at * (fast ? 0.55 : 1)));
      at += e.gap || 0;
    }
  }
  function run(e, env, FX) {
    if (e.s) FX.play(e.s, e.o);
    if (e.c) {
      const at = e.c.seat != null ? env.find({ seat: e.c.seat }) : null;
      FX.celebrate({ kind: e.c.kind, colors: e.c.colors, at: at || undefined });
    }
    if (!e.a) return;
    const [kind, target, arg] = e.a;
    const el = env.find(target, kind);
    if (!el) return;
    if (kind === 'pop') FX.pop(el);
    else if (kind === 'pulse') FX.pulse(el);
    else if (kind === 'raise') FX.pop(el);
    else if (kind === 'float') FX.floatText(el, arg, 'var(--warm)');
    else if (kind === 'death') { FX.flash(el, 'var(--dem)'); FX.shake(env.find(target, 'shake') || el); }
  }

  const api = { defineSounds, snap, events, play, GOOD, EVIL };
  if (isNode) module.exports = api;
  else root.CT = Object.assign(root.CT || {}, { fx: api });
})(typeof window !== 'undefined' ? window : globalThis);
