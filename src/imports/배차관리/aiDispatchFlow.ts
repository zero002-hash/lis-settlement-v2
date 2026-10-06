// ── AI 자동배차 / 기사 스케줄 플로우 호스트 ──
// 배차관리 화면 위에 정적 HTML 플로우(ai-dispatch-flow.html, gs-schedule-flow.html)를 iframe으로 띄우고
// postMessage로 열기/닫기 상태를 주고받는다.
//  - AI 자동배차: 화면 전체를 덮는 투명 iframe (모달/토스트/닫힘 상태 전환)
//  - 기사 스케줄: 헤더 아래 오른쪽에 붙는 리사이즈 가능한 패널

type FlowKey = 'ai' | 'gs';
type FlowSource = { srcdoc?: string };
// 플로우 iframe이 보내는 표시 상태 (close: 숨김, toast: 클릭 통과, 그 외(modal 등): 클릭 가능)
type AiFlowState = 'modal' | 'toast' | 'close' | (string & {});

// 플로우 HTML 경로 (이 모듈 기준 상대경로 → Vite가 에셋으로 처리)
const FLOW_URLS: Record<FlowKey, string> = {
  ai: new URL('./ai-dispatch-flow.html', import.meta.url).href,
  gs: new URL('./gs-schedule-flow.html', import.meta.url).href,
};

// srcdoc 덮어쓰기 (단일 HTML 데모 빌드에서만 사용, 앱에서는 불필요)
const flowSources: Partial<Record<FlowKey, FlowSource>> = {};

const SCHEDULE_PANEL_DEFAULT_WIDTH = 760;
const SCHEDULE_PANEL_MIN_WIDTH = 380;
const SCHEDULE_PANEL_MAX_RATIO = 0.72; // 화면 폭 대비 최대 패널 폭
const DEFAULT_PANEL_TOP = 82; // 기준 요소를 못 찾을 때의 헤더 높이

let aiFrame: HTMLIFrameElement | null = null;
let schedulePanel: HTMLDivElement | null = null;
let scheduleFrame: HTMLIFrameElement | null = null;
let scheduleAnchor: HTMLElement | null = null;

export function setFlowSources(sources: Partial<Record<FlowKey, FlowSource>>) {
  Object.assign(flowSources, sources);
}

function applyFlowSource(frame: HTMLIFrameElement, key: FlowKey) {
  const source = flowSources[key];
  if (source && source.srcdoc) frame.srcdoc = source.srcdoc;
  else frame.src = FLOW_URLS[key];
}

function setAiFrameState(state: AiFlowState) {
  if (!aiFrame) return;
  if (state === 'close') {
    aiFrame.style.display = 'none';
  } else {
    aiFrame.style.display = 'block';
    // 토스트 상태에서는 아래 화면을 클릭할 수 있도록 포인터 이벤트를 통과시킴
    aiFrame.style.pointerEvents = state === 'toast' ? 'none' : 'auto';
  }
}

// AI 자동배차 플로우 열기
export function open() {
  if (aiFrame) {
    setAiFrameState('modal');
    aiFrame.contentWindow?.postMessage({ source: 'ai-dispatch-host', type: 'open' }, '*');
    return;
  }
  aiFrame = document.createElement('iframe');
  aiFrame.title = 'AI 자동배차';
  Object.assign(aiFrame.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh', border: '0',
    background: 'transparent', colorScheme: 'normal', zIndex: '2147483000', display: 'block',
  });
  applyFlowSource(aiFrame, 'ai');
  document.body.appendChild(aiFrame);
}

