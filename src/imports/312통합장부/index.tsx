import React, { useState, createContext, useContext, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import svgPaths from "./svg-3fbcisli1b";
import ORDER_IDS from "../shared/orderIds";
import SharedLnb from "../shared/SharedLnb";
import { getCancelledOrders, subscribeCancelledOrders, CancelledOrderEntry } from "../shared/cancelledOrdersStore";

// ─── 매출/매입 상태 대시보드 필터 + 테이블 필터링 ──────────────────────────

// 매입 필터는 "수금" 용어를 쓰지만 테이블 배지는 "지급" 용어를 쓰는 경우 대응
const STATUS_ALIASES: Record<string, string[]> = {
  "수금대기": ["수금대기", "지급대기"],
  "수금완료": ["수금완료", "지급완료"],
};

const SALE_ROW_STATUSES = ["마감필요","정산대기","정산대기","정산대기","정산대기","정산대기","수금대기","수금대기","수금완료","수금완료","정산보류"];
const PURCHASE_ROW_STATUSES = ["마감필요","정산대기","정산대기","정산대기","지급대기","지급대기","지급대기","지급대기","지급완료","정산보류"];

interface FilterCtxType { selected: Set<number>; setSelected: (s: Set<number>) => void; }
const DEFAULT_CTX: FilterCtxType = { selected: new Set([0]), setSelected: () => {} };
const SaleFilterCtx = createContext<FilterCtxType>(DEFAULT_CTX);
const PurchaseFilterCtx = createContext<FilterCtxType>(DEFAULT_CTX);

interface DateFilterCtxType { dateType: string; rangeStart: Date|null; rangeEnd: Date|null; periodRange: string; setDateType: (t: string) => void; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; setPeriodRange: (t: string) => void; }
const DateFilterCtx = createContext<DateFilterCtxType>({ dateType:'상차일', rangeStart:null, rangeEnd:null, periodRange:'오늘', setDateType:()=>{}, setRangeStart:()=>{}, setRangeEnd:()=>{}, setPeriodRange:()=>{} });

const SEARCH_TYPE_OPTIONS_312 = ['차량번호', '기사명', '사업자명', '화주사 별칭', '요청협력사 별칭', '화주주문번호', '오더ID'] as const;
interface SearchCtxType312 { searchType: string; searchText: string; appliedSearch: { type: string; text: string } | null; setSearchType: (t: string) => void; setSearchText: (t: string) => void; runSearch: () => void; clearSearch: () => void; }
const SearchCtx312 = createContext<SearchCtxType312>({ searchType: '차량번호', searchText: '', appliedSearch: null, setSearchType: () => {}, setSearchText: () => {}, runSearch: () => {}, clearSearch: () => {} });


const PageCtx312 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });

interface BubbleCtxType {
  shipperSelected: Set<number>;
  setShipperSelected: (s: Set<number>) => void;
  partnerSelected: Set<number>;
  setPartnerSelected: (s: Set<number>) => void;
  dispatchSelected: Set<number>;
  setDispatchSelected: (s: Set<number>) => void;
}
const BubbleCtx = createContext<BubbleCtxType>({
  shipperSelected: new Set(), setShipperSelected: () => {},
  partnerSelected: new Set(), setPartnerSelected: () => {},
  dispatchSelected: new Set(), setDispatchSelected: () => {},
});

const DynamicCountCtx = createContext<{ saleCounts: number[]; purchaseCounts: number[]; saleTotalAmount: number; purchaseTotalAmount: number; selfInsuranceSum: number }>({
  saleCounts: [], purchaseCounts: [], saleTotalAmount: 10_000_000, purchaseTotalAmount: 5_000_000, selfInsuranceSum: 100_000,
});

// Per-row amounts derived from SALE_STATUS_DATA and PURCHASE_STATUS_DATA original counts
const PER_ROW_SALE_AMOUNT: Record<string, number> = {
  '마감필요': 0,
  '정산대기': Math.round(2_273_000 / 2273),
  '수금대기': Math.round(3_000_000 / 909),
  '수금완료': Math.round(5_000_000 / 909),
  '정산보류': Math.round(454_000 / 454),
};
const PER_ROW_PURCHASE_AMOUNT: Record<string, number> = {
  '마감필요': 0,
  '정산대기': Math.round(1_500_000 / 1500),
  '지급대기': Math.round(2_000_000 / 2000),
  '지급완료': Math.round(500_000 / 500),
  '정산보류': Math.round(500_000 / 500),
};

const SHIPPERS = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];
const SHIPPER_GROUPS_312: Record<string, string[]> = {
  '(주)글로벌로지스': ['기본그룹', 'A그룹', 'B그룹'],
  '(주)케이로지스틱스': ['기본그룹', '수도권팀', '지방팀'],
  '(주)판교물류솔루션': ['기본그룹', '판교팀'],
  '(주)수원익스프레스': ['기본그룹', '수원팀'],
  '(주)동탄스마트물류': ['기본그룹', '동탄팀', 'C그룹'],
};

const PARTNERS = [
  '카모로지스틱스', '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스',
  '(주)동탄스마트물류', '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스',
  '(주)현대글로비스파트너', '(주)CJ물류파트너', '(주)한진로지스틱스', '(주)쿠팡파트너스', '(주)네이버물류',
  '(주)GS물류', '(주)우체국물류지원', '(주)일양로지스', '(주)세방로지스틱스', '(주)범한판토스',
  '(주)KSS해운', '(주)KDEX물류', '(주)팬스타로지스틱스', '(주)동방', '(주)천일정기화물',
  '(주)용마로지스', '(주)경동택배', '(주)로젠택배', '(주)GTX로지스틱스', '(주)에어코스타로지스',
  '(주)덕평물류', '(주)대교물류', '(주)이지물류', '(주)한솔물류', '(주)태영로지스틱스',
  '(주)서한물류', '(주)유한로지스틱스', '(주)삼성물류파트너', '(주)LG물류파트너', '(주)SK로지스',
  '(주)부산신항물류', '(주)인천물류센터', '(주)광주로지스', '(주)대구물류파트너', '(주)대전로지스틱스',
  '(주)부산물류솔루션', '(주)제주물류', '(주)강원로지스', '(주)울산물류파트너', '(주)창원스마트물류',
];

const SHIPPER_ROW_DATA = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];
const DISPATCH_METHODS = ['정보망배차', '정보망배차(바로선지급)', '정보망배차(픽커)', '소속기사배차', '협력사'];
const DISPATCH_ROW_DATA = DISPATCH_METHODS;
const LOADING_DATES_312 = [
  '26.05.01','26.05.04','26.05.06','26.05.08','26.05.11','26.05.13','26.05.15',
  '26.05.18','26.05.20','26.05.22','26.05.25','26.05.27','26.05.29',
  '26.06.01','26.06.03','26.06.05','26.06.08','26.06.10','26.06.12','26.06.15',
  '26.06.17','26.06.19','26.06.22','26.06.24','26.06.25','26.06.26','26.06.29',
];
const getLoadingDate312 = (i: number) => {
  let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11;
  return LOADING_DATES_312[((h >>> 0) % LOADING_DATES_312.length + LOADING_DATES_312.length) % LOADING_DATES_312.length];
}; // rows cycle through these 5

const PARTNER_ROW_DATA = [
  '카모로지스틱스', '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스',
  '(주)동탄스마트물류', '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스',
  '(주)현대글로비스파트너', '(주)CJ물류파트너', '(주)한진로지스틱스', '(주)쿠팡파트너스', '(주)네이버물류',
  '(주)GS물류', '(주)우체국물류지원', '(주)일양로지스', '(주)세방로지스틱스', '(주)범한판토스',
  '(주)KSS해운', '(주)KDEX물류', '(주)팬스타로지스틱스', '(주)동방', '(주)천일정기화물',
  '(주)용마로지스', '(주)경동택배', '(주)로젠택배', '(주)GTX로지스틱스', '(주)에어코스타로지스',
  '(주)덕평물류', '(주)대교물류', '(주)이지물류', '(주)한솔물류', '(주)태영로지스틱스',
  '(주)서한물류', '(주)유한로지스틱스', '(주)삼성물류파트너', '(주)LG물류파트너', '(주)SK로지스',
  '(주)부산신항물류', '(주)인천물류센터', '(주)광주로지스', '(주)대구물류파트너', '(주)대전로지스틱스',
  '(주)부산물류솔루션', '(주)제주물류', '(주)강원로지스', '(주)울산물류파트너', '(주)창원스마트물류',
];


function formatKorean(n: number): string {
  if (n === 0) return "0원";
  const uk = Math.floor(n / 100_000_000);
  const man = Math.floor((n % 100_000_000) / 10_000);
  const rem = n % 10_000;
  const parts: string[] = [];
  if (uk > 0) parts.push(`${uk}억`);
  if (man > 0) parts.push(`${man.toLocaleString()}만`);
  if (rem > 0) parts.push(rem.toLocaleString());
  return parts.join(" ") + "원";
}

const STATUS_LABEL_COLORS_312: Record<string, string> = {
  '마감필요': '#dd2222', '정산대기': '#18ac42', '수금대기': '#005fff',
  '수급대기': '#005fff', '수금완료': '#5c6370', '정산보류': '#9197a1',
  '지급대기': '#005fff', '지급완료': '#5c6370', '확정대기': '#dd2222', '발행대기': '#18ac42',
};

const SALE_STATUS_DATA = [
  { label: "전체",    count: "5,000건", amount: null,          amountRaw: 10_000_000 },
  { label: "마감필요", count: "455건",  amount: "0원",         amountRaw: 0 },
  { label: "정산대기", count: "2,273건", amount: "1,000,000원", amountRaw: 2_273_000 },
  { label: "수금대기", count: "909건",  amount: "3,000,000원", amountRaw: 3_000_000 },
  { label: "수금완료", count: "909건",  amount: "5,000,000원", amountRaw: 5_000_000 },
  { label: "정산보류", count: "454건",  amount: "900,000원",   amountRaw: 454_000 },
];

const PURCHASE_STATUS_DATA = [
  { label: "전체",    count: "5,000건", amount: null,          amountRaw: 5_000_000 },
  { label: "마감필요", count: "500건",  amount: "0원",         amountRaw: 0 },
  { label: "정산대기", count: "1,500건", amount: "500,000원",   amountRaw: 1_500_000 },
  { label: "지급대기", count: "2,000건", amount: "1,500,000원", amountRaw: 2_000_000 },
  { label: "지급완료", count: "500건",  amount: "2,500,000원", amountRaw: 500_000 },
  { label: "정산보류", count: "500건",  amount: "450,000원",   amountRaw: 500_000 },
];

function StatusCardRow({ data, type }: { data: { label: string; count: string; amount: string | null }[]; type: "sale" | "purchase" }) {
  const saleCtx = useContext(SaleFilterCtx);
  const purchaseCtx = useContext(PurchaseFilterCtx);
  const { selected, setSelected } = type === "sale" ? saleCtx : purchaseCtx;
  const { saleCounts, purchaseCounts } = useContext(DynamicCountCtx);
  const dynamicCountArr = type === 'sale' ? saleCounts : purchaseCounts;
  const nonTotalCount = data.length - 1;

  const handleClick = (i: number) => {
    if (i === 0) {
      setSelected(new Set([0]));
    } else {
      setSelected(((prev: Set<number>) => {
        const next = new Set(prev);
        next.delete(0);
        if (next.has(i)) {
          next.delete(i);
          if (next.size === 0) next.add(0);
        } else {
          next.add(i);
          if (next.size === nonTotalCount) return new Set([0]);
        }
        return next;
      })(selected));
    }
  };

  return (
    <div className="flex gap-[4px] w-full" style={{height: 72}}>
      {data.map((item, i) => {
        const isSelected = selected.has(i);
        return (
          <div
            key={item.label}
            onClick={() => handleClick(i)}
            className={`relative rounded-[8px] flex-1 min-w-0 h-full flex flex-col justify-center items-center px-[8px] py-[12px] cursor-pointer select-none ${isSelected ? "bg-white" : "bg-[#f6f7f8] hover:bg-[#EBEDEF]"}`}
          >
            {isSelected && <div aria-hidden className="absolute border border-[#EBEDEF] border-solid inset-0 pointer-events-none rounded-[8px]" />}
            <p className="font-['Pretendard_GOV:SemiBold'] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: STATUS_LABEL_COLORS_312[item.label] ?? '#5c6370' }}>{item.label}</p>
            <p className="font-['Pretendard_GOV:SemiBold'] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: STATUS_LABEL_COLORS_312[item.label] ?? '#2e3238' }}>{dynamicCountArr.length > 0 ? dynamicCountArr[i].toLocaleString() : item.count.replace("건", "")}</p>
          </div>
        );
      })}
    </div>
  );
}
function Component7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="예치금">
      <div className="content-stretch flex gap-[2px] h-[16px] items-center relative shrink-0" data-name="Top navi / payment / components / title">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[14px] tracking-[-0.28px] whitespace-nowrap">
          <p className="leading-[20px]">예치금</p>
        </div>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[2px] items-center justify-end leading-[0] not-italic relative shrink-0 text-[14px] tracking-[-0.28px] w-[112px]" data-name="Top navi / payment / components / balance">
        <div className="flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Bold'] justify-center min-w-px relative text-[#2e3238] text-right">
          <p className="leading-[20px]">1,000,000,000</p>
        </div>
        <div className="flex flex-col font-['Pretendard_GOV:Regular'] justify-center relative shrink-0 text-[#454b55] whitespace-nowrap">
          <p className="leading-[20px]">원</p>
        </div>
      </div>
    </div>
  );
}

function Component8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="채권">
      <div className="content-stretch flex gap-[2px] h-[16px] items-center relative shrink-0" data-name="Top navi / payment / components / title">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[14px] tracking-[-0.28px] whitespace-nowrap">
          <p className="leading-[20px]">빠른지급</p>
        </div>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[2px] items-center justify-end leading-[0] not-italic relative shrink-0 text-[14px] tracking-[-0.28px] w-[112px]" data-name="Top navi / payment / components / balance">
        <div className="flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Bold'] justify-center min-w-px relative text-[#2e3238] text-right">
          <p className="leading-[20px]">1,000,000,000</p>
        </div>
        <div className="flex flex-col font-['Pretendard_GOV:Regular'] justify-center relative shrink-0 text-[#454b55] whitespace-nowrap">
          <p className="leading-[20px]">원</p>
        </div>
      </div>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex gap-[4px] h-[19px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[19px] not-italic relative shrink-0 text-[#2e3238] text-[13px] tracking-[-0.26px] whitespace-nowrap">04.14 12:30:21 기준</p>
    </div>
  );
}

function Component13() {
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

function Frame719() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0">
      <Frame77 />
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[2px] shrink-0 size-[26px]" data-name="Button">
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[2px]" />
        <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/restart">
          <div className="absolute bg-white left-0 size-[16px] top-0" data-name="16 / ic_16_reload_gray">
            <Component13 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame830() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">통합장부</p>
      <Frame719 />
    </div>
  );
}

const PERIOD_OPTIONS_312 = ['상차일', '하차일', '매출 명세서 기준일', '매입 명세서 기준일'] as const;

