// 회신없음 (17판: 빈 판). 내용은 데이터/1장.json. 선배가 쓴다. 메신저(카카오톡)와 영상통화는 메신저.js.
// 플레이어는 노트북 앞. 에타 글은 복사해서 기록.txt 에 붙여 넣어 모은다 (오른쪽 클릭도 된다). 에타 사진은 오른쪽 클릭으로 복사, 저장 (내 PC > 다운로드).
// "정보": 정해 둔 글을 읽고 정해 둔 문구가 기록.txt 에 들어가면 안다. 정보가 있어야 열리는 선택지가 있다.
// 게임 시작 전에 AI 동의를 묻는다. 동의 안 하면 AI 를 안 부른다 (에타 댓글, 쪽지, 메신저 모두).
// 하루 = 노트북을 한 번 켜는 것. 시스템 종료 = 그날 끝, 절전 = 저장, 다시 시작 = 처음부터.
// 사건 (툴의 X 항목, 나폴리탄 연출): 게임/사건.js. 게임.js 는 훅(사건읽음, 사건끊김, 사건끔, 사건폴더, 사건메뉴)과 덮(판.덮), 사건일으킴을 부른다. 사건.js 없이는 안 돈다.
// 와이파이: 새 글을 정해진 개수만큼 불러오면 끊긴다. 불러온 글과 쪽지는 끊긴 뒤에도 된다.
// 쪽지 답과 내 글의 댓글: 서버의 /ai/메신저, /ai/커뮤니티 (Claude, 툴에서 쓴 지시문으로). 지시문이 없거나 안 되면 데이터의 답풀, 댓글풀.
// 16판 기능(팀장, 504호, 임무와 생방송, 상처, 엔딩, 노크)은 뺐다 (2026-11-04). 예전 코드: 보관/16판 델 초안 (2026-11-03)/코드 (2026-11-04 뺌)/
// 시험: ?fast 빠르게, ?mute 무음, ?ai끔 AI 안 부르기 (크레딧 아끼기), ?새로 저장 무시, ?날=2, ?켜짐 오프닝 건너뛰기, ?창=web,note,coco,chat,pc,bin, ?글=4, ?쪽=dm|tt|rv|hot|write, ?상대=쪽지 상대 id,
//       ?폴더=문서&파일=일기.txt, ?장면=shut|sleep|boot, ?사건=X-001 켜자마자 그 사건을 일으킨다
const $ = s => document.querySelector(s);
const 쉼 = ms => new Promise(r => setTimeout(r, ms));
const 물음표 = new URLSearchParams(location.search);
const 빠름 = 물음표.has('fast');
const 둘 = n => String(n).padStart(2, '0');
const 고름 = a => a?.length ? a[Math.floor(Math.random() * a.length)] : undefined;
const 저장키 = 'hoesin-save-17' + (물음표.get('자료') ? ':' + 물음표.get('자료') : ''); // 시험 자료(?자료=)로 켜면 진짜 저장을 안 덮는다

let 자료, 날 = 0;
let 판 = 새판();
function 새판() {
  return {
    불러온: new Set(), 읽음: 0, 끊김: false, 사건: new Set(), 켜짐: false,
    기록: '', 내글: [], 더한: {}, 댓단글: new Set(), 스크랩: new Set(), 버린: [], 되살린: [],
    쪽지: {}, 상대: {}, 안읽은: {}, 연상대: null, 지난: new Set(),
    AI: null, 저장사진: [], 답: {}, 덮: {}, 켠초: 0, 예약: [], 올라온: {}, 끝알림: -1, 경고알림: -1, // 올라온: 조건으로 올라온 글 { id: [날, 시] } · 끝알림: 끝 시각 알림을 띄운 날 // 사건: 일어난 사건 · 답: 묻는 창에서 고른 보기 · 덮: 사건이 바꿔 놓은 것 (사건.js)
    코코: { 친구: new Set(), 알려준: new Set(), 대화: {}, 안읽은: {}, 지난: new Set(), 고를: {}, 흐르는: {}, 통화: {}, 부재: {}, 다시: {}, 프로필: {}, 번호: 0 },
  };
}
const 오늘 = () => 자료.날[날];
// 예약: "켠 뒤 N초" 같은 것. 켜져 있는 시간(판.켠초)으로 세고 판에 저장해서 절전, 새로 고침 뒤에도 남는다. 그날이 지나면 버린다
// 예약일[일](id): 메신저.js 친구추가, 사건.js 사건, 사건강제
const 예약일 = {};
function 예약(초, 일, id) { (판.예약 ||= []).push([(판.켠초 || 0) + Math.max(0, 초), 일, id, 날]); }
setInterval(() => {
  if (!판.켜짐) return;
  판.켠초 = (판.켠초 || 0) + 1;
  const 된 = (판.예약 || []).filter(r => r[0] <= 판.켠초); if (!된.length) return;
  판.예약 = 판.예약.filter(r => r[0] > 판.켠초);
  된.forEach(([, 일, id, 그날]) => { if (그날 === 날) 예약일[일]?.(id); });
}, 1000);

// ── 화면 맞추기 ──
let 배율 = 1;
function 맞춤() { 배율 = Math.min(innerWidth / 1920, innerHeight / 1080); const s = $('#stage'); s.style.transform = `scale(${배율})`; s.style.left = (innerWidth - 1920 * 배율) / 2 + 'px'; s.style.top = (innerHeight - 1080 * 배율) / 2 + 'px'; }
addEventListener('resize', 맞춤); 맞춤();

// ── 창 관리 ──
let 층 = 10;
const 창 = id => $('#w-' + id);
const 보임 = id => { const w = 창(id); return !w.classList.contains('hide') && !w.classList.contains('min'); };
const 앞에있음 = id => 보임(id) && 창(id).classList.contains('top');
function 앞(id) {
  document.querySelectorAll('.win').forEach(w => w.classList.remove('top'));
  const w = 창(id); w.style.zIndex = ++층; w.classList.add('top');
  작업줄();
}
function 열(id) {
  const w = 창(id); if (!w || !판.켜짐) return; w.classList.remove('hide', 'min'); 앞(id);
  if (id === 'pc') 탐색('pc'); if (id === 'bin') 휴지통그리기(); if (id === 'coco' || id === 'chat') 코코그리기();
}
function 작업줄() {
  document.querySelectorAll('.ap[data-app]').forEach(a => {
    const w = 창(a.dataset.app);
    a.classList.toggle('run', !w.classList.contains('hide'));
    a.classList.toggle('act', w.classList.contains('top') && 보임(a.dataset.app));
  });
}
document.querySelectorAll('.win').forEach(w => {
  const id = w.id.slice(2);
  w.addEventListener('mousedown', () => { if (!w.classList.contains('top')) 앞(id); });
  w.querySelectorAll('[data-act]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const a = b.dataset.act;
    if (a === 'min') { w.classList.add('min'); w.classList.remove('top'); }
    if (a === 'close' && id === 'live') { 알림('지금은 끊을 수 없습니다'); return; } // 영상통화는 끊기 단추와 같다
    if (a === 'close') { w.classList.add('hide'); w.classList.remove('top'); }
    if (a === 'max') w.classList.toggle('max');
    작업줄();
  });
  // 가장자리, 모서리를 끌어 크기 바꾸기 (최대화 중에는 안 됨)
  w.insertAdjacentHTML('beforeend', ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => `<i class="rz rz-${d}" data-rz="${d}"></i>`).join(''));
  w.querySelectorAll('.rz').forEach(r => r.addEventListener('mousedown', e => {
    if (w.classList.contains('max')) return;
    e.preventDefault(); e.stopPropagation(); 앞(id);
    const d = r.dataset.rz, x0 = e.clientX, y0 = e.clientY, l0 = w.offsetLeft, t0 = w.offsetTop, w0 = w.offsetWidth, h0 = w.offsetHeight, 최소w = 360, 최소h = 240;
    const 이동 = m => {
      const dx = (m.clientX - x0) / 배율, dy = (m.clientY - y0) / 배율;
      if (d.includes('e')) w.style.width = Math.max(최소w, w0 + dx) + 'px';
      if (d.includes('s')) w.style.height = Math.max(최소h, Math.min(1032 - t0, h0 + dy)) + 'px';
      if (d.includes('w')) { const nw = Math.max(최소w, w0 - dx); w.style.width = nw + 'px'; w.style.left = l0 + w0 - nw + 'px'; }
      if (d.includes('n')) { const nh = Math.max(최소h, Math.min(h0 + t0, h0 - dy)); w.style.height = nh + 'px'; w.style.top = t0 + h0 - nh + 'px'; }
    };
    const 끝 = () => { removeEventListener('mousemove', 이동); removeEventListener('mouseup', 끝); document.body.style.cursor = ''; };
    document.body.style.cursor = getComputedStyle(r).cursor;
    addEventListener('mousemove', 이동); addEventListener('mouseup', 끝);
  }));
  const 손잡이 = w.querySelector('[data-drag]');
  손잡이.addEventListener('dblclick', e => { if (!e.target.closest('button,.tab')) w.classList.toggle('max'); });
  손잡이.addEventListener('mousedown', e => {
    if (e.target.closest('button') || w.classList.contains('max')) return;
    const x0 = e.clientX, y0 = e.clientY, l0 = w.offsetLeft, t0 = w.offsetTop;
    const 이동 = m => { w.style.left = l0 + (m.clientX - x0) / 배율 + 'px'; w.style.top = Math.max(0, t0 + (m.clientY - y0) / 배율) + 'px'; };
    const 끝 = () => { removeEventListener('mousemove', 이동); removeEventListener('mouseup', 끝); };
    addEventListener('mousemove', 이동); addEventListener('mouseup', 끝);
  });
});
document.querySelectorAll('.ap[data-app]').forEach(a => a.onclick = () => {
  const id = a.dataset.app, w = 창(id);
  if (w.classList.contains('top') && 보임(id)) { w.classList.add('min'); w.classList.remove('top'); 작업줄(); }
  else 열(id);
});
$('#icons').addEventListener('click', e => document.querySelectorAll('.ic').forEach(i => i.classList.toggle('sel', i === e.target.closest('.ic'))));
$('#icons').addEventListener('dblclick', e => {
  const ic = e.target.closest('.ic'); if (!ic) return;
  if (ic.dataset.file) { 파일열기(폴더파일(ic.dataset.folder).find(f => f.이름 === ic.dataset.file)); return; }
  열(ic.dataset.open); if (ic.dataset.folder) 탐색(ic.dataset.folder);
});
function 바탕그리기() {
  $('#icons').insertAdjacentHTML('beforeend', 자료.바탕화면.map(x => x.파일
    ? `<div class="ic" data-open="pc" data-folder="${x.폴더}" data-file="${x.파일}" draggable="true" data-drag-file="${x.폴더}
${x.파일}"><svg viewBox="0 0 48 48"><path d="M11 4h19l9 9v31H11z" fill="#fff"/><path d="M30 4v9h9" fill="#dfe3e8"/><rect x="15" y="22" width="20" height="14" rx="2" fill="#2f7fd6"/><path d="M19 26h12M19 30h9" stroke="#fff" stroke-width="2"/></svg><span class="nm">${x.이름}</span></div>`
    : `<div class="ic" data-open="pc" data-folder="${x.폴더}"><svg viewBox="0 0 48 48"><path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#f2c14e"/><path d="M4 18h40v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#ffd767"/></svg>${x.이름}</div>`).join(''));
}
$('#stage').addEventListener('mousedown', e => {
  if (e.target.id === 'stage') document.querySelectorAll('.ic').forEach(i => i.classList.remove('sel'));
  if (!e.target.closest('#start,#startBtn')) $('#start').classList.add('hide');
  if (!e.target.closest('#wifi,#wfBtn')) $('#wifi').classList.add('hide');
  if (!e.target.closest('#ctx')) $('#ctx').classList.add('hide');
});

// ── 알림 ──
function 알림(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(알림.h); 알림.h = setTimeout(() => el.classList.remove('on'), 2600); }
// 알림 왼쪽 위 앱 아이콘: 윈도, 카톡, 에타(학교 앱), 그 밖은 첫 글자
function 알림아이콘(어디) {
  const 윈 = '<svg viewBox="0 0 16 16"><path d="M1 1h6.5v6.5H1zM8.5 1H15v6.5H8.5zM1 8.5h6.5V15H1zM8.5 8.5H15V15H8.5z" fill="#4cc2ff"/></svg>';
  if (!어디 || 어디 === 'Windows') return 윈;
  if (어디 === 앱이름?.()) return '<svg viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#fee500"/><path d="M8 3.6c-2.7 0-4.8 1.7-4.8 3.8 0 1.4.9 2.5 2.2 3.2L5 12.6l2.2-1.3H8c2.7 0 4.8-1.7 4.8-3.8S10.7 3.6 8 3.6z" fill="#3c1e1e"/></svg>';
  return `<b>${막음([...어디][0] || '?')}</b>`;
}
function 띄움(어디, 제목, 글, 누르면) {
  if (자막중()) { 자막줄.then(() => 띄움(어디, 제목, 글, 누르면)); return; } // 독백 검은 띠가 아래를 가리니 끝난 뒤에
  $('#osApp').textContent = 어디 || '알림'; $('#osIc').innerHTML = 알림아이콘(어디); $('#osT').textContent = 제목; $('#osP').textContent = 글;
  $('#os').classList.add('on'); 소리.알림();
  $('#os').onclick = () => { $('#os').classList.remove('on'); typeof 누르면 === 'function' ? 누르면() : 누르면 && 열(누르면); };
  clearTimeout(띄움.h); 띄움.h = setTimeout(() => $('#os').classList.remove('on'), 4200);
}

