/*
 * タラレバ — hakoniwa.js
 * もしもの箱庭：ドット表示（MW）と、二つの世界線の再生制御（TH）。立体表示は world3d.js（W3）
 */
'use strict';

/* ================= micro world: pixel diorama ================= */
const MW = (() => {
  const W = 200, H = 120, GY = 98, FEET = 107;
  let main = null, mctx = null, layer = null, lctx = null, layer2 = null, l2ctx = null, prev = null, pctx = null, g = null;
  const st = {
    place: 'fork', withs: [], mood: 0, tod: 0.58, target: null, month: 0, startMonth: 0, season: 'autumn',
    fade: 0, x: 86, dir: 1, walking: false, frame: 0, ft: 0, emote: null, hop: 0, t: 0,
    parts: [], acc: 0, smokeAcc: 0, trainX: -160, trainWait: 1, boatX: 30, lights: [], reduced: false,
    skyTop: [0, 0, 0], skyBot: [0, 0, 0],
  };
  let STARS = [], CLOUDS = [], TUFTS = [], SKYLINE = [], CANOPY = [];
  const cache = {};
  const PAL = {
    spring: { hill: '#9fcf8c', hill2: '#86bf76', ground: '#8cc472', ground2: '#76b05f', petal: '#f3c3d2', leaf: '#f6bfd0', leaf2: '#ec9db6', trunk: '#7a5536', field: '#a3cfe0' },
    summer: { hill: '#69ad66', hill2: '#559c56', ground: '#5aa95b', ground2: '#46934a', leaf: '#3f9b4d', leaf2: '#2d8140', trunk: '#6d4a2f', field: '#6fb562' },
    autumn: { hill: '#c7914f', hill2: '#ad7a42', ground: '#c29a52', ground2: '#a98445', leaf: '#e3803c', leaf2: '#f0ab45', trunk: '#6d4a2f', field: '#dbb54d' },
    winter: { hill: '#dfe7ee', hill2: '#cad6e1', ground: '#eef3f7', ground2: '#d7e1ea', leaf: null, leaf2: null, trunk: '#6a5444', field: '#f6f8fa' },
  };
  const SKY = [[0, '#0b1230', '#1f2650'], [0.2, '#121a42', '#2a2e5c'], [0.27, '#4a5aa0', '#f2a582'], [0.34, '#69ade6', '#cfe8f6'], [0.66, '#5ea6e3', '#c9e5f5'], [0.735, '#4b3f86', '#f39060'], [0.8, '#1d2252', '#3a356b'], [1, '#0b1230', '#1f2650']];
  const TOD = { '2': 0.46, '1': 0.56, '0': 0.655, '-1': 0.735, '-2': 0.86 };

  const hexCache = new Map();
  function hex(h) { let v = hexCache.get(h); if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; hexCache.set(h, v); } return v; }
  const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function R(x, y, w, h, c) { w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); R(cx - w, cy + y, w * 2 + 1, 1, c); } }
  function line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
    for (let i = 0; i < 300; i++) { R(x0, y0, 1, 1, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
  }
  function nightAt(t) { if (t < 0.2 || t > 0.82) return 1; if (t > 0.34 && t < 0.68) return 0; return t <= 0.34 ? 1 - (t - 0.2) / 0.14 : (t - 0.68) / 0.14; }
  function seasonOf(cal) { return cal >= 2 && cal <= 4 ? 'spring' : cal >= 5 && cal <= 7 ? 'summer' : cal >= 8 && cal <= 10 ? 'autumn' : 'winter'; }

  function setup() {
    const r = rng(20261103);
    STARS = Array.from({ length: 46 }, () => ({ x: (r() * W) | 0, y: (r() * 64) | 0, p: r() * 6.28 }));
    CLOUDS = Array.from({ length: 4 }, () => ({ x: r() * W, y: 9 + r() * 28, w: 16 + ((r() * 18) | 0), s: 1.2 + r() * 2.2 }));
    TUFTS = Array.from({ length: 34 }, () => ({ x: (r() * W) | 0, y: (GY + 2 + r() * (H - GY - 3)) | 0 }));
    SKYLINE = []; for (let x = -6; x < W + 6;) { const w = 8 + ((r() * 12) | 0); SKYLINE.push({ x, w, h: 10 + ((r() * 28) | 0) }); x += w + ((r() * 3) | 0); }
    CANOPY = [];
    for (let y = -11; y <= 10; y++) for (let x = -13; x <= 13; x++) {
      const d = (x * x) / 169 + (y * y) / 115; const n = ((Math.imul(x * 73856093 ^ y * 19349663, 2654435761) >>> 0) % 100) / 100;
      if (d < 1 - n * 0.2) CANOPY.push([x, y, (y > 4 || (n > 0.8 && y > -4)) ? 1 : 0]);
    }
  }
  function init(canvas) {
    if (main === canvas) return;
    main = canvas; mctx = main.getContext('2d'); mctx.imageSmoothingEnabled = false;
    [layer, lctx] = mk(W, H); [layer2, l2ctx] = mk(W, H); [prev, pctx] = mk(W, H);
    setup();
  }

  /* ---------- sky ---------- */
  function skyAt(t) {
    for (let i = 0; i < SKY.length - 1; i++) { const a = SKY[i], b = SKY[i + 1]; if (t >= a[0] && t <= b[0]) { const k = (t - a[0]) / (b[0] - a[0]); return [mixA(hex(a[1]), hex(b[1]), k), mixA(hex(a[2]), hex(b[2]), k)]; } }
    return [hex(SKY[0][1]), hex(SKY[0][2])];
  }
  function sky() {
    const [top, bot] = skyAt(st.tod); st.skyTop = top; st.skyBot = bot;
    const bands = 12, bh = Math.ceil(GY / bands);
    for (let i = 0; i < bands; i++) R(0, i * bh, W, bh + 1, rgb(mixA(top, bot, i / (bands - 1))));
  }
  function starsMoon(n) {
    if (n > 0.15) { STARS.forEach(s => { g.globalAlpha = Math.min(1, n) * (0.55 + 0.45 * Math.sin(st.t * 2 + s.p)); R(s.x, s.y, 1, 1, '#ffffff'); }); g.globalAlpha = 1; }
    const mt = (st.tod + 0.5) % 1;
    if (mt > 0.2 && mt < 0.8) {
      const k = (mt - 0.2) / 0.6, x = 16 + k * 168, y = 76 - Math.sin(k * Math.PI) * 58;
      disc(x, y, 4, '#f3f1e4'); disc(x + 2, y - 1, 3, rgb(mixA(st.skyTop, st.skyBot, clamp(y / GY, 0, 1))));
    }
  }
  function sun() {
    const t = st.tod; if (t <= 0.22 || t >= 0.78) return;
    const k = (t - 0.22) / 0.56, x = 16 + k * 168, y = 80 - Math.sin(k * Math.PI) * 62, low = k < 0.14 || k > 0.86;
    if (!low) { g.globalAlpha = 0.22; disc(x, y, 8, '#fff7d6'); g.globalAlpha = 1; }
    disc(x, y, 5, low ? '#ffb27a' : '#fff2bd');
  }
  function clouds(n) {
    const c = n > 0.5 ? 'rgba(130,140,190,0.32)' : 'rgba(255,255,255,0.88)';
    CLOUDS.forEach(cl => { R(cl.x, cl.y, cl.w, 3, c); R(cl.x + 3, cl.y - 2, cl.w - 8, 2, c); R(cl.x + 6, cl.y - 3, Math.round(cl.w * 0.4), 1, c); });
  }

  /* ---------- scenery helpers ---------- */
  function hills(pal) {
    const key = 'h' + st.season; let c = cache[key];
    if (!c) {
      const [cv, cx] = mk(W, 40); const old = g; g = cx;
      for (let x = 0; x < W; x++) { const h = 24 + Math.sin(x * 0.034 + 1.2) * 7 + Math.sin(x * 0.012 + 0.3) * 6; R(x, 40 - h, 1, h, pal.hill); }
      for (let x = 0; x < W; x++) { const h = 11 + Math.sin(x * 0.07 + 0.5) * 3 + Math.sin(x * 0.023 + 2) * 3; R(x, 40 - h, 1, h, pal.hill2); }
      g = old; cache[key] = c = cv;
    }
    g.drawImage(c, 0, GY - 40);
  }
  function ground(pal) { R(0, GY, W, H - GY, pal.ground); TUFTS.forEach((t, i) => R(t.x, t.y, 2, 1, pal.petal && i % 4 === 0 ? pal.petal : pal.ground2)); }
  function tree(x, pal) {
    const key = 't' + st.season; let c = cache[key];
    if (!c) {
      const [cv, cx] = mk(30, 46); const old = g; g = cx;
      const tx = 15, base = 44;
      R(tx - 1, base - 22, 3, 22, pal.trunk); R(tx - 2, base - 1, 5, 1, pal.trunk);
      if (st.season === 'winter') {
        line(tx, base - 18, tx - 7, base - 28, pal.trunk); line(tx + 1, base - 17, tx + 8, base - 29, pal.trunk); line(tx, base - 22, tx, base - 34, pal.trunk);
        line(tx - 4, base - 23, tx - 9, base - 25, pal.trunk); line(tx + 5, base - 24, tx + 10, base - 23, pal.trunk);
        [[tx - 8, base - 29], [tx + 7, base - 30], [tx - 1, base - 35], [tx - 10, base - 26], [tx + 9, base - 24]].forEach(([a, b]) => R(a, b, 2, 1, '#ffffff'));
      } else {
        const cy = base - 31;
        CANOPY.forEach(([dx, dy, s]) => R(tx + dx, cy + dy, 1, 1, s ? pal.leaf2 : pal.leaf));
        if (st.season === 'spring') for (let i = 0; i < 14; i++) R(tx - 10 + ((i * 7) % 21), cy - 8 + ((i * 5) % 16), 1, 1, '#fff3f7');
      }
      g = old; cache[key] = c = cv;
    }
    g.drawImage(c, Math.round(x - 15), GY - 44);
  }
  function win(x, y, w, h, on) {
    R(x, y, w, h, '#a8cbe4'); R(x + 1, y + 1, Math.max(1, Math.round(w / 3)), 1, '#e6f3fb');
    st.lights.push([x, y, w, h, on == null ? ((x * 7 + y * 13) % 10) < 6 : on]);
  }
  function bld(x, w, h, c) {
    const top = GY - h; R(x, top, w, h, c); R(x, top, w, 2, 'rgba(0,0,0,0.12)');
    for (let y = top + 5; y < GY - 7; y += 7) for (let xx = x + 3; xx <= x + w - 6; xx += 6) win(xx, y, 3, 4);
  }
  function lamp(x) { R(x, GY - 20, 1, 22, '#4a4f5c'); R(x - 1, GY - 21, 4, 2, '#4a4f5c'); st.lights.push([x - 1, GY - 19, 4, 1, true]); }
  function mountain(cx, half, h) { for (let i = 0; i < h; i++) { const w = (i / h) * half; R(cx - w, GY - h + i, w * 2 + 1, 1, i < h * 0.2 ? '#f4f7fa' : st.season === 'winter' ? '#c4d0db' : '#8197ad'); } }
  function train(x, y) {
    for (let c = 0; c < 3; c++) {
      const cx = x + c * 48; R(cx, y, 46, 18, '#ece8df'); R(cx, y + 12, 46, 2, '#4e6089');
      for (let i = 0; i < 5; i++) win(cx + 4 + i * 8, y + 3, 5, 6, true);
      R(cx + 3, y + 18, 6, 2, '#333842'); R(cx + 37, y + 18, 6, 2, '#333842');
    }
    R(x + 144, y + 2, 3, 14, '#ece8df');
  }

  /* ---------- places ---------- */
  function pFork(pal) {
    hills(pal); ground(pal);
    for (let y = GY; y < H; y++) {
      const k = (y - GY) / (H - GY);
      if (k > 0.5) { const w = 6 + k * 16; R(100 - w / 2, y, w, 1, '#dccca4'); }
      else { const off = (0.5 - k) / 0.5 * 62, w = 3 + k * 12; R(100 - off - w / 2, y, w, 1, '#dccca4'); R(100 + off - w / 2, y, w, 1, '#d8cff2'); }
    }
    R(99, GY - 16, 2, 22, '#7a5536');
    R(86, GY - 15, 12, 4, '#efe2c4'); R(85, GY - 14, 1, 2, '#efe2c4');
    R(101, GY - 9, 12, 4, '#e2dbf6'); R(113, GY - 8, 1, 2, '#e2dbf6');
    tree(30, pal); tree(172, pal);
  }
  function pHome(pal) {
    hills(pal); ground(pal);
    const x = 44, w = 48, h = 27, top = GY - h;
    R(x + 2, GY, w - 2, 1, 'rgba(0,0,0,0.14)');
    R(x, top, w, h, '#efe5d3'); R(x, GY - 2, w, 2, '#d8caae');
    for (let r = 0; r < 13; r++) R(x - 4 + r, top - 1 - r, w + 8 - r * 2, 1, r % 3 === 0 ? '#495b84' : '#5a6d97');
    R(x + w - 14, top - 13, 5, 9, '#8f8073'); R(x + w - 15, top - 14, 7, 1, '#776a5f');
    R(x + 19, GY - 15, 9, 15, '#7b4f36'); R(x + 26, GY - 8, 1, 1, '#e5c27a');
    win(x + 5, top + 6, 10, 8, true); R(x + 10, top + 6, 1, 8, '#efe5d3');
    win(x + 33, top + 6, 10, 8, true); R(x + 38, top + 6, 1, 8, '#efe5d3');
    R(x + 17, GY, 13, 2, '#bdb2a1');
    for (let fx = 100; fx <= 136; fx += 4) R(fx, GY - 7, 1, 7, '#ebe4d6');
    R(100, GY - 5, 37, 1, '#ebe4d6'); R(100, GY - 2, 37, 1, '#ebe4d6');
    R(146, GY - 10, 6, 4, '#c9503f'); R(148, GY - 6, 1, 6, '#6e6e6e');
    tree(172, pal);
  }
  function pApartment(pal) {
    hills(pal); ground(pal);
    const x = 46, w = 64, h = 60, top = GY - h;
    R(x + 2, GY, w, 1, 'rgba(0,0,0,0.14)');
    R(x, top, w, h, '#dcd6cc'); R(x - 2, top - 2, w + 4, 3, '#b8afa3');
    for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) {
      const wx = x + 6 + i * 20, wy = top + 6 + f * 15; win(wx, wy, 12, 8);
      R(wx - 2, wy + 9, 16, 1, '#8d857a'); R(wx - 2, wy + 9, 1, 3, '#8d857a'); R(wx + 13, wy + 9, 1, 3, '#8d857a'); R(wx - 2, wy + 11, 16, 1, '#8d857a');
    }
    R(x + 25, GY - 11, 14, 11, '#6f6a63'); win(x + 27, GY - 9, 10, 9, true);
    tree(158, pal);
  }
  function pCity(pal, n) {
    const far = n > 0.5 ? '#232a4e' : '#9fb0cc';
    SKYLINE.forEach(b => R(b.x, GY - 24 - b.h, b.w, b.h + 24, far));
    bld(4, 36, 56, '#c6ccd8'); bld(44, 30, 72, '#b4bdcc'); bld(78, 46, 46, '#d3cec4'); bld(128, 30, 64, '#adb7c8'); bld(162, 40, 42, '#cfd3da');
    R(0, GY, W, 10, '#a9aeb7'); R(0, GY + 10, W, H - GY - 10, '#60656f');
    for (let x = 0; x < W; x += 16) R(x + 4, GY + 15, 8, 1, '#e5e5e5');
    lamp(40); lamp(122);
  }
  function pCountry(pal) {
    mountain(56, 50, 54); mountain(140, 64, 66);
    for (let x = 0; x < W; x++) { const h = 8 + Math.sin(x * 0.05 + 1) * 3; R(x, GY - h, 1, h, pal.hill2); }
    R(0, GY, W, H - GY, pal.ground);
    for (let y = GY + 5; y < H; y += 3) R(0, y, W, 1, pal.field);
    const hx = 124;
    R(hx, GY - 17, 30, 17, '#c9a77c');
    for (let r = 0; r < 9; r++) R(hx - 3 + r, GY - 18 - r, 36 - r * 2, 1, '#6d5a3d');
    R(hx + 12, GY - 10, 7, 10, '#5d4630'); win(hx + 3, GY - 13, 6, 5, true); win(hx + 22, GY - 13, 6, 5, true);
    tree(34, pal);
    R(182, GY - 34, 2, 34, '#6b5444'); R(177, GY - 31, 12, 1, '#6b5444');
  }
  function pSchool(pal) {
    hills(pal); ground(pal);
    const x = 30, w = 120, h = 34, top = GY - h;
    R(x + 2, GY, w, 1, 'rgba(0,0,0,0.14)');
    R(x, top, w, h, '#eee6d7'); R(x, top - 2, w, 2, '#c8bdab');
    R(x + 50, top - 20, 20, 20, '#eee6d7'); R(x + 48, top - 22, 24, 2, '#c8bdab');
    disc(x + 60, top - 11, 4, '#fbfbf7'); R(x + 60, top - 14, 1, 3, '#3a3a44'); R(x + 60, top - 11, 3, 1, '#3a3a44');
    for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) { const wx = x + 4 + Math.round(i * 11.6); if (row === 1 && wx > x + 46 && wx < x + 68) continue; win(wx, top + 5 + row * 13, 8, 7); }
    R(x + 54, GY - 12, 12, 12, '#8a6a4a');
    R(164, GY - 15, 4, 15, '#bdb4a5'); R(188, GY - 15, 4, 15, '#bdb4a5'); R(163, GY - 16, 6, 1, '#a99f8f'); R(187, GY - 16, 6, 1, '#a99f8f');
    tree(14, pal);
  }
  function pOffice(pal, n) {
    const far = n > 0.5 ? '#232a4e' : '#a9b8d0';
    SKYLINE.forEach((b, i) => { if (i % 2) R(b.x, GY - 18 - b.h, b.w, b.h + 18, far); });
    const x = 40, w = 50, h = 80, top = GY - h;
    R(x, top, w, h, '#7fa2c2');
    for (let yy = top + 3; yy < GY - 10; yy += 5) for (let xx = x + 3; xx < x + w - 4; xx += 7) { R(xx, yy, 6, 3, '#9dbad6'); st.lights.push([xx, yy, 6, 3, ((xx * 3 + yy * 7) % 10) < 4]); }
    R(x + 5, top + 2, 2, h - 14, 'rgba(255,255,255,0.2)');
    R(x + 17, GY - 10, 16, 10, '#3c495d'); R(x + 24, GY - 10, 1, 10, '#56647a');
    bld(104, 40, 50, '#c2c8d2');
    R(0, GY, W, H - GY, '#c9c5bd');
    for (let xx = 0; xx < W; xx += 12) R(xx, GY + 1, 1, H - GY - 1, '#bab5ac');
    R(0, GY + 11, W, 1, '#bab5ac');
    tree(170, pal);
  }
  function pStation(pal) {
    hills(pal);
    R(0, GY - 8, W, 8, '#8f887d'); R(0, GY - 6, W, 1, '#5a554f'); R(0, GY - 2, W, 1, '#5a554f');
    for (let x = 0; x < W; x += 5) R(x, GY - 5, 2, 3, '#6e675e');
    if (st.trainX > -150) train(Math.round(st.trainX), GY - 26);
    R(0, GY, W, H - GY, '#cdc6b8'); R(0, GY + 1, W, 2, '#e3bf48');
    R(6, 58, 188, 3, '#4e6089'); R(6, 61, 188, 1, '#3b4b70');
    [18, 100, 182].forEach(px => R(px, 62, 2, GY + 8 - 62, '#7f8794'));
    R(84, 64, 32, 8, '#f5f5f2'); R(87, 67, 26, 2, '#4e6089');
    st.lights.push([30, 62, 8, 1, true], [120, 62, 8, 1, true], [160, 62, 8, 1, true]);
  }
  function pCafe(pal) {
    hills(pal); ground(pal);
    R(0, GY, W, 7, '#d8cdb9');
    const x = 44, w = 66, h = 34, top = GY - h;
    R(x + 2, GY, w, 1, 'rgba(0,0,0,0.12)');
    R(x, top, w, h, '#efe2cc');
    R(x + 16, top - 12, 34, 7, '#2f3a4f'); for (let i = 0; i < 5; i++) R(x + 20 + i * 6, top - 9, 3, 1, '#efe2cc');
    for (let i = 0; i < w + 6; i++) R(x - 3 + i, top - 4, 1, 7, ((i >> 2) & 1) ? '#f6efe4' : '#4e7d66');
    for (let i = 0; i < w + 6; i += 4) R(x - 3 + i, top + 3, 2, 1, '#4e7d66');
    win(x + 5, top + 9, 32, 15, true); R(x + 5, top + 19, 32, 1, '#c9b99c');
    R(x + 44, top + 9, 13, h - 9, '#6e4b2f'); R(x + 46, top + 11, 9, 7, '#a8cbe4');
    R(x + 72, GY - 9, 7, 9, '#2f3a4f'); R(x + 73, GY - 7, 5, 1, '#e8e1d4'); R(x + 73, GY - 5, 4, 1, '#e8e1d4');
    R(134, GY - 7, 14, 1, '#7b5339'); R(140, GY - 6, 2, 6, '#7b5339');
    R(130, GY - 5, 1, 5, '#7b5339'); R(130, GY - 5, 3, 1, '#7b5339'); R(151, GY - 5, 1, 5, '#7b5339'); R(149, GY - 5, 3, 1, '#7b5339');
    R(30, GY - 5, 6, 5, '#b5653e'); R(29, GY - 11, 8, 6, '#4f8f5a'); R(31, GY - 13, 4, 2, '#4f8f5a');
    tree(178, pal);
  }
  function pSea(pal, n) {
    const hz = 70;
    R(0, hz, W, GY + 4 - hz, n > 0.5 ? '#1b2c55' : st.season === 'winter' ? '#4f7fa8' : '#3f86bd');
    const isl = n > 0.5 ? '#222e50' : '#6f8fa6'; R(14, hz - 3, 26, 3, isl); R(20, hz - 5, 12, 2, isl);
    const wc = n > 0.5 ? '#2e4572' : '#8cc6ea';
    for (let i = 0; i < 26; i++) { const wx = ((i * 41 + st.t * (4 + (i % 3) * 2)) % (W + 10)) - 5; R(wx, hz + 3 + ((i * 17) % 27), 3 + (i % 3), 1, wc); }
    const t = st.tod;
    if (t > 0.22 && t < 0.78) { const k = (t - 0.22) / 0.56, sx = 16 + k * 168; for (let yy = hz + 2; yy < GY + 2; yy += 2) if (((yy + Math.floor(st.t * 6)) % 4) < 2) R(sx - 2 + (yy % 3), yy, 4, 1, k < 0.14 || k > 0.86 ? '#ffb889' : '#fff2c4'); }
    R(0, GY + 3, W, 1, '#f4f1e8'); R(0, GY + 4, W, H - GY - 4, st.season === 'winter' ? '#ddd6c4' : '#e9d7a7');
    R(150, hz + 10, 32, 8, '#6d6865'); R(155, hz + 7, 22, 3, '#7c7672');
    R(161, hz - 22, 9, 30, '#f2f2f2'); R(161, hz - 14, 9, 3, '#c9503f'); R(161, hz - 4, 9, 3, '#c9503f');
    R(160, hz - 27, 11, 5, '#3d4656'); R(162, hz - 26, 7, 3, '#fff1b0'); st.lights.push([162, hz - 26, 7, 3, true]);
    const bx = Math.round(st.boatX) - 20;
    R(bx, hz + 14, 14, 2, '#7b4f36'); R(bx + 1, hz + 16, 12, 1, '#5d3b29'); R(bx + 6, hz + 4, 1, 10, '#5d3b29');
    for (let i = 0; i < 8; i++) R(bx + 7, hz + 5 + i, Math.max(1, i), 1, '#f5f2ea');
  }
  function scene(pal, n) {
    switch (st.place) {
      case 'home': return pHome(pal);
      case 'apartment': return pApartment(pal);
      case 'city': return pCity(pal, n);
      case 'countryside': return pCountry(pal);
      case 'school': return pSchool(pal);
      case 'office': return pOffice(pal, n);
      case 'station': return pStation(pal);
      case 'cafe': return pCafe(pal);
      case 'sea': return pSea(pal, n);
      default: return pFork(pal);
    }
  }

  /* ---------- people ---------- */
  const BODY = ['..HHH..', '.HHHHH.', '.HSSSH.', '.SKSKS.', '.SSSSS.', '..SSS..', '.TTTTT.', 'STTTTTS', '.TTTTT.', '.BBBBB.'];
  const BODY_L = ['..HHH..', '.HHHHH.', 'HHSSSHH', 'HSKSKSH', 'HSSSSSH', 'H.SSS.H', '.TTTTT.', 'STTTTTS', '.TTTTT.', '.BBBBB.'];
  const LEGS = [['.B...B.', '.B...B.', '.F...F.'], ['..B.B..', '..B.B..', '..F.F..']];
  const KID = ['.HHH.', 'HSSSH', 'SKSKS', '.SSS.', 'TTTTT', '.TTT.'];
  const KID_L = [['.B.B.', '.F.F.'], ['..BB.', '..FF.']];
  const PET = [['X.X.....', 'XXX...X.', 'XKXXXXX.', 'XXXXXXX.', '.XXXXXX.', '.X.X.X.X'], ['X.X.....', 'XXX....X', 'XKXXXXX.', 'XXXXXXX.', '.XXXXXX.', 'X.X.X.X.']];
  const COL = {
    you: { H: '#2a2b3d', S: '#f2d0b2', K: '#2a2b3d', T: '#3e5aa0', B: '#2d3850', F: '#3a2f2a' },
    partner: { H: '#5a3a2a', S: '#f0cdb0', K: '#2a2b3d', T: '#c9765c', B: '#5b4a3f', F: '#3a2f2a' },
    child: { H: '#3a2a22', S: '#f4d6ba', K: '#2a2b3d', T: '#e2b23f', B: '#4a5d7a', F: '#3a2f2a' },
    elder: { H: '#d8d8d8', S: '#eac8ab', K: '#2a2b3d', T: '#879a77', B: '#5c5f66', F: '#3a2f2a' },
    friend: { H: '#7a4b2a', S: '#efcaa9', K: '#2a2b3d', T: '#4f8f78', B: '#3e4656', F: '#3a2f2a' },
    pet: { X: '#d38a3e', K: '#2a2b3d' },
  };
  function sprite(rows, col, x, y, flip) {
    const w = rows[0].length;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) { const cc = col[row[c]]; if (!cc) continue; g.fillStyle = cc; g.fillRect(Math.round(x + (flip ? w - 1 - c : c)), Math.round(y + r), 1, 1); }
    }
  }
  function person(kind, x, flip, frame) {
    const col = COL[kind] || COL.friend;
    if (kind === 'child') { sprite(KID.concat(KID_L[frame]), col, x - 2, FEET - 8, flip); return; }
    if (kind === 'pet') { sprite(PET[frame], col, x - 4, FEET - 6, !flip); return; }
    sprite((kind === 'partner' ? BODY_L : BODY).concat(LEGS[frame]), col, x - 3, FEET - 13, flip);
    if (kind === 'elder') R(flip ? x - 5 : x + 4, FEET - 6, 1, 6, '#7a5536');
  }
  const hopY = () => (st.hop > 0 ? Math.round(Math.sin((st.hop / 0.4) * Math.PI) * 3) : 0);
  function people() {
    const flip = st.dir < 0, fr = st.walking ? st.frame : 0;
    const off = { partner: -11, child: 10, elder: -21, friend: 12, pet: 19 };
    st.withs.forEach((w, i) => { let ox = off[w] || (i + 1) * 10; if (flip) ox = -ox; person(w, clamp(st.x + ox, 6, W - 6), flip, w === 'elder' ? 0 : fr); });
    sprite(BODY.concat(LEGS[fr]), COL.you, st.x - 3, FEET - 13 - hopY(), flip);
  }
  const EMO = {
    '2': ['#e2574c', ['.X.X.', 'XXXXX', '.XXX.', '..X..']],
    '1': ['#3e5aa0', ['...XX', '...X.', '.XXX.', '.XX..']],
    '-1': ['#7a7f92', ['.....', 'X.X.X', '.....', '.....']],
    '-2': ['#4f86d1', ['..X..', '.XXX.', 'XXXXX', '.XXX.']],
  };
  function emote() {
    const e = EMO[String(st.emote)]; if (!e) return;
    const bx = Math.round(st.x) - 5, by = FEET - 24 - hopY();
    R(bx + 1, by, 9, 1, '#ffffff'); R(bx, by + 1, 11, 5, '#ffffff'); R(bx + 1, by + 6, 9, 1, '#ffffff'); R(bx + 4, by + 7, 2, 1, '#ffffff'); R(bx + 4, by + 8, 1, 1, '#ffffff');
    const [c, m] = e; for (let r = 0; r < m.length; r++) for (let k = 0; k < 5; k++) if (m[r][k] === 'X') R(bx + 3 + k, by + 2 + r, 1, 1, c);
  }

  /* ---------- weather particles ---------- */
  function newPart(kind) {
    const r = Math.random;
    switch (kind) {
      case 'rain': return { k: kind, x: r() * (W + 30) - 10, y: -4, vx: -14, vy: 150, life: 2, f: 0, ph: 0, sw: 0 };
      case 'snow': return { k: kind, x: r() * W, y: -2, vx: 0, vy: 9 + r() * 8, life: 16, f: 1 + r(), ph: r() * 6, sw: 6 };
      case 'petal': return { k: kind, x: r() * W - 20, y: -2, vx: 10 + r() * 8, vy: 10 + r() * 6, life: 14, f: 2 + r() * 2, ph: r() * 6, sw: 10, c: r() > 0.5 ? '#f7c5d5' : '#fbe1ea' };
      case 'leaf': return { k: kind, x: r() * W, y: -2, vx: 4 + r() * 6, vy: 12 + r() * 6, life: 14, f: 2 + r(), ph: r() * 6, sw: 12, c: ['#e07b39', '#c8582e', '#e8a542'][(r() * 3) | 0] };
      default: return { k: 'fly', x: 20 + r() * 160, y: 70 + r() * 30, vx: (r() - 0.5) * 6, vy: (r() - 0.5) * 4, life: 5 + r() * 3, f: 3, ph: r() * 6, sw: 4 };
    }
  }
  function updParts(dt, n) {
    let kind = null, rate = 0;
    if (!st.reduced) {
      if (st.mood <= -2) { kind = st.season === 'winter' ? 'snow' : 'rain'; rate = kind === 'rain' ? 45 : 18; }
      else if (st.season === 'spring') { kind = 'petal'; rate = 6; }
      else if (st.season === 'autumn') { kind = 'leaf'; rate = 4; }
      else if (st.season === 'winter') { kind = 'snow'; rate = 9; }
      else if (n > 0.6) { kind = 'fly'; rate = 1.5; }
      if (['city', 'office', 'station'].includes(st.place)) { if (kind === 'petal' || kind === 'leaf') rate *= 0.4; if (kind === 'fly') kind = null; }
    }
    if (kind) { st.acc += dt * rate; while (st.acc >= 1) { st.acc -= 1; if (st.parts.length < 90) st.parts.push(newPart(kind)); } } else st.acc = 0;
    if (st.place === 'home' && !st.reduced && (st.season === 'winter' || st.season === 'autumn' || n > 0.4)) {
      st.smokeAcc += dt * 2.2;
      while (st.smokeAcc >= 1) { st.smokeAcc -= 1; st.parts.push({ k: 'smoke', x: 80, y: 56, vx: 3, vy: -7, life: 3.2, f: 1.4, ph: Math.random() * 6, sw: 3 }); }
    }
    st.parts = st.parts.filter(p => {
      p.life -= dt; p.x += p.vx * dt + Math.sin(st.t * p.f + p.ph) * p.sw * dt; p.y += p.vy * dt;
      return p.life > 0 && p.y < H + 3 && p.x > -8 && p.x < W + 8;
    });
  }
  function parts(after) {
    st.parts.forEach(p => {
      if ((p.k === 'fly') !== after) return;
      if (p.k === 'rain') R(p.x, p.y, 1, 3, 'rgba(176,198,236,0.75)');
      else if (p.k === 'snow') R(p.x, p.y, 1, 1, '#ffffff');
      else if (p.k === 'petal' || p.k === 'leaf') R(p.x, p.y, 2, 1, p.c);
      else if (p.k === 'smoke') { g.globalAlpha = clamp(p.life / 3.2, 0, 1) * 0.55; R(p.x, p.y, 2, 2, '#dfe3ea'); g.globalAlpha = 1; }
      else { g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(st.t * 3 + p.ph)); R(p.x, p.y, 1, 1, '#fff6a8'); g.globalAlpha = 1; }
    });
  }
  function darken(ctx, n) {
    if (n <= 0.01) return;
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(10,14,42,${(n * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  }
  function lights(n) {
    if (n <= 0.12) return;
    const a = Math.min(1, (n - 0.12) * 1.4);
    st.lights.forEach(([x, y, w, h, on]) => { if (!on) return; g.globalAlpha = a * 0.22; R(x - 1, y - 1, w + 2, h + 2, '#ffcf70'); g.globalAlpha = a; R(x, y, w, h, '#ffd98a'); });
    g.globalAlpha = 1;
  }

  /* ---------- public ---------- */
  function draw() {
    if (!main) return;
    const n = nightAt(st.tod), pal = PAL[st.season];
    st.lights.length = 0;
    g = mctx; sky(); starsMoon(n); sun(); clouds(n);
    g = lctx; g.clearRect(0, 0, W, H); scene(pal, n); darken(lctx, n); lights(n);
    g = l2ctx; g.clearRect(0, 0, W, H); people(); parts(false); darken(l2ctx, n * 0.85);
    g = mctx; g.drawImage(layer, 0, 0); g.drawImage(layer2, 0, 0); parts(true); emote();
    if (st.fade > 0) { g.globalAlpha = st.fade; g.drawImage(prev, 0, 0); g.globalAlpha = 1; }
  }
  function easeTod(target, step) {
    let d = target - st.tod; if (d > 0.5) d -= 1; if (d < -0.5) d += 1;
    if (Math.abs(d) <= step) st.tod = target; else st.tod = (st.tod + Math.sign(d) * step + 1) % 1;
  }
  function update(dt, o) {
    st.t += dt;
    const speed = o.speed || 1;
    const cal = ((st.startMonth + Math.floor(st.month)) % 12 + 12) % 12;
    const ns = seasonOf(cal);
    if (ns !== st.season) { st.parts.forEach(p => { if (p.k !== 'smoke') p.life = Math.min(p.life, 0.9); }); st.season = ns; }
    if (st.target != null) easeTod(st.target, dt * 0.8);
    else if (st.reduced) easeTod(0.5, dt * 0.5);
    else if (o.mode === 'play') st.tod = (st.tod + dt / Math.max(1.8, 3.6 / speed)) % 1;
    else if (o.mode === 'wait') st.tod = (st.tod + dt / 7) % 1;
    else easeTod(0.58, dt * 0.3);
    if (st.fade > 0) st.fade = Math.max(0, st.fade - dt / 0.7);
    if (st.walking && !st.reduced) {
      st.x += st.dir * 9 * dt * Math.min(speed, 2);
      if (st.x > 172) { st.x = 172; st.dir = -1; } else if (st.x < 26) { st.x = 26; st.dir = 1; }
      st.ft += dt; if (st.ft > 0.2) { st.ft = 0; st.frame ^= 1; }
    } else st.frame = 0;
    if (st.hop > 0) st.hop = Math.max(0, st.hop - dt);
    const cs = o.mode === 'play' ? Math.min(speed, 3) : 0.5;
    CLOUDS.forEach(c => { c.x += c.s * dt * cs; if (c.x > W + 24) c.x = -c.w - 12; });
    if (st.place === 'station') {
      if (st.trainWait > 0) st.trainWait -= dt;
      else { st.trainX += 70 * dt; if (st.trainX > W + 8) { st.trainX = -160; st.trainWait = 2.5 + Math.random() * 4; } }
    }
    if (st.place === 'sea') st.boatX = (st.boatX + 2.5 * dt) % (W + 40);
    updParts(dt, nightAt(st.tod));
  }
  function setPlace(place, withs) {
    const p = PLACES.includes(place) || place === 'fork' ? place : 'city';
    const w = (withs || []).filter(x => WITHS.includes(x)).slice(0, 3);
    if (p === st.place && w.join() === st.withs.join()) return;
    if (main) { pctx.clearRect(0, 0, W, H); pctx.drawImage(main, 0, 0); st.fade = 1; }
    st.place = p; st.withs = w;
    if (p === 'station') { st.trainX = -160; st.trainWait = 0.6; }
  }
  function reset(startDate) {
    st.startMonth = startDate.getMonth(); st.month = 0; st.place = 'fork'; st.withs = []; st.mood = 0; st.tod = 0.58; st.target = null;
    st.walking = false; st.x = 86; st.dir = 1; st.parts = []; st.emote = null; st.fade = 0; st.hop = 0;
    st.season = seasonOf(st.startMonth);
  }
  function event(mood) { st.mood = mood; st.target = TOD[String(mood)]; st.walking = false; st.emote = mood || null; st.hop = mood > 0 ? 0.4 : 0; }
  function release() { st.target = null; st.walking = true; st.emote = null; }
  return {
    init, reset, setPlace, event, release, update, draw,
    setMonth(m) { st.month = m; },
    setReduced(b) { st.reduced = !!b; if (b) { st.walking = false; st.parts = []; } },
  };
})();

/* ================= theater controller: two world lines ================= */
const VIEW_KEY = 'tarareba.view';
const scenesOf = (w, tr) => (w && w.tracks && w.tracks[tr] && w.tracks[tr].scenes) || [];
const TH = {
  dlg: null, entryId: null, e: null, cId: null, oId: null, key: '', world: null, track: 'c', labels: null,
  p: null, raf: 0, last: 0, ctl: null, span: 120, startTs: 0, prevFocus: null, els: {}, R: null, view: '3d',
  _ym: '', _el: '', _st: null,
  init() {
    this.dlg = $('#theater');
    this.dlg.addEventListener('cancel', ev => { ev.preventDefault(); this.close(); });
    $('#thClose').innerHTML = svgI(IC.x);
    $('#thRestart').innerHTML = `${svgI(IC.restart)}<span>最初から</span>`;
    MW.init($('#mw')); MW.setReduced(reducedMQ.matches);
    try { this.view = localStorage.getItem(VIEW_KEY) || '3d'; } catch (err) { this.view = '3d'; }
    this.p = this.fresh(1); this.R = MW; this.updatePlay();
    if (window.ResizeObserver) new ResizeObserver(() => { if (this.R === W3) W3.resize(); }).observe($('#thStage'));
  },
  isOpen() { return !!(this.dlg && this.dlg.open); },
  fresh(speed) { return { t: 0, idx: { c: -1, o: -1 }, seen: { c: -1, o: -1 }, playing: false, speed: speed || 1, inEvent: false, evLeft: 0, evTotal: 1, ended: { c: false, o: false }, waiting: false, begun: false }; },
  scenes(tr) { return scenesOf(this.world, tr); },
  hasTrack(tr) { return !!(this.world && this.world.tracks && this.world.tracks[tr]); },
  other(tr) { return tr === 'c' ? 'o' : 'c'; },
  current() { const i = this.p.idx[this.track]; return i >= 0 ? this.scenes(this.track)[i] : null; },
  lineLabel(tr) { return this.e && this.e.decision ? (tr === 'c' ? '選んだ世界線' : '選ばなかった世界線') : (this.labels ? this.labels[tr] : ''); },
  pickRenderer() {
    let use3d = this.view !== '2d' && W3.available();
    if (use3d && !W3.isInit()) use3d = W3.init($('#mw3'));
    if (use3d) W3.setReduced(reducedMQ.matches);
    this.R = use3d ? W3 : MW;
    $('#mw').hidden = use3d; $('#mw3').hidden = !use3d; $('#thTilt').hidden = !use3d; $('#thHint').hidden = !use3d;
    $('#thStage').classList.toggle('is3d', use3d);
    const vb = $('#thView'); vb.innerHTML = `<span>${use3d ? '映像：リアル' : '映像：ドット'}</span>`; vb.setAttribute('aria-pressed', String(use3d)); vb.disabled = !W3.available();
    if (use3d) requestAnimationFrame(() => W3.resize());
  },
  toggleView() {
    if (!W3.available()) return;
    this.view = this.R === W3 ? '2d' : '3d';
    try { localStorage.setItem(VIEW_KEY, this.view); } catch (err) { /* ignore */ }
    const sc = this.current();
    this.pickRenderer();
    this.R.reset(new Date(this.startTs)); this.R.setMonth(this.p.t);
    if (sc) { this.R.setPlace(sc.place, sc.with); if (this.p.inEvent) this.R.event(sc.mood); else this.R.release(); }
    else if (this.p.begun && this.scenes(this.track).length) { const f = this.scenes(this.track)[0]; this.R.setPlace(f.place, f.with); this.R.release(); }
  },
  open(entryId, optId, focus) {
    const e = getEntry(entryId); if (!e || e.options.length < 2) return;
    Sheet.close(); this.abortGen();
    const decided = !!e.decision;
    let cId, oId;
    if (decided) { cId = e.decision.optionId; oId = optId && optId !== cId ? optId : e.options.find(o => o.id !== cId).id; }
    else { cId = optId || e.options[0].id; oId = e.options.find(o => o.id !== cId).id; }
    this.entryId = entryId; this.e = e; this.cId = cId; this.oId = oId; this.key = `${cId}__${oId}`;
    this.labels = worldLabels(e, cId, oId);
    if (focus === 'c' || focus === 'o') this.track = focus;
    else this.track = decided && e.decision.conviction > 60 && optId !== cId ? 'o' : 'c';
    this.startTs = (e.decision && e.decision.at) || now();
    $('#thTitle').textContent = `「${short(this.labels.cName, 14)}」と「${short(this.labels.oName, 14)}」`;
    $('#thPremise').textContent = decided ? `納得度 ${e.decision.conviction}%。選んだ道の不都合も含めて、二つの世界を同じ時間で確かめます。` : '二つの道の先を、同じ時間で見比べます。';
    this._st = null; this.p = this.fresh(this.p ? this.p.speed : 1); this.updateSpeed();
    if (!this.dlg.open) { this.prevFocus = document.activeElement; try { this.dlg.showModal(); } catch (err) { this.dlg.setAttribute('open', ''); } }
    document.body.classList.add('locked');
    this.pickRenderer();
    const saved = (e.worlds && e.worlds[this.key]) || legacyWorld(e, cId, oId);
    if (saved && (scenesOf(saved, 'c').length || scenesOf(saved, 'o').length)) {
      this.world = Object.assign(clone(saved), { done: true }); this.span = this.world.span || 120;
      if (this.world.startAt) this.startTs = this.world.startAt;
      if (!this.hasTrack(this.track)) this.track = this.hasTrack('c') ? 'c' : 'o';
      this.R.reset(new Date(this.startTs)); this.applyTitle(); this.p.playing = true; this.panelPremise();
    } else { this.world = null; this.R.reset(new Date(this.startTs)); this.panelSetup(); }
    this.hudVar(null); this.renderTrackSwitch(); this.renderTimeline(); this.renderMeters(); this.renderLog(); this.updatePlay();
    $('.th-inner', this.dlg).scrollTop = 0;
    this.last = performance.now(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(t => this.frame(t));
    requestAnimationFrame(() => $('#thClose').focus({ preventScroll: true }));
  },
  close() {
    this.abortGen();
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.dlg.open) this.dlg.close();
    document.body.classList.toggle('locked', !!(Sheet.el && Sheet.el.open));
    const f = this.prevFocus; this.prevFocus = null;
    if (f && document.contains(f)) f.focus({ preventScroll: true });
  },
  abortGen() { if (this.ctl) { const c = this.ctl; this.ctl = null; c.abort(); } },
  stopGen() { if (!this.ctl) return; this.abortGen(); this.finish(); },
  applyTitle() { if (this.world && this.world.title) $('#thTitle').textContent = this.world.title; },

  /* ---------- loop ---------- */
  frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000)); this.last = ts;
    const p = this.p;
    this.tick(dt);
    const mode = p.inEvent ? 'event' : (p.playing && p.begun && !p.waiting && !p.ended[this.track]) ? 'play' : (p.waiting || this.ctl) ? 'wait' : 'idle';
    this.R.setMonth(p.t); this.R.update(dt, { mode, speed: p.speed }); this.R.draw();
    this.hud();
    if (this.dlg.open) this.raf = requestAnimationFrame(t => this.frame(t));
  },
  tick(dt) {
    const p = this.p, w = this.world; if (!w || !p.playing) return;
    const tr = this.track, list = this.scenes(tr);
    if (p.ended[tr]) return;
    if (!p.begun) {
      if (!list.length) { p.waiting = true; return; }
      p.begun = true; p.waiting = false; this.R.setPlace(list[0].place, list[0].with); this.R.release();
    }
    if (p.inEvent) { p.evLeft -= dt * Math.sqrt(p.speed); this.evBar(); if (p.evLeft <= 0) this.leaveEvent(); return; }
    const next = list[p.idx[tr] + 1];
    const complete = w.done || !!(w.tracks[tr] && w.tracks[tr].ending);
    const target = next ? next.month : (complete ? w.span : null);
    if (target == null) { p.waiting = true; return; }
    p.waiting = false;
    const rate = w.span / 22 * p.speed;
    const ease = clamp((target - p.t) / Math.max(1, w.span * 0.025), 0.22, 1);
    p.t = Math.min(target, p.t + rate * ease * dt);
    if (target - p.t < 1e-3) { p.t = target; if (next) this.enterEvent(p.idx[tr] + 1); else this.enterEnding(); }
  },
  hud() {
    const p = this.p, span = this.world ? this.world.span : this.span;
    const ym = ymOf(this.startTs, p.t);
    const el = p.t < 0.5 ? (this.e && this.e.decision ? '分かれ道の日' : 'いま') : monthLabel(p.t);
    if (this._ym !== ym) { this._ym = ym; $('#hudYM').textContent = ym; }
    if (this._el !== el) { this._el = el; $('#hudEl').textContent = el; }
    if (this.els.fill) this.els.fill.style.width = (clamp(p.t / span, 0, 1) * 100).toFixed(2) + '%';
    const w = this.world;
    const s = this.ctl && !(this.scenes(this.track).length) ? '世界線を分岐させています…' : (p.waiting && p.begun && w && !w.done) ? 'この先を描いています…' : '';
    if (this._st !== s) { this._st = s; const b = $('#thStatus'); b.textContent = s; b.hidden = !s; }
  },
  hudVar(sc) {
    const box = $('#hudVar');
    const v = sc && sc.kind === 'variable' && sc.variable ? (this.e.variables || []).find(x => x.id === sc.variable) : null;
    if (!v) { box.hidden = true; return; }
    box.textContent = `判断変数：${v.title}（${VAR_DIR[v.direction] || ''}）`; box.className = `hud-var ${v.direction}`; box.hidden = false;
  },

  /* ---------- playback ---------- */
  enterEvent(i) {
    const p = this.p, tr = this.track, sc = this.scenes(tr)[i]; if (!sc) return;
    p.idx[tr] = i; p.seen[tr] = Math.max(p.seen[tr], i); p.inEvent = true;
    p.evTotal = p.evLeft = 3 + (sc.headline.length + sc.story.length) * 0.075;
    this.R.setPlace(sc.place, sc.with); this.R.event(sc.mood);
    this.panelEvent(sc); this.renderLog(); this.renderTimeline(); this.renderMeters(); this.hudVar(sc);
  },
  leaveEvent() { const p = this.p; if (!p.inEvent) return; p.inEvent = false; this.R.release(); this.evBar(); this.hudVar(null); },
  enterEnding() {
    const p = this.p, tr = this.track; p.ended[tr] = true; p.inEvent = false; p.playing = false; p.t = this.world.span;
    const last = this.scenes(tr).slice(-1)[0]; this.R.event(last && last.mood > 0 ? last.mood : 0);
    this.hudVar(null); this.panelEnding(tr); this.updatePlay(); this.renderTimeline(); this.renderMeters();
  },
  jump(i) {
    const list = this.scenes(this.track); if (!list[i]) return;
    const p = this.p; p.ended[this.track] = false; p.begun = true; p.waiting = false; p.playing = true; p.t = list[i].month;
    this.enterEvent(i); this.updatePlay();
  },
  restart() {
    if (!this.world) return;
    this.p = this.fresh(this.p.speed); this.p.playing = true;
    this.R.reset(new Date(this.startTs)); this.hudVar(null); this.panelPremise(); this.renderTimeline(); this.renderMeters(); this.renderLog(); this.updatePlay();
  },
  watchOther() {
    const tr = this.other(this.track); if (!this.hasTrack(tr)) return;
    this.track = tr; const p = this.p;
    p.t = 0; p.idx[tr] = -1; p.ended[tr] = false; p.begun = false; p.inEvent = false; p.playing = true;
    this.hudVar(null); this.panelPremise(); this.renderTrackSwitch(); this.renderTimeline(); this.renderMeters(); this.renderLog(); this.updatePlay();
  },
  switchTrack(tr) {
    if (tr === this.track || !this.hasTrack(tr)) return;
    const p = this.p, w = this.world; this.track = tr;
    const list = this.scenes(tr); let k = -1;
    list.forEach((sc, i) => { if (sc.month <= p.t + 1e-6) k = i; });
    p.idx[tr] = k; p.seen[tr] = Math.max(p.seen[tr], k); p.inEvent = false; this.hudVar(null);
    const target = k >= 0 ? list[k] : list[0];
    if (target) { this.R.setPlace(target.place, target.with); this.R.release(); }
    p.begun = list.length > 0;
    const complete = w.done || !!(w.tracks[tr] && w.tracks[tr].ending);
    if (p.t >= w.span - 1e-6 && complete) { p.ended[tr] = true; p.playing = false; this.panelEnding(tr); }
    else { p.ended[tr] = false; if (k >= 0) this.panelEvent(list[k], true); else this.panelPremise(); }
    this.renderTrackSwitch(); this.renderTimeline(); this.renderMeters(); this.renderLog(); this.updatePlay();
  },
  togglePlay() {
    const p = this.p; if (!this.world) return;
    if (p.ended[this.track]) { this.restart(); return; }
    p.playing = !p.playing; this.updatePlay();
  },
  setSpeed(v) { this.p.speed = [1, 2, 4].includes(v) ? v : 1; this.updateSpeed(); },
  setSpan(v) { this.span = v === 36 ? 36 : 120; $$('[data-act="th-span"]', this.dlg).forEach(b => b.setAttribute('aria-checked', String(+b.dataset.v === this.span))); },
  updatePlay() {
    const p = this.p, b = $('#thPlay'); if (!b) return;
    const ended = p.ended[this.track];
    b.innerHTML = p.playing ? `${svgI(IC.pause)}<span>一時停止</span>` : `${svgI(IC.play)}<span>${ended ? 'もう一度' : '再生'}</span>`;
    b.disabled = !this.world; $('#thRestart').disabled = !this.world;
  },
  updateSpeed() { $$('[data-act="th-speed"]', this.dlg).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === this.p.speed))); },
  evBar() { const t = this.els.timer, p = this.p; if (!t || !t.isConnected) return; t.style.transform = `scaleX(${p.inEvent ? clamp(p.evLeft / p.evTotal, 0, 1).toFixed(3) : 0})`; },
  showCompare() { if (!this.world || !this.hasTrack('c') || !this.hasTrack('o')) return; this.p.playing = false; this.p.inEvent = false; this.hudVar(null); this.updatePlay(); this.panelCompare(); },
  showSetup() { this.p.playing = false; this.p.inEvent = false; this.updatePlay(); this.panelSetup(); },
  toggleVar(id) {
    edit(this.entryId, x => { const v = (x.variables || []).find(y => y.id === id); if (v) v.adopted = !v.adopted; });
    this.e = getEntry(this.entryId) || this.e; this.panelSetup();
  },

  /* ---------- generation ---------- */
  start(span) {
    this.abortGen();
    this.span = span === 36 ? 36 : 120;
    const e = getEntry(this.entryId) || this.e; this.e = e;
    const cOpt = optById(e, this.cId), oOpt = optById(e, this.oId);
    const vars = (e.variables || []).filter(v => v.adopted).slice(0, 4);
    const dims = pickDims(e, cOpt, oOpt);
    this.world = { title: '', premise: '', span: this.span, startAt: this.startTs, dims, vars: vars.map(v => v.id), conviction: e.decision ? e.decision.conviction : null, tracks: { c: { scenes: [], ending: null }, o: { scenes: [], ending: null } }, verify: null, done: false, source: 'ai' };
    this.p = this.fresh(this.p.speed); this.p.playing = true; this._st = null;
    this.R.reset(new Date(this.startTs)); this.hudVar(null);
    this.renderTrackSwitch(); this.renderTimeline(); this.renderMeters(); this.renderLog(); this.updatePlay();
    if (AI.fn) { this.streamAI(cOpt, oOpt, vars, dims); this.panelPremise(); }
    else this.applyLocal(cOpt, oOpt, vars, dims);
  },
  async streamAI(cOpt, oOpt, vars, dims) {
    const ctl = new AbortController(); this.ctl = ctl;
    const scanner = makeScanner(o => { if (this.ctl === ctl) this.ingest(o); });
    try {
      await AI.fn(worldPrompt(this.e, cOpt, oOpt, this.span, vars, dims), { modelTier: 'default', cache: false, signal: ctl.signal, onText: ({ delta }) => scanner.push(delta) });
      scanner.end();
      if (this.ctl !== ctl) return;
      this.ctl = null; this.finish();
    } catch (err) {
      if (this.ctl !== ctl) return;
      this.ctl = null;
      const m = AI.fail(err);
      toast((m || '') + '足りない部分は、記録をもとにした簡易版で描きます。');
      this.finish();
    }
  },
  normScene(o, tr) {
    const w = this.world, list = w.tracks[tr].scenes, raw = Math.round(Number(o.month));
    if (!isFinite(raw) || list.length >= 8) return null;
    let m = clamp(raw, 1, w.span);
    const last = list[list.length - 1];
    if (last) { if (last.month >= w.span) return null; if (m <= last.month) m = Math.min(w.span, last.month + 1); }
    const impact = {};
    if (o.impact && typeof o.impact === 'object') Object.keys(o.impact).forEach(k => { if (w.dims.includes(k)) { const n = Math.round(Number(o.impact[k])); if (isFinite(n) && n) impact[k] = clamp(n, -2, 2); } });
    let kind = SCENE_KINDS[o.kind] ? o.kind : 'daily';
    const variable = kind === 'variable' && typeof o.variable === 'string' && w.vars.includes(o.variable) ? o.variable : '';
    if (kind === 'variable' && !variable) kind = 'unexpected';
    return {
      month: m, label: (m === raw && str(o.label, 14)) || monthLabel(m),
      place: PLACES.includes(o.place) ? o.place : guessPlace(`${o.headline || ''}${o.story || ''}`, this.e.category),
      with: Array.isArray(o.with) ? Array.from(new Set(o.with.filter(x => WITHS.includes(x)))).slice(0, 3) : [],
      kind, variable, headline: str(o.headline, 40) || monthLabel(m), story: str(o.story, 220),
      mood: clamp(Math.round(Number(o.mood) || 0), -2, 2), impact, gained: str(o.gained, 24), lost: str(o.lost, 24),
    };
  },
  ingest(o) {
    if (!o || typeof o !== 'object' || !this.world) return;
    if (Array.isArray(o)) { o.forEach(x => this.ingest(x)); return; }
    const w = this.world;
    if (!o.type && (Array.isArray(o.scenes) || o.tracks)) {
      // 指示と違い、全体を1つのオブジェクトで返してきた場合
      if (o.title || o.premise) this.ingest({ type: 'meta', title: o.title, premise: o.premise });
      const list = Array.isArray(o.scenes) ? o.scenes : [];
      if (o.tracks && typeof o.tracks === 'object') ['chosen', 'other', 'c', 'o'].forEach(k => { const v = o.tracks[k]; if (!v) return; (Array.isArray(v) ? v : v.scenes || []).forEach(x => list.push(Object.assign({ track: k }, x))); if (v.ending) this.ingest(Object.assign({ type: 'ending', track: k }, v.ending)); });
      list.slice().sort((x, y) => (Number(x.month) || 0) - (Number(y.month) || 0)).forEach(x => this.ingest(Object.assign({}, x, { type: 'scene' })));
      (Array.isArray(o.endings) ? o.endings : []).forEach(x => this.ingest(Object.assign({}, x, { type: 'ending' })));
      if (o.verify) this.ingest(Object.assign({}, o.verify, { type: 'verify' }));
      return;
    }
    const trOf = x => (x === 'chosen' || x === 'c' ? 'c' : x === 'other' || x === 'o' ? 'o' : null);
    const type = o.type || (o.month != null ? 'scene' : o.questions ? 'verify' : o.premise ? 'meta' : null);
    if (type === 'meta') { w.title = str(o.title, 30) || w.title; w.premise = str(o.premise, 80) || w.premise; this.applyTitle(); if (!this.p.begun) this.panelPremise(); }
    else if (type === 'scene') { const tr = trOf(o.track); if (!tr) return; const sc = this.normScene(o, tr); if (sc) { w.tracks[tr].scenes.push(sc); this.renderTimeline(); } }
    else if (type === 'ending') { const tr = trOf(o.track); if (tr) w.tracks[tr].ending = { headline: str(o.headline, 40), story: str(o.story, 240) }; }
    else if (type === 'verify') w.verify = { summary: str(o.summary, 160), questions: (Array.isArray(o.questions) ? o.questions : []).map(q => str(q, 80)).filter(Boolean).slice(0, 4) };
  },
  finish(forced) {
    const w = this.world; if (!w) return;
    const e = getEntry(this.entryId) || this.e, cOpt = optById(e, this.cId), oOpt = optById(e, this.oId);
    const vars = (e.variables || []).filter(v => w.vars.includes(v.id));
    const loc = localWorld(e, cOpt, oOpt, w.span, vars, w.dims);
    let filled = false;
    ['c', 'o'].forEach(tr => {
      const t = w.tracks[tr], n = t.scenes.length, lastM = n ? t.scenes[n - 1].month : 0;
      if (forced !== 'local' && (n < 3 || lastM < w.span * 0.6)) { loc.tracks[tr].scenes.filter(sc => sc.month > lastM).forEach(sc => t.scenes.push(sc)); filled = true; }
      if (!t.ending || !t.ending.story) { t.ending = loc.tracks[tr].ending; if (forced !== 'local') filled = true; }
    });
    if (!w.title) w.title = loc.title;
    if (!w.premise) w.premise = loc.premise;
    if (!w.verify || !w.verify.questions || !w.verify.questions.length) w.verify = Object.assign({}, loc.verify, w.verify && w.verify.summary ? { summary: w.verify.summary } : {});
    w.source = forced === 'local' ? 'local' : filled ? 'mixed' : 'ai';
    w.done = true;
    this.applyTitle(); this.renderTrackSwitch(); this.renderTimeline(); this.renderMeters();
    if (!this.p.inEvent && this.p.idx[this.track] < 0 && !this.p.ended[this.track]) this.panelPremise();
    const data = clone(w); delete data.done; data.at = now();
    const key = this.key;
    edit(this.entryId, x => { x.worlds = x.worlds || {}; x.worlds[key] = data; });
  },
  applyLocal(cOpt, oOpt, vars, dims) {
    const loc = localWorld(this.e, cOpt, oOpt, this.span, vars, dims);
    Object.assign(this.world, { title: loc.title, premise: loc.premise, tracks: loc.tracks, verify: loc.verify });
    this.finish('local'); this.panelPremise();
  },

  /* ---------- panels ---------- */
  panelSetup() {
    const e = getEntry(this.entryId) || this.e; const vars = e.variables || []; const decided = !!e.decision;
    const need = convictionNeed(e);
    $('#thPanel').innerHTML = `<div class="ev-card">
      <p class="th-lead">${decided
        ? `現実のあなたは「${esc(this.labels.cName)}」を選びました（納得度${e.decision.conviction}%）。選んだ道と選ばなかった道を、同じ時間で早送りします。${need >= 2 ? '納得度が高くないので、選んだ道の不都合や想定外も厚めに描きます。' : '選んだ道の不都合も、少なくともひとつは描きます。'}`
        : `「${esc(this.labels.cName)}」と「${esc(this.labels.oName)}」、二つの道の先を同じ時間で早送りします。`}</p>
      <span class="th-label" id="spanLbl">どこまで見ますか？</span>
      <div class="th-span" role="radiogroup" aria-labelledby="spanLbl">${[36, 120].map(v => `<button type="button" role="radio" aria-checked="${this.span === v}" data-act="th-span" data-v="${v}">${monthLabel(v)}まで</button>`).join('')}</div>
      <span class="th-label" id="varLbl">この世界に入れる判断変数</span>
      ${vars.length
        ? `<div class="th-vars" role="group" aria-labelledby="varLbl">${vars.map(v => `<button type="button" role="checkbox" aria-checked="${!!v.adopted}" data-act="th-var" data-v="${v.id}" class="dir-${v.direction}"><span class="tv-dir">${VAR_DIR[v.direction] || ''}</span>${esc(v.title)}</button>`).join('')}</div>
           <p class="th-note">入れた変数は、どちらかの世界で出来事として起こります。入れ替えて描き直すと、世界の動きの違いを確かめられます。</p>`
        : '<p class="th-note">まだ判断変数がありません。見落としていた要素を、問いの形で補ってもらえます。</p>'}
      <div class="th-actions"><button type="button" class="th-btn" data-act="th-var-ask" ${S.varAsking ? 'disabled' : ''}>${S.varAsking ? '考えています…' : '判断変数を補ってもらう'}</button></div>
      <button type="button" class="th-cta" data-act="th-start">二つの世界を早送りで見る</button>
      <p class="th-note">${AI.fn ? '物語はAIが描きます。描き始めるまで、少し時間がかかることがあります。' : 'この環境ではAIを使えないため、記録をもとに組み立てた簡易版で再生します。'}</p>
    </div>`;
  },
  panelPremise() {
    const w = this.world, gen = !!this.ctl;
    $('#thPanel').innerHTML = `<article class="ev-card trk-${this.track}">
      <p class="ev-when"><span>はじまり</span><span>${ymOf(this.startTs, 0)}</span></p>
      <h3 class="ev-head">${esc((w && w.premise) || '二つの世界線が、ここから分かれます。')}</h3>
      <p class="ev-story">${gen ? 'AIが二つの世界を描いています。描けた場面から順に、早送りで再生します。' : `いまは「${esc(this.labels[this.track])}」を再生しています。上の切り替えで、同じ時期のもう一つの世界へ移れます。`}</p>
      ${gen ? '<div class="ev-foot"><span class="ev-weather">世界線を分岐させています…</span><button type="button" class="th-btn" data-act="th-stop">描くのをやめる</button></div>' : ''}
    </article>`;
  },
  panelEvent(sc, recap) {
    const v = sc.variable ? (this.e.variables || []).find(x => x.id === sc.variable) : null;
    const imp = Object.entries(sc.impact || {}).filter(([, n]) => n).map(([k, n]) => `<span class="imp ${n < 0 ? 'neg' : 'pos'}">${esc(k)} ${n > 0 ? '+' : ''}${n}</span>`).join('');
    $('#thPanel').innerHTML = `<article class="ev-card trk-${this.track}" aria-live="polite">
      <p class="ev-when"><span>${esc(sc.label)}<span class="ev-kind k-${sc.kind || 'daily'}">${SCENE_KINDS[sc.kind] || '日常'}</span></span><span>${ymOf(this.startTs, sc.month)}</span></p>
      <h3 class="ev-head">${esc(sc.headline)}</h3>
      ${v ? `<p class="ev-var ${v.direction}">判断変数：${esc(v.title)}（${VAR_DIR[v.direction] || ''}）</p>` : ''}
      ${sc.story ? `<p class="ev-story">${esc(sc.story)}</p>` : ''}
      ${imp ? `<p class="ev-imp" aria-label="暮らしの指標の動き">${imp}</p>` : ''}
      ${sc.gained || sc.lost ? `<dl class="ev-gl"><div><dt>得たもの</dt><dd>${esc(sc.gained || '—')}</dd></div><div><dt>手放したもの</dt><dd>${esc(sc.lost || '—')}</dd></div></dl>` : ''}
      <div class="ev-foot"><span class="ev-weather">${recap ? 'この時期の、この世界' : `きもち：${MOODS[String(sc.mood)] || ''}`}</span>${recap ? '' : '<button type="button" class="th-btn" data-act="th-next">つづける</button>'}</div>
      ${recap ? '' : '<span class="ev-timer" id="evTimer"></span>'}
    </article>`;
    this.els.timer = $('#evTimer');
  },
  panelEnding(tr) {
    const w = this.world, t = w.tracks[tr] || {}, ot = this.other(tr), both = this.hasTrack('c') && this.hasTrack('o');
    const src = { local: '記録から組み立てた簡易版の物語です。', mixed: 'AIが描いた場面に、記録から組み立てた場面を足しています。', sample: 'サンプルの物語です。', legacy: '以前の版で描いた物語です。描き直すと二つの世界になります。' }[w.source] || 'AIがあなたの記録をもとに描いた物語です。';
    $('#thPanel').innerHTML = `<article class="ev-card trk-${tr}">
      <p class="ev-when"><span>${esc(this.labels[tr])}　${monthLabel(w.span)}の先で</span><span>${ymOf(this.startTs, w.span)}</span></p>
      <h3 class="ev-head">${esc(t.ending ? t.ending.headline : '')}</h3>
      <p class="ev-story">${esc(t.ending ? t.ending.story : '')}</p>
      <p class="ev-src">${src}</p>
    </article>
    <div class="th-actions">
      ${both ? `<button type="button" class="th-cta" data-act="th-other">${esc(this.labels[ot])}も見る</button><button type="button" class="th-btn" data-act="th-compare">二つの世界を見比べる</button>` : `<button type="button" class="th-cta" data-act="th-setup">二つの世界で描き直す</button>`}
      <button type="button" class="th-btn" data-act="th-restart">${svgI(IC.restart)}<span>最初から</span></button>
    </div>`;
  },
  meterVals(tr, upto) {
    const dims = (this.world && this.world.dims) || []; const v = {};
    dims.forEach(d => { v[d] = 0; });
    this.scenes(tr).forEach(sc => { if (upto == null || sc.month <= upto + 1e-6) Object.keys(sc.impact || {}).forEach(k => { if (k in v) v[k] += sc.impact[k]; }); });
    return v;
  },
  panelCompare() {
    const w = this.world, e = getEntry(this.entryId) || this.e, dims = w.dims || [], decided = !!e.decision;
    const a = this.meterVals('c'), b = this.meterVals('o');
    const bar = (v, side) => { const x = clamp(v, -6, 6), pct = Math.abs(x) / 6 * 100; return `<span class="cmp-bar ${side}"><span class="cmp-fill ${x < 0 ? 'neg' : 'pos'}" style="width:${pct.toFixed(0)}%"></span></span>`; };
    const sign = n => `${n > 0 ? '+' : ''}${n}`;
    const rows = dims.map(d => `<div class="cmp-row"><span class="cmp-v">${sign(a[d])}</span>${bar(a[d], 'l')}<span class="cmp-name">${esc(d)}</span>${bar(b[d], 'r')}<span class="cmp-v">${sign(b[d])}</span></div>`).join('');
    const hard = tr => this.scenes(tr).filter(sc => sc.mood < 0 || sc.kind === 'regret' || sc.kind === 'unexpected').map(sc => `<li><span>${esc(sc.label)}</span>${esc(sc.headline)}</li>`).join('') || '<li>なし</li>';
    const qs = ((w.verify && w.verify.questions) || []).filter(Boolean);
    $('#thPanel').innerHTML = `<article class="ev-card">
      <p class="ev-when"><span>二つの世界を見比べる</span><span>${monthLabel(w.span)}まで</span></p>
      <h3 class="ev-head">${esc(w.title || '')}</h3>
      ${w.verify && w.verify.summary ? `<p class="ev-story">${esc(w.verify.summary)}</p>` : ''}
      <div class="cmp" aria-label="暮らしの指標の比較">
        <div class="cmp-row cmp-head"><span></span><span class="trk-c">${esc(this.labels.c)}</span><span></span><span class="trk-o">${esc(this.labels.o)}</span><span></span></div>
        ${rows}
      </div>
      <div class="cmp-lists">
        <div><h4 class="trk-c">${esc(this.labels.c)}の不都合・想定外</h4><ul>${hard('c')}</ul></div>
        <div><h4 class="trk-o">${esc(this.labels.o)}の不都合・想定外</h4><ul>${hard('o')}</ul></div>
      </div>
    </article>
    ${qs.length ? `<div class="sticky th-sticky"><span class="sticky-label">検証の問い</span>${qs.map(q => `<p>${esc(q)}</p>`).join('')}</div>` : ''}
    <div class="th-refl" id="thReflBox">
      ${decided ? `<label for="thConv" class="th-label">見比べたあとの納得度<span class="th-conv" id="thConvNow">${e.decision.conviction}%</span></label>
        <input id="thConv" type="range" min="0" max="100" step="5" value="${e.decision.conviction}" class="th-range">
        <div class="th-range-labels"><span>見直したい</span><span>引き受けられる</span></div>` : ''}
      <label for="thRefl" class="th-label">${decided ? '検証して気づいたこと' : '見比べて、感じたこと'}</label>
      <textarea id="thRefl" rows="3" maxlength="600" placeholder="${decided ? '例：想定外の不都合を見ても、守りたい理由が残った。' : '例：どちらの不都合なら引き受けられるか、少し見えてきた。'}"></textarea>
      <button type="button" class="th-cta" data-act="th-save-verify">${decided ? '検証を記録する' : 'ふりかえりを残す'}</button>
    </div>
    <div class="th-actions"><button type="button" class="th-btn" data-act="th-setup">条件を変えて描き直す</button><button type="button" class="th-btn" data-act="th-restart">${svgI(IC.restart)}<span>最初から見る</span></button></div>`;
    const r = $('#thConv'); if (r) r.addEventListener('input', () => { $('#thConvNow').textContent = r.value + '%'; });
  },
  saveVerify() {
    const e = getEntry(this.entryId); if (!e) return;
    const ta = $('#thRefl'); const note = ta ? ta.value.trim() : '';
    if (e.decision) {
      const before = e.decision.conviction, after = clamp(Math.round(Number(($('#thConv') || {}).value)), 0, 100);
      const key = this.key;
      edit(this.entryId, x => { x.verifications = x.verifications || []; x.verifications.push({ at: now(), before, after, note, key }); x.decision.conviction = after; });
      $('#thReflBox').innerHTML = `<p class="th-saved">検証を記録しました。納得度 ${before}% → ${after}%</p>`;
      toast(`検証を記録しました（納得度 ${before}% → ${after}%）`);
    } else {
      if (!note) { toast('感じたことを、ひとことでも書いてみてください。'); if (ta) ta.focus(); return; }
      const opt = this.cId, title = this.world ? this.world.title : '';
      edit(this.entryId, x => { x.reflections = x.reflections || []; x.reflections.push({ at: now(), optionId: opt, text: note, simTitle: title }); });
      $('#thReflBox').innerHTML = '<p class="th-saved">ふりかえりを残しました。</p>';
      toast('ふりかえりを残しました');
    }
  },

  /* ---------- small renders ---------- */
  renderTrackSwitch() {
    const el = $('#thTracks'); const ready = !!this.world;
    el.innerHTML = ['c', 'o'].map(tr => `<button type="button" data-act="th-track" data-v="${tr}" class="trk-${tr}" aria-pressed="${this.track === tr}" ${ready && !this.hasTrack(tr) ? 'disabled' : ''}>${esc(this.labels ? this.labels[tr] : '')}</button>`).join('');
    $('#thCompare').disabled = !(ready && this.hasTrack('c') && this.hasTrack('o') && this.world.done);
    const line = $('#thLine'); line.textContent = this.lineLabel(this.track); line.className = `hud-line trk-${this.track}`;
  },
  renderTimeline() {
    const tl = $('#thTimeline'); const w = this.world; const span = w ? w.span : this.span;
    const row = (tr, active) => this.scenes(tr).map((sc, i) => `<button type="button" class="tl-tick k-${sc.kind || 'daily'} ${active ? '' : 'ghost'} ${active && i <= this.p.seen[tr] ? 'seen' : ''} ${active && i === this.p.idx[tr] && !this.p.ended[tr] ? 'cur' : ''}" style="left:${(sc.month / span * 100).toFixed(2)}%" ${active ? `data-act="th-jump" data-i="${i}" aria-label="${esc(sc.label)}の場面「${esc(sc.headline)}」へ"` : 'tabindex="-1" aria-hidden="true"'}></button>`).join('');
    const pts = [[0, 20]].concat(this.scenes(this.track).map(sc => [(sc.month / span * 1000).toFixed(1), (20 - sc.mood * 7).toFixed(1)]));
    tl.innerHTML = `<svg class="tl-mood" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(q => q.join(',')).join(' ')}" vector-effect="non-scaling-stroke"/></svg>
      <div class="tl-track"><div class="tl-fill"></div></div>
      <div class="tl-ghost" aria-hidden="true">${row(this.other(this.track), false)}</div>
      ${row(this.track, true)}
      <div class="tl-labels" aria-hidden="true"><span>いま</span><span>${monthLabel(Math.round(span / 2))}</span><span>${monthLabel(span)}</span></div>`;
    this.els.fill = $('.tl-fill', tl);
  },
  renderMeters() {
    const el = $('#thMeters'); const w = this.world;
    if (!w || !(w.dims || []).length || !this.scenes(this.track).length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const v = this.meterVals(this.track, this.p.t);
    el.innerHTML = `<p class="mt-head"><span>暮らしの指標</span><span class="mt-line trk-${this.track}">${esc(this.labels[this.track])}</span></p>`
      + w.dims.map(d => { const x = clamp(v[d], -6, 6), pct = Math.abs(x) / 6 * 50; return `<div class="mt-row"><span class="mt-name">${esc(d)}</span><span class="mt-bar"><span class="mt-zero"></span><span class="mt-fill ${x < 0 ? 'neg' : 'pos'}" style="${x < 0 ? `right:50%;width:${pct.toFixed(1)}%` : `left:50%;width:${pct.toFixed(1)}%`}"></span></span><span class="mt-val">${x > 0 ? '+' : ''}${x}</span></div>`; }).join('');
  },
  renderLog() {
    const ol = $('#thLog'), tr = this.track, list = this.scenes(tr), upto = this.p.seen[tr];
    if (!this.world || upto < 0) { ol.innerHTML = ''; $('#thLogWrap').hidden = true; return; }
    ol.innerHTML = list.slice(0, upto + 1).map((sc, i) => `<li class="${i === this.p.idx[tr] ? 'cur' : ''}"><button type="button" data-act="th-jump" data-i="${i}"><span class="lg-when">${esc(sc.label)}</span><span>${esc(sc.headline)}</span></button></li>`).join('');
    $('#thLogWrap').hidden = false;
  },
};
