// ── UT 클릭 · 스크롤 히트맵 ──
// 배차관리 화면(본문 · 배차일지 패널 · AI 배차계획 iframe 포함)에서 참가자의 클릭 위치와 스크롤을 기록하고,
// 진행자가 단축키로 연 패널에서 화면 위에 히트맵을 겹쳐 본다.
//  - Ctrl + Shift + H : 진행자 패널 열기/닫기 (참가자에게는 아무것도 보이지 않음)
//  - 링크에 ?ut=1 을 붙이면 UT 모드: 기록이 바로 켜지고, 키보드 없는 기기(태블릿)용으로 왼쪽 아래에 작은 패널 버튼이 생김
//    ?ut=1&p=P1&task=T1 처럼 참가자·과업을 링크로 지정할 수 있음
//  - 기록은 이 브라우저(localStorage)에만 저장 → 여러 PC에서 진행했다면 JSON 내보내기 후 한 PC에서 불러오기로 합침
//  - 같은 버튼이라도 열린 화면(모달·패널)에 따라 위치가 달라서, 클릭할 때의 '화면'을 함께 기록하고 화면별로 본다
//  - 스크롤은 움직임이 멈출 때까지(0.3초)를 한 번으로 묶어, 어느 영역을 어느 방향으로 얼마나(몇 %까지) 봤는지 기록한다

type Click = {
  id: string;
  p: string; // 참가자
  task: string; // 과업
  screen: string; // 클릭 당시 화면 상태
  x: number; y: number; // 최상위 화면 기준 좌표(px)
  vw: number; vh: number; // 기록 당시 화면 크기
  label: string; // 클릭한 요소 이름
  t: number;
  input?: string; // mouse · touch · pen
};

// 스크롤 한 번 (멈출 때까지 묶음)
type Scroll = {
  id: string;
  p: string; task: string; screen: string;
  area: string; // 스크롤한 영역 이름 (예: 오더 목록, 배차일지 일정표)
  axis: 'y' | 'x';
  dir: 'down' | 'up' | 'right' | 'left';
  from: number; to: number; // 스크롤 위치(px) 시작 → 끝
  dist: number; // 이동량(px)
  view: number; total: number; // 보이는 길이 / 전체 길이(px)
  depth: number; // 끝 위치에서 전체 중 어디까지 보였는지(%)
  x: number; y: number; w: number; h: number; // 영역 위치 (최상위 화면 기준)
  vw: number; vh: number;
  t: number; dur: number; // 시작 시각 · 걸린 시간(ms)
  input: string; // wheel · drag(스크롤바·끌기) · touch · key · other
};

const STORE_KEY = 'lis.ut.heatmap.v1';
const SCROLL_KEY = 'lis.ut.heatmap.scroll.v1';
const SCROLL_MAX = 5000; // 브라우저 저장 공간을 넘지 않게 오래된 스크롤 기록부터 정리
const SESSION_KEY = 'lis.ut.heatmap.session';
const Z = 2147483647;
const AUTO_SCREEN = '__auto__';
const ALL = '__all__';

let clicks: Click[] = [];
let scrolls: Scroll[] = [];
let session = { recording: false, p: '', task: '' };
let installed = false;
let panel: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let showHeat = false;
let showDots = false;
// 진행자 패널 접힘 — 접으면 제목줄(기록 상태 · 히트맵 보기)만 남겨 화면을 덜 가림. 마지막 상태를 기억
const FOLD_KEY = 'lis.ut.heatmap.folded';
let folded = (() => { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch { return false; } })();
let filter = { p: ALL, task: ALL, screen: AUTO_SCREEN };
let lastScreen = '';
let timer = 0;
const hooked = new WeakSet<Document>();
let iframeObserver: MutationObserver | null = null;
let utButton: HTMLButtonElement | null = null;

// ── 저장 ──
function load() {
  try { clicks = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { clicks = []; }
  try { scrolls = JSON.parse(localStorage.getItem(SCROLL_KEY) || '[]'); } catch { scrolls = []; }
  try { session = { ...session, ...JSON.parse(localStorage.getItem(SESSION_KEY) || '{}') }; } catch { /* 무시 */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(clicks)); } catch { /* 저장 불가 환경은 무시 */ }
}
function saveScrolls() {
  if (scrolls.length > SCROLL_MAX) scrolls = scrolls.slice(-SCROLL_MAX);
  try { localStorage.setItem(SCROLL_KEY, JSON.stringify(scrolls)); } catch { /* 저장 불가 환경은 무시 */ }
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
  if (target && !frame && ((panel && panel.contains(target)) || (utButton && utButton.contains(target)))) return; // 진행자 패널·버튼 클릭은 제외
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
    input: (e as PointerEvent).pointerType || 'mouse',
  });
  save();
  if (panel && panel.style.display !== 'none') renderPanel();
  if (showHeat) scheduleDraw();
}

