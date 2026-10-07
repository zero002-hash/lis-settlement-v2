import { useState, useEffect, useLayoutEffect, useRef } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type TradeStatus, type PartnerType, PARTNER_TYPES, type SettleSchedule, type PartnerContact, type SharedGroupMapping, type TradePartner, type BizRecord,
  MOCK_BIZ_REGISTRY, makeSchedule, genId,
  getPartners, addPartner, updatePartner, subscribePartners,
} from "../shared/geoRaecheoStore";
import { hasContractRate } from "../shared/contractRateStore";
import { type WorkGroup, getGroups, subscribeCompany } from "../shared/companyStore";

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

const LIST_CSS = '.pm-row:hover{background:#F9FAFB!important}.pm-search-input::placeholder{color:#767D8A}.pm-table-scroll::-webkit-scrollbar{width:10px;height:10px}.pm-table-scroll::-webkit-scrollbar-thumb{background:#C7CBD1;border-radius:10px;border:2px solid #FFFFFF}.pm-table-scroll::-webkit-scrollbar-track{background:#FFFFFF}';

const COL_WIDTHS = { status: 130, join: 150, alias: 300, bizNumber: 130, registeredAt: 130 };

// 거래상태 표시 라벨 — 데이터상 '정상'/'거래중지'를 화면에선 '거래중'/'배차금지'로 노출
const STATUS_BADGE: Record<TradeStatus, { label: string; bg: string; color: string }> = {
  정상: { label: '거래중', bg: '#E0F5E6', color: '#15993A' },
  거래중지: { label: '배차금지', bg: '#FCE9E9', color: '#DD2222' },
};

type FilterOption = { v: string; l: string };
const TYPE_FILTER_OPTIONS: FilterOption[] = [{ v: '', l: '전체' }, ...PARTNER_TYPES.map(t => ({ v: t, l: t }))];
const STATUS_FILTER_OPTIONS: FilterOption[] = [{ v: '', l: '전체' }, { v: '정상', l: '거래중' }, { v: '거래중지', l: '배차금지' }];
const JOIN_FILTER_OPTIONS: FilterOption[] = [{ v: '', l: '전체' }, { v: 'Y', l: '가입' }, { v: 'N', l: '미가입' }];
const PAGE_SIZE_OPTIONS = [200, 100, 50];

// 목록 상단 필터 칩 (선택 시 파란색 + 선택 개수 뱃지)
function FilterChip({ label, options, value, onChange }: { label: string; options: FilterOption[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const active = value !== '';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 32, padding: '6px 10px 6px 12px', border: 'none', borderRadius: 30, background: active ? '#F5F9FF' : '#F6F7F8', cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box' }}
      >
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: active ? '#005FFF' : '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}>{label}</span>
        {active ? (
          <div style={{ width: 16, height: 16, background: '#CCDFFF', borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 11, color: '#005FFF' }}>1</span>
          </div>
        ) : <Chevron size={12} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, minWidth: 140, padding: 4, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)', boxSizing: 'border-box' }}>
          {options.map(o => {
            const selected = o.v === value;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => { onChange(o.v); setOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', height: 36, padding: '0 10px', border: 'none', borderRadius: 4, background: selected ? '#F5F9FF' : 'transparent', cursor: 'pointer', fontFamily: selected ? ffSemiBold : ff, fontWeight: selected ? 600 : 400, fontSize: 15, color: selected ? '#005FFF' : '#2E3238', letterSpacing: ls }}
              >
                {o.l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginTop: 36, flexShrink: 0 }}>
      <span style={{ fontFamily: ffBold, fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: ls, color: '#000000' }}>거래처 관리</span>
      <button
        onClick={onRegisterClick}
        style={{ padding: '0 16px', height: 44, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 16, color: '#FFFFFF', letterSpacing: ls, whiteSpace: 'nowrap' }}
      >
        거래처 등록
      </button>
    </div>
  );
}

type SearchType = '거래처별칭' | '사업자명';

function SearchBar({ searchType, setSearchType, keyword, setKeyword, onSearch, partnerType, setPartnerType, status, setStatus, join, setJoin }: {
  searchType: SearchType;
  setSearchType: (t: SearchType) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  onSearch: () => void;
  partnerType: string;
  setPartnerType: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  join: string;
  setJoin: (v: string) => void;
}) {
  const fieldBase: React.CSSProperties = { height: 36, border: `1px solid ${BORDER}`, background: '#FFFFFF', boxSizing: 'border-box', fontSize: 15, fontFamily: ff, letterSpacing: ls, color: '#2E3238', outline: 'none' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexShrink: 0, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex' }}>
          <select
            value={searchType}
            onChange={e => setSearchType(e.target.value as SearchType)}
            style={{ ...fieldBase, width: 'auto', minWidth: 104, padding: '0 32px 0 10px', borderRadius: '4px 0 0 4px', marginRight: -1, cursor: 'pointer', appearance: 'none', background: `${selArrow} no-repeat right 12px center, #FFFFFF` }}
          >
            <option value="거래처별칭">거래처별칭</option>
            <option value="사업자명">사업자명</option>
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
        <FilterChip label="거래처 유형" options={TYPE_FILTER_OPTIONS} value={partnerType} onChange={setPartnerType} />
        <FilterChip label="거래상태" options={STATUS_FILTER_OPTIONS} value={status} onChange={setStatus} />
        <FilterChip label="시스템 가입 여부" options={JOIN_FILTER_OPTIONS} value={join} onChange={setJoin} />
      </div>
    </div>
  );
}

function Th({ label, width, flex, info }: { label: string; width?: number; flex?: boolean; info?: boolean }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : undefined, minWidth: flex ? 200 : undefined, flexShrink: 0, height: 40, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
      {info && (
        <span title="T 트럭커 운송관리시스템 가입 여부" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 26, flexShrink: 0, cursor: 'help' }}>
          <InfoIcon />
        </span>
      )}
    </div>
  );
}

function Td({ children, width, flex, align = 'left', bold }: { children: React.ReactNode; width?: number; flex?: boolean; align?: 'left' | 'center'; bold?: boolean }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : undefined, minWidth: flex ? 200 : undefined, flexShrink: 0, height: 48, padding: align === 'center' ? '10px 0' : 10, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
      {typeof children === 'string' ? (
        <span style={{ fontFamily: bold ? ffSemiBold : ff, fontWeight: bold ? 600 : 400, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      ) : children}
    </div>
  );
}

function StatusBadge({ status }: { status: TradeStatus }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.거래중지;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 26, padding: '0 6px', borderRadius: 4, background: s.bg, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 13, lineHeight: '19px', color: s.color, letterSpacing: ls, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function PartnerTable({ rows, onRowClick }: { rows: TradePartner[]; onRowClick: (p: TradePartner) => void }) {
  return (
    <div className="pm-table-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: 12, borderLeft: `1px solid ${BORDER}` }}>
      <div style={{ minWidth: 1060 }}>
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2 }}>
          <Th label="거래 상태" width={COL_WIDTHS.status} />
          <Th label="시스템 가입 여부" width={COL_WIDTHS.join} info />
          <Th label="거래처별칭" width={COL_WIDTHS.alias} />
          <Th label="사업자등록번호" width={COL_WIDTHS.bizNumber} />
          <Th label="사업장 주소" flex />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} className="pm-row" style={{ display: 'flex', cursor: 'pointer', background: '#FFFFFF' }}>
            <Td width={COL_WIDTHS.status} align="center"><StatusBadge status={row.status} /></Td>
            <Td width={COL_WIDTHS.join}>{row.tTrucker ? '가입' : '미가입'}</Td>
            <Td width={COL_WIDTHS.alias} bold>{row.alias}</Td>
            <Td width={COL_WIDTHS.bizNumber} align="center">{row.bizNumber}</Td>
            <Td flex>{[row.address, row.addressDetail].filter(Boolean).join(' ')}</Td>
            {/* 등록일시는 날짜만 노출 */}
            <Td width={COL_WIDTHS.registeredAt} align="center">{String(row.registeredAt || '').split(' ')[0]}</Td>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            검색 결과가 없습니다.
          </div>
        )}
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

