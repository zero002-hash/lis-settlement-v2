import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type WorkGroup, type Employee,
  COMPANY_TAX_EMAIL, EMPLOYEE_ROLES,
  getGroups, addGroup, updateGroup, deleteGroup, getDefaultGroup,
  getEmployees, setGroupMembers, getSharedPartnerIds, setSharedPartnerIds,
  subscribeCompany,
} from "../shared/companyStore";
import { type TradePartner, getPartners, subscribePartners, replaceGroupInPartners } from "../shared/geoRaecheoStore";

const ff = "'Pretendard GOV:Regular'";
const ffSemiBold = "'Pretendard GOV:SemiBold'";
const ffBold = "'Pretendard GOV:Bold'";
const ls = '-0.02em';
const BORDER = '#E3E5E9';
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const ko = (a: string, b: string) => a.localeCompare(b, 'ko');

// ─── 공통 아이콘 ─────────────────────────────────────────────────────────────

function Chevron({ size = 12, color = '#2E3238', dir = 'down' }: { size?: 12 | 16; color?: string; dir?: 'down' | 'up' | 'left' | 'right' }) {
  const d = dir === 'down' ? (size === 12 ? 'M3 4.5l3 3 3-3' : 'M4 6l4 4 4-4')
    : dir === 'up' ? (size === 12 ? 'M3 7.5l3-3 3 3' : 'M4 10l4-4 4 4')
    : dir === 'left' ? 'M10 12L6 8l4-4' : 'M6 4l4 4-4 4';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ flexShrink: 0 }}>
      <path d={d} stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7.2" cy="7.2" r="5" stroke="#767D8A" strokeWidth="1.3" />
      <path d="M11 11l3 3" stroke="#767D8A" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="2.2" stroke="#5C6370" strokeWidth="1.2" />
      <path d="M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7L3.6 3.6" stroke="#5C6370" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M11.5 7a4.5 4.5 0 11-1.3-3.2M11.5 2v2.8H8.7" stroke="#5C6370" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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

function AlertIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#9197A1" />
      <path d="M10 5.5v5.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1" fill="#FFFFFF" />
    </svg>
  );
}