// ── 스크롤 기록 ──
// 영역 이름 — 알려진 영역은 사람이 읽는 이름으로, 나머지는 id·data-name·클래스로
const AREA_NAMES: Record<string, string> = {
  'order-list': '오더 목록', 'order-form': '오더 등록 폼', 'filter-options': '필터 옵션 목록',
  driverList: '배차일지 기사 목록', dpgScroll: '배차일지 일정표',
  arGantt: 'AI 예상 결과 일정표', arDrivers: 'AI 예상 결과 기사 목록',
  apTable: 'AI 오더/기사 선택 표', apPickTable: 'AI 선택 모아보기 표', arListTable: 'AI 예상 결과 목록', acTable: 'AI 적용 전 확인 표',
  ldStage: 'AI 로딩 화면', apDrvBody: 'AI 기사 상세',
};
function areaName(el: Element, frame: HTMLIFrameElement | null) {
  const pre = frame ? frame.title + ' › ' : '';
  if (el === el.ownerDocument.scrollingElement || el === el.ownerDocument.body) return pre + '페이지 전체';
  const key = (el as HTMLElement).dataset?.name || el.id;
  if (key && AREA_NAMES[key]) return pre + AREA_NAMES[key];
  const table = el.querySelector(':scope > table[id]'); // 표를 감싼 스크롤 영역은 표 id로
  if (table && AREA_NAMES[table.id]) return pre + AREA_NAMES[table.id];
  const cls = typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '';
  return pre + (key || cls || el.tagName.toLowerCase());
}

type Gesture = { el: Element; frame: HTMLIFrameElement | null; top0: number; left0: number; t0: number; maxTop: number; maxLeft: number; timer: number; input: string };
const gestures = new Map<Element, Gesture>();
const lastPos = new WeakMap<Element, { top: number; left: number }>();
let lastInput = { type: 'other', t: 0 };
const noteInput = (type: string, target?: EventTarget | null) => { lastInput = { type, t: Date.now() }; if (type !== 'wheel') prime(target); };
// 마우스가 올라간(또는 터치·키 입력을 시작한) 곳 아래 스크롤 영역들의 현재 위치를 잡아 둠 → 처음 스크롤하는 영역도 시작 위치를 앎
// (휠은 브라우저가 스크롤을 먼저 처리한 뒤 이벤트가 오므로 휠 시점에는 잡지 않음)
function prime(target?: EventTarget | null) {
  for (let el = target as Element | null; el && el.nodeType === 1; el = el.parentElement) {
    if (!lastPos.has(el)) lastPos.set(el, { top: el.scrollTop, left: el.scrollLeft });
  }
}
let primeAt = 0;

function onScroll(e: Event, frame: HTMLIFrameElement | null) {
  if (!session.recording) return;
  const doc = frame ? safeDoc(frame) : document;
  const t = e.target as Element | Document | null;
  const el = !t ? null : (t as Document).nodeType === 9 ? (t as Document).scrollingElement : (t as Element);
  if (!el || !doc) return;
  if (!frame && panel && panel.contains(el)) return; // 진행자 패널 스크롤은 제외
  const prev = lastPos.get(el) || { top: el.scrollTop, left: el.scrollLeft };
  let g = gestures.get(el);
  if (!g) {
    // 이 영역에서 새 스크롤 시작 — 직전 위치에서 출발 (처음 보는 영역은 지금 위치)
    g = { el, frame, top0: prev.top, left0: prev.left, t0: Date.now(), maxTop: Math.max(prev.top, el.scrollTop), maxLeft: Math.max(prev.left, el.scrollLeft), timer: 0,
      input: Date.now() - lastInput.t < 600 ? lastInput.type : 'other' };
    gestures.set(el, g);
  }
  g.maxTop = Math.max(g.maxTop, el.scrollTop); g.maxLeft = Math.max(g.maxLeft, el.scrollLeft);
  lastPos.set(el, { top: el.scrollTop, left: el.scrollLeft });
  clearTimeout(g.timer);
  g.timer = window.setTimeout(() => endGesture(g!), 300);
}

