// Runs the solver off the main thread so the page never freezes. A job runs in small steps, and a
// newer job with the same tag (the game moved on) replaces an older one that hasn't finished.
importScripts('roles.js?v=13', 'solver.js?v=13');
const jobs = new Map();   // tag -> { id, job }, oldest first
let running = false;
const ch = new MessageChannel();   // a zero-delay "come back after the inbox" (setTimeout clamps to 4 ms)
ch.port1.onmessage = work;
function fail(d, err) { return { error: 'Solver error: ' + err.message, pDemon: [], pEvil: [], pDrunk: [], pMinion: [], topTeams: [] }; }
function work() {
  running = false;
  const t0 = Date.now();
  while (jobs.size) {
    const [tag, j] = jobs.entries().next().value;
    let more = false, r = null;
    try { more = j.job.step(); if (!more) r = j.job.result(); } catch (err) { r = fail(j, err); more = false; }
    if (!more) { jobs.delete(tag); self.postMessage({ id: j.id, tag, r }); }
    if (Date.now() - t0 > 30) break;   // read the inbox: a newer job may replace this one
  }
  if (jobs.size) { running = true; ch.port2.postMessage(0); }
}
self.onmessage = function (e) {
  const d = e.data || {};
  let job;
  try { job = self.CT.solver.start(d.input, d.opts); } catch (err) { self.postMessage({ id: d.id, tag: d.tag, r: fail(d, err) }); return; }
  jobs.delete(d.tag);
  jobs.set(d.tag, { id: d.id, job });
  if (!running) { running = true; ch.port2.postMessage(0); }
};
