// 거래처(협력사/화주사) 마스터 데이터 공유 스토어
// 거래처관리 화면에서 등록/수정한 내용을 배차관리(오더 상세)·계약운임표 관리 등 다른 화면에서도 참조할 수 있도록 공용으로 둠

import { getGroups } from './companyStore';

export type TradeStatus = '정상' | '거래중지';

export type SettleSchedule = {
  id: string;
  name: string;           // 스케줄명 (기본값 "기본스케줄")
  subBizNumber: string;   // 종사업장번호
  settlePeriodStart: number; // 정산기간 시작일 (1~31)
  settlePeriodEnd: number;   // 정산기간 종료일 (1~31)
  receiptDefault: string; // 인수증 기본설정
  collectDueDate: string; // 수금예정일
  taxEmail: string;       // 세금계산서 이메일
  account: string;        // 계좌정보
  settleMemo: string;     // 정산 메모
};

export type PartnerContact = {
  id: string;
  name: string;
  department: string; // 소속팀/업무그룹 (자유 텍스트)
  phone: string;  // 전화번호
  fax: string;    // 팩스번호
  email: string;  // 이메일
  memo: string;
};

export type SharedGroupMapping = {
  groupName: string;   // 상대방 업무그룹명
  scheduleId: string;  // 매핑된 우리 정산스케줄 id
};

export type TradePartner = {
  id: number;
  status: TradeStatus;
  alias: string;         // 거래처별칭
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
  tTrucker: boolean;     // T 트럭커 시스템 가입 여부 — 공유그룹 노출 기준
  sharedGroups: SharedGroupMapping[]; // 가입인 경우 상대방 업무그룹 목록(+매핑)
  settleSchedules: SettleSchedule[];  // 우리가 만든 정산스케줄
  contacts: PartnerContact[];         // 거래처 직원정보
  // 이 거래처를 담당하는 우리 업무그룹(회사 > 업무그룹 관리에서 등록한 그룹).
  // 업무그룹 자체엔 격리/공유 개념이 없고 멤버 구성이 곧 접근 범위이므로, 여러 회사가 같이 봐야 하면 관련자를
  // 모두 포함하는 그룹을 만들어 지정하고 특정 담당자만 봐야 하면 그 담당자만 포함하는 그룹을 만들어 지정한다.
  // 배차관리에서 화주사/요청 거래처 입력 권한 판단 기준으로 쓰인다.
  mainGroupId: string;       // 메인 담당 업무그룹 — 거래처당 반드시 1개
  assignedGroupIds: string[]; // 담당 업무그룹 — 여러 개 지정 가능(메인 담당 업무그룹 포함)
};