function endGesture(g: Gesture) {
  gestures.delete(g.el);
  const el = g.el;
  const r = el.getBoundingClientRect();
  let ox = 0, oy = 0;
  if (g.frame) { const fr = g.frame.getBoundingClientRect(); ox = fr.left; oy = fr.top; }
  const isPage = el === el.ownerDocument.scrollingElement;
  const base = {
    p: session.p || '익명', task: session.task || '-', screen: currentScreen(), area: areaName(el, g.frame),
    x: Math.round((isPage ? 0 : r.left) + ox), y: Math.round((isPage ? 0 : r.top) + oy),
    w: Math.round(isPage ? el.clientWidth : r.width), h: Math.round(isPage ? el.clientHeight : r.height),
    vw: window.innerWidth, vh: window.innerHeight, t: g.t0, dur: Date.now() - g.t0, input: g.input,
  };
  const add = (axis: 'y' | 'x', from: number, to: number, max: number, view: number, total: number) => {
    const dist = Math.abs(to - from);
    if (dist < 4 || total <= view) return;
    scrolls.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...base, axis,
      dir: axis === 'y' ? (to > from ? 'down' : 'up') : (to > from ? 'right' : 'left'),
      from: Math.round(from), to: Math.round(to), dist: Math.round(dist), view: Math.round(view), total: Math.round(total),
      depth: Math.min(100, Math.round((max + view) / total * 100)),
    });
  };
  add('y', g.top0, el.scrollTop, g.maxTop, el.clientHeight, el.scrollHeight);
  add('x', g.left0, el.scrollLeft, g.maxLeft, el.clientWidth, el.scrollWidth);
  saveScrolls();
  if (panel && panel.style.display !== 'none') renderPanel();
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
  doc.addEventListener('pointerdown', (e) => { record(e as MouseEvent, frame); noteInput((e as PointerEvent).pointerType === 'touch' ? 'touch' : 'drag', e.target); }, true);
  doc.addEventListener('keydown', (e) => { onKey(e); if (/^(Arrow|Page|Home|End| )/.test(e.key)) noteInput('key', doc.activeElement); }, true);
  // 스크롤 — 요소 안 스크롤은 버블되지 않으므로 캡처로 받음. 직전 입력(휠·끌기·터치·키)으로 방식 구분
  doc.addEventListener('scroll', (e) => onScroll(e, frame), true);
  doc.addEventListener('wheel', (e) => noteInput('wheel', e.target), { capture: true, passive: true });
  doc.addEventListener('mousemove', (e) => { if (session.recording && Date.now() - primeAt > 150) { primeAt = Date.now(); prime(e.target); } }, { capture: true, passive: true });
  doc.addEventListener('touchstart', (e) => noteInput('touch', e.target), { capture: true, passive: true });
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

// ── 분석 수치: 참가자 × 과업별 (화면 필터와 무관, 참가자·과업 필터만 적용) ──
type TaskStat = { p: string; task: string; clicks: number; sec: number; empty: number; screens: number; first: string; last: string; scrolls: number; scrollPx: number; turns: number };
// 방향 전환 = 같은 영역에서 스크롤 방향이 반대로 바뀐 횟수 (찾느라 오르내린 정도)
function turnsOf(list: Scroll[]) {
  const last = new Map<string, string>();
  let n = 0;
  list.slice().sort((a, b) => a.t - b.t).forEach(s => { const k = s.area + s.axis; if (last.has(k) && last.get(k) !== s.dir) n++; last.set(k, s.dir); });
  return n;
}
function taskStats(): TaskStat[] {
  // 참가자 × 과업 — 클릭만 있거나 스크롤만 있는 경우도 포함
  const pass = (r: { p: string; task: string }) => (filter.p === ALL || r.p === filter.p) && (filter.task === ALL || r.task === filter.task);
  const groups = new Map<string, { c: Click[]; s: Scroll[] }>();
  const get = (r: { p: string; task: string }) => { const k = r.p + '\u0000' + r.task; if (!groups.has(k)) groups.set(k, { c: [], s: [] }); return groups.get(k)!; };
  clicks.filter(pass).forEach(c => get(c).c.push(c));
  scrolls.filter(pass).forEach(s => get(s).s.push(s));
  return Array.from(groups.values()).map(({ c: list, s: sc }) => {
    list.sort((a, b) => a.t - b.t);
    const any = list[0] || sc[0];
    const times = list.map(x => x.t).concat(sc.map(x => x.t + x.dur));
    return {
      p: any.p, task: any.task, clicks: list.length,
      // 소요 시간 = 그 과업의 첫 기록 ~ 마지막 기록 (클릭·스크롤)
      sec: Math.round((Math.max(...times) - Math.min(...times)) / 1000),
      empty: list.filter(c => c.label.endsWith('(빈 영역)')).length,
      screens: new Set([...list.map(c => c.screen), ...sc.map(s => s.screen)]).size,
      first: list[0]?.label || '-', last: list[list.length - 1]?.label || '-',
      scrolls: sc.length, scrollPx: sc.reduce((n, s) => n + s.dist, 0), turns: turnsOf(sc),
    };
  }).sort((a, b) => a.task.localeCompare(b.task) || a.p.localeCompare(b.p));
}
const fmtSec = (sec: number) => (sec >= 60 ? Math.floor(sec / 60) + '분 ' : '') + (sec % 60) + '초';