// ── 주인공 1 대사: 영화 자막, 타이핑하듯 ──
let 자막줄 = Promise.resolve();
let 자막수 = 0; const 자막중 = () => 자막수 > 0; // 줄을 서 있는 독백도 센다
function 자막(줄) { if (!줄?.length) return 자막줄; 자막수++; return 자막줄 = 자막줄.then(async () => { try {
  const s = $('#sub'), t = $('#subT'); s.classList.add('on'); $('#stage').classList.add('sub-on'); await 쉼(빠름 ? 60 : 450); // sub-on: 알림, 전화 창을 검은 띠 위로 올린다
  for (const x of 줄) {
    t.textContent = ''; t.classList.add('on');
    for (let i = 0; i < x.length; i++) { t.textContent = x.slice(0, i + 1); if (x[i] !== ' ' && x[i] !== '…' && i % 2 === 0) 소리.타자(); await 쉼(빠름 ? 8 : x[i] === '…' ? 220 : 70); }
    await 쉼(빠름 ? 200 : 900 + x.length * 30); t.classList.remove('on'); await 쉼(빠름 ? 60 : 260);
  }
  s.classList.remove('on'); await 쉼(빠름 ? 40 : 300);
} finally { 자막수--; if (!자막수) $('#stage').classList.remove('sub-on'); } }); }

// ── 대화 상자. 정체 모를 창은 제목이 없다. { 제목 } 이면 시스템 창, { 섞기 } 이면 가끔 버튼 자리가 바뀐다 ──
let 창줄 = Promise.resolve();
function 묻기(물음, 고르기, 시간 = 0, 기본, 덧 = {}) { const 차례 = 창줄.then(() => new Promise(res => {
  const o = $('#odd'), bar = $('#oddT'), i = bar.querySelector('i');
  const [머리, ...몸] = (물음 || '').split('\n');
  $('#oddH').textContent = 머리; $('#oddQ').textContent = 몸.join('\n');
  o.classList.toggle('sys', !!덧.제목);
  const x = o.querySelector('.odd-tb button'); x.disabled = !덧.제목; x.onclick = () => 묻기.닫기?.();
  $('#oddTi').innerHTML = 덧.제목 ? `<svg width="14" height="14" viewBox="0 0 24 24"><rect x="2" y="2" width="9.5" height="9.5" fill="#4cc2ff"/><rect x="12.5" y="2" width="9.5" height="9.5" fill="#4cc2ff"/><rect x="2" y="12.5" width="9.5" height="9.5" fill="#4cc2ff"/><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#4cc2ff"/></svg>${덧.제목}` : '';
  const 순서 = 덧.섞기 && Math.random() < .4 ? [...고르기].reverse() : 고르기;
  $('#oddC').innerHTML = 순서.map(([k, t]) => `<button data-k="${k}">${t}</button>`).join(''); $('#oddC').classList.toggle('col', !!덧.세로);
  o.classList.remove('hide', 'pop'); void o.offsetWidth; o.classList.add('pop'); 소리.딸깍();
  let h;
  const 끝 = k => { clearTimeout(h); o.classList.add('hide'); bar.classList.remove('on'); 묻기.닫기 = null; res(k); };
  묻기.닫기 = () => 끝(기본);
  $('#oddC').onclick = e => { const b = e.target.closest('button'); if (b) 끝(b.dataset.k); };
  if (시간) { bar.classList.add('on'); i.style.transition = 'none'; i.style.width = '100%'; void i.offsetWidth; i.style.transition = `width ${시간}s linear`; i.style.width = '0'; h = setTimeout(() => 끝(기본), 시간 * 1000); }
})); 창줄 = 차례.catch(() => {}); return 차례; }

// ── 시계 ──
let 초 = 0;
function 시계() {
  const h = Math.floor(초 / 3600) % 24, m = Math.floor(초 / 60) % 60;
  $('#clk').textContent = `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${둘(m)}`; $('#date').textContent = 오늘().날짜;
  $('#lvTime') && ($('#lvTime').textContent = `${오늘().날짜} ${둘(h)}:${둘(m)}:${둘(초 % 60)}`);
}
const 지금시각 = () => `${둘(Math.floor(초 / 3600) % 24)}:${둘(Math.floor(초 / 60) % 60)}`;
// 하루 끝 시각 (날마다 툴에서): 게임 시계가 그 시각이 되면 알림창 → 강제로 꺼진다 (다음 날로). 통화 중이면 끝날 때까지 기다린다
// 그날 시각("HH:MM")을 그날 시작부터 센 초로 (자정을 넘기면 다음 날로). 이상한 글자면 NaN
const 그날초 = 시각 => { const d = 오늘(), [a, b] = String(시각 || '').split(':').map(Number), 시작 = d.시작[0] * 3600 + d.시작[1] * 60; let t = a * 3600 + b * 60; if (t <= 시작) t += 86400; return t; };
// 배터리: 끝 시각이 있는 날은 켤 때 100% 에서 끝 시각에 3% 로 준다 (시계와 같이). 없으면 82% (사건 "전원 연결됨" 이면 충전 중)
function 배터리() { const d = 오늘(), 끝 = 그날초(d?.끝); if (!d?.끝 || isNaN(끝)) return 82; const 시작 = d.시작[0] * 3600 + d.시작[1] * 60; return Math.max(3, Math.round(100 - (초 - 시작) / (끝 - 시작) * 97)); }
async function 끝시각확인() {
  const d = 오늘(); if (!판.켜짐 || !d) return;
  트레이그리기?.();
  // 미리 경고 (한 번, 꺼지지는 않음)
  const 경고 = 그날초(d.경고); if (d.경고 && !isNaN(경고) && 초 >= 경고 && 판.경고알림 !== 날) { 판.경고알림 = 날; 띄움('Windows', '배터리 부족', d.경고알림 || `배터리가 ${배터리()}% 남았습니다`); }
  if (!d.끝 || 판.끝알림 === 날) return;
  const 끝 = 그날초(d.끝); if (isNaN(끝)) return;
  if (초 < 끝) return;
  판.끝알림 = 날; const 그날 = 날;
  while (코코통화중() || 울리는) await 쉼(500);
  if (날 !== 그날) return; // 기다리는 사이 다른 일로 다음 날이 됐으면 안 끈다
  if (!판.켜짐) { 판.끝알림 = -1; return; } // 절전했으면 깰 때 다시
  await 묻기(d.끝알림 || '시스템 종료\n잠시 후 시스템이 종료됩니다.', [['확인', '확인']], 빠름 ? 1 : 15, '확인', { 제목: 'Windows' });
  if (날 !== 그날) return;
  if (!판.켜짐) { 판.끝알림 = -1; return; }
  끄기();
}
const 오늘날 = () => 오늘().날짜.slice(2).replace(/-/g, '/');
// 게임 시계는 가만히 있으면 안 가고, 플레이어가 행동할 때만 간다 (턴처럼. 선배 2026-11-04)
// 행동마다 몇 분인지는 툴 기본 설정 > 게임 시계 (자료.시간). "켠 뒤 N초", 제한 시간 같은 건 진짜 초 그대로
const 시간기본 = { 글읽기: 3, 글쓰기: 10, 댓글: 2, 쪽지: 2, 메시지: 1, 통화: 5, 기록: 1, 파일: 1 };
let 자동중 = false; // 선택지 시간 초과로 저절로 보낸 말은 행동이 아니라 시계가 안 간다 (메신저.js)
function 시간가기(일) {
  if (!판.켜짐 || 자동중 || 판.덮.시계멈춤 > Date.now()) return; // 사건 "시계 이상 · 멈춤" 동안은 안 간다
  초 += ({ ...시간기본, ...(자료.시간 || {}) }[일] || 0) * 60; 시계(); 끝시각확인();
}
// 할 게 없을 때 자막 (날마다 "멈춤", 툴 기본 설정): 시계는 행동할 때만 가서, 할 게 떨어지면 하루가 안 끝난다.
// 읽을 글이 없거나 와이파이가 끊겼고, 메시지·선택지·전화·사건·독백도 없이 게임 시계가 멈춤초(진짜 초) 동안 그대로면 그날 한 번 띄운다
let 멈춘초 = 0, 멈춘시계 = -1;
setInterval(() => {
  if (!판?.켜짐 || !자료 || 자동중) return;
  const 줄 = 오늘()?.멈춤; if (!줄?.length || 판.멈춤봄 === 오늘().날) return;
  const 바쁨 = 자막중() || Object.keys(고르기들).length || 울리는 || 통화중 || [...도는흐름].some(i => !기다리는흐름.has(i)) || 도는사건.size;
  const 남은글 = !판.끊김 && 글들().some(p => !판.불러온.has(p.id) && !p.내것);
  if (초 !== 멈춘시계 || 바쁨 || 남은글) { 멈춘시계 = 초; 멈춘초 = 0; return; }
  if (++멈춘초 < (자료.멈춤초 ?? 40)) return;
  판.멈춤봄 = 오늘().날; 자막(줄);
}, 1000);

// ── 복사, 붙여넣기: 캠링 글을 복사해서 기록.txt 나 쪽지에 붙여 넣는다. 오른쪽 클릭 메뉴도 같은 일을 한다 ──
let 클립 = '', 클립그림 = null; // 클립그림: 오른쪽 클릭으로 복사한 에타 사진 { 이름, 사진 }
const 고른글 = () => String(getSelection()).trim();
document.addEventListener('copy', () => { const t = 고른글(); if (t) { 클립 = t; 클립그림 = null; } });
document.addEventListener('cut', e => { const el = e.target; if (el.value != null) 클립 = el.value.slice(el.selectionStart, el.selectionEnd); });
function 붙이기(el, t) {
  if (!t) return;
  el.focus(); const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b); el.selectionStart = el.selectionEnd = a + t.length;
  el.dispatchEvent(new Event('input'));
}
async function 클립읽기() { try { const t = await navigator.clipboard.readText(); if (t) return t; } catch (e) {} return 클립; }
function 클립쓰기(t) { 클립 = t; 클립그림 = null; try { navigator.clipboard.writeText(t); } catch (e) {} }
$('#stage').addEventListener('contextmenu', e => {
  e.preventDefault(); if (!판.켜짐) return;
  const 칸 = e.target.closest('textarea, input:not([type])'), 고른 = 고른글(), 이름 = e.target.closest('[data-dm]'), 그림 = e.target.closest('.cm-text img');
  const 줄 = [];
  if (그림) {
    const 사진 = { 이름: decodeURIComponent(그림.getAttribute('src').split('/').pop()), 사진: 그림.getAttribute('src') };
    줄.push(['이미지 복사', '', true, () => { 클립그림 = 사진; 알림('이미지를 복사했습니다'); }]);
    줄.push(['이미지 저장', '', true, () => 사진저장(사진)]);
  } else if (칸) {
    const 있음 = 칸.selectionStart !== 칸.selectionEnd;
    줄.push(['잘라내기', 'Ctrl+X', 있음, () => { 클립쓰기(칸.value.slice(칸.selectionStart, 칸.selectionEnd)); 붙이기(칸, ''); }]);
    줄.push(['복사', 'Ctrl+C', 있음, () => 클립쓰기(칸.value.slice(칸.selectionStart, 칸.selectionEnd))]);
    줄.push(['붙여넣기', 'Ctrl+V', true, async () => 클립그림 ? (칸.id === 'chIn' ? 코코사진붙임() : 알림('이미지는 여기에 붙여 넣을 수 없습니다')) : 붙이기(칸, await 클립읽기())]);
    줄.push(0, ['모두 선택', 'Ctrl+A', true, () => { 칸.focus(); 칸.select(); }]);
  } else {
    줄.push(['복사', 'Ctrl+C', !!고른, () => { 클립쓰기(고른); 알림('복사했습니다'); }]);
    줄.push(['기록.txt 에 붙여넣기', '', !!고른, () => { 기록추가(고른); 알림('기록.txt 에 붙여 넣었습니다'); }]);
    if (이름) 줄.push(0, [`${이름.dataset.name} 에게 쪽지`, '', true, () => 쪽지열기(이름.dataset.dm, 이름.dataset.name, 이름.dataset.human === '1')]);
  }
  사건메뉴(e, 줄);
  if (!줄.length) return;
  const m = $('#ctx');
  m.innerHTML = 줄.map((x, i) => x ? `<button data-i="${i}" ${x[2] ? '' : 'disabled'}>${x[0]}<small>${x[1]}</small></button>` : '<hr>').join('');
  m.onclick = ev => { const b = ev.target.closest('button[data-i]'); if (!b) return; m.classList.add('hide'); 줄[+b.dataset.i][3](); };
  const r = $('#stage').getBoundingClientRect();
  m.style.left = Math.min((e.clientX - r.left) / 배율, 1920 - 200) + 'px'; m.style.top = Math.min((e.clientY - r.top) / 배율, 1080 - 200) + 'px';
  m.classList.remove('hide');
});

