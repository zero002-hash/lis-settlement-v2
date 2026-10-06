import { useState, useEffect } from "react";
import SharedLnb from "../shared/SharedLnb";
import { getPartners, subscribePartners, type TradePartner } from "../shared/geoRaecheoStore";
import PartnerAutocomplete from "../shared/PartnerAutocomplete";
import {
  type ContractRate, type ContractRateType, type VehicleCombo, type RateCell,
  CONTRACT_RATE_TYPES, TON_OPTIONS, CAR_TYPE_OPTIONS, NATIONWIDE_REGIONS,
  getContractRates, addContractRate, updateContractRate, subscribeContractRates,
  makeCombo, cellKey,
} from "../shared/contractRateStore";

const ff = "'Pretendard GOV:Regular'";
const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

// ─── Shared style helpers ───────────────────────────────────────────────────

const inputBase: React.CSSProperties = { width: '100%', height: 36, padding: '0 12px', fontSize: 15, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' };
const selectBase: React.CSSProperties = { ...inputBase, paddingRight: 32, background: `${selArrow} no-repeat right 12px center, #FFFFFF`, cursor: 'pointer', appearance: 'none' as const };

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

// ─── 계약운임표 등록 모달 (거래처 + 정산스케줄 선택) ─────────────────────────

function ContractRateRegisterModal({ partners, onClose, onCreated }: {
  partners: TradePartner[];
  onClose: () => void;
  onCreated: (rate: ContractRate) => void;
}) {
  const [partnerQuery, setPartnerQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<TradePartner | null>(null);
  const [scheduleId, setScheduleId] = useState('');

  const handlePartnerQueryChange = (v: string) => {
    setPartnerQuery(v);
    if (selectedPartner && v !== selectedPartner.alias) {
      setSelectedPartner(null);
      setScheduleId('');
    }
  };

  const handleSelectPartner = (p: TradePartner) => {
    setSelectedPartner(p);
    setPartnerQuery(p.alias);
    setScheduleId(p.settleSchedules[0]?.id ?? '');
  };

  const canCreate = selectedPartner !== null && scheduleId !== '';

  const handleCreate = () => {
    if (!selectedPartner || !canCreate) return;
    const rate = addContractRate(selectedPartner.id, scheduleId);
    onCreated(rate);
  };

  return (
    <ModalShell
      title="계약운임표 등록"
      onClose={onClose}
      width={480}
      footer={<>
        <GhostButton onClick={onClose}>취소</GhostButton>
        <PrimaryButton onClick={handleCreate} disabled={!canCreate}>추가</PrimaryButton>
      </>}
    >
      <FieldRow label="거래처">
        <PartnerAutocomplete
          value={partnerQuery}
          onChange={handlePartnerQueryChange}
          onSelect={handleSelectPartner}
          partners={partners}
          placeholder="거래처명을 검색해 주세요"
          inputStyle={inputBase}
        />
      </FieldRow>
      <FieldRow label="정산스케줄">
        <select value={scheduleId} onChange={e => setScheduleId(e.target.value)} style={selectBase} disabled={!selectedPartner}>
          {!selectedPartner && <option value="">거래처를 먼저 선택해 주세요</option>}
          {selectedPartner?.settleSchedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </FieldRow>
    </ModalShell>
  );
}

// ─── 계약운임표 상세 페이지 (하차지 × 톤수/차종 매트릭스) ───────────────────

const thStyle: React.CSSProperties = { border: '1px solid #E4E5E9', background: '#F6F7F8', padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#5C6370', whiteSpace: 'nowrap', textAlign: 'center', boxSizing: 'border-box' };
const tdStyle: React.CSSProperties = { border: '1px solid #E4E5E9', padding: '6px 8px', boxSizing: 'border-box' };
const cellInputStyle: React.CSSProperties = { width: 100, height: 30, padding: '0 8px', fontSize: 14, fontFamily: ff, letterSpacing: '-0.02em', color: '#2E3238', background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 3, outline: 'none', boxSizing: 'border-box', textAlign: 'right' };

function ContractRateDetailPage({ rate, partner, scheduleName, onBack, onSave }: {
  rate: ContractRate;
  partner: TradePartner | undefined;
  scheduleName: string;
  onBack: () => void;
  onSave: (r: ContractRate) => void;
}) {
  const [type, setType] = useState<ContractRateType>(rate.type);
  const [loadLoc, setLoadLoc] = useState(rate.loadLoc);
  const [unloadScope, setUnloadScope] = useState<'전국' | '특정구간'>(rate.unloadScope);
  const [unloadLocs, setUnloadLocs] = useState<string[]>(rate.unloadLocs);
  const [vehicleCombos, setVehicleCombos] = useState<VehicleCombo[]>(rate.vehicleCombos);
  const [cells, setCells] = useState<Record<string, RateCell>>(rate.cells);

  const [newLocName, setNewLocName] = useState('');
  const [newComboTon, setNewComboTon] = useState(TON_OPTIONS[3]);
  const [newComboCar, setNewComboCar] = useState(CAR_TYPE_OPTIONS[0]);

  const getCell = (loc: string, comboId: string): RateCell => cells[cellKey(loc, comboId)] ?? { billingAmt: 0, dispatchAmt: 0 };
  const setCell = (loc: string, comboId: string, patch: Partial<RateCell>) => {
    setCells(prev => ({ ...prev, [cellKey(loc, comboId)]: { ...getCell(loc, comboId), ...patch } }));
  };

  const switchScope = (scope: '전국' | '특정구간') => {
    setUnloadScope(scope);
    if (scope === '전국') setUnloadLocs(NATIONWIDE_REGIONS);
  };

  const addLoc = () => {
    const name = newLocName.trim();
    if (name === '' || unloadLocs.includes(name)) return;
    setUnloadLocs(prev => [...prev, name]);
    setNewLocName('');
  };
  const removeLoc = (loc: string) => setUnloadLocs(prev => prev.filter(l => l !== loc));

  const addCombo = () => {
    if (vehicleCombos.some(c => c.tonType === newComboTon && c.carType === newComboCar)) return;
    setVehicleCombos(prev => [...prev, makeCombo(newComboTon, newComboCar)]);
  };
  const removeCombo = (comboId: string) => setVehicleCombos(prev => prev.filter(c => c.id !== comboId));

  const handleSave = () => {
    onSave({ ...rate, type, loadLoc, unloadScope, unloadLocs, vehicleCombos, cells });
    onBack();
  };

  const scopeBtnStyle = (active: boolean): React.CSSProperties => ({
    height: 36, padding: '0 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
    background: active ? '#2E3238' : '#F6F7F8', color: active ? '#FFFFFF' : '#5C6370',
    fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={10} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', height: 36, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 4, cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 14, color: '#2E3238' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              목록으로
            </button>
            <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#000000' }}>계약운임표 상세</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#454B55', background: '#EBEDEF', borderRadius: 4, padding: '0 6px', height: 26, display: 'inline-flex', alignItems: 'center' }}>{partner?.alias ?? '-'} · {scheduleName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GhostButton onClick={onBack}>취소</GhostButton>
            <PrimaryButton onClick={handleSave}>저장</PrimaryButton>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 1200 }}>
            <FieldRow label="계약운임표 유형">
              <select value={type} onChange={e => setType(e.target.value as ContractRateType)} style={{ ...selectBase, width: 240 }}>
                {CONTRACT_RATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldRow>

            {type !== '상차지 기준' && (
              <div style={{ marginTop: 12, padding: '32px 0', textAlign: 'center', color: '#9197A1', fontSize: 15, fontFamily: ff, border: '1px dashed #E4E5E9', borderRadius: 8 }}>
                "{type}" 유형은 아직 준비 중입니다. 우선 상차지 기준으로 등록해 주세요.
              </div>
            )}

            {type === '상차지 기준' && (
              <div>
                <FieldRow label="상차지">
                  <input value={loadLoc} onChange={e => setLoadLoc(e.target.value)} placeholder="상차지를 입력해 주세요" style={{ ...inputBase, width: 320 }} />
                </FieldRow>

                <div style={{ height: 8 }} />
                <SectionTitle>하차지별 운임</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={scopeBtnStyle(unloadScope === '전국')} onClick={() => switchScope('전국')}>전국 하차지 견적표</button>
                    <button style={scopeBtnStyle(unloadScope === '특정구간')} onClick={() => switchScope('특정구간')}>특정 구간 추가</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={newLocName}
                      onChange={e => setNewLocName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addLoc(); }}
                      placeholder="하차지명 입력 후 추가"
                      style={{ ...inputBase, width: 180, height: 32 }}
                    />
                    <button onClick={addLoc} style={{ height: 32, padding: '0 14px', border: '1px dashed #C7CBD1', borderRadius: 4, background: '#FFFFFF', color: '#5C6370', fontSize: 13, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>+ 하차지 추가</button>
                  </div>
                  <div style={{ width: 1, height: 20, background: '#E4E5E9' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <select value={newComboTon} onChange={e => setNewComboTon(e.target.value)} style={{ ...selectBase, width: 90, height: 32 }}>
                      {TON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select value={newComboCar} onChange={e => setNewComboCar(e.target.value)} style={{ ...selectBase, width: 90, height: 32 }}>
                      {CAR_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button onClick={addCombo} style={{ height: 32, padding: '0 14px', border: '1px dashed #C7CBD1', borderRadius: 4, background: '#FFFFFF', color: '#5C6370', fontSize: 13, fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, cursor: 'pointer' }}>+ 조합 추가</button>
                  </div>
                </div>

                {vehicleCombos.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: '#9197A1', fontSize: 14, fontFamily: ff, border: '1px dashed #E4E5E9', borderRadius: 8 }}>
                    차량톤수+차량종류 조합을 먼저 추가해 주세요.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #E4E5E9', borderRadius: 8 }}>
                    <table style={{ borderCollapse: 'collapse', minWidth: 200 + vehicleCombos.length * 220 }}>
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{ ...thStyle, minWidth: 160 }}>하차지</th>
                          {vehicleCombos.map(combo => (
                            <th key={combo.id} colSpan={2} style={{ ...thStyle, position: 'relative' }}>
                              <span>{combo.tonType} {combo.carType}</span>
                              <span onClick={() => removeCombo(combo.id)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9197A1', fontSize: 13 }}>×</span>
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {vehicleCombos.flatMap(combo => [
                            <th key={combo.id + '-b'} style={{ ...thStyle, minWidth: 110 }}>청구금액</th>,
                            <th key={combo.id + '-d'} style={{ ...thStyle, minWidth: 110 }}>배차금액</th>,
                          ])}
                        </tr>
                      </thead>
                      <tbody>
                        {unloadLocs.map(loc => (
                          <tr key={loc}>
                            <td style={{ ...tdStyle, fontSize: 14, fontFamily: ff, color: '#2E3238' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span>{loc}</span>
                                <span onClick={() => removeLoc(loc)} style={{ cursor: 'pointer', color: '#F04949', fontSize: 12, flexShrink: 0 }}>삭제</span>
                              </div>
                            </td>
                            {vehicleCombos.flatMap(combo => {
                              const cell = getCell(loc, combo.id);
                              return [
                                <td key={combo.id + '-b'} style={tdStyle}>
                                  <input type="number" value={cell.billingAmt} onChange={e => setCell(loc, combo.id, { billingAmt: Number(e.target.value) })} style={cellInputStyle} />
                                </td>,
                                <td key={combo.id + '-d'} style={tdStyle}>
                                  <input type="number" value={cell.dispatchAmt} onChange={e => setCell(loc, combo.id, { dispatchAmt: Number(e.target.value) })} style={cellInputStyle} />
                                </td>,
                              ];
                            })}
                          </tr>
                        ))}
                        {unloadLocs.length === 0 && (
                          <tr>
                            <td colSpan={1 + vehicleCombos.length * 2} style={{ ...tdStyle, textAlign: 'center', color: '#9197A1', fontFamily: ff, height: 60 }}>
                              등록된 하차지가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function Header({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>계약운임표 관리</span>
        <button
          onClick={onAddClick}
          style={{ padding: '0 16px', height: 36, background: '#005FFF', borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
        >
          계약운임표 추가
        </button>
      </div>
    </div>
  );
}

const COL_WIDTHS = { partner: 260, schedule: 200, type: 200 };

function Th({ label, width, grow }: { label: string; width: number; grow?: boolean }) {
  return (
    <div style={{ width, flex: grow ? '1 1 0' : 'none', minWidth: grow ? width : undefined, flexShrink: grow ? 1 : 0, height: 40, background: '#F6F7F8', borderRight: '1px solid #E4E5E9', borderBottom: '1px solid #E4E5E9', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box' }}>
      <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, color: '#5C6370', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function Td({ children, width, grow }: { children: React.ReactNode; width: number; grow?: boolean }) {
  return (
    <div style={{ width, flex: grow ? '1 1 0' : 'none', minWidth: grow ? width : undefined, flexShrink: grow ? 1 : 0, height: 48, borderRight: '1px solid #E4E5E9', borderBottom: '1px solid #E4E5E9', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function cellText(text: string, color = '#2E3238') {
  return <span style={{ fontFamily: ff, fontWeight: 400, fontSize: 15, color, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>;
}

export default function ContractRateManagement() {
  const [partners, setPartners] = useState<TradePartner[]>(() => getPartners());
  useEffect(() => subscribePartners(() => setPartners(getPartners())), []);

  const [rates, setRates] = useState<ContractRate[]>(() => getContractRates());
  useEffect(() => subscribeContractRates(() => setRates(getContractRates())), []);

  const [showRegister, setShowRegister] = useState(false);
  const [detailRate, setDetailRate] = useState<ContractRate | null>(null);

  const partnerOf = (id: number) => partners.find(p => p.id === id);
  const scheduleOf = (rate: ContractRate) => partnerOf(rate.partnerId)?.settleSchedules.find(s => s.id === rate.scheduleId);

  if (detailRate) {
    return (
      <ContractRateDetailPage
        rate={detailRate}
        partner={partnerOf(detailRate.partnerId)}
        scheduleName={scheduleOf(detailRate)?.name ?? '-'}
        onBack={() => setDetailRate(null)}
        onSave={updateContractRate}
      />
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={10} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onAddClick={() => setShowRegister(true)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 32px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15, color: '#2E3238', letterSpacing: '-0.02em' }}>총 {rates.length.toLocaleString()}건</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ minWidth: 660, width: '100%' }}>
              <div style={{ display: 'flex', width: '100%', borderTop: '1px solid #E4E5E9' }}>
                <Th label="거래처" width={COL_WIDTHS.partner} />
                <Th label="거래처 정산스케줄" width={COL_WIDTHS.schedule} />
                <Th label="계약운임표 유형" width={COL_WIDTHS.type} grow />
              </div>
              {rates.map(r => (
                <div key={r.id} onClick={() => setDetailRate(r)} style={{ display: 'flex', width: '100%', cursor: 'pointer' }}>
                  <Td width={COL_WIDTHS.partner}>{cellText(partnerOf(r.partnerId)?.alias ?? '-')}</Td>
                  <Td width={COL_WIDTHS.schedule}>{cellText(scheduleOf(r)?.name ?? '-', '#5C6370')}</Td>
                  <Td width={COL_WIDTHS.type} grow>{cellText(r.type)}</Td>
                </div>
              ))}
              {rates.length === 0 && (
                <div style={{ height: 120, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9197A1', fontFamily: ff, fontSize: 15, borderBottom: '1px solid #E4E5E9' }}>
                  등록된 계약운임표가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRegister && (
        <ContractRateRegisterModal
          partners={partners}
          onClose={() => setShowRegister(false)}
          onCreated={rate => { setShowRegister(false); setDetailRate(rate); }}
        />
      )}
    </div>
  );
}
