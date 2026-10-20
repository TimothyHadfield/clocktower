// Sounds, celebrations and animations: a scripted game is played through the engine and the
// computer players, and every change of what one seat sees goes through js/ctfx.js, as in the app.
// Checks (a) the right sounds fire for the events, (b) Sound off = no audio, Animations off = no
// animation, (c) game over celebrates with the right kind. Run: node tests/fx.test.js
const mem = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { return { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }; } });
globalThis.matchMedia = () => ({ matches: false });
// fake Web Audio that counts started sources
const audio = { starts: 0 };
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const node = x => Object.assign({ connect() {}, disconnect() {} }, x);
const source = () => node({ start() { audio.starts++; }, stop() {} });
let clock = 0;
globalThis.AudioContext = class {
  constructor() { this.sampleRate = 8000; this.state = 'running'; this.destination = {}; }
  get currentTime() { return clock; }
  createGain() { return node({ gain: param() }); }
  createOscillator() { return Object.assign(source(), { type: 'sine', frequency: param() }); }
  createBufferSource() { return Object.assign(source(), { buffer: null, loop: false }); }
  createBiquadFilter() { return node({ type: 'lowpass', frequency: param(), Q: param() }); }
  createStereoPanner() { return node({ pan: param() }); }
  createDynamicsCompressor() { return node({}); }
  createBuffer(ch, n) { return { getChannelData: () => new Float32Array(n) }; }
  resume() { return Promise.resolve(); }
};
// fake DOM, enough for fx.js helpers: elements count animate() calls
const anim = { calls: 0 };
const fakeEl = () => ({ style: {}, textContent: '', animate() { anim.calls++; return {}; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 40 }), remove() {}, cloneNode() { return fakeEl(); }, removeAttribute() {}, setAttribute() {}, getContext: () => null });
globalThis.document = { body: { appendChild() {} }, head: { appendChild() {} }, createElement: fakeEl, getElementById: () => null, addEventListener() {} };
globalThis.getComputedStyle = () => ({ borderRadius: '50%' });
globalThis.requestAnimationFrame = () => 0;
globalThis.innerWidth = 393; globalThis.innerHeight = 659;

require('../js/fx.js');
const FX = globalThis.FX;
const E = require('../js/engine.js');
const B = require('../js/bots.js');
const C = require('../js/ctfx.js');

let fails = 0, passes = 0;
function t(name, fn) { try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } }
function ok(c, msg) { if (!c) throw new Error(msg || 'not ok'); }

FX.init({ game: 'clocktower-test', clicks: false });
C.defineSounds(FX);
FX.unlock(); // as if the player had tapped once

// spy on FX.play / FX.celebrate (the real ones still run)
const log = { plays: [], celebrates: [] };
const realPlay = FX.play.bind(FX), realCel = FX.celebrate.bind(FX);
FX.play = (n, o) => { log.plays.push(n); clock += 0.2; return realPlay(n, o); };
FX.celebrate = o => { log.celebrates.push(o.kind); return realCel(o); };

// Play one game: seat `me` is a person who picks the first legal players, votes yes, ends the day.
function game(seed, n, me) {
  let s = E.createGame({ n, names: Array.from({ length: n }, (_, i) => (i === me ? 'You' : 'P' + i)), kinds: Array.from({ length: n }, (_, i) => (i === me ? 'you' : 'bot')), seed });
  const ctx = { humans: new Set([me]), mem: {}, rng: B.mkRng(seed), level: 'easy', oddsFor: () => null };
  const env = { FX, find: () => fakeEl(), later: fn => fn() };
  let prev = null, guard = 0, kinds = new Set();
  const see = () => { const cur = C.snap(E.view(s, me), 'g' + seed); C.play(C.events(prev, cur), env); prev = cur; };
  see();
  while (!s.winner && guard++ < 3000) {
    const r = B.step(s, ctx);
    if (r.acted) s = r.state;
    else if (r.waiting === 'night') {
      const p = s.pending, picks = [];
      for (let i = 0; picks.length < p.picks && i < n; i++) if (!(p.notSelf && i === me)) picks.push(i);
      s = E.apply(s, { type: 'choose', seat: me, picks });
    } else if (r.waiting === 'vote') s = E.apply(s, { type: 'vote', seat: me, yes: true });
    else if (r.waiting === 'day') {
      // nominate once a day (first living player not yet nominated), then end the day
      const d = s.day;
      const x = s.alive[me] && !d.nominators.includes(me) ? [...Array(n).keys()].find(i => i !== me && s.alive[i] && !d.nominees.includes(i)) : undefined;
      s = x !== undefined ? E.apply(s, { type: 'nominate', seat: me, target: x }) : E.apply(s, { type: 'endDay', seat: me });
    } else break;
    if (s.error) throw new Error('scripted move failed: ' + s.error);
    s.pub.slice(prev.pubLen).forEach(x => kinds.add(x.kind));
    see();
  }
  return { s, won: s.winner === (s.evil[me] ? 'evil' : 'good'), kinds };
}

