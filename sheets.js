/*
 * タラレバ — sheets.js
 * 入力シート（書きとめる・決める・相談シート・設定）と詳細画面の操作
 */
'use strict';

/* ================= sheet (dialog) ================= */
const closeBtn = () => `<button type="button" class="icon-btn" data-act="sheet-close" aria-label="閉じる">${svgI(IC.x)}</button>`;
const Sheet = {
  el: null, body: null, prevFocus: null, onOk: null, kind: null,
  init() {
    this.el = $('#sheet'); this.body = $('#sheetBody');
    this.el.addEventListener('close', () => {
      if (this.el.open) return; // reopened before this event fired
      this.kind = null;
      document.body.classList.toggle('locked', TH.isOpen());
      const f = this.prevFocus; this.prevFocus = null;
      if (f && document.contains(f) && !TH.isOpen()) f.focus({ preventScroll: true });
    });
    this.el.addEventListener('click', ev => { if (ev.target === this.el) this.close(); });
  },
  open(html, kind) {
    this.kind = kind || null;
    this.body.innerHTML = html;
    if (!this.el.open) {
      this.prevFocus = document.activeElement;
      try { this.el.showModal(); } catch (err) { this.el.setAttribute('open', ''); }
    }
    document.body.classList.add('locked');
    const sc = $('.sheet-scroll', this.body); if (sc) sc.scrollTop = 0;
    requestAnimationFrame(() => {
      const t = $('[data-autofocus]', this.body) || $('.sheet-head .icon-btn', this.body) || $('button', this.body);
      if (t) t.focus({ preventScroll: true });
    });
  },
  replace(html, restore = true) {
    const sc = $('.sheet-scroll', this.body); const top = sc ? sc.scrollTop : 0;
    const keep = restore ? captureForm(this.body) : { vals: {}, focus: null };
    this.body.innerHTML = html;
    restoreForm(this.body, keep);
    const sc2 = $('.sheet-scroll', this.body); if (sc2) sc2.scrollTop = top;
  },
  close() { if (this.el.open) this.el.close(); },
};

