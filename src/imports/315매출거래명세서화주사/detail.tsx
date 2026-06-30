import { todayYYMMDD } from '../../utils/date';
import React, { createContext, useContext, useRef, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import svgPaths from "./svg-pmm7rwile2";
import ORDER_IDS from "../shared/orderIds";
import { NavCtx } from "../shared/subTabCtx";
import SharedLnb from "../shared/SharedLnb";

const DETAIL_ROWS = 200; // 매출장부 오더 0~199번
const DETAIL_GROUPS = ["판교본사", "강남지점", "수원센터"];

// ── 행별 seeded 데이터 ──
const _LOAD_NAMES  = ["판교테크노밸리", "강남물류센터", "수원터미널", "부평허브", "마포물류"];
const _LOAD_ADDRS  = ["경기 성남시 삼평동", "서울 강남구 역삼동", "경기 수원시 영통구", "인천 부평구 경인로", "서울 마포구 상암동"];
const _UNLD_NAMES  = ["광교물류", "강동센터", "인천항만", "분당창고", "수서터미널"];
const _UNLD_ADDRS  = ["경기 수원시 이의동", "서울 강동구 성내동", "인천 중구 항동", "경기 성남시 분당구", "서울 송파구 수서동"];
const _PARTNERS    = ["강남택배", "성수물류", "수원익스", "분당특송", "마포물류"];
const _VIA         = ["0곳", "1곳", "2곳"];
const _SOLO        = ["독차", "혼적"];
const _TRIP        = ["편도", "왕복"];
const _VEHICLES    = ["1톤", "1톤, 탑", "2.5톤", "5톤", "11톤"];
const _VCHARS      = ["냉장", "냉동", "상온", "리프트", "-"];
const _AMOUNTS     = [150000, 200000, 250000, 300000, 350000, 400000, 450000];
const _MEMOS       = ["메모 내용입니다.", "특이사항 없음", "-", "긴급배송", "주의필요"];
const _PLATE_KOR   = "가나다라마바사아자차카타파하";
const _BASE_MS     = new Date(2025, 8, 1).getTime(); // 2025-09-01

const DETAIL_ROW_DATA = Array.from({ length: DETAIL_ROWS }, (_, i) => {
  const h = (seed: number) => { let s = ((i * 2654435761) + seed) >>> 0; s = (Math.imul(s ^ (s >> 16), 0x45d9f3b)) >>> 0; return s; };
  const pick = <T,>(arr: T[], seed: number): T => arr[h(seed) % arr.length];
  const loadMs  = _BASE_MS + (h(1) % 90) * 86400000;
  const unloadMs = loadMs + ((h(2) % 3) + 1) * 86400000;
  const fd = (ms: number) => { const d = new Date(ms); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
  return {
    partner:    pick(_PARTNERS, 0),
    loadDate:   fd(loadMs),
    unloadDate: fd(unloadMs),
    loadName:   pick(_LOAD_NAMES, 3),
    loadAddr:   pick(_LOAD_ADDRS, 4),
    unloadName: pick(_UNLD_NAMES, 5),
    unloadAddr: pick(_UNLD_ADDRS, 6),
    via:        pick(_VIA, 10),
    solo:       pick(_SOLO, 11),
    trip:       pick(_TRIP, 12),
    vehicle:    pick(_VEHICLES, 13),
    vchar:      pick(_VCHARS, 14),
    plate:      `${h(9) % 89 + 11}${_PLATE_KOR[h(8) % 14]} ${h(7) % 9000 + 1000}`,
    amount:     pick(_AMOUNTS, 15),
    memo:       pick(_MEMOS, 16),
  };
});
// 행 인덱스 → 업무그룹 (seeded LCG로 랜덤하게 배분)
const DETAIL_ROW_GROUPS = (() => {
  let s = 0x9E3779B9;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return s >>> 0; };
  return Array.from({ length: DETAIL_ROWS }, () => DETAIL_GROUPS[next() % DETAIL_GROUPS.length]);
})();
// 행 인덱스 → 화주사명 (오더별 seeded)
const _SHIPPERS = ['(주)글로벌로지스', '(주)쿠팡로지스틱스', '(주)CJ대한통운', '(주)한진택배', '(주)롯데글로벌로지스', '(주)대한항공화물'];
const DETAIL_ROW_SHIPPERS = (() => {
  let s = 0xB7E15163;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return s >>> 0; };
  return Array.from({ length: DETAIL_ROWS }, () => _SHIPPERS[next() % _SHIPPERS.length]);
})();

interface AdjItem { id: number; amount: number; sign: '+' | '-'; note: string; }

function ClearIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: 0, background: "none", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="7" fill="#9197A1" />
        <path d="M9.46 4.54C9.206 4.286 8.794 4.286 8.54 4.54L7 6.08L5.46 4.54C5.206 4.286 4.794 4.286 4.54 4.54C4.286 4.794 4.286 5.206 4.54 5.46L6.08 7L4.54 8.54C4.286 8.794 4.286 9.206 4.54 9.46C4.794 9.714 5.206 9.714 5.46 9.46L7 7.92L8.54 9.46C8.794 9.714 9.206 9.714 9.46 9.46C9.714 9.206 9.714 8.794 9.46 8.54L7.92 7L9.46 5.46C9.714 5.206 9.714 4.794 9.46 4.54Z" fill="white" />
      </svg>
    </button>
  );
}

function AdjustmentItem({ item, index, onChange, onRemove }: { item: AdjItem; index: number; onChange: (u: AdjItem) => void; onRemove: () => void; }) {
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">조정금액 {index + 1}</p>
          <button onClick={onRemove} className="relative shrink-0 rounded-[4px] hover:bg-[#f6f7f8] transition-colors" style={{ width: 12.8, height: 12.8 }}>
            <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 12.17 12.17">
              <path d="M0.75 0.75L11.4167 11.4167" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
              <path d="M11.4167 0.75L0.75 11.4167" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
          <div className="content-stretch flex items-center relative shrink-0">
            <div className="bg-white h-[36px] min-w-[51px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0">
              <button onClick={() => onChange({ ...item, sign: '+' })} className="w-full h-full flex items-center justify-center px-[10px]">
                <div aria-hidden className={`absolute inset-0 pointer-events-none border ${item.sign === '+' ? "border-[#005fff] rounded-[4px]" : "border-[#e3e5e9] rounded-tl-[4px] rounded-bl-[4px] border-r-0"}`} />
                <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1V11M1 6H11" stroke={item.sign === '+' ? "#005FFF" : "#9197A1"} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="bg-white h-[36px] min-w-[50px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0">
              <button onClick={() => onChange({ ...item, sign: '-' })} className="flex items-center justify-center size-full px-[12px]">
                <svg width="14" height="2" fill="none" viewBox="0 0 14 2"><line stroke={item.sign === '-' ? "#005FFF" : "#9197A1"} strokeLinecap="round" strokeWidth="1.3" x1="0.65" x2="13.35" y1="1" y2="1"/></svg>
              </button>
              <div aria-hidden className={`absolute inset-0 pointer-events-none border ${item.sign === '-' ? "border-[#005fff] rounded-[4px]" : "border-[#e3e5e9] rounded-tr-[4px] rounded-br-[4px] border-l-0"}`} />
            </div>
          </div>
          <div className="flex-[1_0_0] min-w-px">
            <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full group">
              <div aria-hidden className={`absolute border inset-0 pointer-events-none rounded-[4px] transition-colors ${amountFocused ? "border-[#005fff]" : "border-[#e3e5e9] group-hover:border-[#adb1b9]"}`} />
              <div className="flex flex-row items-center overflow-hidden size-full px-[10px] py-[6px]">
                <input type="text" inputMode="numeric"
                  className={`min-w-0 flex-1 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-right placeholder:text-[#767d8a] ${item.amount === 0 ? "text-[#767d8a]" : "text-[#2e3238]"}`}
                  placeholder="0"
                  value={item.amount === 0 ? "" : item.amount.toLocaleString("ko-KR")}
                  onChange={e => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); onChange({ ...item, amount: isNaN(v) ? 0 : v }); }}
                  onFocus={() => setAmountFocused(true)} onBlur={() => setAmountFocused(false)}
                />
                <span className={`font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] shrink-0 ${item.amount === 0 ? "text-[#767d8a]" : "text-[#2e3238]"}`}>원</span>
                {item.amount !== 0 && <ClearIcon onClick={() => onChange({ ...item, amount: 0 })} />}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full group">
          <div aria-hidden className={`absolute border inset-0 pointer-events-none rounded-[4px] transition-colors ${noteFocused ? "border-[#005fff]" : "border-[#e3e5e9] group-hover:border-[#adb1b9]"}`} />
          <div className="flex flex-row items-center size-full px-[10px] py-[6px]">
            <input className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]"
              placeholder="조정 사유를 입력해 주세요." value={item.note}
              onChange={e => onChange({ ...item, note: e.target.value })}
              onFocus={() => setNoteFocused(true)} onBlur={() => setNoteFocused(false)}
            />
            {item.note && <ClearIcon onClick={() => onChange({ ...item, note: "" })} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const DetailCtx = createContext<{
  invoiceId: string; rowStatus: string; invoiceType: '매출' | '매입';
  shipper: string; shipperGroup: string; period: string;
  onClose: () => void;
  totalAmount: number; supplyAmount: number; taxAmount: number; adjTotal: number;
  setTotalAmount: (n: number) => void;
  groupAmounts: Record<string, number>;
  setGroupAmounts: (g: Record<string, number>) => void;
  adjItems: AdjItem[];
  setAdjItems: (fn: AdjItem[] | ((p: AdjItem[]) => AdjItem[])) => void;
  setCurrentStatus: (s: string) => void;
  confirmInvoiceOpen: boolean;
  setConfirmInvoiceOpen: (open: boolean) => void;
  taxInvoiceOpen: boolean;
  setTaxInvoiceOpen: (open: boolean) => void;
  addOrderOpen: boolean;
  setAddOrderOpen: (open: boolean) => void;
  showTaxToast: boolean;
  setShowTaxToast: (v: boolean) => void;
  showConfirmToast: boolean;
  setShowConfirmToast: (v: boolean) => void;
  excludeModalOpen: boolean;
  setExcludeModalOpen: (open: boolean) => void;
  showExcludeToast: boolean;
  setShowExcludeToast: (v: boolean) => void;
  excludedIndices: Set<number>;
  setExcludedIndices: (s: Set<number>) => void;
  addedOrders: Set<string>;
  setAddedOrders: (fn: Set<string> | ((p: Set<string>) => Set<string>)) => void;
  showAddOrderToast: boolean;
  setShowAddOrderToast: (v: boolean) => void;
  addedOrderCount: number;
  setAddedOrderCount: (n: number) => void;
  showSaveToast: boolean;
  setShowSaveToast: (v: boolean) => void;
  showSaveErrorToast: boolean;
  setShowSaveErrorToast: (v: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
}>({
  invoiceId: "", rowStatus: "확정대기", invoiceType: '매출', shipper: "(주)글로벌로지스",
  shipperGroup: "판교본사", period: "26.05.07 ~ 26.05.12", onClose: () => {},
  totalAmount: 0, supplyAmount: 0, taxAmount: 0, adjTotal: 0, setTotalAmount: () => {},
  groupAmounts: {}, setGroupAmounts: () => {},
  adjItems: [], setAdjItems: () => {},
  setCurrentStatus: () => {},
  confirmInvoiceOpen: false, setConfirmInvoiceOpen: () => {},
  taxInvoiceOpen: false, setTaxInvoiceOpen: () => {},
  addOrderOpen: false, setAddOrderOpen: () => {},
  showTaxToast: false, setShowTaxToast: () => {},
  showConfirmToast: false, setShowConfirmToast: () => {},
  excludeModalOpen: false, setExcludeModalOpen: () => {},
  showExcludeToast: false, setShowExcludeToast: () => {},
  excludedIndices: new Set<number>(), setExcludedIndices: () => {},
  addedOrders: new Set<string>(), setAddedOrders: () => {},
  showAddOrderToast: false, setShowAddOrderToast: () => {},
  addedOrderCount: 0, setAddedOrderCount: () => {},
  showSaveToast: false, setShowSaveToast: () => {},
  showSaveErrorToast: false, setShowSaveErrorToast: () => {},
  isEditMode: false, setIsEditMode: () => {},
});

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  '확정대기': { bg: '#fce9e9', color: '#dd2222' },
  '발행대기': { bg: '#EBEDEF', color: '#454B55' },
  '수금대기': { bg: '#E4FBEB', color: '#18AC42' },
  '수금완료': { bg: '#E6EFFF', color: '#005FFF' },
  // 매입 거래명세서용 (수금→지급)
  '지급대기': { bg: '#E4FBEB', color: '#18AC42' },
  '지급완료': { bg: '#E6EFFF', color: '#005FFF' },
};

function Frame77() {
  return (
    <div className="content-stretch flex gap-[4px] h-[19px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[19px] not-italic relative shrink-0 text-[#2e3238] text-[13px] tracking-[-0.26px] whitespace-nowrap">04.14 12:30:21 기준</p>
    </div>
  );
}

function Toggle() {
  return (
    <div className="h-[18px] relative shrink-0 w-[32px]" data-name="toggle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 18">
        <g id="toggle">
          <rect fill="var(--fill-0, #E4E5E9)" height="18" id="bg" rx="9" width="32" />
          <circle cx="9" cy="9" fill="var(--fill-0, white)" id="control" r="8" />
        </g>
      </svg>
    </div>
  );
}

function Component12() {
  return (
    <div className="absolute inset-[10.66%_13.85%_13.81%_13.81%]" data-name="2021.11">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.5742 12.086">
        <g id="2021.11">
          <path d={svgPaths.p2463180} fill="var(--fill-0, #262D39)" fillOpacity="0.52" id="Union" />
        </g>
      </svg>
    </div>
  );
}

function Frame354() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0">
      <Frame77 />
    </div>
  );
}

function Frame355() {
  const { invoiceType } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">{invoiceType} 거래명세서</p>
      <Frame354 />
    </div>
  );
}

