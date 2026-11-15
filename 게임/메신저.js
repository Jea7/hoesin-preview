// 카카오톡: 노트북 안 메신저 PC판 + 영상통화 (예전 생방송 자리). 플레이어는 폰이 없다. 상대는 자기 폰으로 건다.
// 내용은 데이터/1장.json 의 "메신저", "장면", "정보". 선배가 툴(도구/툴)에서 쓰고, 델이 "게임 반영" 으로 옮긴다 (도구/게임 반영.js).
//   메신저.나      { 아이디, 이름, 상태, 사진 } 플레이어 (플레이어는 못 바꾼다)
//   메신저.친구    [{ id, 아이디, 이름, 상태, 사진, 처음부터, 검색숨김, 쪽지상대, 알려줄말, 지시, 사진반응, 부재중반응, 프로필판: [{ 조건, 상태, 사진 }] }]
//                  처음부터: 처음부터 친구 · 검색숨김: 아이디를 쳐도 안 나옴 · 지시: AI 답장 지시문 (비면 AI 안 씀)
//                  프로필판: 조건이 맞으면 상태 메시지와 사진이 바뀐다 (아래 판이 이긴다). "프로필 바꿈" 효과가 그 위에 덮는다
//   메신저.흐름    { id: { 친구, 통로, 시작, 조건, 기다림, 줄: ["말" | { 사진 }], 고르기: [{ 말, 다음, 필요, 초과, 효과 }], 시간, 다음, 효과 } }
//                  통로: "코코"(기본) 또는 "쪽지" (그때 친구 = 에타 쪽지 상대 id). 시작:true 이고 조건이 맞으면 상대가 저절로 보낸다
//                  기다림: 조건이 맞을 때까지 멈췄다가 다음으로 (기다림 상자). 고르기를 고르면 그 말이 채팅(쪽지)으로 보내진다. 필요 = 정보 키
//                  다음: 흐름 id, 통화 id (전화를 건다), 또는 없음/"끝". 효과: [{ 종류: "친구 추가" | "프로필 바꿈", 친구, 상태, 사진 }]
//                  같은 상대의 흐름은 한 번에 하나씩 온다 (먼저 온 것이 끝날 때까지 뒤의 것이 기다린다)
//   메신저.통화    { id: { 친구, 시작, 조건, 첫장면, 울림, 다시걸기, 간격, 부재중, 안받음 } }
//                  내가: true 면 플레이어가 거는 전화 { 친구, 내가, 결과: 받음|안 받음|거절, 울림, 조건, 첫장면 | 그뒤 }. 걸 때 조건이 맞는 것 하나 (조건 있는 것 먼저, 번호 순), 한 번 쓰이면 끝
//                  안 받으면 부재중 기록 + "부재중" 흐름 (배열이면 몇 번째 부재중인지 따라), 다시걸기 번까지 간격 초 뒤 다시 건다. 끝까지 안 받으면 "안받음" 흐름
//   장면           { id: { 그림, 곳, 줄, 고르기, 시간, 다음, 끝 } } 영상통화 화면. 다음이 장면이 아니면 (흐름 id) 통화가 끊기고 그 흐름으로
//                  줄: "말" 은 상대가 통화로 하는 말 (영상통화 창 아래 자막), { 채팅: "글" } 이나 { 사진 } 은 통화 중에 채팅방으로 보내는 문자
//                  플레이어는 마이크가 없어서 듣기만 한다. 고르기를 고르면 그 말이 채팅방으로 보내진다
// 영상통화 창과 채팅방 창은 따로 뜬다 (2026-11-04 선배)
// 정해 둔 대사가 없을 때 직접 쳐서 보내기는 AI 에 동의했고 그 친구에게 지시문이 있을 때만 된다 (/ai/메신저). 아니면 입력을 못 한다.
// 음성통화, 단톡방, 이모티콘, 파일, 더보기 같은 기능은 겉모양만 있고 누르면 되는 척하다 연결에 실패한다.
const 메 = () => 자료.메신저 || {};
const 코 = () => 판.코코;
const 친구들 = () => 메().친구 || [];
// 지금 보이는 프로필: 프로필판(조건) → "프로필 바꿈" 효과 순서로 덮는다
function 친구(id) {
  const f = 친구들().find(x => x.id === id); if (!f) return undefined;
  let 상태 = f.상태, 사진 = f.사진;
  (f.프로필판 || []).forEach(p => { if (조건맞음(p.조건)) { if (p.상태) 상태 = p.상태; if (p.사진) 사진 = p.사진; } });
  const o = 판.코코.프로필?.[id]; if (o) { if (o.상태 != null) 상태 = o.상태; if (o.사진) 사진 = o.사진; }
  return { ...f, 상태, 사진 };
}
const 친구됨 = id => 코().친구.has(id);
const 그림길 = s => !s ? '' : /^(data:|https?:|\.{1,2}\/|그림\/)/.test(s) ? s : '그림/' + s;
const 앱이름 = () => 메().이름 || '메신저';
let 연채팅 = null, 지금탭 = 'friends', 통화중 = null, 울리는 = null;
// 게임 오버, 엔딩: 울리는 전화와 하던 통화를 그 자리에서 멈춘다 (부재중, 반응 흐름 없이)
let 울림멈춤 = null, 통화멈춤 = false;
function 전화다멈춤() { 울림멈춤?.(); 통화멈춤 = true; $('#ring').classList.remove('on'); 창('live')?.classList.add('hide'); }
const 고르기들 = {}; // 친구 id → { 보기, 시간, 끝, res, 통화 }
const 코코통화중 = () => !!통화중;

