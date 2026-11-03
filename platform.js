/*
 * タラレバ — platform.js
 * 状態・保存（claude.ai / localStorage）・AI（claude.ai / APIキー）・ファイル保存
 */
'use strict';

/* ================= state ================= */
const S = {
  entries: [], view: 'diary', filter: 'all', detailId: null, ready: false,
  storage: 'loading', slow: false, asking: null, valQ: null, valueFocus: null,
  rcptFilter: 'all', consultWhere: '銀行', varAsking: null,
};
const entriesSig = list => JSON.stringify(list.slice().sort((a, b) => (a.id < b.id ? -1 : 1)));
const getEntry = id => S.entries.find(e => e.id === id) || null;
const sortedEntries = () => S.entries.slice().sort((a, b) => b.createdAt - a.createdAt);
const capi = () => (window.claude && typeof window.claude.use === 'function') ? window.claude : null;

/* ================= storage ================= */
const LS_KEY = 'tarareba.v1.entries';
const Store = {
  mode: 'loading', col: null, chains: new Map(), pending: new Map(), deleted: new Set(), snap: [], confirmed: false, timer: 0,
  async init() {
    const api = capi();
    if (api) {
      try {
        const [db, user] = await Promise.all([api.use('db'), api.use('user')]);
        const uid = user ? await user.id() : null;
        if (db && uid) {
          this.col = db.doc(`data/users/${uid}/tarareba`).collection('entries');
          this.mode = 'cloud'; S.storage = 'cloud';
          this.subscribe();
          return;
        }
      } catch (err) { console.warn('db unavailable', err); }
    }
    this.mode = 'local';
    S.storage = this.readLocal() === null ? 'memory' : 'local';
    S.entries = this.readLocal() || [];
    S.ready = true; render();
  },
  subscribe() {
    this.timer = setTimeout(() => { if (!this.confirmed) { S.ready = true; S.slow = true; render(); } }, 10000);
    this.col.onSnapshot(snap => {
      this.snap = snap.docs.map(d => d.data()).filter(x => x && x.id);
      if (!snap.metadata.fromCache) { this.confirmed = true; clearTimeout(this.timer); S.slow = false; }
      const wasReady = S.ready, before = entriesSig(S.entries);
      if (!snap.metadata.fromCache || this.snap.length) S.ready = true;
      this.merge();
      if (!wasReady || S.ready !== wasReady || entriesSig(S.entries) !== before) render();
    }, err => {
      clearTimeout(this.timer); S.ready = true;
      console.warn('snapshot error', err);
      toast('記録の読み込みが止まりました。ページを開き直すと再開できます。');
      render();
    });
  },
  merge() {
    const map = new Map(this.snap.map(e => [e.id, e]));
    this.pending.forEach((e, id) => map.set(id, e));
    this.deleted.forEach(id => map.delete(id));
    S.entries = Array.from(map.values());
  },
  readLocal() {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch (err) { return null; }
  },
  writeLocal() {
    if (S.storage === 'memory') return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(S.entries)); } catch (err) { toast('この端末に保存できませんでした。'); }
  },
  putLocal(e) {
    e.updatedAt = now();
    const i = S.entries.findIndex(x => x.id === e.id);
    if (i >= 0) S.entries[i] = e; else S.entries.push(e);
    if (this.mode === 'cloud') this.pending.set(e.id, e);
  },
  persist(e) {
    if (this.mode !== 'cloud') { this.writeLocal(); return Promise.resolve(); }
    const ref = this.col.doc(e.id);
    const prev = this.chains.get(e.id) || Promise.resolve();
    const p = prev.catch(() => {}).then(() => ref.set(clone(e))).then(() => {
      if (this.pending.get(e.id) === e) this.pending.delete(e.id);
    }, err => {
      console.warn('write failed', err);
      toast(err && err.code === 'quota_exceeded' ? '保存できる量の上限に達しました。古い記録を消すと保存できます。' : 'クラウドに保存できませんでした。この画面を閉じるまでは表示されます。');
      throw err;
    });
    this.chains.set(e.id, p);
    return p;
  },
  put(e) { this.putLocal(e); return this.persist(e).catch(() => {}); },
  async removeMany(ids) {
    const set = new Set(ids);
    S.entries = S.entries.filter(e => !set.has(e.id));
    if (this.mode !== 'cloud') { this.writeLocal(); return; }
    ids.forEach(id => { this.pending.delete(id); this.deleted.add(id); });
    for (const id of ids) {
      try { await (this.chains.get(id) || Promise.resolve()).catch(() => {}); await this.col.doc(id).delete(); }
      catch (err) { toast('一部の記録を削除できませんでした。'); break; }
    }
  },
  async remove(id) {
    S.entries = S.entries.filter(e => e.id !== id);
    if (this.mode !== 'cloud') { this.writeLocal(); return; }
    this.pending.delete(id); this.deleted.add(id);
    try { await (this.chains.get(id) || Promise.resolve()).catch(() => {}); await this.col.doc(id).delete(); }
    catch (err) { toast('削除できませんでした。'); }
  },
};
async function edit(id, fn) {
  const cur = getEntry(id); if (!cur) return null;
  const e = clone(cur); fn(e);
  const p = Store.put(e); render(); await p; return e;
}

