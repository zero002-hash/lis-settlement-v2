// ── UT 클릭 히트맵 ──
// 배차관리 화면(본문 · 배차일지 패널 · AI 배차계획 iframe 포함)에서 참가자의 클릭 위치를 기록하고,
// 진행자가 단축키로 연 패널에서 화면 위에 히트맵을 겹쳐 본다.
//  - Ctrl + Shift + H : 진행자 패널 열기/닫기 (참가자에게는 아무것도 보이지 않음)
//  - 기록은 이 브라우저(localStorage)에만 저장 → 여러 PC에서 진행했다면 JSON 내보내기 후 한 PC에서 불러오기로 합침
//  - 같은 버튼이라도 열린 화면(모달·패널)에 따라 위치가 달라서, 클릭할 때의 '화면'을 함께 기록하고 화면별로 본다

type Click = {
  id: string;
  p: string; // 참가자
  task: string; // 과업
  screen: string; // 클릭 당시 화면 상태
  x: number; y: number; // 최상위 화면 기준 좌표(px)
  vw: number; vh: number; // 기록 당시 화면 크기
  label: string; // 클릭한 요소 이름
  t: number;
};

const STORE_KEY = 'lis.ut.heatmap.v1';
const SESSION_KEY = 'lis.ut.heatmap.session';
const Z = 2147483647;
const AUTO_SCREEN = '__auto__';
const ALL = '__all__';

let clicks: Click[] = [];
let session = { recording: false, p: '', task: '' };
let installed = false;
let panel: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let showHeat = false;
let showDots = false;
let filter = { p: ALL, task: ALL, screen: AUTO_SCREEN };
let lastScreen = '';
let timer = 0;
const hooked = new WeakSet<Document>();
let iframeObserver: MutationObserver | null = null;

// ── 저장 ──
function load() {
  try { clicks = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { clicks = []; }
  try { session = { ...session, ...JSON.parse(localStorage.getItem(SESSION_KEY) || '{}') }; } catch { /* 무시 */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(clicks)); } catch { /* 저장 불가 환경은 무시 */ }
}
function saveSession() {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* 무시 */ }
}

// ── 화면 상태 ──
function frameByTitle(title: string) {
  return Array.from(document.querySelectorAll('iframe')).find(f => f.title === title) as HTMLIFrameElement | undefined;
}
function isOpen(doc: Document, id: string) {
  const el = doc.getElementById(id);
  return !!el && el.classList.contains('open');
}
export function currentScreen(): string {
  const ai = frameByTitle('AI 배차계획');
  const doc = ai && ai.style.display !== 'none' ? safeDoc(ai) : null;
  if (doc) {
    if (isOpen(doc, 'acOverlay')) return 'AI · 적용 전 확인';
    if (isOpen(doc, 'arStopSub')) return 'AI · 그만하기 확인';
    if (isOpen(doc, 'arOverlay')) return 'AI · 예상 결과';
    if (isOpen(doc, 'ldOverlay')) return 'AI · 로딩';
    if (isOpen(doc, 'apPick')) return 'AI · 선택 모아보기';
    if (isOpen(doc, 'apOverlay')) {
      const step = (doc.querySelector('.ap-step.on') as HTMLElement | null)?.dataset.step;
      return step === '2' ? 'AI · 2. 기사 선택' : 'AI · 1. 오더 선택';
    }
    if (['rsOverlay', 'cfOverlay', 'csOverlay'].some(id => isOpen(doc, id))) return 'AI · 기타 모달';
  }
  const log = document.querySelector('[data-name=gs-schedule-panel]') as HTMLElement | null;
  if (log && log.style.display !== 'none') {
    return log.offsetWidth >= 760 ? '배차관리 + 배차일지(넓게보기)' : '배차관리 + 배차일지(요약보기)';
  }
  return '배차관리';
}

function safeDoc(f: HTMLIFrameElement) {
  try { return f.contentDocument; } catch { return null; }
}