const ALIASES = [
  '글로벌로지스 판교점', '케이로지스틱스 본사', '판교물류솔루션', '수원익스프레스 물류센터', '동탄스마트물류',
  '한국물류 강남지사', '대한통운파트너스', '신세계물류 이천센터', '롯데로지스 용인지사', '현대글로비스파트너',
  'CJ물류파트너 부천', '한진로지스틱스 수원', '쿠팡파트너스 김포', '네이버물류 성남', 'GS물류 인천',
  '우체국물류지원단', '일양로지스', '세방로지스틱스 부산', '범한판토스 광양', 'KSS해운 물류',
  'KDEX물류 대전', '팬스타로지스틱스', '동방 창원', '천일정기화물',
];
const BIZ_NAMES = [
  '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류',
  '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스', '(주)현대글로비스파트너',
  '(주)CJ물류파트너', '(주)한진로지스틱스', '(주)쿠팡파트너스', '(주)네이버물류', '(주)GS물류',
  '(주)우체국물류지원', '(주)일양로지스', '(주)세방로지스틱스', '(주)범한판토스', '(주)KSS해운',
  '(주)KDEX물류', '(주)팬스타로지스틱스', '(주)동방', '(주)천일정기화물',
];
const ADDRS = [
  '경기 성남시 분당구 판교역로 235', '서울 강남구 테헤란로 152', '경기 성남시 수정구 위례동',
  '경기 수원시 영통구 광교로 145', '경기 화성시 동탄대로 537', '서울 강남구 논현로 566',
  '서울 중구 을지로 100', '경기 이천시 마장면 서경로 428', '경기 용인시 기흥구 공세로 175',
  '인천 연수구 송도과학로 30', '경기 부천시 조마루로 385', '경기 수원시 권선구 오목천로 152',
  '경기 김포시 하늘길 78', '경기 성남시 중원구 둔촌대로 545', '인천 남동구 논현로 100',
  '서울 용산구 한강대로 32', '경기 안양시 동안구 시민대로 230', '부산 강서구 녹산산단로 100',
  '전남 광양시 항만대로 465', '부산 중구 충장대로 20', '대전 유성구 대덕대로 480',
  '부산 동구 초량동 620', '경남 창원시 성산구 창원대로 754', '서울 송파구 오금로 62',
];
const ADDR_DETAILS = ['3-6 5-10층(역삼동, 스마트타워)', '2층', '본관 5층', '물류동 A', '405호', '별관 2층', '본사동 3층'];
const BIZ_TYPES = ['운수업', '도소매업', '서비스업'];
const BIZ_ITEMS = ['화물자동차운송업', '물류대행업', '운송주선업', '택배업'];
const CEO_NAMES = ['김태우', '이수현', '박준호', '최영진', '정민경', '강도윤', '윤서아'];
const SHARED_GROUP_POOLS = [
  ['기본그룹'],
  ['배송1팀', '배송2팀'],
  ['인천 물류센터'],
  ['기본그룹', '수도권팀'],
  ['영업1팀', '영업2팀', '영업3팀'],
];
const CONTACT_NAMES = ['김민준', '이서준', '박도윤', '최예준', '정시우', '강주원', '윤하준'];
const CONTACT_MEMOS = ['배차 담당', '정산/세금계산서 담당', '현장 배차 담당', '계약 담당자'];
const CONTACT_DEPARTMENTS = ['배송1팀', '배송2팀', '정산팀', '영업팀', '현장운영팀', '인천 물류센터'];

function xhash(i: number) {
  let h = i ^ (i >>> 13);
  h = Math.imul(h, 0x9e3779b9 | 0);
  h ^= h >>> 11;
  return (h >>> 0) % 1000000 / 1000000;
}

let idSeq = 0;
export function genId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function makeSchedule(name: string, salt: number): SettleSchedule {
  return {
    id: genId('sch'),
    name,
    subBizNumber: '',
    settlePeriodStart: 1,
    settlePeriodEnd: 31,
    receiptDefault: '필요 없음',
    collectDueDate: '매월 10일',
    taxEmail: '',
    account: '',
    settleMemo: '',
  };
}

function makeContact(i: number, offset: number): PartnerContact {
  const idx = (i + offset) % CONTACT_NAMES.length;
  return {
    id: genId('ct'),
    name: CONTACT_NAMES[idx],
    department: CONTACT_DEPARTMENTS[(i + offset) % CONTACT_DEPARTMENTS.length],
    phone: `010-${String(2000 + i * 41 + offset).padStart(4, '0')}-${String(3000 + i * 59 + offset).padStart(4, '0')}`,
    fax: `02-${String(500 + i * 13 + offset).padStart(3, '0')}-${String(1000 + i * 29 + offset).padStart(4, '0')}`,
    email: `${CONTACT_NAMES[idx]}@example.com`,
    memo: CONTACT_MEMOS[(i + offset) % CONTACT_MEMOS.length],
  };
}

export type BizRecord = { bizName: string; bizNumber: string; address: string; addressDetail: string; bizType: string; bizItem: string };

