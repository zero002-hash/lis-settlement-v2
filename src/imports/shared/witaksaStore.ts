// 위탁사(하도급 계약을 맺고 오더를 위탁할 수 있는 협력사) 마스터 데이터 공유 스토어
// 주선사/운송사 등 사업자 유형과 무관하게, "우리가 위탁할 수 있는 대상"이라는 관계로 묶는다.
// 거래처(매출 대상)와 달리 공유그룹/정산스케줄 개념이 없다 — 담당 업무그룹만 여러 개 지정한다.

import { MOCK_BIZ_REGISTRY, type BizRecord } from './geoRaecheoStore';
import { getGroups } from './companyStore';

export type SubTradeStatus = '정상' | '거래중지';

export type Subcontractor = {
  id: number;
  status: SubTradeStatus;
  alias: string;         // 위탁사별칭
  bizName: string;       // 사업자명
  bizNumber: string;     // 사업자번호
  address: string;       // 기본주소
  addressDetail: string; // 상세주소
  bizType: string;       // 업태
  bizItem: string;       // 종목
  ceoName: string;       // 대표자명
  contact: string;       // 연락처
  taxEmail: string;      // 세금계산서 이메일
  memo: string;          // 배차운영메모
  registeredAt: string;  // 등록일시
  assignedGroupIds: string[]; // 담당 업무그룹 — 여러 개 지정 가능
};

export type { BizRecord };
export { MOCK_BIZ_REGISTRY };

const ALIASES = [
  '대성카고 화물팀', '엠케이 운송', '삼일익스프레스', '한빛로지스틱스', '동서화물주선',
  '유성물류 운송팀', '중앙카고', '태양로지스', '신성익스프레스', '으뜸물류주선',
  '광명화물운송', '하나로지스틱스',
];

let idSeq = 0;
function genId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

function xhash(i: number) {
  let h = i ^ (i >>> 13);
  h = Math.imul(h, 0x9e3779b9 | 0);
  h ^= h >>> 11;
  return (h >>> 0) % 1000000 / 1000000;
}

function genAssignedGroupIds(i: number): string[] {
  const groupIds = getGroups().map(g => g.id);
  if (groupIds.length === 0) return [];
  const main = groupIds[i % groupIds.length];
  const extra = groupIds[(i + 2) % groupIds.length];
  return i % 3 === 0 && extra !== main ? [main, extra] : [main];
}

function genSubcontractors(): Subcontractor[] {
  return ALIASES.map((alias, i) => {
    const r = xhash(i + 1);
    const yy = 25 + (i % 2);
    const mm = String((i % 12) + 1).padStart(2, '0');
    const dd = String((i % 27) + 1).padStart(2, '0');
    const hh = String((i * 5) % 24).padStart(2, '0');
    const mi = String((i * 11) % 60).padStart(2, '0');
    const biz = MOCK_BIZ_REGISTRY[(i + 3) % MOCK_BIZ_REGISTRY.length];
    return {
      id: i + 1,
      status: r > 0.15 ? '정상' : '거래중지',
      alias,
      bizName: biz.bizName,
      bizNumber: biz.bizNumber,
      address: biz.address,
      addressDetail: biz.addressDetail,
      bizType: biz.bizType,
      bizItem: biz.bizItem,
      ceoName: ['김태우', '이수현', '박준호', '최영진', '정민경'][i % 5],
      contact: `010-${String(4000 + i * 43).padStart(4, '0')}-${String(5000 + i * 61).padStart(4, '0')}`,
      taxEmail: `witaksa${i + 1}@example.com`,
      memo: i % 4 === 1 ? '배차 전 차량 도착 예정시간 필히 공유' : '',
      registeredAt: `${yy}.${mm}.${dd} ${hh}:${mi}`,
      assignedGroupIds: genAssignedGroupIds(i),
    };
  });
}

// ─── Store ──────────────────────────────────────────────────────────────────

let _subcontractors: Subcontractor[] = genSubcontractors();
const _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach(fn => fn());
}

export function getSubcontractors(): Subcontractor[] {
  return _subcontractors;
}

export function addSubcontractor(s: Subcontractor): void {
  _subcontractors = [s, ..._subcontractors];
  notify();
}

export function updateSubcontractor(updated: Subcontractor): void {
  _subcontractors = _subcontractors.map(s => s.id === updated.id ? updated : s);
  notify();
}

export function subscribeSubcontractors(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

export { genId };
