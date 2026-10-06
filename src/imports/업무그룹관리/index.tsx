import { useState, useEffect } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type WorkGroup, type Employee,
  getGroups, addGroup, updateGroup,
  getEmployees, getEmployeesInGroup, addEmployeeToGroup, removeEmployeeFromGroup,
  subscribeCompany,
} from "../shared/companyStore";

const ff = "'Pretendard GOV:Regular'";
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

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

function ModalShell({ title, badge, onClose, children, footer, width = 560 }: {
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

// ─── 업무그룹 등록 모달 ──────────────────────────────────────────────────────

function GroupRegisterModal({ onClose, onRegister }: { onClose: () => void; onRegister: (g: { name: string; memo: string }) => void }) {
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const canRegister = name.trim() !== '';

  return (
    <ModalShell
      title="업무그룹 등록"
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={() => { onRegister({ name: name.trim(), memo }); onClose(); }} disabled={!canRegister}>업무그룹 등록</PrimaryButton>
      </>}
    >
      <FieldRow label="업무그룹명">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 영업1팀" style={inputBase} />
      </FieldRow>
      <FieldRow label="메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="업무그룹에 대한 메모를 남겨주세요" style={textareaBase} />
      </FieldRow>
    </ModalShell>
  );
}

// ─── 업무그룹 상세 모달 ──────────────────────────────────────────────────────

function GroupDetailModal({ group, onClose, refreshKey }: { group: WorkGroup; onClose: () => void; refreshKey: number }) {
  const [name, setName] = useState(group.name);
  const [memo, setMemo] = useState(group.memo);
  const [members, setMembers] = useState<Employee[]>(() => getEmployeesInGroup(group.id));
  const [showAddPicker, setShowAddPicker] = useState(false);

  useEffect(() => setMembers(getEmployeesInGroup(group.id)), [refreshKey]);

  const nonMembers = getEmployees().filter(e => !e.groupIds.includes(group.id));

  const handleSave = () => {
    updateGroup(group.id, { name: name.trim() || group.name, memo });
    onClose();
  };

  const handleAddMember = (empId: string) => {
    addEmployeeToGroup(empId, group.id);
    setMembers(getEmployeesInGroup(group.id));
    setShowAddPicker(false);
  };

  const handleRemoveMember = (empId: string) => {
    removeEmployeeFromGroup(empId, group.id);
    setMembers(getEmployeesInGroup(group.id));
  };

  return (
    <ModalShell
      title="업무그룹 상세"
      badge={group.name}
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleSave}>저장</PrimaryButton>
      </>}
    >
      <SectionTitle>업무그룹 정보</SectionTitle>
      <FieldRow label="업무그룹명">
        <input value={name} onChange={e => setName(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} style={textareaBase} />
      </FieldRow>

      <div style={{ height: 16 }} />
      <SectionTitle>담당자</SectionTitle>
      {members.length === 0 ? (
        <div style={{ height: 48, display: 'flex', alignItems: 'center', color: '#9197A1', fontSize: 15, fontFamily: ff }}>등록된 담당자가 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E4E5E9', borderRadius: 6, padding: '10px 12px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2E3238', fontFamily: ff, width: 80, flexShrink: 0 }}>{m.name}</span>
              <span style={{ fontSize: 13, color: '#9197A1', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.department}</span>
              <span style={{ fontSize: 13, color: '#5C6370', flexShrink: 0 }}>{m.phone}</span>
              <button onClick={() => handleRemoveMember(m.id)} style={{ height: 28, padding: '0 10px', border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', color: '#F04949', fontSize: 12, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>제외</button>
            </div>
          ))}
        </div>
      )}

      {showAddPicker ? (
        <div style={{ border: '1px solid #E4E5E9', borderRadius: 8, padding: 10 }}>
          {nonMembers.length === 0 ? (
            <div style={{ color: '#9197A1', fontSize: 14, fontFamily: ff, padding: '8px 4px' }}>추가할 수 있는 직원이 없습니다. 회사 &gt; 직원 관리에서 먼저 등록해 주세요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {nonMembers.map(e => (
                <div key={e.id} onClick={() => handleAddMember(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 4, cursor: 'pointer' }} onMouseEnter={ev => (ev.currentTarget.style.background = '#F6F7F8')} onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#2E3238', fontFamily: ff, width: 80, flexShrink: 0 }}>{e.name}</span>
                  <span style={{ fontSize: 13, color: '#9197A1' }}>{e.department}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowAddPicker(false)} style={{ marginTop: 8, width: '100%', height: 32, border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', color: '#5C6370', fontSize: 13, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>닫기</button>
        </div>
      ) : (
        <button onClick={() => setShowAddPicker(true)} style={{ width: '100%', height: 36, border: '1px dashed #C7CBD1', borderRadius: 6, background: '#FFFFFF', color: '#5C6370', fontSize: 14, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>
          + 담당자 추가
        </button>
      )}
    </ModalShell>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>업무그룹 관리</span>
        <button
          onClick={onRegisterClick}
          style={{ padding: '0 16px', height: 36, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          업무그룹 등록
        </button>
      </div>
    </div>
  );
}

const COL_WIDTHS = { name: 240, memo: 480, memberCount: 120, registeredAt: 160 };

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

function GroupTable({ rows, memberCounts, onRowClick }: { rows: WorkGroup[]; memberCounts: Map<string, number>; onRowClick: (g: WorkGroup) => void }) {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ minWidth: 1000 }}>
        <div style={{ display: 'flex', borderTop: '1px solid #E4E5E9' }}>
          <Th label="업무그룹명" width={COL_WIDTHS.name} />
          <Th label="메모" width={COL_WIDTHS.memo} />
          <Th label="담당자 수" width={COL_WIDTHS.memberCount} />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} style={{ display: 'flex', cursor: 'pointer' }}>
            <Td width={COL_WIDTHS.name}>{cellText(row.name)}</Td>
            <Td width={COL_WIDTHS.memo}>{cellText(row.memo || '-', row.memo ? '#2E3238' : '#9197A1')}</Td>
            <Td width={COL_WIDTHS.memberCount} center>{cellText(`${memberCounts.get(row.id) ?? 0}명`)}</Td>
            <Td width={COL_WIDTHS.registeredAt}>{cellText(row.registeredAt, '#5C6370')}</Td>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15 }}>
            등록된 업무그룹이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EopmuGroupManagement() {
  const [groups, setGroups] = useState<WorkGroup[]>(() => getGroups());
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => subscribeCompany(() => { setGroups(getGroups()); setRefreshKey(k => k + 1); }), []);
  const [showRegister, setShowRegister] = useState(false);
  const [detailTarget, setDetailTarget] = useState<WorkGroup | null>(null);

  const memberCounts = new Map<string, number>();
  getEmployees().forEach(e => e.groupIds.forEach(gid => memberCounts.set(gid, (memberCounts.get(gid) ?? 0) + 1)));

  // detailTarget이 갱신된 그룹 정보를 반영하도록 groups에서 최신 값을 다시 찾음
  const liveDetailTarget = detailTarget ? groups.find(g => g.id === detailTarget.id) ?? null : null;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={11} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onRegisterClick={() => setShowRegister(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>총 {groups.length.toLocaleString()}건</span>
          </div>
          <GroupTable rows={groups} memberCounts={memberCounts} onRowClick={setDetailTarget} />
        </div>
      </div>

      {showRegister && (
        <GroupRegisterModal
          onClose={() => setShowRegister(false)}
          onRegister={addGroup}
        />
      )}
      {liveDetailTarget && (
        <GroupDetailModal
          group={liveDetailTarget}
          onClose={() => setDetailTarget(null)}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
}
