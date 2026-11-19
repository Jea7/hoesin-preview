// 소리. 파일 없이 Web Audio 로 만든다. 시험할 때는 주소에 ?mute 를 붙여 무음으로 돌린다.
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막기 때문에 첫 클릭에 깨운다.
const 소리 = (() => {
  let 판 = null, 큰소리 = null, 팬 = null;
  let 끔 = new URLSearchParams(location.search).has('mute');
  const 준비 = () => {
    if (끔) return null;
    if (!판) { 판 = new (window.AudioContext || window.webkitAudioContext)(); 큰소리 = 판.createGain(); 큰소리.gain.value = .7; 큰소리.connect(판.destination); }
    if (판.state === 'suspended') 판.resume();
    return 판;
  };
  addEventListener('pointerdown', () => 준비(), { once: false, passive: true });
  // 소리 파일 자리 (문서/소리 목록.md): 게임/소리/<이름>.mp3|.ogg|.wav 가 있으면 그 파일을 튼다. 없으면 아래 만든 소리
  const 파일 = {}, 이름들 = ['노크', '문고리', '형광펜', '알림', '타자', '부팅', '끊김', '딸깍', '벨', '팬'];
  // 폴더 목록을 한 번만 읽는다 (서버가 폴더 안 파일 이름을 보여 줌). 파일로 열었으면 그냥 만든 소리
  fetch('소리/').then(r => r.ok ? r.text() : '').then(h => { const 있음 = new Set([...h.matchAll(/href="([^"]+)"/g)].map(m => decodeURIComponent(m[1]))); 이름들.forEach(n => { const f = ['mp3', 'ogg', 'wav'].map(끝 => `${n}.${끝}`).find(f => 있음.has(f)); if (f) 파일[n] = `소리/${f}`; }); }).catch(() => {});
  let 팬소리 = null;
  const 틀기 = (n, 반복) => { if (끔 || !파일[n]) return false; const a = new Audio(파일[n]); a.loop = !!반복; a.volume = .7; a.play().catch(() => {}); return a; };

  // 짧은 소리 하나: 주파수, 길이, 파형, 크기, 시작 지연
  function 톤(hz, 길이, 파형 = 'sine', 크기 = .2, 지연 = 0) {
    const c = 준비(); if (!c) return;
    const t = c.currentTime + 지연, o = c.createOscillator(), g = c.createGain();
    o.type = 파형; o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(크기, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + 길이);
    o.connect(g); g.connect(큰소리); o.start(t); o.stop(t + 길이 + .02);
  }
  function 잡음(길이, 크기, 낮춤 = 900, 지연 = 0) {
    const c = 준비(); if (!c) return;
    const t = c.currentTime + 지연, n = c.createBuffer(1, c.sampleRate * 길이, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = n; f.type = 'lowpass'; f.frequency.value = 낮춤; g.gain.value = 크기;
    s.connect(f); f.connect(g); g.connect(큰소리); s.start(t);
  }
  return {
    get 꺼짐() { return 끔; },
    끄기(on) { 끔 = on; if (on && 판) 판.suspend(); if (!on) { 준비(); if (팬) this.팬(true); } },
    노크() { if (틀기('노크')) return; 톤(70, .18, 'sine', .9); 잡음(.12, 1.2, 400); },
    // 문고리를 돌려도 안 열림: 철컥철컥 (걸쇠에 걸리는 쇳소리 여러 번)
    문고리() { if (틀기('문고리')) return; [0, .16, .42, .56].forEach(t => { 잡음(.05, .9, 3800, t); 톤(1900, .05, 'square', .03, t); 톤(110, .08, 'sine', .5, t + .01); }); },
    // 형광펜 긋는 소리: 종이 위를 슥 (높아지는 사각거림). 초: 긋는 동안만큼 (기본 0.5초)
    형광펜(초 = .5) {
      if (틀기('형광펜')) return; const c = 준비(); if (!c) return;
      const t = c.currentTime, 길이 = Math.max(.3, Math.min(4, 초)), n = c.createBuffer(1, c.sampleRate * 길이, c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (.6 + .4 * Math.sin(i / c.sampleRate * 90));
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = n; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(1600, t); f.frequency.linearRampToValueAtTime(3600, t + 길이);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .06); g.gain.setValueAtTime(.35, t + 길이 - .12); g.gain.linearRampToValueAtTime(0, t + 길이);
      s.connect(f); f.connect(g); g.connect(큰소리); s.start(t); s.stop(t + 길이);
    },
    알림() { if (틀기('알림')) return; 톤(880, .25, 'sine', .12); 톤(1320, .35, 'sine', .08, .09); },
    타자() { if (틀기('타자')) return; 잡음(.03, .25, 2500); },
    부팅() { if (틀기('부팅')) return; [523, 659, 784, 1047].forEach((h, i) => 톤(h, .9, 'triangle', .06, i * .12)); },
    끊김() { if (틀기('끊김')) return; 톤(440, .2, 'square', .04); 톤(330, .3, 'square', .04, .18); },
    딸깍() { if (틀기('딸깍')) return; 잡음(.02, .3, 3000); },
    // 영상통화 벨: 두 번 울리는 짧은 소리 한 묶음
    벨() { if (틀기('벨')) return; [0, .18, .5, .68].forEach(t => 톤(t % .5 < .1 ? 784 : 988, .16, 'sine', .1, t)); },
    // 컴퓨터가 켜져 있는 동안 낮게 도는 팬 소리
    팬(on) {
      if (팬소리) { 팬소리.pause(); 팬소리 = null; }
      if (on && (팬소리 = 틀기('팬', true))) return;
      const c = 준비();
      if (팬) { 팬.forEach(x => { try { x.stop(); } catch (e) {} }); 팬 = null; }
      if (!on || !c) return;
      const o = c.createOscillator(), g = c.createGain(), n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g2 = c.createGain();
      s.buffer = n; s.loop = true; f.type = 'lowpass'; f.frequency.value = 220; g2.gain.value = .05;
      o.frequency.value = 58; g.gain.value = .012;
      o.connect(g); g.connect(큰소리); s.connect(f); f.connect(g2); g2.connect(큰소리); o.start(); s.start();
      팬 = [o, s];
    },
  };
})();
