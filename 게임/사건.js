// 사건: 나폴리탄 연출. 선배가 툴의 사건(X-001)에서 "언제 + 조건 + 할 일 목록" 으로 조립한다. 규격: 문서/사건 규격 초안.md
// 데이터: 자료.사건 = [{ id, 이름, 언제: { 종류, 초, 수, 글, 시각, 정보, 창, 파일, 끔 }, 조건, 되풀이, 할일: [{ 종류, ... }] }]
// 판.사건 (Set) 일어난 사건 id (날마다면 "날:id" 도) · 판.답[id] 묻는 창에서 고른 보기 키 · 판.덮 사건이 바꿔 놓은 것 (저장된다)
// 게임.js 와 메신저.js 의 함수는 감싸서 덮는다 (원래 함수는 그대로). 게임.js 에는 훅만: 사건읽음, 사건끊김, 사건끔, 사건폴더, 사건메뉴
// 시험: 게임 주소에 ?사건=X-001 (켜자마자 그 사건을 조건 없이 일으킨다)
const 덮 = () => 판.덮;
const 사건목록 = () => 자료.사건 || [];
const 사건찾기 = id => 사건목록().find(x => x.id === id);
const 도는사건 = new Set();
const 파일모두 = () => [...Object.values(자료.내PC || {}).flat(), ...(자료.휴지통 || [])];
const P파일 = id => 파일모두().find(f => f.id === id);
const 글자만 = s => String(s || '').replace(/\s+/g, '');
const 앱창 = { web: '에타', coco: '카카오톡', note: '기록.txt', pc: '내 PC', bin: '휴지통' };
// 영상통화 중이거나 전화가 울리는 동안은 사건이 끄지 않고 기다린다 (통화가 다음 날까지 붙지 않게)
const 통화끝까지 = async () => { while (코코통화중() || 울리는) await 쉼(500); };
// 시스템 종료: 도는 사건을 거기서 끝낸다 (게임.js 끄기). 켜질 때까지 기다리던 할 일이 '끊김' 으로 빠진다
const 끊김표 = new Set();
function 사건다끊음() { [...도는사건].forEach(id => 끊김표.add(id)); 판.도는사건 = {}; }
const 덮넣기 = (k, v) => { (덮()[k] ||= []).includes(v) || 덮()[k].push(v); };

// ── 일으키기 ──
// 부터: 절전 저장 뒤 새로 고침했을 때 하던 할 일부터 이어서 (판.도는사건 = { id: 몇 번째 할 일 })
async function 사건일으킴(id, 강제, 끔중, 부터 = 0) {
  const x = 사건찾기(id); if (!x || 도는사건.has(id)) return {};
  const 키 = x.되풀이 === '날마다 한 번' ? `${날}:${id}` : id;
  if (!강제 && ((x.되풀이 !== '매번' && 판.사건.has(키)) || !조건맞음(x.조건))) return {};
  도는사건.add(id); 판.사건.add(키); 판.사건.add(id);
  const 결과 = {};
  try {
    const 할들 = x.할일 || [];
    for (let i = 부터; i < 할들.length; i++) {
      const h = 할들[i];
      if (!끔중) {
        (판.도는사건 ||= {})[id] = i;
        while (!판.켜짐) { if (끊김표.has(id)) throw '끊김'; await 쉼(500); }
        if (끊김표.has(id)) throw '끊김'; // 기다림 같은 긴 할 일 도중에 꺼지고 다음 날 이미 켜진 뒤에 돌아와도, 끊긴 사건은 여기서 끝 (2026-11-23)
      }
      const r = await (할일[h.종류] || (() => console.warn('모르는 할 일', h.종류)))(h, x, 끔중);
      사건다시(); 보던화면다시();
      if (r === '막기') 결과.막기 = true;
      if (r === '끝') break;
    }
  } catch (e) { if (e !== '끊김') console.warn('사건', id, e); }
  finally { 도는사건.delete(id); 끊김표.delete(id); if (판.도는사건) delete 판.도는사건[id]; }
  return 결과;
}
const 언제맞음 = (종, 맞음 = () => true) => 사건목록().filter(x => x.언제?.종류 === 종 && 맞음(x.언제, x));
function 사건읽음(글id) {
  언제맞음('읽은수', w => (w.오늘 ? 판.읽음 : 판.불러온.size) >= (w.수 || 1)).forEach(x => 사건일으킴(x.id)); // 오늘: 그날 읽은 글만 (판.읽음 은 날마다 0)
  언제맞음('읽음', w => +w.글 === +글id).forEach(x => 사건일으킴(x.id));
}
// "전화가 안 걸렸을 때": 영상통화를 걸었는데 맞는 "내가 건다" 상자가 없어 "통신이 불안정" 이 뜬 순간 (2026-11-23). 조건으로 언제 나올지 거른다
function 사건안걸림() { 언제맞음('안걸림').forEach(x => 사건일으킴(x.id)); }
function 사건끊김() { 언제맞음('끊긴뒤').forEach(x => 예약(빠름 ? 0 : x.언제.초 || 0, '사건', x.id)); }
예약일.사건 = id => 사건일으킴(id);
예약일.사건강제 = id => 사건일으킴(id, true);
async function 사건끔(pw) {
  const 무엇 = { off: '시스템 종료', sleep: '절전', restart: '다시 시작' }[pw];
  let 막기 = false;
  for (const x of 언제맞음('끔', w => w.끔 === 무엇 || w.끔 === '아무거나')) if ((await 사건일으킴(x.id, false, true)).막기) 막기 = true;
  return { 막기 };
}
// 1초마다: 시각, 정보, 조건 (이것들은 "매번" 이어도 한 번만)
setInterval(() => {
  if (!판.켜짐 || !자료?.사건) return;
  for (const x of 사건목록()) {
    const w = x.언제 || {}, 키 = x.되풀이 === '날마다 한 번' ? `${날}:${x.id}` : x.id;
    if (!['시각', '정보', '조건'].includes(w.종류) || 판.사건.has(키) || 도는사건.has(x.id)) continue;
    if (w.종류 === '시각' && !(w.시각 && 지금시각() >= w.시각)) continue;
    if (w.종류 === '정보' && !정보됨(w.정보)) continue;
    사건일으킴(x.id);
  }
}, 1000);

