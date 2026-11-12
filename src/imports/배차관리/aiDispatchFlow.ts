// ── AI 자동배차 / 기사 스케줄 플로우 호스트 ──
// 배차관리 화면 위에 정적 HTML 플로우(ai-dispatch-flow.html, gs-schedule-flow.html)를 iframe으로 띄우고
// postMessage로 열기/닫기 상태를 주고받는다.
//  - AI 자동배차: 화면 전체를 덮는 투명 iframe (모달/토스트/닫힘 상태 전환)
//  - 기사 스케줄: 헤더 아래 오른쪽에 붙는 리사이즈 가능한 패널

type FlowKey = 'ai' | 'gs';
type FlowSource = { srcdoc?: string };
// 플로우 iframe이 보내는 표시 상태 (close: 숨김, toast: 클릭 통과, 그 외(modal 등): 클릭 가능)
type AiFlowState = 'modal' | 'toast' | 'mini' | 'close' | (string & {});

// 플로우 HTML 경로 (이 모듈 기준 상대경로 → Vite가 에셋으로 처리)
// ?v= : 화면을 새로고침할 때마다 플로우 HTML을 새로 받도록(브라우저가 이전 iframe 내용을 캐시해 수정사항이 안 보이는 문제 방지)
const FLOW_VERSION = Date.now().toString(36);
const FLOW_URLS: Record<FlowKey, string> = {
  ai: new URL('./ai-dispatch-flow.html', import.meta.url).href + '?v=' + FLOW_VERSION,
  gs: new URL('./gs-schedule-flow.html', import.meta.url).href + '?v=' + FLOW_VERSION,
};

// srcdoc 덮어쓰기 (단일 HTML 데모 빌드에서만 사용, 앱에서는 불필요)
const flowSources: Partial<Record<FlowKey, FlowSource>> = {};

const SCHEDULE_PANEL_DEFAULT_WIDTH = 760;
const SCHEDULE_PANEL_MIN_WIDTH = 380;
// 배차일지 요약보기(기사 목록만) 폭 / 넓게보기는 화면 폭 대비 최대 비율까지 넓힘
const SCHEDULE_PANEL_SUMMARY_WIDTH = 384;
// 요약보기 패널을 드래그로 이 폭 이상 넓히면 넓게보기 화면(기사 목록 + 스케줄)으로 바뀜
const SCHEDULE_WIDE_LAYOUT_WIDTH = 760;
let frameLayout: 'summary' | 'wide' = 'summary';
// 배차일지 열림/닫힘 — 최초 진입은 열림, 이후엔 마지막 상태를 유지
const SCHEDULE_OPEN_KEY = 'lis.dispatchLog.open';
let scheduleMode: 'summary' | 'wide' = 'summary';

function storeOpen(open: boolean) {
  try { localStorage.setItem(SCHEDULE_OPEN_KEY, open ? '1' : '0'); } catch { /* 저장 불가 환경은 무시 */ }
}

export function isScheduleOpenByDefault() {
  try { return localStorage.getItem(SCHEDULE_OPEN_KEY) !== '0'; } catch { return true; }
}
const SCHEDULE_PANEL_MAX_RATIO = 0.72; // 화면 폭 대비 최대 패널 폭
const DEFAULT_PANEL_TOP = 82; // 기준 요소를 못 찾을 때의 헤더 높이

let aiFrame: HTMLIFrameElement | null = null;
let schedulePanel: HTMLDivElement | null = null;
let scheduleFrame: HTMLIFrameElement | null = null;
let scheduleAnchor: HTMLElement | null = null;
// 배차일지 새 창 (요약보기의 [새창으로 보기]로 연 브라우저 창)
let scheduleWindow: Window | null = null;
const SCHEDULE_WINDOW_NAME = 'lis-dispatch-log';

export function setFlowSources(sources: Partial<Record<FlowKey, FlowSource>>) {
  Object.assign(flowSources, sources);
}

function applyFlowSource(frame: HTMLIFrameElement, key: FlowKey) {
  const source = flowSources[key];
  if (source && source.srcdoc) frame.srcdoc = source.srcdoc;
  else frame.src = FLOW_URLS[key];
}