/* ================= AI ================= */
/*
 * AIの呼び出し口は1つ（AI.fn）。使える方法を次の順で選ぶ。
 *   1. claude.ai のアーティファクトとして開かれたとき … claude.ai の sample 機能
 *   2. それ以外（GitHub Pages やローカル）で、APIキーが設定されているとき … Anthropic API を直接呼ぶ
 *   3. どちらもないとき … AIなし（用意した問いと、記録から組み立てる簡易版の物語）
 * どの方法でも AI.fn(prompt, {modelTier, signal, onText}) → {text} と AI.fn.json(prompt, opts) で呼べる。
 */
const AI_DEFAULT_MODELS = { story: 'claude-sonnet-5-5', quick: 'claude-haiku-5-5' };
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2026-10-21';
const KEY_NAME = 'tarareba.anthropic.key', MODELS_NAME = 'tarareba.anthropic.models';
const Keys = {
  mem: '',
  get() {
    try { return sessionStorage.getItem(KEY_NAME) || localStorage.getItem(KEY_NAME) || this.mem; } catch (err) { return this.mem; }
  },
  remembered() { try { return !!localStorage.getItem(KEY_NAME); } catch (err) { return false; } },
  set(key, remember) {
    this.clear(); this.mem = key;
    try { (remember ? localStorage : sessionStorage).setItem(KEY_NAME, key); } catch (err) { /* keep in memory only */ }
  },
  clear() {
    this.mem = '';
    try { sessionStorage.removeItem(KEY_NAME); localStorage.removeItem(KEY_NAME); } catch (err) { /* ignore */ }
  },
  models() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(MODELS_NAME) || '{}') || {}; } catch (err) { saved = {}; }
    return { story: str(saved.story, 80) || AI_DEFAULT_MODELS.story, quick: str(saved.quick, 80) || AI_DEFAULT_MODELS.quick };
  },
  setModels(m) {
    try { localStorage.setItem(MODELS_NAME, JSON.stringify({ story: str(m.story, 80), quick: str(m.quick, 80) })); } catch (err) { /* ignore */ }
  },
};
// Anthropic Messages API をブラウザから直接呼ぶ（ストリーミング）。キーは利用者自身のもの。
function anthropicSampler() {
  async function call(input, opts = {}) {
    const key = Keys.get();
    if (!key) throw { code: 'auth_error', message: 'no api key' };
    const models = Keys.models();
    const quick = opts.modelTier === 'quick';
    const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    let res;
    try {
      res = await fetch(ANTHROPIC_API, {
        method: 'POST', signal: opts.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: quick ? models.quick : models.story, max_tokens: quick ? 1500 : 6000, stream: true, messages }),
      });
    } catch (err) {
      throw err && err.name === 'AbortError' ? { code: 'cancelled', message: 'aborted' } : { code: 'upstream_error', message: String(err) };
    }
    if (!res.ok) {
      let msg = '';
      try { const j = await res.json(); msg = (j && j.error && j.error.message) || ''; } catch (err) { /* not json */ }
      const st = res.status;
      const code = st === 401 || st === 403 ? 'auth_error' : st === 429 || st === 529 ? 'rate_limited' : st === 413 ? 'prompt_too_large'
        : st === 404 || (st === 400 && /model/i.test(msg)) ? 'model_error' : st === 400 ? 'invalid_request' : 'upstream_error';
      throw { code, message: msg || `HTTP ${st}` };
    }
    let text = '', buf = '';
    try {
      const reader = res.body.getReader(); const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, cut); buf = buf.slice(cut + 2);
          const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
          if (!data) continue;
          let ev; try { ev = JSON.parse(data); } catch (err) { continue; }
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta' && ev.delta.text) {
            text += ev.delta.text;
            if (opts.onText) opts.onText({ text, delta: ev.delta.text });
          } else if (ev.type === 'error') {
            const t = ev.error && ev.error.type;
            throw { code: t === 'overloaded_error' || t === 'rate_limit_error' ? 'rate_limited' : 'upstream_error', message: (ev.error && ev.error.message) || 'stream error', text };
          }
        }
      }
    } catch (err) {
      if (err && err.name === 'AbortError') throw { code: 'cancelled', message: 'aborted', text };
      if (err && err.code) throw err;
      throw { code: 'upstream_error', message: String(err), text };
    }
    if (!text.trim()) throw { code: 'empty_completion', message: 'empty' };
    return { text, truncated: false };
  }
  call.json = async (input, opts) => {
    const { text } = await call(input, opts);
    const m = /[\[{][\s\S]*[\]}]/.exec(text);
    try { if (m) return JSON.parse(m[0]); } catch (err) { /* fall through */ }
    throw { code: 'invalid_json', message: 'invalid json', text };
  };
  return call;
}
const AI = {
  fn: null, state: 'loading', mode: 'off', // mode: 'claude' | 'key' | 'off'
  async init() {
    const api = capi();
    if (api) {
      try { const s = await api.use('sample'); if (s) { this.fn = s; this.state = 'on'; this.mode = 'claude'; render(); return; } } catch (err) { /* fall back */ }
      this.fn = null; this.state = 'off'; this.mode = 'off'; render(); return;
    }
    this.useKey(); render();
  },
  // claude.ai の外でだけ使う。キーがあればAPIを直接呼ぶ。
  canUseKey() { return !capi(); },
  useKey() {
    if (!this.canUseKey()) return;
    if (Keys.get()) { this.fn = anthropicSampler(); this.state = 'on'; this.mode = 'key'; }
    else { this.fn = null; this.state = 'off'; this.mode = 'off'; }
  },
  fail(err) {
    const code = err && err.code;
    if (code === 'cancelled') return null;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
      this.fn = null; this.state = 'off'; this.mode = 'off'; render();
      return 'この環境ではAIを使えません。';
    }
    if (code === 'auth_error') return 'APIキーが使えないようです。設定でキーを確かめてください。';
    if (code === 'model_error') return '設定したモデル名が使えないようです。設定で確かめてください。';
    if (code === 'rate_limited') return 'いまはAIが混み合っています。';
    if (code === 'prompt_too_large') return '記録が長すぎて、AIに渡せませんでした。';
    if (code === 'session_expired') return 'claude.aiにもう一度ログインすると、AIを使えます。';
    if (code === 'refused') return 'この内容ではAIが答えられませんでした。';
    return 'AIに接続できませんでした。';
  },
};

