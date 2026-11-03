/*
 * タラレバ — views.js
 * 画面の描画（日記・分かれ道・レシート・価値観・詳細）
 */
'use strict';

/* ================= small renderers ================= */
const meter = n => `<span class="meter" role="img" aria-label="迷いの強さ ${n}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const kindTag = e => `<span class="kind-tag ${e.kind}">${KINDS[e.kind] ? KINDS[e.kind].label : ''}</span>`;
function entryValues(e) { const s = new Set(); e.options.forEach(o => (o.values || []).forEach(v => s.add(v))); return Array.from(s); }
function customValues() { const s = new Set(); S.entries.forEach(e => entryValues(e).forEach(v => { if (!VALUES.includes(v)) s.add(v); })); return Array.from(s); }

function viewLoading() { return `<p class="loading-note">ノートを開いています…</p>`; }

function heroEmpty() {
  return `<section class="hero">
    <svg class="hero-fork" viewBox="0 0 420 190" role="img" aria-label="一本の道が、選んだ道と選ばなかった道に分かれていく絵">
      <g class="grow">
        <path class="hf-trunk" d="M210 186 C210 160 210 140 210 118"/>
        <path class="hf-left" d="M210 118 C200 86 150 62 96 34"/>
        <path class="hf-right" d="M210 118 C220 86 270 62 324 34"/>
        <circle class="hf-node" cx="210" cy="118" r="6"/>
        <circle class="hf-end" cx="96" cy="34" r="5"/>
        <rect class="hf-box" x="316" y="18" width="24" height="18" rx="3"/>
      </g>
      <text class="hf-label" x="40" y="22">選んだ道</text>
      <text class="hf-label wis" x="300" y="62">選ばなかった道</text>
    </svg>
    <h1 class="hero-title">結果ではなく、<br>迷いを残す日記。</h1>
    <p class="hero-lead">選択肢と、揺れた気持ちと、決めた理由。迷った瞬間を書きとめていくと、あなたが手放さないものが見えてきます。</p>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" data-act="new">最初の迷いを書きとめる</button>
      <button type="button" class="btn" data-act="sample">サンプルで試す</button>
    </div>
    <dl class="hero-features">
      <div><dt>迷いの日記</dt><dd>買い物から進路まで。迷った瞬間と、揺れた気持ちだけを残します。</dd></div>
      <div><dt>分かれ道ノート</dt><dd>進学・結婚・住まい・介護。選択肢と迷いと決めた理由を一冊に。相談シートも作れます。</dd></div>
      <div><dt>もしもの箱庭</dt><dd>選ばなかった道の先を、小さな世界で早送りしてのぞけます。</dd></div>
      <div><dt>理由レシート</dt><dd>何を選んだかより、なぜ選んだか。決めた理由をレシートにして残します。</dd></div>
    </dl>
  </section>`;
}

/* ================= diary ================= */
function viewDiary() {
  if (!S.entries.length && S.slow) return `<p class="loading-note">記録にまだ接続できていません。通信の状態を確かめてから、開き直してください。</p>`;
  if (!S.entries.length) return heroEmpty();
  const all = sortedEntries();
  const counts = { all: all.length, open: all.filter(e => !e.decision).length, done: all.filter(e => e.decision).length };
  const list = all.filter(e => S.filter === 'all' || (S.filter === 'open' ? !e.decision : !!e.decision));
  const groups = [];
  list.forEach(e => {
    const d = new Date(e.createdAt); const k = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    const g = groups[groups.length - 1];
    if (g && g[0] === k) g[1].push(e); else groups.push([k, [e]]);
  });
  const chip = (v, label, n) => `<button type="button" class="fchip" aria-pressed="${S.filter === v}" data-act="filter" data-v="${v}">${label}<span class="n">${n}</span></button>`;
  return `
    ${S.slow ? `<p class="note-line">クラウドの記録にまだ接続できていません。表示が古い場合があります。</p>` : ''}
    <section class="capture">
      <label class="capture-label" for="quick">今日、何に迷いましたか？</label>
      <div class="capture-row">
        <input id="quick" class="hand-input" data-keep="quick" maxlength="80" autocomplete="off" placeholder="例：週末、実家に帰るか友だちと出かけるか">
        <button type="button" class="btn btn-primary" data-act="quick">書きとめる</button>
      </div>
    </section>
    <div class="filters" role="group" aria-label="絞り込み">${chip('all', 'すべて', counts.all)}${chip('open', '迷い中', counts.open)}${chip('done', '決めた', counts.done)}</div>
    ${groups.length ? groups.map(([label, items]) => `<section class="month"><h2 class="month-label">${label}</h2><ol class="trail">${items.map(trailItem).join('')}</ol></section>`).join('')
      : `<p class="empty-note">${S.filter === 'open' ? '迷い中の記録はありません。' : 'まだ決めた記録はありません。'}</p>`}`;
}
function trailItem(e) {
  const d = new Date(e.createdAt);
  const chosen = e.decision ? optById(e, e.decision.optionId) : null;
  const vals = entryValues(e).slice(0, 4);
  return `<li class="trail-item ${e.decision ? 'is-done' : 'is-open'} ${e.kind === 'fork' ? 'is-fork' : ''}">
    <div class="trail-date"><span class="td-day">${d.getDate()}</span><span class="td-wd">${WD[d.getDay()]}</span></div>
    <div class="trail-node" aria-hidden="true"></div>
    <button type="button" class="trail-card" data-act="open" data-id="${e.id}">
      <span class="tc-meta">${kindTag(e)}<span>${esc(e.category)}</span></span>
      <span class="tc-title">${esc(e.title)}</span>
      <span class="tc-options">${e.options.map(o => `<span class="opt-chip ${chosen ? (o.id === chosen.id ? 'chosen' : 'unchosen') : ''}">${esc(o.name)}</span>`).join('<span class="opt-sep" aria-hidden="true">か</span>')}</span>
      <span class="tc-foot">${meter(e.intensity)}${vals.length ? `<span>${vals.map(esc).join('、')}</span>` : ''}</span>
    </button>
    ${e.decision ? `<span class="hanko" role="img" aria-label="決めた">決</span>` : `<span class="pending-tag">迷い中</span>`}
  </li>`;
}

/* ================= forks ================= */
function viewForks() {
  const forks = sortedEntries().filter(e => e.kind === 'fork');
  return `<h1 class="view-title">分かれ道ノート</h1>
    <p class="view-lead">進学・結婚・住まい・介護など、人生の転換点を、選択肢・迷い・決めた理由ごと残すノートです。問い返し役は答えを出しません。考えるための問いだけを渡します。</p>
    <h2 class="sec-title">新しいノートを始める</h2>
    <div class="cat-grid">${KINDS.fork.cats.map(c => `<button type="button" class="cat-btn" data-act="new-fork" data-cat="${esc(c)}">${svgI(CAT_IC[c] || CAT_IC['その他'])}<span>${esc(c)}</span></button>`).join('')}</div>
    <h2 class="sec-title">ノート</h2>
    ${forks.length ? `<ul class="fork-list">${forks.map(forkRow).join('')}</ul>` : `<p class="empty-note">まだ分かれ道ノートはありません。上のテーマから始められます。</p>`}`;
}
function deadlineInfo(e) {
  const ts = parseISO(e.fork && e.fork.deadline); if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((ts - today.getTime()) / DAY);
  return { ts, days, label: days > 0 ? `あと${days}日` : days === 0 ? '今日まで' : `${-days}日過ぎています` };
}
function forkRow(e) {
  const dl = deadlineInfo(e);
  const state = e.decision ? `「${short(optName(e, e.decision.optionId), 14)}」に決めた` : '考え中';
  return `<li><button type="button" class="fork-row ${e.decision ? 'done' : ''}" data-act="open" data-id="${e.id}">
    <span class="fr-title">${esc(e.title)}</span>
    <span class="fr-state">${esc(state)}</span>
    <span class="fr-meta"><span>${esc(e.category)}</span>${dl && !e.decision ? `<span>期限 ${esc(dl.label)}</span>` : ''}<span>迷いのログ ${(e.logs || []).filter(l => !l.sys).length}件</span><span>問い ${(e.qa || []).length}</span>${(e.consults || []).length ? `<span>相談 ${e.consults.length}回</span>` : ''}</span>
  </button></li>`;
}

/* ================= receipts ================= */
function receiptNo(e) {
  const decided = S.entries.filter(x => x.decision).sort((a, b) => a.decision.at - b.decision.at);
  const i = decided.findIndex(x => x.id === e.id);
  return String(i >= 0 ? i + 1 : 1).padStart(4, '0');
}
function barcode(seed) {
  let h = hashStr(seed) || 1, x = 0, rects = '';
  const next = () => (h = (Math.imul(h, 1103515245) + 12345) >>> 0);
  while (x < 196) { const w = 1 + (next() % 3); rects += `<rect x="${x}" y="0" width="${w}" height="34"/>`; x += w + 1 + (next() % 3); }
  const digits = String(hashStr(seed + 'n')).padStart(10, '0').slice(0, 10);
  return `<svg class="rc-barcode" viewBox="0 0 196 34" preserveAspectRatio="none" aria-hidden="true">${rects}</svg><p class="rc-code" aria-hidden="true">${digits}</p>`;
}
function receiptHTML(e, opts = {}) {
  const d = e.decision; if (!d) return '';
  const chosen = optById(e, d.optionId) || { name: '' };
  const others = e.options.filter(o => o.id !== d.optionId);
  const reasons = (d.reasons || []).filter(r => r.text);
  const vals = (chosen.values || []).length ? chosen.values.join('／') : '—';
  return `<div class="receipt-wrap ${opts.printing ? 'printing' : ''}"><article class="receipt" aria-label="理由レシート：${esc(chosen.name)}">
    <header class="rc-head"><p class="rc-logo">タラレバ</p><p class="rc-sub">理由レシート</p></header>
    <div class="rc-row rc-small"><span>${fmtReceipt(d.at)}</span><span>No.${receiptNo(e)}</span></div>
    <div class="rc-row rc-small"><span>${KINDS[e.kind] ? KINDS[e.kind].label : ''}</span><span>${esc(e.category)}</span></div>
    <hr class="rc-rule">
    <p class="rc-label">迷ったこと</p><p class="rc-text">${esc(e.title)}</p>
    <hr class="rc-rule">
    <p class="rc-label">お選びの品</p><p class="rc-big">${esc(chosen.name)}</p>
    <hr class="rc-rule">
    <div class="rc-row rc-label"><span>決めた理由</span><span>重み</span></div>
    ${reasons.map(r => `<div class="rc-row"><span class="rc-item">${esc(r.text)}</span><span aria-label="重み${r.weight}">${'★'.repeat(r.weight)}${'☆'.repeat(3 - r.weight)}</span></div>`).join('') || '<p class="rc-text">—</p>'}
    <hr class="rc-rule">
    <div class="rc-row rc-label"><span>選ばなかったもの</span><span></span></div>
    ${others.map(o => `<div class="rc-row rc-void"><span class="rc-item">${esc(o.name)}</span><span>取消</span></div>`).join('')}
    ${d.letGo ? `<p class="rc-label" style="margin-top:6px">手放したもの</p><p class="rc-text">${esc(d.letGo)}</p>` : ''}
    <hr class="rc-rule">
    <div class="rc-row"><span>迷った期間</span><span>${durLabel(Math.max(0, d.at - e.createdAt))}</span></div>
    <div class="rc-row"><span>迷いの強さ</span><span>${'■'.repeat(e.intensity)}${'□'.repeat(5 - e.intensity)}</span></div>
    <div class="rc-row"><span>問い返し</span><span>${(e.qa || []).length}回</span></div>
    ${(e.variables || []).some(v => v.adopted) ? `<div class="rc-row"><span>判断変数</span><span>${e.variables.filter(v => v.adopted).length}件</span></div>` : ''}
    ${(e.verifications || []).length ? `<div class="rc-row"><span>検証</span><span>${e.verifications.length}回</span></div><div class="rc-row rc-small"><span>はじめの納得度</span><span>${e.verifications[0].before}%</span></div>` : ''}
    <hr class="rc-rule rc-double">
    <div class="rc-row rc-total"><span>納得度</span><span>${d.conviction}%</span></div>
    <hr class="rc-rule">
    <p class="rc-label">大事にした価値</p><p class="rc-text">${esc(vals)}</p>
    ${barcode(e.id)}
    <p class="rc-foot">またの迷いを<br>お待ちしております</p>
  </article></div>`;
}
function viewReceipts() {
  const decided = S.entries.filter(e => e.decision).sort((a, b) => b.decision.at - a.decision.at);
  const cats = Array.from(new Set(decided.map(e => e.category)));
  if (S.rcptFilter !== 'all' && !cats.includes(S.rcptFilter)) S.rcptFilter = 'all';
  const list = decided.filter(e => S.rcptFilter === 'all' || e.category === S.rcptFilter);
  return `<h1 class="view-title">理由レシート</h1>
    <p class="view-lead">何を選んだかではなく、なぜ選んだか。決めた迷いには、理由のレシートが発行されます。</p>
    ${decided.length ? `<div class="filters" role="group" aria-label="テーマで絞り込み">
        <button type="button" class="fchip" aria-pressed="${S.rcptFilter === 'all'}" data-act="rcpt-filter" data-v="all">すべて<span class="n">${decided.length}</span></button>
        ${cats.map(c => `<button type="button" class="fchip" aria-pressed="${S.rcptFilter === c}" data-act="rcpt-filter" data-v="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div class="receipts">${list.map(e => receiptHTML(e)).join('')}</div>`
      : `<p class="empty-note">まだレシートはありません。迷い中の記録を開いて「決める」を押すと、理由のレシートが発行されます。</p>
         ${S.entries.length ? '' : `<button type="button" class="btn" data-act="sample">サンプルで試す</button>`}`}`;
}

/* ================= values ================= */
function valueStats() {
  const st = new Map(), pairs = new Map(); let decidedCount = 0;
  const get = v => { if (!st.has(v)) st.set(v, { v, kept: 0, letGo: 0, pending: 0, entries: [] }); return st.get(v); };
  S.entries.forEach(e => {
    if (e.decision) {
      const chosen = optById(e, e.decision.optionId); if (!chosen) return;
      decidedCount++;
      const cv = new Set(chosen.values || []); const ov = new Set();
      e.options.forEach(o => { if (o.id !== chosen.id) (o.values || []).forEach(v => { if (!cv.has(v)) ov.add(v); }); });
      cv.forEach(v => { const s = get(v); s.kept++; s.entries.push([e.id, 'kept']); });
      ov.forEach(v => { const s = get(v); s.letGo++; s.entries.push([e.id, 'letGo']); });
      cv.forEach(a => ov.forEach(b => {
        const [x, y] = [a, b].sort(); const key = x + '|' + y;
        if (!pairs.has(key)) pairs.set(key, { a: x, b: y, n: 0, wins: {} });
        const p = pairs.get(key); p.n++; p.wins[a] = (p.wins[a] || 0) + 1;
      }));
    } else {
      entryValues(e).forEach(v => { const s = get(v); s.pending++; s.entries.push([e.id, 'pending']); });
    }
  });
  const list = Array.from(st.values()).map(s => Object.assign(s, { seen: s.kept + s.letGo, total: s.kept + s.letGo + s.pending, ratio: (s.kept + s.letGo) ? s.kept / (s.kept + s.letGo) : null }));
  return { list, pairs: Array.from(pairs.values()).sort((a, b) => b.n - a.n), decidedCount };
}
function packBubbles(items, W, H) {
  const placed = [];
  items.slice().sort((a, b) => b.r - a.r).forEach((it, i) => {
    if (i === 0) { it.x = W / 2; it.y = H / 2; placed.push(it); return; }
    let a = 0, ok = false;
    for (let k = 0; k < 3000 && !ok; k++) {
      a += 0.22; const rad = 4 + a * 2.6;
      const x = W / 2 + Math.cos(a) * rad * 1.5, y = H / 2 + Math.sin(a) * rad * 0.78;
      if (x - it.r < 4 || x + it.r > W - 4 || y - it.r < 4 || y + it.r > H - 4) continue;
      if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= p.r + it.r + 5)) { it.x = x; it.y = y; ok = true; }
    }
    if (ok) placed.push(it);
  });
  return placed;
}
function viewValues() {
  const st = valueStats();
  const items = st.list.filter(s => s.total > 0);
  const head = `<h1 class="view-title">価値観の地図</h1>
    <p class="view-lead">迷ったとき、どの価値が選んだ側にあり、どの価値を手放してきたか。迷いの記録から描いています。</p>`;
  if (!items.length) {
    return head + `<p class="empty-note">迷いを書きとめるとき、選択肢ごとに「この道で大事にできるもの」を選んでおくと、ここに地図が描かれます。</p>
      <div class="hero-actions"><button type="button" class="btn btn-primary" data-act="new">迷いを書きとめる</button>${S.entries.length ? '' : `<button type="button" class="btn" data-act="sample">サンプルで試す</button>`}</div>`;
  }
  const W = 640, H = 340;
  const maxT = Math.max(...items.map(s => s.total));
  items.forEach(s => { s.r = clamp(22 + 32 * Math.sqrt(s.total / maxT), 22, 56); });
  const placed = packBubbles(items.slice(0, 22), W, H);
  const bubbles = placed.map(s => {
    const ratio = s.ratio == null ? 0 : s.ratio;
    const fs = clamp(s.r * 0.36, 11, 17);
    const label = s.v.length > 5 ? s.v.slice(0, 5) + '…' : s.v;
    const light = ratio > 0.55;
    const aria = `${s.v}：選んだ側に${s.kept}回、手放した側に${s.letGo}回、迷い中に${s.pending}回`;
    return `<g class="bubble ${S.valueFocus === s.v ? 'sel' : ''}" role="button" tabindex="0" aria-label="${esc(aria)}" aria-pressed="${S.valueFocus === s.v}" data-act="val-focus" data-v="${esc(s.v)}">
      <circle class="b-base ${s.ratio == null ? 'pending' : ''}" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}"/>
      <circle class="b-ink" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" opacity="${(ratio * 0.92).toFixed(2)}"/>
      <text class="${light ? 't-light' : 't-dark'}" x="${s.x.toFixed(1)}" y="${(s.y - fs * 0.35).toFixed(1)}" font-size="${fs.toFixed(1)}">${esc(label)}</text>
      <text class="t-count ${light ? 't-light' : 't-dark'}" x="${s.x.toFixed(1)}" y="${(s.y + fs * 0.75).toFixed(1)}" font-size="${Math.max(10, fs * 0.68).toFixed(1)}">${s.seen ? `${s.kept}/${s.seen}` : '迷い中'}</text>
    </g>`;
  }).join('');
  const decided = items.filter(s => s.seen > 0);
  const keepers = decided.filter(s => s.kept > s.letGo).sort((a, b) => (b.kept - b.letGo) - (a.kept - a.letGo) || b.kept - a.kept).slice(0, 3);
  const letgoes = decided.filter(s => s.letGo > s.kept).sort((a, b) => (b.letGo - b.kept) - (a.letGo - a.kept)).slice(0, 3);
  const strong = arr => arr.map(s => `<strong>「${esc(s.v)}」</strong>`).join('');
  const ins = [];
  if (keepers.length) ins.push(`迷ったとき、${strong(keepers)}は選んだ側にあることが多いようです。`);
  if (letgoes.length) ins.push(`${strong(letgoes)}は、惹かれながらも手放してきた価値です。`);
  if (st.pairs.length && st.pairs[0].n >= 2) ins.push(`いちばん多い綱引きは、<strong>「${esc(st.pairs[0].a)}」</strong>と<strong>「${esc(st.pairs[0].b)}」</strong>（${st.pairs[0].n}回）。`);
  if (!ins.length) ins.push('迷い中の記録から、気になっている価値が見えてきました。決めた迷いが増えると、選んだ側と手放した側が描き分けられます。');
  const pendingVals = items.filter(s => s.pending > 0).sort((a, b) => b.pending - a.pending);
  const focus = S.valueFocus ? items.find(s => s.v === S.valueFocus) : null;
  const roleLabel = { kept: '選んだ側', letGo: '手放した側', pending: '迷い中' };
  return head + `
    <div class="vmap-wrap"><svg class="vmap" viewBox="0 0 ${W} ${H}" role="group" aria-label="価値観の地図">${bubbles}</svg></div>
    <div class="legend">
      <span><span class="sw" style="background:var(--ink);border-color:var(--ink)"></span>選んだ側にあることが多い</span>
      <span><span class="sw" style="background:var(--wis-soft)"></span>手放すことが多い</span>
      <span><span class="sw" style="background:var(--wis-soft);border-style:dashed"></span>まだ迷い中</span>
      <span>円の大きさは、迷いに出てきた回数</span>
      <span>数字は「選んだ回数／決めた迷いに出た回数」</span>
    </div>
    ${focus ? `<div class="vfocus"><h3>「${esc(focus.v)}」が出てきた迷い</h3><ul>${focus.entries.map(([id, role]) => { const e = getEntry(id); return e ? `<li><button type="button" class="link-btn" data-act="open" data-id="${e.id}">${esc(e.title)}</button><span class="role">${roleLabel[role]}</span></li>` : ''; }).join('')}</ul></div>` : ''}
    <div class="insights">${ins.map(t => `<p class="insight">${t}</p>`).join('')}</div>
    <p class="note-line">決めた迷い${st.decidedCount}件と、迷い中の記録${S.entries.length - st.decidedCount}件から集計しています。${st.decidedCount < 3 ? '決めた迷いが3つ以上たまると、傾向がはっきりしてきます。' : ''}</p>
    ${st.pairs.length ? `<section class="block"><h2 class="sec-title">よく起きる綱引き</h2><ul class="tugs">${st.pairs.slice(0, 6).map(tugRow).join('')}</ul></section>` : ''}
    ${pendingVals.length ? `<section class="block"><h2 class="sec-title">いま迷いの中にある価値</h2><div class="vchips">${pendingVals.map(s => `<span class="vchip">${esc(s.v)}</span>`).join('')}</div></section>` : ''}
    <section class="block"><h2 class="sec-title">この地図への問い</h2>
      ${S.valQ && S.valQ.text ? `<div class="qa"><div class="qa-item"><div class="sticky ${S.valQ.loading ? 'thinking' : ''}"><span class="sticky-label">問い</span><p id="valQText">${esc(S.valQ.text)}</p></div></div></div>` : S.valQ && S.valQ.loading ? `<div class="qa"><div class="qa-item"><div class="sticky thinking"><span class="sticky-label">問い</span><p id="valQText">考えています</p></div></div></div>` : ''}
      <div class="ask-row"><button type="button" class="btn btn-wis" data-act="val-ask" ${S.valQ && S.valQ.loading ? 'disabled' : ''}>${S.valQ && S.valQ.text ? 'もうひとつ問いかけてもらう' : 'この地図について問いかけてもらう'}</button><p class="note-line">${AI.fn ? 'AIは評価や助言をせず、問いだけを返します。' : 'あらかじめ用意した問いから選びます。'}</p></div>
    </section>`;
}
function tugRow(p) {
  const wa = p.wins[p.a] || 0, wb = p.wins[p.b] || 0;
  const pos = 50 - ((wa - wb) / p.n) * 40;
  return `<li class="tug" aria-label="${esc(p.a)}と${esc(p.b)}の綱引き、${p.n}回。${esc(p.a)}を${wa}回、${esc(p.b)}を${wb}回選んだ">
    <span class="tug-a ${wa > wb ? 'win' : ''}">${esc(p.a)}<small>${wa}</small></span>
    <span class="tug-rope" style="--pos:${pos.toFixed(1)}%" aria-hidden="true"><span class="tug-mid"></span><span class="tug-knot"></span></span>
    <span class="tug-b ${wb > wa ? 'win' : ''}"><small>${wb}</small>${esc(p.b)}</span>
  </li>`;
}

/* ================= detail ================= */
function viewDetail(id) {
  const e = getEntry(id);
  if (!e) { S.detailId = null; return viewMain(); }
  const decided = !!e.decision;
  const dl = deadlineInfo(e);
  const facts = e.kind === 'fork' && e.fork ? `<dl class="facts">
      ${e.fork.deadline ? `<div><dt>決めたい期限</dt><dd>${fmtDate(parseISO(e.fork.deadline))}${dl && !decided ? `<span class="soon">${esc(dl.label)}</span>` : ''}</dd></div>` : ''}
      ${e.fork.people ? `<div><dt>関わる人</dt><dd>${esc(e.fork.people)}</dd></div>` : ''}
      ${e.fork.money ? `<div><dt>お金の気がかり</dt><dd>${esc(e.fork.money)}</dd></div>` : ''}
    </dl>` : '';
  const branches = e.options.map(o => {
    const st = decided ? (o.id === e.decision.optionId ? 'chosen' : 'unchosen') : 'open';
    const stLabel = st === 'chosen' ? '選んだ道' : st === 'unchosen' ? '選ばなかった道' : '';
    const pairKey = decided ? `${e.decision.optionId}__${st === 'chosen' ? (e.options.find(x => x.id !== o.id) || {}).id : o.id}` : '';
    const seen = decided && ((e.worlds && e.worlds[pairKey]) || (e.sims && e.sims[o.id]));
    const simBtn = st === 'unchosen' ? `<button type="button" class="btn btn-wis sm" data-act="sim" data-id="${e.id}" data-opt="${o.id}" data-focus="o">${seen ? '二つの世界をもう一度見る' : 'この道の世界を見る'}</button>`
      : st === 'chosen' ? `<button type="button" class="btn sm" data-act="sim" data-id="${e.id}" data-opt="${o.id}" data-focus="c">選んだ道を検証する</button>`
      : `<button type="button" class="btn btn-ghost sm" data-act="sim" data-id="${e.id}" data-opt="${o.id}" data-focus="c">この道の先を見る</button>`;
    return `<li class="branch ${st}">
      <div class="branch-head"><span class="branch-name">${esc(o.name)}</span>${st === 'chosen' ? `<span class="hanko sm" role="img" aria-label="選んだ">選</span>` : stLabel ? `<span class="branch-state">${stLabel}</span>` : ''}</div>
      ${o.pull ? `<p class="branch-pull">${esc(o.pull)}</p>` : ''}
      ${(o.values || []).length ? `<div class="vchips">${o.values.map(v => `<span class="vchip">${esc(v)}</span>`).join('')}</div>` : ''}
      ${simBtn}
    </li>`;
  }).join('');
  const logs = (e.logs || []).slice().sort((a, b) => a.at - b.at);
  const qa = e.qa || [];
  const asking = S.asking && S.asking.id === e.id;
  return `
    <div class="detail-top">
      <button type="button" class="link-btn" data-act="back">‹ 戻る</button>
      <div class="detail-tools"><button type="button" class="link-btn" data-act="edit" data-id="${e.id}">直す</button><button type="button" class="link-btn danger" data-act="delete" data-id="${e.id}">削除</button></div>
    </div>
    <header>
      <p class="detail-meta">${kindTag(e)}<span>${esc(e.category)}</span><time>${fmtDate(e.createdAt)}</time></p>
      <h1 class="detail-title">${esc(e.title)}</h1>
      <p class="detail-int">迷いの強さ ${meter(e.intensity)}<span class="hand">${INTENSITY[e.intensity]}</span>${decided ? `<span>${durLabel(Math.max(0, e.decision.at - e.createdAt))}迷って決めた</span>` : `<span>迷いはじめて${durLabel(Math.max(0, now() - e.createdAt))}</span>`}</p>
    </header>
    ${facts}
    <section class="fork-diagram" data-fork="${e.id}">
      <svg class="fork-svg" aria-hidden="true"></svg>
      <ol class="fork-branches" aria-label="選択肢">${branches}</ol>
    </section>
    ${decided ? '' : `<div class="decide-bar"><p>決まったら、決めた理由をレシートに残しましょう。</p><button type="button" class="btn btn-primary" data-act="decide" data-id="${e.id}">決める</button></div>`}
    ${decided && e.decision.conviction <= 60 ? `<div class="verify-bar"><p><b>納得度 ${e.decision.conviction}%</b>　選んだ道にも起こりうる不都合や想定外を見て、選択を検証してみませんか？</p><button type="button" class="btn btn-primary" data-act="sim" data-id="${e.id}" data-opt="${e.decision.optionId}" data-focus="c">選んだ道を検証する</button></div>` : ''}
    ${variablesBlock(e)}

    <section class="block">
      <h2 class="sec-title">迷いのログ</h2>
      ${logs.length ? `<ol class="logs">${logs.map(l => `<li class="log ${l.sys ? 'sys' : ''}"><time>${fmtTime(l.at)}</time><p>${esc(l.text)}</p></li>`).join('')}</ol>` : `<p class="empty-note">迷った瞬間を、時刻と一緒に書き足せます。</p>`}
      <div class="add-row">
        <label class="sr" for="log-${e.id}">迷いを書き足す</label>
        <textarea id="log-${e.id}" class="hand-input" rows="1" data-keep="log-${e.id}" maxlength="400" placeholder="また迷った瞬間を、ひとこと"></textarea>
        <button type="button" class="btn sm" data-act="log-add" data-id="${e.id}">書き足す</button>
      </div>
    </section>

    <section class="block">
      <h2 class="sec-title">問い返しの付箋</h2>
      ${qa.length || asking ? `<div class="qa">${qa.map((x, i) => `<div class="qa-item">
          <div class="sticky"><span class="sticky-label">問い</span><p>${esc(x.q)}</p></div>
          ${x.a ? `<p class="answer">${esc(x.a)}</p>` : `<div class="answer-form"><label class="sr" for="ans-${e.id}-${i}">この問いへの答え</label><textarea id="ans-${e.id}-${i}" class="hand-input" rows="2" data-keep="ans-${e.id}-${i}" maxlength="400" placeholder="思いついたことを、そのまま"></textarea><button type="button" class="btn sm" data-act="answer" data-id="${e.id}" data-i="${i}">答えを残す</button></div>`}
        </div>`).join('')}
        ${asking ? `<div class="qa-item"><div class="sticky thinking"><span class="sticky-label">問い</span><p id="askingText">${esc(S.asking.text || '考えています')}</p></div></div>` : ''}
      </div>` : `<p class="empty-note">問い返し役は、答えやおすすめを出しません。あなたが自分の迷いを別の角度から見られるよう、問いをひとつ渡します。</p>`}
      <div class="ask-row">
        ${asking ? `<button type="button" class="btn sm" data-act="ask-stop">やめる</button>` : `<button type="button" class="btn btn-wis" data-act="ask" data-id="${e.id}">${qa.length ? 'もうひとつ問いかけてもらう' : '問いかけてもらう'}</button>`}
        <p class="note-line">${AI.fn ? 'AIが問いを考えます。最初に使うとき、利用の確認が表示されます。' : 'あらかじめ用意した問いから選びます。'}</p>
      </div>
    </section>

    ${decided ? `<section class="block"><h2 class="sec-title">理由レシート</h2>${receiptHTML(e)}<button type="button" class="link-btn" data-act="decide" data-id="${e.id}">決めた理由を直す</button></section>` : ''}

    ${(e.verifications || []).length ? `<section class="block"><h2 class="sec-title">検証の記録</h2><ul class="verifs">${e.verifications.slice().sort((a, b) => b.at - a.at).map(v => `<li><p class="vf-meta"><time>${fmtDate(v.at)}</time><span class="vf-conv">納得度 ${v.before}% → <b>${v.after}%</b></span></p>${v.note ? `<p class="vf-note">${esc(v.note)}</p>` : ''}</li>`).join('')}</ul></section>` : ''}

    ${(e.reflections || []).length ? `<section class="block"><h2 class="sec-title">箱庭のふりかえり</h2><ul class="reflections">${e.reflections.slice().sort((a, b) => b.at - a.at).map(r => `<li><p class="rf-meta">${fmtDate(r.at)}　「${esc(optName(e, r.optionId) || r.simTitle || '')}」の箱庭を見て</p><p>${esc(r.text)}</p></li>`).join('')}</ul></section>` : ''}

    ${e.kind === 'fork' ? consultBlock(e) : ''}`;
}
function variablesBlock(e) {
  const vars = e.variables || [], asking = S.varAsking === e.id;
  return `<section class="block">
    <h2 class="sec-title">判断変数</h2>
    <p class="empty-note">自分では挙げていなかった要素（家族・健康・お金・仕事・社会の変化）を、AIが問いの形で示します。箱庭に入れるかどうかは、あなたが選びます。</p>
    ${vars.length ? `<ul class="vars">${vars.map(v => `<li class="var ${v.adopted ? 'on' : ''}">
      <div class="var-head"><span class="var-dir ${v.direction}">${VAR_DIR[v.direction] || ''}</span><span class="var-kind">${esc(VAR_KINDS[v.kind] || 'その他')}</span><b class="var-title">${esc(v.title)}</b></div>
      <p class="var-q">${esc(v.question)}</p>${v.why ? `<p class="var-why">${esc(v.why)}</p>` : ''}
      <div class="var-actions"><button type="button" class="btn sm ${v.adopted ? 'btn-primary' : ''}" aria-pressed="${!!v.adopted}" data-act="var-toggle" data-id="${e.id}" data-v="${v.id}">${v.adopted ? '箱庭に入れています' : '箱庭に入れる'}</button><button type="button" class="link-btn sm" data-act="var-rm" data-id="${e.id}" data-v="${v.id}">消す</button></div>
    </li>`).join('')}</ul>` : ''}
    <div class="ask-row"><button type="button" class="btn btn-wis" data-act="var-ask" data-id="${e.id}" ${asking ? 'disabled' : ''}>${asking ? '考えています…' : vars.length ? 'もっと補ってもらう' : '判断変数を補ってもらう'}</button><p class="note-line">${AI.fn ? 'AIは結論を出さず、要素と問いだけを示します。' : 'あらかじめ用意した候補から選びます。'}</p></div>
    <div class="var-add"><label class="sr" for="var-${e.id}">自分で判断変数を足す</label><input id="var-${e.id}" class="hand-input sm" data-keep="var-${e.id}" maxlength="16" autocomplete="off" placeholder="自分で足す（例：親の引っ越し）"><button type="button" class="btn sm btn-ghost" data-act="var-add" data-id="${e.id}" data-v="head">向かい風として足す</button><button type="button" class="btn sm btn-ghost" data-act="var-add" data-id="${e.id}" data-v="tail">追い風として足す</button></div>
  </section>`;
}
function consultBlock(e) {
  const cs = (e.consults || []).slice().sort((a, b) => b.at - a.at);
  return `<section class="block">
    <h2 class="sec-title">ライフプラン相談</h2>
    <p class="empty-note">銀行・保険・FP・自治体などの相談に、このノートをまとめて持っていけます。相談で聞いたことは、ここに書き足せます。</p>
    <button type="button" class="btn" data-act="consult" data-id="${e.id}">相談シートを作る</button>
    <h3 class="sub-title">相談の記録</h3>
    ${cs.length ? `<ul class="consults">${cs.map(c => `<li><div class="cs-meta"><span class="kind-tag">${esc(c.where)}</span><time>${fmtDate(c.at)}</time></div><p>${esc(c.note)}</p></li>`).join('')}</ul>` : ''}
    <div class="consult-add">
      <div class="catchips" role="group" aria-label="相談先">${TARGETS.map(t => `<button type="button" class="fchip" aria-pressed="${S.consultWhere === t}" data-act="cs-where" data-v="${t}">${t}</button>`).join('')}</div>
      <label class="sr" for="cs-${e.id}">相談で聞いたこと、気づいたこと</label>
      <textarea id="cs-${e.id}" class="hand-input" rows="2" data-keep="cs-${e.id}" maxlength="600" placeholder="相談で聞いたこと、気づいたこと"></textarea>
      <button type="button" class="btn sm" data-act="cs-add" data-id="${e.id}">相談の記録を残す</button>
    </div>
  </section>`;
}

/* ================= render ================= */
function viewMain() {
  return ({ diary: viewDiary, forks: viewForks, receipts: viewReceipts, values: viewValues })[S.view]();
}
function captureForm(root) {
  const vals = {};
  $$('[data-keep]', root).forEach(el => { vals[el.dataset.keep] = el.value; });
  const a = document.activeElement; let focus = null;
  if (a && root.contains(a) && a.dataset && a.dataset.keep) {
    focus = { key: a.dataset.keep };
    try { focus.s = a.selectionStart; focus.e = a.selectionEnd; } catch (err) { /* range input */ }
  }
  return { vals, focus };
}
function restoreForm(root, k) {
  $$('[data-keep]', root).forEach(el => {
    const v = k.vals[el.dataset.keep];
    if (v != null && el.value === '' && el.type !== 'range') el.value = v;
  });
  if (k.focus) {
    const el = $$('[data-keep]', root).find(x => x.dataset.keep === k.focus.key);
    if (el) { el.focus({ preventScroll: true }); if (k.focus.s != null) { try { el.setSelectionRange(k.focus.s, k.focus.e); } catch (err) { /* ignore */ } } }
  }
}
function renderTabs() {
  const tabs = [['diary', '日記', IC.diary], ['forks', '分かれ道', IC.forks], null, ['receipts', 'レシート', IC.receipts], ['values', '価値観', IC.values]];
  $('#tabs').innerHTML = tabs.map(t => t ? `<a href="#${t[0]}" class="tab" data-act="tab" data-v="${t[0]}" ${S.view === t[0] && !S.detailId ? 'aria-current="page"' : S.view === t[0] ? 'aria-current="true"' : ''}>${svgI(t[2])}<span>${t[1]}</span></a>`
    : `<button type="button" class="tab tab-add" data-act="new" aria-label="迷いを書きとめる"><span class="add-dot">${svgI(IC.plus)}</span><span>書きとめる</span></button>`).join('');
}
let composing = false, renderQueued = false;
document.addEventListener('compositionstart', () => { composing = true; });
document.addEventListener('compositionend', () => { composing = false; if (renderQueued) { renderQueued = false; render(); } });
function render() {
  renderTabs();
  const main = $('#main');
  if (composing && main.contains(document.activeElement)) { renderQueued = true; return; }
  const keep = captureForm(main);
  main.innerHTML = !S.ready ? viewLoading() : S.detailId ? viewDetail(S.detailId) : viewMain();
  restoreForm(main, keep);
  drawForks();
}
function drawForks() {
  $$('.fork-diagram').forEach(fd => {
    const svg = $('.fork-svg', fd); const lis = $$('.branch', fd);
    if (!svg || !lis.length) return;
    const box = fd.getBoundingClientRect(); const H = Math.max(1, box.height);
    const ys = lis.map(li => { const r = li.getBoundingClientRect(); return r.top - box.top + Math.min(r.height / 2, 30); });
    const cy = (ys[0] + ys[ys.length - 1]) / 2, nx = 28, ex = 70;
    const order = lis.map((li, i) => [li, i]).sort((a, b) => (a[0].classList.contains('chosen') ? 1 : 0) - (b[0].classList.contains('chosen') ? 1 : 0));
    let d = `<path class="fk-trunk" d="M2 ${cy.toFixed(1)} H${nx}"/>`;
    order.forEach(([li, i]) => {
      const cls = li.classList.contains('chosen') ? 'fk-chosen' : li.classList.contains('unchosen') ? 'fk-unchosen' : 'fk-open';
      d += `<path class="${cls}" d="M${nx} ${cy.toFixed(1)} C ${nx + 24} ${cy.toFixed(1)}, ${ex - 28} ${ys[i].toFixed(1)}, ${ex} ${ys[i].toFixed(1)}"/>`;
    });
    d += `<circle class="fk-node" cx="${nx}" cy="${cy.toFixed(1)}" r="5"/>`;
    svg.setAttribute('viewBox', `0 0 74 ${H.toFixed(0)}`); svg.setAttribute('height', H.toFixed(0)); svg.innerHTML = d;
  });
}