// ── 커뮤니티 ──
const 맨글 = s => s.replace(/\{[ca]\|([^|]+)\|[^}]+\}/g, '$1').replace(/==(.+?)==/g, '$1');
const 막음 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const 보임글 = s => 막음(맨글(s));
// 형광펜: 툴의 에타 본문에 ==이렇게== 감싼 부분. 글을 처음 열면 자막이 끝난 뒤 형광펜 소리와 함께 첫 글자부터 한 글자씩 칠해진다 (판.형광 에 그은 글 id).
// 글자마다 <span> 이라 칠하는 차례를 정할 수 있다. 복사하면 == 는 안 따라온다
const 형광글 = s => s.replace(/\{[ca]\|([^|]+)\|[^}]+\}/g, '$1').split(/==(.+?)==/).map((조각, i) => i % 2 ? `<mark class="hl">${[...조각].map(c => `<span>${막음(c)}</span>`).join('')}</mark>` : 막음(조각)).join('');
const 형광칸 = () => [...document.querySelectorAll('#cmMain .cm-text mark.hl')];
// 사건이 한 단계 끝날 때마다 보던 글을 다시 그린다. 칠하는 도중이면 칠한 데까지 바로 칠해 두고 이어서 칠한다
let 긋는중 = null; // { id, 칠한: 지금까지 칠한 글자 수 }
const 칠한데까지 = n => 형광칸().flatMap(m => [...m.children]).forEach((c, i) => { if (i < n && !c.classList.contains('on')) { c.style.transition = 'none'; c.classList.add('on'); } });
async function 형광펜긋기(p) {
  const 칠할 = 형광칸(); if (!칠할.length) return;
  if (긋는중?.id === p.id) { 칠한데까지(긋는중.칠한); return; }
  if (판.형광?.[p.id]) { 칠할.forEach(m => m.classList.add('done')); return; } // 한 번 그은 글은 바로 칠해져 있다
  await 쉼(빠름 ? 400 : 900); await 자막줄; // 글을 연 뒤 사건(그 글을 읽은 뒤, 0.5초 뒤)이 자막을 걸면 그 자막이 끝나기를 기다린다
  if (연글 !== p || 긋는중?.id === p.id || 판.형광?.[p.id]) return; // 다른 글로 넘어갔거나, 이미 긋는 중
  (판.형광 ||= {})[p.id] = 1; 긋는중 = { id: p.id, 칠한: 0 };
  const 한글자 = 빠름 ? 5 : 40; // 한 글자 칠하는 데 걸리는 ms
  try {
    for (const 수 of 칠할.map(m => m.children.length)) { // 형광펜 한 줄씩 차례로
      소리.형광펜(수 * 한글자 / 1000 + .15);
      for (let k = 0; k < 수; k++) {
        if (연글 !== p) return; // 다른 글로 넘어감 (다음에 열면 칠해져 있다)
        const c = 형광칸().flatMap(m => [...m.children])[긋는중.칠한]; // 다시 그려졌어도 지금 화면의 그 글자
        c?.classList.add('on'); 긋는중.칠한++; await 쉼(한글자);
      }
      await 쉼(빠름 ? 30 : 250);
    }
  } finally { 긋는중 = null; }
}
function 풀기(p) {
  let q = p;
  // 판들: 조건이 맞는 첫 판의 본문과 댓글로 바뀐다
  const 판번호 = (p.판들 || []).findIndex(x => 조건맞음(x.조건));
  if (판번호 !== -1) {
    const 판1 = p.판들[판번호];
    let 댓글 = 판1.댓글 ?? p.댓글;
    // 새 게시글의 판이 바뀌며 덧붙은 댓글은 전환 시각을 기록한다. 기존 댓글의 시각은 유지한다.
    if (p.올라옴 && 댓글.slice(p.댓글.length).some(c => !c[2])) {
      const [날, 시] = 판.올라온[`댓글:${p.id}:${판번호}`] ||= [오늘날(), 지금시각()];
      댓글 = 댓글.map((c, i) => i < p.댓글.length || c[2] ? c : [c[0], c[1], 시, c[3], c[4], c[5], c[6] ?? 0, `${날} `]);
    }
    q = { ...p, 본문: 판1.본문 ?? p.본문, 댓글 };
  }
  return 판.더한[p.id] ? { ...q, 댓글: [...q.댓글, ...판.더한[p.id]] } : q;
}
// "조건": 모두 맞아야 한다 (글이 보임, 메신저 흐름과 전화가 옴). 앞에 ! 를 붙이면 반대
//   읽음:14 그 글을 읽었다 · 정보:키 그 정보를 안다 · 장면:id 그 장면을 지났다 · 날:2 2일차부터 · 시각:03:30 게임 시계가 그 뒤
//   친구:id 카카오톡 친구다 · 흐름:id 그 메신저 흐름이 왔다 · 통화:id 그 영상통화를 끝까지 했다 · 통화:id=안받음 끝까지 안 받았다
//   사건:X-001 그 사건이 일어났다 · 답:X-001=키 그 사건의 묻는 창에서 그 보기를 골랐다
function 조건맞음(조건) {
  return (조건 || []).every(t => {
    const 아님 = t.startsWith('!'), 몸 = t.replace(/^!/, ''), 칸 = 몸.indexOf(':');
    const 종류 = 칸 < 0 ? 몸 : 몸.slice(0, 칸), 값 = 칸 < 0 ? '' : 몸.slice(칸 + 1), [k, v] = 값.split('=');
    const 맞음 = { 장면: () => 판.지난.has(값), 정보: () => 정보됨(값),
      읽음: () => 판.불러온.has(+값), 날: () => 오늘().날 >= +값, 시각: () => 지금시각() >= 값,
      친구: () => 판.코코.친구.has(값), 흐름: () => 판.코코.지난.has(값), 통화: () => 판.코코.통화[k] === (v || '끝'),
      사건: () => 판.사건.has(값), 답: () => 판.답?.[k] === v }[종류]?.() ?? true;
    return 아님 ? !맞음 : 맞음;
  });
}
// 정보: 데이터 "정보" [{ 키, 글: [글 id], 문구: [..] }]. 글을 다 읽었고, 문구 하나라도 기록.txt 에 있으면 안다 (띄어쓰기 무시)
function 정보됨(키) {
  const x = (자료.정보 || []).find(y => y.키 === 키); if (!x) return false;
  const 기록 = 판.기록.replace(/\s+/g, '');
  return [].concat(x.글 ?? []).every(id => 판.불러온.has(+id)) && (!x.문구?.length || x.문구.some(m => m && 기록.includes(m.replace(/\s+/g, ''))));
}
const 판숨음 = k => (자료.숨긴판 || []).includes(k) && !(판.덮.판 || []).includes(k); // 사건 "새 게시판" 으로 나타남
// 올라옴 글: 조건이 처음 맞은 순간의 날짜와 시각이 글 시각이 된다 (판.올라온에 남음). 시각이 빈 댓글은 글 시각
const 올라온시각 = p => { if (!p.올라옴) return p; if (!판.올라온[p.id]) 새로올라옴 = true; const t = 판.올라온[p.id] ||= [오늘날(), 지금시각()]; return { ...p, 날: t[0], 시: t[1], 댓글: (p.댓글 || []).map(c => c[2] ? c : [c[0], c[1], t[1], ...c.slice(3)]) }; };
// 화면 하나를 그리는 동안(판목록, 판보기)은 글 목록을 한 번만 계산해 같이 쓴다. 그리는 동안은 판이 안 바뀐다. 끝나면 버린다
let 글잠깐 = null;
const 글들 = () => 글잠깐 || 글계산();
const 한번에 = f => { if (글잠깐) return f(); 글잠깐 = 글계산(); try { return f(); } finally { 글잠깐 = null; } };
const 글계산 = () => [...자료.글.filter(p => (!p.새날 || p.새날 <= 오늘().날) && !판숨음(p.판) && 조건맞음(p.조건)), ...판.내글].map(풀기).map(올라온시각);
let 새로올라옴 = false;
// 조건이 맞은 순간 올라온 시각을 기록하고, 열어 둔 목록에도 새 글을 보인다.
setInterval(() => {
  if (!판.켜짐 || !자료?.글) return;
  한번에(() => {
    if (!새로올라옴) return;
    새로올라옴 = false;
    if (쪽 !== 'board') { 판목록(); return; }
    const 스크롤 = $('#cmMain').scrollTop;
    판보기몸(지금판);
    $('#cmMain').scrollTop = 스크롤;
  });
}, 1000);
const 찾기 = id => 글들().find(p => p.id === +id);
const 사람수 = p => p.댓글수 ?? p.댓글.filter(c => c[4] !== 0).length;
const 수 = p => `<span class="cm-cnt"><span class="g">공감 ${p.공감}</span><span class="c">댓글 ${사람수(p)}</span><span class="s">스크랩 ${p.스크랩 + (판.스크랩.has(p.id) ? 1 : 0)}</span></span>`;
const 특별판 = { hot: 'HOT 게시물', 'my-write': '내가 쓴 글', 'my-read': '내가 읽은 글', 'my-cmt': '댓글 단 글', 'my-scrap': '스크랩' };
let 검색어 = ''; // 전체 게시판 검색: 특별판.검색 으로 결과 목록을 판처럼 보인다
const 판이름 = k => 특별판[k] || 자료.게시판.find(b => b[0] === k)?.[1] || k; // 없는 게시판 키여도 안 죽게
const 정렬 = a => a.slice().sort((x, y) => (y.날 + y.시).localeCompare(x.날 + x.시));
let 지금판 = 'all', 연글 = null, 쪽 = 'board';
// 쪽지 상대: 고닉은 고정 id, 익명은 글과 댓글 자리로 id 를 만든다. 사람인지는 댓글 수 규칙과 같다
const 고닉id = n => 자료.쪽지.고닉[n];
const 글쓴이id = p => p.고닉 ? 고닉id(p.고닉) : `p${p.id}`;
// 쪽지는 데이터의 쪽지 상대(툴에서 "쪽지 받음" 을 켠 고닉)에게만 보낼 수 있다. 이름 없는 익명에게는 못 보낸다
const 쪽지됨 = id => (자료.쪽지.상대 || []).some(x => x.id === id);
const 이름칸 = (이름, id, 사람, 클래스 = '') => 쪽지됨(id) ? `<b class="${클래스}" data-dm="${id}" data-name="${막음(이름)}" data-human="${사람 ? 1 : 0}" title="눌러서 쪽지 보내기">${막음(이름)}</b>` : `<b class="${클래스}">${막음(이름)}</b>`;