function Component13() {
  return (
    <div className="h-[11px] relative w-[7px]" data-name="2021.11">
      <div className="absolute inset-[-5.91%_-9.28%_-5.91%_-9.29%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.3 12.3">
          <g id="2021.11">
            <path d="M4.15 0.65V11.65" id="Vector 348" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
            <path d={svgPaths.p2b8adc20} id="Vector 349" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Frame356() {
  const { invoiceId, rowStatus, onClose, setExcludeModalOpen, setAddOrderOpen } = useContext(DetailCtx);
  const badge = STATUS_BADGE[rowStatus] ?? STATUS_BADGE['확정대기'];
  const show발행대기 = rowStatus === '발행대기';
  const showOrderButtons = false; // 확정대기 포함 모든 상태에서 헤더 오더 버튼 숨김
  // 매입 상태: 뱃지 텍스트만 지급 용어로 표시 (색상 동일)
  const displayStatus = rowStatus === '지급대기' ? '지급대기'
    : rowStatus === '지급완료' ? '지급완료'
    : rowStatus;
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <div onClick={onClose} className="bg-white content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[36px] cursor-pointer hover:bg-[#f6f7f8]" data-name="Button">
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
        <div className="relative shrink-0 size-[16px]" data-name="Icon_16/arrow_line_left">
          <div className="absolute flex h-[7px] items-center justify-center left-[2.5px] top-[4.5px] w-[11px]">
            <div className="-rotate-90 -scale-y-100 flex-none">
              <Component13 />
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[36px] not-italic relative shrink-0 text-[24px] text-black tracking-[-0.48px] whitespace-nowrap">{invoiceId}</p>
      <div style={{backgroundColor: badge.bg}} className="content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[13px] tracking-[-0.26px] whitespace-nowrap" style={{color: badge.color}}>
          <p className="leading-[19px]">{displayStatus}</p>
        </div>
      </div>
      {rowStatus !== '발행대기' && rowStatus !== '확정대기' && rowStatus !== '수금대기' && rowStatus !== '수금완료' && (
        <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
          <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/download">
              <div className="absolute inset-[16.67%]" data-name="Vector">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 10.6667">
                  <path d={svgPaths.p30497100} fill="var(--fill-0, #9197A1)" id="Vector" />
                </svg>
              </div>
            </div>
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">엑셀 저장</p>
            </div>
          </div>
          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
        </div>
      )}
      {showOrderButtons && (
        <>
          <div onClick={() => setAddOrderOpen(true)} className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f6f7f8]" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
              <div className="relative shrink-0 size-[16px]" data-name="Icon_16/plus">
                <div className="absolute inset-[6.25%]" data-name="2021.11">
                  <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
                    <path d={svgPaths.p918e800} fill="var(--fill-0, #9197A1)" id="2021.11" />
                  </svg>
                </div>
              </div>
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px]">오더 추가</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </div>
          <div onClick={() => setExcludeModalOpen(true)} className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f6f7f8]" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
              <div className="relative shrink-0 size-[16px]" data-name="Icon_16/minus">
                <div className="absolute flex inset-[45.94%_6.25%_54.06%_6.25%] items-center justify-center" style={{ containerType: "size" }}>
                  <div className="flex-none h-[81704800cqh] rotate-180 w-[100cqw]">
                    <div className="relative size-full" data-name="2021.11">
                      <div className="absolute inset-[-1.3px_0_0_0]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 1.3">
                          <line id="2021.11" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeWidth="1.3" x1="0.65" x2="13.35" y1="0.65" y2="0.65" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px]">오더 제외</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────
   거래명세서 확정 모달
─────────────────────────────────────────── */
// ── 오더 추가 모달 데이터 ─────────────────────────────────────────────────
const ADD_ORDER_COLS: { label: string; w: number }[] = [
  { label: '오더ID',           w: 100 },
  { label: '매출 명세서 기준일', w: 140 },
  { label: '화주사명',         w: 140 },
  { label: '화주사 업무그룹',   w: 120 },
  { label: '화주사 사업자번호', w: 140 },
  { label: '상차일',           w: 100 },
  { label: '상차지 주소',      w: 160 },
  { label: '하차일',           w: 100 },
  { label: '하차지 주소',      w: 160 },
  { label: '경유',             w: 80  },
  { label: '독차',             w: 80  },
  { label: '왕복',             w: 80  },
  { label: '요청 차량',        w: 120 },
  { label: '요청 차량 특성',   w: 130 },
  { label: '차량번호',         w: 100 },
  { label: '청구금액 합계',    w: 130 },
];

// seeded 샘플 오더 데이터 20건
const ADD_ORDER_ROWS = Array.from({ length: 20 }, (_, i) => {
  const seed = 0x9A3B1C ^ (i * 0x7F3D);
  const next = (s: number) => (Math.imul(s, 1664525) + 1013904223) | 0;
  let s = seed;
  const oid = ORDER_IDS[i]; // 매출장부와 동일한 오더ID 사용
  s = next(s); const amount = ((s >>> 0) % 900 + 100) * 1000;
  const loadDate = `26.0${(i % 5) + 1}.${String((i * 3 + 1) % 28 + 1).padStart(2, '0')}`;
  const unloadDate = `26.0${(i % 5) + 1}.${String((i * 3 + 5) % 28 + 1).padStart(2,'0')}`;
  const bizSeed = ((s >>> 16) ^ (s & 0xff)) >>> 0;
  const bizNum = `${138 + (bizSeed % 200)}-${10 + (bizSeed >> 8) % 90}-${String((bizSeed >> 16) % 90000 + 10000).padStart(5,'0')}`;
  const invoiceDate = `26.0${(i % 5) + 1}.${String((i * 7 + 3) % 28 + 1).padStart(2,'0')}`;
  return {
    oid,
    invoiceDate,
    shipper: _SHIPPERS[((s >>> 0) % _SHIPPERS.length)],
    shipperGroup: `업무그룹 ${(i % 3) + 1}`,
    bizNum,
    loadDate, unloadDate,
    loadName: `판교테크노밸리`,
    loadAddr: `경기 성남시 삼평동`,
    unloadName: `광물류`,
    unloadAddr: `경기 수원시 이의동`,
    via: i % 5 === 0 ? '1곳' : '0곳',
    amount,
  };
});

function AddOrderModal() {
  const { setAddOrderOpen, invoiceType, addedOrders, setAddedOrders, setShowAddOrderToast, setAddedOrderCount } = useContext(DetailCtx);
  const baseDateLabel = invoiceType === '매입' ? '매입 명세서 기준일' : '매출 명세서 기준일';
  const [scale, setScale] = useState(() => window.innerWidth / 1920);
  useEffect(() => {
    const u = () => setScale(window.innerWidth / 1920);
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);

  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState(false); // 검색 실행 여부
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [appliedRange, setAppliedRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  // 기간 캘린더 상태
  const [calOpen, setCalOpen] = useState(false);
  const [calAnchor, setCalAnchor] = useState<DOMRect | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date(2026, 4, 1));
  const [rangeEnd, setRangeEnd]     = useState<Date | null>(new Date(2026, 7, 13));
  const [hoverDate, setHoverDate]   = useState<Date | null>(null);
  const [selecting, setSelecting]   = useState(false); // 첫 클릭 후 두 번째 클릭 대기
  const [viewYear, setViewYear]     = useState(2026);
  const [viewMonth, setViewMonth]   = useState(4); // 0-indexed
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calOpen) return;
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false); setSelecting(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calOpen]);

  const fmtD = (d: Date) => {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yy}.${mm}.${dd}`;
  };
  const rangeLabel = rangeStart && rangeEnd
    ? `${fmtD(rangeStart)} ~ ${fmtD(rangeEnd)}`
    : rangeStart ? fmtD(rangeStart) : '날짜 선택';

  const today = new Date(2026, 5, 29);
  const isSame = (a: Date, b: Date) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const clearTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const handleCalDay = (date: Date) => {
    const d = clearTime(date);
    if (!selecting) {
      setRangeStart(d); setRangeEnd(null); setSelecting(true);
    } else {
      const s = clearTime(rangeStart!);
      if (d < s) { setRangeStart(d); setRangeEnd(s); }
      else { setRangeEnd(d); }
      setSelecting(false); setCalOpen(false);
    }
  };

  const isInRange = (date: Date) => {
    const d = clearTime(date);
    const s = rangeStart ? clearTime(rangeStart) : null;
    const e = selecting && hoverDate ? clearTime(hoverDate) : (rangeEnd ? clearTime(rangeEnd) : null);
    if (!s || !e) return false;
    const lo = s <= e ? s : e, hi = s <= e ? e : s;
    return d > lo && d < hi;
  };
  const isRangeStart = (date: Date) => !!rangeStart && isSame(clearTime(date), clearTime(rangeStart));
  const isRangeEnd = (date: Date) => {
    const e = selecting && hoverDate ? hoverDate : rangeEnd;
    return !!e && isSame(clearTime(date), clearTime(e));
  };

  // Build calendar cells
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const calCells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDay-1; i >= 0; i--) calCells.push({ date: new Date(viewYear, viewMonth-1, daysInPrev-i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  while (calCells.length % 7 !== 0) calCells.push({ date: new Date(viewYear, viewMonth+1, calCells.length - daysInMonth - firstDay + 1), inMonth: false });

  const quickRanges = [
    { label: '오늘',   get: () => ({ s: today, e: today }) },
    { label: '어제',   get: () => { const d = new Date(today.getTime()-86400000); return { s: d, e: d }; } },
    { label: '내일',   get: () => { const d = new Date(today.getTime()+86400000); return { s: d, e: d }; } },
    { label: '2일전',  get: () => { const d = new Date(today.getTime()-2*86400000); return { s: d, e: today }; } },
    { label: '3일전',  get: () => { const d = new Date(today.getTime()-3*86400000); return { s: d, e: today }; } },
    { label: '이번주', get: () => { const d = new Date(today); const day = d.getDay(); d.setDate(d.getDate()-(day===0?6:day-1)); return { s: d, e: today }; } },
    { label: '지난주', get: () => { const d = new Date(today); const day = d.getDay(); d.setDate(d.getDate()-(day===0?6:day-1)-7); const e = new Date(d.getTime()+6*86400000); return { s: d, e }; } },
    { label: '이번달', get: () => ({ s: new Date(today.getFullYear(), today.getMonth(), 1), e: today }) },
    { label: '지난달', get: () => { const s = new Date(today.getFullYear(), today.getMonth()-1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { s, e }; } },
  ];

  // 검색 실행 전에는 빈값
  const parseYYMMDD = (s: string) => { const [yy, mm, dd] = s.split('.').map(Number); return new Date(2000+yy, mm-1, dd).getTime(); };
  const rows = submitted
    ? ADD_ORDER_ROWS.filter(r => {
        const textOk = !search || r.oid.includes(search.toUpperCase()) || r.loadName.includes(search) || r.unloadName.includes(search);
        const dateOk = (() => {
          if (!appliedRange.start || !appliedRange.end) return true;
          const t = parseYYMMDD(r.invoiceDate);
          return t >= appliedRange.start.getTime() && t <= appliedRange.end.getTime();
        })();
        const notAdded = !addedOrders.has(r.oid);
        return textOk && dateOk && notAdded;
      })
    : [];
  const allSelected = rows.length > 0 && rows.every((_, i) => selectedRows.has(i));

  const handleSearch = () => { setSubmitted(true); setSelectedRows(new Set()); setAppliedRange({ start: rangeStart, end: rangeEnd }); };
  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((_, i) => i)));
  };
  const toggleRow = (i: number) => setSelectedRows(prev => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });

  const fmt = (n: number) => n.toLocaleString();
  // 데이터가 있을 때 활성화 (선택 여부 무관)
  const canAdd = submitted && rows.length > 0;

  const T15 = (fw: number): React.CSSProperties => ({
    fontFamily:"'Pretendard GOV', sans-serif", fontWeight: fw, fontSize: 15, lineHeight: '22px', letterSpacing: '-0.02em',
  });

  // ExcludeModal과 동일한 체크박스 SVG (10×8)
  const CheckSVG = () => (
    <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const mainModal = createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:10003, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:'center center' }}>
      <div style={{ width:1600, height:800, background:'#fff', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ position:'relative', padding:'24px 24px 16px', display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:700, fontSize:22, lineHeight:'32px', color:'#2E3238', letterSpacing:'-0.02em', margin:0 }}>추가 가능한 오더 목록</p>
            <button onClick={() => setAddOrderOpen(false)} style={{ width:26, height:26, borderRadius:4, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
                <path d="M16.75 0.75L0.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'#E4E5E9' }} />
        </div>

        {/* 바디 */}
        <div style={{ flex:1, padding:'12px 24px 20px', display:'flex', flexDirection:'column', gap:16, overflow:'hidden' }}>

          {/* 필터 행: gap:12, 1552px */}
          <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:12, height:36, flexShrink:0 }}>
            {/* 기간 드롭다운 91px */}
            <div style={{ width:91, height:36, border:'1px solid #E4E5E9', borderRadius:4, background:'#fff', display:'flex', alignItems:'center', padding:'6px 10px', gap:4, flexShrink:0, boxSizing:'border-box' as const }}>
              <span style={{ ...T15(400), color:'#2E3238', flex:1 }}>2개월 전</span>
              <svg width="10" height="5" viewBox="0 0 10 5" fill="none"><path d="M0 0L5 5L10 0" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            {/* 캘린더 필터 327px: 좌(130) + 우(198) joined */}
            <div style={{ display:'flex', flexDirection:'row', flexShrink:0 }}>
              {/* 좌: 매출 명세서 기준일 라벨 130px */}
              <div style={{ width:130, height:36, border:'1px solid #E4E5E9', borderRadius:'4px 0 0 4px', background:'#fff', display:'flex', alignItems:'center', padding:'6px 10px', boxSizing:'border-box' as const }}>
                <span style={{ ...T15(400), color:'#2E3238', whiteSpace:'nowrap' as const }}>{baseDateLabel}</span>
              </div>
              {/* 우: 캘린더 아이콘 + 날짜범위 + 화살표 198px */}
              <div
                onClick={e => { if (calOpen) { setCalOpen(false); setSelecting(false); } else { setCalAnchor(e.currentTarget.getBoundingClientRect()); setCalOpen(true); } }}
                style={{ width:198, height:36, border:`1px solid ${calOpen ? '#005FFF' : '#E4E5E9'}`, borderRadius:'0 4px 4px 0', background:'#fff', display:'flex', alignItems:'center', padding:'6px 10px', gap:4, marginLeft:-1, boxSizing:'border-box' as const, cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 14 14.4" fill="none" style={{ flexShrink:0 }}>
                  <path d={svgPaths.p31eb2f00} fill="#9197A1"/>
                </svg>
                <span style={{ ...T15(400), color:'#2E3238', flex:1, whiteSpace:'nowrap' as const }}>{rangeLabel}</span>
                <svg width="10" height="5" viewBox="0 0 10 5" fill="none" style={{ transform: calOpen ? 'rotate(180deg)' : undefined }}><path d="M0 0L5 5L10 0" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
            {/* 텍스트검색: flex:1, gap:8 */}
            <div style={{ flex:1, display:'flex', flexDirection:'row', gap:0 }}>
              {/* 검색 타입 드롭다운 82px */}
              <div style={{ width:82, height:36, border:'1px solid #E4E5E9', borderRadius:'4px 0 0 4px', background:'#fff', display:'flex', alignItems:'center', padding:'6px 10px', gap:4, flexShrink:0, boxSizing:'border-box' as const }}>
                <span style={{ ...T15(400), color:'#2E3238', flex:1 }}>오더ID</span>
                <svg width="10" height="5" viewBox="0 0 10 5" fill="none"><path d="M0 0L5 5L10 0" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ flex:1, height:36, background:'#fff', borderRadius:'0 4px 4px 0', position:'relative', marginLeft:-1 }}>
                <div aria-hidden style={{ position:'absolute', inset:0, border:'1px solid #E4E5E9', borderRadius:'0 4px 4px 0', pointerEvents:'none' }} />
                <div style={{ display:'flex', alignItems:'center', height:'100%', padding:'0 10px', gap:6 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="#9197A1" strokeWidth="1.3"/>
                    <path d="M11 11L14 14" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                    placeholder="오더ID를 검색하세요"
                    className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]"
                  />
                </div>
              </div>
            </div>
            {/* 오더 조회하기 버튼 */}
            <div onClick={handleSearch} style={{ width:105, height:36, border:'1px solid #E4E5E9', borderRadius:4, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <span style={{ ...T15(600), color:'#2E3238', whiteSpace:'nowrap' as const }}>오더 조회하기</span>
            </div>
          </div>

          {/* 테이블 */}
          {/* 테이블 컨테이너: 가로+세로 스크롤 */}
          <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', minHeight:0 }}>
            {(() => {
              const EmptyIcon = ({ id }: { id: string }) => (
                <svg style={{ position:'absolute', display:'block', inset:0, width:'100%', height:'100%' }} fill="none" viewBox="0 0 42.9532 34">
                  <circle cx="30.3484" cy="18.1448" fill="#8D9199" fillOpacity="0.12" r="6.75" transform="rotate(3 30.3484 18.1448)" />
                  <path d="M4.37284e-08 2C8.30733e-07 0.895431 0.895431 1.66565e-07 2 1.20144e-09L32 2.02141e-07C33.1046 -1.3134e-08 34 0.895431 34 2L34 8C34 8.17468 33.9776 8.34413 33.9355 8.50564C33.0063 8.17205 32.0133 7.9669 30.9766 7.91257C28.4367 7.77946 26.0629 8.57403 24.1841 10L2 10C0.895431 10 -9.93422e-08 9.10457 6.75184e-07 8L4.37284e-08 2Z" fill={`url(#${id}0)`} />
                  <path d="M22.1846 12L2 12C0.89543 12 1.63947e-07 12.8954 1.30663e-06 14L8.41007e-09 20C1.12614e-06 21.1046 0.89543 22 2 22L20.7917 22C20.2742 20.6733 20.0237 19.2177 20.1031 17.7031C20.2156 15.5548 20.9759 13.594 22.1846 12Z" fill={`url(#${id}1)`} />
                  <path d="M35 13.3475L35 20.5C35 21.6046 34.1046 22.5 33 22.5L25.2669 22.5C24.24 21.2536 23.6585 19.6341 23.7497 17.8943C23.9432 14.202 27.0932 11.3657 30.7855 11.5592C32.4214 11.6449 33.8892 12.311 35 13.3475Z" fill={`url(#${id}2)`} />
                  <path d="M21.8367 24L2 24C0.895432 24 -4.52901e-07 24.8954 6.6483e-07 26L1.27134e-06 32C5.84155e-07 33.1046 0.895431 34 2 34L32 34C33.1046 34 34 33.1046 34 32L34 28.4415C34 28.2835 33.9814 28.1288 33.9461 27.9798C32.6858 28.4349 31.3157 28.6512 29.8936 28.5767C26.5088 28.3993 23.5894 26.6141 21.8367 24Z" fill={`url(#${id}3)`} />
                  <path clipRule="evenodd" d="M36.2635 26.7975C34.458 28.0287 32.2495 28.7002 29.8988 28.577C24.1925 28.2779 19.8091 23.4097 20.1082 17.7034C20.4072 11.9972 25.2755 7.61382 30.9817 7.91287C36.6879 8.21192 41.0713 13.0802 40.7723 18.7864C40.6655 20.8238 39.9762 22.6926 38.8743 24.2398L42.4842 28.249C43.1589 28.9984 43.0984 30.1528 42.3491 30.8276C41.5997 31.5023 40.4452 31.4418 39.7705 30.6924L36.2635 26.7975ZM37.1257 18.5953C36.9322 22.2876 33.7821 25.1239 30.0899 24.9304C26.3976 24.7369 23.5613 21.5868 23.7548 17.8946C23.9483 14.2023 27.0983 11.366 30.7906 11.5595C34.4829 11.753 37.3192 14.903 37.1257 18.5953Z" fill="#93979F" fillOpacity="0.67" fillRule="evenodd" />
                  <defs>
                    {[0,1,2,3].map(n => (
                      <linearGradient key={n} gradientUnits="userSpaceOnUse" id={`${id}${n}`} x1="17.5" x2="17.5" y1="0" y2="29.7331">
                        <stop stopColor="#AEB1B7" stopOpacity="0.2" />
                        <stop offset="1" stopColor="#ADAFB3" stopOpacity="0.32" />
                      </linearGradient>
                    ))}
                  </defs>
                </svg>
              );

              const isEmpty = !submitted || rows.length === 0;
              const msg = '검색된 오더가 없습니다.';

              return (
                <>
                  {/* 헤더 + 데이터 행 (가로 스크롤은 부모가 담당) */}
                  <div style={{ display:'flex', flexDirection:'row', flexShrink:0, minWidth:'max-content' }}>
                    {/* 체크박스 헤더 */}
                    <div style={{ width:34, flexShrink:0, display:'flex', flexDirection:'column', borderRight: isEmpty ? 'none' : '1px solid #E4E5E9' }}>
                      <div style={{ height:40, background:'#F6F7F8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'sticky', top:0, zIndex:1, borderRight:'1px solid #E4E5E9', borderBottom:'1px solid #E4E5E9' }}>
                        {!isEmpty && (
                          <div onClick={toggleAll} style={{ width:16, height:16, borderRadius:3, border:`1.3px solid ${allSelected ? '#005FFF' : '#ADB1B9'}`, background: allSelected ? '#005FFF' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {allSelected && <CheckSVG />}
                          </div>
                        )}
                        {isEmpty && <div style={{ width:16, height:16, borderRadius:3, border:'1.3px solid #ADB1B9', background:'#fff', flexShrink:0 }} />}
                      </div>
                      {!isEmpty && rows.map((_, i) => (
                        <div key={i} onClick={() => toggleRow(i)} style={{ height:40, borderBottom:'1px solid #E4E5E9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer', background: '#F6F7F8' }}>
                          <div style={{ width:16, height:16, borderRadius:3, border:`1.3px solid ${selectedRows.has(i) ? '#005FFF' : '#ADB1B9'}`, background: selectedRows.has(i) ? '#005FFF' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {selectedRows.has(i) && <CheckSVG />}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 데이터 컬럼들 */}
                    {ADD_ORDER_COLS.map((col) => ({ ...col, label: col.label === '매출 명세서 기준일' ? baseDateLabel : col.label })).map((col) => (
                      <div key={col.label} style={{ width:col.w, flexShrink:0, display:'flex', flexDirection:'column', borderRight: isEmpty ? 'none' : '1px solid #E4E5E9' }}>
                        <div style={{ height:40, background:'#F6F7F8', padding:'0 8px', display:'flex', alignItems:'center', flexShrink:0, position:'sticky', top:0, zIndex:1, borderRight:'1px solid #E4E5E9', borderBottom:'1px solid #E4E5E9' }}>
                          <span style={{ ...T15(600), color:'#5C6370', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{col.label}</span>
                        </div>
                        {!isEmpty && rows.map((r, i) => {
                          let val = '';
                          switch(col.label) {
                            case '오더ID':           val = r.oid; break;
                            case '매출 명세서 기준일': case '매입 명세서 기준일': val = r.invoiceDate; break;
                            case '화주사명':          val = r.shipper; break;
                            case '화주사 업무그룹':   val = r.shipperGroup; break;
                            case '화주사 사업자번호': val = r.bizNum; break;
                            case '상차일':            val = r.loadDate; break;
                            case '상차지 주소':       val = r.loadAddr; break;
                            case '하차일':            val = r.unloadDate; break;
                            case '하차지 주소':       val = r.unloadAddr; break;
                            case '경유':              val = r.via; break;
                            case '독차':              val = r.solo; break;
                            case '왕복':              val = r.trip; break;
                            case '요청 차량':         val = r.vehicle; break;
                            case '요청 차량 특성':    val = r.vchar; break;
                            case '차량번호':          val = String(r.plate); break;
                            case '청구금액 합계':     val = r.amount.toLocaleString() + '원'; break;
                          }
                          return (
                            <div key={i} onClick={() => toggleRow(i)} style={{ height:40, borderBottom:'1px solid #E4E5E9', padding:'0 8px', display:'flex', alignItems:'center', flexShrink:0, cursor:'pointer', background:'#fff' }}>
                              <span style={{ ...T15(400), color:'#2E3238', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration: col.label === '오더ID' ? 'underline' : 'none' }}>{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* 빈 상태 — 헤더 아래 영역을 flex:1로 채우고 아이콘+텍스트 중앙 배치 */}
                  {isEmpty && (
                    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <div style={{ position:'relative', width:48, height:48, flexShrink:0 }}>
                        <EmptyIcon id="ao" />
                      </div>
                      <p className="font-['Pretendard_GOV:Regular'] text-[#767d8a] text-[15px] tracking-[-0.3px] leading-[22px] text-center whitespace-nowrap">{msg}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

        </div>

        {/* 푸터 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'20px 24px 24px', gap:8, borderTop:'1px solid #E4E5E9', borderRadius:'0 0 12px 12px', flexShrink:0 }}>
          <button onClick={() => setAddOrderOpen(false)} style={{ width:71, height:52, background:'#fff', border:'none', borderRadius:4, cursor:'pointer', ...T15(600), fontSize:18, lineHeight:'26px', color:'#2E3238' }}>닫기</button>
          <button
            onClick={() => {
              if (!canAdd) return;
              const toAdd = rows.filter((_, i) => selectedRows.has(i));
              if (toAdd.length === 0) return;
              setAddedOrders(prev => { const n = new Set(prev); toAdd.forEach(r => n.add(r.oid)); return n; });
              setAddedOrderCount(toAdd.length);
              setShowAddOrderToast(true);
              setAddOrderOpen(false);
            }}
            style={{ width:102, height:52, background: canAdd ? '#005FFF' : '#CCDFFF', border:'none', borderRadius:4, cursor: canAdd ? 'pointer' : 'not-allowed', ...T15(600), fontSize:18, lineHeight:'26px', color:'#fff', transition:'background 0.15s', padding:'0 20px' }}
          >추가하기</button>
        </div>

      </div>
      </div>
    </div>,
    document.body
  );

  const calPortal = calOpen && calAnchor ? createPortal(
    <div ref={calRef} style={{ position:'fixed', top: calAnchor.bottom + 2, left: calAnchor.left, width:276, background:'#FFFFFF', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:8, zIndex:99999, boxSizing:'border-box' }}>
      <div style={{ height:36, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 4px' }}>
        <span style={{ fontFamily:"'Pretendard GOV:Bold'", fontSize:18, fontWeight:700, color:'#2E3238', letterSpacing:'-0.02em' }}>{viewYear}년 {viewMonth+1}월</span>
        <div style={{ display:'flex', gap:2 }}>
          {([[-1,'M4.5 1L0.5 5L4.5 9'],[1,'M0.5 1L4.5 5L0.5 9']] as [number,string][]).map(([dir,d]) => (
            <button key={dir} onClick={() => { const dt = new Date(viewYear, viewMonth+dir, 1); setViewYear(dt.getFullYear()); setViewMonth(dt.getMonth()); }} style={{ width:26, height:26, borderRadius:4, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='#F6F7F8')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d={d} stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', width:252 }}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} style={{ width:36, height:19, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#454B55', letterSpacing:'-0.02em' }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', width:252, gap:'2px 0' }}>
        {calCells.map((cell, i) => {
          const inR = isInRange(cell.date);
          const isS = isRangeStart(cell.date);
          const isE = isRangeEnd(cell.date);
          const effEnd = selecting && hoverDate ? hoverDate : rangeEnd;
          const rangeActive = !!rangeStart && !!effEnd;
          const sameDay = rangeActive && isSame(clearTime(rangeStart!), clearTime(effEnd!));
          let halfBg: React.CSSProperties = {};
          if (rangeActive && effEnd && !sameDay) {
            if (isS) halfBg = { background: 'linear-gradient(to right, transparent 50%, #E6EFFF 50%)' };
            else if (isE) halfBg = { background: 'linear-gradient(to left, transparent 50%, #E6EFFF 50%)' };
          }
          const isToday = isSame(cell.date, today);
          return (
            <div key={i} style={{ width:36, height:36, position:'relative', cursor: cell.inMonth ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', ...(inR && !isS && !isE ? { background:'#E6EFFF' } : {}), ...((isS||isE) ? halfBg : {}) }}
              onMouseEnter={() => { if (selecting && cell.inMonth) setHoverDate(cell.date); }}
              onMouseLeave={() => { if (selecting) setHoverDate(null); }}
              onClick={() => { if (cell.inMonth) handleCalDay(cell.date); else { setViewYear(cell.date.getFullYear()); setViewMonth(cell.date.getMonth()); } }}>
              <div style={{ width:36, height:36, borderRadius: (isS||isE) ? 20 : isToday ? 100 : 0, background: (isS||isE) ? '#005FFF' : isToday ? '#F6F7F8' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
                <span style={{ fontSize:14, fontWeight:(isS||isE)?600:400, color:(isS||isE)?'#FFFFFF':cell.inMonth?'#2E3238':'#9197A1', letterSpacing:'-0.02em' }}>{cell.date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop:'1px solid #E4E5E9', paddingTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
        {quickRanges.map(({ label, get }) => (
          <button key={label} onClick={() => { const { s, e } = get(); setRangeStart(clearTime(s)); setRangeEnd(clearTime(e)); setSelecting(false); setCalOpen(false); }}
            style={{ border:'1px solid #E4E5E9', borderRadius:4, background:'#FFFFFF', fontSize:14, fontWeight:600, color:'#2E3238', padding:'0 8px', height:26, cursor:'pointer', letterSpacing:'-0.02em' }}
            onMouseEnter={e=>(e.currentTarget.style.background='#F6F7F8')} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return <>{mainModal}{calPortal}</>;
}

function TaxInvoiceModal() {
  const { setTaxInvoiceOpen, setShowTaxToast, setCurrentStatus, invoiceType, shipper, shipperGroup,
          totalAmount, supplyAmount, taxAmount, adjTotal, adjItems, groupAmounts } = useContext(DetailCtx);
  const [scale, setScale] = useState(() => window.innerWidth / 1920);
  useEffect(() => {
    const update = () => setScale(window.innerWidth / 1920);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 품목 목록 state
  type TaxItem = { id: number; name: string; note: string; supplyRaw: string };
  const [taxItems, setTaxItems] = useState<TaxItem[]>([{ id: 1, name: '', note: '', supplyRaw: '' }]);
  const nextId = taxItems.length > 0 ? Math.max(...taxItems.map(t => t.id)) + 1 : 2;

  const updateItem = (id: number, field: keyof TaxItem, value: string) => {
    setTaxItems(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const handleSupplyChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    updateItem(id, 'supplyRaw', raw ? Number(raw).toLocaleString() : '');
  };
  const addItem = () => {
    if (taxItems.length >= 50) return;
    setTaxItems(prev => [...prev, { id: nextId, name: '', note: '', supplyRaw: '' }]);
  };

  const getSupplyNum = (raw: string) => parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
  const totalSupplyNum = taxItems.reduce((s, t) => s + getSupplyNum(t.supplyRaw), 0);

  const finalAmount = totalAmount + adjTotal;

  const fmtDate = (ms: number) => { const d = new Date(ms); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
  const todayMs = new Date(2026, 5, 26).getTime();
  const writeDate = fmtDate(todayMs);
  const dueDate   = fmtDate(todayMs + 30 * 86400000);
  const fmt = (n: number) => n.toLocaleString() + '원';

  const T = (fw: number, fs: number, lh: string, color: string): React.CSSProperties => ({
    fontFamily:"'Pretendard GOV', sans-serif", fontWeight:fw, fontSize:fs, lineHeight:lh, color, letterSpacing:'-0.02em',
  });
  const LBL = T(400, 15, '22px', '#5C6370');
  const VAL = T(600, 15, '22px', '#2E3238');

  // 정보행 (label fixedW + value)
  const InfoRow = ({ label, value, lw = 120 }: { label: string; value: string; lw?: number }) => (
    <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:12, minHeight:36 }}>
      <span style={{ ...LBL, width:lw, flexShrink:0 }}>{label}</span>
      <span style={{ ...VAL, flex:1 }}>{value}</span>
    </div>
  );

  // 2열 분할 행
  const SplitRow = ({ left, right, lw = 120 }: { left:{label:string;value:string}; right:{label:string;value:string}; lw?: number }) => (
    <div style={{ display:'flex', flexDirection:'row', gap:8, minHeight:36 }}>
      {[left, right].map((item, i) => (
        <div key={i} style={{ flex:1, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ ...LBL, width:lw, flexShrink:0 }}>{item.label}</span>
          <span style={{ ...VAL, flex:1 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );

  // 우측 패널 행 (전체 너비)
  const RRow = ({ label, value, sb, big, color }: { label:string; value:string; sb?:boolean; big?:boolean; color?:string }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', minHeight: big ? 32 : 22 }}>
      <span style={T(sb ? 600 : 400, 15, '22px', '#5C6370')}>{label}</span>
      <span style={big ? T(700, 22, '32px', '#2E3238') : T(sb ? 600 : 400, 15, '22px', color ?? '#2E3238')}>{value}</span>
    </div>
  );
  const RDivider = () => <div style={{ width:'100%', height:1, background:'#E4E5E9', flexShrink:0 }} />;

  // 그룹별 청구금액 목록
  const groupEntries = Object.entries(groupAmounts);

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:10002, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:'center center' }}>
      <div style={{ width:1200, height:792, background:'#fff', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ position:'relative', padding:'24px 24px 16px', display:'flex', flexDirection:'column', gap:12, borderRadius:'12px 12px 0 0', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ ...T(700, 22, '32px', '#2E3238'), margin:0 }}>세금계산서 발행 요청</p>
            <button onClick={() => setTaxInvoiceOpen(false)} style={{ width:26, height:26, borderRadius:4, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
                <path d="M16.75 0.75L0.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'#E4E5E9' }} />
        </div>

        {/* 바디 */}
        <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden' }}>

          {/* 좌측 */}
          <div style={{ flex:1, minWidth:0, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, overflow:'auto' }}>

            {/* 박스1 */}
            <div style={{ border:'1px solid #E4E5E9', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:8 }}>
              {invoiceType === '매입' ? (
                <>
                  <InfoRow label="기사명" value={shipper || '김카모'} lw={140} />
                  <InfoRow label="기사 전화번호" value="010-0000-0000" lw={140} />
                  <InfoRow label="차량번호" value="12아3456" lw={140} />
                </>
              ) : (
                <>
                  <InfoRow label="화주사" value={shipper} lw={140} />
                  <InfoRow label="화주사 업무그룹" value={shipperGroup} lw={140} />
                  <InfoRow label="화주사 운영 메모" value={`${shipper}의 운영 메모`} lw={140} />
                </>
              )}
            </div>

            {/* 박스2: 세금계산서 정보 */}
            <div style={{ border:'1px solid #E4E5E9', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:8 }}>
              {invoiceType === '매입' ? (
                <>
                  <InfoRow label="지급기한" value={dueDate} lw={140} />
                  <SplitRow lw={140}
                    left={{ label:'세금계산서 발행일자', value: writeDate }}
                    right={{ label:'세금계산서 작성일자', value: writeDate }}
                  />
                  <SplitRow lw={140}
                    left={{ label:'세금계산서 이메일', value: 'kakao@kakao.com' }}
                    right={{ label:'세금계산서 비고', value: '우리 1000-0000-000000' }}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="수금기한" value={dueDate} lw={140} />
                  <SplitRow lw={140}
                    left={{ label:'세금계산서 작성일자', value: writeDate }}
                    right={{ label:'세금계산서 발행일자', value: writeDate }}
                  />
                  <SplitRow lw={140}
                    left={{ label:'세금계산서 이메일', value: 'kakao@kakao.com' }}
                    right={{ label:'세금계산서 비고', value: '우리 1000-0000-000000' }}
                  />
                </>
              )}
            </div>

            {/* 섹션3: 세금계산서 품목정보 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* 헤더 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                <span style={{ ...T(700, 18, '26px', '#000') }}>세금계산서 품목정보</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={LBL}>총 공급가액</span>
                  <span style={VAL}>{totalSupplyNum.toLocaleString()}원</span>
                </div>
              </div>
              {/* 품목 카드 목록 */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {taxItems.map((item, idx) => {
                  const supplyNum = getSupplyNum(item.supplyRaw);
                  const tax = Math.round(supplyNum * 0.1);
                  const total = supplyNum + tax;
                  return (
                    <div key={item.id} style={{ border:'1px solid #E4E5E9', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:8 }}>
                      <span style={{ ...T(700, 15, '22px', '#5C6370') }}>품목 {idx + 1}</span>
                      {/* 품목명 / 비고 / 공급가액 — 조정금액 input과 동일 패턴 */}
                      <div style={{ display:'flex', flexDirection:'row', gap:8, alignItems:'center' }}>
                        {/* 품목명 */}
                        <div style={{ flex:'1 1 0%', minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ ...LBL, whiteSpace:'nowrap', flexShrink:0 }}>품목명</span>
                          <div className="bg-white h-[36px] relative rounded-[4px] group flex-1 min-w-0">
                            <div aria-hidden className="absolute border border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff] inset-0 pointer-events-none rounded-[4px] transition-colors" />
                            <div className="flex flex-row items-center overflow-hidden size-full px-[10px] py-[6px]">
                              <input value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="품목명"
                                className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]" />
                              {item.name && <ClearIcon onClick={() => updateItem(item.id, 'name', '')} />}
                            </div>
                          </div>
                        </div>
                        {/* 비고 */}
                        <div style={{ flex:'1 1 0%', minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ ...LBL, whiteSpace:'nowrap', flexShrink:0 }}>비고</span>
                          <div className="bg-white h-[36px] relative rounded-[4px] group flex-1 min-w-0">
                            <div aria-hidden className="absolute border border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff] inset-0 pointer-events-none rounded-[4px] transition-colors" />
                            <div className="flex flex-row items-center overflow-hidden size-full px-[10px] py-[6px]">
                              <input value={item.note} onChange={e => updateItem(item.id, 'note', e.target.value)} placeholder="비고"
                                className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]" />
                              {item.note && <ClearIcon onClick={() => updateItem(item.id, 'note', '')} />}
                            </div>
                          </div>
                        </div>
                        {/* 공급가액 */}
                        <div style={{ flex:'1 1 0%', minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ ...LBL, whiteSpace:'nowrap', flexShrink:0 }}>공급가액</span>
                          <div className="bg-white h-[36px] relative rounded-[4px] group flex-1 min-w-0">
                            <div aria-hidden className="absolute border border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff] inset-0 pointer-events-none rounded-[4px] transition-colors" />
                            <div className="flex flex-row items-center overflow-hidden size-full px-[10px] py-[6px] gap-[2px]">
                              <input value={item.supplyRaw} onChange={e => handleSupplyChange(item.id, e)} placeholder="0"
                                className={`flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-right placeholder:text-[#767d8a] ${item.supplyRaw ? 'text-[#2e3238]' : 'text-[#767d8a]'}`} />
                              <span className={`font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] shrink-0 ${item.supplyRaw ? 'text-[#2e3238]' : 'text-[#767d8a]'}`}>원</span>
                              {item.supplyRaw && <ClearIcon onClick={() => updateItem(item.id, 'supplyRaw', '')} />}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 세액 / 합계 금액 */}
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:16, alignItems:'center', height:22 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={LBL}>세액</span>
                          <span style={VAL}>{tax.toLocaleString()}원</span>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={LBL}>합계 금액</span>
                          <span style={VAL}>{total.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 품목 추가하기 버튼 */}
              <div onClick={addItem} style={{ border:'1px solid #E4E5E9', borderRadius:4, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor: taxItems.length >= 50 ? 'not-allowed' : 'pointer', opacity: taxItems.length >= 50 ? 0.4 : 1 }}>
                <span style={{ ...T(600, 15, '22px', '#2E3238') }}>품목 추가하기 ({taxItems.length}/50)</span>
              </div>
            </div>

          </div>

          {/* 세로 구분선 */}
          <div style={{ width:1, background:'#E4E5E9', flexShrink:0 }} />

          {/* 우측: padding 12px 24px 20px, 가운데 정렬 */}
          <div style={{ width:400, flexShrink:0, padding:'12px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', overflow:'auto' }}>
            {/* 카드: 352px, bg:#F6F7F8, padding:16px, gap:12px */}
            <div style={{ width:352, background:'#F6F7F8', borderRadius:8, padding:16, display:'flex', flexDirection:'column', alignItems:'flex-start', gap:12 }}>

              {/* order 0: 청구금액 합계 / 배차금액 합계 (15SB) */}
              <RRow label={invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계'} value={fmt(totalAmount)} sb />

              {/* order 1-3: 업무그룹별 청구금액 — 매입은 표시 안 함 */}
              {invoiceType !== '매입' && (
                groupEntries.length > 0
                  ? groupEntries.map(([grp, amt], i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', height:22 }}>
                        <span style={T(400, 15, '22px', '#5C6370')}>{`${grp} 청구금액`}</span>
                        <span style={T(400, 15, '22px', '#5C6370')}>{fmt(amt)}</span>
                      </div>
                    ))
                  : (
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', height:22 }}>
                        <span style={T(400, 15, '22px', '#5C6370')}>{`${shipperGroup} 청구금액`}</span>
                        <span style={T(400, 15, '22px', '#5C6370')}>{fmt(totalAmount)}</span>
                      </div>
                    )
              )}

              {/* order 4: divider */}
              <RDivider />

              {/* order 5: 조정금액 합계 (15SB) */}
              {adjItems.length > 0 && (
                <RRow label="조정금액 합계" value={(adjTotal >= 0 ? '+' : '') + fmt(Math.abs(adjTotal))} sb />
              )}

              {/* orders 7-8(visible): 조정금액 개별 항목 */}
              {adjItems.map((item, i) => {
                const signed = (item.sign === '+' ? '+' : '-') + fmt(item.amount);
                const valColor = item.sign === '+' ? '#2E3238' : '#DD2222';
                return (
                  <div key={item.id} style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', height:22 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:20, height:20, borderRadius:10, background:'#17191D', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ ...T(700, 11, '16px', '#fff'), textAlign:'center' as const }}>{i + 1}</span>
                        </div>
                        <span style={T(400, 15, '22px', '#5C6370')}>{`조정금액 ${i + 1}`}</span>
                      </div>
                      <span style={T(600, 15, '22px', valColor)}>{signed}</span>
                    </div>
                    {item.note && (
                      <p style={{ ...T(400, 14, '20px', '#9197A1'), margin:0, paddingLeft:26, wordBreak:'break-all' as const }}>
                        {`사유: ${item.note}`}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* order 13: 공급가액 (15SB) */}
              <RRow label="공급가액" value={fmt(supplyAmount)} sb />

              {/* order 14: 세액 (15SB) */}
              <RRow label="세액" value={fmt(taxAmount)} sb />

              {/* order 15: divider */}
              <RDivider />

              {/* order 16: 합계 금액 (22B, height 32px) */}
              <RRow label="합계 금액" value={fmt(finalAmount)} sb big />

            </div>
          </div>

        </div>

        {/* 푸터 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'20px 24px 24px', gap:8, borderTop:'1px solid #E4E5E9', borderRadius:'0 0 12px 12px', flexShrink:0 }}>
          <button onClick={() => setTaxInvoiceOpen(false)} style={{ width:71, height:52, background:'#fff', border:'none', borderRadius:4, cursor:'pointer', ...T(600, 18, '26px', '#2E3238') }}>닫기</button>
          <button onClick={() => { setCurrentStatus('수금대기'); setTaxInvoiceOpen(false); setShowTaxToast(true); }} style={{ width:102, height:52, background:'#005FFF', border:'none', borderRadius:4, cursor:'pointer', ...T(600, 18, '26px', '#fff') }}>발행하기</button>
        </div>

      </div>
      </div>
    </div>,
    document.body
  );
}

function ConfirmInvoiceModal() {
  const { setConfirmInvoiceOpen, setCurrentStatus, setShowConfirmToast,
          invoiceId, invoiceType, shipper, shipperGroup, period, rowStatus,
          totalAmount, supplyAmount, taxAmount, adjTotal, excludedIndices, addedOrders } = useContext(DetailCtx);

  const handleConfirm = () => {
    setCurrentStatus('발행대기');
    setConfirmInvoiceOpen(false);
    setShowConfirmToast(true);
  };
  const [scale, setScale] = useState(() => window.innerWidth / 1920);
  useEffect(() => {
    const update = () => setScale(window.innerWidth / 1920);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const finalAmount = totalAmount + adjTotal;
  const activeCount = DETAIL_ROWS - excludedIndices.size + addedOrders.size;

  const fmt = (ms: number) => { const d = new Date(ms); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
  const todayMs = new Date(2026, 5, 26).getTime(); // 2026-06-26 고정 (현재 날짜)
  const writeDate = fmt(todayMs);
  const dueDate   = fmt(todayMs + 30 * 86400000);  // 수금기한 = 작성일 + 30일

  // 사업자번호: shipper 문자열을 시드로 결정론적 생성
  const bizNum = (() => {
    let h = 0; for (const c of shipper) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = 100 + (h % 900); const b = 10 + ((h >> 10) % 90); const c2 = 10000 + ((h >> 20) % 90000);
    return `${a}-${b}-${String(c2).padStart(5,'0')}`;
  })();

  // CSS order별 컬럼 너비 그대로 + 사용자 지정 13개 헤더
  // CSS: 120, 120, 120, 100, 160, 140, 140, 140, 140, 140, 140, 140 (12col 원본)
  // 13번째 컬럼은 마지막 140px 뒤에 추가
  const COLS: { label: string; w: number; value: string }[] = [
    { label: '거래명세서ID',    w: 120, value: invoiceId },
    { label: '화주사',         w: 120, value: shipper },
    { label: '화주사 업무그룹', w: 120, value: shipperGroup },
    { label: '사업자번호',      w: 140, value: bizNum },
    { label: '총 오더 수',     w: 100, value: `${activeCount}건` },
    { label: '정산기간',        w: 160, value: period },
    { label: '계산서 작성일자', w: 140, value: writeDate },
    { label: '수금기한',        w: 140, value: dueDate },
    { label: invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계', w: 140, value: totalAmount.toLocaleString() + '원' },
    { label: '조정금액 합계',   w: 140, value: (adjTotal >= 0 ? '+' : '') + adjTotal.toLocaleString() + '원' },
    { label: '공급가액',        w: 140, value: supplyAmount.toLocaleString() + '원' },
    { label: '세액',           w: 140, value: taxAmount.toLocaleString() + '원' },
    { label: '합계 금액',      w: 140, value: finalAmount.toLocaleString() + '원' },
  ];

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:'center center' }}>
      <div style={{ width:1600, height:800, background:'#fff', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ position:'relative', padding:'24px 24px 16px', display:'flex', flexDirection:'column', gap:12, borderRadius:'12px 12px 0 0', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:700, fontSize:22, lineHeight:'32px', color:'#2E3238', letterSpacing:'-0.02em', margin:0 }}>{invoiceType} 거래명세서 확정</p>
            <button onClick={() => setConfirmInvoiceOpen(false)} style={{ width:26, height:26, borderRadius:4, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
                <path d="M16.75 0.75L0.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'#E4E5E9' }} />
        </div>

        {/* 바디 */}
        <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden' }}>

          {/* 좌측: 거래명세서 1건 테이블 (CSS column-first 구조 — 가로스크롤 시 헤더 배경 안 잘림) */}
          <div style={{ flex:1, minWidth:0, padding:'12px 24px 20px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* 테이블 외곽 border + overflow-x scroll */}
            <div style={{ overflowX:'auto', overflowY:'hidden', display:'flex', flexDirection:'row', flexShrink:0 }}>
              {COLS.map((c, i) => (
                /* 각 컬럼 = flex-column(헤더셀 + 데이터셀) */
                <div key={c.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, width:c.w, borderLeft: i === 0 ? 'none' : '1px solid #E4E5E9' }}>
                  {/* 헤더셀 */}
                  <div style={{ boxSizing:'border-box' as const, display:'flex', flexDirection:'row', alignItems:'center', padding:'8px', width:c.w, height:40, background:'#F6F7F8', borderBottom:'1px solid #E4E5E9', borderRight:'1px solid #E4E5E9', alignSelf:'stretch', position:'sticky', top:0, zIndex:1 }}>
                    <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', color:'#5C6370', letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.label}</span>
                  </div>
                  {/* 데이터셀 */}
                  <div style={{ boxSizing:'border-box' as const, display:'flex', flexDirection:'row', alignItems:'center', padding:'10px 8px', width:c.w, height:40, background:'#FFFFFF', borderBottom:'1px solid #E4E5E9', alignSelf:'stretch' }}>
                    <span style={{ fontFamily:"'Pretendard GOV', sans-serif", fontWeight:400, fontSize:15, lineHeight:'22px', color:'#2E3238', letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 세로 구분선 */}
          <div style={{ width:1, background:'#E4E5E9', flexShrink:0 }} />

          {/* 우측: 정산 정보 (CSS Frame 1410082818 기준) */}
          <div style={{ width:384, flexShrink:0, padding:'12px 16px 20px', display:'flex', flexDirection:'column' }}>
            {/* 카드: 352×192px, padding 16px, gap 12px */}
            <div style={{ width:352, background:'#F6F7F8', borderRadius:8, padding:16, display:'flex', flexDirection:'column', alignItems:'flex-start', gap:12 }}>

              {/* order 0: 화주사 업무그룹 (label 123px / value 22px height → 15SB) */}
              <div style={{ display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'center', width:320, height:22 }}>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#5C6370' }}>선택된 거래명세서 수</span>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#2E3238' }}>1건</span>
              </div>

              {/* order 1: divider */}
              <div style={{ width:320, height:1, background:'#E4E5E9', alignSelf:'stretch' }} />

              {/* order 2: 청구금액 (label 68px / 15SB) */}
              <div style={{ display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'center', width:320, height:22 }}>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#5C6370' }}>총 공급가액</span>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#2E3238' }}>{supplyAmount.toLocaleString()}원</span>
              </div>

              {/* order 3: 세액 (label 43px / 15SB) */}
              <div style={{ display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'center', width:320, height:22 }}>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#5C6370' }}>총 세액</span>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#2E3238' }}>{taxAmount.toLocaleString()}원</span>
              </div>

              {/* order 4: divider */}
              <div style={{ width:320, height:1, background:'#E4E5E9', alignSelf:'stretch' }} />

              {/* order 5: 합계 금액 (label 55px / 15SB, value 22B 99px) */}
              <div style={{ display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'center', width:320, height:32 }}>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, lineHeight:'22px', letterSpacing:'-0.02em', color:'#5C6370' }}>합계 금액</span>
                <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:700, fontSize:22, lineHeight:'32px', letterSpacing:'-0.02em', color:'#2E3238' }}>{finalAmount.toLocaleString()}원</span>
              </div>

            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'20px 24px 24px', gap:8, borderTop:'1px solid #E4E5E9', borderRadius:'0 0 12px 12px', flexShrink:0 }}>
          <button onClick={() => setConfirmInvoiceOpen(false)} style={{ width:71, height:52, background:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color:'#2E3238', letterSpacing:'-0.02em' }}>닫기</button>
          <button onClick={handleConfirm} style={{ width:102, height:52, background:'#005FFF', border:'none', borderRadius:4, cursor:'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>확정하기</button>
        </div>

      </div>
      </div>
    </div>,
    document.body
  );
}

const EXCLUDE_TOAST_ANIMATION = `
  @keyframes toast-slide-in {
    from { transform: translateX(calc(100% + 34px)); opacity: 0; }
    to   { transform: translateX(0);                 opacity: 1; }
  }
`;
const EXCLUDE_TOAST_STYLE: React.CSSProperties = {
  position: 'fixed', bottom: 34, right: 34, width: 400, height: 54,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 20px', zIndex: 99999, background: '#2E3238',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  animation: 'toast-slide-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
};
function TaxToast({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(<>
    <style>{EXCLUDE_TOAST_ANIMATION}</style>
    <div style={{ ...EXCLUDE_TOAST_STYLE }}>
      <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, color:'#fff', letterSpacing:'-0.02em' }}>세금계산서가 발행되었습니다.</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
          <path d="M0.75 0.75L13.25 13.25" stroke="#fff" strokeLinecap="round" strokeWidth="1.5"/>
          <path d="M13.25 0.75L0.75 13.25" stroke="#fff" strokeLinecap="round" strokeWidth="1.5"/>
        </svg>
      </button>
    </div>
  </>, document.body);
}

function ConfirmToast({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(<>
    <style>{EXCLUDE_TOAST_ANIMATION}</style>
    <div style={{ ...EXCLUDE_TOAST_STYLE }}>
      <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, color:'#fff', letterSpacing:'-0.02em' }}>거래명세서가 확정되었습니다.</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
          <path d="M0.75 0.75L13.25 13.25" stroke="#fff" strokeLinecap="round" strokeWidth="1.5"/>
          <path d="M13.25 0.75L0.75 13.25" stroke="#fff" strokeLinecap="round" strokeWidth="1.5"/>
        </svg>
      </button>
    </div>
  </>, document.body);
}

function ExcludeToast({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <>
      <style>{EXCLUDE_TOAST_ANIMATION}</style>
      <div style={EXCLUDE_TOAST_STYLE}>
        <span style={{ color: '#fff', fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>
          거래명세서에서 오더가 제외되었습니다.
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </>,
    document.body
  );
}

function ExcludeModal() {
  const { setExcludeModalOpen, setShowExcludeToast, excludedIndices, setExcludedIndices, invoiceType } = useContext(DetailCtx);
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(() => window.innerWidth / 1920);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    const update = () => setScale(window.innerWidth / 1920);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const rows = DETAIL_ROW_DATA.map((row, i) => ({ ...row, orderId: ORDER_IDS[i], idx: i }))
    .filter(r => !excludedIndices.has(r.idx))
    .filter(r => !search || r.orderId.includes(search.toUpperCase()) || r.loadName.includes(search) || r.unloadName.includes(search));

  const allSelected = rows.length > 0 && rows.every(r => selectedRows.has(r.idx));
  const toggleAll = () => {
    if (allSelected) setSelectedRows(prev => { const n = new Set(prev); rows.forEach(r => n.delete(r.idx)); return n; });
    else setSelectedRows(prev => { const n = new Set(prev); rows.forEach(r => n.add(r.idx)); return n; });
  };
  const toggleRow = (idx: number) => setSelectedRows(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });

  const amountColLabel = invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계';
  const COLS = [
    '오더ID', '협력사 업무그룹',
    '매출 명세서 기준일',
    '상차일', '하차일',
    '상차지명', '상차지주소',
    '하차지명', '하차지주소',
    '경유', '독차', '왕복',
    '요청 차량', '요청 차량 특성', '차량번호',
    amountColLabel,
  ];
  const getVal = (row: typeof rows[0], col: string) => {
    switch(col) {
      case '오더ID': return row.orderId;
      case '협력사 업무그룹': return row.partner;
      case '매출 명세서 기준일': return row.loadDate; // 기준일 데이터로 대체
      case '상차일': return row.loadDate;
      case '하차일': return row.unloadDate;
      case '상차지명': return row.loadName;
      case '상차지주소': return row.loadAddr;
      case '하차지명': return row.unloadName;
      case '하차지주소': return row.unloadAddr;
      case '경유': return row.via;
      case '독차': return row.solo;
      case '왕복': return row.trip;
      case '요청 차량': return row.vehicle;
      case '요청 차량 특성': return row.vchar;
      case '차량번호': return String(row.plate);
      case amountColLabel: return row.amount.toLocaleString();
      case '금액메모': return row.memo;
      default: return '';
    }
  };

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:'center center' }}>
      <div style={{ width:1600, height:800, background:'#fff', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column' }}>
        {/* 헤더 */}
        <div style={{ position:'relative', padding:'24px 24px 16px', gap:12, display:'flex', flexDirection:'column', borderRadius:'12px 12px 0 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:700, fontSize:22, lineHeight:'32px', color:'#2E3238', letterSpacing:'-0.02em', margin:0 }}>오더 제외</p>
            <button onClick={() => setExcludeModalOpen(false)} style={{ width:26, height:26, borderRadius:4, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
                <path d="M16.75 0.75L0.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'#E4E5E9' }} />
        </div>

        {/* 컨텐츠 */}
        <div style={{ flex:1, padding:'12px 24px 20px', display:'flex', flexDirection:'column', gap:16, overflow:'hidden' }}>
          {/* 검색바 */}
          <div style={{ display:'flex', height:36, flexShrink:0 }}>
            <div style={{ width:82, height:36, background:'#fff', border:'1px solid #E4E5E9', borderRight:'none', borderRadius:'4px 0 0 4px', display:'flex', alignItems:'center', padding:'6px 10px', gap:4, boxSizing:'border-box' as const }}>
              <span style={{ fontFamily:"'Pretendard GOV', sans-serif", fontSize:15, color:'#2E3238', letterSpacing:'-0.02em', flex:1 }}>오더ID</span>
              <svg width="10" height="5" fill="none" viewBox="0 0 10 5"><path d="M1 1L5 4L9 1" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex:1, height:36, background:'#fff', border:'1px solid #E4E5E9', borderRadius:'0 4px 4px 0', display:'flex', alignItems:'center', padding:'6px 10px', gap:8, boxSizing:'border-box' as const }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5.5" stroke="#9197A1" strokeWidth="1.3"/><line x1="11.2" y1="11.2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <input style={{ flex:1, border:'none', outline:'none', fontFamily:"'Pretendard GOV', sans-serif", fontSize:15, color:'#2e3238', letterSpacing:'-0.02em', background:'transparent' }}
                placeholder="오더를 검색하세요." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* 테이블: 가로+세로 스크롤 */}
          <div style={{ flex:1, overflow:'auto', minHeight:0 }}>
            <div style={{ minWidth:'max-content' }}>
              {/* 헤더행 — sticky */}
              <div style={{ display:'flex', background:'#F6F7F8', borderBottom:'1px solid #E4E5E9', borderTop:'1px solid #E4E5E9', position:'sticky', top:0, zIndex:1 }}>
                <div style={{ width:34, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #E4E5E9', flexShrink:0, borderLeft:'1px solid #E4E5E9' }}>
                  <div onClick={toggleAll} style={{ width:16, height:16, borderRadius:3, border:`1.3px solid ${allSelected ? '#005FFF' : '#ADB1B9'}`, background: allSelected ? '#005FFF' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {allSelected && <svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                {COLS.map(col => (
                  <div key={col} style={{ width:140, height:40, display:'flex', alignItems:'center', padding:'0 8px', borderRight:'1px solid #E4E5E9', flexShrink:0, boxSizing:'border-box' as const }}>
                    <span style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{col}</span>
                  </div>
                ))}
              </div>
              {/* 데이터행 */}
              {rows.map(row => (
                <div key={row.idx} style={{ display:'flex', borderBottom:'1px solid #E4E5E9' }}>
                  <div style={{ width:34, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #E4E5E9', flexShrink:0, borderLeft:'1px solid #E4E5E9', background:'#F6F7F8' }}>
                    <div onClick={() => toggleRow(row.idx)} style={{ width:16, height:16, borderRadius:3, border:`1.3px solid ${selectedRows.has(row.idx) ? '#005FFF' : '#ADB1B9'}`, background: selectedRows.has(row.idx) ? '#005FFF' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {selectedRows.has(row.idx) && <svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  {COLS.map(col => (
                    <div key={col} style={{ width:140, height:40, display:'flex', alignItems:'center', padding:'0 8px', borderRight:'1px solid #E4E5E9', flexShrink:0, boxSizing:'border-box' as const, background:'#fff' }}>
                      <span style={{ fontFamily:"'Pretendard GOV', sans-serif", fontSize:15, color:'#2E3238', letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{getVal(row, col)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'20px 24px 24px', gap:8, borderTop:'1px solid #E4E5E9', borderRadius:'0 0 12px 12px', flexShrink:0 }}>
          <button onClick={() => setExcludeModalOpen(false)} style={{ width:71, height:52, background:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color:'#2E3238', letterSpacing:'-0.02em' }}>닫기</button>
          <button
            onClick={() => selectedRows.size > 0 && setConfirmOpen(true)}
            disabled={selectedRows.size === 0}
            style={{ width:102, height:52, background: selectedRows.size === 0 ? '#EBEDEF' : '#DD2222', border:'none', borderRadius:4, cursor: selectedRows.size === 0 ? 'not-allowed' : 'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color: selectedRows.size === 0 ? '#ADB1B9' : '#fff', letterSpacing:'-0.02em', transition:'background 0.15s, color 0.15s' }}>오더 제외</button>
        </div>

        {/* 확인 알럿 모달 */}
        {confirmOpen && (
          <div style={{ position:'absolute', inset:0, zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.2)', borderRadius:12 }}>
            <div style={{ width:416, height:198, background:'#fff', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column' }}>
              {/* Top */}
              <div style={{ padding:'24px 24px 6px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <p style={{ fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:700, fontSize:22, lineHeight:'32px', color:'#000', letterSpacing:'-0.02em', margin:0, flex:1 }}>
                    선택한 {selectedRows.size}건의 오더를<br/>제외하시겠어요?
                  </p>
                  <button onClick={() => setConfirmOpen(false)} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                      <path d="M2 2L14 14M14 2L2 14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              {/* btn */}
              <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', padding:24, gap:8, background:'#fff', borderRadius:'0 0 12px 12px' }}>
                <button onClick={() => setConfirmOpen(false)} style={{ width:71, height:52, border:'none', background:'none', borderRadius:4, cursor:'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color:'#2E3238', letterSpacing:'-0.02em' }}>취소</button>
                <button onClick={() => { setExcludedIndices(new Set([...excludedIndices, ...selectedRows])); setConfirmOpen(false); setExcludeModalOpen(false); setShowExcludeToast(true); }} style={{ width:102, height:52, background:'#DD2222', border:'none', borderRadius:4, cursor:'pointer', fontFamily:"'Pretendard GOV:SemiBold'", fontWeight:600, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>제외하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>,
    document.body
  );
}

function Right1() {
  const { setConfirmInvoiceOpen, supplyAmount, setShowSaveToast, setShowSaveErrorToast, setIsEditMode } = useContext(DetailCtx);
  const handleSave = () => {
    if (supplyAmount <= 0) { setShowSaveErrorToast(true); return; }
    setShowSaveToast(true);
  };
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="right">
      <div className="bg-white h-[44px] relative rounded-[4px] shrink-0" data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">
            <p className="leading-[24px]">거래명세서 삭제</p>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      <div onClick={handleSave} className="bg-white h-[44px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f6f7f8]" data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">
            <p className="leading-[24px]">수정 완료</p>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      <div onClick={() => setConfirmInvoiceOpen(true)} className="bg-[#005fff] content-stretch flex h-[44px] items-center justify-center overflow-clip px-[16px] relative rounded-[4px] shrink-0 cursor-pointer hover:opacity-90" data-name="Button">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">
          <p className="leading-[24px]">거래명세서 확정</p>
        </div>
      </div>
    </div>
  );
}

function Right_발행대기() {
  const { setTaxInvoiceOpen } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="right">
      {/* 거래명세서 발행 취소: 163×44, white bordered */}
      <div className="bg-white h-[44px] relative rounded-[4px] shrink-0" style={{width: 163}} data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">거래명세서 확정 취소</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      {/* 거래명세서 발행: 132×44, blue */}
      <div onClick={() => setTaxInvoiceOpen(true)} className="bg-[#005fff] content-stretch flex h-[44px] items-center justify-center overflow-clip px-[16px] relative rounded-[4px] shrink-0 cursor-pointer hover:opacity-90" style={{width: 132}} data-name="Button">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">세금계산서 발행</p>
      </div>
    </div>
  );
}

function Right_수금대기() {
  const { setCurrentStatus, rowStatus, setIsEditMode } = useContext(DetailCtx);
  const isPurchase = rowStatus === '지급대기';
  const completeLabel = isPurchase ? '지급 완료' : '수금 완료';
  const completeStatus = isPurchase ? '지급완료' : '수금완료';
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="right">
      <div className="bg-white h-[44px] relative rounded-[4px] shrink-0" style={{width: 163}} data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">세금계산서 발행 취소</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      <div className="bg-white h-[44px] relative rounded-[4px] shrink-0" style={{width: 132}} data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">세금계산서 조회</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      <div onClick={() => setIsEditMode(true)} className="bg-white h-[44px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f6f7f8]" style={{width: 163}} data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">세금계산서 수정 발행</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      <div onClick={() => setCurrentStatus(completeStatus)} className="bg-[#005fff] content-stretch flex h-[44px] items-center justify-center overflow-clip px-[16px] relative rounded-[4px] shrink-0 cursor-pointer" style={{width: 91}} data-name="Button">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">{completeLabel}</p>
      </div>
    </div>
  );
}

function Right_수금완료() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="right">
      {/* 수금완료 날짜 표시 (135×36) */}
      <div className="content-stretch flex gap-[4px] items-center justify-center px-[12px] relative rounded-[6px] shrink-0" style={{width: 135, height: 36}}>
        <p className="font-['Pretendard_GOV:Regular'] leading-[20px] not-italic relative shrink-0 text-[#5c6370] text-[14px] tracking-[-0.28px] whitespace-nowrap">수금완료</p>
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">26.05.22</p>
      </div>
      {/* 수금 취소: 132×44, white bordered */}
      <div className="bg-white h-[44px] relative rounded-[4px] shrink-0" style={{width: 132}} data-name="Button">
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">세금계산서 조회</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      {/* 세금계산서 발행: 118×44, blue */}
      <div className="bg-[#005fff] content-stretch flex h-[44px] items-center justify-center overflow-clip px-[16px] relative rounded-[4px] shrink-0" style={{width: 118}} data-name="Button">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">수금완료 취소</p>
      </div>
    </div>
  );
}

/** 수정 발행 모드 전용 우측 헤더 패널
 *  right: gap 4px, width 258px
 *  - 취소 (60px, white border) → isEditMode=false
 *  - 세금계산서 수정 발행 확정 (194px, #005FFF)
 */
function Right_수정발행모드() {
  const { setIsEditMode } = useContext(DetailCtx);

  return (
    <div
      className="content-stretch flex items-center relative shrink-0"
      style={{ gap: 4, width: 258 }}
      data-name="right"
    >
      {/* 취소: 60×44, white border */}
      <div
        onClick={() => setIsEditMode(false)}
        className="bg-white h-[44px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f6f7f8]"
        style={{ width: 60 }}
      >
        <div className="content-stretch flex items-center justify-center overflow-clip px-[16px] relative rounded-[inherit] size-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px] whitespace-nowrap">취소</p>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
      {/* 세금계산서 수정 발행 확정: 194×44, blue */}
      <div
        className="bg-[#005fff] content-stretch flex h-[44px] items-center justify-center overflow-clip px-[16px] relative rounded-[4px] shrink-0 cursor-pointer hover:opacity-90"
        style={{ width: 194 }}
      >
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">세금계산서 수정 발행 확정</p>
      </div>
    </div>
  );
}

function Component7() {
  const { rowStatus, isEditMode } = useContext(DetailCtx);

  // 수금대기/지급대기에서 수정 발행 모드 진입 시 전용 패널 사용
  const isAmendMode = isEditMode && (rowStatus === '수금대기' || rowStatus === '지급대기');

  const RightPanel = isAmendMode ? Right_수정발행모드
    : rowStatus === '발행대기' ? Right_발행대기       // 발행대기
    : rowStatus === '수금대기' ? Right_수금대기       // 수금대기
    : rowStatus === '수금완료' ? Right_수금완료       // 수금완료
    : rowStatus === '지급대기' ? Right_수금대기       // 매입: 지급대기
    : rowStatus === '지급완료' ? Right_수금완료       // 매입: 지급완료
    : Right1; // 확정대기
  return (
    <div className="bg-white content-stretch flex h-[82px] items-center justify-between px-[32px] relative shrink-0 w-[1712px]" data-name>
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame356 />
      <RightPanel />
    </div>
  );
}

function Frame382() {
  const { shipper } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">{shipper}</p>
      <div className="bg-[#ebedef] content-stretch flex h-[20px] items-center justify-center overflow-clip px-[4px] relative rounded-[2px] shrink-0" data-name="badge">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[12px] tracking-[-0.24px] whitespace-nowrap">
          <p className="leading-[18px]">연동중</p>
        </div>
      </div>
    </div>
  );
}

function Input02Selectbox() {
  return (
    <div className="content-stretch flex h-[36px] items-center relative shrink-0 w-full" data-name="Input / 02. Selectbox">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">화주사</p>
      <Frame382 />
    </div>
  );
}

function Input02Selectbox1() {
  const { shipperGroup } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex h-[36px] items-center leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370] w-[120px]">화주사 업무그룹</p>
      <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 overflow-hidden text-ellipsis text-[#2e3238]">{shipperGroup}</p>
    </div>
  );
}

function Input02Selectbox2() {
  const { excludedIndices, addedOrders } = useContext(DetailCtx);
  const activeRows = DETAIL_ROWS - excludedIndices.size + addedOrders.size;
  return (
    <div className="[word-break:break-word] content-stretch flex h-[36px] items-center leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370] w-[120px]">총 오더 수</p>
      <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 text-[#2e3238]">{activeRows}건</p>
    </div>
  );
}

function Input02Selectbox3() {
  const { period } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex h-[36px] items-center leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370] w-[120px]">정산기간</p>
      <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 text-[#2e3238]">{period}</p>
    </div>
  );
}

function Input02Selectbox4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] h-[36px] items-center min-w-px relative" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370] w-[120px]">화주사 사업자번호</p>
      <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 text-[#2e3238]">138-28-01123</p>
    </div>
  );
}

function Input02Selectbox5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] h-[36px] items-center min-w-px relative" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370] w-[120px]">종사업장번호</p>
      <p className="font-['Pretendard_GOV:SemiBold'] relative shrink-0 text-[#2e3238] whitespace-nowrap">138-28-01123</p>
    </div>
  );
}

function Frame377() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[8px] items-start leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full">
      <Input02Selectbox4 />
      <Input02Selectbox5 />
    </div>
  );
}

function Frame371() {
  const { invoiceType, shipper, period, excludedIndices, addedOrders } = useContext(DetailCtx);
  const activeRows = DETAIL_ROWS - excludedIndices.size + addedOrders.size;
  const LBL_W = 106;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="[word-break:break-word] content-stretch flex h-[36px] items-center leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full">
      <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370]" style={{ width: LBL_W, flexShrink: 0 }}>{label}</p>
      <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 overflow-hidden text-ellipsis text-[#2e3238]">{value}</p>
    </div>
  );
  const SplitRow = ({ left, right }: { left: [string, string]; right: [string, string] }) => (
    <div className="content-stretch flex h-[36px] items-center gap-[8px] relative shrink-0 w-full">
      <div className="[word-break:break-word] flex flex-[1_0_0] items-center leading-[22px] not-italic min-w-0 text-[15px] tracking-[-0.3px]">
        <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370]" style={{ width: LBL_W, flexShrink: 0 }}>{left[0]}</p>
        <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 overflow-hidden text-ellipsis text-[#2e3238]">{left[1]}</p>
      </div>
      <div className="[word-break:break-word] flex flex-[1_0_0] items-center leading-[22px] not-italic min-w-0 text-[15px] tracking-[-0.3px]">
        <p className="font-['Pretendard_GOV:Regular'] relative shrink-0 text-[#5c6370]" style={{ width: LBL_W, flexShrink: 0 }}>{right[0]}</p>
        <p className="font-['Pretendard_GOV:SemiBold'] flex-1 min-w-0 overflow-hidden text-ellipsis text-[#2e3238]">{right[1]}</p>
      </div>
    </div>
  );

  return (
    <div className="flex-[1_0_0] h-full min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-between p-[16px] relative size-full">
          {invoiceType === '매입' ? (
            <>
              <SplitRow left={['기사명', shipper || '김카모']} right={['차량번호', '12아3456']} />
              <SplitRow left={['기사 사업자번호', '138-28-01123']} right={['기사 전화번호', '010-0000-0000']} />
              <Row label="총 오더 수" value={`${activeRows}건`} />
              <Row label="정산기간" value={period} />
              <Row label="지급완료일" value="26.05.12" />
            </>
          ) : (
            <>
              <Input02Selectbox />
              <Input02Selectbox1 />
              <Input02Selectbox2 />
              <Input02Selectbox3 />
              <Frame377 />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarDropdownDetail({ anchorRect, value, onChange, onClose }: {
  anchorRect: DOMRect;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const parseDate = (s: string) => {
    const [yy, mm, dd] = s.split('.').map(Number);
    return new Date(2000 + yy, mm - 1, dd);
  };
  const formatDate = (d: Date) => {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };
  const today = new Date(2026, 5, 29);
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), inMonth: false });
  }

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const quickButtons = [
    { label: '오늘', get: () => today },
    { label: '어제', get: () => new Date(today.getTime() - 86400000) },
    { label: '이번주', get: () => { const d = new Date(today); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d; } },
    { label: '이번달', get: () => new Date(today.getFullYear(), today.getMonth(), 1) },
    { label: '저번달', get: () => new Date(today.getFullYear(), today.getMonth() - 1, 1) },
    { label: '+1주', get: () => new Date(selected.getTime() + 7 * 86400000) },
    { label: '+1달', get: () => new Date(selected.getFullYear(), selected.getMonth() + 1, selected.getDate()) },
    { label: '+3달', get: () => new Date(selected.getFullYear(), selected.getMonth() + 3, selected.getDate()) },
  ];

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', top: anchorRect.bottom + 2, left: anchorRect.left, width: 276, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 99999, boxSizing: 'border-box' }}>
      {/* Calendar section */}
      <div style={{ width: 252, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Month/year header */}
        <div style={{ height: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px' }}>
          <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontSize: 18, fontWeight: 700, color: '#2E3238', letterSpacing: '-0.02em' }}>{viewYear}년 {viewMonth + 1}월</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => { const d = new Date(viewYear, viewMonth - 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }} style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M4.5 1L0.5 5L4.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => { const d = new Date(viewYear, viewMonth + 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }} style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M0.5 1L4.5 5L0.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        {/* Days of week */}
        <div style={{ display: 'flex', width: 252 }}>
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} style={{ width: 36, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#454B55', letterSpacing: '-0.02em' }}>{d}</span>
            </div>
          ))}
        </div>
        {/* Day grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 252, gap: '2px 0' }}>
          {cells.map((cell, i) => {
            const isSelected = isSameDay(cell.date, selected);
            const isToday = isSameDay(cell.date, today);
            const key = cell.date.toISOString().slice(0, 10);
            const isHovered = hovered === key && !isSelected && cell.inMonth;
            return (
              <div key={i} style={{ width: 36, height: 36, position: 'relative', cursor: cell.inMonth ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={() => cell.inMonth && setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { if (cell.inMonth) { onChange(formatDate(cell.date)); onClose(); } else { setViewYear(cell.date.getFullYear()); setViewMonth(cell.date.getMonth()); } }}>
                <div style={{ width: 36, height: 36, borderRadius: isSelected ? 20 : (isToday || isHovered) ? 100 : 0, background: isSelected ? '#005FFF' : (isToday || isHovered) ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#9197A1', letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Quick buttons */}
      <div style={{ borderTop: '1px solid #E4E5E9', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {quickButtons.map(({ label, get }) => (
          <button key={label} onClick={() => { onChange(formatDate(get())); onClose(); }}
            style={{ border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', fontSize: 14, fontWeight: 600, color: '#2E3238', padding: '0 8px', height: 26, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

function TypeStatusDisabled() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/calendar">
            <div className="h-[14.4px] relative shrink-0 w-[14px]" data-name="group">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14.4004">
                <path d={svgPaths.p31eb2f00} fill="var(--fill-0, #9197A1)" id="group" />
              </svg>
            </div>
          </div>
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">25.08.13</p>
          </div>
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_down">
            <div className="flex items-center justify-center relative shrink-0">
              <div className="-scale-y-100 flex-none">
                <div className="h-[4px] relative w-[10px]" data-name="arr">
                  <div className="absolute inset-[-17.5%_-7%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                      <path d={svgPaths.p609440} id="arr" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input02Selectbox6() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Input / 02. Odstbox">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">계산서 작성일자</p>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[300px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled />
      </div>
    </div>
  );
}

function TypeStatusDisabled1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/calendar">
            <div className="h-[14.4px] relative shrink-0 w-[14px]" data-name="group">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14.4004">
                <path d={svgPaths.p31eb2f00} fill="var(--fill-0, #9197A1)" id="group" />
              </svg>
            </div>
          </div>
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">25.08.13</p>
          </div>
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_down">
            <div className="flex items-center justify-center relative shrink-0">
              <div className="-scale-y-100 flex-none">
                <div className="h-[4px] relative w-[10px]" data-name="arr">
                  <div className="absolute inset-[-17.5%_-7%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                      <path d={svgPaths.p609440} id="arr" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input02Selectbox7() {
  const { invoiceType } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Input / 02. Selectbox">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">{invoiceType === '매입' ? '지급기한' : '수금기한'}</p>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[300px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled1 />
      </div>
    </div>
  );
}

function DatePickerRows() {
  const { invoiceType } = useContext(DetailCtx);
  const [dateValues, setDateValues] = useState({ 작성: todayYYMMDD(), 기한: '26.08.13' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const rows = [
    { label: '계산서 작성일자', key: '작성' as const },
    { label: invoiceType === '매입' ? '지급기한' : '수금기한', key: '기한' as const },
  ];

  return (
    <>
      {rows.map(({ label, key }) => (
        <div key={key} className="content-stretch flex items-center relative shrink-0 w-full" data-name="Input / 02. Selectbox">
          <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">{label}</p>
          <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[300px]">
            <div
              onClick={e => { if (openCal === key) { setOpenCal(null); } else { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpenCal(key); } }}
              className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full cursor-pointer"
              style={{ border: `1px solid ${openCal === key ? '#005FFF' : '#E4E5E9'}` }}
            >
              <div className="flex flex-row items-center size-full">
                <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
                  <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/calendar">
                    <div className="h-[14.4px] relative shrink-0 w-[14px]" data-name="group">
                      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14.4004">
                        <path d={svgPaths.p31eb2f00} fill="var(--fill-0, #9197A1)" id="group" />
                      </svg>
                    </div>
                  </div>
                  <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">
                    <p className="leading-[22px]">{dateValues[key]}</p>
                  </div>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, transform: openCal === key ? 'rotate(180deg)' : undefined }}>
                    <path d="M1 1L5 5L9 1" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {openCal && anchorRect && createPortal(
        <CalendarDropdownDetail
          anchorRect={anchorRect}
          value={dateValues[openCal as keyof typeof dateValues]}
          onChange={v => { setDateValues(prev => ({ ...prev, [openCal]: v })); setOpenCal(null); }}
          onClose={() => setOpenCal(null)}
        />,
        document.body
      )}
    </>
  );
}

function Input02Selectbox8() {
  const [val, setVal] = useState('lis@kakao.com');
  const [focused, setFocused] = useState(false);
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Input / 02. Selectbox">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">세금계산서 이메일</p>
      <div className="group content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start justify-end min-w-px relative">
        <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full">
          <div aria-hidden className="absolute border inset-0 pointer-events-none rounded-[4px] transition-colors border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff]" />
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <input value={val} onChange={e => setVal(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="이메일을 입력해 주세요" className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Regular'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px] bg-transparent border-none outline-none placeholder:text-[#767d8a]" />
            {focused && val && <span onMouseDown={e => e.preventDefault()}><ClearIcon onClick={() => setVal('')} /></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input02Selectbox9() {
  const [val, setVal] = useState('우리 1000-000-000000');
  const [focused, setFocused] = useState(false);
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Input / 02. Selectbox">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">세금계산서 비고</p>
      <div className="group content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start justify-end min-w-px relative">
        <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full">
          <div aria-hidden className="absolute border inset-0 pointer-events-none rounded-[4px] transition-colors border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff]" />
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <input value={val} onChange={e => setVal(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="비고를 입력해 주세요" className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Regular'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px] bg-transparent border-none outline-none placeholder:text-[#767d8a]" />
            {focused && val && <span onMouseDown={e => e.preventDefault()}><ClearIcon onClick={() => setVal('')} /></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame372() {
  return (
    <div className="h-full relative rounded-[8px] shrink-0 w-[452px]">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-between p-[16px] relative size-full">
          <DatePickerRows />
          <Input02Selectbox8 />
          <Input02Selectbox9 />
        </div>
      </div>
    </div>
  );
}

function Frame378() {
  return (
    /* Frame 1707482668: padding 20px 0px, height 220px, border-bottom */
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '20px 0px',
        width: '1167px',
        height: '220px',
        borderBottom: '1px solid #E4E5E9',
        flexShrink: 0,
        marginBottom: 8,
      }}
    >
      {/* Frame 1410082818 left: 714px, padding 0 32px 0 0 — 5행×36px=180px */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '0px 32px 0px 0px',
          width: '714px',
          height: '180px',
          flexShrink: 0,
          flexGrow: 1,
        }}
      >
        <Frame371Flat />
      </div>

      {/* 수직 구분선 */}
      <div style={{ width: 1, height: 180, background: '#E4E5E9', flexShrink: 0 }} />

      {/* Frame 1410082818 right: 452px, padding 0 0 0 32px */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '0px 0px 0px 32px',
          gap: '8px',
          width: '452px',
          height: '180px',
          flexShrink: 0,
        }}
      >
        <Frame372Flat />
      </div>
    </div>
  );
}

/** 좌측 정보 영역 (보더 없는 flat 버전) */
function Frame371Flat() {
  const { invoiceType, shipper, shipperGroup, period, excludedIndices, addedOrders } = useContext(DetailCtx);
  const activeRows = DETAIL_ROWS - excludedIndices.size + addedOrders.size;

  const labelStyle: React.CSSProperties = {
    width: 120, flexShrink: 0,
    fontFamily: "'Pretendard GOV', sans-serif", fontWeight: 400, fontSize: 15, lineHeight: '22px',
    letterSpacing: '-0.02em', color: '#5C6370',
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "'Pretendard GOV', sans-serif", fontWeight: 600, fontSize: 15, lineHeight: '22px',
    letterSpacing: '-0.02em', color: '#2E3238',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'row', alignItems: 'center',
    width: '100%', height: 36, flexShrink: 0,
  };

  if (invoiceType === '매입') {
    return (
      <>
        <div style={rowStyle}>
          <span style={labelStyle}>기사명</span>
          <span style={valueStyle}>{shipper || '김카모'}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>기사 사업자번호</span>
          <span style={valueStyle}>138-28-01123</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>총 오더 수</span>
          <span style={valueStyle}>{activeRows}건</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>정산기간</span>
          <span style={valueStyle}>{period}</span>
        </div>
        <div style={{ ...rowStyle, gap: 8 }}>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', minWidth: 0 }}>
            <span style={{ ...labelStyle }}>차량번호</span>
            <span style={valueStyle}>12아3456</span>
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', minWidth: 0 }}>
            <span style={{ ...labelStyle }}>기사 전화번호</span>
            <span style={valueStyle}>010-0000-0000</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Row 0: 화주사 + badge */}
      <div style={rowStyle}>
        <span style={labelStyle}>화주사</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ ...valueStyle, flexShrink: 0 }}>{shipper}</span>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0px 4px', height: 20, background: '#EBEDEF', borderRadius: 2,
            fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 12,
            lineHeight: '18px', letterSpacing: '-0.02em', color: '#9197A1',
            flexShrink: 0,
          }}>연동중</div>
        </div>
      </div>
      {/* Row 1: 화주사 업무그룹 */}
      <div style={rowStyle}>
        <span style={labelStyle}>화주사 업무그룹</span>
        <span style={{ ...valueStyle, flex: 1, minWidth: 0 }}>{shipperGroup}</span>
      </div>
      {/* Row 2: 총 오더 수 */}
      <div style={rowStyle}>
        <span style={labelStyle}>총 오더 수</span>
        <span style={valueStyle}>{activeRows}건</span>
      </div>
      {/* Row 3: 정산기간 */}
      <div style={rowStyle}>
        <span style={labelStyle}>정산기간</span>
        <span style={valueStyle}>{period}</span>
      </div>
      {/* Row 4: 화주사 사업자번호 + 종사업장번호 */}
      <div style={{ ...rowStyle, gap: 8 }}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', minWidth: 0 }}>
          <span style={{ ...labelStyle }}>화주사 사업자번호</span>
          <span style={valueStyle}>138-28-01123</span>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', minWidth: 0 }}>
          <span style={{ ...labelStyle }}>종사업장번호</span>
          <span style={valueStyle}>138-28-01123</span>
        </div>
      </div>
    </>
  );
}

/** 우측 입력 영역 (보더 없는 flat 버전 - 4행: 날짜 2 + 이메일 + 비고) */
function Frame372Flat() {
  return (
    <>
      <DatePickerRows />
      <Input02Selectbox8 />
      <Input02Selectbox9 />
    </>
  );
}

function Title7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">오더ID</p>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title7 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame357() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame3 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame4 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame5 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame6 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame7 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame8 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame9 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame10 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame11 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame12 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame13 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame14 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame15 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame16 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame17 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame18 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame19 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame20 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame21 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame22 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame23 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title8() {
  const { invoiceType } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{invoiceType === '매입' ? '화주사' : '화주사 업무그룹'}</p>
      </div>
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title8 />
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame358() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame24 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame25 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame26 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame27 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame28 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame29 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame30 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame31 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame32 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame33 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame34 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame35 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame36 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame37 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame38 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame39 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame40 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame41 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame42 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame43 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame44 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title9() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차일</p>
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title9 />
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame62() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame66() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function TableColumns() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-[140px]" data-name="Table_Columns">
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
      <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center p-[8px] relative size-full">
            <Frame45 />
          </div>
        </div>
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame46 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame47 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame48 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame49 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame50 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame51 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame52 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame53 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame54 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame55 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame56 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame57 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame58 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame59 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame60 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame62 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame63 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame64 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame65 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame66 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Title10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차일</p>
      </div>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title10 />
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame69() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame78() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function TableColumns1() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-[140px]" data-name="Table_Columns">
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
      <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center p-[8px] relative size-full">
            <Frame67 />
          </div>
        </div>
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame68 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame69 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame70 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame71 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame72 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame73 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame74 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame75 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame76 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame78 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame79 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame80 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame81 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame82 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame83 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame84 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame85 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame86 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame87 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame88 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Title11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차지명</p>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title11 />
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame99() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame102() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame370() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame89 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame90 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame91 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame92 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame93 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame94 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame95 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame96 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame97 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame98 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame99 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame100 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame101 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame102 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame103 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame104 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame105 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame106 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame107 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame108 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame109 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title12() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차지주소</p>
      </div>
    </div>
  );
}

function Frame110() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title12 />
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame112() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame113() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame116() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame117() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame118() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame119() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame120() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame122() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame124() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame130() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame359() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center p-[8px] relative shrink-0 w-[140px] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <Frame110 />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame111 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame112 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame113 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame114 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame115 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame116 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame117 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame118 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame119 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame120 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame121 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame122 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame123 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame124 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame125 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame126 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame127 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame128 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame129 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame130 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차지명</p>
      </div>
    </div>
  );
}

function Frame131() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title13 />
    </div>
  );
}

function Frame132() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame133() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame134() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame135() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame143() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame144() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame145() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame146() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame147() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame148() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame149() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame151() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame360() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame131 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame132 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame133 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame134 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame135 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame136 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame137 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame138 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame139 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame140 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame141 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame142 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame143 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame144 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame145 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame146 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame147 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame148 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame149 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame150 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame151 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차지주소</p>
      </div>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title14 />
    </div>
  );
}

function Frame153() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame154() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame155() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame156() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame157() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame160() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame161() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame162() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame163() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame164() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame165() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame166() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame167() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame168() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame169() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame170() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame171() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame172() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame361() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame152 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame153 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame154 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame155 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame156 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame157 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame158 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame159 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame160 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame161 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame162 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame163 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame164 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame165 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame166 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame167 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame168 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame169 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame170 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame171 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame172 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경유</p>
      </div>
    </div>
  );
}

function Frame173() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title15 />
    </div>
  );
}

function Frame174() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame175() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame176() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame177() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame178() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame179() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame180() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame181() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame182() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame183() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame184() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame185() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame186() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame187() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame188() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame189() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame190() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame191() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame192() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame193() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame362() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame173 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame174 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame175 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame176 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame177 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame178 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame179 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame180 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame181 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame182 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame183 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame184 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame185 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame186 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame187 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame188 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame189 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame190 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame191 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame192 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame193 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title16() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame194() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title16 />
    </div>
  );
}

function Frame195() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame196() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame197() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame198() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame199() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame200() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame201() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame202() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame203() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame204() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame205() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame206() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame207() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame208() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame209() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame210() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame211() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame212() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame213() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame214() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame364() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame194 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame195 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame196 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame197 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame198 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame199 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame200 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame201 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame202 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame203 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame204 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame205 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame206 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame207 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame208 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame209 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame210 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame211 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame212 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame213 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame214 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title17() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">왕복</p>
      </div>
    </div>
  );
}

function Frame215() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title17 />
    </div>
  );
}

function Frame216() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame217() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame218() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame219() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame220() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame221() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame222() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame223() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame224() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame225() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame226() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame227() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame228() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame229() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame230() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame231() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame232() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame233() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame234() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame235() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame363() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame215 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame216 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame217 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame218 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame219 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame220 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame221 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame222 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame223 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame224 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame225 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame226 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame227 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame228 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame229 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame230 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame231 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame232 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame233 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame234 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame235 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title18() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청 차량</p>
      </div>
    </div>
  );
}

function Frame236() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title18 />
    </div>
  );
}

function Frame237() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame238() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame239() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame240() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame241() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame242() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame243() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame244() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame245() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame246() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame247() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame248() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame249() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame250() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame251() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame252() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame253() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame254() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame255() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame256() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤, 탑</p>
      </div>
    </div>
  );
}

function Frame366() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame236 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame237 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame238 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame239 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame240 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame241 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame242 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame243 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame244 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame245 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame246 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame247 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame248 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame249 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame250 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame251 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame252 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame253 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame254 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame255 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame256 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청 차량 특성</p>
      </div>
    </div>
  );
}

function Frame257() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title19 />
    </div>
  );
}

function Frame258() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame259() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame260() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame261() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame262() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame263() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame264() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame265() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame266() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame267() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame268() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame269() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame270() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame271() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame272() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame273() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame274() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame275() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame276() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame277() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame365() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame257 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame258 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame259 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame260 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame261 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame262 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame263 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame264 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame265 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame266 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame267 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame268 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame269 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame270 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame271 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame272 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame273 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame274 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame275 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame276 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame277 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title20() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">차량번호</p>
      </div>
    </div>
  );
}

function Frame278() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title20 />
    </div>
  );
}

function Frame279() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame280() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame282() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame283() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame284() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame285() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame286() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame287() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame288() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame289() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame290() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame291() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame292() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame293() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame294() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame295() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame296() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame297() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame298() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame299() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame367() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame278 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame279 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame280 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame282 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame283 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame284 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame285 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame286 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame287 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame288 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame289 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame290 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame291 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame292 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame293 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame294 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame295 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame296 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame297 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame298 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame299 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title21() {
  const { invoiceType } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계'}</p>
      </div>
    </div>
  );
}

function Frame300() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title21 />
    </div>
  );
}

function Frame301() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame302() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame303() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame304() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame305() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame306() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame307() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame308() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame309() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame310() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame311() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame312() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame313() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame314() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame315() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame316() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame317() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame318() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame319() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame320() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame368() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame300 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame301 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame302 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame303 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame304 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame305 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame306 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame307 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame308 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame309 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame310 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame311 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame312 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame313 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame314 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame315 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame316 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame317 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame318 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame319 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame320 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title22() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">금액메모</p>
      </div>
    </div>
  );
}

function Frame321() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title22 />
    </div>
  );
}

function Frame322() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame323() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame324() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame325() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame326() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame327() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame328() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame329() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame330() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame331() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame332() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame333() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame334() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame335() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame336() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame337() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame338() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame339() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame340() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame341() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">메모 내용입니다.</p>
      </div>
    </div>
  );
}

function Frame369() {
  return (
    <div className="relative shrink-0 w-[300px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame321 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame322 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame323 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame324 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame325 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame326 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame327 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame328 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame329 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame330 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame331 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame332 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame333 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame334 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame335 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame336 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame337 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame338 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame339 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame340 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame341 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Component8({ tableRef }: { tableRef: RefObject<HTMLDivElement> }) {
  return (
    <div ref={tableRef} className="content-stretch flex flex-[1_0_0] items-start min-h-px relative w-full" data-name="통합장부표">
      <Frame357 />
      <Frame358 />
      <TableColumns />
      <TableColumns1 />
      <Frame370 />
      <Frame359 />
      <Frame360 />
      <Frame361 />
      <Frame362 />
      <Frame364 />
      <Frame363 />
      <Frame366 />
      <Frame365 />
      <Frame367 />
      <Frame368 />
      <Frame369 />
    </div>
  );
}

// ── 오더 금액 수정 모달 ─────────────────────────────────────────────────────
function AmountEditModal({
  rowIdx, orderId, originalAmount, invoiceType, onClose, onConfirm,
}: {
  rowIdx: number; orderId: string; originalAmount: number;
  invoiceType: '매출' | '매입'; onClose: () => void; onConfirm?: (newAmount: number) => void;
}) {
  const { totalAmount, groupAmounts, adjTotal, adjItems, supplyAmount, taxAmount } = useContext(DetailCtx);
  const title = invoiceType === '매입' ? '배차금액 수정' : '청구금액 수정';
  const amountLabel = invoiceType === '매입' ? '배차금액' : '청구금액';

  const [sign, setSign] = React.useState<'+' | '-'>('+');
  const [adjStr, setAdjStr] = React.useState('');
  const [afterStr, setAfterStr] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [adjFocused, setAdjFocused] = React.useState(false);
  const [afterFocused, setAfterFocused] = React.useState(false);

  const adjAmt = parseInt(adjStr.replace(/,/g, '') || '0');

  // ── 우측 패널 연산 (isValid보다 먼저 선언) ──────────────────────
  const newOrderAmount = afterStr ? parseInt(afterStr.replace(/,/g, '')) : originalAmount;
  const delta = newOrderAmount - originalAmount;
  const isChanged = delta !== 0;
  const newAmountTotal = totalAmount + delta;
  const affectedGroup = DETAIL_ROW_GROUPS[rowIdx] ?? '';
  const newGroupAmounts: Record<string, number> = Object.fromEntries(
    Object.entries(groupAmounts).map(([g, v]) =>
      [g, g === affectedGroup ? v + delta : v]
    )
  );
  const grandTotal = newAmountTotal + adjTotal;
  const newSupplyAmount = Math.floor(grandTotal / 1.1);
  const newTaxAmount = grandTotal - newSupplyAmount;

  const supplyError = isChanged && newSupplyAmount <= 0;
  const isValid = (adjAmt > 0 || afterStr.length > 0) && confirmed && !supplyError;

  // 변경 금액 입력 → 수정 후 자동 계산
  const handleAdjChange = (raw: string) => {
    const num = parseInt(raw || '0');
    setAdjStr(raw ? num.toLocaleString('ko-KR') : '');
    const newAmt = sign === '+' ? originalAmount + num : originalAmount - num;
    setAfterStr(num > 0 ? newAmt.toLocaleString('ko-KR') : '');
  };

  // 수정 후 입력 → 변경 금액·토글 역산
  const handleAfterChange = (raw: string) => {
    const afterAmt = parseInt(raw || '0');
    setAfterStr(raw ? afterAmt.toLocaleString('ko-KR') : '');
    if (!raw) {
      setAdjStr('');
      return;
    }
    const diff = afterAmt - originalAmount;
    if (diff >= 0) {
      setSign('+');
      setAdjStr(diff > 0 ? diff.toLocaleString('ko-KR') : '');
    } else {
      setSign('-');
      setAdjStr(Math.abs(diff).toLocaleString('ko-KR'));
    }
  };

  const handleSignChange = (s: '+' | '-') => {
    setSign(s);
    if (adjAmt > 0) {
      const newAmt = s === '+' ? originalAmount + adjAmt : originalAmount - adjAmt;
      setAfterStr(newAmt.toLocaleString('ko-KR'));
    }
  };
  const fmt = (n: number) => `${n.toLocaleString('ko-KR')}원`;

  const T = (fw: number, fs: number, lh: string, color: string): React.CSSProperties => ({
    fontFamily: "'Pretendard GOV', sans-serif", fontWeight: fw, fontSize: fs,
    lineHeight: lh, letterSpacing: '-0.02em', color,
  });

  const DisabledInput = ({ value }: { value: string }) => (
    <div style={{ height: 36, padding: '6px 10px', background: '#F6F7F8', border: '1px solid #E4E5E9', borderRadius: 4, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
      <span style={T(400, 15, '22px', '#767D8A')}>{value}</span>
    </div>
  );

  const Divider = () => <div style={{ height: 1, background: '#E4E5E9', alignSelf: 'stretch' }} />;

  const SRow = ({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={T(bold ? 600 : 400, 15, '22px', sub ? '#9197A1' : bold ? '#2E3238' : '#5C6370')}>{label}</span>
      <span style={T(bold ? 600 : 400, 15, '22px', sub ? '#9197A1' : bold ? '#2E3238' : '#5C6370')}>{value}</span>
    </div>
  );

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div style={{ width: 800, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* ─ 헤더 ─ */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #E4E5E9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={T(700, 22, '32px', '#000000')}>{title}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', height: 26, background: '#EBEDEF', borderRadius: 4 }}>
                <span style={T(600, 13, '19px', '#454B55')}>{orderId}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
                <path d="M16.75 0.75L0.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─ 콘텐츠 ─ */}
        <div style={{ display: 'flex' }}>

          {/* 좌측: 수정 전 / 변경 금액 / 수정 후 */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: 24, gap: 20, width: '50%', flexShrink: 0 }}>
            {/* 수정 전 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <span style={T(600, 14, '20px', '#2E3238')}>수정 전 금액</span>
              <DisabledInput value={fmt(originalAmount)} />
            </div>
            {/* 변경 금액 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <span style={T(600, 14, '20px', '#2E3238')}>수정 금액</span>
              <div style={{ display: 'flex', gap: 0, alignItems: 'center', width: '100%' }}>
                {/* +/- 토글 — 조정금액과 동일한 디자인 */}
                <div className="content-stretch flex items-center relative shrink-0">
                  <div className="bg-white h-[36px] min-w-[51px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0">
                    <button onClick={() => handleSignChange('+')} className="w-full h-full flex items-center justify-center px-[10px]">
                      <div aria-hidden className={`absolute inset-0 pointer-events-none border ${sign === '+' ? 'border-[#005fff] rounded-[4px]' : 'border-[#e3e5e9] rounded-tl-[4px] rounded-bl-[4px] border-r-0'}`} />
                      <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M6 1V11M1 6H11" stroke={sign === '+' ? '#005FFF' : '#9197A1'} strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                  <div className="bg-white h-[36px] min-w-[50px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0">
                    <button onClick={() => handleSignChange('-')} className="flex items-center justify-center size-full px-[12px]">
                      <svg width="14" height="2" fill="none" viewBox="0 0 14 2"><line stroke={sign === '-' ? '#005FFF' : '#9197A1'} strokeLinecap="round" strokeWidth="1.3" x1="0.65" x2="13.35" y1="1" y2="1"/></svg>
                    </button>
                    <div aria-hidden className={`absolute inset-0 pointer-events-none border ${sign === '-' ? 'border-[#005fff] rounded-[4px]' : 'border-[#e3e5e9] rounded-tr-[4px] rounded-br-[4px] border-l-0'}`} />
                  </div>
                </div>
                {/* 변경 금액 — focus 시 clear 아이콘 */}
                <div style={{ flex: 1, marginLeft: 8, height: 36, display: 'flex', alignItems: 'center', border: `1px solid ${adjFocused ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '0 10px', boxSizing: 'border-box', background: '#FFFFFF', gap: 0 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adjStr}
                    placeholder="0"
                    onFocus={() => setAdjFocused(true)}
                    onBlur={() => setAdjFocused(false)}
                    onChange={e => handleAdjChange(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', ...T(400, 15, '22px', '#2E3238'), padding: 0 }}
                    className="placeholder:text-[#767d8a]"
                  />
                  <span style={T(400, 15, '22px', adjStr ? '#2E3238' : '#767D8A')}>원</span>
                  {adjFocused && adjStr && (
                    <span style={{ marginLeft: 4, display: 'flex' }} onMouseDown={e => e.preventDefault()}>
                      <ClearIcon onClick={() => { setAdjStr(''); setAfterStr(''); }} />
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* 수정 후 — 편집 가능, placeholder "0원" 간격 없음 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <span style={T(600, 14, '20px', '#2E3238')}>수정 후 금액</span>
              {/* 수정 후 — focus 시 clear 아이콘 */}
              <div style={{ width: '100%', height: 36, display: 'flex', alignItems: 'center', border: `1px solid ${afterFocused ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '0 10px', boxSizing: 'border-box', background: '#FFFFFF' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={afterStr}
                  placeholder="0"
                  onFocus={() => setAfterFocused(true)}
                  onBlur={() => setAfterFocused(false)}
                  onChange={e => handleAfterChange(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', ...T(400, 15, '22px', '#2E3238'), padding: 0 }}
                  className="placeholder:text-[#767d8a]"
                />
                <span style={T(400, 15, '22px', afterStr ? '#2E3238' : '#767D8A')}>원</span>
                {afterFocused && afterStr && (
                  <span style={{ marginLeft: 4, display: 'flex' }} onMouseDown={e => e.preventDefault()}>
                    <ClearIcon onClick={() => { setAfterStr(''); setAdjStr(''); }} />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 수직 구분선 */}
          <div style={{ width: 1, background: '#E4E5E9', flexShrink: 0 }} />

          {/* 우측 요약 — 콘텐츠 높이가 모달 전체 높이를 결정 */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: 24, gap: 12, width: '50%', flexShrink: 0 }}>
            {/* 요약 카드 — 수정 시 파란색 하이라이트 */}
            <div style={{ background: '#F6F7F8', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {/* 청구/배차금액 합계 → 금액만 파란색 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={T(600, 15, '22px', '#2E3238')}>{amountLabel} 합계</span>
                <span style={T(600, 15, '22px', isChanged ? '#005FFF' : '#2E3238')}>{fmt(newAmountTotal)}</span>
              </div>
              {/* 업무그룹별 합계 → 변경된 그룹 금액만 파란색 */}
              {Object.entries(newGroupAmounts).map(([group, amt]) => {
                const groupChanged = isChanged && group === affectedGroup;
                return (
                  <div key={group} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={T(400, 15, '22px', '#5C6370')}>{group} {amountLabel}</span>
                    <span style={T(400, 15, '22px', groupChanged ? '#005FFF' : '#5C6370')}>{fmt(amt)}</span>
                  </div>
                );
              })}
              <Divider />
              {/* 조정금액 */}
              <SRow label="조정금액 합계" value={fmt(adjTotal)} bold />
              {adjItems.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <SRow label={`조정금액 ${idx + 1}`} value={`${item.sign}${fmt(item.amount)}`} />
                  {item.note && (
                    <p style={{ ...T(400, 14, '20px', '#9197A1'), margin: 0 }}>사유: {item.note}</p>
                  )}
                </React.Fragment>
              ))}
              <Divider />
              {/* 공급가액 / 세액 → 연산값으로 표시 */}
              <SRow label="공급가액" value={fmt(newSupplyAmount)} bold />
              <SRow label="세액" value={fmt(newTaxAmount)} bold />
              <Divider />
              {/* 합계 금액 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={T(600, 15, '22px', '#2E3238')}>합계 금액</span>
                <span style={T(700, 22, '32px', '#2E3238')}>{fmt(grandTotal)}</span>
              </div>
            </div>
            {/* 확인 체크박스 — 오더 리스트와 동일한 커스텀 체크박스 */}
            <div
              onClick={() => setConfirmed(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
            >
              <div
                style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: `1.3px solid ${confirmed ? '#005FFF' : '#ADB1B9'}`,
                  background: confirmed ? '#005FFF' : '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {confirmed && (
                  <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={T(400, 15, '22px', '#5C6370')}>최종 변경 금액을 확인했습니다.</span>
            </div>
          </div>
        </div>

        {/* ─ 푸터 ─ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 24px 24px', borderTop: '1px solid #E4E5E9', flexShrink: 0 }}>
          {/* 공급가액 0원 에러 메시지 */}
          {supplyError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#FEF0F0', border: '1px solid #F9C6C6', borderRadius: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" fill="#DD2222"/>
                <path d="M8 4.5V8.5M8 10.5V11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ ...T(400, 14, '20px', '#DD2222') }}>공급가액이 0원을 초과하도록 금액을 입력해 주세요.</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '0 20px', width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', ...T(600, 18, '26px', '#2E3238') }}>취소</button>
            <button
              disabled={!isValid}
              onClick={() => {
                if (!isValid) return;
                const finalAmount = afterStr
                  ? parseInt(afterStr.replace(/,/g, ''))
                  : sign === '+' ? originalAmount + adjAmt : originalAmount - adjAmt;
                onConfirm?.(finalAmount);
              }}
              style={{ padding: '0 20px', width: 102, height: 52, background: isValid ? '#005FFF' : '#CCDFFF', border: 'none', borderRadius: 4, cursor: isValid ? 'pointer' : 'not-allowed', ...T(600, 18, '26px', '#FFFFFF') }}
            >수정하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Contents() {
  const tableRef = useRef<HTMLDivElement>(null);
  const { setTotalAmount, setGroupAmounts, totalAmount, groupAmounts, excludedIndices, invoiceType, rowStatus, isEditMode } = useContext(DetailCtx);
  const amountColLabel = invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계';
  const amountLabelShort = invoiceType === '매입' ? '배차금액' : '청구금액';
  const [editingCell, setEditingCell] = React.useState<{ rowIdx: number; amount: number; orderId: string } | null>(null);
  // 수정된 금액 오버라이드 (rowIdx → 새 금액)
  const [amountOverrides, setAmountOverrides] = React.useState<Record<number, number>>({});
  // 수정 완료 토스트
  const [amendToast, setAmendToast] = React.useState<{ orderId: string } | null>(null);
  React.useEffect(() => {
    if (!amendToast) return;
    const t = setTimeout(() => setAmendToast(null), 3000);
    return () => clearTimeout(t);
  }, [amendToast]);

  useEffect(() => {
    if (!tableRef.current) return;
    let total = 0;
    const grp: Record<string, number> = {};
    // 먼저 각 행의 청구금액을 파악 (첫 번째 패스)
    const rowAmounts: number[] = Array(DETAIL_ROWS).fill(0);
    tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
      const cells = Array.from(col.querySelectorAll<HTMLElement>('[data-name="Table_Data Cells"]'));
      if (!cells.length) return;
      const parent = cells[0].parentElement!;
      const header = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim() ?? '';
      const COL_MAP: Record<string, (i: number) => string> = {
        '오더ID':      i => ORDER_IDS[i],
        '화주사 업무그룹': i => DETAIL_ROW_GROUPS[i],
        '화주사':          i => DETAIL_ROW_SHIPPERS[i],
        '상차일':      i => DETAIL_ROW_DATA[i].loadDate,
        '하차일':      i => DETAIL_ROW_DATA[i].unloadDate,
        '상차지명':    i => DETAIL_ROW_DATA[i].loadName,
        '상차지주소':  i => DETAIL_ROW_DATA[i].loadAddr,
        '하차지명':    i => DETAIL_ROW_DATA[i].unloadName,
        '하차지주소':  i => DETAIL_ROW_DATA[i].unloadAddr,
        '경유':        i => DETAIL_ROW_DATA[i].via,
        '독차':        i => DETAIL_ROW_DATA[i].solo,
        '왕복':        i => DETAIL_ROW_DATA[i].trip,
        '요청 차량':   i => DETAIL_ROW_DATA[i].vehicle,
        '요청 차량 특성': i => DETAIL_ROW_DATA[i].vchar,
        '차량번호':    i => String(DETAIL_ROW_DATA[i].plate),
        [amountColLabel]: i => (amountOverrides[i] ?? DETAIL_ROW_DATA[i].amount).toLocaleString(),
        '금액메모':    i => DETAIL_ROW_DATA[i].memo,
      };
      const isAmountCol = header === amountColLabel;
      const colFn = COL_MAP[header];
      cells.forEach((c) => parent.removeChild(c));
      let tplIdx = 0;
      for (let i = 0; i < DETAIL_ROWS; i++) {
        if (excludedIndices.has(i)) continue;
        const cell = cells[tplIdx % cells.length].cloneNode(true) as HTMLElement;
        cell.dataset.tableRow = String(i);
        if (colFn) {
          const p = cell.querySelector('p');
          if (p) p.textContent = colFn(i);
        }
        if (isAmountCol) {
          const cellAmount = amountOverrides[i] ?? DETAIL_ROW_DATA[i].amount;
          rowAmounts[i] = cellAmount;
          total += cellAmount;

          // 수정 발행 모드: 금액 텍스트 옆에 수정 버튼 추가
          if (isEditMode) {
            const amountText = (amountOverrides[i] ?? DETAIL_ROW_DATA[i].amount).toLocaleString();

            // 셀 내부 초기화 후 border-bottom 복원
            while (cell.firstChild) cell.removeChild(cell.firstChild);
            Object.assign(cell.style, {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 8px',
              gap: '6px',
              boxSizing: 'border-box',
              borderBottom: '1px solid #E4E5E9',
            });

            // 금액 텍스트
            const textEl = document.createElement('span');
            Object.assign(textEl.style, {
              fontFamily: "'Pretendard GOV', sans-serif",
              fontWeight: '400',
              fontSize: '15px',
              lineHeight: '22px',
              letterSpacing: '-0.02em',
              color: '#2E3238',
              flex: '1',
              minWidth: '0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            });
            textEl.textContent = amountText;
            cell.appendChild(textEl);

            // 수정 버튼 (40×26, white border, 14SB)
            const editBtn = document.createElement('button');
            editBtn.dataset.editBtn = 'true';
            Object.assign(editBtn.style, {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0px 8px',
              width: '40px',
              height: '26px',
              minWidth: '40px',
              background: '#FFFFFF',
              border: '1px solid #E4E5E9',
              borderRadius: '2px',
              cursor: 'pointer',
              flexShrink: '0',
              fontFamily: "'Pretendard GOV', sans-serif",
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#2E3238',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            });
            editBtn.textContent = '수정';
            editBtn.addEventListener('click', () => {
              setEditingCell({ rowIdx: i, amount: DETAIL_ROW_DATA[i].amount, orderId: ORDER_IDS[i] });
            });
            cell.appendChild(editBtn);
          }
        }
        parent.appendChild(cell);
        tplIdx++;
      }
    });
    // 그룹별 금액 집계 (제외된 행 스킵)
    for (let i = 0; i < DETAIL_ROWS; i++) {
      if (excludedIndices.has(i)) continue;
      const g = DETAIL_ROW_GROUPS[i];
      grp[g] = (grp[g] ?? 0) + rowAmounts[i];
    }
    setTotalAmount(total);
    setGroupAmounts(grp);

    // Row hover effect
    const el = tableRef.current!;
    let hoveredRow: string | null = null;
    const over = (e: Event) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-table-row]');
      const newRow = cell?.dataset.tableRow ?? null;
      if (newRow !== hoveredRow) {
        if (hoveredRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${hoveredRow}"]`).forEach(c => { c.style.backgroundColor = ''; });
        }
        if (newRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${newRow}"]`).forEach(c => { c.style.backgroundColor = 'rgba(246, 247, 248, 0.5)'; });
        }
        hoveredRow = newRow;
      }
    };
    const out = (e: Event) => {
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (!relatedTarget || !el.contains(relatedTarget)) {
        if (hoveredRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${hoveredRow}"]`).forEach(c => { c.style.backgroundColor = ''; });
          hoveredRow = null;
        }
      }
    };
    el.addEventListener('mouseover', over);
    el.addEventListener('mouseout', out);
    return () => { el.removeEventListener('mouseover', over); el.removeEventListener('mouseout', out); };
  }, [excludedIndices, isEditMode, amountOverrides]);

  return (
    /* Contents: padding 0 32px, flex-col */
    <div
      className="flex-[1_0_0] min-h-px relative w-full overflow-hidden"
      data-name="Contents"
      style={{ display: 'flex', flexDirection: 'column', padding: '0px 32px', boxSizing: 'border-box' }}
    >
      {/* Frame 1707482668: 헤더 정보 영역 */}
      <Frame378 />

      {/* Frame 1707482667: 테이블 영역 */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '1167px', flex: 1, minHeight: 0 }}>

        {/* Table_Control_Module: 항상 표시, 확정대기만 오더 추가/제외 표시 */}
        <div style={{
          display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', padding: '0px 0px 8px 0px', width: '1167px', height: 44, flexShrink: 0,
        }}>
          {/* 좌측: 오더 추가, 오더 제외 — 확정대기만 */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {rowStatus === '확정대기' && (
              <>
                <AddOrderBtn />
                <ExcludeOrderBtn />
              </>
            )}
          </div>
          {/* 우측: 엑셀 저장 — 항상 */}
          <ExcelSaveBtn />
        </div>

        {/* 테이블 본체 */}
        <div className="overflow-x-auto flex-1" style={{ minHeight: 0 }}>
          <Component8 tableRef={tableRef} />
        </div>
      </div>
      {/* 금액 수정 모달 */}
      {editingCell && (
        <AmountEditModal
          rowIdx={editingCell.rowIdx}
          orderId={editingCell.orderId}
          originalAmount={editingCell.amount}
          invoiceType={invoiceType}
          onClose={() => setEditingCell(null)}
          onConfirm={(newAmount) => {
            const delta = newAmount - editingCell.amount;
            // 셀 금액 업데이트
            setAmountOverrides(prev => ({ ...prev, [editingCell.rowIdx]: newAmount }));
            // 우측 패널 합계 업데이트
            setTotalAmount(totalAmount + delta);
            const affGroup = DETAIL_ROW_GROUPS[editingCell.rowIdx] ?? '';
            const updatedGroups = { ...groupAmounts };
            if (affGroup && updatedGroups[affGroup] !== undefined) {
              updatedGroups[affGroup] += delta;
            }
            setGroupAmounts(updatedGroups);
            // 토스트 + 모달 닫기
            setAmendToast({ orderId: editingCell.orderId });
            setEditingCell(null);
          }}
        />
      )}
      {/* 수정 완료 토스트 */}
      {amendToast && createPortal(
        <div style={{ position: 'fixed', bottom: 34, right: 34, minWidth: 320, height: 54, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 999999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', background: '#222222', fontFamily: "'Pretendard GOV', sans-serif", gap: 8, animation: 'toast-slide-in-save 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>
            오더 {amendToast.orderId}의 {amountLabelShort}을 수정했습니다.
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}

/** 오더 추가 버튼 */
function AddOrderBtn() {
  const { setAddOrderOpen } = useContext(DetailCtx);
  return (
    <button
      onClick={() => setAddOrderOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 79, height: 36, background: '#FFFFFF',
        border: '1px solid #E4E5E9', borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15,
        lineHeight: '22px', letterSpacing: '-0.02em', color: '#2E3238',
        flexShrink: 0,
      }}
    >오더 추가</button>
  );
}

/** 오더 제외 버튼 */
function ExcludeOrderBtn() {
  const { setExcludeModalOpen } = useContext(DetailCtx);
  return (
    <button
      onClick={() => setExcludeModalOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 79, height: 36, background: '#FFFFFF',
        border: '1px solid #E4E5E9', borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15,
        lineHeight: '22px', letterSpacing: '-0.02em', color: '#2E3238',
        flexShrink: 0,
      }}
    >오더 제외</button>
  );
}

/** 엑셀 저장 버튼 */
function ExcelSaveBtn() {
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        width: 99, height: 36, background: 'transparent',
        border: 'none', borderRadius: 4, cursor: 'pointer',
        fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 15,
        lineHeight: '22px', letterSpacing: '-0.02em', color: '#2E3238',
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 10.5L4.5 7H7V2H9V7H11.5L8 10.5ZM3 13V11.5H13V13H3Z" fill="#9197A1"/>
      </svg>
      엑셀 저장
    </button>
  );
}

function TypeStatusDisabled4() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">200개씩 보기</p>
          </div>
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_down">
            <div className="flex items-center justify-center relative shrink-0">
              <div className="-scale-y-100 flex-none">
                <div className="h-[4px] relative w-[10px]" data-name="arr">
                  <div className="absolute inset-[-17.5%_-7%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                      <path d={svgPaths.p609440} id="arr" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCount() {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center right-[24px] top-[12px]" data-name="Page_count">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px]">1,000건 중 1-200건</p>
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[123px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled4 />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="icon">
          <g id="size guide layer" />
          <path d="M10 3L5 8L10 13" id="Vector 367" stroke="var(--stroke-0, #C7CBD1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="icon">
          <g id="size guide layer" />
          <path d="M6 13L11 8L6 3" id="Vector 367" stroke="var(--stroke-0, #2E3238)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}

function PaginationList() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[8px] items-center justify-center left-1/2 p-[2px] top-[12px]" data-name="pagination_list">
      <div className="bg-[#f6f7f8] content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">1</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">2</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">3</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">4</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">5</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">6</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">7</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="relative shrink-0 size-[16px]" data-name="Icon_16/ellipsis_horizontal">
          <div className="absolute flex h-[2px] items-center justify-center left-[3px] top-[7px] w-[10px]">
            <div className="flex-none rotate-180">
              <div className="h-[2px] relative w-[10px]" data-name="Union">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 2">
                  <g id="Union">
                    <path d={svgPaths.p21cdb200} fill="var(--fill-0, #2E3238)" />
                    <path d={svgPaths.p35e70110} fill="var(--fill-0, #2E3238)" />
                    <path d={svgPaths.p79f9a80} fill="var(--fill-0, #2E3238)" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[15px] text-center tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">13</p>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_left">
          <Icon1 />
        </div>
      </div>
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]" data-name="pagination_btn">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_right">
          <Icon2 />
        </div>
      </div>
    </div>
  );
}

function Frame374() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-px relative">
      <Contents />
      <div className="bg-white h-[64px] relative shrink-0 w-full" data-name="pagination">
        <div className="overflow-clip relative rounded-[inherit] size-full">
          <PageCount />
          <PaginationList />
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-solid border-t inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

type MemoMsg = { sender: string; text: string; time: string };
const MEMO_CONVERSATIONS: MemoMsg[][] = [
  [
    { sender: '최담당:', text: '이번 정산기간 청구금액 확인 부탁드립니다.', time: '26.05.07 09:12' },
    { sender: '김담당:', text: '확인했습니다. 오더 3건 누락된 것 같은데 재확인해 주세요.', time: '26.05.07 09:45' },
    { sender: '최담당:', text: '확인 후 수정 완료했습니다. 다시 검토 부탁드려요.', time: '26.05.07 10:03' },
  ],
  [
    { sender: '박담당:', text: '조정금액 2만원 추가 반영했습니다.', time: '26.05.08 14:20' },
    { sender: '이담당:', text: '네, 확인됩니다. 세액도 같이 업데이트해 주세요.', time: '26.05.08 14:35' },
  ],
  [
    { sender: '김담당:', text: '거래명세서 확정 전에 합계금액 한 번 더 검토해 주세요.', time: '26.05.09 11:00' },
    { sender: '최담당:', text: '공급가액이 청구금액 + 조정금액이 맞나요?', time: '26.05.09 11:08' },
    { sender: '김담당:', text: '네 맞습니다. 확정 처리했습니다.', time: '26.05.09 11:15' },
    { sender: '최담당:', text: '수금기한 확인 부탁드립니다. 이번 달 말일로 설정됐나요?', time: '26.05.09 11:22' },
  ],
  [
    { sender: '이담당:', text: '세금계산서 발행 요청드립니다.', time: '26.05.11 16:00' },
    { sender: '박담당:', text: '계산서 작성일자 언제로 할까요?', time: '26.05.11 16:10' },
    { sender: '이담당:', text: '오늘 날짜로 해주세요.', time: '26.05.11 16:12' },
  ],
  [
    { sender: '최담당:', text: '이번 거래명세서 오더 수 총 5건 맞나요?', time: '26.05.12 09:30' },
    { sender: '김담당:', text: '4건입니다. 1건은 취소됐습니다.', time: '26.05.12 09:41' },
    { sender: '최담당:', text: '알겠습니다. 취소 오더 제외하고 다시 계산했습니다.', time: '26.05.12 09:55' },
  ],
  [
    { sender: '박담당:', text: '청구금액 합계가 지난 달보다 많이 올랐네요.', time: '26.05.13 13:00' },
    { sender: '이담당:', text: '특별배송 오더가 추가됐습니다. 단가 차이가 있어요.', time: '26.05.13 13:08' },
  ],
  [
    { sender: '김담당:', text: '정산기간 마감일 지났는데 아직 확정 안 됐습니다.', time: '26.05.15 10:00' },
    { sender: '최담당:', text: '지금 바로 확정 처리하겠습니다.', time: '26.05.15 10:05' },
    { sender: '김담당:', text: '감사합니다. 계산서 발행도 함께 진행해 주세요.', time: '26.05.15 10:07' },
  ],
  [
    { sender: '이담당:', text: '조정금액 마이너스 처리 건 있습니다. 확인 부탁드려요.', time: '26.05.16 15:30' },
    { sender: '박담당:', text: '어떤 오더인가요? 오더ID 알려주시면 확인하겠습니다.', time: '26.05.16 15:45' },
    { sender: '이담당:', text: '상차지 변경으로 인한 거리 조정입니다.', time: '26.05.16 15:50' },
    { sender: '박담당:', text: '반영 완료했습니다. 합계금액 확인해 주세요.', time: '26.05.16 16:00' },
  ],
  [
    { sender: '최담당:', text: '수금 완료됐습니다. 확인 부탁드립니다.', time: '26.05.18 11:00' },
    { sender: '김담당:', text: '네 수금 확인됩니다. 상태 업데이트했습니다.', time: '26.05.18 11:10' },
  ],
  [
    { sender: '박담당:', text: '이번 명세서 오더별 단가 리스트 공유 가능할까요?', time: '26.05.20 09:00' },
    { sender: '이담당:', text: '금액메모란에 정리해 두었습니다. 확인해 주세요.', time: '26.05.20 09:15' },
    { sender: '박담당:', text: '확인했습니다. 세액 계산 다시 한 번 검토해 주세요.', time: '26.05.20 09:30' },
  ],
];

function MemoRow({ msg }: { msg: MemoMsg }) {
  const isLong = msg.text.length > 18;
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:Regular'] items-start leading-[0] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full" style={{ justifyContent: isLong ? undefined : 'space-between', gap: isLong ? 12 : undefined }}>
      <div className={`content-stretch flex gap-[4px] items-start relative shrink-0 text-[#2e3238]${isLong ? ' flex-1 min-w-0' : ' w-[226px]'}`}>
        <div className="flex flex-col justify-center relative shrink-0 w-[50px]">
          <p className="leading-[22px]">{msg.sender}</p>
        </div>
        <div className={`flex flex-col justify-center relative${isLong ? ' flex-1 min-w-0' : ' shrink-0 whitespace-nowrap'}`}>
          <p className="leading-[22px]">{msg.text}</p>
        </div>
      </div>
      <div className="flex flex-col justify-center relative shrink-0 text-[#9197a1] w-[100px]">
        <p className="leading-[22px]">{msg.time}</p>
      </div>
    </div>
  );
}

function Frame376() {
  const { invoiceId } = useContext(DetailCtx);
  const hash = invoiceId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const initial = MEMO_CONVERSATIONS[hash % MEMO_CONVERSATIONS.length];
  const [msgs, setMsgs] = useState<MemoMsg[]>(initial);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const now = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yy}.${mm}.${dd} ${hh}:${mi}`;
  };

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setMsgs(prev => [...prev, { sender: '나:', text, time: now() }]);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const canSubmit = input.trim().length > 0;

  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-h-px relative rounded-[8px] w-full">
      {/* 스크롤 메모 영역 */}
      <div ref={scrollRef} className="flex-[1_0_0] min-h-px overflow-y-auto w-full" style={{ scrollbarWidth: 'thin', scrollbarColor: '#767D8A transparent' }}>
        <div className="flex flex-col gap-[8px] items-start w-full" data-name="메모">
          {msgs.map((msg, i) => <MemoRow key={i} msg={msg} />)}
        </div>
      </div>

      {/* 입력창 */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 8, width: '100%', height: 36 }}>
        {/* 텍스트 입력 */}
        <div className="group bg-white relative rounded-[4px] shrink-0" style={{ flex: 1, minWidth: 0, height: 36 }}>
          <div aria-hidden className="absolute border inset-0 pointer-events-none rounded-[4px] transition-colors border-[#e3e5e9] group-hover:border-[#adb1b9] group-focus-within:border-[#005fff]" />
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="전달할 메모를 입력해 주세요"
              className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Regular'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px] bg-transparent border-none outline-none placeholder:text-[#767d8a]"
            />
            {input && <ClearIcon onClick={() => setInput('')} />}
          </div>
        </div>

        {/* 등록 버튼 */}
        <button
          onClick={submit}
          disabled={!canSubmit}
          onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = '#F6F7F8'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            width: 50,
            height: 36,
            background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            borderRadius: 4,
            cursor: canSubmit ? 'pointer' : 'default',
            fontFamily: "'Pretendard GOV', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: canSubmit ? '#2E3238' : '#C4C7CC',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          등록
        </button>
      </div>
    </div>
  );
}

function Contents1() {
  return (
    <div className="content-stretch flex flex-col h-[300px] items-center overflow-clip p-[32px] relative shrink-0 w-[480px]" data-name="Contents">
      <Frame376 />
    </div>
  );
}

function fmt(n: number) { return n.toLocaleString() + '원'; }

function Input02Selectbox10() {
  const { totalAmount, invoiceType } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0 text-[#5c6370]">{invoiceType === '매입' ? '배차금액 합계' : '청구금액 합계'}</p>
      <p className="relative shrink-0 text-[#2e3238]">{fmt(totalAmount)}</p>
    </div>
  );
}

function Input02Selectbox11() {
  const { totalAmount, shipperGroup } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0">{shipperGroup} 청구금액</p>
      <p className="relative shrink-0">{fmt(totalAmount)}</p>
    </div>
  );
}

function Input02Selectbox12() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0">화주사 업무그룹 2 청구금액</p>
      <p className="relative shrink-0">0원</p>
    </div>
  );
}

function Input02Selectbox13() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0">화주사 업무그룹 3 청구금액</p>
      <p className="relative shrink-0">0원</p>
    </div>
  );
}

function Input02Selectbox14() {
  const { adjTotal } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0 text-[#5c6370]">조정금액 합계</p>
      <p className="relative shrink-0 text-[#2e3238]">{adjTotal >= 0 ? '' : '-'}{fmt(Math.abs(adjTotal))}</p>
    </div>
  );
}

function Input02Selectbox15() {
  const { supplyAmount } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0 text-[#5c6370]">공급가액</p>
      <p className="relative shrink-0 text-[#2e3238]">{fmt(supplyAmount)}</p>
    </div>
  );
}

function Input02Selectbox16() {
  const { taxAmount } = useContext(DetailCtx);
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="relative shrink-0 text-[#5c6370]">세액</p>
      <p className="relative shrink-0 text-[#2e3238]">{fmt(taxAmount)}</p>
    </div>
  );
}

function Input02Selectbox17() {
  const { totalAmount, adjTotal } = useContext(DetailCtx);
  const finalAmount = totalAmount + adjTotal;
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap" data-name="Input / 02. Selectbox">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">합계 금액</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[32px] relative shrink-0 text-[#2e3238] text-[22px] tracking-[-0.44px]">{fmt(finalAmount)}</p>
    </div>
  );
}

function Frame373() {
  const { groupAmounts, adjItems, setAdjItems, invoiceType, rowStatus, isEditMode } = useContext(DetailCtx);
  const groups = invoiceType === '매입' ? [] : Object.entries(groupAmounts).filter(([, amt]) => amt > 0);
  return (
    <div className="bg-[#f6f7f8] relative rounded-[8px] shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
        <Input02Selectbox10 />
        {groups.map(([group, amt]) => (
          <div key={group} className="[word-break:break-word] content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
            <p className="relative shrink-0">{group} 청구금액</p>
            <p className="relative shrink-0">{fmt(amt)}</p>
          </div>
        ))}
        <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
        <Input02Selectbox14 />
        {adjItems.map((item, idx) => (
          <AdjustmentItem key={item.id} item={item} index={idx}
            onChange={u => setAdjItems((prev: AdjItem[]) => prev.map(it => it.id === item.id ? u : it))}
            onRemove={() => setAdjItems((prev: AdjItem[]) => prev.filter(it => it.id !== item.id))}
          />
        ))}
        {/* 확정대기 또는 세금계산서 수정 발행 모드에서만 노출 */}
        {adjItems.length < 10 && (rowStatus === '확정대기' || isEditMode) && (
          <button
            onClick={() => setAdjItems((prev: AdjItem[]) => [...prev, { id: Date.now(), amount: 0, sign: '+', note: '' }])}
            className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full cursor-pointer hover:bg-[#f6f7f8] transition-colors"
          >
            <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
              <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                조정금액 추가하기 ({adjItems.length}/10)
              </p>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </button>
        )}
        <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
        <Input02Selectbox15 />
        <Input02Selectbox16 />
        <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
        <Input02Selectbox17 />
      </div>
    </div>
  );
}

function Contents2() {
  return (
    <div className="flex-[1_0_0] min-h-px relative w-[480px]" data-name="Contents">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center p-[32px] relative size-full">
          <Frame373 />
        </div>
      </div>
    </div>
  );
}

function Frame379() {
  return (
    <div className="content-stretch flex flex-col h-full items-start justify-center relative shrink-0">
      <Contents1 />
      <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
      <Contents2 />
    </div>
  );
}

function Frame375() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-h-px relative w-full">
      <Frame374 />
      <div className="flex h-full items-center justify-center relative shrink-0 w-px" style={{ containerType: "size" }}>
        <div className="flex-none rotate-90 w-[100cqh]">
          <div className="bg-[#e3e5e9] h-px relative w-full" />
        </div>
      </div>
      <Frame379 />
    </div>
  );
}

function EditModeBanner() {
  const { invoiceType } = useContext(DetailCtx);
  const amountLabel = invoiceType === '매입' ? '배차금액' : '청구금액';
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        padding: '12px 32px', gap: 4,
        width: 1712, height: 44,
        background: '#F5F9FF', flexShrink: 0,
      }}
      data-name="Banner"
    >
      {/* Icon_16/Info_mark - blue */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6.35" stroke="#005FFF" strokeWidth="1.3"/>
        <line x1="8" y1="7" x2="8" y2="11" stroke="#005FFF" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="8" cy="5" r="0.7" fill="#005FFF"/>
      </svg>
      {/* 안내 텍스트 */}
      <p style={{
        fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 14,
        lineHeight: '20px', letterSpacing: '-0.02em', color: '#005FFF',
        flexShrink: 0,
      }}>
        세금계산서 수정 발행 중입니다. {amountLabel}과 조정금액을 수정할 수 있습니다.
      </p>
    </div>
  );
}

function Right() {
  const { isEditMode } = useContext(DetailCtx);
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-[1180px] relative" data-name="right">
      <div className="content-stretch flex items-start justify-center relative shrink-0 w-[1712px]" data-name="Page_Top_Component">
        <div className="bg-white content-stretch flex h-[82px] items-center px-[32px] relative shrink-0 w-[1712px]" data-name>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <Frame355 />
        </div>
      </div>
      <Component7 />
      {/* 수정 발행 모드 배너 */}
      {isEditMode && <EditModeBanner />}
      <Frame375 />
    </div>
  );
}

function Ui() {
  const { onClose, invoiceType } = useContext(DetailCtx);
  return (
    <div className="absolute bg-white content-stretch flex inset-0 items-start overflow-clip" data-name="통합장부 / UI">
      <SharedLnb activeTabIndex={invoiceType === '매입' ? 4 : 3} onBeforeNavigate={onClose} />
      <Right />
    </div>
  );
}

export default function Component10({ invoiceId, rowStatus, invoiceType = '매출', shipper, shipperGroup, period, onClose, onStatusChange }: {
  invoiceId: string; rowStatus: string; invoiceType?: '매출' | '매입';
  shipper: string; shipperGroup: string; period: string;
  onClose: () => void;
  onStatusChange?: (newStatus: string) => void;
}) {
  const [totalAmount, setTotalAmount] = useState(0);
  const [groupAmounts, setGroupAmounts] = useState<Record<string, number>>({});
  const [adjItems, setAdjItems] = useState<AdjItem[]>([]);
  const [currentStatus, setCurrentStatus] = useState(rowStatus);
  const currentStatusRef = React.useRef(currentStatus);
  React.useEffect(() => { currentStatusRef.current = currentStatus; }, [currentStatus]);
  const handleClose = () => {
    if (onStatusChange && currentStatusRef.current !== rowStatus) {
      onStatusChange(currentStatusRef.current);
    }
    onClose();
  };
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [taxInvoiceOpen, setTaxInvoiceOpen] = useState(false);
  const [showTaxToast, setShowTaxToast] = useState(false);
  const [confirmInvoiceOpen, setConfirmInvoiceOpen] = useState(false);
  const [showConfirmToast, setShowConfirmToast] = useState(false);
  const [excludeModalOpen, setExcludeModalOpen] = useState(false);
  const [showExcludeToast, setShowExcludeToast] = useState(false);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [addedOrders, setAddedOrders] = useState<Set<string>>(new Set());
  const [showAddOrderToast, setShowAddOrderToast] = useState(false);
  const [addedOrderCount, setAddedOrderCount] = useState(0);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showSaveErrorToast, setShowSaveErrorToast] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const adjTotal = adjItems.reduce((s, it) => s + (it.sign === '+' ? it.amount : -it.amount), 0);
  useEffect(() => {
    if (!showAddOrderToast) return;
    const t = setTimeout(() => setShowAddOrderToast(false), 4000);
    return () => clearTimeout(t);
  }, [showAddOrderToast]);
  useEffect(() => {
    if (!showSaveToast) return;
    const t = setTimeout(() => setShowSaveToast(false), 4000);
    return () => clearTimeout(t);
  }, [showSaveToast]);
  useEffect(() => {
    if (!showSaveErrorToast) return;
    const t = setTimeout(() => setShowSaveErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [showSaveErrorToast]);
  const finalAmount = totalAmount + adjTotal;
  const supplyAmount = Math.round(finalAmount / 1.1);
  const taxAmount = finalAmount - supplyAmount;
  return (
    <DetailCtx.Provider value={{ invoiceId, rowStatus: currentStatus, invoiceType, shipper, shipperGroup, period, onClose: handleClose, totalAmount, supplyAmount, taxAmount, adjTotal, setTotalAmount, groupAmounts, setGroupAmounts, adjItems, setAdjItems: setAdjItems as (fn: AdjItem[] | ((p: AdjItem[]) => AdjItem[])) => void, setCurrentStatus, addOrderOpen, setAddOrderOpen, taxInvoiceOpen, setTaxInvoiceOpen, showTaxToast, setShowTaxToast, confirmInvoiceOpen, setConfirmInvoiceOpen, showConfirmToast, setShowConfirmToast, excludeModalOpen, setExcludeModalOpen, showExcludeToast, setShowExcludeToast, excludedIndices, setExcludedIndices, addedOrders, setAddedOrders: setAddedOrders as (fn: Set<string> | ((p: Set<string>) => Set<string>)) => void, showAddOrderToast, setShowAddOrderToast, addedOrderCount, setAddedOrderCount, showSaveToast, setShowSaveToast, showSaveErrorToast, setShowSaveErrorToast, isEditMode, setIsEditMode }}>
      <div className="bg-white relative size-full" data-name="3.1.5 매출 거래명세서_화주사 - 매출 거래명세서 상세(확정대기)">
        <Ui />
      </div>
      {addOrderOpen && <AddOrderModal />}
      {taxInvoiceOpen && <TaxInvoiceModal />}
      {showTaxToast && <TaxToast onClose={() => setShowTaxToast(false)} />}
      {confirmInvoiceOpen && <ConfirmInvoiceModal />}
      {excludeModalOpen && <ExcludeModal />}
      {showConfirmToast && <ConfirmToast onClose={() => setShowConfirmToast(false)} />}
      {showExcludeToast && <ExcludeToast onClose={() => setShowExcludeToast(false)} />}
      {showSaveToast && createPortal(<>
        <style>{`@keyframes toast-slide-in-save { from { transform: translateX(calc(100% + 34px)); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div style={{ position:'fixed', bottom:34, right:34, width:400, height:54, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', zIndex:99999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', background:'#222222', animation:'toast-slide-in-save 0.25s cubic-bezier(0.34,1.56,0.64,1) both', fontFamily:"'Pretendard GOV', sans-serif" }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>거래명세서를 수정했습니다.</span>
          <button onClick={() => setShowSaveToast(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/><path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </>, document.body)}
      {showSaveErrorToast && createPortal(<>
        <style>{`@keyframes toast-slide-in-save-err { from { transform: translateX(calc(100% + 34px)); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div style={{ position:'fixed', bottom:34, right:34, width:400, height:54, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', gap:16, zIndex:99999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', background:'#E13838', animation:'toast-slide-in-save-err 0.25s cubic-bezier(0.34,1.56,0.64,1) both', fontFamily:"'Pretendard GOV', sans-serif" }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>공급가액이 0원을 초과하도록 금액을 입력해 주세요.</span>
          <button onClick={() => setShowSaveErrorToast(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/><path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </>, document.body)}
      {showAddOrderToast && createPortal(<>
        <style>{`@keyframes toast-slide-in-add { from { transform: translateX(calc(100% + 34px)); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div style={{ position:'fixed', bottom:34, right:34, width:400, height:54, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', zIndex:99999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', background:'#222222', animation:'toast-slide-in-add 0.25s cubic-bezier(0.34,1.56,0.64,1) both', fontFamily:"'Pretendard GOV', sans-serif" }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>거래명세서에 오더가 추가되었습니다.</span>
          <button onClick={() => setShowAddOrderToast(false)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/><path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </>, document.body)}
    </DetailCtx.Provider>
  );
}