import { useState, useEffect } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type SubTradeStatus, type Subcontractor, type BizRecord,
  MOCK_BIZ_REGISTRY,
  getSubcontractors, addSubcontractor, updateSubcontractor, subscribeSubcontractors,
} from "../shared/witaksaStore";
import { type WorkGroup, getGroups, subscribeCompany } from "../shared/companyStore";

const ff = "'Pretendard GOV:Regular'";
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

// ─── Shared style helpers ───────────────────────────────────────────────────

const inputBase: React.CSSProperties = { width: '100%', height: 36, padding: '0 12px', fontSize: 15, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' };
const textareaBase: React.CSSProperties = { ...inputBase, height: 72, padding: '8px 12px', resize: 'vertical' as const };

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
      <span style={{ width: 100, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '-0.01em', paddingTop: 9 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 16, fontWeight: 700, color: '#2E3238', letterSpacing: '-0.02em', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E4E5E9' }}>
      {children}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ModalShell({ title, badge, onClose, children, footer, width = 640 }: {
  title: string;
  badge?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  width?: number;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={onClose}>
      <div style={{ width, maxHeight: '88vh', background: '#FFFFFF', borderRadius: 12, display: 'flex', flexDirection: 'column', fontFamily: ff, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E4E5E9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', fontFamily: "'Pretendard GOV:Bold'" }}>{title}</span>
            {badge && <span style={{ fontSize: 13, fontWeight: 600, color: '#454B55', background: '#EBEDEF', borderRadius: 4, padding: '0 6px', height: 26, display: 'inline-flex', alignItems: 'center' }}>{badge}</span>}
          </div>
          <div onClick={onClose} style={{ cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon />
          </div>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>{footer}</div>
      </div>
    </div>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '0 20px', height: 40, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E4E5E9', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '0 20px', height: 40, background: disabled ? '#C7CBD1' : '#005FFF', borderRadius: 4, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em' }}
    >
      {children}
    </button>
  );
}

// ─── 사업자정보 자동완성 ─────────────────────────────────────────────────────

function BizAutocomplete({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect: (rec: BizRecord) => void }) {
  const [focused, setFocused] = useState(false);
  const q = value.trim();
  const results = q === '' ? [] : MOCK_BIZ_REGISTRY.filter(r => r.bizName.includes(q) || r.bizNumber.includes(q)).slice(0, 5);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="사업자명 또는 사업자번호로 검색"
          style={{ ...inputBase, paddingRight: 32 }}
        />
        {value !== '' && (
          <div onClick={() => onChange('')} style={{ position: 'absolute', right: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="7" fill="#C7CBD1" />
              <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      {focused && results.length > 0 && (
        <div style={{ position: 'absolute', top: 40, left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 20, maxHeight: 280, overflowY: 'auto' }}>
          {results.map(rec => (
            <div
              key={rec.bizNumber}
              onMouseDown={() => onSelect(rec)}
              style={{ padding: '12px 14px', borderBottom: '1px solid #F1F2F4', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2E3238', marginBottom: 4 }}>{rec.bizName}</div>
              <div style={{ fontSize: 13, color: '#5C6370', marginBottom: 6 }}>{rec.address}{rec.addressDetail ? ` (${rec.addressDetail})` : ''}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 4, background: '#F1F2F4', fontSize: 12, color: '#5C6370' }}>
                <span style={{ color: '#9197A1' }}>사업자번호</span> {rec.bizNumber}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 담당 업무그룹 다중선택 ──────────────────────────────────────────────────

function GroupMultiSelect({ ourGroups, selected, onToggle }: { ourGroups: WorkGroup[]; selected: string[]; onToggle: (id: string) => void }) {
  if (ourGroups.length === 0) {
    return <div style={{ color: '#F04949', fontSize: 14, fontFamily: ff }}>등록된 업무그룹이 없습니다. 회사 &gt; 업무그룹 관리에서 먼저 등록해 주세요.</div>;
  }
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ourGroups.map(g => {
          const checked = selected.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggle(g.id)}
              style={{
                height: 32, padding: '0 14px', borderRadius: 20, cursor: 'pointer',
                border: checked ? '1px solid #005FFF' : '1px solid #E4E5E9',
                background: checked ? '#E6EFFF' : '#FFFFFF',
                color: checked ? '#005FFF' : '#5C6370',
                fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, letterSpacing: '-0.02em',
              }}
            >
              {g.name}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <div style={{ marginTop: 6, color: '#F04949', fontSize: 13, fontFamily: ff }}>담당 업무그룹은 최소 1개 지정해야 합니다.</div>
      )}
    </>
  );
}

// ─── 위탁사등록 모달 ─────────────────────────────────────────────────────────

function WitaksaRegisterModal({ onClose, onRegister }: { onClose: () => void; onRegister: (s: Subcontractor) => void }) {
  const [bizQuery, setBizQuery] = useState('');
  const [selectedBiz, setSelectedBiz] = useState<BizRecord | null>(null);
  const [addressDetail, setAddressDetail] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizItem, setBizItem] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [contact, setContact] = useState('');
  const [taxEmail, setTaxEmail] = useState('');
  const [ourGroups] = useState<WorkGroup[]>(() => getGroups());
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);

  const handleSelectBiz = (rec: BizRecord) => {
    setSelectedBiz(rec);
    setBizQuery(rec.bizName);
    setAddressDetail(rec.addressDetail);
    setBizType(rec.bizType);
    setBizItem(rec.bizItem);
  };

  const toggleGroup = (id: string) => {
    setAssignedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const canRegister = selectedBiz !== null && assignedGroupIds.length > 0;

  const handleRegister = () => {
    if (!selectedBiz || assignedGroupIds.length === 0) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const registeredAt = `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newSub: Subcontractor = {
      id: Date.now(),
      status: '정상',
      alias: selectedBiz.bizName,
      bizName: selectedBiz.bizName,
      bizNumber: selectedBiz.bizNumber,
      address: selectedBiz.address,
      addressDetail,
      bizType,
      bizItem,
      ceoName,
      contact,
      taxEmail,
      memo: '',
      registeredAt,
      assignedGroupIds,
    };
    onRegister(newSub);
    onClose();
  };

  return (
    <ModalShell
      title="위탁사등록"
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleRegister} disabled={!canRegister}>위탁사등록</PrimaryButton>
      </>}
    >
      <SectionTitle>사업자정보</SectionTitle>
      <FieldRow label="사업자정보">
        <BizAutocomplete value={bizQuery} onChange={v => { setBizQuery(v); if (selectedBiz && v !== selectedBiz.bizName) setSelectedBiz(null); }} onSelect={handleSelectBiz} />
      </FieldRow>
      <FieldRow label="사업자번호">
        <input value={selectedBiz?.bizNumber ?? ''} readOnly style={{ ...inputBase, background: '#F6F7F8', color: '#5C6370' }} />
      </FieldRow>

      <SectionTitle>상세정보</SectionTitle>
      <FieldRow label="기본주소">
        <input value={selectedBiz?.address ?? ''} readOnly style={{ ...inputBase, background: '#F6F7F8', color: '#5C6370' }} />
      </FieldRow>
      <FieldRow label="상세주소">
        <input value={addressDetail} onChange={e => setAddressDetail(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="업태">
        <input value={bizType} onChange={e => setBizType(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="종목">
        <input value={bizItem} onChange={e => setBizItem(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="대표자명">
        <input value={ceoName} onChange={e => setCeoName(e.target.value)} placeholder="대표자명을 입력해 주세요" style={inputBase} />
      </FieldRow>
      <FieldRow label="연락처">
        <input value={contact} onChange={e => setContact(e.target.value)} placeholder="010-0000-0000" style={inputBase} />
      </FieldRow>
      <FieldRow label="세금계산서 이메일">
        <input value={taxEmail} onChange={e => setTaxEmail(e.target.value)} placeholder="tax@example.com" style={inputBase} />
      </FieldRow>
      <FieldRow label="담당 업무그룹">
        <GroupMultiSelect ourGroups={ourGroups} selected={assignedGroupIds} onToggle={toggleGroup} />
      </FieldRow>
    </ModalShell>
  );
}

// ─── 위탁사 상세 모달 ────────────────────────────────────────────────────────

function WitaksaDetailModal({ sub, onClose, onSave }: { sub: Subcontractor; onClose: () => void; onSave: (s: Subcontractor) => void }) {
  const [bizQuery, setBizQuery] = useState(sub.bizName);
  const [bizNumber, setBizNumber] = useState(sub.bizNumber);
  const [address, setAddress] = useState(sub.address);
  const [addressDetail, setAddressDetail] = useState(sub.addressDetail);
  const [bizType, setBizType] = useState(sub.bizType);
  const [bizItem, setBizItem] = useState(sub.bizItem);
  const [ceoName, setCeoName] = useState(sub.ceoName);
  const [contact, setContact] = useState(sub.contact);
  const [taxEmail, setTaxEmail] = useState(sub.taxEmail);

  const [alias, setAlias] = useState(sub.alias);
  const [memo, setMemo] = useState(sub.memo);

  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(sub.assignedGroupIds);
  const [ourGroups, setOurGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => setOurGroups(getGroups())), []);

  const handleSelectBiz = (rec: BizRecord) => {
    setBizQuery(rec.bizName);
    setBizNumber(rec.bizNumber);
    setAddress(rec.address);
    setAddressDetail(rec.addressDetail);
    setBizType(rec.bizType);
    setBizItem(rec.bizItem);
  };

  const toggleGroup = (id: string) => {
    setAssignedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSave = () => {
    onSave({
      ...sub,
      bizName: bizQuery, bizNumber, address, addressDetail, bizType, bizItem, ceoName, contact, taxEmail,
      alias, memo,
      assignedGroupIds,
    });
    onClose();
  };

  return (
    <ModalShell
      title="위탁사 상세"
      badge={sub.alias}
      onClose={onClose}
      width={720}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleSave} disabled={assignedGroupIds.length === 0}>저장</PrimaryButton>
      </>}
    >
      <SectionTitle>사업자정보</SectionTitle>
      <FieldRow label="사업자정보">
        <BizAutocomplete value={bizQuery} onChange={setBizQuery} onSelect={handleSelectBiz} />
      </FieldRow>
      <FieldRow label="사업자번호">
        <input value={bizNumber} onChange={e => setBizNumber(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="기본주소">
        <input value={address} onChange={e => setAddress(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="상세주소">
        <input value={addressDetail} onChange={e => setAddressDetail(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="업태">
        <input value={bizType} onChange={e => setBizType(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="종목">
        <input value={bizItem} onChange={e => setBizItem(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="대표자명">
        <input value={ceoName} onChange={e => setCeoName(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="연락처">
        <input value={contact} onChange={e => setContact(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="세금계산서 이메일">
        <input value={taxEmail} onChange={e => setTaxEmail(e.target.value)} style={inputBase} />
      </FieldRow>

      <div style={{ height: 16 }} />
      <SectionTitle>위탁사정보</SectionTitle>
      <FieldRow label="위탁사별칭">
        <input value={alias} onChange={e => setAlias(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="배차운영메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="배차 시 참고할 내용을 남겨주세요" style={textareaBase} />
      </FieldRow>
      <FieldRow label="담당 업무그룹">
        <GroupMultiSelect ourGroups={ourGroups} selected={assignedGroupIds} onToggle={toggleGroup} />
      </FieldRow>
    </ModalShell>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>위탁사 관리</span>
        <button
          onClick={onRegisterClick}
          style={{ padding: '0 16px', height: 36, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          위탁사등록
        </button>
      </div>
    </div>
  );
}

type SearchType = '위탁사별칭' | '사업자명';

function SearchBar({ searchType, setSearchType, keyword, setKeyword, onSearch }: {
  searchType: SearchType;
  setSearchType: (t: SearchType) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 32px', borderBottom: '1px solid #E4E5E9', flexShrink: 0 }}>
      <select
        value={searchType}
        onChange={e => setSearchType(e.target.value as SearchType)}
        style={{ width: 140, height: 36, padding: '0 28px 0 12px', fontSize: 15, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: `${selArrow} no-repeat right 10px center, #FFFFFF`, border: '1px solid #E4E5E9', borderRadius: 4, outline: 'none', cursor: 'pointer', boxSizing: 'border-box', appearance: 'none' as const }}
      >
        <option value="위탁사별칭">위탁사별칭</option>
        <option value="사업자명">사업자명</option>
      </select>
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
        placeholder="검색어를 입력해 주세요"
        style={{ width: 280, height: 36, padding: '0 12px', fontSize: 15, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }}
      />
      <button
        onClick={onSearch}
        style={{ padding: '0 20px', height: 36, background: '#2E3238', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em' }}
      >
        검색
      </button>
    </div>
  );
}

const COL_WIDTHS = { status: 100, alias: 220, bizNumber: 150, address: 320, registeredAt: 160 };

function Th({ label, width }: { label: string; width: number }) {
  return (
    <div style={{ width, flexShrink: 0, height: 40, background: '#F6F7F8', borderRight: '1px solid #E4E5E9', borderBottom: '1px solid #E4E5E9', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box' }}>
      <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, color: '#5C6370', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function Td({ children, width, center }: { children: React.ReactNode; width: number; center?: boolean }) {
  return (
    <div style={{ width, flexShrink: 0, height: 48, borderRight: '1px solid #E4E5E9', borderBottom: '1px solid #E4E5E9', display: 'flex', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', padding: '0 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function cellText(text: string, color = '#2E3238') {
  return <span style={{ fontFamily: ff, fontWeight: 400, fontSize: 15, color, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>;
}

function statusBadge(status: SubTradeStatus) {
  const style = status === '정상' ? { bg: '#E9F7EE', color: '#18AC42' } : { bg: '#FBEAEA', color: '#F04949' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 20, background: style.bg, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, color: style.color, letterSpacing: '-0.02em' }}>
      {status}
    </span>
  );
}

function SubTable({ rows, onRowClick }: { rows: Subcontractor[]; onRowClick: (s: Subcontractor) => void }) {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ minWidth: 940 }}>
        <div style={{ display: 'flex', borderTop: '1px solid #E4E5E9' }}>
          <Th label="거래상태" width={COL_WIDTHS.status} />
          <Th label="위탁사별칭" width={COL_WIDTHS.alias} />
          <Th label="사업자번호" width={COL_WIDTHS.bizNumber} />
          <Th label="사업장 주소" width={COL_WIDTHS.address} />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} style={{ display: 'flex', cursor: 'pointer' }}>
            <Td width={COL_WIDTHS.status} center>{statusBadge(row.status)}</Td>
            <Td width={COL_WIDTHS.alias}>{cellText(row.alias)}</Td>
            <Td width={COL_WIDTHS.bizNumber}>{cellText(row.bizNumber)}</Td>
            <Td width={COL_WIDTHS.address}>{cellText(row.address)}</Td>
            <Td width={COL_WIDTHS.registeredAt}>{cellText(row.registeredAt, '#5C6370')}</Td>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15 }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default function WitaksaManagement() {
  const [subs, setSubsState] = useState<Subcontractor[]>(() => getSubcontractors());
  useEffect(() => subscribeSubcontractors(() => setSubsState(getSubcontractors())), []);
  const [searchType, setSearchType] = useState<SearchType>('위탁사별칭');
  const [keyword, setKeyword] = useState('');
  const [appliedType, setAppliedType] = useState<SearchType>('위탁사별칭');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Subcontractor | null>(null);

  const handleSearch = () => {
    setAppliedType(searchType);
    setAppliedKeyword(keyword.trim());
  };

  const rows = appliedKeyword === ''
    ? subs
    : subs.filter(s => {
        const target = appliedType === '위탁사별칭' ? s.alias : s.bizName;
        return target.toLowerCase().includes(appliedKeyword.toLowerCase());
      });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={13} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onRegisterClick={() => setShowRegister(true)} />
        <SearchBar searchType={searchType} setSearchType={setSearchType} keyword={keyword} setKeyword={setKeyword} onSearch={handleSearch} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>총 {rows.length.toLocaleString()}건</span>
          </div>
          <SubTable rows={rows} onRowClick={setDetailTarget} />
        </div>
      </div>

      {showRegister && (
        <WitaksaRegisterModal
          onClose={() => setShowRegister(false)}
          onRegister={addSubcontractor}
        />
      )}
      {detailTarget && (
        <WitaksaDetailModal
          sub={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSave={updateSubcontractor}
        />
      )}
    </div>
  );
}