/* ================= record sheet ================= */
const Rec = {
  F: null, err: '',
  blank() { return { id: newId('o'), name: '', pull: '', values: [], custom: '' }; },
  open({ kind = 'moment', category = '', title = '', editId = null } = {}) {
    this.err = '';
    if (editId) {
      const e = getEntry(editId); if (!e) return;
      this.F = {
        editId, kind: e.kind, category: e.category, title: e.title, intensity: e.intensity, feeling: '',
        options: e.options.map(o => ({ id: o.id, name: o.name, pull: o.pull || '', values: (o.values || []).slice(), custom: '' })),
        fork: Object.assign({ deadline: '', people: '', money: '' }, e.fork || {}),
      };
    } else {
      const cats = KINDS[kind] ? KINDS[kind].cats : KINDS.moment.cats;
      this.F = {
        editId: null, kind: KINDS[kind] ? kind : 'moment', category: cats.includes(category) ? category : cats[0], title, intensity: 3, feeling: '',
        options: [this.blank(), this.blank()], fork: { deadline: '', people: '', money: '' },
      };
    }
    Sheet.open(this.html(), 'rec');
  },
  rerender(restore = true) { if (Sheet.kind === 'rec' && this.F) Sheet.replace(this.html(), restore); },
  input(el) {
    const F = this.F; if (!F) return;
    const path = el.dataset.f, v = el.value;
    if (path === 'intensity') { F.intensity = clamp(Math.round(+v) || 3, 1, 5); const n = $('#intNow'); if (n) n.textContent = INTENSITY[F.intensity]; return; }
    const m = /^opt\.(\d+)\.(name|pull|custom)$/.exec(path);
    if (m) { const o = F.options[+m[1]]; if (o) o[m[2]] = v; return; }
    if (path.startsWith('fork.')) { F.fork[path.slice(5)] = v; return; }
    if (path === 'title' || path === 'feeling') F[path] = v;
  },
  setKind(k) {
    const F = this.F; if (!KINDS[k] || F.kind === k) return;
    F.kind = k; if (!KINDS[k].cats.includes(F.category)) F.category = KINDS[k].cats[0];
    this.rerender();
  },
  setCat(c) { this.F.category = c; this.rerender(); },
  toggleVal(i, v) {
    const o = this.F.options[i]; if (!o) return;
    const k = o.values.indexOf(v);
    if (k >= 0) o.values.splice(k, 1);
    else if (o.values.length < 6) o.values.push(v);
    else { toast('ひとつの選択肢につき、6つまで選べます。'); return; }
    this.rerender();
  },
  addVal(i) {
    const o = this.F.options[i]; if (!o) return;
    const v = (o.custom || '').trim().replace(/\s+/g, '');
    if (!v) { toast('足したい言葉を書いてください。'); return; }
    if (!o.values.includes(v)) { if (o.values.length >= 6) { toast('ひとつの選択肢につき、6つまで選べます。'); return; } o.values.push(v); }
    o.custom = '';
    this.rerender(false);
    const el = $(`[data-keep="opt.${i}.custom"]`, Sheet.body); if (el) el.focus({ preventScroll: true });
  },
  addOpt() {
    if (this.F.options.length >= 4) return;
    this.F.options.push(this.blank()); this.rerender(false);
    const el = $(`[data-keep="opt.${this.F.options.length - 1}.name"]`, Sheet.body); if (el) el.focus();
  },
  rmOpt(i) { if (this.F.options.length > 2) { this.F.options.splice(i, 1); this.rerender(false); } },
  html() {
    const F = this.F; if (!F) return '';
    const isFork = F.kind === 'fork';
    const cur = F.editId ? getEntry(F.editId) : null;
    const lockedId = cur && cur.decision ? cur.decision.optionId : null;
    const ph = isFork
      ? [['例：中古マンションを買う', '例：子どもが小さいうちに落ち着きたい'], ['例：賃貸を続ける', '例：身軽なまま住み替えられる']]
      : [['例：ウールのコート', '例：長く着られそう'], ['例：ダウンジャケット', '例：軽くて暖かい']];
    const palette = o => Array.from(new Set([...VALUES, ...customValues(), ...o.values]));
    const L = i => 'ABCD'[i];
    return `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">${F.editId ? '記録を直す' : '迷いを書きとめる'}</h2>${closeBtn()}</div>
    <div class="sheet-scroll">
      <div class="seg" role="group" aria-label="迷いの大きさ">
        <button type="button" aria-pressed="${!isFork}" data-act="rec-kind" data-v="moment"><b>ちいさな迷い</b><small>買い物・旅行・進路など</small></button>
        <button type="button" aria-pressed="${isFork}" data-act="rec-kind" data-v="fork"><b>分かれ道</b><small>進学・結婚・住まい・介護など</small></button>
      </div>
      <div class="field"><span class="field-label" id="f-cat-l">テーマ</span>
        <div class="catchips" role="group" aria-labelledby="f-cat-l">${KINDS[F.kind].cats.map(c => `<button type="button" class="fchip" aria-pressed="${F.category === c}" data-act="rec-cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      </div>
      <div class="field"><label for="f-title">何に迷っていますか？</label>
        <input id="f-title" class="hand-input" data-f="title" data-keep="title" value="${esc(F.title)}" maxlength="80" autocomplete="off" placeholder="${isFork ? '例：中古マンションを買うか、賃貸を続けるか' : '例：冬のコート、ウールかダウンか'}" ${!F.title && !F.editId ? 'data-autofocus' : ''}>
        <p class="field-hint">空のままなら、選択肢の名前から付けます。</p>
      </div>
      <div class="field"><span class="field-label">選択肢</span>
        ${F.options.map((o, i) => `<div class="opt-block">
          <div class="opt-block-head"><span>選択肢${L(i)}</span>${F.options.length > 2 && o.id !== lockedId ? `<button type="button" class="link-btn sm" data-act="rec-rmopt" data-i="${i}">この選択肢を外す</button>` : ''}</div>
          <input class="hand-input" aria-label="選択肢${L(i)}の名前" data-f="opt.${i}.name" data-keep="opt.${i}.name" value="${esc(o.name)}" maxlength="40" autocomplete="off" placeholder="${ph[i] ? ph[i][0] : '例：もうひとつの道'}">
          <input class="hand-input sm" aria-label="選択肢${L(i)}に惹かれるところ" data-f="opt.${i}.pull" data-keep="opt.${i}.pull" value="${esc(o.pull)}" maxlength="80" autocomplete="off" placeholder="惹かれるところ（${ph[i] ? ph[i][1] : '例：新しい景色が見られそう'}）">
          <div class="vpick"><span class="vpick-label">この道で大事にできるもの</span>
            <div class="vchips">${palette(o).map(v => `<button type="button" class="vchip toggle" aria-pressed="${o.values.includes(v)}" data-act="rec-val" data-i="${i}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
            <div class="vcustom"><input class="hand-input sm" aria-label="選択肢${L(i)}で大事にできるものを、自分の言葉で足す" data-f="opt.${i}.custom" data-keep="opt.${i}.custom" value="${esc(o.custom)}" maxlength="12" autocomplete="off" placeholder="自分の言葉で足す"><button type="button" class="btn sm btn-ghost" data-act="rec-addval" data-i="${i}">足す</button></div>
          </div>
        </div>`).join('')}
        ${F.options.length < 4 ? `<button type="button" class="btn sm btn-ghost" data-act="rec-addopt">${svgI(IC.plus)}選択肢を足す</button>` : ''}
      </div>
      <div class="field"><label for="f-int">迷いの強さ<span class="range-now" id="intNow">${INTENSITY[F.intensity]}</span></label>
        <input id="f-int" type="range" class="range" min="1" max="5" step="1" data-f="intensity" value="${F.intensity}">
        <div class="range-labels"><span>ちょっと</span><span>夜も眠れない</span></div>
      </div>
      ${isFork ? `<div class="field-grid">
          <div class="field"><label for="f-dl">いつまでに決めたい？</label><input id="f-dl" type="date" class="hand-input" data-f="fork.deadline" data-keep="fork.deadline" value="${esc(F.fork.deadline)}"></div>
          <div class="field"><label for="f-pp">関わる人</label><input id="f-pp" class="hand-input" data-f="fork.people" data-keep="fork.people" value="${esc(F.fork.people)}" maxlength="60" autocomplete="off" placeholder="例：パートナー、両親"></div>
        </div>
        <div class="field"><label for="f-mn">お金の気がかり</label><textarea id="f-mn" class="hand-input" rows="2" data-f="fork.money" data-keep="fork.money" maxlength="300" placeholder="例：頭金をどこまで出すか">${esc(F.fork.money)}</textarea><p class="field-hint">ライフプラン相談シートに載ります。</p></div>` : ''}
      ${F.editId ? '' : `<div class="field"><label for="f-feel">いまの気持ち</label><textarea id="f-feel" class="hand-input" rows="2" data-f="feeling" data-keep="feeling" maxlength="400" placeholder="迷っている今の気持ちを、そのまま。">${esc(F.feeling)}</textarea><p class="field-hint">迷いのログの最初の1行になります。</p></div>`}
      <p class="err" role="alert">${esc(this.err)}</p>
    </div>
    <div class="sheet-foot">${F.editId ? `<button type="button" class="btn btn-primary" data-act="rec-save">直した内容を保存</button>`
      : `<button type="button" class="btn" data-act="rec-save">迷い中として保存</button><button type="button" class="btn btn-primary" data-act="rec-save-decide">もう決めた</button>`}</div>`;
  },
  save(decideAfter) {
    const F = this.F; if (!F) return;
    const opts = F.options.map(o => ({ id: o.id, name: o.name.trim(), pull: o.pull.trim(), values: o.values.slice() })).filter(o => o.name);
    if (opts.length < 2) {
      this.err = '選択肢を2つ以上書いてください。'; this.rerender();
      const i = F.options.findIndex(o => !o.name.trim()); const el = $(`[data-keep="opt.${i < 0 ? 0 : i}.name"]`, Sheet.body); if (el) el.focus();
      return;
    }
    if (new Set(opts.map(o => o.name)).size < opts.length) { this.err = '同じ名前の選択肢があります。少し書き分けてください。'; this.rerender(); return; }
    const title = F.title.trim() || opts.map(o => o.name).join('か、');
    let e;
    if (F.editId) {
      const cur = getEntry(F.editId); if (!cur) { Sheet.close(); return; }
      e = clone(cur);
      Object.assign(e, { kind: F.kind, category: F.category, title, options: opts, intensity: F.intensity });
      const ids = new Set(opts.map(o => o.id));
      if (e.decision && !ids.has(e.decision.optionId)) e.decision = null;
      if (e.sims) Object.keys(e.sims).forEach(k => { if (!ids.has(k)) delete e.sims[k]; });
      if (e.worlds) Object.keys(e.worlds).forEach(k => { const [a, b] = k.split('__'); if (!ids.has(a) || !ids.has(b)) delete e.worlds[k]; });
    } else {
      e = { id: newId('e'), kind: F.kind, category: F.category, title, options: opts, intensity: F.intensity, logs: [], qa: [], consults: [], consultQuestions: [], decision: null, sims: {}, worlds: {}, variables: [], verifications: [], reflections: [], createdAt: now(), updatedAt: now() };
      if (F.feeling.trim()) e.logs.push({ at: now(), text: F.feeling.trim() });
    }
    if (F.kind === 'fork') e.fork = { deadline: F.fork.deadline || '', people: (F.fork.people || '').trim(), money: (F.fork.money || '').trim() };
    else delete e.fork;
    const wasEdit = !!F.editId;
    Store.put(e);
    this.F = null;
    Sheet.close();
    S.detailId = e.id; render(); window.scrollTo(0, 0);
    toast(wasEdit ? '直しました' : '書きとめました');
    if (decideAfter) Dec.open(e.id);
  },
};

/* ================= decide sheet ================= */
const Dec = {
  id: null, D: null, phase: 'form', err: '',
  open(id) {
    const e = getEntry(id); if (!e) return;
    this.id = id; this.err = ''; this.phase = 'form';
    const d = e.decision;
    this.D = d
      ? { optionId: d.optionId, reasons: (d.reasons || []).map(r => ({ text: r.text, weight: r.weight })), letGo: d.letGo || '', conviction: d.conviction == null ? 70 : d.conviction, autoR: false, autoL: false }
      : { optionId: null, reasons: [{ text: '', weight: 2 }], letGo: '', conviction: 70, autoR: true, autoL: true };
    if (!this.D.reasons.length) this.D.reasons.push({ text: '', weight: 2 });
    Sheet.open(this.html(), 'dec');
  },
  rerender(restore = true) { if (Sheet.kind === 'dec' && this.D) Sheet.replace(this.html(), restore); },
  input(el) {
    const D = this.D; if (!D) return;
    const p = el.dataset.d;
    if (p === 'conviction') { D.conviction = clamp(Math.round(+el.value), 0, 100); const n = $('#convNow'); if (n) n.textContent = D.conviction + '%'; return; }
    if (p === 'letGo') { D.letGo = el.value; D.autoL = false; return; }
    const m = /^reason\.(\d+)$/.exec(p || '');
    if (m && D.reasons[+m[1]]) { D.reasons[+m[1]].text = el.value; D.autoR = false; }
  },
  choose(optId) {
    const e = getEntry(this.id), D = this.D; if (!e) return;
    D.optionId = optId;
    const o = optById(e, optId); const others = e.options.filter(x => x.id !== optId);
    if (D.autoR || D.reasons.every(r => !r.text.trim())) { D.reasons = [{ text: (o && o.pull) || '', weight: 3 }]; D.autoR = true; }
    if (D.autoL || !D.letGo.trim()) { D.letGo = others.map(x => x.pull).filter(Boolean).join('、') || (others[0] ? `「${others[0].name}」の道` : ''); D.autoL = true; }
    this.err = ''; this.rerender(false);
  },
  setW(i, w) { const r = this.D.reasons[i]; if (r) { r.weight = clamp(w, 1, 3); this.rerender(); } },
  add() {
    if (this.D.reasons.length >= 6) return;
    this.D.reasons.push({ text: '', weight: 2 }); this.rerender(false);
    const el = $(`[data-keep="reason.${this.D.reasons.length - 1}"]`, Sheet.body); if (el) el.focus();
  },
  rm(i) { if (this.D.reasons.length > 1) { this.D.reasons.splice(i, 1); this.rerender(false); } },
  suggest(v) {
    const D = this.D, t = `「${v}」を大事にしたかった`;
    const empty = D.reasons.find(r => !r.text.trim());
    if (empty) empty.text = t; else if (D.reasons.length < 6) D.reasons.push({ text: t, weight: 2 });
    D.autoR = false; this.rerender(false);
  },
  html() {
    const e = getEntry(this.id); if (!e) return '';
    if (this.phase === 'printed' && e.decision) return this.printed(e);
    const D = this.D; const chosen = optById(e, D.optionId);
    const sugs = chosen ? (chosen.values || []).filter(v => !D.reasons.some(r => r.text.includes(v))) : [];
    return `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">${e.decision ? '決めた理由を直す' : '決める'}</h2>${closeBtn()}</div>
    <div class="sheet-scroll">
      <p class="sheet-sub hand">${esc(e.title)}</p>
      <div class="field"><span class="field-label" id="dec-choose">どれを選びましたか？</span>
        <div class="choose" role="radiogroup" aria-labelledby="dec-choose">${e.options.map(o => `<button type="button" class="choose-btn" role="radio" aria-checked="${D.optionId === o.id}" data-act="dec-opt" data-v="${o.id}"><span class="hand">${esc(o.name)}</span>${o.pull ? `<small>${esc(o.pull)}</small>` : ''}</button>`).join('')}</div>
      </div>
      <div class="field"><span class="field-label">決めた理由</span>
        <p class="field-hint" style="margin:0 0 8px">何を選んだかより、なぜ選んだか。★は理由の重みです。</p>
        ${D.reasons.map((r, i) => `<div class="reason-row">
          <input class="hand-input" aria-label="理由${i + 1}" data-d="reason.${i}" data-keep="reason.${i}" value="${esc(r.text)}" maxlength="60" autocomplete="off" placeholder="${i === 0 ? '例：長く着られる形だった' : '理由をもうひとつ'}">
          <span class="stars" role="radiogroup" aria-label="理由${i + 1}の重み">${[1, 2, 3].map(w => `<button type="button" role="radio" aria-checked="${r.weight === w}" aria-label="重み${w}" data-act="dec-w" data-i="${i}" data-v="${w}">${w <= r.weight ? '★' : '☆'}</button>`).join('')}</span>
          ${D.reasons.length > 1 ? `<button type="button" class="link-btn sm" data-act="dec-rm" data-i="${i}" aria-label="理由${i + 1}を消す">消す</button>` : '<span></span>'}
        </div>`).join('')}
        ${D.reasons.length < 6 ? `<button type="button" class="btn sm btn-ghost" data-act="dec-add">${svgI(IC.plus)}理由を足す</button>` : ''}
        ${sugs.length ? `<div class="sugs" role="group" aria-label="理由の候補">${sugs.map(v => `<button type="button" class="vchip toggle" data-act="dec-sug" data-v="${esc(v)}">「${esc(v)}」を大事にしたかった</button>`).join('')}</div>` : ''}
      </div>
      <div class="field"><label for="d-letgo">手放したもの</label><input id="d-letgo" class="hand-input" data-d="letGo" data-keep="letGo" value="${esc(D.letGo)}" maxlength="80" autocomplete="off" placeholder="例：ダウンの軽さ"></div>
      <div class="field"><label for="d-conv">納得度<span class="range-now" id="convNow">${D.conviction}%</span></label>
        <input id="d-conv" type="range" class="range" min="0" max="100" step="5" data-d="conviction" value="${D.conviction}">
        <div class="range-labels"><span>まだもやもや</span><span>すっきり</span></div>
      </div>
      <p class="err" role="alert">${esc(this.err)}</p>
    </div>
    <div class="sheet-foot"><button type="button" class="btn btn-primary" data-act="dec-save">${e.decision ? 'レシートを発行し直す' : 'レシートを発行する'}</button></div>`;
  },
  printed(e) {
    const others = e.options.filter(o => o.id !== e.decision.optionId);
    return `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">レシートを発行しました</h2>${closeBtn()}</div>
    <div class="sheet-scroll"><div class="printer"><div class="printer-slot" aria-hidden="true"></div>${receiptHTML(e, { printing: true })}</div></div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">閉じる</button>${others.length ? (e.decision.conviction <= 60
      ? `<button type="button" class="btn btn-wis" data-act="sim" data-id="${e.id}" data-opt="${e.decision.optionId}" data-focus="c">選んだ道を検証する（箱庭）</button>`
      : `<button type="button" class="btn btn-wis" data-act="sim" data-id="${e.id}" data-opt="${others[0].id}" data-focus="o">選ばなかった道を箱庭で見る</button>`) : ''}</div>`;
  },
  save() {
    const e = getEntry(this.id), D = this.D; if (!e || !D) return;
    if (!D.optionId) { this.err = 'どれを選んだかを選んでください。'; this.rerender(); return; }
    const reasons = D.reasons.map(r => ({ text: r.text.trim(), weight: clamp(r.weight | 0, 1, 3) })).filter(r => r.text);
    if (!reasons.length) { this.err = '決めた理由を、ひとつでも書いてください。'; this.rerender(); const el = $('[data-keep="reason.0"]', Sheet.body); if (el) el.focus(); return; }
    const was = e.decision; const name = optName(e, D.optionId);
    edit(this.id, x => {
      x.decision = { optionId: D.optionId, at: was && was.optionId === D.optionId ? was.at : now(), reasons, letGo: D.letGo.trim(), conviction: D.conviction };
      x.logs = x.logs || [];
      if (!was || was.optionId !== D.optionId) x.logs.push({ at: now(), text: `「${name}」に決めた。`, sys: true });
    });
    this.phase = 'printed'; this.err = '';
    Sheet.replace(this.html(), false);
    const b = $('.sheet-foot .btn-wis', Sheet.body) || $('.sheet-foot .btn', Sheet.body); if (b) b.focus({ preventScroll: true });
  },
};

/* ================= life-plan consultation sheet ================= */
const CON_DEFAULT_TARGET = { '住宅購入': '銀行', '介護': '自治体', '結婚': '保険', '出産・子育て': '保険', '進学': '学校', '就職・転職': 'FP', '移住・引っ越し': '自治体' };
const Con = {
  id: null, target: '銀行', loading: false,
  open(id) { const e = getEntry(id); if (!e) return; this.id = id; this.loading = false; this.target = CON_DEFAULT_TARGET[e.category] || 'FP'; Sheet.open(this.html(), 'con'); },
  rerender() { if (Sheet.kind === 'con') Sheet.replace(this.html()); },
  setTarget(t) { this.target = t; this.rerender(); },
  data(e) {
    const qs = (e.consultQuestions || []).length ? e.consultQuestions : consultTemplates(e.category);
    const sec = [];
    sec.push({ h: '決めたいこと', p: [
      `${e.title}（${e.category}）`,
      e.fork && e.fork.deadline ? `期限：${fmtDate(parseISO(e.fork.deadline))}` : null,
      e.fork && e.fork.people ? `関わる人：${e.fork.people}` : null,
      e.decision ? `いまの状況：「${optName(e, e.decision.optionId)}」に決めた（納得度${e.decision.conviction}%）` : 'いまの状況：迷い中',
    ].filter(Boolean) });
    sec.push({ h: '選択肢', ol: true, list: e.options.map(o => [o.name, o.pull ? `惹かれるところ：${o.pull}` : '', (o.values || []).length ? `大事にできるもの：${o.values.join('、')}` : ''].filter(Boolean).join('\n')) });
    if (e.fork && e.fork.money) sec.push({ h: 'お金の気がかり', p: [e.fork.money] });
    const st = valueStats();
    const keepers = st.list.filter(s => s.kept > s.letGo).sort((a, b) => (b.kept - b.letGo) - (a.kept - a.letGo)).slice(0, 3).map(s => s.v);
    if (st.decidedCount >= 2 && keepers.length) sec.push({ h: 'ふだん迷ったときに手放さない価値', p: [keepers.join('、')] });
    if (e.decision) sec.push({ h: '決めた理由', list: e.decision.reasons.map(r => `${r.text}（${'★'.repeat(r.weight)}）`) });
    const logs = (e.logs || []).filter(l => !l.sys).slice(-4);
    if (logs.length) sec.push({ h: '迷いの記録（抜粋）', list: logs.map(l => `${fmtTime(l.at)}　${l.text}`) });
    const qa = (e.qa || []).filter(x => x.a).slice(-3);
    if (qa.length) sec.push({ h: '自分への問いと答え', list: qa.map(x => `問い：${x.q}　答え：${x.a}`) });
    const cs = (e.consults || []).slice(-3);
    if (cs.length) sec.push({ h: 'これまでの相談', list: cs.map(c => `${fmtDate(c.at)}　${c.where}：${c.note}`) });
    sec.push({ h: '相談員に聞きたいこと', ol: true, list: qs });
    return { title: `ライフプラン相談シート（${this.target}への相談用）`, date: `作成日：${fmtDate(now())}`, sec, foot: 'このシートは日記アプリ「タラレバ」で作成しました。判断の材料として、相談員の方と一緒に確認させてください。' };
  },
  text() {
    const e = getEntry(this.id); if (!e) return '';
    const d = this.data(e);
    let out = `${d.title}\n${d.date}\n`;
    d.sec.forEach(s => {
      out += `\n■ ${s.h}\n`;
      (s.p || []).forEach(p => { out += p + '\n'; });
      (s.list || []).forEach((l, i) => { out += (s.ol ? `${i + 1}. ` : '・') + l.replace(/\n/g, '\n   ') + '\n'; });
    });
    return out + `\n${d.foot}\n`;
  },
  html() {
    const e = getEntry(this.id); if (!e) return '';
    const d = this.data(e);
    const sheet = `<div class="consult-sheet"><h3>${esc(d.title)}</h3><p class="muted">${esc(d.date)}</p>${d.sec.map(s => `<h3>${esc(s.h)}</h3>${(s.p || []).map(p => `<p>${esc(p)}</p>`).join('')}${s.list ? `<${s.ol ? 'ol' : 'ul'}>${s.list.map(l => `<li>${esc(l).replace(/\n/g, '<br>')}</li>`).join('')}</${s.ol ? 'ol' : 'ul'}>` : ''}`).join('')}<p class="muted" style="margin-top:12px">${esc(d.foot)}</p></div>`;
    const fromAI = (e.consultQuestions || []).length;
    return `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">ライフプラン相談シート</h2>${closeBtn()}</div>
    <div class="sheet-scroll">
      <p class="field-hint" style="margin:0 0 14px">銀行・保険・FP・自治体などの相談に持っていくためのまとめです。自動で送信はされません。相談の場で見せたり、事前に送ったりして使ってください。</p>
      <div class="field"><span class="field-label" id="con-t">相談先</span>
        <div class="catchips" role="group" aria-labelledby="con-t">${TARGETS.map(t => `<button type="button" class="fchip" aria-pressed="${this.target === t}" data-act="con-target" data-v="${t}">${t}</button>`).join('')}</div>
        <p class="field-hint">このテーマの相談先の例：${esc(TARGET_HINT[e.category] || '銀行・保険会社・FPのライフプラン相談')}</p>
      </div>
      ${sheet}
      <div class="field"><span class="field-label">相談員に聞きたいこと</span>
        <p class="field-hint">${fromAI ? 'このノートの内容に合わせて作った質問です。' : 'いまは、テーマに合わせた質問の例を載せています。'}</p>
        ${AI.fn ? `<div class="ask-row" style="margin-top:8px"><button type="button" class="btn sm btn-wis" data-act="con-gen" ${this.loading ? 'disabled' : ''}>${this.loading ? '考えています…' : fromAI ? '質問を考え直してもらう' : 'このノートに合わせて考えてもらう'}</button></div>` : ''}
      </div>
    </div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="con-copy">テキストをコピー</button>${DL.can() ? `<button type="button" class="btn btn-primary" data-act="con-save">ファイルで保存</button>` : ''}</div>`;
  },
  async gen() {
    if (!AI.fn || this.loading) return;
    const e = getEntry(this.id); if (!e) return;
    this.loading = true; this.rerender();
    try {
      let arr;
      if (typeof AI.fn.json === 'function') arr = await AI.fn.json(consultPrompt(e, this.target), { modelTier: 'quick', cache: false });
      else { const r = await AI.fn(consultPrompt(e, this.target), { modelTier: 'quick', cache: false }); const m = /\[[\s\S]*\]/.exec(r.text); arr = m ? JSON.parse(m[0]) : null; }
      const list = Array.isArray(arr) ? arr : (arr && Array.isArray(arr.questions) ? arr.questions : []);
      const qs = list.filter(q => typeof q === 'string' && q.trim()).map(q => str(q, 80)).slice(0, 6);
      if (!qs.length) throw { code: 'invalid_json' };
      edit(this.id, x => { x.consultQuestions = qs; });
      toast('相談員に聞きたいことを入れました');
    } catch (err) {
      if (err && err.code === 'invalid_json') toast('質問をうまく作れませんでした。もう一度試してください。');
      else { const m = AI.fail(err); if (m) toast(m + 'いまは例の質問を使ってください。'); }
    } finally { this.loading = false; this.rerender(); }
  },
  copy() { copyText(this.text()); },
  save() {
    const e = getEntry(this.id); if (!e) return;
    const safe = e.title.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 24);
    DL.save(`相談シート_${safe}_${isoDate(now()).replace(/-/g, '')}.txt`, this.text());
  },
};

/* ================= settings + confirm ================= */
const Settings = {
  open() { Sheet.open(this.html(), 'set'); },
  rerender() { if (Sheet.kind === 'set') Sheet.replace(this.html()); },
  aiHTML() {
    if (!AI.canUseKey()) {
      return `<dd>${AI.fn ? 'AIが問いと物語を考えます。使うたびに、あなたのClaudeの利用枠を少し使います。' : 'この環境ではAIを使えません。あらかじめ用意した問いと、記録から組み立てる簡易版の物語を使います。'}</dd>`;
    }
    const has = !!Keys.get(), m = Keys.models();
    return `<dd>${has ? 'あなたのAnthropic APIキーで、AIが問いと物語を考えます。' : 'いまはAIを使っていません。用意した問いと、記録から組み立てる簡易版の物語で動きます。自分のAnthropic APIキーを入れると、AIが問いと物語を考えます。'}</dd>
      <dd class="key-box">
        <label class="field-label" for="apiKey">Anthropic APIキー</label>
        <input id="apiKey" type="password" class="hand-input sm" autocomplete="off" spellcheck="false" placeholder="${has ? '設定済み（入れ直すときだけ入力）' : 'sk-ant-…'}">
        <label class="check"><input type="checkbox" id="keyRemember" ${Keys.remembered() ? 'checked' : ''}> このブラウザに記憶する<span class="muted">（オフなら、タブを閉じると消えます）</span></label>
        <details class="models"><summary>使うモデル</summary>
          <label class="field-label" for="mStory">箱庭の物語・相談の質問</label><input id="mStory" class="hand-input sm" autocomplete="off" spellcheck="false" value="${esc(m.story)}">
          <label class="field-label" for="mQuick">問い返し</label><input id="mQuick" class="hand-input sm" autocomplete="off" spellcheck="false" value="${esc(m.quick)}">
        </details>
        <div class="ask-row"><button type="button" class="btn sm btn-primary" data-act="key-save">${has ? '設定を保存' : 'このキーでAIを使う'}</button>${has ? `<button type="button" class="btn sm btn-danger" data-act="key-clear">キーを消す</button>` : ''}</div>
        <p class="field-hint">キーはこのブラウザの中だけに置かれ、AnthropicのAPI（api.anthropic.com）にだけ直接送られます。共有のパソコンでは記憶をオフにしてください。利用料金はあなたのAPIアカウントにかかります。</p>
      </dd>`;
  },
  html() {
    const th = Theme.get(); const hasDemo = S.entries.some(e => e.demo);
    const storage = {
      cloud: 'claude.aiに保存しています。あなた専用の場所なので、ほかの人からは見えません。',
      local: 'このブラウザに保存しています。ブラウザのデータを消すと記録も消えるので、ときどき「書き出し」で保存してください。',
      memory: 'この環境では保存できません。画面を閉じると記録は消えます。',
      loading: '確かめています…',
    }[S.storage] || '';
    return `<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">設定とデータ</h2>${closeBtn()}</div>
    <div class="sheet-scroll">
      <dl class="status-list">
        <div><dt>記録の保存先</dt><dd>${storage}</dd></div>
        <div><dt>問い返しと箱庭の物語</dt>${this.aiHTML()}</div>
      </dl>
      <div class="field"><span class="field-label" id="set-th">表示</span>
        <div class="catchips" role="group" aria-labelledby="set-th">${[['auto', '端末に合わせる'], ['light', 'ライト'], ['dark', 'ダーク']].map(([v, l]) => `<button type="button" class="fchip" aria-pressed="${th === v}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div>
      </div>
      <div class="field"><span class="field-label">サンプル</span>
        ${hasDemo ? `<button type="button" class="btn sm" data-act="sample-clear">サンプルの記録を消す</button><p class="field-hint">あなたが書いた記録は残ります。</p>` : `<button type="button" class="btn sm" data-act="sample">サンプルの記録を入れる</button>`}
      </div>
      <div class="field"><span class="field-label">書き出しと読み込み</span>
        <div class="ask-row">
          ${DL.can() ? `<button type="button" class="btn sm" data-act="export" ${S.entries.length ? '' : 'disabled'}>すべての記録を書き出す</button>` : ''}
          <button type="button" class="btn sm" data-act="import-open">記録を読み込む</button>
          <input type="file" id="importFile" class="sr" accept=".json,application/json" tabindex="-1" aria-hidden="true">
        </div>
        <p class="field-hint">${DL.can() ? 'JSONファイルで書き出します。読み込むと、同じ記録は新しいほうに置き換わり、ほかの記録はそのまま残ります。' : 'この表示ではファイルの書き出しを使えません。読み込みはできます。'}</p>
      </div>
      <div class="field"><span class="field-label">すべての記録を消す</span>
        <button type="button" class="btn sm btn-danger" data-act="wipe" ${S.entries.length ? '' : 'disabled'}>すべての記録を消す</button>
      </div>
    </div>`;
  },
  saveKey() {
    const keyEl = $('#apiKey'), remember = !!($('#keyRemember') || {}).checked;
    const typed = keyEl ? keyEl.value.trim() : '';
    const key = typed || Keys.get();
    if (!key) { toast('APIキーを入力してください。'); if (keyEl) keyEl.focus(); return; }
    if (/\s/.test(key)) { toast('APIキーに空白が入っています。コピーし直してください。'); if (keyEl) keyEl.focus(); return; }
    Keys.set(key, remember);
    Keys.setModels({ story: ($('#mStory') || {}).value || '', quick: ($('#mQuick') || {}).value || '' });
    if (keyEl) keyEl.value = '';
    AI.useKey(); render(); this.rerender();
    toast(typed ? 'AIを使えるようにしました。' : '設定を保存しました。');
  },
  clearKey() { Keys.clear(); AI.useKey(); render(); this.rerender(); toast('APIキーを消しました。'); },
};
function confirmSheet({ title, body, ok, danger, onOk }) {
  Sheet.open(`<div class="sheet-head"><h2 class="sheet-title" id="sheetTitle">${esc(title)}</h2></div>
    <div class="sheet-scroll"><p style="margin:0">${esc(body)}</p></div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close" data-autofocus>やめる</button><button type="button" class="btn ${danger ? 'btn-danger solid' : 'btn-primary'}" data-act="confirm-ok">${esc(ok)}</button></div>`, 'confirm');
  Sheet.onOk = onOk;
}
function confirmDelete(id) {
  const e = getEntry(id); if (!e) return;
  confirmSheet({
    title: 'この記録を削除しますか？', ok: '削除する', danger: true,
    body: `「${e.title}」と、そのレシート・箱庭・ふりかえりが消えます。元に戻せません。`,
    onOk: () => { S.detailId = null; Store.remove(id); render(); window.scrollTo(0, 0); toast('削除しました'); },
  });
}
function confirmWipe() {
  const n = S.entries.length; if (!n) return;
  confirmSheet({
    title: 'すべての記録を消しますか？', ok: 'すべて消す', danger: true,
    body: `${n}件の記録と、レシート・箱庭・ふりかえりがすべて消えます。元に戻せません。`,
    onOk: () => { S.detailId = null; Store.removeMany(S.entries.map(e => e.id)); render(); toast('すべての記録を消しました'); },
  });
}

/* ================= samples / export ================= */
function loadSamples() {
  Sheet.close();
  if (S.entries.some(e => e.demo)) { toast('サンプルはもう入っています。'); goView('diary'); return; }
  const list = makeSamples();
  list.forEach(e => Store.putLocal(e));
  if (Store.mode !== 'cloud') Store.writeLocal();
  S.filter = 'all'; S.detailId = null; S.view = 'diary'; setHash('diary');
  render(); window.scrollTo(0, 0);
  toast(`サンプルの迷いを${list.length}件入れました。設定から消せます。`);
  if (Store.mode === 'cloud') (async () => { for (const e of list) { try { await Store.persist(e); } catch (err) { break; } } })();
}
function clearSamples() {
  const ids = S.entries.filter(e => e.demo).map(e => e.id);
  Sheet.close();
  if (S.detailId && ids.includes(S.detailId)) S.detailId = null;
  Store.removeMany(ids); render();
  toast('サンプルの記録を消しました');
}
function exportAll() {
  const data = JSON.stringify({ app: 'tarareba', version: 1, exportedAt: new Date().toISOString(), entries: S.entries }, null, 2);
  DL.save(`tarareba_${isoDate(now()).replace(/-/g, '')}.json`, data, 'application/json');
}

/* ================= import ================= */
// 読み込むJSONは信用しない前提で、型と長さをそろえてから取り込む。
function sanitizeEntry(r) {
  if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !/^[A-Za-z0-9_.~:@+-]{1,80}$/.test(r.id)) return null;
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const arr = v => (Array.isArray(v) ? v : []);
  const used = new Set();
  const options = arr(r.options).filter(o => o && typeof o.name === 'string' && o.name.trim()).slice(0, 4).map((o, i) => {
    let id = typeof o.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(o.id) ? o.id : `o${i + 1}`;
    if (used.has(id)) id = `${id}_${i}`; used.add(id);
    return { id, name: s(o.name, 40).trim(), pull: s(o.pull, 120), values: arr(o.values).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim().slice(0, 12)).slice(0, 6) };
  });
  if (options.length < 2) return null;
  const ids = new Set(options.map(o => o.id));
  const kind = r.kind === 'fork' ? 'fork' : 'moment';
  const createdAt = num(r.createdAt, now());
  const e = {
    id: r.id, kind, category: s(r.category, 20) || KINDS[kind].cats[0], title: s(r.title, 120) || options.map(o => o.name).join('か、'),
    options, intensity: clamp(Math.round(num(r.intensity, 3)), 1, 5), createdAt, updatedAt: num(r.updatedAt, createdAt),
    logs: arr(r.logs).filter(l => l && typeof l.text === 'string').slice(0, 300).map(l => Object.assign({ at: num(l.at, createdAt), text: s(l.text, 1000) }, l.sys ? { sys: true } : {})),
    qa: arr(r.qa).filter(x => x && typeof x.q === 'string').slice(0, 100).map(x => ({ at: num(x.at, createdAt), q: s(x.q, 300), a: s(x.a, 1000), by: s(x.by, 10) })),
    consults: arr(r.consults).filter(c => c && typeof c.note === 'string').slice(0, 100).map(c => ({ at: num(c.at, createdAt), where: TARGETS.includes(c.where) ? c.where : 'その他', note: s(c.note, 1200) })),
    consultQuestions: arr(r.consultQuestions).filter(q => typeof q === 'string' && q.trim()).slice(0, 6).map(q => q.slice(0, 120)),
    decision: null, sims: {}, worlds: {}, verifications: [],
    variables: arr(r.variables).filter(v => v && typeof v.title === 'string' && typeof v.question === 'string').slice(0, 30).map(v => ({
      id: typeof v.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v.id) ? v.id : newId('v'), kind: VAR_KINDS[v.kind] ? v.kind : 'other', direction: v.direction === 'tail' ? 'tail' : 'head',
      title: s(v.title, 20), question: s(v.question, 100), why: s(v.why, 60), adopted: !!v.adopted, source: s(v.source, 10), at: num(v.at, createdAt) })),
    reflections: arr(r.reflections).filter(x => x && typeof x.text === 'string').slice(0, 100).map(x => ({ at: num(x.at, createdAt), optionId: ids.has(x.optionId) ? x.optionId : '', text: s(x.text, 1200), simTitle: s(x.simTitle, 40) })),
  };
  if (r.demo) e.demo = true;
  if (kind === 'fork') { const f = r.fork || {}; e.fork = { deadline: /^\d{4}-\d{2}-\d{2}$/.test(f.deadline || '') ? f.deadline : '', people: s(f.people, 120), money: s(f.money, 600) }; }
  const d = r.decision;
  if (d && ids.has(d.optionId)) {
    e.decision = { optionId: d.optionId, at: num(d.at, createdAt), letGo: s(d.letGo, 200), conviction: clamp(Math.round(num(d.conviction, 70)), 0, 100),
      reasons: arr(d.reasons).filter(x => x && typeof x.text === 'string' && x.text.trim()).slice(0, 6).map(x => ({ text: s(x.text, 120), weight: clamp(Math.round(num(x.weight, 2)), 1, 3) })) };
  }
  e.verifications = arr(r.verifications).filter(x => x && typeof x.before === 'number').slice(0, 50).map(x => ({ at: num(x.at, createdAt), before: clamp(Math.round(x.before), 0, 100), after: clamp(Math.round(num(x.after, x.before)), 0, 100), note: s(x.note, 1200), key: s(x.key, 90) }));
  if (r.worlds && typeof r.worlds === 'object') Object.keys(r.worlds).slice(0, 12).forEach(k => {
    const [ca, ob] = k.split('__'); const m = r.worlds[k];
    if (!ids.has(ca) || !ids.has(ob) || !m || !m.tracks) return;
    const span = m.span === 36 ? 36 : 120;
    const dims = arr(m.dims).filter(d => typeof d === 'string').map(d => d.slice(0, 12)).slice(0, 6);
    const track = t => {
      if (!t || !Array.isArray(t.scenes)) return null;
      const scenes = t.scenes.filter(x => x && typeof x.headline === 'string').slice(0, 10).map(x => {
        const month = clamp(Math.round(num(x.month, 1)), 1, span); const impact = {};
        if (x.impact && typeof x.impact === 'object') Object.keys(x.impact).forEach(d => { if (dims.includes(d)) { const n = Math.round(num(x.impact[d], 0)); if (n) impact[d] = clamp(n, -2, 2); } });
        return { month, label: s(x.label, 20) || monthLabel(month), place: PLACES.includes(x.place) ? x.place : 'city', with: arr(x.with).filter(w => WITHS.includes(w)).slice(0, 3),
          kind: SCENE_KINDS[x.kind] ? x.kind : 'daily', variable: s(x.variable, 40), headline: s(x.headline, 60), story: s(x.story, 300), mood: clamp(Math.round(num(x.mood, 0)), -2, 2), impact, gained: s(x.gained, 30), lost: s(x.lost, 30) };
      }).sort((a, b) => a.month - b.month);
      return scenes.length ? { scenes, ending: t.ending ? { headline: s(t.ending.headline, 60), story: s(t.ending.story, 300) } : null } : null;
    };
    const tc = track(m.tracks.c), to = track(m.tracks.o); if (!tc && !to) return;
    const tracks = {}; if (tc) tracks.c = tc; if (to) tracks.o = to;
    e.worlds[k] = { title: s(m.title, 40), premise: s(m.premise, 100), span, startAt: num(m.startAt, createdAt), dims, vars: arr(m.vars).filter(v => typeof v === 'string').slice(0, 6),
      conviction: m.conviction == null ? null : clamp(Math.round(num(m.conviction, 50)), 0, 100), tracks,
      verify: m.verify ? { summary: s(m.verify.summary, 200), questions: arr(m.verify.questions).filter(q => typeof q === 'string').map(q => q.slice(0, 100)).slice(0, 4) } : null,
      source: s(m.source, 10) || 'ai', at: num(m.at, createdAt) };
  });
  if (r.sims && typeof r.sims === 'object') Object.keys(r.sims).forEach(k => {
    const m = r.sims[k]; if (!ids.has(k) || !m || !Array.isArray(m.scenes)) return;
    const span = m.span === 36 ? 36 : 120;
    const scenes = m.scenes.filter(x => x && typeof x.headline === 'string').slice(0, 8).map(x => {
      const month = clamp(Math.round(num(x.month, 1)), 1, span);
      return { month, label: s(x.label, 20) || monthLabel(month), place: PLACES.includes(x.place) ? x.place : 'city', with: arr(x.with).filter(w => WITHS.includes(w)).slice(0, 3),
        headline: s(x.headline, 60), story: s(x.story, 300), mood: clamp(Math.round(num(x.mood, 0)), -2, 2), gained: s(x.gained, 30), lost: s(x.lost, 30) };
    }).sort((a, b) => a.month - b.month);
    if (!scenes.length) return;
    e.sims[k] = { title: s(m.title, 40), premise: s(m.premise, 100), span, startAt: num(m.startAt, createdAt), scenes,
      ending: { headline: s(m.ending && m.ending.headline, 60), story: s(m.ending && m.ending.story, 300) }, question: s(m.question, 160), source: s(m.source, 10) || 'ai', at: num(m.at, createdAt) };
  });
  return e;
}
async function importFile(file) {
  if (!file) return;
  const bad = '読み込めませんでした。「タラレバ」で書き出したJSONファイルを選んでください。';
  if (file.size > 20 * 1024 * 1024) { toast('ファイルが大きすぎます。'); return; }
  let json;
  try { json = JSON.parse(await file.text()); } catch (err) { toast(bad); return; }
  const list = Array.isArray(json) ? json : json && Array.isArray(json.entries) ? json.entries : null;
  if (!list) { toast(bad); return; }
  let added = 0, updated = 0, skipped = 0; const incoming = [];
  list.forEach(raw => {
    const e = sanitizeEntry(raw); if (!e) { skipped++; return; }
    const cur = getEntry(e.id);
    if (cur && (cur.updatedAt || 0) >= e.updatedAt) { skipped++; return; }
    if (cur) updated++; else added++;
    incoming.push(e);
  });
  if (!incoming.length) { toast(skipped ? '読み込める新しい記録はありませんでした。' : bad); return; }
  incoming.forEach(e => Store.putLocal(e));
  if (Store.mode !== 'cloud') Store.writeLocal();
  Sheet.close(); S.detailId = null; render();
  toast(`${added}件を読み込み${updated ? `、${updated}件を新しくしました` : 'ました'}。${skipped ? `${skipped}件はそのままです。` : ''}`);
  if (Store.mode === 'cloud') { for (const e of incoming) { try { await Store.persist(e); } catch (err) { break; } } }
}