function 아바타칸(f, 큰 = '') {
  const 이름 = f?.이름 || '?';
  return `<span class="ko-av ${큰}">${f?.사진 ? `<img src="${막음(그림길(f.사진))}" alt="">` : '<svg viewBox="0 0 40 40"><circle cx="20" cy="15.5" r="6.5" fill="#fff"/><path d="M7.5 34c1.4-6.6 6.4-10 12.5-10s11.1 3.4 12.5 10z" fill="#fff"/></svg>'}</span>`; // 사진 없으면 카톡 기본 프로필
}

// ── 준비, 그리기 ──
function 코코준비() {
  $('#cocoIcT').textContent = 앱이름(); $('#cocoTi').textContent = 앱이름();
  친구들().filter(f => f.처음부터).forEach(f => 코().친구.add(f.id));
}
function 코코그리기() {
  목록그리기(); 배지(); if (연채팅) 채팅그리기();
  선택지그리기();
}
function 배지() {
  const n = Object.values(코().안읽은).reduce((a, b) => a + b, 0), b = $('#cocoBadge');
  b.textContent = n; b.classList.toggle('on', n > 0);
  document.querySelector('.ap[data-app="coco"]')?.classList.toggle('new', n > 0);
}
const 마지막 = id => (코().대화[id] || []).at(-1);
function 목록그리기() {
  document.querySelectorAll('#koRail [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === 지금탭));
  $('#koH').textContent = { friends: '친구', chats: '채팅', more: '더보기' }[지금탭];
  $('#koAdd').hidden = 지금탭 === 'more'; $('#koFind').hidden = 지금탭 === 'more';
  const 나 = 메().나 || {};
  if (지금탭 === 'friends') {
    const 목록 = 친구들().filter(f => 친구됨(f.id));
    $('#koList').innerHTML = `<div class="ko-it me" data-prof="me">${아바타칸(나, 'lg')}<div><b>${막음(나.이름 || '나')}</b><small>${막음(나.상태 || '')}</small></div></div>
      <h6>친구 ${목록.length}</h6>` + (목록.map(f => `<div class="ko-it" data-prof="${막음(f.id)}">${아바타칸(f)}<div><b>${막음(f.이름)}</b><small>${막음(f.상태 || '')}</small></div></div>`).join('') || '<p class="ko-none">친구가 없습니다</p>');
  }
  if (지금탭 === 'chats') {
    const 방 = Object.keys(코().대화).filter(id => 코().대화[id].length && 친구(id)).sort((a, b) => 마지막(b).n - 마지막(a).n);
    $('#koList').innerHTML = 방.map(id => { const f = 친구(id), m = 마지막(id), n = 코().안읽은[id];
      return `<div class="ko-it" data-chat="${막음(id)}">${아바타칸(f)}<div><b>${막음(f.이름)}</b><small>${막음(m.사진 ? '사진' : m.글)}</small></div><span class="ko-r"><time>${m.시}</time>${n ? `<i>${n}</i>` : ''}</span></div>`; }).join('') || '<p class="ko-none">채팅이 없습니다</p>';
  }
  if (지금탭 === 'more') {
    $('#koList').innerHTML = `<div class="ko-more">${['오픈채팅', '선물하기', '쇼핑', '톡메일', '캘린더', '지갑', '뉴스', '이모티콘샵', '게임'].map(x => `<button data-x="${x}"><i></i>${x}</button>`).join('')}</div>`;
  }
}
$('#koRail').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tab) { 지금탭 = b.dataset.tab; 목록그리기(); } };
$('#koList').onclick = e => {
  const p = e.target.closest('[data-prof]'); if (p) { 프로필(p.dataset.prof); return; }
  const c = e.target.closest('[data-chat]'); if (c) 채팅열기(c.dataset.chat);
};
$('#koList').ondblclick = e => { const p = e.target.closest('[data-prof]'); if (p && p.dataset.prof !== 'me') 채팅열기(p.dataset.prof); };
$('#koAdd').onclick = () => 지금탭 === 'chats' ? 새채팅() : 친구찾기();
$('#koFind').onclick = () => 안됨('검색');

// 되는 척하다 실패하는 기능
async function 안됨(무엇) {
  $('#koWait').classList.remove('hide'); 소리.딸깍();
  await 쉼(빠름 ? 200 : 1100 + Math.random() * 900);
  $('#koWait').classList.add('hide');
  await 묻기(`연결할 수 없습니다\n${무엇}에 연결하지 못했습니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해 주세요.`, [['확인', '확인']], 0, '확인', { 제목: 앱이름() });
}
document.addEventListener('click', e => { const x = e.target.closest('#w-coco [data-x], #w-chat [data-x], #w-live [data-x]'); if (x) { e.stopPropagation(); 안됨(x.dataset.x); } });

