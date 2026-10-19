/* Gradient Lab - page code. Rendering is WebGL; the blend maths mirrors mesh.js. */
(function () {
  'use strict';
  window.GRADIENT_BUILD = '1.5.0';
  var M = MESH;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), hint = $('hint'), msg = $('msg');

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  // 2D simplex noise: Ashima Arts, MIT. See NOTICE.md.
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform int uCount;',
    'uniform vec3 uCols[24];',
    'uniform vec2 uPts[24];',
    'uniform float uSigma;',
    'uniform float uWarp;',
    'uniform float uFold;',
    'uniform vec2 uFoldC;',
    'uniform int uCurl;',
    'uniform float uGrain;',
    'uniform float uEdgeFade;',
    'uniform int uNoise;',
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
    'float sq(float x){return x*x;}',
    'float sig(float x){return 1.0/(1.0+exp(clamp(-x,-70.0,70.0)));}',
    'float surface(vec2 q,vec2 centre,vec2 radius,float angle,float softness){',
    '  vec2 d=q-centre;',
    '  float c=cos(angle),s=sin(angle);',
    '  vec2 e=vec2(c*d.x+s*d.y,-s*d.x+c*d.y)/radius;',
    '  return 1.0/(1.0+exp(clamp((dot(e,e)-1.0)/max(softness,0.02),-70.0,70.0)));',
    '}',
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
    '  float cresR = 0.0;',
    '  float cresA = 0.0;',
    '  float CR = 0.30 * min(1.0, aspect);',
    '  if (uFold > 0.001) {',
    '    if (uCurl == 1) {',
    '      vec2 hp = vec2(sp.x * aspect, sp.y);',
    '      vec2 q = hp - uFoldC;',
    '      float r = length(q);',
    '      float a0 = atan(q.y, q.x);',
    '      cresR = r; cresA = a0;',
    '      float tw = uFold * 8.0 * clamp((CR * 1.7 - r) / (CR * 1.45), 0.0, 1.0);',
    '      float amod = 0.45 + 0.55 * max(0.0, cos(a0 - 0.6));',
    '      float pinch = min(uFold * 1.0 * amod * exp(-sq((r - CR) / (0.5 * CR))), 0.9);',
    '      float r2 = r * (1.0 - pinch);',
    '      vec2 hp2 = uFoldC + r2 * vec2(cos(a0 + tw), sin(a0 + tw));',
    '      sp = vec2(hp2.x / aspect, hp2.y);',
    '    } else {',
    '      vec2 fc = vec2(uFoldC.x / aspect, uFoldC.y);',
    '      vec2 q = sp - fc;',
    '      float angle = uFold * 3.3 * exp(-dot(q,q) * 2.0);',
    '      float cs=cos(angle), sn=sin(angle);',
    '      sp = vec2(cs*q.x-sn*q.y,sn*q.x+cs*q.y) + fc;',
    '    }',
    '  }',
    '  vec3 acc = lin(uBg) * 0.2;',
    '  float W = 0.2;',
    '  for (int i = 0; i < 24; i++) {',
    '    if (i >= uCount) break;',
    '    float d = distance(sp, uPts[i]);',
    '    float g = exp(-(d * d) / (2.0 * uSigma * uSigma));',
    '    acc += lin(uCols[i]) * g;',
    '    W += g;',
    '  }',
    '  vec3 col = pow(acc / W, vec3(1.0 / 2.2));',
    '  if (uCurl == 1 && uFold > 0.001) {',
    '    float arc = max(0.0, cos(cresA - 2.4));',
    '    float rr = cresR - CR;',
    '    col *= 1.0 - uFold * 0.167 * arc * exp(-rr*rr / 0.0012) * (cresR < CR ? 1.0 : 0.25);',
    '    col += uFold * 0.0125 * arc * exp(-sq(rr-0.05) / 0.0025);',
    '  } else {',
    '    float ridge = sp.y - (0.49 + 0.10 * sin(sp.x * 5.0));',
    '    col *= 1.0 - uFold * 0.27 * exp(-ridge*ridge / 0.0008);',
    '    col += uFold * 0.07 * exp(-sq(ridge-0.045) / 0.0015);',
    '  }',
    '  if (uCurl == 2) {',
    '    // Sweep is a pair of open surfaces, not a radial displacement.',
    '    vec2 q = vec2(uv.x, 1.0-uv.y) - vec2(uFoldC.x/aspect-0.42557, (1.0-uFoldC.y)-0.36798);',
    '    float dx = q.x-0.42557;',
    '    float left = min(dx,0.0);',
    '    float strength = clamp(uFold,0.0,1.0);',
    '    float bend = mix(0.0,4.8884,strength/0.9);',
    '    float slope = 0.43549 + (uWarp-0.12)*0.65;',
    '    float upper = 0.36798 - slope*dx + 5.41704*left*left*strength/0.9;',
    '    float edge = 0.36798 + bend*left*left + 0.10407*(1.0-exp(-max(dx,0.0)*4.0))*strength/0.9;',
    '    float soft = max(uSigma/0.24,0.2);',
    '    float outerBlur = 0.02621*soft*(0.3+1.3*(1.0-exp(-sq(dx/0.22))));',
    '    float innerBlur = 0.05519*soft*(0.25+1.2*(1.0-exp(-sq(dx/0.25))));',
    '    float outer = 1.0/(1.0+exp(clamp(-(q.y-upper)/outerBlur,-70.0,70.0)));',
    '    float inner = 1.0/(1.0+exp(clamp(-(q.y-edge)/innerBlur,-70.0,70.0)));',
    '    vec3 field = uCount>0 ? uCols[0] : uBg;',
    '    vec3 band = uCount>1 ? uCols[1] : uBg;',
    '    vec3 lobe = uCount>2 ? uCols[2] : uBg;',
    '    vec3 glow = uCount>3 ? uCols[3] : uBg;',
    '    col = mix(mix(field,band,outer),lobe,inner);',
    '    float yellowMask = (1.0/(1.0+exp(clamp(-(q.y-0.72)/0.12,-70.0,70.0))))*exp(-q.x*q.x/0.018);',
    '    col = mix(col,glow,yellowMask);',
    '    // Extra points remain usable as local colour accents over the surface.',
    '    for (int j=4; j<24; j++) {',
    '      if (j>=uCount) break;',
    '      float d=distance(uv,uPts[j]);',
    '      col=mix(col,uCols[j],0.65*exp(-d*d/(2.0*uSigma*uSigma)));',
    '    }',
    '  }',
    '  if (uCurl == 3) {',
    '    // One continuous S body with curved outer bounds and a shared colour seam.',
    '    vec2 q=vec2(uv.x,1.0-uv.y)-vec2(uFoldC.x/aspect-0.5,(1.0-uFoldC.y)-0.5);',
    '    float tilt=(uWarp-0.35)*0.8;',
    '    q=vec2(cos(tilt)*(q.x-0.5)-sin(tilt)*(q.y-0.5),sin(tilt)*(q.x-0.5)+cos(tilt)*(q.y-0.5))+0.5;',
    '    float soft=max(uSigma/0.22,0.15);',
    '    vec3 mag=uCount>0?uCols[0]:uBg;',
    '    vec3 blue=uCount>1?uCols[1]:uBg;',
    '    vec3 violet=uCount>2?uCols[2]:uBg;',
    '    vec3 cyan=uCount>3?uCols[3]:uBg;',
    '    vec2 dm=uCount>0?vec2(uPts[0].x,1.0-uPts[0].y)-vec2(0.75,0.35):vec2(0.0);',
    '    vec2 db=uCount>1?vec2(uPts[1].x,1.0-uPts[1].y)-vec2(0.45,0.30):vec2(0.0);',
    '    vec2 dv=uCount>2?vec2(uPts[2].x,1.0-uPts[2].y)-vec2(0.26,0.75):vec2(0.0);',
    '    vec2 dc=uCount>3?vec2(uPts[3].x,1.0-uPts[3].y)-vec2(0.65,0.72):vec2(0.0);',
    '    vec2 bq=q-mix(db,dv,sig((q.y-0.5)/0.1));',
    '    float y=bq.y,x=bq.x;',
    '    float boundary=0.53351207+0.11034665*exp(-sq((y-0.32564781)/0.20882492))-(0.16733153+(uFold-0.75)*0.25)*exp(-sq((y-0.70737584)/0.13240994))-0.12*sig((y-0.81)/0.045);',
    '    float body=sig((boundary-x)/(0.02500000*soft));',
    '    float outer=sig((x-0.08871978-0.17100196*sq(y-0.76410999))/(0.05500000*soft))*sig((y-0.06200752-0.28363526*sq(x-0.36))/(0.02638225*soft))*sig((0.93681107-2.43575219*sq(x-0.27)-y)/(0.03591860*soft));',
    '    vec3 glow=clamp(blue+vec3(0.20400235,0.37755947,-0.00967716),0.0,1.0);',
    '    vec3 baseblue=mix(glow,blue,sig((x-0.37907863)/0.07586952));',
    '    vec3 bluevio=mix(baseblue,violet,sig((y-0.53968104-0.09711295*(x-0.4))/0.14823842));',
    '    float seam=sig((q.y-0.56629499+0.00479375*(q.x-0.6)+0.65*sq(max(q.x-0.6,0.0))-0.5*(dm.y+dc.y))/(0.01552252*soft));',
    '    float me=surface(q-dm,vec2(0.75155102,0.46434253),vec2(0.17405111,0.28837351),0.0,0.89746746*soft);',
    '    float ce=surface(q-dc,vec2(0.56864256,0.68042236),vec2(0.25940184,0.19889304),0.0,0.89883293*soft);',
    '    col=mix(uBg,mag,me*(1.0-seam));',
    '    col=mix(col,cyan,ce*seam);',
    '    col=mix(col,bluevio,body*outer);',
    '    for(int j=4;j<24;j++){',
    '      if(j>=uCount)break;',
    '      float d=distance(uv,uPts[j]);',
    '      col=mix(col,uCols[j],0.7*exp(-d*d/(2.0*uSigma*uSigma)));',
    '    }',
    '  }',
    '  // Keep every visible control point tied to its own colour and position.',
    '  // Surface modes may cover a whole area, but cannot hide a blob beneath it.',
    '  float anchorW=0.0;',
    '  vec3 anchorC=vec3(0.0);',
    '  float nearest=100.0;',
    '  float radius=clamp(uSigma*0.60,0.065,0.18);',
    '  for(int k=0;k<24;k++){',
    '    if(k>=uCount)break;',
    '    vec2 ad=uv-uPts[k];',
    '    float d=dot(ad,ad);',
    '    nearest=min(nearest,d);',
    '    float aw=exp(-d/(2.0*radius*radius));',
    '    anchorW+=aw;',
    '    anchorC+=uCols[k]*aw;',
    '  }',
    '  if(anchorW>0.00001){',
    '    float influence=exp(-nearest/(2.0*radius*radius));',
    '    col=mix(col,anchorC/anchorW,influence);',
    '  }',
    '  float scale = uNoise == 2 ? 180.0 : (uNoise == 1 ? 650.0 : 1600.0);',
    '  vec2 cell = floor(uv * scale);',
    '  float n = fract(sin(dot(cell, vec2(12.9898,78.233))) * 43758.5453);',
    '  vec3 grain = vec3(n - 0.5);',
    '  if (uNoise == 3) grain = vec3(n, fract(sin(dot(cell,vec2(39.34,11.13)))*29734.13), fract(sin(dot(cell,vec2(7.23,49.21)))*39114.91)) - 0.5;',
    '  col += grain * uGrain;',
    '  if (uEdgeFade > 0.0001) {',
    '    float edge=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y)*0.65);',
    '    col=mix(uBg,col,1.0-exp(-max(edge,0.0)/uEdgeFade));',
    '  }',
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
    ['uRes', 'uCount', 'uCols', 'uPts', 'uSigma', 'uWarp', 'uFold', 'uFoldC', 'uCurl', 'uGrain', 'uEdgeFade', 'uNoise', 'uTime', 'uBg'].forEach(function (n) {
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
    var cols = new Float32Array(M.MAX_POINTS * 3), pts = new Float32Array(M.MAX_POINTS * 2);
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
    gl.uniform1f(u.uFold, state.fold || 0);
    gl.uniform2f(u.uFoldC, (state.foldX === undefined ? 0.5 : state.foldX) * aspect, 1 - (state.foldY === undefined ? 0.5 : state.foldY));
    gl.uniform1i(u.uCurl, state.curl || 0);
    gl.uniform1f(u.uGrain, state.grain);
    gl.uniform1f(u.uEdgeFade, state.edgeFade || 0);
    gl.uniform1i(u.uNoise, state.noise || 0);
    gl.uniform1f(u.uTime, t);
    var bg = hex3(state.bg);
    gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    var stage = cv.parentElement;
    var card = stage.parentElement;
    var cs = getComputedStyle(card);
    var available = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // Fit the full image inside the viewport, including tall phone ratios.
    var maxHeight = Math.max(160, window.innerHeight - (window.innerWidth > 860 ? 270 : 200));
    var w = Math.min(available, maxHeight * previewAspect);
    var h = w / previewAspect;
    stage.style.width = w + 'px';
    stage.style.marginLeft = stage.style.marginRight = 'auto';
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
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
      else say('Twenty-four blobs is the limit. Select a blob to move or recolour it.');
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
    $('pointCount').textContent = state.points.length + ' / ' + M.MAX_POINTS;
    $('addBtn').disabled = state.points.length >= M.MAX_POINTS;
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
  bindRange('fold', 'fold', function (v) { return v.toFixed(2); });
  function syncFoldNote() { $('sweepNote').hidden = state.curl !== 2; $('flowNote').hidden = state.curl !== 3; }
  function wakeFold(to) {
    if (state.fold < 0.05) {
      state.fold = to;
      $('fold').value = state.fold; $('foldVal').textContent = state.fold.toFixed(2);
      say('Silk fold was at 0, raised it so the fold shows.');
    }
  }
  bindRange('foldX', 'foldX', function (v) { return v.toFixed(2); });
  bindRange('foldY', 'foldY', function (v) { return v.toFixed(2); });
  $('foldX').addEventListener('input', function () { wakeFold(0.30); });
  $('foldY').addEventListener('input', function () { wakeFold(0.30); });
  $('foldStyle').addEventListener('change', function () {
    state.curl = parseInt($('foldStyle').value, 10);
    if (state.curl > 0) wakeFold(0.60);
    syncFoldNote();
  });
  bindRange('edgeFade', 'edgeFade', function(v){return v.toFixed(3);});
  bindRange('grain', 'grain', function (v) { return v.toFixed(3); });
  $('noiseStyle').addEventListener('change', function () { state.noise = parseInt($('noiseStyle').value, 10); });
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
    b.addEventListener('click', function () {
      state.sigma = p.sigma || 0.22; state.warp = p.warp === undefined ? 0.35 : p.warp;
      state.fold = p.fold || 0; $('fold').value = state.fold; $('foldVal').textContent = state.fold.toFixed(2);
      state.foldX = p.foldX === undefined ? 0.5 : p.foldX; state.foldY = p.foldY === undefined ? 0.5 : p.foldY;
      state.curl = p.curl || 0; syncFoldNote(); $('foldStyle').value = String(state.curl);
      $('foldX').value = state.foldX; $('foldXVal').textContent = state.foldX.toFixed(2);
      $('foldY').value = state.foldY; $('foldYVal').textContent = state.foldY.toFixed(2);
      $('sigma').value = state.sigma; $('sigmaVal').textContent = state.sigma.toFixed(2);
      $('warp').value = state.warp; $('warpVal').textContent = state.warp.toFixed(2);
      if (p.noise !== undefined) { state.noise=p.noise; $('noiseStyle').value=String(p.noise); }
      if (p.grain !== undefined) { state.grain = p.grain; $('grain').value = p.grain; $('grainVal').textContent = p.grain.toFixed(3); }
      if (p.animate !== undefined) { state.animate = p.animate; $('anim').checked = p.animate; }
      state.edgeFade = p.edgeFade || 0; $('edgeFade').value=state.edgeFade; $('edgeFadeVal').textContent=state.edgeFade.toFixed(3);
      applyPoints(p.bg, p.points);
      if(p.size){sizeSel.value=p.size;var sz=exportSize();setAspect(sz.w,sz.h);$('customSz').classList.toggle('show',p.size==='custom');}
    });
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

  /* ---------- Export to Cube Lab ---------- */
  $('toCube').addEventListener('click', function () {
    var seen = {}, list = state.points.slice().sort(function (p, q) { return p.x - q.x; }).map(function (p) { return p.color.replace('#', '').toLowerCase(); }).filter(function (c) { if (seen[c]) return false; seen[c] = 1; return true; }).slice(0, 12);
    if (list.length < 2) { say('Add at least two different colours first.', true); return; }
    var url = 'https://krshnaprsad.github.io/cube-lab/#palette=' + list.join('-') + '&from=gradient-lab';
    var w = window.open(url, '_blank', 'noopener');
    say(w ? 'Opened Cube Lab with ' + list.length + ' colours.' : 'Your browser blocked the new tab. Allow pop-ups for this page and try again.', !w);
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