// ── 감싸기: 원래 함수를 부른 뒤 사건이 바꿔 놓은 것을 덮는다 ──
// 감쌈: 게임.js, 메신저.js 의 function 선언만 감쌀 수 있다 (const 화살표 함수는 window 에 없어서 안 됨 → 바로 오류)
const 감쌈 = (이름, 새) => { const 원 = window[이름]; if (typeof 원 !== 'function') throw new Error(`감쌈: ${이름} 은(는) function 선언이 아니다`); window[이름] = function (...a) { return 새.call(this, 원, ...a); }; };
감쌈('켜기', async (원) => {
  저장(아침키); // 그날 아침 판 (게임 오버 뒤 여기서 다시)
  // 노트북 켜기 전: 오프닝 자막 뒤 검은 화면에서, "끄려고 할 때" 처럼 꺼진 채로 돈다. ?켜짐 이면 건너뛰고 ?사건= 으로 고른 것만 여기서 일으킨다
  const 시험 = 사건찾기(물음표.get('사건'));
  for (const x of 언제맞음('켜기전')) if (!물음표.has('켜짐') || x === 시험) await 사건일으킴(x.id, x === 시험, true);
  const 부팅 = 덮().부팅글; delete 덮().부팅글;
  if (부팅) { 화면('boot'); $('#bmsg').textContent = 부팅.글; await 쉼((빠름 ? .5 : 부팅.초 || 4) * 1000); }
  await 원();
  const 그날 = 날, 업 = 덮().업데이트; delete 덮().업데이트;
  if (업) setTimeout(() => 띄움('Windows 업데이트', '업데이트가 설치되었습니다', `${업.시각 || ''} · ${업.글}`), 빠름 ? 200 : 2500);
  (덮().시작프로그램 || []).forEach(id => 예약(빠름 ? 0 : 3, '사건강제', id)); delete 덮().시작프로그램; // 다음 날 한 번만
  언제맞음('켠뒤').forEach(x => 예약(빠름 ? 0 : x.언제.초 || 0, '사건', x.id)); // 켜져 있는 시간으로 센다 (절전, 새로 고침에도 남음)
});
감쌈('열', (원, id) => { 원(id); if (판.켜짐) 언제맞음('창', w => w.창 === id).forEach(x => 사건일으킴(x.id)); });
감쌈('파일열기', async (원, f) => {
  if (!f) return;
  const 잠 = 덮().암호?.[f.id];
  if (잠 && !(덮().풀린 || []).includes(f.id)) {
    const v = await 암호묻기(f.이름); if (v == null) return;
    if (글자만(v) !== 글자만(잠.암호)) { await 묻기(`\n${잠.힌트 || '암호가 틀렸습니다'}`, [['확인', '확인']], 0, '확인', { 제목: f.이름 }); return; }
    덮넣기('풀린', f.id); 판.답[잠.사건] = '풀림'; if (잠.풀림) 사건일으킴(잠.풀림, true);
  }
  원(f); 언제맞음('창', w => w.창 === 'file' && w.파일 === f.id).forEach(x => 사건일으킴(x.id));
});
감쌈('다시그리기', (원) => { 덮적용(); 원(); 사건다시(); });
감쌈('깨우기', (원) => { 원(); Object.entries(판.도는사건 || {}).forEach(([id, i]) => 사건일으킴(id, true, false, i)); }); // 하다 만 사건 이어 가기 (이미 도는 건 그대로)
감쌈('화면', (원, 상태, 글) => {
  원(상태, 글);
  if (상태 === 'sleep') { let u = $('#lkU'); if (!u) { $('.lockv').insertAdjacentHTML('beforeend', '<em class="lk-u" id="lkU"></em>'); u = $('#lkU'); } u.textContent = 덮().잠금이름 || ''; }
});
감쌈('클립읽기', async (원) => { const t = 덮().붙여넣기; if (t != null) { delete 덮().붙여넣기; return t; } return 원(); });
document.addEventListener('paste', e => {
  const t = 덮().붙여넣기, el = e.target; if (t == null || !el.matches?.('textarea, input')) return;
  e.preventDefault(); delete 덮().붙여넣기; 붙이기(el, t);
}, true);

// 에타
감쌈('풀기', (원, p) => {
  const q = 원(p), o = 덮().글?.[q.id]; if (!o) return q;
  return { ...q, ...(o.공감 != null ? { 공감: o.공감 } : {}), ...(o.댓글수 != null ? { 댓글수: o.댓글수 } : {}), ...(o.본문 != null ? { 본문: o.본문 } : {}), 수정됨: o.수정됨, 나글: o.나 };
});
감쌈('판글', (원, k) => k === 'my-write' ? [...원(k), ...글들().filter(p => p.나글 && !p.내것)] : 원(k));
const 로그아웃화면 = () => {
  $('#cmMain').innerHTML = `<section class="cm-card ev-out"><h2>${막음(자료.학교.앱)}</h2><p>${막음(덮().로그아웃)}</p><button class="cm-btn" id="evIn">다시 로그인</button></section>`;
  $('#evIn').onclick = () => { delete 덮().로그아웃; 판보기('all'); };
};
감쌈('판보기', (원, k) => {
  if (덮().로그아웃) { 원(k); 로그아웃화면(); return; }
  원(k);
  const n = 덮().새글; if (n) {
    $('#cmMain .cm-card').insertAdjacentHTML('afterbegin', `<button class="ev-new" id="evNew">새 글 ${n}개</button>`);
    $('#evNew').onclick = () => { delete 덮().새글; 판보기(지금판); };
  }
});
감쌈('글보기', async (원, id) => {
  if (덮().로그아웃) { 로그아웃화면(); return; }
  원(id);
  const p = 찾기(id); if (!p || 쪽 !== 'post') return;
  if (p.수정됨) $('#cmMain .cm-who small')?.insertAdjacentHTML('beforeend', ' · (수정됨)');
  if (p.나글) { const b = $('#cmMain .cm-who b'); if (b) { b.outerHTML = '<b>익명 (나)</b>'; } $('#dmBtn')?.remove(); }
  const 번 = 덮().번역?.[p.id];
  if (번 != null) {
    delete 덮().번역[p.id];
    if (await 묻기('이 페이지를 번역할까요?\n원본 언어: 알 수 없음', [['번역', '번역'], ['안함', '번역 안 함']], 0, '안함', { 제목: '번역' }) === '번역') {
      ((덮().글 ||= {})[p.id] ||= {}).본문 = 번; 글보기(p.id);
    }
  }
});
감쌈('쪽보기', (원, k) => {
  if (덮().로그아웃 && k !== 'dm') { 원(k); 로그아웃화면(); return; }
  원(k);
  if (k === 'tt' && 덮().일정?.length) $('#cmMain .cm-page').insertAdjacentHTML('beforeend', `<h3 style="margin-top:22px">학사 일정</h3><div class="ev-cal">${덮().일정.map(e => `<p><b>${막음(e.날짜)}</b>${막음(e.일정)}</p>`).join('')}</div>`);
});
감쌈('글쓰기화면', async (원, k) => {
  원(k);
  const t = 덮().임시글; if (!t) return;
  delete 덮().임시글;
  if (await 묻기('작성 중이던 글이 있습니다\n불러올까요?', [['예', '불러오기'], ['아니', '새로 쓰기']], 0, '아니', { 제목: 자료.학교.앱 }) === '예') { $('#wTitle').value = t.제목; $('#wBody').value = t.본문; }
});

