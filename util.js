/*
 * タラレバ — util.js
 * 小さな共通関数（日付・文字列・トースト）
 */
'use strict';

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const DAY = 86400000;
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = ts => { const d = new Date(ts); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
const fmtTime = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmtReceipt = ts => { const d = new Date(ts); return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const isoDate = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const parseISO = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null; };
const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; };
const str = (v, n) => { if (typeof v !== 'string') return ''; v = v.trim(); return v.length > n ? v.slice(0, n) + '…' : v; };
function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function durLabel(ms) {
  const d = ms / DAY;
  if (d < 1) { const h = Math.round(ms / 3600000); return h < 1 ? '数分' : `${h}時間`; }
  if (d < 31) return `${Math.round(d)}日`;
  const m = Math.round(d / 30.4);
  return m < 12 ? `${m}ヶ月` : `${(d / 365).toFixed(1)}年`;
}
function monthLabel(m) {
  m = Math.round(m);
  if (m < 12) return m === 6 ? '半年後' : `${m}ヶ月後`;
  const y = Math.floor(m / 12), r = m % 12;
  if (!r) return `${y}年後`;
  return r === 6 ? `${y}年半後` : `${y}年${r}ヶ月後`;
}
function ymOf(startTs, months) {
  const d = new Date(startTs); d.setDate(1); d.setMonth(d.getMonth() + Math.floor(months));
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
const reducedMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); if (!t || !msg) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}