let aiFrameState: AiFlowState = 'close';
const AI_MINI_HEIGHT = 96; // 토스트(76px) + 아래 여백
// 작게보기 토스트 위치 — 배차일지 패널이 보이면 그 아래쪽에 패널 폭으로, 아니면 화면 오른쪽 아래
function layoutAiMini() {
  if (!aiFrame || aiFrameState !== 'mini') return;
  const r = schedulePanel && isScheduleVisible() ? schedulePanel.getBoundingClientRect() : null;
  Object.assign(aiFrame.style, r
    ? { inset: 'auto', left: r.left + 'px', right: '', bottom: Math.max(0, window.innerHeight - r.bottom) + 'px', width: r.width + 'px', height: AI_MINI_HEIGHT + 'px' }
    : { inset: 'auto', left: '', right: '0', bottom: '0', width: '401px', height: AI_MINI_HEIGHT + 'px' });
}
window.addEventListener('resize', layoutAiMini);

function setAiFrameState(state: AiFlowState) {
  if (!aiFrame) return;
  if (state === 'close') {
    aiFrame.style.display = 'none';
  } else {
    aiFrame.style.display = 'block';
    // 토스트 상태에서는 아래 화면을 클릭할 수 있도록 포인터 이벤트를 통과시킴
    aiFrame.style.pointerEvents = state === 'toast' ? 'none' : 'auto';
    // 로딩 작게보기(mini) — 배차일지를 요약보기로 열고, iframe을 배차일지 패널 아래쪽 토스트 크기로 줄여
    // 배차관리 · 배차일지를 그대로 쓸 수 있게 함
    aiFrameState = state;
    if (state === 'mini') {
      if (!isScheduleVisible()) openSchedule();
      layoutAiMini();
    } else {
      Object.assign(aiFrame.style, { inset: '0', left: '', right: '', bottom: '', width: '100vw', height: '100vh' });
    }
  }
}

// AI 배차계획 플로우 열기 (1. 오더 선택 → 2. 기사 선택 → 결과)
export function open() {
  if (aiFrame) {
    setAiFrameState('modal');
    aiFrame.contentWindow?.postMessage({ source: 'ai-dispatch-host', type: 'open' }, '*');
    return;
  }
  aiFrame = document.createElement('iframe');
  aiFrame.title = 'AI 배차계획';
  Object.assign(aiFrame.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh', border: '0',
    background: 'transparent', colorScheme: 'normal', zIndex: '2147483000', display: 'block',
  });
  applyFlowSource(aiFrame, 'ai');
  document.body.appendChild(aiFrame);
}

// 요약보기는 화면 오른쪽에 붙어(dock) 배차관리 본문 폭을 줄이고, 넓게보기는 본문 위에 겹쳐 띄움
// 본문은 --dispatch-log-w 만큼 오른쪽을 비움 (배차관리 index.tsx)
function setDockWidth(px: number) {
  document.documentElement.style.setProperty('--dispatch-log-w', px + 'px');
}

// 패널 위치/폭 갱신 — 요약보기는 화면 위에서 아래까지, 넓게보기는 헤더 아래부터
function layoutSchedulePanel() {
  if (!schedulePanel) return;
  const docked = scheduleMode === 'summary';
  const header = scheduleAnchor && scheduleAnchor.parentElement && scheduleAnchor.parentElement.parentElement;
  const top = docked ? 0 : header ? Math.max(0, header.getBoundingClientRect().bottom) : DEFAULT_PANEL_TOP;
  schedulePanel.style.top = top + 'px';
  schedulePanel.style.boxShadow = docked ? 'none' : '-8px 0 24px rgba(0,0,0,.10)';
  const maxWidth = Math.floor(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO);
  const width = Math.min(
    maxWidth,
    Math.max(scheduleMode === 'summary' ? SCHEDULE_PANEL_SUMMARY_WIDTH : SCHEDULE_PANEL_MIN_WIDTH, parseInt(schedulePanel.style.width, 10) || SCHEDULE_PANEL_DEFAULT_WIDTH),
  );
  schedulePanel.style.width = width + 'px';
  setDockWidth(docked && schedulePanel.style.display !== 'none' ? width : 0);
  syncFrameLayout(width);
  layoutAiMini(); // 패널 폭·위치가 바뀌면 작게보기 토스트도 따라감
}