// ── 팝업 (프로필, 친구 찾기, 새 채팅) ──
function 팝업(html) { const p = $('#koPop'); p.innerHTML = `<div class="ko-card">${html}</div>`; p.classList.remove('hide'); }
$('#koPop').onclick = e => {
  if (e.target.id === 'koPop' || e.target.closest('[data-close]')) { $('#koPop').classList.add('hide'); return; }
  const a = e.target.closest('[data-do]'); if (!a) return;
  const [일, id] = a.dataset.do.split(':');
  if (일 === 'chat') { $('#koPop').classList.add('hide'); 채팅열기(id); }
  if (일 === 'video') { $('#koPop').classList.add('hide'); 걸기(id); }
  if (일 === 'add') { 친구추가(id); $('#koPop').classList.add('hide'); 지금탭 = 'friends'; 목록그리기(); }
};
function 프로필(id) {
  const 나 = id === 'me', f = 나 ? 메().나 || {} : 친구(id);
  팝업(`<button class="ko-x" data-close>✕</button><div class="ko-pf">${아바타칸(f, 'xl')}<b>${막음(f.이름 || '나')}</b><small>${막음(f.상태 || '')}</small></div>
    <div class="ko-acts">${나 ? `<button data-x="나와의 채팅">나와의 채팅</button>` : `<button data-do="chat:${막음(id)}">1:1 채팅</button><button data-x="음성통화">음성통화</button><button data-do="video:${막음(id)}">영상통화</button>`}</div>`);
}
function 친구찾기() {
  팝업(`<button class="ko-x" data-close>✕</button><h4>친구 추가</h4><div class="ko-tabs"><span class="on">아이디</span><span data-x="연락처로 추가">연락처</span><span data-x="QR코드">QR코드</span></div>
    <div class="ko-find"><input id="koId" maxlength="30" placeholder="친구 아이디" spellcheck="false"><button id="koGo">찾기</button></div><div id="koRes"><p class="ko-none">아이디를 정확히 입력해 주세요</p></div>
    <small class="ko-mine">내 아이디 ${막음(메().나?.아이디 || '')}</small>`);
  const 찾기 = () => {
    const v = $('#koId').value.trim(); if (!v) return;
    if (v === 메().나?.아이디) { $('#koRes').innerHTML = '<p class="ko-none">내 아이디입니다</p>'; return; }
    const f0 = 친구들().find(x => x.아이디 && x.아이디 === v && !x.검색숨김), f = f0 && 친구(f0.id);
    $('#koRes').innerHTML = !f ? `<p class="ko-none">'${막음(v)}'(으)로 검색된 결과가 없습니다</p>`
      : `<div class="ko-pf sm">${아바타칸(f, 'lg')}<b>${막음(f.이름)}</b><small>${막음(f.상태 || '')}</small>${친구됨(f.id) ? '<button disabled>이미 친구입니다</button>' : `<button data-do="add:${막음(f.id)}">친구 추가</button>`}</div>`;
  };
  $('#koGo').onclick = 찾기; $('#koId').onkeydown = e => { if (e.key === 'Enter') 찾기(); }; $('#koId').focus();
}
function 새채팅() {
  팝업(`<button class="ko-x" data-close>✕</button><h4>새로운 채팅</h4><div class="ko-acts col"><button data-x="일반채팅">일반채팅</button><button data-x="그룹채팅">그룹채팅</button><button data-x="오픈채팅">오픈채팅</button></div>`);
}
// 효과: 흐름 상자나 선택지에 붙는다
function 효과(목록) {
  for (const e of 목록 || []) {
    if (e.종류 === '사건 일으키기') { if (e.사건) 사건일으킴(e.사건, true); continue; } // 조건 없이 바로 (사건.js)
    const f = 친구(e.친구); if (!f) continue;
    if (e.종류 === '친구 추가') 예약(빠름 ? 0 : 3 + Math.floor(Math.random() * 3), '친구추가', e.친구); // 켜져 있는 시간으로 센다 (게임.js 예약)
    if (e.종류 === '프로필 바꿈') { const o = 코().프로필[e.친구] ||= {}; if (e.상태) o.상태 = e.상태; if (e.사진) o.사진 = e.사진; 코코그리기(); }
  }
}
예약일.친구추가 = id => 친구추가(id, `${친구(id)?.이름 || ''}님이 친구로 추가했습니다`);
function 친구추가(id, 알림말) {
  if (친구됨(id)) return;
  코().친구.add(id); 소리.알림();
  if (알림말) 띄움(앱이름(), '새로운 친구', 알림말, () => { 열('coco'); 지금탭 = 'friends'; 목록그리기(); });
  목록그리기();
}

// ── 에타 쪽지에서 아이디 알려 주기 ──
const 코코알릴사람 = dmId => 친구들().filter(f => f.쪽지상대 === dmId && !친구됨(f.id) && !코().알려준.has(f.id));
function 코코알려주기(fid, dmId) {
  const f = 친구(fid); if (!f) return;
  코().알려준.add(fid);
  쪽지보내기(dmId, f.알려줄말 || `${앱이름()} ${메().나?.아이디 || ''}`.trim(), true);
  예약(빠름 ? 0 : 3 + Math.floor(Math.random() * 4), '친구추가', fid); // 켜져 있는 시간으로 (절전, 새로 고침에도 남음)
}