function 사이트() {
  const 학 = 자료.학교;
  $('#site').innerHTML = `<div class="cm-site">
    <div class="cm-top"><div class="cm-logo" id="cmHome"><i></i><div><b>${막음(학.앱)}</b><small>${학.이름} ${학.캠퍼스}</small></div></div>
      <nav class="cm-nav" id="cmNav"><a data-page="board">게시판</a><a data-page="dm">쪽지함 <span id="navDm"></span></a><a data-page="tt">시간표</a><a data-page="rv">강의평</a></nav>
      <div class="cm-find">⌕ <input id="q" placeholder="전체 게시판 검색"></div><div class="cm-me">나</div></div>
    <div class="cm-body" id="cmBody">
      <nav class="cm-boards" id="boards"></nav>
      <main class="cm-main" id="cmMain"></main>
      <aside class="cm-side">
        <div class="cm-card cm-sb"><h4>HOT 게시물 <small data-board="hot" style="cursor:pointer">더 보기</small></h4><div id="hot"></div></div>
        <div class="cm-card cm-sb"><h4>쪽지 <small data-page="dm" style="cursor:pointer">쪽지함</small></h4><div id="dmMini"></div></div>
        <div class="cm-card cm-sb"><h4>오늘 시간표 <small data-page="tt" style="cursor:pointer">전체</small></h4><div id="ttMini"></div></div>
      </aside>
    </div></div>
    <div class="offline hide" id="offline"></div>`;
  $('#cmHome').onclick = () => 판보기('all');
  $('#q').onkeydown = e => { if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (!v) return; 검색어 = v; 특별판.검색 = `'${v}' 검색 결과`; 판보기('검색'); };
}
function 주소바꿈(p, 길) {
  $('#pdfV').classList.add('hide'); // 게시판으로 가면 끌어다 연 파일은 닫힌다
  $('#urlPath').textContent = `/${자료.학교.주소}/${길 || (p ? p.판 + '/' + p.id : 지금판)}`;
  $('#tabTitle').textContent = p ? `${p.제목} - ${자료.학교.앱}` : 길 ? `${{ timetable: '시간표', lecture: '강의평', message: '쪽지함', write: '글쓰기' }[길]} - ${자료.학교.앱}` : `${판이름(지금판)} - ${자료.학교.앱}`;
}
function 판목록() { return 한번에(판목록몸); }
function 판목록몸() {
  const 새 = k => 글들().some(p => (k === 'all' || p.판 === k) && (p.새날 === 오늘().날 || p.올라옴 && !판.불러온.has(p.id))); // 조건으로 올라온 글도 안 읽었으면 N
  const 칸 = (k, n) => `<a data-board="${k}" class="${k === 지금판 && 쪽 === 'board' ? 'on' : ''}">${n}${새(k) && k !== 'all' ? '<i>N</i>' : ''}</a>`;
  $('#boards').innerHTML = `<h6>게시판</h6>` + 자료.게시판.map(([k, n]) => 칸(k, n)).join('') + 칸('hot', 'HOT 게시물') +
    `<h6>내 활동</h6>` + ['my-write', 'my-read', 'my-cmt', 'my-scrap'].map(k => 칸(k, 특별판[k])).join('') + `<a data-page="dm" class="${쪽 === 'dm' ? 'on' : ''}">쪽지함${안읽은합() ? `<i>${안읽은합()}</i>` : ''}</a>`;
  $('#hot').innerHTML = 핫글().slice(0, 4).map(p => `<a data-post="${p.id}">${막음(p.제목)}</a>`).join('');
  document.querySelectorAll('#cmNav a').forEach(a => a.classList.toggle('on', a.dataset.page === (쪽 === 'post' || 쪽 === 'write' ? 'board' : 쪽)));
  const 요일 = '일월화수목금토'[new Date(오늘().날짜).getDay()];
  const 오늘수업 = 자료.시간표.과목.filter(x => x[0] === 요일);
  $('#ttMini').innerHTML = 오늘수업.length ? 오늘수업.map(x => `<a data-page="tt">${x[1]}:00 ${x[3]}</a>`).join('') : '<p class="cm-none" style="padding:4px 0">오늘은 수업이 없습니다</p>';
  const 최근 = Object.keys(판.쪽지).filter(k => 판.쪽지[k].length).slice(-3).reverse();
  $('#dmMini').innerHTML = 최근.length ? 최근.map(k => `<a data-thread="${k}">${판.상대[k].이름}${판.안읽은[k] ? ` <b style="color:var(--red)">${판.안읽은[k]}</b>` : ''}</a>`).join('') : '<p class="cm-none" style="padding:4px 0">받은 쪽지가 없습니다</p>';
  $('#navDm').textContent = 안읽은합() || '';
}
const 핫글 = () => 글들().filter(p => p.공감 >= 자료.HOT기준).sort((a, b) => b.공감 - a.공감);
function 판글(k) {
  if (k === 'hot') return 핫글();
  if (k === '검색') return 정렬(글들().filter(p => 검색어 && (p.제목 + 맨글(p.본문)).includes(검색어)));
  if (k === 'my-write') return 정렬(판.내글.map(풀기));
  if (k === 'my-read') return 정렬(글들().filter(p => 판.불러온.has(p.id)));
  if (k === 'my-cmt') return 정렬(글들().filter(p => 판.댓단글.has(p.id)));
  if (k === 'my-scrap') return 정렬(글들().filter(p => 판.스크랩.has(p.id)));
  return 정렬(글들().filter(p => k === 'all' || p.판 === k));
}
// 검색 결과: 찾은 말을 노랗게, 본문은 찾은 말이 든 줄을 보여 준다
const 빛 = (k, html) => k === '검색' && 검색어 ? html.split(막음(검색어)).join(`<mark>${막음(검색어)}</mark>`) : html;
const 찾은줄 = 본문 => { const 줄 = 보임글(본문).split('\n'); return 줄.find(x => x.includes(막음(검색어))) || 줄[0]; };
function 판보기(k) { return 한번에(() => 판보기몸(k)); }
function 판보기몸(k) {
  지금판 = k; 연글 = null; 쪽 = 'board'; 오프라인(0); 판목록(); 주소바꿈();
  const 목록 = 판글(k), 쓰기됨 = !특별판[k] || k === 'my-write';
  $('#cmMain').innerHTML = `<section class="cm-card"><div class="cm-bh"><h2>${판이름(k)}</h2><small>${자료.학교.이름} ${자료.학교.캠퍼스}</small>${쓰기됨 ? '<button class="on" id="toWrite">글쓰기</button>' : ''}</div>
    ${목록.map(p => `<div class="cm-row${판.불러온.has(p.id) || p.내것 ? ' seen' : ''}" data-post="${p.id}"><b>${빛(k, 막음(p.제목))}</b><p>${빛(k, k === '검색' ? 찾은줄(p.본문) : 보임글(p.본문).split('\n')[0])}</p><div class="cm-meta">${특별판[k] || k === 'all' ? `<span class="bd">${판이름(p.판)}</span>` : ''}<span>${p.날} ${p.시}</span><span class="${p.고닉 ? 'nick' : ''}">${p.고닉 || '익명'}</span>${수(p)}</div></div>`).join('') || `<p class="cm-none" style="padding:18px">${k === '검색' ? '검색 결과가 없습니다' : '글이 없습니다'}</p>`}</section>`;
  $('#cmMain').scrollTop = 0;
  $('#toWrite') && ($('#toWrite').onclick = () => 글쓰기화면(특별판[k] || k === 'all' ? 'free' : k));
}
function 글보기(id) {
  const p = 찾기(id); if (!p) return;
  if (!판.불러온.has(p.id) && !p.내것) {
    if (판.끊김) { 오프라인(p); return; }
    판.불러온.add(p.id); 판.읽음++; 와이파이그리기(); 시간가기('글읽기');
    setTimeout(() => 사건읽음(p.id), 빠름 ? 300 : 100); // "그 글을 읽은 뒤" 사건은 글을 열자마자. 자막 띠가 뜨는 0.45초를 더해 0.5초쯤 글자가 보인다 (2026-11-19, 1.8초에서 줄임)
    if (판.읽음 >= 자료.설정.와이파이) setTimeout(끊기, 빠름 ? 400 : 2600);
  }
  연글 = p; 쪽 = 'post'; 오프라인(0); 판목록(); 주소바꿈(p);
  const 쓴 = c => c[3] ? (p.고닉 ? `${p.고닉}(글쓴이)` : '익명(글쓴이)') : c[0];
  const 쓴이칸 = p.내것 ? '<b>익명 (나)</b>' : 이름칸(p.고닉 || '익명', 글쓴이id(p), true, p.고닉 ? 'nick' : '');
  $('#cmMain').innerHTML = `<section class="cm-card"><div class="cm-view">
    <button class="cm-back" data-board="${지금판}">← ${판이름(지금판)}</button>
    <div class="cm-who"><span class="pf"></span><div>${쓴이칸}<small>${p.날} ${p.시} · ${판이름(p.판)}</small></div></div>
    <h1>${막음(p.제목)}</h1><div class="cm-text">${형광글(p.본문)}${p.사진 ? `<img src="${p.사진}" alt="">` : ''}</div>
    ${수(p)}
    <div class="cm-acts"><button>공감</button><button id="scrapBtn" class="${판.스크랩.has(p.id) ? 'on' : ''}">스크랩</button>${p.내것 || !쪽지됨(글쓴이id(p)) ? '' : '<button id="dmBtn">쪽지</button>'}<button>신고</button></div></div>
    <div class="cm-cms" id="cms">${p.댓글.map((c, i) => 댓글칸(p, c, i, 쓴(c))).join('') || '<p class="cm-none">아직 댓글이 없습니다</p>'}</div>
    <div class="cm-cw"><input id="cIn" placeholder="${판.끊김 ? '인터넷에 연결되어 있지 않습니다' : '댓글을 입력하세요'}" ${판.끊김 ? 'disabled' : ''} maxlength="200"><button class="cm-btn" id="cGo" ${판.끊김 ? 'disabled' : ''}>등록</button></div></section>`;
  $('#cmMain').scrollTop = 0;
  형광펜긋기(p);
  $('#scrapBtn').onclick = () => 스크랩(p);
  $('#dmBtn') && ($('#dmBtn').onclick = () => 쪽지열기(글쓴이id(p), p.고닉 || `익명 (${p.제목.slice(0, 12)})`, true));
  const 보내기 = () => { const v = $('#cIn').value.trim(); if (v) 댓글쓰기(p, v); };
  $('#cGo').onclick = 보내기; $('#cIn').onkeydown = e => { if (e.key === 'Enter') 보내기(); };
}
function 댓글칸(p, c, i, 이름) {
  const 고닉 = !!고닉id(c[0]) && !c[3], 사람 = c[4] !== 0;
  const id = c[3] ? 글쓴이id(p) : 고닉 ? 고닉id(c[0]) : `p${p.id}c${i}`;
  const 칸 = c[6] ? `<b>${막음(이름)} (나)</b>` : 이름칸(이름, id, 사람, c[3] ? 'op' : 고닉 ? 'nick' : '');
  return `<div class="cm-c${c[5] ? ' re' : ''}${c[6] ? ' mine' : ''}">${칸}<p>${보임글(c[1])}</p><small>${c[7] || p.날 + ' '}${c[2]}</small></div>`;
}
// 이름을 누르면 쪽지
$('#site').addEventListener('click', e => {
  const n = e.target.closest('[data-dm]'); if (!n) return;
  e.stopPropagation(); 쪽지열기(n.dataset.dm, n.dataset.name, n.dataset.human === '1');
}, true);

function 스크랩(p) {
  if (판.스크랩.has(p.id)) { 판.스크랩.delete(p.id); 알림('스크랩을 취소했습니다'); }
  else { 판.스크랩.add(p.id); 기록추가(`[${자료.학교.앱} ${p.날} ${p.시}] ${p.제목}`); 알림('스크랩했습니다 · 기록.txt 에 제목을 적어 둠'); }
  $('#scrapBtn').classList.toggle('on', 판.스크랩.has(p.id));
  $('#cmMain .cm-view .cm-cnt').outerHTML = 수(p);
}