// ── 기록 ──
function labelOf(target: Element | null, frameName: string) {
  if (!target) return frameName;
  const control = target.closest('button,a,input,select,textarea,label,[role=button],[role=tab],[role=checkbox],th,td');
  const el = control || target;
  let text = (el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLInputElement).placeholder || el.textContent || '')
    .replace(/\s+/g, ' ').trim();
  // 버튼·셀이 아닌 넓은 영역은 안의 글자가 길게 이어 붙으므로 '빈 영역'으로 묶음
  if (!control && text.length > 24) text = '';
  return (frameName ? frameName + ' › ' : '') + (text.slice(0, 30) || '(빈 영역)');
}

function record(e: MouseEvent, frame: HTMLIFrameElement | null) {
  if (!session.recording) return;
  const target = e.target as Element | null;
  if (target && panel && !frame && panel.contains(target)) return; // 진행자 패널 클릭은 제외
  let x = e.clientX, y = e.clientY;
  if (frame) {
    const r = frame.getBoundingClientRect();
    x += r.left; y += r.top;
  }
  clicks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    p: session.p || '익명', task: session.task || '-', screen: currentScreen(),
    x: Math.round(x), y: Math.round(y), vw: window.innerWidth, vh: window.innerHeight,
    label: labelOf(target, frame ? frame.title : ''), t: Date.now(),
  });
  save();
  if (panel && panel.style.display !== 'none') renderPanel();
  if (showHeat) scheduleDraw();
}

function onKey(e: KeyboardEvent) {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
    e.preventDefault();
    togglePanel();
  }
}

function hookDoc(doc: Document, frame: HTMLIFrameElement | null) {
  if (hooked.has(doc)) return;
  hooked.add(doc);
  doc.addEventListener('pointerdown', (e) => record(e as MouseEvent, frame), true);
  doc.addEventListener('keydown', onKey, true);
}

function hookFrame(f: HTMLIFrameElement) {
  const tryHook = () => { const d = safeDoc(f); if (d && d.readyState !== 'loading') hookDoc(d, f); else if (d) d.addEventListener('DOMContentLoaded', () => hookDoc(d, f)); };
  f.addEventListener('load', tryHook);
  tryHook();
}

function hookFrames() {
  document.querySelectorAll('iframe').forEach(f => hookFrame(f as HTMLIFrameElement));
}

// ── 히트맵 그리기 ──
function visibleClicks() {
  const screen = filter.screen === AUTO_SCREEN ? currentScreen() : filter.screen;
  return clicks.filter(c =>
    (filter.p === ALL || c.p === filter.p) &&
    (filter.task === ALL || c.task === filter.task) &&
    (screen === ALL || c.screen === screen));
}

// 파랑 → 청록 → 초록 → 노랑 → 빨강
let palette: Uint8ClampedArray | null = null;
function getPalette() {
  if (palette) return palette;
  const c = document.createElement('canvas'); c.width = 256; c.height = 1;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, '#2B4BFF'); grad.addColorStop(0.3, '#00D2FF'); grad.addColorStop(0.5, '#3BE36B');
  grad.addColorStop(0.75, '#FFE14D'); grad.addColorStop(1.0, '#FF2D2D');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 1);
  palette = g.getImageData(0, 0, 256, 1).data;
  return palette;
}

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.setAttribute('data-name', 'ut-heatmap');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: String(Z - 1) });
  document.body.appendChild(canvas);
  return canvas;
}

