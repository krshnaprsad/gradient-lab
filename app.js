/* Gradient Lab - page code. Rendering is WebGL; the blend maths mirrors mesh.js. */
(function () {
  'use strict';
  var M = MESH;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), hint = $('hint'), msg = $('msg');

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform int uCount;',
    'uniform vec3 uCols[12];',
    'uniform vec2 uPts[12];',
    'uniform float uSigma;',
    'uniform float uWarp;',
    'uniform float uGrain;',
    'uniform float uTime;',
    'uniform vec3 uBg;',
    'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    'vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 p = vec2(uv.x, uv.y);',
    '  vec2 sp = p;',
    '  if (uWarp > 0.0005) {',
    '    float n1 = snoise(p * 1.7 + vec2(uTime * 0.05, -uTime * 0.035));',
    '    float n2 = snoise(p * 1.7 + vec2(4.7 - uTime * 0.04, 2.3 + uTime * 0.03));',
    '    sp = p + uWarp * 0.30 * vec2(n1, n2);',
    '  }',
    '  vec3 acc = lin(uBg) * 0.2;',
    '  float W = 0.2;',
    '  for (int i = 0; i < 12; i++) {',
    '    if (i >= uCount) break;',
    '    float d = distance(sp, uPts[i]);',
    '    float g = exp(-(d * d) / (2.0 * uSigma * uSigma));',
    '    acc += lin(uCols[i]) * g;',
    '    W += g;',
    '  }',
    '  vec3 col = pow(acc / W, vec3(1.0 / 2.2));',
    '  float n = fract(sin(dot(gl_FragCoord.xy + mod(uTime, 10.0) * 61.7, vec2(12.9898, 78.233))) * 43758.5453);',
    '  col += (n - 0.5) * (uGrain + 0.004);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function makeGL(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true })
          || canvas.getContext('experimental-webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error');
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link error');
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uRes', 'uCount', 'uCols', 'uPts', 'uSigma', 'uWarp', 'uGrain', 'uTime', 'uBg'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    return { gl: gl, u: U };
  }

  function say(text, isErr) {
    msg.textContent = text; msg.hidden = !text;
    msg.className = 'msg' + (isErr ? ' err' : '');
    if (text) clearTimeout(say.t), say.t = setTimeout(function () { msg.hidden = true; }, 4000);
  }

  var state = M.createState();
  var simTime = 8.0;         // frozen unless Animate is on, so export matches the screen
  var adding = false;
  var drag = -1;
  var previewAspect = 16 / 10;
  var nextColor = '#5eb6f5';
  var ptPhase = [];          // per-blob drift phases

  var glc;
  try { glc = makeGL(cv); } catch (e) { glc = null; }
  if (!glc) {
    say('This tool needs WebGL, which your browser has blocked or does not support. Try Chrome or Edge with hardware acceleration on.', true);
    $('dl').disabled = true;
    return;
  }

  function hex3(hex) { var c = M.hexToRgb(hex); return [c.r / 255, c.g / 255, c.b / 255]; }

  function effPos(i, t) {
    var p = state.points[i];
    if (!state.animate) return [p.x, p.y];
    var ph = ptPhase[i] || [0, 0];
    return [p.x + 0.045 * Math.sin(t * 0.5 + ph[0]), p.y + 0.04 * Math.cos(t * 0.42 + ph[1])];
  }

  function draw(ctx, w, h, aspect, t) {
    var gl = ctx.gl, u = ctx.u;
    gl.viewport(0, 0, w, h);
    var cols = new Float32Array(36), pts = new Float32Array(24);
    for (var i = 0; i < state.points.length; i++) {
      var c = hex3(state.points[i].color);
      cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2];
      var ep = effPos(i, t);
      pts[i * 2] = ep[0] / aspect; pts[i * 2 + 1] = 1 - ep[1]; // gl y is bottom-up
    }
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1i(u.uCount, state.points.length);
    gl.uniform3fv(u.uCols, cols);
    gl.uniform2fv(u.uPts, pts);
    gl.uniform1f(u.uSigma, state.sigma);
    gl.uniform1f(u.uWarp, state.warp);
    gl.uniform1f(u.uGrain, state.grain);
    gl.uniform1f(u.uTime, t);
    var bg = hex3(state.bg);
    gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    var w = cv.clientWidth || 600;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.aspectRatio = previewAspect;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w / previewAspect * dpr);
  }

  var lastTs = 0;
  function loop(ts) {
    if (state.animate) simTime += Math.min((ts - lastTs) / 1000 || 0, 0.1);
    lastTs = ts;
    if (cv.width) draw(glc, cv.width, cv.height, previewAspect, simTime);
    drawHandles();
    requestAnimationFrame(loop);
  }

  // Blob handles are an HTML overlay so they stay crisp; divs are reused, only transforms change
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  cv.parentElement.appendChild(overlay);
  var handlePool = [];
  function drawHandles() {
    var r = cv.getBoundingClientRect();
    if (!r.height) return;
    while (handlePool.length < state.points.length) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:0;top:0;width:26px;height:26px;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.45);display:none';
      overlay.appendChild(d);
      handlePool.push(d);
    }
    for (var i = 0; i < handlePool.length; i++) {
      var el = handlePool[i];
      if (i >= state.points.length) { el.style.display = 'none'; continue; }
      var ep = effPos(i, simTime);
      var x = ep[0] / previewAspect * r.width - 13, y = ep[1] * r.height - 13;
      el.style.display = 'block';
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.background = state.points[i].color;
      el.style.border = i === state.selected ? '3px solid #fff' : '2px solid rgba(255,255,255,.85)';
    }
  }

  function toUnits(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.height, y: (e.clientY - r.top) / r.height, px: e.clientX - r.left, py: e.clientY - r.top, h: r.height };
  }
  function hit(e) {
    var best = -1, bd = 26; // px
    var r = cv.getBoundingClientRect();
    for (var i = 0; i < state.points.length; i++) {
      var ep = effPos(i, simTime);
      var x = ep[0] / previewAspect * r.width, y = ep[1] * r.height;
      var dd = Math.hypot(x - (e.clientX - r.left), y - (e.clientY - r.top));
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId);
    var i = hit(e);
    if (adding) {
      var q = toUnits(e);
      var col = nextColor;
      var p = M.addPoint(state, M.clamp(q.x, 0, previewAspect), M.clamp(q.y, 0, 1), col);
      if (p) { ptPhase.push([Math.random() * 6.28, Math.random() * 6.28]); syncSelection(); }
      else say('Twelve blobs is the most this can blend.');
      setAdding(false);
      return;
    }
    if (i >= 0) { drag = i; state.selected = i; syncSelection(); }
    else { state.selected = -1; syncSelection(); }
  });
  cv.addEventListener('pointermove', function (e) {
    if (drag < 0) return;
    var q = toUnits(e);
    state.points[drag].x = M.clamp(q.x, -0.15, previewAspect + 0.15);
    state.points[drag].y = M.clamp(q.y, -0.15, 1.15);
  });
  cv.addEventListener('pointerup', function () { drag = -1; });
  cv.addEventListener('dblclick', function (e) {
    var i = hit(e);
    if (i >= 0) {
      if (M.removePoint(state, i)) { ptPhase.splice(i, 1); syncSelection(); }
      else say('Keep at least two blobs, otherwise it is just a flat colour.');
    }
  });

  var ptColor = $('ptColor'), delBtn = $('delBtn');
  function syncSelection() {
    var i = state.selected;
    delBtn.disabled = i < 0;
    if (i >= 0) ptColor.value = state.points[i].color;
    chips();
  }
  ptColor.addEventListener('input', function () {
    if (state.selected >= 0) state.points[state.selected].color = ptColor.value;
    nextColor = ptColor.value;
    chips();
  });
  delBtn.addEventListener('click', function () {
    if (state.selected >= 0) {
      var i = state.selected;
      if (M.removePoint(state, i)) ptPhase.splice(i, 1);
      else say('Keep at least two blobs, otherwise it is just a flat colour.');
      syncSelection();
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected >= 0 && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      var i = state.selected;
      if (M.removePoint(state, i)) ptPhase.splice(i, 1);
      syncSelection();
    }
  });

  function setAdding(on) {
    adding = on;
    $('addBtn').classList.toggle('on', on);
    cv.classList.toggle('adding', on);
    hint.textContent = on ? 'Click anywhere to drop a blob' : 'Click a blob to select it';
  }
  $('addBtn').addEventListener('click', function () { setAdding(!adding); });

  function bindRange(id, key, fmt) {
    var el = $(id), out = $(id + 'Val');
    el.addEventListener('input', function () {
      state[key] = parseFloat(el.value);
      out.textContent = fmt(state[key]);
    });
  }
  bindRange('sigma', 'sigma', function (v) { return v.toFixed(2); });
  bindRange('warp', 'warp', function (v) { return v.toFixed(2); });
  bindRange('grain', 'grain', function (v) { return v.toFixed(3); });
  $('anim').addEventListener('change', function () { state.animate = $('anim').checked; });
  $('bgColor').addEventListener('input', function () { state.bg = $('bgColor').value; chips(); });

  function applyPoints(bg, pts) {
    state.bg = bg;
    $('bgColor').value = bg;
    state.points = [];
    ptPhase = [];
    pts.forEach(function (p) {
      state.points.push({ x: p.u * previewAspect, y: p.v, color: p.color });
      ptPhase.push([Math.random() * 6.28, Math.random() * 6.28]);
    });
    state.selected = -1;
    syncSelection();
  }

  var presetBox = $('presets');
  M.PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.className = 'preset'; b.type = 'button'; b.title = p.name;
    var stops = p.points.map(function (pt, i) { return pt.color + ' ' + Math.round(pt.u * 100) + '%'; }).join(',');
    b.innerHTML = '<span class="sw" style="background:linear-gradient(105deg,' + p.points.map(function (pt) { return pt.color; }).join(',') + ')"></span><span class="nm">' + p.name + '</span>';
    b.addEventListener('click', function () { applyPoints(p.bg, p.points); });
    presetBox.appendChild(b);
  });
  $('surprise').addEventListener('click', function () {
    var g = M.randomGradient();
    applyPoints(g.bg, g.points);
  });

  var sizeSel = $('size');
  M.SIZES.forEach(function (s) {
    var o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.id === 'custom' ? s.label : s.label + ' (' + s.w + ' x ' + s.h + ')';
    sizeSel.appendChild(o);
  });
  sizeSel.value = 'square';
  function exportSize() {
    var s = M.SIZES.find(function (x) { return x.id === sizeSel.value; });
    if (s.id !== 'custom') return { w: s.w, h: s.h };
    var w = M.clamp(parseInt($('cw').value, 10) || 1920, 100, 8000);
    var h = M.clamp(parseInt($('ch').value, 10) || 1080, 100, 8000);
    return { w: w, h: h };
  }
  function setAspect(w, h) {
    var na = w / h;
    if (Math.abs(na - previewAspect) > 0.001) {
      state.points = M.remapAspect(state.points, previewAspect, na);
      previewAspect = na;
    }
    resize();
  }
  sizeSel.addEventListener('change', function () {
    var s = exportSize();
    setAspect(s.w, s.h);
    $('customSz').classList.toggle('show', sizeSel.value === 'custom');
  });
  ['cw', 'ch'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var s = exportSize();
      setAspect(s.w, s.h);
    });
  });

  $('dl').addEventListener('click', function () {
    var s = exportSize();
    var frameTime = simTime;
    say('Rendering ' + s.w + ' x ' + s.h + '...');
    setTimeout(function () {
      try {
        var off = document.createElement('canvas');
        off.width = s.w; off.height = s.h;
        var ctx2 = makeGL(off);
        if (!ctx2) { say('Could not start the exporter (WebGL).', true); return; }
        var max = ctx2.gl.getParameter(ctx2.gl.MAX_RENDERBUFFER_SIZE);
        if (s.w > max || s.h > max) throw new Error('This device supports exports up to ' + max + ' px per side.');
        var oldPts = state.points;
        var expAspect = s.w / s.h;
        try {
          state.points = M.remapAspect(oldPts, previewAspect, expAspect);
          draw(ctx2, s.w, s.h, expAspect, frameTime);
        } finally {
          state.points = oldPts;
        }
        off.toBlob(function (blob) {
          var lose = ctx2.gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
          if (!blob) { say('The export came back empty. Try a smaller size.', true); return; }
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'gradient-lab-' + s.w + 'x' + s.h + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
          say('Downloaded gradient-lab-' + s.w + 'x' + s.h + '.png');
        }, 'image/png');
      } catch (err) {
        say('Export failed: ' + err.message, true);
      }
    }, 30);
  });

  function chips() {
    var box = $('chips');
    var items = [{ color: state.bg, name: 'background' }].concat(state.points.map(function (p, i) { return { color: p.color, name: 'blob ' + (i + 1) }; }));
    box.innerHTML = '';
    items.forEach(function (it) {
      var c = document.createElement('button');
      c.className = 'chip'; c.type = 'button'; c.title = 'Copy ' + it.color + ' (' + it.name + ')';
      c.innerHTML = '<i style="background:' + it.color + '"></i>' + it.color;
      c.addEventListener('click', function () {
        function done() { say('Copied ' + it.color); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(it.color).then(done, function () { say('Could not copy. The colour is ' + it.color, true); });
        else say('Copy this colour: ' + it.color);
      });
      box.appendChild(c);
    });
  }

  window.addEventListener('resize', resize);
  var s0 = exportSize();
  previewAspect = s0.w / s0.h;
  applyPoints(M.PRESETS[0].bg, M.PRESETS[0].points);
  resize();
  requestAnimationFrame(loop);
})();
