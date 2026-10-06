import { useState, useEffect } from "react";
import SharedLnb from "../shared/SharedLnb";
import {
  type Employee, type WorkGroup,
  getEmployees, addEmployee, updateEmployee,
  getGroups, getGroupName,
  subscribeCompany,
} from "../shared/companyStore";

const ff = "'Pretendard GOV:Regular'";

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

function GroupPicker({ groups, selected, onToggle }: { groups: WorkGroup[]; selected: string[]; onToggle: (id: string) => void }) {
  if (groups.length === 0) {
    return <div style={{ color: '#9197A1', fontSize: 14, fontFamily: ff }}>등록된 업무그룹이 없습니다. 회사 &gt; 업무그룹 관리에서 먼저 등록해 주세요.</div>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {groups.map(g => {
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
  );
}

// ─── 직원 등록 모달 ──────────────────────────────────────────────────────────

function EmployeeRegisterModal({ groups, onClose, onRegister }: { groups: WorkGroup[]; onClose: () => void; onRegister: (e: Omit<Employee, 'id' | 'registeredAt'>) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const canRegister = name.trim() !== '';

  const toggle = (id: string) => setGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  return (
    <ModalShell
      title="직원 등록"
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton
          onClick={() => { onRegister({ name: name.trim(), phone, email, department, groupIds, memo }); onClose(); }}
          disabled={!canRegister}
        >
          직원 등록
        </PrimaryButton>
      </>}
    >
      <FieldRow label="이름">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="직원 이름" style={inputBase} />
      </FieldRow>
      <FieldRow label="소속/직책">
        <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="예: 영업1팀 팀장" style={inputBase} />
      </FieldRow>
      <FieldRow label="전화번호">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={inputBase} />
      </FieldRow>
      <FieldRow label="이메일">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={inputBase} />
      </FieldRow>
      <FieldRow label="담당 업무그룹">
        <GroupPicker groups={groups} selected={groupIds} onToggle={toggle} />
      </FieldRow>
      <FieldRow label="메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} style={textareaBase} />
      </FieldRow>
    </ModalShell>
  );
}

// ─── 직원 상세 모달 ──────────────────────────────────────────────────────────

function EmployeeDetailModal({ employee, groups, onClose, onSave }: { employee: Employee; groups: WorkGroup[]; onClose: () => void; onSave: (id: string, patch: Partial<Omit<Employee, 'id' | 'registeredAt'>>) => void }) {
  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(employee.phone);
  const [email, setEmail] = useState(employee.email);
  const [department, setDepartment] = useState(employee.department);
  const [groupIds, setGroupIds] = useState<string[]>(employee.groupIds);
  const [memo, setMemo] = useState(employee.memo);

  const toggle = (id: string) => setGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleSave = () => {
    onSave(employee.id, { name: name.trim() || employee.name, phone, email, department, groupIds, memo });
    onClose();
  };

  return (
    <ModalShell
      title="직원 상세"
      badge={employee.name}
      onClose={onClose}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleSave}>저장</PrimaryButton>
      </>}
    >
      <SectionTitle>직원 정보</SectionTitle>
      <FieldRow label="이름">
        <input value={name} onChange={e => setName(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="소속/직책">
        <input value={department} onChange={e => setDepartment(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="전화번호">
        <input value={phone} onChange={e => setPhone(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="이메일">
        <input value={email} onChange={e => setEmail(e.target.value)} style={inputBase} />
      </FieldRow>
      <FieldRow label="메모">
        <textarea value={memo} onChange={e => setMemo(e.target.value)} style={textareaBase} />
      </FieldRow>

      <div style={{ height: 16 }} />
      <SectionTitle>담당 업무그룹</SectionTitle>
      <GroupPicker groups={groups} selected={groupIds} onToggle={toggle} />
    </ModalShell>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function Header({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>직원 관리</span>
        <button
          onClick={onRegisterClick}
          style={{ padding: '0 16px', height: 36, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          직원 등록
        </button>
      </div>
    </div>
  );
}

const COL_WIDTHS = { name: 140, department: 200, phone: 160, email: 220, groups: 320, registeredAt: 160 };

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

function groupBadges(names: string[]) {
  if (names.length === 0) return <span style={{ fontSize: 13, color: '#9197A1', fontFamily: ff }}>-</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {names.map(n => (
        <span key={n} style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 20, background: '#E6EFFF', color: '#005FFF', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{n}</span>
      ))}
    </div>
  );
}

function EmployeeTable({ rows, onRowClick }: { rows: Employee[]; onRowClick: (e: Employee) => void }) {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ minWidth: 1200 }}>
        <div style={{ display: 'flex', borderTop: '1px solid #E4E5E9' }}>
          <Th label="이름" width={COL_WIDTHS.name} />
          <Th label="소속/직책" width={COL_WIDTHS.department} />
          <Th label="전화번호" width={COL_WIDTHS.phone} />
          <Th label="이메일" width={COL_WIDTHS.email} />
          <Th label="담당 업무그룹" width={COL_WIDTHS.groups} />
          <Th label="등록일시" width={COL_WIDTHS.registeredAt} />
        </div>
        {rows.map(row => (
          <div key={row.id} onClick={() => onRowClick(row)} style={{ display: 'flex', cursor: 'pointer' }}>
            <Td width={COL_WIDTHS.name}>{cellText(row.name)}</Td>
            <Td width={COL_WIDTHS.department}>{cellText(row.department || '-')}</Td>
            <Td width={COL_WIDTHS.phone}>{cellText(row.phone || '-', '#5C6370')}</Td>
            <Td width={COL_WIDTHS.email}>{cellText(row.email || '-', '#5C6370')}</Td>
            <Td width={COL_WIDTHS.groups}>{groupBadges(row.groupIds.map(getGroupName).filter(Boolean))}</Td>
            <Td width={COL_WIDTHS.registeredAt}>{cellText(row.registeredAt, '#5C6370')}</Td>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15 }}>
            등록된 직원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default function JikwonManagement() {
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [groups, setGroups] = useState<WorkGroup[]>(() => getGroups());
  useEffect(() => subscribeCompany(() => { setEmployees(getEmployees()); setGroups(getGroups()); }), []);
  const [showRegister, setShowRegister] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Employee | null>(null);

  const liveDetailTarget = detailTarget ? employees.find(e => e.id === detailTarget.id) ?? null : null;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={12} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onRegisterClick={() => setShowRegister(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>총 {employees.length.toLocaleString()}건</span>
          </div>
          <EmployeeTable rows={employees} onRowClick={setDetailTarget} />
        </div>
      </div>

      {showRegister && (
        <EmployeeRegisterModal
          groups={groups}
          onClose={() => setShowRegister(false)}
          onRegister={addEmployee}
        />
      )}
      {liveDetailTarget && (
        <EmployeeDetailModal
          employee={liveDetailTarget}
          groups={groups}
          onClose={() => setDetailTarget(null)}
          onSave={updateEmployee}
        />
      )}
    </div>
  );
}