// 패널 위치/폭 갱신 — 기준 버튼이 속한 헤더 하단에 맞춤
function layoutSchedulePanel() {
  if (!schedulePanel) return;
  const header = scheduleAnchor && scheduleAnchor.parentElement && scheduleAnchor.parentElement.parentElement;
  const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : DEFAULT_PANEL_TOP;
  schedulePanel.style.top = top + 'px';
  const maxWidth = Math.floor(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO);
  const width = Math.min(
    maxWidth,
    Math.max(SCHEDULE_PANEL_MIN_WIDTH, parseInt(schedulePanel.style.width, 10) || SCHEDULE_PANEL_DEFAULT_WIDTH),
  );
  schedulePanel.style.width = width + 'px';
}

function createSchedulePanel() {
  const panel = document.createElement('div');
  schedulePanel = panel;
  panel.setAttribute('data-name', 'gs-schedule-panel');
  Object.assign(panel.style, {
    position: 'fixed', right: '0', bottom: '0', width: SCHEDULE_PANEL_DEFAULT_WIDTH + 'px',
    zIndex: '2147482000', display: 'flex', background: '#FFFFFF', boxShadow: '-8px 0 24px rgba(0,0,0,.10)',
  });

  // 왼쪽 리사이즈 핸들
  const handle = document.createElement('div');
  Object.assign(handle.style, {
    width: '6px', flexShrink: '0', cursor: 'col-resize', background: '#F6F7F8',
    position: 'relative', borderLeft: '1px solid #E3E5E9',
  });
  const grip = document.createElement('div');
  Object.assign(grip.style, {
    position: 'absolute', top: '50%', left: '50%', width: '3px', height: '36px',
    transform: 'translate(-50%,-50%)', borderRadius: '3px', background: '#C7CBD1',
  });
  handle.appendChild(grip);
  handle.addEventListener('mouseenter', () => (grip.style.background = '#005FFF'));
  handle.addEventListener('mouseleave', () => (grip.style.background = '#C7CBD1'));
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    // 드래그 중 iframe이 마우스 이벤트를 가로채지 않도록 화면 전체 오버레이를 덮음
    const overlay = document.createElement('div');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', cursor: 'col-resize', zIndex: '2147483600' });
    document.body.appendChild(overlay);
    handle.style.background = '#EEF4FF';
    const onMove = (ev: MouseEvent) => {
      const width = Math.max(
        SCHEDULE_PANEL_MIN_WIDTH,
        Math.min(window.innerWidth * SCHEDULE_PANEL_MAX_RATIO, window.innerWidth - ev.clientX),
      );
      panel.style.width = width + 'px';
    };
    const onUp = () => {
      overlay.remove();
      handle.style.background = '#F6F7F8';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  scheduleFrame = document.createElement('iframe');
  scheduleFrame.title = '기사 스케줄';
  Object.assign(scheduleFrame.style, { flex: '1', minWidth: '0', height: '100%', border: '0', background: '#FFFFFF' });
  applyFlowSource(scheduleFrame, 'gs');

  panel.append(handle, scheduleFrame);
  document.body.appendChild(panel);
  window.addEventListener('resize', layoutSchedulePanel);
  layoutSchedulePanel();
}

// 기사 스케줄 패널 열기 (anchor: 클릭한 버튼 — 패널 top 계산 기준)
export function openSchedule(anchor?: HTMLElement | null) {
  if (anchor) scheduleAnchor = anchor;
  if (schedulePanel) {
    schedulePanel.style.display = 'flex';
    layoutSchedulePanel();
    scheduleFrame?.contentWindow?.postMessage({ source: 'gs-schedule-host', type: 'open' }, '*');
    return;
  }
  createSchedulePanel();
}

// 플로우 iframe → 호스트 메시지 수신
window.addEventListener('message', (e) => {
  const data = e.data;
  if (!data) return;
  if (aiFrame && e.source === aiFrame.contentWindow && data.source === 'ai-dispatch-flow') {
    setAiFrameState(data.type);
  }
  if (scheduleFrame && e.source === scheduleFrame.contentWindow && data.source === 'gs-schedule-flow' && data.type === 'close') {
    schedulePanel!.style.display = 'none';
  }
});