const REGISTER_CSS = '.pmr-input::placeholder{color:#767D8A}.pmr-input:focus,.pmr-field:focus-within{border-color:#005FFF!important}.pmr-ghost:hover{background:#F6F7F8!important}.pmr-sug:hover{background:#F5F9FF}';

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

// 거래처 유형 선택 (화주사/협력사) — 등록 모달용 세그먼트 버튼
function PartnerTypeField({ value, onChange }: { value: PartnerType; onChange: (v: PartnerType) => void }) {
  return (
    <div role="radiogroup" aria-label="거래처 유형" style={{ display: 'flex', gap: 8 }}>
      {PARTNER_TYPES.map(t => {
        const on = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t)}
            style={{ flex: 1, height: 44, borderRadius: 4, border: `1px solid ${on ? '#005FFF' : BORDER}`, background: on ? '#F5F9FF' : '#FFFFFF', cursor: 'pointer', fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: on ? '#005FFF' : '#2E3238' }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

// ─── 거래 담당 업무그룹 선택 (등록 모달 / 상세 > 거래처 정보 수정에서 공용) ─────

const GROUP_PICKER_CSS = '.pmg-opt:hover{background:#F6F7F8!important}.pmg-row:hover .pmg-del{opacity:1!important}.pmg-row.pmg-sub:hover{background:#F6F7F8!important}.pmg-search::placeholder{color:#767D8A}';

function Checkbox({ on }: { on: boolean }) {
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

function RepresentativeBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 4px', borderRadius: 2, background: '#E6EFFF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#005FFF', whiteSpace: 'nowrap', flexShrink: 0 }}>
      대표 업무그룹
    </span>
  );
}

// 드롭다운에서 업무그룹을 체크해 "추가"하면 아래 목록에 쌓이고, 목록에서 행을 클릭하면 대표 업무그룹으로 지정된다.
// 대표 업무그룹이 없거나 목록에서 빠지면 첫 번째 그룹이 대표가 된다.
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
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const groupName = (id: string) => groups.find(g => g.id === id)?.name ?? id;
  const addable = groups.filter(g => !value.includes(g.id));
  const q = query.trim();
  const filtered = q === '' ? addable : addable.filter(g => g.name.includes(q));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    dropdownRef.current?.scrollIntoView({ block: 'nearest' });
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleChecked = (id: string) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAdd = () => {
    if (checked.length === 0) { setOpen(true); return; }
    const added = groups.filter(g => checked.includes(g.id)).map(g => g.id);
    const next = [...value, ...added];
    onChange(next);
    if (!mainId || !next.includes(mainId)) onMainChange(next[0]);
    setChecked([]);
    setQuery('');
    setOpen(false);
  };

  const handleRemove = (id: string) => {
    const next = value.filter(x => x !== id);
    onChange(next);
    if (id === mainId) onMainChange(next[0] ?? '');
  };

  const triggerText = checked.length === 0 ? '' : checked.length === 1 ? groupName(checked[0]) : `${groupName(checked[0])} 외 ${checked.length - 1}개`;
  const effectiveMainId = value.includes(mainId) ? mainId : value[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <style>{GROUP_PICKER_CSS}</style>
      {!hideLabel && <FormLabel>거래 담당 업무그룹</FormLabel>}
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            data-name="group-select"
            onClick={() => setOpen(o => !o)}
            disabled={addable.length === 0}
            style={{ ...fieldBoxStyle(false), flex: 1, width: 'auto', minWidth: 0, cursor: addable.length ? 'pointer' : 'default', textAlign: 'left', borderColor: open ? '#005FFF' : BORDER }}
          >
            <span style={{ ...fieldTextStyle, flex: 1, minWidth: 0, color: triggerText ? '#2E3238' : '#767D8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {addable.length === 0 ? '추가할 업무그룹이 없습니다' : triggerText || '담당 업무그룹 선택'}
            </span>
            <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              <Chevron size={16} color="#5C6370" />
            </span>
          </button>
          <ModalButton onClick={handleAdd}>추가</ModalButton>
        </div>
        {open && (
          <div ref={dropdownRef} data-name="group-dropdown" style={{ position: 'absolute', top: 48, left: 0, width: 'calc(100% - 68px)', zIndex: 10, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 8px 2px' }}>
              <div className="pmr-field" style={{ height: 36, padding: '6px 10px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SearchIcon />
                <input
                  className="pmg-search"
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="담당 업무그룹"
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
                  }}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '9px 4px', fontFamily: ff, fontSize: 15, color: '#9197A1', letterSpacing: ls }}>검색 결과가 없습니다.</div>
              ) : filtered.map(g => (
                <div
                  key={g.id}
                  className="pmg-opt"
                  onClick={() => toggleChecked(g.id)}
                  role="checkbox"
                  aria-checked={checked.includes(g.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 8px 9px 4px', borderRadius: 4, background: '#FFFFFF', cursor: 'pointer' }}
                >
                  <Checkbox on={checked.includes(g.id)} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238' }}>{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div data-name="group-list" style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 4, maxHeight: 224, overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {value.map((id, idx) => {
              const isMain = id === effectiveMainId;
              return (
                <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    className={'pmg-row' + (isMain ? '' : ' pmg-sub')}
                    onClick={() => onMainChange(id)}
                    title={isMain ? '대표 업무그룹' : '클릭하여 대표 업무그룹으로 지정'}
                    style={{ height: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', borderRadius: 4, cursor: isMain ? 'default' : 'pointer', background: isMain ? '#F5F9FF' : '#FFFFFF', border: `1px solid ${isMain ? '#005FFF' : 'transparent'}` }}
                  >
                    {isMain && <RepresentativeBadge />}
                    <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName(id)}</span>
                    <button
                      type="button"
                      className="pmg-del"
                      aria-label={`${groupName(id)} 삭제`}
                      onClick={e => { e.stopPropagation(); handleRemove(id); }}
                      style={{ opacity: 0, transition: 'opacity .1s', border: 'none', background: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
                    >
                      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  {idx < value.length - 1 && <div style={{ height: 1, background: '#F1F2F4' }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 거래처 등록 모달 ────────────────────────────────────────────────────────

function GeoraecheoRegisterModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: TradePartner) => void }) {
  const [bizName, setBizName] = useState('');
  const [bizNumber, setBizNumber] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizItem, setBizItem] = useState('');
  const [taxEmail, setTaxEmail] = useState('');
  const [bizLicense, setBizLicense] = useState<File | null>(null);
  const [partnerType, setPartnerType] = useState<PartnerType>('화주사');
  const [alias, setAlias] = useState('');
  const [memo, setMemo] = useState('');
  const [ourGroups] = useState<WorkGroup[]>(() => getGroups());
  const [mainGroupId, setMainGroupId] = useState('');
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);
  useEscapeKey(onClose);

  // 사업자명 입력 시 사업자 정보 레지스트리에서 자동완성
  const q = bizName.trim();
  const suggestions = q === '' ? [] : MOCK_BIZ_REGISTRY.filter(r => r.bizName.includes(q) || r.bizNumber.includes(q)).slice(0, 5);

  const handleSelectBiz = (rec: BizRecord) => {
    setBizName(rec.bizName);
    setBizNumber(rec.bizNumber);
    setAddress(rec.address || '');
    setAddressDetail(rec.addressDetail || '');
    setBizType(rec.bizType || '');
    setBizItem(rec.bizItem || '');
    if (!alias) setAlias(rec.bizName);
    setShowSuggest(false);
  };

  // 필수: 사업자명 + 사업자번호(10자리)
  const canRegister = bizName.trim() !== '' && isValidBizNumber(bizNumber);

  const handleRegister = () => {
    if (!canRegister) return;
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
      taxEmail: taxEmail.trim(),
      memo: memo.trim(),
      bizLicenseFile: bizLicense ? bizLicense.name : '',
      registeredAt: nowStamp(),
      tTrucker: false,
      sharedGroups: [],
      settleSchedules: [makeSchedule('기본스케줄', Date.now() % 1000)],
      contacts: [],
      mainGroupId: main,
      assignedGroupIds,
    });
    onClose();
  };

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={onClose} name="partner-register-modal">
      <div role="dialog" aria-label="거래처 등록" style={{ width: 704, height: 880, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', boxSizing: 'border-box' }}>
        <style>{REGISTER_CSS}</style>
        <ModalHeader title="거래처 등록" onClose={onClose} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px 24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', minWidth: 0 }}>
            <FormSection title="사업자 정보">
              <FormRow>
                <FormField label="사업자명" required>
                  <div style={{ position: 'relative' }}>
                    <TextField
                      value={bizName}
                      onChange={v => { setBizName(v); setShowSuggest(true); }}
                      placeholder="사업자명 입력"
                      required
                      onFocus={() => setShowSuggest(true)}
                      onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                    />
                    {showSuggest && suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 5, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto' }}>
                        {suggestions.map(rec => (
                          <div key={rec.bizNumber} className="pmr-sug" onMouseDown={() => handleSelectBiz(rec)} style={{ padding: '10px 12px', borderBottom: '1px solid #F1F2F4', cursor: 'pointer' }}>
                            <div style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: ls }}>{rec.bizName}</div>
                            <div style={{ fontFamily: ff, fontSize: 13, color: '#5C6370', marginTop: 2, letterSpacing: ls }}>{`${rec.bizNumber} · ${rec.address}`}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>
                <FormField label="사업자번호" required>
                  <TextField value={bizNumber} onChange={v => setBizNumber(formatBizNumber(v))} placeholder="사업자번호 입력" required inputMode="numeric" />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="대표자명">
                  <TextField value={ceoName} onChange={setCeoName} placeholder="대표자명 입력" />
                </FormField>
                <FormField label="대표자 연락처">
                  <TextField value={contact} onChange={v => setContact(formatPhone(v))} placeholder="연락처 입력" inputMode="tel" />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="주소">
                  <TextField value={address} onChange={setAddress} placeholder="기본 주소(행정동/도로명)" icon={<SearchIcon />} />
                </FormField>
                <FormField label="상세주소" hideLabel>
                  <TextField value={addressDetail} onChange={setAddressDetail} placeholder="상세 주소 입력" />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="업태">
                  <TextField value={bizType} onChange={setBizType} placeholder="업태 입력" />
                </FormField>
                <FormField label="종목">
                  <TextField value={bizItem} onChange={setBizItem} placeholder="종목 입력" />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="세금계산서 이메일">
                  <TextField value={taxEmail} onChange={setTaxEmail} placeholder="세금계산서 이메일 입력" inputMode="email" />
                </FormField>
                <FormField label="사업자등록증 제출">
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ ...fieldBoxStyle(false), flex: 1, width: 'auto', minWidth: 0 }} title={bizLicense ? bizLicense.name : ''}>
                      <span style={{ ...fieldTextStyle, color: bizLicense ? '#2E3238' : '#767D8A', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bizLicense ? bizLicense.name : 'pdf, jpg, jpeg, png'}
                      </span>
                      {bizLicense && (
                        <button
                          type="button"
                          aria-label="첨부 삭제"
                          onClick={() => { setBizLicense(null); if (fileRef.current) fileRef.current.value = ''; }}
                          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                        >
                          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="7" fill="#C7CBD1" />
                            <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setBizLicense(e.target.files?.[0] ?? null)} />
                    <ModalButton onClick={() => fileRef.current?.click()} style={{ width: 130, padding: 0 }}>
                      <ClipIcon />파일 첨부하기
                    </ModalButton>
                  </div>
                </FormField>
              </FormRow>
            </FormSection>

            <Divider />

            <FormSection title="거래처 정보">
              <FormRow>
                <FormField label="거래처 유형" required>
                  <PartnerTypeField value={partnerType} onChange={setPartnerType} />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="거래처별칭">
                  <TextField value={alias} onChange={setAlias} placeholder="거래처별칭 입력" />
                </FormField>
                <FormField label="배차 운영 메모">
                  <TextField value={memo} onChange={setMemo} placeholder="해당 거래처와 거래 시 참고해야할 사항을 입력.." />
                </FormField>
              </FormRow>
              <WorkGroupPicker groups={ourGroups} value={assignedGroupIds} mainId={mainGroupId} onChange={setAssignedGroupIds} onMainChange={setMainGroupId} />
            </FormSection>
          </div>
        </div>
        <div style={{ height: 88, padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>취소</ModalButton>
          <ModalButton primary h={52} size={18} px={20} disabled={!canRegister} onClick={handleRegister}>등록</ModalButton>
        </div>
      </div>
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

// 값 + [수정] 버튼 → 클릭 시 인풋 + [저장][취소]로 바뀌는 셀 단위 편집
function InlineEdit({ value, display, onSave, placeholder, inputMode, format }: {
  value: string;
  display?: React.ReactNode;
  onSave: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  format?: (v: string) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (!editing) {
    return (
      <>
        {display !== undefined ? display : value ? <Ellipsis>{value}</Ellipsis> : <span style={{ color: '#C7CBD1' }}>-</span>}
        <SmallButton onClick={() => { setDraft(value ?? ''); setEditing(true); }}>수정</SmallButton>
      </>
    );
  }
  const save = () => { onSave(draft.trim()); setEditing(false); };
  return (
    <>
      <input
        className="pmd-in"
        autoFocus
        value={draft}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={e => setDraft(format ? format(e.target.value) : e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); }
        }}
        style={{ flex: 1 }}
      />
      <SmallButton primary onClick={save}>저장</SmallButton>
      <SmallButton onClick={() => setEditing(false)}>취소</SmallButton>
    </>
  );
}

// 값 + [수정] 버튼 → 클릭 시 셀렉트 + [저장][취소]로 바뀌는 셀 단위 선택 편집
function InlineSelectEdit({ value, options, onSave }: { value: string; options: string[]; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <SmallButton onClick={() => { setDraft(value); setEditing(true); }}>수정</SmallButton>
      </>
    );
  }
  return (
    <>
      <div className="pmd-in" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <InlineSelect value={draft} options={options} onChange={setDraft} />
      </div>
      <SmallButton primary onClick={() => { onSave(draft); setEditing(false); }}>저장</SmallButton>
      <SmallButton onClick={() => setEditing(false)}>취소</SmallButton>
    </>
  );
}

const DAY_OPTIONS: FilterOption[] = Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}일` }));

// 시작일 > 종료일이면 익월에 걸치는 기간 (예: 26일~익월 25일)
function formatSettlePeriod(start: number, end: number) {
  return start > end ? `${start}일~익월 ${end}일` : `${start}일~${end}일`;
}

// 정산기간 셀 — [수정] 클릭 시 시작일/종료일 셀렉트 + [저장][취소]
function SettlePeriodEdit({ start, end, onSave }: { start: number; end: number; onSave: (start: number, end: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ start, end });

  if (!editing) {
    return (
      <>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatSettlePeriod(start, end)}</span>
        <SmallButton onClick={() => { setDraft({ start, end }); setEditing(true); }}>수정</SmallButton>
      </>
    );
  }
  return (
    <>
      <div className="pmd-in" style={{ width: 80, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <InlineSelect value={String(draft.start)} options={DAY_OPTIONS} onChange={v => setDraft(d => ({ ...d, start: Number(v) }))} />
      </div>
      <span style={{ flexShrink: 0 }}>~</span>
      {draft.start > draft.end && <span style={{ flexShrink: 0, color: '#5C6370' }}>익월</span>}
      <div className="pmd-in" style={{ width: 80, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <InlineSelect value={String(draft.end)} options={DAY_OPTIONS} onChange={v => setDraft(d => ({ ...d, end: Number(v) }))} />
      </div>
      <span style={{ flex: 1 }} />
      <SmallButton primary onClick={() => { onSave(draft.start, draft.end); setEditing(false); }}>저장</SmallButton>
      <SmallButton onClick={() => setEditing(false)}>취소</SmallButton>
    </>
  );
}

function BizLicenseField({ fileName, onChange }: { fileName: string; onChange: (name: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      {fileName ? (
        <>
          <span title={fileName} style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 16, lineHeight: '24px', letterSpacing: ls, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          <button
            type="button"
            aria-label="첨부 삭제"
            onClick={() => { onChange(''); if (fileRef.current) fileRef.current.value = ''; }}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" fill="#9197A1" />
              <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </>
      ) : (
        <span style={{ flex: 1, color: '#C7CBD1' }}>-</span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f.name); }}
      />
      <SmallButton onClick={() => fileRef.current?.click()}><ClipIcon />파일 첨부하기</SmallButton>
    </>
  );
}

// 수정 모드에서 쓰는 테이블 셀 인풋
function DraftInput({ value, onChange, placeholder, format, inputMode }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  format?: (v: string) => string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <input
      className="pmd-in"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(format ? format(e.target.value) : e.target.value)}
      inputMode={inputMode}
      style={{ flex: 1, width: '100%' }}
    />
  );
}

// ─── 거래처 업무그룹(정산스케줄) 아코디언 ─────────────────────────────────────

function ScheduleAccordion({ schedule, open, onToggle, partner, onPatch, onRemove, canRemove, onToast }: {
  schedule: SettleSchedule;
  open: boolean;
  onToggle: () => void;
  partner: TradePartner;
  onPatch: (patch: Partial<SettleSchedule>) => void;
  onRemove: () => void;
  canRemove: boolean;
  onToast: (msg: string) => void;
}) {
  const hasRate = hasContractRate(partner.id, schedule.id);
  const contactSummary = (partner.contacts || [])
    .filter((c: PartnerContact) => c.name)
    .map(c => c.department ? `${c.name}(${c.department})` : c.name)
    .join(', ');
  const collectDays = schedule.collectDays ?? 30;
  const taxEmail = schedule.taxEmail || partner.taxEmail;

  return (
    <div>
      <div
        className="pmd-acc"
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ height: 40, background: '#F6F7F8', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', transform: open ? 'none' : 'rotate(180deg)' }}>
          <Chevron size={16} color="#5C6370" />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#5C6370', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{schedule.name}</span>
        {open && canRemove && (
          <SmallButton onClick={e => { e.stopPropagation(); onRemove(); }} style={{ color: '#DD2222' }}>삭제</SmallButton>
        )}
      </div>
      {open && (
        <div>
          <InfoRow>
            <InfoLabel label="종사업자번호" info />
            <InfoValue>
              <InlineEdit
                value={schedule.subBizNumber || ''}
                inputMode="numeric"
                placeholder="종사업자번호 4자리"
                format={v => v.replace(/\D/g, '').slice(0, 4)}
                onSave={v => onPatch({ subBizNumber: v })}
              />
            </InfoValue>
            <InfoLabel label="결제수단" info />
            <InfoValue><InlineSelectEdit value={schedule.payMeans || '현금'} options={PAY_MEANS_OPTIONS} onSave={v => onPatch({ payMeans: v })} /></InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="정산기간" info />
            <InfoValue>
              <SettlePeriodEdit
                start={schedule.settlePeriodStart ?? 1}
                end={schedule.settlePeriodEnd ?? 31}
                onSave={(start, end) => onPatch({ settlePeriodStart: start, settlePeriodEnd: end })}
              />
            </InfoValue>
            <InfoLabel label="인수증 기본설정" info />
            <InfoValue><Ellipsis>{schedule.receiptDefault || '원본/사진 필수'}</Ellipsis></InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="수금예정일" info />
            <InfoValue>
              <InlineEdit
                value={String(collectDays)}
                display={<Ellipsis>{`계산서 발행 ${collectDays}일 후`}</Ellipsis>}
                inputMode="numeric"
                placeholder="일수"
                format={v => v.replace(/\D/g, '').slice(0, 3)}
                onSave={v => onPatch({ collectDays: Number(v) || 0 })}
              />
            </InfoValue>
            <InfoLabel label="세금계산서 이메일" info />
            {/* 스케줄별 이메일 미지정 시 사업자 정보의 세금계산서 이메일 */}
            <InfoValue>{taxEmail && <Ellipsis>{taxEmail}</Ellipsis>}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="계약운임표" info />
            <InfoValue>
              {hasRate ? <Ellipsis>등록됨</Ellipsis> : <span style={{ color: '#C7CBD1' }}>-</span>}
              <SmallButton onClick={() => onToast('계약운임표는 거래처 > 계약운임표 관리에서 설정할 수 있어요.')}>설정</SmallButton>
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="정산메모" info />
            <InfoValue wrap>{schedule.settleMemo}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel label="거래처 직원 정보" info />
            <InfoValue>{contactSummary && <Ellipsis>{contactSummary}</Ellipsis>}</InfoValue>
          </InfoRow>
        </div>
      )}
    </div>
  );
}

// ─── 거래처 상세 모달 ────────────────────────────────────────────────────────

type BizDraft = { bizName: string; bizNumber: string; ceoName: string; contact: string; address: string; addressDetail: string; fax: string; bizType: string; bizItem: string; taxEmail: string };
type InfoDraft = { partnerType: PartnerType; contactName: string; contactEmail: string; contactPhone: string; alias: string; memo: string; assignedGroupIds: string[]; mainGroupId: string };

// 섹션별 [수정] → [저장]/[취소] 인라인 편집. 저장 즉시 스토어에 반영되므로 하단엔 [닫기]만 둔다.
function GeoraecheoDetailModal({ partner: initialPartner, onClose, onSave }: { partner: TradePartner; onClose: () => void; onSave: (p: TradePartner) => void }) {
  const [partner, setPartner] = useState<TradePartner>(initialPartner);
  const [ourGroups, setOurGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => setOurGroups(getGroups())), []);

  const [bizDraft, setBizDraft] = useState<BizDraft | null>(null);   // null이면 사업자 정보 보기 모드
  const [infoDraft, setInfoDraft] = useState<InfoDraft | null>(null); // null이면 거래처 정보 보기 모드
  const [openScheduleIds, setOpenScheduleIds] = useState<Set<string>>(() => new Set(initialPartner.settleSchedules?.[0] ? [initialPartner.settleSchedules[0].id] : []));
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEscapeKey(onClose);

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayHeight = useScaledViewportHeight(overlayRef);

  const commit = (next: TradePartner) => {
    setPartner(next);
    onSave(next);
  };
  const patchPartner = (patch: Partial<TradePartner>) => commit({ ...partner, ...patch });
  const groupName = (id: string) => ourGroups.find(g => g.id === id)?.name ?? '';

  // ── 사업자 정보
  const startBizEdit = () => setBizDraft({
    bizName: partner.bizName || '', bizNumber: partner.bizNumber || '', ceoName: partner.ceoName || '', contact: partner.contact || '',
    address: partner.address || '', addressDetail: partner.addressDetail || '', fax: partner.fax || '',
    bizType: partner.bizType || '', bizItem: partner.bizItem || '', taxEmail: partner.taxEmail || '',
  });
  const setBizField = (key: keyof BizDraft) => (v: string) => setBizDraft(d => d && { ...d, [key]: v });
  const canSaveBiz = !!bizDraft && bizDraft.bizName.trim() !== '' && isValidBizNumber(bizDraft.bizNumber);
  const saveBiz = () => {
    if (!bizDraft || !canSaveBiz) return;
    const trimmed = Object.fromEntries(Object.entries(bizDraft).map(([k, v]) => [k, v.trim()])) as BizDraft;
    patchPartner(trimmed);
    setBizDraft(null);
    setToast('사업자 정보가 저장되었어요.');
  };

  // ── 거래처 정보 (담당자는 거래처 직원 정보의 첫 번째 직원)
  const primaryContact: Partial<PartnerContact> = partner.contacts?.[0] || {};
  const startInfoEdit = () => setInfoDraft({
    partnerType: partner.partnerType || '화주사',
    contactName: primaryContact.name || '', contactEmail: primaryContact.email || '', contactPhone: primaryContact.phone || '',
    alias: partner.alias || '', memo: partner.memo || '',
    assignedGroupIds: [...(partner.assignedGroupIds || [])], mainGroupId: partner.mainGroupId || '',
  });
  const setInfoField = (key: 'contactName' | 'contactEmail' | 'contactPhone' | 'alias' | 'memo') => (v: string) => setInfoDraft(d => d && { ...d, [key]: v });
  const saveInfo = () => {
    if (!infoDraft) return;
    const contacts = [...(partner.contacts || [])];
    const base: PartnerContact = contacts[0] || { id: genId('ct'), name: '', department: '', phone: '', fax: '', email: '', memo: '' };
    const edited: PartnerContact = { ...base, name: infoDraft.contactName.trim(), email: infoDraft.contactEmail.trim(), phone: infoDraft.contactPhone };
    if (contacts.length) contacts[0] = edited;
    else if (edited.name || edited.email || edited.phone) contacts.push(edited);
    const assigned = infoDraft.assignedGroupIds;
    const main = assigned.includes(infoDraft.mainGroupId) ? infoDraft.mainGroupId : assigned[0] ?? '';
    patchPartner({ partnerType: infoDraft.partnerType, contacts, alias: infoDraft.alias.trim() || partner.bizName, memo: infoDraft.memo.trim(), assignedGroupIds: assigned, mainGroupId: main });
    setInfoDraft(null);
    setToast('거래처 정보가 저장되었어요.');
  };

  const editActions = (onSaveClick: () => void, onCancel: () => void, disabled?: boolean) => (
    <div style={{ display: 'flex', gap: 4 }}>
      <SmallButton primary onClick={onSaveClick} style={disabled ? { background: '#CCDFFF', cursor: 'default' } : undefined}>저장</SmallButton>
      <SmallButton onClick={onCancel}>취소</SmallButton>
    </div>
  );

  // ── 거래처 업무그룹(정산스케줄)
  const schedules = partner.settleSchedules || [];
  const patchSchedule = (id: string, patch: Partial<SettleSchedule>) => commit({ ...partner, settleSchedules: schedules.map(s => s.id === id ? { ...s, ...patch } : s) });
  const addSchedule = () => {
    const s = makeSchedule(`정산스케줄 ${schedules.length + 1}`, schedules.length + 100);
    commit({ ...partner, settleSchedules: [...schedules, s] });
    setOpenScheduleIds(prev => new Set([...prev, s.id]));
  };
  const removeSchedule = (id: string) => {
    if (schedules.length <= 1) return; // 정산스케줄은 최소 1개
    const rest = schedules.filter(s => s.id !== id);
    commit({ ...partner, settleSchedules: rest, sharedGroups: (partner.sharedGroups || []).map(g => g.scheduleId === id ? { ...g, scheduleId: rest[0].id } : g) });
  };
  const toggleSchedule = (id: string) => setOpenScheduleIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── 거래처 업무그룹별 정산 스케줄 매핑 — 공유 그룹이 없으면 '기본그룹' 1개로 표시
  const firstScheduleId = schedules[0]?.id ?? '';
  const groupMappings: SharedGroupMapping[] = (partner.sharedGroups?.length ? partner.sharedGroups : [{ groupName: '기본그룹', scheduleId: firstScheduleId }])
    .map(g => ({ ...g, scheduleId: schedules.some(s => s.id === g.scheduleId) ? g.scheduleId : firstScheduleId }));
  const updateMapping = (groupName: string, scheduleId: string) => commit({ ...partner, sharedGroups: groupMappings.map(g => g.groupName === groupName ? { ...g, scheduleId } : g) });

  // ── 담당 업무그룹 보기 모드: [대표 업무그룹] 대표, 나머지...
  const assignedGroupsView = (() => {
    const ids = partner.assignedGroupIds || [];
    if (!ids.length) return null;
    const main = ids.includes(partner.mainGroupId) ? partner.mainGroupId : ids[0];
    const others = ids.filter(id => id !== main).map(groupName).filter(Boolean);
    return (
      <>
        <RepresentativeBadge />
        <Ellipsis>{[groupName(main), ...others].join(', ')}</Ellipsis>
      </>
    );
  })();

  const editingBiz = bizDraft !== null;
  const editingInfo = infoDraft !== null;

  return (
    <ModalOverlay overlayRef={overlayRef} height={overlayHeight} onClose={onClose} name="partner-detail-modal">
      <div role="dialog" aria-label="거래처 상세" style={{ width: 870, maxHeight: overlayHeight ? overlayHeight - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden', position: 'relative' }}>
        <style>{REGISTER_CSS + GROUP_PICKER_CSS + DETAIL_CSS}</style>
        <ModalHeader title="거래처 상세" onClose={onClose} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px 24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* 사업자 정보 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <DetailSectionTitle actions={editingBiz ? editActions(saveBiz, () => setBizDraft(null), !canSaveBiz) : <SmallButton onClick={startBizEdit}>수정</SmallButton>}>
                사업자 정보
              </DetailSectionTitle>
              <InfoTable>
                <InfoRow>
                  <InfoLabel label={editingBiz ? '사업자명 *' : '사업자명'} />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.bizName} onChange={setBizField('bizName')} placeholder="사업자명" /> : <Ellipsis>{partner.bizName}</Ellipsis>}</InfoValue>
                  <InfoLabel label={editingBiz ? '사업자등록번호 *' : '사업자등록번호'} />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.bizNumber} onChange={setBizField('bizNumber')} placeholder="000-00-00000" format={formatBizNumber} inputMode="numeric" /> : <Ellipsis>{partner.bizNumber}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="대표자 이름" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.ceoName} onChange={setBizField('ceoName')} placeholder="대표자 이름" /> : partner.ceoName && <Ellipsis>{partner.ceoName}</Ellipsis>}</InfoValue>
                  <InfoLabel label="대표자 연락처" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.contact} onChange={setBizField('contact')} placeholder="010-0000-0000" format={formatPhone} inputMode="tel" /> : partner.contact && <Ellipsis>{partner.contact}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="사업장주소" />
                  <InfoValue wrap={!editingBiz}>
                    {bizDraft ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                        <DraftInput value={bizDraft.address} onChange={setBizField('address')} placeholder="기본 주소" />
                        <DraftInput value={bizDraft.addressDetail} onChange={setBizField('addressDetail')} placeholder="상세 주소" />
                      </div>
                    ) : [partner.address, partner.addressDetail].filter(Boolean).join(', ')}
                  </InfoValue>
                  <InfoLabel label="팩스번호" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.fax} onChange={setBizField('fax')} placeholder="000-0000-0000" format={formatPhone} inputMode="tel" /> : partner.fax && <Ellipsis>{partner.fax}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="업태" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.bizType} onChange={setBizField('bizType')} placeholder="업태" /> : partner.bizType && <Ellipsis>{partner.bizType}</Ellipsis>}</InfoValue>
                  <InfoLabel label="종목" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.bizItem} onChange={setBizField('bizItem')} placeholder="종목" /> : partner.bizItem && <Ellipsis>{partner.bizItem}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="세금계산서 이메일" />
                  <InfoValue>{bizDraft ? <DraftInput value={bizDraft.taxEmail} onChange={setBizField('taxEmail')} placeholder="tax@example.com" inputMode="email" /> : partner.taxEmail && <Ellipsis>{partner.taxEmail}</Ellipsis>}</InfoValue>
                  <InfoLabel label="사업자등록증" />
                  <InfoValue><BizLicenseField fileName={partner.bizLicenseFile || ''} onChange={name => patchPartner({ bizLicenseFile: name })} /></InfoValue>
                </InfoRow>
              </InfoTable>
            </div>

            <Divider />

            {/* 거래처 정보 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <DetailSectionTitle actions={editingInfo ? editActions(saveInfo, () => setInfoDraft(null)) : <SmallButton onClick={startInfoEdit}>수정</SmallButton>}>
                거래처 정보
              </DetailSectionTitle>
              <InfoTable>
                <InfoRow>
                  <InfoLabel label="거래처 유형" />
                  <InfoValue>
                    {infoDraft ? (
                      <div className="pmd-in" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <InlineSelect value={infoDraft.partnerType} options={PARTNER_TYPES} onChange={v => setInfoDraft(d => d && { ...d, partnerType: v as PartnerType })} />
                      </div>
                    ) : partner.partnerType && <Ellipsis>{partner.partnerType}</Ellipsis>}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="담당자명" />
                  <InfoValue>{infoDraft ? <DraftInput value={infoDraft.contactName} onChange={setInfoField('contactName')} placeholder="담당자명" /> : primaryContact.name && <Ellipsis>{primaryContact.name}</Ellipsis>}</InfoValue>
                  <InfoLabel label="담당자 이메일" />
                  <InfoValue>{infoDraft ? <DraftInput value={infoDraft.contactEmail} onChange={setInfoField('contactEmail')} placeholder="이메일" inputMode="email" /> : primaryContact.email && <Ellipsis>{primaryContact.email}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="담당자 전화번호" />
                  <InfoValue>{infoDraft ? <DraftInput value={infoDraft.contactPhone} onChange={setInfoField('contactPhone')} placeholder="010-0000-0000" format={formatPhone} inputMode="tel" /> : primaryContact.phone && <Ellipsis>{primaryContact.phone}</Ellipsis>}</InfoValue>
                  <InfoLabel label="거래처 별칭" />
                  <InfoValue>{infoDraft ? <DraftInput value={infoDraft.alias} onChange={setInfoField('alias')} placeholder="거래처 별칭" /> : partner.alias && <Ellipsis>{partner.alias}</Ellipsis>}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="거래처 운영 메모" />
                  <InfoValue wrap={!editingInfo}>{infoDraft ? <DraftInput value={infoDraft.memo} onChange={setInfoField('memo')} placeholder="해당 거래처와 거래 시 참고해야할 사항" /> : partner.memo}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel label="담당 업무그룹" />
                  <InfoValue visible={editingInfo} wrap={editingInfo}>
                    {infoDraft ? (
                      <div style={{ width: '100%', padding: '2px 0' }}>
                        <WorkGroupPicker
                          groups={ourGroups}
                          value={infoDraft.assignedGroupIds}
                          mainId={infoDraft.mainGroupId}
                          hideLabel
                          onChange={ids => setInfoDraft(d => d && { ...d, assignedGroupIds: ids })}
                          onMainChange={id => setInfoDraft(d => d && { ...d, mainGroupId: id })}
                        />
                      </div>
                    ) : assignedGroupsView}
                  </InfoValue>
                </InfoRow>
              </InfoTable>
            </div>

            <Divider />

            {/* 거래처 업무그룹 (정산스케줄) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <DetailSectionTitle actions={<SmallButton onClick={addSchedule}>추가</SmallButton>}>거래처 업무그룹</DetailSectionTitle>
                <p style={{ margin: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#454B55' }}>
                  거래처 업무그룹을 이용하시면 거래처별 결제방식이나 정산주기 등 정산 규칙을 미리 지정할 수 있어요.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {schedules.map(s => (
                  <ScheduleAccordion
                    key={s.id}
                    schedule={s}
                    open={openScheduleIds.has(s.id)}
                    onToggle={() => toggleSchedule(s.id)}
                    partner={partner}
                    onPatch={patch => patchSchedule(s.id, patch)}
                    onRemove={() => removeSchedule(s.id)}
                    canRemove={schedules.length > 1}
                    onToast={setToast}
                  />
                ))}
              </div>
              <button type="button" className="pmd-add" onClick={addSchedule} style={{ height: 40, border: `1px solid ${BORDER}`, borderRadius: 2, background: '#FFFFFF', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, color: '#2E3238' }}>
                + 정산스케줄 추가하기
              </button>
            </div>

            <Divider />

            {/* 거래처 업무그룹별 정산 스케줄 설정 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <DetailSectionTitle info="거래처 쪽 업무그룹마다 어떤 정산스케줄을 적용할지 지정해요.">거래처 업무그룹별 정산 스케줄 설정</DetailSectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {groupMappings.map(g => (
                  <div key={g.groupName} style={{ height: 56, border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', boxSizing: 'border-box' }}>
                    <span style={{ fontFamily: ff, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#2E3238' }}>{g.groupName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: ff, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238' }}>정산스케줄</span>
                      <select
                        className="pmr-input"
                        value={g.scheduleId}
                        onChange={e => updateMapping(g.groupName, e.target.value)}
                        style={{ width: 160, height: 36, padding: '0 32px 0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, background: `${selArrow} no-repeat right 13px center, #F6F7F8`, appearance: 'none', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }}
                      >
                        {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 96, padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
        </div>
        {toast && (
          <div role="status" style={{ position: 'absolute', left: '50%', bottom: 108, transform: 'translateX(-50%)', background: 'rgba(46,50,56,.92)', color: '#FFFFFF', borderRadius: 8, padding: '10px 16px', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.18)' }}>
            {toast}
          </div>
        )}
      </div>
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
  const [typeFilter, setTypeFilter] = useState('');     // '' | '화주사' | '협력사'
  const [statusFilter, setStatusFilter] = useState(''); // '' | '정상' | '거래중지'
  const [joinFilter, setJoinFilter] = useState('');     // '' | 'Y' | 'N'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);

  const handleSearch = () => {
    setAppliedType(searchType);
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  const filtered = partners.filter(p => {
    if (appliedKeyword !== '') {
      const target = appliedType === '거래처별칭' ? p.alias : p.bizName;
      if (!target.toLowerCase().includes(appliedKeyword.toLowerCase())) return false;
    }
    if (typeFilter !== '' && p.partnerType !== typeFilter) return false;
    if (statusFilter !== '' && p.status !== statusFilter) return false;
    if (joinFilter !== '' && (joinFilter === 'Y') !== !!p.tTrucker) return false;
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
          <SearchBar
            searchType={searchType} setSearchType={setSearchType}
            keyword={keyword} setKeyword={setKeyword}
            onSearch={handleSearch}
            partnerType={typeFilter} setPartnerType={v => { setTypeFilter(v); setPage(1); }}
            status={statusFilter} setStatus={v => { setStatusFilter(v); setPage(1); }}
            join={joinFilter} setJoin={v => { setJoinFilter(v); setPage(1); }}
          />
          <PartnerTable rows={rows} onRowClick={setDetailTarget} />
        </div>
        <Pagination total={filtered.length} page={currentPage} setPage={setPage} size={pageSize} setSize={setPageSize} />
      </div>

      {showRegister && (
        <GeoraecheoRegisterModal
          onClose={() => setShowRegister(false)}
          onRegister={addPartner}
        />
      )}
      {detailTarget && (
        <GeoraecheoDetailModal
          partner={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSave={updatePartner}
        />
      )}
    </div>
  );
}