function draw() {
  const cv = ensureCanvas();
  cv.style.display = showHeat ? 'block' : 'none';
  if (!showHeat) return;
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  const list = visibleClicks();
  lastScreen = currentScreen();
  if (!list.length) return;
  const R = 34;
  // 1) 점마다 반투명 원을 겹쳐 밀도(알파)를 만든 뒤 2) 알파 값을 색으로 바꿈
  const alpha = Math.max(0.08, Math.min(0.35, 3 / Math.sqrt(list.length)));
  list.forEach(c => {
    const grad = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(c.x - R, c.y - R, R * 2, R * 2);
  });
  const img = g.getImageData(0, 0, w, h);
  const d = img.data, pal = getPalette();
  let max = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > max) max = d[i];
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (!a) continue;
    const v = Math.min(255, Math.round((a / max) * 255));
    d[i] = pal[v * 4]; d[i + 1] = pal[v * 4 + 1]; d[i + 2] = pal[v * 4 + 2];
    d[i + 3] = Math.min(210, 60 + v);
  }
  g.putImageData(img, 0, 0);
  if (showDots) {
    g.fillStyle = 'rgba(20,22,28,.85)';
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    list.forEach(c => { g.beginPath(); g.arc(c.x, c.y, 3, 0, Math.PI * 2); g.fill(); g.stroke(); });
  }
}
function scheduleDraw() { requestAnimationFrame(draw); }

// '현재 화면' 필터는 화면이 바뀌면 따라 바뀜
function tick() {
  if (!showHeat && !(panel && panel.style.display !== 'none')) return;
  const s = currentScreen();
  if (s !== lastScreen) {
    lastScreen = s;
    if (showHeat) draw();
    if (panel && panel.style.display !== 'none') renderPanel();
  }
}

// ── 진행자 패널 ──
const esc = (v: string) => v.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const uniq = (key: 'p' | 'task' | 'screen') => Array.from(new Set(clicks.map(c => c[key]))).sort();

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.setAttribute('data-name', 'ut-heatmap-panel');
  Object.assign(panel.style, {
    position: 'fixed', left: '16px', bottom: '16px', width: '340px', maxHeight: 'calc(100vh - 32px)', overflow: 'auto',
    zIndex: String(Z), background: '#FFFFFF', border: '1px solid #DBDDE1', borderRadius: '10px',
    boxShadow: '0 12px 32px rgba(0,0,0,.18)', fontFamily: "'Pretendard GOV', Pretendard, sans-serif",
    fontSize: '13px', color: '#2E3238', display: 'none', boxSizing: 'border-box', letterSpacing: '-0.02em',
  });
  panel.addEventListener('click', onPanelClick);
  panel.addEventListener('change', onPanelChange);
  panel.addEventListener('input', onPanelInput);
  document.body.appendChild(panel);
  return panel;
}

const css = {
  sec: 'padding:12px 14px;border-top:1px solid #EBEDEF;',
  label: 'display:block;margin-bottom:4px;font-size:12px;color:#767D8A;',
  input: 'width:100%;height:32px;padding:0 8px;border:1px solid #DBDDE1;border-radius:4px;font:inherit;box-sizing:border-box;',
  btn: 'height:32px;padding:0 12px;border:1px solid #DBDDE1;border-radius:4px;background:#fff;font:inherit;cursor:pointer;color:#2E3238;',
  primary: 'height:32px;padding:0 12px;border:none;border-radius:4px;background:#337FFF;color:#fff;font:inherit;font-weight:600;cursor:pointer;',
  danger: 'height:32px;padding:0 12px;border:none;border-radius:4px;background:#E23A3A;color:#fff;font:inherit;font-weight:600;cursor:pointer;',
};

