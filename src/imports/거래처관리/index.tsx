import { useState, useEffect, useLayoutEffect, useRef } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type TradeStatus, type PartnerType, type SettleSchedule, type PartnerContact, type SharedGroupMapping, type TradePartner, type BizRecord, type PartnerDocKey,
  MOCK_BIZ_REGISTRY, makeSchedule, genId,
  getPartners, addPartner, updatePartner, subscribePartners, removePartner,
} from "../shared/geoRaecheoStore";
import { type WorkGroup, getGroups, subscribeCompany, getSharedPartnerIds, setSharedPartnerIds, updateGroup } from "../shared/companyStore";

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

// 피그마 개편 2 (953:131059) 열 너비
const COL_WIDTHS = { status: 150, type: 150, alias: 372, bizNumber: 150, join: 150, share: 150, registeredAt: 150 };

// 거래상태 표시 라벨 — 데이터상 '정상'/'거래중지'를 화면에선 '거래중'/'거래중지'로 노출
const STATUS_BADGE: Record<TradeStatus, { label: string; bg: string; color: string }> = {
  정상: { label: '거래중', bg: '#E0F5E6', color: '#15993A' },
  거래중지: { label: '거래중지', bg: '#FCE9E9', color: '#DD2222' },
};
const STOPPED_TOOLTIP = '거래중지 상태인 거래처에는 배차요청 불가합니다.';

type FilterOption = { v: string; l: string };
const STATUS_FILTER_OPTIONS: FilterOption[] = [{ v: '정상', l: '거래중' }, { v: '거래중지', l: '거래 중지' }];
const JOIN_FILTER_OPTIONS: FilterOption[] = [{ v: 'Y', l: '가입' }, { v: 'N', l: '미가입' }];
const TYPE_FILTER_OPTIONS: FilterOption[] = [{ v: '화주사', l: '화주사' }, { v: '협력사', l: '운송사' }];
// 화면 표시용 유형 이름 — 데이터 값 '협력사'는 다른 화면(정산 장부 등)과 공유하므로 그대로 두고 표시만 '운송사'
const partnerTypeLabel = (t: PartnerType) => t === '협력사' ? '운송사' : t;
const SHARE_FILTER_OPTIONS: FilterOption[] = ['서로 공유함', '공유 함', '공유 받음', '공유 안 함'].map(v => ({ v, l: v }));

// 업무그룹 공유 여부 — 가입 거래처만 해당. 우리가 공유하는지(함: 회사 > 업무그룹 관리의 거래처 공유 설정)와
// 상대가 공유해 준 그룹이 있는지(받음)를 합쳐 보여줌
function shareLabel(p: TradePartner): string {
  if (!p.tTrucker) return '-';
  const mine = getSharedPartnerIds().includes(p.id);
  const theirs = (p.sharedGroups?.length ?? 0) > 0;
  if (mine && theirs) return '서로 공유함';
  if (mine) return '공유 함';
  if (theirs) return '공유 받음';
  return '공유 안 함';
}
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

function Header() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 72, marginTop: 36, flexShrink: 0 }}>
      <span style={{ fontFamily: ffBold, fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: ls, color: '#000000' }}>거래처 관리</span>
      <span style={{ fontFamily: ff, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#5C6370' }}>
        우리 회사가 운송서비스를 판매하는 화주사 혹은 운송서비스를 이용하는 운송사를 등록하고 관리할 수 있습니다.
      </span>
    </div>
  );
}

type SearchType = '거래처별칭' | '사업자명' | '담당자명';

function SearchBar({ onRegisterClick, searchType, setSearchType, keyword, setKeyword, onSearch, status, setStatus, type, setType, join, setJoin, share, setShare }: {
  onRegisterClick: () => void;
  type: string[];
  setType: (v: string[]) => void;
  share: string[];
  setShare: (v: string[]) => void;
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexShrink: 0, flexWrap: 'wrap' }}>
      <button
        onClick={onRegisterClick}
        style={{ height: 36, padding: '0 12px', background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: ls, whiteSpace: 'nowrap' }}
      >
        거래처 등록
      </button>
      <div style={{ width: 1, height: 20, background: BORDER, flexShrink: 0 }} />
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
        <FilterChip label="거래처 유형" options={TYPE_FILTER_OPTIONS} value={type} onChange={setType} />
        <FilterChip label="시스템 가입 여부" options={JOIN_FILTER_OPTIONS} value={join} onChange={setJoin} />
        <FilterChip label="업무그룹 공유 여부" options={SHARE_FILTER_OPTIONS} value={share} onChange={setShare} />
      </div>
    </div>
  );
}

function Th({ label, width, flex, info }: { label: string; width?: number; flex?: boolean; info?: string }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : '0 0 auto', minWidth: flex ? 200 : undefined, height: 40, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
      {info && (
        <span title={info} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 26, flexShrink: 0, cursor: 'help' }}>
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
      <div style={{ minWidth: 1630 }}>
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2 }}>
          <Th label="거래 상태" width={COL_WIDTHS.status} />
          <Th label="거래처 유형" width={COL_WIDTHS.type} />
          <Th label="거래처 별칭" width={COL_WIDTHS.alias} />
          <Th label="사업자등록번호" width={COL_WIDTHS.bizNumber} />
          <Th label="사업장 주소" flex />
          <Th label="시스템 가입 여부" width={COL_WIDTHS.join} info="T 트럭커 운송관리시스템 가입 여부" />
          <Th label="업무그룹 공유 여부" width={COL_WIDTHS.share} info="가입 거래처와 서로 업무그룹을 공유하는지 여부" />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} className="pm-row" style={{ display: 'flex', cursor: 'pointer', background: '#FFFFFF' }}>
            <Td width={COL_WIDTHS.status} align="center" visible><StatusBadge status={row.status} /></Td>
            <Td width={COL_WIDTHS.type}>{partnerTypeLabel(row.partnerType)}</Td>
            <Td width={COL_WIDTHS.alias} bold>{row.alias}</Td>
            <Td width={COL_WIDTHS.bizNumber} align="center">{row.bizNumber}</Td>
            <Td flex>{[row.address, row.addressDetail].filter(Boolean).join(' ') || '-'}</Td>
            <Td width={COL_WIDTHS.join}>{row.tTrucker ? '가입' : '미가입'}</Td>
            <Td width={COL_WIDTHS.share}>{shareLabel(row)}</Td>
            {/* 등록일시는 피그마처럼 날짜와 시간을 함께 노출 */}
            <Td width={COL_WIDTHS.registeredAt} align="center">{String(row.registeredAt || '')}</Td>
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

// 파일 첨부 — pdf/doc/jpg/jpeg/png, 파일당 10MB (서류정보 탭)
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

function RemoveIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" fill="#9197A1" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// 체크박스 (목록 필터 칩에서 사용)
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

// 대표 업무그룹 딱지 (등록 모달 업무그룹 박스)
function RepresentativeBadge({ short }: { short?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 4px', borderRadius: 2, background: '#E6EFFF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#005FFF', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {short ? '대표' : '대표 업무그룹'}
    </span>
  );
}

// ─── 거래처 등록 모달 ────────────────────────────────────────────────────────

// 등록 모달 > 거래처 관계 설정 — 화주사 / 운송사(데이터상 협력사) 카드형 라디오
const RELATION_OPTIONS: { v: PartnerType; l: string; desc: string }[] = [
  { v: '화주사', l: '화주사', desc: '우리 회사에 오더를 맡겨요' },
  { v: '협력사', l: '운송사', desc: '오더를 맡기기도 하고, 받기도 해요' },
];

function RadioDot({ on }: { on: boolean }) {
  return on ? (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="#005FFF" />
      <circle cx="10" cy="10" r="3.5" fill="#FFFFFF" />
    </svg>
  ) : (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="7.35" fill="#FFFFFF" stroke="#ADB1B9" strokeWidth="1.3" />
    </svg>
  );
}

function StarIcon({ on }: { on: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path d="M10 2.6l2.25 4.7 5.1.65-3.75 3.55.95 5.05L10 14.1l-4.55 2.45.95-5.05L2.65 7.95l5.1-.65L10 2.6z" fill={on ? '#005FFF' : 'none'} stroke={on ? '#005FFF' : '#ADB1B9'} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.3" stroke="#767D8A" strokeWidth="1.2" />
      <path d="M6.3 6.3a1.75 1.75 0 013.4.55c0 1.15-1.7 1.4-1.7 2.4" stroke="#767D8A" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="11.1" r=".7" fill="#767D8A" />
    </svg>
  );
}

// 방향 태그 (우리 회사 → 거래처 / 거래처 → 우리 회사)
function DirectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 6px', borderRadius: 2, background: '#E6EFFF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#005FFF', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function QuestionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#2E3238' }}>{title}</p>
      <p style={{ margin: 0, fontFamily: ff, fontSize: 13, lineHeight: '20px', letterSpacing: ls, color: '#767D8A', whiteSpace: 'pre-line' }}>{desc}</p>
    </div>
  );
}