function TypeStatusDisabled() {
  const { dateType, setDateType } = useContext(DateFilterCtx);
  const selected = dateType;
  const setSelected = setDateType;
  const [open, setOpen] = useState(false);
  const [focusedOpt, setFocusedOpt] = useState<string | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <div
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer"
        data-name="type=입력형_버튼, status=Disabled"
        style={{ border: `1px solid ${open ? '#005FFF' : '#E4E5E9'}` }}
      >
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <span className="[word-break:break-word] flex-1 min-w-0 font-['Pretendard_GOV:Regular'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis">
              {selected}
            </span>
            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
                <path d="M1 1L5 5L9 1" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {open && rect && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 2,
            left: rect.left,
            width: 176,
            background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            borderRadius: 8,
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            zIndex: 99999,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {PERIOD_OPTIONS_312.map(opt => (
            <div
              key={opt}
              tabIndex={0}
              onClick={() => { setSelected(opt); setOpen(false); }}
              onFocus={() => setFocusedOpt(opt)}
              onBlur={() => setFocusedOpt(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '9px 8px',
                gap: 8,
                height: 40,
                borderRadius: 4,
                fontSize: 15,
                fontFamily: "'Pretendard GOV', sans-serif",
                letterSpacing: '-0.02em',
                lineHeight: '22px',
                color: selected === opt ? '#005FFF' : '#2E3238',
                fontWeight: 400,
                background: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                outline: focusedOpt === opt ? '1px solid #005FFF' : 'none',
                outlineOffset: '-1px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <span style={{ flex: 1 }}>{opt}</span>
              {selected === opt && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M3 8.18182L6.125 11.5L13 4" stroke="#005FFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

const PERIOD_RANGE_OPTIONS_312 = ['오늘', '이번달', '저번달', '1분기', '2분기', '3분기', '4분기', '올해', '1년', '직접입력'] as const;

function TypeStatusDisabled1({ onSelect }: { onSelect?: (opt: string) => void }) {
  const { periodRange: selected, setPeriodRange: setSelected } = useContext(DateFilterCtx);
  const [open, setOpen] = useState(false);
  const [focusedOpt, setFocusedOpt] = useState<string | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <div
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer"
        style={{ border: `1px solid ${open ? '#005FFF' : '#E4E5E9'}` }}
      >
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <span className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
              {selected}
            </span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined }}>
              <path d="M1 1L5 5L9 1" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
      {open && rect && createPortal(
        <div ref={dropRef} style={{ position:'fixed', top: rect.bottom + 2, left: rect.left, width:176, background:'#FFFFFF', border:'1px solid #E4E5E9', borderRadius:8, boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex:99999, boxSizing:'border-box' }}>
          <div style={{ padding:8, overflowY:'auto', maxHeight:216, scrollbarWidth:'thin', scrollbarColor:'#767D8A #FFFFFF', display:'flex', flexDirection:'column' }}>
            {PERIOD_RANGE_OPTIONS_312.map(opt => (
              <div
                key={opt}
                tabIndex={0}
                onClick={() => { setSelected(opt); setOpen(false); onSelect?.(opt); }}
                onFocus={() => setFocusedOpt(opt)}
                onBlur={() => setFocusedOpt(null)}
                onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                style={{ display:'flex', alignItems:'center', padding:'9px 8px', gap:8, height:40, borderRadius:4, fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', color: selected === opt ? '#005FFF' : '#2E3238', fontWeight:400, background:'#FFFFFF', cursor:'pointer', whiteSpace:'nowrap', boxSizing:'border-box', flexShrink:0, outline:'none' }}
              >
                <span style={{ flex:1 }}>{opt}</span>
                {selected === opt && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                    <path d="M3 8.18182L6.125 11.5L13 4" stroke="#005FFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="icon">
          <g id="size guide layer" />
          <path d="M10 3L5 8L10 13" id="Vector 367" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}

function SwitchAtom({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="bg-white mr-[-1px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 size-[36px] cursor-pointer" data-name="switch_Atom" onClick={onClick}>
      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[26px]" data-name="Button">
          <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_left">
            <Icon1 />
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px]" />
    </div>
  );
}

function SwitchAtom1() {
  return (
    <div className="bg-white h-[36px] mr-[-1px] relative shrink-0" data-name="switch_Atom">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] text-center tracking-[-0.28px] whitespace-nowrap">
          <p className="leading-[20px]">25.02.22</p>
        </div>
      </div>
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="icon">
          <g id="size guide layer" />
          <path d="M6 13L11 8L6 3" id="Vector 367" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
        </g>
      </svg>
    </div>
  );
}

function SwitchAtom2({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="bg-white relative rounded-br-[4px] rounded-tr-[4px] shrink-0 size-[36px] cursor-pointer" data-name="switch_Atom" onClick={onClick}>
      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[26px]" data-name="Button">
          <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_right">
            <Icon2 />
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
    </div>
  );
}

function SwitchModule({ rangeStart, rangeEnd, setRangeStart, setRangeEnd, onManualChange }: {
  rangeStart: Date | null; rangeEnd: Date | null;
  setRangeStart: (d: Date | null) => void; setRangeEnd: (d: Date | null) => void;
  onManualChange?: () => void;
}) {
  const F = "'Pretendard GOV:Regular'";
  const today = new Date(2026, 5, 29);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'current' | 'fixed'>('fixed');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 외부 rangeStart 변경 시 캘린더 뷰 동기화
  useEffect(() => {
    if (rangeStart) { setViewYear(rangeStart.getFullYear()); setViewMonth(rangeStart.getMonth()); }
  }, [rangeStart]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
          panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false); setSelecting(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fmtD = (d: Date | null) => {
    if (!d) return '';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };
  const isSame = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const clear = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const MAX_RANGE_MS = 365 * 86400000;

  const handleDay = (date: Date) => {
    const d = clear(date);
    onManualChange?.();
    if (!selecting) { setRangeStart(d); setRangeEnd(null); setSelecting(true); return; }
    const s = clear(rangeStart!);
    // 365일 초과 선택 시, 방금 클릭한 쪽을 기준일(먼저 선택한 날짜)로부터 365일 이내로 자동 보정
    if (d < s) {
      const clampedStart = s.getTime() - d.getTime() > MAX_RANGE_MS ? new Date(s.getTime() - MAX_RANGE_MS) : d;
      setRangeStart(clampedStart);
      setRangeEnd(s);
    } else {
      const clampedEnd = d.getTime() - s.getTime() > MAX_RANGE_MS ? new Date(s.getTime() + MAX_RANGE_MS) : d;
      setRangeEnd(clampedEnd);
    }
    setSelecting(false);
  };

  const shiftDays = (delta: number) => {
    if (!rangeStart) return;
    onManualChange?.();
    const newStart = new Date(rangeStart.getTime() + delta * 86400000);
    setRangeStart(newStart);
    if (rangeEnd) setRangeEnd(new Date(rangeEnd.getTime() + delta * 86400000));
  };

  const isInRange = (date: Date) => {
    const d = clear(date);
    const s = rangeStart ? clear(rangeStart) : null;
    const e = selecting && hoverDate ? clear(hoverDate) : (rangeEnd ? clear(rangeEnd) : null);
    if (!s || !e) return false;
    const lo = s <= e ? s : e, hi = s <= e ? e : s;
    return d > lo && d < hi;
  };
  const isStart = (date: Date) => !!rangeStart && isSame(clear(date), clear(rangeStart));
  const isEnd = (date: Date) => { const e = selecting && hoverDate ? hoverDate : rangeEnd; return !!e && isSame(clear(date), clear(e)); };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), inMonth: false });

  const dateLabel = rangeStart && rangeEnd ? `${fmtD(rangeStart)} ~ ${fmtD(rangeEnd)}` : rangeStart ? fmtD(rangeStart) : '날짜 선택';
  const wrapRect = wrapRef.current?.getBoundingClientRect();

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="content-stretch flex items-center relative shrink-0" data-name="switch_Module" style={{ cursor: 'pointer' }}>
        <SwitchAtom onClick={e => { e.stopPropagation(); shiftDays(-1); }} />
        <div className="bg-white h-[36px] mr-[-1px] relative shrink-0" data-name="switch_Atom" onClick={() => setOpen(o => !o)}>
          <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] text-center tracking-[-0.28px] whitespace-nowrap">
              <p className="leading-[20px]">{dateLabel}</p>
            </div>
          </div>
          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none" />
        </div>
        <SwitchAtom2 onClick={e => { e.stopPropagation(); shiftDays(1); }} />
      </div>

      {open && wrapRect && createPortal(
        <div ref={panelRef} style={{ position: 'fixed', top: wrapRect.bottom + 4, left: wrapRect.left + wrapRect.width / 2 - 138, width: 276, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 12px 0', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', width: 252, height: 36 }}>
            <div onClick={() => setTab('current')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: tab === 'current' ? '1px solid #669FFF' : '1px solid #E4E5E9', borderRight: 'none', borderRadius: '4px 0 0 4px', cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: tab === 'current' ? 600 : 400, color: tab === 'current' ? '#005FFF' : '#5C6370', letterSpacing: '-0.02em', background: '#FFFFFF' }}>현재 날짜 기준</div>
            <div onClick={() => setTab('fixed')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: tab === 'fixed' ? '1px solid #669FFF' : '1px solid #E4E5E9', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: tab === 'fixed' ? 600 : 400, color: tab === 'fixed' ? '#005FFF' : '#5C6370', letterSpacing: '-0.02em', background: '#FFFFFF' }}>고정 날짜</div>
          </div>
          <div style={{ width: 252, height: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px', boxSizing: 'border-box' }}>
            <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontSize: 18, fontWeight: 700, color: '#2E3238', letterSpacing: '-0.02em' }}>{viewYear}년 {viewMonth + 1}월</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {([[-1, 'M4.5 1L0.5 5L4.5 9'], [1, 'M0.5 1L4.5 5L0.5 9']] as [number, string][]).map(([dir, d]) => (
                <button key={dir} onClick={() => { const dt = new Date(viewYear, viewMonth + dir, 1); setViewYear(dt.getFullYear()); setViewMonth(dt.getMonth()); }} style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d={d} stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', width: 252, paddingTop: 12, boxSizing: 'border-box' }}>
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} style={{ width: 36, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#454B55', letterSpacing: '-0.02em' }}>{d}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: 252, gap: '2px 0' }}>
            {cells.map((cell, i) => {
              const inR = isInRange(cell.date), isS = isStart(cell.date), isE = isEnd(cell.date);
              const effEnd = selecting && hoverDate ? hoverDate : rangeEnd;
              const sameDay = rangeStart && effEnd && isSame(clear(rangeStart), clear(effEnd));
              let halfBg: React.CSSProperties = {};
              if (effEnd && !sameDay) { if (isS) halfBg = { background: 'linear-gradient(to right, transparent 50%, #E6EFFF 50%)' }; else if (isE) halfBg = { background: 'linear-gradient(to left, transparent 50%, #E6EFFF 50%)' }; }
              const isT = isSame(cell.date, today);
              return (
                <div key={i} style={{ width: 36, height: 36, cursor: cell.inMonth ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', ...(inR && !isS && !isE ? { background: '#E6EFFF' } : {}), ...((isS || isE) ? halfBg : {}) }}
                  onMouseEnter={() => { if (selecting && cell.inMonth) setHoverDate(cell.date); }}
                  onMouseLeave={() => { if (selecting) setHoverDate(null); }}
                  onClick={() => { if (cell.inMonth) handleDay(cell.date); else { setViewYear(cell.date.getFullYear()); setViewMonth(cell.date.getMonth()); } }}>
                  <div style={{ width: 36, height: 36, borderRadius: (isS || isE) ? 20 : isT ? 100 : 0, background: (isS || isE) ? '#005FFF' : isT ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: (isS || isE) ? 600 : 400, color: (isS || isE) ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#9197A1', letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ width: 252, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0 8px', boxSizing: 'border-box' }}>
            {[{ label: '시작일', val: rangeStart }, { label: '종료일', val: rangeEnd }].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '0 0 0 4px', gap: 24 }}>
                <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#5C6370', letterSpacing: '-0.02em', lineHeight: '19px', width: 34 }}>{label}</span>
                <div style={{ flex: 1, height: 36, border: '1px solid #E4E5E9', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 4, boxSizing: 'border-box', background: '#FFFFFF' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14.4" fill="none" style={{ flexShrink: 0 }}><path d="M1 2.5h12v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2.5zm0 3.5h12M4.5 1v3M9.5 1v3" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <span style={{ fontFamily: F, fontSize: 15, color: val ? '#2E3238' : '#767D8A', lineHeight: '22px', letterSpacing: '-0.02em' }}>{val ? fmtD(val) : '날짜 선택'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Calender() {
  const today = new Date(2026, 5, 29);
  const clr = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const { rangeStart, rangeEnd, setRangeStart, setRangeEnd, setPeriodRange } = useContext(DateFilterCtx);

  const applyPeriod = (opt: string) => {
    const t = clr(today);
    switch (opt) {
      case '오늘':    setRangeStart(t); setRangeEnd(null); break;
      case '이번달':  setRangeStart(new Date(t.getFullYear(), t.getMonth(), 1)); setRangeEnd(new Date(t.getFullYear(), t.getMonth() + 1, 0)); break;
      case '저번달': { const s = new Date(t.getFullYear(), t.getMonth()-1, 1); const e = new Date(t.getFullYear(), t.getMonth(), 0); setRangeStart(s); setRangeEnd(e); break; }
      case '1분기':   setRangeStart(new Date(t.getFullYear(), 0, 1)); setRangeEnd(new Date(t.getFullYear(), 2, 31)); break;
      case '2분기':   setRangeStart(new Date(t.getFullYear(), 3, 1)); setRangeEnd(new Date(t.getFullYear(), 5, 30)); break;
      case '3분기':   setRangeStart(new Date(t.getFullYear(), 6, 1)); setRangeEnd(new Date(t.getFullYear(), 8, 30)); break;
      case '4분기':   setRangeStart(new Date(t.getFullYear(), 9, 1)); setRangeEnd(new Date(t.getFullYear(), 11, 31)); break;
      case '올해':    setRangeStart(new Date(t.getFullYear(), 0, 1)); setRangeEnd(new Date(t.getFullYear(), 11, 31)); break;
      case '1년':     setRangeStart(new Date(t.getFullYear()-1, t.getMonth(), t.getDate())); setRangeEnd(t); break;
      case '직접입력': break; // 캘린더에서 직접 선택
      default: break;
    }
  };

  return (
    <div className="content-stretch flex gap-[3px] items-center relative shrink-0" data-name="calender">
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled1 onSelect={applyPeriod} />
      </div>
      <SwitchModule rangeStart={rangeStart} rangeEnd={rangeEnd} setRangeStart={setRangeStart} setRangeEnd={setRangeEnd} onManualChange={() => setPeriodRange('직접입력')} />
    </div>
  );
}


function Frame892() {
  const { shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected, dispatchSelected, setDispatchSelected } = useContext(BubbleCtx);

  const [shipperOpen, setShipperOpen] = useState(false);
  const [shipperSearch, setShipperSearch] = useState('');
  const [shipperHovered, setShipperHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number|null>(null);
  const [hoveredShipperForGroup, setHoveredShipperForGroup] = useState<number|null>(null);
  const [shipperGroupSelected, setShipperGroupSelected] = useState<Set<string>>(new Set());
  const [groupHoveredKey, setGroupHoveredKey] = useState<string|null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [partnerHoveredIdx, setPartnerHoveredIdx] = useState<number|null>(null);
  const partnerBtnRef = useRef<HTMLDivElement>(null);
  const partnerDropRef = useRef<HTMLDivElement>(null);

  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchHovered, setDispatchHovered] = useState(false);
  const [dispatchItemHoveredIdx, setDispatchItemHoveredIdx] = useState<number|null>(null);
  const dispatchBtnRef = useRef<HTMLDivElement>(null);
  const dispatchDropRef = useRef<HTMLDivElement>(null);

  const [shipperDropPos, setShipperDropPos] = useState<{ top: number; left: number } | null>(null);
  const [partnerDropPos, setPartnerDropPos] = useState<{ top: number; left: number } | null>(null);
  const [dispatchDropPos, setDispatchDropPos] = useState<{ top: number; left: number } | null>(null);

  const shipperBg = shipperOpen ? '#eef3ff' : shipperSelected.size > 0 ? '#f5f9ff' : shipperHovered ? '#f6f7f8' : '#f6f7f8';
  const shipperBorder = shipperOpen ? '1px solid transparent' : shipperSelected.size > 0 ? '1px solid transparent' : shipperHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const shipperTextColor = (shipperOpen || shipperSelected.size > 0) ? '#005fff' : '#2e3238';

  const partnerBg = partnerOpen ? '#eef3ff' : partnerSelected.size > 0 ? '#f5f9ff' : partnerHovered ? '#f6f7f8' : '#f6f7f8';
  const partnerBorder = partnerOpen ? '1px solid transparent' : partnerSelected.size > 0 ? '1px solid transparent' : partnerHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const partnerTextColor = (partnerOpen || partnerSelected.size > 0) ? '#005fff' : '#2e3238';

  const dispatchBg = dispatchOpen ? '#eef3ff' : dispatchSelected.size > 0 ? '#f5f9ff' : dispatchHovered ? '#f6f7f8' : '#f6f7f8';
  const dispatchBorder = dispatchOpen ? '1px solid transparent' : dispatchSelected.size > 0 ? '1px solid transparent' : dispatchHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const dispatchTextColor = (dispatchOpen || dispatchSelected.size > 0) ? '#005fff' : '#2e3238';

  useEffect(() => {
    if (!dispatchOpen) return;
    const handler = (e: MouseEvent) => {
      if (!dispatchBtnRef.current?.contains(e.target as Node) && !dispatchDropRef.current?.contains(e.target as Node)) {
        setDispatchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dispatchOpen]);

  useEffect(() => {
    if (!shipperOpen) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) {
        setShipperOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shipperOpen]);

  useEffect(() => {
    if (!partnerOpen) return;
    const handler = (e: MouseEvent) => {
      if (!partnerBtnRef.current?.contains(e.target as Node) && !partnerDropRef.current?.contains(e.target as Node)) {
        setPartnerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [partnerOpen]);

  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div ref={btnRef} style={{ position:'relative' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: shipperBg, border: shipperBorder }}
          data-name="Input / Dropdown_Filter"
          onClick={() => {
            if (!shipperOpen) {
              const rect = btnRef.current!.getBoundingClientRect();
              setShipperDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setShipperOpen(o => !o);
          }}
          onMouseEnter={() => setShipperHovered(true)}
          onMouseLeave={() => setShipperHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: shipperTextColor }}>
            <p className="leading-[20px]">화주사</p>
          </div>
          {shipperSelected.size > 0 && !shipperOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{shipperSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: shipperOpen ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
              <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                <div className="-scale-y-100 flex-none">
                  <div className="h-[3px] relative w-[7px]" data-name="2021.11">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d={svgPaths.p2f848880} id="2021.11" stroke={shipperOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 더블 패널 Dropdown */}
        {shipperOpen && shipperDropPos && createPortal(
          <div ref={dropRef} style={{
            position:'fixed', top: shipperDropPos.top, left: shipperDropPos.left,
            width: 353, background:'#FFFFFF',
            border:'1px solid #E4E5E9',
            boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius:8,
            display:'flex', flexDirection:'row',
            zIndex:9999, boxSizing:'border-box',
          }}>
            {/* 왼쪽: 화주사 패널 */}
            <div style={{ width:176, display:'flex', flexDirection:'column', flexShrink:0 }}>
              {/* 검색 */}
              <div style={{ padding:'8px 8px 2px', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, border:'1px solid #E4E5E9', borderRadius:4, padding:'6px 10px', height:36, boxSizing:'border-box' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                    <circle cx="6.57" cy="6.57" r="5.07" stroke="#9197A1" strokeWidth="1.3"/>
                    <line x1="10.91" y1="10.91" x2="14.5" y2="14.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    autoFocus
                    value={shipperSearch}
                    onChange={e => setShipperSearch(e.target.value)}
                    placeholder="화주사 검색"
                    style={{ flex:1, border:'none', outline:'none', fontSize:15, color: shipperSearch ? '#2E3238' : '#767D8A', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', background:'transparent' }}
                  />
                </div>
              </div>
              {/* 리스트 */}
              <div style={{ height:208, overflowY:'auto', padding:8, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
                {shipperSelected.size === 0 && (!shipperSearch || SHIPPERS.filter(s => s.includes(shipperSearch)).length === 0) ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:4, minHeight:208 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                      <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="12" cy="17.5" r="1" fill="white"/>
                    </svg>
                    <span style={{ fontSize:13, color:'#5C6370', textAlign:'center', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>검색 결과가 없습니다.</span>
                  </div>
                ) : SHIPPERS.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (shipperSearch && name.includes(shipperSearch)) || shipperSelected.has(origIdx)).map(({name, origIdx}) => (
                  <div
                    key={origIdx}
                    onMouseEnter={() => { setHoveredIdx(origIdx); setHoveredShipperForGroup(origIdx); }}
                    onMouseLeave={() => { setHoveredIdx(null); }}
                    onClick={() => { const next = new Set(shipperSelected); if (next.has(origIdx)) next.delete(origIdx); else next.add(origIdx); setShipperSelected(next); }}
                    style={{ display:'flex', alignItems:'center', padding:'9px 8px 9px 4px', gap:8, height:40, borderRadius:4, cursor:'pointer', boxSizing:'border-box', background: hoveredIdx === origIdx ? '#F6F7F8' : '#FFFFFF' }}
                  >
                    <div style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:16, height:16, border: shipperSelected.has(origIdx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius:3, background: shipperSelected.has(origIdx) ? '#005FFF' : '#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box' }}>
                        {shipperSelected.has(origIdx) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <span style={{ fontSize:15, color:'#2E3238', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {shipperSearch ? (() => { const q = shipperSearch; const i = name.toLowerCase().indexOf(q.toLowerCase()); if (i === -1) return name; return <>{name.slice(0,i)}<span style={{color:'#005FFF'}}>{name.slice(i,i+q.length)}</span>{name.slice(i+q.length)}</>; })() : name}
                    </span>
                  </div>
                ))}
              </div>
              {/* 푸터 */}
              <div style={{ height:28, padding:'0 8px', borderTop:'1px solid #E4E5E9', display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink:0, boxSizing:'border-box' }}>
                <span onClick={e => { e.stopPropagation(); setShipperSelected(new Set()); setShipperSearch(''); }} style={{ fontSize:12, color:'#9197A1', cursor:'pointer', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'18px' }}>필터 초기화</span>
              </div>
            </div>

            {/* 세로 구분선 */}
            <div style={{ width:1, background:'#E4E5E9', alignSelf:'stretch', flexShrink:0 }} />

            {/* 오른쪽: 업무그룹 패널 */}
            <div style={{ width:176, display:'flex', flexDirection:'column', flexShrink:0 }}>
              {/* 리스트 */}
              <div style={{ height:208, overflowY:'auto', padding:8, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
                {(() => {
                  // 호버된 화주사 또는 선택된 화주사들의 업무그룹
                  const activeIdx = hoveredShipperForGroup;
                  const allGroups: string[] = activeIdx !== null && SHIPPERS[activeIdx]
                    ? SHIPPER_GROUPS_312[SHIPPERS[activeIdx]] ?? []
                    : shipperSelected.size > 0
                      ? [...shipperSelected].flatMap(i => SHIPPER_GROUPS_312[SHIPPERS[i]] ?? []).filter((v,i,a) => a.indexOf(v) === i)
                      : [];
                  if (allGroups.length === 0) return (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:4, minHeight:208 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                        <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="12" cy="17.5" r="1" fill="white"/>
                      </svg>
                      <span style={{ fontSize:13, color:'#5C6370', textAlign:'center', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>화주사를 먼저 선택해 주세요.</span>
                    </div>
                  );
                  return allGroups.map(grpName => {
                    const key = grpName;
                    return (
                      <div key={key}
                        onMouseEnter={() => setGroupHoveredKey(key)}
                        onMouseLeave={() => setGroupHoveredKey(null)}
                        onClick={() => { const next = new Set(shipperGroupSelected); if (next.has(key)) next.delete(key); else next.add(key); setShipperGroupSelected(next); }}
                        style={{ display:'flex', alignItems:'center', padding:'9px 8px 9px 4px', gap:8, height:40, borderRadius:4, cursor:'pointer', boxSizing:'border-box', background: groupHoveredKey === key ? '#F6F7F8' : '#FFFFFF' }}
                      >
                        <div style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <div style={{ width:16, height:16, border: shipperGroupSelected.has(key) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius:3, background: shipperGroupSelected.has(key) ? '#005FFF' : '#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box' }}>
                            {shipperGroupSelected.has(key) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                        <span style={{ fontSize:15, color:'#2E3238', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>{grpName}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* 푸터 */}
              <div style={{ height:28, padding:'0 8px', borderTop:'1px solid #E4E5E9', display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink:0, boxSizing:'border-box' }}>
                <span onClick={e => { e.stopPropagation(); setShipperGroupSelected(new Set()); }} style={{ fontSize:12, color:'#9197A1', cursor:'pointer', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'18px' }}>필터 초기화</span>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      <div ref={partnerBtnRef} style={{ position:'relative' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: partnerBg, border: partnerBorder }}
          data-name="Input / 04. Filter"
          onClick={() => {
            if (!partnerOpen) {
              const rect = partnerBtnRef.current!.getBoundingClientRect();
              setPartnerDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setPartnerOpen(o => !o);
          }}
          onMouseEnter={() => setPartnerHovered(true)}
          onMouseLeave={() => setPartnerHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: partnerTextColor }}>
            <p className="leading-[20px]">요청협력사</p>
          </div>
          {partnerSelected.size > 0 && !partnerOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{partnerSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: partnerOpen ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
              <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                <div className="-scale-y-100 flex-none">
                  <div className="h-[3px] relative w-[7px]" data-name="2021.11">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d={svgPaths.p2f848880} id="2021.11" stroke={partnerOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {partnerOpen && partnerDropPos && createPortal(
          <div ref={partnerDropRef} style={{
            position:'fixed', top: partnerDropPos.top, left: partnerDropPos.left,
            width:176, background:'#FFFFFF',
            border:'1px solid #E4E5E9',
            boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius:8,
            display:'flex', flexDirection:'column',
            zIndex:9999, boxSizing:'border-box',
          }}>
            <div style={{ padding:'8px 8px 2px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, border:'1px solid #E4E5E9', borderRadius:4, padding:'6px 10px', height:36, boxSizing:'border-box' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                  <circle cx="6.57" cy="6.57" r="5.07" stroke="#9197A1" strokeWidth="1.3"/>
                  <line x1="10.91" y1="10.91" x2="14.5" y2="14.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  value={partnerSearch}
                  onChange={e => setPartnerSearch(e.target.value)}
                  placeholder="협력사 검색"
                  style={{ flex:1, border:'none', outline:'none', fontSize:15, color:'#767D8A', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', background:'transparent' }}
                />
              </div>
            </div>
            <div style={{ height: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS.filter(s => s.includes(partnerSearch)).length === 0)) ? 162 : undefined, maxHeight: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS.filter(s => s.includes(partnerSearch)).length === 0)) ? undefined : 162, overflowY:'auto', padding:8, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
              {partnerSelected.size === 0 && (!partnerSearch || PARTNERS.filter(s => s.includes(partnerSearch)).length === 0) ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color:'#5C6370', textAlign:'center', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : PARTNERS.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (partnerSearch && name.includes(partnerSearch)) || partnerSelected.has(origIdx)).map(({name, origIdx}) => (
                <div
                  key={origIdx}
                  onMouseEnter={() => setPartnerHoveredIdx(origIdx)}
                  onMouseLeave={() => setPartnerHoveredIdx(null)}
                  onClick={() => {
                    const next = new Set(partnerSelected);
                    if (next.has(origIdx)) next.delete(origIdx); else next.add(origIdx);
                    setPartnerSelected(next);
                  }}
                  style={{
                    display:'flex', alignItems:'center', padding:'9px 8px 9px 4px', gap:8,
                    height:40, borderRadius:4, cursor:'pointer', boxSizing:'border-box',
                    background: partnerHoveredIdx === origIdx ? '#F6F7F8' : '#FFFFFF',
                  }}
                >
                  <div style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{
                      width:16, height:16,
                      border: partnerSelected.has(origIdx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9',
                      borderRadius:3,
                      background: partnerSelected.has(origIdx) ? '#005FFF' : '#FFFFFF',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxSizing:'border-box',
                    }}>
                      {partnerSelected.has(origIdx) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize:15, color:'#2E3238', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ height:28, padding:'0 8px', borderTop:'1px solid #E4E5E9', display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink:0, boxSizing:'border-box' }}>
              <span
                onClick={e => { e.stopPropagation(); setPartnerSelected(new Set()); setPartnerSearch(''); }}
                style={{ fontSize:12, color:'#9197A1', cursor:'pointer', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'18px' }}
              >
                필터 초기화
              </span>
            </div>
          </div>,
          document.body
        )}
      </div>
      <div ref={dispatchBtnRef} style={{ position:'relative' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: dispatchBg, border: dispatchBorder }}
          data-name="Input / 04. Filter"
          onClick={() => {
            if (!dispatchOpen) {
              const rect = dispatchBtnRef.current!.getBoundingClientRect();
              setDispatchDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setDispatchOpen(o => !o);
          }}
          onMouseEnter={() => setDispatchHovered(true)}
          onMouseLeave={() => setDispatchHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: dispatchTextColor }}>
            <p className="leading-[20px]">배차방법</p>
          </div>
          {dispatchSelected.size > 0 && !dispatchOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{dispatchSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: dispatchOpen ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
              <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                <div className="-scale-y-100 flex-none">
                  <div className="h-[3px] relative w-[7px]" data-name="2021.11">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d={svgPaths.p2f848880} id="2021.11" stroke={dispatchOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {dispatchOpen && dispatchDropPos && createPortal(
          <div ref={dispatchDropRef} style={{
            position:'fixed', top: dispatchDropPos.top, left: dispatchDropPos.left,
            width:176, background:'#FFFFFF',
            border:'1px solid #E4E5E9',
            boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius:8,
            display:'flex', flexDirection:'column',
            zIndex:9999, boxSizing:'border-box',
          }}>
            {/* List — no search area (only 5 items) */}
            <div style={{ height:200, overflowY:'auto', padding:8, boxSizing:'border-box' }}>
              {DISPATCH_METHODS.map((name, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setDispatchItemHoveredIdx(idx)}
                  onMouseLeave={() => setDispatchItemHoveredIdx(null)}
                  onClick={() => {
                    const next = new Set(dispatchSelected);
                    if (next.has(idx)) next.delete(idx); else next.add(idx);
                    setDispatchSelected(next);
                  }}
                  style={{
                    display:'flex', alignItems:'center', padding:'9px 8px 9px 4px', gap:8,
                    height:40, borderRadius:4, cursor:'pointer', boxSizing:'border-box',
                    background: dispatchItemHoveredIdx === idx ? '#F6F7F8' : '#FFFFFF',
                  }}
                >
                  <div style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{
                      width:16, height:16,
                      border: dispatchSelected.has(idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9',
                      borderRadius:3,
                      background: dispatchSelected.has(idx) ? '#005FFF' : '#FFFFFF',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxSizing:'border-box',
                    }}>
                      {dispatchSelected.has(idx) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize:15, color:'#2E3238', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{name}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ height:28, padding:'0 8px', borderTop:'1px solid #E4E5E9', display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink:0, boxSizing:'border-box' }}>
              <span
                onClick={e => { e.stopPropagation(); setDispatchSelected(new Set()); }}
                style={{ fontSize:12, color:'#9197A1', cursor:'pointer', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'18px' }}
              >
                필터 초기화
              </span>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

function Filter() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Filter">
      <Calender />
      <Frame892 />
    </div>
  );
}

function Component14() {
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

function Frame831() {
  const { setShipperSelected, setPartnerSelected, setDispatchSelected } = useContext(BubbleCtx);
  const { setDateType, setPeriodRange, setRangeStart, setRangeEnd } = useContext(DateFilterCtx);
  const { setSelected: setSaleSelected } = useContext(SaleFilterCtx);
  const { setSelected: setPurchaseSelected } = useContext(PurchaseFilterCtx);
  const { clearSearch } = useContext(SearchCtx312);
  const resetAll = () => {
    setShipperSelected(new Set());
    setPartnerSelected(new Set());
    setDispatchSelected(new Set());
    setDateType('상차일');
    setPeriodRange('오늘');
    setRangeStart(new Date(2026, 5, 29));
    setRangeEnd(null);
    setSaleSelected(new Set([0]));
    setPurchaseSelected(new Set([0]));
    clearSearch();
  };
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button"
        onClick={resetAll}>
        <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/restart">
          <div className="absolute bg-white left-0 size-[16px] top-0" data-name="16 / ic_16_reload_gray">
            <Component14 />
          </div>
        </div>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">전체 초기화</p>
        </div>
      </div>
    </div>
  );
}

function Frame871() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Filter />
      <Frame831 />
    </div>
  );
}

function FilterSorterModule() {
  return (
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="Filter_Sorter_Module">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame871 />
    </div>
  );
}

function Frame877() {
  const { selected } = useContext(SaleFilterCtx);
  const totalAmount = useMemo(() => {
    if (selected.has(0)) return SALE_STATUS_DATA[0].amountRaw;
    return [...selected].reduce((sum, i) => sum + (SALE_STATUS_DATA[i]?.amountRaw ?? 0), 0);
  }, [selected]);
  const totalCount = selected.has(0) ? SALE_STATUS_DATA[0].count : [...selected].reduce((sum, i) => {
    const raw = parseInt((SALE_STATUS_DATA[i]?.count ?? "0").replace(/,/g, ""));
    return sum + raw;
  }, 0).toLocaleString() + "건";
  return (
    <div className="relative shrink-0 w-full">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[8px] py-[4px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">총 매출 ({totalCount})</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">+{formatKorean(totalAmount)}</p>
      </div>
    </div>
  );
}

function Frame878() {
  return (
    <div className="bg-[#f5f9ff] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#005fff] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[#005fff] text-[16px] tracking-[-0.32px]">5,000건</p>
      </div>
    </div>
  );
}

function Frame883() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#dd2222' }}>마감필요</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#dd2222' }}>455건</p>
      </div>
    </div>
  );
}

function Frame879() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#18ac42' }}>정산대기</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#18ac42' }}>2,273건</p>
      </div>
    </div>
  );
}

function Frame880() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#005fff' }}>수금대기</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#005fff' }}>909건</p>
      </div>
    </div>
  );
}

function Frame881() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">수금완료</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px]">909건</p>

      </div>
    </div>
  );
}

function Frame882() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#9197a1' }}>정산보류</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#9197a1' }}>454건</p>
      </div>
    </div>
  );
}

function Frame894() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
      <Frame878 />
      <Frame883 />
      <Frame879 />
      <Frame880 />
      <Frame881 />
      <Frame882 />
    </div>
  );
}

function SummaryFooterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row items-center gap-[12px] w-full" style={{ height: 72, padding: '12px 16px' }}>
      {/* 텍스트 블록: label + value 수직 스택 */}
      <div className="flex flex-col items-start" style={{ gap: 0 }}>
        <p className="font-['Pretendard_GOV:SemiBold'] text-[#5c6370] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap">{label}</p>
        <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap">{value}</p>
      </div>
    </div>
  );
}

function Frame874() {
  const { selected } = useContext(SaleFilterCtx);
  const { saleTotalAmount, saleCounts } = useContext(DynamicCountCtx);
  // Scale the dynamic total by the status filter selection ratio
  const totalAmount = useMemo(() => {
    const dynTotal = saleCounts[0] ?? 5000;
    const dynBase = 5000;
    const ratio = dynBase > 0 ? dynTotal / dynBase : 1;
    if (selected.has(0)) return Math.round(saleTotalAmount);
    return Math.round([...selected].reduce((sum, i) => {
      const statusTotal = i === 0 ? saleTotalAmount : (SALE_STATUS_DATA[i]?.amountRaw ?? 0) * ratio;
      return sum + statusTotal;
    }, 0));
  }, [selected, saleTotalAmount, saleCounts]);
  return (
    <div style={{width:616, height:160, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start', padding:4, gap:8, background:'#F6F7F8', borderRadius:8, flexShrink:0, boxSizing:'border-box'}}>
      {/* 행1: 상태 필터 카드 */}
      <StatusCardRow data={SALE_STATUS_DATA} type="sale" />
      {/* 행2: 합계 */}
      <SummaryFooterRow label="총 매출" value={`+${formatKorean(totalAmount)}`} />
    </div>
  );
}

function Frame884() {
  const { selected } = useContext(PurchaseFilterCtx);
  const totalAmount = useMemo(() => {
    if (selected.has(0)) return PURCHASE_STATUS_DATA[0].amountRaw;
    return [...selected].reduce((sum, i) => sum + (PURCHASE_STATUS_DATA[i]?.amountRaw ?? 0), 0);
  }, [selected]);
  const totalCount = selected.has(0) ? PURCHASE_STATUS_DATA[0].count : [...selected].reduce((sum, i) => {
    const raw = parseInt((PURCHASE_STATUS_DATA[i]?.count ?? "0").replace(/,/g, ""));
    return sum + raw;
  }, 0).toLocaleString() + "건";
  return (
    <div className="relative shrink-0 w-full">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[8px] py-[4px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">총 매입 ({totalCount})</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">-{formatKorean(totalAmount)}</p>
      </div>
    </div>
  );
}

function Frame885() {
  return (
    <div className="bg-[#f5f9ff] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#005fff] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[#005fff] text-[16px] tracking-[-0.32px]">5,000건</p>
      </div>
    </div>
  );
}

function Frame886() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#dd2222' }}>마감필요</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#dd2222' }}>500건</p>
      </div>
    </div>
  );
}

function Frame887() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#18ac42' }}>정산대기</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#18ac42' }}>1,500건</p>
      </div>
    </div>
  );
}

function Frame888() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#005fff' }}>지급대기</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#005fff' }}>2,000건</p>
      </div>
    </div>
  );
}

function Frame889() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">지급완료</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[#2e3238] text-[16px] tracking-[-0.32px]">500건</p>

      </div>
    </div>
  );
}

function Frame890() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start not-italic px-[16px] py-[12px] relative size-full whitespace-nowrap">
        <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[15px] tracking-[-0.3px]" style={{ color: '#9197a1' }}>정산보류</p>
        <p className="font-['Pretendard_GOV:Bold'] leading-[24px] relative shrink-0 text-[16px] tracking-[-0.32px]" style={{ color: '#9197a1' }}>500건</p>
      </div>
    </div>
  );
}

function Frame895() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
      <Frame885 />
      <Frame886 />
      <Frame887 />
      <Frame888 />
      <Frame889 />
      <Frame890 />
    </div>
  );
}

function Frame876() {
  const { selected } = useContext(PurchaseFilterCtx);
  const { purchaseTotalAmount, purchaseCounts } = useContext(DynamicCountCtx);
  // Scale the dynamic total by the status filter selection ratio
  const totalAmount = useMemo(() => {
    const dynTotal = purchaseCounts[0] ?? 5000;
    const dynBase = 5000;
    const ratio = dynBase > 0 ? dynTotal / dynBase : 1;
    if (selected.has(0)) return Math.round(purchaseTotalAmount);
    return Math.round([...selected].reduce((sum, i) => {
      const statusTotal = i === 0 ? purchaseTotalAmount : (PURCHASE_STATUS_DATA[i]?.amountRaw ?? 0) * ratio;
      return sum + statusTotal;
    }, 0));
  }, [selected, purchaseTotalAmount, purchaseCounts]);
  return (
    <div style={{width:616, height:160, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start', padding:4, gap:8, background:'#F6F7F8', borderRadius:8, flexShrink:0, boxSizing:'border-box'}}>
      {/* 행1: 상태 필터 카드 */}
      <StatusCardRow data={PURCHASE_STATUS_DATA} type="purchase" />
      {/* 행2: 합계 */}
      <SummaryFooterRow label="총 매입" value={`-${formatKorean(totalAmount)}`} />
    </div>
  );
}

const DEDUCTION = 100_000;

const CHECKMARK_SVG = (
  <svg viewBox="0 0 10 8" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 1 }}>
    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Frame875() {
  const [deductChecked, setDeductChecked] = useState(false);
  const { selected: saleSelected } = useContext(SaleFilterCtx);
  const { selected: purchaseSelected } = useContext(PurchaseFilterCtx);
  const { saleTotalAmount, purchaseTotalAmount, saleCounts, purchaseCounts } = useContext(DynamicCountCtx);
  const saleAmount = useMemo(() => {
    const dynTotal = saleCounts[0] ?? 5000;
    const ratio = 5000 > 0 ? dynTotal / 5000 : 1;
    if (saleSelected.has(0)) return Math.round(saleTotalAmount);
    return Math.round([...saleSelected].reduce((sum, i) => {
      const statusTotal = i === 0 ? saleTotalAmount : (SALE_STATUS_DATA[i]?.amountRaw ?? 0) * ratio;
      return sum + statusTotal;
    }, 0));
  }, [saleSelected, saleTotalAmount, saleCounts]);
  const purchaseAmount = useMemo(() => {
    const dynTotal = purchaseCounts[0] ?? 5000;
    const ratio = 5000 > 0 ? dynTotal / 5000 : 1;
    if (purchaseSelected.has(0)) return Math.round(purchaseTotalAmount);
    return Math.round([...purchaseSelected].reduce((sum, i) => {
      const statusTotal = i === 0 ? purchaseTotalAmount : (PURCHASE_STATUS_DATA[i]?.amountRaw ?? 0) * ratio;
      return sum + statusTotal;
    }, 0));
  }, [purchaseSelected, purchaseTotalAmount, purchaseCounts]);
  const baseProfit = saleAmount - purchaseAmount;
  const profit = deductChecked ? baseProfit - DEDUCTION : baseProfit;
  const profitLabel = (profit < 0 ? "-" : "") + formatKorean(Math.abs(profit));
  const profitRate = saleAmount > 0 ? Math.round((profit / saleAmount) * 100) : 0;
  const profitRateLabel = `(${profitRate >= 0 ? '+' : ''}${profitRate}%)`;

  return (
    <div className="rounded-[8px] shrink-0 flex flex-col justify-between items-end gap-[20px]" style={{width: 400, height: 160, padding: 4, background:'#F6F7F8'}}>
      {/* 체크박스 행: 262×48px, padding 12px 16px */}
      <div
        onClick={() => setDeductChecked((v) => !v)}
        className="flex flex-row items-center gap-[4px] ml-auto cursor-pointer select-none"
        style={{width: 262, height: 48, padding: '12px 16px'}}
      >
        <div className="overflow-clip relative shrink-0" style={{width: 20, height: 20}}>
          <div
            className="absolute rounded-[4px]"
            style={{
              inset: '10%',
              background: deductChecked ? "#005fff" : "#fff",
              border: `1.3px solid ${deductChecked ? "#005fff" : "#adb1b9"}`,
            }}
          >
            {deductChecked && CHECKMARK_SVG}
          </div>
        </div>
        <p className="font-['Pretendard_GOV:Regular'] text-[#5c6370] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap">자사 산재보험료 포함</p>
        <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[16px] leading-[24px] tracking-[-0.32px] whitespace-nowrap">-{DEDUCTION.toLocaleString()}원</p>
      </div>
      {/* 수익 행: padding 12px 16px, gap 12px */}
      <div className="flex flex-row items-center gap-[12px] w-full" style={{height: 72, padding: '12px 16px'}}>
        <div className="flex flex-col items-start">
          <p className="font-['Pretendard_GOV:SemiBold'] text-[#5c6370] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap">총 수익</p>
          <div className="flex flex-row items-baseline gap-[6px]">
            <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap">{profitLabel}</p>
            <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap">
              {'('}
              <span style={{ color: profitRate >= 0 ? '#E13838' : '#005FFF' }}>{profitRate >= 0 ? '+' : ''}{profitRate}%</span>
              {')'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame891() {
  return (
    <div className="content-stretch flex gap-[8px] items-start py-[12px] relative shrink-0 w-full" style={{height: 184}}>
      <Frame874 />
      <Frame876 />
      <Frame875 />
    </div>
  );
}

function TypeStatusDisabled2() {
  const { searchType, setSearchType } = useContext(SearchCtx312);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node) &&
          dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <div
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="bg-white h-[36px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 w-full cursor-pointer"
        data-name="type=입력형_버튼, status=Disabled"
      >
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px]" />
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">{searchType}</p>
            </div>
            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_down">
              <div className="flex items-center justify-center relative shrink-0">
                <div className="-scale-y-100 flex-none" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
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
      {open && rect && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: 140, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex: 99999, padding: 8, display: 'flex', flexDirection: 'column' }}
        >
          {SEARCH_TYPE_OPTIONS_312.map(opt => (
            <div
              key={opt}
              onClick={() => { setSearchType(opt); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', padding: '9px 8px', height: 40, borderRadius: 4, fontSize: 15, fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', color: searchType === opt ? '#005FFF' : '#2E3238', background: '#FFFFFF', cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function TypeStatusDisabled3() {
  const { searchText, setSearchText, runSearch } = useContext(SearchCtx312);
  return (
    <div className="bg-white h-[36px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            placeholder="검색어를 입력하세요."
            className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px]"
            style={{ border: 'none', outline: 'none', background: 'transparent', minWidth: 0 }}
          />
        </div>
      </div>
    </div>
  );
}

function Component10() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name>
      <div className="mr-[-1px] relative shrink-0 w-[91px]" data-name="Input / 02. Selectbox">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start justify-end relative size-full">
          <TypeStatusDisabled2 />
        </div>
      </div>
      <div className="relative shrink-0 w-[180px]" data-name="Input / 01. Textfield">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
          <TypeStatusDisabled3 />
        </div>
      </div>
    </div>
  );
}

function Component9() {
  const { runSearch } = useContext(SearchCtx312);
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="텍스트검색">
      <Component10 />
      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button" onClick={runSearch}>
        <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">검색</p>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
    </div>
  );
}

function Frame872() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button">
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
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button">
        <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/download">
          <div className="absolute inset-[16.67%]" data-name="Vector">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 10.6667">
              <path d={svgPaths.p30497100} fill="var(--fill-0, #9197A1)" id="Vector" />
            </svg>
          </div>
        </div>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">화물운송실적신고 엑셀 저장</p>
        </div>
      </div>
    </div>
  );
}

function Group3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="group">
      <Component9 />
      <Frame872 />
    </div>
  );
}

const TableCtrlCtx = createContext({ filteredTotal: 300, selectedCount: 0 });

function TableControlModule() {
  const { filteredTotal, selectedCount } = useContext(TableCtrlCtx);
  return (
    <div className="content-stretch flex items-center justify-between py-[12px] relative shrink-0 w-full" data-name="Table_Control_Module">
      <div className="flex items-center gap-[12px]">
        <Component9 />
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">
            {selectedCount > 0
              ? `총 ${filteredTotal.toLocaleString()}건 중 ${selectedCount.toLocaleString()}건 선택`
              : `총 ${filteredTotal.toLocaleString()}건`}
          </p>
        </div>
      </div>
      <Frame872 />
    </div>
  );
}

function Title7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">매출 상태</p>
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


// ─── Data-driven table helpers ──────────────────────────────────────────────

function getRowData(rowIdx: number) {
  const seed = (n: number) => { let h = n ^ (n >>> 13); h = Math.imul(h, 0x9e3779b9|0); h ^= h>>>11; return ((h>>>0) % 1000000) / 1000000; };
  const rnd = (salt: number) => seed(rowIdx * 97 + salt);
  const pick = <T,>(arr: T[], salt: number): T => arr[Math.floor(rnd(salt) * arr.length)];
  const parseDate312 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd); };
  const fmtDate312 = (d: Date) => { const yy=String(d.getFullYear()).slice(2); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${yy}.${mm}.${dd}`; };

  const saleStatus = SALE_ROW_STATUSES[rowIdx % SALE_ROW_STATUSES.length];
  const purchaseStatus = PURCHASE_ROW_STATUSES[rowIdx % PURCHASE_ROW_STATUSES.length];

  const shipper = SHIPPER_ROW_DATA[rowIdx % SHIPPER_ROW_DATA.length];
  const shipperGroups = SHIPPER_GROUPS_312[shipper] ?? ['기본그룹'];
  const shipperGroup = shipperGroups[Math.floor(rnd(30) * shipperGroups.length)];
  const partner = PARTNER_ROW_DATA[rowIdx % PARTNER_ROW_DATA.length];
  const partnerGroup = pick(['기본그룹','A그룹','B그룹','수도권팀','지방팀'], 31);

  const loadingDate = getLoadingDate312(rowIdx);
  const loadDate = parseDate312(loadingDate);
  const unloadDate = new Date(loadDate.getTime() + (Math.floor(rnd(16)*3)+1)*86400000);
  const unloadDateStr = fmtDate312(unloadDate);

  const LOAD_LOCS = ['판교테크노밸리','강남구청역','분당수내역','수원역','용인터미널'];
  const UNLOAD_LOCS = ['광교물류','동탄물류','김포공항물류','인천항','부산항물류'];
  const LOAD_ADDRS = ['경기 성남시 삼평동','서울 강남구 역삼동','경기 성남시 정자동','경기 수원시 팔달구','경기 용인시 기흥구'];
  const UNLOAD_ADDRS = ['경기 수원시 영통구','경기 화성시 동탄','경기 김포시 걸포동','인천 중구 항동','부산 동구 초량동'];
  const loadLoc = pick(LOAD_LOCS, 17);
  const loadAddr = LOAD_ADDRS[LOAD_LOCS.indexOf(loadLoc)];
  const unloadLoc = pick(UNLOAD_LOCS, 18);
  const unloadAddr = UNLOAD_ADDRS[UNLOAD_LOCS.indexOf(unloadLoc)];

  const DRIVER_NAMES = ['이민호','박성준','최재원','정우진','한동현','오승기','강태풍','서준혁'];
  const PLATES = ['12아3456','34나5678','56다7890','78라9012','90마1234'];
  const PHONE_PREFIXES = ['010-1234','010-5678','010-9012','010-3456','010-7890'];
  const TON_TYPES = ['1톤','2.5톤','3.5톤','5톤','8톤'];
  const CARGO_TYPES = ['카고','윙바디','탑차','리프트'];
  const CARGO_FEATURES = ['상온','냉장','냉동'];
  const BILLING_METHODS = ['후불','선착불'];

  const driverName = pick(DRIVER_NAMES, 7);
  const plate = pick(PLATES, 8);
  const driverContact = `${pick(PHONE_PREFIXES, 9)}-${String(Math.floor(rnd(10)*9000+1000))}`;
  const tonType = pick(TON_TYPES, 12);
  const cargoType = pick(CARGO_TYPES, 11);
  const cargoFeature = pick(CARGO_FEATURES, 84);
  const billingMethod = pick(BILLING_METHODS, 14);
  const settlementType = billingMethod === '후불' ? pick(['별도정산', '예치금', '한도'], 15) : '현장결제';
  const dispatchMethod = DISPATCH_ROW_DATA[rowIdx % DISPATCH_ROW_DATA.length];
  const contractPartner = pick(PARTNER_ROW_DATA, 22);

  const billingAmt = (Math.floor(rnd(21)*20)+10) * 10000;
  const dispatchAmt = (Math.floor(rnd(23)*20)+10) * 10000;
  const profit = billingAmt - dispatchAmt;
  const totalInsurance = Math.round(dispatchAmt * 0.018);
  const selfInsurance = Math.round(totalInsurance * 0.5);

  const saleBaseDate = fmtDate312(new Date(loadDate.getTime() + 2*86400000));
  const saleTaxDate = saleBaseDate;
  const saleDeadline = fmtDate312(new Date(loadDate.getTime() + 30*86400000));
  const salePayDate = saleStatus === '수금완료' ? fmtDate312(new Date(loadDate.getTime() + 25*86400000)) : '';
  const purchaseBaseDate = fmtDate312(new Date(unloadDate.getTime() + 1*86400000));
  const purchaseTaxDate = purchaseBaseDate;
  const purchaseDeadline = fmtDate312(new Date(loadDate.getTime() + 30*86400000));
  const purchasePayDate = purchaseStatus === '지급완료' ? fmtDate312(new Date(loadDate.getTime() + 28*86400000)) : '';
  const shipperOrderNum = `CC${String(rowIdx % 100).padStart(3,'0')}C${String(rowIdx % 10).padStart(2,'0')}`;

  return {
    orderId: ORDER_IDS[rowIdx],
    saleStatus, purchaseStatus,
    shipper, shipperGroup,
    partner, partnerGroup,
    loadingDate, unloadDateStr,
    loadLoc, loadAddr,
    unloadLoc, unloadAddr,
    waypoints: `${rowIdx % 3}곳`,
    exclusiveLoad: rowIdx % 4 === 0 ? '혼적' : '독차',
    roundTrip: rowIdx % 3 === 0 ? '왕복' : '편도',
    tonType, cargoType, cargoFeature,
    dispatchMethod, contractPartner,
    plate, driverName, driverContact,
    billingMethod, settlementType,
    billingAmt, dispatchAmt, profit,
    totalInsurance, selfInsurance,
    saleBaseDate, saleTaxDate, saleDeadline, salePayDate,
    purchaseBaseDate, purchaseTaxDate, purchaseDeadline, purchasePayDate,
    shipperOrderNum,
  };
}

type RowData = ReturnType<typeof getRowData>;

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  '마감필요': { bg: '#fce9e9', text: '#dd2222' },
  '정산대기': { bg: '#e4fbeb', text: '#18ac42' },
  '수금대기': { bg: '#e6efff', text: '#005fff' },
  '수금완료': { bg: '#ebedef', text: '#454b55' },
  '지급대기': { bg: '#e6efff', text: '#005fff' },
  '지급완료': { bg: '#ebedef', text: '#454b55' },
  '정산보류': { bg: '#ebedef', text: '#9197a1' },
  '정산제외': { bg: '#ebedef', text: '#c7cbd1' },
};

function ColBorder() {
  return <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />;
}

function HeaderCell({ label }: { label: string }) {
  return (
    <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center p-[8px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px] overflow-hidden text-ellipsis">{label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeDataCell({ status, rowIdx }: { status: string; rowIdx: number }) {
  const style = BADGE_STYLES[status] ?? { bg: '#ebedef', text: '#454b55' };
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <ColBorder />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
          <div
            className="content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0"
            data-name="badge"
            style={{ background: style.bg }}
          >
            <div style={{ fontFamily: "'Pretendard GOV:SemiBold'", fontWeight: 600, fontSize: 13, letterSpacing: '-0.26px', color: style.text, lineHeight: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <p style={{ lineHeight: '19px' }}>{status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextDataCell({ text, rowIdx }: { text: string; rowIdx: number }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px] overflow-hidden text-ellipsis">{text}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder />
    </div>
  );
}

function NumberDataCell({ value, rowIdx }: { value: number; rowIdx: number }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px] overflow-hidden text-ellipsis">{value.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder />
    </div>
  );
}

function LinkDataCell({ text, rowIdx, onClick }: { text: string; rowIdx: number; onClick: () => void }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer" onClick={onClick}>{text}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder />
    </div>
  );
}

function ButtonDataCell({ rowIdx }: { rowIdx: number }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center justify-center px-[8px] py-[10px] relative size-full">
          <div className="bg-white h-[26px] relative rounded-[2px] shrink-0 cursor-pointer" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[8px] relative rounded-[inherit] size-full">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] tracking-[-0.28px] whitespace-nowrap">
                <p className="leading-[20px]">보기</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[2px]" />
          </div>
        </div>
      </div>
      <ColBorder />
    </div>
  );
}

function CheckboxDataCell312({ rowIdx }: { rowIdx: number }) {
  return (
    <div className="content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells" data-table-row={rowIdx} data-cb-row={rowIdx}>
      <ColBorder />
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
        <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
      </div>
    </div>
  );
}

function ModalRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center gap-[12px] w-full" style={{ padding: '10px 0' }}>
      <p className="font-['Pretendard_GOV:Regular'] text-[#5c6370] text-[14px] leading-[20px] tracking-[-0.28px]" style={{ width: 120, flexShrink: 0 }}>{label}</p>
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[15px] leading-[22px] tracking-[-0.3px]">{value}</p>
    </div>
  );
}

function TaxInvoiceModal({ type, rowIdx, onClose }: { type: 'sale' | 'purchase'; rowIdx: number; onClose: () => void }) {
  const d = getRowData(rowIdx);
  const isSale = type === 'sale';
  const title = isSale ? '매출 세금계산서' : '매입 세금계산서';
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}
      onClick={onClose}
    >
      <div
        style={{ width: 400, background: '#FFFFFF', borderRadius: 12, padding: 24, boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px]">{title}</p>
          <p style={{ cursor: 'pointer', color: '#9197A1', fontSize: 20, lineHeight: '20px' }} onClick={onClose}>×</p>
        </div>
        <div style={{ borderTop: '1px solid #E4E5E9' }}>
          <ModalRow label="오더ID" value={d.orderId} />
          <ModalRow label={isSale ? '화주사' : '요청협력사'} value={isSale ? (d.shipper || '-') : (d.partner || '-')} />
          <ModalRow label="계산서 작성일" value={isSale ? d.saleTaxDate : d.purchaseTaxDate} />
          <ModalRow label={isSale ? '청구금액' : '배차금액'} value={`${(isSale ? d.billingAmt : d.dispatchAmt).toLocaleString()}원`} />
          <ModalRow label="화주주문번호" value={d.shipperOrderNum} />
        </div>
        <div
          className="flex items-center justify-center cursor-pointer"
          style={{ marginTop: 16, height: 40, border: '1px solid #E4E5E9', borderRadius: 4 }}
          onClick={onClose}
        >
          <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[15px] leading-[22px]">닫기</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

type RowHandlers = {
  onOrderClick: (id: string, idx: number) => void;
  onTaxInvoiceClick: (type: 'sale' | 'purchase', rowIdx: number) => void;
};

type ColDef = {
  label: string;
  width: number;
  render: (d: RowData, rowIdx: number, handlers: RowHandlers) => React.ReactNode;
};

const TABLE_COLS: ColDef[] = [
  { label: '매출 상태', width: 100, render: (d, i) => <BadgeDataCell key={i} status={d.saleStatus} rowIdx={i} /> },
  { label: '매입 상태', width: 100, render: (d, i) => <BadgeDataCell key={i} status={d.purchaseStatus} rowIdx={i} /> },
  { label: '오더ID', width: 120, render: (d, i, h) => <LinkDataCell key={i} text={d.orderId} rowIdx={i} onClick={() => h.onOrderClick(d.orderId, i)} /> },
  { label: '화주사', width: 120, render: (d, i) => <TextDataCell key={i} text={d.shipper || '-'} rowIdx={i} /> },
  { label: '화주사 업무그룹', width: 140, render: (d, i) => <TextDataCell key={i} text={d.shipperGroup || '-'} rowIdx={i} /> },
  { label: '요청협력사', width: 140, render: (d, i) => <TextDataCell key={i} text={d.partner || '-'} rowIdx={i} /> },
  { label: '요청협력사 업무그룹', width: 140, render: (d, i) => <TextDataCell key={i} text={d.partnerGroup || '-'} rowIdx={i} /> },
  { label: '상차일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.loadingDate} rowIdx={i} /> },
  { label: '하차일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.unloadDateStr} rowIdx={i} /> },
  { label: '상차지명', width: 140, render: (d, i) => <TextDataCell key={i} text={d.loadLoc} rowIdx={i} /> },
  { label: '상차지주소', width: 140, render: (d, i) => <TextDataCell key={i} text={d.loadAddr} rowIdx={i} /> },
  { label: '하차지명', width: 140, render: (d, i) => <TextDataCell key={i} text={d.unloadLoc} rowIdx={i} /> },
  { label: '하차지주소', width: 140, render: (d, i) => <TextDataCell key={i} text={d.unloadAddr} rowIdx={i} /> },
  { label: '경유', width: 100, render: (d, i) => <TextDataCell key={i} text={d.waypoints} rowIdx={i} /> },
  { label: '독차', width: 100, render: (d, i) => <TextDataCell key={i} text={d.exclusiveLoad} rowIdx={i} /> },
  { label: '왕복', width: 100, render: (d, i) => <TextDataCell key={i} text={d.roundTrip} rowIdx={i} /> },
  { label: '요청 차량톤수', width: 100, render: (d, i) => <TextDataCell key={i} text={d.tonType} rowIdx={i} /> },
  { label: '요청 차량종류', width: 100, render: (d, i) => <TextDataCell key={i} text={d.cargoType} rowIdx={i} /> },
  { label: '요청 차량옵션', width: 100, render: (d, i) => <TextDataCell key={i} text={d.cargoFeature} rowIdx={i} /> },
  { label: '배차방법', width: 100, render: (d, i) => <TextDataCell key={i} text={d.dispatchMethod} rowIdx={i} /> },
  { label: '위탁협력사', width: 100, render: (d, i) => <TextDataCell key={i} text={d.contractPartner} rowIdx={i} /> },
  { label: '차량번호', width: 100, render: (d, i) => <TextDataCell key={i} text={d.plate} rowIdx={i} /> },
  { label: '기사명', width: 100, render: (d, i) => <TextDataCell key={i} text={d.driverName} rowIdx={i} /> },
  { label: '기사휴대전화', width: 140, render: (d, i) => <TextDataCell key={i} text={d.driverContact} rowIdx={i} /> },
  { label: '매출유형', width: 100, render: (d, i) => <TextDataCell key={i} text={d.billingMethod} rowIdx={i} /> },
  { label: '매입유형', width: 100, render: (d, i) => <TextDataCell key={i} text={d.settlementType} rowIdx={i} /> },
  { label: '청구금액', width: 140, render: (d, i) => <NumberDataCell key={i} value={d.billingAmt} rowIdx={i} /> },
  { label: '배차금액', width: 140, render: (d, i) => <NumberDataCell key={i} value={d.dispatchAmt} rowIdx={i} /> },
  { label: '수익(수수료)', width: 140, render: (d, i) => <NumberDataCell key={i} value={d.profit} rowIdx={i} /> },
  { label: '총 산재보험료', width: 140, render: (d, i) => <NumberDataCell key={i} value={d.totalInsurance} rowIdx={i} /> },
  { label: '자사 보험료', width: 140, render: (d, i) => <NumberDataCell key={i} value={d.selfInsurance} rowIdx={i} /> },
  { label: '매출 명세서 기준일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.saleBaseDate} rowIdx={i} /> },
  { label: '매출 계산서 작성일', width: 140, render: (d, i, h) => <LinkDataCell key={i} text={d.saleTaxDate} rowIdx={i} onClick={() => h.onTaxInvoiceClick('sale', i)} /> },
  { label: '수금기한', width: 140, render: (d, i) => <TextDataCell key={i} text={d.saleDeadline} rowIdx={i} /> },
  { label: '수금일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.salePayDate || '-'} rowIdx={i} /> },
  { label: '매입 명세서 기준일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.purchaseBaseDate} rowIdx={i} /> },
  { label: '매입 계산서 작성일', width: 140, render: (d, i, h) => <LinkDataCell key={i} text={d.purchaseTaxDate} rowIdx={i} onClick={() => h.onTaxInvoiceClick('purchase', i)} /> },
  { label: '지급기한', width: 140, render: (d, i) => <TextDataCell key={i} text={d.purchaseDeadline} rowIdx={i} /> },
  { label: '지급일', width: 140, render: (d, i) => <TextDataCell key={i} text={d.purchasePayDate} rowIdx={i} /> },
  { label: '화주사 주문번호', width: 120, render: (d, i) => <TextDataCell key={i} text={d.shipperOrderNum} rowIdx={i} /> },
  { label: '증빙서류', width: 100, render: (_d, i) => <ButtonDataCell key={i} rowIdx={i} /> },
];

function DynamicTable312({ pageRows, handlers }: {
  pageRows: number[];
  handlers: RowHandlers;
}) {
  return (
    <>
      <div className="relative shrink-0">
        <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
          <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center p-[8px] relative shrink-0 w-[34px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells" data-cb-row="header">
            <ColBorder />
            <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
              <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            </div>
          </div>
          {pageRows.map((rowIdx) => <CheckboxDataCell312 key={rowIdx} rowIdx={rowIdx} />)}
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-r border-solid inset-0 pointer-events-none" />
      </div>
      {TABLE_COLS.map((col) => (
        <div
          key={col.label}
          className="content-stretch flex flex-col items-center relative shrink-0"
          style={{ width: col.width }}
        >
          <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
          <HeaderCell label={col.label} />
          {pageRows.map((rowIdx) => col.render(getRowData(rowIdx), rowIdx, handlers))}
        </div>
      ))}
    </>
  );
}

export function OrderDetailModal({ orderId, rowIdx, onClose, __pageMode, baechaStatus: _baechaStatus, cancelCloseState, onStatusChange }: { orderId: string; rowIdx: number; onClose: () => void; __pageMode?: boolean; baechaStatus?: string; cancelCloseState?: { closeSale: boolean; closePurchase: boolean }; onStatusChange?: (status: string) => void }) {
  const ff = "'Pretendard GOV:Regular'";

  // 취소 스토어에 있는 오더면 baechaStatus를 '거래취소'로 자동 처리
  const isCancelledInStore = getCancelledOrders().some(o => o.orderId === orderId);
  const baechaStatus = _baechaStatus ?? (isCancelledInStore ? '거래취소' : undefined);
  // 취소 스토어 항목 — useState 초기화에 사용
  const _cancelEntryEarly = isCancelledInStore ? getCancelledOrders().find(o => o.orderId === orderId) : undefined;

  // Seeded deterministic helpers
  const seed = (n: number) => { let h = n ^ (n >>> 13); h = Math.imul(h, 0x9e3779b9|0); h ^= h>>>11; return ((h>>>0) % 1000000) / 1000000; };
  const rnd = (n: number, salt: number) => seed(rowIdx * 97 + salt + n);
  const pick = <T,>(arr: T[], salt: number): T => arr[Math.floor(rnd(0, salt) * arr.length)];

  // Row data from existing arrays
  const isSaleRow = rowIdx < 5000;
  // 매출·매입 상태를 같은 위상에서 pair로 뽑아 비현실 조합(수금대기+마감필요 등) 방지
  const STATUS_PAIRS_MODAL = [
    { sale:'마감필요',  purchase:'마감필요'  },
    { sale:'마감필요',  purchase:'정산대기'  },
    { sale:'정산대기',  purchase:'마감필요'  },
    { sale:'정산대기',  purchase:'정산대기'  },
    { sale:'정산대기',  purchase:'지급대기'  },
    { sale:'수금대기',  purchase:'지급대기'  },
    { sale:'수금대기',  purchase:'지급대기'  },
    { sale:'수금완료',  purchase:'지급완료'  },
    { sale:'수금완료',  purchase:'지급완료'  },
    { sale:'정산보류',  purchase:'정산보류'  },
    { sale:'정산대기',  purchase:'지급완료'  },
  ] as const;
  const _pair = STATUS_PAIRS_MODAL[rowIdx % STATUS_PAIRS_MODAL.length];
  const saleStatus     = _pair.sale;
  const purchaseStatus = _pair.purchase;
  const rowStatus = isSaleRow ? saleStatus : purchaseStatus;
  const shipper = SHIPPER_ROW_DATA[rowIdx % SHIPPER_ROW_DATA.length];
  const partner = PARTNER_ROW_DATA[rowIdx % PARTNER_ROW_DATA.length];
  const loadingDate = getLoadingDate312(rowIdx);

  // Deterministic generated data
  const SHIPPER_PERSONS = ['김민준','이서준','박도윤','최예준','정시우','강주원','윤하준'];
  const DRIVER_NAMES = ['이민호','박성준','최재원','정우진','한동현','오승기','강태풍','서준혁'];
  const PLATES = ['12아3456','34나5678','56다7890','78라9012','90마1234'];
  const PHONE_PREFIXES = ['010-1234','010-5678','010-9012','010-3456','010-7890'];
  const CARGO_TYPES_MODAL = ['카고','윙바디','탑차','리프트'];
  const CARGO_FEATURES    = ['상온','냉장','냉동'];
  const TON_TYPES = ['1톤','2.5톤','3.5톤','5톤','8톤'];
  const BILLING_METHODS = ['후불','선착불'];
  const GROUPS = ['기본그룹','A그룹','B그룹','판교팀','수원팀'];

  const shipperPerson = pick(SHIPPER_PERSONS, 1);
  const shipperContact = `${pick(PHONE_PREFIXES, 2)}-${String(Math.floor(rnd(0, 3)*9000+1000))}`;
  const partnerPerson = pick(SHIPPER_PERSONS, 4);
  const partnerContact = `${pick(PHONE_PREFIXES, 5)}-${String(Math.floor(rnd(0, 6)*9000+1000))}`;
  const driverName = pick(DRIVER_NAMES, 7);
  const plate = pick(PLATES, 8);
  const driverContact = `${pick(PHONE_PREFIXES, 9)}-${String(Math.floor(rnd(0,10)*9000+1000))}`;
  const tonType = pick(TON_TYPES, 12);
  const cargoTypeModal   = pick(CARGO_TYPES_MODAL, 11);
  const cargoFeature     = pick(CARGO_FEATURES, 84);
  const assignGroup = pick(GROUPS, 13);
  const billingMethod = pick(BILLING_METHODS, 14);
  const settlementType = billingMethod === '후불' ? pick(['별도정산', '예치금', '한도'], 15) : '현장결제';

  // Generate unload date (loadingDate + 1-3 days)
  const parseDate = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd); };
  const fmtDate = (d: Date) => { const yy=String(d.getFullYear()).slice(2); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${yy}.${mm}.${dd}`; };
  const loadDate = parseDate(loadingDate);
  const unloadDate = new Date(loadDate.getTime() + (Math.floor(rnd(0,16)*3)+1)*86400000);
  const unloadDateStr = fmtDate(unloadDate);

  // Load/unload locations
  const LOAD_LOCS = ['판교테크노밸리','강남구청역','분당수내역','수원역','용인터미널'];
  const UNLOAD_LOCS = ['광교물류','동탄물류','김포공항물류','인천항','부산항물류'];
  const LOAD_ADDRS = ['경기 성남시 삼평동','서울 강남구 역삼동','경기 성남시 정자동','경기 수원시 팔달구','경기 용인시 기흥구'];
  const UNLOAD_ADDRS = ['경기 수원시 영통구','경기 화성시 동탄','경기 김포시 걸포동','인천 중구 항동','부산 동구 초량동'];
  const loadLoc = pick(LOAD_LOCS, 17);
  const unloadLoc = pick(UNLOAD_LOCS, 18);
  const loadAddr = pick(LOAD_ADDRS, 19);
  const unloadAddr = pick(UNLOAD_ADDRS, 20);

  // 물품옵션 치수 (m)
  const dimW = ((Math.floor(rnd(0,60)*25)+5)/10).toFixed(1);
  const dimH = ((Math.floor(rnd(0,61)*20)+5)/10).toFixed(1);
  const dimD = ((Math.floor(rnd(0,62)*25)+5)/10).toFixed(1);

  // 차량옵션 거리/시간
  const distKm = Math.floor(rnd(0,63)*491)+10;
  const distMin = Math.floor(distKm * (rnd(0,64)*1.5+1.5));

  // 상차/하차 시간
  const loadHour = Math.floor(rnd(0,65)*14)+7;
  const loadMinVal = ([0,15,30,45] as const)[Math.floor(rnd(0,66)*4)];
  const loadTimeStr = `${String(loadHour).padStart(2,'0')} : ${String(loadMinVal).padStart(2,'0')}`;
  const unloadHour = Math.floor(rnd(0,67)*12)+9;
  const unloadMinVal = ([0,15,30,45] as const)[Math.floor(rnd(0,68)*4)];
  const unloadTimeStr = `${String(unloadHour).padStart(2,'0')} : ${String(unloadMinVal).padStart(2,'0')}`;

  // 상차/하차 담당자·연락처·메모
  const CONTACT_NAMES = ['이민수','김지영','박상호','최지현','정하윤','오승호','한수빈'];
  const loadManager  = pick(CONTACT_NAMES, 70);
  const loadContact2 = `${pick(PHONE_PREFIXES,71)}-${String(Math.floor(rnd(0,72)*9000+1000))}`;
  const unloadManager  = pick(CONTACT_NAMES, 73);
  const unloadContact2 = `${pick(PHONE_PREFIXES,74)}-${String(Math.floor(rnd(0,75)*9000+1000))}`;
  const LOAD_MEMOS   = ['냉동 유지 필수','취급주의 요망','팔렛트 반납 요망','지게차 대기 요청','포장 완료 후 상차'];
  const UNLOAD_MEMOS = ['입고 확인 필수','팔렛트 회수 요망','담당자 대기','2층 창고 하차','서명 후 하차'];
  const REQUESTS     = ['정시 도착 필수','문 앞 하차 부탁','기사님 연락 후 방문','운반 인원 지참','고객 서명 필요'];
  const OP_MEMOS     = ['기존 거래처 - 우선 처리','담당자 변경됨','월 정기 운송 건','단가 협의 완료','VIP 고객사'];
  const loadMemo     = pick(LOAD_MEMOS, 76);
  const unloadMemo   = pick(UNLOAD_MEMOS, 77);
  const requestText  = pick(REQUESTS, 78);
  const opMemoText   = pick(OP_MEMOS, 79);

  // 명세서 기준일
  const saleDocDate     = fmtDate(new Date(loadDate.getTime() + Math.floor(rnd(0,80)*8)*86400000));
  const purchaseDocDate = fmtDate(new Date(loadDate.getTime() + Math.floor(rnd(0,81)*8)*86400000));

  // 물품정보 (미들마일 운송 품목)
  const GOODS_LIST = [
    '냉장고 (양문형)', '세탁기 (드럼)', '에어컨 실외기', 'TV (75인치)', '노트북 박스세트',
    '냉동식품 (간편식)', '음료수 (생수 2L)', '식자재 (냉장육)', '과일류 (수입산)', '유제품 (우유·치즈)',
    '의류 (동절기)', '잡화 (생활용품)', '화장품 팔레트', '의약품 (OTC)', '의료기기 (소형)',
    '자동차 부품 (범퍼)', '타이어 (승용차용)', '철강재 (각관)', '합판·목재', '시멘트 포대',
    '가구 (책상·의자)', '주방기기 (오븐)', '건강기능식품', '화학원료 (포장재)', '포장재 (골판지)',
  ];
  const goodsName    = pick(GOODS_LIST, 82);
  const palletCount  = Math.floor(rnd(0,83)*19)+2;  // 2~20 파렛트

  // 작업장유형
  const WORK_TYPES = ['HUB','물류센터','배송센터','창고','공장','마트','편의점','아파트','오피스빌딩'];
  const loadWorkType   = pick(WORK_TYPES, 85);
  const unloadWorkType = pick(WORK_TYPES, 86);

  // 상세주소 (동·호수·층수)
  const DETAIL_ADDRS = [
    '101동 지하1층', 'B동 1층 하역장', '3층 입고팀', 'A동 지하2층 냉동창고',
    '물류동 2층', '101호 앞', '하역장 B-3', '4층 물류팀', '지하1층 창고',
    '2층 입출고장', 'C동 1층', '101동 지상1층', '하역장 입구', '3층 냉장창고',
  ];
  const loadDetailAddr   = pick(DETAIL_ADDRS, 87);
  const unloadDetailAddr = pick(DETAIL_ADDRS, 88);

  // Status badge logic
  const isMagamPilyo = rowStatus === '마감필요';
  const statusBadgeText = isMagamPilyo
    ? (seed(rowIdx * 31 + 99) > 0.5 ? '배차 취소' : '오더 취소')
    : '운송 완료';

  const Inp = ({ placeholder, width, bg, value, onChange }: { placeholder?: string; width?: number; bg?: string; value?: string; onChange?: (v: string) => void }) => (
    <input
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{ width: width ?? 120, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background: bg ?? '#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }}
    />
  );

  const selArrow = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M0 0L5 5L10 0' stroke='%231A1A1A' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  const Sel = ({ options, width, bg }: { options: string[]; width?: number; bg?: string }) => (
    <select style={{ width: width ?? 100, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background: `${selArrow} no-repeat right 8px center, ${bg ?? '#FFFFFF'}`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  const DateField = ({ value, bg }: { value: string; bg?: string }) => (
    <div style={{ width:100, height:28, border:'1px solid #DFDFDF', borderRadius:2, background: bg ?? '#E8F3FE', padding:'0 8px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, cursor:'pointer', boxSizing:'border-box' }}>
      <span style={{ fontSize:15, color:'#1A1A1A', letterSpacing:'-0.02em', fontFamily:ff }}>{value}</span>
      <svg width="11" height="12" viewBox="0 0 11 12" fill="none" style={{ flexShrink:0 }}>
        <rect x="0.65" y="1.16" width="9.7" height="9.7" rx="1.06" stroke="#1A1A1A" strokeWidth="1.3"/>
        <path d="M3.43 0.5V2.2M7.57 0.5V2.2" stroke="#1A1A1A" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="3.43" y1="6.5" x2="7.57" y2="6.5" stroke="#1A1A1A" strokeWidth="1.3" strokeLinecap="round"/>
        <rect x="0.86" y="1.94" width="9.29" height="1.71" fill="#1A1A1A"/>
      </svg>
    </div>
  );

  const Radio = ({ checked, label, onChange }: { checked: boolean; label: string; onChange?: () => void }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }} onClick={onChange}>
      <div style={{ width:18, height:18, borderRadius:'50%', border: checked ? 'none' : '1px solid #999', background: checked ? '#1A1A1A' : '#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {checked && <div style={{ width:6.75, height:6.75, borderRadius:'50%', background:'#FFFFFF' }} />}
      </div>
      <span style={{ fontSize:15, fontWeight: checked ? 700 : 400, color:'#1A1A1A', letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );

  const Chk = ({ checked, label, onChange }: { checked: boolean; label: string; onChange?: () => void }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }} onClick={onChange}>
      {checked ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0 }}>
          <rect width="18" height="18" rx="2" fill="#1A1A1A"/>
          <path d="M5.625 9L7.875 11.25L12.375 6.75" stroke="#F9F9F9" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <div style={{ width:18, height:18, border:'1px solid #999', borderRadius:2, background:'#FFFFFF', flexShrink:0 }} />
      )}
      <span style={{ fontSize:15, fontWeight:700, color:'#1A1A1A', letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );

  const lbl: React.CSSProperties = { fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', width:60, flexShrink:0 };
  const row: React.CSSProperties = { display:'flex', alignItems:'center', gap:4, minHeight:28 };
  const divSep = <div style={{ width:1, height:16, background:'#DFDFDF', flexShrink:0 }} />;

  // State
  const [dispatchType, setDispatchType] = useState<'공유배차'|'직배차'|'협력사위탁'|'장부기록'>('공유배차');
  const _eqOpts = ['선택 안 함','지게차','수작업','호이스트','크레인','컨베이어'];
  const [cargoType, setCargoType] = useState<'독차'|'혼적'>(rnd(0,50) > 0.3 ? '독차' : '혼적');
  const [tripType, setTripType] = useState<'편도'|'왕복'>(rnd(0,51) > 0.35 ? '편도' : '왕복');
  const [dimMode, setDimMode] = useState<'가로/세로/높이'|'CBM'>(rnd(0,52) > 0.25 ? '가로/세로/높이' : 'CBM');
  const [loadEquip, setLoadEquip] = useState<string>(_eqOpts[Math.floor(rnd(0,53)*_eqOpts.length)]);
  const [unloadEquip, setUnloadEquip] = useState<string>(_eqOpts[Math.floor(rnd(0,54)*_eqOpts.length)]);
  const [loadNoTime, setLoadNoTime] = useState(rnd(0,55) > 0.75);
  const [unloadNoTime, setUnloadNoTime] = useState(rnd(0,56) > 0.75);
  const [tonOnly, setTonOnly] = useState(false);
  // 기본운임 청구·배차금액 존재 여부 상태 목록
  const SALE_BILLING_STATUSES     = ['정산대기','수금대기','수금완료','정산보류'];
  const PURCHASE_DISPATCH_STATUSES = ['정산대기','지급대기','지급완료','정산보류'];
  // 금액확인여부 초기값: 청구금액/배차금액 존재 여부로 결정
  const _initIsSaleMagam     = saleStatus === '마감필요';
  const _initIsPurchaseMagam = purchaseStatus === '마감필요';
  const _initShowHwachae     = _initIsSaleMagam || _initIsPurchaseMagam;
  const _initHasBilling      = SALE_BILLING_STATUSES.includes(saleStatus);
  const _initHasDispatch     = PURCHASE_DISPATCH_STATUSES.includes(purchaseStatus);
  const _initBillingAmt      = _initHasBilling  ? Math.floor(rnd(0,21)*20+10)*10000 : 0;
  const _initDispatchAmt     = _initHasDispatch ? Math.floor(rnd(0,23)*20+10)*10000 : 0;
  const _initHwacheaBilling  = _initIsSaleMagam   ? Math.floor(rnd(0,30)*20+10)*1000 : 0;
  const _initHwacheaDispatch = _initIsPurchaseMagam ? Math.floor(rnd(0,31)*20+10)*1000 : 0;
  // 취소 오더: 스토어의 청구/배차금액>0 AND 정산대상='대상'이면 자동 체크
  const _initCloseSale = isCancelledInStore
    ? (!!_cancelEntryEarly && _cancelEntryEarly.hwaBilling > 0 && _cancelEntryEarly.saleCate === '대상')
    : cancelCloseState != null ? cancelCloseState.closeSale : (!_initIsSaleMagam && _initHasBilling);
  const _initClosePurchase = isCancelledInStore
    ? (!!_cancelEntryEarly && _cancelEntryEarly.hwaDispatch > 0 && _cancelEntryEarly.purchaseCate === '대상')
    : cancelCloseState != null ? cancelCloseState.closePurchase : (!_initIsPurchaseMagam && _initHasDispatch);
  const [closeSale, setCloseSale] = useState(_initCloseSale);
  const [closePurchase, setClosePurchase] = useState(_initClosePurchase);
  // cancelCloseState가 변경될 때마다 state 동기화 (key 기반 remount 보완)
  useEffect(() => {
    if (isCancelledInStore) {
      const entry = getCancelledOrders().find(o => o.orderId === orderId);
      setCloseSale(!!entry && entry.hwaBilling > 0 && entry.saleCate === '대상');
      setClosePurchase(!!entry && entry.hwaDispatch > 0 && entry.purchaseCate === '대상');
    } else if (cancelCloseState != null) {
      setCloseSale(cancelCloseState.closeSale);
      setClosePurchase(cancelCloseState.closePurchase);
    }
  }, [cancelCloseState]);

  // 취소된 오더에서 청구금액확인 or 배차금액확인 체크 시 → 정산대기 전달
  useEffect(() => {
    if (isCancelledInStore && closeSale) {
      onStatusChange?.('정산대기_sale');
    }
  }, [closeSale]);
  useEffect(() => {
    if (isCancelledInStore && closePurchase) {
      onStatusChange?.('정산대기_purchase');
    }
  }, [closePurchase]);

  const equipOpts = _eqOpts;

  const modalContent = (
    <div style={__pageMode ? { width:'100%', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' } : { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999 }} onClick={__pageMode ? undefined : onClose}>
      <div style={{ width: __pageMode ? '100%' : 1634, flex: __pageMode ? '1 1 0' : undefined, background:'#FFFFFF', borderRadius:__pageMode ? 0 : 12, display:'flex', flexDirection:'column', fontFamily:ff, maxHeight: __pageMode ? '100%' : '95vh', overflowY:'auto', boxShadow:'none' }} onClick={__pageMode ? undefined : (e=>e.stopPropagation())}>

        {/* HEADER — 배차관리 페이지(pageMode)에서는 숨김 */}
        {!__pageMode && (
        <div style={{ padding:'20px 24px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #E4E5E9', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', fontFamily:"'Pretendard GOV:Bold', sans-serif" }}>오더 상세</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#454B55', background:'#EBEDEF', borderRadius:4, padding:'0 6px', height:26, display:'inline-flex', alignItems:'center' }}>{orderId}</span>
          </div>
          <div onClick={onClose} style={{ cursor:'pointer', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        )}

        {/* BODY */}
        <div style={{ background:'#F9FAFC', padding:'12px 0 12px 16px', flex:1, display:'flex', flexDirection:'row' }}>

          {/* LEFT SECTION */}
          <div style={{ width:758, display:'flex', flexDirection:'column', gap:8 }}>

            {/* Row 1: 화주사 */}
            <div style={row}>
              <span style={lbl}>화주사</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, flex:1, minWidth:0 }}>
                <input defaultValue={shipper} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <input defaultValue={`ORD-${rowIdx.toString().padStart(5,'0')}`} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <input defaultValue={shipperPerson} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <input defaultValue={shipperContact} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
              </div>
            </div>

            {/* Row 2: 요청협력사 */}
            <div style={row}>
              <span style={lbl}>요청협력사</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, flex:1, minWidth:0 }}>
                <input defaultValue={partner} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <input defaultValue={partnerPerson} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <input defaultValue={partnerContact} style={{ height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', width:'100%' }} />
                <div />
              </div>
            </div>

            {/* Row 3: 상차지명 */}
            <div style={row}>
              <span style={lbl}>상차지명</span>
              <div style={{ display:'flex', gap:6, alignItems:'center', flex:1, minWidth:0 }}>
                <input defaultValue={loadLoc} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={loadWorkType} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E6E6E6', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={loadAddr} style={{ flex:2, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={loadDetailAddr} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, cursor:'pointer' }}><rect x="0.5" y="0.5" width="19" height="27" rx="1.5" fill="white"/><rect x="0.5" y="0.5" width="19" height="27" rx="1.5" stroke="#CCCCCC"/><path d="M9.85858 8.64142L6.34142 12.1586C6.21543 12.2846 6.30466 12.5 6.48284 12.5H13.5172C13.6953 12.5 13.7846 12.2846 13.6586 12.1586L10.1414 8.64142C10.0633 8.56332 9.93668 8.56332 9.85858 8.64142Z" fill="#2C6EDB" fillOpacity="0.8"/><path d="M10.1414 19.3586L13.6586 15.8414C13.7846 15.7154 13.6953 15.5 13.5172 15.5L6.48284 15.5C6.30466 15.5 6.21543 15.7154 6.34142 15.8414L9.85858 19.3586C9.93668 19.4367 10.0633 19.4367 10.1414 19.3586Z" fill="#2C6EDB" fillOpacity="0.8"/></svg>
                {/* 경유 자리 spacer (하차지명과 정렬 맞춤) */}
                <div style={{ width:44, flexShrink:0 }} />
              </div>
            </div>

            {/* Row 4: 하차지명 */}
            <div style={row}>
              <span style={lbl}>하차지명</span>
              <div style={{ display:'flex', gap:6, alignItems:'center', flex:1, minWidth:0 }}>
                <input defaultValue={unloadLoc} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={unloadWorkType} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E6E6E6', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={unloadAddr} style={{ flex:2, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <input defaultValue={unloadDetailAddr} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, cursor:'pointer' }}><rect x="0.5" y="0.5" width="19" height="27" rx="1.5" fill="white"/><rect x="0.5" y="0.5" width="19" height="27" rx="1.5" stroke="#CCCCCC"/><path d="M9.85858 8.64142L6.34142 12.1586C6.21543 12.2846 6.30466 12.5 6.48284 12.5H13.5172C13.6953 12.5 13.7846 12.2846 13.6586 12.1586L10.1414 8.64142C10.0633 8.56332 9.93668 8.56332 9.85858 8.64142Z" fill="#2C6EDB" fillOpacity="0.8"/><path d="M10.1414 19.3586L13.6586 15.8414C13.7846 15.7154 13.6953 15.5 13.5172 15.5L6.48284 15.5C6.30466 15.5 6.21543 15.7154 6.34142 15.8414L9.85858 19.3586C9.93668 19.4367 10.0633 19.4367 10.1414 19.3586Z" fill="#2C6EDB" fillOpacity="0.8"/></svg>
                <button style={{ width:44, height:28, border:'1px solid #CCCCCC', borderRadius:2, background:'#FFFFFF', cursor:'pointer', fontSize:15, color:'#1A1A1A', flexShrink:0 }}>경유</button>
              </div>
            </div>

            {/* Row 5: 요청차량 */}
            <div style={row}>
              <span style={lbl}>요청차량</span>
              <div style={{ display:'flex', gap:6, alignItems:'center', flex:1 }}>
                <select defaultValue={tonType} style={{ flex:1, minWidth:0, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #CCCCCC', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
                  {['1톤','2.5톤','3.5톤','5톤','8톤'].map(o=><option key={o}>{o}</option>)}
                </select>
                <select defaultValue={cargoTypeModal} style={{ flex:1, minWidth:0, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #CCCCCC', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
                  {['카고','윙바디','탑차','리프트'].map(o=><option key={o}>{o}</option>)}
                </select>
                <select defaultValue={cargoFeature} style={{ flex:1, minWidth:0, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #CCCCCC', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
                  {['상온','냉장','냉동','호출불가','우선배차'].map(o=><option key={o}>{o}</option>)}
                </select>
                <span style={{ fontSize:13, color:'#666', flexShrink:0 }}>총 중량</span>
                {/* 총중량 + tO SVG 버튼 */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <svg width="100" height="28" viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor:'pointer', display:'block' }}>
                    <g clipPath="url(#clip0_ton)">
                      <rect width="100" height="28" rx="2" fill="#E8F3FE"/>
                      <path d="M50.9019 8.77734V19.5H49.5469V10.4692L46.8149 11.4653V10.2422L50.6895 8.77734H50.9019Z" fill="#1A1A1A"/>
                      <mask id="path-5-inside-1_ton" fill="white">
                        <path d="M62 0H98C99.1046 0 100 0.895431 100 2V26C100 27.1046 99.1046 28 98 28H62V0Z"/>
                      </mask>
                      <path d="M62 0H98C99.1046 0 100 0.895431 100 2V26C100 27.1046 99.1046 28 98 28H62V0Z" fill="#F9F9F9"/>
                      <path d="M62 0H100H62M62 0M100 28H62H100M61 28V0H63V28H61ZM63 28M100 0V28V0" fill="#CCCCCC" mask="url(#path-5-inside-1_ton)"/>
                      <path d="M76.1606 11.5752V13.0693H71.5464V11.5752H76.1606ZM72.689 9.61963H74.7983V17.1123C74.7983 17.3418 74.8276 17.5176 74.8862 17.6396C74.9497 17.7617 75.0425 17.8472 75.1646 17.896C75.2866 17.9399 75.4404 17.9619 75.626 17.9619C75.7578 17.9619 75.875 17.957 75.9775 17.9473C76.085 17.9326 76.1753 17.918 76.2485 17.9033L76.2559 19.4561C76.0752 19.5146 75.8799 19.561 75.6699 19.5952C75.46 19.6294 75.228 19.6465 74.9741 19.6465C74.5103 19.6465 74.105 19.5708 73.7583 19.4194C73.4165 19.2632 73.1528 19.0142 72.9673 18.6724C72.7817 18.3306 72.689 17.8813 72.689 17.3247V9.61963Z" fill="#1A1A1A"/>
                      <path d="M81.5391 16.318C80.2978 14.9834 80.3197 12.8915 81.6093 11.5925C82.1147 11.0812 82.7719 10.747 83.4828 10.6398L83.4449 9.5C82.4469 9.6205 81.5191 10.0752 80.8125 10.7902C79.0845 12.5298 79.0636 15.339 80.745 17.1182L79.7896 18.0796L82.8133 18.2448L82.805 15.0432L81.5391 16.318ZM85.1867 9.75518L85.1949 12.9568L86.4609 11.6825C87.7022 13.0182 87.6802 15.1102 86.3906 16.408C85.8853 16.9195 85.2281 17.2537 84.5172 17.3607L84.555 18.5C85.553 18.3793 86.4809 17.9249 87.188 17.2104C88.9155 15.4696 88.9363 12.6604 87.2549 10.8824L88.2103 9.91982L85.1867 9.75518Z" fill="#1A1A1A"/>
                    </g>
                    <rect x="0.5" y="0.5" width="99" height="27" rx="1.5" stroke="#CCCCCC"/>
                    <defs>
                      <clipPath id="clip0_ton">
                        <rect width="100" height="28" rx="2" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <Chk checked={tonOnly} label="지정 톤수만 배차" onChange={() => setTonOnly(p=>!p)} />
              </div>
            </div>

            {/* Row 6: 물품정보 */}
            <div style={row}>
              <span style={lbl}>물품정보</span>
              <div style={{ display:'flex', gap:6, alignItems:'center', flex:1, minWidth:0 }}>
                <input defaultValue={goodsName} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                <span style={{ fontSize:13, color:'#999', flexShrink:0 }}>총 갯수</span>
                {/* 통합 갯수+단위 컴포넌트 (135px) - SVG 스펙 */}
                <div style={{ width:135, height:28, border:'1px solid #CCCCCC', borderRadius:2, display:'flex', overflow:'hidden', flexShrink:0, boxSizing:'border-box' }}>
                  {/* 좌측: 숫자 입력 (흰 배경) */}
                  <input defaultValue={palletCount} style={{ width:63, height:'100%', padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'none', outline:'none', boxSizing:'border-box', textAlign:'right' }} />
                  {/* 우측: 단위 드롭다운 (회색 #F9F9F9 + 커스텀 화살표) */}
                  <div style={{ width:1, height:'100%', background:'#CCCCCC', flexShrink:0 }} />
                  <select style={{ flex:1, height:'100%', padding:'0 24px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 6px center, #F9F9F9`, border:'none', outline:'none', cursor:'pointer', boxSizing:'border-box', appearance:'none' as const }}>
                    {['파렛트','박스','개','기타'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 7: 배차차량 */}
            <div style={{ ...row, alignItems:'flex-start' }}>
              <span style={{ ...lbl, paddingTop:8 }}>배차차량</span>
              <div style={{ width:694, border:'1px solid #E6E6E6', borderRadius:4, padding:'8px 12px', display:'flex', flexDirection:'column', gap:6 }}>
                {/* Row A: radio group */}
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  {(['공유배차','직배차','협력사위탁','장부기록'] as const).map(v => (
                    <Radio key={v} checked={dispatchType===v} label={v} onChange={() => setDispatchType(v)} />
                  ))}
                </div>
                {/* Row B: inputs */}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input defaultValue={plate} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                  <input defaultValue={driverName} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                  <input defaultValue={driverContact} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                  <select defaultValue={tonType} style={{ flex:1, minWidth:0, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #FFFFFF`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
                    {['1톤','2.5톤','3.5톤','5톤','8톤'].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <select defaultValue={cargoTypeModal} style={{ flex:1, minWidth:0, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #FFFFFF`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>
                    {['카고','윙바디','탑차','리프트'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {/* Row C: note */}
                <div style={{ display:'flex', alignItems:'center', gap:2, height:20 }}>
                  {/* ⓘ 아이콘 */}
                  <div style={{ width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7.35" stroke="#999999" strokeWidth="1.3"/>
                      <rect x="7.04" y="4.92" width="1.92" height="7.16" rx="0.96" fill="#999999"/>
                      <circle cx="7.96" cy="3.6" r="0.96" fill="#999999"/>
                    </svg>
                  </div>
                  {/* 텍스트 */}
                  <span style={{ fontSize:14, fontWeight:400, color:'#999999', letterSpacing:'-0.02em', lineHeight:'20px', fontFamily:"'Pretendard GOV', sans-serif", whiteSpace:'nowrap' }}>배차완료 시 차량정보가 자동입력됩니다.</span>
                </div>
              </div>
            </div>

            {/* Row 8: 정산방법 */}
            <div style={row}>
              <span style={lbl}>정산방법</span>
              <div style={{ display:'flex', gap:6, alignItems:'center', flex:1 }}>
                <select defaultValue={billingMethod} style={{ width:140, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>{['후불','선착불'].map(o=><option key={o}>{o}</option>)}</select>
                <select defaultValue={settlementType} style={{ width:140, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>{['별도정산','예치금','한도','현장결제'].map(o=><option key={o}>{o}</option>)}</select>
                <span style={{ fontSize:13, color:'#666', flexShrink:0 }}>인수증</span>
                <Sel options={['필요 없음','필요','완료']} width={140} bg="#E8F3FE" />
                <div style={{ flex:1 }} />
                <svg width="138" height="28" viewBox="0 0 138 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, cursor:'pointer', marginRight:16 }}>
                  <rect x="0.5" y="0.5" width="137" height="27" rx="1.5" fill="#F2F2F2"/>
                  <rect x="0.5" y="0.5" width="137" height="27" rx="1.5" stroke="#DFDFDF"/>
                  <path d="M14.9527 10.83H17.2537V7.814H18.3327V14.756H17.2537V11.701H14.9527V10.83ZM15.6027 13.482L15.0697 14.314C13.7697 13.846 12.7687 12.884 12.2617 11.688C11.7677 13.04 10.6887 14.132 9.3237 14.652L8.7647 13.807C10.5067 13.17 11.7027 11.597 11.7027 9.92V9.517H9.1027V8.659H15.3297V9.517H12.7687V9.92C12.7687 11.415 13.9127 12.884 15.6027 13.482ZM14.4847 18.63C16.2397 18.63 17.3057 18.136 17.3057 17.291C17.3057 16.446 16.2397 15.939 14.4847 15.939C12.7297 15.939 11.6637 16.446 11.6637 17.291C11.6637 18.136 12.7297 18.63 14.4847 18.63ZM14.4847 15.12C16.8767 15.12 18.3717 15.913 18.3717 17.291C18.3717 18.669 16.8767 19.462 14.4847 19.462C12.0927 19.462 10.5977 18.669 10.5977 17.291C10.5977 15.913 12.0927 15.12 14.4847 15.12ZM27.2237 13.664L26.6907 14.509C25.3777 14.028 24.3637 13.053 23.8437 11.831C23.3627 13.209 22.3227 14.275 20.9317 14.795L20.3727 13.95C22.1537 13.313 23.2847 11.753 23.2847 9.946V8.503H24.3507V9.972C24.3507 11.571 25.5077 13.053 27.2237 13.664ZM23.3107 15.588V18.331H29.9797V19.202H22.2447V15.588H23.3107ZM29.4727 11.376H31.1887V12.26H29.4727V16.407H28.4067V7.788H29.4727V11.376ZM36.9597 13.053V11.129H33.6577V13.053H36.9597ZM37.9997 8.542V13.911H32.6047V8.542H33.6577V10.297H36.9597V8.542H37.9997ZM37.4667 18.617C39.1827 18.617 40.2357 18.123 40.2357 17.291C40.2357 16.459 39.1827 15.978 37.4667 15.978C35.7247 15.978 34.6847 16.459 34.6847 17.291C34.6847 18.123 35.7247 18.617 37.4667 18.617ZM37.4667 15.12C39.8327 15.12 41.3017 15.913 41.3017 17.291C41.3017 18.669 39.8327 19.462 37.4667 19.462C35.0877 19.462 33.6187 18.669 33.6187 17.291C33.6187 15.913 35.0877 15.12 37.4667 15.12ZM41.1717 10.739H42.9007V11.623H41.1717V14.821H40.1057V7.801H41.1717V10.739ZM52.3637 18.435V16.979H47.0077V18.435H52.3637ZM52.3637 16.147V14.73H53.4167V19.293H45.9547V14.73H47.0077V16.147H52.3637ZM48.6067 12.871V11.025H45.4607V12.871H48.6067ZM52.3507 7.814H53.4297V14.184H52.3507V11.545H49.6597V13.742H44.4077V8.412H45.4607V10.193H48.6067V8.412H49.6597V10.674H52.3507V7.814ZM59.8155 9.25781L55.9625 19.2935H54.9532L58.8126 9.25781H59.8155ZM65.8968 8.958C64.1158 8.958 62.9328 9.517 62.9328 10.44C62.9328 11.35 64.1158 11.909 65.8968 11.909C67.6908 11.909 68.8608 11.35 68.8608 10.44C68.8608 9.517 67.6908 8.958 65.8968 8.958ZM65.8968 12.78C63.4268 12.78 61.8148 11.883 61.8148 10.44C61.8148 8.997 63.4268 8.1 65.8968 8.1C68.3668 8.1 69.9788 8.997 69.9788 10.44C69.9788 11.883 68.3668 12.78 65.8968 12.78ZM63.0368 15.796V18.318H70.0308V19.202H61.9708V15.796H63.0368ZM60.6188 13.716H71.1878V14.587H66.5338V16.94H65.4548V14.587H60.6188V13.716ZM80.8327 7.814H81.8987V14.483H80.8327V7.814ZM74.3587 15.107H81.8987V19.306H74.3587V15.107ZM80.8587 15.952H75.3987V18.448H80.8587V15.952ZM75.6327 8.425C77.4007 8.425 78.6877 9.53 78.6877 11.142C78.6877 12.754 77.4007 13.859 75.6327 13.859C73.8777 13.859 72.6037 12.754 72.6037 11.142C72.6037 9.53 73.8777 8.425 75.6327 8.425ZM75.6327 9.309C74.4757 9.309 73.6437 10.076 73.6437 11.142C73.6437 12.221 74.4757 12.975 75.6327 12.975C76.8027 12.975 77.6477 12.221 77.6477 11.142C77.6477 10.076 76.8027 9.309 75.6327 9.309ZM88.2553 11.493C88.2553 12.637 89.1133 13.443 90.2573 13.443C91.4013 13.443 92.2593 12.637 92.2593 11.493C92.2593 10.349 91.4013 9.543 90.2573 9.543C89.1133 9.543 88.2553 10.349 88.2553 11.493ZM93.2993 11.493C93.2993 13.183 91.9993 14.366 90.2573 14.366C88.5153 14.366 87.2153 13.183 87.2153 11.493C87.2153 9.803 88.5153 8.62 90.2573 8.62C91.9993 8.62 93.2993 9.803 93.2993 11.493ZM89.8543 15.51V18.331H96.5623V19.202H88.7883V15.51H89.8543ZM96.0423 11.35H97.7583V12.234H96.0423V16.381H94.9763V7.801H96.0423V11.35ZM100.331 9.218V15.51C101.449 15.497 102.684 15.419 104.075 15.146L104.179 16.069C102.606 16.368 101.267 16.433 100.006 16.433H99.2653V9.218H100.331ZM107.559 7.801H108.586V19.449H107.559V13.43H105.908V18.864H104.907V8.061H105.908V12.546H107.559V7.801Z" fill="#333333"/>
                  <circle cx="122" cy="14" r="7.5" fill="#222222" fillOpacity="0.4"/>
                  <path d="M121.093 15.5375H122.523V15.3096C122.523 14.7815 122.722 14.5036 123.437 14.0756C124.196 13.6142 124.588 13.0306 124.588 12.1968V12.1912C124.588 10.9183 123.566 10.04 122.034 10.04C120.383 10.04 119.463 11.0017 119.42 12.3079V12.3635H120.878L120.883 12.3191C120.915 11.7465 121.319 11.3296 121.937 11.3296C122.545 11.3296 122.959 11.7076 122.959 12.2412V12.2468C122.959 12.7637 122.749 13.0417 122.055 13.4697C121.313 13.9199 121.033 14.4258 121.087 15.2151L121.093 15.5375ZM121.829 18.2C122.319 18.2 122.711 17.8165 122.711 17.3273C122.711 16.8382 122.319 16.4546 121.829 16.4546C121.345 16.4546 120.953 16.8382 120.953 17.3273C120.953 17.8165 121.345 18.2 121.829 18.2Z" fill="white"/>
                </svg>
              </div>
            </div>

            {/* Row 9: 기본운임 */}
            {(() => {
              const isSaleMagam = saleStatus === '마감필요';
              const isPurchaseMagam = purchaseStatus === '마감필요';
              // 배차관리에서 baechaStatus가 주입된 경우: 취소/거래취소=회차비 있음, 그 외=없음
              const showHwachae = baechaStatus != null
                ? (baechaStatus === '취소' || baechaStatus === '거래취소')
                : (isSaleMagam || isPurchaseMagam);
              // 기본운임 청구금액: 매출 상태가 청구 대상 목록에 있고, 회차비 없는 경우에만
              const hasBilling  = SALE_BILLING_STATUSES.includes(saleStatus);
              const hasDispatch = PURCHASE_DISPATCH_STATUSES.includes(purchaseStatus);
              const billingAmt  = (!showHwachae && hasBilling)  ? Math.floor(rnd(0,21)*20+10)*10000 : 0;
              const dispatchAmt = (!showHwachae && hasDispatch) ? Math.floor(rnd(0,23)*20+10)*10000 : 0;
              const profitAmt = billingAmt - dispatchAmt;
              // 취소 스토어에서 실제 입력값 읽기
              const _cancelEntry = getCancelledOrders().find(o => o.orderId === orderId);
              const hwacheaBilling  = _cancelEntry ? _cancelEntry.hwaBilling  : (isSaleMagam    ? Math.floor(rnd(0,30)*20+10)*1000 : 0);
              const hwacheaDispatch = _cancelEntry ? _cancelEntry.hwaDispatch : (isPurchaseMagam ? Math.floor(rnd(0,31)*20+10)*1000 : 0);
              const hwacheaSaleCate     = _cancelEntry ? _cancelEntry.saleCate     : '대상';
              const hwacheaPurchaseCate = _cancelEntry ? _cancelEntry.purchaseCate : '미대상';
              const hwacheaProfit = hwacheaBilling - hwacheaDispatch;
              const insureAmt = Math.floor(rnd(0,40)*5+1)*100;
              const payAmt = Math.floor(rnd(0,41)*500+500)*100;
              const profitRate = billingAmt > 0 ? Math.round((profitAmt / billingAmt) * 100) : 0;
              const fmt = (n:number) => n.toLocaleString() + '원';
              const inputSt = (bg:string):React.CSSProperties => ({ width:140, height:28, padding:'6px 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:bg, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', textAlign:'right' });
              const sepSt:React.CSSProperties = { display:'inline-block', width:1, height:12, background:'rgba(115,140,95,0.4)', flexShrink:0 };

              /* 기본운임 3셀 입력행 */
              const fareRow = (
                <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:16, width:694, height:28 }}>
                  <div style={{ position:'relative', width:598, height:28 }}>
                    <div style={{ position:'absolute', left:0, top:0, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:52, fontSize:14, color:'#1A1A1A', letterSpacing:'-0.02em', display:'flex', alignItems:'center' }}>청구금액</span>
                      <input defaultValue={fmt(billingAmt)} style={inputSt('#E8F3FE')} />
                    </div>
                    <div style={{ position:'absolute', left:208, top:0, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:52, fontSize:14, color:'#1A1A1A', letterSpacing:'-0.02em', display:'flex', alignItems:'center' }}>배차금액</span>
                      <input defaultValue={fmt(dispatchAmt)} style={inputSt('#E8F3FE')} />
                    </div>
                    <div style={{ position:'absolute', left:416, top:0, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:38, fontSize:14, color:'#1A1A1A', letterSpacing:'-0.02em', display:'flex', alignItems:'center' }}>수익</span>
                      <input defaultValue={fmt(profitAmt)} disabled style={inputSt('#E6E6E6')} />
                    </div>
                  </div>
                  <button style={{ fontSize:14, color:'#666666', background:'none', border:'none', cursor:'pointer', letterSpacing:'-0.02em', padding:'6px 0', whiteSpace:'nowrap', width:80 }}>운임 추가하기</button>
                </div>
              );

              /* 기사정보 행 (초록색 텍스트) */
              const driverRow = (
                <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:6, fontSize:13, color:'#738C5F', letterSpacing:'-0.02em' }}>
                  <span>기사 산재보험료 {insureAmt.toLocaleString()}원</span>
                  <span style={sepSt} />
                  <span>기사 지급금(세액포함) {payAmt.toLocaleString()}원</span>
                  <span style={sepSt} />
                  <span>수익률 {profitRate}%</span>
                </div>
              );

              if (!showHwachae) {
                /* ── 회차비 없음: 기본운임 + 초록색 텍스트만 표시 ── */
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, width:758 }}>
                    <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:4, height:28 }}>
                      <span style={{ width:60, height:28, fontSize:13, fontWeight:700, color:'#666666', letterSpacing:'-0.01em', display:'flex', alignItems:'center', flexShrink:0 }}>기본운임</span>
                      {fareRow}
                    </div>
                    <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:4 }}>
                      <span style={{ width:60, fontSize:14, fontWeight:700, color:'#666666', opacity:0, flexShrink:0 }}>기본운임</span>
                      {driverRow}
                    </div>
                  </div>
                );
              }

              /* ── 회차비 있음: 파란 박스 + 기본운임(0원) + 추가운임 섹션 ── */
              const hB = hwacheaBilling, hD = hwacheaDispatch, hP = hwacheaProfit;
              // 항상 청구·배차 둘 다 표시 (0원도 포함)
              const hwDesc = `청구금액 ${fmt(hB)} (${hwacheaSaleCate === '대상' ? '정산대상' : '정산미대상'}), 배차금액 ${fmt(hD)} (${hwacheaPurchaseCate === '대상' ? '정산대상' : '정산미대상'})`;
              // 3컬럼 균등 폭 + 우측 정렬 + 우측 여백
              const tblGrid:React.CSSProperties = { display:'grid', gridTemplateColumns:'60px 1fr 1fr 1fr', alignItems:'center', paddingRight:150 };
              const tblLb:React.CSSProperties  = { fontSize:13, fontWeight:400, color:'#1A1A1A', letterSpacing:'-0.02em', lineHeight:'19px' };
              const tblV = (sz:number):React.CSSProperties => ({ fontSize:sz, fontWeight:700, color:'#1A1A1A', letterSpacing:'-0.02em', lineHeight: sz===15 ? '21px' : '19px', textAlign:'right' });
              const dashed = <div style={{ borderTop:'1px dashed #DFDFDF', margin:'0 -12px' }} />;
              const solid  = <div style={{ borderTop:'1px solid #DFDFDF',  margin:'0 -12px' }} />;

              return (
                <div style={{ display:'flex', flexDirection:'column', gap:6, width:758 }}>
                  {/* 기본운임 행 — 파란 박스 밖 */}
                  <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:4, height:28 }}>
                    <span style={{ width:60, height:28, fontSize:13, fontWeight:700, color:'#666666', letterSpacing:'-0.01em', display:'flex', alignItems:'center', flexShrink:0 }}>기본운임</span>
                    {fareRow}
                  </div>
                  {/* 추가운임 박스 — 60px spacer + 파란 박스 */}
                  <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:4 }}>
                    <span style={{ width:60, flexShrink:0, opacity:0 }}>기본운임</span>
                  <div style={{ flex:1, background:'#EFF2F6', borderRadius:4, padding:'8px 12px', display:'flex', flexDirection:'column', gap:8, boxSizing:'border-box' }}>
                    {/* 회차비 헤더: "회차비" + 금액 설명 */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, height:19 }}>
                      <span style={{ fontSize:13, fontWeight:400, color:'#1A1A1A', letterSpacing:'-0.02em', flexShrink:0 }}>회차비</span>
                      <span style={{ fontSize:13, fontWeight:400, color:'#666666', letterSpacing:'-0.02em' }}>{hwDesc}</span>
                    </div>
                    {dashed}
                    {/* 공급가액 */}
                    <div style={tblGrid}>
                      <span style={tblLb}>공급가액</span>
                      <span style={tblV(13)}>{fmt(hB)}</span>
                      <span style={tblV(13)}>{fmt(hD)}</span>
                      <span style={tblV(13)}>{fmt(hP)}</span>
                    </div>
                    {/* 세액 */}
                    <div style={{ ...tblGrid, marginTop:-2 }}>
                      <span style={tblLb}>세액</span>
                      <span style={tblV(13)}>{fmt(Math.round(hB*0.1))}</span>
                      <span style={tblV(13)}>{fmt(Math.round(hD*0.1))}</span>
                      <span style={tblV(13)}>{fmt(Math.round(hP*0.1))}</span>
                    </div>
                    {dashed}
                    {/* 합계 (15px bold) */}
                    <div style={tblGrid}>
                      <span style={tblLb}>합계</span>
                      <span style={tblV(15)}>{fmt(Math.round(hB*1.1))}</span>
                      <span style={tblV(15)}>{fmt(Math.round(hD*1.1))}</span>
                      <span style={tblV(15)}>{fmt(Math.round(hP*1.1))}</span>
                    </div>
                    {solid}
                    {driverRow}
                  </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CENTER DIVIDER */}
          <div style={{ width:1, background:'#E6E6E6', alignSelf:'stretch', margin:'0 16px', flexShrink:0 }} />

          {/* RIGHT SECTION */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>

            {/* 물품옵션 */}
            <div style={row}>
              <span style={lbl}>물품옵션</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Radio checked={dimMode==='가로/세로/높이'} label="가로/세로/높이" onChange={() => setDimMode('가로/세로/높이')} />
                <input defaultValue={`${dimW}m`} style={{ width:80, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                <input defaultValue={`${dimH}m`} style={{ width:80, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                <input defaultValue={`${dimD}m`} style={{ width:80, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                <svg width="44" height="28" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, cursor:'pointer' }}>
                  <path d="M2 0.5H42C42.8284 0.5 43.5 1.17157 43.5 2V26C43.5 26.8284 42.8284 27.5 42 27.5H2C1.17157 27.5 0.5 26.8284 0.5 26V2C0.5 1.17157 1.17157 0.5 2 0.5Z" fill="white"/>
                  <path d="M2 0.5H42C42.8284 0.5 43.5 1.17157 43.5 2V26C43.5 26.8284 42.8284 27.5 42 27.5H2C1.17157 27.5 0.5 26.8284 0.5 26V2C0.5 1.17157 1.17157 0.5 2 0.5Z" stroke="#CCCCCC"/>
                  <path d="M12.6709 12.1348V18H10.6953V10.6035H12.5479L12.6709 12.1348ZM12.3975 14.042H11.8506C11.8506 13.527 11.9121 13.0531 12.0352 12.6201C12.1628 12.1826 12.3473 11.8044 12.5889 11.4854C12.835 11.1618 13.138 10.9111 13.498 10.7334C13.8581 10.5557 14.2751 10.4668 14.749 10.4668C15.0771 10.4668 15.3779 10.5169 15.6514 10.6172C15.9248 10.7129 16.1595 10.8656 16.3555 11.0752C16.556 11.2803 16.7109 11.5492 16.8203 11.8818C16.9297 12.21 16.9844 12.6042 16.9844 13.0645V18H15.0156V13.2832C15.0156 12.946 14.9701 12.6862 14.8789 12.5039C14.7878 12.3216 14.6579 12.194 14.4893 12.1211C14.3252 12.0482 14.127 12.0117 13.8945 12.0117C13.6393 12.0117 13.416 12.0641 13.2246 12.1689C13.0378 12.2738 12.8828 12.4196 12.7598 12.6064C12.6367 12.7887 12.5456 13.0029 12.4863 13.249C12.4271 13.4951 12.3975 13.7594 12.3975 14.042ZM16.7998 13.8164L16.0957 13.9053C16.0957 13.4222 16.1549 12.9733 16.2734 12.5586C16.3965 12.1439 16.5765 11.7793 16.8135 11.4648C17.055 11.1504 17.3535 10.9066 17.709 10.7334C18.0645 10.5557 18.4746 10.4668 18.9395 10.4668C19.2949 10.4668 19.6185 10.5192 19.9102 10.624C20.2018 10.7243 20.4502 10.8861 20.6553 11.1094C20.8649 11.3281 21.0244 11.6152 21.1338 11.9707C21.2477 12.3262 21.3047 12.7614 21.3047 13.2764V18H19.3291V13.2764C19.3291 12.9346 19.2835 12.6748 19.1924 12.4971C19.1058 12.3148 18.9782 12.1895 18.8096 12.1211C18.6455 12.0482 18.4495 12.0117 18.2217 12.0117C17.9847 12.0117 17.7773 12.0596 17.5996 12.1553C17.4219 12.2464 17.2738 12.374 17.1553 12.5381C17.0368 12.7021 16.9479 12.8936 16.8887 13.1123C16.8294 13.3265 16.7998 13.5612 16.7998 13.8164Z" fill="#1A1A1A"/>
                  <path d="M27.5391 16.318C26.2978 14.9834 26.3197 12.8915 27.6093 11.5925C28.1147 11.0812 28.7719 10.747 29.4828 10.6398L29.4449 9.5C28.4469 9.6205 27.5191 10.0752 26.8125 10.7902C25.0845 12.5298 25.0636 15.339 26.745 17.1182L25.7896 18.0796L28.8133 18.2448L28.805 15.0432L27.5391 16.318ZM31.1867 9.75518L31.1949 12.9568L32.4609 11.6825C33.7022 13.0182 33.6802 15.1102 32.3906 16.408C31.8853 16.9195 31.2281 17.2537 30.5172 17.3607L30.555 18.5C31.553 18.3793 32.4809 17.9249 33.188 17.2104C34.9155 15.4696 34.9363 12.6604 33.2549 10.8824L34.2103 9.91982L31.1867 9.75518Z" fill="#1A1A1A"/>
                </svg>
                <Radio checked={dimMode==='CBM'} label="CBM" onChange={() => setDimMode('CBM')} />
                <input placeholder="0m³" disabled style={{ width:80, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#999', background:'#E6E6E6', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
              </div>
            </div>

            {/* 차량옵션 */}
            <div style={row}>
              <span style={lbl}>차량옵션</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Radio checked={cargoType==='독차'} label="독차" onChange={() => setCargoType('독차')} />
                <Radio checked={cargoType==='혼적'} label="혼적" onChange={() => setCargoType('혼적')} />
                {divSep}
                <Radio checked={tripType==='편도'} label="편도" onChange={() => setTripType('편도')} />
                <Radio checked={tripType==='왕복'} label="왕복" onChange={() => setTripType('왕복')} />
                {divSep}
                <span style={{ fontSize:14, color:'#666' }}>약 {distKm}km / {distMin}분 소요 예상</span>
              </div>
            </div>

            {/* 상차옵션 */}
            <div style={{ ...row, alignItems:'flex-start' }}>
              <span style={{ ...lbl, paddingTop:4 }}>상차옵션</span>
              <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:0 }}>
                {/* Radio row */}
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  {equipOpts.map(v => (
                    <Radio key={v} checked={loadEquip===v} label={v} onChange={() => setLoadEquip(v)} />
                  ))}
                </div>
                {/* Date/time row */}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Sel options={['당상','기사','화주']} width={67} />
                  <DateField value={loadingDate} bg="#E8F3FE" />
                  <div style={{ height:28, border:'1px solid #DFDFDF', borderRadius:2, background:'#FFFFFF', display:'flex', alignItems:'center', padding:'0 8px', boxSizing:'border-box', flexShrink:0 }}>
                    <span style={{ fontSize:15, color:'#1A1A1A', letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif" }}>{loadTimeStr}</span>
                  </div>
                  <Chk checked={loadNoTime} label="시간 상관없음" onChange={() => setLoadNoTime(p=>!p)} />
                  <div style={{ width:1, height:16, background:'#CCCCCC', flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:700, color:'#666', flexShrink:0 }}>CPT</span>
                  <DateField value="25.01.28" />
                  <div style={{ height:28, border:'1px solid #DFDFDF', borderRadius:2, background:'#FFFFFF', display:'flex', alignItems:'center', padding:'0 8px', boxSizing:'border-box', flexShrink:0 }}>
                    <span style={{ fontSize:15, color:'#999', letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif" }}>hh : mm</span>
                  </div>
                </div>
                {/* Input row */}
                <div style={{ display:'flex', gap:6, alignItems:'center', marginRight:16 }}>
                  <input defaultValue={loadManager} style={{ width:90, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                  <input defaultValue={loadContact2} style={{ width:120, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                  <input defaultValue={loadMemo} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
            </div>

            {/* 하차옵션 */}
            <div style={{ ...row, alignItems:'flex-start' }}>
              <span style={{ ...lbl, paddingTop:4 }}>하차옵션</span>
              <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:0 }}>
                {/* Radio row */}
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  {equipOpts.map(v => (
                    <Radio key={v} checked={unloadEquip===v} label={v} onChange={() => setUnloadEquip(v)} />
                  ))}
                </div>
                {/* Date/time row */}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Sel options={['당착','기사','화주']} width={67} />
                  <DateField value={unloadDateStr} bg="#E8F3FE" />
                  <input defaultValue={unloadTimeStr} style={{ width:67, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                  <Chk checked={unloadNoTime} label="시간 상관없음" onChange={() => setUnloadNoTime(p=>!p)} />
                </div>
                {/* Input row */}
                <div style={{ display:'flex', gap:6, alignItems:'center', marginRight:16 }}>
                  <input defaultValue={unloadManager} style={{ width:90, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                  <input defaultValue={unloadContact2} style={{ width:120, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                  <input defaultValue={unloadMemo} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
            </div>

            {/* 배차담당 */}
            <div style={row}>
              <span style={lbl}>배차담당</span>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <select defaultValue={driverName} style={{ width:100, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>{['이민호','박성준','최재원','정우진','한동현','오승기','강태풍','서준혁'].map(o=><option key={o}>{o}</option>)}</select>
                <input defaultValue={driverContact} style={{ width:120, height:28, padding:'0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:'#E8F3FE', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', flexShrink:0 }} />
                <select defaultValue={assignGroup} style={{ width:100, height:28, padding:'0 28px 0 8px', fontSize:15, fontFamily:ff, letterSpacing:'-0.02em', color:'#1A1A1A', background:`${selArrow} no-repeat right 8px center, #E8F3FE`, border:'1px solid #DFDFDF', borderRadius:2, outline:'none', cursor:'pointer', boxSizing:'border-box', flexShrink:0, appearance:'none' as const }}>{['기본그룹','A그룹','B그룹','판교팀','수원팀'].map(o=><option key={o}>{o}</option>)}</select>
              </div>
            </div>

            {/* 요청사항 */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', flexShrink:0, width:60 }}>요청사항</span>
              <input defaultValue={requestText} style={{ width:332, flexShrink:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box' }} />
              <span style={{ fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', flexShrink:0 }}>운영메모</span>
              <input defaultValue={opMemoText} style={{ flex:1, minWidth:0, height:28, padding:'0 8px', fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', color:'#1A1A1A', background:'#FFFFFF', border:'1px solid #DFDFDF', borderRadius:2, outline:'none', boxSizing:'border-box', marginRight:16 }} />
            </div>

            {/* 명세서 기준일 */}
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>매출 명세서 기준일</span>
                <DateField value={saleDocDate} bg="#E8F3FE" />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>매입 명세서 기준일</span>
                <DateField value={purchaseDocDate} bg="#E8F3FE" />
              </div>
            </div>

            {/* 금액확인여부 */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#666', letterSpacing:'-0.01em', flexShrink:0, whiteSpace:'nowrap' }}>금액확인여부</span>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <Chk checked={closeSale} label="청구금액확인" onChange={() => setCloseSale(p=>!p)} />
                <span style={{ color:'#CCC', fontSize:15 }}>|</span>
                <Chk checked={closePurchase} label="배차금액확인" onChange={() => setClosePurchase(p=>!p)} />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER — 배차관리 페이지(pageMode)에서는 숨김 */}
        {!__pageMode && <div style={{ height:60, background:'#F9F9F9', borderTop:'1px solid #E6E6E6', padding:'8px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          {/* Left group */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ boxSizing:'border-box', width:156, height:44, background:'#EEEEEE', borderRadius:4, display:'flex', flexDirection:'row', alignItems:'center', padding:'14px 16px', gap:1, flexShrink:0 }}>
              <span style={{ fontFamily:"'Roboto',sans-serif", fontSize:16, lineHeight:'22px', letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>
                <span style={{ fontWeight:400, color:'#666666' }}>오더상태: </span>
                <span style={{ fontWeight:700, color:'#1A1A1A' }}>{statusBadgeText}</span>
              </span>
            </div>
            <div style={{ width:1, height:28, background:'#DFDFDF', flexShrink:0 }} />
            <button style={{ width:110, height:44, background:'#FFFFFF', border:'1px solid #CCCCCC', borderRadius:4, fontSize:16, fontWeight:700, color:'#1A1A1A', cursor:'pointer', fontFamily:ff }}>오더수정</button>
          </div>
          {/* Right group */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:14, fontFamily:ff, color:'#666', letterSpacing:'-0.02em' }}>오더ID {orderId}</span>
            <div style={{ width:1, height:16, background:'#DFDFDF', flexShrink:0 }} />
            <span style={{ fontSize:14, fontFamily:ff, color:'#1A1A1A', cursor:'pointer', letterSpacing:'-0.02em' }}>운송 정보 복사</span>
            <span style={{ fontSize:14, fontFamily:ff, color:'#1A1A1A', cursor:'pointer', letterSpacing:'-0.02em' }}>오더 변경 이력 보기</span>
            <span style={{ fontSize:14, fontFamily:ff, color:'#666', letterSpacing:'-0.02em' }}>24.10.27 15:33:47</span>
          </div>
        </div>}
      </div>
    </div>
  );
  return __pageMode ? modalContent : createPortal(modalContent, document.body);
}


function Con() {
  const [saleSelected, setSaleSelected] = useState<Set<number>>(new Set([0]));
  const [purchaseSelected, setPurchaseSelected] = useState<Set<number>>(new Set([0]));
  const [shipperSelected, setShipperSelected] = useState<Set<number>>(new Set());
  const [dateType, setDateType] = useState<string>('상차일');
  const [periodRange, setPeriodRange] = useState<string>('오늘');
  const [dateRangeStart, setDateRangeStart] = useState<Date|null>(new Date(2026,5,29));
  const [dateRangeEnd, setDateRangeEnd] = useState<Date|null>(null);
  const [partnerSelected, setPartnerSelected] = useState<Set<number>>(new Set());
  const [dispatchSelected, setDispatchSelected] = useState<Set<number>>(new Set());
  const [searchType, setSearchType] = useState('차량번호');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<{ type: string; text: string } | null>(null);
  const runSearch = () => {
    const text = searchText.trim();
    setAppliedSearch(text ? { type: searchType, text } : null);
  };
  const clearSearch = () => {
    setSearchType('차량번호');
    setSearchText('');
    setAppliedSearch(null);
  };
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [orderDetailRowIdx, setOrderDetailRowIdx] = useState<number>(0);
  const [taxInvoiceModal, setTaxInvoiceModal] = useState<{ type: 'sale' | 'purchase'; rowIdx: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [cancelledTopRows, setCancelledTopRows] = useState<CancelledOrderEntry[]>(getCancelledOrders());
  useEffect(() => subscribeCancelledOrders(() => setCancelledTopRows(getCancelledOrders())), []);
  const [cancelledConfirmedSale, setCancelledConfirmedSale] = useState<Set<number>>(new Set());
  const [cancelledConfirmedPurchase, setCancelledConfirmedPurchase] = useState<Set<number>>(new Set());
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx312);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ orderId: string; rowIdx?: number }>).detail;
      setOrderDetailId(detail.orderId);
      setOrderDetailRowIdx(detail.rowIdx ?? 0);
    };
    window.addEventListener('openOrderDetail', handler);
    return () => window.removeEventListener('openOrderDetail', handler);
  }, []);

  const TOTAL_ROWS = 300;
  const PAGE_SIZE = 200;

  const hiddenRows = useMemo(() => {
    const hidden = new Set<number>();
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const saleStatus = SALE_ROW_STATUSES[i % SALE_ROW_STATUSES.length];
      const purchaseStatus = PURCHASE_ROW_STATUSES[i % PURCHASE_ROW_STATUSES.length];

      const saleMatch = saleSelected.has(0) || [...saleSelected].some((idx) => {
        const aliases = STATUS_ALIASES[SALE_STATUS_DATA[idx].label] ?? [SALE_STATUS_DATA[idx].label];
        return aliases.includes(saleStatus);
      });
      const purchaseMatch = purchaseSelected.has(0) || [...purchaseSelected].some((idx) => {
        const aliases = STATUS_ALIASES[PURCHASE_STATUS_DATA[idx].label] ?? [PURCHASE_STATUS_DATA[idx].label];
        return aliases.includes(purchaseStatus);
      });

      const rowShipper = SHIPPER_ROW_DATA[i % SHIPPER_ROW_DATA.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => SHIPPERS[idx] === rowShipper);
      const rowPartner = PARTNER_ROW_DATA[i % PARTNER_ROW_DATA.length];
      const partnerMatch = partnerSelected.size === 0 || [...partnerSelected].some(idx => PARTNER_ROW_DATA[idx] === rowPartner);
      const rowDispatch = DISPATCH_METHODS[i % DISPATCH_METHODS.length];
      const dispatchMatch = dispatchSelected.size === 0 || [...dispatchSelected].some(idx => DISPATCH_METHODS[idx] === rowDispatch);

      const parseYYMMDD = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
      let dateMatch = true;
      if (dateRangeStart || dateRangeEnd) {
        const loadT = parseYYMMDD(getLoadingDate312(i));
        const unloadT = loadT + (((i*7+3)%5)+1)*86400000;
        const saleBaseT = loadT + 2*86400000;
        const purchaseBaseT = unloadT + 1*86400000;
        const rowT = dateType === '상차일' ? loadT
          : dateType === '하차일' ? unloadT
          : dateType === '매출 명세서 기준일' ? saleBaseT
          : purchaseBaseT;
        const lo = dateRangeStart ? dateRangeStart.getTime() : -Infinity;
        const hi = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : lo + 86399999;
        dateMatch = rowT >= lo && rowT <= hi;
      }

      let searchMatch = true;
      if (appliedSearch) {
        const row = getRowData(i);
        const FIELD_BY_TYPE: Record<string, string> = {
          '차량번호': row.plate,
          '기사명': row.driverName,
          '사업자명': row.shipper,
          '화주사 별칭': row.shipper,
          '요청협력사 별칭': row.partner,
          '화주주문번호': row.shipperOrderNum,
          '오더ID': row.orderId,
        };
        const field = FIELD_BY_TYPE[appliedSearch.type] ?? '';
        searchMatch = field.toLowerCase().includes(appliedSearch.text.toLowerCase());
      }

      if (!(saleMatch || purchaseMatch) || !shipperMatch || !partnerMatch || !dispatchMatch || !dateMatch || !searchMatch) hidden.add(i);
    }
    return hidden;
  }, [saleSelected, purchaseSelected, shipperSelected, partnerSelected, dispatchSelected, dateType, dateRangeStart, dateRangeEnd, appliedSearch]);

  const filteredSelfInsuranceSum = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < TOTAL_ROWS; i++) {
      if (!hiddenRows.has(i)) sum += getRowData(i).selfInsurance;
    }
    return sum;
  }, [hiddenRows]);

  const dynamicCounts = useMemo(() => {
    const saleCounts = new Array(SALE_STATUS_DATA.length).fill(0);
    const purchaseCounts = new Array(PURCHASE_STATUS_DATA.length).fill(0);
    let saleTotalAmount = 0;
    let purchaseTotalAmount = 0;
    const parseYYMMDD312 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo312 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi312 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo312 !== null ? lo312 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA[i % SHIPPER_ROW_DATA.length];
      const rowPartner = PARTNER_ROW_DATA[i % PARTNER_ROW_DATA.length];
      const rowDispatch = DISPATCH_METHODS[i % DISPATCH_METHODS.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => SHIPPERS[idx] === rowShipper);
      const partnerMatch = partnerSelected.size === 0 || [...partnerSelected].some(idx => PARTNER_ROW_DATA[idx] === rowPartner);
      const dispatchMatch = dispatchSelected.size === 0 || [...dispatchSelected].some(idx => DISPATCH_METHODS[idx] === rowDispatch);
      if (!shipperMatch || !partnerMatch || !dispatchMatch) continue;
      if (lo312 !== null) {
        const loadT = parseYYMMDD312(getLoadingDate312(i));
        const unloadT = loadT + 86400000;
        const saleBaseT = loadT + 2*86400000;
        const purchaseBaseT = unloadT + 1*86400000;
        const rowT = dateType === '상차일' ? loadT
          : dateType === '하차일' ? unloadT
          : dateType === '매출 명세서 기준일' ? saleBaseT
          : purchaseBaseT;
        if (rowT < lo312 || rowT > hi312!) continue;
      }
      const saleStatus = SALE_ROW_STATUSES[i % SALE_ROW_STATUSES.length];
      const purchaseStatus = PURCHASE_ROW_STATUSES[i % PURCHASE_ROW_STATUSES.length];

      // 매출 패널 건수: 매입 상태 필터를 교차 적용
      const purchaseMatchForSale = purchaseSelected.has(0) || [...purchaseSelected].some((idx) => {
        const aliases = STATUS_ALIASES[PURCHASE_STATUS_DATA[idx].label] ?? [PURCHASE_STATUS_DATA[idx].label];
        return aliases.includes(purchaseStatus);
      });
      if (purchaseMatchForSale) {
        saleCounts[0]++;
        saleTotalAmount += PER_ROW_SALE_AMOUNT[saleStatus] ?? 0;
        for (let si = 1; si < SALE_STATUS_DATA.length; si++) {
          const aliases = STATUS_ALIASES[SALE_STATUS_DATA[si].label] ?? [SALE_STATUS_DATA[si].label];
          if (aliases.includes(saleStatus)) saleCounts[si]++;
        }
      }

      // 매입 패널 건수: 매출 상태 필터를 교차 적용
      const saleMatchForPurchase = saleSelected.has(0) || [...saleSelected].some((idx) => {
        const aliases = STATUS_ALIASES[SALE_STATUS_DATA[idx].label] ?? [SALE_STATUS_DATA[idx].label];
        return aliases.includes(saleStatus);
      });
      if (saleMatchForPurchase) {
        purchaseCounts[0]++;
        purchaseTotalAmount += PER_ROW_PURCHASE_AMOUNT[purchaseStatus] ?? 0;
        for (let pi = 1; pi < PURCHASE_STATUS_DATA.length; pi++) {
          const aliases = STATUS_ALIASES[PURCHASE_STATUS_DATA[pi].label] ?? [PURCHASE_STATUS_DATA[pi].label];
          if (aliases.includes(purchaseStatus)) purchaseCounts[pi]++;
        }
      }
    }
    return { saleCounts, purchaseCounts, saleTotalAmount, purchaseTotalAmount };
  }, [saleSelected, purchaseSelected, shipperSelected, partnerSelected, dispatchSelected, dateType, dateRangeStart, dateRangeEnd]);

  const pageRows = useMemo(() => {
    const SALE_PRIORITY: Record<string, number> = { '마감필요':0,'정산대기':1,'수금대기':2,'수금완료':3,'정산보류':4,'정산제외':5 };
    const PURCHASE_PRIORITY: Record<string, number> = { '마감필요':0,'정산대기':1,'지급대기':2,'지급완료':3,'정산보류':4,'정산제외':5 };
    const parseLD = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const cancelledIdxSet = new Set(cancelledTopRows.map(o => o.rowIdx));
    const baseSorted = Array.from({ length: TOTAL_ROWS }, (_,i) => i)
      .filter(i => !cancelledIdxSet.has(i) && !hiddenRows.has(i))
      .sort((a, b) => {
        const da = parseLD(getLoadingDate312(a)), db = parseLD(getLoadingDate312(b));
        if (da !== db) return da - db;
        // 매출/매입 상태 중 더 급한(작은) 우선순위가 먼저, 동률이면 나머지 한쪽이 작은 순으로 정렬
        const saleA = SALE_PRIORITY[SALE_ROW_STATUSES[a % SALE_ROW_STATUSES.length]] ?? 99;
        const purchaseA = PURCHASE_PRIORITY[PURCHASE_ROW_STATUSES[a % PURCHASE_ROW_STATUSES.length]] ?? 99;
        const saleB = SALE_PRIORITY[SALE_ROW_STATUSES[b % SALE_ROW_STATUSES.length]] ?? 99;
        const purchaseB = PURCHASE_PRIORITY[PURCHASE_ROW_STATUSES[b % PURCHASE_ROW_STATUSES.length]] ?? 99;
        const minA = Math.min(saleA, purchaseA), maxA = Math.max(saleA, purchaseA);
        const minB = Math.min(saleB, purchaseB), maxB = Math.max(saleB, purchaseB);
        if (minA !== minB) return minA - minB;
        return maxA - maxB;
      });
    const cancelledVisible = cancelledTopRows.map(o => o.rowIdx).filter(i => !hiddenRows.has(i));
    const allVisible = [...cancelledVisible, ...baseSorted];
    const start = (currentPage - 1) * PAGE_SIZE;
    return allVisible.slice(start, start + PAGE_SIZE);
  }, [hiddenRows, currentPage, cancelledTopRows]);

  useEffect(() => {
    setFilteredTotal(TOTAL_ROWS - hiddenRows.size);
    setCurrentPage(1);
  }, [hiddenRows]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [currentPage]);

  const CHECKMARK = `<svg viewBox="0 0 10 8" fill="none" style="position:absolute;inset:0;width:100%;height:100%;padding:1px"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  useEffect(() => {
    if (!tableRef.current) return;
    const allPageSelected = pageRows.length > 0 && pageRows.every(r => selectedRows.has(r));
    tableRef.current.querySelectorAll<HTMLElement>('[data-cb-row]').forEach((cb) => {
      const inner = cb.querySelector<HTMLElement>('[data-name="2021.11"]');
      if (!inner) return;
      const isHeader = cb.dataset.cbRow === 'header';
      const isSelected = isHeader ? allPageSelected : selectedRows.has(Number(cb.dataset.cbRow));
      if (isSelected) {
        inner.style.background = '#005fff';
        inner.style.borderColor = '#005fff';
        if (!inner.querySelector('svg')) inner.innerHTML = CHECKMARK;
      } else {
        inner.style.cssText = '';
        inner.innerHTML = '';
      }
    });
  }, [selectedRows, pageRows]);

  useEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const handleClick = (e: Event) => {
      const cb = (e.target as HTMLElement).closest<HTMLElement>('[data-cb-row]');
      if (!cb) return;
      if (cb.dataset.cbRow === 'header') {
        setSelectedRows((prev) => {
          const allSelected = pageRows.every(r => prev.has(r));
          const next = new Set(prev);
          pageRows.forEach(r => allSelected ? next.delete(r) : next.add(r));
          return next;
        });
      } else {
        const row = Number(cb.dataset.cbRow);
        setSelectedRows(prev => {
          const next = new Set(prev);
          next.has(row) ? next.delete(row) : next.add(row);
          return next;
        });
      }
    };
    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [pageRows]);

  useEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    let hoveredRow: string | null = null;
    const over = (e: Event) => {
      const cb = (e.target as HTMLElement).closest<HTMLElement>('[data-cb-row]');
      if (cb) {
        const inner = cb.querySelector<HTMLElement>('[data-name="2021.11"]');
        if (inner && inner.style.background !== '#005fff') inner.style.borderColor = '#005fff';
      }
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-table-row]');
      const newRow = cell?.dataset.tableRow ?? null;
      if (newRow !== hoveredRow) {
        if (hoveredRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${hoveredRow}"]`).forEach(c => { if (!c.querySelector('[data-name="Selection Controls"]')) c.style.backgroundColor = ''; });
        }
        if (newRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${newRow}"]`).forEach(c => { if (!c.querySelector('[data-name="Selection Controls"]')) c.style.backgroundColor = 'rgba(246, 247, 248, 0.5)'; });
        }
        hoveredRow = newRow;
      }
    };
    const out = (e: Event) => {
      const cb = (e.target as HTMLElement).closest<HTMLElement>('[data-cb-row]');
      if (cb) {
        const inner = cb.querySelector<HTMLElement>('[data-name="2021.11"]');
        if (inner && inner.style.background !== '#005fff') inner.style.borderColor = '#adb1b9';
      }
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (!relatedTarget || !el.contains(relatedTarget)) {
        if (hoveredRow !== null) {
          el.querySelectorAll<HTMLElement>(`[data-table-row="${hoveredRow}"]`).forEach(c => { if (!c.querySelector('[data-name="Selection Controls"]')) c.style.backgroundColor = ''; });
          hoveredRow = null;
        }
      }
    };
    el.addEventListener('mouseover', over);
    el.addEventListener('mouseout', out);
    return () => { el.removeEventListener('mouseover', over); el.removeEventListener('mouseout', out); };
  }, []);

  const handleOrderClick = (orderId: string, rowIdx: number) => {
    setOrderDetailId(orderId);
    setOrderDetailRowIdx(rowIdx);
  };

  const rowHandlers: RowHandlers = {
    onOrderClick: handleOrderClick,
    onTaxInvoiceClick: (type, rowIdx) => setTaxInvoiceModal({ type, rowIdx }),
  };

  return (
    <>
    <DateFilterCtx.Provider value={{ dateType, rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, periodRange, setDateType, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd, setPeriodRange }}>
    <SearchCtx312.Provider value={{ searchType, searchText, appliedSearch, setSearchType, setSearchText, runSearch, clearSearch }}>
    <DynamicCountCtx.Provider value={{ ...dynamicCounts, selfInsuranceSum: filteredSelfInsuranceSum }}>
    <BubbleCtx.Provider value={{ shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected, dispatchSelected, setDispatchSelected }}>
    <SaleFilterCtx.Provider value={{ selected: saleSelected, setSelected: setSaleSelected }}>
      <PurchaseFilterCtx.Provider value={{ selected: purchaseSelected, setSelected: setPurchaseSelected }}>
      <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="content-stretch flex flex-col items-start pt-[4px] px-[32px] relative size-full">
        <FilterSorterModule />
        <Frame891 />
        <TableControlModule />
        <div className="content-stretch flex items-start relative shrink-0 w-[1648px] h-[840px] overflow-auto pb-[40px]" data-name="통합장부표" ref={tableRef}>
          <DynamicTable312 pageRows={pageRows} handlers={rowHandlers} />
        </div>
      </div>
    </div>
      </TableCtrlCtx.Provider>
      </PurchaseFilterCtx.Provider>
    </SaleFilterCtx.Provider>
    </BubbleCtx.Provider>
    </DynamicCountCtx.Provider>
    </SearchCtx312.Provider>
    </DateFilterCtx.Provider>
    {orderDetailId && <OrderDetailModal
      orderId={orderDetailId}
      rowIdx={orderDetailRowIdx}
      onClose={() => setOrderDetailId(null)}
      onStatusChange={(newStatus) => {
        const entry = getCancelledOrders().find(o => o.orderId === orderDetailId);
        if (!entry) return;
        if (newStatus === '정산대기_sale') {
          setCancelledConfirmedSale(prev => new Set([...prev, entry.rowIdx]));
        } else if (newStatus === '정산대기_purchase') {
          setCancelledConfirmedPurchase(prev => new Set([...prev, entry.rowIdx]));
        }
      }}
    />}
    {taxInvoiceModal && <TaxInvoiceModal
      type={taxInvoiceModal.type}
      rowIdx={taxInvoiceModal.rowIdx}
      onClose={() => setTaxInvoiceModal(null)}
    />}
    </>
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
  const { currentPage, filteredTotal } = useContext(PageCtx312);
  const start = filteredTotal === 0 ? 0 : (currentPage - 1) * 200 + 1;
  const end = Math.min(currentPage * 200, filteredTotal);
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center right-[24px] top-[12px]" data-name="Page_count">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px]">{filteredTotal.toLocaleString()}건 중 {start}-{end}건</p>
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[123px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled4 />
      </div>
    </div>
  );
}

function Icon3() {
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

function Icon4() {
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
  const { currentPage, setCurrentPage, filteredTotal } = useContext(PageCtx312);
  const TOTAL_PAGES = Math.max(1, Math.ceil(filteredTotal / 200));
  const getPages = (): (number | 'e')[] => {
    if (TOTAL_PAGES <= 9) return Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
    if (currentPage <= 5) return [...Array.from({ length: 7 }, (_, i) => i + 1) as number[], 'e', TOTAL_PAGES];
    if (currentPage >= TOTAL_PAGES - 4) return [1, 'e', ...Array.from({ length: 7 }, (_, i) => TOTAL_PAGES - 6 + i) as number[]];
    return [1, 'e', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, 'e', TOTAL_PAGES];
  };
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex gap-[4px] items-center justify-center left-1/2 p-[2px] top-[12px]" data-name="pagination_list">
      <div onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} style={{ opacity: currentPage === 1 ? 0.3 : 1, cursor: 'pointer' }} className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]"><Icon3 /></div>
      </div>
      {getPages().map((page, idx) =>
        page === 'e' ? (
          <div key={`e${idx}`} className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]">
            <span style={{ fontSize: 13, color: '#9197A1', letterSpacing: 1 }}>···</span>
          </div>
        ) : (
          <div key={page} onClick={() => setCurrentPage(page)} style={{ cursor: 'pointer' }} className={`content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px] ${page === currentPage ? 'bg-[#f6f7f8]' : ''}`}>
            <div className={`[word-break:break-word] flex flex-col justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-center tracking-[-0.3px] whitespace-nowrap ${page === currentPage ? "font-['Pretendard_GOV:SemiBold'] text-[#2e3238]" : "font-['Pretendard_GOV:Regular'] text-[#454b55]"}`}>
              <p className="leading-[22px]">{page}</p>
            </div>
          </div>
        )
      )}
      <div onClick={() => currentPage < TOTAL_PAGES && setCurrentPage(currentPage + 1)} style={{ opacity: currentPage === TOTAL_PAGES ? 0.3 : 1, cursor: 'pointer' }} className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[32px]">
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]"><Icon4 /></div>
      </div>
    </div>
  );
}

function Frame873() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(5000);
  return (
    <PageCtx312.Provider value={{ currentPage, setCurrentPage, filteredTotal, setFilteredTotal }}>
      <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px relative w-full">
        <Con />
        <div className="bg-white h-[64px] relative shrink-0 w-full" data-name="pagination">
          <div className="overflow-clip relative rounded-[inherit] size-full">
            <PageCount />
            <PaginationList />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-solid border-t inset-0 pointer-events-none" />
        </div>
      </div>
    </PageCtx312.Provider>
  );
}

function Right() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-[1180px] relative" data-name="right">
      <div className="content-stretch flex items-start justify-center relative shrink-0 w-[1712px]" data-name="Page_Top_Component">
        <div className="bg-white content-stretch flex h-[82px] items-center px-[32px] relative shrink-0 w-[1712px]" data-name>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <Frame830 />
        </div>
      </div>
      <Frame873 />
    </div>
  );
}

function Ui() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] items-start min-h-px overflow-clip relative w-full" data-name="통합장부 / UI">
      <SharedLnb activeTabIndex={0} />
      <Right />
    </div>
  );
}

export default function Component11() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.2 통합장부">
      <Ui />
    </div>
  );
}