function Checkbox({ on, disabled, partial }: { on: boolean; disabled?: boolean; partial?: boolean }) {
  if (disabled) {
    return (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <rect x="2" y="2" width="16" height="16" rx="4" fill="#E3E5E9" />
        {on && <path d="M6 10.2l2.7 2.6L14 7.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    );
  }
  return on || partial ? (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="16" height="16" rx="4" fill="#005FFF" />
      {on ? <path d="M6 10.2l2.7 2.6L14 7.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M6 10h8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  ) : (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2.65" y="2.65" width="14.7" height="14.7" rx="3.35" fill="#FFFFFF" stroke="#ADB1B9" strokeWidth="1.3" />
    </svg>
  );
}

// ─── 공통 배지/칩 ─────────────────────────────────────────────────────────────

function GrayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 4px', borderRadius: 2, background: '#EBEDEF', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#454B55', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {children}
    </span>
  );
}

// "총 n명 이름 / 이름 / …" — 말줄임 상관없이 OS 툴팁으로 전체 목록 노출
function NameListCell({ unit, names }: { unit: '명' | '개'; names: string[] }) {
  return (
    <div title={names.join(' / ')} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%' }}>
      <GrayBadge>{`총 ${names.length}${unit}`}</GrayBadge>
      {names.length === 0 ? <span style={{ color: '#C7CBD1' }}>-</span> : (
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238' }}>
          {names.map((n, i) => (
            <span key={i}>{i > 0 && <span style={{ color: '#C7CBD1' }}> / </span>}{n}</span>
          ))}
        </span>
      )}
    </div>
  );
}

// ─── 이메일 검증 (LIS 이메일 규칙) ───────────────────────────────────────────

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

const modalBoxShadow = `0 0 0 1px ${BORDER}, 0 2px 6px 1px rgba(34,34,34,0.06)`;

// 모달 공통 껍데기 — 헤더(타이틀+닫기) / 스크롤 본문 / 하단 버튼 영역
function Modal({ title, width, onClose, children, footer, name, z = 0 }: {
  title: React.ReactNode;
  width: number;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  name: string;
  z?: number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const height = useScaledViewportHeight(overlayRef);
  useEscapeKey(onClose);
  return (
    <div
      ref={overlayRef}
      data-name={name}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: height == null ? 0 : undefined, height: height ?? undefined, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'safe center', justifyContent: 'safe center', padding: 16, boxSizing: 'border-box', overflow: 'auto', zIndex: 99999 + z }}
    >
      <div role="dialog" style={{ width, maxHeight: height ? height - 32 : 'calc(100vh - 32px)', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 12, boxShadow: modalBoxShadow, overflow: 'hidden' }}>
        <style>{FORM_CSS}</style>
        <div style={{ minHeight: 72, padding: '24px 24px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ margin: 0, fontFamily: ffBold, fontWeight: 700, fontSize: 22, lineHeight: '32px', letterSpacing: ls, color: '#2E3238', minWidth: 0 }}>{title}</div>
          <button type="button" aria-label="닫기" onClick={onClose} style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ModalCloseIcon />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '4px 24px 16px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '20px 24px 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

// 모달 하단/폼용 버튼 (primary: 파랑, danger: 빨강, ghost: 테두리 없음, 기본: 흰 배경 + 테두리)
function ModalButton({ children, onClick, primary, danger, ghost, disabled, h = 44, size = 16, px = 16, style }: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  h?: number;
  size?: number;
  px?: number;
  style?: React.CSSProperties;
}) {
  const filled = primary || danger;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={ghost ? 'wg-ghost' : undefined}
      style={{
        height: h, padding: `0 ${px}px`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
        border: filled || ghost ? 'none' : `1px solid ${BORDER}`,
        background: danger ? (disabled ? '#F6C8C8' : '#DD2222') : primary ? (disabled ? '#CCDFFF' : '#005FFF') : '#FFFFFF',
        fontFamily: ffSemiBold, fontWeight: 600, fontSize: size, lineHeight: size === 18 ? '26px' : '24px', letterSpacing: ls,
        color: filled ? '#FFFFFF' : '#2E3238', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── 토스트 ──────────────────────────────────────────────────────────────────

type ToastState = { msg: string; tone: 'dark' | 'red' } | null;
type Notify = (msg: string, tone?: 'dark' | 'red') => void;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 40, transform: 'translateX(-50%)', zIndex: 100100, minWidth: 360, maxWidth: 560, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px 14px 20px', borderRadius: 8, background: toast.tone === 'red' ? '#E23A3A' : '#2E3238', boxShadow: '0 4px 16px rgba(0,0,0,.18)', boxSizing: 'border-box' }}>
      <span style={{ flex: 1, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#FFFFFF' }}>{toast.msg}</span>
      <button type="button" aria-label="닫기" onClick={onClose} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

// ─── 목록 공통 (검색/필터/표/페이지네이션) ────────────────────────────────────

const LIST_CSS = '.wg-row:hover{background:#F9FAFB!important}.wg-search-input::placeholder{color:#767D8A}.wg-scroll::-webkit-scrollbar{width:10px;height:10px}.wg-scroll::-webkit-scrollbar-thumb{background:#C7CBD1;border-radius:10px;border:2px solid #FFFFFF}.wg-scroll::-webkit-scrollbar-track{background:#FFFFFF}.wg-opt:hover{background:#F6F7F8!important}';
const FORM_CSS = '.wg-input::placeholder{color:#767D8A}.wg-field:focus-within{border-color:#005FFF!important}.wg-field.wg-err,.wg-field.wg-err:focus-within{border-color:#E23A3A!important}.wg-ghost:hover{background:#F6F7F8!important}.wg-opt:hover{background:#F6F7F8!important}.wg-tab:hover span{color:#2E3238!important}';

type Option = { v: string; l: string };

function useOutsideClose(open: boolean, setOpen: (o: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, setOpen]);
  return ref;
}

// 다중 선택 필터 칩 — 체크박스 목록 + (옵션) 검색, 선택 시 바로 필터링. 하단 [필터 초기화]
function MultiFilterChip({ label, options, values, onChange, searchPlaceholder, width = 200 }: {
  label: string;
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  searchPlaceholder?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useOutsideClose(open, setOpen);
  const active = values.length > 0;
  const q = query.trim();
  const shown = q ? options.filter(o => o.l.includes(q)) : options;
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
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
            <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 11, color: '#005FFF' }}>{values.length}</span>
          </div>
        ) : <Chevron size={12} dir={open ? 'up' : 'down'} color={open ? '#005FFF' : '#2E3238'} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, width, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.12)', boxSizing: 'border-box', overflow: 'hidden' }}>
          {searchPlaceholder && (
            <div style={{ padding: '8px 8px 0' }}>
              <div className="wg-field" style={{ height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <SearchIcon />
                <input className="wg-input" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={searchPlaceholder} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }} />
              </div>
            </div>
          )}
          <div className="wg-scroll" style={{ maxHeight: 200, overflowY: 'auto', padding: 4 }}>
            {options.length === 0 ? (
              <div style={{ padding: '9px 8px', fontFamily: ff, fontSize: 15, color: '#9197A1', letterSpacing: ls }}>항목이 없습니다.</div>
            ) : shown.length === 0 ? (
              <div style={{ padding: '9px 8px', fontFamily: ff, fontSize: 15, color: '#9197A1', letterSpacing: ls }}>검색 결과가 없습니다.</div>
            ) : shown.map(o => (
              <div key={o.v} className="wg-opt" role="checkbox" aria-checked={values.includes(o.v)} onClick={() => toggle(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 6px', borderRadius: 4, cursor: 'pointer' }}>
                <Checkbox on={values.includes(o.v)} />
                <span style={{ flex: 1, minWidth: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.l}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: '6px 10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => onChange([])} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: ff, fontSize: 13, color: '#9197A1', letterSpacing: ls }}>필터 초기화</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 검색 유형 셀렉트 + 검색어 + [검색]
function SearchBox<T extends string>({ types, type, setType, keyword, setKeyword, onSearch, selectWidth = 120, inputWidth = 198 }: {
  types: T[];
  type: T;
  setType: (t: T) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  onSearch: () => void;
  selectWidth?: number;
  inputWidth?: number;
}) {
  const fieldBase: React.CSSProperties = { height: 36, border: `1px solid ${BORDER}`, background: '#FFFFFF', boxSizing: 'border-box', fontSize: 15, fontFamily: ff, letterSpacing: ls, color: '#2E3238', outline: 'none' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex' }}>
        <select
          value={type}
          onChange={e => setType(e.target.value as T)}
          style={{ ...fieldBase, width: selectWidth, padding: '0 32px 0 10px', borderRadius: '4px 0 0 4px', marginRight: -1, cursor: 'pointer', appearance: 'none', background: `${selArrow} no-repeat right 12px center, #FFFFFF` }}
        >
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
          placeholder="검색어를 입력하세요."
          className="wg-search-input"
          style={{ ...fieldBase, width: inputWidth, padding: '0 10px', borderRadius: '0 4px 4px 0' }}
        />
      </div>
      <button onClick={onSearch} style={{ height: 36, padding: '0 12px', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap' }}>
        검색
      </button>
    </div>
  );
}

function Th({ label, width, flex, minWidth = 200 }: { label: string; width?: number; flex?: boolean; minWidth?: number }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : '0 0 auto', minWidth: flex ? minWidth : undefined, height: 40, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', background: '#F6F7F8', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#5C6370', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
    </div>
  );
}

function Td({ children, width, flex, minWidth = 200, align = 'left', bold, h = 48 }: { children: React.ReactNode; width?: number; flex?: boolean; minWidth?: number; align?: 'left' | 'center'; bold?: boolean; h?: number }) {
  return (
    <div style={{ width, flex: flex ? '1 0 0' : '0 0 auto', minWidth: flex ? minWidth : undefined, minHeight: h, padding: align === 'center' ? '6px 0' : '6px 10px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <span title={String(children)} style={{ fontFamily: bold ? ffSemiBold : ff, fontWeight: bold ? 600 : 400, fontSize: 15, lineHeight: '22px', color: '#2E3238', letterSpacing: ls, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      ) : children}
    </div>
  );
}

function EmptyRows({ text, height = 240 }: { text: string; height?: number }) {
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <svg width={40} height={32} viewBox="0 0 40 32" fill="none">
        <rect x="2" y="4" width="26" height="4" rx="1" fill="#E3E5E9" /><rect x="2" y="12" width="20" height="4" rx="1" fill="#E3E5E9" /><rect x="2" y="20" width="16" height="4" rx="1" fill="#E3E5E9" />
        <circle cx="27" cy="19" r="7" stroke="#9197A1" strokeWidth="2" /><path d="M32 24l5 5" stroke="#9197A1" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: ff, fontSize: 15, color: '#767D8A', letterSpacing: ls }}>{text}</span>
    </div>
  );
}

function pageList(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 6, 7, '...', totalPages];
  if (page >= totalPages - 3) return [1, '...', totalPages - 6, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '...', page - 2, page - 1, page, page + 1, page + 2, '...', totalPages];
}

function PageButtons({ total, page, setPage, size }: { total: number; page: number; setPage: (p: number) => void; size: number }) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageBtn = (active: boolean): React.CSSProperties => ({ width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer', background: active ? '#F6F7F8' : 'transparent', fontFamily: active ? ffSemiBold : ff, fontWeight: active ? 600 : 400, fontSize: 15, color: active ? '#2E3238' : '#454B55', letterSpacing: ls, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 2 }}>
      {pageList(page, totalPages).map((p, i) => p === '...' ? (
        <div key={'e' + i} style={{ ...pageBtn(false), cursor: 'default' }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">{[3.5, 8, 12.5].map(cx => <circle key={cx} cx={cx} cy="8" r="1" fill="#454B55" />)}</svg>
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
  );
}

const PAGE_SIZE_OPTIONS = [200, 100, 50];

function Pagination({ total, page, setPage, size, setSize }: { total: number; page: number; setPage: (p: number) => void; size: number; setSize: (s: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div style={{ height: 64, borderTop: `1px solid ${BORDER}`, background: '#FFFFFF', position: 'relative', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: '50%', top: 11, transform: 'translateX(-50%)' }}>
        <PageButtons total={total} page={page} setPage={setPage} size={size} />
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

// ─── 폼 컴포넌트 ─────────────────────────────────────────────────────────────

function FormLabel({ children, required, desc }: { children: React.ReactNode; required?: boolean; desc?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
        <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>{children}</span>
        {required && <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#005FFF' }}>*</span>}
      </div>
      {desc && <span style={{ fontFamily: ff, fontSize: 12, lineHeight: '18px', letterSpacing: ls, color: '#767D8A', whiteSpace: 'pre-line' }}>{desc}</span>}
    </div>
  );
}

function FormField({ label, required, desc, error, children }: { label: string; required?: boolean; desc?: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FormLabel required={required} desc={desc}>{label}</FormLabel>
      {children}
      {error && <span style={{ fontFamily: ff, fontSize: 13, lineHeight: '18px', letterSpacing: ls, color: '#E23A3A' }}>{error}</span>}
    </div>
  );
}

const fieldTextStyle: React.CSSProperties = { fontFamily: ff, fontWeight: 400, fontSize: 16, lineHeight: '24px', letterSpacing: ls, color: '#2E3238' };

function TextField({ value, onChange, placeholder, required, error, inputMode }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div className={'wg-field' + (error ? ' wg-err' : '')} style={{ height: 44, padding: '6px 12px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: required ? '#F5F9FF' : '#F6F7F8', display: 'flex', alignItems: 'center', gap: 4 }}>
      <input className="wg-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} style={{ ...fieldTextStyle, flex: 1, minWidth: 0, height: 26, border: 'none', outline: 'none', background: 'transparent', padding: 0 }} />
      {error && value && (
        <button type="button" aria-label="지우기" onClick={() => onChange('')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" fill="#9197A1" /><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="wg-field" style={{ padding: '10px 12px', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 4, background: '#F6F7F8' }}>
      <textarea className="wg-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...fieldTextStyle, width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: 0, resize: 'none', display: 'block' }} />
    </div>
  );
}

// 체크박스 목록 — 전체 선택 + "선택/전체" 개수 + 검색. 업무그룹 추가, 소속 직원/운송사 추가·변경 모달에서 공용
type CheckItem = { id: string; label: React.ReactNode; search: string };

function CheckList({ items, selected, onChange, emptyText, height = 200 }: {
  items: CheckItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyText: string;
  height?: number;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const shown = q ? items.filter(it => it.search.includes(q)) : items;
  const allOn = items.length > 0 && items.every(it => selected.includes(it.id));
  const someOn = !allOn && selected.length > 0;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  if (items.length === 0) {
    return (
      <div style={{ height: height + 90, border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <AlertIcon />
        <span style={{ fontFamily: ff, fontSize: 14, color: '#767D8A', letterSpacing: ls }}>{emptyText}</span>
      </div>
    );
  }
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
      <div role="checkbox" aria-checked={allOn} onClick={() => onChange(allOn ? [] : items.map(it => it.id))} style={{ height: 40, padding: '0 12px 0 8px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}>
        <Checkbox on={allOn} partial={someOn} />
        <span style={{ flex: 1, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }}>전체 선택</span>
        <span style={{ fontFamily: ff, fontSize: 13, letterSpacing: ls, color: '#767D8A' }}>
          <b style={{ fontFamily: ffSemiBold, color: '#2E3238' }}>{selected.length}</b>/{items.length}
        </span>
      </div>
      <div style={{ padding: '8px 8px 4px' }}>
        <div className="wg-field" style={{ height: 36, padding: '0 10px', border: `1px solid ${BORDER}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <SearchIcon />
          <input className="wg-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="검색" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238' }} />
        </div>
      </div>
      <div className="wg-scroll" style={{ height, overflowY: 'auto', padding: '0 4px 4px' }}>
        {shown.length === 0 ? (
          <div style={{ padding: '10px 8px', fontFamily: ff, fontSize: 14, color: '#9197A1', letterSpacing: ls }}>검색 결과가 없습니다.</div>
        ) : shown.map(it => (
          <div key={it.id} className="wg-opt" role="checkbox" aria-checked={selected.includes(it.id)} onClick={() => toggle(it.id)} style={{ height: 40, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 4, cursor: 'pointer' }}>
            <Checkbox on={selected.includes(it.id)} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap', overflow: 'hidden' }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const sortedEmployees = (emps: Employee[]) => [...emps].sort((a, b) => ko(a.name, b.name));
const sortedPartners = (ps: TradePartner[]) => [...ps].sort((a, b) => ko(a.alias, b.alias));

function employeeItems(emps: Employee[]): CheckItem[] {
  return sortedEmployees(emps).map(e => ({
    id: e.id,
    search: `${e.name} ${e.phone}`,
    label: <>
      <span>{e.name}</span><span style={{ color: '#C7CBD1' }}>/</span><span>{e.phone}</span>
      {e.role && <GrayBadge>{e.role}</GrayBadge>}
    </>,
  }));
}

function carrierItems(carriers: TradePartner[]): CheckItem[] {
  return sortedPartners(carriers).map(p => ({
    id: String(p.id),
    search: p.alias,
    label: <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.alias}</span>{p.status === '거래중지' && <GrayBadge>거래중지</GrayBadge>}</>,
  }));
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

// ─── 업무그룹 기본 정보 폼 (추가/정보 수정 공용) ──────────────────────────────

type GroupDraft = { name: string; memo: string };

function useGroupDraft(initial: GroupDraft, selfId?: string) {
  const [draft, setDraft] = useState<GroupDraft>(initial);
  const [touched, setTouched] = useState(false);
  const name = draft.name.trim();
  const duplicate = name !== '' && getGroups().some(g => g.id !== selfId && g.name.trim() === name);
  const nameError = duplicate ? '동일한 업무그룹명이 존재합니다.' : touched && name === '' ? '업무그룹명을 입력해 주세요.' : '';
  const valid = name !== '' && !duplicate;
  const set = <K extends keyof GroupDraft>(key: K, v: GroupDraft[K]) => {
    setDraft(d => ({ ...d, [key]: v }));
    if (key === 'name') setTouched(true);
  };
  return { draft, set, nameError, valid };
}

function GroupFields({ form }: { form: ReturnType<typeof useGroupDraft> }) {
  const { draft, set, nameError } = form;
  return (
    <>
      <FormField label="업무그룹명" required error={nameError}>
        <TextField value={draft.name} onChange={v => set('name', v.slice(0, 20))} placeholder="ex. 동탄물류센터, 원자재팀" required error={!!nameError} />
      </FormField>
      <FormField label="업무그룹 설명">
        <TextArea value={draft.memo} onChange={v => set('memo', v.slice(0, 30))} placeholder="업무 그룹에 대한 상세 설명을 입력하세요." />
      </FormField>
    </>
  );
}

// ─── 업무그룹 추가 모달 ──────────────────────────────────────────────────────

function GroupAddModal({ employees, carriers, onClose, notify }: { employees: Employee[]; carriers: TradePartner[]; onClose: () => void; notify: Notify }) {
  const form = useGroupDraft({ name: '', memo: '' });
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [carrierIds, setCarrierIds] = useState<string[]>([]);

  const handleAdd = () => {
    if (!form.valid) return;
    const d = form.draft;
    // 세금계산서 이메일·인수증 설정·종사업장번호는 화면에서 빠져 회사 기본값으로 둔다
    const g = addGroup({ name: d.name.trim(), memo: d.memo.trim(), taxEmail: COMPANY_TAX_EMAIL, receiptSetting: '원본/사진 필수', subBizNumber: '', carrierIds: carrierIds.map(Number) });
    if (memberIds.length) setGroupMembers(g.id, memberIds);
    notify('업무그룹을 추가했습니다.');
    onClose();
  };

  return (
    <Modal title="업무그룹 추가" width={784} onClose={onClose} name="work-group-add-modal" footer={<>
      <span style={{ flex: 1 }} />
      <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
      <ModalButton primary h={52} size={18} px={20} disabled={!form.valid} onClick={handleAdd}>업무그룹 추가</ModalButton>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GroupFields form={form} />
        {/* 소속 직원 · 위탁 가능한 협력사 목록은 좌우로 나란히 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="소속 직원">
            <CheckList items={employeeItems(employees)} selected={memberIds} onChange={setMemberIds} emptyText="소속된 직원이 없습니다." height={202} />
          </FormField>
          <FormField label="위탁 가능한 협력사">
            <CheckList items={carrierItems(carriers)} selected={carrierIds} onChange={setCarrierIds} emptyText="계약된 협력사가 없습니다." height={202} />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}

// ─── 업무그룹 정보 수정 모달 ─────────────────────────────────────────────────

function GroupEditModal({ group, onClose, notify }: { group: WorkGroup; onClose: () => void; notify: Notify }) {
  const initial: GroupDraft = { name: group.name, memo: group.memo };
  const form = useGroupDraft(initial, group.id);
  const d = form.draft;
  const changed = (Object.keys(initial) as (keyof GroupDraft)[]).some(k => d[k] !== initial[k]);

  const handleSave = () => {
    if (!form.valid || !changed) return;
    updateGroup(group.id, { name: d.name.trim(), memo: d.memo.trim() });
    notify('업무그룹 정보를 수정했습니다.');
    onClose();
  };

  return (
    <Modal title="업무그룹 정보 수정" width={466} onClose={onClose} name="work-group-edit-modal" z={1} footer={<>
      <span style={{ flex: 1 }} />
      <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
      <ModalButton primary h={52} size={18} px={20} disabled={!form.valid || !changed} onClick={handleSave}>수정</ModalButton>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <GroupFields form={form} />
      </div>
    </Modal>
  );
}

// ─── 소속 직원 / 이용 가능한 운송사 추가·변경 모달 ────────────────────────────
// 현재 0명(0개)이면 "추가", 아니면 "변경"으로 타이틀·버튼·토스트를 표기한다.

function PickerModal({ title, items, initial, emptyText, onClose, onSubmit }: {
  title: string;
  items: CheckItem[];
  initial: string[];
  emptyText: string;
  onClose: () => void;
  onSubmit: (ids: string[], verb: '추가' | '변경') => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const verb = initial.length === 0 ? '추가' : '변경';
  const enabled = verb === '추가' ? selected.length > 0 : !sameSet(selected, initial);
  return (
    <Modal title={`${title} ${verb}`} width={460} onClose={onClose} name="work-group-picker-modal" z={1} footer={<>
      <span style={{ flex: 1 }} />
      <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
      <ModalButton primary h={52} size={18} px={20} disabled={!enabled} onClick={() => { onSubmit(selected, verb); onClose(); }}>{verb}</ModalButton>
    </>}>
      <CheckList items={items} selected={selected} onChange={setSelected} emptyText={emptyText} height={400} />
    </Modal>
  );
}

// ─── 업무그룹 삭제 모달 ──────────────────────────────────────────────────────

function GroupDeleteModal({ group, groups, onClose, onDeleted, notify }: { group: WorkGroup; groups: WorkGroup[]; onClose: () => void; onDeleted: () => void; notify: Notify }) {
  const targets = groups.filter(g => g.id !== group.id);
  const [moveTo, setMoveTo] = useState(getDefaultGroup()?.id ?? targets[0]?.id ?? '');
  const handleDelete = () => {
    if (!moveTo) return;
    deleteGroup(group.id, moveTo);
    replaceGroupInPartners(group.id, moveTo);
    notify('업무그룹을 삭제했습니다.');
    onDeleted();
  };
  return (
    <Modal title="업무그룹 삭제" width={440} onClose={onClose} name="work-group-delete-modal" z={1} footer={<>
      <span style={{ flex: 1 }} />
      <ModalButton ghost h={44} onClick={onClose}>취소</ModalButton>
      <ModalButton danger h={44} disabled={!moveTo} onClick={handleDelete}>삭제</ModalButton>
    </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#454B55' }}>
          {`'${group.name}' 업무그룹을 삭제합니다.`}<br />소속 직원과 담당 거래처를 이동시킬 업무그룹을 선택해 주세요.
        </p>
        <FormField label="업무그룹" required>
          <select value={moveTo} onChange={e => setMoveTo(e.target.value)} style={{ height: 44, padding: '0 36px 0 12px', border: `1px solid ${BORDER}`, borderRadius: 4, background: `${selArrow} no-repeat right 14px center, #F5F9FF`, appearance: 'none', cursor: 'pointer', outline: 'none', fontFamily: ff, fontSize: 16, letterSpacing: ls, color: '#2E3238' }}>
            {targets.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </FormField>
      </div>
    </Modal>
  );
}

// ─── 업무그룹 정보 (상세) 모달 ───────────────────────────────────────────────

type MemberSearch = '직원명' | '직함/직책' | '휴대전화번호' | '업무 전화번호' | '이메일';
const MEMBER_SEARCH_TYPES: MemberSearch[] = ['직원명', '직함/직책', '휴대전화번호', '업무 전화번호', '이메일'];
type CarrierSearch = '협력사명' | '사업자등록번호' | '사업장 주소';
const CARRIER_SEARCH_TYPES: CarrierSearch[] = ['협력사명', '사업자등록번호', '사업장 주소'];
type PartnerSearch = '거래처명' | '사업자등록번호' | '사업장 주소';
const PARTNER_SEARCH_TYPES: PartnerSearch[] = ['거래처명', '사업자등록번호', '사업장 주소'];
const DETAIL_PAGE_SIZE = 10;

function memberField(e: Employee, t: MemberSearch) {
  return t === '직원명' ? e.name : t === '직함/직책' ? (e.title || '') : t === '휴대전화번호' ? e.phone : t === '업무 전화번호' ? (e.workPhone || '') : e.email;
}
function carrierField(p: TradePartner, t: CarrierSearch | PartnerSearch) {
  return t === '협력사명' || t === '거래처명' ? `${p.alias} ${p.bizName}` : t === '사업자등록번호' ? p.bizNumber : [p.address, p.addressDetail].join(' ');
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
      <span style={{ width: 110, flexShrink: 0, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: '#767D8A' }}>{label}</span>
      <span title={value} style={{ minWidth: 0, fontFamily: ff, fontSize: 15, letterSpacing: ls, color: value ? '#2E3238' : '#C7CBD1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '-'}</span>
    </div>
  );
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ height: 36, padding: '0 12px', borderRadius: 4, border: `1px solid ${BORDER}`, background: '#FFFFFF', cursor: 'pointer', flexShrink: 0, fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function GroupDetailModal({ group, groups, employees, partners, carriers, onClose, notify }: {
  group: WorkGroup;
  groups: WorkGroup[];
  employees: Employee[];
  partners: TradePartner[];
  carriers: TradePartner[];
  onClose: () => void;
  notify: Notify;
}) {
  const [tab, setTab] = useState<'member' | 'partner' | 'carrier'>('member');
  const [sub, setSub] = useState<'edit' | 'members' | 'carriers' | 'delete' | null>(null);

  // 소속 직원 탭
  const members = sortedEmployees(employees.filter(e => e.groupIds.includes(group.id)));
  const [mType, setMType] = useState<MemberSearch>('직원명');
  const [mKeyword, setMKeyword] = useState('');
  const [mApplied, setMApplied] = useState({ type: '직원명' as MemberSearch, keyword: '' });
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [mPage, setMPage] = useState(1);
  const memberRows = members.filter(e => {
    if (mApplied.keyword && !memberField(e, mApplied.type).toLowerCase().includes(mApplied.keyword.toLowerCase())) return false;
    if (roleFilter.length && !roleFilter.includes(e.role || '')) return false;
    return true;
  });

  // 담당하는 거래처 탭 — 거래처 상세 > 담당 업무그룹에 이 그룹이 지정된 거래처
  const groupPartners = sortedPartners(partners.filter(p => (p.assignedGroupIds || []).includes(group.id)));
  const [pType, setPType] = useState<PartnerSearch>('거래처명');
  const [pKeyword, setPKeyword] = useState('');
  const [pApplied, setPApplied] = useState({ type: '거래처명' as PartnerSearch, keyword: '' });
  const [pPage, setPPage] = useState(1);
  const partnerRows = groupPartners.filter(p => !pApplied.keyword || carrierField(p, pApplied.type).toLowerCase().includes(pApplied.keyword.toLowerCase()));
  const pPageClamped = Math.min(pPage, Math.max(1, Math.ceil(partnerRows.length / DETAIL_PAGE_SIZE)));

  // 위탁 가능한 협력사 탭
  const groupCarriers = sortedPartners(carriers.filter(p => group.carrierIds.includes(p.id)));
  const [cType, setCType] = useState<CarrierSearch>('협력사명');
  const [cKeyword, setCKeyword] = useState('');
  const [cApplied, setCApplied] = useState({ type: '협력사명' as CarrierSearch, keyword: '' });
  const [cPage, setCPage] = useState(1);
  const carrierRows = groupCarriers.filter(p => !cApplied.keyword || carrierField(p, cApplied.type).toLowerCase().includes(cApplied.keyword.toLowerCase()));

  const mPageClamped = Math.min(mPage, Math.max(1, Math.ceil(memberRows.length / DETAIL_PAGE_SIZE)));
  const cPageClamped = Math.min(cPage, Math.max(1, Math.ceil(carrierRows.length / DETAIL_PAGE_SIZE)));
  const memberVerb = members.length === 0 ? '추가' : '변경';
  const carrierVerb = groupCarriers.length === 0 ? '추가' : '변경';

  const tabBtn = (key: 'member' | 'partner' | 'carrier', label: string) => {
    const on = tab === key;
    return (
      <button key={key} type="button" className="wg-tab" onClick={() => setTab(key)} style={{ height: 44, padding: '0 12px', border: 'none', borderBottom: `2px solid ${on ? '#2E3238' : 'transparent'}`, background: 'none', cursor: 'pointer', marginBottom: -1 }}>
        <span style={{ fontFamily: on ? ffSemiBold : ff, fontWeight: on ? 600 : 400, fontSize: 16, letterSpacing: ls, color: on ? '#2E3238' : '#767D8A' }}>{label}</span>
      </button>
    );
  };

  return (
    <>
      <Modal title="업무그룹 정보" width={886} onClose={sub ? () => {} : onClose} name="work-group-detail-modal" footer={<>
        {!group.isDefault && <ModalButton h={52} size={18} px={20} onClick={() => setSub('delete')}>업무그룹 삭제</ModalButton>}
        <span style={{ flex: 1 }} />
        <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
      </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 기본 정보 */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: ffBold, fontWeight: 700, fontSize: 18, letterSpacing: ls, color: '#2E3238' }}>{group.name}</span>
              {group.isDefault && <GrayBadge>기본</GrayBadge>}
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setSub('edit')} style={{ height: 28, padding: '0 8px', borderRadius: 2, border: `1px solid ${BORDER}`, background: '#FFFFFF', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, color: '#2E3238' }}>정보 수정</button>
            </div>
            <InfoItem label="업무그룹 설명" value={group.memo} />
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            {tabBtn('member', '소속 직원')}
            {tabBtn('partner', '담당하는 거래처')}
            {tabBtn('carrier', '위탁 가능한 협력사')}
          </div>

          {tab === 'member' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SearchBox types={MEMBER_SEARCH_TYPES} type={mType} setType={t => setMType(t as MemberSearch)} keyword={mKeyword} setKeyword={setMKeyword} onSearch={() => { setMApplied({ type: mType, keyword: mKeyword.trim() }); setMPage(1); }} selectWidth={134} />
                <MultiFilterChip label="권한" options={EMPLOYEE_ROLES.map(r => ({ v: r, l: r }))} values={roleFilter} onChange={v => { setRoleFilter(v); setMPage(1); }} width={160} />
                <span style={{ flex: 1 }} />
                <SmallButton onClick={() => setSub('members')}>{`소속 직원 ${memberVerb}`}</SmallButton>
              </div>
              <div style={{ borderLeft: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex' }}>
                  <Th label="번호" width={60} /><Th label="직원명" width={170} /><Th label="휴대전화번호" width={140} /><Th label="업무 전화번호" width={140} /><Th label="이메일" flex minWidth={160} /><Th label="권한" width={120} />
                </div>
                {memberRows.length === 0 ? <EmptyRows text={members.length === 0 ? '소속된 직원이 없습니다.' : '검색 결과가 없습니다.'} /> :
                  memberRows.slice((mPageClamped - 1) * DETAIL_PAGE_SIZE, mPageClamped * DETAIL_PAGE_SIZE).map((e, i) => (
                    <div key={e.id} style={{ display: 'flex' }}>
                      <Td width={60} align="center">{(mPageClamped - 1) * DETAIL_PAGE_SIZE + i + 1}</Td>
                      <Td width={170}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                            {e.title && <span style={{ fontFamily: ff, fontSize: 12, lineHeight: '16px', letterSpacing: ls, color: '#767D8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>}
                          </div>
                          {e.suspended && <GrayBadge>권한정지</GrayBadge>}
                        </div>
                      </Td>
                      <Td width={140}>{e.phone}</Td>
                      <Td width={140}>{e.workPhone || '-'}</Td>
                      <Td flex minWidth={160}>{e.email}</Td>
                      <Td width={120}>{e.role || '-'}</Td>
                    </div>
                  ))}
              </div>
              {memberRows.length > DETAIL_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center' }}><PageButtons total={memberRows.length} page={mPageClamped} setPage={setMPage} size={DETAIL_PAGE_SIZE} /></div>
              )}
            </div>
          ) : tab === 'partner' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 36 }}>
                <SearchBox types={PARTNER_SEARCH_TYPES} type={pType} setType={t => setPType(t as PartnerSearch)} keyword={pKeyword} setKeyword={setPKeyword} onSearch={() => { setPApplied({ type: pType, keyword: pKeyword.trim() }); setPPage(1); }} selectWidth={140} />
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: ff, fontSize: 13, letterSpacing: ls, color: '#767D8A' }}>담당 업무그룹은 거래처 관리 &gt; 거래처 상세에서 지정해요.</span>
              </div>
              <div style={{ borderLeft: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex' }}>
                  <Th label="번호" width={60} /><Th label="거래처명" width={220} /><Th label="거래처 유형" width={100} /><Th label="사업자등록번호" width={140} /><Th label="사업장 주소" flex minWidth={180} />
                </div>
                {partnerRows.length === 0 ? <EmptyRows text={groupPartners.length === 0 ? '담당하는 거래처가 없습니다.' : '검색 결과가 없습니다.'} /> :
                  partnerRows.slice((pPageClamped - 1) * DETAIL_PAGE_SIZE, pPageClamped * DETAIL_PAGE_SIZE).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex' }}>
                      <Td width={60} align="center">{(pPageClamped - 1) * DETAIL_PAGE_SIZE + i + 1}</Td>
                      <Td width={220}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span title={p.alias} style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.alias}</span>
                            {p.bizName !== p.alias && <span style={{ fontFamily: ff, fontSize: 12, lineHeight: '16px', letterSpacing: ls, color: '#767D8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bizName}</span>}
                          </div>
                          {p.status === '거래중지' && <GrayBadge>거래중지</GrayBadge>}
                        </div>
                      </Td>
                      <Td width={100}>{p.partnerType}</Td>
                      <Td width={140}>{p.bizNumber}</Td>
                      <Td flex minWidth={180}>{[p.address, p.addressDetail].filter(Boolean).join(', ')}</Td>
                    </div>
                  ))}
              </div>
              {partnerRows.length > DETAIL_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center' }}><PageButtons total={partnerRows.length} page={pPageClamped} setPage={setPPage} size={DETAIL_PAGE_SIZE} /></div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SearchBox types={CARRIER_SEARCH_TYPES} type={cType} setType={t => setCType(t as CarrierSearch)} keyword={cKeyword} setKeyword={setCKeyword} onSearch={() => { setCApplied({ type: cType, keyword: cKeyword.trim() }); setCPage(1); }} selectWidth={140} />
                <span style={{ flex: 1 }} />
                <SmallButton onClick={() => setSub('carriers')}>{`협력사 ${carrierVerb}`}</SmallButton>
              </div>
              <div style={{ borderLeft: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex' }}>
                  <Th label="번호" width={60} /><Th label="협력사명" width={240} /><Th label="사업자등록번호" width={140} /><Th label="사업장 주소" flex minWidth={200} />
                </div>
                {carrierRows.length === 0 ? <EmptyRows text={groupCarriers.length === 0 ? '위탁 가능한 협력사가 없습니다.' : '검색 결과가 없습니다.'} /> :
                  carrierRows.slice((cPageClamped - 1) * DETAIL_PAGE_SIZE, cPageClamped * DETAIL_PAGE_SIZE).map((p, i) => (
                    <div key={p.id} style={{ display: 'flex' }}>
                      <Td width={60} align="center">{(cPageClamped - 1) * DETAIL_PAGE_SIZE + i + 1}</Td>
                      <Td width={240}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span title={p.alias} style={{ fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.alias}</span>
                            {p.bizName !== p.alias && <span style={{ fontFamily: ff, fontSize: 12, lineHeight: '16px', letterSpacing: ls, color: '#767D8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bizName}</span>}
                          </div>
                          {p.status === '거래중지' && <GrayBadge>거래중지</GrayBadge>}
                        </div>
                      </Td>
                      <Td width={140}>{p.bizNumber}</Td>
                      <Td flex minWidth={200}>{[p.address, p.addressDetail].filter(Boolean).join(', ')}</Td>
                    </div>
                  ))}
              </div>
              {carrierRows.length > DETAIL_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center' }}><PageButtons total={carrierRows.length} page={cPageClamped} setPage={setCPage} size={DETAIL_PAGE_SIZE} /></div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {sub === 'edit' && <GroupEditModal group={group} onClose={() => setSub(null)} notify={notify} />}
      {sub === 'members' && (
        <PickerModal
          title="소속 직원"
          items={employeeItems(employees)}
          initial={members.map(e => e.id)}
          emptyText="소속된 직원이 없습니다."
          onClose={() => setSub(null)}
          onSubmit={(ids, verb) => { setGroupMembers(group.id, ids); notify(`소속 직원을 ${verb}했습니다.`); }}
        />
      )}
      {sub === 'carriers' && (
        <PickerModal
          title="위탁 가능한 협력사"
          items={carrierItems(carriers)}
          initial={group.carrierIds.map(String)}
          emptyText="위탁 가능한 협력사가 없습니다."
          onClose={() => setSub(null)}
          onSubmit={(ids, verb) => { updateGroup(group.id, { carrierIds: ids.map(Number) }); notify(`위탁 가능한 협력사를 ${verb}했습니다.`); }}
        />
      )}
      {sub === 'delete' && <GroupDeleteModal group={group} groups={groups} onClose={() => setSub(null)} onDeleted={() => { setSub(null); onClose(); }} notify={notify} />}
    </>
  );
}

// ─── 거래처 공유 설정 모달 ───────────────────────────────────────────────────
// 우리 업무그룹을 공유할 거래처를 고른다. 왼쪽(전체 거래처)에서 체크 → [추가 >], 오른쪽에서 체크 → [< 제외]

function TransferList({ title, items, checked, onCheck, markRegistered }: { title: string; items: TradePartner[]; checked: string[]; onCheck: (ids: string[]) => void; markRegistered?: boolean }) {
  // 가입 거래처 중 우리를 거래처로 등록해 업무그룹을 공유해 준 곳
  const list: CheckItem[] = sortedPartners(items).map(p => ({
    id: String(p.id),
    search: p.alias,
    label: <><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.alias}</span>{markRegistered && p.tTrucker && (p.sharedGroups || []).length > 0 && <GrayBadge>나를 등록한 거래처</GrayBadge>}</>,
  }));
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FormLabel>{title}</FormLabel>
      <CheckList items={list} selected={checked} onChange={onCheck} emptyText="거래처가 없습니다." height={420} />
    </div>
  );
}

function ShareSettingModal({ partners, onClose, notify }: { partners: TradePartner[]; onClose: () => void; notify: Notify }) {
  const initial = getSharedPartnerIds();
  const [shared, setShared] = useState<number[]>(initial);
  const [leftChecked, setLeftChecked] = useState<string[]>([]);
  const [rightChecked, setRightChecked] = useState<string[]>([]);
  const left = partners.filter(p => !shared.includes(p.id));
  const right = partners.filter(p => shared.includes(p.id));
  const changed = !sameSet(shared.map(String), initial.map(String));

  const moveRight = () => { setShared(s => [...s, ...leftChecked.map(Number)]); setLeftChecked([]); };
  const moveLeft = () => { setShared(s => s.filter(id => !rightChecked.includes(String(id)))); setRightChecked([]); };
  const arrowBtn = (label: React.ReactNode, onClick: () => void, disabled: boolean) => (
    <button type="button" onClick={onClick} disabled={disabled} style={{ width: 70, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: disabled ? 'default' : 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, color: disabled ? '#C7CBD1' : '#2E3238' }}>{label}</button>
  );

  return (
    <Modal title="거래처 공유 설정" width={1000} onClose={onClose} name="partner-share-modal" footer={<>
      <span style={{ flex: 1 }} />
      <ModalButton ghost h={52} size={18} px={20} onClick={onClose}>닫기</ModalButton>
      <ModalButton primary h={52} size={18} px={20} disabled={!changed} onClick={() => { setSharedPartnerIds(shared); notify('거래처 공유 설정을 저장했습니다.'); onClose(); }}>저장</ModalButton>
    </>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <TransferList title="전체 거래처" items={left} checked={leftChecked} onCheck={setLeftChecked} markRegistered />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 26 }}>
          {arrowBtn(<>추가<Chevron size={12} dir="right" color={leftChecked.length ? '#2E3238' : '#C7CBD1'} /></>, moveRight, leftChecked.length === 0)}
          {arrowBtn(<><Chevron size={12} dir="left" color={rightChecked.length ? '#2E3238' : '#C7CBD1'} />제외</>, moveLeft, rightChecked.length === 0)}
        </div>
        <TransferList title="업무그룹을 공유할 거래처" items={right} checked={rightChecked} onCheck={setRightChecked} />
      </div>
    </Modal>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

type ListSearch = '업무그룹명';
const LIST_SEARCH_TYPES: ListSearch[] = ['업무그룹명'];
const COL_WIDTHS = { no: 50, name: 310 };

function GroupTable({ rows, offset, employees, partners, onRowClick }: { rows: WorkGroup[]; offset: number; employees: Employee[]; partners: TradePartner[]; onRowClick: (g: WorkGroup) => void }) {
  return (
    <div className="wg-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', marginTop: 12, borderLeft: `1px solid ${BORDER}` }}>
      <div style={{ minWidth: 1000 }}>
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, borderTop: `1px solid ${BORDER}` }}>
          <Th label="번호" width={COL_WIDTHS.no} />
          <Th label="업무그룹명" width={COL_WIDTHS.name} />
          <Th label="소속 직원" flex minWidth={300} />
          <Th label="담당 거래처" flex minWidth={240} />
        </div>
        {rows.map((g, i) => {
          const members = sortedEmployees(employees.filter(e => e.groupIds.includes(g.id))).map(e => e.name);
          const assigned = sortedPartners(partners.filter(p => p.assignedGroupIds.includes(g.id))).map(p => p.alias);
          return (
            <div key={g.id} onClick={() => onRowClick(g)} className="wg-row" style={{ display: 'flex', cursor: 'pointer', background: '#FFFFFF' }}>
              <Td width={COL_WIDTHS.no} align="center">{offset + i + 1}</Td>
              <Td width={COL_WIDTHS.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span title={g.name} style={{ fontFamily: ff, fontSize: 15, lineHeight: '22px', letterSpacing: ls, color: '#2E3238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  {g.isDefault && <GrayBadge>기본</GrayBadge>}
                </div>
              </Td>
              <Td flex minWidth={300}><NameListCell unit="명" names={members} /></Td>
              <Td flex minWidth={240}><NameListCell unit="개" names={assigned} /></Td>
            </div>
          );
        })}
        {rows.length === 0 && <EmptyRows text="검색 결과가 없습니다." height={160} />}
      </div>
    </div>
  );
}

export default function EopmuGroupManagement() {
  const [groups, setGroups] = useState<WorkGroup[]>(() => getGroups());
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [partners, setPartners] = useState<TradePartner[]>(() => getPartners());
  useEffect(() => subscribeCompany(() => { setGroups(getGroups()); setEmployees(getEmployees()); }), []);
  useEffect(() => subscribePartners(() => setPartners(getPartners())), []);

  const [searchType, setSearchType] = useState<ListSearch>('업무그룹명');
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState({ type: '업무그룹명' as ListSearch, keyword: '' });
  const [memberFilter, setMemberFilter] = useState<string[]>([]);
  const [partnerFilter, setPartnerFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [modal, setModal] = useState<'add' | 'share' | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const notify: Notify = (msg, tone = 'dark') => setToast({ msg, tone });
  const closeToast = useCallback(() => setToast(null), []);

  const carriers = partners.filter(p => p.partnerType === '협력사');

  // 기본그룹을 맨 앞에, 나머지는 등록 순
  const ordered = [...groups.filter(g => g.isDefault), ...groups.filter(g => !g.isDefault)];
  // 필터: 한 필터 안에서는 OR, 서로 다른 필터끼리는 AND
  const filtered = ordered.filter(g => {
    if (applied.keyword) {
      if (!g.name.toLowerCase().includes(applied.keyword.toLowerCase())) return false;
    }
    if (memberFilter.length && !employees.some(e => memberFilter.includes(e.id) && e.groupIds.includes(g.id))) return false;
    if (partnerFilter.length && !partners.some(p => partnerFilter.includes(String(p.id)) && p.assignedGroupIds.includes(g.id))) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasCondition = applied.keyword !== '' || memberFilter.length > 0 || partnerFilter.length > 0;
  const resetAll = () => { setKeyword(''); setApplied({ type: searchType, keyword: '' }); setMemberFilter([]); setPartnerFilter([]); setPage(1); };

  const detailGroup = detailId ? groups.find(g => g.id === detailId) ?? null : null;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <style>{LIST_CSS}</style>
      <SharedLnb activeTabIndex={11} />
      <div data-name="work-group-management" style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 24px 0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 44, marginTop: 36, flexShrink: 0 }}>
            <span style={{ fontFamily: ffBold, fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: ls, color: '#000000' }}>업무그룹 관리</span>
            <button type="button" onClick={() => setModal('share')} style={{ height: 32, padding: '0 4px', display: 'flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 4, background: 'none', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, color: '#2E3238' }}>
              <GearIcon />거래처 공유 설정
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexShrink: 0, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setModal('add')} style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${BORDER}`, borderRadius: 4, background: '#FFFFFF', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 15, letterSpacing: ls, color: '#2E3238', whiteSpace: 'nowrap' }}>
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" /></svg>
              업무그룹 추가
            </button>
            <SearchBox types={LIST_SEARCH_TYPES} type={searchType} setType={t => setSearchType(t as ListSearch)} keyword={keyword} setKeyword={setKeyword} onSearch={() => { setApplied({ type: searchType, keyword: keyword.trim() }); setPage(1); }} selectWidth={150} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MultiFilterChip label="소속 직원" options={sortedEmployees(employees).map(e => ({ v: e.id, l: e.name }))} values={memberFilter} onChange={v => { setMemberFilter(v); setPage(1); }} searchPlaceholder="소속 직원 검색" />
              <MultiFilterChip label="담당 거래처" options={sortedPartners(partners).map(p => ({ v: String(p.id), l: p.alias }))} values={partnerFilter} onChange={v => { setPartnerFilter(v); setPage(1); }} searchPlaceholder="거래처 검색" width={240} />
            </div>
            {hasCondition && (
              <>
                <div style={{ width: 1, height: 16, background: BORDER }} />
                <button type="button" onClick={resetAll} style={{ height: 32, padding: '0 4px', display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontFamily: ffSemiBold, fontWeight: 600, fontSize: 14, letterSpacing: ls, color: '#2E3238' }}>
                  <ResetIcon />초기화
                </button>
              </>
            )}
          </div>
          <GroupTable rows={rows} offset={(currentPage - 1) * pageSize} employees={employees} partners={partners} onRowClick={g => setDetailId(g.id)} />
        </div>
        <Pagination total={filtered.length} page={currentPage} setPage={setPage} size={pageSize} setSize={setPageSize} />
      </div>

      {modal === 'add' && <GroupAddModal employees={employees} carriers={carriers} onClose={() => setModal(null)} notify={notify} />}
      {modal === 'share' && <ShareSettingModal partners={sortedPartners(partners)} onClose={() => setModal(null)} notify={notify} />}
      {detailGroup && (
        <GroupDetailModal
          key={detailGroup.id}
          group={detailGroup}
          groups={ordered}
          employees={employees}
          partners={partners}
          carriers={carriers}
          onClose={() => setDetailId(null)}
          notify={notify}
        />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