// 카카오톡
감쌈('친구', (원, id) => {
  const f = 원(id); if (!f) return f;
  if ((덮().탈퇴 || []).includes(id)) return { ...f, 이름: '(알 수 없음)', 상태: '', 사진: '' };
  const 이름 = 판.코코.프로필?.[id]?.이름; return 이름 ? { ...f, 이름 } : f;
});
감쌈('목록그리기', (원) => {
  원();
  if (지금탭 === 'friends') {
    const 가 = 덮().가짜친구 || [], 알 = 덮().알수도 || [];
    if (가.length) $('#koList').insertAdjacentHTML('beforeend', 가.map((n, i) => `<div class="ko-it" data-evf="${i}">${아바타칸({ 이름: n })}<div><b>${막음(n)}</b><small></small></div></div>`).join(''));
    if (알.length) $('#koList').insertAdjacentHTML('beforeend', `<h6>알 수도 있는 친구</h6>` + 알.map((a, i) => `<div class="ko-it">${아바타칸({ 이름: a.이름 })}<div><b>${막음(a.이름)}</b><small></small></div><button class="ev-add" data-eva="${i}">추가</button></div>`).join(''));
  }
  if (지금탭 === 'chats' && (덮().부재 || []).length) {
    $('#koList').insertAdjacentHTML('afterbegin', 덮().부재.map(b => `<div class="ko-it" data-evm="1">${아바타칸({ 이름: b.이름 })}<div><b>${막음(b.이름)}</b><small>부재중 영상통화</small></div><span class="ko-r"><time>${막음(b.시각 || '')}</time></span></div>`).join(''));
  }
});
$('#koList').addEventListener('click', e => {
  const f = e.target.closest('[data-evf]'); if (f) { e.stopImmediatePropagation(); 팝업(`<button class="ko-x" data-close>✕</button><div class="ko-pf">${아바타칸({ 이름: 덮().가짜친구[+f.dataset.evf] }, 'xl')}<b>${막음(덮().가짜친구[+f.dataset.evf])}</b><small></small></div><div class="ko-acts"><button data-x="1:1 채팅">1:1 채팅</button></div>`); return; }
  const a = e.target.closest('[data-eva]'); if (a) { e.stopImmediatePropagation(); const x = 덮().알수도.splice(+a.dataset.eva, 1)[0]; 목록그리기(); if (x?.누르면) 사건일으킴(x.누르면, true); return; }
  if (e.target.closest('[data-evm]')) { e.stopImmediatePropagation(); 알림('통화 기록을 열 수 없습니다'); }
}, true);
감쌈('채팅그리기', (원) => {
  원();
  const id = 연채팅; if (!id) return;
  const 입 = 덮().입력중?.[id];
  if (입 > Date.now()) { $('#chLog').insertAdjacentHTML('beforeend', '<div class="ev-typing">입력 중...</div>'); $('#chLog').scrollTop = 1e6; setTimeout(() => 연채팅 === id && 채팅그리기(), 입 - Date.now() + 50); }
  const 막힘 = (덮().탈퇴 || []).includes(id) ? '탈퇴한 사용자입니다' : (덮().나감 || []).includes(id) ? '대화 상대가 없는 채팅방입니다' : '';
  if (막힘) { $('#chIn').disabled = true; $('#chGo').disabled = true; $('#chPic').disabled = true; $('#chIn').placeholder = 막힘; }
});
감쌈('말칸', (원, m, f, 앞말) => {
  if (m.지움) return 원({ ...m, 글: '삭제된 메시지입니다', 사진: undefined }, f, 앞말).replace('<p class="">', '<p class="ev-gone">');
  if (m.만료 && m.사진) return 원({ ...m, 글: '기간이 만료된 사진입니다', 사진: undefined }, f, 앞말).replace('<p class="">', '<p class="ev-gone">');
  if (m.실패) return 원({ ...m, 안읽음: false }, f, 앞말).replace('<span class="ch-t">', '<span class="ch-t"><em class="ev-fail" title="전송 실패">!</em>');
  return 원(m, f, 앞말);
});
감쌈('보냄', (원, id, 글, 사진) => {
  if (!(덮().실패 || []).includes(id)) return 원(id, 글, 사진);
  넣기(id, { 누가: 'me', 글: 글 || '', 사진, 실패: true }); 소리.딸깍(); 코코그리기();
});
감쌈('읽음', (원, id) => (덮().실패 || []).includes(id) ? undefined : 원(id));
// 보낼 수 없는 상대, 탈퇴하거나 나간 상대: AI 답도 영상통화도 안 된다
const 끊긴상대 = id => ['실패', '탈퇴', '나감'].some(k => (덮()[k] || []).includes(id));
감쌈('AI답', (원, id) => 끊긴상대(id) ? undefined : 원(id));
감쌈('걸기', (원, id) => { if (['탈퇴', '나감'].some(k => (덮()[k] || []).includes(id))) { 알림('통화할 수 없는 상대입니다'); return; } return 원(id); });
// 카카오톡 설정 > 숨긴 친구, 채팅방 메뉴 > 서랍: 사건이 넣어 둔 게 있을 때만 열린다 (아니면 원래처럼 연결 실패)
document.addEventListener('click', e => {
  const x = e.target.closest('[data-x]'); if (!x) return;
  if (x.dataset.x === '설정' && x.closest('#w-coco') && 덮().숨긴?.length) {
    e.stopImmediatePropagation();
    팝업(`<button class="ko-x" data-close>✕</button><h4>숨긴 친구</h4>${덮().숨긴.map(n => `<div class="ko-it">${아바타칸({ 이름: n })}<div><b>${막음(n)}</b></div></div>`).join('')}`);
  }
  if (x.dataset.x === '채팅방 메뉴' && 덮().서랍?.[연채팅]?.length) {
    e.stopImmediatePropagation();
    const p = $('#chPick');
    p.innerHTML = `<div class="ch-pk"><div class="ch-pkh"><b>서랍</b><small>사진</small><button data-pk="x">✕</button></div><div class="ch-pkl">${덮().서랍[연채팅].map(s => `<button><img src="${막음(그림길(s))}" alt=""></button>`).join('')}</div></div>`;
    p.classList.remove('hide'); p.onclick = ev => { if (ev.target === p || ev.target.closest('[data-pk="x"]')) p.classList.add('hide'); };
  }
}, true);

// ── 파일 (게임.js 의 폴더파일, 휴지통목록 이 부른다) ──
function 사건폴더(k, 기본) {
  const d = 덮(), 옮김 = d.옮김 || {}, 보임 = d.보임 || [], 없앰 = d.없앰 || [];
  if (d.폴더?.[k]) return d.폴더[k].map(P파일).filter(Boolean).map(이름덮);
  let 목록 = (기본 || []).filter(f => f && !(f.숨김 && !보임.includes(f.id)) && !없앰.includes(f.id) && !(옮김[f.id] && 옮김[f.id] !== k));
  Object.entries(옮김).forEach(([id, 곳]) => { if (곳 === k && !없앰.includes(id) && !목록.some(f => f.id === id)) { const f = P파일(id); if (f) 목록.push(f); } });
  return [...목록, ...(d.가상?.[k] || [])].map(이름덮);
}
const 이름덮 = f => 덮().이름?.[f.id] ? { ...f, 이름: 덮().이름[f.id] } : f;
function 파일새로() { if (보임('pc')) 탐색(지금폴더); if (보임('bin')) 휴지통그리기(); 아이콘그리기(); }
function 가상파일(폴더, f) { ((덮().가상 ||= {})[폴더] ||= []).push({ ...f, 날: f.날 || `${오늘().날짜} ${지금시각()}` }); 파일새로(); return f; }
// 오른쪽 클릭: 파일 속성, 작업표시줄의 작업 관리자
function 사건메뉴(e, 줄) {
  const r = e.target.closest('#exList .ex-row[data-i]');
  if (r) { const f = 폴더파일(지금폴더)[+r.dataset.i]; 줄.length = 0; 줄.push(['열기', '', true, () => 파일열기(f)], 0, ['속성', '', true, () => 속성창(f)]); return; }
  if (e.target.closest('.task') && !e.target.closest('.ap')) { 줄.length = 0; 줄.push(['작업 관리자', 'Ctrl+Shift+Esc', true, 작업관리자]); }
}
function 속성창(f) {
  const o = 덮().속성?.[f.id] || {};
  묻기(`${f.이름}\n종류: ${f.사진 || f.그림 ? '그림 파일' : f.실행 ? '응용 프로그램' : '텍스트 문서'}\n만든 날짜: ${o.만든날 || f.날 || ''}\n수정한 날짜: ${f.날 || ''}${o.만든이 ? `\n만든 사람: ${o.만든이}` : ''}`, [['확인', '확인']], 0, '확인', { 제목: `${f.이름} 속성` });
}
function 암호묻기(이름) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'ev-pw';
    d.innerHTML = `<div class="ev-pwb"><b>${막음(이름)}</b><p>이 파일은 암호로 보호되어 있습니다.</p><input type="password" id="evPwIn" autocomplete="off"><div><button data-k="ok">확인</button><button data-k="no">취소</button></div></div>`;
    $('#stage').appendChild(d); const i = $('#evPwIn'); i.focus();
    const 끝 = v => { d.remove(); res(v); };
    d.onclick = e => { const b = e.target.closest('button'); if (b) 끝(b.dataset.k === 'ok' ? i.value : null); };
    i.onkeydown = e => { if (e.key === 'Enter') 끝(i.value); if (e.key === 'Escape') 끝(null); };
  });
}
// 메모장: 저장 안 한 변경이 있으면 닫을 때 묻는다
document.addEventListener('click', async e => {
  if (!e.target.closest('#w-note [data-act="close"]') || !덮().별) return;
  e.stopImmediatePropagation();
  const 사건id = 덮().별, k = await 묻기('메모장\n변경 내용을 기록.txt에 저장하시겠습니까?', [['저장', '저장'], ['안함', '저장 안 함'], ['취소', '취소']], 0, '취소', { 제목: '메모장' });
  판.답[사건id] = k; if (k === '취소') return;
  if (k === '안함' && 덮().별글) { 판.기록 = 판.기록.replace(덮().별글, '').replace(/\n+$/, ''); 기록그리기(); }
  delete 덮().별; delete 덮().별글; 사건다시(); 창('note').classList.add('hide'); 창('note').classList.remove('top'); 작업줄();
}, true);