function options(values: string[], current: string, extra: [string, string][]) {
  return extra.concat(values.map(v => [v, v] as [string, string]))
    .map(([v, t]) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(t)}</option>`).join('');
}

function renderPanel() {
  const el = ensurePanel();
  const list = visibleClicks();
  const screenNow = currentScreen();
  const top = Object.entries(list.reduce<Record<string, number>>((m, c) => { m[c.label] = (m[c.label] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sizes = Array.from(new Set(list.map(c => c.vw + '×' + c.vh)));
  const sizeWarn = sizes.some(s => s !== window.innerWidth + '×' + window.innerHeight);
  const mine = clicks.filter(c => c.p === (session.p || '익명')).length;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;">
      <b style="font-size:15px;">UT 클릭 히트맵</b>
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:${session.recording ? '#E23A3A' : '#9197A1'};">
          <span style="width:8px;height:8px;border-radius:50%;background:${session.recording ? '#E23A3A' : '#C7CBD1'};"></span>${session.recording ? '기록 중' : '기록 꺼짐'}
        </span>
        <button data-act="close" title="닫기 (Ctrl+Shift+H)" style="border:none;background:none;cursor:pointer;font-size:16px;color:#9197A1;">✕</button>
      </span>
    </div>
    <div style="${css.sec}">
      <div style="display:flex;gap:8px;">
        <label style="flex:1;"><span style="${css.label}">참가자</span><input data-f="p" value="${esc(session.p)}" placeholder="예: P1" style="${css.input}"></label>
        <label style="flex:1;"><span style="${css.label}">과업</span><input data-f="task" value="${esc(session.task)}" placeholder="예: T1 AI 배차" style="${css.input}"></label>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <button data-act="rec" style="${session.recording ? css.danger : css.primary}">${session.recording ? '기록 멈추기' : '기록 시작'}</button>
        <span style="font-size:12px;color:#767D8A;">이 참가자 ${mine}회 · 전체 ${clicks.length}회</span>
      </div>
    </div>
    <div style="${css.sec}">
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;"><input type="checkbox" data-t="heat"${showHeat ? ' checked' : ''}>히트맵 보기</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" data-t="dots"${showDots ? ' checked' : ''}>클릭 점 표시</label>
      </div>
      <label style="display:block;margin-top:10px;"><span style="${css.label}">화면</span>
        <select data-s="screen" style="${css.input}">${options(uniq('screen'), filter.screen, [[AUTO_SCREEN, '현재 화면 (자동) · ' + screenNow], [ALL, '모든 화면 합쳐 보기']])}</select></label>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <label style="flex:1;"><span style="${css.label}">참가자</span><select data-s="p" style="${css.input}">${options(uniq('p'), filter.p, [[ALL, '전체']])}</select></label>
        <label style="flex:1;"><span style="${css.label}">과업</span><select data-s="task" style="${css.input}">${options(uniq('task'), filter.task, [[ALL, '전체']])}</select></label>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#767D8A;">표시 중인 클릭 <b style="color:#2E3238;">${list.length}</b>회</div>
      ${sizeWarn ? `<div style="margin-top:6px;padding:6px 8px;border-radius:4px;background:#FFF6E5;font-size:12px;color:#8A5A00;">기록 당시 화면 크기(${esc(sizes.join(', '))})가 지금(${window.innerWidth}×${window.innerHeight})과 달라 위치가 어긋날 수 있어요.</div>` : ''}
    </div>
    <div style="${css.sec}">
      <span style="${css.label}">많이 누른 곳</span>
      ${top.length ? top.map(([k, n]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(k)}</span><b>${n}</b></div>`).join('') : '<div style="color:#9197A1;">아직 기록이 없어요.</div>'}
    </div>
    <div style="${css.sec}display:flex;flex-wrap:wrap;gap:6px;">
      <button data-act="export" style="${css.btn}">JSON 내보내기</button>
      <button data-act="import" style="${css.btn}">불러오기</button>
      <button data-act="clear" style="${css.btn}color:#E23A3A;">기록 지우기</button>
      <input type="file" accept="application/json,.json" data-file style="display:none;">
    </div>
    <div style="padding:0 14px 12px;font-size:11px;color:#9197A1;line-height:16px;">Ctrl+Shift+H로 이 패널을 열고 닫아요. 참가자 진행 중에는 패널을 닫아 두세요(기록은 계속돼요).</div>`;
}

function onPanelInput(e: Event) {
  const t = e.target as HTMLInputElement;
  if (t.dataset.f === 'p') session.p = t.value.trim();
  else if (t.dataset.f === 'task') session.task = t.value.trim();
  else return;
  saveSession();
}

function onPanelChange(e: Event) {
  const t = e.target as HTMLInputElement & HTMLSelectElement;
  if (t.dataset.t === 'heat') { showHeat = t.checked; draw(); }
  else if (t.dataset.t === 'dots') { showDots = t.checked; draw(); }
  else if (t.dataset.s) { (filter as Record<string, string>)[t.dataset.s] = t.value; draw(); renderPanel(); }
  else if (t.dataset.file !== undefined && t.files && t.files[0]) importFile(t.files[0]);
}

function onPanelClick(e: Event) {
  const btn = (e.target as Element).closest('[data-act]') as HTMLElement | null;
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'close') togglePanel(false);
  else if (act === 'rec') {
    if (!session.recording && !session.p) { alert('참가자 이름(예: P1)을 먼저 입력해 주세요.'); return; }
    session.recording = !session.recording; saveSession(); renderPanel();
  } else if (act === 'export') exportJson();
  else if (act === 'import') (panel!.querySelector('[data-file]') as HTMLInputElement).click();
  else if (act === 'clear') {
    const who = filter.p === ALL ? '모든 참가자' : filter.p;
    if (!confirm(`${who}의 클릭 기록 ${filter.p === ALL ? clicks.length : clicks.filter(c => c.p === filter.p).length}건을 지울까요? 되돌릴 수 없어요.\n(필요하면 먼저 JSON 내보내기로 백업하세요)`)) return;
    clicks = filter.p === ALL ? [] : clicks.filter(c => c.p !== filter.p);
    if (filter.p !== ALL) filter.p = ALL;
    save(); draw(); renderPanel();
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), clicks }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `ut-heatmap-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importFile(file: File) {
  file.text().then(text => {
    const data = JSON.parse(text);
    const incoming: Click[] = Array.isArray(data) ? data : data.clicks;
    if (!Array.isArray(incoming)) throw new Error('형식 오류');
    const ids = new Set(clicks.map(c => c.id));
    const added = incoming.filter(c => c && typeof c.x === 'number' && typeof c.y === 'number' && !ids.has(c.id));
    clicks = clicks.concat(added);
    save(); draw(); renderPanel();
    alert(`클릭 기록 ${added.length}건을 불러왔어요. (중복 ${incoming.length - added.length}건 제외)`);
  }).catch(() => alert('불러오지 못했어요. UT 히트맵에서 내보낸 JSON 파일인지 확인해 주세요.'));
}

