// 회사(업무그룹/직원) 마스터 데이터 공유 스토어
// 회사 > 업무그룹 관리 / 직원 관리 화면에서 등록·수정한 내용을 거래처관리(담당 업무그룹 지정)·
// 배차관리(오더 등록 시 화주사/요청 거래처 입력 권한, 배차담당 지정) 등 다른 화면에서도 참조한다.

export type WorkGroup = {
  id: string;
  name: string;
  memo: string;
  registeredAt: string;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  department: string; // 소속(직책 등 자유 텍스트)
  groupIds: string[]; // 담당 업무그룹(복수 배치 가능)
  memo: string;
  registeredAt: string;
};

let idSeq = 0;
function genId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

// 업무그룹은 "격리형/공유형" 같은 별도 속성을 갖지 않는다 — 그룹의 멤버 구성 자체가 곧 접근 범위다.
// 예) 대성카고 그룹: 대성카고 소속 담당자만 넣어 격리 / 공동대응그룹: 케이드라이브 + 대성카고 담당자를 함께 넣어 공유
// (KD는 "케이드라이브"의 약자로 우리 회사 자체를 가리키므로, 외부 협력사 예시명으로 쓰지 않는다)
function seedGroups(): WorkGroup[] {
  const rows: Array<[string, string]> = [
    ['영업1팀', '케이드라이브 내부 영업1팀'],
    ['영업2팀', '케이드라이브 내부 영업2팀'],
    ['대성카고 그룹', '대성카고(협력사) 담당자 전용 — 격리 대상 거래처 지정용'],
    ['엠케이 그룹', '엠케이(협력사) 담당자 전용 — 정산 조회를 위해 대성카고 담당자(최다인)도 함께 배치됨'],
    ['공동대응그룹', '케이드라이브 + 대성카고 담당자가 함께 보는 거래처용 (공유 예시)'],
  ];
  return rows.map(([name, memo], i) => ({
    id: genId('grp'),
    name,
    memo,
    registeredAt: `26.0${(i % 9) + 1}.0${(i % 9) + 1} 09:00`,
  }));
}

let _groups: WorkGroup[] = seedGroups();

function seedEmployees(): Employee[] {
  const g = (name: string) => _groups.find(gr => gr.name === name)!.id;
  const rows: Array<[string, string, string, string, string[], string]> = [
    ['김카모', '010-2233-4455', 'kimcarmo@example.com', '케이드라이브 영업1팀 팀장', [g('영업1팀'), g('공동대응그룹')], ''],
    ['이수진', '010-3344-5566', 'sjlee@example.com', '케이드라이브 영업2팀', [g('영업2팀')], ''],
    ['박준영', '010-4455-6677', 'jypark@example.com', '케이드라이브 영업1팀', [g('영업1팀')], ''],
    ['최다인', '010-5566-7788', 'dchoi@example.com', '대성카고 배차팀', [g('대성카고 그룹'), g('엠케이 그룹')], '정산 시 엠케이 그룹 담당 거래처 오더 조회 필요'],
    ['정하늘', '010-6677-8899', 'hnjung@example.com', '대성카고 배차팀', [g('대성카고 그룹'), g('공동대응그룹')], '케이드라이브와 공동대응 거래처 담당'],
    ['강민서', '010-7788-9900', 'mskang@example.com', '엠케이 운영팀', [g('엠케이 그룹')], ''],
  ];
  return rows.map(([name, phone, email, department, groupIds, memo], i) => ({
    id: genId('emp'),
    name,
    phone,
    email,
    department,
    groupIds,
    memo,
    registeredAt: `26.0${(i % 9) + 1}.1${i} 10:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`,
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

export function updateGroup(id: string, patch: Partial<Pick<WorkGroup, 'name' | 'memo'>>): void {
  _groups = _groups.map(g => (g.id === id ? { ...g, ...patch } : g));
  notify();
}

export function deleteGroup(id: string): void {
  _groups = _groups.filter(g => g.id !== id);
  _employees = _employees.map(e => (e.groupIds.includes(id) ? { ...e, groupIds: e.groupIds.filter(gid => gid !== id) } : e));
  notify();
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

// ─── 현재 로그인한 직원 ──────────────────────────────────────────────────────

export function getCurrentEmployee(): Employee {
  return _employees.find(e => e.id === _currentEmployeeId) ?? _employees[0];
}

export function getCurrentEmployeeGroupIds(): string[] {
  return getCurrentEmployee().groupIds;
}