export const MOCK_BIZ_REGISTRY: BizRecord[] = BIZ_NAMES.map((bizName, i) => ({
  bizName,
  bizNumber: `${String(100 + i * 7).padStart(3, '0')}-${String(10 + (i % 88)).padStart(2, '0')}-${String(10000 + i * 137).padStart(5, '0')}`,
  address: ADDRS[i % ADDRS.length],
  addressDetail: ADDR_DETAILS[i % ADDR_DETAILS.length],
  bizType: BIZ_TYPES[i % BIZ_TYPES.length],
  bizItem: BIZ_ITEMS[i % BIZ_ITEMS.length],
}));

function genAssignedGroups(i: number): { mainGroupId: string; assignedGroupIds: string[] } {
  const groupIds = getGroups().map(g => g.id);
  if (groupIds.length === 0) return { mainGroupId: '', assignedGroupIds: [] };
  const mainGroupId = groupIds[i % groupIds.length];
  const extra = groupIds[(i + 1) % groupIds.length];
  const assignedGroupIds = i % 3 === 0 && extra !== mainGroupId ? [mainGroupId, extra] : [mainGroupId];
  return { mainGroupId, assignedGroupIds };
}

function genPartners(): TradePartner[] {
  return ALIASES.map((alias, i) => {
    const r = xhash(i + 1);
    const yy = 25 + (i % 2);
    const mm = String((i % 12) + 1).padStart(2, '0');
    const dd = String((i % 27) + 1).padStart(2, '0');
    const hh = String((i * 3) % 24).padStart(2, '0');
    const mi = String((i * 7) % 60).padStart(2, '0');
    const biz = MOCK_BIZ_REGISTRY[i % MOCK_BIZ_REGISTRY.length];
    const tTrucker = r > 0.45; // 시스템 가입 여부 — 공유그룹 노출 기준
    const defaultSchedule = makeSchedule('기본스케줄', i + 1);
    const settleSchedules = i % 4 === 0 ? [defaultSchedule, makeSchedule('추가스케줄', i + 51)] : [defaultSchedule];
    const groupNames = tTrucker ? SHARED_GROUP_POOLS[i % SHARED_GROUP_POOLS.length] : [];
    const sharedGroups: SharedGroupMapping[] = groupNames.map(groupName => ({ groupName, scheduleId: defaultSchedule.id }));
    const contacts: PartnerContact[] = i % 3 === 0 ? [] : [
      makeContact(i, 0),
      ...(i % 5 === 0 ? [makeContact(i, 2)] : []),
    ];
    const { mainGroupId, assignedGroupIds } = genAssignedGroups(i);
    return {
      id: i + 1,
      status: r > 0.12 ? '정상' : '거래중지',
      alias,
      bizName: biz.bizName,
      bizNumber: biz.bizNumber,
      address: biz.address,
      addressDetail: biz.addressDetail,
      bizType: biz.bizType,
      bizItem: biz.bizItem,
      ceoName: CEO_NAMES[i % CEO_NAMES.length],
      contact: `010-${String(1000 + i * 37).padStart(4, '0')}-${String(2000 + i * 53).padStart(4, '0')}`,
      taxEmail: `settle${i + 1}@example.com`,
      memo: i % 4 === 1 ? '상차 시 지게차 필요, 사전 연락 필수' : '',
      registeredAt: `${yy}.${mm}.${dd} ${hh}:${mi}`,
      tTrucker,
      sharedGroups,
      settleSchedules,
      contacts,
      mainGroupId,
      assignedGroupIds,
    };
  });
}

// ─── Store ──────────────────────────────────────────────────────────────────

let _partners: TradePartner[] = genPartners();
const _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach(fn => fn());
}

export function getPartners(): TradePartner[] {
  return _partners;
}

export function addPartner(p: TradePartner): void {
  _partners = [p, ..._partners];
  notify();
}

export function updatePartner(updated: TradePartner): void {
  _partners = _partners.map(p => p.id === updated.id ? updated : p);
  notify();
}

export function subscribePartners(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

// 사업자명(bizName) 기준으로 등록된 거래처를 찾는다 — 오더의 화주사/요청 거래처 이름과 매칭할 때 사용
export function findPartnerByBizName(bizName: string): TradePartner | undefined {
  return _partners.find(p => p.bizName === bizName);
}
