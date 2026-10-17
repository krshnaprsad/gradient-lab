/* Node tests for the pure logic. Run: npm test */
'use strict';
const assert = require('assert');
const M = require('./mesh.js');

let n = 0;
function ok(cond, msg) { n++; assert(cond, msg); }

// colour helpers
['#000000', '#ffffff', '#5eb6f5', '#ff2e88', '#a3e635'].forEach(h => {
  const c = M.hexToRgb(h);
  ok(M.rgbToHex(c.r, c.g, c.b) === h, 'hex roundtrip ' + h);
});
ok(M.hexToRgb('#abc').r === 0xaa && M.hexToRgb('#abc').b === 0xcc, 'short hex expands');
assert.throws(() => M.hexToRgb('red'), 'bad colour throws'); n++;
assert.throws(() => M.hexToRgb('#12345'), 'bad colour throws'); n++;

// state caps
const s = M.createState();
ok(M.addPoint(s, 0.1, 0.1, '#ff0000') !== null, 'add first');
ok(M.addPoint(s, 0.2, 0.2, '#00ff00') !== null, 'add second');
ok(M.removePoint(s, 0) === false, 'cannot remove at the minimum');
M.addPoint(s, 0.4, 0.4, '#0000ff');
ok(M.removePoint(s, 0) === true, 'remove down to min');
ok(M.removePoint(s, 0) === false, 'cannot go below ' + M.MIN_POINTS + ' points');
for (let i = 0; i < M.MAX_POINTS + 2; i++) M.addPoint(s, 0.3, 0.3, '#0000ff');
ok(s.points.length === M.MAX_POINTS, 'capped at ' + M.MAX_POINTS + ' points');
assert.throws(() => M.addPoint(M.createState(), 0, 0, 'oops'), 'addPoint rejects bad colour'); n++;

// presets are valid and inside the canvas
M.PRESETS.forEach(p => {
  ok(p.points.length >= M.MIN_POINTS && p.points.length <= M.MAX_POINTS, p.id + ' point count');
  M.hexToRgb(p.bg);
  p.points.forEach(pt => {
    M.hexToRgb(pt.color);
    ok(pt.u >= 0 && pt.u <= 1 && pt.v >= 0 && pt.v <= 1, p.id + ' point inside');
  });
});

// sizes are sane
M.SIZES.forEach(sz => {
  if (sz.id === 'custom') return;
  ok(sz.w >= 1000 && sz.h >= 1000 && sz.w <= 4000 && sz.h <= 4000, sz.id + ' dimensions');
});

// aspect remap keeps points inside bounds and keeps colours
const pts = [{ x: 0.4, y: 0.5, color: '#123456' }, { x: 1.2, y: 0.9, color: '#654321' }];
const rm = M.remapAspect(pts, 1.6, 0.5);
ok(rm[0].x <= 0.5 && rm[0].y === 0.5 && rm[0].color === '#123456', 'remap keeps colour and bounds');

// random gradients are always valid
for (let i = 0; i < 200; i++) {
  const g = M.randomGradient();
  M.hexToRgb(g.bg);
  ok(g.points.length >= 3 && g.points.length <= 5, 'random point count');
  const seen = new Set();
  g.points.forEach(p => {
    M.hexToRgb(p.color);
    ok(!seen.has(p.color), 'random colours unique');
    seen.add(p.color);
    ok(p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1, 'random point inside');
  });
}

// the blend itself: finite, in range, smooth, and honest near a blob
const pr = M.PRESETS[0];
const aspect = 1290 / 2796;
const wpts = pr.points.map(p => ({ x: p.u * aspect, y: p.v, color: p.color }));
for (let i = 0; i < 500; i++) {
  const c = M.shade(wpts, pr.bg, 0.42, Math.random() * aspect, Math.random());
  c.forEach(v => ok(Number.isFinite(v) && v >= 0 && v <= 255, 'shade in range'));
}
// walking toward a blob moves the colour toward that blob's colour
function dist(a, hex) { const c = M.hexToRgb(hex); return Math.hypot(a[0] - c.r, a[1] - c.g, a[2] - c.b); }
const steps = [0.0, 0.33, 0.66, 1.0].map(f =>
  M.shade(wpts, pr.bg, 0.42, 0.02 + (wpts[0].x - 0.02) * f, 0.02 + (wpts[0].y - 0.02) * f));
for (let i = 1; i < steps.length; i++)
  ok(dist(steps[i], wpts[0].color) < dist(steps[i - 1], wpts[0].color), 'colour moves toward the blob as you approach it');
// smoothness: neighbouring samples never jump (no banding source in the maths)
let maxJump = 0;
for (let i = 0; i < 200; i++) {
  const x = Math.random() * aspect, y = Math.random();
  const a = M.shade(wpts, pr.bg, 0.42, x, y);
  const b = M.shade(wpts, pr.bg, 0.42, x + 0.002, y);
  maxJump = Math.max(maxJump, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}
ok(maxJump < 3, 'blend is smooth, max channel jump ' + maxJump.toFixed(3));

console.log('ok - ' + n + ' checks passed');