// ── 화면에 붙는 것 (아이콘, 트레이, 와이파이 목록, 탭, 바탕화면) ──
function 덮적용() {
  if (!자료) return;
  if (자료.시간표) { 자료._원과목 ||= 자료.시간표.과목.slice(); 자료.시간표.과목 = [...자료._원과목, ...(덮().시간표 || [])]; }
  if (자료.게시판) { 자료._원게시판 ||= 자료.게시판.slice(); 자료.게시판 = 자료._원게시판.filter(([k]) => !판숨음(k)); }
}
// 할 일이 바꾼 것(지운 메시지, (수정됨), 댓글 수 …)이 지금 보고 있는 카카오톡과 에타 화면에 바로 보이게. 글쓰기, 쪽지 화면은 그대로 (쓰던 글이 날아가지 않게)
function 보던화면다시() {
  if (!자료 || !판.켜짐) return;
  코코그리기();
  if (!보임('web') || ['write', 'dm'].includes(쪽)) return;
  const m = $('#cmMain'), y = m.scrollTop;
  if (쪽 === 'post' && 연글) 글보기(연글.id); else if (쪽 === 'board') 판보기(지금판); else 쪽보기(쪽);
  m.scrollTop = y;
}
function 사건다시() {
  if (!자료) return;
  아이콘그리기(); 트레이그리기(); 탭그리기();
  $('#stage').style.backgroundImage = 덮().바탕 ? `url("${그림길(덮().바탕)}")` : '';
  const t = $('#w-note .ti'); if (t) t.textContent = `📝 ${덮().별 ? '*' : ''}${덮().창제목?.note || '기록.txt'} - 메모장`;
  for (const [app, sel] of [['pc', '#pcTitle'], ['coco', '#cocoTi']]) if (덮().창제목?.[app] && $(sel)) $(sel).textContent = 덮().창제목[app];
  if (덮().탭제목) $('#tabTitle').textContent = 덮().탭제목;
  const wf = $('#wifi'); if (wf) { let m = $('#wfMore'); if (!m) { wf.insertAdjacentHTML('beforeend', '<div class="ev-wf" id="wfMore"></div>'); m = $('#wfMore'); }
    m.innerHTML = (덮().와이파이 || []).map((w, i) => `<button data-evw="${i}"><span>📶</span>${막음(w.이름)}<small>보안</small></button>`).join(''); }
}
function 아이콘그리기() {
  document.querySelectorAll('.ev-ic, .ev-ap').forEach(e => e.remove());
  const 그림칸 = a => a.그림 ? `<img src="${막음(그림길(a.그림))}" alt="">` : '<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="6" fill="#d9dde3"/></svg>';
  (덮().아이콘 || []).forEach((a, i) => {
    if (a.자리 === '작업표시줄') $('.task .apps').insertAdjacentHTML('beforeend', `<div class="ap ev-ap" data-evi="${i}" title="${막음(a.이름)}">${그림칸(a)}</div>`);
    else $('#icons').insertAdjacentHTML('beforeend', `<div class="ic ev-ic" data-evi="${i}">${그림칸(a)}<span class="nm">${막음(a.이름)}</span></div>`);
  });
  (덮().바탕파일 || []).forEach(id => { const f = P파일(id); if (f && !(덮().없앰 || []).includes(id)) $('#icons').insertAdjacentHTML('beforeend', `<div class="ic ev-ic" data-evp="${막음(id)}"><svg viewBox="0 0 48 48"><path d="M11 4h19l9 9v31H11z" fill="#fff"/><path d="M30 4v9h9" fill="#dfe3e8"/></svg><span class="nm">${막음(이름덮(f).이름)}</span></div>`); });
}
$('#icons').addEventListener('dblclick', e => {
  const a = e.target.closest('[data-evi]'); if (a) { e.stopImmediatePropagation(); const x = 덮().아이콘[+a.dataset.evi]; if (x?.누르면) 사건일으킴(x.누르면, true); return; }
  const p = e.target.closest('[data-evp]'); if (p) { e.stopImmediatePropagation(); 파일열기(이름덮(P파일(p.dataset.evp))); }
}, true);
document.querySelector('.task .apps').addEventListener('click', e => { const a = e.target.closest('.ev-ap'); if (a) { const x = 덮().아이콘[+a.dataset.evi]; if (x?.누르면) 사건일으킴(x.누르면, true); } });
// 배터리 아이콘: 남은 만큼 채운다. 15% 아래면 빨강, 충전 중이면 번개
function 배터리그림(n, 충전) {
  const w = Math.max(1, Math.round(13 * n / 100));
  return `<svg width="22" height="12" viewBox="0 0 22 12"><rect x=".6" y=".6" width="18" height="10.8" rx="2.4" fill="none" stroke="currentColor" stroke-opacity=".85" stroke-width="1.2"/><rect x="19.6" y="3.8" width="1.6" height="4.4" rx=".8" fill="currentColor" fill-opacity=".85"/><rect x="2.6" y="2.6" width="${w}" height="6.8" rx="1.2" class="bf"/>${충전 ? '<path d="M10.6 1.6 6.8 6.6h2.6L8.4 10.4l3.8-5H9.6z" fill="#fff" stroke="#1c2028" stroke-width=".8"/>' : ''}</svg>`;
}
function 트레이그리기() {
  let t = $('#evTray'); if (!t) { $('.tray .clk').insertAdjacentHTML('beforebegin', '<span id="evTray" class="ev-tray"></span>'); t = $('#evTray'); }
  const d = 덮();
  t.innerHTML = `${d.녹화 ? '<span class="ico ev-rec" data-evt="rec" title="화면 녹화 중"><i></i></span>' : ''}${d.위치 ? '<span class="ico" data-evt="loc" title="위치 사용 중">📍</span>' : ''}<span class="ico ev-bat${!d.충전 && 배터리() <= 15 ? ' low' : ''}" data-evt="bat" title="${배터리()}% ${d.충전 ? '충전 중' : '남음'}">${배터리그림(배터리(), d.충전)}</span>`;
}
document.querySelector('.tray').addEventListener('click', async e => {
  const t = e.target.closest('[data-evt]');
  if (t?.dataset.evt === 'rec') { 묻기('화면 녹화\n녹화를 멈출 수 없습니다.', [['확인', '확인']], 0, '확인', { 제목: '화면 녹화' }); return; }
  if (t?.dataset.evt === 'loc') { 알림(`${덮().위치} 이(가) 내 위치를 사용하는 중`); return; }
  if (t?.dataset.evt === 'bat') { 알림(덮().충전 ? `${배터리()}% · 전원 연결됨, 충전 중` : `${배터리()}% 남음`); return; }
  const 숨 = e.target.closest('.tray > .ico:first-child'); if (!숨) return;
  const 목록 = 덮().트레이 || [];
  let p = $('#evHid'); if (p) { p.remove(); return; }
  $('#stage').insertAdjacentHTML('beforeend', `<div class="ev-hid" id="evHid">${목록.map((a, i) => `<button data-evh="${i}" title="${막음(a.이름)}">${a.그림 ? `<img src="${막음(그림길(a.그림))}" alt="">` : '▪'}</button>`).join('') || '<small>숨겨진 아이콘 없음</small>'}</div>`);
  $('#evHid').onclick = ev => { const b = ev.target.closest('[data-evh]'); $('#evHid')?.remove(); if (b) { const a = 목록[+b.dataset.evh]; if (a.누르면) 사건일으킴(a.누르면, true); else 알림(a.이름); } };
});
$('#wifi').addEventListener('click', e => { const b = e.target.closest('[data-evw]'); if (!b) return; const w = 덮().와이파이[+b.dataset.evw]; $('#wifi').classList.add('hide'); if (w?.누르면) 사건일으킴(w.누르면, true); else 알림('연결할 수 없습니다'); });
// 브라우저: 연 적 없는 탭, 방문 기록 (⋮ 메뉴)
function 탭그리기() {
  document.querySelector('#w-web .ev-tab')?.remove();
  const t = 덮().탭; if (!t) return;
  document.querySelector('#w-web .tab').insertAdjacentHTML('afterend', `<div class="tab ev-tab"><span class="fav" style="background:#9aa0a6"></span><span>${막음(t.제목)}</span><i>✕</i></div>`);
}
document.querySelector('#w-web .tabs').addEventListener('click', e => {
  const 덮창 = $('#evPage');
  if (e.target.closest('.ev-tab')) {
    if (e.target.tagName === 'I') { e.stopPropagation(); 알림('이 탭을 닫을 수 없습니다'); return; }
    const t = 덮().탭; if (!t) return;
    덮창?.remove(); document.querySelector('#w-web .wb').insertAdjacentHTML('beforeend', `<div class="ev-page" id="evPage"><pre>${막음(t.글)}</pre></div>`);
    $('#urlPath').textContent = t.주소 || ''; $('#urlHost').textContent = '';
    document.querySelectorAll('#w-web .tab').forEach(x => x.classList.toggle('off', !x.classList.contains('ev-tab')));
  } else if (e.target.closest('.tab')) { 덮창?.remove(); $('#urlHost').textContent = 자료.학교.앱주소; document.querySelectorAll('#w-web .tab').forEach(x => x.classList.remove('off')); 주소바꿈(연글); }
});
[...document.querySelectorAll('#w-web .bar button')].find(b => b.textContent === '⋮').onclick = () => {
  $('#evPage')?.remove();
  const 줄 = 덮().방문 || [];
  document.querySelector('#w-web .wb').insertAdjacentHTML('beforeend', `<div class="ev-page" id="evPage"><h3>방문 기록</h3>${줄.map(r => `<p class="ev-his"><time>${막음(r.시각)}</time><b>${막음(r.제목)}</b><small>${막음(r.주소 || '')}</small></p>`).join('') || '<p class="ev-his"><small>방문 기록이 없습니다</small></p>'}<button class="cm-btn lt" id="evPageX">닫기</button></div>`);
  $('#evPageX').onclick = () => $('#evPage').remove();
};
// 작업 관리자 (Ctrl+Shift+Esc, 작업표시줄 오른쪽 클릭)
const 기본프로세스 = [['탐색기', 'Windows 탐색기'], ['브라우저', '웹 브라우저'], ['메모장', '메모장'], ['카카오톡', '메신저'], ['시스템', 'NT Kernel & System']];
function 작업관리자() {
  $('#evTask')?.remove();
  const 목록 = [...기본프로세스.map(([이름, 설명]) => ({ 이름, 설명, 기본: 1 })), ...(덮().프로세스 || [])];
  $('#stage').insertAdjacentHTML('beforeend', `<div class="ev-task" id="evTask"><div class="tb"><div class="ti">작업 관리자</div><button id="evTaskX">✕</button></div>
    <div class="ev-tl"><div class="h"><span>이름</span><span>설명</span><span></span></div>${목록.map((p, i) => `<div><span>${막음(p.이름)}</span><small>${막음(p.설명 || '')}</small><button data-evk="${i}">작업 끝내기</button></div>`).join('')}</div></div>`);
  $('#evTaskX').onclick = () => $('#evTask').remove();
  $('#evTask').onclick = e => { const b = e.target.closest('[data-evk]'); if (!b) return; const p = 목록[+b.dataset.evk];
    p.기본 ? 알림('지금은 끝낼 수 없습니다') : 묻기(`\n액세스가 거부되었습니다.`, [['확인', '확인']], 0, '확인', { 제목: '작업 관리자' }); };
}
document.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.key === 'Escape' && 판.켜짐) { e.preventDefault(); 작업관리자(); } });
// 한/영이 저절로: 한글로 친 글자가 영문 자판 글자로 들어간다 (몇 글자 동안)
const 초성키 = 'rRseEfaqQtTdwWczxvg', 중성키 = ['k', 'o', 'i', 'O', 'j', 'p', 'u', 'P', 'h', 'hk', 'ho', 'hl', 'y', 'n', 'nj', 'np', 'nl', 'b', 'm', 'ml', 'l'];
const 종성키 = ['', 'r', 'R', 'rt', 's', 'sw', 'sg', 'e', 'f', 'fr', 'fa', 'fq', 'ft', 'fx', 'fv', 'fg', 'a', 'q', 'qt', 't', 'T', 'd', 'w', 'c', 'z', 'x', 'v', 'g'];
const 낱자키 = { ㄱ: 'r', ㄲ: 'R', ㄴ: 's', ㄷ: 'e', ㄸ: 'E', ㄹ: 'f', ㅁ: 'a', ㅂ: 'q', ㅃ: 'Q', ㅅ: 't', ㅆ: 'T', ㅇ: 'd', ㅈ: 'w', ㅉ: 'W', ㅊ: 'c', ㅋ: 'z', ㅌ: 'x', ㅍ: 'v', ㅎ: 'g', ㅏ: 'k', ㅐ: 'o', ㅑ: 'i', ㅓ: 'j', ㅔ: 'p', ㅕ: 'u', ㅗ: 'h', ㅛ: 'y', ㅜ: 'n', ㅠ: 'b', ㅡ: 'm', ㅣ: 'l' };
const 영자판 = s => [...s].map(c => { const n = c.charCodeAt(0) - 0xAC00; if (n >= 0 && n < 11172) return 초성키[Math.floor(n / 588)] + 중성키[Math.floor(n % 588 / 28)] + 종성키[n % 28]; return 낱자키[c] || c; }).join('');
document.addEventListener('compositionend', e => {
  const el = e.target; if (!(덮().한영 > 0) || !el.matches?.('textarea, input') || !e.data) return;
  setTimeout(() => {
    const 끝 = el.selectionStart, 앞 = el.value.slice(0, 끝); if (!앞.endsWith(e.data)) return;
    const 영 = 영자판(e.data); el.value = 앞.slice(0, -e.data.length) + 영 + el.value.slice(끝); el.selectionStart = el.selectionEnd = 끝 - e.data.length + 영.length;
    덮().한영 -= e.data.length; el.dispatchEvent(new Event('input'));
  }, 0);
});