function exportCsv() {
  const cell = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
  const head: (string | number)[] = ['참가자', '과업', '클릭 수', '소요 시간(초)', '빈 영역 클릭', '빈 영역 비율(%)', '거친 화면 수', '첫 클릭', '마지막 클릭', '스크롤 횟수', '스크롤 이동(px)', '스크롤 방향 전환'];
  const rows: (string | number)[][] = taskStats().map(r => [r.p, r.task, r.clicks, r.sec, r.empty, (r.clicks ? Math.round(r.empty / r.clicks * 100) : 0), r.screens, r.first, r.last, r.scrolls, r.scrollPx, r.turns]);
  // 엑셀에서 한글이 깨지지 않도록 BOM 포함
  download(`ut-stats-${stamp()}.csv`, '\ufeff' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n'), 'text/csv');
}

// ── 진행자 패널 ──
const esc = (v: string) => v.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const uniq = (key: 'p' | 'task' | 'screen') => Array.from(new Set([...clicks.map(c => c[key]), ...scrolls.map(c => c[key])])).sort(); // 클릭·스크롤 기록 모두에서

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
  const myScroll = scrolls.filter(s => s.p === (session.p || '익명')).length;
  // 스크롤 많이 한 영역 (참가자·과업 필터 적용) — 횟수 · 평균 도달 깊이
  const scr = scrolls.filter(s => (filter.p === ALL || s.p === filter.p) && (filter.task === ALL || s.task === filter.task));
  const areas = Object.entries(scr.reduce<Record<string, Scroll[]>>((m, s) => { (m[s.area] = m[s.area] || []).push(s); return m; }, {}))
    .sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  const stats = taskStats();
  const iconBtn = 'border:none;background:none;cursor:pointer;color:#9197A1;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;padding:0;';
  // 펼침/접힘 화살표 — 펼친 상태는 아래(접기), 접힌 상태는 위(펼치기)
  const chevron = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="transform:rotate(${folded ? 180 : 0}deg);"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const header = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:${folded ? '8px 10px 8px 14px' : '12px 14px'};">
      <button data-act="fold" title="${folded ? '펼치기' : '접기'}" style="border:none;background:none;padding:0;cursor:pointer;font:inherit;font-size:${folded ? 13 : 15}px;font-weight:700;color:#2E3238;white-space:nowrap;">UT 히트맵</button>
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap;color:${session.recording ? '#E23A3A' : '#9197A1'};">
          <span style="width:8px;height:8px;border-radius:50%;background:${session.recording ? '#E23A3A' : '#C7CBD1'};"></span>${session.recording ? '기록 중' : '기록 꺼짐'}
        </span>
        ${folded ? `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;white-space:nowrap;"><input type="checkbox" data-t="heat"${showHeat ? ' checked' : ''} style="margin:0;">히트맵</label>` : ''}
        <button data-act="fold" title="${folded ? '펼치기' : '접기'}" aria-expanded="${!folded}" style="${iconBtn}">${chevron}</button>
        <button data-act="close" title="닫기 (Ctrl+Shift+H)" style="${iconBtn}font-size:15px;">✕</button>
      </span>
    </div>`;
  el.style.width = folded ? 'auto' : '340px';
  if (folded) { el.innerHTML = header; return; }
  el.innerHTML = header + `
    <div style="${css.sec}">
      <div style="display:flex;gap:8px;">
        <label style="flex:1;"><span style="${css.label}">참가자</span><input data-f="p" value="${esc(session.p)}" placeholder="예: P1" style="${css.input}"></label>
        <label style="flex:1;"><span style="${css.label}">과업</span><input data-f="task" value="${esc(session.task)}" placeholder="예: T1 AI 배차" style="${css.input}"></label>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <button data-act="rec" style="${session.recording ? css.danger : css.primary}">${session.recording ? '기록 멈추기' : '기록 시작'}</button>
        <span style="font-size:12px;color:#767D8A;">이 참가자 클릭 ${mine} · 스크롤 ${myScroll} · 전체 클릭 ${clicks.length}</span>
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
    <div style="${css.sec}">
      <span style="${css.label}">스크롤 많이 한 영역 <span style="color:#9197A1;">(횟수 · 평균 도달 깊이)</span></span>
      ${areas.length ? areas.map(([k, l]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(k)}</span><b style="white-space:nowrap;">${l.length}회 · ${Math.round(l.reduce((n, s) => n + s.depth, 0) / l.length)}%</b></div>`).join('') : '<div style="color:#9197A1;">아직 스크롤 기록이 없어요.</div>'}
    </div>
    <div style="${css.sec}">
      <span style="${css.label}">과업별 수치 <span style="color:#9197A1;">(소요 시간 = 첫 기록~마지막 기록)</span></span>
      ${stats.length ? `<table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="color:#767D8A;text-align:right;"><th style="text-align:left;font-weight:400;padding:3px 0;">참가자 · 과업</th><th style="font-weight:400;">클릭</th><th style="font-weight:400;">시간</th><th style="font-weight:400;" title="버튼·셀이 아닌 곳을 누른 비율">빈 영역</th><th style="font-weight:400;" title="스크롤 횟수 (방향 전환)">스크롤</th></tr></thead>
        <tbody>${stats.map(r => `<tr style="border-top:1px solid #F1F2F4;text-align:right;"><td style="text-align:left;padding:4px 0;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.p)} · ${esc(r.task)}</td><td>${r.clicks}</td><td>${fmtSec(r.sec)}</td><td style="color:${r.clicks && r.empty / r.clicks >= 0.3 ? '#E23A3A' : 'inherit'};">${r.clicks ? Math.round(r.empty / r.clicks * 100) : 0}%</td><td>${r.scrolls}${r.turns ? ` (${r.turns})` : ''}</td></tr>`).join('')}</tbody>
      </table>` : '<div style="color:#9197A1;">아직 기록이 없어요.</div>'}
    </div>
    <div style="${css.sec}display:flex;flex-wrap:wrap;gap:6px;">
      <button data-act="export" style="${css.btn}">JSON 내보내기${filter.p === ALL ? '' : ' (' + esc(filter.p) + ')'}</button>
      <button data-act="csv" style="${css.btn}">수치 CSV</button>
      <button data-act="viewer" style="${css.btn}" title="여러 참가자 JSON을 모아 스크린샷 위에 히트맵·수치를 보는 페이지">히트맵 뷰어 ↗</button>
      <button data-act="import" style="${css.btn}">불러오기</button>
      <button data-act="clear" style="${css.btn}color:#E23A3A;">기록 지우기</button>
      <input type="file" accept="application/json,.json" data-file style="display:none;">
    </div>
    <div style="padding:0 14px 12px;font-size:11px;color:#9197A1;line-height:16px;">Ctrl+Shift+H(태블릿은 왼쪽 아래 UT 버튼)로 이 패널을 열고 닫아요. 스크롤도 함께 기록돼요. 참가자 진행 중에는 패널을 닫아 두세요(기록은 계속돼요). 참가자 필터를 고르고 JSON 내보내기를 누르면 그 참가자 파일만 저장돼요.</div>`;
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
  else if (act === 'fold') {
    folded = !folded;
    try { localStorage.setItem(FOLD_KEY, folded ? '1' : '0'); } catch { /* 무시 */ }
    renderPanel();
  }
  else if (act === 'rec') {
    if (!session.recording && !session.p) { alert('참가자 이름(예: P1)을 먼저 입력해 주세요.'); return; }
    session.recording = !session.recording; saveSession(); renderPanel();
  } else if (act === 'export') exportJson();
  else if (act === 'csv') exportCsv();
  else if (act === 'viewer') window.open(viewerUrl(), '_blank', 'noopener');
  else if (act === 'import') (panel!.querySelector('[data-file]') as HTMLInputElement).click();
  else if (act === 'clear') {
    const who = filter.p === ALL ? '모든 참가자' : filter.p;
    const nScroll = filter.p === ALL ? scrolls.length : scrolls.filter(s => s.p === filter.p).length;
    if (!confirm(`${who}의 클릭 기록 ${filter.p === ALL ? clicks.length : clicks.filter(c => c.p === filter.p).length}건과 스크롤 기록 ${nScroll}건을 지울까요? 되돌릴 수 없어요.\n(필요하면 먼저 JSON 내보내기로 백업하세요)`)) return;
    clicks = filter.p === ALL ? [] : clicks.filter(c => c.p !== filter.p);
    scrolls = filter.p === ALL ? [] : scrolls.filter(s => s.p !== filter.p);
    if (filter.p !== ALL) filter.p = ALL;
    save(); saveScrolls(); draw(); renderPanel();
  }
}

// 히트맵 뷰어(public/heatmap.html) — 배포 경로(base)가 바뀌어도 같은 앱 기준으로 엶
function viewerUrl() {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  return base.replace(/\/?$/, '/') + 'heatmap.html';
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// 참가자 필터가 '전체'면 모든 기록, 특정 참가자면 그 참가자 기록만 (파일 이름에 참가자 포함)
function exportJson() {
  const who = filter.p === ALL ? '' : filter.p;
  const list = who ? clicks.filter(c => c.p === who) : clicks;
  const sList = who ? scrolls.filter(s => s.p === who) : scrolls;
  const name = `ut-heatmap-${who ? who.replace(/[^\w가-힣-]/g, '_') + '-' : ''}${stamp()}.json`;
  // version 2: 스크롤 기록(scrolls) 추가 — 뷰어는 version 1(클릭만) 파일도 그대로 읽음
  download(name, JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), participant: who || 'all', clicks: list, scrolls: sList }, null, 2), 'application/json');
}