// ── 글쓰기, 댓글 ──
function 글쓰기화면(기본판) {
  쪽 = 'write'; 연글 = null; 오프라인(0); 판목록(); 주소바꿈(null, 'write');
  $('#cmMain').innerHTML = `<section class="cm-card"><div class="cm-bh"><h2>글쓰기</h2><small>익명으로 올라갑니다</small></div>
    <div class="cm-form"><select id="wBoard">${자료.게시판.filter(b => b[0] !== 'all').map(([k, n]) => `<option value="${k}" ${k === 기본판 ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <input id="wTitle" placeholder="제목" maxlength="60"><textarea id="wBody" placeholder="내용을 입력하세요"></textarea>
      <div class="row"><button class="cm-btn lt" id="wCancel">취소</button><button class="cm-btn" id="wGo">올리기</button></div></div></section>`;
  $('#wCancel').onclick = () => 판보기(지금판);
  $('#wGo').onclick = () => {
    const 제목 = $('#wTitle').value.trim(), 본문 = $('#wBody').value.trim();
    if (!제목 || !본문) { 알림('제목과 내용을 모두 쓰세요'); return; }
    if (판.끊김) { 알림('인터넷에 연결되어 있지 않습니다'); return; }
    const p = { id: 1000 + 판.내글.length, 판: $('#wBoard').value, 날: 오늘날(), 시: 지금시각(), 공감: 0, 스크랩: 0, 제목, 본문, 댓글: [], 내것: 1 };
    판.내글.push(p); 판.불러온.add(p.id); 지금판 = p.판; 시간가기('글쓰기'); 글보기(p.id); 알림('글을 올렸습니다');
    답글받기(p.id);
  };
}
function 댓글쓰기(p, 글) {
  if (판.끊김) { 알림('인터넷에 연결되어 있지 않습니다'); return; }
  const 내글 = !!p.내것, 번호 = new Set(p.댓글.map(c => c[0])).size + 1;
  (판.더한[p.id] ||= []).push([내글 ? '글쓴이' : `익명${번호}`, 글, 지금시각(), 내글 ? 1 : 0, 1, 0, 1, `${오늘날()} `]);
  판.댓단글.add(p.id); 시간가기('댓글'); 글보기(p.id); $('#cmMain').scrollTop = 1e6;
  답글받기(p.id);
}
async function AI(길, 몸) {
  if (물음표.has('ai끔') || 판.AI !== true) return null; // 시험할 때, AI 에 동의하지 않았을 때 API 를 부르지 않는다
  try {
    const r = await Promise.race([fetch(길, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(몸) }), 쉼(25000).then(() => { throw 0; })]);
    if (r.ok) return await r.json();
  } catch (e) { /* 서버나 AI 가 없으면 데이터의 풀 */ }
  return null;
}
async function 답글받기(id) {
  const 그날 = 날, p = 찾기(id);
  // 지시문(툴의 기본 설정 > 에타)이 비어 있으면 AI 를 부르지 않고 댓글 풀을 쓴다
  const 지시 = [자료.댓글지시?.공통, 자료.댓글지시?.게시판?.[p.판]].filter(s => s?.trim()).join('\n\n');
  let 댓글들 = 지시 && (await AI('/ai/커뮤니티', {
    앱: 자료.학교.앱, 날짜: 오늘().날짜, 게시판: 판이름(p.판), 제목: p.제목, 본문: 맨글(p.본문), 내글: !!p.내것, 지시,
    댓글: p.댓글.slice(-12).map(c => ({ 이름: c[3] ? '글쓴이' : c[0], 글: 맨글(c[1]), 사람: c[4] !== 0, 나: !!c[6] })),
  }))?.댓글;
  if (!Array.isArray(댓글들) || !댓글들.length) {
    const 풀 = 자료.댓글풀, n = 1 + Math.floor(Math.random() * 2);
    댓글들 = Array.from({ length: n }, () => { const 사람 = Math.random() < .55; return { 글: 고름(풀[사람 ? '사람' : '아님']), 사람 }; }).filter(c => c.글);
  }
  for (const c of 댓글들.slice(0, 3)) {
    await 쉼(빠름 ? 300 : 3000 + Math.random() * 6000);
    while (!판.켜짐) await 쉼(500); // 절전 중이면 깰 때까지 기다린다
    if (날 !== 그날) return;
    const q = 찾기(id), 번호 = new Set(q.댓글.map(x => x[0])).size + 1;
    (판.더한[id] ||= []).push([`익명${번호}`, String(c.글).slice(0, 200), 지금시각(), 0, c.사람 ? 1 : 0, 0, 0, `${오늘날()} `]);
    if (연글 && 연글.id === id && 쪽 === 'post') { const y = $('#cmMain').scrollTop; 글보기(id); $('#cmMain').scrollTop = y; }
    else if (q.내것 || 판.댓단글.has(id)) 띄움(자료.학교.앱, q.내것 ? '내 글에 새 댓글' : '댓글 단 글에 새 댓글', q.제목, () => { 열('web'); 글보기(id); });
  }
}

// ── 캠링 쪽지함 ──
// 판.쪽지[id] = [[누가 'me'|'them'|'tm', 글, 시각]], 판.상대[id] = { 이름, 종류: 사람|아님, 사람, 소개, 지시 }
const 안읽은합 = () => Object.values(판.안읽은).reduce((a, b) => a + b, 0);
function 상대만들기(id, 이름, 사람) {
  if (!판.상대[id]) {
    const 정해진 = 자료.쪽지.상대.find(x => x.id === id);
    판.상대[id] = 정해진 ? { 이름: 정해진.이름, 종류: 정해진.종류, 사람: 정해진.사람, 소개: 정해진.소개, 지시: 정해진.지시 } : { 이름, 종류: 사람 ? '사람' : '아님', 사람, 소개: '익명' };
  }
  판.쪽지[id] ||= [];
  return 판.상대[id];
}
function 쪽지열기(id, 이름, 사람) { 상대만들기(id, 이름, 사람); 판.연상대 = id; 열('web'); 쪽지함(); }
function 쪽지받음(id, 글, 시각, 조용히) {
  상대만들기(id); 판.쪽지[id].push(['them', 글, 시각 || 지금시각()]);
  const 보는중 = 쪽 === 'dm' && 판.연상대 === id && 앞에있음('web');
  if (!보는중) { 판.안읽은[id] = (판.안읽은[id] || 0) + 1; if (!조용히) 띄움(`${자료.학교.앱} 쪽지`, 판.상대[id].이름, 글, () => 쪽지열기(id)); }
  쪽지표시();
}
function 쪽지표시() {
  const n = 안읽은합(), b = $('#dmBadge'); b.textContent = n; b.classList.toggle('on', n > 0);
  if (쪽 === 'dm') 쪽지함(true); else if ($('#boards')) 판목록();
}
const 아바타 = (id, s) => `<span class="dm-av ${고닉들().has(s.이름) ? 'nk' : ''}">${막음(s.이름.slice(0, 1))}</span>`;
const 고닉들 = () => new Set(Object.keys(자료.쪽지.고닉));
function 쪽지함(그대로) {
  쪽 = 'dm'; 연글 = null; 오프라인(0); 주소바꿈(null, 'message');
  const id = 판.연상대 && 판.쪽지[판.연상대] ? 판.연상대 : null;
  if (id) 판.안읽은[id] = 0;
  판목록(); const b = $('#dmBadge'); b.textContent = 안읽은합(); b.classList.toggle('on', 안읽은합() > 0);
  const 목록 = Object.keys(판.쪽지).sort((a, c) => (판.쪽지[c].at(-1)?.[2] || '').localeCompare(판.쪽지[a].at(-1)?.[2] || ''));
  const 쓰던 = $('#dmIn')?.value || '';
  const s = id && 판.상대[id];
  $('#cmMain').innerHTML = `<section class="cm-card dm"><div class="dm-list"><h3>쪽지함</h3>
    ${목록.map(k => { const x = 판.상대[k], 끝 = 판.쪽지[k].at(-1); return `<div class="dm-it${k === id ? ' on' : ''}" data-thread="${k}">${아바타(k, x)}<div><b>${막음(x.이름)}</b><small>${끝 ? 막음(끝[1]) : x.소개 || ''}</small></div>${판.안읽은[k] ? `<i>${판.안읽은[k]}</i>` : ''}</div>`; }).join('') || '<p class="cm-none" style="padding:16px">쪽지가 없습니다. 글쓴이나 댓글 이름을 누르면 쪽지를 보낼 수 있습니다.</p>'}</div>
    <div class="dm-th">${s ? `<div class="dm-hd">${아바타(id, s)}<div><b>${막음(s.이름)}</b><small id="dmState">${상대상태(id)}</small></div></div>
      <div class="dm-ms" id="dmMs">${판.쪽지[id].map(m => m[0] === 'tm' ? `<div class="m-tm">${m[1]}</div>` : `<div class="bb${m[0] === 'me' ? ' me' : ''}"><p>${막음(m[1])}</p><time>${m[2]}</time></div>`).join('')}</div>
      <div class="dm-ask" id="dmAsk">${빠른말(id)}</div>
      <div class="dm-in"><textarea id="dmIn" placeholder="쪽지를 입력하세요 (글을 복사해서 붙여 넣을 수 있다)" maxlength="600"></textarea><button class="cm-btn" id="dmGo">보내기</button></div>`
      : '<p class="dm-none">왼쪽에서 쪽지를 고르세요</p>'}</div></section>`;
  if (!s) return;
  $('#dmMs').scrollTop = 1e6;
  if (그대로 && 쓰던) $('#dmIn').value = 쓰던;
  const 보내기 = () => { const v = $('#dmIn').value.trim(); if (v) { $('#dmIn').value = ''; 쪽지보내기(id, v); } };
  $('#dmGo').onclick = 보내기; $('#dmIn').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); 보내기(); } };
  $('#dmAsk').onclick = e => { const b = e.target.closest('button[data-coco]'); if (b) 코코알려주기(b.dataset.coco, id); };
  // 직접 쓰기는 AI 에 동의했고 그 사람에게 지시문이 있고, 고를 선택지가 없을 때만
  const 됨 = 판.AI === true && !물음표.has('ai끔') && !!s.지시?.trim() && !고르기들[id];
  $('#dmIn').disabled = !됨; $('#dmGo').disabled = !됨; if (!됨) $('#dmIn').placeholder = '지금은 쪽지를 쓸 수 없습니다';
  선택지그리기();
}
$('#site').addEventListener('click', e => { const t = e.target.closest('[data-thread]'); if (t) { 판.연상대 = t.dataset.thread; 쪽지함(); } });
function 상대상태(id) {
  return 막음(판.상대[id].소개 || '익명');
}
function 빠른말(id) {
  return 코코알릴사람(id).map(f => `<button data-coco="${막음(f.id)}">${막음(자료.메신저.이름 || '메신저')} 아이디 알려 주기</button>`).join('');
}
function 쪽지보내기(id, 글, 조용히) {
  판.쪽지[id].push(['me', 글, 지금시각()]); 소리.딸깍(); 시간가기('쪽지');
  if (쪽 === 'dm') 쪽지함();
  if (조용히) return;
  남답(id, 글);
}
// 고닉, 익명 (사람일 수도, 아닐 수도)
async function 남답(id, 글) {
  const s = 판.상대[id];
  await 쉼(빠름 ? 300 : 2500 + Math.random() * 4000);
  const 지시 = (자료.쪽지.상대 || []).find(x => x.id === id)?.지시 || s.지시;
  const r = 지시?.trim() ? await AI('/ai/메신저', { 날짜: 오늘().날짜, 시각: 지금시각(), 앱: `${자료.학교.앱} 쪽지`, 나: { 이름: '익명' }, 상대: { 이름: s.이름, 상태: s.소개, 지시 },
    대화: 판.쪽지[id].filter(m => m[0] !== 'tm').slice(-20).map(m => ({ 누가: m[0] === 'me' ? '나' : '상대', 글: m[1] })) }) : null;
  (r?.답?.length ? r.답 : [고름(자료.쪽지.답풀[s.사람 ? '사람' : '아님'])]).filter(Boolean).slice(0, 3).forEach((x, i) => setTimeout(() => 쪽지받음(id, x), i * 1100));
}
// 영상통화 자막: 한 글자씩 (메신저.js 가 쓴다)
async function 방송말(줄) {
  const c = $('#lvCap');
  for (const x of 줄) {
    c.textContent = '';
    for (let i = 0; i < x.length; i++) { c.textContent = x.slice(0, i + 1); await 쉼(빠름 ? 6 : x[i] === '…' ? 200 : 55); }
    await 쉼(빠름 ? 150 : 900 + x.length * 35);
  }
}
// ── 와이파이 ──
function 와이파이그리기() {
  const n = 자료.설정.와이파이, 쓴 = Math.min(판.읽음, n);
  $('#wfX').style.display = 판.끊김 ? '' : 'none'; $('#wfArc').style.opacity = 판.끊김 ? .35 : 1;
  $('#wfState').textContent = 판.끊김 ? '인터넷 없음' : '연결됨, 보안';
  $('#wfUse').style.width = 쓴 / n * 100 + '%';
  $('#wfUseT').textContent = 판.끊김 ? '오늘 사용량을 모두 썼습니다 · 쪽지는 됩니다' : `오늘 사용량 ${쓴} / ${n}`;
}
function 끊기() {
  if (판.끊김) return;
  판.끊김 = true; 와이파이그리기(); 소리.끊김();
  띄움(`${자료.학교.기숙사} Wi-Fi`, '인터넷 없음', '오늘 사용량을 모두 썼습니다.');
  if (쪽 === 'post' && 연글) { const y = $('#cmMain').scrollTop; 글보기(연글.id); $('#cmMain').scrollTop = y; }
  사건끊김();
}
// 와이파이가 끊겨도 이미 불러온 글은 열린다. 안 불러온 글은 브라우저 오류 화면
function 오프라인(p) {
  const o = $('#offline'); if (!o) return;
  o.classList.toggle('hide', !p); $('#lock').textContent = p ? 'ⓘ' : '🔒';
  if (!p) return;
  $('#urlPath').textContent = `/${자료.학교.주소}/${p.판}/${p.id}`; $('#tabTitle').textContent = 자료.학교.앱주소;
  o.innerHTML = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.6"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="#9aa0a6"/><path d="M3 3l18 18" stroke="#9aa0a6"/></svg>
    <h3>인터넷에 연결되어 있지 않음</h3><p>다음을 시도해 보세요.</p><p>· 네트워크 케이블, 모뎀, 라우터 확인<br>· Wi-Fi에 다시 연결</p><code>ERR_INTERNET_DISCONNECTED</code>`;
}
document.addEventListener('click', e => {
  if (!e.target.closest('#site') || e.target.closest('[data-dm]') || e.target.closest('[data-thread]')) return;
  const pg = e.target.closest('[data-page]'); if (pg) { 쪽보기(pg.dataset.page); return; }
  const b = e.target.closest('[data-board]'); if (b) { 판보기(b.dataset.board); return; }
  const p = e.target.closest('[data-post]'); if (p) 글보기(p.dataset.post);
});
$('#back').onclick = () => 쪽 === 'post' || 쪽 === 'write' ? 판보기(지금판) : 쪽보기('board');
$('#wfBtn').onclick = () => { 와이파이그리기(); $('#wifi').classList.toggle('hide'); };
$('#volBtn').onclick = () => { 소리.끄기(!소리.꺼짐); $('#volBtn').textContent = 소리.꺼짐 ? '🔇' : '🔊'; };

// ── 시간표, 강의평 ──
function 쪽보기(k) {
  if (k === 'board') { 쪽 = 'board'; 판보기(지금판); return; }
  if (k === 'dm') { 쪽지함(); return; }
  쪽 = k; 연글 = null; 오프라인(0); 판목록();
  if (k === 'tt') {
    주소바꿈(null, 'timetable');
    const t = 자료.시간표, 요일 = ['월', '화', '수', '목', '금'], 색 = ['#6a6fd6', '#2f8f7e', '#c4673a', '#8a5bb5', '#3a7ec4'];
    const 과목색 = {}; t.과목.forEach(x => 과목색[x[3]] ??= 색[Object.keys(과목색).length % 색.length]);
    const 칸 = ['<span class="h"></span>', ...요일.map(d => `<span class="h">${d}</span>`)];
    for (let h = 9; h <= 18; h++) 칸.push(`<span>${h}</span>`, ...요일.map(() => '<span></span>'));
    const 블록 = t.과목.map(([d, h, 길이, 이름, 곳]) => `<div class="cls" style="left:calc(40px + (100% - 40px) / 5 * ${요일.indexOf(d)} + 2px);width:calc((100% - 40px) / 5 - 4px);top:${34 * (1 + h - 9) + 2}px;height:${34 * 길이 - 4}px;background:${과목색[이름]}"><b>${이름}</b>${곳}</div>`).join('');
    $('#cmMain').innerHTML = `<section class="cm-card cm-page"><h3>${t.학기}</h3><div class="tt">${칸.join('')}${블록}</div><p class="note">마지막 수정 ${t.수정} · 2026년 시간표가 없습니다</p></section>`;
  }
  if (k === 'rv') {
    주소바꿈(null, 'lecture');
    $('#cmMain').innerHTML = `<section class="cm-card cm-page"><h3>강의평</h3>${자료.강의평.map(r => `<div class="rv"><h4>${r.과목} <small>${r.교수}</small><span class="st">${'★'.repeat(r.별)}${'☆'.repeat(5 - r.별)}</span></h4>${r.글.map(([학기, x]) => `<p><small>${학기}</small>${보임글(x)}</p>`).join('')}</div>`).join('')}</section>`;
  }
  $('#cmMain').scrollTop = 0;
}

// ── 기록.txt: 복사한 것을 붙여 넣어 모은다 ──
function 기록그리기() { $('#noteText').value = 판.기록; $('#noteStat').textContent = `줄 ${판.기록.split('\n').length}`; }
function 기록추가(줄) { 판.기록 = (판.기록 ? 판.기록.replace(/\n*$/, '\n') : '') + 줄; 기록그리기(); }
$('#noteText').oninput = e => {
  판.기록 = e.target.value; $('#noteStat').textContent = `줄 ${판.기록.split('\n').length}`;
  clearTimeout(기록시간.h); 기록시간.h = setTimeout(() => 시간가기('기록'), 1500); // 쓰다가 멈추면 한 번
};
const 기록시간 = {};

// ── 내 PC, 휴지통, 파일 보기 ──
let 지금폴더 = 'pc';
// 본 엔딩 폴더: 엔딩을 하나도 안 봤으면 잠겨 있다 ("저장 이름:엔딩" 은 저장을 지워도 남음). 파일 = 본 엔딩마다 하나
const 엔딩폴더 = () => 자료.엔딩폴더 || '잠긴 폴더';
const 본엔딩 = () => { try { return JSON.parse(localStorage.getItem(저장키 + ':엔딩') || '[]').map(e => typeof e === 'string' ? { 이름: e, 줄: [] } : e); } catch (e) { return []; } };
const 폴더들 = () => [...Object.keys(자료.내PC), ...Object.keys(판.덮.폴더 || {}), 엔딩폴더()];
// 탐색기 아이콘: 이모지 대신 윈도 11 모양 그림
const 접 = 'M2 5.5A1.5 1.5 0 0 1 3.5 4h4l2 2h7A1.5 1.5 0 0 1 18 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z';
const 종이 = (안 = '') => `<svg class="fi" viewBox="0 0 20 20"><path d="M5 1.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z" fill="#fff" stroke="#9aa0a6"/><path d="M12 1.5V6h4.5" fill="#eef0f2" stroke="#9aa0a6" stroke-linejoin="round"/>${안}</svg>`;
const 그림표 = {
  폴더: `<svg class="fi" viewBox="0 0 20 20"><path d="${접}" fill="#e8a92c"/><path d="M2 8.2h16v6.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z" fill="#ffc83d"/></svg>`,
  잠긴폴더: `<svg class="fi" viewBox="0 0 20 20"><path d="${접}" fill="#a9aeb5"/><path d="M2 8.2h16v6.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z" fill="#c8ccd2"/><rect x="11.5" y="11.5" width="7" height="6" rx="1" fill="#3b3f45"/><path d="M13 11.5v-1.3a2 2 0 0 1 4 0v1.3" fill="none" stroke="#3b3f45" stroke-width="1.4"/></svg>`,
  파일: 종이('<path d="M7 10h6M7 12.5h6M7 15h4" stroke="#b5bac0" stroke-linecap="round"/>'),
  그림: 종이('<rect x="6.5" y="9" width="7.5" height="6.5" rx=".8" fill="#4ea1f3"/><path d="M6.5 15.5 9 12l1.6 2 1.3-1.3 2.1 2.8z" fill="#1f6fc5"/>'),
  실행: `<svg class="fi" viewBox="0 0 20 20"><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" fill="#fff" stroke="#9aa0a6"/><path d="M2.5 6.5h15" stroke="#9aa0a6"/><rect x="5.5" y="9" width="9" height="5" rx="1" fill="#5e6ad2"/></svg>`,
  소리: 종이('<path d="M11.5 8.5v5.2a1.6 1.6 0 1 1-1-1.5V9.6l-2 .5V14a1.6 1.6 0 1 1-1-1.5V9.3z" fill="#e3008c"/>'),
  문서: 종이('<rect x="6.5" y="9" width="7.5" height="7" rx="1" fill="#2b74d8"/><path d="M8.3 11h3.9M8.3 13h3.9" stroke="#fff" stroke-width="1.1"/>'),
  PDF: 종이('<rect x="5.5" y="10" width="10" height="5.5" rx="1" fill="#d13438"/><text x="10.5" y="14.2" text-anchor="middle" font-size="4.2" font-weight="700" fill="#fff" font-family="Arial">PDF</text>'),
  한글: 종이('<rect x="6.5" y="9" width="7.5" height="7" rx="1" fill="#1d7bd8"/><text x="10.25" y="14.6" text-anchor="middle" font-size="5.4" font-weight="700" fill="#fff">ㅎ</text>'),
  내PC: `<svg class="fi" viewBox="0 0 20 20"><rect x="2" y="3.5" width="16" height="10.5" rx="1.2" fill="#3b8de0"/><rect x="3.2" y="4.7" width="13.6" height="8.1" fill="#9fd0ff"/><path d="M7 16.5h6M10 14v2.5" stroke="#5f6368" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  디스크: `<svg class="fi" viewBox="0 0 20 20"><rect x="2" y="7" width="16" height="7" rx="1.5" fill="#d9dde2" stroke="#9aa0a6"/><circle cx="15" cy="10.5" r="1" fill="#2fb36b"/><rect x="4" y="9.6" width="7" height="1.8" rx=".9" fill="#9aa0a6"/></svg>`,
};
const 폴더표 = x => x === 엔딩폴더() && !본엔딩().length ? 그림표.잠긴폴더 : 그림표.폴더;
// 사건이 파일을 숨기거나 더하거나 이름을 바꾼다 (사건폴더)
// 휴지통에서 버리거나 되살린 파일은 id 로 적는다 (사건이 이름을 바꿔도 찾게). id 가 없으면 이름. 예전 저장(이름)도 맞는다
const 파일키 = f => f.id || f.이름, 같은파일 = (k, f) => k === f.id || k === f.이름;
const 휴지통원본 = () => [...자료.휴지통, ...(덮().가상?.휴지통 || [])];
const 폴더파일 = k => k === 엔딩폴더() ? 본엔딩().map(e => ({ 이름: `${e.이름}.txt`, 날: e.날 || '', 글: (e.줄 || []).join('\n') })) : 사건폴더(k, k === '문서' ? [...자료.내PC.문서, ...판.되살린.map(n => 휴지통원본().find(f => 같은파일(n, f))).filter(Boolean)] : k === '다운로드' ? [...(자료.내PC.다운로드 || []), ...판.저장사진] : 자료.내PC[k] || []);
const 휴지통목록 = () => 사건폴더('휴지통', 자료.휴지통);
function 사진저장(x) {
  if (판.저장사진.some(f => f.사진 === x.사진)) { 알림('이미 다운로드 폴더에 있습니다'); return; }
  판.저장사진.push({ 이름: x.이름, 사진: x.사진, 날: `${오늘().날짜} ${지금시각()}` }); 알림(`다운로드 폴더에 저장했습니다 · ${x.이름}`);
  if (보임('pc') && 지금폴더 === '다운로드') 탐색('다운로드');
}
const 아이콘 = f => f.pdf ? 그림표.PDF : f.hwp != null ? 그림표.한글 : f.그림 || f.사진 ? 그림표.그림 : f.실행 ? 그림표.실행 : f.재생 ? 그림표.소리 : f.앱없음 ? 그림표.문서 : 그림표.파일;
function 탐색(k) {
  if (k === 엔딩폴더() && !본엔딩().length) { 알림('잠겨 있습니다'); return; }
  지금폴더 = k;
  $('#pcTitle').textContent = k === 'pc' ? '내 PC' : k; $('#exPath').textContent = k === 'pc' ? '› 내 PC' : `› 내 PC › ${k}`;
  $('#exSide').innerHTML = ['pc', ...폴더들()].map(x => `<a data-f="${x}" class="${x === k ? 'on' : ''}">${x === 'pc' ? 그림표.내PC + ' 내 PC' : 폴더표(x) + ' ' + x}</a>`).join('');
  if (k === 'pc') {
    $('#exList').innerHTML = `<div class="ex-row head"><span></span><span>이름</span><span>종류</span><span></span></div>` +
      폴더들().map(x => `<div class="ex-row" data-f="${x}"><span>${폴더표(x)}</span><span>${x}</span><small>파일 폴더</small><small>${폴더파일(x).length}개</small></div>`).join('') +
      `<div class="ex-row"><span>${그림표.디스크}</span><span>로컬 디스크 (C:)</span><small>사용 가능 12.4GB / 237GB</small><small></small></div>`;
    $('#exStat').textContent = `항목 ${폴더들().length + 1}개`;
  } else {
    const 파일 = 폴더파일(k);
    $('#exList').innerHTML = `<div class="ex-row head"><span></span><span>이름</span><span>수정한 날짜</span><span></span></div>` +
      (파일.map((f, i) => `<div class="ex-row" data-i="${i}" draggable="true" data-drag-file="${막음(k)}
${막음(f.이름)}"><span>${아이콘(f)}</span><span>${막음(f.이름)}</span><small>${막음(f.날)}</small><small></small></div>`).join('') || '<p class="ex-none">이 폴더는 비어 있습니다.</p>');
    $('#exStat').textContent = `항목 ${파일.length}개`;
  }
}
$('#exSide').onclick = e => { const a = e.target.closest('[data-f]'); if (a) 탐색(a.dataset.f); };
$('#exUp').onclick = () => 탐색('pc');
$('#exList').onclick = e => { const r = e.target.closest('.ex-row:not(.head)'); document.querySelectorAll('#exList .ex-row').forEach(x => x.classList.toggle('sel', x === r)); };
$('#exList').ondblclick = e => {
  const r = e.target.closest('.ex-row:not(.head)'); if (!r) return;
  if (r.dataset.f) { 탐색(r.dataset.f); return; }
  if (r.dataset.i != null) 파일열기(폴더파일(지금폴더)[+r.dataset.i]);
};
// 한글 파일을 메모장으로 연 모양: 깨진 글자 사이사이에 툴에서 쓴 문장만 읽힌다. 파일 이름으로 늘 같은 모양
function 깨진글(f) {
  let 씨 = [...f.이름].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const 수 = () => (씨 = (씨 * 1103515245 + 12345) >>> 0) / 4294967296;
  const 조각 = ['ÐÏ', 'à¡±', 'á', 'þÿ', '�', '□', 'ﾀ', '쀀', '䠀', '᐀', 'Ā', 'ȁ', '耀', 'ꀀ', '؀', 'ÿÿ', 'Ü', '¥', 'ð', 'ã', 'Ŀ', '?', 'Ȁ', 'Ѐ', 'Ԁ'];
  const 줄 = (n = 40 + Math.floor(수() * 50)) => Array.from({ length: n }, () => 조각[Math.floor(수() * 조각.length)]).join('');
  const 숨은 = String(f.hwp || '').split('\n').map(x => x.trim()).filter(Boolean);
  const 겉 = ['HWP Document File' + 줄(30), 줄(), 줄(), 줄()];
  숨은.forEach(x => { 겉.push(줄(6 + Math.floor(수() * 20)) + '  ' + x + '  ' + 줄(4 + Math.floor(수() * 12))); for (let i = 0; i < 2 + Math.floor(수() * 4); i++) 겉.push(줄()); });
  for (let i = 0; i < 6; i++) 겉.push(줄());
  return 겉.map(x => x.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])).join('\n');
}
function 파일열기(f) {
  if (f) 시간가기('파일');
  if (f.앱없음) { 알림('이 파일을 열 수 있는 앱이 없습니다'); return; }
  if (f.pdf) { 알림('이 파일을 열 수 있는 앱이 없습니다'); return; } // 인터넷 창에 끌어다 놓으면 열린다 (PDF보기)
  if (f.hwp != null) { 알림('연결된 앱이 없어 메모장으로 엽니다'); $('#viewTitle').textContent = `${f.이름} - 메모장`; $('#viewBody').innerHTML = `<pre class="hwp">${깨진글(f)}</pre>`; 열('view'); return; }
  if (f.실행) { 묻기(f.실행, [['확인', '확인']], 0, '확인', { 제목: f.이름 }); return; }
  if (f.재생) { 묻기('이 파일을 재생할 수 없습니다.\n파일이 손상되었거나 지원하지 않는 형식입니다.', [['확인', '확인']], 0, '확인', { 제목: '미디어 플레이어' }); return; }
  $('#viewTitle').textContent = f.그림 || f.사진 ? `${f.이름} - 사진` : `${f.이름} - 메모장`;
  $('#viewBody').innerHTML = f.사진 ? `<img src="${막음(f.사진)}" alt="">` : f.그림 ? `<img src="${f.그림.startsWith('data:') ? '' : '그림/'}${f.그림}" alt="">` : `<pre>${막음(f.글)}</pre>`;
  열('view');
}
const 휴지통남은 = () => 휴지통목록().filter(f => !판.버린.some(k => 같은파일(k, f)) && !판.되살린.some(k => 같은파일(k, f)));
function 휴지통그리기() {
  const 남은 = 휴지통남은();
  $('#binList').innerHTML = `<div class="ex-row head"><span></span><span>이름</span><span>삭제한 날짜</span><span></span></div>` +
    (남은.map(f => `<div class="ex-row" data-n="${f.이름}"><span>${아이콘(f)}</span><span>${막음(f.이름)}</span><small>${막음(f.날)}</small><button data-back="${파일키(f)}">복원</button></div>`).join('') || '<p class="ex-none">휴지통이 비어 있습니다.</p>');
  $('#binStat').textContent = `항목 ${남은.length}개`;
}
$('#binList').onclick = e => {
  const b = e.target.closest('[data-back]');
  if (b) {
    const k = b.dataset.back, f = 휴지통남은().find(x => 파일키(x) === k); if (!f) return;
    if (f.id && 덮().옮김?.[f.id]) 덮().옮김[f.id] = '문서'; else 판.되살린.push(k); // 사건이 휴지통으로 옮긴 파일은 문서로 다시 옮긴다
    휴지통그리기(); 알림(`문서 폴더로 복원했습니다 · ${f.이름}`); if (보임('pc')) 탐색(지금폴더); return;
  }
  const r = e.target.closest('.ex-row:not(.head)'); document.querySelectorAll('#binList .ex-row').forEach(x => x.classList.toggle('sel', x === r));
};
$('#binList').ondblclick = e => { if (e.target.closest('.ex-row:not(.head)')) 알림('복원한 뒤에 열 수 있습니다'); };
$('#binEmpty').onclick = async () => {
  const 남은 = 휴지통남은(); if (!남은.length) return;
  if (await 묻기(`여러 항목 삭제\n이 항목 ${남은.length}개를 영구히 삭제하시겠습니까?`, [['예', '예'], ['아니', '아니요']], 0, '아니', { 제목: '휴지통' }) !== '예') return;
  남은.forEach(f => 판.버린.push(파일키(f))); 휴지통그리기();
};