/* ================= judgment variables ================= */
async function askVariables(id) {
  if (S.varAsking) return;
  const e = getEntry(id); if (!e) return;
  S.varAsking = id; render(); if (TH.isOpen()) TH.panelSetup();
  let list = null;
  if (AI.fn) {
    try {
      let arr;
      if (typeof AI.fn.json === 'function') arr = await AI.fn.json(variablesPrompt(e), { modelTier: 'quick', cache: false });
      else { const r = await AI.fn(variablesPrompt(e), { modelTier: 'quick', cache: false }); const m = /\[[\s\S]*\]/.exec(r.text); arr = m ? JSON.parse(m[0]) : null; }
      const raw = Array.isArray(arr) ? arr : arr && Array.isArray(arr.variables) ? arr.variables : [];
      list = raw.map(v => normalizeVariable(v, 'ai')).filter(Boolean).slice(0, 6);
      if (!list.length) list = null;
    } catch (err) { const m = AI.fail(err); if (m) toast(m + '用意した候補から選びました。'); }
  }
  if (!list) list = localVariables(e).map(v => normalizeVariable(v, 'local')).filter(Boolean);
  S.varAsking = null;
  const cur = getEntry(id); if (!cur) return;
  const have = new Set((cur.variables || []).map(v => v.title));
  const add = list.filter(v => !have.has(v.title));
  edit(id, x => { x.variables = (x.variables || []).concat(add); });
  toast(add.length ? `判断変数を${add.length}つ補いました。箱庭に入れるものを選んでください。` : '新しい判断変数は見つかりませんでした。');
  if (TH.isOpen()) { TH.e = getEntry(id) || TH.e; TH.panelSetup(); }
}
function toggleVariable(id, vid) { edit(id, x => { const v = (x.variables || []).find(y => y.id === vid); if (v) v.adopted = !v.adopted; }); }
function removeVariable(id, vid) { edit(id, x => { x.variables = (x.variables || []).filter(y => y.id !== vid); }); }
function addVariable(id, dir) {
  const el = $(`[data-keep="var-${id}"]`); const t = el ? el.value.trim() : '';
  if (!t) { toast('足したい要素を、ひとことで書いてください。'); if (el) el.focus(); return; }
  const v = normalizeVariable({ title: t, question: `「${t}」が起きたら、この選択はどう変わりますか？`, direction: dir, kind: 'other' }, 'user');
  if (!v) return;
  v.adopted = true; el.value = '';
  edit(id, x => { x.variables = (x.variables || []).concat([v]); });
  toast('判断変数を足しました。箱庭に入れています。');
}

