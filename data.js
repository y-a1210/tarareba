/*
 * タラレバ — data.js
 * 定数・アイコン・AIへの指示文・AIなし版の問いと物語・サンプル
 */
'use strict';

/* ================= constants ================= */
const VALUES = ['安心', '自由', 'お金', '時間', '家族', '成長', '楽しさ', '健康', '挑戦', 'つながり', '自分らしさ', '人の目', '安定', '好奇心', '心の余裕', '思い出', '便利さ', '長く使う'];
const KINDS = {
  moment: { label: 'ちいさな迷い', cats: ['買い物', '旅行', '進路', '仕事', '人間関係', '食事', '暮らし', 'その他'] },
  fork: { label: '分かれ道', cats: ['進学', '就職・転職', '結婚', '住宅購入', '介護', '出産・子育て', '移住・引っ越し', 'その他'] },
};
const INTENSITY = ['', 'ちょっと', 'そこそこ', 'かなり', '頭から離れない', '夜も眠れない'];
const MOODS = { '2': '晴れやか', '1': 'おだやか', '0': 'いつもどおり', '-1': 'くもり空', '-2': '雨もよう' };
const PLACES = ['home', 'apartment', 'city', 'countryside', 'school', 'office', 'station', 'cafe', 'sea'];
const WITHS = ['partner', 'child', 'elder', 'friend', 'pet'];
const VAR_KINDS = { family: '家族', health: '健康', money: 'お金', work: '仕事', environment: '社会・環境', other: 'その他' };
const VAR_DIR = { tail: '追い風', head: '向かい風' };
const SCENE_KINDS = { daily: '日常', joy: 'うれしい', regret: '後悔', unexpected: '想定外', variable: '判断変数' };
const DEFAULT_DIMS = ['安心', 'お金', '時間', 'つながり', '自分らしさ'];
const TARGETS = ['銀行', '保険', 'FP', '自治体', '学校', 'その他'];
const TARGET_HINT = {
  '住宅購入': '銀行の住宅ローン相談、保険会社やFPのライフプラン相談',
  '介護': '地域包括支援センター、ケアマネジャー、保険会社のライフプラン相談',
  '結婚': '保険会社やFPのライフプラン相談',
  '出産・子育て': '自治体の子育て相談窓口、保険会社やFPのライフプラン相談',
  '進学': '学校の進路相談、奨学金の窓口、FP',
  '就職・転職': 'ハローワーク、FPのライフプラン相談',
  '移住・引っ越し': '自治体の移住相談窓口、FP',
};

const svgI = (p, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  diary: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18"/><path d="M10 8h6M10 12h5"/>',
  forks: '<path d="M12 21v-8"/><path d="M12 13 6 4.5"/><path d="m12 13 6-8.5" stroke-dasharray="2.4 2.6"/><circle cx="12" cy="13" r="1.7"/>',
  receipts: '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  values: '<circle cx="8.5" cy="9" r="4.2"/><circle cx="16.5" cy="14.5" r="4.8"/><circle cx="6.5" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4.5H9"/>',
};
const CAT_IC = {
  '進学': '<path d="M3 6.5c3-1.4 6-1.4 9 0v12c-3-1.4-6-1.4-9 0z"/><path d="M21 6.5c-3-1.4-6-1.4-9 0v12c3-1.4 6-1.4 9 0z"/>',
  '就職・転職': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12.5h18"/>',
  '結婚': '<circle cx="9" cy="14.5" r="5"/><circle cx="15" cy="14.5" r="5"/><path d="M10.3 5.2 12 3.5l1.7 1.7L12 7z"/>',
  '住宅購入': '<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-6h4v6"/>',
  '介護': '<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>',
  '出産・子育て': '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5z"/><path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5z"/>',
  '移住・引っ越し': '<path d="M3 19l6-9 4 6 3-4 5 7z"/><circle cx="17" cy="6" r="2"/>',
  'その他': '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
};

/* ================= entry helpers ================= */
const optById = (e, id) => (e && e.options || []).find(o => o.id === id) || null;
const optName = (e, id) => (optById(e, id) || {}).name || '';
function entryBrief(e) {
  const o = {
    種類: KINDS[e.kind] ? KINDS[e.kind].label : '', テーマ: e.category, 迷い: e.title,
    迷いの強さ: `${e.intensity}/5（${INTENSITY[e.intensity] || ''}）`,
    選択肢: e.options.map(x => ({ 名前: x.name, 惹かれるところ: x.pull || '', 大事にできるもの: x.values || [] })),
  };
  if (e.fork) { if (e.fork.deadline) o.期限 = e.fork.deadline; if (e.fork.people) o.関わる人 = e.fork.people; if (e.fork.money) o.お金の気がかり = e.fork.money; }
  if ((e.logs || []).length) o.迷いのログ = e.logs.slice(-5).map(l => short(l.text, 160));
  o.決めたこと = e.decision ? { 選んだ: optName(e, e.decision.optionId), 理由: (e.decision.reasons || []).map(r => r.text).filter(Boolean), 手放したもの: e.decision.letGo || '' } : '（まだ迷い中）';
  if ((e.consults || []).length) o.相談の記録 = e.consults.slice(-3).map(c => `${c.where}: ${short(c.note, 120)}`);
  const adopted = (e.variables || []).filter(v => v.adopted);
  if (adopted.length) o.採用した判断変数 = adopted.map(v => `${v.title}（${VAR_DIR[v.direction] || ''}）`);
  if ((e.verifications || []).length) o.検証の記録 = e.verifications.slice(-3).map(x => `納得度${x.before}%→${x.after}%${x.note ? ' ' + short(x.note, 80) : ''}`);
  return JSON.stringify(o, null, 1);
}

