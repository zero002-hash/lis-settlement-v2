// 배차관리에서 취소된 오더 공유 스토어
// 탭 전환 시 컴포넌트가 remount되어도 데이터 유지
export interface CancelledOrderEntry {
  orderId: string;
  shipper: string;
  date: string;
  rowIdx: number;
  hwaBilling: number;        // 청구금액
  hwaDispatch: number;       // 배차금액
  saleCate: '미대상' | '대상';     // 청구 정산대상 여부
  purchaseCate: '미대상' | '대상'; // 배차 정산대상 여부
}

const _entries: CancelledOrderEntry[] = [];
const _listeners: (() => void)[] = [];

export function addCancelledOrder(entry: CancelledOrderEntry): void {
  if (!_entries.find(e => e.orderId === entry.orderId)) {
    _entries.unshift(entry); // 최신순 상단
    _listeners.forEach(fn => fn());
  }
}

export function getCancelledOrders(): CancelledOrderEntry[] {
  return [..._entries];
}

export function subscribeCancelledOrders(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i >= 0) _listeners.splice(i, 1);
  };
}