// 선택한 업무그룹 박스 — 검색창에서 그룹을 찾아 추가하고, 목록의 (x)로 뺀다.
// withMain이면 별(★)로 대표 업무그룹을 하나 정하고, 대표 업무그룹은 뺄 수 없다.
function GroupSelectBox({ groups, value, onChange, withMain, mainId, onMainChange, height }: {
  groups: WorkGroup[];
  value: string[];
  onChange: (ids: string[]) => void;
  withMain?: boolean;
  mainId?: string;
  onMainChange?: (id: string) => void;
  height?: number;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const defaultId = groups.find(g => g.isDefault)?.id ?? '';
  const groupName = (id: string) => groups.find(g => g.id === id)?.name ?? id;
  // 기본그룹 → 추가 순으로 노출. 대표를 바꿔도 행 순서는 그대로 두고 별과 대표 딱지만 옮김
  const effectiveMain = withMain ? (value.includes(mainId ?? '') ? mainId! : value[0] ?? '') : '';
  const ordered = withMain ? [...value.filter(id => id === defaultId), ...value.filter(id => id !== defaultId)] : value;
  const candidates = groups.filter(g => !value.includes(g.id) && g.name.toLowerCase().includes(q.trim().toLowerCase()));

  const add = (id: string) => {
    const next = [...value, id];
    onChange(next);
    if (withMain && !next.includes(mainId ?? '')) onMainChange?.(next[0]);
    setQ('');
    setOpen(false);
  };
  const remove = (id: string) => {
    const next = value.filter(x => x !== id);
    onChange(next);
    if (withMain && id === effectiveMain) onMainChange?.(next.includes(defaultId) ? defaultId : next[0] ?? '');
  };

  return (
    <div data-name="group-select-box" style={{ border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', flexDirection: 'column', height, boxSizing: 'border-box', background: '#FFFFFF' }}>
      <div style={{ height: 44, flexShrink: 0, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>
          선택한 업무그룹 <span style={{ color: '#005FFF' }}>{value.length}</span>
        </span>
        {withMain && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: ff, fontSize: 13, lineHeight: '20px', letterSpacing: ls, color: '#5C6370', whiteSpace: 'nowrap' }}>
            <HelpIcon />대표 업무그룹은 하나만 정할 수 있습니다.
          </span>
        )}
      </div>
      <div style={{ padding: 8, paddingBottom: 0, position: 'relative', flexShrink: 0 }}>
        <div className="pmr-field" style={{ height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, boxSizing: 'border-box' }}>
          <SearchIcon />
          <input
            className="pmr-input"
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="업무그룹 검색"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238' }}
          />
        </div>
        {open && (
          <div data-name="group-search-dropdown" style={{ ...suggestBoxStyle, left: 8, right: 8, top: 48, maxHeight: 37 * 5 + 8, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ padding: '8px 10px', fontFamily: ff, fontSize: 14, color: '#9197A1', letterSpacing: ls }}>{groups.length === value.length ? '모든 업무그룹을 선택했어요.' : '검색 결과가 없습니다.'}</div>
            ) : candidates.map(g => (
              <div key={g.id} className="pmr-sug" onMouseDown={() => add(g.id)} style={{ height: 37, padding: '0 10px', borderRadius: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }}>
                <Highlight text={g.name} q={q.trim()} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pm-table-scroll" style={{ flex: height ? 1 : undefined, minHeight: 0, maxHeight: height ? undefined : 40 * 5 + 8, overflowY: 'auto', padding: '4px 0' }}>
        {ordered.length === 0 && (
          <div style={{ padding: '10px 12px', fontFamily: ff, fontSize: 14, color: '#9197A1', letterSpacing: ls }}>검색해서 업무그룹을 추가해 주세요.</div>
        )}
        {ordered.map(id => {
          const isMain = withMain && id === effectiveMain;
          // 대표 업무그룹만 뺄 수 없음(항상 하나 남음) — 대표를 빼려면 먼저 다른 그룹을 대표로 지정. 기본그룹도 대표가 아니면 뺄 수 있음
          const removable = !isMain;
          return (
            <div key={id} style={{ height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {withMain && (
                <button type="button" aria-label={isMain ? '대표 업무그룹' : `${groupName(id)} 대표 업무그룹으로 지정`} title={isMain ? '대표 업무그룹' : '대표 업무그룹으로 지정'} onClick={() => onMainChange?.(id)} style={{ border: 'none', background: 'none', padding: 0, cursor: isMain ? 'default' : 'pointer', display: 'flex' }}>
                  <StarIcon on={isMain} />
                </button>
              )}
              <span style={{ minWidth: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName(id)}</span>
              {isMain && <RepresentativeBadge short />}
              <span style={{ flex: 1 }} />
              {removable && (
                <button type="button" aria-label={`${groupName(id)} 선택 해제`} onClick={() => remove(id)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  <RemoveIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 피그마 개편 2 (1086:145698) — 왼쪽: 사업자 정보·기본 정보 / 오른쪽: 거래처 관계 설정과 업무그룹 지정
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
  // 우리 회사 → 거래처 (운송사일 때만): 업무그룹 공유 여부, 이 거래처에 배차할 수 있는 업무그룹
  const [shareGroups, setShareGroups] = useState<'Y' | 'N'>('N');
  const [dispatchGroupIds, setDispatchGroupIds] = useState<string[]>(defaultGroupId ? [defaultGroupId] : []);
  // 거래처 → 우리 회사: 이 거래처의 오더를 담당하는 업무그룹(대표 1개)
  const [mainGroupId, setMainGroupId] = useState(defaultGroupId);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(defaultGroupId ? [defaultGroupId] : []);
  const [suggest, setSuggest] = useState<'name' | 'number' | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, showToast, hideToast] = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);
  const carrier = partnerType === '협력사';

  const registeredNumbers = new Set(getPartners().map(p => p.bizNumber));
  const dirty = [bizName, bizNumber, bizType, bizItem, address, addressDetail, taxEmail, ceoName, contact, fax, alias].some(v => v.trim() !== '')
    || partnerType !== '화주사' || shareGroups !== 'N'
    || assignedGroupIds.length !== (defaultGroupId ? 1 : 0) || dispatchGroupIds.length !== (defaultGroupId ? 1 : 0);
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
    const id = Date.now();
    const main = assignedGroupIds.includes(mainGroupId) ? mainGroupId : assignedGroupIds[0] ?? '';
    // 운송사면 공유 설정과 배차 가능 업무그룹(업무그룹의 이용 가능한 운송사)을 회사 설정에 반영
    if (carrier) {
      if (shareGroups === 'Y') setSharedPartnerIds([...getSharedPartnerIds(), id]);
      ourGroups.filter(g => dispatchGroupIds.includes(g.id)).forEach(g => updateGroup(g.id, { carrierIds: [...g.carrierIds, id] }));
    }
    onRegister({
      id,
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
      memo: '',
      registeredAt: nowStamp(),
      tTrucker: false,
      sharedGroups: [],
      settleSchedules: [{ ...makeSchedule('기본스케줄', id % 1000), groupId: main }],
      contacts: [],
      mainGroupId: main,
      assignedGroupIds,
    });
    onClose();
  };

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={requestClose} name="partner-register-modal">
      <div role="dialog" aria-label="거래처 등록" style={{ width: 1393, height: 1281, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
        <style>{REGISTER_CSS + DETAIL_CSS + LIST_CSS}</style>
        <ModalHeader title="거래처 등록" onClose={requestClose} />
        <div className="pm-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px 24px 20px', display: 'flex', alignItems: 'stretch', gap: 32 }}>
          {/* 왼쪽 — 사업자 정보 / 기본 정보 */}
          <div style={{ width: 640, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 40 }}>
            <FormSection title="사업자 정보">
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
              <FormRow>
                <FormField label="업태"><TextField value={bizType} onChange={setBizType} placeholder="업태 입력" /></FormField>
                <FormField label="종목"><TextField value={bizItem} onChange={setBizItem} placeholder="종목 입력" /></FormField>
              </FormRow>
              <FormRow>
                <FormField label="사업장 주소"><AddressField value={address} onChange={setAddress} /></FormField>
                <FormField label="상세 주소" hideLabel><TextField value={addressDetail} onChange={setAddressDetail} placeholder="상세 주소 입력" /></FormField>
              </FormRow>
              <FormRow>
                <FormField label="대표자명"><TextField value={ceoName} onChange={setCeoName} placeholder="대표자명 입력" /></FormField>
                <FormField label="대표자 연락처"><TextField value={contact} onChange={v => setContact(formatPhone(v))} placeholder="대표자 연락처 입력" inputMode="tel" /></FormField>
              </FormRow>
            </FormSection>

            <Divider />

            <FormSection title="기본 정보">
              <FormField label="거래처 별칭"><TextField value={alias} onChange={setAlias} placeholder="거래처 별칭 입력" /></FormField>
              <FormRow>
                <FormField label="세금계산서 이메일">
                  <TextField value={taxEmail} onChange={setTaxEmail} placeholder="세금계산서 이메일 입력" inputMode="email" />
                  <FieldError>{taxEmail.trim() !== '' && !isValidEmail(taxEmail.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : ''}</FieldError>
                </FormField>
                <FormField label="팩스번호"><TextField value={fax} onChange={v => setFax(formatPhone(v))} placeholder="팩스번호 입력" inputMode="tel" /></FormField>
              </FormRow>
            </FormSection>
          </div>

          <div style={{ width: 1, background: BORDER, flexShrink: 0 }} />

          {/* 오른쪽 — 거래처 관계 설정 */}
          <div style={{ width: 640, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
            <FormSection title="거래처 관계 설정">
              <div role="radiogroup" aria-label="거래처 관계" style={{ display: 'flex', gap: 8, marginTop: -4 }}>
                {RELATION_OPTIONS.map(o => {
                  const on = partnerType === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPartnerType(o.v)}
                      style={{ flex: '1 0 0', minWidth: 0, height: 66, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box', border: `1px solid ${on ? '#669FFF' : BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <RadioDot on={on} />
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238' }}>{o.l}</span>
                        <span style={{ fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{o.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormSection>

            {carrier && (
              <div data-name="our-to-partner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <DirectionTag>우리 회사 → 거래처</DirectionTag>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                  <QuestionTitle title="이 운송사에 내 업무그룹을 공유할까요?" desc={'업무그룹을 공유하면 거래처가 우리 회사 업무그룹에 맞춰 정산 조건을\n설정 할 수 있어요.'} />
                  <div style={{ width: 168, flexShrink: 0 }}>
                    <SegmentField<'Y' | 'N'> label="업무그룹 공유 여부" value={shareGroups} options={[{ v: 'Y', l: '네' }, { v: 'N', l: '아니오' }]} onChange={setShareGroups} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <QuestionTitle title="이 거래처에 배차할 수 있는 업무그룹을 선택해 주세요." desc="선택한 업무그룹에서만 이 거래처에 배차할 수 있어요." />
                </div>
                <GroupSelectBox groups={ourGroups} value={dispatchGroupIds} onChange={setDispatchGroupIds} />
              </div>
            )}

            <div data-name="partner-to-our" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DirectionTag>거래처 → 우리 회사</DirectionTag>
              <QuestionTitle title="이 거래처의 오더를 담당하는 업무그룹을 선택해 주세요." desc="선택한 업무그룹만 오더를 조회할 수 있어요." />
              <GroupSelectBox groups={ourGroups} value={assignedGroupIds} onChange={setAssignedGroupIds} withMain mainId={mainGroupId} onMainChange={setMainGroupId} height={360} />
            </div>
          </div>
        </div>
        <div style={{ height: 88, padding: '20px 24px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
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

const DETAIL_CSS = ".pm-contact-row:hover>div{background:#F9FAFB}.pmd-in{height:30px;border:1px solid #E3E5E9;border-radius:4px;padding:0 8px;box-sizing:border-box;font-family:'Pretendard GOV:Regular';font-size:15px;letter-spacing:-0.02em;color:#2E3238;background:#FFFFFF;outline:none;min-width:0}.pmd-in:focus{border-color:#005FFF}.pmd-in::placeholder{color:#9197A1}.pmd-acc:hover{background:#EEF0F2!important}.pmd-sel{appearance:none;border:none;background:transparent;cursor:pointer;outline:none}.pmd-add:hover{background:#F6F7F8!important}";

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
    <div style={{ width: 130, flexShrink: 0, background: '#F6F7F8', padding: '0 4px 0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 2 }}>
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

const DAY_OPTIONS: FilterOption[] = Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}일` }));
const RECEIPT_SEGMENTS: { v: string; l: string }[] = [{ v: '원본/사진 필수', l: '원본/사진 필수' }, { v: '사진 필수', l: '사진 필수' }, { v: '필요 없음', l: '필요 없음' }];

// ─── 상세 > 수정 팝업 공용 틀 ────────────────────────────────────────────────

// 수정된 내용이 있고 유효성 검사를 모두 통과했을 때만 CTA 활성
function EditModal({ title, width = 400, canSubmit, submitLabel = '수정', onClose, onSubmit, toast, onToastClose, leftAction, children }: {
  title: string;
  width?: number;
  canSubmit: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: () => void;
  toast?: ToastState;
  onToastClose?: () => void;
  leftAction?: React.ReactNode; // 하단 왼쪽 버튼 (예: 삭제)
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
          {leftAction}
          {leftAction && <span style={{ flex: 1 }} />}
          <ModalButton ghost h={48} size={16} px={16} onClick={onClose}>닫기</ModalButton>
          <ModalButton primary h={48} size={16} px={16} disabled={!canSubmit} onClick={onSubmit}>{submitLabel}</ModalButton>
        </div>
        {toast && onToastClose && <Toast message={toast.message} tone={toast.tone} onClose={onToastClose} />}
      </div>
    </ModalOverlay>
  );
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ─── 상세 > 수정 팝업 (피그마 개편 2) ───────────────────────────────────────

// 사업자 정보 수정 — 사업자명·사업자등록번호·업태·종목·사업장 주소·대표자
function BizInfoEditModal({ partner, onClose, onSubmit }: { partner: TradePartner; onClose: () => void; onSubmit: (patch: Partial<TradePartner>) => void }) {
  const initial = {
    bizName: partner.bizName || '', bizNumber: partner.bizNumber || '', bizType: partner.bizType || '', bizItem: partner.bizItem || '',
    address: partner.address || '', addressDetail: partner.addressDetail || '', ceoName: partner.ceoName || '', contact: partner.contact || '',
  };
  const [d, setD] = useState(initial);
  const set = (k: keyof typeof initial) => (v: string) => setD(prev => ({ ...prev, [k]: v }));
  const nameError = d.bizName.trim() === '' ? '사업자명을 입력해 주세요.' : '';
  const numberError = !isValidBizNumber(d.bizNumber) ? '사업자등록번호를 입력해 주세요.' : '';
  const canSubmit = !sameJson(d, initial) && !nameError && !numberError;
  return (
    <EditModal title="사업자 정보 수정" width={560} canSubmit={canSubmit} onClose={onClose} onSubmit={() => onSubmit({ ...d, bizName: d.bizName.trim(), ceoName: d.ceoName.trim() })}>
      <FormRow>
        <FormField label="사업자명" required>
          <TextField value={d.bizName} onChange={set('bizName')} placeholder="사업자명 입력" required />
          <FieldError>{nameError}</FieldError>
        </FormField>
        <FormField label="사업자등록번호" required>
          <TextField value={d.bizNumber} onChange={v => set('bizNumber')(formatBizNumber(v))} placeholder="사업자등록번호 입력" required inputMode="numeric" />
          <FieldError>{numberError}</FieldError>
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="업태"><TextField value={d.bizType} onChange={set('bizType')} placeholder="업태 입력" /></FormField>
        <FormField label="종목"><TextField value={d.bizItem} onChange={set('bizItem')} placeholder="종목 입력" /></FormField>
      </FormRow>
      <FormField label="사업장 주소">
        <AddressField value={d.address} onChange={set('address')} />
        <TextField value={d.addressDetail} onChange={set('addressDetail')} placeholder="상세 주소 입력" />
      </FormField>
      <FormRow>
        <FormField label="대표자명"><TextField value={d.ceoName} onChange={set('ceoName')} placeholder="대표자명 입력" /></FormField>
        <FormField label="대표자 연락처"><TextField value={d.contact} onChange={v => set('contact')(formatPhone(v))} placeholder="대표자 연락처 입력" inputMode="tel" /></FormField>
      </FormRow>
    </EditModal>
  );
}

// 기본 정보 수정 — 거래처 별칭·거래상태·세금계산서 이메일·팩스번호·운영 메모·정산 메모
function BasicInfoEditModal({ partner, onClose, onSubmit }: { partner: TradePartner; onClose: () => void; onSubmit: (patch: Partial<TradePartner>) => void }) {
  const initial = {
    alias: partner.alias || '', status: partner.status, statusReason: partner.statusReason || '', taxEmail: partner.taxEmail || '', fax: partner.fax || '',
    memo: partner.memo || '', settleMemo: partner.settleMemo || '',
  };
  const [d, setD] = useState(initial);
  const set = <K extends keyof typeof initial>(k: K) => (v: typeof initial[K]) => setD(prev => ({ ...prev, [k]: v }));
  const emailError = d.taxEmail.trim() !== '' && !isValidEmail(d.taxEmail.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : '';
  const canSubmit = !sameJson(d, initial) && !emailError;
  return (
    <EditModal title="기본 정보 수정" width={560} canSubmit={canSubmit} onClose={onClose} onSubmit={() => onSubmit({
      alias: d.alias.trim() || partner.bizName, status: d.status, statusReason: d.status === '거래중지' ? d.statusReason.trim() : '',
      taxEmail: d.taxEmail.trim(), fax: d.fax, memo: d.memo.trim(), settleMemo: d.settleMemo.trim(),
    })}>
      <FormField label="거래처 별칭"><TextField value={d.alias} onChange={set('alias')} placeholder="거래처 별칭 입력" /></FormField>
      <FormField label="거래상태">
        <SegmentField label="거래상태" value={d.status} options={STATUS_SEGMENTS} onChange={set('status')} />
        {d.status === '거래중지' && <TextField value={d.statusReason} onChange={set('statusReason')} placeholder="사유를 입력해 주세요" />}
      </FormField>
      <FormRow>
        <FormField label="세금계산서 이메일">
          <TextField value={d.taxEmail} onChange={set('taxEmail')} placeholder="세금계산서 이메일 입력" inputMode="email" />
          <FieldError>{emailError}</FieldError>
        </FormField>
        <FormField label="팩스번호"><TextField value={d.fax} onChange={v => set('fax')(formatPhone(v))} placeholder="팩스번호 입력" inputMode="tel" /></FormField>
      </FormRow>
      <FormField label="운영 메모"><TextArea value={d.memo} onChange={set('memo')} placeholder="거래 시 참고할 사항을 입력해 주세요. (내부 직원에게만 공개)" /></FormField>
      <FormField label="정산 메모"><TextArea value={d.settleMemo} onChange={set('settleMemo')} placeholder="정산 시 참고할 사항을 입력해 주세요. (내부 직원에게만 공개)" /></FormField>
    </EditModal>
  );
}

// 거래처 담당자 추가/수정 (피그마 504:292070) — 한 명씩 입력. 표의 행을 누르면 같은 폼이 수정 모드로 열림
function ContactFormModal({ contact, schedules, defaultScheduleId, onClose, onSubmit, onDelete }: {
  contact: PartnerContact | null; // null이면 추가
  schedules: SettleSchedule[];
  defaultScheduleId: string;
  onClose: () => void;
  onSubmit: (c: PartnerContact) => void;
  onDelete?: () => void;
}) {
  const initial = {
    name: contact?.name ?? '', phone: contact?.phone ?? '', title: contact?.title ?? '', email: contact?.email ?? '',
    fax: contact?.fax ?? '', memo: contact?.memo ?? '',
    scheduleId: contact?.scheduleId && schedules.some(x => x.id === contact.scheduleId) ? contact.scheduleId : defaultScheduleId,
  };
  const [d, setD] = useState(initial);
  const set = (k: keyof typeof initial) => (v: string) => setD(prev => ({ ...prev, [k]: v }));
  // 이메일은 새로 입력하거나 바꾼 값만 형식 검사
  const emailError = d.email.trim() !== '' && d.email !== initial.email && !isValidEmail(d.email.trim()) ? '올바른 이메일 양식으로 입력해 주세요.' : '';
  const valid = d.name.trim() !== '' && d.phone.trim() !== '' && !emailError;
  const canSubmit = valid && (contact === null || !sameJson(d, initial));
  const submit = () => onSubmit({
    id: contact?.id ?? genId('ct'), department: contact?.department ?? '', note: contact?.note,
    ...d, name: d.name.trim(), title: d.title.trim(), email: d.email.trim(), memo: d.memo.trim(),
  });
  return (
    <EditModal
      title={contact ? '거래처 담당자 수정' : '거래처 담당자 추가'}
      width={416}
      canSubmit={canSubmit}
      submitLabel={contact ? '수정' : '추가'}
      onClose={onClose}
      onSubmit={submit}
      leftAction={contact && onDelete ? <ModalButton h={48} size={16} px={16} onClick={onDelete}>삭제</ModalButton> : undefined}
    >
      <FormField label="직원명" required><TextField value={d.name} onChange={v => set('name')(v.slice(0, 20))} placeholder="이름 입력" required /></FormField>
      <FormField label="휴대전화번호" required><TextField value={d.phone} onChange={v => set('phone')(formatPhone(v))} placeholder="연락처 입력" required inputMode="tel" /></FormField>
      <FormField label="직함/직책"><TextField value={d.title} onChange={set('title')} placeholder="직함/직책 입력" /></FormField>
      <FormField label="이메일">
        <TextField value={d.email} onChange={set('email')} placeholder="이메일 입력" inputMode="email" />
        <FieldError>{emailError}</FieldError>
      </FormField>
      <FormField label="팩스번호"><TextField value={d.fax} onChange={v => set('fax')(formatPhone(v))} placeholder="팩스번호 입력" inputMode="tel" /></FormField>
      <FormField label="담당 업무"><TextField value={d.memo} onChange={set('memo')} placeholder="담당 업무 입력" /></FormField>
      <FormField label="청구 기준"><SelectField value={d.scheduleId} options={schedules.map(x => ({ v: x.id, l: x.name }))} onChange={set('scheduleId')} /></FormField>
    </EditModal>
  );
}

// ─── 청구 기준 카드 (아코디언) ───────────────────────────────────────────────

// 요약: 결제수단 · 정산기간 · 담당자 N명
function periodLabel(start: number, end: number) {
  if (start === 1 && end === 31) return '매월 1일~말일';
  return start > end ? `매월 ${start}일~익월 ${end}일` : `매월 ${start}일~${end}일`;
}

const SCHEDULE_CONTACT_COLS = '50px 180px 160px 160px 160px 180px 160px minmax(120px, 1fr)';

function ContactNameCell({ c }: { c: PartnerContact }) {
  return (
    <>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.name}</span>
      {c.department && <span style={{ fontSize: 12, color: '#767D8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.department}</span>}
    </>
  );
}

function ScheduleCard({ schedule, open, onToggle, contacts, onPatch, onRename, onRemove, canRemove, onChangeContacts, autoEdit }: {
  schedule: SettleSchedule;
  open: boolean;
  onToggle: () => void;
  contacts: PartnerContact[];
  onPatch: (patch: Partial<SettleSchedule>) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  onChangeContacts: () => void;
  autoEdit?: boolean; // 방금 추가한 청구 기준이면 이름 입력부터 시작
}) {
  const [menu, setMenu] = useState(false);
  // 이름은 제목 옆 연필(또는 ⋮ > 이름 변경)로 바로 수정 — Enter/바깥 클릭 저장, Esc 취소
  const [editingName, setEditingName] = useState(!!autoEdit);
  const [nameDraft, setNameDraft] = useState(schedule.name);
  const startEdit = () => { setNameDraft(schedule.name); setEditingName(true); };
  const finishEdit = (save: boolean) => {
    const v = nameDraft.trim();
    if (save && v !== '' && v !== schedule.name) onRename(v);
    setEditingName(false);
  };
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);
  const start = schedule.settlePeriodStart ?? 1;
  const end = schedule.settlePeriodEnd ?? 31;
  const emailError = (schedule.taxEmail || '').trim() !== '' && !isValidEmail((schedule.taxEmail || '').trim());
  const periodSelect = (value: number, onChange: (n: number) => void, prefix: string) => (
    <div className="pmr-field" style={{ ...fieldBoxStyle(true), position: 'relative', padding: '0 12px', gap: 8 }}>
      <span style={{ ...fieldTextStyle, color: '#454B55', flexShrink: 0 }}>{prefix}</span>
      <select className="pmd-sel" value={String(value)} onChange={e => onChange(Number(e.target.value))} style={{ ...fieldTextStyle, flex: 1, minWidth: 0, textAlign: 'right', direction: 'rtl', height: '100%' }}>
        {DAY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
  const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', height: 36, padding: '0 10px', border: 'none', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' };

  return (
    <div data-name="schedule-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF' }}>
      <div
        className="pmd-acc"
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ height: 54, background: '#F6F7F8', borderRadius: open ? '4px 4px 0 0' : 4, borderBottom: open ? `1px solid ${BORDER}` : 'none', padding: '0 12px 0 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none' }}><Chevron size={16} color="#5C6370" /></span>
        {editingName ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex' }} onClick={e => e.stopPropagation()}>
            <input
              className="pmd-in"
              aria-label="청구 기준 이름"
              autoFocus
              onFocus={e => e.target.select()}
              value={nameDraft}
              maxLength={20}
              placeholder="청구 기준 이름 입력"
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') finishEdit(true); if (e.key === 'Escape') { e.stopPropagation(); finishEdit(false); } }}
              onBlur={() => finishEdit(true)}
              style={{ width: 320, height: 34, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 16 }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span data-name="schedule-name" style={{ minWidth: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schedule.name}</span>
            <button type="button" aria-label={`${schedule.name} 이름 수정`} title="이름 수정" onClick={e => { e.stopPropagation(); startEdit(); }} style={{ width: 26, height: 26, flexShrink: 0, border: 'none', background: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><path d="M10.6 2.9l2.5 2.5-7.6 7.6-3.1.6.6-3.1 7.6-7.6z" stroke="#767D8A" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
        <span style={{ fontFamily: ff, fontSize: 13, lineHeight: '19px', letterSpacing: ls, color: '#767D8A', whiteSpace: 'nowrap' }}>{`${schedule.payMeans || '현금'} · ${periodLabel(start, end)} · 담당자 ${contacts.length}명`}</span>
        <div ref={menuRef} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button type="button" aria-label={`${schedule.name} 메뉴`} onClick={() => setMenu(m => !m)} style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">{[3.5, 8, 12.5].map(cy => <circle key={cy} cx="8" cy={cy} r="1.1" fill="#767D8A" />)}</svg>
          </button>
          {menu && (
            <div style={{ position: 'absolute', right: 0, top: 32, zIndex: 20, minWidth: 120, padding: 4, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)' }}>
              <button type="button" className="pm-opt" style={menuItem} onClick={() => { setMenu(false); startEdit(); }}>이름 변경</button>
              {/* 첫 번째(기본) 청구 기준은 삭제할 수 없음 */}
              {canRemove && <button type="button" className="pm-opt" style={{ ...menuItem, color: '#DD2222' }} onClick={() => { setMenu(false); onRemove(); }}>삭제</button>}
            </div>
          )}
        </div>
      </div>
      {open && (
        <div style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <FormSection title="기본 정보">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 16px' }}>
              <FormField label="정산기간" required>
                <div style={{ display: 'flex', gap: 8 }}>
                  {periodSelect(start, n => onPatch({ settlePeriodStart: n }), '시작')}
                  {periodSelect(end, n => onPatch({ settlePeriodEnd: n }), start > end ? '익월 종료' : '종료')}
                </div>
              </FormField>
              <FormField label="세금계산서 이메일">
                <TextField value={schedule.taxEmail || ''} onChange={v => onPatch({ taxEmail: v })} placeholder="세금계산서 이메일 입력" inputMode="email" />
                <FieldError>{emailError ? '올바른 이메일 양식으로 입력해 주세요.' : ''}</FieldError>
              </FormField>
              <FormField label="수금예정일">
                <div className="pmr-field" style={{ ...fieldBoxStyle(false), gap: 8 }}>
                  <span style={{ ...fieldTextStyle, color: '#454B55', flex: 1 }}>수금예정일</span>
                  <input className="pmr-input" aria-label="수금예정일" value={String(schedule.collectDays ?? 30)} inputMode="numeric" onChange={e => onPatch({ collectDays: Math.min(Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0, 180) })} style={{ ...fieldTextStyle, width: 40, textAlign: 'right', border: 'none', outline: 'none', background: 'transparent', padding: 0 }} />
                  <span style={{ ...fieldTextStyle, flexShrink: 0 }}>일 후</span>
                </div>
              </FormField>
              <FormField label="인수증 기본설정"><SegmentField label="인수증 기본설정" value={schedule.receiptDefault || '원본/사진 필수'} options={RECEIPT_SEGMENTS} onChange={v => onPatch({ receiptDefault: v })} /></FormField>
              <FormField label="결제수단"><SelectField value={schedule.payMeans || '현금'} options={PAY_MEANS_OPTIONS} onChange={v => onPatch({ payMeans: v })} /></FormField>
              <FormField label="종사업자번호"><TextField value={schedule.subBizNumber || ''} onChange={v => onPatch({ subBizNumber: v.replace(/\D/g, '').slice(0, 4) })} placeholder="4자리 입력" inputMode="numeric" /></FormField>
            </div>
            <FormField label="정산메모"><TextField value={schedule.settleMemo || ''} onChange={v => onPatch({ settleMemo: v })} placeholder="정산메모" /></FormField>
          </FormSection>
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DetailSectionTitle actions={<SmallButton onClick={onChangeContacts}>변경</SmallButton>}>담당자 정보</DetailSectionTitle>
            <div role="table" style={{ display: 'grid', gridTemplateColumns: SCHEDULE_CONTACT_COLS, borderTop: `1px solid ${BORDER}` }}>
              {['번호', '직원명', '직급/직책', '휴대전화번호', '팩스', '이메일', '담당 업무', '메모'].map((h, i) => (
                <div key={h} role="columnheader" style={{ ...contactTh, borderRight: i === 7 ? 'none' : contactTh.borderRight, justifyContent: i === 0 ? 'center' : 'flex-start' }}>{h}</div>
              ))}
              {contacts.map((c, idx) => (
                <div key={c.id} role="row" style={{ display: 'contents' }}>
                  <div style={{ ...contactTd, justifyContent: 'center' }}>{idx + 1}</div>
                  <div style={{ ...contactTd, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}><ContactNameCell c={c} /></div>
                  <div style={contactTd}><Ellipsis>{c.title || '-'}</Ellipsis></div>
                  <div style={contactTd}><Ellipsis>{c.phone || '-'}</Ellipsis></div>
                  <div style={contactTd}><Ellipsis>{c.fax || '-'}</Ellipsis></div>
                  <div style={contactTd} title={c.email}><Ellipsis>{c.email || '-'}</Ellipsis></div>
                  <div style={contactTd} title={c.memo}><Ellipsis>{c.memo || '-'}</Ellipsis></div>
                  <div style={{ ...contactTd, borderRight: 'none' }} title={c.note}><Ellipsis>{c.note || '-'}</Ellipsis></div>
                </div>
              ))}
            </div>
            {contacts.length === 0 && <div style={{ height: 64, marginTop: -12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 14, color: '#9197A1', borderBottom: `1px solid ${BORDER}` }}>이 청구 기준을 쓰는 담당자가 없습니다.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 서류정보 탭 ─────────────────────────────────────────────────────────────

type DocKey = 'bizLicense' | PartnerDocKey;
const DOC_ITEMS: { key: DocKey; label: string; max: number; hint?: string }[] = [
  { key: 'bizLicense', label: '사업자등록증', max: 1 },
  { key: 'bankbook', label: '통장사본', max: 1 },
  { key: 'brokerLicense', label: '주선면허증', max: 1 },
  { key: 'transportLicense', label: '운송면허증', max: 1 },
  { key: 'contract', label: '계약서', max: 150 },
  { key: 'etc', label: '기타', max: 10, hint: '기타 서류는 최대 10개까지 첨부할 수 있어요. 파일을 이 영역으로 끌어다 놓아도 돼요.' },
];
const partnerDocs = (p: TradePartner, key: DocKey) => (key === 'bizLicense' ? p.bizLicenseFiles : p.documents?.[key]) || [];

// [파일 첨부하기] 또는 영역에 끌어다 놓기로 첨부. 모든 서류가 같은 모양이고, 첨부한 파일은 영역 안에 칩(확장자·파일명·✕)으로 나열
// 여러 개 첨부하는 서류(기타)는 라벨 옆에 개수(N/최대)와 아래 안내 문구를 보여줌 (피그마 1070:133313 UX)
function DocDropField({ label, files, max, hint, onChange, onToast }: { label: string; files: string[]; max: number; hint?: string; onChange: (files: string[]) => void; onToast: (msg: string, tone?: ToastTone) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const full = files.length >= max;
  const open = () => {
    if (full) { onToast(`${label}는 최대 ${max}개까지 첨부할 수 있어요.`, 'error'); return; }
    fileRef.current?.click();
  };
  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
    onToast('첨부된 파일이 삭제되었습니다.', 'error');
  };
  const ext = (name: string) => (name.split('.').pop() || '').toUpperCase();
  return (
    <div data-name="doc-field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238' }}>{label}</span>
        {hint && <span style={{ fontFamily: ff, fontSize: 13, lineHeight: '20px', letterSpacing: ls, color: full ? '#DD2222' : '#767D8A' }}>{`${files.length}/${max}`}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); acceptFiles(e.dataTransfer.files, files, max, onChange, onToast); }}
          style={{ flex: 1, minWidth: 0, minHeight: 44, padding: files.length ? 5 : 0, borderRadius: 4, border: `1px solid ${over ? '#669FFF' : BORDER}`, background: over ? '#F5F9FF' : '#F6F7F8', boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}
        >
          {files.length === 0 ? (
            <span style={{ padding: '0 12px', fontFamily: ff, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#767D8A' }}>파일을 이 곳으로 끌어오세요.</span>
          ) : files.map((name, i) => (
            <span key={name + i} data-name="file-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, maxWidth: 320, padding: '0 10px 0 12px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF' }}>
              <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 11, letterSpacing: '0.02em', color: '#767D8A', flexShrink: 0 }}>{ext(name)}</span>
              <span title={name} style={{ minWidth: 0, fontFamily: ff, fontSize: 14, lineHeight: '16px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <button type="button" aria-label={`${name} 삭제`} onClick={() => remove(i)} style={{ width: 16, height: 16, flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={10} height={10} viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#767D8A" strokeWidth="1.2" strokeLinecap="round" /></svg>
              </button>
            </span>
          ))}
        </div>
        <ModalButton h={44} size={16} px={12} onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: full ? 0.5 : 1, cursor: full ? 'default' : 'pointer' }}><ClipIcon />파일 첨부하기</ModalButton>
        <input ref={fileRef} type="file" multiple={max > 1} accept=".pdf,.doc,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { acceptFiles(e.target.files, files, max, onChange, onToast); e.target.value = ''; }} />
      </div>
      {hint && <span style={{ fontFamily: ff, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#9197A1' }}>{hint}</span>}
    </div>
  );
}

// ─── 거래처 상세 모달 ────────────────────────────────────────────────────────

type DetailTab = 'basic' | 'schedule' | 'contacts' | 'docs';

// 각 탭 상단 안내 문구
const tabDescStyle: React.CSSProperties = { margin: 0, fontFamily: ff, fontSize: 14, lineHeight: '22px', letterSpacing: ls, color: '#5C6370' };

// 하단 [수정]으로 한꺼번에 반영하는 변경분 — 거래처 관계 설정, 청구 기준 입력값, 서류
type DetailPending = { partnerType?: PartnerType; share?: 'Y' | 'N'; dispatch?: string[]; schedules: Record<string, SettleSchedule>; docs: Partial<Record<DocKey, string[]>> };
const EMPTY_PENDING: DetailPending = { schedules: {}, docs: {} };
const isPendingEmpty = (p: DetailPending) => p.partnerType === undefined && p.share === undefined && p.dispatch === undefined && Object.keys(p.schedules).length + Object.keys(p.docs).length === 0;

type EditTarget = 'biz' | 'basic' | null;

function TabCount({ n }: { n: number }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 4px', borderRadius: 2, background: '#EBEDEF', fontFamily: ff, fontSize: 12, color: '#5C6370' }}>{n}</span>;
}

// 표 헤더/셀
const gridTh: React.CSSProperties = { height: 40, padding: '0 8px', display: 'flex', alignItems: 'center', background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', boxSizing: 'border-box' };
const gridTd: React.CSSProperties = { minHeight: 44, padding: '6px 8px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, fontFamily: ff, fontSize: 15, color: '#2E3238', letterSpacing: ls, boxSizing: 'border-box', minWidth: 0, overflow: 'hidden' };

type ContactSearchType = '직원명' | '휴대전화번호' | '이메일';
const CONTACT_SEARCH_TYPES: ContactSearchType[] = ['직원명', '휴대전화번호', '이메일'];
const contactField = (c: PartnerContact, t: ContactSearchType) => t === '직원명' ? c.name : t === '휴대전화번호' ? c.phone : c.email;
// 거래처 직원 정보 탭 열: 번호·직원명·청구 기준·직급/직책·휴대전화번호·팩스·이메일·담당 업무
const CONTACT_COLS = '50px 186px 186px 170px 170px 170px 200px minmax(120px, 1fr)';
const contactTh: React.CSSProperties = { ...gridTh, borderRight: `1px solid ${BORDER}`, fontSize: 15 };
const contactTd: React.CSSProperties = { ...gridTd, minHeight: 48, borderRight: `1px solid ${BORDER}` };

// 검색 바 (직원명/휴대전화번호/이메일 + 검색어 + [검색] + 총 N건)
function ContactSearchBar({ type, setType, keyword, setKeyword, onSearch, total }: { type: ContactSearchType; setType: (t: ContactSearchType) => void; keyword: string; setKeyword: (v: string) => void; onSearch: () => void; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex' }}>
        <select
          value={type}
          onChange={e => setType(e.target.value as ContactSearchType)}
          style={{ height: 36, minWidth: 79, padding: '0 30px 0 10px', border: `1px solid ${BORDER}`, borderRadius: '4px 0 0 4px', marginRight: -1, boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', background: `${selArrow} no-repeat right 10px center, #FFFFFF`, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', outline: 'none' }}
        >
          {CONTACT_SEARCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
          placeholder="검색어를 입력해 주세요"
          className="pm-search-input"
          style={{ width: 198, height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: '0 4px 4px 0', boxSizing: 'border-box', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', outline: 'none' }}
        />
      </div>
      <ModalButton h={36} size={15} px={12} onClick={onSearch}>검색</ModalButton>
      <span style={{ marginLeft: 8, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{`총 ${total.toLocaleString()}건`}</span>
    </div>
  );
}

// 배차관리 > 단건등록, 통합장부에서도 연다
export function GeoraecheoDetailModal({ partner: initialPartner, onClose, onSave }: { partner: TradePartner; onClose: () => void; onSave: (p: TradePartner) => void }) {
  const [partner, setPartner] = useState<TradePartner>(initialPartner);
  const [ourGroups, setOurGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => setOurGroups(getGroups())), []);
  const [tab, setTab] = useState<DetailTab>('basic');
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [justAddedScheduleId, setJustAddedScheduleId] = useState<string | null>(null);
  // 탭을 옮겼다 돌아오면 방금 추가한 청구 기준도 이름 입력 상태로 다시 열지 않음
  useEffect(() => setJustAddedScheduleId(null), [tab]);
  const [scheduleDelete, setScheduleDelete] = useState<SettleSchedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 담당자 폼 — contact가 null이면 추가, 있으면 수정
  const [contactForm, setContactForm] = useState<{ contact: PartnerContact | null } | null>(null);
  const [contactDelete, setContactDelete] = useState<PartnerContact | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pending, setPending] = useState<DetailPending>(EMPTY_PENDING);
  const [openScheduleIds, setOpenScheduleIds] = useState<Set<string>>(() => new Set(initialPartner.settleSchedules?.[0] ? [initialPartner.settleSchedules[0].id] : []));
  // 청구 기준 탭 검색 / 직원 탭 검색
  const [schSearchType, setSchSearchType] = useState<ContactSearchType>('직원명');
  const [schKeyword, setSchKeyword] = useState('');
  const [schQuery, setSchQuery] = useState<{ type: ContactSearchType; keyword: string }>({ type: '직원명', keyword: '' });
  const [contactSearchType, setContactSearchType] = useState<ContactSearchType>('직원명');
  const [contactKeyword, setContactKeyword] = useState('');
  const [contactQuery, setContactQuery] = useState<{ type: ContactSearchType; keyword: string }>({ type: '직원명', keyword: '' });
  // 거래처가 공유한 업무그룹별 청구 기준 — 행마다 [저장]으로 바로 반영
  const [sharedDraft, setSharedDraft] = useState<Record<number, string>>({});
  // 이번에 [청구 기준 그룹 추가]로 만든 청구 기준 — 목록 맨 위에 최근 것부터 보여줌 (저장 순서와 기본 청구 기준은 그대로)
  const [addedScheduleIds, setAddedScheduleIds] = useState<string[]>([]);
  const [toast, showToast, hideToast] = useToast();

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);
  const scheduleListTopRef = useRef<HTMLParagraphElement>(null);

  const commit = (next: TradePartner) => {
    setPartner(next);
    onSave(next);
  };
  const patchPartner = (patch: Partial<TradePartner>) => commit({ ...partner, ...patch });

  // 새로 공유된 그룹 표시는 이번 진입에서만 보여주고, 닫을 때 '확인함'으로 처리
  const closeNow = () => {
    if ((partner.sharedGroups || []).some(g => g.isNew)) onSave({ ...partner, sharedGroups: partner.sharedGroups.map(({ isNew, ...g }) => g) });
    onClose();
  };
  // 하단 [수정]을 누르지 않은 변경분이 있으면 그만둘지 먼저 묻는다
  const handleClose = () => { if (isPendingEmpty(pending)) closeNow(); else setConfirmDiscard(true); };
  const anyChildOpen = editTarget !== null || contactForm !== null || contactDelete !== null || scheduleDelete !== null || confirmDelete || confirmDiscard;
  useEscapeKey(anyChildOpen ? () => {} : handleClose);

  // ── 거래처 관계 설정 (하단 [수정]으로 반영)
  const initialShare: 'Y' | 'N' = getSharedPartnerIds().includes(partner.id) ? 'Y' : 'N';
  const initialDispatch = ourGroups.filter(g => g.carrierIds.includes(partner.id)).map(g => g.id);
  const partnerType = pending.partnerType ?? partner.partnerType;
  const share = pending.share ?? initialShare;
  const dispatch = pending.dispatch ?? initialDispatch;
  const setPartnerTypeDraft = (v: PartnerType) => setPending(p => ({ ...p, partnerType: v === partner.partnerType ? undefined : v }));
  const setShareDraft = (v: 'Y' | 'N') => setPending(p => ({ ...p, share: v === initialShare ? undefined : v }));
  const setDispatchDraft = (ids: string[]) => setPending(p => ({ ...p, dispatch: sameJson([...ids].sort(), [...initialDispatch].sort()) ? undefined : ids }));

  // ── 청구 기준
  const savedSchedules = partner.settleSchedules || [];
  const schedules = savedSchedules.map(s => pending.schedules[s.id] ?? s);
  const firstScheduleId = savedSchedules[0]?.id ?? '';
  const patchScheduleDraft = (id: string, patch: Partial<SettleSchedule>) => setPending(p => {
    const orig = savedSchedules.find(s => s.id === id)!;
    const next = { ...(p.schedules[id] ?? orig), ...patch };
    const map = { ...p.schedules };
    if (sameJson(next, orig)) delete map[id]; else map[id] = next;
    return { ...p, schedules: map };
  });
  const addSchedule = () => {
    const s: SettleSchedule = { ...makeSchedule(`청구 기준 ${savedSchedules.length + 1}`, Date.now() % 1000), receiptDefault: '원본/사진 필수' };
    commit({ ...partner, settleSchedules: [...savedSchedules, s] });
    setOpenScheduleIds(prev => new Set([...prev, s.id]));
    setAddedScheduleIds(ids => [s.id, ...ids]);
    setJustAddedScheduleId(s.id);
    scheduleListTopRef.current?.scrollIntoView({ block: 'nearest' });
    showToast('청구 기준을 추가했습니다.');
  };
  // 삭제한 청구 기준을 쓰던 공유그룹/직원은 첫 번째 청구 기준으로 돌린다
  const removeSchedule = (id: string) => {
    const rest = savedSchedules.filter(s => s.id !== id);
    commit({
      ...partner,
      settleSchedules: rest,
      sharedGroups: (partner.sharedGroups || []).map(g => g.scheduleId === id ? { ...g, scheduleId: rest[0].id } : g),
      contacts: (partner.contacts || []).map(c => c.scheduleId === id ? { ...c, scheduleId: rest[0].id } : c),
    });
    setPending(p => { const map = { ...p.schedules }; delete map[id]; return { ...p, schedules: map }; });
    setScheduleDelete(null);
    showToast('청구 기준을 삭제했습니다.', 'error');
  };
  // 이름은 바로 저장 (하단 [수정]과 별개)
  const renameSchedule = (id: string, name: string) => {
    commit({ ...partner, settleSchedules: savedSchedules.map(s => s.id === id ? { ...s, name } : s) });
    setPending(p => p.schedules[id] ? { ...p, schedules: { ...p.schedules, [id]: { ...p.schedules[id], name } } } : p);
    showToast('청구 기준 이름을 변경했습니다.');
  };
  const toggleSchedule = (id: string) => setOpenScheduleIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── 직원
  const contacts = partner.contacts || [];
  const scheduleOf = (c: PartnerContact) => savedSchedules.some(s => s.id === c.scheduleId) ? c.scheduleId! : firstScheduleId;
  const contactsOf = (scheduleId: string) => contacts.filter(c => scheduleOf(c) === scheduleId);
  const matches = (c: PartnerContact, q: { type: ContactSearchType; keyword: string }) => contactField(c, q.type).includes(q.keyword.trim());
  const orderedSchedules = [
    ...addedScheduleIds.map(id => schedules.find(s => s.id === id)).filter((s): s is SettleSchedule => !!s),
    ...schedules.filter(s => !addedScheduleIds.includes(s.id)),
  ];
  const shownSchedules = schQuery.keyword.trim() ? orderedSchedules.filter(s => contactsOf(s.id).some(c => matches(c, schQuery))) : orderedSchedules;
  const shownContacts = contactQuery.keyword.trim() ? contacts.filter(c => matches(c, contactQuery)) : contacts;

  // ── 거래처가 공유한 업무그룹 — 미가입 거래처는 '기본그룹' 1개만
  const groupMappings: SharedGroupMapping[] = (partner.tTrucker && partner.sharedGroups?.length ? partner.sharedGroups : [{ groupName: '기본그룹', scheduleId: firstScheduleId }])
    .map(g => ({ ...g, scheduleId: savedSchedules.some(s => s.id === g.scheduleId) ? g.scheduleId : firstScheduleId }));
  const saveSharedRow = (idx: number) => {
    const v = sharedDraft[idx];
    if (v === undefined) return;
    commit({ ...partner, sharedGroups: groupMappings.map((g, i) => i === idx ? { ...g, scheduleId: v } : g) });
    setSharedDraft(d => { const n = { ...d }; delete n[idx]; return n; });
    showToast(`${groupMappings[idx].groupName}의 청구 기준을 저장했습니다.`);
  };

  // ── 서류
  const docFiles = (key: DocKey) => pending.docs[key] ?? partnerDocs(partner, key);
  const setDocDraft = (key: DocKey, files: string[]) => setPending(p => {
    const docs = { ...p.docs };
    if (sameJson(files, partnerDocs(partner, key))) delete docs[key]; else docs[key] = files;
    return { ...p, docs };
  });

  const savePending = () => {
    const bad = Object.values(pending.schedules).find(s => (s.taxEmail || '').trim() !== '' && !isValidEmail((s.taxEmail || '').trim()));
    if (bad) { setTab('schedule'); showToast(`${bad.name}의 세금계산서 이메일을 확인해 주세요.`, 'error'); return; }
    const docs = pending.docs;
    commit({
      ...partner,
      partnerType,
      settleSchedules: schedules.map(s => ({ ...s, taxEmail: (s.taxEmail || '').trim(), settleMemo: (s.settleMemo || '').trim() })),
      bizLicenseFiles: docs.bizLicense ?? partner.bizLicenseFiles,
      documents: { ...partner.documents, ...Object.fromEntries(Object.entries(docs).filter(([k]) => k !== 'bizLicense')) },
    });
    // 업무그룹 공유 여부 → 회사 > 업무그룹 관리의 거래처 공유 설정, 배차 가능 업무그룹 → 업무그룹의 이용 가능한 운송사
    if (pending.share !== undefined) {
      const ids = getSharedPartnerIds().filter(x => x !== partner.id);
      setSharedPartnerIds(pending.share === 'Y' ? [...ids, partner.id] : ids);
    }
    if (pending.dispatch !== undefined) {
      ourGroups.forEach(g => {
        const has = pending.dispatch!.includes(g.id);
        if (has !== g.carrierIds.includes(partner.id)) updateGroup(g.id, { carrierIds: has ? [...g.carrierIds, partner.id] : g.carrierIds.filter(x => x !== partner.id) });
      });
    }
    setPending(EMPTY_PENDING);
    showToast('거래처 정보를 수정했습니다.');
  };

  const deletePartner = () => {
    removePartner(partner.id);
    setSharedPartnerIds(getSharedPartnerIds().filter(x => x !== partner.id));
    ourGroups.filter(g => g.carrierIds.includes(partner.id)).forEach(g => updateGroup(g.id, { carrierIds: g.carrierIds.filter(x => x !== partner.id) }));
    setConfirmDelete(false);
    onClose();
  };

  const tabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: 'basic', label: '기본정보' },
    { key: 'schedule', label: '청구 기준', count: savedSchedules.length },
    { key: 'contacts', label: '거래처 직원 정보' },
    { key: 'docs', label: '서류정보' },
  ];

  const scheduleSelect = (value: string, onChange: (v: string) => void) => (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <select className="pmd-sel" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 30, paddingRight: 22, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', textOverflow: 'ellipsis' }}>
        {savedSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', display: 'flex' }}><Chevron size={16} color="#5C6370" /></span>
    </div>
  );

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={anyChildOpen ? () => {} : handleClose} name="partner-detail-modal">
      <div role="dialog" aria-label="거래처 상세" style={{ width: 1393, height: 1181, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', position: 'relative' }}>
        <style>{REGISTER_CSS + DETAIL_CSS + LIST_CSS}</style>
        <div style={{ height: 72, padding: '24px 24px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 22, lineHeight: '32px', letterSpacing: ls, color: '#2E3238' }}>거래처 상세</p>
          <StatusBadge status={partner.status} small />
          <JoinBadge joined={partner.tTrucker} />
          <span style={{ flex: 1 }} />
          <button type="button" aria-label="닫기" onClick={handleClose} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ModalCloseIcon />
          </button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, margin: '12px 24px 0', flexShrink: 0 }}>
          {tabs.map(t => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setTab(t.key)}
                style={{ position: 'relative', height: 48, padding: '0 12px', border: 'none', borderBottom: `2px solid ${on ? '#2E3238' : 'transparent'}`, marginBottom: -1, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 16, letterSpacing: ls, color: on ? '#2E3238' : '#5C6370', whiteSpace: 'nowrap' }}
              >
                {t.label}
                {t.count !== undefined && <TabCount n={t.count} />}
              </button>
            );
          })}
        </div>
        <div className="pm-table-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '24px 24px' }}>
          {tab === 'basic' && (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 32 }}>
              {/* 왼쪽 — 사업자 정보 / 기본 정보 */}
              <div style={{ width: 640, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <DetailSectionTitle actions={<SmallButton onClick={() => setEditTarget('biz')}>수정</SmallButton>}>사업자 정보</DetailSectionTitle>
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
                      <InfoLabel label="대표자명" /><InfoValue>{partner.ceoName && <Ellipsis>{partner.ceoName}</Ellipsis>}</InfoValue>
                      <InfoLabel label="대표자 연락처" /><InfoValue>{partner.contact && <Ellipsis>{partner.contact}</Ellipsis>}</InfoValue>
                    </InfoRow>
                  </InfoTable>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <DetailSectionTitle actions={<SmallButton onClick={() => setEditTarget('basic')}>수정</SmallButton>}>기본 정보</DetailSectionTitle>
                  <InfoTable>
                    <InfoRow>
                      <InfoLabel label="거래처 별칭" /><InfoValue>{partner.alias && <Ellipsis>{partner.alias}</Ellipsis>}</InfoValue>
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
                      <InfoLabel label="운영 메모" /><InfoValue wrap>{partner.memo}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <InfoLabel label="정산 메모" /><InfoValue wrap>{partner.settleMemo}</InfoValue>
                    </InfoRow>
                  </InfoTable>
                </div>
              </div>

              <div style={{ width: 1, background: BORDER, flexShrink: 0 }} />

              {/* 오른쪽 — 거래처 관계 설정 */}
              <div style={{ width: 640, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
                <FormSection title="거래처 관계 설정">
                  <div role="radiogroup" aria-label="거래처 관계" style={{ display: 'flex', gap: 8, marginTop: -4 }}>
                    {RELATION_OPTIONS.map(o => {
                      const on = partnerType === o.v;
                      return (
                        <button
                          key={o.v}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setPartnerTypeDraft(o.v)}
                          style={{ flex: '1 0 0', minWidth: 0, height: 66, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box', border: `1px solid ${on ? '#669FFF' : BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <RadioDot on={on} />
                          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238' }}>{o.l}</span>
                            <span style={{ fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{o.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FormSection>

                <div data-name="our-to-partner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <DirectionTag>우리 회사 → 거래처</DirectionTag>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                    <QuestionTitle title="이 운송사에 내 업무그룹을 공유할까요?" desc={'업무그룹을 공유하면 거래처가 우리 회사 업무그룹에 맞춰 정산 조건을\n설정 할 수 있어요.'} />
                    <div style={{ width: 168, flexShrink: 0 }}>
                      <SegmentField<'Y' | 'N'> label="업무그룹 공유 여부" value={share} options={[{ v: 'Y', l: '네' }, { v: 'N', l: '아니오' }]} onChange={setShareDraft} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <QuestionTitle title="이 거래처에 배차할 수 있는 업무그룹을 선택해 주세요." desc="선택한 업무그룹에서만 이 거래처에 배차할 수 있어요." />
                  </div>
                  <GroupSelectBox groups={ourGroups} value={dispatch} onChange={setDispatchDraft} />
                </div>

                <div data-name="partner-to-our" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <DirectionTag>거래처 → 우리 회사</DirectionTag>
                  <QuestionTitle title="거래처가 공유한 업무그룹별 청구 기준" desc={'이 거래처가 공유한 업무그룹으로 오더를 받으면, 여기서 정한 청구 기준이 배차 관리에 자동으로 채워져요.\n거래처가 공유한 업무그룹이 없으면 기본 청구 기준이 적용돼요.'} />
                  <div role="table" style={{ display: 'grid', gridTemplateColumns: '284px 1fr 70px', borderTop: `1px solid ${BORDER}` }}>
                    {['거래처의 업무그룹', '청구 기준 기본 설정', ''].map((h, i) => <div key={h + i} role="columnheader" style={{ ...gridTh, fontSize: 15, borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>{h}</div>)}
                    {groupMappings.map((g, idx) => {
                      const value = sharedDraft[idx] ?? g.scheduleId;
                      const changed = sharedDraft[idx] !== undefined;
                      const rowBg = g.isNew ? '#FFFBE6' : undefined;
                      return (
                        <div key={g.groupName + idx} role="row" style={{ display: 'contents' }}>
                          <div style={{ ...gridTd, background: rowBg, gap: 4, borderRight: `1px solid ${BORDER}` }}>
                            {g.isNew && <span aria-label="새로 공유됨" title="새로 공유된 업무그룹" style={{ color: '#DD2222', flexShrink: 0 }}>*</span>}
                            <Ellipsis>{g.groupName}</Ellipsis>
                          </div>
                          <div style={{ ...gridTd, background: rowBg, borderRight: `1px solid ${BORDER}` }}>{scheduleSelect(value, v => setSharedDraft(d => { const n = { ...d }; if (v === g.scheduleId) delete n[idx]; else n[idx] = v; return n; }))}</div>
                          <div style={{ ...gridTd, background: rowBg, justifyContent: 'center' }}>
                            <SmallButton primary={changed} onClick={() => saveSharedRow(idx)} style={{ opacity: changed ? 1 : 0.6, cursor: changed ? 'pointer' : 'default' }}>저장</SmallButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p ref={scheduleListTopRef} style={tabDescStyle}>청구 기준을 이용하시면 거래처별 정산 규칙을 미리 지정할 수 있어요.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ModalButton primary h={36} size={15} px={12} onClick={addSchedule}>청구 기준 그룹 추가</ModalButton>
                <ContactSearchBar type={schSearchType} setType={setSchSearchType} keyword={schKeyword} setKeyword={setSchKeyword} onSearch={() => setSchQuery({ type: schSearchType, keyword: schKeyword })} total={shownSchedules.length} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shownSchedules.map(s => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    open={openScheduleIds.has(s.id)}
                    onToggle={() => toggleSchedule(s.id)}
                    contacts={contactsOf(s.id)}
                    onPatch={patch => patchScheduleDraft(s.id, patch)}
                    onRename={name => renameSchedule(s.id, name)}
                    autoEdit={s.id === justAddedScheduleId}
                    onRemove={() => setScheduleDelete(s)}
                    canRemove={s.id !== firstScheduleId}
                    onChangeContacts={() => setTab('contacts')}
                  />
                ))}
                {shownSchedules.length === 0 && <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 15, color: '#9197A1' }}>검색 결과가 없습니다.</div>}
              </div>
            </div>
          )}

          {tab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={tabDescStyle}>직원마다 기본 청구 기준이 먼저 적용되고, 필요하면 다른 청구 기준으로 바꿀 수 있어요.<br />선택한 청구 기준의 거래명세서와 세금계산서 발행 내역은 해당 직원 이메일로 보내요.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ModalButton h={36} size={15} px={12} onClick={() => setContactForm({ contact: null })}>담당자 추가/변경</ModalButton>
                <ContactSearchBar type={contactSearchType} setType={setContactSearchType} keyword={contactKeyword} setKeyword={setContactKeyword} onSearch={() => setContactQuery({ type: contactSearchType, keyword: contactKeyword })} total={shownContacts.length} />
              </div>
              <div role="table" style={{ display: 'grid', gridTemplateColumns: CONTACT_COLS, borderTop: `1px solid ${BORDER}` }}>
                {['번호', '직원명', '청구 기준', '직급/직책', '휴대전화번호', '팩스', '이메일', '담당 업무'].map((h, i) => (
                  <div key={h} role="columnheader" style={{ ...contactTh, borderRight: i === 7 ? 'none' : contactTh.borderRight, justifyContent: i === 0 ? 'center' : 'flex-start' }}>{h}</div>
                ))}
                {shownContacts.map((c, idx) => (
                  <div key={c.id} role="row" data-name="contact-row" className="pm-contact-row" title="클릭하면 담당자 정보를 수정할 수 있어요" onClick={() => setContactForm({ contact: c })} style={{ display: 'contents', cursor: 'pointer' }}>
                    <div style={{ ...contactTd, justifyContent: 'center', cursor: 'pointer' }}>{idx + 1}</div>
                    <div style={{ ...contactTd, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', cursor: 'pointer' }}><ContactNameCell c={c} /></div>
                    {/* 청구 기준은 바로 저장 (행 클릭과 분리) */}
                    <div style={contactTd} onClick={e => e.stopPropagation()}>{scheduleSelect(scheduleOf(c), v => { commit({ ...partner, contacts: contacts.map(x => x.id === c.id ? { ...x, scheduleId: v } : x) }); showToast(`${c.name}의 청구 기준을 변경했습니다.`); })}</div>
                    <div style={{ ...contactTd, cursor: 'pointer' }}><Ellipsis>{c.title || '-'}</Ellipsis></div>
                    <div style={{ ...contactTd, cursor: 'pointer' }}><Ellipsis>{c.phone || '-'}</Ellipsis></div>
                    <div style={{ ...contactTd, cursor: 'pointer' }}><Ellipsis>{c.fax || '-'}</Ellipsis></div>
                    <div style={{ ...contactTd, cursor: 'pointer' }} title={c.email}><Ellipsis>{c.email || '-'}</Ellipsis></div>
                    <div style={{ ...contactTd, borderRight: 'none', cursor: 'pointer' }} title={c.memo}><Ellipsis>{c.memo || '-'}</Ellipsis></div>
                  </div>
                ))}
              </div>
              {shownContacts.length === 0 && (
                <div style={{ height: 120, marginTop: -12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontSize: 15, color: '#9197A1', borderBottom: `1px solid ${BORDER}` }}>{contactQuery.keyword.trim() ? '검색 결과가 없습니다.' : '등록된 직원이 없습니다.'}</div>
              )}
            </div>
          )}

          {tab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={tabDescStyle}>거래처 관련 서류를 첨부하고 관리할 수 있어요.</p>
              {DOC_ITEMS.map(item => (
                <DocDropField
                  key={item.key}
                  label={item.label}
                  files={docFiles(item.key)}
                  max={item.max}
                  hint={item.hint}
                  onChange={files => setDocDraft(item.key, files)}
                  onToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ height: 104, padding: '24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <ModalButton h={52} size={18} px={20} onClick={() => setConfirmDelete(true)}>거래처 삭제</ModalButton>
          <span style={{ flex: 1 }} />
          <ModalButton ghost h={52} size={18} px={20} onClick={handleClose}>닫기</ModalButton>
          <ModalButton primary h={52} size={18} px={20} disabled={isPendingEmpty(pending)} onClick={savePending}>수정</ModalButton>
        </div>
        {toast && <Toast message={toast.message} tone={toast.tone} onClose={hideToast} />}
      </div>

      {editTarget === 'biz' && (
        <BizInfoEditModal partner={partner} onClose={() => setEditTarget(null)} onSubmit={patch => { patchPartner(patch); setEditTarget(null); showToast('사업자 정보를 수정했습니다.'); }} />
      )}
      {editTarget === 'basic' && (
        <BasicInfoEditModal partner={partner} onClose={() => setEditTarget(null)} onSubmit={patch => { patchPartner(patch); setEditTarget(null); showToast('기본 정보를 수정했습니다.'); }} />
      )}
      {contactForm && (
        <ContactFormModal
          contact={contactForm.contact}
          schedules={savedSchedules}
          defaultScheduleId={firstScheduleId}
          onClose={() => setContactForm(null)}
          onDelete={contactForm.contact ? () => setContactDelete(contactForm.contact) : undefined}
          onSubmit={c => {
            const exists = contacts.some(x => x.id === c.id);
            patchPartner({ contacts: exists ? contacts.map(x => x.id === c.id ? c : x) : [...contacts, c] });
            setContactForm(null);
            showToast(exists ? '담당자 정보를 수정했습니다.' : '담당자를 추가했습니다.');
          }}
        />
      )}
      {contactDelete && (
        <ConfirmDialog
          title={`${contactDelete.name} 담당자를 삭제하시겠어요?`}
          description="삭제한 담당자에게는 거래명세서와 세금계산서 발행 내역이 더 이상 발송되지 않습니다."
          confirmLabel="삭제"
          onCancel={() => setContactDelete(null)}
          onConfirm={() => { patchPartner({ contacts: contacts.filter(c => c.id !== contactDelete.id) }); setContactDelete(null); setContactForm(null); showToast('담당자를 삭제했습니다.', 'error'); }}
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
          description="삭제한 청구 기준은 되돌릴 수 없어요. 이 청구 기준을 쓰던 공유그룹과 직원은 기본 청구 기준으로 바뀝니다."
          confirmLabel="삭제"
          onCancel={() => setScheduleDelete(null)}
          onConfirm={() => removeSchedule(scheduleDelete.id)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`${partner.alias} 거래처를 삭제하시겠어요?`}
          description="삭제한 거래처는 되돌릴 수 없어요. 업무그룹 공유와 배차 가능 업무그룹 설정에서도 함께 빠집니다."
          confirmLabel="삭제"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={deletePartner}
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
  const [typeFilter, setTypeFilter] = useState<string[]>([]);   // '화주사' | '협력사'
  const [shareFilter, setShareFilter] = useState<string[]>([]); // shareLabel 값
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
    if (typeFilter.length && !typeFilter.includes(p.partnerType)) return false;
    if (statusFilter.length && !statusFilter.includes(p.status)) return false;
    if (joinFilter.length && !joinFilter.includes(p.tTrucker ? 'Y' : 'N')) return false;
    if (shareFilter.length && !shareFilter.includes(shareLabel(p))) return false;
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
          <Header />
          <SearchBar
            onRegisterClick={() => setShowRegister(true)}
            searchType={searchType} setSearchType={setSearchType}
            keyword={keyword} setKeyword={setKeyword}
            onSearch={handleSearch}
            status={statusFilter} setStatus={v => { setStatusFilter(v); setPage(1); }}
            type={typeFilter} setType={v => { setTypeFilter(v); setPage(1); }}
            join={joinFilter} setJoin={v => { setJoinFilter(v); setPage(1); }}
            share={shareFilter} setShare={v => { setShareFilter(v); setPage(1); }}
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