/* ================= prompts ================= */
function questionPrompt(e) {
  const qa = (e.qa || []).map((x, i) => `問${i + 1}: ${x.q}\n答${i + 1}: ${x.a || '（未回答）'}`).join('\n') || '（まだありません）';
  return [
    'あなたは迷いの日記アプリ「タラレバ」の「問い返し役」です。ユーザーが迷っていることについて、本人が自分の気持ちや大切にしているものに気づけるような問いを、ひとつだけ返してください。',
    '',
    '守ること:',
    '- 助言、提案、評価、結論、どちらを選ぶべきかの示唆は一切しない。「〜すべき」「〜がおすすめ」「〜したほうがいい」は使わない。',
    '- ローン・保険・投資などについて、具体的な商品や判断を勧めない。',
    '- 問いは一文、やわらかい話し言葉の日本語で、60字以内。最後は「？」で終える。',
    '- 本人の言葉（選択肢の名前や理由）を少し引用して、具体的にする。',
    '- これまでの問いとは違う角度から聞く（時間軸、他者の目、失うもの、本当の願い、体の感覚、条件が変わったら、など）。',
    '- 出力は問いの文だけ。前置き、かぎかっこ、番号は付けない。',
    '',
    '迷いの記録:', entryBrief(e), '',
    'これまでの問いと答え:', qa,
  ].join('\n');
}
function convictionNeed(e) {
  if (!e.decision) return 1;
  const c = e.decision.conviction;
  return c <= 40 ? 3 : c <= 60 ? 2 : 1;
}
function worldPrompt(e, cOpt, oOpt, span, vars, dims) {
  const decided = !!e.decision;
  const start = new Date((e.decision && e.decision.at) || now());
  const vlist = vars.length ? vars.map(v => `- id:${v.id}「${v.title}」（${VAR_DIR[v.direction] || ''}）${v.question}`).join('\n') : '（なし）';
  return [
    'あなたは迷いの日記アプリ「タラレバ」の「もしもの箱庭」の脚本家です。',
    'ユーザーの分かれ道について、二つの世界線を同じ時間軸で描きます。ミニチュアの箱庭で早送り再生するための台本です。',
    decided ? `- chosen：ユーザーが実際に選んだ「${cOpt.name}」の世界` : `- chosen：「${cOpt.name}」を選んだ世界`,
    decided ? `- other：選ばなかった「${oOpt.name}」の世界` : `- other：「${oOpt.name}」を選んだ世界`,
    '',
    'ユーザーの記録:', entryBrief(e), '',
    decided ? `選択への納得度: ${e.decision.conviction}%` : 'まだ決めていない（二つを同じ重さで描く）',
    `描く期間: ${span}ヶ月（${monthLabel(span)}まで）／始まり: ${start.getFullYear()}年${start.getMonth() + 1}月`,
    '本人が採用した判断変数:', vlist,
    `暮らしの指標: ${dims.join('、')}`,
    '',
    '物語のルール:',
    '- 予言ではなく、可能性のひとつとして描く。どちらの世界にも、うれしいこととほろ苦いことの両方を入れる。',
    decided
      ? `- 選んだ道を正当化しない。chosen には、後悔・不都合・想定外の変化の場面を少なくとも${convictionNeed(e)}つ入れる（kind は regret か unexpected、mood は -1 以下）。選択を検証できる材料にする。`
      : '- どちらかを勧めない。二つの世界に、不都合と良さを同じくらい入れる。',
    '- 判断変数は、それぞれ少なくとも一方の世界で出来事として起こす（kind は variable、variable にその id）。二つの世界で意味が違うなら、両方に入れてよい。',
    '- 本人が挙げていなかった追い風（予想外の良いこと）も、どちらかの世界に1つ以上入れる。',
    '- 死、重い病気、事故、破産、別離などの深刻な出来事は描かない。介護や子育ては、日々の小さな場面としてやさしく描く。',
    '- 具体的な金額、金融商品、ローンや保険の判断は書かない。',
    '- 二人称「あなた」で、朝の光、部屋の様子、誰かとの短い会話など、生活の小さな具体的場面を描く。',
    '',
    '出力形式（とても重要）: 1行に1つのJSONオブジェクトだけを書く。前置き、説明、コードブロック、空行は書かない。',
    '1行目: {"type":"meta","title":"二つの世界の題（18字以内）","premise":"この箱庭で確かめること（50字以内）"}',
    `続けてシーンを、時間の早い順に chosen と other を交互に。各世界5〜6個、最初のmonthは1〜3、最後のmonthは${span}。`,
    `{"type":"scene","track":"chosen か other","month":数値,"label":"半年後 などの言い方","place":"${PLACES.join('|')} のどれか","with":["partner","child","elder","friend","pet"]から0〜3個,"kind":"daily|joy|regret|unexpected|variable","variable":"判断変数のid（kindがvariableのときだけ）","headline":"20字以内","story":"90字以内","mood":-2から2の整数,"impact":{"指標名":-2から2の整数},"gained":"得たもの（14字以内）","lost":"手放したもの（14字以内）"}`,
    'impact には、暮らしの指標のうち、その場面で動いたものだけを書く。',
    '各世界の最後に: {"type":"ending","track":"chosen か other","headline":"20字以内","story":"その世界のあなたが大事にしていたもの（100字以内）"}',
    '最終行: {"type":"verify","summary":"二つの世界を見比べて見えること（80字以内。どちらが正しいかは言わない）","questions":["選択を検証するための問い（40字以内）","2つ目","3つ目"]}',
  ].join('\n');
}
function variablesPrompt(e) {
  const have = (e.variables || []).map(v => v.title);
  return [
    'あなたは迷いの日記アプリ「タラレバ」の「問い返し役」です。',
    'ユーザーがまだ挙げていない「判断変数」を5つ示してください。',
    '判断変数とは、本人が見落としているかもしれず、選択の結果を変えうる要素です（家族、健康、お金（金利や物価を含む）、仕事、社会や環境の変化）。',
    '',
    'ルール:',
    '- 本人がすでに書いた要素（惹かれるところ・大事にできるもの・お金の気がかり・迷いのログ）と重ならないものにする。',
    have.length ? `- すでに示した変数（${have.join('、')}）とも重ならないものにする。` : '',
    '- 不利になりうるもの（向かい風）と、有利になりうるもの（追い風）の両方を入れる（どちらも2つ以上）。',
    '- 結論や助言、どちらを選ぶべきかは書かない。各変数は本人への「問い」の形にする。',
    '- 具体的な金額や金融商品は出さない。',
    '',
    '出力: JSON配列だけ。前置きやコードブロックは不要。',
    '[{"kind":"family|health|money|work|environment","direction":"tail（追い風）|head（向かい風）","title":"変数の名前（12字以内）","question":"本人への問い（45字以内、？で終える）","why":"なぜ結果を変えうるか（35字以内）"}]',
    '',
    'ユーザーの記録:', entryBrief(e),
  ].filter(x => x !== '').join('\n');
}
function consultPrompt(e, target) {
  return [
    'あなたは迷いの日記アプリ「タラレバ」の「問い返し役」です。以下は人生の分かれ道についてのノートです。',
    `ユーザーが「${target}」でのライフプラン相談に持っていく、「相談員に聞いてみたいこと」を5つ作ってください。`,
    '',
    'ルール:',
    '- 結論や助言は書かず、質問だけを書く。',
    '- ユーザーの選択肢・気がかり・期限・関わる人に即した、具体的な質問にする。',
    '- 特定の金融商品や会社を勧める内容にしない。',
    '- 各40字以内の日本語で、「？」で終える。',
    '',
    '出力: JSON配列だけ。例: ["…ですか？", "…でしょうか？"]',
    '',
    'ノート:', entryBrief(e),
  ].join('\n');
}
function valuesPrompt(st) {
  const lines = st.list.filter(s => s.total).sort((a, b) => b.total - a.total).slice(0, 10)
    .map(s => `${s.v}: 選んだ側に${s.kept}回／手放した側に${s.letGo}回／迷い中に${s.pending}回`);
  const pairs = st.pairs.slice(0, 5).map(p => `「${p.a}」と「${p.b}」の綱引き: ${p.n}回（${p.a}が${p.wins[p.a] || 0}回、${p.b}が${p.wins[p.b] || 0}回選ばれた）`);
  return [
    'あなたは迷いの日記アプリ「タラレバ」の「問い返し役」です。',
    '以下はユーザーの迷いの記録から集計した、価値観の傾向です。',
    'ユーザーが自分を振り返るための問いを、ひとつだけ返してください。',
    '評価・診断・助言はしない。60字以内の一文、「？」で終える。出力は問いの文だけ。',
    '', ...lines, ...pairs,
  ].join('\n');
}
function cleanQuestion(t) {
  let s = String(t || '').trim().split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
  s = s.replace(/^(問い?|Q)\s*[0-9０-９]*\s*[:：.．]\s*/, '').trim();
  if (/^[「『"“]/.test(s) && /[」』"”]$/.test(s)) { const inner = s.slice(1, -1); if (!/[「」『』"“”]/.test(inner)) s = inner.trim(); }
  if (s.length > 140) s = s.slice(0, 140) + '…';
  return s || null;
}

/* ================= local (no-AI) generators ================= */
const GENERIC_Q = [
  (A, B) => `もし誰にも知られないとしたら、「${A}」と「${B}」のどちらを選びますか？`,
  () => '10年後のあなたは、今日の迷いをどんなふうに思い出しそうですか？',
  A => `「${A}」を選んだとき、いちばん失いたくないものは何ですか？`,
  () => '迷っているのは選択肢そのもの？ それとも、選んだあとの誰かの反応ですか？',
  () => 'どちらを選んでも少し後悔するとしたら、どちらの後悔なら引き受けられそうですか？',
  () => 'この迷いが始まったのは、いつ、何がきっかけでしたか？',
  (A, B) => `「${B}」に惹かれる気持ちは、あなたのどんな願いから来ていますか？`,
  () => 'お金と時間の心配がなかったとしたら、選択は変わりますか？',
  () => 'あなたの大切な人なら、この迷いに何と言いそうですか？ それを聞いて、どう感じますか？',
  () => '決める前に、確かめておきたいことは何ですか？',
  () => '半年後のある平日の朝、あなたはどんな景色の中にいたいですか？',
  () => '選択肢を思い浮かべたとき、体のどこかが軽くなったり、重くなったりしますか？',
];
const CAT_Q = {
  '住宅購入': ['毎日の暮らしの中で、住まいにどうしても譲れない場面はどれですか？', '「持つこと」と「借りること」、それぞれにどんな安心を感じていますか？'],
  '介護': ['あなた自身の暮らしで、守りたいものは何ですか？', '頼れる人や場所が増えたら、迷いはどう変わりそうですか？'],
  '結婚': ['一緒に暮らす日々で、いちばん大切にしたい時間はどんなときですか？', '相手とまだ話せていないことは、何かありますか？'],
  '進学': ['その学びの先で、どんな自分になっていたいですか？', '学ぶこと自体と、学んだあとに得られるもの、どちらに惹かれていますか？'],
  '就職・転職': ['働き方で、どうしても手放したくない条件は何ですか？', '今の仕事で、いちばん好きな瞬間はどんなときですか？'],
  '出産・子育て': ['どんな毎日を、家族と過ごしたいと思っていますか？', 'あなた自身がしてもらって嬉しかったことは何ですか？'],
  '移住・引っ越し': ['新しい場所で、最初の休日に何をしていたいですか？', '今の場所で、離れがたいものは何ですか？'],
  '買い物': ['それを使っている自分を想像すると、どんな気持ちになりますか？', '買わなかったとしたら、何が手元に残りますか？'],
  '旅行': ['旅から帰ってきたとき、どんな気持ちでいたいですか？'],
  '進路': ['その道を選んだ理由を、10歳の自分に説明するとしたら、どう話しますか？'],
  '人間関係': ['その人との関係で、本当はどうありたいですか？'],
  '仕事': ['この選択で、働く時間の中のどんな瞬間が増えそうですか？'],
};
function localQuestion(e) {
  const A = (e.options[0] || {}).name || 'ひとつ目', B = (e.options[1] || {}).name || 'もうひとつ';
  const pool = [...(CAT_Q[e.category] || []), ...GENERIC_Q].map(f => typeof f === 'function' ? f(A, B) : f);
  const asked = new Set((e.qa || []).map(x => x.q));
  const fresh = pool.filter(q => !asked.has(q));
  const list = fresh.length ? fresh : pool;
  return list[(hashStr(e.id) + (e.qa || []).length * 7) % list.length];
}
const CONSULT_Q = {
  '住宅購入': ['金利が上がった場合、毎月の返済はどのくらい変わりますか？', '購入した場合と賃貸を続けた場合で、将来の住居費はどう比べられますか？', '頭金を入れたあと、手元にどれくらいの備えを残しておくと安心ですか？', '団体信用生命保険で、どこまでがカバーされますか？', '将来、売却や住み替えをするとき、気をつけることは何ですか？'],
  '介護': ['利用できる介護サービスと、自己負担の目安を教えてください', '仕事を続けながら介護するとき、使える制度はありますか？', '介護の費用に備えるために、今から見直せることはありますか？', '親の年金や資産の状況は、どう整理すると話し合いやすいですか？', 'まずどこに、何から相談すればよいですか？'],
  '結婚': ['二人の収入と支出を合わせたとき、見直すとよい点はどこですか？', '結婚に合わせて、保険や貯蓄を見直すタイミングはいつですか？', '住まいの選び方は、将来の家計にどう影響しますか？', '子どもを望む場合、いつ頃からどんな準備が必要ですか？', '共働きと片働きで、ライフプランはどう変わりますか？'],
  '進学': ['学費と生活費の総額は、どのくらい見込めばよいですか？', '利用できる奨学金の種類と、返済の負担はどのくらいですか？', '教育費の準備を、家計の中でどう組み立てればよいですか？', '進学しなかった場合と比べて、確かめておくことは何ですか？', '在学中のアルバイトと学業は、どう両立させている人が多いですか？'],
  '就職・転職': ['転職で収入が変わる場合、家計への影響をどう見積もればよいですか？', '退職金や企業年金は、どう引き継がれますか？', '転職のタイミングで見直すべき保険はありますか？', '収入が一時的に減っても暮らせる備えの目安はありますか？', '副業や独立も含めて考えるときの注意点は何ですか？'],
  '出産・子育て': ['出産や育児で受けられる給付や制度を教えてください', '教育費は、いつまでにどれくらい準備すると安心ですか？', '育休中の収入の変化と、家計の組み立て方を知りたいです', '子どもが生まれたら見直すべき保険はありますか？', '住まいの広さや場所を見直すタイミングはいつ頃ですか？'],
  '移住・引っ越し': ['移住先での生活費は、今とどう変わりそうですか？', '移住支援など、使える制度はありますか？', '移住先では、住まいを買うか借りるか、どう考えればよいですか？', '仕事が変わる場合の収入の見通しは、どう立てればよいですか？', '移住後に見直すべき保険や手続きはありますか？'],
};
const CONSULT_DEFAULT = ['この選択で、今後5年の家計はどう変わりそうですか？', '備えとして、手元にどれくらい残しておくと安心ですか？', '見直したほうがよい保険や契約はありますか？', '判断の前に、確かめておくべき数字は何ですか？', '同じような選択をした人は、どんな準備をしていましたか？'];
const consultTemplates = cat => CONSULT_Q[cat] || CONSULT_DEFAULT;

function guessPlace(text, category) {
  const rules = [
    [/海|沖縄|島|ビーチ|港/, 'sea'], [/田舎|地方|実家|移住|山|農|里/, 'countryside'], [/東京|都会|都心|街|都市/, 'city'],
    [/大学|学校|進学|専門|講座|資格|勉強|塾|留学/, 'school'], [/会社|転職|就職|仕事|職|働|勤|オフィス|起業/, 'office'],
    [/旅|旅行|電車|新幹線|海外|出張|京都/, 'station'], [/カフェ|喫茶|店|ランチ|食事|飲み|同窓会|会う/, 'cafe'],
    [/マンション|賃貸|アパート|部屋/, 'apartment'], [/家|戸建|一軒家|住宅|庭/, 'home'],
  ];
  for (const [re, p] of rules) if (re.test(text || '')) return p;
  return ({ '進学': 'school', '進路': 'school', '就職・転職': 'office', '仕事': 'office', '結婚': 'home', '住宅購入': 'home', '介護': 'home', '出産・子育て': 'home', '移住・引っ越し': 'countryside', '旅行': 'station', '買い物': 'city', '食事': 'cafe', '人間関係': 'cafe', '暮らし': 'apartment' })[category] || 'city';
}
function guessWith(e, text) {
  const t = (text || '') + ((e.fork && e.fork.people) || '');
  const w = [];
  if (/パートナー|夫|妻|恋人|彼|結婚/.test(t) || e.category === '結婚') w.push('partner');
  if (/子|娘|息子|出産|育児/.test(t) || e.category === '出産・子育て') w.push('child');
  if (/母|父|親|祖|介護/.test(t) || e.category === '介護') w.push('elder');
  if (/友|同僚|仲間|同窓/.test(t)) w.push('friend');
  if (/猫|犬|ペット/.test(t)) w.push('pet');
  return w.slice(0, 3);
}
const VALUE_LINES = {
  '安心': '決まった時間に起きて、決まった道を歩く。その繰り返しが、あなたを静かに支えている。',
  '自由': '週末の予定は白紙のまま。思い立った日に、思い立った場所へ出かける。',
  'お金': '通帳を見て、少しだけほっとする夜がある。使い道を考える時間も、悪くない。',
  '時間': '夕方の時間がまるごと手に入った。何をするかは、まだ決めていない。',
  '家族': '食卓を囲む時間が少し増えた。他愛のない話で、何度も笑う。',
  '成長': 'できなかったことが、ひとつずつできるようになっていく。',
  '楽しさ': '思わず声を出して笑った日が、カレンダーに増えていく。',
  '健康': '朝の体が軽い。小さな習慣が、気づけば続いている。',
  '挑戦': '知らない場所で、知らない人に、自分から話しかけた。',
  'つながり': '久しぶりの人から連絡が来る。会いに行く理由が、ひとつ増えた。',
  '自分らしさ': '誰かの期待ではなく、自分の声で決めた毎日を送っている。',
  '人の目': '人にどう見えるかが気になる日もある。けれど、それだけでは決めなくなった。',
  '安定': '変わらない毎日のなかに、小さな手ごたえがある。',
  '好奇心': '気になったものに、迷わず手を伸ばせるようになった。',
  '心の余裕': '急がなくていい朝が増えた。湯気の立つカップを、ゆっくり両手で持つ。',
  '思い出': '写真フォルダに、残しておきたい場面が増えていく。',
  '便利さ': '手間がひとつ減るたびに、別のことに使える時間が増える。',
  '長く使う': '手になじむものと、長く付き合っている。',
};
const VAR_BANK = [
  { kind: 'money', direction: 'head', title: '金利や物価の上昇', question: '金利や物価が上がったら、毎月の暮らしの余裕はどう変わりますか？', why: '固定費が増えると、選べることが変わる' },
  { kind: 'money', direction: 'tail', title: '収入の増加', question: '数年後に収入が増えたら、選び直したくなることはありますか？', why: '余裕が増えると、優先順位が動く' },
  { kind: 'family', direction: 'head', title: '家族の事情の変化', question: '家族の転勤や介護が起きたら、この選択はどうなりますか？', why: '自分以外の事情で前提が変わる' },
  { kind: 'family', direction: 'tail', title: '家族の手助け', question: '家族が近くで手伝ってくれるとしたら、何が楽になりますか？', why: '頼れる人がいると、負担の形が変わる' },
  { kind: 'health', direction: 'head', title: '体調の変化', question: '体調を崩した時期があっても、この選択を続けられますか？', why: '体力が落ちると、続け方が変わる' },
  { kind: 'health', direction: 'tail', title: '生活リズムの改善', question: '朝の時間にゆとりができたら、どちらの道が合いますか？', why: '習慣が変わると、満足の源が変わる' },
  { kind: 'work', direction: 'head', title: '働き方の変化', question: '転勤や職場の変化があったら、この選択はどう影響しますか？', why: '仕事の前提が、暮らしの前提を変える' },
  { kind: 'work', direction: 'tail', title: '思いがけない機会', question: '新しい仕事の誘いが来たら、どちらの道が動きやすいですか？', why: '機会をつかめるかは身軽さで変わる' },
  { kind: 'environment', direction: 'head', title: '地域や社会の変化', question: '住む地域や社会のしくみが変わったら、何が困りますか？', why: '外の変化は、自分では選べない' },
  { kind: 'environment', direction: 'tail', title: '新しい制度や技術', question: '使える制度や技術が増えたら、選択肢は広がりますか？', why: '道具が変わると、できることが変わる' },
];
const VAR_BANK_CAT = {
  '住宅購入': [
    { kind: 'environment', direction: 'head', title: '修繕や管理の負担', question: '建物の修繕や管理の費用が上がったら、受け止められますか？', why: '持つ家には、持ち続ける費用がある' },
    { kind: 'environment', direction: 'tail', title: '街の再開発', question: '街が再開発で便利になるとしたら、持つ価値はどう変わりますか？', why: '周りの変化で、暮らしの価値が動く' },
  ],
  '介護': [
    { kind: 'environment', direction: 'tail', title: '介護サービスの充実', question: '使えるサービスが近くに増えたら、働き方の選択は変わりますか？', why: '外の支えで、家族の負担が変わる' },
    { kind: 'family', direction: 'head', title: '介護の長期化', question: '介護が思ったより長く続いたら、この選択を続けられますか？', why: '期間が延びると、無理の形が変わる' },
  ],
  '進学': [{ kind: 'money', direction: 'head', title: '学費や生活費の変化', question: '学費や生活費が上がったら、学び方はどう変わりますか？', why: 'お金の前提が、学ぶ時間を左右する' }],
  '進路': [{ kind: 'work', direction: 'tail', title: '学びが仕事につながる', question: '学んだことが思わぬ仕事につながるとしたら、何を選びますか？', why: '経験の使い道は、あとから広がる' }],
  '就職・転職': [{ kind: 'work', direction: 'head', title: '業界の変化', question: 'その業界が数年で大きく変わったら、どちらの道が強いですか？', why: '仕事の土台は、外の変化で動く' }],
  '結婚': [{ kind: 'family', direction: 'tail', title: '新しい家族のつながり', question: '相手の家族とのつながりが支えになるとしたら、何が変わりますか？', why: '家族が増えると、頼れる先も増える' }],
  '出産・子育て': [{ kind: 'work', direction: 'head', title: '仕事との両立', question: '保育や職場の事情で両立が難しい時期が来たら、どう備えますか？', why: '両立の形が、暮らしの余裕を決める' }],
  '移住・引っ越し': [{ kind: 'environment', direction: 'tail', title: '地域の支援', question: '移住先の支援や人のつながりが厚かったら、迷いは変わりますか？', why: '地域の支えで、慣れる早さが変わる' }],
};
function localVariables(e, n = 5) {
  const have = new Set((e.variables || []).map(v => v.title));
  const bank = [...(VAR_BANK_CAT[e.category] || []), ...VAR_BANK].filter(v => !have.has(v.title));
  const rot = hashStr(e.id + (e.variables || []).length) % 3;
  const heads = bank.filter(v => v.direction === 'head'), tails = bank.filter(v => v.direction === 'tail');
  for (let i = 0; i < rot; i++) { heads.push(heads.shift()); tails.push(tails.shift()); }
  const out = [];
  while (out.length < n && (heads.length || tails.length)) {
    const src = out.length % 2 === 0 ? (heads.length ? heads : tails) : (tails.length ? tails : heads);
    out.push(src.shift());
  }
  return out.filter(Boolean).map(v => Object.assign({}, v));
}
function normalizeVariable(v, source) {
  if (!v || typeof v !== 'object') return null;
  const title = str(v.title, 16); const question = str(v.question, 80);
  if (!title || !question) return null;
  const dir = /tail|追い風/.test(String(v.direction)) ? 'tail' : 'head';
  return { id: newId('v'), kind: VAR_KINDS[v.kind] ? v.kind : 'other', direction: dir, title, question, why: str(v.why, 50), adopted: false, source: source || 'ai', at: now() };
}
const KIND_DIM = { money: ['お金', '安定', '心の余裕'], family: ['家族', 'つながり', '安心'], health: ['健康', '心の余裕', '時間'], work: ['成長', '時間', '自由', 'お金'], environment: ['安心', '安定', '便利さ', '自由'], other: ['安心', '心の余裕'] };
const dimFor = (kind, dims) => (KIND_DIM[kind] || KIND_DIM.other).find(d => dims.includes(d)) || dims[0];
function pickDims(e, cOpt, oOpt) {
  const a = (cOpt && cOpt.values) || [], b = (oOpt && oOpt.values) || [];
  const out = [];
  for (let i = 0; i < 6; i++) [a[i], b[i]].forEach(v => { if (v && !out.includes(v) && out.length < 6) out.push(v); });
  DEFAULT_DIMS.forEach(v => { if (out.length < 5 && !out.includes(v)) out.push(v); });
  return out;
}
function worldLabels(e, cId, oId) {
  const c = optName(e, cId), o = optName(e, oId);
  return e.decision
    ? { c: '選んだ道', o: '選ばなかった道', cName: c, oName: o }
    : { c: `「${short(c, 8)}」の世界`, o: `「${short(o, 8)}」の世界`, cName: c, oName: o };
}
function localTrack(e, opt, other, span, vars, dims, need) {
  const vals = (opt.values || []).length ? opt.values : ['自分らしさ'];
  const ovals = (other && other.values) || [];
  const place = guessPlace(`${opt.name} ${opt.pull || ''}`, e.category);
  const withs = guessWith(e, `${opt.name}${opt.pull || ''}`);
  const line = v => VALUE_LINES[v] || '小さな選択を重ねながら、自分のペースで暮らしている。';
  const D = (obj) => { const r = {}; Object.keys(obj).forEach(k => { if (dims.includes(k)) r[k] = (r[k] || 0) + obj[k]; }); return r; };
  const dA = dims.includes(vals[0]) ? vals[0] : dims[0];
  const dB = dims.includes(ovals[0]) ? ovals[0] : dims[Math.min(1, dims.length - 1)];
  const dC = dims.includes(vals[1]) ? vals[1] : dA;
  const m = [Math.max(1, Math.round(span * 0.04)), Math.round(span * 0.2), Math.round(span * 0.4), Math.round(span * 0.6), Math.round(span * 0.8), span];
  const pull = opt.pull ? `「${opt.pull.replace(/[。．.]$/, '')}」という気持ちが、背中を押した。` : '';
  const S = (month, kind, mood, headline, story, impact, gained, lost, extra = {}) => Object.assign({ month, place, with: withs, kind, mood, headline, story, impact: D(impact), gained, lost }, extra);
  const varScene = (v, month) => S(month, 'variable', v.direction === 'tail' ? 1 : -1, short(v.title, 18),
    v.direction === 'tail'
      ? `「${v.title}」という追い風が来た。「${short(opt.name, 12)}」を選んだこの世界では、思いがけず選べることがひとつ増えた。`
      : `「${v.title}」が暮らしに届いた。「${short(opt.name, 12)}」を選んだこの世界では、前提をひとつ組み直すことになった。`,
    { [dimFor(v.kind, dims)]: v.direction === 'tail' ? 1 : -2 }, v.direction === 'tail' ? '思いがけない余地' : '備える力', v.direction === 'tail' ? '迷う理由' : short(dimFor(v.kind, dims), 14), { variable: v.id });
  const sc = [
    S(m[0], 'joy', 1, `「${short(opt.name, 10)}」の最初の日々`, `あなたは「${opt.name}」を選んだ。${pull}その日の帰り道は、いつもより少しだけ景色がちがって見えた。`, { [dA]: 1 }, short(vals[0], 14), short(ovals[0] || (other ? other.name : 'もうひとつの道'), 14)),
    need >= 1
      ? S(m[1], 'regret', -1, '思っていたのと違うこと', `「${vals[0]}」を大事にしたくて選んだのに、${ovals[0] ? `「${ovals[0]}」` : '別の何か'}が少しずつ削られていく。選んだ理由を思い出す夜があった。`, { [dB]: -1, 心の余裕: -1 }, '選んだ理由の確認', short(ovals[0] || '最初の勢い', 14))
      : S(m[1], 'daily', 0, '慣れていく毎日', line(vals[0]), { [dA]: 1 }, short(vals[0], 14), '新鮮さ'),
    vars[0] ? varScene(vars[0], m[2]) : S(m[2], 'joy', 1, '日々の手ざわり', line(vals[1] || vals[0]), { [dC]: 1 }, short(vals[1] || vals[0], 14), '—'),
    need >= 3
      ? S(m[3], 'regret', -1, '選ばなかった道がよぎる', `${other ? `「${other.name}」` : 'もうひとつの道'}を選んだ人の話を聞いて、胸の奥がざわついた。比べても戻れないと分かっていても。`, { [dB]: -1 }, '自分の本音', '比べない気楽さ')
      : vars[1] ? varScene(vars[1], m[3])
        : S(m[3], 'joy', 1, '思いがけない追い風', `予想していなかった小さな幸運があった。${line(vals[1] || vals[0])}`, { [dC]: 1, つながり: 1 }, '予想外のよろこび', '—'),
    need >= 2
      ? S(m[4], 'unexpected', -2, '想定外の変化', '予定していなかった出来事で、計画を立て直すことになった。選んだ理由を、もう一度確かめる夜が続いた。', { 安心: -1, [dA]: -1 }, '立て直す力', '見通し')
      : (vars[2] ? varScene(vars[2], m[4]) : S(m[4], 'daily', 0, 'ふとよぎる、もうひとつの道', other ? `ときどき「${other.name}」のことを考える。どちらが正しかったかではなく、どちらの自分もありえたと思える日がある。` : 'ときどき、選ばなかった道を思い出す。', {}, '自分で決めた実感', '比べない気楽さ')),
    S(m[5], 'daily', need >= 3 ? 0 : 1, `${monthLabel(span)}のあなた`, `${line(vals[2] || vals[0])}迷いも後悔もあったけれど、選び直しながら進んだ日々は、確かにあなたのものだった。`, { [dA]: 1 }, short(vals.slice(0, 2).join('と'), 14), '迷っていた頃の自分'),
  ];
  // variables that did not fit a slot become extra scenes between slots
  const used = new Set(sc.filter(x => x.variable).map(x => x.variable));
  vars.filter(v => !used.has(v.id)).slice(0, 2).forEach((v, i) => sc.push(varScene(v, Math.round(span * (0.3 + i * 0.4)))));
  sc.sort((a, b) => a.month - b.month);
  let last = 0;
  sc.forEach(x => { if (x.month <= last) x.month = Math.min(span, last + 1); last = x.month; x.label = monthLabel(x.month); });
  return {
    scenes: sc.filter((x, i, arr) => i === 0 || x.month > arr[i - 1].month || x.month === span),
    ending: { headline: short(`${vals.slice(0, 2).map(v => `「${v}」`).join('と')}を手放さなかった世界`, 30), story: `この世界のあなたは、${vals.map(v => `「${v}」`).join('、')}を大事にして、ひとつずつ選び直しながら暮らしていた。うまくいく日も、いかない日も、どちらもあなたの日々だった。` },
  };
}
function localWorld(e, cOpt, oOpt, span, vars, dims) {
  const decided = !!e.decision;
  return {
    title: short(`「${cOpt.name}」と「${oOpt.name}」の世界`, 30),
    premise: decided ? '選んだ道の不都合も含めて、二つの世界を同じ時間で確かめる。' : '二つの道の先を、同じ時間で見比べる。',
    span, dims,
    tracks: { c: localTrack(e, cOpt, oOpt, span, vars, dims, convictionNeed(e)), o: localTrack(e, oOpt, cOpt, span, vars.slice().reverse(), dims, 1) },
    verify: {
      summary: 'どちらの世界にも、得たものと手放したものがあった。指標の差よりも、どの場面で心が動いたかを手がかりにしてください。',
      questions: decided
        ? ['選んだ道の不都合を見ても、それでも選びたい理由は残っていますか？', '二つの世界で、いちばん惜しいと感じた場面はどれでしたか？', '想定外のことが起きたとき、守りたい暮らしの線はどこですか？']
        : ['二つの世界で、より自分らしいと感じたのはどちらでしたか？', 'どちらの不都合なら、引き受けられそうですか？', '決める前に、確かめておきたいことは何ですか？'],
    },
    source: 'local',
  };
}
// v1で保存した「選ばなかった道」だけの物語を、片側だけの世界線として読む
function legacyWorld(e, cId, oId) {
  const old = e.sims && e.sims[oId];
  if (!old || !Array.isArray(old.scenes) || !old.scenes.length) return null;
  return {
    title: old.title || '', premise: old.premise || '', span: old.span || 120, startAt: old.startAt, dims: pickDims(e, optById(e, cId), optById(e, oId)),
    tracks: { o: { scenes: old.scenes.map(x => Object.assign({ kind: 'daily', impact: {} }, x)), ending: old.ending || null } },
    verify: { summary: '', questions: old.question ? [old.question] : [] }, source: old.source || 'legacy',
  };
}

/* ================= streaming JSON object scanner ================= */
function makeScanner(onObj) {
  // AIの出力を1行ずつ読む。1行1オブジェクト（NDJSON）が基本だが、整形された複数行や、
  // 文字列の中の改行、前後の余計な文字にも耐える。壊れた行は捨てて、次の行から読み直す。
  let pending = '', block = [];
  const tryParse = text => { try { const o = JSON.parse(text); if (o && typeof o === 'object') { onObj(o); return true; } } catch (err) { /* not json */ } return false; };
  function line(raw) {
    const t = raw.trim();
    if (!t || t.startsWith('```')) return;
    if (block.length) {
      block.push(t);
      if (tryParse(block.join('\n')) || tryParse(block.join('\\n'))) { block = []; return; }
      if (t.startsWith('{') && tryParse(t)) { block = []; return; }
      if (block.length > 60) block = [];
      return;
    }
    if (tryParse(t)) return;
    const i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i >= 0 && j > i && tryParse(t.slice(i, j + 1))) return;
    if (t.startsWith('{') || t.startsWith('[') || t.endsWith('{') || t.endsWith('[')) block = [t];
  }
  return {
    push(d) { pending += d; let k; while ((k = pending.indexOf('\n')) >= 0) { line(pending.slice(0, k)); pending = pending.slice(k + 1); } },
    end() { if (pending) { line(pending); pending = ''; } if (block.length) { tryParse(block.join('\n')) || tryParse(block.join('\\n')); block = []; } },
  };
}

/* ================= sample data ================= */
const SAMPLE_VARS = [
  { id: 'v1', kind: 'money', direction: 'head', title: '金利の上昇', question: '金利が上がったら、毎月の返済と暮らしの余裕はどう変わりますか？', why: '返済が増えると、使えるお金が変わる', adopted: true, source: 'sample' },
  { id: 'v2', kind: 'work', direction: 'head', title: '転勤や働き方の変化', question: '転勤やリモートワークの増減があったら、住まいへの満足は変わりますか？', why: '働く場所が、住む場所の価値を変える', adopted: true, source: 'sample' },
  { id: 'v3', kind: 'family', direction: 'tail', title: '親の手助け', question: '親が近くで子育てを手伝ってくれるとしたら、どちらの住まいが合いますか？', why: '頼れる人の近さで、暮らしやすさが変わる', adopted: false, source: 'sample' },
  { id: 'v4', kind: 'environment', direction: 'head', title: '修繕や管理の負担', question: '建物の修繕や管理の費用が上がったら、受け止められますか？', why: '持つ家には、持ち続ける費用がある', adopted: true, source: 'sample' },
  { id: 'v5', kind: 'environment', direction: 'tail', title: '街の再開発', question: '街が再開発で便利になるとしたら、持つ価値はどう変わりますか？', why: '周りの変化で、暮らしの価値が動く', adopted: false, source: 'sample' },
];
const SAMPLE_WORLD = {
  title: '持つ世界と、借り続ける世界', premise: '納得度50%の選択を、不都合も含めて二つの世界で確かめる。', span: 120, source: 'sample',
  dims: ['家族', '自由', '安定', '心の余裕', '安心', 'お金'], vars: ['v1', 'v2', 'v4'],
  tracks: {
    c: {
      scenes: [
        { month: 2, label: '2ヶ月後', place: 'apartment', with: ['partner', 'child'], kind: 'joy', mood: 2, headline: '鍵を受け取った日', story: '引き渡しの日、子どもが新しい部屋を走り回る。窓から入る南向きの光は、内見の日と同じだった。', impact: { 家族: 1, 安定: 1 }, gained: 'わが家の実感', lost: '身軽さ' },
        { month: 16, label: '1年4ヶ月後', place: 'apartment', with: ['partner'], kind: 'variable', variable: 'v1', mood: -1, headline: '金利見直しの通知', story: 'ローンの金利が上がるという通知が届く。外食を少し減らそうと話した夜、二人とも口数が少なかった。', impact: { お金: -2, 心の余裕: -1 }, gained: '家計を話す習慣', lost: '気楽な外食' },
        { month: 40, label: '3年4ヶ月後', place: 'school', with: ['child'], kind: 'joy', mood: 1, headline: '同じ公園の友だち', story: '子どもは同じ友だちと、同じ公園で遊び続けている。学区を変えなかったことが、毎日の安心になっている。', impact: { 家族: 2, 安心: 1 }, gained: '続いていく友だち', lost: '別の街の暮らし' },
        { month: 62, label: '5年2ヶ月後', place: 'office', with: [], kind: 'variable', variable: 'v2', mood: -2, headline: '思いがけない転勤の打診', story: '遠方への転勤を打診される。家があるから断るか、単身赴任か。身軽な暮らしを選ばなかった重さを、初めて感じた。', impact: { 自由: -2, 家族: -1, 心の余裕: -1 }, gained: '働き方を選び直す機会', lost: '身軽に動ける自由' },
        { month: 90, label: '7年半後', place: 'apartment', with: ['partner'], kind: 'variable', variable: 'v4', mood: -1, headline: '大規模修繕の説明会', story: '管理組合の説明会で、修繕積立金の値上げが決まる。帰りに隣の家の人と初めて長く話し、少しだけこの建物が好きになった。', impact: { お金: -1, 安定: 1 }, gained: '隣人とのつながり', lost: '想定していた余裕' },
        { month: 120, label: '10年後', place: 'apartment', with: ['partner', 'child', 'pet'], kind: 'daily', mood: 1, headline: '柱の印と10年', story: '柱に刻んだ子どもの背の印が、10本になった。迷いも後悔もあったけれど、この部屋で重ねた時間は自分たちのものだと思える。', impact: { 家族: 1, 安定: 1 }, gained: '積み重ねた時間', lost: '別の街の暮らし' },
      ],
      ending: { headline: '持つことを選び、引き受けた世界', story: 'この世界のあなたは、金利や転勤に揺れながらも、家族の毎日の安心を手放さなかった。後悔した夜もあったが、それを話し合える家族がいた。' },
    },
    o: {
      scenes: [
        { month: 2, label: '2ヶ月後', place: 'apartment', with: ['partner', 'child'], kind: 'daily', mood: 1, headline: '更新の書類にサイン', story: '更新の書類に名前を書く。「また2年ね」と笑い合う。頭金にするはずだったお金は、まだ通帳の中で静かにしている。', impact: { 心の余裕: 1, お金: 1 }, gained: '手元の余裕', lost: 'わが家という実感' },
        { month: 14, label: '1年2ヶ月後', place: 'apartment', with: ['child'], kind: 'regret', mood: -1, headline: '壁に小さな落書き', story: '子どもが壁に描いた絵を見て、一瞬ひやりとする。退去の日のことを考えながら、そっと消した。', impact: { 家族: -1, 安心: -1 }, gained: '家族の笑い声', lost: '気兼ねのなさ' },
        { month: 38, label: '3年2ヶ月後', place: 'sea', with: ['partner', 'child'], kind: 'variable', variable: 'v2', mood: 2, headline: '海の見える町へ', story: 'パートナーの転勤をきっかけに、海の見える町へ。段ボールは思ったより少なかった。身軽さが、ここで効いた。', impact: { 自由: 2, 家族: 1 }, gained: '新しい景色', lost: '子どもの友だち' },
        { month: 66, label: '5年半後', place: 'school', with: ['child'], kind: 'unexpected', mood: -1, headline: '二度目の入学式', story: '新しい学校の門の前で、子どもが少し緊張している。前の町の友だちとは、今も手紙のやりとりが続いている。', impact: { 家族: -1, 安心: -1 }, gained: 'たくましさ', lost: '幼なじみの近さ' },
        { month: 92, label: '7年8ヶ月後', place: 'apartment', with: ['partner'], kind: 'variable', variable: 'v1', mood: -1, headline: '家賃の通知と向き合う夜', story: '物価や金利の流れで、家賃が少し上がるという通知が届く。二人で家計簿を開いて、これからの住まいの話を久しぶりにゆっくりした。', impact: { お金: -1, 安定: -1 }, gained: '話し合う習慣', lost: '先の見通し' },
        { month: 120, label: '10年後', place: 'sea', with: ['partner', 'child', 'pet'], kind: 'joy', mood: 1, headline: '窓から見える海', story: '子どもは中学生になった。借りている家の窓から、今日も海が見える。持たないからこそ、選び続けられた10年だった。', impact: { 自由: 1, 心の余裕: 1 }, gained: '選び続ける自由', lost: '資産としての家' },
      ],
      ending: { headline: '身軽さを手放さなかった世界', story: 'この世界のあなたは「いつでも動ける」ことを大事にして、そのたびに家族と話し合ってきた。持たない不安と、選べる自由のあいだで揺れながら。' },
    },
  },
  verify: {
    summary: '持つ世界では家族の安心が積み上がる一方、転勤で動けない重さが出た。借りる世界では動ける自由がある一方、子どもの友だち関係が途切れた。',
    questions: ['転勤の打診が来ても、いまの選択を選び直しますか？', '「家族の安心」と「動ける自由」、10年後に惜しむのはどちら？', '金利が上がったときに守りたい暮らしの線はどこですか？'],
  },
};
function makeSamples() {
  const t = now();
  const D = n => t - n * DAY;
  const base = { qa: [], logs: [], consults: [], consultQuestions: [], sims: {}, worlds: {}, variables: [], verifications: [], reflections: [], demo: true };
  const mk = o => Object.assign(clone(base), o, { id: newId('e'), updatedAt: o.createdAt });
  return [
    mk({
      kind: 'fork', category: '住宅購入', title: '中古マンションを買うか、賃貸を続けるか', intensity: 5, createdAt: D(42),
      options: [
        { id: 'o1', name: '中古マンションを買う', pull: '子どもが小さいうちに、落ち着ける場所がほしい', values: ['家族', '安定', '安心'] },
        { id: 'o2', name: '賃貸を続ける', pull: '身軽なまま、いつでも住み替えられる', values: ['自由', '心の余裕', 'お金'] },
      ],
      fork: { deadline: isoDate(D(-28)), people: 'パートナー、両親', money: '頭金をどこまで出すか。金利が上がったときに払い続けられるか。' },
      logs: [
        { at: D(41), text: '内見の帰り道。南向きの窓の光が、ずっと頭に残っている。' },
        { at: D(33), text: '家賃の更新通知が届いた。払い続けてきたお金のことを、つい計算してしまう。' },
        { at: D(26), text: '母に「買うなら早いほうがいい」と言われて、少しもやもやした。誰の希望で決めようとしているんだろう。' },
        { at: D(19), text: '「中古マンションを買う」に決めた。', sys: true },
      ],
      qa: [
        { at: D(30), q: '「落ち着ける場所」と聞いて、真っ先に浮かぶのはどんな場面ですか？', a: '子どもが同じ友だちと、同じ公園で遊び続けられること。', by: 'sample' },
        { at: D(27), q: '身軽さを手放すとしたら、いちばん惜しいのは何でしょう？', a: '仕事が変わったときに、住む場所も選び直せること。', by: 'sample' },
      ],
      consults: [{ at: D(22), where: '銀行', note: '金利が上がった場合の返済額の試算を見せてもらった。繰上返済の考え方は、家で話し合ってみる。' }],
      decision: { optionId: 'o1', at: D(19), reasons: [{ text: '子どもの学区を変えたくない', weight: 3 }, { text: '家賃が「消えていく」感覚がつらかった', weight: 2 }, { text: '内見の日の光が忘れられない', weight: 1 }], letGo: 'いつでも引っ越せる身軽さ', conviction: 50 },
      variables: clone(SAMPLE_VARS).map(v => Object.assign(v, { at: D(18) })),
      worlds: { 'o1__o2': Object.assign(clone(SAMPLE_WORLD), { startAt: D(19), at: D(18) }) },
    }),
    mk({
      kind: 'moment', category: '進路', title: '資格の講座、春から始めるか', intensity: 3, createdAt: D(16),
      options: [
        { id: 'o1', name: '春から講座を始める', pull: '今のうちに、できることを増やしたい', values: ['成長', '挑戦'] },
        { id: 'o2', name: '今年は見送る', pull: '平日の夜の余白を守りたい', values: ['心の余裕', '時間'] },
      ],
      logs: [{ at: D(16), text: '申込締切のメールが来た。開いたまま、30分くらい画面を見ていた。' }],
      decision: { optionId: 'o1', at: D(14), reasons: [{ text: '1年後の自分に、選べる道を増やしておきたい', weight: 3 }, { text: '同僚が一緒に申し込むと言っていた', weight: 1 }], letGo: '平日の夜ののんびりした時間', conviction: 70 },
    }),
    mk({
      kind: 'moment', category: '買い物', title: '冬のコート、ウールかダウンか', intensity: 3, createdAt: D(12),
      options: [
        { id: 'o1', name: 'ウールのコート', pull: '10年着られそうな形', values: ['長く使う', '自分らしさ'] },
        { id: 'o2', name: 'ダウンジャケット', pull: '軽くて、とにかく暖かい', values: ['便利さ', '健康'] },
      ],
      logs: [{ at: D(12), text: '店で30分迷って、いったん帰ってきた。' }, { at: D(10), text: '朝の寒さで、ダウンの軽さを思い出してまた揺れる。' }],
      decision: { optionId: 'o1', at: D(9), reasons: [{ text: '長く着られる形だった', weight: 3 }, { text: '鏡の前で背すじが伸びた', weight: 2 }, { text: '手入れの仕方を教えてもらえた', weight: 1 }], letGo: 'ダウンの軽さと暖かさ', conviction: 82 },
    }),
    mk({
      kind: 'moment', category: '旅行', title: '年末の旅行、京都か沖縄か', intensity: 2, createdAt: D(8),
      options: [
        { id: 'o1', name: '京都で寺めぐり', pull: '静かな冬の庭を見てみたい', values: ['好奇心', '心の余裕'] },
        { id: 'o2', name: '沖縄でのんびり', pull: '寒さから逃げて、海を見たい', values: ['楽しさ', '健康'] },
      ],
      decision: { optionId: 'o1', at: D(7), reasons: [{ text: '冬にしか見られない景色だから', weight: 3 }, { text: '移動が短くて、疲れなさそう', weight: 2 }], letGo: '冬の海の青さ', conviction: 88 },
    }),
    mk({
      kind: 'fork', category: '介護', title: '母の通院の付き添い、働き方を変えるか', intensity: 4, createdAt: D(6),
      options: [
        { id: 'o1', name: '時短勤務に切り替える', pull: '母のそばにいる時間をつくりたい', values: ['家族', '安心', '時間'] },
        { id: 'o2', name: '今の働き方のまま、外部のサービスを頼る', pull: '仕事で積み上げてきたものを手放したくない', values: ['成長', 'お金', '自分らしさ'] },
      ],
      fork: { deadline: isoDate(D(-55)), people: '母、兄', money: '時短にした場合の収入の変化。サービスの費用がどれくらいかかるか。' },
      logs: [
        { at: D(5), text: '通院の付き添いで半休を取った。待合室で、来月のことを考えていた。' },
        { at: D(2), text: '兄と電話。「できる範囲でいい」と言われて、少し肩の力が抜けた。' },
      ],
      qa: [{ at: D(4), q: '「そばにいる時間」があったら、お母さんと何をしたいですか？', a: '', by: 'sample' }],
    }),
    mk({
      kind: 'moment', category: '人間関係', title: '同窓会、行くか行かないか', intensity: 2, createdAt: D(4),
      options: [
        { id: 'o1', name: '行く', pull: '久しぶりに会いたい顔がある', values: ['つながり', '思い出', '人の目'] },
        { id: 'o2', name: '行かない', pull: '近況を話すのが、少しだけ気が重い', values: ['心の余裕', '自分らしさ'] },
      ],
      decision: { optionId: 'o2', at: D(3), reasons: [{ text: '今は自分のペースを大事にしたい', weight: 3 }, { text: '会いたい人には、個別に連絡すればいい', weight: 2 }], letGo: 'みんなで集まるにぎやかさ', conviction: 65 },
    }),
    mk({
      kind: 'moment', category: '買い物', title: '新しいノートPC、今買うかセールを待つか', intensity: 2, createdAt: t - 3 * 3600000,
      options: [
        { id: 'o1', name: '今買う', pull: '毎日の作業が今すぐ楽になる', values: ['便利さ', '時間'] },
        { id: 'o2', name: 'セールまで待つ', pull: '少しでも安く買いたい', values: ['お金', '心の余裕'] },
      ],
      logs: [{ at: t - 3 * 3600000, text: '比較サイトを開いたり閉じたり。決めきれないまま夜になった。' }],
    }),
  ];
}