// ── 채팅 ──
// 코().대화[id] = [{ 누가: me|them|sys, 글, 사진, 시, n, 안읽음 }]
function 넣기(id, m) { (코().대화[id] ||= []).push({ ...m, 시: 지금시각(), n: ++코().번호 }); }
function 받음(id, 줄) {
  const f = 친구(id); if (!f) return;
  const m = typeof 줄 === 'string' ? { 글: 줄 } : { 글: 줄.글 || '', 사진: 줄.사진 };
  넣기(id, { 누가: 'them', ...m });
  const 보는중 = 연채팅 === id && 보임('chat');
  if (!보는중) { 코().안읽은[id] = (코().안읽은[id] || 0) + 1; 띄움(앱이름(), f.이름, m.사진 ? '사진을 보냈습니다' : m.글, () => 채팅열기(id)); }
  else 소리.딸깍();
  코코그리기();
}
function 시스템(id, 글) { 넣기(id, { 누가: 'sys', 글 }); 코코그리기(); }
function 보냄(id, 글, 사진) { 넣기(id, { 누가: 'me', 글: 글 || '', 사진, 안읽음: true }); 소리.딸깍(); 시간가기('메시지'); 코코그리기(); }
function 읽음(id) { (코().대화[id] || []).forEach(m => m.안읽음 = false); 코코그리기(); }
function 채팅열기(id) {
  if (!친구(id)) return;
  연채팅 = id; 코().안읽은[id] = 0; 열('chat'); 코코그리기();
  setTimeout(() => $('#chIn').disabled || $('#chIn').focus(), 0);
}
function 말칸(m, f, 앞말) {
  if (m.누가 === 'sys') return `<div class="ch-sys">${막음(m.글)}</div>`;
  const 내것 = m.누가 === 'me', 속 = m.사진 ? `<img src="${막음(그림길(m.사진))}" alt="">` : 막음(m.글);
  const 이음 = 앞말?.누가 === m.누가 && 앞말.시 === m.시;
  return `<div class="ch-m${내것 ? ' me' : ''}${이음 ? ' cont' : ''}">${내것 ? '' : 이음 ? '<span class="ko-av gap"></span>' : 아바타칸(f)}<div class="ch-b">${내것 || 이음 ? '' : `<b>${막음(f.이름)}</b>`}<div class="ch-r"><p class="${m.사진 ? 'pic' : ''}">${속}</p><span class="ch-t">${내것 && m.안읽음 ? '<i>1</i>' : ''}${m.시}</span></div></div></div>`;
}
const AI켬 = () => 판.AI === true && !물음표.has('ai끔'); // 동의를 받은 판만 (묻지 않은 판은 null)
const 자유됨 = id => AI켬() && !!친구(id)?.지시?.trim() && !고르기들[id];
const 사진됨 = id => !고르기들[id] && (!!메().흐름?.[친구(id)?.사진반응] || AI켬() && !!친구(id)?.지시?.trim()); // 정해 둔 사진 반응은 AI 없이도
function 채팅그리기() {
  const id = 연채팅, f = 친구(id); if (!f) return;
  $('#chName').textContent = f.이름; $('#chAv').outerHTML = 아바타칸(f, 'sm').replace('class="ko-av', 'id="chAv" class="ko-av');
  const 로그 = (코().대화[id] || []).map((m, i, a) => 말칸(m, f, a[i - 1])).join('') || '<p class="ch-none"></p>';
  $('#chLog').innerHTML = 로그; $('#chLog').scrollTop = 1e6;
  const 됨 = 자유됨(id);
  $('#chIn').disabled = !됨; $('#chGo').disabled = !됨; $('#chPic').disabled = !사진됨(id);
  $('#chIn').placeholder = 됨 ? '메시지를 입력하세요' : '메시지를 보낼 수 없습니다';
}
const 직접보내기 = () => { const v = $('#chIn').value.trim(); if (!v || !자유됨(연채팅)) return; $('#chIn').value = ''; 보냄(연채팅, v); AI답(연채팅); };
$('#chGo').onclick = 직접보내기;
$('#chIn').onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); 직접보내기(); }
  if (e.key === 'v' && (e.ctrlKey || e.metaKey) && 클립그림) { e.preventDefault(); 코코사진붙임(); }
};
$('#chVideo').onclick = () => 걸기(연채팅);
// 프로필 사진이나 이름을 눌렀을 때만 프로필. 제목줄을 끌어 창을 옮긴 뒤 손을 뗀 것은 누른 것으로 치지 않는다
let 머리누름 = null;
$('#chHead').addEventListener('mousedown', e => { 머리누름 = [e.clientX, e.clientY]; });
$('#chHead').onclick = e => {
  const 끌었음 = !머리누름 || Math.hypot(e.clientX - 머리누름[0], e.clientY - 머리누름[1]) > 4; 머리누름 = null;
  if (끌었음 || !e.target.closest('#chAv,#chName')) return;
  if (연채팅) { 열('coco'); 프로필(연채팅); }
};
let AI중 = {};
async function AI답(id) {
  if (AI중[id]) return; AI중[id] = true;
  await 쉼(빠름 ? 200 : 1200 + Math.random() * 1800);
  const f = 친구(id), 나 = 메().나 || {};
  const r = await AI('/ai/메신저', { 날짜: 오늘().날짜, 시각: 지금시각(), 앱: 앱이름(), 나: { 이름: 나.이름 }, 상대: { 이름: f.이름, 상태: f.상태, 지시: f.지시 },
    대화: (코().대화[id] || []).filter(m => m.누가 !== 'sys').slice(-20).map(m => ({ 누가: m.누가 === 'me' ? '나' : '상대', 글: m.사진 ? '(사진)' : m.글 })) });
  AI중[id] = false;
  if (!r?.답?.length) return; // 답이 없으면 읽지도 않는다
  읽음(id);
  for (const 줄 of r.답.slice(0, 3)) { await 쉼(빠름 ? 100 : Math.min(2600, 500 + 줄.length * 60)); 받음(id, 줄); }
}