// 패널 폭에 맞춰 배차일지 화면을 요약/넓게보기로 전환 (iframe에 알림)
function syncFrameLayout(width: number, force = false) {
  const layout = width >= SCHEDULE_WIDE_LAYOUT_WIDTH ? 'wide' : 'summary';
  if (layout === frameLayout && !force) return;
  frameLayout = layout;
  scheduleFrame?.contentWindow?.postMessage({ source: 'gs-schedule-host', type: 'layout', mode: layout }, '*');
}

function applyScheduleMode(mode: 'summary' | 'wide') {
  scheduleMode = mode;
  if (!schedulePanel) return;
  schedulePanel.style.width = (mode === 'summary' ? SCHEDULE_PANEL_SUMMARY_WIDTH : Math.floor(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO)) + 'px';
  layoutSchedulePanel();
}

function createSchedulePanel() {
  const panel = document.createElement('div');
  schedulePanel = panel;
  panel.setAttribute('data-name', 'gs-schedule-panel');
  Object.assign(panel.style, {
    position: 'fixed', right: '0', bottom: '0', width: SCHEDULE_PANEL_DEFAULT_WIDTH + 'px',
    zIndex: '2147482000', display: 'flex', background: '#FFFFFF', boxShadow: '-8px 0 24px rgba(0,0,0,.10)',
  });

  // 왼쪽 리사이즈 핸들 — 피그마 line(4px): 드래그로 패널 폭 조절
  const handle = document.createElement('div');
  const HANDLE_BG = '#EBEDEF';
  const HANDLE_ACTIVE_BG = '#CCDFFF';
  Object.assign(handle.style, {
    width: '4px', flexShrink: '0', cursor: 'col-resize', background: HANDLE_BG,
    borderLeft: '1px solid #DBDDE1', borderRight: '1px solid #DBDDE1', boxSizing: 'border-box',
  });
  let dragging = false;
  handle.addEventListener('mouseenter', () => (handle.style.background = HANDLE_ACTIVE_BG));
  handle.addEventListener('mouseleave', () => { if (!dragging) handle.style.background = HANDLE_BG; });
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    // 드래그 중 iframe이 마우스 이벤트를 가로채지 않도록 화면 전체 오버레이를 덮음
    const overlay = document.createElement('div');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', cursor: 'col-resize', zIndex: '2147483600' });
    document.body.appendChild(overlay);
    dragging = true;
    handle.style.background = HANDLE_ACTIVE_BG;
    const onMove = (ev: MouseEvent) => {
      const width = Math.max(
        scheduleMode === 'summary' ? SCHEDULE_PANEL_SUMMARY_WIDTH : SCHEDULE_PANEL_MIN_WIDTH,
        Math.min(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO, window.innerWidth - ev.clientX),
      );
      panel.style.width = width + 'px';
      if (scheduleMode === 'summary') setDockWidth(width);
      syncFrameLayout(width);
    };
    const onUp = () => {
      overlay.remove();
      dragging = false;
      handle.style.background = HANDLE_BG;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  scheduleFrame = document.createElement('iframe');
  scheduleFrame.title = '배차일지';
  Object.assign(scheduleFrame.style, { flex: '1', minWidth: '0', height: '100%', border: '0', background: '#FFFFFF' });
  applyFlowSource(scheduleFrame, 'gs');

  panel.append(handle, scheduleFrame);
  document.body.appendChild(panel);
  window.addEventListener('resize', layoutSchedulePanel);
  layoutSchedulePanel();
}

export function isScheduleVisible() {
  return !!schedulePanel && schedulePanel.style.display !== 'none';
}

// 배차일지 패널 닫기 (remember: 사용자가 닫은 경우에만 닫힘 상태를 기억 — 화면을 떠날 때는 기억하지 않음)
export function hideSchedule(remember = false) {
  if (schedulePanel) schedulePanel.style.display = 'none';
  setDockWidth(0);
  if (remember) storeOpen(false);
}

// 배차일지 버튼 — 열려 있으면 닫고, 닫혀 있으면 엶
export function toggleSchedule(anchor?: HTMLElement | null) {
  if (isScheduleVisible()) hideSchedule(true);
  else openSchedule(anchor);
}

// 배차일지 패널 열기 (anchor: 클릭한 버튼 — 패널 top 계산 기준)
export function openSchedule(anchor?: HTMLElement | null) {
  if (anchor) scheduleAnchor = anchor;
  storeOpen(true);
  if (schedulePanel) {
    schedulePanel.style.display = 'flex';
    layoutSchedulePanel();
    scheduleFrame?.contentWindow?.postMessage({ source: 'gs-schedule-host', type: 'open' }, '*');
    return;
  }
  createSchedulePanel();
}

// 배차일지를 넓게보기(기사 목록 + 스케줄)로 열기 — 오른쪽에 붙은 채 최대 폭까지 넓혀 배차관리 본문을 줄임
// (AI 배차계획 결과를 [배차일지에 적용하기] 했을 때 적용된 스케줄을 바로 확인하도록)
function openScheduleWide() {
  openSchedule();
  if (!schedulePanel) return;
  scheduleMode = 'summary'; // 도킹 유지 — 폭이 넓으면 iframe이 넓게보기 화면으로 바뀜
  schedulePanel.style.width = Math.floor(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO) + 'px';
  layoutSchedulePanel();
}

// 배차일지를 브라우저 새 창으로 열기 — 새 창은 넓게보기(기사 목록 + 스케줄)로 뜨고, 화면의 요약 패널은 닫음
function openScheduleWindow() {
  const width = Math.round(window.screen.availWidth * 0.8);
  const height = Math.round(window.screen.availHeight * 0.85);
  const features = `width=${width},height=${height},left=${Math.round((window.screen.availWidth - width) / 2)},top=${Math.round((window.screen.availHeight - height) / 2)}`;
  const source = flowSources.gs;
  const win = window.open(source && source.srcdoc ? '' : FLOW_URLS.gs, SCHEDULE_WINDOW_NAME, features);
  if (!win) {
    alert('팝업이 차단되어 배차일지 새 창을 열 수 없습니다. 브라우저에서 팝업을 허용해 주세요.');
    return;
  }
  if (source && source.srcdoc) {
    win.document.open();
    win.document.write(source.srcdoc);
    win.document.close();
  }
  scheduleWindow = win;
  win.focus();
  hideSchedule();
}

// 배차일지(패널 iframe · 새 창 모두)에 메시지 전달
function postToSchedule(type: string) {
  const message = { source: 'gs-schedule-host', type };
  scheduleFrame?.contentWindow?.postMessage(message, '*');
  if (scheduleWindow && !scheduleWindow.closed) scheduleWindow.postMessage(message, '*');
}

// 플로우 iframe → 호스트 메시지 수신
window.addEventListener('message', (e) => {
  const data = e.data;
  if (!data) return;
  if (aiFrame && e.source === aiFrame.contentWindow && data.source === 'ai-dispatch-flow') {
    // 결과 최소화/그만하기/적용은 배차일지에 전달 (버튼 '이어서하기' 표시, 적용 토스트)
    if (data.type === 'applied') {
      openScheduleWide();
      postToSchedule('ai-applied');
    } else if (data.type === 'minimized' || data.type === 'stopped') {
      postToSchedule('ai-' + data.type);
    } else {
      setAiFrameState(data.type);
    }
  }
  if (scheduleFrame && e.source === scheduleFrame.contentWindow && data.source === 'gs-schedule-flow') {
    if (data.type === 'close') hideSchedule(true);
    else if (data.type === 'mode') applyScheduleMode(data.mode === 'wide' ? 'wide' : 'summary');
    else if (data.type === 'open-window') openScheduleWindow(); // 요약보기 [새창으로 보기]
    else if (data.type === 'ready' && schedulePanel) syncFrameLayout(schedulePanel.offsetWidth, true); // iframe 로드 후 현재 폭에 맞는 화면으로
    else if (data.type === 'run-ai') open(); // [AI 배차계획 실행하기] → 오더/기사 선택(조건 설정)
  }
  // 새 창은 [배차계획 실행하기]를 눌렀을 때 AI 배차계획을 자기 창 안에 띄움 → 로드되면 화면 경로를 알려 줌
  if (scheduleWindow && e.source === scheduleWindow && data.source === 'gs-schedule-flow') {
    if (data.type === 'ready') {
      scheduleWindow.postMessage({ source: 'gs-schedule-host', type: 'config', aiUrl: FLOW_URLS.ai, aiSrcdoc: flowSources.ai?.srcdoc }, '*');
    }
  }
});
