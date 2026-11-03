/*
 * タラレバ — main.js
 * 画面遷移・操作のつなぎ込み・起動
 */
'use strict';

/* ================= navigation ================= */
const VIEWS = ['diary', 'forks', 'receipts', 'values'];
function setHash(v) {
  if (location.hash === '#' + v) return;
  try { history.replaceState(null, '', '#' + v); } catch (err) { try { location.hash = v; } catch (e2) { /* ignore */ } }
}
function goView(v) {
  if (!VIEWS.includes(v)) v = 'diary';
  S.view = v; S.detailId = null; setHash(v); render(); window.scrollTo(0, 0);
}
function openEntry(id) {
  if (!getEntry(id)) return;
  S.detailId = id; render(); window.scrollTo(0, 0);
  $('#main').focus({ preventScroll: true });
}

/* ================= actions ================= */
const ACT = {
  tab: el => goView(el.dataset.v),
  new: () => Rec.open({ kind: S.view === 'forks' && !S.detailId ? 'fork' : 'moment' }),
  'new-fork': el => Rec.open({ kind: 'fork', category: el.dataset.cat }),
  quick: () => { const i = $('#quick'); const v = i ? i.value.trim() : ''; if (i) i.value = ''; Rec.open({ kind: 'moment', title: v }); },
  sample: () => loadSamples(),
  filter: el => { S.filter = el.dataset.v; render(); },
  open: el => openEntry(el.dataset.id),
  back: () => { S.detailId = null; render(); window.scrollTo(0, 0); },
  edit: el => Rec.open({ editId: el.dataset.id }),
  delete: el => confirmDelete(el.dataset.id),
  decide: el => Dec.open(el.dataset.id),
  sim: el => TH.open(el.dataset.id, el.dataset.opt, el.dataset.focus),
  'var-ask': el => askVariables(el.dataset.id),
  'var-toggle': el => toggleVariable(el.dataset.id, el.dataset.v),
  'var-rm': el => removeVariable(el.dataset.id, el.dataset.v),
  'var-add': el => addVariable(el.dataset.id, el.dataset.v),
  consult: el => Con.open(el.dataset.id),
  ask: el => askQuestion(el.dataset.id),
  'ask-stop': () => { if (S.asking && S.asking.ctl) S.asking.ctl.abort(); },
  answer: el => saveAnswer(el.dataset.id, +el.dataset.i),
  'log-add': el => addLog(el.dataset.id),
  'cs-where': el => { S.consultWhere = el.dataset.v; $$('[data-act="cs-where"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.consultWhere))); },
  'cs-add': el => addConsult(el.dataset.id),
  'rcpt-filter': el => { S.rcptFilter = el.dataset.v; render(); },
  'val-focus': el => {
    const v = el.dataset.v; S.valueFocus = S.valueFocus === v ? null : v; render();
    const b = $$('.bubble').find(x => x.dataset.v === v); if (b) b.focus({ preventScroll: true });
  },
  'val-ask': () => askValues(),
  settings: () => Settings.open(),
  'sheet-close': () => Sheet.close(),
  'confirm-ok': () => { const f = Sheet.onOk; Sheet.onOk = null; Sheet.close(); if (f) f(); },
  'rec-kind': el => Rec.setKind(el.dataset.v),
  'rec-cat': el => Rec.setCat(el.dataset.v),
  'rec-val': el => Rec.toggleVal(+el.dataset.i, el.dataset.v),
  'rec-addval': el => Rec.addVal(+el.dataset.i),
  'rec-addopt': () => Rec.addOpt(),
  'rec-rmopt': el => Rec.rmOpt(+el.dataset.i),
  'rec-save': () => Rec.save(false),
  'rec-save-decide': () => Rec.save(true),
  'dec-opt': el => Dec.choose(el.dataset.v),
  'dec-w': el => Dec.setW(+el.dataset.i, +el.dataset.v),
  'dec-add': () => Dec.add(),
  'dec-rm': el => Dec.rm(+el.dataset.i),
  'dec-sug': el => Dec.suggest(el.dataset.v),
  'dec-save': () => Dec.save(),
  'con-target': el => Con.setTarget(el.dataset.v),
  'con-gen': () => Con.gen(),
  'con-copy': () => Con.copy(),
  'con-save': () => Con.save(),
  theme: el => { Theme.set(el.dataset.v); Settings.rerender(); },
  'sample-clear': () => clearSamples(),
  export: () => exportAll(),
  wipe: () => confirmWipe(),
  'key-save': () => Settings.saveKey(),
  'key-clear': () => Settings.clearKey(),
  'import-open': () => { const f = $('#importFile'); if (f) { f.value = ''; f.click(); } },
  'th-close': () => TH.close(),
  'th-span': el => TH.setSpan(+el.dataset.v),
  'th-start': () => TH.start(TH.span),
  'th-play': () => TH.togglePlay(),
  'th-speed': el => TH.setSpeed(+el.dataset.v),
  'th-restart': () => TH.restart(),
  'th-next': () => TH.leaveEvent(),
  'th-jump': el => TH.jump(+el.dataset.i),
  'th-regen': () => TH.start(TH.sim ? TH.sim.span : TH.span),
  'th-stop': () => TH.stopGen(),
  'th-save-verify': () => TH.saveVerify(),
  'th-track': el => TH.switchTrack(el.dataset.v),
  'th-compare': () => TH.showCompare(),
  'th-other': () => TH.watchOther(),
  'th-setup': () => TH.showSetup(),
  'th-var': el => TH.toggleVar(el.dataset.v),
  'th-var-ask': () => askVariables(TH.entryId),
  'th-view': () => TH.toggleView(),
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A') ev.preventDefault();
  fn(el, ev);
});
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if ((ev.key === 'Enter' || ev.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.act && t.tagName !== 'BUTTON') {
    ev.preventDefault(); const fn = ACT[t.dataset.act]; if (fn) fn(t, ev); return;
  }
  if (ev.key === 'Enter' && t && t.id === 'quick' && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); ACT.quick(); }
});
function onField(ev) {
  const el = ev.target; if (!el || !el.dataset) return;
  if (el.dataset.f) Rec.input(el); else if (el.dataset.d) Dec.input(el);
}
document.addEventListener('input', onField);
document.addEventListener('change', ev => {
  if (ev.target && ev.target.id === 'importFile') { importFile(ev.target.files && ev.target.files[0]); return; }
  onField(ev);
});

/* ================= init ================= */
function init() {
  Theme.apply(Theme.get());
  $('#settingsBtn').innerHTML = svgI(IC.gear);
  const plus = $('#icPlusTop'); if (plus) plus.outerHTML = svgI(IC.plus);
  Sheet.init(); TH.init();
  const h = location.hash.slice(1); if (VIEWS.includes(h)) S.view = h;
  render();
  window.addEventListener('hashchange', () => {
    const v = location.hash.slice(1);
    if (VIEWS.includes(v) && (v !== S.view || S.detailId)) { S.view = v; S.detailId = null; render(); window.scrollTo(0, 0); }
  });
  if (window.ResizeObserver) { let q = 0; new ResizeObserver(() => { cancelAnimationFrame(q); q = requestAnimationFrame(drawForks); }).observe($('#main')); }
  else window.addEventListener('resize', drawForks);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawForks).catch(() => {});
  if (reducedMQ.addEventListener) reducedMQ.addEventListener('change', () => { MW.setReduced(reducedMQ.matches); W3.setReduced(reducedMQ.matches); });
  Store.init(); AI.init(); DL.init();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