/* ================= file download ================= */
const DL = {
  fn: null,
  async init() { const api = capi(); if (!api) return; try { this.fn = await api.use('downloads'); } catch (err) { this.fn = null; } render(); },
  // claude.ai では downloads 機能、それ以外ではブラウザの通常のダウンロードを使う。
  can() { return !!this.fn || !capi(); },
  async save(filename, data, mime = 'text/plain') {
    if (/\.txt$/i.test(filename) && typeof data === 'string' && data[0] !== '\ufeff') data = '\ufeff' + data; // Windowsのメモ帳でも文字化けしないように
    if (this.fn) {
      try { const r = await this.fn.save({ filename, data }); if (r && r.status === 'saved') toast('保存しました'); return true; }
      catch (err) { if (!err || err.code !== 'declined') toast('ファイルを保存できませんでした。'); return false; }
    }
    if (capi()) return false;
    try {
      const url = URL.createObjectURL(new Blob([data], { type: `${mime};charset=utf-8` }));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('ファイルを保存しました');
      return true;
    } catch (err) { toast('ファイルを保存できませんでした。'); return false; }
  },
};
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('コピーしました'); return; } catch (err) { /* fall back */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
  ta.remove();
  toast(ok ? 'コピーしました' : 'コピーできませんでした。シートを長押しして選んでください。');
}
const Theme = {
  get() { try { return localStorage.getItem('tarareba.theme') || 'auto'; } catch (err) { return 'auto'; } },
  set(v) { try { localStorage.setItem('tarareba.theme', v); } catch (err) { /* ignore */ } this.apply(v); },
  apply(v) { const r = document.documentElement; if (v === 'light' || v === 'dark') r.dataset.theme = v; else delete r.dataset.theme; },
};