export function togglePanel(force?: boolean) {
  const el = ensurePanel();
  const open = force ?? el.style.display === 'none';
  el.style.display = open ? 'block' : 'none';
  if (open) renderPanel();
}

function onResize() { if (showHeat) scheduleDraw(); }

// ── 설치/해제 (배차관리 화면 진입/이탈) ──
export function install() {
  if (installed) return;
  installed = true;
  load();
  hookDoc(document, null);
  hookFrames();
  iframeObserver = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => { if (n instanceof HTMLIFrameElement) hookFrame(n); }));
  });
  iframeObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', onResize);
  timer = window.setInterval(tick, 500);
  (window as unknown as { utHeatmap: unknown }).utHeatmap = { open: () => togglePanel(true), currentScreen };
}

export function uninstall() {
  if (!installed) return;
  installed = false;
  iframeObserver?.disconnect(); iframeObserver = null;
  window.removeEventListener('resize', onResize);
  clearInterval(timer);
  panel?.remove(); panel = null;
  canvas?.remove(); canvas = null;
  showHeat = false;
  // document의 pointerdown 리스너는 남지만 다른 화면에서는 기록하지 않도록 막음
  // (저장된 기록 상태는 그대로 → 배차관리로 돌아오면 이어서 기록)
  session.recording = false;
}