// ── 할 일 ──
const 아는앱 = k => k === 'file' ? null : k;
const 알림누름 = id => id ? () => 사건일으킴(id, true) : undefined;
const 할일 = {
  // 기본
  '자막': async h => { await 자막(h.줄 || []); },
  '묻는 창': async (h, x, 끔중) => {
    const 보 = (h.보기 || []).filter(b => b.키);
    if (!보.length) return;
    const k = await 묻기(h.물음 || '', 보.map(b => [b.키, b.글 || b.키]), 빠름 ? Math.min(h.시간 || 0, 2) : h.시간 || 0, h.초과 || 보.at(-1).키, { 제목: h.모양 === '시스템 창' ? h.제목 || '알림' : undefined, 섞기: h.섞기 });
    판.답[x.id] = k;
    const b = 보.find(y => y.키 === k) || {};
    if (b.그다음 === '끄기 막기') return '막기';
    if (b.그다음 === '끄기') { if (!끔중) { await 통화끝까지(); 끄기(); } return '끝'; }
    if (b.그다음 === '절전') { if (!끔중) { await 통화끝까지(); 절전(); } return '끝'; }
    if (b.그다음 === '다른 사건' && b.사건) await 사건일으킴(b.사건, true, 끔중);
  },
  '알림': async h => { 띄움(h.보낸곳 || '', h.제목 || '', h.글 || '', 알림누름(h.누르면)); },
  '소리': async h => { ({ 노크: 소리.노크, 문고리: 소리.문고리, 끊김: 소리.끊김, 알림: 소리.알림, 벨: 소리.벨, 부팅: 소리.부팅, 딸깍: 소리.딸깍, 타자: 소리.타자 })[h.소리]?.call(소리); },
  '기록.txt 에 글 넣기': async h => { 기록추가(h.글 || ''); },
  '기다림': async h => { await 쉼((빠름 ? .2 : h.초 || 0) * 1000); },
  '강제 종료': async (h, x, 끔중) => { if (!끔중) { await 통화끝까지(); 끄기(); } return '끝'; },
  // 엔딩: 검은 화면에 글 → 엔딩 이름 → 저장(절전, 아침, 저장 칸은 그대로)을 지우고 1일차부터. 본 엔딩은 "저장 이름:엔딩" 에 남긴다
  '엔딩': async h => {
    판.켜짐 = false; 묻기.닫기?.(); 소리.팬(false); 전화다멈춤();
    화면('black'); await 쉼(빠름 ? 200 : 1500);
    for (const 줄 of h.줄 || []) { 화면('text', 줄); await 쉼(빠름 ? 300 : 2800); }
    화면('title', h.이름 || ''); await 쉼(빠름 ? 500 : 4500);
    try {
      const 본 = 본엔딩(); if (h.이름 && !본.some(e => e.이름 === h.이름)) 본.push({ 이름: h.이름, 줄: h.줄 || [], 날: `${오늘날()} ${지금시각()}` });
      localStorage.setItem(저장키 + ':엔딩', JSON.stringify(본)); localStorage.removeItem(저장키); localStorage.removeItem(아침키);
    } catch (e) {}
    location.search = 다시시작주소();
    return '끝';
  },
  // 게임 오버: 검은 화면에 글 몇 줄 → 그날 아침부터 다시 (게임.js 시작() 이 아침 판을 불러와 켠다)
  '게임 오버': async h => {
    판.켜짐 = false; 묻기.닫기?.(); 소리.팬(false); 전화다멈춤();
    화면('black'); await 쉼(빠름 ? 200 : 1500);
    for (const 줄 of h.줄 || []) { 화면('text', 줄); await 쉼(빠름 ? 300 : 2800); }
    화면('black'); await 쉼(빠름 ? 200 : 1200);
    try { const 아침 = localStorage.getItem(아침키); if (아침) localStorage.setItem(저장키, 아침); sessionStorage.setItem('회신없음:게임오버', '1'); } catch (e) {}
    location.search = 다시시작주소();
    return '끝';
  },
  '다른 사건': async (h, x, 끔중) => { if (h.사건) await 사건일으킴(h.사건, true, 끔중); },

  // 화면
  '창이 저절로': async h => {
    if (h.창 === 'file') { const f = P파일(h.파일); if (f && h.하기 !== '닫기') 파일열기(이름덮(f)); if (h.하기 === '닫기') { 창('view').classList.add('hide'); 작업줄(); } return; }
    if (h.하기 === '닫기') { 창(h.창)?.classList.add('hide'); 창(h.창)?.classList.remove('top'); 작업줄(); } else 열(아는앱(h.창));
  },
  '저절로 타자': async h => {
    열('note'); const 쉬는 = { 느리게: 220, 보통: 110, 빠르게: 45 }[h.빠르기] || 110;
    if (판.기록 && !판.기록.endsWith('\n')) 판.기록 += '\n';
    for (const c of h.글 || '') { 판.기록 += c; 기록그리기(); $('#noteText').scrollTop = 1e6; if (c !== ' ') 소리.타자(); await 쉼(빠름 ? 5 : 쉬는 + Math.random() * 쉬는); }
  },
  '시계 이상': async h => {
    if (h.하기 === '멈춤') 덮().시계멈춤 = Date.now() + (빠름 ? 1 : h.초 || 10) * 1000;
    if (h.하기 === '거꾸로') 초 = Math.max(0, 초 - (h.분 || 1) * 60);
    if (h.하기 === '튐' && h.시각) { const [a, b] = h.시각.split(':').map(Number), 시작 = 오늘().시작[0] * 3600 + 오늘().시작[1] * 60; 초 = a * 3600 + b * 60; if (초 < 시작) 초 += 86400; 끝시각확인(); }
    시계();
  },
  '커서가 저절로': async h => {
    const 목표 = h.갈곳 === 'start' ? $('#startBtn') : h.갈곳 === 'middle' ? null : document.querySelector(`#icons .ic[data-open="${h.갈곳}"]`);
    const s = $('#stage').getBoundingClientRect(), r = 목표?.getBoundingClientRect();
    const x = r ? (r.left + r.width / 2 - s.left) / 배율 : 960, y = r ? (r.top + r.height / 2 - s.top) / 배율 : 540;
    $('#stage').insertAdjacentHTML('beforeend', '<div class="ev-block" id="evBlock"></div><div class="ev-cur" id="evCur"></div>');
    const c = $('#evCur'), 초 = 빠름 ? .3 : h.초 || 2;
    c.style.left = '1500px'; c.style.top = '900px'; void c.offsetWidth;
    c.style.transition = `left ${초}s ease-in-out, top ${초}s ease-in-out`; c.style.left = x + 'px'; c.style.top = y + 'px';
    await 쉼(초 * 1000 + 200);
    if (h.누름) { 소리.딸깍(); if (h.갈곳 === 'start') $('#startBtn').click(); else if (h.갈곳 !== 'middle') 열(h.갈곳); }
    await 쉼(빠름 ? 100 : 600); c.remove(); $('#evBlock').remove();
  },
  '바탕화면이 바뀜': async h => {
    if (h.초) { $('#stage').style.backgroundImage = `url("${그림길(h.그림)}")`; await 쉼((빠름 ? .3 : h.초) * 1000); 사건다시(); } else 덮().바탕 = h.그림;
  },
  '잠금 화면 이름': async h => { 덮().잠금이름 = h.이름 || ''; },
  '소리가 끊김': async h => { const 전 = 소리.꺼짐; 소리.끄기(true); await 쉼((빠름 ? .3 : h.초 || 3) * 1000); if (!전) 소리.끄기(false); },
  '모르는 아이콘': async h => {
    const 목록 = 덮().아이콘 ||= [];
    if (h.없앰) { 덮().아이콘 = 목록.filter(a => a.이름 !== h.이름); return; }
    목록.push({ 자리: h.자리 || '바탕화면', 이름: h.이름 || '', 그림: h.그림, 누르면: h.누르면 });
  },
  '숨겨진 아이콘': async h => { (덮().트레이 ||= []).push({ 이름: h.이름 || '', 그림: h.그림, 누르면: h.누르면 }); },
  '화면 녹화 중': async h => { 덮().녹화 = h.하기 !== '끝'; },
  '전원 연결됨': async h => { 덮().충전 = h.하기 !== '원래대로'; },
  '한/영이 저절로': async h => { 덮().한영 = h.번 || 12; },
  '드라이브 검사': async h => { 덮().부팅글 = { 글: h.글 || '', 초: h.초 || 4 }; },
  '지난밤 업데이트': async h => { 덮().업데이트 = { 글: h.글 || '', 시각: h.시각 || '' }; },

  // 창과 알림
  '오류 창': async h => { await 묻기(`\n${h.글 || ''}`, [['확인', h.버튼 || '확인']], 0, '확인', { 제목: h.제목 || '오류' }); },
  '시스템 알림': async h => {
    const [제목, 기본글] = { '카메라 사용 중': ['카메라를 사용하는 중', '앱이 카메라를 사용하고 있습니다'], '마이크 사용 중': ['마이크를 사용하는 중', '앱이 마이크를 사용하고 있습니다'], '배터리 부족': ['배터리 부족', '배터리가 10% 남았습니다. 전원을 연결하세요'], '업데이트 재시작 예정': ['다시 시작 예정', '업데이트를 마치려면 오늘 밤 다시 시작합니다'] }[h.갈래] || ['알림', ''];
    띄움('Windows', 제목, h.글 || 기본글);
  },
  '기기 연결 요청': async (h, x) => {
    const k = await 묻기(`장치 연결\n${h.기기 || ''} 이(가) 이 PC에 연결하려고 합니다. 허용하시겠습니까?`, [['허용', '허용'], ['거부', '거부']], 0, '거부', { 제목: '블루투스' });
    판.답[x.id] = k; const 다음 = k === '허용' ? h.허용 : h.거부; if (다음) await 사건일으킴(다음, true);
  },
  '와이파이 목록': async h => { (덮().와이파이 ||= []).push({ 이름: h.이름 || '', 누르면: h.누르면 }); },
  '없는 프린터': async h => { 띄움('프린터', '인쇄 대기 중', `문서 1개 · ${h.문서 || ''}`); },
  '설정한 적 없는 알람': async h => { 소리.벨(); 띄움(h.갈래 === '일정' ? '캘린더' : '알람 및 시계', h.제목 || '', h.글 || ''); },
  '다른 기기 로그인': async h => { 띄움(h.앱 === '컴퓨터' ? 'Microsoft 계정' : h.앱 === '에타' ? 자료.학교.앱 : 앱이름(), '다른 기기에서 로그인했습니다', [h.기기, h.위치].filter(Boolean).join(' · ')); },
  '위치 사용 중': async h => { 덮().위치 = h.앱 || '앱'; },
  '폰 알림 미러링': async h => { 띄움(`휴대폰 연결 · ${h.앱 || ''}`, h.보낸이 || h.앱 || '', h.글 || ''); },
  '새 메일 알림': async h => { 띄움('메일', h.보낸이 || '', h.제목 || ''); },
  '1년 전 오늘': async h => {
    const f = h.이름 ? 가상파일('사진', { 이름: h.이름, 사진: 그림길(h.그림) }) : { 이름: '1년 전 오늘', 사진: 그림길(h.그림) };
    띄움('사진', '1년 전 오늘', h.날짜 || '', () => 파일열기(f));
  },
  '시작 프로그램 등록': async h => { 띄움('Windows', '시작 앱', `${h.앱 || ''} 이(가) 컴퓨터를 켤 때 실행되도록 설정되었습니다`); if (h.다음날) 덮넣기('시작프로그램', h.다음날); },

  // 파일과 입력
  '파일이 생김': async h => {
    const f = P파일(h.파일); if (!f) return;
    덮넣기('보임', f.id); 덮().없앰 = (덮().없앰 || []).filter(id => id !== f.id);
    if (h.폴더 === '바탕화면') 덮넣기('바탕파일', f.id); else if (h.폴더) (덮().옮김 ||= {})[f.id] = h.폴더;
    파일새로();
  },
  '파일이 사라짐': async h => { if (h.파일) 덮넣기('없앰', h.파일); 파일새로(); },
  '이름이 바뀜': async h => {
    if (h.대상 === '파일' && h.파일) (덮().이름 ||= {})[h.파일] = h.새이름;
    if (h.대상 === '창 제목' && h.창) (덮().창제목 ||= {})[h.창] = h.새이름;
    if (h.대상 === '탭 제목') 덮().탭제목 = h.새이름;
    파일새로();
  },
  '기록.txt 가 바뀜': async h => {
    const 찾 = 글자만(h.찾을말); if (!찾) return;
    if (h.하기 === '바꾸기') { const 틀 = new RegExp([...찾].map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'), 'g'); 판.기록 = 판.기록.replace(틀, h.바꿀말 || ''); }
    else 판.기록 = 판.기록.split('\n').filter(줄 => !글자만(줄).includes(찾)).join('\n');
    기록그리기();
  },
  '붙여넣기가 다름': async h => { 덮().붙여넣기 = h.글 || ''; },
  '받은 적 없는 다운로드': async h => {
    const f = P파일(h.파일); if (!f) return;
    $('#stage').insertAdjacentHTML('beforeend', `<div class="ev-dl" id="evDl"><b>${막음(f.이름)}</b><div><i id="evDlBar"></i></div><small id="evDlT">다운로드 중</small></div>`);
    const 초 = 빠름 ? .5 : h.초 || 5, 바 = $('#evDlBar'); 바.style.transition = `width ${초}s linear`; void 바.offsetWidth; 바.style.width = '100%';
    await 쉼(초 * 1000); $('#evDlT').textContent = '다운로드 완료 · 다운로드 폴더'; 덮넣기('보임', f.id); 덮().없앰 = (덮().없앰 || []).filter(id => id !== f.id); (덮().옮김 ||= {})[f.id] = '다운로드'; 파일새로();
    await 쉼(빠름 ? 300 : 3000); $('#evDl')?.remove();
  },
  '찍은 적 없는 스크린샷': async h => { const f = 가상파일('사진', { 이름: h.이름 || '스크린샷.png', 사진: 그림길(h.그림) }); 띄움('캡처 도구', '스크린샷이 저장되었습니다', f.이름, () => 파일열기(f)); },
  '저장 안 한 변경': async (h, x) => { 덮().별 = x.id; if (h.글) { 기록추가(h.글); 덮().별글 = h.글; } },
  '꽂은 적 없는 장치': async h => {
    if (h.갈래 === '헤드셋') { 띄움('오디오', '헤드셋이 연결되었습니다', h.이름 || ''); return; }
    (덮().폴더 ||= {})[h.이름 || 'USB'] = h.파일들 || []; 파일새로();
    띄움('USB 장치', `${h.이름 || 'USB'} 이(가) 연결되었습니다`, '눌러서 열기', () => { 열('pc'); 탐색(h.이름 || 'USB'); });
  },
  '저장 공간 부족': async h => { (덮().폴더 ||= {})[h.폴더 || '큰 파일'] = h.파일들 || []; 파일새로(); 띄움('저장소', '저장 공간이 부족합니다', '공간을 많이 쓰는 파일을 확인하세요', () => { 열('pc'); 탐색(h.폴더 || '큰 파일'); }); },
  '공유 폴더': async h => { (덮().폴더 ||= {})[h.폴더 || '공유'] = h.파일들 || []; 파일새로(); 띄움('공유', `${h.보낸이 || ''}님이 폴더를 공유했습니다`, h.폴더 || '', () => { 열('pc'); 탐색(h.폴더 || '공유'); }); },
  '복구된 파일': async h => { const f = 가상파일('문서', { 이름: h.이름 || '복구된 문서.txt', 글: h.내용 || '' }); 띄움('메모장', '복구된 파일', `저장하지 못한 문서를 복구했습니다 · ${f.이름}`, () => 파일열기(f)); },
  '파일 속성': async h => { if (h.파일) (덮().속성 ||= {})[h.파일] = { 만든날: h.만든날, 만든이: h.만든이 }; },
  '암호 걸린 파일': async (h, x) => { if (h.파일) (덮().암호 ||= {})[h.파일] = { 암호: h.암호 || '', 힌트: h.힌트, 풀림: h.풀림, 사건: x.id }; },
  '모르는 프로세스': async h => { (덮().프로세스 ||= []).push({ 이름: h.이름 || '', 설명: h.설명 || '' }); },

  // 에타
  '방문 기록': async h => { (덮().방문 ||= []).push(...(h.줄 || [])); },
  '탭이 하나 더': async h => { 덮().탭 = { 제목: h.제목 || '', 주소: h.주소 || '', 글: h.글 || '' }; },
  '페이지 번역': async h => { if (h.글) (덮().번역 ||= {})[h.글] = h.번역 || ''; },
  '없는 새 글': async h => { 덮().새글 = h.수 || 1; if (보임('web') && 쪽 === 'board') 판보기(지금판); },
  '(수정됨)': async h => { if (!h.글) return; const o = ((덮().글 ||= {})[h.글] ||= {}); o.수정됨 = true; if (h.본문) o.본문 = h.본문; },
  '공감 알림': async h => { for (let i = 0; i < (h.번 || 1); i++) { 띄움(자료.학교.앱, '공감', '내 글에 공감이 달렸습니다'); await 쉼(빠름 ? 200 : 2500 + Math.random() * 3000); } },
  '내 글이 있음': async h => { if (h.글) ((덮().글 ||= {})[h.글] ||= {}).나 = true; },
  '쓴 적 없는 내 활동': async h => {
    if (h.갈래 === '쪽지') { const id = `ev${(h.상대 || '').length}${글자만(h.상대)}`; 상대만들기(id, h.상대 || '익명', true); 판.쪽지[id].push(['me', h.내용 || '', '03:12']); 쪽지표시(); return; }
    const p = 찾기(h.글); if (!p) return;
    (판.더한[p.id] ||= []).push(['익명', h.내용 || '', '03:12', 0, 1, 0, 1, `${p.날} `]); 판.댓단글.add(p.id);
  },
  '한 적 없는 스크랩': async h => { if (h.글) 판.스크랩.add(+h.글); },
  '신고 처리': async h => { 띄움(자료.학교.앱, '신고 처리 안내', `회원님의 글 "${h.글 || ''}" 이(가) 신고되어 숨김 처리되었습니다`); },
  '로그아웃': async h => { 덮().로그아웃 = h.글 || '다른 기기에서 로그인해 로그아웃되었습니다'; if (보임('web')) 로그아웃화면(); },
  '비밀번호 변경 알림': async h => { 띄움(h.앱 === '카카오톡' ? 앱이름() : 자료.학교.앱, '비밀번호가 변경되었습니다', '본인이 변경하지 않았다면 고객센터에 문의하세요'); },
  '임시 저장된 글': async h => { 덮().임시글 = { 제목: h.제목 || '', 본문: h.본문 || '' }; },
  '시간표가 바뀜': async h => { (덮().시간표 ||= []).push([h.요일, h.시작, h.길이 || 1, h.이름 || '', h.곳 || '']); 덮적용(); },
  '새 게시판': async h => { if (h.게시판) 덮넣기('판', h.게시판); 덮적용(); 판목록(); }, // 에타 창이 닫혀 있어도 다시 그려 둔다 (열면 바로 보이게)
  '학사 일정': async h => { (덮().일정 ||= []).push({ 날짜: h.날짜 || '', 일정: h.일정 || '' }); },
  '친구 신청': async (h, x) => {
    const k = await 묻기(`친구 신청\n${h.이름 || ''}님이 친구 신청을 보냈습니다.`, [['수락', '수락'], ['거절', '거절']], 0, '거절', { 제목: 자료.학교.앱 });
    판.답[x.id] = k; const 다음 = k === '수락' ? h.수락 : h.거절; if (다음) await 사건일으킴(다음, true);
  },

  // 카카오톡
  '입력 중...': async h => { (덮().입력중 ||= {})[h.친구] = Date.now() + (빠름 ? .5 : h.초 || 4) * 1000; if (연채팅 === h.친구 && 보임('chat')) 채팅그리기(); },
  '알림만 온 메시지': async h => { 띄움(앱이름(), h.이름 || '', h.글 || '', () => 열('coco')); },
  '상대가 지운 메시지': async h => {
    const 줄 = (판.코코.대화[h.친구] || []).filter(m => m.누가 === 'them' && !m.지움);
    const m = h.찾을말 ? 줄.find(y => 글자만(y.글).includes(글자만(h.찾을말))) : 줄.at(-1); if (m) m.지움 = true;
  },
  '읽음이 되돌아감': async h => { const m = (판.코코.대화[h.친구] || []).filter(y => y.누가 === 'me').at(-1); if (m) m.안읽음 = true; },
  '만료된 사진': async h => { (판.코코.대화[h.친구] || []).forEach(m => { if (m.누가 === 'them' && m.사진) m.만료 = true; }); },
  '보낼 수 없음': async h => { 덮().실패 = (덮().실패 || []).filter(id => id !== h.친구); if (h.하기 !== '다시 되게') 덮().실패.push(h.친구); },
  '나간 채팅방': async h => { const f = 친구(h.친구); 덮넣기('나감', h.친구); if (f) 시스템(h.친구, `${f.이름}님이 나갔습니다`); },
  '탈퇴한 사용자': async h => { 덮넣기('탈퇴', h.친구); },
  '프로필이 바뀜': async h => { const o = 판.코코.프로필[h.친구] ||= {}; if (h.이름) o.이름 = h.이름; if (h.상태) o.상태 = h.상태; if (h.사진) o.사진 = h.사진; },
  '숫자가 이상': async h => {
    if (h.대상 === '카카오톡 안 읽음 수' && h.친구) { 판.코코.안읽은[h.친구] = h.값 ?? 0; return; }
    if (h.글) ((덮().글 ||= {})[h.글] ||= {})[h.대상 === '에타 공감 수' ? '공감' : '댓글수'] = h.값 ?? 0;
  },
  '모르는 부재중': async h => { (덮().부재 ||= []).unshift({ 이름: h.이름 || '', 시각: h.시각 || 지금시각() }); 띄움(앱이름(), h.이름 || '', '부재중 영상통화', () => { 열('coco'); 지금탭 = 'chats'; 목록그리기(); }); },
  '추가한 적 없는 친구': async h => { 덮넣기('가짜친구', h.이름 || ''); },
  '알 수도 있는 친구': async h => { (덮().알수도 ||= []).push({ 이름: h.이름 || '', 누르면: h.누르면 }); },
  '숨긴 친구': async h => { 덮넣기('숨긴', h.이름 || ''); },
  '생일 알림': async h => { 띄움(앱이름(), '생일', `오늘은 ${h.이름 || ''}님의 생일입니다`); },
  '선물 알림': async h => { 띄움(앱이름(), '선물하기', `${h.보낸이 || ''}님이 선물을 보냈습니다`, () => 묻기(`선물 카드\n${h.카드 || ''}`, [['확인', '확인']], 0, '확인', { 제목: '선물하기' })); },
  '단톡방 초대': async h => {
    띄움(앱이름(), h.방 || '', `${h.보낸이 || ''}님이 채팅방에 초대했습니다`, async () => {
      if (await 묻기(`${h.방 || ''}\n참여자 ${(h.사람들 || []).length + 1}명 · ${[h.보낸이, ...(h.사람들 || [])].filter(Boolean).join(', ')}`, [['입장', '들어가기'], ['닫기', '닫기']], 0, '닫기', { 제목: 앱이름() }) === '입장') 안됨('채팅방');
    });
  },
  '채팅방 서랍': async h => { ((덮().서랍 ||= {})[h.친구] ||= []).push(...(h.사진들 || []).map(s => s.사진).filter(Boolean)); },
};
