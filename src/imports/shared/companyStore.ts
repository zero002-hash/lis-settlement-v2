// 회사(업무그룹/직원) 마스터 데이터 공유 스토어
// 회사 > 업무그룹 관리 / 직원 관리 화면에서 등록·수정한 내용을 거래처관리(담당 업무그룹 지정)·
// 배차관리(오더 등록 시 화주사/요청 거래처 입력 권한, 배차담당 지정) 등 다른 화면에서도 참조한다.

export type ReceiptSetting = '원본/사진 필수' | '사진 필수' | '필요 없음';
export const RECEIPT_SETTINGS: ReceiptSetting[] = ['원본/사진 필수', '사진 필수', '필요 없음'];

// 우리 회사 사업자정보에 등록된 세금계산서 이메일 — 업무그룹 추가 시 세금계산서 이메일 기본값
export const COMPANY_TAX_EMAIL = 'settle@kdrive.co.kr';

export type WorkGroup = {
  id: string;
  name: string;
  memo: string;              // 업무그룹 설명
  registeredAt: string;
  isDefault?: boolean;       // 기본그룹 — 사업자 등록 시 자동 생성, 삭제 불가
  taxEmail: string;          // 세금계산서 이메일
  receiptSetting: ReceiptSetting; // 인수증 수취 설정
  subBizNumber: string;      // 종사업장번호 (숫자 4자리)
  carrierIds: number[];      // 이용 가능한 운송사 — 거래처관리의 협력사 거래처 id
};

export type EmployeeRole = '관리자' | '배차담당' | '관제담당' | '현장담당' | '배차정산담당';
export const EMPLOYEE_ROLES: EmployeeRole[] = ['관리자', '배차담당', '관제담당', '현장담당', '배차정산담당'];

export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  department: string; // 소속(직책 등 자유 텍스트)
  groupIds: string[]; // 담당 업무그룹(복수 배치 가능)
  memo: string;
  registeredAt: string;
  title?: string;        // 직함/직책
  workPhone?: string;    // 업무 전화번호
  role?: EmployeeRole;   // 권한
  suspended?: boolean;   // 권한정지
};

let idSeq = 0;
function genId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

// 업무그룹은 "격리형/공유형" 같은 별도 속성을 갖지 않는다 — 그룹의 멤버 구성 자체가 곧 접근 범위다.
// 예) 대성카고 그룹: 대성카고 소속 담당자만 넣어 격리 / 공동대응그룹: 케이드라이브 + 대성카고 담당자를 함께 넣어 공유
// (KD는 "케이드라이브"의 약자로 우리 회사 자체를 가리키므로, 외부 협력사 예시명으로 쓰지 않는다)
// 기본그룹은 사업자 등록 시 자동 생성되는 그룹으로 맨 앞에 두며 삭제할 수 없다.
// 다른 화면의 시드 데이터(거래처/위탁사 담당 그룹 배분)는 기본그룹을 제외한 그룹으로 돌린다.
function seedGroups(): WorkGroup[] {
  const rows: Array<[string, string, ReceiptSetting, string, number[]]> = [
    ['기본그룹', '', '원본/사진 필수', '', [3, 6, 9, 12]],
    ['영업1팀', '케이드라이브 내부 영업1팀', '원본/사진 필수', '', [3, 6]],
    ['영업2팀', '케이드라이브 내부 영업2팀', '사진 필수', '0002', [9]],
    ['대성카고 그룹', '대성카고 담당자 전용 거래처 지정용', '사진 필수', '', [12, 15]],
    ['엠케이 그룹', '엠케이 담당자 전용, 대성카고 담당자 함께 배치', '필요 없음', '', []],
    ['공동대응그룹', '케이드라이브와 대성카고 공동 대응 거래처용', '원본/사진 필수', '0005', [3, 18, 21]],
  ];
  return rows.map(([name, memo, receiptSetting, subBizNumber, carrierIds], i) => ({
    id: genId('grp'),
    name,
    memo,
    registeredAt: `26.0${(i % 9) + 1}.0${(i % 9) + 1} 09:00`,
    ...(i === 0 ? { isDefault: true } : {}),
    taxEmail: i === 0 ? COMPANY_TAX_EMAIL : `group${i}@kdrive.co.kr`,
    receiptSetting,
    subBizNumber,
    carrierIds,
  }));
}

let _groups: WorkGroup[] = seedGroups();

function seedEmployees(): Employee[] {
  const g = (name: string) => _groups.find(gr => gr.name === name)!.id;
  // 현재 로그인한 직원(김카모)은 기본그룹에 넣지 않는다 — 배차관리의 거래처 입력 권한 예시가 그대로 유지되도록
  const rows: Array<[string, string, string, string, string[], string, string, EmployeeRole, boolean]> = [
    ['김카모', '010-2233-4455', 'kimcarmo@example.com', '케이드라이브 영업1팀 팀장', [g('영업1팀'), g('공동대응그룹')], '', '팀장', '관리자', false],
    ['이수진', '010-3344-5566', 'sjlee@example.com', '케이드라이브 영업2팀', [g('기본그룹'), g('영업2팀')], '', '대리', '배차담당', false],
    ['박준영', '010-4455-6677', 'jypark@example.com', '케이드라이브 영업1팀', [g('기본그룹'), g('영업1팀')], '', '사원', '배차정산담당', false],
    ['최다인', '010-5566-7788', 'dchoi@example.com', '대성카고 배차팀', [g('대성카고 그룹'), g('엠케이 그룹')], '정산 시 엠케이 그룹 담당 거래처 오더 조회 필요', '과장', '배차담당', false],
    ['정하늘', '010-6677-8899', 'hnjung@example.com', '대성카고 배차팀', [g('대성카고 그룹'), g('공동대응그룹')], '케이드라이브와 공동대응 거래처 담당', '대리', '관제담당', true],
    ['강민서', '010-7788-9900', 'mskang@example.com', '엠케이 운영팀', [g('엠케이 그룹')], '', '사원', '현장담당', false],
  ];
  return rows.map(([name, phone, email, department, groupIds, memo, title, role, suspended], i) => ({
    id: genId('emp'),
    name,
    phone,
    email,
    department,
    groupIds,
    memo,
    registeredAt: `26.0${(i % 9) + 1}.1${i} 10:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`,
    title,
    workPhone: `02-${String(1500 + i * 111).padStart(4, '0')}-${String(2000 + i * 37).padStart(4, '0')}`,
    role,
    suspended,
  }));
}