// ── 사진 보내기: 다운로드, 사진 폴더에서 고른다. 에타 사진을 복사해서 붙여 넣어도 된다 ──
const 고를사진 = () => ['다운로드', '사진'].flatMap(k => 폴더파일(k).filter(f => f.사진 || f.그림).map(f => ({ ...f, 폴더: k, 길: f.사진 || 그림길(f.그림) })));
$('#chPic').onclick = () => {
  const 목록 = 고를사진(), p = $('#chPick');
  p.innerHTML = `<div class="ch-pk"><div class="ch-pkh"><b>사진 보내기</b><small>내 PC › 다운로드, 사진</small><button data-pk="x">✕</button></div>
    <div class="ch-pkl">${목록.map((f, i) => `<button data-pk="${i}"><img src="${막음(f.길)}" alt=""><span>${막음(f.이름)}</span></button>`).join('') || '<p class="ko-none">보낼 수 있는 사진이 없습니다</p>'}</div></div>`;
  p.classList.remove('hide');
  p.onclick = e => { const b = e.target.closest('[data-pk]'); if (e.target === p || b?.dataset.pk === 'x') { p.classList.add('hide'); return; } if (!b) return; p.classList.add('hide'); 사진보내기(목록[+b.dataset.pk].길); };
};
// 사진을 보내면: 그 친구에게 "사진 받았을 때 반응" 흐름이 있으면 그것, 없으면 AI
function 사진보내기(길) { const id = 연채팅; if (!사진됨(id)) return; 보냄(id, '', 길); const r = 친구(id).사진반응; r && 메().흐름?.[r] ? 흐름(r) : AI답(id); }
async function 코코사진붙임() {
  if (!클립그림 || !사진됨(연채팅)) { if (클립그림) 알림('지금은 사진을 보낼 수 없습니다'); return; }
  const x = 클립그림;
  if (await 묻기(`사진 보내기\n${친구(연채팅).이름}님에게 이 사진을 보낼까요?\n${x.이름}`, [['예', '전송'], ['아니', '취소']], 0, '아니', { 제목: 앱이름() }) === '예') 사진보내기(x.사진);
}

// ── 선택지: 고르면 그 말이 채팅으로 보내진다. 시간이 다 되면 "초과" 선택지 (없으면 첫째) ──
// 정보가 있어야 보이는 선택지는 고르는 동안 정보를 알게 되면 바로 나타난다
const 보이는보기 = x => x.전체.filter(y => !y.필요 || 정보됨(y.필요));
// 같은 상대에게 이미 고르는 중인 선택지가 있으면 그게 끝날 때까지 기다렸다가 건다 (덮어쓰지 않게)
async function 고르게(id, 전체, 시간, 통화) {
  while (고르기들[id]) await 쉼(300);
  if (!전체.some(y => !y.필요 || 정보됨(y.필요))) return null;
  return new Promise(res => {
    const 초 = 빠름 ? Math.min(시간 || 0, 3) : 시간 || 0;
    const x = 고르기들[id] = { 전체, 시간: 초, 끝: 초 ? Date.now() + 초 * 1000 : 0, 통화, res: null, h: 0, 그린: '' };
    x.res = 고른 => { clearInterval(x.h); delete 고르기들[id]; 선택지그리기(); res(고른); };
    // 제한 시간은 켜져 있고 그 채팅방(쪽지)을 보고 있는 동안만 간다 (알림만 뜬 동안, 절전 중엔 멈춤). 통화 중 선택지는 늘 간다
    const 보는중 = () => 통화 || (쪽지상대(id) ? 쪽 === 'dm' && 판.연상대 === id && 보임('web') : 연채팅 === id && 보임('chat'));
    if (초) { x.남은 = 초 * 1000; x.마지막 = Date.now(); x.h = setInterval(() => { const 지금 = Date.now(); if (판.켜짐 && 보는중()) x.남은 -= 지금 - x.마지막; x.마지막 = 지금; x.끝 = 지금 + Math.max(0, x.남은); if (x.남은 > 0) return; const 보기 = 보이는보기(x), y = 보기.find(y => y.초과) || 보기[0]; x.res(y && { ...y, 자동: true }); }, 200); }
    if (쪽지상대(id)) { if (!(쪽 === 'dm' && 판.연상대 === id && 앞에있음('web'))) 띄움(`${자료.학교.앱} 쪽지`, 쪽지상대(id).이름, '답장을 기다리고 있습니다', () => 쪽지열기(id)); if (쪽 === 'dm') 쪽지함(true); }
    else if (!(연채팅 === id && 보임('chat'))) 띄움(앱이름(), 친구(id).이름, '답장을 기다리고 있습니다', () => 채팅열기(id));
    코코그리기();
  });
}
function 선택지그리기() {
  const 그림 = (곳, id) => {
    const x = 고르기들[id];
    if (!x) { 곳.innerHTML = ''; 곳.classList.remove('on'); return; }
    곳.classList.add('on');
    const 보기 = 보이는보기(x); x.그린 = 보기.map(y => y.말).join('|');
    곳.innerHTML = 보기.map((y, i) => `<button data-i="${i}" class="${y.필요 ? 'info' : ''}">${막음(y.말)}</button>`).join('') + (x.끝 ? '<i class="ch-tm"></i>' : '');
    곳.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) x.res(보기[+b.dataset.i]); };
    if (x.끝) { const t = 곳.querySelector('.ch-tm'), 남 = Math.max(0, x.끝 - Date.now()); t.style.transition = 'none'; t.style.width = 남 / (x.시간 * 1000) * 100 + '%'; void t.offsetWidth; t.style.transition = `width ${남 / 1000}s linear`; t.style.width = '0'; }
  };
  그림($('#chCh'), 연채팅);
  const dm = document.querySelector('#dmAsk'); if (dm && 쪽 === 'dm' && 고르기들[판.연상대]) 그림(dm, 판.연상대);
}
const 쪽지상대 = id => (자료.쪽지.상대 || []).find(x => x.id === id);