// ── 전원: 절전 = 저장, 시스템 종료 = 다음 날, 다시 시작 = 처음부터 ──
$('#startBtn').onclick = () => { $('#start').classList.toggle('hide'); $('#pwMenu').classList.add('hide'); };
$('#pw').onclick = () => $('#pwMenu').classList.toggle('hide');
$('#pwMenu').onclick = async e => {
  const b = e.target.closest('[data-pw]'); if (!b) return;
  $('#start').classList.add('hide');
  if (b.dataset.pw === 'save' || b.dataset.pw === 'load') { 저장칸창(b.dataset.pw); return; }
  if (코코통화중() && b.dataset.pw !== 'restart') { 알림('영상통화 중에는 끌 수 없습니다'); return; }
  if (울리는 && b.dataset.pw !== 'restart') { 알림('영상통화가 울리는 중에는 끌 수 없습니다'); return; }
  if ((await 사건끔(b.dataset.pw)).막기) return; // 끄려고 할 때 사건 (묻는 창에서 "끄기 막기" 를 고르면 안 꺼짐)
  if (b.dataset.pw === 'off') 끄기();
  if (b.dataset.pw === 'sleep') 절전();
  if (b.dataset.pw === 'restart') { const n = 자료.다시시작; if (await 묻기(n.물음, n.고르기, 0, '아니', { 제목: '다시 시작' }) === '예') { try { localStorage.removeItem(저장키); } catch (e) {} location.search = 다시시작주소(); } }
};
// 다시 시작: 시험 자료(?자료=)와 무음(?mute)은 남기고 나머지(새로, 날, 켜짐, 사건 …)는 지운다
const 다시시작주소 = () => { const q = new URLSearchParams(); ['자료', 'mute', 'ai끔', 'fast'].forEach(k => 물음표.has(k) && q.set(k, 물음표.get(k))); return q.toString().replace(/=(&|$)/g, '$1'); };
const 묶기 = (k, v) => v instanceof Set ? { __set: [...v] } : v;
const 풀다 = (k, v) => v && v.__set ? new Set(v.__set) : v;
// 저장에는 그 판의 아침 판(게임 오버 때 돌아갈 곳)도 같이 넣는다. 불러오면 아침 판도 되돌린다
function 저장(키 = 저장키) { if (탭밀림) return false; try { const 아침 = 키 === 아침키 ? undefined : localStorage.getItem(아침키) || undefined; localStorage.setItem(키, JSON.stringify({ 날, 초, 판: { ...판, 켜짐: false }, 때: Date.now(), 아침 }, 묶기)); return true; } catch (e) { return false; } }
// 저장 칸 3개 (전원 메뉴 > 저장 / 불러오기). 절전 저장, 아침 판과는 따로. 엔딩을 봐도 안 지워진다
const 칸키 = n => `${저장키}:칸${n}`;
function 칸설명(n) {
  try {
    const s = JSON.parse(localStorage.getItem(칸키(n)) || 'null'); if (!s) return `<b>${n}번 칸</b><small>비어 있음</small>`;
    const 때 = s.때 ? new Date(s.때) : null, 시 = `${둘(Math.floor(s.초 / 3600) % 24)}:${둘(Math.floor(s.초 / 60) % 60)}`;
    return `<b>${n}번 칸 · ${s.날 + 1}일차 ${시}</b><small>${때 ? `${때.getMonth() + 1}월 ${때.getDate()}일 ${둘(때.getHours())}:${둘(때.getMinutes())}에 저장` : '저장한 때 모름'}</small>`;
  } catch (e) { return `<b>${n}번 칸</b><small>읽을 수 없음</small>`; }
}
async function 저장칸창(일) {
  if (일 === 'save' && (코코통화중() || 울리는)) { 알림('영상통화 중에는 저장할 수 없습니다'); return; }
  if (일 === 'save' && Object.keys(고르기들).length) { 알림('답장을 고르는 중에는 저장할 수 없습니다'); return; } // 제한 시간 선택지 앞에서 저장하고 다시 고르기 막기
  const n = await 묻기(`${일 === 'save' ? '저장' : '불러오기'}\n칸을 고르세요`, [[1, 칸설명(1)], [2, 칸설명(2)], [3, 칸설명(3)], ['x', '취소']], 0, 'x', { 제목: 일 === 'save' ? '저장' : '불러오기', 세로: true });
  if (!n || n === 'x') return;
  const 있음 = !!localStorage.getItem(칸키(n));
  if (일 === 'save') {
    if (있음 && await 묻기(`덮어쓰기\n${n}번 칸에 덮어쓸까요?`, [['예', '예'], ['아니', '아니요']], 0, '아니', { 제목: '저장' }) !== '예') return;
    알림(저장(칸키(n)) ? `${n}번 칸에 저장했습니다` : '저장하지 못했습니다');
    return;
  }
  if (!있음) { 알림('빈 칸입니다'); return; }
  if (await 묻기(`불러오기\n지금 하던 것은 저장하지 않으면 사라집니다. ${n}번 칸을 불러올까요?`, [['예', '예'], ['아니', '아니요']], 0, '아니', { 제목: '불러오기' }) !== '예') return;
  try { localStorage.setItem(저장키, localStorage.getItem(칸키(n))); sessionStorage.setItem('회신없음:불러옴', '1'); } catch (e) { 알림('불러오지 못했습니다'); return; }
  location.search = 다시시작주소();
}
// 그날 아침(켜기 직전) 판. 사건 "게임 오버" 뒤에 여기서 다시 한다 (사건.js)
const 아침키 = 저장키 + ':아침';
function 불러오기() {
  try { const s = JSON.parse(localStorage.getItem(저장키), 풀다); if (!s || s.날 == null) return false; if (s.아침) localStorage.setItem(아침키, s.아침); 날 = s.날; 초 = s.초; 판 = Object.assign(새판(), s.판); if (!(판.지난 instanceof Set)) 판.지난 = new Set(); if (!(판.사건 instanceof Set)) 판.사건 = new Set(); 판.코코 = Object.assign(새판().코코, 판.코코); 판.저장사진 ||= []; 판.답 ||= {}; 판.덮 ||= {}; return true; } catch (e) { return false; }
}
// 검은 화면 상태: 'off' 화면 보임, 'black' 꺼짐, 'boot' 로고와 도는 점, 'shut' 종료 중, 'sleep' 잠금 화면, 'text' 글만, 'title' 엔딩 이름
function 화면(상태, 글 = '') {
  const bl = $('#black');
  bl.className = 'black' + ({ off: ' off', shut: ' shut', sleep: ' sleep', text: ' text', title: ' text title' }[상태] || '');
  $('#logo').classList.toggle('hide2', 상태 !== 'boot');
  $('#boot').classList.toggle('hide2', 상태 !== 'boot' && 상태 !== 'shut');
  $('#bmsg').textContent = 글;
  if (상태 === 'text' || 상태 === 'title') { const m = $('#bmsg'); m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; } // 줄마다 새로 떠오르게
  bl.onclick = 상태 === 'sleep' ? 깨우기 : null;
  if (상태 === 'sleep') {
    const h = Math.floor(초 / 3600) % 24, m = Math.floor(초 / 60) % 60, d = new Date(오늘().날짜);
    $('#lkT').textContent = `${h % 12 || 12}:${둘(m)}`;
    $('#lkD').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`;
    $('#lkH').textContent = 글; $('#bmsg').textContent = '';
  }
}
async function 절전() {
  if (!판.켜짐) return;
  판.켜짐 = false; 묻기.닫기?.(); 소리.팬(false);
  await 쉼(50); // 닫힌 묻는 창의 답(판.답)이 들어간 뒤에 저장한다
  const 됨 = 저장();
  화면('sleep', 됨 ? '저장됨 · 누르면 깨어납니다' : '저장하지 못했습니다 · 누르면 깨어납니다');
}
function 깨우기() { 판.켜짐 = true; 화면('off'); 시계(); 소리.팬(true); 코코이어가기(); 끝시각확인(); }
async function 켜기() {
  화면('boot'); await 쉼(빠름 ? 300 : 2600);
  화면('black'); await 쉼(빠름 ? 50 : 500);
  시계(); 와이파이그리기(); 판.켜짐 = true; 화면('off'); 소리.부팅(); 소리.팬(true);
  await 쉼(빠름 ? 100 : 900);
  자막(오늘().켠뒤);
  시험열기();
}
// 시험용
async function 시험열기() {
  if (물음표.has('상대')) { await 쉼(빠름 ? 600 : 50); }
  (물음표.get('창') || '').split(',').filter(Boolean).forEach(열);
  if (물음표.get('글')) 글보기(물음표.get('글'));
  if (물음표.get('쪽')) { const k = 물음표.get('쪽'); k === 'hot' || k.startsWith('my-') ? 판보기(k) : k === 'write' ? 글쓰기화면('free') : 쪽보기(k); }
  if (물음표.get('상대')) { 판.연상대 = 물음표.get('상대'); 쪽지함(); }
  if (물음표.get('친구')) { 물음표.get('친구').split(',').forEach(id => 코().친구.add(id)); 코코그리기(); } // 시험: 그 친구는 처음부터 친구 (툴 흐름 미리 보기)
  if (물음표.get('사건') && 사건찾기(물음표.get('사건'))?.언제?.종류 !== '켜기전') 사건일으킴(물음표.get('사건'), true); // 켜기 전 사건은 켜기 앞에서 (사건.js)
  if (물음표.get('폴더')) { 탐색(물음표.get('폴더')); const f = 폴더파일(물음표.get('폴더')).find(x => x.이름 === 물음표.get('파일')); if (f) 파일열기(f); }
  const 장면 = 물음표.get('장면');
  if (장면 === 'shut') 화면('shut', '종료 중');
  if (장면 === 'sleep') 화면('sleep', '저장됨 · 누르면 깨어납니다');
  if (장면 === 'boot') 화면('boot');
}
async function 끄기() {
  if (!판.켜짐) return;
  판.켜짐 = false; 묻기.닫기?.(); 소리.팬(false); 사건다끊음?.(); // 종료하면 하던 사건은 거기서 끝 (절전은 이어서)
  $('#start').classList.add('hide'); $('#wifi').classList.add('hide');
  화면('shut', '종료 중'); await 쉼(빠름 ? 300 : 2600);
  화면('black'); await 쉼(빠름 ? 300 : 2200);
  다음날();
}
async function 다음날() {
  날++;
  if (날 >= 자료.날.length) {
    날--;
    if (!(자료.끝 || []).length) { 켜기(); return; } // 끝 글을 아직 안 썼으면 마지막 날을 다시 켠다 (검은 화면에서 멈추지 않게)
    for (const 줄 of 자료.끝) { 화면('text', 줄); await 쉼(빠름 ? 300 : 2400); } return;
  }
  밤사이(); 켜기();
}
// 꺼져 있는 동안 생긴 일: 새 글은 글 목록에, 쪽지와 기록.txt 는 여기서
function 밤사이() {
  const d = 오늘();
  판.읽음 = 0; 판.끊김 = false; 초 = d.시작[0] * 3600 + d.시작[1] * 60;
  document.querySelectorAll('.win').forEach(w => { w.classList.add('hide'); w.classList.remove('top', 'max'); }); 작업줄();
  $('#lvV').classList.add('off'); $('#lvCap').textContent = '';
  다시그리기();
}
function 다시그리기() { 지금판 = 'all'; 판보기('all'); 기록그리기(); 와이파이그리기(); 쪽지표시(); 시계(); 코코그리기(); }
// 게임 시작 전: AI 를 쓸지 묻는다. 데이터 "AI동의" { 제목, 물음, 고르기: [[예, ..], [아니, ..]] }
async function AI동의() {
  if (물음표.has('ai끔')) { 판.AI = false; return; }
  const n = 자료.AI동의; if (!n?.물음) { 판.AI = true; return; }
  판.AI = await 묻기(n.물음, n.고르기, 0, '아니', { 제목: n.제목 || '회신없음' }) === '예';
}

// ── 시작 ──
async function 시작() {
  // ?자료=시험/메신저 시험 → 데이터/시험/메신저 시험.json (시험용)
  자료 = window.자료 || await (await fetch(`../데이터/${물음표.get('자료') || '1장'}.json?v=mww38ffn`)).json();
  자료.메신저 ||= {}; await 쉼(0);
  $('.st-me b').textContent = `${자료.학교.기숙사} · ${자료.학교.방}`;
  $('#urlHost').textContent = 자료.학교.앱주소; $('#appIcT').textContent = 자료.학교.앱; $('#favT').textContent = [...(자료.학교.앱 || '?')][0]; $('#wfName').textContent = `${자료.학교.기숙사}-5F`;
  $('#volBtn').textContent = 소리.꺼짐 ? '🔇' : '🔊';
  사이트(); 바탕그리기(); 코코준비(); await 도감준비();
  // 게임 오버 뒤: 그날 아침 판을 불러와서 노트북을 다시 켠다
  let 다시 = false; try { 다시 = sessionStorage.getItem('회신없음:게임오버') === '1'; sessionStorage.removeItem('회신없음:게임오버'); } catch (e) {}
  if (다시 && 불러오기()) { 다시그리기(); await 켜기(); 코코이어가기(); Object.entries(판.도는사건 || {}).forEach(([id, i]) => 사건일으킴(id, true, false, i)); return; }
  // 저장 칸에서 불러온 뒤: 저장한 그 순간부터 바로 이어서
  let 불러옴 = false; try { 불러옴 = sessionStorage.getItem('회신없음:불러옴') === '1'; sessionStorage.removeItem('회신없음:불러옴'); } catch (e) {}
  if (불러옴 && 불러오기()) { 다시그리기(); 깨우기(); return; }
  if (!물음표.has('새로') && !물음표.has('날') && !물음표.has('켜짐') && 불러오기()) { 다시그리기(); 화면('sleep', '절전 모드 · 누르면 깨어납니다'); return; }
  const 부터 = +(물음표.get('날') || 1);
  if (부터 > 1 && 자료.날.length >= 부터) {
    날 = 부터 - 2; 초 = 오늘().시작[0] * 3600;
    await AI동의(); await 쉼(10); 다음날(); return;
  }
  const d = 오늘(); 초 = d.시작[0] * 3600 + d.시작[1] * 60;
  다시그리기();
  await AI동의();
  if (물음표.has('켜짐')) { 켜기(); return; }
  await 쉼(빠름 ? 100 : 1200);
  await 자막(d.오프닝);
  켜기();
}
// 메신저.js, 사건.js 까지 다 읽은 뒤에 시작한다 (코코준비, 감쌈이 먼저 있어야 함)
addEventListener('DOMContentLoaded', () => 시작());

// ── 파일 끌어다 놓기: 탐색기나 바탕화면의 파일을 인터넷 창에 놓으면 브라우저로 연다 (PDF, 그림) ──
document.addEventListener('dragstart', e => {
  const el = e.target.closest?.('[data-drag-file]'); if (!el) return;
  e.dataTransfer.setData('text/hoesin-file', el.dataset.dragFile); e.dataTransfer.effectAllowed = 'copy';
});
(() => {
  const w = 창('web'), 내것 = e => [...e.dataTransfer.types].includes('text/hoesin-file');
  w.addEventListener('dragover', e => { if (!내것(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; w.classList.add('drop'); });
  w.addEventListener('dragleave', e => { if (!w.contains(e.relatedTarget)) w.classList.remove('drop'); });
  w.addEventListener('drop', e => {
    w.classList.remove('drop'); if (!내것(e)) return; e.preventDefault();
    const [폴더, 이름] = e.dataTransfer.getData('text/hoesin-file').split('\n');
    const f = 폴더파일(폴더).find(x => x.이름 === 이름); if (f) 브라우저로열기(f, 폴더);
  });
})();
function 브라우저로열기(f, 폴더) {
  if (!판.켜짐) return;
  const 그림 = f.사진 || (f.그림 ? (f.그림.startsWith('data:') ? '' : '그림/') + f.그림 : '');
  if (!f.pdf && !그림) { 알림('이 파일은 브라우저에서 열 수 없습니다'); return; }
  시간가기('파일'); 열('web');
  const 쪽들 = f.pdf ? f.pdf.map(p => `<div class="pv-page">${p.그림 ? `<img src="${막음(p.그림)}" alt="">` : ''}${p.글 ? `<pre>${막음(p.글)}</pre>` : ''}</div>`) : [`<div class="pv-page pv-img"><img src="${막음(그림)}" alt=""></div>`];
  $('#pdfV').innerHTML = `<div class="pv-bar"><b>${막음(f.이름)}</b><span class="pv-pg" id="pvPg">1 / ${쪽들.length}</span><span class="pv-z">−</span><span>100%</span><span class="pv-z">+</span></div><div class="pv-pages" id="pvPages">${쪽들.join('')}</div>`;
  $('#pdfV').classList.remove('hide');
  $('#tabTitle').textContent = f.이름; $('#urlHost').textContent = ''; $('#urlPath').textContent = `file:///C:/Users/user/${폴더 === '문서' ? 'Documents' : 폴더 === '사진' ? 'Pictures' : 폴더 === '음악' ? 'Music' : 폴더 === '다운로드' ? 'Downloads' : 폴더}/${f.이름}`;
  const 판들 = $('#pvPages'); 판들.onscroll = () => { const 쪽 = [...판들.children].findIndex(x => x.offsetTop + x.offsetHeight / 2 > 판들.scrollTop); $('#pvPg').textContent = `${Math.max(1, 쪽 + 1)} / ${쪽들.length}`; };
}

// ── 사건 도감 (시연판 전용): 툴 사건의 할 일 종류를 하나씩 일으키고 설명한다. 자료는 데이터/시연/사건도감.json ──
let 도감 = null, 도감칸 = 0;
async function 도감준비() {
  if (!(물음표.get('자료') || '').startsWith('시연')) return;
  try { 도감 = await (await fetch('../데이터/시연/사건도감.json')).json(); } catch (e) { return; }
  자료.사건 = [...(자료.사건 || []), ...도감.사건];
  $('#icons').insertAdjacentHTML('beforeend', `<div class="ic" data-open="dex"><svg viewBox="0 0 48 48"><rect x="6" y="5" width="36" height="38" rx="5" fill="#2b2f36"/><rect x="11" y="11" width="26" height="4" rx="2" fill="#f2c14e"/><rect x="11" y="19" width="20" height="3" rx="1.5" fill="#9aa3ad"/><rect x="11" y="25" width="23" height="3" rx="1.5" fill="#9aa3ad"/><rect x="11" y="31" width="16" height="3" rx="1.5" fill="#9aa3ad"/><circle cx="35" cy="35" r="6" fill="#e5484d"/><path d="M35 31.5v4M35 37.6v.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg><span class="nm">사건 도감</span></div>`);
  도감그리기();
  $('#dexList').onclick = e => { const a = e.target.closest('[data-n]'); if (a) { 도감칸 = +a.dataset.n; 도감그리기(); } };
}
function 도감그리기() {
  const 목 = 도감.목록, x = 목[도감칸];
  let 앞묶음 = '';
  $('#dexList').innerHTML = 목.map((y, i) => (y.묶음 !== 앞묶음 ? `<h6>${막음(앞묶음 = y.묶음)}</h6>` : '') + `<a data-n="${i}" class="${i === 도감칸 ? 'on' : ''}"><i>${y.번호}</i>${막음(y.이름)}</a>`).join('');
  $('#dexList .on')?.scrollIntoView({ block: 'nearest' });
  const 값 = { ...도감.사건.find(s => s.id === x.사건).할일[0] }; delete 값.종류;
  $('#dexMain').innerHTML = `<small class="dex-n">${x.번호} / ${목.length} · ${막음(x.묶음)}</small><h2>${막음(x.이름)}</h2><p class="dex-d">${막음(x.설명)}</p>
    <p class="dex-w">툴에서: 사건 › 할 일 › <b>${막음(x.묶음)} · ${막음(x.이름)}</b></p>${x.끝남 ? '<p class="dex-warn">판이 끝나는 할 일이라 일으키기 전에 한 번 묻는다</p>' : ''}
    <div class="dex-bt"><button id="dexPrev">◀ 이전</button><button id="dexRun">다시 일으키기</button><button id="dexNext" class="pri">다음 ▶</button></div>
    <h6>이 견본에 넣은 값</h6><pre class="dex-raw">${막음(Object.keys(값).length ? JSON.stringify(값, null, 1) : '(값 없음)')}</pre>`;
  $('#dexPrev').onclick = () => { 도감칸 = (도감칸 - 1 + 목.length) % 목.length; 도감그리기(); };
  $('#dexRun').onclick = () => 도감일으키기();
  $('#dexNext').onclick = () => { 도감칸 = (도감칸 + 1) % 목.length; 도감그리기(); 도감일으키기(); };
}
async function 도감일으키기() {
  const x = 도감.목록[도감칸];
  if (x.끝남 && await 묻기(`${x.이름}\n이 할 일은 판을 끝냅니다. 그래도 일으킬까요?`, [['예', '예'], ['아니', '아니요']], 0, '아니', { 제목: '사건 도감' }) !== '예') return;
  사건일으킴(x.사건, true);
}

// ── 두 탭 막기: 같은 판(같은 저장 이름)을 다른 탭이나 창에서 새로 열면 먼저 연 탭은 멈추고 저장도 안 한다 (새로 연 쪽이 이긴다) ──
let 탭밀림 = false;
try {
  const 탭 = new BroadcastChannel('회신없음:' + 저장키);
  탭.onmessage = e => {
    if (e.data !== '새 탭' || 탭밀림) return;
    탭밀림 = true; 판.켜짐 = false; 묻기.닫기?.(); 소리.팬?.(false); 전화다멈춤?.();
    화면('text', '다른 창에서 이 게임을 열었습니다.\n저장이 꼬이지 않게 이 창은 멈췄습니다. 닫아도 됩니다.');
  };
  탭.postMessage('새 탭');
} catch (e) {}