let _employees: Employee[] = seedEmployees();
// 현재 로그인한 직원 — 로그인 체계가 없는 프로토타입이라 LNB 프로필("김카모")과 동일 인물로 고정
const _currentEmployeeId = _employees[0].id;

const _listeners: (() => void)[] = [];
function notify() {
  _listeners.forEach(fn => fn());
}
export function subscribeCompany(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

// ─── 업무그룹 ───────────────────────────────────────────────────────────────

export function getGroups(): WorkGroup[] {
  return _groups;
}

export function addGroup(g: Omit<WorkGroup, 'id' | 'registeredAt'>): WorkGroup {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const newGroup: WorkGroup = {
    ...g,
    id: genId('grp'),
    registeredAt: `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
  _groups = [..._groups, newGroup];
  notify();
  return newGroup;
}

export function updateGroup(id: string, patch: Partial<Omit<WorkGroup, 'id' | 'registeredAt' | 'isDefault'>>): void {
  _groups = _groups.map(g => (g.id === id ? { ...g, ...patch } : g));
  notify();
}

// 기본그룹은 삭제할 수 없다. moveToGroupId가 있으면 소속 직원을 그 그룹으로 옮긴다.
export function deleteGroup(id: string, moveToGroupId?: string): void {
  if (_groups.find(g => g.id === id)?.isDefault) return;
  _groups = _groups.filter(g => g.id !== id);
  _employees = _employees.map(e => {
    if (!e.groupIds.includes(id)) return e;
    const rest = e.groupIds.filter(gid => gid !== id);
    return { ...e, groupIds: moveToGroupId && !rest.includes(moveToGroupId) ? [...rest, moveToGroupId] : rest };
  });
  notify();
}

export function getDefaultGroup(): WorkGroup | undefined {
  return _groups.find(g => g.isDefault);
}

export function getGroupName(id: string): string {
  return _groups.find(g => g.id === id)?.name ?? '';
}

// ─── 직원 ───────────────────────────────────────────────────────────────────

export function getEmployees(): Employee[] {
  return _employees;
}

export function getEmployeesInGroup(groupId: string): Employee[] {
  return _employees.filter(e => e.groupIds.includes(groupId));
}

export function addEmployee(e: Omit<Employee, 'id' | 'registeredAt'>): Employee {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const newEmployee: Employee = {
    ...e,
    id: genId('emp'),
    registeredAt: `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
  _employees = [..._employees, newEmployee];
  notify();
  return newEmployee;
}

export function updateEmployee(id: string, patch: Partial<Omit<Employee, 'id' | 'registeredAt'>>): void {
  _employees = _employees.map(e => (e.id === id ? { ...e, ...patch } : e));
  notify();
}

export function deleteEmployee(id: string): void {
  _employees = _employees.filter(e => e.id !== id);
  notify();
}

// 특정 업무그룹에 담당자를 추가/제거 (업무그룹 상세 화면에서 사용)
export function addEmployeeToGroup(employeeId: string, groupId: string): void {
  _employees = _employees.map(e => (e.id === employeeId && !e.groupIds.includes(groupId) ? { ...e, groupIds: [...e.groupIds, groupId] } : e));
  notify();
}

export function removeEmployeeFromGroup(employeeId: string, groupId: string): void {
  _employees = _employees.map(e => (e.id === employeeId ? { ...e, groupIds: e.groupIds.filter(g => g !== groupId) } : e));
  notify();
}

// 업무그룹 소속 직원을 한 번에 바꾼다 (업무그룹 상세 > 소속 직원 추가/변경)
export function setGroupMembers(groupId: string, employeeIds: string[]): void {
  _employees = _employees.map(e => {
    const inGroup = e.groupIds.includes(groupId);
    const selected = employeeIds.includes(e.id);
    if (inGroup === selected) return e;
    return { ...e, groupIds: selected ? [...e.groupIds, groupId] : e.groupIds.filter(g => g !== groupId) };
  });
  notify();
}

// ─── 거래처 공유 설정 ────────────────────────────────────────────────────────
// 우리 업무그룹을 공유할 거래처(거래처관리의 거래처 id). 공유받은 거래처는 우리 업무그룹을 공유그룹으로 본다.

let _sharedPartnerIds: number[] = [1, 2, 4];

export function getSharedPartnerIds(): number[] {
  return _sharedPartnerIds;
}

export function setSharedPartnerIds(ids: number[]): void {
  _sharedPartnerIds = ids;
  notify();
}

// ─── 현재 로그인한 직원 ──────────────────────────────────────────────────────

export function getCurrentEmployee(): Employee {
  return _employees.find(e => e.id === _currentEmployeeId) ?? _employees[0];
}

export function getCurrentEmployeeGroupIds(): string[] {
  return getCurrentEmployee().groupIds;
}