// ── 흐름: 상대가 보내는 정해 둔 대사 묶음 ──
async function 흐름(id, 이어서) { 도는흐름.add(id); try { await 흐름몸(id, 이어서); } finally { 도는흐름.delete(id); } }
async function 흐름몸(id, 이어서) {
  const x = 메().흐름?.[id], 쪽지 = x?.통로 === '쪽지'; if (!x || !(쪽지 ? 쪽지상대(x.친구) : 친구(x.친구))) return;
  const f = x.친구; 코().지난.add(id); if (쪽지) 상대만들기(f);
  const 오는말 = 쪽지 ? 줄 => 쪽지받음(f, typeof 줄 === 'string' ? 줄 : 줄.글 || '(사진)') : 줄 => 받음(f, 줄);
  const 가는말 = 쪽지 ? 말 => 쪽지보내기(f, 말, true) : 말 => { 보냄(f, 말); setTimeout(() => 읽음(f), 빠름 ? 200 : 900 + Math.random() * 1500); };
  // 몇 줄째까지 왔는지 저장해 둔다 (절전, 새로 고침 뒤에 이어서 온다). 꺼져 있는 동안은 멈춘다
  if (이어서 !== '고르기') {
    코().흐르는[id] = 이어서 || 0;
    if (x.기다림) { 기다리는흐름.add(id); try { while (!(판.켜짐 && 조건맞음(x.기다림))) await 쉼(1000); } finally { 기다리는흐름.delete(id); } }
    const 줄들 = x.줄 || [];
    for (let i = 이어서 || 0; i < 줄들.length; i++) {
      코().흐르는[id] = i;
      const 쉼초 = 줄들[i]?.쉼; // 툴의 "앞에서 쉬는 초" (비우면 글 길이로)
      await 쉼(빠름 ? 150 : 쉼초 != null ? 쉼초 * 1000 : i === 0 ? 1200 : Math.min(2600, 500 + String(줄들[i].글 ?? 줄들[i]).length * 60));
      while (!판.켜짐) await 쉼(500);
      if (i === 0 && !쪽지) 읽음(f);
      오는말(줄들[i]);
    }
    delete 코().흐르는[id];
    효과(x.효과);
  }
  if (x.고르기?.length) {
    코().고를[f] = id;
    const 고른 = await 고르게(f, x.고르기, x.시간);
    delete 코().고를[f];
    if (고른) {
      자동중 = !!고른.자동; 가는말(고른.말); 자동중 = false; 효과(고른.효과);
      if (고른.통화) 전화(고른.통화, 빠름 ? .3 : 2);
      이어가기(고른.다음);
      return;
    }
  }
  if (x.통화) 전화(x.통화, 빠름 ? .3 : 2);
  이어가기(x.다음);
}
// 다음: 흐름 id 면 그 흐름, 통화 id 면 전화를 건다
function 이어가기(다음) {
  if (!다음 || 다음 === '끝') return;
  if (메().통화?.[다음]) 전화(다음, 빠름 ? .3 : 2);
  else if (메().흐름?.[다음]) 흐름(다음);
}
// 바쁨: 그 상대가 메시지를 보내는 중이거나 선택지를 기다리는 중. 조건을 기다리는(기다림) 흐름은 바쁨이 아니다 (전화나 걸기가 와야 조건이 맞는 것도 있으니)
const 기다리는흐름 = new Set();
const 바쁨 = 상대 => !!고르기들[상대] || [...도는흐름].some(i => !기다리는흐름.has(i) && 메().흐름?.[i]?.친구 === 상대);
// 1초마다: 조건이 맞은 흐름과 전화
function 확인() {
  if (!판.켜짐 || !자료) return;
  if (Object.values(고르기들).some(x => 보이는보기(x).map(y => y.말).join('|') !== x.그린)) 선택지그리기();
  for (const [id, x] of Object.entries(메().흐름 || {})) if (x.시작 && !코().지난.has(id) && (x.통로 === '쪽지' || 친구됨(x.친구)) && !바쁨(x.친구) && 조건맞음(x.조건)) 흐름(id);
  // 다시[id]: true 면 바로, 숫자면 그 시각(Date.now) 뒤에 다시 건다 (부재중 뒤 간격, 바빠서 못 건 전화)
  for (const [id, c] of Object.entries(메().통화 || {})) {
    const 다시 = 코().다시[id];
    if (!c.내가 && (c.시작 || 다시) && !(typeof 다시 === 'number' && Date.now() < 다시) && !코().통화[id] && 친구됨(c.친구) && 조건맞음(c.조건) && !통화중 && !울리는 && !바쁨(c.친구)) 전화(id);
  }
}
setInterval(확인, 1000);
// 절전에서 깨거나 불러온 뒤: 오다 만 메시지, 고르다 만 선택지, 끊긴 전화를 이어 간다 (이미 돌고 있으면 그대로)
const 도는흐름 = new Set();
function 코코이어가기() {
  Object.entries(코().흐르는).forEach(([id, i]) => { if (!도는흐름.has(id)) 흐름(id, i); });
  Object.entries(코().고를).forEach(([f, id]) => { if (!고르기들[f] && !도는흐름.has(id)) 흐름(id, '고르기'); });
  Object.entries(코().통화).forEach(([id, s]) => { if ((s === '울림' || s === '중') && !통화중 && !울리는) { 코().통화[id] = ''; 코().다시[id] = true; } });
}

