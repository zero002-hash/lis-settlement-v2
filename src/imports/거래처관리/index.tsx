import { useState, useEffect, useLayoutEffect, useRef } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type TradeStatus, type PartnerType, type SettleSchedule, type PartnerContact, type SharedGroupMapping, type TradePartner, type BizRecord, type PartnerDocKey, type MainVehicle, type MainRoute,
  MOCK_BIZ_REGISTRY, makeSchedule, genId,
  getPartners, addPartner, updatePartner, subscribePartners,
} from "../shared/geoRaecheoStore";
import { type WorkGroup, getGroups, subscribeCompany } from "../shared/companyStore";
import { TON_OPTIONS, CAR_TYPE_OPTIONS } from "../shared/contractRateStore";

const ff = "'Pretendard GOV:Regular'";
const ffSemiBold = "'Pretendard GOV:SemiBold'";
const ffBold = "'Pretendard GOV:Bold'";
const ls = '-0.02em';
const BORDER = '#E3E5E9';
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

// ─── 공통 아이콘 ─────────────────────────────────────────────────────────────

function Chevron({ size = 12, color = '#2E3238', dir = 'down' }: { size?: 12 | 16; color?: string; dir?: 'down' | 'left' | 'right' }) {
  const d = dir === 'down' ? (size === 12 ? 'M3 4.5l3 3 3-3' : 'M4 6l4 4 4-4') : dir === 'left' ? 'M10 12L6 8l4-4' : 'M6 4l4 4-4 4';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ flexShrink: 0 }}>
      <path d={d} stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.3" stroke="#9197A1" strokeWidth="1.2" />
      <path d="M8 7.2v3.6" stroke="#9197A1" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="5.2" r=".75" fill="#9197A1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.2" cy="7.2" r="5" stroke="#5C6370" strokeWidth="1.3" />
      <path d="M11 11l3 3" stroke="#5C6370" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M10.6 4.6L5.4 9.8a1.3 1.3 0 001.8 1.8l5.6-5.6a2.6 2.6 0 00-3.7-3.7L3.5 7.9a3.9 3.9 0 005.5 5.5l4.7-4.7" stroke="#2E3238" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModalCloseIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5L5 19" stroke="#767D8A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── 입력값 포맷터 ───────────────────────────────────────────────────────────

// 사업자등록번호 000-00-00000
function formatBizNumber(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

// 전화/팩스번호 — 02 지역번호는 2자리, 그 외는 3자리 기준
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length < 3) return d;
    if (d.length < 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length < 10) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function isValidBizNumber(v: string) {
  return v.replace(/\D/g, '').length === 10;
}

function nowStamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ─── 모달 공통 ───────────────────────────────────────────────────────────────

// 앱 전체가 transform: scale 로 축소되어 있을 수 있어서, 실제 화면 높이를 스케일 보정한 값으로 오버레이 높이를 맞춘다
function useScaledViewportHeight(ref: React.RefObject<HTMLDivElement>) {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
      setHeight(Math.round(window.innerHeight / scale));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);
  return height;
}

function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);
}

function ModalOverlay({ overlayRef, height, onClose, name, children }: {
  overlayRef: React.RefObject<HTMLDivElement>;
  height: number | null;
  onClose: () => void;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={overlayRef}
      data-name={name}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: height == null ? 0 : undefined, height: height ?? undefined, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'safe center', justifyContent: 'safe center', padding: 16, boxSizing: 'border-box', overflow: 'auto', zIndex: 99999 }}
    >
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ height: 72, padding: '24px 24px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 22, lineHeight: '32px', letterSpacing: ls, color: '#2E3238' }}>{title}</p>
      <button type="button" aria-label="닫기" onClick={onClose} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <ModalCloseIcon />
      </button>
    </div>
  );
}

const modalBoxShadow = `0 0 0 1px ${BORDER}, 0 2px 6px 1px rgba(34,34,34,0.06)`;

function Divider() {
  return <div style={{ height: 1, background: BORDER, width: '100%', flexShrink: 0 }} />;
}