/* ================= detail actions ================= */
async function askQuestion(id) {
  if (S.asking) return;
  const e = getEntry(id); if (!e) return;
  let q = null, by = 'local';
  if (AI.fn) {
    const ctl = new AbortController();
    S.asking = { id, text: '', ctl }; render();
    try {
      const r = await AI.fn(questionPrompt(e), {
        modelTier: 'quick', cache: false, signal: ctl.signal,
        onText: ({ text }) => { if (S.asking && S.asking.ctl === ctl) { S.asking.text = text; const el = $('#askingText'); if (el) el.textContent = text; } },
      });
      q = cleanQuestion(r.text); by = 'ai';
    } catch (err) {
      if (err && err.code === 'cancelled') { S.asking = null; render(); return; }
      const m = AI.fail(err); if (m) toast(m + '用意した問いから選びました。');
    }
    S.asking = null;
  }
  const cur = getEntry(id); if (!cur) return;
  if (!q) { q = localQuestion(cur); by = 'local'; }
  const idx = (cur.qa || []).length;
  edit(id, x => { x.qa = x.qa || []; x.qa.push({ at: now(), q, a: '', by }); });
  requestAnimationFrame(() => { const t = $(`[data-keep="ans-${id}-${idx}"]`); if (t) t.focus(); });
}
function saveAnswer(id, i) {
  const ta = $(`[data-keep="ans-${id}-${i}"]`); const v = ta ? ta.value.trim() : '';
  if (!v) { toast('答えを書いてから残してください。'); if (ta) ta.focus(); return; }
  ta.value = '';
  edit(id, x => { if (x.qa && x.qa[i]) { x.qa[i].a = v; x.qa[i].aAt = now(); } });
}
function addLog(id) {
  const ta = $(`[data-keep="log-${id}"]`); const v = ta ? ta.value.trim() : '';
  if (!v) { toast('書き足すことを書いてください。'); if (ta) ta.focus(); return; }
  ta.value = '';
  edit(id, x => { x.logs = x.logs || []; x.logs.push({ at: now(), text: v }); });
  toast('書き足しました');
}
function addConsult(id) {
  const ta = $(`[data-keep="cs-${id}"]`); const v = ta ? ta.value.trim() : '';
  if (!v) { toast('相談で聞いたことや、気づいたことを書いてください。'); if (ta) ta.focus(); return; }
  ta.value = '';
  edit(id, x => { x.consults = x.consults || []; x.consults.push({ at: now(), where: S.consultWhere, note: v }); });
  toast('相談の記録を残しました');
}
function localValuesQ(st) {
  const keep = st.list.filter(s => s.kept > s.letGo).sort((a, b) => b.kept - a.kept)[0];
  const lose = st.list.filter(s => s.letGo > s.kept).sort((a, b) => b.letGo - a.letGo)[0];
  const p = st.pairs[0];
  const pool = [];
  if (keep) pool.push(`「${keep.v}」を手放さなかったのは、あなたのどんな経験から来ていると思いますか？`);
  if (lose) pool.push(`何度も手放してきた「${lose.v}」を、次に選ぶとしたら、それはどんなときでしょう？`);
  if (p) pool.push(`「${p.a}」と「${p.b}」が綱引きをするとき、あなたの中では何が起きていますか？`);
  pool.push('この地図の中で、いちばん意外だった価値はどれですか？');
  pool.push('この地図を5年前のあなたが見たら、何と言いそうですか？');
  const used = S.valQ && S.valQ.text; const list = pool.filter(q => q !== used);
  return list[Math.floor(Math.random() * list.length)] || pool[0];
}
async function askValues() {
  if (S.valQ && S.valQ.loading) return;
  const st = valueStats();
  if (AI.fn) {
    const ctl = new AbortController();
    S.valQ = { loading: true, text: '', ctl }; render();
    try {
      const r = await AI.fn(valuesPrompt(st), {
        modelTier: 'quick', cache: false, signal: ctl.signal,
        onText: ({ text }) => { if (S.valQ && S.valQ.ctl === ctl) { S.valQ.text = text; const el = $('#valQText'); if (el) el.textContent = text; } },
      });
      S.valQ = { loading: false, text: cleanQuestion(r.text) || localValuesQ(st) }; render(); return;
    } catch (err) {
      if (err && err.code === 'cancelled') { S.valQ = null; render(); return; }
      const m = AI.fail(err); if (m) toast(m + '用意した問いから選びました。');
    }
  }
  S.valQ = { loading: false, text: localValuesQ(st) }; render();
}
