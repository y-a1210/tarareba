/*
 * タラレバ — world3d.js
 * もしもの箱庭（立体のミニチュア世界）。three.js（r128）で、浮かぶ島の上に暮らしを描く。
 * WebGL や three.js が使えないときは、hakoniwa.js のドット表示（MW）が代わりに使われる。
 * 公開する関数は MW と同じ形：init / reset / setPlace / event / release / setMonth / update / draw / setReduced
 */
'use strict';

const W3 = (() => {
  const R = 10;          // 島の半径
  const WALK_Z = 3.1;    // 人が歩く通りの位置（手前）
  const TOD = { '2': 0.46, '1': 0.56, '0': 0.655, '-1': 0.735, '-2': 0.86 };
  let T = null, renderer = null, scene = null, camera = null, canvasEl = null, inited = false, okCache = null;
  let sun = null, moonLight = null, hemi = null, skyCanvas = null, skyCtx = null, skyTex = null, stars = null, sunDisc = null, moonDisc = null, rim = null;
  let groundCanvas = null, groundCtx = null, groundTex = null;
  let place = null, prev = null, trans = 1;
  let you = null, comps = [], emote = null, emoteCtx = null, emoteTex = null;
  let flakes = null, rain = null, cloudMat = null;
  const clouds = [];
  const glow = new Set();   // 夜に光る材質（userData.nf が強さ）
  const G = {};
  const MATS = new Map();
  const TEX = {};
  const st = {
    place: '', withs: [], mood: 0, tod: 0.58, target: null, month: 0, startMonth: 0, season: '', painted: '',
    walking: false, x: -0.6, dir: 1, emote: null, hop: 0, t: 0, phase: 0, reduced: false,
    azAuto: 0, azUser: 0, elUser: 0, lastUser: -99, dist: 33, drag: null, weather: '', skyKey: '',
  };

  /* ---------- small helpers ---------- */
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function rngf(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function nightAt(t) { if (t < 0.2 || t > 0.82) return 1; if (t > 0.34 && t < 0.68) return 0; return t <= 0.34 ? 1 - (t - 0.2) / 0.14 : (t - 0.68) / 0.14; }
  function seasonOf(cal) { return cal >= 2 && cal <= 4 ? 'spring' : cal >= 5 && cal <= 7 ? 'summer' : cal >= 8 && cal <= 10 ? 'autumn' : 'winter'; }
  function hex2(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mixHex(a, b, k) { const x = hex2(a), y = hex2(b); const c = x.map((v, i) => Math.round(v + (y[i] - v) * k)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  const col = h => new T.Color(h).convertSRGBToLinear();
  function mat(h, o) {
    const k = h + (o ? JSON.stringify(o) : '');
    if (!MATS.has(k)) MATS.set(k, new T.MeshStandardMaterial(Object.assign({ color: col(h), roughness: 0.85, metalness: 0 }, o || {})));
    return MATS.get(k);
  }
  function glowMat(baseHex, emiHex, nf, extra) {
    const m = new T.MeshStandardMaterial(Object.assign({ color: col(baseHex), emissive: col(emiHex), emissiveIntensity: 0, roughness: 0.3, metalness: 0.1 }, extra || {}));
    m.userData.nf = nf; glow.add(m); return m;
  }
  function canvasTex(c, repeat) {
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function mk(geo, material, sx, sy, sz, x, y, z, o) {
    const m = new T.Mesh(geo, material); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    const op = o || {}; m.castShadow = op.cast !== false; m.receiveShadow = op.receive !== false;
    if (op.rx) m.rotation.x = op.rx; if (op.ry) m.rotation.y = op.ry; if (op.rz) m.rotation.z = op.rz;
    return m;
  }
  // base-aligned box: y is the bottom
  function box(g, m, w, h, d, x, y, z, o) { const b = mk(G.box, typeof m === 'string' ? mat(m) : m, w, h, d, x, y + h / 2, z, o); g.add(b); return b; }
  function cyl(g, m, r, h, x, y, z, o) { const c = mk(G.cyl, typeof m === 'string' ? mat(m) : m, r * 2, h, r * 2, x, y + h / 2, z, o); g.add(c); return c; }
  function ball(g, m, r, x, y, z, o) { const b = mk(G.ico, typeof m === 'string' ? mat(m) : m, r * 2, r * 2, r * 2, x, y, z, o); g.add(b); return b; }
  // 片付け用のリストは、いちばん近い祖先の場面グループが持っている
  function disposeList(o) { let x = o; while (x) { if (x.userData && x.userData.dispose) return x.userData.dispose; x = x.parent; } return []; }
  function roof(g, m, w, h, d, x, y, z, ry) {
    const shape = new T.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.lineTo(-w / 2, 0);
    const geo = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    const r = new T.Mesh(geo, typeof m === 'string' ? mat(m) : m); r.position.set(x, y, z); r.rotation.y = ry || 0; r.castShadow = r.receiveShadow = true;
    g.add(r); disposeList(g).push(geo); return r;
  }

  /* ---------- availability + setup ---------- */
  function available() {
    if (okCache != null) return okCache;
    try {
      if (!window.THREE || !window.WebGLRenderingContext) return (okCache = false);
      const c = document.createElement('canvas');
      okCache = !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (err) { okCache = false; }
    return okCache;
  }
  function init(canvas) {
    if (inited) return true;
    try {
      T = window.THREE; canvasEl = canvas;
      renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(30, 5 / 3, 0.5, 220);
      G.box = new T.BoxGeometry(1, 1, 1); G.cyl = new T.CylinderGeometry(0.5, 0.5, 1, 18); G.cyl6 = new T.CylinderGeometry(0.5, 0.5, 1, 6);
      G.cone = new T.ConeGeometry(0.5, 1, 18); G.sph = new T.SphereGeometry(0.5, 20, 14); G.ico = new T.IcosahedronGeometry(0.5, 1);
      makeTextures(); setupSky(); setupLights(); setupIsland(); setupClouds(); setupWeather(); setupEmote();
      you = figure('you'); scene.add(you);
      bindPointer(canvas);
      inited = true; resize();
      return true;
    } catch (err) {
      console.warn('3D init failed', err); okCache = false; inited = false; return false;
    }
  }
  function resize() {
    if (!inited) return;
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  /* ---------- textures made in code ---------- */
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function facade(o) {
    const N = 4, C = 64, [c, x] = cvs(N * C, N * C), [e, y] = cvs(N * C, N * C), r = rngf(o.seed);
    x.fillStyle = o.wall; x.fillRect(0, 0, N * C, N * C); y.fillStyle = '#000000'; y.fillRect(0, 0, N * C, N * C);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const px = i * C, py = j * C;
      let wx, wy, ww, wh;
      if (o.style === 'office') { wx = px + 3; wy = py + 3; ww = C - 6; wh = C - 12; }
      else if (o.style === 'school') { wx = px + 6; wy = py + 12; ww = C - 12; wh = C - 26; }
      else { wx = px + 14; wy = py + 10; ww = C - 28; wh = C - 30; }
      x.fillStyle = o.frame; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      x.fillStyle = o.glass; x.fillRect(wx, wy, ww, wh);
      x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(wx + 3, wy + 3, ww * 0.28, wh * 0.4);
      if (o.style === 'office') { x.fillStyle = o.frame; x.fillRect(px, py + C - 8, C, 8); }
      if (o.style === 'apt') { x.fillStyle = o.rail; x.fillRect(px + 6, py + C - 17, C - 12, 3); x.fillRect(px + 6, py + C - 10, C - 12, 3); for (let k = px + 8; k < px + C - 6; k += 8) x.fillRect(k, py + C - 17, 2, 10); }
      if (r() < (o.lit || 0.55)) { const g = 190 + ((r() * 50) | 0); y.fillStyle = `rgb(255,${g},${Math.round(g * 0.62)})`; y.fillRect(wx, wy, ww, wh); }
    }
    return { map: c, emi: e };
  }
  function makeTextures() {
    TEX.apt = facade({ wall: '#e4ddd0', glass: '#6f8fb0', frame: '#cfc6b6', rail: '#8d857a', style: 'apt', seed: 11, lit: 0.6 });
    TEX.office = facade({ wall: '#5f7f9f', glass: '#88aed0', frame: '#4f6d8a', style: 'office', seed: 23, lit: 0.45 });
    TEX.school = facade({ wall: '#eee6d6', glass: '#7fa6c4', frame: '#d6ccb9', style: 'school', seed: 31, lit: 0.35 });
    TEX.cityA = facade({ wall: '#c9ccd6', glass: '#6c88a8', frame: '#b3b8c4', style: 'apt', rail: '#c9ccd6', seed: 41, lit: 0.6 });
    TEX.cityB = facade({ wall: '#d6d0c4', glass: '#71879e', frame: '#c2baab', style: 'school', seed: 53, lit: 0.55 });
    TEX.cityC = facade({ wall: '#aeb8c9', glass: '#86a4c2', frame: '#95a1b4', style: 'office', seed: 67, lit: 0.5 });
    // awning stripes
    let [c, x] = cvs(256, 64); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f6efe4' : '#3f7a5e'; x.fillRect(i * 16, 0, 16, 64); }
    TEX.awning = c;
    // water ripples
    [c, x] = cvs(256, 256); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2f6fa8'); gr.addColorStop(1, '#3a86bd'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const r = rngf(5); x.strokeStyle = 'rgba(200,232,255,0.55)'; x.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const px = r() * 256, py = r() * 256, l = 10 + r() * 26; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 3, px + l, py); x.stroke(); }
    TEX.water = c;
    // soft dot for particles
    [c, x] = cvs(64, 64); const rg = x.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
    TEX.dot = c;
  }

  /* ---------- sky, light, island ---------- */
  const SKY3 = [
    [0.00, '#0a1030', '#1a2350', '#25305e'], [0.20, '#111a40', '#273260', '#36406c'], [0.27, '#4a5aa0', '#e9a58c', '#f6c49a'],
    [0.34, '#5b9fe0', '#a9d4f2', '#e3f1f8'], [0.66, '#4f97dc', '#a3d0f0', '#e0eff7'], [0.735, '#41397e', '#ee8f6a', '#f7c08e'],
    [0.80, '#1a1f4c', '#38356a', '#4a4577'], [1.00, '#0a1030', '#1a2350', '#25305e'],
  ];
  function skyAt(t) {
    for (let i = 0; i < SKY3.length - 1; i++) {
      const a = SKY3[i], b = SKY3[i + 1];
      if (t >= a[0] && t <= b[0]) { const k = (t - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => mixHex(a[j], b[j], k)); }
    }
    return [SKY3[0][1], SKY3[0][2], SKY3[0][3]];
  }
  function setupSky() {
    [skyCanvas, skyCtx] = cvs(4, 256);
    skyTex = new T.CanvasTexture(skyCanvas); skyTex.encoding = T.sRGBEncoding; scene.background = skyTex;
    scene.fog = new T.Fog(0xcfe6f5, 48, 120);
    const N = 700, pos = new Float32Array(N * 3), r = rngf(9);
    for (let i = 0; i < N; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 0.9), rad = 80;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * rad; pos[i * 3 + 1] = Math.cos(ph) * rad * 0.75 + 6; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rad;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    stars = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    scene.add(stars);
    sunDisc = new T.Mesh(new T.SphereGeometry(2.6, 24, 16), new T.MeshBasicMaterial({ color: 0xfff1c4, fog: false }));
    moonDisc = new T.Mesh(new T.SphereGeometry(1.8, 24, 16), new T.MeshBasicMaterial({ color: 0xf2f0e2, fog: false }));
    scene.add(sunDisc, moonDisc);
  }
  function paintSky(top, mid, bot) {
    const k = top + mid + bot; if (k === st.skyKey) return; st.skyKey = k;
    const g = skyCtx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, bot);
    skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
  }
  function setupLights() {
    hemi = new T.HemisphereLight(0xcfe6ff, 0x5a4a32, 0.7); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff2dc, 2.2); sun.castShadow = true;
    const big = Math.min(window.innerWidth, window.innerHeight) > 700 ? 2048 : 1024; sun.shadow.mapSize.set(big, big);
    const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    moonLight = new T.DirectionalLight(0x9fb3ff, 0); moonLight.position.set(-20, 30, 12); scene.add(moonLight);
  }
  const GPAL = {
    spring: { grass: '#7fb85e', dark: '#6aa24c', light: '#97c977', path: '#d9cba8', field: '#8fc3d6', rim: '#6aa24c', sand: '#e6d4a8' },
    summer: { grass: '#5c9e4a', dark: '#4c8a3d', light: '#6fb35a', path: '#d3c39d', field: '#5aa64b', rim: '#4c8a3d', sand: '#e9d6a6' },
    autumn: { grass: '#7f8a45', dark: '#6b7438', light: '#959d55', path: '#cdb991', field: '#d2a944', rim: '#6b7438', sand: '#e0cc9c' },
    winter: { grass: '#d3dce6', dark: '#b9c6d4', light: '#e8edf2', path: '#aaa498', field: '#dfe6ed', rim: '#b9c6d4', sand: '#d6cfbd' },
  };
  function setupIsland() {
    [groundCanvas, groundCtx] = cvs(1024, 1024);
    groundTex = canvasTex(groundCanvas);
    const top = new T.Mesh(new T.CircleGeometry(R, 96), new T.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }));
    top.rotation.x = -Math.PI / 2; top.receiveShadow = true; scene.add(top);
    const [c, x] = cvs(512, 128);
    const layers = [['#4f8a3c', 0, 10], ['#5b3f2b', 10, 46], ['#7a5a3e', 46, 86], ['#8c7a68', 86, 128]];
    layers.forEach(([h, a, b]) => { x.fillStyle = h; x.fillRect(0, a, 512, b - a); });
    const r = rngf(3);
    for (let i = 0; i < 260; i++) { x.fillStyle = r() > 0.5 ? 'rgba(40,28,18,0.35)' : 'rgba(170,150,120,0.35)'; const s = 2 + r() * 6; x.beginPath(); x.ellipse(r() * 512, 14 + r() * 112, s, s * 0.7, 0, 0, Math.PI * 2); x.fill(); }
    const sideTex = canvasTex(c, true); sideTex.repeat.set(5, 1);
    const side = new T.Mesh(new T.CylinderGeometry(R, R * 0.92, 2.4, 96, 1, true), new T.MeshStandardMaterial({ map: sideTex, roughness: 1 }));
    side.position.y = -1.2; side.receiveShadow = true; scene.add(side);
    const bottom = new T.Mesh(new T.CircleGeometry(R * 0.92, 64), mat('#3b2b20')); bottom.rotation.x = Math.PI / 2; bottom.position.y = -2.4; scene.add(bottom);
    rim = new T.Mesh(new T.TorusGeometry(R, 0.09, 8, 120), mat(GPAL.autumn.rim)); rim.rotation.x = Math.PI / 2; scene.add(rim);
  }
  function setupClouds() {
    cloudMat = new T.MeshStandardMaterial({ color: col('#ffffff'), roughness: 1, emissive: col('#ffffff'), emissiveIntensity: 0.18, transparent: true, opacity: 0.94 });
    const r = rngf(17);
    for (let i = 0; i < 5; i++) {
      const c = new T.Group(); const n = 4 + (i % 3);
      for (let k = 0; k < n; k++) { const s = 0.9 + r() * 0.9; const p = new T.Mesh(G.sph, cloudMat); p.scale.set(s * 1.6, s, s * 1.1); p.position.set(k * 0.95 - n * 0.47, r() * 0.35, (r() - 0.5) * 0.9); c.add(p); }
      c.position.set(-16 + i * 7.5, 7.5 + (i % 2) * 1.6, -11 - (i * 2.3) % 6); c.userData.v = 0.22 + (i % 3) * 0.1;
      scene.add(c); clouds.push(c);
    }
  }

  /* ---------- ground painting (per place + season) ---------- */
  function paintGround(pl, season) {
    const key = pl + '|' + season; if (st.painted === key) return; st.painted = key;
    const x = groundCtx, W = 1024, P = GPAL[season] || GPAL.autumn, r = rngf(hashStr(key));
    const px = v => (v / R + 1) / 2 * W, pz = v => (v / R + 1) / 2 * W, ps = v => v / (2 * R) * W;
    const rect = (x0, z0, x1, z1, c) => { x.fillStyle = c; x.fillRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0)); };
    const path = (pts, w, c) => { x.strokeStyle = c; x.lineWidth = ps(w); x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(px(a), pz(b)) : x.moveTo(px(a), pz(b)))); x.stroke(); };
    x.fillStyle = P.grass; x.fillRect(0, 0, W, W);
    for (let i = 0; i < 14000; i++) { x.globalAlpha = 0.2 + r() * 0.35; x.fillStyle = r() > 0.5 ? P.dark : P.light; const s = 1 + r() * 3.5; x.fillRect(r() * W, r() * W, s, s); }
    x.globalAlpha = 1;
    const walk = () => path([[-10, WALK_Z], [10, WALK_Z]], 1.4, P.path);
    switch (pl) {
      case 'fork':
        path([[0, 10], [0, 3.2], [-6.6, -6.6]], 1.4, P.path);
        path([[0, 3.2], [6.6, -6.6]], 1.4, season === 'winter' ? '#d9d2ee' : '#cfc4ee');
        break;
      case 'home':
        walk(); path([[-1.0, -0.9], [-1.0, WALK_Z]], 1.0, P.path);
        if (season === 'spring' || season === 'summer') for (let i = 0; i < 90; i++) { x.fillStyle = ['#f2a6b8', '#f6d36b', '#ffffff', '#c58be0'][i % 4]; const fx = -5.4 + r() * 3.4, fz = -0.5 + r() * 0.6; x.beginPath(); x.arc(px(fx), pz(fz), 3, 0, Math.PI * 2); x.fill(); }
        break;
      case 'apartment':
        walk(); rect(2.6, -1.2, 7.2, 1.6, '#9aa0a6'); x.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) x.fillRect(px(3.0 + i * 1.1), pz(-1.0), 2, ps(2.2));
        break;
      case 'city':
        rect(-10, 2.3, 10, 4.2, '#c9cbd0'); rect(-10, 4.2, 10, 6.9, '#5b6068');
        x.fillStyle = '#f2f2f2'; for (let i = -10; i < 10; i += 1.2) x.fillRect(px(i), pz(5.5) - 2, ps(0.6), 4);
        for (let i = 0; i < 6; i++) rect(-1.2 + i * 0.42, 4.3, -1.0 + i * 0.42, 6.8, '#e8e8e8');
        break;
      case 'countryside':
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
          const x0 = -8 + i * 2.3, z0 = -5 + j * 2.4;
          rect(x0, z0, x0 + 2.1, z0 + 2.2, P.field);
          if (season === 'spring') { x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(px(x0 + 0.3), pz(z0 + 0.3), ps(0.8), ps(0.3)); }
          if (season === 'summer' || season === 'autumn') { x.fillStyle = season === 'summer' ? '#4a923f' : '#c79c3c'; for (let k = 0; k < 7; k++) x.fillRect(px(x0 + 0.1), pz(z0 + 0.15 + k * 0.3), ps(1.9), 2); }
        }
        path([[-10, WALK_Z], [10, WALK_Z]], 1.3, season === 'winter' ? '#cfc7b8' : '#b89d74');
        break;
      case 'school':
        walk(); rect(-6.2, -1.6, 6.2, 2.3, season === 'winter' ? '#e6e3dc' : '#d9c7a0');
        x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 3; x.beginPath(); x.ellipse(px(0), pz(0.35), ps(4.4), ps(1.4), 0, 0, Math.PI * 2); x.stroke();
        break;
      case 'office':
        rect(-7.5, -1.4, 7.5, 4.6, '#cfcac2'); x.fillStyle = '#bcb6ac';
        for (let i = -7.5; i < 7.5; i += 0.8) x.fillRect(px(i), pz(-1.4), 2, ps(6));
        for (let j = -1.4; j < 4.6; j += 0.8) x.fillRect(px(-7.5), pz(j), ps(15), 2);
        break;
      case 'station':
        rect(-10, -2.7, 10, -0.9, '#8f887d'); walk();
        break;
      case 'cafe':
        walk(); rect(-4.4, -0.9, 5.2, 2.0, '#d8cdb9'); x.fillStyle = '#c8bca6';
        for (let i = -4.4; i < 5.2; i += 0.6) x.fillRect(px(i), pz(-0.9), 2, ps(2.9));
        break;
      case 'sea':
        rect(-10, -0.8, 10, 10, P.sand);
        for (let i = 0; i < 2200; i++) { x.fillStyle = r() > 0.5 ? 'rgba(160,130,90,0.25)' : 'rgba(255,255,255,0.3)'; x.fillRect(r() * W, pz(-0.8) + r() * (W - pz(-0.8)), 2, 2); }
        break;
      default: walk();
    }
    groundTex.needsUpdate = true;
  }

  /* ---------- props ---------- */
  function win(g, x, y, z, w, h, ry, lit) {
    const m = lit === false ? mat('#41506d', { roughness: 0.25, metalness: 0.2 }) : (TEX.winLit || (TEX.winLit = glowMat('#41506d', '#ffcf7a', 1.7, { roughness: 0.25, metalness: 0.2 })));
    const b = mk(G.box, m, w, h, 0.07, x, y, z, { ry: ry || 0, cast: false }); g.add(b); return b;
  }
  function building(g, kind, w, h, d, x, z, ry) {
    const f = TEX[kind]; const cell = kind === 'office' ? 0.72 : kind === 'school' ? 0.95 : 0.85;
    const make = (cols, rows) => {
      const map = new T.CanvasTexture(f.map); map.encoding = T.sRGBEncoding; map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(cols / 4, rows / 4);
      const em = new T.CanvasTexture(f.emi); em.encoding = T.sRGBEncoding; em.wrapS = em.wrapT = T.RepeatWrapping; em.repeat.set(cols / 4, rows / 4);
      const m = new T.MeshStandardMaterial({ map, emissiveMap: em, emissive: col('#ffd08a'), emissiveIntensity: 0, roughness: kind === 'office' ? 0.35 : 0.8, metalness: kind === 'office' ? 0.25 : 0 });
      m.userData.nf = 1.5; glow.add(m); g.userData.glow.push(m); g.userData.dispose.push(map, em, m); return m;
    };
    const rows = Math.max(1, Math.round(h / cell)), sideZ = make(Math.max(1, Math.round(w / cell)), rows), sideX = make(Math.max(1, Math.round(d / cell)), rows);
    const top = mat(kind === 'office' ? '#4a5a6e' : '#9a9184');
    const b = new T.Mesh(G.box, [sideX, sideX, top, top, sideZ, sideZ]); b.scale.set(w, h, d); b.position.set(x, h / 2, z); b.rotation.y = ry || 0;
    b.castShadow = b.receiveShadow = true; g.add(b);
    const cap = box(g, kind === 'office' ? '#3c4a5c' : '#8a8174', w + 0.12, 0.14, d + 0.12, x, h, z); cap.rotation.y = ry || 0;
    const snow = box(g, '#f4f7fa', w + 0.1, 0.08, d + 0.1, x, h + 0.14, z); snow.userData.snow = true; snow.rotation.y = ry || 0;
    return b;
  }
  const FOL = {
    green: { spring: ['#9ccc70', '#86bd5e'], summer: ['#4f9a4a', '#3f8a3e'], autumn: ['#e0a03a', '#cc7a2c'] },
    sakura: { spring: ['#f4b8cb', '#f9cfdc'], summer: ['#5aa252', '#4a9046'], autumn: ['#d8653a', '#c4502e'] },
  };
  function tree(g, x, z, s, kind) {
    const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(s || 1);
    const k = kind || 'green';
    t.add(mk(G.cyl6, mat('#6d4c33'), 0.24, 1.3, 0.24, 0, 0.65, 0));
    [[0, 1.85, 0, 1.3], [0.5, 1.6, 0.25, 0.95], [-0.45, 1.65, -0.2, 1.0], [0.1, 2.35, -0.1, 0.9]].forEach(([fx, fy, fz, fs], i) => {
      const m = mk(G.ico, mat(FOL[k].summer[i % 2]), fs, fs * 0.9, fs, fx, fy, fz); m.userData.foliage = true; m.userData.treeKind = k; m.userData.shade = i % 2; t.add(m);
    });
    [[0.32, 1.55, 0, -0.75], [-0.3, 1.5, 0.1, 0.75], [0, 1.85, -0.2, 0.2]].forEach(([bx, by, bz, rz]) => {
      const m = mk(G.cyl6, mat('#6d4c33'), 0.08, 0.95, 0.08, bx, by, bz, { rz }); m.userData.branch = true; m.visible = false; t.add(m);
    });
    const sn = mk(G.ico, mat('#f4f7fa'), 0.5, 0.14, 0.5, 0, 2.3, 0); sn.userData.snow = true; t.add(sn);
    g.add(t); return t;
  }
  function lamp(g, x, z) {
    cyl(g, '#4a4f5c', 0.05, 1.9, x, 0, z);
    box(g, '#4a4f5c', 0.5, 0.06, 0.08, x + 0.2, 1.9, z);
    box(g, TEX.lamp || (TEX.lamp = glowMat('#fff3c4', '#ffdd88', 2.4, { roughness: 0.4 })), 0.22, 0.1, 0.16, x + 0.4, 1.8, z);
  }
  function car(g, x, z, hexC) {
    const c = new T.Group(); c.position.set(x, 0, z);
    c.add(mk(G.box, mat(hexC, { roughness: 0.35, metalness: 0.3 }), 1.1, 0.32, 0.55, 0, 0.3, 0));
    c.add(mk(G.box, mat('#2c3446', { roughness: 0.2, metalness: 0.3 }), 0.62, 0.24, 0.5, -0.05, 0.56, 0));
    [[-0.34, 0.27], [0.34, 0.27], [-0.34, -0.27], [0.34, -0.27]].forEach(([wx, wz]) => c.add(mk(G.cyl, mat('#1f2329'), 0.22, 0.1, 0.22, wx, 0.12, wz, { rx: Math.PI / 2 })));
    g.add(c); return c;
  }
  function figure(kind) {
    const cfg = {
      you: { shirt: '#3e5aa0', pants: '#2d3850', hair: '#2a2b3d', s: 1 },
      partner: { shirt: '#c9765c', pants: '#5b4a3f', hair: '#5a3a2a', s: 0.97, long: true },
      child: { shirt: '#e2b23f', pants: '#4a5d7a', hair: '#3a2a22', s: 0.64 },
      elder: { shirt: '#879a77', pants: '#5c5f66', hair: '#d8d8d8', s: 0.94, cane: true },
      friend: { shirt: '#4f8f78', pants: '#3e4656', hair: '#7a4b2a', s: 1 },
    }[kind] || { shirt: '#4f8f78', pants: '#3e4656', hair: '#7a4b2a', s: 1 };
    const g = new T.Group(); const skin = mat('#f0cdb0');
    const leg = side => { const p = new T.Group(); p.position.set(side * 0.075, 0.37, 0); p.add(mk(G.cyl6, mat(cfg.pants), 0.11, 0.37, 0.11, 0, -0.18, 0)); g.add(p); return p; };
    const arm = side => { const p = new T.Group(); p.position.set(side * 0.18, 0.67, 0); p.add(mk(G.cyl6, mat(cfg.shirt), 0.08, 0.3, 0.08, 0, -0.15, 0)); g.add(p); return p; };
    const legL = leg(-1), legR = leg(1), armL = arm(-1), armR = arm(1);
    g.add(mk(G.cyl, mat(cfg.shirt), 0.3, 0.34, 0.22, 0, 0.54, 0));
    g.add(mk(G.sph, skin, 0.25, 0.27, 0.25, 0, 0.87, 0));
    g.add(mk(G.sph, mat(cfg.hair), 0.27, 0.2, 0.27, 0, 0.94, -0.015));
    if (cfg.long) g.add(mk(G.box, mat(cfg.hair), 0.24, 0.22, 0.08, 0, 0.8, -0.1));
    if (cfg.cane) g.add(mk(G.cyl6, mat('#7a5536'), 0.03, 0.62, 0.03, 0.25, 0.31, 0.06));
    g.scale.setScalar(cfg.s * 1.15);
    g.userData = { legL, legR, armL, armR, kind };
    return g;
  }
  function pet() {
    const g = new T.Group(); const fur = mat('#d38a3e');
    g.add(mk(G.sph, fur, 0.42, 0.24, 0.22, 0, 0.2, 0));
    g.add(mk(G.sph, fur, 0.2, 0.19, 0.19, 0.24, 0.31, 0));
    g.add(mk(G.cone, fur, 0.07, 0.1, 0.07, 0.26, 0.43, 0.06)); g.add(mk(G.cone, fur, 0.07, 0.1, 0.07, 0.26, 0.43, -0.06));
    g.add(mk(G.cyl6, fur, 0.04, 0.28, 0.04, -0.25, 0.32, 0, { rz: -0.6 }));
    g.userData = { kind: 'pet' };
    return g;
  }
  function miniHouse(g, x, z, roofHex, s) {
    const h = new T.Group(); h.position.set(x, 0, z); h.scale.setScalar(s); g.add(h);
    box(h, '#efe4d0', 1.6, 0.9, 1.2, 0, 0, 0); roof(h, roofHex, 1.9, 0.7, 1.4, 0, 0.9, 0);
    return h;
  }

  /* ---------- places ---------- */
  function bFork(g) {
    cyl(g, '#7a5536', 0.07, 1.8, 0, 0, 2.2);
    box(g, '#efe2c4', 1.3, 0.3, 0.07, -0.5, 1.3, 2.2, { ry: 0.35 });
    box(g, '#e2dbf6', 1.3, 0.3, 0.07, 0.5, 0.92, 2.2, { ry: -0.35 });
    miniHouse(g, -6.4, -6.2, '#5a6d97', 0.9); miniHouse(g, 6.4, -6.2, '#9a8fd8', 0.9);
    tree(g, -6.8, 0.8, 1.0, 'green'); tree(g, 6.8, 0.4, 1.0, 'sakura'); tree(g, -2.6, -6.8, 1.1, 'green'); tree(g, 3.0, -7.2, 1.2, 'green');
  }
  function bHome(g) {
    const hx = -1.6, hz = -2.4, w = 4.2, h = 1.9, d = 3.0;
    box(g, '#efe4d0', w, h, d, hx, 0, hz);
    roof(g, '#5a6d97', w + 0.5, 1.25, d + 0.45, hx, h, hz);
    const sn = roof(g, '#f4f7fa', w + 0.56, 1.3, d + 0.5, hx, h + 0.04, hz); sn.userData.snow = true;
    box(g, '#8f8073', 0.42, 1.05, 0.42, hx + 1.15, h + 0.35, hz - 0.55);
    box(g, '#7b4f36', 0.72, 1.25, 0.08, hx + 0.6, 0, hz + d / 2 + 0.02);
    box(g, '#bdb2a1', 1.3, 0.12, 0.55, hx + 0.6, 0, hz + d / 2 + 0.3);
    win(g, hx - 1.15, 1.05, hz + d / 2 + 0.03, 0.9, 0.62); win(g, hx + 1.55, 1.05, hz + d / 2 + 0.03, 0.6, 0.62);
    win(g, hx + w / 2 + 0.03, 1.05, hz, 0.9, 0.62, Math.PI / 2);
    for (let fx = -5.8; fx <= 1.9; fx += 0.6) box(g, '#f1ece2', 0.09, 0.62, 0.09, fx, 0, 0.45);
    box(g, '#f1ece2', 7.8, 0.07, 0.06, -1.95, 0.42, 0.45); box(g, '#f1ece2', 7.8, 0.07, 0.06, -1.95, 0.2, 0.45);
    box(g, '#6e6e6e', 0.06, 0.78, 0.06, 2.7, 0, 0.6); box(g, '#c9503f', 0.36, 0.28, 0.26, 2.7, 0.78, 0.6);
    tree(g, 4.7, -2.2, 1.15, 'green'); tree(g, -6.5, -0.9, 1.0, 'sakura'); tree(g, 6.1, -5.6, 1.25, 'green');
  }
  function bApartment(g) {
    building(g, 'apt', 6.2, 4.7, 3.0, -0.4, -3.2);
    box(g, '#6f6a63', 1.7, 0.12, 0.95, -0.4, 1.3, -1.25);
    box(g, '#7f7a73', 0.08, 1.3, 0.08, -1.15, 0, -0.85); box(g, '#7f7a73', 0.08, 1.3, 0.08, 0.35, 0, -0.85);
    car(g, 4.0, 0.3, '#d0d4da'); car(g, 5.6, 0.3, '#3e5aa0');
    tree(g, -6.3, -0.6, 1.05, 'green'); tree(g, 6.3, -3.4, 1.1, 'sakura');
  }
  function bCity(g) {
    building(g, 'cityA', 2.6, 4.6, 2.6, -6.0, -4.4);
    building(g, 'cityC', 2.4, 6.6, 2.4, -2.9, -5.1);
    building(g, 'cityB', 3.0, 3.6, 2.6, 0.5, -3.8);
    building(g, 'cityA', 2.4, 5.8, 2.4, 3.8, -5.2);
    building(g, 'cityB', 2.0, 3.2, 2.2, 6.4, -3.1);
    lamp(g, -4.6, 4.3); lamp(g, 2.6, 4.3);
    tree(g, -1.2, 1.8, 0.65, 'green'); tree(g, 5.6, 1.8, 0.65, 'green');
    const lanes = [[5.0, 1, '#c9503f'], [6.1, -1, '#f1ece2'], [5.0, 1, '#2f3a4f']];
    lanes.forEach(([z, dir, hexC], i) => {
      const c = car(g, -6 + i * 5, z, hexC); c.rotation.y = dir > 0 ? 0 : Math.PI;
      const lim = Math.sqrt(R * R - z * z) - 0.8;
      g.userData.movers.push({ update(dt) { c.position.x += dir * 2.2 * dt; if (dir > 0 && c.position.x > lim) c.position.x = -lim; if (dir < 0 && c.position.x < -lim) c.position.x = lim; } });
    });
  }
  function bCountry(g) {
    [[-4.2, -7.0, 3.2, 5.2], [3.2, -7.6, 2.6, 4.2]].forEach(([mx, mz, r, h]) => {
      g.add(mk(G.cone, mat('#7d93a8', { roughness: 1 }), r * 2, h, r * 2, mx, h / 2, mz));
      const cap = mk(G.cone, mat('#f4f7fa'), r * 0.7, h * 0.34, r * 0.7, mx, h * 0.83, mz); g.add(cap);
    });
    box(g, '#c9a77c', 3.2, 1.5, 2.4, 4.7, 0, -2.4); roof(g, '#5b4a3a', 3.6, 1.0, 2.7, 4.7, 1.5, -2.4);
    const sn = roof(g, '#f4f7fa', 3.66, 1.04, 2.74, 4.7, 1.54, -2.4); sn.userData.snow = true;
    box(g, '#5d4630', 0.6, 1.0, 0.07, 4.4, 0, -1.17); win(g, 5.5, 0.85, -1.17, 0.5, 0.42);
    for (let i = 0; i < 3; i++) { const p = cyl(g, '#d8b24a', 0.32, 0.55, -6.5 + i * 2.2, 0, -1.2 + (i % 2) * 1.4); p.userData.autumnOnly = true; }
    cyl(g, '#6b5444', 0.05, 3.2, -8.2, 0, 1.4); cyl(g, '#6b5444', 0.05, 3.2, 1.9, 0, 1.9);
    tree(g, -7.0, 1.4, 1.0, 'green'); tree(g, 7.2, 0.4, 0.9, 'green');
  }
  function bSchool(g) {
    building(g, 'school', 8.4, 2.9, 2.6, 0, -4.2);
    box(g, '#efe6d6', 1.5, 1.7, 1.5, 0, 2.9, -4.2); box(g, '#9a8f7e', 1.7, 0.15, 1.7, 0, 4.6, -4.2);
    g.add(mk(G.cyl, mat('#fbfbf7'), 0.9, 0.06, 0.9, 0, 3.75, -3.43, { rx: Math.PI / 2 }));
    box(g, '#2a2b3d', 0.05, 0.32, 0.03, 0, 3.75, -3.38); box(g, '#2a2b3d', 0.24, 0.05, 0.03, 0.1, 3.75, -3.38);
    box(g, '#bdb4a5', 0.35, 1.1, 0.35, -1.4, 0, 2.25); box(g, '#bdb4a5', 0.35, 1.1, 0.35, 1.4, 0, 2.25);
    tree(g, -6.7, -1.6, 1.1, 'sakura'); tree(g, 6.7, -1.7, 1.1, 'sakura'); tree(g, -4.6, 1.9, 0.85, 'sakura');
  }
  function bOffice(g) {
    building(g, 'office', 3.4, 7.6, 3.0, -2.2, -3.6);
    building(g, 'cityB', 3.0, 4.2, 2.6, 2.8, -4.2);
    box(g, '#3c495d', 1.4, 0.9, 0.08, -2.2, 0, -2.06);
    box(g, '#8b6a4a', 1.3, 0.1, 0.42, 3.3, 0.42, 1.1); box(g, '#5d5f66', 0.08, 0.42, 0.36, 2.75, 0, 1.1); box(g, '#5d5f66', 0.08, 0.42, 0.36, 3.85, 0, 1.1);
    tree(g, -5.7, 1.4, 0.78, 'green'); tree(g, 6.0, 0.8, 0.78, 'green'); tree(g, 6.6, -2.4, 0.9, 'green');
  }
  function bStation(g) {
    [-1.55, -2.05].forEach(z => box(g, '#9aa1ab', 19.0, 0.06, 0.07, 0, 0.04, z, { cast: false }));
    for (let x = -9.4; x <= 9.4; x += 0.62) box(g, '#5b4a3a', 0.16, 0.05, 0.9, x, 0, -1.8, { cast: false });
    box(g, '#c9c2b4', 15, 0.32, 1.9, 0, 0, 0.2); box(g, '#e3bf48', 15, 0.012, 0.18, 0, 0.32, -0.55, { cast: false });
    box(g, '#4e6089', 12, 0.12, 2.3, 0, 1.95, 0.2);
    [-5.5, 0, 5.5].forEach(x => box(g, '#7f8794', 0.12, 1.63, 0.12, x, 0.32, 0.75));
    box(g, '#f5f5f2', 1.8, 0.45, 0.06, 0, 1.38, 1.12);
    [-3, 3].forEach(x => box(g, TEX.lamp || (TEX.lamp = glowMat('#fff3c4', '#ffdd88', 2.4, { roughness: 0.4 })), 0.9, 0.05, 0.12, x, 1.88, 0.2));
    const train = new T.Group(); train.position.set(-22, 0.12, -1.8);
    const winStrip = glowMat('#33415a', '#ffe2a8', 1.4, { roughness: 0.2, metalness: 0.2 }); g.userData.glow.push(winStrip);
    const cars = [];
    for (let i = 0; i < 3; i++) {
      const c = new T.Group(); c.position.x = i * 3.6;
      c.add(mk(G.box, mat('#ece8df', { roughness: 0.4 }), 3.4, 1.0, 1.1, 0, 0.62, 0));
      c.add(mk(G.box, mat('#4e6089'), 3.42, 0.12, 1.12, 0, 0.42, 0));
      c.add(mk(G.box, winStrip, 3.0, 0.3, 1.13, 0, 0.82, 0, { cast: false }));
      train.add(c); cars.push(c);
    }
    g.add(train);
    let wait = 0.5;
    g.userData.movers.push({ update(dt) {
      if (wait > 0) { wait -= dt; return; }
      train.position.x += 4.2 * dt;
      cars.forEach(c => { const wx = train.position.x + c.position.x; c.visible = Math.abs(wx) < 8.4; });
      if (train.position.x > 12) { train.position.x = -22; wait = 2.5 + Math.random() * 3; }
    } });
  }
  function bCafe(g) {
    box(g, '#efe2cc', 4.6, 2.3, 3.0, -1.6, 0, -2.6); box(g, '#7a6a58', 4.8, 0.14, 3.2, -1.6, 2.3, -2.6);
    const sn = box(g, '#f4f7fa', 4.82, 0.07, 3.22, -1.6, 2.44, -2.6); sn.userData.snow = true;
    box(g, '#2f3a4f', 2.4, 0.42, 0.08, -1.6, 2.45, -1.06);
    const aw = new T.CanvasTexture(TEX.awning); aw.encoding = T.sRGBEncoding; g.userData.dispose.push(aw);
    const awM = new T.MeshStandardMaterial({ map: aw, roughness: 0.9 }); g.userData.dispose.push(awM);
    g.add(mk(G.box, awM, 4.8, 0.06, 1.2, -1.6, 1.95, -0.62, { rx: 0.32 }));
    win(g, -2.6, 1.1, -1.07, 2.1, 1.15);
    box(g, '#6e4b2f', 0.82, 1.5, 0.08, -0.15, 0, -1.07);
    [[2.3, 0.5], [3.9, -0.7]].forEach(([tx, tz]) => {
      cyl(g, '#7b5339', 0.05, 0.72, tx, 0, tz); cyl(g, '#f3ede4', 0.46, 0.05, tx, 0.72, tz);
      box(g, '#7b5339', 0.34, 0.42, 0.34, tx - 0.65, 0, tz); box(g, '#7b5339', 0.34, 0.42, 0.34, tx + 0.65, 0, tz);
    });
    [[-4.3, 0.2], [0.9, 0.3]].forEach(([px2, pz2]) => { cyl(g, '#b5653e', 0.22, 0.4, px2, 0, pz2); ball(g, '#4f8f5a', 0.36, px2, 0.72, pz2); });
    tree(g, 6.4, -2.6, 1.1, 'green'); tree(g, -6.6, -0.3, 0.95, 'sakura');
  }
  function bSea(g) {
    const shape = new T.Shape(); shape.moveTo(-R + 0.05, 0.6);
    for (let xx = -R + 0.05; xx <= R - 0.05; xx += 0.4) shape.lineTo(xx, 0.6 + Math.sin(xx * 0.9) * 0.28);
    shape.absarc(0, 0, R - 0.04, Math.asin(0.6 / R), Math.PI - Math.asin(0.6 / R), false);
    const geo = new T.ShapeGeometry(shape, 48); g.userData.dispose.push(geo);
    const wt = new T.CanvasTexture(TEX.water); wt.encoding = T.sRGBEncoding; wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(0.16, 0.16); g.userData.dispose.push(wt);
    const wm = new T.MeshStandardMaterial({ map: wt, roughness: 0.22, metalness: 0.15, transparent: true, opacity: 0.95 }); g.userData.dispose.push(wm);
    const water = new T.Mesh(geo, wm); water.rotation.x = -Math.PI / 2; water.position.y = 0.04; water.receiveShadow = true; g.add(water);
    g.userData.movers.push({ update(dt) { wt.offset.x += dt * 0.012; wt.offset.y += dt * 0.006; } });
    [[5.2, -5.5, 0.9], [6.4, -6.2, 0.7], [5.6, -6.6, 0.6]].forEach(([rx, rz, rr]) => ball(g, '#6d6865', rr, rx, 0.2, rz));
    const lx = 5.9, lz = -5.9;
    cyl(g, '#f2f2f2', 0.48, 1.0, lx, 0.3, lz); cyl(g, '#c9503f', 0.46, 0.5, lx, 1.3, lz); cyl(g, '#f2f2f2', 0.44, 0.9, lx, 1.8, lz); cyl(g, '#c9503f', 0.42, 0.4, lx, 2.7, lz);
    const lampM = glowMat('#fff6d8', '#ffe08a', 2.6, { roughness: 0.2 }); g.userData.glow.push(lampM);
    cyl(g, lampM, 0.3, 0.42, lx, 3.1, lz); g.add(mk(G.cone, mat('#3d4656'), 0.75, 0.42, 0.75, lx, 3.72, lz));
    const beamM = new T.MeshBasicMaterial({ color: col('#fff3b0'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }); g.userData.dispose.push(beamM);
    const beamG = new T.ConeGeometry(0.9, 7, 16, 1, true); beamG.translate(0, -3.5, 0); g.userData.dispose.push(beamG);
    const beam = new T.Mesh(beamG, beamM); beam.position.set(lx, 3.3, lz); beam.rotation.z = Math.PI / 2; g.add(beam);
    const pivot = new T.Group(); pivot.position.set(lx, 3.3, lz); g.add(pivot); g.remove(beam); beam.position.set(0, 0, 0); pivot.add(beam);
    g.userData.movers.push({ update(dt, t, n) { pivot.rotation.y += dt * 0.9; beamM.opacity = n * 0.22; } });
    const boat = new T.Group(); boat.position.set(-3.4, 0.1, -4.6);
    boat.add(mk(G.box, mat('#7b4f36'), 1.3, 0.28, 0.52, 0, 0.14, 0)); boat.add(mk(G.cyl6, mat('#5d3b29'), 0.05, 1.3, 0.05, 0, 0.9, 0));
    const sail = new T.Shape(); sail.moveTo(0, 0); sail.lineTo(0.75, 0); sail.lineTo(0, 1.05); sail.lineTo(0, 0);
    const sg = new T.ShapeGeometry(sail); g.userData.dispose.push(sg);
    const sm = new T.Mesh(sg, mat('#f5f2ea', { side: T.DoubleSide })); sm.position.set(0.04, 0.38, 0); boat.add(sm);
    g.add(boat);
    g.userData.movers.push({ update(dt, t) { boat.position.y = 0.06 + Math.sin(t * 1.6) * 0.05; boat.rotation.z = Math.sin(t * 1.3) * 0.05; boat.position.x += dt * 0.18; if (boat.position.x > 3.5) boat.position.x = -6.5; } });
    const um = new T.Group(); um.position.set(-4.4, 0, 1.6);
    um.add(mk(G.cyl6, mat('#e8e1d4'), 0.05, 1.6, 0.05, 0, 0.8, 0)); um.add(mk(G.cone, mat('#e2574c'), 1.7, 0.45, 1.7, 0, 1.68, 0));
    um.userData.summerOnly = true; g.add(um);
  }
  const BUILD = { fork: bFork, home: bHome, apartment: bApartment, city: bCity, countryside: bCountry, school: bSchool, office: bOffice, station: bStation, cafe: bCafe, sea: bSea };
  function build(pl) {
    const g = new T.Group(); g.userData = { dispose: [], glow: [], movers: [] };
    (BUILD[pl] || bCity)(g);
    applySeason(g, st.season || 'autumn');
    scene.add(g); return g;
  }
  function removeGroup(g) {
    if (!g) return;
    scene.remove(g);
    (g.userData.glow || []).forEach(m => glow.delete(m));
    (g.userData.dispose || []).forEach(x => { try { x.dispose(); } catch (err) { /* ignore */ } });
  }
  function applySeason(g, season) {
    g.traverse(o => {
      const u = o.userData || {};
      if (u.foliage) { o.visible = season !== 'winter'; if (season !== 'winter') o.material = mat(FOL[u.treeKind][season][u.shade]); }
      if (u.branch) o.visible = season === 'winter';
      if (u.snow) o.visible = season === 'winter';
      if (u.summerOnly) o.visible = season === 'summer';
      if (u.autumnOnly) o.visible = season === 'autumn';
    });
  }

  /* ---------- people, emote, weather ---------- */
  function setPeople(withs) {
    comps.forEach(c => scene.remove(c)); comps = [];
    withs.forEach(w => { const f = w === 'pet' ? pet() : figure(w); f.userData.role = w; scene.add(f); comps.push(f); });
  }
  function animateLimbs(f, phase, amt) {
    const u = f.userData; if (!u.legL) return;
    const a = Math.sin(phase) * 0.6 * amt;
    u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a * 0.8; u.armR.rotation.x = a * 0.8;
  }
  function updatePeople(dt, speed) {
    const walking = st.walking && !st.reduced;
    if (walking) {
      st.x += st.dir * 0.8 * dt * Math.min(speed, 2);
      if (st.x > 4.2) { st.x = 4.2; st.dir = -1; } else if (st.x < -4.2) { st.x = -4.2; st.dir = 1; }
      st.phase += dt * 9 * Math.min(speed, 2);
    }
    const amt = walking ? 1 : 0;
    const hopY = st.hop > 0 ? Math.sin((st.hop / 0.45) * Math.PI) * 0.22 : 0;
    const face = walking ? (st.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
    const turn = (o, target) => { let d = target - o.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; o.rotation.y += d * Math.min(1, dt * 8); };
    you.position.set(st.x, hopY, WALK_Z); turn(you, face); animateLimbs(you, st.phase, amt);
    const side = [-0.95, 0.95, -1.85, 1.85];
    comps.forEach((c, i) => {
      const tx = walking ? st.x - st.dir * (0.95 + i * 0.85) : st.x + side[i % 4];
      const tz = walking ? WALK_Z + (i % 2 ? 0.38 : -0.32) : WALK_Z + 0.15;
      c.position.x += (clampN(tx, -8, 8) - c.position.x) * Math.min(1, dt * 4);
      c.position.z += (tz - c.position.z) * Math.min(1, dt * 4);
      c.position.y = c.userData.kind === 'pet' && walking ? Math.abs(Math.sin(st.phase * 0.8)) * 0.08 : 0;
      turn(c, face); animateLimbs(c, st.phase + i * 1.3, c.userData.kind === 'elder' ? amt * 0.5 : amt);
    });
  }
  function setupEmote() {
    const [c, x] = cvs(128, 128); emoteCtx = x;
    emoteTex = new T.CanvasTexture(c); emoteTex.encoding = T.sRGBEncoding;
    emote = new T.Sprite(new T.SpriteMaterial({ map: emoteTex, depthTest: false, transparent: true }));
    emote.scale.set(0.95, 0.95, 1); emote.visible = false; emote.renderOrder = 10; scene.add(emote);
  }
  function drawEmote(mood) {
    const x = emoteCtx; x.clearRect(0, 0, 128, 128);
    if (!mood) { emote.visible = false; return; }
    x.fillStyle = 'rgba(20,24,48,0.18)'; roundRect(x, 14, 16, 104, 82, 22); x.fill();
    x.fillStyle = '#ffffff'; roundRect(x, 10, 10, 104, 82, 22); x.fill();
    x.beginPath(); x.moveTo(52, 90); x.lineTo(64, 112); x.lineTo(74, 90); x.fill();
    const c = { '2': '#e2574c', '1': '#3e5aa0', '-1': '#7a7f92', '-2': '#4f86d1' }[String(mood)];
    x.fillStyle = c; x.strokeStyle = c; x.lineWidth = 7; x.lineCap = 'round';
    if (mood === 2) { x.beginPath(); x.moveTo(62, 74); x.bezierCurveTo(26, 50, 38, 22, 62, 38); x.bezierCurveTo(86, 22, 98, 50, 62, 74); x.fill(); }
    else if (mood === 1) { x.beginPath(); x.ellipse(50, 66, 12, 9, -0.4, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(61, 64); x.lineTo(61, 26); x.lineTo(84, 34); x.stroke(); }
    else if (mood === -1) { [40, 62, 84].forEach(cx => { x.beginPath(); x.arc(cx, 52, 6, 0, Math.PI * 2); x.fill(); }); }
    else { x.beginPath(); x.moveTo(62, 22); x.bezierCurveTo(78, 46, 84, 56, 84, 64); x.arc(62, 64, 22, 0, Math.PI, false); x.bezierCurveTo(40, 56, 46, 46, 62, 22); x.fill(); }
    emoteTex.needsUpdate = true; emote.visible = true;
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function setupWeather() {
    const N = 900, pos = new Float32Array(N * 3), geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const dot = new T.CanvasTexture(TEX.dot);
    flakes = new T.Points(geo, new T.PointsMaterial({ size: 0.16, map: dot, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.95 }));
    flakes.frustumCulled = false; flakes.visible = false; scene.add(flakes);
    flakes.userData = { N, pos, vel: new Float32Array(N * 3), ph: new Float32Array(N), live: 0 };
    const RN = 650, rp = new Float32Array(RN * 6), rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xaac4ee, transparent: true, opacity: 0.5 }));
    rain.frustumCulled = false; rain.visible = false; scene.add(rain); rain.userData = { RN, rp };
  }
  function spawn(i, top) {
    const u = flakes.userData, a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (R - 0.4);
    u.pos[i * 3] = Math.cos(a) * rr; u.pos[i * 3 + 2] = Math.sin(a) * rr;
    u.pos[i * 3 + 1] = st.weather === 'fly' ? 0.4 + Math.random() * 2.4 : (top ? 8 + Math.random() * 2 : Math.random() * 10);
    const k = st.weather;
    u.vel[i * 3] = k === 'fly' ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.2) * 0.4;
    u.vel[i * 3 + 1] = k === 'snow' ? -(0.7 + Math.random() * 0.6) : k === 'petal' ? -(0.55 + Math.random() * 0.4) : k === 'leaf' ? -(0.9 + Math.random() * 0.4) : 0;
    u.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.3; u.ph[i] = Math.random() * 6.28;
  }
  function setWeather(kind) {
    if (kind === st.weather) return;
    st.weather = kind;
    rain.visible = kind === 'rain';
    flakes.visible = !!kind && kind !== 'rain';
    const cfg = { snow: ['#ffffff', 0.17, 700], petal: ['#f6bfd0', 0.2, 260], leaf: ['#e0873a', 0.22, 220], fly: ['#fff3a0', 0.18, 70] }[kind];
    if (cfg) { flakes.material.color = col(cfg[0]); flakes.material.size = cfg[1]; flakes.userData.live = cfg[2]; for (let i = 0; i < flakes.userData.N; i++) spawn(i, false); }
    if (kind === 'rain') { const u = rain.userData; for (let i = 0; i < u.RN; i++) resetDrop(i, false); }
  }
  function resetDrop(i, top) { const u = rain.userData, a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (R - 0.3), x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = top ? 9 + Math.random() : Math.random() * 10; u.rp.set([x, y, z, x + 0.05, y - 0.42, z], i * 6); }
  function updateWeather(dt) {
    if (flakes.visible) {
      const u = flakes.userData;
      for (let i = 0; i < u.N; i++) {
        if (i >= u.live) { u.pos[i * 3 + 1] = -50; continue; }
        u.ph[i] += dt * 2;
        u.pos[i * 3] += (u.vel[i * 3] + Math.sin(u.ph[i]) * (st.weather === 'snow' ? 0.15 : 0.35)) * dt;
        u.pos[i * 3 + 1] += (st.weather === 'fly' ? Math.sin(u.ph[i] * 1.3) * 0.25 : u.vel[i * 3 + 1]) * dt;
        u.pos[i * 3 + 2] += u.vel[i * 3 + 2] * dt;
        if (u.pos[i * 3 + 1] < 0.02 || u.pos[i * 3] * u.pos[i * 3] + u.pos[i * 3 + 2] * u.pos[i * 3 + 2] > R * R) spawn(i, true);
      }
      if (st.weather === 'fly') flakes.material.opacity = 0.45 + 0.5 * Math.abs(Math.sin(st.t * 2.2));
      flakes.geometry.attributes.position.needsUpdate = true;
    }
    if (rain.visible) {
      const u = rain.userData;
      for (let i = 0; i < u.RN; i++) { u.rp[i * 6 + 1] -= 11 * dt; u.rp[i * 6 + 4] -= 11 * dt; if (u.rp[i * 6 + 4] < 0) resetDrop(i, true); }
      rain.geometry.attributes.position.needsUpdate = true;
    }
  }
  function weatherKind() {
    if (st.reduced) return '';
    if (st.mood <= -2) return st.season === 'winter' ? 'snow' : 'rain';
    if (st.season === 'spring') return 'petal';
    if (st.season === 'autumn') return 'leaf';
    if (st.season === 'winter') return 'snow';
    return nightAt(st.tod) > 0.6 ? 'fly' : '';
  }

  /* ---------- light, camera ---------- */
  function updateLighting() {
    const n = nightAt(st.tod);
    const wet = st.mood <= -2 ? 1 : st.mood === -1 ? 0.4 : 0;
    let [top, mid, bot] = skyAt(st.tod);
    if (wet) { top = mixHex(top, '#6f7890', 0.55 * wet); mid = mixHex(mid, '#9aa2b2', 0.55 * wet); bot = mixHex(bot, '#aeb4c0', 0.5 * wet); }
    if (st.mood >= 2 && n < 0.5) { mid = mixHex(mid, '#ffe2b0', 0.25); }
    paintSky(top, mid, bot);
    scene.fog.color.copy(col(mid));
    const ang = clampN((st.tod - 0.25) / 0.5, 0, 1) * Math.PI;
    const elev = Math.sin(ang);
    sun.position.set(Math.cos(ang) * 26, 3 + elev * 26, 9);
    const day = 1 - n;
    sun.intensity = day * (0.5 + 1.55 * elev) * (1 - 0.65 * wet) * (st.mood >= 2 ? 1.1 : 1) * (st.season === 'winter' ? 0.82 : 1);
    sun.color.copy(col(mixHex('#ffad66', '#fff3e0', Math.min(1, elev * 1.6))));
    hemi.intensity = 0.24 + 0.48 * day * (1 - 0.25 * wet);
    hemi.color.copy(col(top)); hemi.groundColor.copy(col(n > 0.5 ? '#2a2a3a' : '#5a4a32'));
    moonLight.intensity = 0.45 * n;
    stars.material.opacity = Math.min(1, n * 1.15) * (1 - wet * 0.9);
    sunDisc.position.set(Math.cos(ang) * 70, 6 + elev * 42, -62); sunDisc.visible = day > 0.08 && wet < 0.9 && st.tod > 0.22 && st.tod < 0.78;
    const mt = (st.tod + 0.5) % 1, mang = clampN((mt - 0.2) / 0.6, 0, 1) * Math.PI;
    moonDisc.position.set(Math.cos(mang) * 70, 8 + Math.sin(mang) * 40, -62); moonDisc.visible = n > 0.3 && wet < 0.9;
    glow.forEach(m => { m.emissiveIntensity = n * (m.userData.nf || 1); });
    cloudMat.color.copy(col(n > 0.6 ? '#4a5070' : wet ? '#c4c9d2' : mixHex('#ffffff', '#ffd2c0', Math.max(0, 1 - Math.abs(st.tod - 0.5) * 4 - 0.3))));
    cloudMat.emissiveIntensity = 0.18 * day;
    renderer.toneMappingExposure = 0.96 + (st.mood >= 2 ? 0.08 : 0) - wet * 0.1;
  }
  function updateCamera(dt) {
    const idle = st.t - st.lastUser > 5;
    const auto = st.reduced ? 0 : Math.sin(st.t * 0.11) * 0.3;
    if (idle) st.azAuto += (auto - st.azAuto) * Math.min(1, dt * 0.6);
    const az = st.azAuto + st.azUser, el = clampN(0.54 + st.elUser, 0.24, 1.05), d = st.dist;
    camera.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d + 0.6, Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(0, 1.0, 0);
  }
  function bindPointer(c) {
    c.addEventListener('pointerdown', ev => { st.drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, type: ev.pointerType }; st.lastUser = st.t; try { c.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ } });
    c.addEventListener('pointermove', ev => {
      if (!st.drag || st.drag.id !== ev.pointerId) return;
      const dx = ev.clientX - st.drag.x, dy = ev.clientY - st.drag.y; st.drag.x = ev.clientX; st.drag.y = ev.clientY;
      st.azUser -= dx * 0.008; if (st.drag.type === 'mouse') st.elUser = clampN(st.elUser + dy * 0.004, -0.28, 0.5);
      st.lastUser = st.t;
    });
    const end = ev => { if (st.drag && st.drag.id === ev.pointerId) st.drag = null; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', ev => { ev.preventDefault(); st.dist = clampN(st.dist + ev.deltaY * 0.02, 22, 44); st.lastUser = st.t; }, { passive: false });
  }
  function easeOutBack(k) { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }

  /* ---------- public ---------- */
  function setPlace(pl, withs) {
    if (!inited) return;
    const p = PLACES.includes(pl) || pl === 'fork' ? pl : 'city';
    const w = (withs || []).filter(x => WITHS.includes(x)).slice(0, 3);
    if (p !== st.place) {
      if (prev) { removeGroup(prev); prev = null; }
      prev = place; place = build(p); trans = 0; place.scale.set(1, 0.001, 1);
      st.place = p; paintGround(p, st.season || 'autumn');
    }
    if (w.join() !== st.withs.join()) { st.withs = w; setPeople(w); }
  }
  function reset(startDate) {
    if (!inited) return;
    st.startMonth = startDate.getMonth(); st.month = 0; st.season = seasonOf(st.startMonth);
    st.mood = 0; st.tod = 0.58; st.target = null; st.walking = false; st.x = -0.6; st.dir = 1; st.hop = 0; st.emote = null; st.azUser = 0; st.elUser = 0;
    if (prev) { removeGroup(prev); prev = null; }
    if (place) { removeGroup(place); place = null; }
    st.place = ''; st.painted = '';
    place = build('fork'); st.place = 'fork'; trans = 1; paintGround('fork', st.season);
    rim.material = mat(GPAL[st.season].rim);
    st.withs = []; setPeople([]); drawEmote(0);
  }
  function event(mood) { st.mood = mood; st.target = TOD[String(mood)]; st.walking = false; st.emote = mood || null; st.hop = mood > 0 ? 0.45 : 0; drawEmote(mood); }
  function release() { st.target = null; st.walking = !st.reduced; st.emote = null; drawEmote(0); }
  function easeTod(target, step) { let d = target - st.tod; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; if (Math.abs(d) <= step) st.tod = target; else st.tod = (st.tod + Math.sign(d) * step + 1) % 1; }
  function update(dt, o) {
    if (!inited) return;
    st.t += dt; const speed = o.speed || 1;
    const cal = ((st.startMonth + Math.floor(st.month)) % 12 + 12) % 12, season = seasonOf(cal);
    if (season !== st.season) { st.season = season; paintGround(st.place, season); [place, prev].forEach(g => g && applySeason(g, season)); rim.material = mat(GPAL[season].rim); }
    if (st.target != null) easeTod(st.target, dt * 0.8);
    else if (st.reduced) easeTod(0.5, dt * 0.5);
    else if (o.mode === 'play') st.tod = (st.tod + dt / Math.max(2.2, 4.2 / speed)) % 1;
    else if (o.mode === 'wait') st.tod = (st.tod + dt / 9) % 1;
    else easeTod(0.58, dt * 0.3);
    if (trans < 1) {
      trans = Math.min(1, trans + dt / (st.reduced ? 0.05 : 0.95));
      if (place) place.scale.set(1, Math.max(0.001, easeOutBack(trans)), 1);
      if (prev) { prev.scale.set(1, Math.max(0.001, 1 - trans * trans), 1); if (trans >= 1) { removeGroup(prev); prev = null; } }
    }
    const n = nightAt(st.tod);
    [place, prev].forEach(g => g && g.userData.movers.forEach(m => m.update(dt * Math.min(speed, 2), st.t, n)));
    if (st.hop > 0) st.hop = Math.max(0, st.hop - dt);
    updatePeople(dt, speed);
    if (emote.visible) emote.position.set(you.position.x, you.position.y + 1.65, you.position.z);
    setWeather(weatherKind()); updateWeather(dt);
    clouds.forEach(c => { c.position.x += c.userData.v * dt * (o.mode === 'play' ? Math.min(speed, 3) : 0.6); if (c.position.x > 20) c.position.x = -20; });
    updateLighting(); updateCamera(dt);
  }
  function draw() { if (inited) renderer.render(scene, camera); }
  return {
    available, init, resize, reset, setPlace, event, release, update, draw,
    isInit: () => inited,
    setMonth(m) { st.month = m; },
    setReduced(b) { st.reduced = !!b; if (b) st.walking = false; },
  };
})();