function importFile(file: File) {
  file.text().then(text => {
    const data = JSON.parse(text);
    const incoming: Click[] = Array.isArray(data) ? data : data.clicks;
    if (!Array.isArray(incoming)) throw new Error('형식 오류');
    const ids = new Set(clicks.map(c => c.id));
    const added = incoming.filter(c => c && typeof c.x === 'number' && typeof c.y === 'number' && !ids.has(c.id));
    clicks = clicks.concat(added);
    const sIn: Scroll[] = Array.isArray(data.scrolls) ? data.scrolls : [];
    const sIds = new Set(scrolls.map(s => s.id));
    const sAdded = sIn.filter(s => s && s.id && !sIds.has(s.id));
    scrolls = scrolls.concat(sAdded);
    save(); saveScrolls(); draw(); renderPanel();
    alert(`클릭 기록 ${added.length}건, 스크롤 기록 ${sAdded.length}건을 불러왔어요. (중복 제외)`);
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
// ?ut=1 링크로 들어오면 UT 모드 — 링크의 참가자·과업을 적용하고 기록을 켬
function applyUrlMode() {
  let q: URLSearchParams;
  try { q = new URLSearchParams(window.location.search); } catch { return false; }
  if (q.get('ut') !== '1') return false;
  const p = q.get('p'), task = q.get('task');
  if (p) session.p = p.trim();
  if (task) session.task = task.trim();
  if (session.p) session.recording = true;
  saveSession();
  return true;
}

function ensureUtButton() {
  if (utButton) return;
  utButton = document.createElement('button');
  utButton.setAttribute('data-name', 'ut-heatmap-button');
  utButton.setAttribute('aria-label', 'UT 진행자 패널');
  utButton.textContent = 'UT';
  Object.assign(utButton.style, {
    position: 'fixed', left: '8px', bottom: '8px', width: '28px', height: '28px', borderRadius: '50%',
    border: '1px solid #DBDDE1', background: 'rgba(255,255,255,.9)', color: '#9197A1', fontSize: '10px', fontWeight: '700',
    cursor: 'pointer', zIndex: String(Z), opacity: '0.45', padding: '0', fontFamily: 'inherit',
  });
  utButton.addEventListener('click', () => togglePanel());
  document.body.appendChild(utButton);
}

export function install() {
  if (installed) return;
  installed = true;
  load();
  if (applyUrlMode()) {
    ensureUtButton();
    // 참가자를 링크로 정하지 않았으면 진행자 패널을 열어 입력하게 함
    if (!session.p) setTimeout(() => togglePanel(true), 300);
  }
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
  utButton?.remove(); utButton = null;
  canvas?.remove(); canvas = null;
  showHeat = false;
  // document의 pointerdown 리스너는 남지만 다른 화면에서는 기록하지 않도록 막음
  // (저장된 기록 상태는 그대로 → 배차관리로 돌아오면 이어서 기록)
  session.recording = false;
}
