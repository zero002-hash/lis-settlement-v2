import { useState, useEffect } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type TradeStatus, type SettleSchedule, type PartnerContact, type SharedGroupMapping, type TradePartner, type BizRecord,
  MOCK_BIZ_REGISTRY, makeSchedule, genId,
  getPartners, addPartner, updatePartner, subscribePartners,
} from "../shared/geoRaecheoStore";
import { hasContractRate } from "../shared/contractRateStore";
import { type WorkGroup, getGroups, subscribeCompany } from "../shared/companyStore";

const ff = "'Pretendard GOV:Regular'";
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

// ─── Shared style helpers ───────────────────────────────────────────────────

const inputBase: React.CSSProperties = { width: '100%', height: 36, padding: '0 12px', fontSize: 15, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' };
const selectBase: React.CSSProperties = { ...inputBase, paddingRight: 32, background: `${selArrow} no-repeat right 12px center, #FFFFFF`, cursor: 'pointer', appearance: 'none' as const };
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

// ─── 거래처등록 모달 ─────────────────────────────────────────────────────────

function GeoraecheoRegisterModal({ onClose, onRegister }: { onClose: () => void; onRegister: (p: TradePartner) => void }) {
  const [bizQuery, setBizQuery] = useState('');
  const [selectedBiz, setSelectedBiz] = useState<BizRecord | null>(null);
  const [addressDetail, setAddressDetail] = useState('');
  const [bizType, setBizType] = useState('');
  const [bizItem, setBizItem] = useState('');
  const [ceoName, setCeoName] = useState('');
  const [contact, setContact] = useState('');
  const [taxEmail, setTaxEmail] = useState('');
  const [ourGroups] = useState<WorkGroup[]>(() => getGroups());
  const [mainGroupId, setMainGroupId] = useState(ourGroups[0]?.id ?? '');

  const handleSelectBiz = (rec: BizRecord) => {
    setSelectedBiz(rec);
    setBizQuery(rec.bizName);
    setAddressDetail(rec.addressDetail);
    setBizType(rec.bizType);
    setBizItem(rec.bizItem);
  };

  const canRegister = selectedBiz !== null && mainGroupId !== '';

  const handleRegister = () => {
    if (!selectedBiz || !mainGroupId) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const registeredAt = `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newPartner: TradePartner = {
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
      tTrucker: false,
      sharedGroups: [],
      settleSchedules: [makeSchedule('기본스케줄', Date.now() % 1000)],
      contacts: [],
      mainGroupId,
      assignedGroupIds: [mainGroupId],
    };
    onRegister(newPartner);
    onClose();
  };

  return (
    <ModalShell
      title="거래처등록"
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleRegister} disabled={!canRegister}>거래처등록</PrimaryButton>
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
      <FieldRow label="메인 담당 업무그룹">
        {ourGroups.length === 0 ? (
          <div style={{ color: '#F04949', fontSize: 14, fontFamily: ff }}>등록된 업무그룹이 없습니다. 회사 &gt; 업무그룹 관리에서 먼저 등록해 주세요.</div>
        ) : (
          <select value={mainGroupId} onChange={e => setMainGroupId(e.target.value)} style={selectBase}>
            {ourGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </FieldRow>
    </ModalShell>
  );
}

// ─── 거래처 상세 모달 ────────────────────────────────────────────────────────

function GeoraecheoDetailModal({ partner, onClose, onSave }: { partner: TradePartner; onClose: () => void; onSave: (p: TradePartner) => void }) {
  const [bizQuery, setBizQuery] = useState(partner.bizName);
  const [bizNumber, setBizNumber] = useState(partner.bizNumber);
  const [address, setAddress] = useState(partner.address);
  const [addressDetail, setAddressDetail] = useState(partner.addressDetail);
  const [bizType, setBizType] = useState(partner.bizType);
  const [bizItem, setBizItem] = useState(partner.bizItem);
  const [ceoName, setCeoName] = useState(partner.ceoName);
  const [contact, setContact] = useState(partner.contact);
  const [taxEmail, setTaxEmail] = useState(partner.taxEmail);

  const [alias, setAlias] = useState(partner.alias);
  const [memo, setMemo] = useState(partner.memo);

  const [groupTab, setGroupTab] = useState<'공유그룹' | '정산스케줄'>('공유그룹');
  const [sharedGroups, setSharedGroups] = useState<SharedGroupMapping[]>(partner.sharedGroups);
  const [schedules, setSchedules] = useState<SettleSchedule[]>(partner.settleSchedules);
  const [contacts, setContacts] = useState<PartnerContact[]>(partner.contacts);
  const [mainGroupId, setMainGroupId] = useState(partner.mainGroupId);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>(partner.assignedGroupIds);
  const [ourGroups, setOurGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => setOurGroups(getGroups())), []);

  const handleMainGroupChange = (id: string) => {
    setMainGroupId(id);
    setAssignedGroupIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };
  const toggleAssignedGroup = (id: string) => {
    if (id === mainGroupId) return; // 메인 담당 업무그룹은 담당 업무그룹 목록에서 뺄 수 없음
    setAssignedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSelectBiz = (rec: BizRecord) => {
    setBizQuery(rec.bizName);
    setBizNumber(rec.bizNumber);
    setAddress(rec.address);
    setAddressDetail(rec.addressDetail);
    setBizType(rec.bizType);
    setBizItem(rec.bizItem);
  };

  const updateSchedule = (id: string, patch: Partial<SettleSchedule>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const addSchedule = () => {
    setSchedules(prev => [...prev, makeSchedule(`스케줄 ${prev.length + 1}`, prev.length + 100)]);
  };

  const removeSchedule = (id: string) => {
    if (schedules.length <= 1) return; // 정산스케줄은 최소 1개
    setSchedules(prev => prev.filter(s => s.id !== id));
    setSharedGroups(prev => prev.map(g => g.scheduleId === id ? { ...g, scheduleId: schedules[0].id === id ? schedules[1].id : schedules[0].id } : g));
  };

  const updateMapping = (groupName: string, scheduleId: string) => {
    setSharedGroups(prev => prev.map(g => g.groupName === groupName ? { ...g, scheduleId } : g));
  };

  const addContact = () => {
    setContacts(prev => [...prev, { id: genId('ct'), name: '', department: '', phone: '', fax: '', email: '', memo: '' }]);
  };
  const updateContact = (id: string, patch: Partial<PartnerContact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };
  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = () => {
    onSave({
      ...partner,
      bizName: bizQuery, bizNumber, address, addressDetail, bizType, bizItem, ceoName, contact, taxEmail,
      alias, memo,
      sharedGroups, settleSchedules: schedules, contacts, mainGroupId, assignedGroupIds,
    });
    onClose();
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    height: 36, padding: '0 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#2E3238' : '#F6F7F8', color: active ? '#FFFFFF' : '#5C6370',
    fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em',
  });

  return (
    <ModalShell
      title="거래처 상세"
      badge={partner.alias}
      onClose={onClose}
      width={720}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleSave} disabled={!mainGroupId || assignedGroupIds.length === 0}>저장</PrimaryButton>
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
      <SectionTitle>거래처정보</SectionTitle>
      <FieldRow label="거래처별칭">
        <input value={alias} onChange={e => setAlias(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="배차운영메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="배차 시 참고할 내용을 남겨주세요" style={textareaBase} />
      </FieldRow>
      <FieldRow label="메인 담당 업무그룹">
        {ourGroups.length === 0 ? (
          <div style={{ color: '#F04949', fontSize: 14, fontFamily: ff }}>등록된 업무그룹이 없습니다. 회사 &gt; 업무그룹 관리에서 먼저 등록해 주세요.</div>
        ) : (
          <select value={mainGroupId} onChange={e => handleMainGroupChange(e.target.value)} style={selectBase}>
            {ourGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </FieldRow>
      <FieldRow label="담당 업무그룹">
        {ourGroups.length === 0 ? (
          <div style={{ color: '#F04949', fontSize: 14, fontFamily: ff }}>등록된 업무그룹이 없습니다. 회사 &gt; 업무그룹 관리에서 먼저 등록해 주세요.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ourGroups.map(g => {
              const checked = assignedGroupIds.includes(g.id);
              const isMain = g.id === mainGroupId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleAssignedGroup(g.id)}
                  disabled={isMain}
                  style={{
                    height: 32, padding: '0 14px', borderRadius: 20, cursor: isMain ? 'default' : 'pointer',
                    border: checked ? '1px solid #005FFF' : '1px solid #E4E5E9',
                    background: checked ? '#E6EFFF' : '#FFFFFF',
                    color: checked ? '#005FFF' : '#5C6370',
                    fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, letterSpacing: '-0.02em',
                  }}
                >
                  {g.name}{isMain ? ' (메인)' : ''}
                </button>
              );
            })}
          </div>
        )}
        {assignedGroupIds.length === 0 && ourGroups.length > 0 && (
          <div style={{ marginTop: 6, color: '#F04949', fontSize: 13, fontFamily: ff }}>담당 업무그룹은 최소 1개 지정해야 합니다.</div>
        )}
      </FieldRow>

      <div style={{ height: 16 }} />
      <SectionTitle>업무그룹</SectionTitle>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button style={tabBtnStyle(groupTab === '정산스케줄')} onClick={() => setGroupTab('정산스케줄')}>정산스케줄</button>
        <button style={tabBtnStyle(groupTab === '공유그룹')} onClick={() => setGroupTab('공유그룹')}>공유그룹</button>
      </div>

      {groupTab === '공유그룹' && (
        <div>
          <div style={{ marginBottom: 10 }}>
            {tTruckerBadge(partner.tTrucker)}
          </div>
          {!partner.tTrucker || sharedGroups.length === 0 ? (
            <div style={{ height: 48, display: 'flex', alignItems: 'center', color: '#9197A1', fontSize: 15, fontFamily: ff }}>그룹없음</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sharedGroups.map(g => (
                <div key={g.groupName} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E4E5E9', borderRadius: 6, padding: '10px 12px' }}>
                  <span style={{ flex: 1, fontSize: 15, color: '#2E3238', fontFamily: ff }}>{g.groupName}</span>
                  <span style={{ fontSize: 13, color: '#9197A1', flexShrink: 0 }}>정산스케줄</span>
                  <select value={g.scheduleId} onChange={e => updateMapping(g.groupName, e.target.value)} style={{ ...selectBase, width: 160 }}>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {groupTab === '정산스케줄' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {schedules.map(s => (
              <div key={s.id} style={{ border: '1px solid #E4E5E9', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input value={s.name} onChange={e => updateSchedule(s.id, { name: e.target.value })} style={{ ...inputBase, flex: 1, fontWeight: 700 }} />
                  <button
                    onClick={() => removeSchedule(s.id)}
                    disabled={schedules.length <= 1}
                    style={{ height: 32, padding: '0 12px', border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', color: schedules.length <= 1 ? '#C7CBD1' : '#F04949', fontSize: 13, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: schedules.length <= 1 ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                  >
                    삭제
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldRow label="종사업장번호">
                    <input value={s.subBizNumber} onChange={e => updateSchedule(s.id, { subBizNumber: e.target.value })} style={inputBase} />
                  </FieldRow>
                  <FieldRow label="정산기간">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select value={s.settlePeriodStart} onChange={e => updateSchedule(s.id, { settlePeriodStart: Number(e.target.value) })} style={{ ...selectBase, flex: 1 }}>
                        {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}일</option>)}
                      </select>
                      <span style={{ color: '#9197A1', flexShrink: 0 }}>~</span>
                      <select value={s.settlePeriodEnd} onChange={e => updateSchedule(s.id, { settlePeriodEnd: Number(e.target.value) })} style={{ ...selectBase, flex: 1 }}>
                        {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}일</option>)}
                      </select>
                    </div>
                  </FieldRow>
                  <FieldRow label="인수증 기본설정">
                    <select value={s.receiptDefault} onChange={e => updateSchedule(s.id, { receiptDefault: e.target.value })} style={selectBase}>
                      {['원본/사진 필수', '사진 필수', '필요 없음'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="수금예정일">
                    <input value={s.collectDueDate} onChange={e => updateSchedule(s.id, { collectDueDate: e.target.value })} style={inputBase} />
                  </FieldRow>
                  <FieldRow label="계약운임표">
                    {hasContractRate(partner.id, s.id) ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 10px', borderRadius: 20, background: '#E9F7EE', color: '#18AC42', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>계약운임표 등록됨</span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 10px', borderRadius: 20, background: '#F1F2F4', color: '#9197A1', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>계약운임표 미등록</span>
                    )}
                  </FieldRow>
                  <FieldRow label="계좌정보">
                    <input value={s.account} onChange={e => updateSchedule(s.id, { account: e.target.value })} placeholder="은행명 계좌번호" style={inputBase} />
                  </FieldRow>
                  <FieldRow label="세금계산서 이메일">
                    <input value={s.taxEmail} onChange={e => updateSchedule(s.id, { taxEmail: e.target.value })} style={inputBase} />
                  </FieldRow>
                </div>
                <FieldRow label="정산메모">
                  <textarea value={s.settleMemo} onChange={e => updateSchedule(s.id, { settleMemo: e.target.value })} placeholder="정산 시 참고할 내용을 남겨주세요" style={textareaBase} />
                </FieldRow>
              </div>
            ))}
          </div>
          <button onClick={addSchedule} style={{ marginTop: 10, width: '100%', height: 36, border: '1px dashed #C7CBD1', borderRadius: 6, background: '#FFFFFF', color: '#5C6370', fontSize: 14, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>
            + 정산스케줄 추가
          </button>

          <div style={{ height: 20 }} />
          <SectionTitle>거래처 직원정보</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contacts.map(c => (
              <div key={c.id} style={{ border: '1px solid #E4E5E9', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input value={c.name} onChange={e => updateContact(c.id, { name: e.target.value })} placeholder="담당자명" style={{ ...inputBase, flex: 1, fontWeight: 700 }} />
                  <button onClick={() => removeContact(c.id)} style={{ height: 36, padding: '0 12px', border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', color: '#F04949', fontSize: 13, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>삭제</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldRow label="소속팀">
                    <input value={c.department} onChange={e => updateContact(c.id, { department: e.target.value })} placeholder="예: 배송1팀, 인천 물류센터" style={inputBase} />
                  </FieldRow>
                  <FieldRow label="전화번호">
                    <input value={c.phone} onChange={e => updateContact(c.id, { phone: e.target.value })} placeholder="010-0000-0000" style={inputBase} />
                  </FieldRow>
                  <FieldRow label="팩스번호">
                    <input value={c.fax} onChange={e => updateContact(c.id, { fax: e.target.value })} placeholder="02-000-0000" style={inputBase} />
                  </FieldRow>
                  <FieldRow label="이메일">
                    <input value={c.email} onChange={e => updateContact(c.id, { email: e.target.value })} placeholder="name@example.com" style={inputBase} />
                  </FieldRow>
                  <FieldRow label="메모">
                    <input value={c.memo} onChange={e => updateContact(c.id, { memo: e.target.value })} placeholder="예: 배차 담당" style={inputBase} />
                  </FieldRow>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div style={{ color: '#9197A1', fontSize: 14, fontFamily: ff }}>등록된 담당자가 없습니다.</div>
            )}
          </div>
          <button onClick={addContact} style={{ marginTop: 10, width: '100%', height: 36, border: '1px dashed #C7CBD1', borderRadius: 6, background: '#FFFFFF', color: '#5C6370', fontSize: 14, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>
            + 담당자 추가
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>거래처 관리</span>
        <button
          onClick={onRegisterClick}
          style={{ padding: '0 16px', height: 36, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          거래처등록
        </button>
      </div>
    </div>
  );
}

type SearchType = '거래처별칭' | '사업자명';

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
        <option value="거래처별칭">거래처별칭</option>
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

const COL_WIDTHS = { status: 100, alias: 220, bizNumber: 150, address: 320, registeredAt: 160, tTrucker: 160 };

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

function statusBadge(status: TradeStatus) {
  const style = status === '정상' ? { bg: '#E9F7EE', color: '#18AC42' } : { bg: '#FBEAEA', color: '#F04949' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 20, background: style.bg, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, color: style.color, letterSpacing: '-0.02em' }}>
      {status}
    </span>
  );
}

function tTruckerBadge(joined: boolean) {
  const style = joined ? { bg: '#E6EFFF', color: '#005FFF' } : { bg: '#F1F2F4', color: '#9197A1' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 20, background: style.bg, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, color: style.color, letterSpacing: '-0.02em' }}>
      {joined ? '가입' : '미가입'}
    </span>
  );
}

function PartnerTable({ rows, onRowClick }: { rows: TradePartner[]; onRowClick: (p: TradePartner) => void }) {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ minWidth: 1100 }}>
        <div style={{ display: 'flex', borderTop: '1px solid #E4E5E9' }}>
          <Th label="거래상태" width={COL_WIDTHS.status} />
          <Th label="거래처별칭" width={COL_WIDTHS.alias} />
          <Th label="사업자번호" width={COL_WIDTHS.bizNumber} />
          <Th label="사업장 주소" width={COL_WIDTHS.address} />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
          <Th label="T 트럭커 시스템 가입 여부" width={COL_WIDTHS.tTrucker} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} style={{ display: 'flex', cursor: 'pointer' }}>
            <Td width={COL_WIDTHS.status} center>{statusBadge(row.status)}</Td>
            <Td width={COL_WIDTHS.alias}>{cellText(row.alias)}</Td>
            <Td width={COL_WIDTHS.bizNumber}>{cellText(row.bizNumber)}</Td>
            <Td width={COL_WIDTHS.address}>{cellText(row.address)}</Td>
            <Td width={COL_WIDTHS.registeredAt}>{cellText(row.registeredAt, '#5C6370')}</Td>
            <Td width={COL_WIDTHS.tTrucker} center>{tTruckerBadge(row.tTrucker)}</Td>
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

export default function GeoraecheoManagement() {
  const [partners, setPartnersState] = useState<TradePartner[]>(() => getPartners());
  useEffect(() => subscribePartners(() => setPartnersState(getPartners())), []);
  const [searchType, setSearchType] = useState<SearchType>('거래처별칭');
  const [keyword, setKeyword] = useState('');
  const [appliedType, setAppliedType] = useState<SearchType>('거래처별칭');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [detailTarget, setDetailTarget] = useState<TradePartner | null>(null);

  const handleSearch = () => {
    setAppliedType(searchType);
    setAppliedKeyword(keyword.trim());
  };

  const rows = appliedKeyword === ''
    ? partners
    : partners.filter(p => {
        const target = appliedType === '거래처별칭' ? p.alias : p.bizName;
        return target.toLowerCase().includes(appliedKeyword.toLowerCase());
      });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={6} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onRegisterClick={() => setShowRegister(true)} />
        <SearchBar searchType={searchType} setSearchType={setSearchType} keyword={keyword} setKeyword={setKeyword} onSearch={handleSearch} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>총 {rows.length.toLocaleString()}건</span>
          </div>
          <PartnerTable rows={rows} onRowClick={setDetailTarget} />
        </div>
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
