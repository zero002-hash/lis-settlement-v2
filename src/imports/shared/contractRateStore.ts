// 계약운임표 공유 스토어 — 거래처 + 정산스케줄 단위로 등록되는 운임표
import { getPartners } from "./geoRaecheoStore";

export type ContractRateType = '상차지 기준' | '거리 기준' | '물품 톤수 기준' | '물품 개수 기준' | '상차지+거리 기준';

export const CONTRACT_RATE_TYPES: ContractRateType[] = [
  '상차지 기준', '거리 기준', '물품 톤수 기준', '물품 개수 기준', '상차지+거리 기준',
];

export const TON_OPTIONS = ['1톤', '2.5톤', '3.5톤', '5톤', '8톤', '11톤', '25톤'];
export const CAR_TYPE_OPTIONS = ['카고', '윙바디', '탑차', '리프트', '냉장', '냉동'];
export const NATIONWIDE_REGIONS = ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '부산', '울산', '제주'];

// 하차지(행) × 차량톤수+차량종류 조합(열) 매트릭스로 관리

export type VehicleCombo = {
  id: string;
  tonType: string;
  carType: string;
};

export type RateCell = {
  billingAmt: number;  // 청구금액
  dispatchAmt: number; // 배차금액
};

export type ContractRate = {
  id: string;
  partnerId: number;
  scheduleId: string;
  type: ContractRateType;
  // 상차지 기준 전용 필드
  loadLoc: string;
  unloadScope: '전국' | '특정구간';
  unloadLocs: string[];          // 하차지 목록 (좌측 행)
  vehicleCombos: VehicleCombo[]; // 톤수+차종 조합 목록 (상단 열)
  cells: Record<string, RateCell>; // key = cellKey(unloadLoc, comboId)
};

let idSeq = 0;
function genId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function cellKey(unloadLoc: string, comboId: string) {
  return `${unloadLoc}::${comboId}`;
}

export function makeCombo(tonType = TON_OPTIONS[3], carType = CAR_TYPE_OPTIONS[0]): VehicleCombo {
  return { id: genId('combo'), tonType, carType };
}

function makeEmptyRate(partnerId: number, scheduleId: string): ContractRate {
  return {
    id: genId('rate'),
    partnerId,
    scheduleId,
    type: '상차지 기준',
    loadLoc: '',
    unloadScope: '특정구간',
    unloadLocs: [],
    vehicleCombos: [],
    cells: {},
  };
}

// ─── Mock 데이터 ────────────────────────────────────────────────────────────

function mk(
  partnerIdx: number,
  type: ContractRateType,
  loadLoc: string,
  unloadScope: '전국' | '특정구간',
  unloadLocs: string[],
  comboDefs: [string, string][],
  amounts: Record<string, [number, number]>, // key: `${unloadLoc}::${tonType}/${carType}` -> [billing, dispatch]
): ContractRate {
  const partners = getPartners();
  const p = partners[partnerIdx % partners.length];
  const combos = comboDefs.map(([tonType, carType]) => makeCombo(tonType, carType));
  const cells: Record<string, RateCell> = {};
  unloadLocs.forEach(loc => {
    combos.forEach(combo => {
      const amt = amounts[`${loc}::${combo.tonType}/${combo.carType}`];
      if (amt) cells[cellKey(loc, combo.id)] = { billingAmt: amt[0], dispatchAmt: amt[1] };
    });
  });
  return {
    id: genId('rate'),
    partnerId: p.id,
    scheduleId: p.settleSchedules[0].id,
    type,
    loadLoc,
    unloadScope,
    unloadLocs,
    vehicleCombos: combos,
    cells,
  };
}

function genMockRates(): ContractRate[] {
  const partners = getPartners();
  if (partners.length === 0) return [];

  return [
    mk(0, '상차지 기준', '이천물류센터', '특정구간',
      ['영등포물류센터', '강남허브', '인천ICD'],
      [['5톤', '카고'], ['5톤', '윙바디'], ['8톤', '카고']],
      {
        '영등포물류센터::5톤/카고': [280000, 240000],
        '영등포물류센터::5톤/윙바디': [300000, 260000],
        '강남허브::5톤/카고': [260000, 220000],
        '강남허브::8톤/카고': [340000, 300000],
        '인천ICD::5톤/카고': [300000, 260000],
        '인천ICD::8톤/카고': [320000, 280000],
      },
    ),
    mk(2, '상차지 기준', '판교테크노밸리', '전국',
      ['서울', '경기', '인천', '강원', '부산'],
      [['3.5톤', '카고'], ['5톤', '카고'], ['8톤', '윙바디']],
      {
        '서울::3.5톤/카고': [200000, 170000],
        '서울::5톤/카고': [250000, 210000],
        '경기::3.5톤/카고': [180000, 150000],
        '경기::5톤/카고': [220000, 190000],
        '인천::5톤/카고': [270000, 230000],
        '인천::8톤/윙바디': [340000, 300000],
        '강원::8톤/윙바디': [420000, 370000],
        '부산::8톤/윙바디': [520000, 460000],
      },
    ),
    mk(5, '상차지 기준', '부천허브', '특정구간',
      ['성남물류센터', '수원물류센터'],
      [['2.5톤', '탑차'], ['3.5톤', '카고']],
      {
        '성남물류센터::2.5톤/탑차': [150000, 120000],
        '수원물류센터::3.5톤/카고': [190000, 160000],
      },
    ),
    mk(9, '상차지 기준', '김포공항물류', '전국',
      ['경기', '충남'],
      [['5톤', '카고']],
      {
        '경기::5톤/카고': [240000, 200000],
        '충남::5톤/카고': [350000, 300000],
      },
    ),
    mk(13, '거리 기준', '', '특정구간', [], [], {}),
  ];
}

let _rates: ContractRate[] = genMockRates();
const _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach(fn => fn());
}

export function getContractRates(): ContractRate[] {
  return _rates;
}

export function addContractRate(partnerId: number, scheduleId: string): ContractRate {
  const rate = makeEmptyRate(partnerId, scheduleId);
  _rates = [rate, ..._rates];
  notify();
  return rate;
}

export function updateContractRate(updated: ContractRate): void {
  _rates = _rates.map(r => r.id === updated.id ? updated : r);
  notify();
}

export function subscribeContractRates(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}

export function hasContractRate(partnerId: number, scheduleId: string): boolean {
  return _rates.some(r => r.partnerId === partnerId && r.scheduleId === scheduleId);
}