// ── 영상통화 ──
function 전화(id, 뒤 = 0) {
  const c = 메().통화?.[id]; if (!c) return;
  if (뒤) { setTimeout(() => 전화(id), 뒤 * 1000); return; }
  if (c.내가 || ['끝', '안받음', '중'].includes(코().통화[id]) || !친구(c.친구)) return;
  if (!판.켜짐 || 통화중 || 울리는 || 자막중()) { 코().통화[id] = ''; 코().다시[id] = true; return; } // 바쁘면 (독백 중이어도) 1초 확인이 나중에 다시 건다
  const f = 친구(c.친구); 울리는 = id; 코().통화[id] = '울림'; delete 코().다시[id];
  $('#ring').innerHTML = `<div class="rg-h"><span class="rg-app">${알림아이콘(앱이름())}${막음(앱이름())}</span><span>영상통화</span></div><div class="rg-who">${아바타칸(f, 'lg')}<div><b>${막음(f.이름)}</b><small>영상통화가 왔습니다</small></div></div><div class="rg-bt"><button class="no" id="ringNo"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M1.2 9.3c3.8-3.3 9.8-3.3 13.6 0l-1.6 2-2.6-1.1V8.5a9 9 0 0 0-5.2 0v1.7l-2.6 1.1z" fill="currentColor"/></svg>거절</button><button class="yes" id="ringYes"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4.5h7.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm8.5 2.6L15 4.6v6.8l-4.5-2.5z" fill="currentColor"/></svg>받기</button></div>`;
  $('#ring').classList.add('on');
  const 벨 = setInterval(() => 소리.벨(), 2200); 소리.벨();
  const 끝 = 받음 => { clearInterval(벨); clearTimeout(h); 울림멈춤 = null; $('#ring').classList.remove('on'); 울리는 = null; 받음 ? 통화(id) : 놓침(id); };
  울림멈춤 = () => { clearInterval(벨); clearTimeout(h); 울림멈춤 = null; 울리는 = null; };
  const h = setTimeout(() => 끝(false), (빠름 ? Math.min(c.울림 || 20, 3) : c.울림 || 20) * 1000);
  $('#ringYes').onclick = () => 끝(true); $('#ringNo').onclick = () => 끝(false);
}
function 놓침(id) {
  const c = 메().통화[id], f = c.친구, n = 코().부재[id] = (코().부재[id] || 0) + 1;
  시스템(f, '부재중 영상통화'); 코().안읽은[f] = (코().안읽은[f] || 0) + 1; 배지();
  띄움(앱이름(), 친구(f).이름, '부재중 영상통화', () => 채팅열기(f));
  const 반응 = (Array.isArray(c.부재중) ? c.부재중[Math.min(n, c.부재중.length) - 1] : c.부재중) || 친구(f)?.부재중반응;
  if (반응) 흐름(반응);
  if (n <= (c.다시걸기 || 0)) { 코().통화[id] = ''; 코().다시[id] = Date.now() + (빠름 ? 2 : c.간격 || 30) * 1000; }
  else { 코().통화[id] = '안받음'; if (c.안받음) 흐름(c.안받음); }
}
// 영상통화 화면: 손에 든 폰처럼 조금씩 흔들리고, 가끔 화질이 깨졌다 돌아온다 (매끈한 CSS 흔들림 대신)
function 손떨림(v) {
  const img = $('#lvImg'); let x = 0, y = 0, r = 0, vx = 0, vy = 0, vr = 0, 깨짐 = 0;
  const h = setInterval(() => {
    if (!통화중) { clearInterval(h); img.style.translate = img.style.rotate = ''; v.classList.remove('lag'); return; }
    vx = vx * .8 + (Math.random() - .5) * .35 - x * .04; vy = vy * .8 + (Math.random() - .5) * .3 - y * .04; vr = vr * .8 + (Math.random() - .5) * .06 - r * .05;
    x += vx; y += vy; r += vr;
    img.style.translate = `${x.toFixed(2)}% ${y.toFixed(2)}%`; img.style.rotate = `${r.toFixed(2)}deg`;
    if (깨짐 > 0 && --깨짐 === 0) v.classList.remove('lag');
    else if (!깨짐 && Math.random() < .006) { 깨짐 = 3 + Math.floor(Math.random() * 6); v.classList.add('lag'); }
  }, 66);
}
async function 통화(id) {
  const c = 메().통화[id], f = 친구(c.친구), w = 창('live'), v = $('#lvV');
  통화중 = { id, f: c.친구, 시작: Date.now() }; 코().통화[id] = '중';
  Object.assign(w.style, { left: '470px', top: '60px', width: '560px', height: '800px' });
  $('#liveTitle').textContent = `${f.이름} · 영상통화`; $('#lvCut').textContent = '연결 중'; $('#lvWho').textContent = f.이름; $('#lvDur').textContent = '00:00';
  $('#lvImg').removeAttribute('src'); $('#lvPlace').textContent = ''; $('#lvCap').textContent = '';
  v.classList.add('off'); 열('live');
  연채팅 = c.친구; 열('chat'); Object.assign(창('chat').style, { left: '1050px', top: '60px' }); 앞('live');
  코코그리기();
  const 시계칸 = setInterval(() => { const s = Math.floor((Date.now() - 통화중.시작) / 1000); $('#callTime').textContent = $('#lvDur').textContent = `${둘(Math.floor(s / 60))}:${둘(s % 60)}`; }, 500);
  손떨림(v);
  await 쉼(빠름 ? 200 : 1400); v.classList.remove('off');
  let sid = c.첫장면;
  통화멈춤 = false;
  while (sid && 자료.장면[sid] && !통화멈춤) {
    const s = 자료.장면[sid]; 판.지난.add(sid);
    if (s.그림) $('#lvImg').src = 그림길(s.그림); $('#lvPlace').textContent = s.곳 || '';
    v.classList.toggle('dark', !!s.어둡게); v.classList.remove('shake'); void v.offsetWidth; v.classList.toggle('shake', !!s.흔들림);
    for (const 줄 of s.줄 || []) {
      if (typeof 줄 === 'string') { await 방송말([줄]); continue; }
      await 쉼(빠름 ? 100 : Math.min(2600, 600 + String(줄.채팅 || '').length * 60));
      받음(c.친구, { 글: 줄.채팅 || '', 사진: 줄.사진 });
    }
    if (s.끝) { sid = null; break; }
    if (s.고르기?.length) {
      const 고른 = await 고르게(c.친구, s.고르기, s.시간, true);
      if (!고른) { sid = null; break; }
      자동중 = !!고른.자동; 보냄(c.친구, 고른.말); 자동중 = false; setTimeout(() => 읽음(c.친구), 빠름 ? 100 : 700); 효과(고른.효과);
      sid = 고른.다음;
    } else sid = s.다음;
  }
  const s = Math.floor((Date.now() - 통화중.시작) / 1000);
  clearInterval(시계칸); 코().통화[id] = '끝'; 통화중 = null; 시간가기('통화');
  $('#lvCap').textContent = ''; $('#lvCut').textContent = '통화 종료'; v.classList.add('off'); 소리.끊김();
  시스템(c.친구, `영상통화 ${둘(Math.floor(s / 60))}:${둘(s % 60)}`);
  await 쉼(빠름 ? 300 : 1800);
  w.classList.add('hide'); w.classList.remove('top'); $('#callTime').textContent = ''; 작업줄();
  이어가기(sid); // 통화 장면에서 메시지로 넘어가면 통화가 끊기고 채팅으로
}
$('#lvHang').onclick = () => 알림('지금은 끊을 수 없습니다');
$('#lvMic').onclick = () => 알림('이 노트북에는 마이크가 없습니다');
// 플레이어가 먼저 거는 것: 툴의 전화 상자 "내가 건다" 중 조건이 맞는 것 하나. 없으면 "통신이 불안정" 으로 안 걸림
async function 걸기(id) {
  const f = 친구(id); if (!f || !판.켜짐 || 통화중 || 울리는) return;
  // 그 친구가 메시지를 보내거나 고르기를 기다리는 중이면 "내가 건다" 상자는 안 쓴다 (통신 불안정)
  const 후보 = 바쁨(id) ? [] : Object.entries(메().통화 || {}).filter(([cid, c]) => c.내가 && c.친구 === id && !코().통화[cid] && 조건맞음(c.조건))
    .sort(([a, x], [b, y]) => (y.조건?.length ? 1 : 0) - (x.조건?.length ? 1 : 0) || a.localeCompare(b));
  const [cid, c] = 후보[0] || [];
  $('#ring').innerHTML = `<div class="rg-h"><span class="rg-app">${알림아이콘(앱이름())}${막음(앱이름())}</span><span>영상통화</span></div><div class="rg-who">${아바타칸(f, 'lg')}<div><b>${막음(f.이름)}</b><small class="rg-dots">연결하는 중</small></div></div><div class="rg-bt one"><button class="no" id="ringNo"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M1.2 9.3c3.8-3.3 9.8-3.3 13.6 0l-1.6 2-2.6-1.1V8.5a9 9 0 0 0-5.2 0v1.7l-2.6 1.1z" fill="currentColor"/></svg>취소</button></div>`;
  $('#ring').classList.add('on'); 울리는 = 'out';
  let 취소 = false; $('#ringNo').onclick = () => 취소 = true; 울림멈춤 = () => { 취소 = true; 울림멈춤 = null; };
  const 초 = c ? Math.max(1, c.울림 ?? 4) : 9, 끝 = Date.now() + (빠름 ? Math.min(초, 1) : 초) * 1000;
  while (Date.now() < 끝 && !취소) { 소리.벨(); await 쉼(Math.min(빠름 ? 300 : 2200, Math.max(50, 끝 - Date.now()))); }
  $('#ring').classList.remove('on'); 울리는 = null;
  if (취소) { 시스템(id, '영상통화 취소'); return; }
  if (!c) { 시스템(id, '통신이 불안정해서 연결하지 못했습니다'); return; } // 정해 둔 상황 밖에서 걸면 (선배 2026-11-04)
  if (c.결과 === '받음' && c.첫장면) { 통화(cid); return; }
  코().통화[cid] = '안받음'; // 조건 "통화:C=안받음" 이 맞는다 ("통화:C" 는 받아서 통화한 것만)
  시스템(id, c.결과 === '거절' ? '상대가 영상통화를 거절했습니다' : '영상통화 · 응답 없음');
  if (c.그뒤) 이어가기(c.그뒤);
}
