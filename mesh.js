/* Gradient Lab - pure logic, no browser code. Tested in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MESH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_POINTS = 24;
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
      sigma: 0.22,       // softness of each blob
      fold: 0,
      foldX: 0.5,        // fold centre, 0..1 left to right
      foldY: 0.5,        // fold centre, 0..1 top to bottom
      curl: 0,           // fold style: 0 wave, 1 curl
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

  // Denser hand-placed meshes. The old four-blob presets remain available.
  PRESETS.push(
    { id: 'aurora', name: 'Aurora Silk', bg: '#03112d', sigma: 0.16, warp: 0.75, points: [
      {u:0.08,v:0.12,color:'#073b89'},{u:0.42,v:0.10,color:'#3f239f'},
      {u:0.82,v:0.12,color:'#a931bf'},{u:0.20,v:0.40,color:'#1769d2'},
      {u:0.55,v:0.32,color:'#28ddd1'},{u:0.92,v:0.45,color:'#154f8b'},
      {u:0.08,v:0.80,color:'#252284'},{u:0.40,v:0.65,color:'#10baac'},
      {u:0.70,v:0.76,color:'#42e6be'},{u:0.95,v:0.94,color:'#062e69'}
    ]},
    { id: 'ribbon', name: 'Rose Ribbon', bg: '#231047', sigma: 0.13, warp: 0.9, points: [
      {u:0.10,v:0.08,color:'#281164'},{u:0.44,v:0.10,color:'#7d34bb'},
      {u:0.82,v:0.08,color:'#f48bb5'},{u:0.12,v:0.40,color:'#8458d8'},
      {u:0.40,v:0.35,color:'#fa77a6'},{u:0.70,v:0.38,color:'#ffbbb5'},
      {u:0.95,v:0.40,color:'#a8498c'},{u:0.12,v:0.70,color:'#ee9bd3'},
      {u:0.40,v:0.65,color:'#feccdb'},{u:0.70,v:0.72,color:'#8b3eaa'},
      {u:0.25,v:0.95,color:'#7336a4'},{u:0.88,v:0.96,color:'#301659'}
    ]},
    { id: 'lagoon', name: 'Lagoon Glass', bg: '#d9f3fa', sigma: 0.14, warp: 0.65, points: [
      {u:0.10,v:0.12,color:'#68a5e8'},{u:0.50,v:0.08,color:'#c6cdfa'},
      {u:0.90,v:0.15,color:'#fde4f6'},{u:0.24,v:0.42,color:'#26bfc8'},
      {u:0.68,v:0.40,color:'#5cb0e6'},{u:0.94,v:0.62,color:'#9d87ed'},
      {u:0.10,v:0.82,color:'#8ef5c7'},{u:0.43,v:0.72,color:'#50d9c6'},
      {u:0.65,v:0.95,color:'#a6cafa'},{u:0.90,v:0.92,color:'#ecd4fb'}
    ]}
  );

  PRESETS.push({ id:'silk', name:'Silk Fold', bg:'#a79ae9', sigma:0.20, warp:0.12, fold:0.85, points:[
    {u:0.02,v:0.95,color:'#ed3996'}, {u:0.35,v:0.82,color:'#b94fd0'},
    {u:0.85,v:0.90,color:'#6639ba'}, {u:0.15,v:0.35,color:'#4335ad'},
    {u:0.60,v:0.25,color:'#c2a4eb'}, {u:0.98,v:0.05,color:'#eef0ff'}
  ]});

  // Silk Curl: the fold engine's curl style winds the bands into a rounded
  // lobe with a soft, defined crease, like folded silk.
  PRESETS.push({ id:'curl', name:'Silk Curl', bg:'#b8cff2', sigma:0.30, warp:0.12, fold:0.9, curl:1, foldX:0.44, foldY:0.48, points:[
    {u:0.44,v:0.48,color:'#f2a096'}, {u:0.82,v:0.65,color:'#a55cc4'},
    {u:0.98,v:0.92,color:'#b06fd0'}, {u:0.10,v:0.90,color:'#9fc3f2'},
    {u:0.15,v:0.12,color:'#f5e3b0'}, {u:0.88,v:0.15,color:'#f2a896'}
  ]});

  var SIZES = [
    { id: 'phone', label: 'Phone wallpaper', w: 1290, h: 2796 },
    { id: 'desktop', label: '16:9 / Desktop 4K', w: 3840, h: 2160 },
    { id: 'square', label: '1:1 / Square post', w: 2048, h: 2048 },
    { id: 'poster', label: 'Poster (A4 print)', w: 2480, h: 3508 },
    { id:'portrait', label:'9:16 / Portrait', w:1080, h:1920 },
    { id:'classic', label:'4:3 / Classic', w:2400, h:1800 },
    { id:'photo', label:'3:2 / Photo', w:3000, h:2000 },
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