// 모달 하단/폼용 버튼 (primary: 파랑, ghost: 테두리 없음, 기본: 흰 배경 + 테두리)
function ModalButton({ children, onClick, primary, ghost, disabled, h = 44, size = 16, px = 16, style }: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  h?: number;
  size?: number;
  px?: number;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={ghost ? 'pmr-ghost' : undefined}
      style={{
        height: h, padding: `0 ${px}px`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
        border: primary || ghost ? 'none' : `1px solid ${BORDER}`,
        background: primary ? (disabled ? '#CCDFFF' : '#005FFF') : '#FFFFFF',
        fontFamily: ffSemiBold, fontWeight: 600, fontSize: size, lineHeight: size === 18 ? '26px' : '24px', letterSpacing: ls,
        color: primary ? '#FFFFFF' : '#2E3238', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

const LIST_CSS = '.pm-opt:hover{background:#F6F7F8!important}.pm-row:hover{background:#F9FAFB!important}.pm-search-input::placeholder{color:#767D8A}.pm-table-scroll::-webkit-scrollbar{width:10px;height:10px}.pm-table-scroll::-webkit-scrollbar-thumb{background:#C7CBD1;border-radius:10px;border:2px solid #FFFFFF}.pm-table-scroll::-webkit-scrollbar-track{background:#FFFFFF}';

const COL_WIDTHS = { status: 120, type: 120, join: 140, alias: 490, bizNumber: 140, registeredAt: 150 };

// 거래상태 표시 라벨 — 데이터상 '정상'/'거래중지'를 화면에선 '거래중'/'거래중지'로 노출
const STATUS_BADGE: Record<TradeStatus, { label: string; bg: string; color: string }> = {
  정상: { label: '거래중', bg: '#E0F5E6', color: '#15993A' },
  거래중지: { label: '거래중지', bg: '#FCE9E9', color: '#DD2222' },
};
const STOPPED_TOOLTIP = '거래중지 상태인 거래처에는 배차요청 불가합니다.';

type FilterOption = { v: string; l: string };
const STATUS_FILTER_OPTIONS: FilterOption[] = [{ v: '정상', l: '거래중' }, { v: '거래중지', l: '거래 중지' }];
const JOIN_FILTER_OPTIONS: FilterOption[] = [{ v: 'Y', l: '가입' }, { v: 'N', l: '미가입' }];
const PAGE_SIZE_OPTIONS = [200, 100, 50];

// 목록 상단 필터 칩 — 체크박스 다중 선택, 선택 즉시 목록 반영, 선택 시 파란색 + 선택 개수 뱃지
function FilterChip({ label, options, value, onChange }: { label: string; options: FilterOption[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const active = value.length > 0;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 32, padding: '6px 10px 6px 12px', border: 'none', borderRadius: 30, background: active || open ? '#F5F9FF' : '#F6F7F8', cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box' }}
      >
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: active || open ? '#005FFF' : '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}>{label}</span>
        {active ? (
          <div style={{ minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', background: '#CCDFFF', borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 11, color: '#005FFF' }}>{value.length}</span>
          </div>
        ) : (
          <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none' }}><Chevron size={12} color={open ? '#005FFF' : '#2E3238'} /></span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, minWidth: 200, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ padding: 4 }}>
            {options.map(o => (
              <div
                key={o.v}
                role="checkbox"
                aria-checked={value.includes(o.v)}
                className="pm-opt"
                onClick={() => toggle(o.v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 8px', borderRadius: 4, cursor: 'pointer' }}
              >
                <Checkbox on={value.includes(o.v)} />
                <span style={{ fontFamily: ff, fontSize: 15, color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}>{o.l}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', padding: '4px 8px' }}>
            <button type="button" onClick={() => onChange([])} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: ff, fontSize: 12, color: '#9197A1', letterSpacing: ls }}>필터 초기화</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 클릭하면 열리는 검정 툴팁 (닫기 버튼 포함) — 메뉴 설명용
function ClickTooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" aria-label={`${title} 설명`} onClick={() => setOpen(o => !o)} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <InfoIcon />
      </button>
      {open && (
        <div role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: -4, zIndex: 30, width: 320, background: '#2E3238', borderRadius: 6, padding: '10px 32px 10px 12px', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(0,0,0,.18)' }}>
          <p style={{ margin: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#FFFFFF', letterSpacing: ls }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontFamily: ff, fontSize: 13, lineHeight: '19px', color: '#E3E5E9', letterSpacing: ls }}>{children}</p>
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}>
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
    </span>
  );
}

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginTop: 36, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: ffBold, fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: ls, color: '#000000' }}>거래처 관리</span>
        <ClickTooltip title="거래처 관리">나에게 오더를 주는 매출 거래처와 내가 오더를 주는 매입 거래처를 구분해 등록하고, 거래처별 담당 업무그룹과 정산스케줄을 관리해요.</ClickTooltip>
      </div>
      <button
        onClick={onRegisterClick}
        style={{ padding: '0 16px', height: 44, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 16, color: '#FFFFFF', letterSpacing: ls, whiteSpace: 'nowrap' }}
      >
        거래처 등록
      </button>
    </div>
  );
}

// 거래처 유형 탭 — 전체/화주사/협력사 (개수는 검색·필터와 무관한 전체 기준)
type TypeTab = '전체' | PartnerType;

function TypeTabs({ value, onChange, counts }: { value: TypeTab; onChange: (t: TypeTab) => void; counts: Record<TypeTab, number> }) {
  const tabs: TypeTab[] = ['전체', '화주사', '협력사'];
  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginTop: 24, flexShrink: 0 }}>
      {tabs.map(t => {
        const on = value === t;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t)}
            style={{ height: 48, padding: '0 12px', marginBottom: -1, border: 'none', borderBottom: `2px solid ${on ? '#2E3238' : 'transparent'}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: on ? '#2E3238' : '#5C6370', whiteSpace: 'nowrap' }}>{t}</span>
            <span style={{ height: 20, padding: '0 6px', borderRadius: 10, background: '#EBEDEF', display: 'inline-flex', alignItems: 'center', fontFamily: ff, fontSize: 12, letterSpacing: ls, color: on ? '#454B55' : '#767D8A' }}>{counts[t].toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}

type SearchType = '거래처별칭' | '사업자명' | '담당자명';

function SearchBar({ searchType, setSearchType, keyword, setKeyword, onSearch, status, setStatus, join, setJoin }: {
  searchType: SearchType;
  setSearchType: (t: SearchType) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  onSearch: () => void;
  status: string[];
  setStatus: (v: string[]) => void;
  join: string[];
  setJoin: (v: string[]) => void;
}) {
  const fieldBase: React.CSSProperties = { height: 36, border: `1px solid ${BORDER}`, background: '#FFFFFF', boxSizing: 'border-box', fontSize: 15, fontFamily: ff, letterSpacing: ls, color: '#2E3238', outline: 'none' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexShrink: 0, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex' }}>
          <select
            value={searchType}
            onChange={e => setSearchType(e.target.value as SearchType)}
            style={{ ...fieldBase, width: 'auto', minWidth: 104, padding: '0 32px 0 10px', borderRadius: '4px 0 0 4px', marginRight: -1, cursor: 'pointer', appearance: 'none', background: `${selArrow} no-repeat right 12px center, #FFFFFF` }}
          >
            <option value="거래처별칭">거래처별칭</option>
            <option value="사업자명">사업자명</option>
            <option value="담당자명">담당자명</option>
          </select>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
            placeholder="검색어를 입력하세요."
            className="pm-search-input"
            style={{ ...fieldBase, width: 198, padding: '0 10px', borderRadius: '0 4px 4px 0' }}
          />
        </div>
        <button
          onClick={onSearch}
          style={{ height: 36, padding: '0 12px', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}
        >
          검색
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <FilterChip label="거래 상태" options={STATUS_FILTER_OPTIONS} value={status} onChange={setStatus} />
        <FilterChip label="시스템 가입 여부" options={JOIN_FILTER_OPTIONS} value={join} onChange={setJoin} />
      </div>
    </div>
  );
}

function Th({ label, width, flex, info }: { label: string; width?: number; flex?: boolean; info?: boolean }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : '0 0 auto', minWidth: flex ? 200 : undefined, height: 40, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
      {info && (
        <span title="T 트럭커 운송관리시스템 가입 여부" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 26, flexShrink: 0, cursor: 'help' }}>
          <InfoIcon />
        </span>
      )}
    </div>
  );
}

function Td({ children, width, flex, align = 'left', bold, visible }: { children: React.ReactNode; width?: number; flex?: boolean; align?: 'left' | 'center'; bold?: boolean; visible?: boolean }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : '0 0 auto', minWidth: flex ? 200 : undefined, height: 48, padding: align === 'center' ? '10px 0' : 10, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, overflow: visible ? 'visible' : 'hidden' }}>
      {typeof children === 'string' ? (
        <span style={{ fontFamily: bold ? ffSemiBold : ff, fontWeight: bold ? 600 : 400, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      ) : children}
    </div>
  );
}

// 거래중지 뱃지는 (i) 아이콘에 마우스를 올리면 배차요청 불가 안내 툴팁을 띄운다
function StatusBadge({ status, small }: { status: TradeStatus; small?: boolean }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.거래중지;
  const [hover, setHover] = useState(false);
  const stopped = status === '거래중지';
  return (
    <span
      onMouseEnter={stopped ? () => setHover(true) : undefined}
      onMouseLeave={stopped ? () => setHover(false) : undefined}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: small ? 22 : 26, padding: '0 6px', borderRadius: 4, background: s.bg, fontFamily: ffSemiBold, fontWeight: 600, fontSize: small ? 12 : 13, lineHeight: '19px', color: s.color, letterSpacing: ls, whiteSpace: 'nowrap', cursor: stopped ? 'help' : undefined }}
    >
      {s.label}
      {stopped && (
        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="6" cy="6" r="5" stroke="#DD2222" strokeWidth="1" />
          <path d="M6 5.4v2.8" stroke="#DD2222" strokeWidth="1" strokeLinecap="round" />
          <circle cx="6" cy="3.8" r=".6" fill="#DD2222" />
        </svg>
      )}
      {hover && (
        <span role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30, background: '#2E3238', color: '#FFFFFF', borderRadius: 4, padding: '4px 8px', fontFamily: ff, fontWeight: 400, fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap' }}>{STOPPED_TOOLTIP}</span>
      )}
    </span>
  );
}

function JoinBadge({ joined }: { joined: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 6px', borderRadius: 4, background: '#EBEDEF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 12, lineHeight: '18px', color: '#454B55', letterSpacing: ls, whiteSpace: 'nowrap' }}>
      {joined ? '가입' : '미가입'}
    </span>
  );
}

function EmptySearchIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="9" width="24" height="4" rx="1" fill="#E3E5E9" />
      <rect x="4" y="17" width="18" height="4" rx="1" fill="#E3E5E9" />
      <rect x="4" y="25" width="14" height="4" rx="1" fill="#E3E5E9" />
      <circle cx="27" cy="25" r="6.5" stroke="#9197A1" strokeWidth="2" fill="#FFFFFF" />
      <path d="M32 30l4 4" stroke="#9197A1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PartnerTable({ rows, onRowClick, empty }: { rows: TradePartner[]; onRowClick: (p: TradePartner) => void; empty?: React.ReactNode }) {
  return (
    <div className="pm-table-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: 12, borderLeft: `1px solid ${BORDER}` }}>
      <div style={{ minWidth: 1170 }}>
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2 }}>
          <Th label="거래 상태" width={COL_WIDTHS.status} />
          <Th label="거래처 유형" width={COL_WIDTHS.type} />
          <Th label="시스템 가입 여부" width={COL_WIDTHS.join} info />
          <Th label="거래처 별칭" width={COL_WIDTHS.alias} />
          <Th label="사업자등록번호" width={COL_WIDTHS.bizNumber} />
          <Th label="사업장 주소" flex />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} className="pm-row" style={{ display: 'flex', cursor: 'pointer', background: '#FFFFFF' }}>
            <Td width={COL_WIDTHS.status} align="center" visible><StatusBadge status={row.status} /></Td>
            <Td width={COL_WIDTHS.type}>{row.partnerType}</Td>
            <Td width={COL_WIDTHS.join}>{row.tTrucker ? '가입' : '미가입'}</Td>
            <Td width={COL_WIDTHS.alias} bold>{row.alias}</Td>
            <Td width={COL_WIDTHS.bizNumber} align="center">{row.bizNumber}</Td>
            <Td flex>{[row.address, row.addressDetail].filter(Boolean).join(' ')}</Td>
            {/* 등록일시는 날짜만 노출 */}
            <Td width={COL_WIDTHS.registeredAt} align="center">{String(row.registeredAt || '').split(' ')[0]}</Td>
          </div>
        ))}
        {rows.length === 0 && (empty ?? (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            검색 결과가 없습니다.
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({ total, page, setPage, size, setSize }: { total: number; page: number; setPage: (p: number) => void; size: number; setSize: (s: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) pages.push(p);
  } else if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, 6, 7, '...', totalPages);
  } else if (page >= totalPages - 3) {
    pages.push(1, '...', totalPages - 6, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', page - 2, page - 1, page, page + 1, page + 2, '...', totalPages);
  }
  const pageBtn = (active: boolean): React.CSSProperties => ({ width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer', background: active ? '#F6F7F8' : 'transparent', fontFamily: active ? ffSemiBold : ff, fontWeight: active ? 600 : 400, fontSize: 15, color: active ? '#2E3238' : '#454B55', letterSpacing: ls, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 });
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div style={{ height: 64, borderTop: `1px solid ${BORDER}`, background: '#FFFFFF', position: 'relative', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: '50%', top: 11, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, padding: 2 }}>
        {pages.map((p, i) => p === '...' ? (
          <div key={'e' + i} style={{ ...pageBtn(false), cursor: 'default' }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              {[3.5, 8, 12.5].map(cx => <circle key={cx} cx={cx} cy="8" r="1" fill="#454B55" />)}
            </svg>
          </div>
        ) : (
          <button key={p} onClick={() => setPage(p)} style={pageBtn(p === page)}>{p}</button>
        ))}
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ ...pageBtn(false), cursor: page === 1 ? 'default' : 'pointer' }}>
          <Chevron size={16} dir="left" color={page === 1 ? '#C7CBD1' : '#2E3238'} />
        </button>
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ ...pageBtn(false), cursor: page === totalPages ? 'default' : 'pointer' }}>
          <Chevron size={16} dir="right" color={page === totalPages ? '#C7CBD1' : '#2E3238'} />
        </button>
      </div>
      <div style={{ position: 'absolute', right: 24, top: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: ff, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}>
          {`${total.toLocaleString()}개 중 ${from.toLocaleString()}-${to.toLocaleString()}개`}
        </span>
        <select
          value={size}
          onChange={e => { setSize(Number(e.target.value)); setPage(1); }}
          style={{ width: 123, height: 36, padding: '0 32px 0 10px', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', border: `1px solid ${BORDER}`, borderRadius: 4, background: `${selArrow} no-repeat right 13px center, #FFFFFF`, appearance: 'none', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
        >
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{`${n}개씩 보기`}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── 거래처 등록 모달 — 폼 컴포넌트 ──────────────────────────────────────────

const REGISTER_CSS = '.pmr-input::placeholder{color:#767D8A}.pmr-input:focus,.pmr-field:focus-within,.pmr-area:focus{border-color:#005FFF!important}.pmr-area::placeholder{color:#767D8A}.pmr-ghost:hover{background:#F6F7F8!important}.pmr-sug:hover{background:#F5F9FF}';

function FormLabel({ children, required, hidden }: { children: React.ReactNode; required?: boolean; hidden?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20, visibility: hidden ? 'hidden' : 'visible' }}>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{children}</span>
      {required && <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#005FFF' }}>*</span>}
    </div>
  );
}

// 필수 입력칸은 연한 파랑 배경
function fieldBoxStyle(required?: boolean): React.CSSProperties {
  return { height: 44, padding: '6px 12px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: required ? '#F5F9FF' : '#F6F7F8', display: 'flex', alignItems: 'center', gap: 4, width: '100%' };
}

const fieldTextStyle: React.CSSProperties = { fontFamily: ff, fontWeight: 400, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#2E3238' };

function TextField({ value, onChange, placeholder, required, icon, onFocus, onBlur, inputMode }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div className="pmr-field" style={fieldBoxStyle(required)}>
      {icon}
      <input
        className="pmr-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        inputMode={inputMode}
        style={{ ...fieldTextStyle, flex: 1, minWidth: 0, height: 26, border: 'none', outline: 'none', background: 'transparent', padding: 0 }}
      />
    </div>
  );
}

function FormField({ label, required, hideLabel, children }: { label: string; required?: boolean; hideLabel?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 0 0', minWidth: 0 }}>
      <FormLabel required={required} hidden={hideLabel}>{label}</FormLabel>
      {children}
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'flex-start' }}>{children}</div>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 18, lineHeight: '26px', letterSpacing: ls, color: '#2E3238' }}>{title}</p>
      {children}
    </div>
  );
}

// ─── 토스트 / 확인 팝업 ─────────────────────────────────────────────────────

type ToastTone = 'dark' | 'error';
type ToastState = { message: string; tone: ToastTone } | null;

function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const show = (message: string, tone: ToastTone = 'dark') => setToast({ message, tone });
  return [toast, show, () => setToast(null)] as const;
}

// 성공 안내는 검정, 오류·삭제 안내는 빨강 토스트
function Toast({ message, tone = 'dark', onClose, fixed }: { message: string; tone?: ToastTone; onClose: () => void; fixed?: boolean }) {
  return (
    <div role="status" style={{ position: fixed ? 'fixed' : 'absolute', left: '50%', bottom: fixed ? 40 : 104, transform: 'translateX(-50%)', zIndex: 100002, width: 400, maxWidth: 'calc(100% - 48px)', display: 'flex', alignItems: 'center', gap: 12, background: tone === 'error' ? '#E03A3A' : '#2E3238', borderRadius: 6, padding: '12px 16px', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(0,0,0,.18)' }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#FFFFFF' }}>{message}</span>
      <button type="button" aria-label="닫기" onClick={onClose} style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);
  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={onCancel} name="confirm-dialog">
      <div role="alertdialog" aria-label={title} style={{ width: 400, background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <p style={{ margin: 0, flex: 1, fontFamily: ffBold, fontWeight: 700, fontSize: 20, lineHeight: '28px', letterSpacing: ls, color: '#2E3238', wordBreak: 'keep-all' }}>{title}</p>
            <button type="button" aria-label="닫기" onClick={onCancel} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ModalCloseIcon /></button>
          </div>
          <p style={{ margin: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#454B55', wordBreak: 'keep-all' }}>{description}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <ModalButton ghost h={44} onClick={onCancel}>취소</ModalButton>
          <ModalButton h={44} onClick={onConfirm} style={{ background: '#E52222', border: 'none', color: '#FFFFFF' }}>{confirmLabel}</ModalButton>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── 등록/수정 폼 공용 필드 ─────────────────────────────────────────────────

function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <span style={{ fontFamily: ff, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#DD2222' }}>{children}</span>;
}

function TextArea({ value, onChange, placeholder, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <textarea
      className="pmr-input pmr-area"
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...fieldTextStyle, width: '100%', height: 72, padding: '10px 12px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#F6F7F8', resize: 'none', outline: 'none' }}
    />
  );
}

function SelectField({ value, options, onChange, placeholder }: { value: string; options: (string | FilterOption)[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="pmr-field" style={{ ...fieldBoxStyle(false), position: 'relative', padding: 0 }}>
      <select
        className="pmd-sel"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...fieldTextStyle, width: '100%', height: '100%', padding: '0 36px 0 12px', color: value ? '#2E3238' : '#767D8A' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, pointerEvents: 'none', display: 'flex' }}><Chevron size={16} color="#5C6370" /></span>
    </div>
  );
}

// 세그먼트 버튼 (거래처 유형 / 거래 상태 / 인수증 기본설정 등)
function SegmentField<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', alignItems: 'center', width: '100%', height: 44 }}>
      {options.map((o, i) => {
        const on = value === o.v;
        const first = i === 0;
        const last = i === options.length - 1;
        // switch_Atom — 바깥 테두리(#E4E5E9)는 양 끝 칸만 좌/우를 그리고, 선택된 칸은 #669FFF 테두리 박스를 위에 덮는다
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            style={{
              flex: '1 0 0', minWidth: 50, height: 44, padding: '0 12px', boxSizing: 'border-box', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#FFFFFF', borderStyle: 'solid', borderColor: '#E4E5E9',
              borderWidth: `1px ${last ? 1 : 0}px 1px ${first ? 1 : 0}px`,
              borderRadius: first && last ? 4 : first ? '4px 0 0 4px' : last ? '0 4px 4px 0' : 0,
              cursor: 'pointer', fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 14, lineHeight: '20px', letterSpacing: ls,
              color: on ? '#005FFF' : '#5C6370', whiteSpace: 'nowrap',
            }}
          >
            {on && <span aria-hidden style={{ position: 'absolute', top: -1, bottom: -1, left: first ? -1 : 0, right: last ? -1 : 0, border: '1px solid #669FFF', borderRadius: 4, pointerEvents: 'none' }} />}
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

const PARTNER_TYPE_SEGMENTS: { v: PartnerType; l: string }[] = [{ v: '화주사', l: '화주' }, { v: '협력사', l: '협력사' }];
const STATUS_SEGMENTS: { v: TradeStatus; l: string }[] = [{ v: '정상', l: '거래중' }, { v: '거래중지', l: '거래중지' }];

function isValidEmail(v: string) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) && !v.includes('..');
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<span style={{ color: '#005FFF' }}>{text.slice(i, i + q.length)}</span>{text.slice(i + q.length)}</>;
}

function SuggestEmpty() {
  return (
    <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#9197A1" /><path d="M10 5.5v5.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="14" r="1" fill="#FFFFFF" /></svg>
      <span style={{ fontFamily: ff, fontSize: 14, color: '#5C6370', letterSpacing: ls }}>검색 결과가 없습니다.</span>
    </div>
  );
}

const suggestBoxStyle: React.CSSProperties = { position: 'absolute', top: 48, left: 0, right: 0, zIndex: 6, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 400, overflowY: 'auto', padding: 4 };

// 사업자명/사업자번호 검색 결과 — 입력값과 매칭되는 키워드만 파란색. 이미 등록한 사업자는 '등록불가'로 비활성
function BizSuggestList({ query, by, registeredNumbers, onSelect }: { query: string; by: 'name' | 'number'; registeredNumbers: Set<string>; onSelect: (r: BizRecord) => void }) {
  const items = MOCK_BIZ_REGISTRY.filter(r => (by === 'name' ? r.bizName : r.bizNumber).includes(query)).slice(0, 8);
  return (
    <div style={suggestBoxStyle}>
      {items.length === 0 ? <SuggestEmpty /> : items.map(r => {
        const blocked = registeredNumbers.has(r.bizNumber);
        return (
          <div
            key={r.bizNumber}
            className={blocked ? undefined : 'pmr-sug'}
            onMouseDown={blocked ? undefined : () => onSelect(r)}
            style={{ padding: '8px 10px', borderRadius: 4, cursor: blocked ? 'default' : 'pointer', opacity: blocked ? 0.45 : 1, display: 'flex', gap: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls }}>
                {by === 'name' ? <Highlight text={r.bizName} q={query} /> : r.bizName}
              </div>
              <div style={{ fontFamily: ff, fontSize: 14, lineHeight: '20px', color: '#2E3238', letterSpacing: ls }}>{r.address}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{ fontFamily: ff, fontSize: 11, lineHeight: '16px', padding: '0 4px', borderRadius: 2, background: '#EBEDEF', color: '#454B55' }}>사업자번호</span>
                <span style={{ fontFamily: ff, fontSize: 13, color: '#454B55', letterSpacing: ls }}>{by === 'number' ? <Highlight text={r.bizNumber} q={query} /> : r.bizNumber}</span>
              </div>
            </div>
            {blocked && <span style={{ alignSelf: 'flex-start', fontFamily: ff, fontSize: 11, lineHeight: '16px', padding: '0 4px', borderRadius: 2, background: '#EBEDEF', color: '#454B55', whiteSpace: 'nowrap' }}>등록불가</span>}
          </div>
        );
      })}
    </div>
  );
}

// 주소 검색용 목업 주소록 — 장소(HUB) 우선, 그다음 도로명 주소
const ADDRESS_BOOK: { name: string; hub?: boolean; address: string }[] = [
  { name: '알파돔센터', hub: true, address: '경기 성남시 분당구 판교역로 152' },
  { name: '알파돔센터', hub: true, address: '경기 안양시 만안구 안양동 441-29' },
  { name: '알파돔', address: '경기 성남시 분당구 백현동 541' },
  { name: '이천센터 A-2 창고', hub: true, address: '경기 이천시 백사면 현방리 260-81' },
  { name: '판교 물류센터', hub: true, address: '경기 성남시 분당구 판교역로 235' },
  { name: '동탄 스마트물류센터', hub: true, address: '경기 화성시 동탄대로 537' },
  ...MOCK_BIZ_REGISTRY.map(r => ({ name: r.address.split(' ').slice(-2).join(' '), address: r.address })),
];

function AddressField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const q = value.trim();
  const items = q === '' ? [] : ADDRESS_BOOK.filter(a => a.name.includes(q) || a.address.includes(q)).slice(0, 8);
  const hubs = items.filter(a => a.hub);
  const plain = items.filter(a => !a.hub);
  const row = (a: typeof ADDRESS_BOOK[number], i: number) => (
    <div key={a.name + a.address + i} className="pmr-sug" onMouseDown={() => { onChange(a.address); setOpen(false); }} style={{ padding: '8px 10px', borderRadius: 4, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls }}>
        <Highlight text={a.name} q={q} />
        {a.hub && <span style={{ fontFamily: ff, fontWeight: 400, fontSize: 11, lineHeight: '16px', padding: '0 4px', borderRadius: 2, background: '#EBEDEF', color: '#454B55' }}>HUB</span>}
      </div>
      <div style={{ fontFamily: ff, fontSize: 14, lineHeight: '20px', color: '#2E3238', letterSpacing: ls }}>{a.address}</div>
    </div>
  );
  return (
    <div style={{ position: 'relative' }}>
      <TextField value={value} onChange={v => { onChange(v); setOpen(true); }} placeholder="기본 주소(행정동/도로명)" icon={<SearchIcon />} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && q !== '' && (
        <div style={suggestBoxStyle}>
          {items.length === 0 ? <SuggestEmpty /> : (
            <>
              {hubs.map(row)}
              {hubs.length > 0 && plain.length > 0 && <div style={{ height: 1, background: BORDER, margin: '4px 10px' }} />}
              {plain.map(row)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 파일 첨부 — 최대 5개, pdf/doc/jpg/jpeg/png, 파일당 10MB. 첨부한 파일은 아래 목록에 1행씩 노출
const ATTACH_EXTS = ['pdf', 'doc', 'jpg', 'jpeg', 'png'];
const ATTACH_MAX_BYTES = 10 * 1024 * 1024;

// 형식(pdf/doc/jpg/jpeg/png)·용량(10MB)·개수 확인 후 통과한 파일명만 붙인다
function acceptFiles(list: FileList | null, files: string[], max: number, onChange: (files: string[]) => void, onToast: (msg: string, tone?: ToastTone) => void) {
  if (!list) return;
  const next = [...files];
  for (const f of Array.from(list)) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ATTACH_EXTS.includes(ext)) { onToast('지원하는 파일 형식이 아닙니다.', 'error'); continue; }
    if (f.size > ATTACH_MAX_BYTES) { onToast('10mb 이하의 파일만 첨부할 수 있습니다.', 'error'); continue; }
    if (next.length >= max) { onToast(`총 ${max}개까지만 첨부할 수 있습니다.`, 'error'); break; }
    next.push(f.name);
  }
  if (next.length > files.length) {
    onChange(next);
    onToast('파일을 첨부했습니다.');
  }
}

function FileAttachField({ files, onChange, onToast, max = 5 }: { files: string[]; onChange: (files: string[]) => void; onToast: (msg: string, tone?: ToastTone) => void; max?: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleClick = () => {
    if (files.length >= max) { onToast(`총 ${max}개까지만 첨부할 수 있습니다.`, 'error'); return; }
    fileRef.current?.click();
  };
  const handlePick = (list: FileList | null) => {
    acceptFiles(list, files, max, onChange, onToast);
    if (fileRef.current) fileRef.current.value = '';
  };
  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
    onToast('첨부된 파일이 삭제되었습니다.', 'error');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...fieldBoxStyle(false), flex: 1, width: 'auto', minWidth: 0 }}>
          <span style={{ ...fieldTextStyle, color: '#767D8A', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`최대 ${max}개 첨부 가능(pdf, doc, jpg, jpeg, png)`}
          </span>
        </div>
        <input ref={fileRef} type="file" multiple={max > 1} accept=".pdf,.doc,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => handlePick(e.target.files)} />
        <ModalButton onClick={handleClick} style={{ width: 130, padding: 0 }}><ClipIcon />파일 첨부하기</ModalButton>
      </div>
      {files.length > 0 && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4 }}>
          {files.map((name, i) => (
            <div key={name + i} style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderTop: i ? '1px solid #F1F2F4' : 'none' }}>
              <span title={name} style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 14, color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <button type="button" aria-label={`${name} 삭제`} onClick={() => remove(i)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><RemoveIcon /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemoveIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" fill="#9197A1" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ─── 거래처 담당 업무그룹 지정 (등록 모달 / 상세 > 부가 정보 수정에서 공용) ─────

const GROUP_PICKER_CSS = '.pmg-opt:hover{background:#F6F7F8!important}.pmg-row.pmg-sub:hover{background:#F6F7F8!important}';

function Checkbox({ on, disabled }: { on: boolean; disabled?: boolean }) {
  if (disabled) {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <rect x="2.65" y="2.65" width="14.7" height="14.7" rx="3.35" fill="#EBEDEF" stroke="#E3E5E9" strokeWidth="1.3" />
        {on && <path d="M6 10.2l2.7 2.6L14 7.5" stroke="#ADB1B9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    );
  }
  return on ? (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="16" height="16" rx="4" fill="#005FFF" />
      <path d="M6 10.2l2.7 2.6L14 7.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2.65" y="2.65" width="14.7" height="14.7" rx="3.35" fill="#FFFFFF" stroke="#ADB1B9" strokeWidth="1.3" />
    </svg>
  );
}

function RepresentativeBadge({ short }: { short?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 4px', borderRadius: 2, background: '#E6EFFF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#005FFF', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {short ? '대표' : '대표 업무그룹'}
    </span>
  );
}

// 기본값은 기본그룹(대표). 드롭다운에서 체크박스로 여러 그룹을 고른 뒤 [추가]하면 아래 목록에 쌓이고,
// 목록 행을 클릭하면 그 그룹이 대표가 된다(대표는 항상 1개). 기본그룹은 삭제할 수 없다.
function WorkGroupPicker({ groups, value, mainId, onChange, onMainChange, hideLabel }: {
  groups: WorkGroup[];
  value: string[];
  mainId: string;
  onChange: (ids: string[]) => void;
  onMainChange: (id: string) => void;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultId = groups.find(g => g.isDefault)?.id ?? '';
  const groupName = (id: string) => groups.find(g => g.id === id)?.name ?? id;
  // 노출 순서: 기본그룹 → 추가 순
  const ordered = [...value.filter(id => id === defaultId), ...value.filter(id => id !== defaultId)];
  const effectiveMainId = value.includes(mainId) ? mainId : (ordered[0] ?? '');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    dropdownRef.current?.scrollIntoView({ block: 'nearest' });
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleChecked = (id: string) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAdd = () => {
    if (checked.length === 0) { setOpen(o => !o); return; }
    const next = [...value, ...groups.filter(g => checked.includes(g.id) && !value.includes(g.id)).map(g => g.id)];
    onChange(next);
    if (!next.includes(mainId)) onMainChange(next[0]);
    setChecked([]);
    setOpen(false);
  };

  const handleRemove = (id: string) => {
    const next = value.filter(x => x !== id);
    onChange(next);
    if (id === effectiveMainId) onMainChange(defaultId && next.includes(defaultId) ? defaultId : next[0] ?? '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <style>{GROUP_PICKER_CSS}</style>
      {!hideLabel && (
        <div>
          <FormLabel>거래처 담당 업무그룹 지정</FormLabel>
          <p style={{ margin: 0, fontFamily: ff, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#767D8A' }}>우리 회사에서 이 거래처를 담당할 업무그룹을 추가해 주세요.</p>
        </div>
      )}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            data-name="group-select"
            onClick={() => setOpen(o => !o)}
            style={{ ...fieldBoxStyle(false), flex: 1, width: 'auto', minWidth: 0, cursor: 'pointer', textAlign: 'left', borderColor: open ? '#005FFF' : BORDER }}
          >
            <span style={{ ...fieldTextStyle, flex: 1, minWidth: 0, color: checked.length ? '#2E3238' : '#767D8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {checked.length === 0 ? '업무그룹 선택' : checked.length === 1 ? groupName(checked[0]) : `${groupName(checked[0])} 외 ${checked.length - 1}개`}
            </span>
            {open && <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><Chevron size={16} color="#5C6370" /></span>}
          </button>
          <ModalButton onClick={handleAdd}>추가</ModalButton>
        </div>
        {open && (
          <div ref={dropdownRef} data-name="group-dropdown" style={{ position: 'absolute', top: 48, left: 0, width: 'calc(100% - 68px)', zIndex: 10, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', overflow: 'hidden' }}>
            {/* 5개 이상이면 스크롤 */}
            <div style={{ maxHeight: 37 * 5 + 8, overflowY: 'auto', padding: 4 }}>
              {groups.map(g => {
                const added = value.includes(g.id);
                const disabled = g.isDefault || added;
                return (
                  <div
                    key={g.id}
                    className={disabled ? undefined : 'pmg-opt'}
                    onClick={disabled ? undefined : () => toggleChecked(g.id)}
                    role="checkbox"
                    aria-checked={added || checked.includes(g.id)}
                    aria-disabled={disabled}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, height: 37, padding: '0 8px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer' }}
                  >
                    <Checkbox on={added || checked.includes(g.id)} disabled={disabled} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: disabled ? '#9197A1' : '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {ordered.length > 0 && (
        <div data-name="group-list" style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 4, maxHeight: 224, overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ordered.map(id => {
            const isMain = id === effectiveMainId;
            return (
              <div
                key={id}
                className={'pmg-row' + (isMain ? '' : ' pmg-sub')}
                onClick={() => onMainChange(id)}
                title={isMain ? '대표 업무그룹' : '클릭하여 대표 업무그룹으로 지정'}
                style={{ height: 40, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 4, cursor: isMain ? 'default' : 'pointer', background: isMain ? '#F5F9FF' : '#FFFFFF', border: `1px solid ${isMain ? '#005FFF' : 'transparent'}` }}
              >
                {isMain && <RepresentativeBadge short />}
                <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName(id)}</span>
                {id !== defaultId && (
                  <button type="button" aria-label={`${groupName(id)} 지정 해제`} onClick={e => { e.stopPropagation(); handleRemove(id); }} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    <RemoveIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 거래처 등록 모달 ────────────────────────────────────────────────────────

function GeoraecheoRegisterModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: TradePartner) => void }) {
  const [ourGroups] = useState<WorkGroup[]>(() => getGroups());
  const defaultGroupId = ourGroups.find(g => g.isDefault)?.id ?? '';
  const [bizName, setBizName] = useState('');
  const [bizNumber, setBizNumber] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizItem, setBizItem] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('화주사');
  const [taxEmail, setTaxEmail] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [contact, setContact] = useState('');
  const [fax, setFax] = useState('');
  const [alias, setAlias] = useState('');
  const [memo, setMemo] = useState('');
  const [mainGroupId, setMainGroupId] = useState(defaultGroupId);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(defaultGroupId ? [defaultGroupId] : []);
  const [suggest, setSuggest] = useState<'name' | 'number' | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, showToast, hideToast] = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);

  const registeredNumbers = new Set(getPartners().map(p => p.bizNumber));
  const dirty = [bizName, bizNumber, bizType, bizItem, address, addressDetail, taxEmail, ceoName, contact, fax, alias, memo].some(v => v.trim() !== '')
    || partnerType !== '화주사' || assignedGroupIds.length !== (defaultGroupId ? 1 : 0);
  // 닫기/취소/ESC — 입력한 내용이 있으면 그만둘지 먼저 묻는다
  const requestClose = () => { if (dirty) setConfirmClose(true); else onClose(); };
  useEscapeKey(confirmClose ? () => setConfirmClose(false) : requestClose);

  const handleSelectBiz = (rec: BizRecord) => {
    setBizName(rec.bizName);
    setBizNumber(rec.bizNumber);
    setAddress(rec.address || '');
    setAddressDetail(rec.addressDetail || '');
    setBizType(rec.bizType || '');
    setBizItem(rec.bizItem || '');
    setSuggest(null);
  };

  // 필수(사업자명·사업자등록번호)가 채워지면 [등록] 활성 → 클릭 시 유효성 확인
  const canClick = bizName.trim() !== '' && bizNumber.trim() !== '';
  const handleRegister = () => {
    if (!bizName.trim() || !isValidBizNumber(bizNumber) || registeredNumbers.has(bizNumber) || (taxEmail.trim() !== '' && !isValidEmail(taxEmail.trim()))) {
      showToast('필수 항목을 모두 입력해 주셔야 거래처등록이 가능해요', 'error');
      return;
    }
    const main = assignedGroupIds.includes(mainGroupId) ? mainGroupId : assignedGroupIds[0] ?? '';
    onRegister({
      id: Date.now(),
      status: '정상',
      partnerType,
      alias: alias.trim() || bizName.trim(),
      bizName: bizName.trim(),
      bizNumber,
      address: address.trim(),
      addressDetail: addressDetail.trim(),
      bizType: bizType.trim(),
      bizItem: bizItem.trim(),
      ceoName: ceoName.trim(),
      contact,
      fax,
      taxEmail: taxEmail.trim(),
      memo: memo.trim(),
      registeredAt: nowStamp(),
      tTrucker: false,
      sharedGroups: [],
      settleSchedules: [{ ...makeSchedule('기본스케줄', Date.now() % 1000), groupId: main }],
      contacts: [],
      mainGroupId: main,
      assignedGroupIds,
    });
    onClose();
  };

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={requestClose} name="partner-register-modal">
      <div role="dialog" aria-label="거래처 등록" style={{ width: 704, height: 880, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
        <style>{REGISTER_CSS + DETAIL_CSS}</style>
        <ModalHeader title="거래처 등록" onClose={requestClose} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px 24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40, width: '100%', minWidth: 0 }}>
            <FormSection title="기본 정보">
              <FormRow>
                <FormField label="사업자명" required>
                  <div style={{ position: 'relative' }}>
                    <TextField value={bizName} onChange={v => { setBizName(v); setSuggest('name'); }} placeholder="사업자명 입력" required onFocus={() => setSuggest('name')} onBlur={() => setTimeout(() => setSuggest(s => s === 'name' ? null : s), 150)} />
                    {suggest === 'name' && bizName.trim() !== '' && <BizSuggestList query={bizName.trim()} by="name" registeredNumbers={registeredNumbers} onSelect={handleSelectBiz} />}
                  </div>
                </FormField>
                <FormField label="사업자등록번호" required>
                  <div style={{ position: 'relative' }}>
                    <TextField value={bizNumber} onChange={v => { setBizNumber(formatBizNumber(v)); setSuggest('number'); }} placeholder="사업자등록번호 입력" required inputMode="numeric" onFocus={() => setSuggest('number')} onBlur={() => setTimeout(() => setSuggest(s => s === 'number' ? null : s), 150)} />
                    {suggest === 'number' && bizNumber.trim() !== '' && <BizSuggestList query={bizNumber.trim()} by="number" registeredNumbers={registeredNumbers} onSelect={handleSelectBiz} />}
                  </div>
                </FormField>
              </FormRow>
              {/* 거래처 유형은 운송사 계정에서만 노출 (화주사 계정은 미노출) */}
              <FormField label="거래처 유형"><SegmentField<PartnerType> label="거래처 유형" value={partnerType} options={PARTNER_TYPE_SEGMENTS} onChange={setPartnerType} /></FormField>
              <FormRow>
                <FormField label="업태"><TextField value={bizType} onChange={setBizType} placeholder="업태 입력" /></FormField>
                <FormField label="종목"><TextField value={bizItem} onChange={setBizItem} placeholder="종목 입력" /></FormField>
              </FormRow>
              <FormRow>
                <FormField label="사업장 주소"><AddressField value={address} onChange={setAddress} /></FormField>
                <FormField label="상세 주소" hideLabel><TextField value={addressDetail} onChange={setAddressDetail} placeholder="상세 주소 입력" /></FormField>
              </FormRow>
              <FormRow>
                <FormField label="세금계산서 이메일">
                  <TextField value={taxEmail} onChange={setTaxEmail} placeholder="세금계산서 이메일 입력" inputMode="email" />
                  <FieldError>{taxEmail.trim() !== '' && !isValidEmail(taxEmail.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : ''}</FieldError>
                </FormField>
                <FormField label="팩스번호"><TextField value={fax} onChange={v => setFax(formatPhone(v))} placeholder="팩스번호 입력" inputMode="tel" /></FormField>
              </FormRow>
            </FormSection>

            <Divider />

            <FormSection title="대표자 정보">
              <FormRow>
                <FormField label="이름"><TextField value={ceoName} onChange={setCeoName} placeholder="대표자명 입력" /></FormField>
                <FormField label="연락처"><TextField value={contact} onChange={v => setContact(formatPhone(v))} placeholder="대표자 연락처 입력" inputMode="tel" /></FormField>
              </FormRow>
            </FormSection>

            <Divider />

            <FormSection title="부가 정보">
              <FormField label="거래처 별칭"><TextField value={alias} onChange={setAlias} placeholder="거래처 별칭 입력" /></FormField>
              <WorkGroupPicker groups={ourGroups} value={assignedGroupIds} mainId={mainGroupId} onChange={setAssignedGroupIds} onMainChange={setMainGroupId} />
              <FormField label="거래처 운영 메모">
                <TextArea value={memo} onChange={setMemo} placeholder="거래 시 참고할 사항을 입력해 주세요. (내부 직원에게만 공개)" />
              </FormField>
            </FormSection>
          </div>
        </div>
        <div style={{ height: 88, padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <ModalButton ghost h={52} size={18} px={20} onClick={requestClose}>취소</ModalButton>
          <ModalButton primary h={52} size={18} px={20} disabled={!canClick} onClick={handleRegister}>등록</ModalButton>
        </div>
        {toast && <Toast message={toast.message} tone={toast.tone} onClose={hideToast} />}
      </div>
      {confirmClose && (
        <ConfirmDialog
          title="거래처 등록을 그만하시겠어요?"
          description="입력된 내용은 저장되지 않습니다."
          confirmLabel="그만하기"
          onCancel={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      )}
    </ModalOverlay>
  );
}

// ─── 거래처 상세 모달 — 정보 테이블 컴포넌트 ─────────────────────────────────

const DETAIL_CSS = ".pmd-in{height:30px;border:1px solid #E3E5E9;border-radius:4px;padding:0 8px;box-sizing:border-box;font-family:'Pretendard GOV:Regular';font-size:15px;letter-spacing:-0.02em;color:#2E3238;background:#FFFFFF;outline:none;min-width:0}.pmd-in:focus{border-color:#005FFF}.pmd-in::placeholder{color:#9197A1}.pmd-acc:hover{background:#EEF0F2!important}.pmd-sel{appearance:none;border:none;background:transparent;cursor:pointer;outline:none}.pmd-add:hover{background:#F6F7F8!important}";

// 정산스케줄 항목 라벨 옆 (i) 아이콘 툴팁 문구
const FIELD_INFO: Record<string, string> = {
  종사업자번호: '거래처의 종사업장 번호가 있는 경우 입력해요.',
  결제수단: '현금·어음·카드 중 대금을 결제하는 수단이에요.',
  정산기간: '한 번의 정산에 포함되는 기간이에요. 시작일이 종료일보다 크면 익월 종료일까지예요. (예: 26일~익월 25일)',
  '인수증 기본설정': '정산 시 필요한 인수증 기본값이에요.',
  수금예정일: '계산서 발행일 기준으로 대금을 받을 예정일이에요.',
  '세금계산서 이메일': '세금계산서를 받을 이메일이에요.',
  계약운임표: '이 거래처와 계약한 운임표예요.',
  정산메모: '정산 시 참고할 메모예요.',
  '거래처 직원 정보': '거래처의 정산·배차 담당 직원이에요.',
};

const PAY_MEANS_OPTIONS = ['현금', '어음', '카드'];

// 섹션 헤더/테이블 안에서 쓰는 작은 버튼 (수정/저장/취소/설정/삭제 등)
function SmallButton({ children, onClick, primary, style }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; primary?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: 26, padding: '0 8px', borderRadius: 2, border: primary ? 'none' : `1px solid ${BORDER}`, background: primary ? '#005FFF' : '#FFFFFF', cursor: 'pointer', flexShrink: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: primary ? '#FFFFFF' : '#2E3238', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}
    >
      {children}
    </button>
  );
}

function DetailSectionTitle({ children, info, actions }: { children: React.ReactNode; info?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 18, lineHeight: '26px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{children}</p>
      {info && (
        <span title={info} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -7, cursor: 'help' }}>
          <InfoIcon />
        </span>
      )}
      {actions}
    </div>
  );
}

function InfoTable({ children }: { children: React.ReactNode }) {
  return <div style={{ borderTop: `1px solid ${BORDER}`, width: '100%' }}>{children}</div>;
}

function InfoRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${BORDER}`, minHeight: 40, boxSizing: 'border-box' }}>{children}</div>;
}

function InfoLabel({ label, info }: { label: string; info?: boolean }) {
  return (
    <div style={{ width: 160, flexShrink: 0, background: '#F6F7F8', padding: '0 4px 0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#5C6370', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {info && (
        <span title={FIELD_INFO[label] || label} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'help' }}>
          <InfoIcon />
        </span>
      )}
    </div>
  );
}

// 값이 비어 있으면 회색 "-" 표시
function InfoValue({ children, wrap, visible }: { children?: React.ReactNode; wrap?: boolean; visible?: boolean }) {
  const empty = children == null || children === '' || children === false
    || (Array.isArray(children) && children.every(c => c == null || c === false || c === ''));
  return (
    <div style={{ flex: '1 0 0', minWidth: 0, padding: wrap ? '8px' : '6px 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 6, overflow: visible ? 'visible' : 'hidden', fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', whiteSpace: wrap ? 'normal' : 'nowrap', wordBreak: 'keep-all' }}>
      {empty ? <span style={{ color: '#C7CBD1' }}>-</span> : children}
    </div>
  );
}

function Ellipsis({ children }: { children: React.ReactNode }) {
  return <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>;
}

function InlineSelect({ value, options, onChange }: { value: string; options: (string | FilterOption)[]; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
      <select className="pmd-sel" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, minWidth: 0, height: 22, paddingRight: 24, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', display: 'flex' }}>
        <Chevron size={16} color="#5C6370" />
      </span>
    </div>
  );
}

const DAY_OPTIONS: FilterOption[] = Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}일` }));
const BANK_OPTIONS = ['KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', 'SC제일은행', '카카오뱅크', '토스뱅크', '케이뱅크', '부산은행', '대구은행'];
const RECEIPT_SEGMENTS: { v: string; l: string }[] = [{ v: '원본/사진 필수', l: '원본/사진 필수' }, { v: '사진 필수', l: '사진 필수' }, { v: '필요 없음', l: '필요 없음' }];

// 시작일 > 종료일이면 익월에 걸치는 기간 (예: 26일~익월 25일)
function formatSettlePeriod(start: number, end: number) {
  return start > end ? `${start}일~익월 ${end}일` : `${start}일~${end}일`;
}

// 공유그룹별 정산 설정의 '조건' 요약 — 결제방법·결제수단·정산기간·수금기한
function scheduleSummary(s: SettleSchedule) {
  return `${s.payMeans || '현금'} · ${formatSettlePeriod(s.settlePeriodStart ?? 1, s.settlePeriodEnd ?? 31)} · 정산 종료 ${s.collectDays ?? 30}일 후 수금`;
}

// ─── 상세 > 수정 팝업 공용 틀 ────────────────────────────────────────────────

// 수정된 내용이 있고 유효성 검사를 모두 통과했을 때만 CTA 활성
function EditModal({ title, width = 400, canSubmit, submitLabel = '수정', onClose, onSubmit, toast, onToastClose, children }: {
  title: string;
  width?: number;
  canSubmit: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: () => void;
  toast?: ToastState;
  onToastClose?: () => void;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);
  useEscapeKey(onClose);
  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={onClose} name="partner-edit-modal">
      <div role="dialog" aria-label={title} style={{ width, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', position: 'relative' }}>
        <style>{REGISTER_CSS + DETAIL_CSS}</style>
        <ModalHeader title={title} onClose={onClose} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
        </div>
        <div style={{ height: 88, padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <ModalButton ghost h={48} size={16} px={16} onClick={onClose}>닫기</ModalButton>
          <ModalButton primary h={48} size={16} px={16} disabled={!canSubmit} onClick={onSubmit}>{submitLabel}</ModalButton>
        </div>
        {toast && onToastClose && <Toast message={toast.message} tone={toast.tone} onClose={onToastClose} />}
      </div>
    </ModalOverlay>
  );
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// 기본 정보(회사 정보) 수정
function CompanyEditModal({ partner, onClose, onSubmit }: { partner: TradePartner; onClose: () => void; onSubmit: (patch: Partial<TradePartner>) => void }) {
  const initial = {
    bizName: partner.bizName || '', bizNumber: partner.bizNumber || '', bizType: partner.bizType || '', bizItem: partner.bizItem || '',
    address: partner.address || '', addressDetail: partner.addressDetail || '', partnerType: partner.partnerType || '화주사' as PartnerType,
    status: partner.status, statusReason: partner.statusReason || '', taxEmail: partner.taxEmail || '', fax: partner.fax || '', bizLicenseFiles: partner.bizLicenseFiles || [],
  };
  const [d, setD] = useState(initial);
  const [toast, showToast, hideToast] = useToast();
  const set = <K extends keyof typeof initial>(k: K) => (v: typeof initial[K]) => setD(prev => ({ ...prev, [k]: v }));
  const nameError = d.bizName.trim() === '' ? '사업자명을 입력해 주세요.' : '';
  const numberError = !isValidBizNumber(d.bizNumber) ? '사업자번호를 입력해 주세요.' : '';
  const emailError = d.taxEmail.trim() !== '' && !isValidEmail(d.taxEmail.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : '';
  const canSubmit = !sameJson(d, initial) && !nameError && !numberError && !emailError;
  return (
    <EditModal title="기본 정보 수정" canSubmit={canSubmit} onClose={onClose} toast={toast} onToastClose={hideToast} onSubmit={() => onSubmit({ ...d, bizName: d.bizName.trim(), taxEmail: d.taxEmail.trim(), statusReason: d.status === '거래중지' ? d.statusReason.trim() : '' })}>
      <FormField label="사업자명" required>
        <TextField value={d.bizName} onChange={set('bizName')} placeholder="사업자명 입력" required />
        <FieldError>{nameError}</FieldError>
      </FormField>
      <FormField label="사업자번호" required>
        <TextField value={d.bizNumber} onChange={v => set('bizNumber')(formatBizNumber(v))} placeholder="사업자번호 입력" required inputMode="numeric" />
        <FieldError>{numberError}</FieldError>
      </FormField>
      <FormField label="업태"><TextField value={d.bizType} onChange={set('bizType')} placeholder="업태 입력" /></FormField>
      <FormField label="종목"><TextField value={d.bizItem} onChange={set('bizItem')} placeholder="종목 입력" /></FormField>
      <FormField label="주소">
        <AddressField value={d.address} onChange={set('address')} />
        <TextField value={d.addressDetail} onChange={set('addressDetail')} placeholder="상세 주소 입력" />
      </FormField>
      <FormField label="거래처 유형"><SegmentField label="거래처 유형" value={d.partnerType} options={PARTNER_TYPE_SEGMENTS} onChange={set('partnerType')} /></FormField>
      <FormField label="거래 상태">
        <SegmentField label="거래 상태" value={d.status} options={STATUS_SEGMENTS} onChange={set('status')} />
        {d.status === '거래중지' && <TextField value={d.statusReason} onChange={set('statusReason')} placeholder="사유를 입력해 주세요" />}
      </FormField>
      <FormField label="세금계산서 이메일">
        <TextField value={d.taxEmail} onChange={set('taxEmail')} placeholder="세금계산서 이메일 입력" inputMode="email" />
        <FieldError>{emailError}</FieldError>
      </FormField>
      <FormField label="팩스번호"><TextField value={d.fax} onChange={v => set('fax')(formatPhone(v))} placeholder="팩스번호 입력" inputMode="tel" /></FormField>
      <FormField label="사업자등록증 (최대 5개 첨부 가능)">
        <FileAttachField files={d.bizLicenseFiles} onChange={set('bizLicenseFiles')} onToast={showToast} />
      </FormField>
    </EditModal>
  );
}

function CeoEditModal({ partner, onClose, onSubmit }: { partner: TradePartner; onClose: () => void; onSubmit: (patch: Partial<TradePartner>) => void }) {
  const initial = { ceoName: partner.ceoName || '', contact: partner.contact || '' };
  const [d, setD] = useState(initial);
  const set = (k: keyof typeof initial) => (v: string) => setD(prev => ({ ...prev, [k]: v }));
  const canSubmit = !sameJson(d, initial);
  return (
    <EditModal title="대표자 정보 수정" canSubmit={canSubmit} onClose={onClose} onSubmit={() => onSubmit({ ceoName: d.ceoName.trim(), contact: d.contact })}>
      <FormField label="이름"><TextField value={d.ceoName} onChange={set('ceoName')} placeholder="이름 입력" /></FormField>
      <FormField label="연락처"><TextField value={d.contact} onChange={v => set('contact')(formatPhone(v))} placeholder="연락처 입력" inputMode="tel" /></FormField>
    </EditModal>
  );
}

function ExtraEditModal({ partner, groups, onClose, onSubmit }: { partner: TradePartner; groups: WorkGroup[]; onClose: () => void; onSubmit: (patch: Partial<TradePartner>) => void }) {
  const defaultId = groups.find(g => g.isDefault)?.id;
  const initialIds = partner.assignedGroupIds?.length ? partner.assignedGroupIds : defaultId ? [defaultId] : [];
  const initial = { alias: partner.alias || '', memo: partner.memo || '', settleMemo: partner.settleMemo || '', assignedGroupIds: initialIds, mainGroupId: initialIds.includes(partner.mainGroupId) ? partner.mainGroupId : initialIds[0] ?? '' };
  const [d, setD] = useState(initial);
  const canSubmit = !sameJson(d, initial) && d.assignedGroupIds.length > 0;
  return (
    <EditModal title="부가 정보" width={480} canSubmit={canSubmit} onClose={onClose} onSubmit={() => onSubmit({ alias: d.alias.trim() || partner.bizName, memo: d.memo.trim(), settleMemo: d.settleMemo.trim(), assignedGroupIds: d.assignedGroupIds, mainGroupId: d.mainGroupId })}>
      <FormField label="거래처 별칭"><TextField value={d.alias} onChange={v => setD(p => ({ ...p, alias: v }))} placeholder="거래처 별칭 입력" /></FormField>
      <WorkGroupPicker
        groups={groups}
        value={d.assignedGroupIds}
        mainId={d.mainGroupId}
        onChange={ids => setD(p => ({ ...p, assignedGroupIds: ids }))}
        onMainChange={id => setD(p => ({ ...p, mainGroupId: id }))}
      />
      <FormField label="거래처 운영 메모">
        <TextArea value={d.memo} onChange={v => setD(p => ({ ...p, memo: v }))} placeholder="거래 시 참고할 사항을 입력해 주세요. (내부 직원에게만 공개)" />
      </FormField>
      <FormField label="거래처 정산 메모">
        <TextArea value={d.settleMemo} onChange={v => setD(p => ({ ...p, settleMemo: v }))} placeholder="정산 시 참고할 사항을 입력해 주세요. (내부 직원에게만 공개)" />
      </FormField>
    </EditModal>
  );
}

// 정산스케줄 추가/수정 — 스케줄명·정산기간 필수
function ScheduleEditModal({ schedule, partner, groups, onClose, onSubmit }: {
  schedule: SettleSchedule | null;
  partner: TradePartner;
  groups: WorkGroup[];
  onClose: () => void;
  onSubmit: (s: SettleSchedule) => void;
}) {
  const defaultGroupId = groups.find(g => g.isDefault)?.id ?? '';
  const base: SettleSchedule = schedule ?? { ...makeSchedule('', Date.now() % 1000), receiptDefault: '원본/사진 필수' };
  const initial = {
    name: base.name, groupId: base.groupId || defaultGroupId, payMeans: base.payMeans || '현금', subBizNumber: base.subBizNumber || '',
    settlePeriodStart: base.settlePeriodStart ?? 1, settlePeriodEnd: base.settlePeriodEnd ?? 31, receiptDefault: base.receiptDefault || '원본/사진 필수',
    taxEmail: base.taxEmail || '', invoiceDays: String(base.invoiceDays ?? 1), collectDays: String(base.collectDays ?? 30),
    bank: base.bank || '', accountNumber: base.accountNumber || '', accountHolder: base.accountHolder || '', bankbookFiles: base.bankbookFile ? [base.bankbookFile] : [] as string[],
    settleMemo: base.settleMemo || '',
  };
  const [d, setD] = useState(initial);
  const [toast, showToast, hideToast] = useToast();
  const set = <K extends keyof typeof initial>(k: K) => (v: typeof initial[K]) => setD(prev => ({ ...prev, [k]: v }));
  const groupOptions: FilterOption[] = groups.filter(g => g.isDefault || (partner.assignedGroupIds || []).includes(g.id)).map(g => ({ v: g.id, l: g.name }));
  const nameError = d.name.trim() === '' ? '스케줄명을 입력해 주세요.' : '';
  const emailError = d.taxEmail.trim() !== '' && !isValidEmail(d.taxEmail.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : '';
  const canSubmit = (schedule === null || !sameJson(d, initial)) && !nameError && !emailError;
  const dayInput = (value: string, onChange: (v: string) => void, max: number) => (
    <div className="pmr-field" style={{ ...fieldBoxStyle(false), gap: 8 }}>
      <span style={{ ...fieldTextStyle, color: '#454B55', flex: 1 }}>정산종료일</span>
      <input className="pmr-input" value={value} inputMode="numeric" onChange={e => { const n = e.target.value.replace(/\D/g, '').slice(0, 3); onChange(n === '' ? '' : String(Math.min(Number(n), max))); }} style={{ ...fieldTextStyle, width: 40, textAlign: 'right', border: 'none', outline: 'none', background: 'transparent', padding: 0 }} />
      <span style={{ ...fieldTextStyle, flexShrink: 0 }}>일 후</span>
    </div>
  );
  const periodSelect = (value: number, onChange: (n: number) => void, prefix: string) => (
    <div className="pmr-field" style={{ ...fieldBoxStyle(false), position: 'relative', padding: '0 12px', gap: 8 }}>
      <span style={{ ...fieldTextStyle, color: '#454B55', flexShrink: 0 }}>{prefix}</span>
      <select className="pmd-sel" value={String(value)} onChange={e => onChange(Number(e.target.value))} style={{ ...fieldTextStyle, flex: 1, minWidth: 0, textAlign: 'right', direction: 'rtl', height: '100%' }}>
        {DAY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
  const submit = () => onSubmit({
    ...base,
    name: d.name.trim(), groupId: d.groupId, payMeans: d.payMeans, subBizNumber: d.subBizNumber,
    settlePeriodStart: d.settlePeriodStart, settlePeriodEnd: d.settlePeriodEnd, receiptDefault: d.receiptDefault, taxEmail: d.taxEmail.trim(),
    invoiceDays: Number(d.invoiceDays) || 0, collectDays: Number(d.collectDays) || 0,
    bank: d.bank, accountNumber: d.accountNumber, accountHolder: d.accountHolder.trim(), bankbookFile: d.bankbookFiles[0] || '', settleMemo: d.settleMemo.trim(),
  });
  return (
    <EditModal title={schedule ? `${schedule.name} 수정` : '정산스케줄 추가'} width={704} canSubmit={canSubmit} submitLabel="저장" onClose={onClose} onSubmit={submit} toast={toast} onToastClose={hideToast}>
      <FormSection title="기본 정보">
        <FormField label="스케줄명" required>
          <TextField value={d.name} onChange={v => set('name')(v.slice(0, 20))} placeholder="스케줄명 입력" required />
          <FieldError>{nameError && d.name !== initial.name ? nameError : ''}</FieldError>
        </FormField>
        <FormRow>
          <FormField label="담당 업무그룹"><SelectField value={d.groupId} options={groupOptions} onChange={set('groupId')} /></FormField>
          <FormField label="종사업자번호"><TextField value={d.subBizNumber} onChange={v => set('subBizNumber')(v.replace(/\D/g, '').slice(0, 4))} placeholder="4자리 입력" inputMode="numeric" /></FormField>
        </FormRow>
        <FormRow>
          <FormField label="결제수단"><SelectField value={d.payMeans} options={PAY_MEANS_OPTIONS} onChange={set('payMeans')} /></FormField>
          <FormField label="정산기간" required>
            <div style={{ display: 'flex', gap: 8 }}>
              {periodSelect(d.settlePeriodStart, set('settlePeriodStart'), '시작')}
              {periodSelect(d.settlePeriodEnd, set('settlePeriodEnd'), d.settlePeriodStart > d.settlePeriodEnd ? '익월 종료' : '종료')}
            </div>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="인수증 기본설정"><SegmentField label="인수증 기본설정" value={d.receiptDefault} options={RECEIPT_SEGMENTS} onChange={set('receiptDefault')} /></FormField>
          <FormField label="세금계산서 이메일">
            <TextField value={d.taxEmail} onChange={set('taxEmail')} placeholder="세금계산서 이메일 입력" inputMode="email" />
            <FieldError>{emailError}</FieldError>
          </FormField>
        </FormRow>
        <FormRow>
          <FormField label="거래명세서 작성일">{dayInput(d.invoiceDays, set('invoiceDays'), 99)}</FormField>
          <FormField label="수금기한">{dayInput(d.collectDays, set('collectDays'), 180)}</FormField>
        </FormRow>
      </FormSection>
      <Divider />
      <FormSection title="계좌 정보">
        <FormRow>
          <FormField label="은행"><SelectField value={d.bank} options={BANK_OPTIONS} onChange={set('bank')} placeholder="은행 선택" /></FormField>
          <FormField label="예금주"><TextField value={d.accountHolder} onChange={v => set('accountHolder')(v.slice(0, 20))} placeholder="이름 입력" /></FormField>
        </FormRow>
        <FormField label="계좌번호"><TextField value={d.accountNumber} onChange={v => set('accountNumber')(v.replace(/\D/g, '').slice(0, 15))} placeholder="숫자만 입력" inputMode="numeric" /></FormField>
        <FormField label="통장사본"><FileAttachField files={d.bankbookFiles} onChange={set('bankbookFiles')} onToast={showToast} max={1} /></FormField>
        <FormField label="정산 메모"><TextArea value={d.settleMemo} onChange={set('settleMemo')} placeholder="정산 메모를 입력해 주세요. (내부 직원에게만 공개)" /></FormField>
      </FormSection>
    </EditModal>
  );
}

// ─── 정산스케줄 아코디언 ─────────────────────────────────────────────────────

function ScheduleAccordion({ schedule, open, onToggle, partner, groups, pendingGroupId, onGroupChange, onEdit, onRemove, canRemove }: {
  schedule: SettleSchedule;
  open: boolean;
  onToggle: () => void;
  partner: TradePartner;
  groups: WorkGroup[];
  pendingGroupId?: string;
  onGroupChange: (groupId: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const taxEmail = schedule.taxEmail || partner.taxEmail;
  const defaultGroupId = groups.find(g => g.isDefault)?.id ?? '';
  const groupOptions: FilterOption[] = groups.filter(g => g.isDefault || (partner.assignedGroupIds || []).includes(g.id)).map(g => ({ v: g.id, l: g.name }));
  const account = [schedule.bank, schedule.accountNumber, schedule.accountHolder].filter(Boolean).join(' ');

  return (
    <div>
      <div
        className="pmd-acc"
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ height: 40, background: '#F6F7F8', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none' }}>
          <Chevron size={16} color="#5C6370" />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#5C6370', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schedule.name}</span>
        <SmallButton onClick={e => { e.stopPropagation(); onEdit(); }}>수정</SmallButton>
        {/* 기본 스케줄(초기 기본값)은 삭제 버튼 미노출 */}
        {canRemove && <SmallButton onClick={e => { e.stopPropagation(); onRemove(); }}>삭제</SmallButton>}
      </div>
      {open && (
        <div>
          <InfoRow>
            <InfoLabel label="담당업무그룹" />
            <InfoValue>
              <InlineSelect value={pendingGroupId ?? (schedule.groupId || defaultGroupId)} options={groupOptions} onChange={onGroupChange} />
            </InfoValue>
            <InfoLabel label="종사업자번호" />
            <InfoValue>{schedule.subBizNumber}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="결제수단" />
            <InfoValue><Ellipsis>{schedule.payMeans || '현금'}</Ellipsis></InfoValue>
            <InfoLabel label="정산기간" />
            <InfoValue><Ellipsis>{formatSettlePeriod(schedule.settlePeriodStart ?? 1, schedule.settlePeriodEnd ?? 31)}</Ellipsis></InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="인수증 기본설정" />
            <InfoValue><Ellipsis>{schedule.receiptDefault || '원본/사진 필수'}</Ellipsis></InfoValue>
            <InfoLabel label="세금계산서 이메일" />
            {/* 스케줄별 이메일 미지정 시 기본 정보의 세금계산서 이메일 */}
            <InfoValue>{taxEmail && <Ellipsis>{taxEmail}</Ellipsis>}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="거래명세서 작성일" />
            <InfoValue><Ellipsis>{`정산 종료일 ${schedule.invoiceDays ?? 1}일 후`}</Ellipsis></InfoValue>
            <InfoLabel label="수금기한" />
            <InfoValue><Ellipsis>{`정산 종료일 ${schedule.collectDays ?? 30}일 후`}</Ellipsis></InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="계좌정보" />
            <InfoValue>{account && <Ellipsis>{account}</Ellipsis>}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="정산메모" />
            <InfoValue wrap>{schedule.settleMemo}</InfoValue>
          </InfoRow>
        </div>
      )}
    </div>
  );
}

// ─── 서류정보 탭 ─────────────────────────────────────────────────────────────

type DocKey = 'bizLicense' | PartnerDocKey;
const DOC_ITEMS: { key: DocKey; label: string; max: number }[] = [
  { key: 'bizLicense', label: '사업자등록증', max: 1 },
  { key: 'bankbook', label: '통장사본', max: 1 },
  { key: 'brokerLicense', label: '주선면허증', max: 1 },
  { key: 'transportLicense', label: '운송면허증', max: 1 },
  { key: 'contract', label: '계약서', max: 150 },
  { key: 'etc', label: '기타', max: 10 },
];
const partnerDocs = (p: TradePartner, key: DocKey) => (key === 'bizLicense' ? p.bizLicenseFiles : p.documents?.[key]) || [];

// [파일 첨부] 또는 영역에 끌어다 놓기로 첨부
function DocDropField({ label, files, max, onChange, onToast }: { label: string; files: string[]; max: number; onChange: (files: string[]) => void; onToast: (msg: string, tone?: ToastTone) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const open = () => {
    if (files.length >= max) { onToast(`총 ${max}개까지만 첨부할 수 있습니다.`, 'error'); return; }
    fileRef.current?.click();
  };
  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
    onToast('첨부된 파일이 삭제되었습니다.', 'error');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238' }}>{`${label} (${files.length}/${max})`}</span>
        <SmallButton onClick={open} style={{ height: 22, padding: '0 6px', fontSize: 12 }}>파일 첨부</SmallButton>
        <input ref={fileRef} type="file" multiple={max > 1} accept=".pdf,.doc,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { acceptFiles(e.target.files, files, max, onChange, onToast); e.target.value = ''; }} />
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); acceptFiles(e.dataTransfer.files, files, max, onChange, onToast); }}
        style={{ minHeight: 60, borderRadius: 4, border: `1px solid ${over ? '#669FFF' : BORDER}`, background: over ? '#F5F9FF' : '#F6F7F8', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        {files.length === 0 ? (
          <span style={{ textAlign: 'center', fontFamily: ff, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#767D8A' }}>파일을 이 곳으로 끌어오세요.</span>
        ) : files.map((name, i) => (
          <div key={name + i} style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderTop: i ? `1px solid ${BORDER}` : 'none' }}>
            <ClipIcon />
            <span title={name} style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 14, color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            <button type="button" aria-label={`${name} 삭제`} onClick={() => remove(i)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><RemoveIcon /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 거래처 상세 모달 ────────────────────────────────────────────────────────

type DetailTab = 'basic' | 'schedule' | 'contacts' | 'shared' | 'docs' | 'main';

// 주력 노선 출발/도착 지역 선택지
const HUB_OPTIONS = ['분당HUB', '부산HUB', '이천HUB', '인천HUB', '평택HUB', '대전HUB', '대구HUB', '광주HUB', '동탄HUB'];

// 각 탭 상단 안내 문구
const tabDescStyle: React.CSSProperties = { margin: 0, fontFamily: ff, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#767D8A' };

// 하단 [수정]으로 한꺼번에 반영하는 변경분 — 정산스케줄 담당업무그룹, 공유그룹별 스케줄, 서류
type DetailPending = { scheduleGroup: Record<string, string>; sharedSchedule: Record<number, string>; docs: Partial<Record<DocKey, string[]>>; vehicles?: MainVehicle[]; routes?: MainRoute[] };
const EMPTY_PENDING: DetailPending = { scheduleGroup: {}, sharedSchedule: {}, docs: {} };
const isPendingEmpty = (p: DetailPending) => Object.keys(p.scheduleGroup).length + Object.keys(p.sharedSchedule).length + Object.keys(p.docs).length === 0 && !p.vehicles && !p.routes;

// 주력정보 표 안의 셀렉트/입력
function CellSelect({ value, options, onChange, placeholder }: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <select className="pmd-sel" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 30, paddingRight: 22, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: value ? '#2E3238' : '#9197A1' }}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', display: 'flex' }}><Chevron size={16} color="#5C6370" /></span>
    </div>
  );
}
type EditTarget = 'company' | 'ceo' | 'extra' | null;

function TabCount({ n }: { n: number }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 4px', borderRadius: 2, background: '#EBEDEF', fontFamily: ff, fontSize: 12, color: '#5C6370' }}>{n}</span>;
}

// 표 헤더/셀 (직원정보, 공유그룹 탭)
const gridTh: React.CSSProperties = { height: 40, padding: '0 8px', display: 'flex', alignItems: 'center', background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', boxSizing: 'border-box' };
const gridTd: React.CSSProperties = { minHeight: 44, padding: '6px 8px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, fontFamily: ff, fontSize: 15, color: '#2E3238', letterSpacing: ls, boxSizing: 'border-box', minWidth: 0, overflow: 'hidden' };

// 직원정보 탭 — 검색 기준과 열 너비(번호·직원명·직책/직함·휴대전화번호·팩스·이메일·담당 업무·정산스케줄·수정/삭제)
type ContactSearchType = '직원명' | '휴대전화번호' | '이메일';
const CONTACT_SEARCH_TYPES: ContactSearchType[] = ['직원명', '휴대전화번호', '이메일'];
const contactField = (c: PartnerContact, t: ContactSearchType) => t === '직원명' ? c.name : t === '휴대전화번호' ? c.phone : c.email;
const CONTACT_COLS = '50px 100px 130px 130px 130px 158px minmax(130px, 1fr) 140px 108px';
const contactTh: React.CSSProperties = { ...gridTh, borderRight: `1px solid ${BORDER}`, fontSize: 15 };
const contactTd: React.CSSProperties = { ...gridTd, minHeight: 48, borderRight: `1px solid ${BORDER}` };

// 배차관리 > 단건등록에서도 거래처명 옆 [▶]로 연다
export function GeoraecheoDetailModal({ partner: initialPartner, onClose, onSave }: { partner: TradePartner; onClose: () => void; onSave: (p: TradePartner) => void }) {
  const [partner, setPartner] = useState<TradePartner>(initialPartner);
  const [ourGroups, setOurGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => setOurGroups(getGroups())), []);
  const [tab, setTab] = useState<DetailTab>('basic');
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [scheduleEdit, setScheduleEdit] = useState<{ schedule: SettleSchedule | null } | null>(null);
  const [scheduleDelete, setScheduleDelete] = useState<SettleSchedule | null>(null);
  // 직원정보 — 한 행씩 수정 (isNew: [담당자 추가]로 만든 행)
  const [contactEdit, setContactEdit] = useState<{ row: PartnerContact; isNew: boolean } | null>(null);
  const [contactDelete, setContactDelete] = useState<PartnerContact | null>(null);
  const [contactSearchType, setContactSearchType] = useState<ContactSearchType>('직원명');
  const [contactKeyword, setContactKeyword] = useState('');
  const [contactQuery, setContactQuery] = useState<{ type: ContactSearchType; keyword: string }>({ type: '직원명', keyword: '' });
  const [pending, setPending] = useState<DetailPending>(EMPTY_PENDING);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [openScheduleIds, setOpenScheduleIds] = useState<Set<string>>(() => new Set(initialPartner.settleSchedules?.[0] ? [initialPartner.settleSchedules[0].id] : []));
  const [toast, showToast, hideToast] = useToast();

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);

  const commit = (next: TradePartner) => {
    setPartner(next);
    onSave(next);
  };
  const patchPartner = (patch: Partial<TradePartner>) => commit({ ...partner, ...patch });
  const groupName = (id: string) => ourGroups.find(g => g.id === id)?.name ?? '';

  // 새로 공유된 그룹 안내는 이번 진입에서만 보여주고, 닫을 때 '확인함'으로 처리 → 재진입 시 배너/dot 사라짐
  const closeNow = () => {
    if ((partner.sharedGroups || []).some(g => g.isNew)) onSave({ ...partner, sharedGroups: partner.sharedGroups.map(({ isNew, ...g }) => g) });
    onClose();
  };
  // 하단 [수정]을 누르지 않은 변경분이 있으면 그만둘지 먼저 묻는다
  const handleClose = () => { if (isPendingEmpty(pending)) closeNow(); else setConfirmDiscard(true); };
  const anyChildOpen = editTarget !== null || scheduleEdit !== null || scheduleDelete !== null || contactDelete !== null || confirmDiscard;
  useEscapeKey(anyChildOpen ? () => {} : handleClose);

  // ── 정산스케줄
  const schedules = partner.settleSchedules || [];
  const firstScheduleId = schedules[0]?.id ?? '';
  const submitSchedule = (s: SettleSchedule) => {
    const exists = schedules.some(x => x.id === s.id);
    commit({ ...partner, settleSchedules: exists ? schedules.map(x => x.id === s.id ? s : x) : [...schedules, s] });
    if (!exists) setOpenScheduleIds(prev => new Set([...prev, s.id]));
    setScheduleEdit(null);
    showToast(exists ? `${s.name} 정산스케줄을 수정했습니다.` : '스케줄 정보를 등록했습니다.');
  };
  // 삭제한 스케줄을 쓰던 공유그룹/직원은 기본 스케줄로 돌린다
  const removeSchedule = (id: string) => {
    const rest = schedules.filter(s => s.id !== id);
    commit({
      ...partner,
      settleSchedules: rest,
      sharedGroups: (partner.sharedGroups || []).map(g => g.scheduleId === id ? { ...g, scheduleId: rest[0].id } : g),
      contacts: (partner.contacts || []).map(c => c.scheduleId === id ? { ...c, scheduleId: rest[0].id } : c),
    });
    setScheduleDelete(null);
    showToast('스케줄 정보를 삭제했습니다.', 'error');
  };
  const toggleSchedule = (id: string) => setOpenScheduleIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── 공유그룹별 정산 설정 — 미가입 거래처는 '기본그룹' 1개만
  const groupMappings: SharedGroupMapping[] = (partner.tTrucker && partner.sharedGroups?.length ? partner.sharedGroups : [{ groupName: '기본그룹', scheduleId: firstScheduleId }])
    .map(g => ({ ...g, scheduleId: schedules.some(s => s.id === g.scheduleId) ? g.scheduleId : firstScheduleId }));
  const newShared = groupMappings.filter(g => g.isNew);
  const setPendingPart = <K extends keyof DetailPending>(k: K, key: string | number, v: string | string[], original: string | string[]) => setPending(p => {
    const part = { ...p[k] } as Record<string | number, string | string[]>;
    if (JSON.stringify(v) === JSON.stringify(original)) delete part[key]; else part[key] = v;
    return { ...p, [k]: part };
  });
  const savePending = () => {
    const docs = pending.docs;
    commit({
      ...partner,
      settleSchedules: schedules.map(x => pending.scheduleGroup[x.id] !== undefined ? { ...x, groupId: pending.scheduleGroup[x.id] } : x),
      sharedGroups: Object.keys(pending.sharedSchedule).length ? groupMappings.map((g, i) => pending.sharedSchedule[i] !== undefined ? { ...g, scheduleId: pending.sharedSchedule[i] } : g) : partner.sharedGroups,
      bizLicenseFiles: docs.bizLicense ?? partner.bizLicenseFiles,
      documents: { ...partner.documents, ...Object.fromEntries(Object.entries(docs).filter(([k]) => k !== 'bizLicense')) },
      mainVehicles: pending.vehicles ? pending.vehicles.filter(v => v.ton && v.carType) : partner.mainVehicles,
      mainRoutes: pending.routes ? pending.routes.filter(r => r.from && r.to) : partner.mainRoutes,
    });
    setPending(EMPTY_PENDING);
    showToast('거래처 정보를 수정했습니다.');
  };

  // ── 직원정보
  const contacts = partner.contacts || [];
  const contactQ = contactQuery.keyword.trim();
  const shownContacts = contactQ ? contacts.filter(c => contactField(c, contactQuery.type).includes(contactQ)) : contacts;
  const contactRows = contactEdit?.isNew ? [...shownContacts, contactEdit.row] : shownContacts;
  const contactNameError = contactEdit && contactEdit.row.name.trim() === '';
  const contactEmailError = contactEdit && contactEdit.row.email.trim() !== '' && !isValidEmail(contactEdit.row.email.trim());
  const saveContact = () => {
    if (!contactEdit) return;
    if (contactNameError || contactEmailError) { showToast(contactNameError ? '직원명을 입력해 주세요.' : '올바른 이메일 양식으로 입력해 주세요.', 'error'); return; }
    const row = { ...contactEdit.row, name: contactEdit.row.name.trim(), email: contactEdit.row.email.trim() };
    commit({ ...partner, contacts: contactEdit.isNew ? [...contacts, row] : contacts.map(c => c.id === row.id ? row : c) });
    showToast(contactEdit.isNew ? '담당자를 추가했습니다.' : '직원 정보를 수정했습니다.');
    setContactEdit(null);
  };
  const setContactField = (key: keyof PartnerContact, v: string) => setContactEdit(e => e && { ...e, row: { ...e.row, [key]: v } });
  const addContact = () => {
    if (contactEdit) { showToast('수정 중인 직원 정보를 먼저 저장해 주세요.', 'error'); return; }
    setContactEdit({ row: { id: genId('ct'), name: '', department: '', title: '', phone: '', fax: '', email: '', memo: '', scheduleId: firstScheduleId }, isNew: true });
  };

  const assignedIds = partner.assignedGroupIds || [];
  const mainId = assignedIds.includes(partner.mainGroupId) ? partner.mainGroupId : assignedIds[0];
  const assignedNames = [mainId, ...assignedIds.filter(id => id !== mainId)].filter(Boolean).map(groupName).filter(Boolean);
  const licenseFiles = partner.bizLicenseFiles || [];
  const docFiles = (key: DocKey) => pending.docs[key] ?? partnerDocs(partner, key);
  // 주력정보 — 원래 값과 같아지면 변경분에서 뺀다
  const vehicles = pending.vehicles ?? partner.mainVehicles ?? [];
  const routes = pending.routes ?? partner.mainRoutes ?? [];
  const setVehicles = (next: MainVehicle[]) => setPending(p => ({ ...p, vehicles: sameJson(next, partner.mainVehicles ?? []) ? undefined : next }));
  const setRoutes = (next: MainRoute[]) => setPending(p => ({ ...p, routes: sameJson(next, partner.mainRoutes ?? []) ? undefined : next }));
  const patchVehicle = (id: string, patch: Partial<MainVehicle>) => setVehicles(vehicles.map(v => v.id === id ? { ...v, ...patch } : v));
  const patchRoute = (id: string, patch: Partial<MainRoute>) => setRoutes(routes.map(r => r.id === id ? { ...r, ...patch } : r));

  const tabs: { key: DetailTab; label: string; count?: number; dot?: boolean }[] = [
    { key: 'basic', label: '기본정보' },
    { key: 'schedule', label: '정산스케줄', count: schedules.length },
    { key: 'contacts', label: '직원정보', count: contacts.length },
    { key: 'shared', label: '거래처가 공유한 업무그룹', count: groupMappings.length, dot: newShared.length > 0 },
    { key: 'docs', label: '서류정보' },
    { key: 'main', label: '주력정보' },
  ];

  const scheduleSelect = (value: string, onChange: (v: string) => void) => (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <select className="pmd-sel" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 30, paddingRight: 22, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', textOverflow: 'ellipsis' }}>
        {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', display: 'flex' }}><Chevron size={16} color="#5C6370" /></span>
    </div>
  );

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={anyChildOpen ? () => {} : handleClose} name="partner-detail-modal">
      <div role="dialog" aria-label="거래처 상세" style={{ width: tab === 'contacts' ? 1132 : 870, height: 820, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', position: 'relative' }}>
        <style>{REGISTER_CSS + GROUP_PICKER_CSS + DETAIL_CSS}</style>
        <div style={{ height: 72, padding: '24px 24px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 22, lineHeight: '32px', letterSpacing: ls, color: '#2E3238' }}>거래처 상세</p>
          <StatusBadge status={partner.status} small />
          <JoinBadge joined={partner.tTrucker} />
          <span style={{ flex: 1 }} />
          <button type="button" aria-label="닫기" onClick={handleClose} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ModalCloseIcon />
          </button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: `1px solid ${BORDER}`, margin: '0 24px', paddingLeft: 0, flexShrink: 0 }}>
          {tabs.map(t => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setTab(t.key)}
                style={{ position: 'relative', height: 44, padding: '0 12px', border: 'none', borderBottom: `2px solid ${on ? '#2E3238' : 'transparent'}`, marginBottom: -1, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 16, letterSpacing: ls, color: on ? '#2E3238' : '#5C6370', whiteSpace: 'nowrap' }}
              >
                {t.label}
                {t.count !== undefined && <TabCount n={t.count} />}
                {t.dot && <span aria-label="새로 공유됨" style={{ position: 'absolute', top: 8, right: 2, width: 6, height: 6, borderRadius: 3, background: '#DD2222' }} />}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px' }}>
          {tab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailSectionTitle actions={<SmallButton onClick={() => setEditTarget('company')}>수정</SmallButton>}>회사 정보</DetailSectionTitle>
                <InfoTable>
                  <InfoRow>
                    <InfoLabel label="사업자명" /><InfoValue><Ellipsis>{partner.bizName}</Ellipsis></InfoValue>
                    <InfoLabel label="사업자등록번호" /><InfoValue><Ellipsis>{partner.bizNumber}</Ellipsis></InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="업태" /><InfoValue>{partner.bizType && <Ellipsis>{partner.bizType}</Ellipsis>}</InfoValue>
                    <InfoLabel label="종목" /><InfoValue>{partner.bizItem && <Ellipsis>{partner.bizItem}</Ellipsis>}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="사업장 주소" /><InfoValue wrap>{[partner.address, partner.addressDetail].filter(Boolean).join(', ')}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="거래처 유형" /><InfoValue><Ellipsis>{partner.partnerType}</Ellipsis></InfoValue>
                    <InfoLabel label="거래상태" />
                    <InfoValue>
                      <Ellipsis>{STATUS_BADGE[partner.status].label}</Ellipsis>
                      {partner.status === '거래중지' && partner.statusReason && <span style={{ color: '#767D8A', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`(${partner.statusReason})`}</span>}
                    </InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="세금계산서 이메일" /><InfoValue>{partner.taxEmail && <Ellipsis>{partner.taxEmail}</Ellipsis>}</InfoValue>
                    <InfoLabel label="팩스번호" /><InfoValue>{partner.fax && <Ellipsis>{partner.fax}</Ellipsis>}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="사업자등록증" />
                    <InfoValue>{licenseFiles.length > 0 && <span title={licenseFiles.join('\n')} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{licenseFiles.length > 1 ? `${licenseFiles[0]} 외 ${licenseFiles.length - 1}개` : licenseFiles[0]}</span>}</InfoValue>
                  </InfoRow>
                </InfoTable>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailSectionTitle actions={<SmallButton onClick={() => setEditTarget('ceo')}>수정</SmallButton>}>대표자 정보</DetailSectionTitle>
                <InfoTable>
                  <InfoRow>
                    <InfoLabel label="이름" /><InfoValue>{partner.ceoName && <Ellipsis>{partner.ceoName}</Ellipsis>}</InfoValue>
                    <InfoLabel label="연락처" /><InfoValue>{partner.contact && <Ellipsis>{partner.contact}</Ellipsis>}</InfoValue>
                  </InfoRow>
                </InfoTable>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailSectionTitle actions={<SmallButton onClick={() => setEditTarget('extra')}>수정</SmallButton>}>부가 정보</DetailSectionTitle>
                <InfoTable>
                  <InfoRow>
                    <InfoLabel label="거래처 별칭" /><InfoValue>{partner.alias && partner.alias !== partner.bizName ? <Ellipsis>{partner.alias}</Ellipsis> : null}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="담당 업무그룹" />
                    {/* 대표 업무그룹은 뱃지와 함께 맨 앞에 노출 */}
                    <InfoValue>{assignedNames.length > 0 && <><RepresentativeBadge /><Ellipsis>{assignedNames.join(', ')}</Ellipsis></>}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="거래처 운영 메모" /><InfoValue wrap>{partner.memo}</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel label="거래처 정산 메모" /><InfoValue wrap>{partner.settleMemo}</InfoValue>
                  </InfoRow>
                </InfoTable>
              </div>
            </div>
          )}

          {tab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={tabDescStyle}>정산스케줄을 이용하시면 거래처별 결제방식이나 정산주기 등 정산 규칙을 미리 지정할 수 있어요.</p>
              <div><ModalButton h={32} size={14} px={10} onClick={() => setScheduleEdit({ schedule: null })}>정산스케줄 추가</ModalButton></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schedules.map((s, i) => (
                  <ScheduleAccordion
                    key={s.id}
                    schedule={s}
                    open={openScheduleIds.has(s.id)}
                    onToggle={() => toggleSchedule(s.id)}
                    partner={partner}
                    groups={ourGroups}
                    pendingGroupId={pending.scheduleGroup[s.id]}
                    onGroupChange={v => setPendingPart('scheduleGroup', s.id, v, s.groupId || ourGroups.find(g => g.isDefault)?.id || '')}
                    onEdit={() => setScheduleEdit({ schedule: s })}
                    onRemove={() => setScheduleDelete(s)}
                    canRemove={i > 0}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={tabDescStyle}>정산 담당 직원의 이메일로 거래명세서와 세금계산서 발행 내역을 보내요.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ModalButton h={36} size={15} px={12} onClick={addContact}>담당자 추가</ModalButton>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex' }}>
                      <select
                        value={contactSearchType}
                        onChange={e => setContactSearchType(e.target.value as ContactSearchType)}
                        style={{ height: 36, minWidth: 79, padding: '0 30px 0 10px', border: `1px solid ${BORDER}`, borderRadius: '4px 0 0 4px', marginRight: -1, boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', background: `${selArrow} no-repeat right 10px center, #FFFFFF`, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', outline: 'none' }}
                      >
                        {CONTACT_SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        value={contactKeyword}
                        onChange={e => setContactKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setContactQuery({ type: contactSearchType, keyword: contactKeyword }); }}
                        placeholder="검색어를 입력하세요."
                        className="pm-search-input"
                        style={{ width: 198, height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: '0 4px 4px 0', boxSizing: 'border-box', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', outline: 'none' }}
                      />
                    </div>
                    <ModalButton h={36} size={15} px={12} onClick={() => setContactQuery({ type: contactSearchType, keyword: contactKeyword })}>검색</ModalButton>
                  </div>
                </div>
                <div role="table" style={{ display: 'grid', gridTemplateColumns: CONTACT_COLS, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>
                  {['번호', '직원명', '직책/직함', '휴대전화번호', '팩스', '이메일', '담당 업무', '정산스케줄', ''].map((h, i) => (
                    <div key={h + i} role="columnheader" style={{ ...contactTh, justifyContent: i === 0 ? 'center' : 'flex-start' }}>{h}</div>
                  ))}
                  {contactRows.map((c, idx) => {
                    const editing = contactEdit?.row.id === c.id;
                    const row = editing ? contactEdit!.row : c;
                    const scheduleId = schedules.some(s => s.id === row.scheduleId) ? row.scheduleId! : firstScheduleId;
                    return editing ? (
                      <div key={c.id} role="row" style={{ display: 'contents' }}>
                        <div style={{ ...contactTd, justifyContent: 'center' }}>{idx + 1}</div>
                        <div style={{ ...contactTd, flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                          <input className="pmd-in" value={row.name} placeholder="이름" autoFocus onChange={e => setContactField('name', e.target.value)} />
                          <input className="pmd-in" value={row.department} placeholder="소속" onChange={e => setContactField('department', e.target.value)} />
                        </div>
                        <div style={contactTd}><input className="pmd-in" style={{ width: '100%' }} value={row.title ?? ''} placeholder="직책/직함" onChange={e => setContactField('title', e.target.value)} /></div>
                        <div style={contactTd}><input className="pmd-in" style={{ width: '100%' }} value={row.phone} placeholder="010-0000-0000" inputMode="tel" onChange={e => setContactField('phone', formatPhone(e.target.value))} /></div>
                        <div style={contactTd}><input className="pmd-in" style={{ width: '100%' }} value={row.fax} placeholder="팩스" inputMode="tel" onChange={e => setContactField('fax', formatPhone(e.target.value))} /></div>
                        <div style={contactTd}><input className="pmd-in" style={{ width: '100%' }} value={row.email} placeholder="이메일" inputMode="email" onChange={e => setContactField('email', e.target.value)} /></div>
                        <div style={contactTd}><input className="pmd-in" style={{ width: '100%' }} value={row.memo} placeholder="담당 업무" onChange={e => setContactField('memo', e.target.value)} /></div>
                        <div style={contactTd}>{scheduleSelect(scheduleId, v => setContactField('scheduleId', v))}</div>
                        <div style={{ ...contactTd, gap: 6, justifyContent: 'center' }}>
                          <SmallButton primary onClick={saveContact}>저장</SmallButton>
                          <SmallButton onClick={() => setContactEdit(null)}>취소</SmallButton>
                        </div>
                      </div>
                    ) : (
                      <div key={c.id} role="row" style={{ display: 'contents' }}>
                        <div style={{ ...contactTd, justifyContent: 'center' }}>{idx + 1}</div>
                        <div style={{ ...contactTd, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 0 }}>
                          <span style={{ fontFamily: ffSemiBold, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.name}</span>
                          {c.department && <span style={{ fontSize: 12, color: '#767D8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.department}</span>}
                        </div>
                        <div style={contactTd}><Ellipsis>{c.title || '-'}</Ellipsis></div>
                        <div style={contactTd}><Ellipsis>{c.phone || '-'}</Ellipsis></div>
                        <div style={contactTd}><Ellipsis>{c.fax || '-'}</Ellipsis></div>
                        <div style={contactTd} title={c.email}><Ellipsis>{c.email || '-'}</Ellipsis></div>
                        <div style={contactTd} title={c.memo}><Ellipsis>{c.memo || '-'}</Ellipsis></div>
                        <div style={contactTd}>{scheduleSelect(scheduleId, v => commit({ ...partner, contacts: contacts.map(x => x.id === c.id ? { ...x, scheduleId: v } : x) }))}</div>
                        <div style={{ ...contactTd, gap: 6, justifyContent: 'center' }}>
                          <SmallButton onClick={() => { if (contactEdit) { showToast('수정 중인 직원 정보를 먼저 저장해 주세요.', 'error'); return; } setContactEdit({ row: { ...c }, isNew: false }); }}>수정</SmallButton>
                          <SmallButton onClick={() => setContactDelete(c)}>삭제</SmallButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {contactRows.length === 0 && (
                  <div style={{ height: 120, marginTop: -12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 15, color: '#9197A1', border: `1px solid ${BORDER}`, borderTop: 'none' }}>{contactQ ? '검색 결과가 없습니다.' : '등록된 직원이 없습니다.'}</div>
                )}
              </div>
            </div>
          )}

          {tab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={tabDescStyle}>첨부 서류를 관리하세요.</p>
              {DOC_ITEMS.map(item => (
                <DocDropField
                  key={item.key}
                  label={item.label}
                  files={docFiles(item.key)}
                  max={item.max}
                  onChange={files => setPendingPart('docs', item.key, files, partnerDocs(partner, item.key))}
                  onToast={showToast}
                />
              ))}
            </div>
          )}

          {tab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={tabDescStyle}>이 거래처와 자주 운행하는 차량과 노선을 등록해 두면 배차할 때 참고할 수 있어요.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailSectionTitle actions={<SmallButton onClick={() => setVehicles([...vehicles, { id: genId('mv'), ton: '', carType: '', count: 1 }])}>차량 추가</SmallButton>}>주력 차량</DetailSectionTitle>
                <div role="table" style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 108px', borderTop: `1px solid ${BORDER}` }}>
                  {['번호', '톤수', '차량', '대수', ''].map((h, i) => <div key={h + i} role="columnheader" style={{ ...gridTh, justifyContent: i === 0 ? 'center' : 'flex-start' }}>{h}</div>)}
                  {vehicles.map((v, idx) => (
                    <div key={v.id} role="row" style={{ display: 'contents' }}>
                      <div style={{ ...gridTd, justifyContent: 'center' }}>{idx + 1}</div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}` }}><CellSelect value={v.ton} options={TON_OPTIONS} placeholder="톤수 선택" onChange={ton => patchVehicle(v.id, { ton })} /></div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}` }}><CellSelect value={v.carType} options={CAR_TYPE_OPTIONS} placeholder="차량 선택" onChange={carType => patchVehicle(v.id, { carType })} /></div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}`, gap: 2 }}>
                        <input className="pmd-in" aria-label="대수" value={String(v.count)} inputMode="numeric" onChange={e => patchVehicle(v.id, { count: Math.min(Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0, 999) })} style={{ border: 'none', padding: 0, width: `${Math.max(String(v.count).length, 1) + 0.5}ch`, height: 22 }} />
                        <span>대</span>
                      </div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}`, justifyContent: 'center' }}><SmallButton onClick={() => setVehicles(vehicles.filter(x => x.id !== v.id))}>삭제</SmallButton></div>
                    </div>
                  ))}
                </div>
                {vehicles.length === 0 && <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 14, color: '#9197A1', borderBottom: `1px solid ${BORDER}` }}>등록된 주력 차량이 없습니다.</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DetailSectionTitle actions={<SmallButton onClick={() => setRoutes([...routes, { id: genId('mr'), from: '', to: '', memo: '' }])}>노선추가</SmallButton>}>주력 노선</DetailSectionTitle>
                <div role="table" style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr 108px', borderTop: `1px solid ${BORDER}` }}>
                  {['번호', '출발 지역', '도착 지역', '메모', ''].map((h, i) => <div key={h + i} role="columnheader" style={{ ...gridTh, justifyContent: i === 0 ? 'center' : 'flex-start' }}>{h}</div>)}
                  {routes.map((r, idx) => (
                    <div key={r.id} role="row" style={{ display: 'contents' }}>
                      <div style={{ ...gridTd, justifyContent: 'center' }}>{idx + 1}</div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}` }}><CellSelect value={r.from} options={HUB_OPTIONS} placeholder="출발 지역 선택" onChange={from => patchRoute(r.id, { from })} /></div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}` }}><CellSelect value={r.to} options={HUB_OPTIONS} placeholder="도착 지역 선택" onChange={to => patchRoute(r.id, { to })} /></div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}` }}><input className="pmd-in" aria-label="메모" value={r.memo} placeholder="메모 입력" onChange={e => patchRoute(r.id, { memo: e.target.value.slice(0, 50) })} style={{ border: 'none', padding: 0, width: '100%', height: 22 }} /></div>
                      <div style={{ ...gridTd, borderLeft: `1px solid ${BORDER}`, justifyContent: 'center' }}><SmallButton onClick={() => setRoutes(routes.filter(x => x.id !== r.id))}>삭제</SmallButton></div>
                    </div>
                  ))}
                </div>
                {routes.length === 0 && <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 14, color: '#9197A1', borderBottom: `1px solid ${BORDER}` }}>등록된 주력 노선이 없습니다.</div>}
              </div>
            </div>
          )}

          {tab === 'shared' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {newShared.length > 0 && (
                <div style={{ background: '#F5F9FF', borderRadius: 6, padding: '14px 16px' }}>
                  <p style={{ margin: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238' }}>{`${partner.alias}가 공유그룹 ${newShared.length}개를 새로 공유했어요`}</p>
                  <p style={{ margin: '2px 0 0', fontFamily: ff, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#5C6370' }}>오더를 등록할 수 있도록 기본스케줄을 임시로 연결했어요. 각 업무그룹에 맞는 정산스케줄을 확인하고 변경해 주세요.</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <DetailSectionTitle>거래처 공유그룹별 설정</DetailSectionTitle>
                  <p style={{ ...tabDescStyle, marginTop: 2 }}>거래처가 공유한 업무그룹별로 정산스케줄을 선택해 주세요.</p>
                </div>
                <div role="table" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', borderTop: `1px solid ${BORDER}` }}>
                  {['공유그룹', '정산스케줄', '조건'].map(h => <div key={h} role="columnheader" style={gridTh}>{h}</div>)}
                  {groupMappings.map((g, idx) => {
                    const scheduleId = pending.sharedSchedule[idx] ?? g.scheduleId;
                    const s = schedules.find(x => x.id === scheduleId);
                    const rowBg = g.isNew ? '#FFFBE6' : undefined;
                    return (
                      <div key={g.groupName + idx} role="row" style={{ display: 'contents' }}>
                        <div style={{ ...gridTd, background: rowBg, gap: 4 }}>
                          {g.isNew && <span aria-label="새로 공유됨" style={{ color: '#DD2222', flexShrink: 0 }}>*</span>}
                          <Ellipsis>{g.groupName}</Ellipsis>
                        </div>
                        <div style={{ ...gridTd, background: rowBg, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>{scheduleSelect(scheduleId, v => setPendingPart('sharedSchedule', idx, v, g.scheduleId))}</div>
                        <div style={{ ...gridTd, background: rowBg }}><Ellipsis>{s ? scheduleSummary(s) : '-'}</Ellipsis></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 88, padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <ModalButton ghost h={48} size={18} px={20} onClick={handleClose}>닫기</ModalButton>
          {/* 직원정보는 행 단위로 바로 저장되어 이 탭의 변경분은 없지만, 피그마대로 [수정]은 그대로 노출 */}
          <ModalButton primary h={48} size={18} px={20} disabled={isPendingEmpty(pending)} onClick={savePending}>수정</ModalButton>
        </div>
        {toast && <Toast message={toast.message} tone={toast.tone} onClose={hideToast} />}
      </div>

      {editTarget === 'company' && (
        <CompanyEditModal partner={partner} onClose={() => setEditTarget(null)} onSubmit={patch => { patchPartner(patch); setEditTarget(null); showToast('기본 정보를 수정했습니다.'); }} />
      )}
      {editTarget === 'ceo' && (
        <CeoEditModal partner={partner} onClose={() => setEditTarget(null)} onSubmit={patch => { patchPartner(patch); setEditTarget(null); showToast('대표자 정보를 수정했습니다.'); }} />
      )}
      {editTarget === 'extra' && (
        <ExtraEditModal partner={partner} groups={ourGroups} onClose={() => setEditTarget(null)} onSubmit={patch => { patchPartner(patch); setEditTarget(null); showToast('부가 정보를 수정했습니다.'); }} />
      )}
      {scheduleEdit && (
        <ScheduleEditModal schedule={scheduleEdit.schedule} partner={partner} groups={ourGroups} onClose={() => setScheduleEdit(null)} onSubmit={submitSchedule} />
      )}
      {contactDelete && (
        <ConfirmDialog
          title={`${contactDelete.name} 담당자를 삭제하시겠어요?`}
          description="삭제한 담당자에게는 거래명세서와 세금계산서 발행 내역이 더 이상 발송되지 않습니다."
          confirmLabel="삭제"
          onCancel={() => setContactDelete(null)}
          onConfirm={() => { commit({ ...partner, contacts: contacts.filter(c => c.id !== contactDelete.id) }); setContactDelete(null); showToast('담당자를 삭제했습니다.', 'error'); }}
        />
      )}
      {confirmDiscard && (
        <ConfirmDialog
          title="수정을 그만하시겠어요?"
          description="[수정]을 누르지 않은 변경 내용은 저장되지 않습니다."
          confirmLabel="그만하기"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => { setConfirmDiscard(false); closeNow(); }}
        />
      )}
      {scheduleDelete && (
        <ConfirmDialog
          title={`${scheduleDelete.name}을 삭제하시겠어요?`}
          description="삭제한 정산스케줄은 되돌릴 수 없어요. 이 스케줄을 쓰던 공유그룹과 직원은 기본 스케줄로 바뀝니다."
          confirmLabel="삭제"
          onCancel={() => setScheduleDelete(null)}
          onConfirm={() => removeSchedule(scheduleDelete.id)}
        />
      )}
    </ModalOverlay>
  );
}

// ─── 화면 ────────────────────────────────────────────────────────────────────

export default function GeoraecheoManagement() {
  const [partners, setPartnersState] = useState<TradePartner[]>(() => getPartners());
  useEffect(() => subscribePartners(() => setPartnersState(getPartners())), []);
  const [searchType, setSearchType] = useState<SearchType>('거래처별칭');
  const [keyword, setKeyword] = useState('');
  const [appliedType, setAppliedType] = useState<SearchType>('거래처별칭');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [detailTarget, setDetailTarget] = useState<TradePartner | null>(null);
  // 필터는 다중 선택 — 한 필터 안에서는 or, 필터끼리는 and
  const [typeTab, setTypeTab] = useState<TypeTab>('전체');
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // '정상' | '거래중지'
  const [joinFilter, setJoinFilter] = useState<string[]>([]);     // 'Y' | 'N'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [listToast, setListToast] = useState('');
  useEffect(() => {
    if (!listToast) return;
    const t = setTimeout(() => setListToast(''), 2600);
    return () => clearTimeout(t);
  }, [listToast]);

  const handleSearch = () => {
    setAppliedType(searchType);
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  const filtered = partners.filter(p => {
    if (appliedKeyword !== '') {
      const kw = appliedKeyword.toLowerCase();
      const targets = appliedType === '거래처별칭' ? [p.alias] : appliedType === '사업자명' ? [p.bizName] : (p.contacts || []).map(c => c.name);
      if (!targets.some(t => (t || '').toLowerCase().includes(kw))) return false;
    }
    if (typeTab !== '전체' && p.partnerType !== typeTab) return false;
    if (statusFilter.length && !statusFilter.includes(p.status)) return false;
    if (joinFilter.length && !joinFilter.includes(p.tTrucker ? 'Y' : 'N')) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <style>{LIST_CSS}</style>
      <SharedLnb activeTabIndex={6} />
      <div data-name="partner-management" style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 24px 0 32px' }}>
          <Header onRegisterClick={() => setShowRegister(true)} />
          <TypeTabs
            value={typeTab}
            onChange={t => { setTypeTab(t); setPage(1); }}
            counts={{ 전체: partners.length, 화주사: partners.filter(p => p.partnerType === '화주사').length, 협력사: partners.filter(p => p.partnerType === '협력사').length }}
          />
          <SearchBar
            searchType={searchType} setSearchType={setSearchType}
            keyword={keyword} setKeyword={setKeyword}
            onSearch={handleSearch}
            status={statusFilter} setStatus={v => { setStatusFilter(v); setPage(1); }}
            join={joinFilter} setJoin={v => { setJoinFilter(v); setPage(1); }}
          />
          <PartnerTable
            rows={rows}
            onRowClick={setDetailTarget}
            empty={partners.length === 0 ? (
              <div style={{ height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <EmptySearchIcon />
                <span style={{ fontFamily: ff, fontSize: 15, color: '#767D8A', letterSpacing: ls }}>거래 중인 거래처가 없습니다.</span>
                <ModalButton h={36} size={15} px={12} onClick={() => setShowRegister(true)}>거래처 등록하기</ModalButton>
              </div>
            ) : undefined}
          />
        </div>
        <Pagination total={filtered.length} page={currentPage} setPage={setPage} size={pageSize} setSize={setPageSize} />
      </div>

      {showRegister && (
        <GeoraecheoRegisterModal
          onClose={() => setShowRegister(false)}
          onRegister={p => { addPartner(p); setDetailTarget(p); setListToast('거래처등록이 완료되었습니다.'); }}
        />
      )}
      {detailTarget && (
        <GeoraecheoDetailModal
          partner={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSave={updatePartner}
        />
      )}
      {listToast && <Toast message={listToast} onClose={() => setListToast('')} fixed />}
    </div>
  );
}
