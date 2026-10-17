/* Gradient Lab - pure logic, no browser code. Tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MESH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_POINTS = 12;
  var MIN_POINTS = 2;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function hexToRgb(hex) {
    if (typeof hex !== 'string') throw new Error('colour must be a string');
    var h = hex.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('bad colour: ' + hex);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function p(v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); }
    return '#' + p(r) + p(g) + p(b);
  }

  /* Points live in "height units": y is 0..1 top to bottom, x is 0..aspect. */
  function createState() {
    return {
      points: [],        // {x, y, color:'#rrggbb'}
      selected: -1,
      bg: '#f3f6fb',
      sigma: 0.42,       // softness of each blob
      warp: 0.35,        // swirl / fold amount
      grain: 0.015,      // film grain
      animate: true
    };
  }

  function addPoint(state, x, y, color) {
    if (state.points.length >= MAX_POINTS) return null;
    hexToRgb(color); // throws on bad colour
    var p = { x: x, y: y, color: color.toLowerCase() };
    state.points.push(p);
    state.selected = state.points.length - 1;
    return p;
  }

  function removePoint(state, i) {
    if (state.points.length <= MIN_POINTS) return false;
    if (i < 0 || i >= state.points.length) return false;
    state.points.splice(i, 1);
    state.selected = -1;
    return true;
  }

  /* Keep the same look when the export aspect changes. */
  function remapAspect(points, oldAspect, newAspect) {
    return points.map(function (p) {
      return { x: clamp(p.x / oldAspect, 0, 1) * newAspect, y: p.y, color: p.color };
    });
  }

  /* Preset points are stored as u,v in 0..1 and scaled by the aspect on apply. */
  var PRESETS = [
    {
      id: 'candy', name: 'Candy Cloud', bg: '#f3f6fb',
      points: [
        { u: 0.25, v: 0.30, color: '#5eb6f5' },
        { u: 0.72, v: 0.28, color: '#f27fd9' },
        { u: 0.30, v: 0.75, color: '#8b7cf6' },
        { u: 0.75, v: 0.78, color: '#5fe3d8' }
      ]
    },
    {
      id: 'neon', name: 'Neon Nights', bg: '#07030f',
      points: [
        { u: 0.22, v: 0.28, color: '#ff2e88' },
        { u: 0.70, v: 0.25, color: '#6d28d9' },
        { u: 0.45, v: 0.65, color: '#2563eb' },
        { u: 0.85, v: 0.80, color: '#0891b2' }
      ]
    },
    {
      id: 'golden', name: 'Golden Hour', bg: '#fff1f2',
      points: [
        { u: 0.15, v: 0.25, color: '#f43f5e' },
        { u: 0.70, v: 0.15, color: '#8b5cf6' },
        { u: 0.75, v: 0.70, color: '#fbbf24' },
        { u: 0.25, v: 0.85, color: '#fb7185' }
      ]
    },
    {
      id: 'ocean', name: 'Deep Ocean', bg: '#020617',
      points: [
        { u: 0.25, v: 0.30, color: '#0ea5e9' },
        { u: 0.70, v: 0.30, color: '#6366f1' },
        { u: 0.40, v: 0.75, color: '#10b981' },
        { u: 0.85, v: 0.75, color: '#0d9488' }
      ]
    },
    {
      id: 'orchid', name: 'Orchid Milk', bg: '#fdf2f8',
      points: [
        { u: 0.20, v: 0.20, color: '#7dd3fc' },
        { u: 0.65, v: 0.25, color: '#c084fc' },
        { u: 0.35, v: 0.70, color: '#f9a8d4' },
        { u: 0.80, v: 0.75, color: '#fda4af' }
      ]
    }
  ];

  var SIZES = [
    { id: 'phone', label: 'Phone wallpaper', w: 1290, h: 2796 },
    { id: 'desktop', label: 'Desktop 4K', w: 3840, h: 2160 },
    { id: 'square', label: 'Square post', w: 2048, h: 2048 },
    { id: 'poster', label: 'Poster (A4 print)', w: 2480, h: 3508 },
    { id: 'custom', label: 'Custom size', w: 0, h: 0 }
  ];

  var POOL = [
    '#f43f5e', '#fb7185', '#f97316', '#fbbf24', '#a3e635', '#10b981',
    '#5fe3d8', '#0ea5e9', '#5eb6f5', '#6366f1', '#8b5cf6', '#c084fc',
    '#f27fd9', '#f9a8d4', '#fda4af', '#7dd3fc', '#2563eb', '#ff2e88'
  ];

  function randomGradient(rng) {
    rng = rng || Math.random;
    var n = 3 + Math.floor(rng() * 3); // 3 to 5 points
    var pool = POOL.slice();
    var pts = [];
    for (var i = 0; i < n; i++) {
      var k = Math.floor(rng() * pool.length);
      var color = pool.splice(k, 1)[0];
      pts.push({ u: 0.12 + rng() * 0.76, v: 0.12 + rng() * 0.76, color: color });
    }
    var dark = rng() < 0.5;
    var bg = dark ? rgbToHex(4 + rng() * 12, 4 + rng() * 10, 10 + rng() * 18)
                  : rgbToHex(240 + rng() * 15, 240 + rng() * 15, 244 + rng() * 11);
    return { bg: bg, points: pts };
  }

  /* CPU copy of the shader blend, no warp. Used by tests and as documentation
     of what the GPU does: gaussian blobs blended in linear light. */
  function srgbToLinear(c) { return Math.pow(c / 255, 2.2); }
  function linearToSrgb(c) { return Math.pow(c, 1 / 2.2) * 255; }

  function shade(points, bg, sigma, x, y) {
    var W = 0.2, acc = [0, 0, 0];
    var b = hexToRgb(bg);
    acc[0] = srgbToLinear(b.r) * W; acc[1] = srgbToLinear(b.g) * W; acc[2] = srgbToLinear(b.b) * W;
    for (var i = 0; i < points.length; i++) {
      var dx = x - points[i].x, dy = y - points[i].y;
      var g = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      var c = hexToRgb(points[i].color);
      acc[0] += srgbToLinear(c.r) * g; acc[1] += srgbToLinear(c.g) * g; acc[2] += srgbToLinear(c.b) * g;
      W += g;
    }
    return [linearToSrgb(acc[0] / W), linearToSrgb(acc[1] / W), linearToSrgb(acc[2] / W)];
  }

  return {
    MAX_POINTS: MAX_POINTS, MIN_POINTS: MIN_POINTS,
    clamp: clamp, hexToRgb: hexToRgb, rgbToHex: rgbToHex,
    createState: createState, addPoint: addPoint, removePoint: removePoint,
    remapAspect: remapAspect, PRESETS: PRESETS, SIZES: SIZES,
    randomGradient: randomGradient, shade: shade
  };
});