t('(a) a scripted game makes the right sounds for its events', () => {
  log.plays = []; log.celebrates = [];
  const g = game(4242, 7, 2);
  ok(g.s.winner, 'game finished');
  const P = log.plays;
  ok(P[0] === 'shuffle' && P[1] === 'cardDeal' && P[2] === 'bellNight', 'starts with shuffle, deal, night bell: ' + P.slice(0, 3));
  ok(P.includes('bellDawn'), 'dawn bell');
  ok(P.includes('gavel'), 'nomination gavel');
  ok(P.includes('hand'), 'a hand-raise tick for yes votes');
  ok(P.includes('turn'), 'your-turn chime');
  if (g.kinds.has('exec')) ok(P.includes('knell'), 'execution knell');
  if (g.kinds.has('claim')) ok(P.includes('cardFlip'), 'claim card flip');
  ok(P.filter(x => x === 'bellNight').length >= 2, 'a night bell for each night');
  ok(P.every(x => FX.sounds.includes(x)), 'every sound exists: ' + P.filter(x => !FX.sounds.includes(x)));
});

t('(a) the hand ticks: one per yes vote, none for no', () => {
  const base = { key: 'k', t: 2, stage: 'day', me: 0, evil: false, pub: [], pubLen: 0, priv: [], privLen: 0, pending: false, winner: null, myVote: false };
  const a = Object.assign({}, base, { vote: { by: 1, on: 2, votes: {} } });
  const b = Object.assign({}, base, { vote: { by: 1, on: 2, votes: { 3: true, 4: false, 5: true } } });
  const ev = C.events(a, b);
  ok(ev.filter(e => e.s === 'hand').length === 2, 'two ticks, got ' + ev.map(e => e.s));
  ok(ev[1].o.pitch > ev[0].o.pitch, 'pitch rises around the circle');
  // a floating "Yes" covered the next seat on a 12-seat phone circle: the voter's own hand pops instead
  ok(ev.every(e => !e.a || e.a[0] !== 'float'), 'no floating text over the circle');
  ok(ev.filter(e => e.a && e.a[0] === 'raise').map(e => e.a[1].seat).join() === '3,5', 'the yes voters\' hands pop');
  const popped = [];
  C.play(ev, { FX: Object.assign({}, FX, { pop: el => popped.push(el.id), floatText: () => popped.push('float') }), find: (t, kind) => ({ id: kind + t.seat }), later: fn => fn() });
  ok(popped.join() === 'raise3,raise5', 'pops the hand element: ' + popped);
});

t('(a) a reload mid-game stays quiet; a dawn with a death tolls a knell', () => {
  const cur = { key: 'k', t: 4, stage: 'day', me: 0, pub: [{ kind: 'dawn', dead: [3] }], pubLen: 1, priv: [], privLen: 0, vote: null, pending: false, winner: null, myVote: false };
  ok(C.events(null, cur).length === 0, 'quiet on reload');
  const prev = Object.assign({}, cur, { pub: [], pubLen: 0, stage: 'night', t: 3 });
  const names = C.events(prev, cur).map(e => e.s);
  ok(names[0] === 'bellDawn' && names[1] === 'knell', 'dawn then knell: ' + names);
});

t('(b) Sound off: no audio at all; Sound on: audio', () => {
  FX.set('sound', true);
  let before = audio.starts; game(77, 5, 0); ok(audio.starts > before, 'audio with sound on');
  FX.set('sound', false);
  before = audio.starts; game(77, 5, 0); ok(audio.starts === before, 'no audio with sound off, got ' + (audio.starts - before));
  FX.set('sound', true);
  FX.set('moves', false); FX.set('alerts', false); FX.set('celebrations', false);
  before = audio.starts; game(77, 5, 0); ok(audio.starts === before, 'no audio with every category off');
  FX.set('moves', true); FX.set('alerts', true); FX.set('celebrations', true);
});

t('(b) Animations off: no animation runs; on: animations run', () => {
  FX.set('animations', true);
  let before = anim.calls; game(91, 6, 1); ok(anim.calls > before, 'animations run when on');
  FX.set('animations', false);
  before = anim.calls; game(91, 6, 1); ok(anim.calls === before, 'none when off, got ' + (anim.calls - before));
  FX.set('animations', true);
});

t('(c) game over celebrates win or lose for my team', () => {
  let wins = 0, losses = 0;
  for (let seed = 1; seed <= 30 && (!wins || !losses); seed++) {
    log.celebrates = [];
    const g = game(seed * 101, 7, seed % 7);
    const ends = log.celebrates.filter(k => k === 'win' || k === 'lose');
    ok(ends.length === 1, 'one end celebration, got ' + ends);
    ok(ends[0] === (g.won ? 'win' : 'lose'), 'seed ' + seed + ': won=' + g.won + ' but ' + ends[0]);
    if (g.won) wins++; else losses++;
  }
  ok(wins && losses, 'saw both a win and a loss (' + wins + '/' + losses + ')');
});

console.log((fails ? 'FAILED ' : 'ok ') + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
