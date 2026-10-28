// Runs the solver off the main thread so the page never freezes.
importScripts('roles.js?v=12', 'solver.js?v=12');
self.onmessage = function (e) {
  const d = e.data || {};
  let r;
  try { r = self.CT.solver.solve(d.input, d.opts); } catch (err) { r = { error: 'Solver error: ' + err.message, pDemon: [], pEvil: [], pDrunk: [], pMinion: [], topTeams: [] }; }
  self.postMessage({ id: d.id, tag: d.tag, r });
};
