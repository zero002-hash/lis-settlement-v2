import { todayYYMMDD } from '../../utils/date';
import React, { useState, createContext, useContext, useMemo, useRef, useEffect } from "react";
import { SubTabCtx, type MaeChulSubTab } from "../shared/subTabCtx";
import { createPortal } from "react-dom";
import svgPaths from "./svg-iyfriqgqjg";
import ORDER_IDS from "../shared/orderIds";
import SharedLnb from "../shared/SharedLnb";
import { getCancelledOrders, subscribeCancelledOrders, CancelledOrderEntry } from "../shared/cancelledOrdersStore";
import { modalSvg, emptySvg } from "./svg-modal";
import { OrderDetailModal } from "../312통합장부/index";

const STATUS_PRIORITY_313: Record<string, number> = { '마감필요': 0, '정산대기': 1, '수금대기': 2, '수금완료': 3, '정산보류': 4, '정산제외': 5 };

// ── 매출 상태 전환 조건 ────────────────────────────────────────────────────
// 마감필요: 화주사+화주사 업무그룹 정보 미입력 또는 청구금액 미확인
// 정산대기: 화주사+화주사 업무그룹 정보 입력 그리고 청구금액 확인
// 수금대기: 수기계산서 등록 또는 매출 거래명세서 페이지에서 수기계산서 또는 전자 세금계산서 발행
// 수금완료: 수금완료 처리 또는 매출 거래명세서 페이지에서 수금완료 처리
// 정산보류: 상위 거래처가 매입장부에서 정산보류 처리한 경우 매출장부에 정산보류로 보여짐
interface RowOverrides313S {
  manualInvoiceRegistered: Set<number>;
  invoiceGenerated: Set<number>;
  collectionCompleted: Set<number>;
}
const EMPTY_OVERRIDES_313S: RowOverrides313S = { manualInvoiceRegistered: new Set(), invoiceGenerated: new Set(), collectionCompleted: new Set() };

function getRowFlags313S(rowIdx: number) {
  const hasShipperInfo = rnd313S(rowIdx, 101) > 0.08;
  const billingConfirmed = hasShipperInfo && rnd313S(rowIdx, 102) > 0.35;
  const onHold = rnd313S(rowIdx, 103) < 0.05;
  const eligibleForInvoice = hasShipperInfo && billingConfirmed;
  const manualInvoiceRegistered = eligibleForInvoice && rnd313S(rowIdx, 104) < 0.35;
  const invoiceGenerated = eligibleForInvoice && !manualInvoiceRegistered && rnd313S(rowIdx, 105) < 0.35;
  const taxInvoiceIssuedForStatement = invoiceGenerated && rnd313S(rowIdx, 106) < 0.6;
  const reachedCollectWaiting = manualInvoiceRegistered || taxInvoiceIssuedForStatement;
  const collectionCompleted = reachedCollectWaiting && rnd313S(rowIdx, 107) < 0.5;
  return { hasShipperInfo, billingConfirmed, onHold, manualInvoiceRegistered, invoiceGenerated, taxInvoiceIssuedForStatement, collectionCompleted };
}

function getEffectiveFlags313S(rowIdx: number, overrides: RowOverrides313S) {
  const base = getRowFlags313S(rowIdx);
  const manualInvoiceRegistered = base.manualInvoiceRegistered || overrides.manualInvoiceRegistered.has(rowIdx);
  const invoiceGenerated = base.invoiceGenerated || overrides.invoiceGenerated.has(rowIdx);
  const collectionCompleted = base.collectionCompleted || overrides.collectionCompleted.has(rowIdx);
  return { ...base, manualInvoiceRegistered, invoiceGenerated, collectionCompleted };
}

function deriveStatus313S(flags: ReturnType<typeof getEffectiveFlags313S>, isCancelled: boolean): string {
  if (isCancelled) return '마감필요';
  if (flags.onHold) return '정산보류';
  if (flags.collectionCompleted) return '수금완료';
  if (flags.manualInvoiceRegistered || flags.taxInvoiceIssuedForStatement) return '수금대기';
  if (flags.hasShipperInfo && flags.billingConfirmed) return '정산대기';
  return '마감필요';
}

const LOADING_DATES_313 = [
  '26.05.04','26.05.07','26.05.11','26.05.14','26.05.18','26.05.21','26.05.25','26.05.28',
  '26.06.01','26.06.04','26.06.08','26.06.11','26.06.15','26.06.18','26.06.22','26.06.25',todayYYMMDD(),
];
const getLoadingDateIdx313 = (i: number) => { let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11; return ((h >>> 0) % LOADING_DATES_313.length + LOADING_DATES_313.length) % LOADING_DATES_313.length; };
const getLoadingDate313 = (i: number) => LOADING_DATES_313[getLoadingDateIdx313(i)];
const parseYMD313 = (s: string) => { const [yy, mm, dd] = s.split('.').map(Number); return new Date(2000 + yy, mm - 1, dd); };
const fmtYMD313 = (d: Date) => { const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yy}.${mm}.${dd}`; };
const addDays313 = (s: string, n: number) => fmtYMD313(new Date(parseYMD313(s).getTime() + n * 86400000));

// ── 화주사 bubble filter ──────────────────────────────────────────────────────
const BUBBLE_SHIPPERS = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];
const SHIPPER_ROW_DATA_313 = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];

// ── 청구금액 per row (cycles through realistic values) ────────────────────────
const ROW_CHARGE_AMOUNTS = [120000, 180000, 95000, 240000, 150000, 210000, 85000, 320000, 175000, 130000];
const getRowChargeAmount = (i: number) => ROW_CHARGE_AMOUNTS[i % ROW_CHARGE_AMOUNTS.length];
const getRowTaxAmount = (i: number) => Math.round(getRowChargeAmount(i) * 0.1);

// ── 협력사 bubble filter ──────────────────────────────────────────────────────
const PARTNERS_313 = [
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
const PARTNER_ROW_DATA_313 = PARTNERS_313;

// 요청협력사 데이터 (화주사와 유사한 개념, 협력사와 다름)
const REQUEST_PARTNER_ROW_DATA_313 = [
  '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류',
  '(주)한진택배', '(주)CJ대한통운', '(주)롯데글로벌로지스', '(주)현대글로비스', '(주)쿠팡로지스틱스',
  '(주)네이버풀필먼트', '(주)GS네트웍스', '(주)LX판토스', '(주)삼성SDS물류', '(주)SK오션플랜트',
  '(주)티몬물류', '(주)위메프물류', '(주)11번가물류', '(주)SSG닷컴로지스', '(주)오아시스물류',
];

interface DateFilterCtxType313 { rangeStart: Date|null; rangeEnd: Date|null; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; dateType: string; setDateType: (t: string) => void; }
const DateFilterCtx313 = createContext<DateFilterCtxType313>({ rangeStart: null, rangeEnd: null, setRangeStart: () => {}, setRangeEnd: () => {}, dateType: '상차일', setDateType: () => {} });

interface BubbleCtxType313 { shipperSelected: Set<number>; setShipperSelected: (s: Set<number>) => void; partnerSelected: Set<number>; setPartnerSelected: (s: Set<number>) => void; groupSelected: Set<number>; setGroupSelected: (s: Set<number>) => void; }
const BubbleCtx313 = createContext<BubbleCtxType313>({ shipperSelected: new Set(), setShipperSelected: () => {}, partnerSelected: new Set(), setPartnerSelected: () => {}, groupSelected: new Set(), setGroupSelected: () => {} });

interface SearchCtxType313 { searchType: string; searchText: string; setSearchType: (t: string) => void; setSearchText: (t: string) => void; runSearch: () => void; }
const SearchCtx313 = createContext<SearchCtxType313>({ searchType: '오더 ID', searchText: '', setSearchType: () => {}, setSearchText: () => {}, runSearch: () => {} });

const DynamicCountCtx313 = createContext<{ saleCounts: number[]; saleTotalAmount: number }>({ saleCounts: [], saleTotalAmount: 0 });

// Per-row amounts derived from ITEMS_313_RAW counts
const PER_ROW_SALE_AMOUNT_313: Record<string, number> = {
  '마감필요': 0,
  '정산대기': Math.round(312_000_000 / 2273),
  '수금대기': Math.round(548_700_000 / 909),
  '수금완료': Math.round(1_240_500_000 / 909),
  '정산보류': Math.round(87_300_000 / 454),
};
// ─────────────────────────────────────────────────────────────────────────────

const PageCtx313 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });
const ModalCtx313 = createContext<{
  openModal: (indices: number[]) => void;
  selectedRows: Set<number>;
  getRow: (i: number) => RowData313S;
  registerManualInvoice: (indices: number[]) => void;
  requestCollectionComplete: (indices: number[]) => { ok: boolean; message?: string };
}>({
  openModal: () => {}, selectedRows: new Set(),
  getRow: (i) => getRowData313S(i),
  registerManualInvoice: () => {}, requestCollectionComplete: () => ({ ok: false }),
});
const FilterCtx313 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

const STATUS_LABEL_COLORS_313: Record<string, string> = {
  '마감필요': '#dd2222', '정산대기': '#18ac42', '수금대기': '#005fff',
  '수급대기': '#005fff', '수금완료': '#5c6370', '정산보류': '#9197a1',
  '지급대기': '#005fff', '지급완료': '#5c6370', '확정대기': '#dd2222', '발행대기': '#18ac42',
};
function DashboardCard({ label, amount, active, onClick }: { label: string; amount: string; active: boolean; onClick?: () => void }) {
  const baseLabel = label.split(' (')[0];
  const labelColor = STATUS_LABEL_COLORS_313[baseLabel] ?? '#5c6370';
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[8px] flex-1 min-w-0 h-[72px] flex flex-col items-start px-[16px] py-[12px] ${active ? "bg-white" : "bg-[#f6f7f8] hover:bg-[#EBEDEF]"} ${onClick ? "cursor-pointer select-none" : ""}`}
    >
      {active && <div aria-hidden className="absolute border border-[#EBEDEF] border-solid inset-0 pointer-events-none rounded-[8px]" />}
      <p className="font-['Pretendard_GOV:SemiBold'] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: labelColor }}>{label}</p>
      <p className="font-['Pretendard_GOV:SemiBold'] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: labelColor }}>{amount}</p>
    </div>
  );
}

function StatusCardRowLarge({ items }: { items: { label: string; amount: string }[] }) {
  const { selected, setSelected } = useContext(FilterCtx313);
  const { saleCounts, saleTotalAmount } = useContext(DynamicCountCtx313);
  const nonTotalCount = items.length - 1;

  const handleClick = (i: number) => {
    if (i === 0) {
      setSelected(new Set([0]));
    } else {
      setSelected((prev: Set<number>) => {
        const next = new Set(prev);
        next.delete(0);
        if (next.has(i)) {
          next.delete(i);
          if (next.size === 0) return new Set([0]);
        } else {
          next.add(i);
          if (next.size === nonTotalCount) return new Set([0]);
        }
        return next;
      });
    }
  };

  const dynamicItems = saleCounts.length > 0 ? items.map((item, i) => {
    if (i === 0) return { ...item, label: `전체 (${saleCounts[0].toLocaleString()}건)`, amount: formatKorean(saleTotalAmount) };
    const rawLabel = item.label.split(' (')[0];
    const count = saleCounts[i] ?? 0;
    const perRow = PER_ROW_SALE_AMOUNT_313[rawLabel] ?? 0;
    return { ...item, label: `${rawLabel} (${count.toLocaleString()}건)`, amount: formatKorean(count * perRow) };
  }) : items;

  return (
    <div className="flex items-start py-[12px] relative shrink-0 w-full" style={{height: 104}}>
      <div className="bg-[#f6f7f8] rounded-[8px] flex-1 flex flex-col justify-center items-start p-[4px] gap-[12px]" style={{height: 80}}>
        <div className="flex gap-[4px] w-full" style={{height: 72}}>
          {dynamicItems.map((item, i) => (
            <DashboardCard key={item.label} label={item.label.replace("건)", ")")} amount={item.amount} active={selected.has(i)} onClick={() => handleClick(i)} />
          ))}
        </div>
      </div>
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

function Frame78() {
  return (
    <div className="content-stretch flex gap-[4px] h-[19px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[19px] not-italic relative shrink-0 text-[#2e3238] text-[13px] tracking-[-0.26px] whitespace-nowrap">04.14 12:30:21 기준</p>
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

function Frame598() {
  return (
    <div className="content-stretch flex gap-[8px] items-center overflow-clip relative shrink-0">
      <Frame78 />
      <div className="content-stretch flex flex-col items-center justify-center relative rounded-[2px] shrink-0 size-[26px]" data-name="Button">
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[2px]" />
        <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/restart">
          <div className="absolute bg-white left-0 size-[16px] top-0" data-name="16 / ic_16_reload_gray">
            <Component14 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame600() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">매출장부</p>
      <Frame598 />
    </div>
  );
}

function Frame633() {
  const { activeTab, setActiveTab } = useContext(SubTabCtx);
  const tabs: MaeChulSubTab[] = ["화주사", "협력사", "기사"];
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
      {tabs.map(t => {
        const isActive = activeTab === t;
        return (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`content-stretch flex gap-[4px] h-[44px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[8px] ${isActive ? "bg-[#f6f7f8]" : "hover:bg-[#EBEDEF]"}`}
            data-name="Tab_Atom"
          >
            <p className={`[word-break:break-word] font-['Pretendard_GOV:SemiBold'] leading-[24px] not-italic relative shrink-0 text-[16px] tracking-[-0.32px] whitespace-nowrap ${isActive ? "text-[#2e3238]" : "text-[#5c6370]"}`}>{t}</p>
          </button>
        );
      })}
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex items-center py-[6px] relative shrink-0 w-full">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-[0_0_-1px_0] pointer-events-none" />
      <Frame633 />
    </div>
  );
}

const PERIOD_OPTIONS_313 = ['상차일', '하차일', '매출 명세서 기준일'] as const;

function TypeStatusDisabled() {
  const { dateType: selected, setDateType: setSelected } = useContext(DateFilterCtx313);
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
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 2,
            left: rect.left,
            width: 176 / (window.innerWidth / 1920),
            background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            borderRadius: 8,
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            zIndex: 99999,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            transform: `scale(${window.innerWidth / 1920})`,
            transformOrigin: 'top left',
          }}
        >
          {PERIOD_OPTIONS_313.map(opt => (
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
                outline: 'none',
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

const PERIOD_RANGE_OPTIONS_313 = ['2개월 전', '저번달', '이번달', '1분기', '2분기', '3분기', '4분기', '올해', '1년', '직접입력'] as const;

function TypeStatusDisabled1({ onSelect }: { onSelect?: (opt: string) => void }) {
  const [selected, setSelected] = useState<string>('2개월 전');
  const [open, setOpen] = useState(false);
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
        <div ref={dropRef} style={{ position:'fixed', top: rect.bottom + 2, left: rect.left, width: 176 / (window.innerWidth / 1920), background:'#FFFFFF', border:'1px solid #E4E5E9', borderRadius:8, boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex:99999, boxSizing:'border-box', transform:`scale(${window.innerWidth / 1920})`, transformOrigin:'top left' }}>
          <div style={{ padding:8, overflowY:'auto', maxHeight:216, scrollbarWidth:'thin', scrollbarColor:'#767D8A #FFFFFF', display:'flex', flexDirection:'column' }}>
            {PERIOD_RANGE_OPTIONS_313.map(opt => (
              <div key={opt} tabIndex={0}
                onClick={() => { setSelected(opt); setOpen(false); onSelect?.(opt); }}
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

function SwitchAtom() {
  return (
    <div className="bg-white mr-[-1px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 size-[36px]" data-name="switch_Atom">
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
          <p className="leading-[20px]">25.02.22 ~ 25.04.23</p>
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

function SwitchAtom2() {
  return (
    <div className="bg-white relative rounded-br-[4px] rounded-tr-[4px] shrink-0 size-[36px]" data-name="switch_Atom">
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

function SwitchModule({ rangeStart, rangeEnd, setRangeStart, setRangeEnd }: {
  rangeStart: Date | null; rangeEnd: Date | null;
  setRangeStart: (d: Date | null) => void; setRangeEnd: (d: Date | null) => void;
}) {
  const F = "'Pretendard GOV:Regular'";
  const today = new Date(2026, 5, 29);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'current' | 'fixed'>('fixed');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(3);
  const [timeIncluded, setTimeIncluded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleDay = (date: Date) => {
    const d = clear(date);
    if (!selecting) { setRangeStart(d); setRangeEnd(null); setSelecting(true); }
    else { const s = clear(rangeStart!); if (d < s) { setRangeStart(d); setRangeEnd(s); } else { setRangeEnd(d); } setSelecting(false); }
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
      <div className="content-stretch flex items-center relative shrink-0" data-name="switch_Module" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <SwitchAtom />
        <div className="bg-white h-[36px] mr-[-1px] relative shrink-0" data-name="switch_Atom">
          <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] text-center tracking-[-0.28px] whitespace-nowrap">
              <p className="leading-[20px]">{dateLabel}</p>
            </div>
          </div>
          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none" />
        </div>
        <SwitchAtom2 />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 0 4px', height: 34 }}>
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#5C6370', letterSpacing: '-0.02em', lineHeight: '19px' }}>시간 포함</span>
              <div onClick={() => setTimeIncluded(v => !v)} style={{ width: 32, height: 18, borderRadius: 45, background: timeIncluded ? '#005FFF' : '#E4E5E9', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', top: 1, left: timeIncluded ? 15 : 1, transition: 'left 0.2s' }} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Calender() {
  const clr = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const { rangeStart, rangeEnd, setRangeStart, setRangeEnd } = useContext(DateFilterCtx313);

  const applyPeriod = (opt: string) => {
    const t = new Date(2026, 5, 29);
    switch (opt) {
      case '2개월 전': { const s = clr(t); s.setMonth(s.getMonth() - 2); setRangeStart(s); setRangeEnd(clr(t)); break; }
      case '저번달': { const s = new Date(t.getFullYear(), t.getMonth() - 1, 1); const e = new Date(t.getFullYear(), t.getMonth(), 0); setRangeStart(s); setRangeEnd(e); break; }
      case '이번달': setRangeStart(new Date(t.getFullYear(), t.getMonth(), 1)); setRangeEnd(clr(t)); break;
      case '1분기': setRangeStart(new Date(t.getFullYear(), 0, 1)); setRangeEnd(new Date(t.getFullYear(), 2, 31)); break;
      case '2분기': setRangeStart(new Date(t.getFullYear(), 3, 1)); setRangeEnd(new Date(t.getFullYear(), 5, 30)); break;
      case '3분기': setRangeStart(new Date(t.getFullYear(), 6, 1)); setRangeEnd(new Date(t.getFullYear(), 8, 30)); break;
      case '4분기': setRangeStart(new Date(t.getFullYear(), 9, 1)); setRangeEnd(new Date(t.getFullYear(), 11, 31)); break;
      case '올해': setRangeStart(new Date(t.getFullYear(), 0, 1)); setRangeEnd(new Date(t.getFullYear(), 11, 31)); break;
      case '1년': { const s = clr(t); s.setFullYear(s.getFullYear() - 1); setRangeStart(s); setRangeEnd(clr(t)); break; }
      case '직접입력': break;
      default: break;
    }
  };

  return (
    <div className="content-stretch flex gap-[3px] items-center relative shrink-0 z-[8]" data-name="calender">
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled1 onSelect={applyPeriod} />
      </div>
      <SwitchModule rangeStart={rangeStart} rangeEnd={rangeEnd} setRangeStart={setRangeStart} setRangeEnd={setRangeEnd} />
    </div>
  );
}

function ShipperGroupBubbleFilter313({ hidden, label = '화주사 업무그룹' }: { hidden: boolean; label?: string }) {
  const { groupSelected, setGroupSelected } = useContext(BubbleCtx313);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const bg = open ? '#eef3ff' : groupSelected.size > 0 ? '#f5f9ff' : '#f6f7f8';
  const textColor = (open || groupSelected.size > 0) ? '#005fff' : '#2e3238';
  const labelOf = (idx: number) => `${SHIPPER_GROUP_OPTIONS_313[idx].shipper} · ${SHIPPER_GROUP_OPTIONS_313[idx].group}`;
  const options = SHIPPER_GROUP_OPTIONS_313.map((o, idx) => ({ idx, label: labelOf(idx) }));
  const visibleOptions = options.filter(({ label, idx }) => (search && label.includes(search)) || groupSelected.has(idx));

  return (
    <div ref={btnRef} style={{ position: 'relative', display: hidden ? 'none' : undefined }}>
      <div
        className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
        style={{ background: bg, border: open || groupSelected.size > 0 ? '1px solid transparent' : '1px solid transparent' }}
        data-name="Input / Dropdown_Filter"
        onClick={() => {
          if (!open) { const rect = btnRef.current!.getBoundingClientRect(); setDropdownPos({ top: rect.bottom + 2, left: rect.left }); }
          setOpen(o => !o);
        }}
      >
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: textColor }}>
          <p className="leading-[20px]">{label}</p>
        </div>
        {groupSelected.size > 0 && !open ? (
          <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
              <p className="leading-[18px]">{groupSelected.size}</p>
            </div>
          </div>
        ) : (
          <div style={{ transform: open ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
            <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
              <div className="-scale-y-100 flex-none">
                <div className="h-[3px] relative w-[7px]">
                  <div className="absolute inset-[-21.67%_-9.29%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                      <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" stroke={open ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {open && dropdownPos && createPortal(
        <div ref={dropRef} style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: 200, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, display: 'flex', flexDirection: 'column', zIndex: 9999, boxSizing: 'border-box' }}>
          <div style={{ padding: '8px 8px 2px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E4E5E9', borderRadius: 4, padding: '6px 10px', height: 36, boxSizing: 'border-box' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="6.57" cy="6.57" r="5.07" stroke="#9197A1" strokeWidth="1.3"/>
                <line x1="10.91" y1="10.91" x2="14.5" y2="14.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업무그룹 검색" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#767D8A', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }} />
            </div>
          </div>
          <div style={{ maxHeight: 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            {visibleOptions.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 146, gap: 4 }}>
                <span style={{ fontSize: 15, color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
              </div>
            ) : visibleOptions.map(({ idx, label }) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => { const next = new Set(groupSelected); next.has(idx) ? next.delete(idx) : next.add(idx); setGroupSelected(next); }}
                style={{ display: 'flex', alignItems: 'center', padding: '9px 8px 9px 4px', gap: 8, height: 40, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box', background: hoveredIdx === idx ? '#F6F7F8' : '#FFFFFF' }}
              >
                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, border: groupSelected.has(idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: groupSelected.has(idx) ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    {groupSelected.has(idx) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
            <span onClick={e => { e.stopPropagation(); setGroupSelected(new Set()); setSearch(''); }} style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}>필터 초기화</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function BubbleFilter313() {
  const { activeTab } = useContext(SubTabCtx);
  const isPartnerTab = false;
  const isDriverTab = activeTab === '기사';
  const { shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected } = useContext(BubbleCtx313);
  const [shipperOpen, setShipperOpen] = useState(false);
  const [shipperSearch, setShipperSearch] = useState('');
  const [shipperHovered, setShipperHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number|null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [partnerHoveredIdx, setPartnerHoveredIdx] = useState<number|null>(null);
  const partnerBtnRef = useRef<HTMLDivElement>(null);
  const partnerDropRef = useRef<HTMLDivElement>(null);
  const [partnerDropPos, setPartnerDropPos] = useState<{ top: number; left: number } | null>(null);

  const shipperBg = shipperOpen ? '#eef3ff' : shipperSelected.size > 0 ? '#f5f9ff' : shipperHovered ? '#f6f7f8' : '#f6f7f8';
  const shipperBorder = shipperOpen ? '1px solid transparent' : shipperSelected.size > 0 ? '1px solid transparent' : shipperHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const shipperTextColor = (shipperOpen || shipperSelected.size > 0) ? '#005fff' : '#2e3238';

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

  const partnerBg = partnerOpen ? '#eef3ff' : partnerSelected.size > 0 ? '#f5f9ff' : partnerHovered ? '#f6f7f8' : '#f6f7f8';
  const partnerBorder = partnerOpen ? '1px solid transparent' : partnerSelected.size > 0 ? '1px solid transparent' : partnerHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const partnerTextColor = (partnerOpen || partnerSelected.size > 0) ? '#005fff' : '#2e3238';

  return (
    <div className="content-stretch flex items-center gap-[4px] relative shrink-0 z-[7]">
      <div ref={btnRef} style={{ position: 'relative', display: (isPartnerTab) ? 'none' : undefined }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: shipperBg, border: shipperBorder }}
          data-name="Input / Dropdown_Filter"
          onClick={() => {
            if (!shipperOpen) {
              const rect = btnRef.current!.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 2, left: rect.left });
            }
            setShipperOpen(o => !o);
          }}
          onMouseEnter={() => setShipperHovered(true)}
          onMouseLeave={() => setShipperHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: shipperTextColor }}>
            <p className="leading-[20px]">{activeTab === '협력사' ? '협력사' : '화주사'}</p>
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
                  <div className="h-[3px] relative w-[7px]">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" id="2021.11" stroke={shipperOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {shipperOpen && dropdownPos && createPortal(
          <div ref={dropRef} style={{
            position: 'fixed', top: dropdownPos.top, left: dropdownPos.left,
            width: 176, background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            zIndex: 9999, boxSizing: 'border-box',
          }}>
            <div style={{ padding: '8px 8px 2px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E4E5E9', borderRadius: 4, padding: '6px 10px', height: 36, boxSizing: 'border-box' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="6.57" cy="6.57" r="5.07" stroke="#9197A1" strokeWidth="1.3"/>
                  <line x1="10.91" y1="10.91" x2="14.5" y2="14.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  value={shipperSearch}
                  onChange={e => setShipperSearch(e.target.value)}
                  placeholder="화주사 검색"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#767D8A', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                />
              </div>
            </div>
            <div style={{ height: (shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS.filter(s => s.includes(shipperSearch)).length === 0)) ? 162 : undefined, maxHeight: (shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS.filter(s => s.includes(shipperSearch)).length === 0)) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS.filter(s => s.includes(shipperSearch)).length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : BUBBLE_SHIPPERS.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (shipperSearch && name.includes(shipperSearch)) || shipperSelected.has(origIdx)).map(({name, origIdx}) => (
                <div
                  key={origIdx}
                  onMouseEnter={() => setHoveredIdx(origIdx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => {
                    const next = new Set(shipperSelected);
                    if (next.has(origIdx)) next.delete(origIdx); else next.add(origIdx);
                    setShipperSelected(next);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '9px 8px 9px 4px', gap: 8,
                    height: 40, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box',
                    background: hoveredIdx === origIdx ? '#F6F7F8' : '#FFFFFF',
                  }}
                >
                  <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 16, height: 16,
                      border: shipperSelected.has(origIdx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9',
                      borderRadius: 3,
                      background: shipperSelected.has(origIdx) ? '#005FFF' : '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      {shipperSelected.has(origIdx) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
              <span
                onClick={e => { e.stopPropagation(); setShipperSelected(new Set()); setShipperSearch(''); }}
                style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}
              >
                필터 초기화
              </span>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* 화주사/협력사 업무그룹 bubble filter */}
      <ShipperGroupBubbleFilter313
        hidden={isDriverTab}
        label={activeTab === '협력사' ? '협력사 업무그룹' : '화주사 업무그룹'}
      />

      {/* 협력사 bubble filter - 협력사 탭에서만 표시 */}
      <div ref={partnerBtnRef} style={{ position: 'relative', display: isDriverTab ? undefined : 'none' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: partnerBg, border: partnerBorder }}
          data-name="Input / Dropdown_Filter"
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
            <p className="leading-[20px]">{isPartnerTab ? '협력사' : '요청협력사'}</p>
            {/* 기사 탭에서는 요청협력사 표시 (기본값) */}
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
                  <div className="h-[3px] relative w-[7px]">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" id="2021.11" stroke={partnerOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
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
            position: 'fixed', top: partnerDropPos.top, left: partnerDropPos.left,
            width: 176, background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            zIndex: 9999, boxSizing: 'border-box',
          }}>
            <div style={{ padding: '8px 8px 2px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E4E5E9', borderRadius: 4, padding: '6px 10px', height: 36, boxSizing: 'border-box' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="6.57" cy="6.57" r="5.07" stroke="#9197A1" strokeWidth="1.3"/>
                  <line x1="10.91" y1="10.91" x2="14.5" y2="14.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  value={partnerSearch}
                  onChange={e => setPartnerSearch(e.target.value)}
                  placeholder="협력사 검색"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#767D8A', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                />
              </div>
            </div>
            <div style={{ height: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313.filter(s => s.includes(partnerSearch)).length === 0)) ? 162 : undefined, maxHeight: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313.filter(s => s.includes(partnerSearch)).length === 0)) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313.filter(s => s.includes(partnerSearch)).length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : PARTNERS_313.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (partnerSearch && name.includes(partnerSearch)) || partnerSelected.has(origIdx)).map(({name, origIdx}) => (
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
                    display: 'flex', alignItems: 'center', padding: '9px 8px 9px 4px', gap: 8,
                    height: 40, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box',
                    background: partnerHoveredIdx === origIdx ? '#F6F7F8' : '#FFFFFF',
                  }}
                >
                  <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 16, height: 16,
                      border: partnerSelected.has(origIdx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9',
                      borderRadius: 3,
                      background: partnerSelected.has(origIdx) ? '#005FFF' : '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      {partnerSelected.has(origIdx) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
              <span
                onClick={e => { e.stopPropagation(); setPartnerSelected(new Set()); setPartnerSearch(''); }}
                style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}
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

function Component9() {
  return (
    <div className="content-stretch flex gap-[8px] isolate items-center relative shrink-0" data-name="필터 그룹">
      <Calender />
      <BubbleFilter313 />
    </div>
  );
}

function Component15() {
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

function Frame602() {
  const { setShipperSelected, setPartnerSelected } = useContext(BubbleCtx313);
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button"
        onClick={() => { setShipperSelected(new Set()); setPartnerSelected(new Set()); }}>
        <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/restart">
          <div className="absolute bg-white left-0 size-[16px] top-0" data-name="16 / ic_16_reload_gray">
            <Component15 />
          </div>
        </div>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">전체 초기화</p>
        </div>
      </div>
    </div>
  );
}

function Frame631() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Component9 />
      <Frame602 />
    </div>
  );
}

function FilterSorterModule() {
  return (
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="Filter_Sorter_Module">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame631 />
    </div>
  );
}

function Frame640() {
  const { saleCounts, saleTotalAmount } = useContext(DynamicCountCtx313);
  const totalCount = saleCounts.length > 0 ? saleCounts[0] : 5000;
  const totalAmount = saleCounts.length > 0 ? saleTotalAmount : ITEMS_313_TOTAL;
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체 ({totalCount.toLocaleString()}건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#005fff] text-[18px] tracking-[-0.36px]">{formatKorean(totalAmount)}</p>
    </div>
  );
}

function Frame634() {
  return (
    <div className="bg-[#f5f9ff] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#005fff] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame640 />
        </div>
      </div>
    </div>
  );
}

function Frame641() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">마감필요 (455건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">0원</p>
    </div>
  );
}

function Frame635() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame641 />
        </div>
      </div>
    </div>
  );
}

function Frame642() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">정산대기 (2,273건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">235,304,300원</p>
    </div>
  );
}

function Frame636() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame642 />
        </div>
      </div>
    </div>
  );
}

function Frame643() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">수금대기 (909건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">1,504,204,303원</p>
    </div>
  );
}

function Frame637() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame643 />
        </div>
      </div>
    </div>
  );
}

function Frame644() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">수금완료 (909건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">632,304,392,101원</p>
    </div>
  );
}

function Frame638() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame644 />
        </div>
      </div>
    </div>
  );
}

function Frame645() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">정산보류 (454건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">4,392,101원</p>
    </div>
  );
}

function Frame639() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame645 />
        </div>
      </div>
    </div>
  );
}

function Frame646() {
  return <StatusCardRowLarge items={ITEMS_313} />;
}

/* ──────────────────────────────────────────────
   매출 거래명세서 생성 모달
────────────────────────────────────────────── */
const SHIPPERS = [
  { alias: "화주사 별칭", name: "(주)글로벌로지스" },
  { alias: "물류센터A",  name: "(주)케이로지스틱스" },
  { alias: "판교물류",   name: "(주)판교물류솔루션" },
  { alias: "수원센터",   name: "(주)수원익스프레스" },
  { alias: "동탄허브",   name: "(주)동탄스마트물류" },
];
const GROUPS_BY_SHIPPER: Record<string, string[]> = {
  "(주)글로벌로지스":   ["기본 그룹", "판교본사", "수원지점", "기흥물류"],
  "(주)케이로지스틱스": ["기본 그룹", "강남팀", "분당팀"],
  "(주)판교물류솔루션": ["기본 그룹", "판교팀"],
  "(주)수원익스프레스": ["기본 그룹", "수원A팀", "수원B팀"],
  "(주)동탄스마트물류": ["기본 그룹", "동탄1팀"],
};
const GROUP_BIZ_NO: Record<string, Record<string, string>> = {
  "(주)글로벌로지스":   { "기본 그룹": "0001", "판교본사": "0002", "수원지점": "0002", "기흥물류": "0003" },
  "(주)케이로지스틱스": { "기본 그룹": "0001", "강남팀": "0002", "분당팀": "0002" },
  "(주)판교물류솔루션": { "기본 그룹": "0001", "판교팀": "0002" },
  "(주)수원익스프레스": { "기본 그룹": "0001", "수원A팀": "0002", "수원B팀": "0003" },
  "(주)동탄스마트물류": { "기본 그룹": "0001", "동탄1팀": "0002" },
};
const MODAL_PAGE_SIZE = 10;
const MODAL_TOTAL = 5000; // 매출장부 ORDER_IDS[0..4999]

const LOAD_PLACES  = ["판교테크노밸리", "강남물류센터", "수원허브", "인천항만", "부산신항", "광주물류단지", "대전허브터미널"];
const LOAD_ADDRS   = ["경기 성남시 삼평동", "서울 강남구 테헤란로", "경기 수원시 영통구", "인천 중구 항동", "부산 강서구 신항", "광주 광산구 도산동", "대전 유성구 도룡동"];
const UNLOAD_PLACES= ["광교물류", "하남센터", "의왕ICD", "안양물류", "평택허브", "성남물류", "용인터미널"];
const UNLOAD_ADDRS = ["경기 수원시 영통구", "경기 하남시 미사동", "경기 의왕시 월암동", "경기 안양시 동안구", "경기 평택시 포승읍", "경기 성남시 중원구", "경기 용인시 처인구"];
const AMOUNTS      = [250000, 310000, 180000, 420000, 275000, 350000, 195000, 460000, 230000, 385000];
const DATES        = ["25.10.20", "25.10.21", "25.10.22", "25.10.23", "25.10.24", "25.10.25", "25.10.26"];

function makeModalTableData(page: number, group: string) {
  const start = (page - 1) * MODAL_PAGE_SIZE;
  return Array.from({ length: Math.min(MODAL_PAGE_SIZE, MODAL_TOTAL - start) }, (_, i) => {
    const idx = start + i;
    return {
      id:          ORDER_IDS[idx],
      group,
      baseDate:    DATES[idx % DATES.length],
      loadDate:    DATES[(idx + 1) % DATES.length],
      unloadDate:  DATES[(idx + 2) % DATES.length],
      loadPlace:   LOAD_PLACES[idx % LOAD_PLACES.length],
      loadAddr:    LOAD_ADDRS[idx % LOAD_ADDRS.length],
      unloadPlace: UNLOAD_PLACES[idx % UNLOAD_PLACES.length],
      unloadAddr:  UNLOAD_ADDRS[idx % UNLOAD_ADDRS.length],
      amount:      AMOUNTS[idx % AMOUNTS.length].toLocaleString("ko-KR"),
      amountRaw:   AMOUNTS[idx % AMOUNTS.length],
    };
  });
}

function ModalPeriodCalendar({ anchorRect, start, end, onChange, onClose }: { anchorRect: DOMRect; start: string; end: string; onChange: (s: string, e: string) => void; onClose: () => void }) {
  const F = "'Pretendard GOV:Regular'";
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date(2026, 5, 29);
  const parse = (s: string) => { const [yy, mm, dd] = s.split('.').map(Number); return new Date(2000 + yy, mm - 1, dd); };
  const fmt = (d: Date | null) => { if (!d) return ''; const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yy}.${mm}.${dd}`; };
  const clr = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isSame = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const [rangeStart, setRangeStart] = useState<Date | null>(start ? parse(start) : null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(end ? parse(end) : null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [viewYear, setViewYear] = useState(start ? parse(start).getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(start ? parse(start).getMonth() : today.getMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleDay = (date: Date) => {
    const d = clr(date);
    if (!selecting) { setRangeStart(d); setRangeEnd(null); setSelecting(true); }
    else { const s = clr(rangeStart!); if (d < s) { setRangeStart(d); setRangeEnd(s); } else { setRangeEnd(d); } setSelecting(false);
      const finalS = d < clr(rangeStart!) ? d : clr(rangeStart!);
      const finalE = d < clr(rangeStart!) ? clr(rangeStart!) : d;
      onChange(fmt(finalS), fmt(finalE)); onClose(); }
  };

  const isInRange = (date: Date) => {
    const d = clr(date), s = rangeStart ? clr(rangeStart) : null;
    const e = selecting && hoverDate ? clr(hoverDate) : (rangeEnd ? clr(rangeEnd) : null);
    if (!s || !e) return false;
    const lo = s <= e ? s : e, hi = s <= e ? e : s;
    return d > lo && d < hi;
  };
  const isS = (date: Date) => !!rangeStart && isSame(clr(date), clr(rangeStart));
  const isE = (date: Date) => { const e = selecting && hoverDate ? hoverDate : rangeEnd; return !!e && isSame(clr(date), clr(e)); };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), inMonth: false });

  return (
    <div ref={ref} style={{ position: 'fixed', top: anchorRect.bottom + 4, left: anchorRect.left, width: 276, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 12px 0', boxSizing: 'border-box' }}>
      {/* 월 헤더 */}
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
      {/* 요일 */}
      <div style={{ display: 'flex', width: 252, paddingTop: 12, boxSizing: 'border-box' }}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} style={{ width: 36, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#454B55', letterSpacing: '-0.02em' }}>{d}</span>
          </div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 252, gap: '2px 0' }}>
        {cells.map((cell, i) => {
          const inR = isInRange(cell.date), isSt = isS(cell.date), isEd = isE(cell.date);
          const effEnd = selecting && hoverDate ? hoverDate : rangeEnd;
          const sameDay = rangeStart && effEnd && isSame(clr(rangeStart), clr(effEnd));
          let halfBg: React.CSSProperties = {};
          if (effEnd && !sameDay) { if (isSt) halfBg = { background: 'linear-gradient(to right, transparent 50%, #E6EFFF 50%)' }; else if (isEd) halfBg = { background: 'linear-gradient(to left, transparent 50%, #E6EFFF 50%)' }; }
          const isT = isSame(cell.date, today);
          return (
            <div key={i} style={{ width: 36, height: 36, cursor: cell.inMonth ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', ...(inR && !isSt && !isEd ? { background: '#E6EFFF' } : {}), ...((isSt || isEd) ? halfBg : {}) }}
              onMouseEnter={() => { if (selecting && cell.inMonth) setHoverDate(cell.date); }}
              onMouseLeave={() => { if (selecting) setHoverDate(null); }}
              onClick={() => { if (cell.inMonth) handleDay(cell.date); else { setViewYear(cell.date.getFullYear()); setViewMonth(cell.date.getMonth()); } }}>
              <div style={{ width: 36, height: 36, borderRadius: (isSt || isEd) ? 20 : isT ? 100 : 0, background: (isSt || isEd) ? '#005FFF' : isT ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: (isSt || isEd) ? 600 : 400, color: (isSt || isEd) ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#9197A1', letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* 시작일/종료일 표시 */}
      <div style={{ width: 252, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0 8px', boxSizing: 'border-box' }}>
        {[{ label: '시작일', val: rangeStart }, { label: '종료일', val: rangeEnd }].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '0 0 0 4px', gap: 24 }}>
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#5C6370', letterSpacing: '-0.02em', lineHeight: '19px', width: 34 }}>{label}</span>
            <div style={{ flex: 1, height: 36, border: '1px solid #E4E5E9', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 4, boxSizing: 'border-box', background: '#FFFFFF' }}>
              <svg width="14" height="14" viewBox="0 0 14 14.4" fill="none" style={{ flexShrink: 0 }}><path d="M1 2.5h12v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2.5zm0 3.5h12M4.5 1v3M9.5 1v3" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span style={{ fontFamily: F, fontSize: 15, color: val ? '#2E3238' : '#767D8A', lineHeight: '22px', letterSpacing: '-0.02em' }}>{val ? fmt(val) : '날짜 선택'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalCalendarDropdown({ anchorRect, value, onChange, onClose }: { anchorRect: DOMRect; value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const parseDate = (s: string) => { const [yy, mm, dd] = s.split('.').map(Number); return new Date(2000 + yy, mm - 1, dd); };
  const formatDate = (d: Date) => { const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${yy}.${mm}.${dd}`; };
  const today = new Date(2026, 5, 29);
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), inMonth: false });
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const quickBtns = [
    { label: '오늘', get: () => today },
    { label: '어제', get: () => new Date(today.getTime() - 86400000) },
    { label: '이번주', get: () => { const d = new Date(today); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); return d; } },
    { label: '이번달', get: () => new Date(today.getFullYear(), today.getMonth(), 1) },
    { label: '저번달', get: () => new Date(today.getFullYear(), today.getMonth() - 1, 1) },
    { label: '+1주', get: () => new Date(selected.getTime() + 7 * 86400000) },
    { label: '+1달', get: () => new Date(selected.getFullYear(), selected.getMonth() + 1, selected.getDate()) },
    { label: '+3달', get: () => new Date(selected.getFullYear(), selected.getMonth() + 3, selected.getDate()) },
  ];
  return (
    <div ref={ref} style={{ position: 'fixed', top: anchorRect.bottom + 2, left: anchorRect.left, width: 276, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 99999, boxSizing: 'border-box' }}>
      <div style={{ width: 252, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px' }}>
          <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontSize: 18, fontWeight: 700, color: '#2E3238', letterSpacing: '-0.02em' }}>{viewYear}년 {viewMonth + 1}월</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[[-1, '‹'], [1, '›']].map(([dir, ch]) => (
              <button key={ch as string} onClick={() => { const d = new Date(viewYear, viewMonth + (dir as number), 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }} style={{ width: 26, height: 26, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#2E3238' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{ch}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', width: 252 }}>
          {['일','월','화','수','목','금','토'].map(d => <div key={d} style={{ width: 36, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#454B55', letterSpacing: '-0.02em' }}>{d}</span></div>)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 252, gap: '2px 0' }}>
          {cells.map((cell, i) => {
            const isSel = isSameDay(cell.date, selected);
            const isToday = isSameDay(cell.date, today);
            const key = cell.date.toISOString().slice(0, 10);
            const isHov = hovered === key && !isSel && cell.inMonth;
            return (
              <div key={i} style={{ width: 36, height: 36, position: 'relative', cursor: cell.inMonth ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={() => cell.inMonth && setHovered(key)} onMouseLeave={() => setHovered(null)}
                onClick={() => { if (cell.inMonth) { onChange(formatDate(cell.date)); onClose(); } else { setViewYear(cell.date.getFullYear()); setViewMonth(cell.date.getMonth()); } }}>
                <div style={{ width: 36, height: 36, borderRadius: isSel ? 20 : (isToday || isHov) ? 100 : 0, background: isSel ? '#005FFF' : (isToday || isHov) ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: isSel ? 600 : 400, color: isSel ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#9197A1', letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ borderTop: '1px solid #E4E5E9', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {quickBtns.map(({ label, get }) => (
          <button key={label} onClick={() => { onChange(formatDate(get())); onClose(); }} style={{ border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', fontSize: 14, fontWeight: 600, color: '#2E3238', padding: '0 8px', height: 26, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function ModalCalendarBtn({ label }: { label: string }) {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
            <div className="h-[14.4px] relative shrink-0 w-[14px]">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14.4004">
                <path d={modalSvg.p31eb2f00} fill="#9197A1" />
              </svg>
            </div>
          </div>
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">{label}</p>
          </div>
          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
            <div className="flex items-center justify-center"><div className="-scale-y-100 flex-none">
              <div className="h-[4px] relative w-[10px]">
                <div className="absolute inset-[-17.5%_-7%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                    <path d={modalSvg.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                  </svg>
                </div>
              </div>
            </div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalTableHeaderCell({ label }: { label: string }) {
  return (
    <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center p-[8px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px] overflow-hidden text-ellipsis">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalTableDataCell({ children, underline = false }: { children: React.ReactNode; underline?: boolean }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className={`[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap ${underline ? "text-[0px]" : ""}`}>
            {underline ? <p className="[text-decoration-skip-ink:none] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{children}</p>
              : <p className="leading-[22px] overflow-hidden text-ellipsis">{children}</p>}
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function ModalTableColumn({ width, header, rows, underline = false }: { width: number; header: string; rows: React.ReactNode[]; underline?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width }}>
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <ModalTableHeaderCell label={header} />
        {rows.map((cell, i) => <ModalTableDataCell key={i} underline={underline}>{cell}</ModalTableDataCell>)}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function ClearIcon({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 flex items-center justify-center" style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}>
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="7" fill="#9197A1" />
        <path d="M9.46 4.54C9.206 4.286 8.794 4.286 8.54 4.54L7 6.08L5.46 4.54C5.206 4.286 4.794 4.286 4.54 4.54C4.286 4.794 4.286 5.206 4.54 5.46L6.08 7L4.54 8.54C4.286 8.794 4.286 9.206 4.54 9.46C4.794 9.714 5.206 9.714 5.46 9.46L7 7.92L8.54 9.46C8.794 9.714 9.206 9.714 9.46 9.46C9.714 9.206 9.714 8.794 9.46 8.54L7.92 7L9.46 5.46C9.714 5.206 9.714 4.794 9.46 4.54Z" fill="white" />
      </svg>
    </button>
  );
}

interface AdjItem { id: number; amount: number; sign: '+' | '-'; note: string; }

function AdjustmentItem({ item, index, onChange, onRemove }: {
  item: AdjItem; index: number;
  onChange: (updated: AdjItem) => void;
  onRemove: () => void;
}) {
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
        {/* 헤더 */}
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">조정금액 {index + 1}</p>
          <button onClick={onRemove} className="relative shrink-0 rounded-[4px] hover:bg-[#f6f7f8] transition-colors" style={{ width: '12.8px', height: '12.8px' }}>
            <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 12.17 12.17">
              <path d="M0.75 0.75L11.4167 11.4167" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
              <path d={modalSvg.p3a8dbd00} stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        {/* +/- 토글 + 금액 input */}
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
          <div className="content-stretch flex items-center relative shrink-0">
            <div className="bg-white h-[36px] min-w-[51px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0">
              <button onClick={() => onChange({ ...item, sign: '+' })} className="w-full h-full flex items-center justify-center px-[10px]">
                <div aria-hidden className={`absolute inset-0 pointer-events-none border ${item.sign === '+' ? "border-[#005fff] rounded-[4px]" : "border-[#e3e5e9] rounded-tl-[4px] rounded-bl-[4px] border-r-0"}`} />
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d={modalSvg.p918e800} fill={item.sign === '+' ? "#005FFF" : "#9197A1"} /></svg>
              </button>
            </div>
            <div className="bg-white h-[36px] min-w-[50px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0">
              <button onClick={() => onChange({ ...item, sign: '-' })} className="flex items-center justify-center size-full px-[12px]">
                <svg width="14" height="1.3" fill="none" viewBox="0 0 14 1.3"><line stroke={item.sign === '-' ? "#005FFF" : "#9197A1"} strokeLinecap="round" strokeWidth="1.3" x1="0.65" x2="13.35" y1="0.65" y2="0.65" /></svg>
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
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                />
                <span className={`font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] shrink-0 ${item.amount === 0 ? "text-[#767d8a]" : "text-[#2e3238]"}`}>원</span>
                {amountFocused && item.amount !== 0 && <div style={{ marginLeft: 4 }} onMouseDown={e => e.preventDefault()}><ClearIcon onClick={() => onChange({ ...item, amount: 0 })} /></div>}
              </div>
            </div>
          </div>
        </div>
        {/* 사유 input */}
        <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full">
          <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full group">
            <div aria-hidden className={`absolute border inset-0 pointer-events-none rounded-[4px] transition-colors ${noteFocused ? "border-[#005fff]" : "border-[#e3e5e9] group-hover:border-[#adb1b9]"}`} />
            <div className="flex flex-row items-center size-full px-[10px] py-[6px]">
              <input
                className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]"
                placeholder="조정 사유를 입력해 주세요."
                value={item.note}
                onChange={e => onChange({ ...item, note: e.target.value })}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
              {noteFocused && item.note && <span onMouseDown={e => e.preventDefault()}><ClearIcon onClick={() => onChange({ ...item, note: "" })} /></span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TOAST_ANIMATION = `
  @keyframes toast-slide-in {
    from { transform: translateX(calc(100% + 34px)); opacity: 0; }
    to   { transform: translateX(0);                 opacity: 1; }
  }
`;
const TOAST_STYLE: React.CSSProperties = {
  position: "fixed", bottom: 34, right: 34, width: 400, height: 54,
  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "0 20px", zIndex: 99999, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  animation: "toast-slide-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
};
function ToastCloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function InvoiceToast({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <>
      <style>{TOAST_ANIMATION}</style>
      <div style={{ ...TOAST_STYLE, background: "#2E3238" }}>
        <span style={{ color: "#fff", fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: "-0.3px", lineHeight: "22px" }}>
          매출 거래명세서가 생성되었습니다.
        </span>
        <ToastCloseBtn onClose={onClose} />
      </div>
    </>,
    document.body
  );
}

function InvoiceErrorToast({ onClose, message }: { onClose: () => void; message?: string }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <>
      <style>{TOAST_ANIMATION}</style>
      <div style={{ ...TOAST_STYLE, background: "#E13838" }}>
        <span style={{ color: "#fff", fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: "-0.3px", lineHeight: "22px" }}>
          {message ?? '정산대기 상태의 오더만 거래명세서 생성이 가능합니다.'}
        </span>
        <ToastCloseBtn onClose={onClose} />
      </div>
    </>,
    document.body
  );
}

function CollectCompleteConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }} onClick={onClose}>
      <div style={{ width: 360, background: '#FFFFFF', borderRadius: 12, padding: 24, boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
        <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[16px] leading-[24px] tracking-[-0.32px]" style={{ marginBottom: 8 }}>수금을 완료 처리하시겠어요?</p>
        <p className="font-['Pretendard_GOV:Regular'] text-[#5c6370] text-[14px] leading-[20px] tracking-[-0.28px]" style={{ marginBottom: 20 }}>수금완료 처리 후에는 매출 상태가 수금완료로 변경됩니다.</p>
        <div className="flex flex-row gap-[8px]">
          <div className="flex items-center justify-center cursor-pointer" style={{ flex: 1, height: 40, border: '1px solid #E4E5E9', borderRadius: 4 }} onClick={onClose}>
            <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[15px] leading-[22px]">취소</p>
          </div>
          <div className="flex items-center justify-center cursor-pointer" style={{ flex: 1, height: 40, background: '#005FFF', borderRadius: 4 }} onClick={onConfirm}>
            <p className="font-['Pretendard_GOV:SemiBold'] text-white text-[15px] leading-[22px]">수금완료</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 오더 인덱스 → 화주사/그룹 결정 (5000개를 5개 화주사에 균등 배분)
function getShipperForIndex(idx: number) {
  const shipperIdx = Math.floor(idx / (MODAL_TOTAL / SHIPPERS.length)) % SHIPPERS.length;
  return SHIPPERS[shipperIdx];
}
function getGroupForIndex(idx: number, shipperName: string) {
  const groups = GROUPS_BY_SHIPPER[shipperName] ?? ["기본 그룹"];
  return groups[idx % groups.length];
}

function CreateInvoiceModal({ onClose, preSelectedIndices = [], onSuccess }: { onClose: () => void; preSelectedIndices?: number[]; onSuccess?: () => void }) {
  const hasPreSelected = preSelectedIndices.length > 0;

  // 사전 선택된 오더로 화주사/그룹 자동 결정
  const autoShipper = hasPreSelected ? getShipperForIndex(preSelectedIndices[0]) : null;
  const autoGroup   = hasPreSelected && autoShipper ? getGroupForIndex(preSelectedIndices[0], autoShipper.name) : null;

  const [shipperQuery, setShipperQuery] = useState(autoShipper?.name ?? "");
  const [selectedShipper, setSelectedShipper] = useState<typeof SHIPPERS[0] | null>(autoShipper);
  const [shipperOpen, setShipperOpen] = useState(false);
  const [searchType, setSearchType] = useState<'화주사 별칭' | '별칭'>('화주사 별칭');
  const [searchTypeOpen, setSearchTypeOpen] = useState(false);
  const shipperRef = useRef<HTMLDivElement>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(autoGroup ? [autoGroup] : []);
  const [groupSearch, setGroupSearch] = useState('');
  const groupRef = useRef<HTMLDivElement>(null);
  const groupBtnRef = useRef<HTMLButtonElement>(null);
  const [groupDropPos, setGroupDropPos] = useState<{ top: number; left: number; width: number; scale: number } | null>(null);
  const [groupBizNoErrorToast, setGroupBizNoErrorToast] = useState(false);
  useEffect(() => { if (!groupBizNoErrorToast) return; const t = setTimeout(() => setGroupBizNoErrorToast(false), 4000); return () => clearTimeout(t); }, [groupBizNoErrorToast]);
  const [periodStart, setPeriodStart] = useState('25.08.13');
  const [periodEnd, setPeriodEnd] = useState('25.08.13');
  const [openPeriodCal, setOpenPeriodCal] = useState<'start' | 'end' | null>(null);
  const [periodCalPos, setPeriodCalPos] = useState<DOMRect | null>(null);
  const periodBtnRef = useRef<HTMLDivElement>(null);
  const [writeDate, setWriteDate] = useState('25.08.13');
  const [openWriteCal, setOpenWriteCal] = useState(false);
  const [writeCalPos, setWriteCalPos] = useState<DOMRect | null>(null);
  const writeBtnRef = useRef<HTMLDivElement>(null);
  const [dueDate, setDueDate] = useState('25.08.13');
  const [openDueCal, setOpenDueCal] = useState(false);
  const [dueCalPos, setDueCalPos] = useState<DOMRect | null>(null);
  const dueBtnRef = useRef<HTMLDivElement>(null);
  const [hasData, setHasData] = useState(hasPreSelected);
  const [adjItems, setAdjItems] = useState<AdjItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const availableGroups = selectedShipper ? GROUPS_BY_SHIPPER[selectedShipper.name] ?? [] : [];
  const groupLabel = selectedGroups.length > 0 ? selectedGroups.join(", ") : null;
  const canSearch = !!selectedShipper && selectedGroups.length > 0;

  // 사전 선택 오더가 있으면 해당 행들을, 없으면 페이지 기반으로 표시
  const tableData = hasData
    ? hasPreSelected
      ? preSelectedIndices.slice((currentPage - 1) * MODAL_PAGE_SIZE, currentPage * MODAL_PAGE_SIZE).map(idx => ({
          id:          ORDER_IDS[idx],
          group:       selectedGroups[0] ?? "기본 그룹",
          baseDate:    DATES[idx % DATES.length],
          loadDate:    DATES[(idx + 1) % DATES.length],
          unloadDate:  DATES[(idx + 2) % DATES.length],
          loadPlace:   LOAD_PLACES[idx % LOAD_PLACES.length],
          loadAddr:    LOAD_ADDRS[idx % LOAD_ADDRS.length],
          unloadPlace: UNLOAD_PLACES[idx % UNLOAD_PLACES.length],
          unloadAddr:  UNLOAD_ADDRS[idx % UNLOAD_ADDRS.length],
          amount:      AMOUNTS[idx % AMOUNTS.length].toLocaleString("ko-KR"),
          amountRaw:   AMOUNTS[idx % AMOUNTS.length],
        }))
      : makeModalTableData(currentPage, selectedGroups[0] ?? "기본 그룹")
    : [];
  const totalPages = hasPreSelected
    ? Math.max(1, Math.ceil(preSelectedIndices.length / MODAL_PAGE_SIZE))
    : Math.ceil(MODAL_TOTAL / MODAL_PAGE_SIZE);
  const filteredByName = shipperQuery ? SHIPPERS.filter(s => s.name.includes(shipperQuery)) : [];
  const filteredByAlias = shipperQuery ? SHIPPERS.filter(s => s.alias.includes(shipperQuery)) : [];
  const filteredShippers = SHIPPERS.filter(s => s.name.includes(shipperQuery) || s.alias.includes(shipperQuery));

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (shipperRef.current && !shipperRef.current.contains(e.target as Node)) setShipperOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node) && groupBtnRef.current && !groupBtnRef.current.contains(e.target as Node)) setGroupOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function selectShipper(s: typeof SHIPPERS[0]) {
    setSelectedShipper(s); setSelectedGroups([]); setHasData(false);
    setShipperOpen(false); setShipperQuery(s.name);
  }
  function toggleGroup(g: string) {
    if (!selectedShipper) return;
    const bizNoMap = GROUP_BIZ_NO[selectedShipper.name] ?? {};
    const clickedBizNo = bizNoMap[g];
    // 이미 선택된 그룹이 있고, 종사업자번호가 다르면 토스트
    const existingSelected = selectedGroups.filter(x => x !== g);
    if (existingSelected.length > 0 && !selectedGroups.includes(g)) {
      const existingBizNo = bizNoMap[existingSelected[0]];
      if (clickedBizNo && existingBizNo && clickedBizNo !== existingBizNo) {
        setGroupBizNoErrorToast(true);
        return;
      }
    }
    setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    setHasData(false);
  }

  const billing = hasData ? tableData.reduce((s, r) => s + r.amountRaw, 0) : 0;
  const group1Amt = hasData ? Math.round(billing * 0.68) : 0;
  const group2Amt = hasData && selectedGroups.length > 1 ? billing - group1Amt : 0;
  const adjTotal = hasData ? adjItems.reduce((sum, it) => sum + (it.sign === '+' ? it.amount : -it.amount), 0) : 0;
  const supply = billing + adjTotal;
  const tax = Math.round(supply * 0.1);
  const total = supply + tax;
  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
  const TABLE_COLS = ["오더ID","화주사 업무그룹","매출 명세서 기준일","상차일","하차일","상차지명","상차지주소","하차지명","하차지주소","청구금액 합계"];

  return (
    <>{groupBizNoErrorToast && createPortal(
      <>
        <style>{TOAST_ANIMATION}</style>
        <div style={{ ...TOAST_STYLE, background: '#E13838', height: 'auto', padding: '16px 20px' }}>
          <span style={{ color: '#fff', fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '22px', flex: 1 }}>
            선택된 업무그룹의 종사업장번호와 동일한 업무그룹을 선택해 주세요.
          </span>
          <ToastCloseBtn onClose={() => setGroupBizNoErrorToast(false)} />
        </div>
      </>,
      document.body
    )}
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(46,50,56,0.4)]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[rgba(46,50,56,0.04)] flex flex-col items-start overflow-clip relative rounded-[12px]" style={{ width: 1600, height: 800, fontSize: 15, fontFamily: "'Pretendard GOV', sans-serif" }}>
        {/* Header */}
        <div className="bg-white h-[74px] relative rounded-tl-[12px] rounded-tr-[12px] shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-[12px] items-start pb-[16px] pt-[24px] px-[24px] relative size-full">
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
              <p className="font-['Pretendard_GOV:Bold'] leading-[32px] not-italic text-[#2e3238] text-[22px] tracking-[-0.44px] whitespace-nowrap">매출 거래명세서 생성</p>
              <button onClick={onClose} className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[26px] hover:bg-[#f6f7f8]">
                <svg width="17.5" height="17.5" fill="none" viewBox="0 0 17.5 17.5">
                  <path d="M0.75 0.75L16.75 16.75" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
                  <path d={modalSvg.p2e842600} stroke="#9197A1" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
          </div>
          <div className="absolute bg-[#e3e5e9] bottom-0 h-px left-0 right-0" />
        </div>

        {/* Body */}
        <div className="bg-white content-stretch flex flex-[1_0_0] items-start min-h-px relative w-full overflow-hidden">
          {/* Left */}
          <div className="flex-[1_0_0] h-full min-w-px relative">
            <div className="overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex flex-col gap-[16px] items-start pb-[20px] pt-[12px] px-[24px] relative size-full">
                {/* Filters */}
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                  {/* 화주사 */}
                  <div className="content-stretch flex items-start relative shrink-0 w-full" style={{ flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: 36 }}>
                      <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">화주사</p>
                      <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }} ref={shipperRef}>
                        {/* 검색 타입 선택 드롭다운 */}
                        <div style={{ position: 'relative', marginRight: -1, flexShrink: 0 }}
                          onClick={() => setSearchTypeOpen(o => !o)}>
                          <div style={{ height: 36, background: '#fff', border: '1px solid #E4E5E9', borderRadius: '4px 0 0 4px', display: 'inline-flex', alignItems: 'center', paddingLeft: 10, paddingRight: 8, paddingTop: 6, paddingBottom: 6, gap: 4, cursor: 'pointer', boxSizing: 'border-box' }}>
                            <span style={{ fontSize: 15, fontWeight: 400, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', whiteSpace: 'nowrap' }}>{searchType}</span>
                            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
                              <div className="flex items-center justify-center">
                                <div className={searchTypeOpen ? "" : "-scale-y-100"}>
                                  <div className="h-[4px] relative w-[10px]">
                                    <div className="absolute inset-[-17.5%_-7%]">
                                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                                        <path d={modalSvg.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {searchTypeOpen && (
                            <div style={{ position: 'absolute', top: 38, left: 0, width: 160, background: '#fff', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', zIndex: 200, overflow: 'hidden', padding: 8 }}>
                              {(['화주사 별칭', '별칭'] as const).map(t => (
                                <div key={t} onClick={e => { e.stopPropagation(); setSearchType(t); setSearchTypeOpen(false); setShipperQuery(''); }}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 8px', fontSize: 15, color: t === searchType ? '#005FFF' : '#2E3238', borderRadius: 4, cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}
                                  onMouseEnter={e => { if (t !== searchType) (e.currentTarget as HTMLElement).style.background = '#F6F7F8'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                                >
                                  <span>{t}</span>
                                  {t === searchType && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M3 8.5L6.5 12L13 4.5" stroke="#005FFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* 검색 입력창 */}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{ height: 36, background: '#fff', border: `1px solid ${shipperOpen && shipperQuery ? '#005FFF' : '#E4E5E9'}`, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 4, boxSizing: 'border-box' }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M7.07129 1C10.4245 1 13.1434 3.71863 13.1436 7.07227L13.1357 7.38477C13.0688 8.70557 12.5786 9.91398 11.7998 10.8799L14.8066 13.8867C15.0604 14.1405 15.0602 14.5528 14.8066 14.8066C14.5528 15.0605 14.1405 15.0605 13.8867 14.8066L10.8799 11.7998C9.83804 12.6401 8.51389 13.1445 7.07129 13.1445C3.71817 13.1443 1 10.4258 1 7.07227C1.0001 3.71877 3.71823 1.00023 7.07129 1ZM7.07129 2.2998C4.43635 2.30004 2.29991 4.43659 2.2998 7.07227C2.2998 9.70803 4.43629 11.8445 7.07129 11.8447C9.70649 11.8447 11.8438 9.70817 11.8438 7.07227C11.8436 4.43645 9.70642 2.2998 7.07129 2.2998Z" fill="#9197A1"/>
                            </svg>
                            <input
                              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                              placeholder={`${searchType}으로 검색`}
                              value={shipperQuery}
                              onChange={e => { setShipperQuery(e.target.value); setShipperOpen(true); }}
                              onFocus={() => setShipperOpen(true)}
                            />
                            {shipperQuery && (
                              <div onClick={() => { setShipperQuery(''); setShipperOpen(false); setSelectedShipper(null); setSelectedGroups([]); setHasData(false); }} style={{ cursor: 'pointer', flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: '#9197A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* 결과 드롭다운 */}
                          {shipperOpen && (
                            <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: '#fff', border: '1px solid #E4E5E9', boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, zIndex: 200, boxSizing: 'border-box', overflow: 'hidden' }}>
                              {!shipperQuery || (filteredByName.length === 0 && filteredByAlias.length === 0) ? (
                                <div style={{ height: 234, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                                  </svg>
                                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                                </div>
                              ) : (
                                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 234, overflowY: 'auto' }}>
                                  {filteredByName.length > 0 && (
                                    <>
                                      <div style={{ background: '#EBEDEF', borderRadius: 4, padding: '8px', marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>화주사 별칭</span>
                                      </div>
                                      {filteredByName.map(s => {
                                        const isSelected = selectedShipper?.name === s.name;
                                        return (
                                          <div key={s.name} onClick={() => { selectShipper(s); setShipperOpen(false); }}
                                            style={{ padding: '9px 8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 4, height: 40, boxSizing: 'border-box' }}
                                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F6F7F8'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}>
                                            <span style={{ flex: 1, fontSize: 15, color: isSelected ? '#005FFF' : '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{s.name}</span>
                                            {isSelected && (
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                                <path d="M3 8L6.5 11.5L13 4.5" stroke="#005FFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}
                                  {filteredByAlias.length > 0 && (
                                    <>
                                      <div style={{ background: '#EBEDEF', borderRadius: 4, padding: '8px', marginTop: filteredByName.length > 0 ? 4 : 0, display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>별칭</span>
                                      </div>
                                      {filteredByAlias.map(s => {
                                        const isSelected = selectedShipper?.name === s.name;
                                        return (
                                          <div key={s.name} onClick={() => { selectShipper(s); setShipperOpen(false); }}
                                            style={{ padding: '9px 8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 4, height: 40, boxSizing: 'border-box' }}
                                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F6F7F8'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}>
                                            <span style={{ flex: 1, fontSize: 15, color: isSelected ? '#005FFF' : '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{s.alias}</span>
                                            {isSelected && (
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                                <path d="M3 8L6.5 11.5L13 4.5" stroke="#005FFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 화주사 업무그룹 */}
                  <div className="content-stretch flex items-start relative shrink-0 w-full" style={{ flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: 36 }}>
                      <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">화주사 업무그룹</p>
                      <div style={{ flex: 1, position: 'relative' }}>
                        {/* 트리거 버튼 */}
                        <button
                          ref={groupBtnRef}
                          onClick={() => {
                            if (!selectedShipper) return;
                            if (!groupOpen) {
                              const r = groupBtnRef.current!.getBoundingClientRect();
                              const sc = window.innerWidth / 1920;
                              setGroupDropPos({ top: r.bottom + 2, left: r.left, width: r.width, scale: sc });
                            }
                            setGroupOpen(o => !o);
                          }}
                          style={{ width: '100%', height: 36, background: '#fff', border: `1px solid ${groupOpen ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 4, cursor: selectedShipper ? 'pointer' : 'not-allowed', opacity: selectedShipper ? 1 : 0.6, boxSizing: 'border-box', textAlign: 'left', fontSize: 15, fontFamily: "'Pretendard GOV', sans-serif" }}
                        >
                          <span style={{ flex: 1, fontSize: 15, fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', color: groupLabel ? '#2E3238' : '#767D8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {groupLabel ?? '화주사 업무그룹'}
                          </span>
                          <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
                            <div className="flex items-center justify-center">
                              <div className={groupOpen ? "" : "-scale-y-100"}>
                                <div className="h-[4px] relative w-[10px]"><div className="absolute inset-[-17.5%_-7%]">
                                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                                    <path d={modalSvg.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                                  </svg>
                                </div></div>
                              </div>
                            </div>
                          </div>
                        </button>
                        {/* 드롭다운 - portal */}
                        {groupOpen && selectedShipper && groupDropPos && createPortal((() => {
                          const filtered = groupSearch ? availableGroups.filter(g => g.includes(groupSearch)) : availableGroups;
                          const allChecked = availableGroups.length > 0 && availableGroups.every(g => selectedGroups.includes(g));
                          const bizNos = selectedShipper ? Object.values(GROUP_BIZ_NO[selectedShipper.name] ?? {}) : [];
                          const allSameBizNo = bizNos.length > 0 && bizNos.every(n => n === bizNos[0]);
                          const canSelectAll = allSameBizNo;
                          return (
                            <div ref={groupRef} style={{ position: 'fixed', top: groupDropPos.top, left: groupDropPos.left, width: groupDropPos.width / groupDropPos.scale, background: '#fff', border: '1px solid #E4E5E9', boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, zIndex: 99999, boxSizing: 'border-box', overflow: 'hidden', fontSize: 15, fontWeight: 400, fontFamily: "'Pretendard GOV', sans-serif", transform: `scale(${groupDropPos.scale})`, transformOrigin: 'top left' }}>
                              {/* 검색 */}
                              <div style={{ padding: '8px 8px 2px', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E4E5E9', borderRadius: 4, padding: '6px 10px', height: 36, boxSizing: 'border-box' }}>
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                    <path d="M7.07129 1C10.4245 1 13.1434 3.71863 13.1436 7.07227L13.1357 7.38477C13.0688 8.70557 12.5786 9.91398 11.7998 10.8799L14.8066 13.8867C15.0604 14.1405 15.0602 14.5528 14.8066 14.8066C14.5528 15.0605 14.1405 15.0605 13.8867 14.8066L10.8799 11.7998C9.83804 12.6401 8.51389 13.1445 7.07129 13.1445C3.71817 13.1443 1 10.4258 1 7.07227C1.0001 3.71877 3.71823 1.00023 7.07129 1ZM7.07129 2.2998C4.43635 2.30004 2.29991 4.43659 2.2998 7.07227C2.2998 9.70803 4.43629 11.8445 7.07129 11.8447C9.70649 11.8447 11.8438 9.70817 11.8438 7.07227C11.8436 4.43645 9.70642 2.2998 7.07129 2.2998Z" fill="#9197A1"/>
                                  </svg>
                                  <input autoFocus value={groupSearch} onChange={e => setGroupSearch(e.target.value)}
                                    placeholder="업무그룹명"
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                                  />
                                </div>
                              </div>
                              {/* 전체선택 */}
                              {!groupSearch && (
                                <div style={{ padding: '4px 8px 2px' }}>
                                  <div onClick={() => canSelectAll && setSelectedGroups(allChecked ? [] : [...availableGroups])}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 4px', cursor: canSelectAll ? 'pointer' : 'not-allowed', height: 40, boxSizing: 'border-box' }}>
                                    <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {!canSelectAll ? (
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect width="16" height="16" rx="4" fill="#262D39" fillOpacity="0.08"/>
                                        </svg>
                                      ) : (
                                        <div style={{ width: 16, height: 16, border: allChecked ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: allChecked ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                          {allChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 15, fontWeight: 400, color: canSelectAll ? '#2E3238' : '#ADB1B9', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>전체 선택</span>
                                  </div>
                                  <div style={{ height: 1, background: '#E4E5E9' }} />
                                </div>
                              )}
                              {/* 그룹 목록 */}
                              <div style={{ maxHeight: 216, overflowY: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                                {filtered.map(g => {
                                  const checked = selectedGroups.includes(g);
                                  return (
                                    <div key={g} onClick={() => toggleGroup(g)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px 9px 4px', cursor: 'pointer', borderRadius: 4, boxSizing: 'border-box', height: 40 }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F6F7F8'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                      <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <div style={{ width: 16, height: 16, border: checked ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: checked ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                                          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </div>
                                      </div>
                                      <span style={{ fontSize: 15, fontWeight: 400, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>
                                        {g}{selectedShipper && GROUP_BIZ_NO[selectedShipper.name]?.[g] ? ` (${GROUP_BIZ_NO[selectedShipper.name][g]})` : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })(), document.body)}
                      </div>
                    </div>
                  </div>
                  {/* 정산기간 */}
                  <div className="content-stretch flex h-[36px] items-center relative shrink-0 w-full">
                    <div className="content-stretch flex gap-[4px] items-center relative shrink-0 w-[120px]">
                      <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">정산기간</p>
                      <div className="relative shrink-0 size-[16px]">
                        <svg width="16" height="16" fill="none" viewBox="0 0 14 14" className="absolute left-px top-px">
                          <circle cx="7" cy="7" r="6.35" stroke="#9197A1" strokeWidth="1.3" />
                          <path d="M7 7L7 9.5" stroke="#9197A1" strokeLinecap="round" strokeWidth="1.3" />
                          <ellipse cx="7.00001" cy="4.8" fill="#9197A1" rx="0.8" ry="0.8" />
                        </svg>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                      <div ref={periodBtnRef} className="relative shrink-0 w-[198px]" style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const r = periodBtnRef.current!.getBoundingClientRect();
                          setPeriodCalPos(r);
                          setOpenPeriodCal(prev => prev ? null : 'start');
                        }}>
                        <ModalCalendarBtn label={`${periodStart} ~ ${periodEnd}`} />
                      </div>
                      {openPeriodCal && periodCalPos && createPortal(
                        <ModalPeriodCalendar
                          anchorRect={periodCalPos}
                          start={periodStart}
                          end={periodEnd}
                          onChange={(s, e) => { setPeriodStart(s); setPeriodEnd(e); setOpenPeriodCal(null); }}
                          onClose={() => setOpenPeriodCal(null)}
                        />, document.body
                      )}
                      <button onClick={() => { if (!canSearch) return; setHasData(true); setCurrentPage(1); }} disabled={!canSearch}
                        className={`h-[36px] relative rounded-[4px] shrink-0 transition-colors ${canSearch ? "bg-white hover:bg-[#f6f7f8] cursor-pointer" : "bg-white cursor-not-allowed opacity-50"}`}>
                        <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
                          <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">오더 조회하기</p>
                        </div>
                        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="content-stretch flex flex-[1_0_0] items-start min-h-px overflow-x-auto overflow-y-hidden relative w-full">
                  {hasData ? (
                    <div className="flex items-start h-full">
                      <ModalTableColumn width={120} header="오더ID" rows={tableData.map(r => r.id)} underline />
                      <ModalTableColumn width={120} header="화주사 업무그룹" rows={tableData.map(r => r.group)} />
                      <ModalTableColumn width={140} header="매출 명세서 기준일" rows={tableData.map(r => r.baseDate)} />
                      <ModalTableColumn width={140} header="상차일" rows={tableData.map(r => r.loadDate)} />
                      <ModalTableColumn width={140} header="하차일" rows={tableData.map(r => r.unloadDate)} />
                      <ModalTableColumn width={140} header="상차지명" rows={tableData.map(r => r.loadPlace)} />
                      <ModalTableColumn width={140} header="상차지주소" rows={tableData.map(r => r.loadAddr)} />
                      <ModalTableColumn width={140} header="하차지명" rows={tableData.map(r => r.unloadPlace)} />
                      <ModalTableColumn width={140} header="하차지주소" rows={tableData.map(r => r.unloadAddr)} />
                      <ModalTableColumn width={140} header="청구금액 합계" rows={tableData.map(r => r.amount)} />
                    </div>
                  ) : (
                    <div className="flex items-start w-full relative h-full">
                      {TABLE_COLS.map((col, i) => (
                        <div key={i} className="relative shrink-0" style={{ width: i < 2 ? 120 : 140 }}>
                          <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
                            <ModalTableHeaderCell label={col} />
                          </div>
                          <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
                        </div>
                      ))}
                      <div className="absolute inset-0 flex flex-col gap-[8px] items-center justify-center">
                        <div className="relative shrink-0 size-[48px]">
                          <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 42.9532 34">
                            <circle cx="30.3484" cy="18.1448" fill="#8D9199" fillOpacity="0.12" r="6.75" transform="rotate(3 30.3484 18.1448)" />
                            <path d={emptySvg.p2168fa80} fill="url(#me0)" />
                            <path d={emptySvg.paab9200} fill="url(#me1)" />
                            <path d={emptySvg.p2cf4e300} fill="url(#me2)" />
                            <path d={emptySvg.p19a0f280} fill="url(#me3)" />
                            <path clipRule="evenodd" d={emptySvg.p3030be80} fill="#93979F" fillOpacity="0.67" fillRule="evenodd" />
                            <defs>
                              {["me0","me1","me2","me3"].map(id => (
                                <linearGradient key={id} gradientUnits="userSpaceOnUse" id={id} x1="17.5" x2="17.5" y1="0" y2="29.7331">
                                  <stop stopColor="#AEB1B7" stopOpacity="0.2" />
                                  <stop offset="1" stopColor="#ADAFB3" stopOpacity="0.32" />
                                </linearGradient>
                              ))}
                            </defs>
                          </svg>
                        </div>
                        <p className="font-['Pretendard_GOV:Regular'] text-[#767d8a] text-[15px] tracking-[-0.3px] leading-[22px] text-center whitespace-nowrap">
                          화주사와 업무그룹을 선택한 후 오더를 조회해 주세요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {hasData && (() => {
                  const getPages = (): (number | 'e')[] => {
                    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);
                    if (currentPage <= 5) return [...Array.from({ length: 7 }, (_, i) => i + 1) as number[], 'e', totalPages];
                    if (currentPage >= totalPages - 4) return [1, 'e', ...Array.from({ length: 7 }, (_, i) => totalPages - 6 + i) as number[]];
                    return [1, 'e', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, 'e', totalPages];
                  };
                  return (
                    <div className="bg-white h-[36px] overflow-clip relative shrink-0 w-full">
                      <div className="-translate-x-1/2 absolute content-stretch flex gap-[4px] items-center justify-center left-1/2 p-[2px] top-0">
                        <button onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
                          style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
                          className="flex flex-col items-center justify-center rounded-[4px] size-[32px]">
                          <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M10 3L5 8L10 13" stroke="#C7CBD1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>
                        </button>
                        {getPages().map((p, idx) => p === 'e' ? (
                          <div key={`e${idx}`} className="flex flex-col items-center justify-center rounded-[4px] size-[32px]">
                            <svg width="10" height="2" fill="none" viewBox="0 0 10 2">
                              <path d={modalSvg.p21cdb200} fill="#9197A1" />
                              <path d={modalSvg.p35e70110} fill="#9197A1" />
                              <path d={modalSvg.p79f9a80} fill="#9197A1" />
                            </svg>
                          </div>
                        ) : (
                          <button key={p} onClick={() => setCurrentPage(p)}
                            className={`flex flex-col items-center justify-center rounded-[4px] size-[32px] ${p === currentPage ? "bg-[#f6f7f8]" : ""}`}>
                            <p className={`leading-[22px] text-[15px] text-center tracking-[-0.3px] ${p === currentPage ? "font-['Pretendard_GOV:SemiBold'] text-[#2e3238]" : "font-['Pretendard_GOV:Regular'] text-[#454b55]"}`}>{p}</p>
                          </button>
                        ))}
                        <button onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
                          style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
                          className="flex flex-col items-center justify-center rounded-[4px] size-[32px]">
                          <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 13L11 8L6 3" stroke="#2E3238" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex h-full items-center justify-center relative shrink-0 w-px" style={{ containerType: "size" }}>
            <div className="flex-none rotate-90 w-[100cqh]"><div className="bg-[#e3e5e9] h-px relative w-full" /></div>
          </div>

          {/* Right panel */}
          <div className="h-full relative shrink-0 w-[400px]">
            <div className="overflow-y-auto flex flex-col items-center size-full">
              <div className="content-stretch flex flex-col gap-[16px] items-center pb-[20px] pt-[12px] px-[24px] relative w-full">
                <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">계산서 작성일자</p>
                    <div ref={writeBtnRef} className="shrink-0 w-[160px]" style={{ cursor: 'pointer' }}
                      onClick={() => { const r = writeBtnRef.current!.getBoundingClientRect(); setWriteCalPos(r); setOpenWriteCal(o => !o); }}>
                      <ModalCalendarBtn label={writeDate} />
                    </div>
                    {openWriteCal && writeCalPos && createPortal(
                      <ModalCalendarDropdown anchorRect={writeCalPos} value={writeDate} onChange={v => { setWriteDate(v); setOpenWriteCal(false); }} onClose={() => setOpenWriteCal(false)} />, document.body
                    )}
                  </div>
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">수금기한</p>
                    <div ref={dueBtnRef} className="shrink-0 w-[160px]" style={{ cursor: 'pointer' }}
                      onClick={() => { const r = dueBtnRef.current!.getBoundingClientRect(); setDueCalPos(r); setOpenDueCal(o => !o); }}>
                      <ModalCalendarBtn label={dueDate} />
                    </div>
                    {openDueCal && dueCalPos && createPortal(
                      <ModalCalendarDropdown anchorRect={dueCalPos} value={dueDate} onChange={v => { setDueDate(v); setOpenDueCal(false); }} onClose={() => setOpenDueCal(false)} />, document.body
                    )}
                  </div>
                </div>
                <div className="bg-[#f6f7f8] relative rounded-[8px] shrink-0 w-full">
                  <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
                    <div className="content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                      <p className="relative shrink-0 text-[#5c6370]">청구금액 합계</p>
                      <p className="relative shrink-0 text-[#2e3238]">{fmt(billing)}</p>
                    </div>
                    {hasData && (
                      <>
                        <div className="content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                          <p className="relative shrink-0">화주사 업무그룹 1 청구금액</p>
                          <p className="relative shrink-0">{fmt(group1Amt)}</p>
                        </div>
                        {selectedGroups.length > 1 && (
                          <div className="content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                            <p className="relative shrink-0">화주사 업무그룹 2 청구금액</p>
                            <p className="relative shrink-0">{fmt(group2Amt)}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
                    <div className="content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                      <p className="relative shrink-0 text-[#5c6370]">조정금액 합계</p>
                      <p className="relative shrink-0 text-[#2e3238]">{fmt(adjTotal)}</p>
                    </div>
                    {adjItems.map((item, idx) => (
                      <AdjustmentItem
                        key={item.id}
                        item={item}
                        index={idx}
                        onChange={updated => setAdjItems(prev => prev.map(it => it.id === item.id ? updated : it))}
                        onRemove={() => setAdjItems(prev => prev.filter(it => it.id !== item.id))}
                      />
                    ))}
                    {adjItems.length < 10 && (
                      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full">
                        <button
                          onClick={() => setAdjItems(prev => [...prev, { id: Date.now(), amount: 0, sign: '+', note: '' }])}
                          className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full w-full hover:bg-[#f6f7f8] transition-colors"
                        >
                          <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">조정금액 추가하기 ({adjItems.length}/10)</p>
                        </button>
                        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
                      </div>
                    )}
                    <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
                    <div className="content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                      <p className="relative shrink-0 text-[#5c6370]">공급가액</p>
                      <p className="relative shrink-0 text-[#2e3238]">{fmt(supply)}</p>
                    </div>
                    <div className="content-stretch flex font-['Pretendard_GOV:SemiBold'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                      <p className="relative shrink-0 text-[#5c6370]">세액</p>
                      <p className="relative shrink-0 text-[#2e3238]">{fmt(tax)}</p>
                    </div>
                    <div className="bg-[#e3e5e9] h-px relative shrink-0 w-full" />
                    <div className="content-stretch flex items-center justify-between not-italic relative shrink-0 w-full whitespace-nowrap">
                      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">합계 금액</p>
                      <p className="font-['Pretendard_GOV:Bold'] leading-[32px] relative shrink-0 text-[#2e3238] text-[22px] tracking-[-0.44px]">{fmt(total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white relative rounded-bl-[12px] rounded-br-[12px] shrink-0 w-full">
          <div className="absolute bg-[#e3e5e9] h-px left-0 right-0 top-0" />
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[8px] items-center pb-[24px] pt-[20px] px-[24px] relative size-full">
              <div className="flex-[1_0_0] min-w-px" />
              <div className="content-stretch flex gap-[8px] items-center justify-end relative shrink-0">
                <button onClick={onClose}
                  className="bg-white content-stretch flex gap-[4px] h-[52px] items-center justify-center overflow-clip px-[20px] relative rounded-[4px] shrink-0 hover:bg-[#f6f7f8] transition-colors">
                  <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
                  <p className="font-['Pretendard_GOV:SemiBold'] leading-[26px] not-italic text-[#2e3238] text-[18px] tracking-[-0.36px] whitespace-nowrap">닫기</p>
                </button>
                <button disabled={!hasData}
                  onClick={() => { if (hasData) { onSuccess?.(); onClose(); } }}
                  className={`content-stretch flex h-[52px] items-center justify-center overflow-clip px-[20px] relative rounded-[4px] shrink-0 transition-colors ${hasData ? "bg-[#005FFF] hover:bg-[#0052e0] cursor-pointer" : "bg-[#e3e5e9] cursor-not-allowed"}`}>
                  <p className={`font-['Pretendard_GOV:SemiBold'] leading-[26px] not-italic text-[18px] tracking-[-0.36px] whitespace-nowrap ${hasData ? "text-white" : "text-[#9197a1]"}`}>생성하기</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
/* ────────────────────────────────────────────── */

function CalendarDropdown313({ anchorRect, value, onChange, onClose }: {
  anchorRect: DOMRect; value: string; onChange: (v: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const parseDate = (s: string) => { const [yy,mm,dd] = s.split('.').map(Number); return new Date(2000+yy,mm-1,dd); };
  const formatDate = (d: Date) => `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  const today = new Date(2026,5,29);
  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [hovered, setHovered] = useState<string|null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  const firstDay = new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth = new Date(viewYear,viewMonth+1,0).getDate();
  const daysInPrev = new Date(viewYear,viewMonth,0).getDate();
  const cells: {date:Date;inMonth:boolean}[] = [];
  for (let i=firstDay-1;i>=0;i--) cells.push({date:new Date(viewYear,viewMonth-1,daysInPrev-i),inMonth:false});
  for (let d=1;d<=daysInMonth;d++) cells.push({date:new Date(viewYear,viewMonth,d),inMonth:true});
  while (cells.length%7!==0) cells.push({date:new Date(viewYear,viewMonth+1,cells.length-daysInMonth-firstDay+1),inMonth:false});
  const isSameDay = (a:Date,b:Date) => a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const quickButtons = [
    {label:'오늘',get:()=>today},
    {label:'어제',get:()=>new Date(today.getTime()-86400000)},
    {label:'이번주',get:()=>{const d=new Date(today);const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d;}},
    {label:'이번달',get:()=>new Date(today.getFullYear(),today.getMonth(),1)},
    {label:'저번달',get:()=>new Date(today.getFullYear(),today.getMonth()-1,1)},
    {label:'+1주',get:()=>new Date(selected.getTime()+7*86400000)},
    {label:'+1달',get:()=>new Date(selected.getFullYear(),selected.getMonth()+1,selected.getDate())},
    {label:'+3달',get:()=>new Date(selected.getFullYear(),selected.getMonth()+3,selected.getDate())},
  ];
  return createPortal(
    <div ref={ref} style={{position:'fixed',top:anchorRect.bottom+2,left:anchorRect.left,width:276,background:'#FFFFFF',border:'1px solid #E4E5E9',boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',borderRadius:8,padding:12,display:'flex',flexDirection:'column',gap:8,zIndex:99999,boxSizing:'border-box'}}>
      <div style={{height:36,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 4px'}}>
        <span style={{fontFamily:"'Pretendard GOV:Bold'",fontSize:18,fontWeight:700,color:'#2E3238',letterSpacing:'-0.02em'}}>{viewYear}년 {viewMonth+1}월</span>
        <div style={{display:'flex',gap:2}}>
          {([[-1,'M4.5 1L0.5 5L4.5 9'],[1,'M0.5 1L4.5 5L0.5 9']] as [number,string][]).map(([dir,d])=>(
            <button key={dir} onClick={()=>{const dt=new Date(viewYear,viewMonth+dir,1);setViewYear(dt.getFullYear());setViewMonth(dt.getMonth());}} style={{width:26,height:26,borderRadius:4,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} onMouseEnter={e=>(e.currentTarget.style.background='#F6F7F8')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d={d} stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'flex',width:252}}>
        {['일','월','화','수','목','금','토'].map(d=>(
          <div key={d} style={{width:36,height:19,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:13,fontWeight:600,color:'#454B55',letterSpacing:'-0.02em'}}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',width:252,gap:'2px 0'}}>
        {cells.map((cell,i)=>{
          const isSelected=isSameDay(cell.date,selected);
          const isToday=isSameDay(cell.date,today);
          const key=cell.date.toISOString().slice(0,10);
          const isHovered=hovered===key&&!isSelected&&cell.inMonth;
          return (
            <div key={i} style={{width:36,height:36,position:'relative',cursor:cell.inMonth?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center'}}
              onMouseEnter={()=>cell.inMonth&&setHovered(key)} onMouseLeave={()=>setHovered(null)}
              onClick={()=>{if(cell.inMonth){onChange(formatDate(cell.date));onClose();}else{setViewYear(cell.date.getFullYear());setViewMonth(cell.date.getMonth());}}}>
              <div style={{width:36,height:36,borderRadius:isSelected?20:(isToday||isHovered)?100:0,background:isSelected?'#005FFF':(isToday||isHovered)?'#F6F7F8':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:14,fontWeight:isSelected?600:400,color:isSelected?'#FFFFFF':cell.inMonth?'#2E3238':'#9197A1',letterSpacing:'-0.02em'}}>{cell.date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{borderTop:'1px solid #E4E5E9',paddingTop:8,display:'flex',flexWrap:'wrap',gap:4}}>
        {quickButtons.map(({label,get})=>(
          <button key={label} onClick={()=>{onChange(formatDate(get()));onClose();}}
            style={{border:'1px solid #E4E5E9',borderRadius:4,background:'#FFFFFF',fontSize:14,fontWeight:600,color:'#2E3238',padding:'0 8px',height:26,cursor:'pointer'}}
            onMouseEnter={e=>(e.currentTarget.style.background='#F6F7F8')} onMouseLeave={e=>(e.currentTarget.style.background='#FFFFFF')}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

function ManualInvoiceModal({ onClose, onSuccess, selectedIndices }: { onClose: () => void; onSuccess?: () => void; selectedIndices: number[] }) {
  const orderCount = selectedIndices.length;
  const chargeTotal = selectedIndices.reduce((sum, i) => sum + getRowChargeAmount(i), 0);
  const taxTotal = selectedIndices.reduce((sum, i) => sum + getRowTaxAmount(i), 0);
  const grandTotal = chargeTotal + taxTotal;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';
  const firstShipper = selectedIndices.length > 0 ? SHIPPER_ROW_DATA_313[selectedIndices[0] % SHIPPER_ROW_DATA_313.length] : '-';
  const selectedGroups = [...new Set(selectedIndices.map(i => {
    const shipper = SHIPPER_ROW_DATA_313[i % SHIPPER_ROW_DATA_313.length];
    return getGroupForIndex(i, shipper);
  }))];
  const groupsText = selectedGroups.length > 0 ? selectedGroups.join(', ') : '-';
  const firstLoadDate = selectedIndices.length > 0 ? getRowData313S(selectedIndices[0]).loadDate : todayYYMMDD();
  const [dateValues, setDateValues] = useState({ 작성일자: firstLoadDate, 확인일자: todayYYMMDD(), 수금기한: addDays313(firstLoadDate, 60) });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const DATE_ROWS: { label: string; key: keyof typeof dateValues }[] = [
    { label: '계산서 작성일자', key: '작성일자' },
    { label: '계산서 확인일자', key: '확인일자' },
    { label: '수금기한', key: '수금기한' },
  ];
  return <>{createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999,
    }} onClick={onClose}>
      <div style={{
        width:881, background:'#FFFFFF', border:'1px solid #E4E5E9',
        boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
        borderRadius:12, display:'flex', flexDirection:'column',
        fontFamily:"'Pretendard GOV', sans-serif",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding:'24px 24px 0', borderRadius:'12px 12px 0 0',
          background:'#FFFFFF',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'32px' }}>
              수기계산서 등록
            </span>
            <div onClick={onClose} style={{ cursor:'pointer', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height:1, background:'#E4E5E9', marginLeft:-24, marginRight:-24 }}/>
        </div>

        {/* Body */}
        <div style={{ display:'flex', flexDirection:'row', height:372 }}>

          {/* Left column */}
          <div style={{ width:480, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* Row 1: 화주사 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>화주사</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', width:300 }}>{firstShipper}</span>
              </div>
              {/* Row 2: 화주사 업무그룹 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingTop:7, paddingBottom:7 }}>
                <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>화주사 업무그룹</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', width:300 }}>
                  {groupsText}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width:1, background:'#E4E5E9', alignSelf:'stretch' }}/>

          {/* Right column */}
          <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>
            {/* Date fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DATE_ROWS.map(({ label, key }) => (
                <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                  <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>{label}</span>
                  <div style={{
                    display:'flex', alignItems:'center', gap:4,
                    border: openCal === key ? '1px solid #005FFF' : '1px solid #E4E5E9', borderRadius:4,
                    padding:'6px 10px', width:160, height:36, boxSizing:'border-box',
                    background:'#FFFFFF', cursor:'pointer',
                  }} onClick={e => { if (openCal === key) { setOpenCal(null); } else { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpenCal(key); } }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                      <rect x="1" y="2.5" width="14" height="12.5" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
                      <line x1="1" y1="6" x2="15" y2="6" stroke="#9197A1" strokeWidth="1.3"/>
                      <line x1="5" y1="1" x2="5" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                      <line x1="11" y1="1" x2="11" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize:15, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', flex:1 }}>{dateValues[key]}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0, transform: openCal === key ? 'rotate(180deg)' : undefined}}>
                      <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary box */}
            <div style={{
              background:'#F6F7F8', borderRadius:8, padding:16,
              display:'flex', flexDirection:'column', gap:12,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>선택된 오더 수</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>{orderCount}건</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>청구금액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>{fmt(chargeTotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>세액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>{fmt(taxTotal)}</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:32 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>합계 금액</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'32px' }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'#E4E5E9' }}/>
          <div style={{ padding:'20px 24px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={onClose} style={{
              width:71, height:52, background:'#FFFFFF', border:'none',
              borderRadius:4, cursor:'pointer',
              fontSize:18, fontWeight:600, color:'#2E3238',
              letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif",
            }}>취소</button>
            <button style={{
              width:102, height:52, background:'#005FFF', border:'none',
              borderRadius:4, cursor:'pointer',
              fontSize:18, fontWeight:600, color:'#FFFFFF',
              letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif",
            }} onClick={() => { onSuccess?.(); onClose(); }}>등록하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}{openCal && anchorRect && <CalendarDropdown313 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => { setDateValues(prev => ({ ...prev, [openCal]: v })); setOpenCal(null); }} onClose={() => setOpenCal(null)} />}</>;
}

function ManualInvoiceDetailModal({ onClose }: { onClose: () => void }) {
  const [dateValues, setDateValues] = useState({ 기준일: todayYYMMDD(), 발행일: todayYYMMDD(), 수금일: '26.07.27' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const DATE_ROWS: { label: string; key: keyof typeof dateValues }[] = [
    { label: '매출 명세서 기준일', key: '기준일' },
    { label: '세금계산서 발행일', key: '발행일' },
    { label: '수금 예정일', key: '수금일' },
  ];
  return <>{createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999,
    }} onClick={onClose}>
      <div style={{
        width:881, background:'#FFFFFF', border:'1px solid #E4E5E9',
        boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
        borderRadius:12, display:'flex', flexDirection:'column',
        fontFamily:"'Pretendard GOV', sans-serif",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding:'24px 24px 0', borderRadius:'12px 12px 0 0',
          background:'#FFFFFF',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'32px' }}>
              수기계산서 수정
            </span>
            <div onClick={onClose} style={{ cursor:'pointer', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height:1, background:'#E4E5E9', marginLeft:-24, marginRight:-24 }}/>
        </div>

        {/* Body */}
        <div style={{ display:'flex', flexDirection:'row', height:372 }}>

          {/* Left column */}
          <div style={{ width:480, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* Row 1: 화주사 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>화주사</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', width:300 }}>(주)글로벌로지스</span>
              </div>
              {/* Row 2: 화주사 업무그룹 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingTop:7, paddingBottom:7 }}>
                <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>화주사 업무그룹</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', width:300 }}>
                  판교본사, 수원지점
                </span>
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width:1, background:'#E4E5E9', alignSelf:'stretch' }}/>

          {/* Right column */}
          <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>
            {/* Date fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DATE_ROWS.map(({ label, key }) => (
                <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                  <span style={{ fontSize:15, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px', flexShrink:0 }}>{label}</span>
                  <div style={{
                    display:'flex', alignItems:'center', gap:4,
                    border: openCal === key ? '1px solid #005FFF' : '1px solid #E4E5E9', borderRadius:4,
                    padding:'6px 10px', width:160, height:36, boxSizing:'border-box',
                    background:'#FFFFFF', cursor:'pointer',
                  }} onClick={e => { if (openCal === key) { setOpenCal(null); } else { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpenCal(key); } }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
                      <rect x="1" y="2.5" width="14" height="12.5" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
                      <line x1="1" y1="6" x2="15" y2="6" stroke="#9197A1" strokeWidth="1.3"/>
                      <line x1="5" y1="1" x2="5" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                      <line x1="11" y1="1" x2="11" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize:15, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px', flex:1 }}>{dateValues[key]}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0, transform: openCal === key ? 'rotate(180deg)' : undefined}}>
                      <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary box */}
            <div style={{
              background:'#F6F7F8', borderRadius:8, padding:16,
              display:'flex', flexDirection:'column', gap:12,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>선택된 오더 수</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>2건</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>청구금액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>380,000원</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>세액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'22px' }}>38,000원</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:32 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', letterSpacing:'-0.02em', lineHeight:'22px' }}>합계 금액</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', letterSpacing:'-0.02em', lineHeight:'32px' }}>418,000원</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'#E4E5E9' }}/>
          <div style={{ padding:'20px 24px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {/* Left: delete button */}
            <button style={{
              width:106, height:52, background:'#EBEDEF', border:'none',
              borderRadius:4, cursor:'pointer',
              fontSize:18, fontWeight:600, color:'#2E3238',
              letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif",
            }}>등록 취소</button>
            {/* Right: 취소 + 수정하기 */}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{
                width:71, height:52, background:'#FFFFFF', border:'none',
                borderRadius:4, cursor:'pointer',
                fontSize:18, fontWeight:600, color:'#2E3238',
                letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif",
              }}>취소</button>
              <button style={{
                width:102, height:52, background:'#005FFF', border:'none',
                borderRadius:4, cursor:'pointer',
                fontSize:18, fontWeight:600, color:'#FFFFFF',
                letterSpacing:'-0.02em', fontFamily:"'Pretendard GOV', sans-serif",
              }}>수정하기</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}{openCal && anchorRect && <CalendarDropdown313 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => { setDateValues(prev => ({ ...prev, [openCal]: v })); setOpenCal(null); }} onClose={() => setOpenCal(null)} />}</>;
}

function Frame599() {
  const { activeTab } = useContext(SubTabCtx);
  const { openModal, selectedRows, getRow, registerManualInvoice, requestCollectionComplete } = useContext(ModalCtx313);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualErrorToast, setManualErrorToast] = useState(false);
  const [manualSuccessToast, setManualSuccessToast] = useState(false);
  const [statusErrorToast, setStatusErrorToast] = useState<string | false>(false);
  const [detailOpen, setDetailOpen] = useState(false);
  useEffect(() => {
    if (!manualErrorToast) return;
    const t = setTimeout(() => setManualErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [manualErrorToast]);
  useEffect(() => {
    if (!manualSuccessToast) return;
    const t = setTimeout(() => setManualSuccessToast(false), 4000);
    return () => clearTimeout(t);
  }, [manualSuccessToast]);
  useEffect(() => {
    if (!statusErrorToast) return;
    const t = setTimeout(() => setStatusErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [statusErrorToast]);
  useEffect(() => {
    const handler = () => setDetailOpen(true);
    window.addEventListener('openManualInvoiceDetail', handler);
    return () => window.removeEventListener('openManualInvoiceDetail', handler);
  }, []);
  return (
    <>
      {manualOpen && <ManualInvoiceModal onClose={() => setManualOpen(false)} onSuccess={() => { setManualSuccessToast(true); registerManualInvoice([...selectedRows]); }} selectedIndices={[...selectedRows]} />}
      {manualSuccessToast && createPortal(
        <>
          <style>{TOAST_ANIMATION}</style>
          <div style={{ ...TOAST_STYLE, background: '#222222' }}>
            <span style={{ color: '#fff', fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>
              수기계산서가 등록되었습니다.
            </span>
            <ToastCloseBtn onClose={() => setManualSuccessToast(false)} />
          </div>
        </>,
        document.body
      )}
      {manualErrorToast && createPortal(
        <>
          <style>{TOAST_ANIMATION}</style>
          <div style={{ ...TOAST_STYLE, background: '#E13838' }}>
            <span style={{ color: '#fff', fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>
              1개 이상의 오더를 선택해 주세요.
            </span>
            <ToastCloseBtn onClose={() => setManualErrorToast(false)} />
          </div>
        </>,
        document.body
      )}
      {statusErrorToast && createPortal(
        <>
          <style>{TOAST_ANIMATION}</style>
          <div style={{ ...TOAST_STYLE, background: '#E13838' }}>
            <span style={{ color: '#fff', fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>
              {statusErrorToast}
            </span>
            <ToastCloseBtn onClose={() => setStatusErrorToast(false)} />
          </div>
        </>,
        document.body
      )}
      {detailOpen && <ManualInvoiceDetailModal onClose={() => setDetailOpen(false)} />}
      <div className="content-stretch flex gap-[4px] h-[36px] items-center relative shrink-0">
        {activeTab !== '기사' && (
          <button onClick={() => openModal([])} className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">매출 거래명세서 생성</p>
            </div>
          </button>
        )}
        <div
          className={`${activeTab === '기사' ? 'bg-[#005fff]' : 'bg-white'} h-[36px] relative rounded-[4px] shrink-0`}
          data-name="Button"
          onClick={() => {
            if (selectedRows.size === 0) { setManualErrorToast(true); return; }
            const indices = [...selectedRows];
            const rows = indices.map(getRow);
            if (rows.some(r => r.status !== '정산대기')) { setStatusErrorToast('정산대기 상태의 오더를 선택해 주세요.'); return; }
            if (rows.some(r => r.statementId)) { setStatusErrorToast('이미 매출 거래명세서로 생성된 오더는 매출 거래명세서 메뉴에서 처리해야 합니다.'); return; }
            if (new Set(rows.map(r => r.shipper)).size > 1) { setStatusErrorToast('서로 다른 화주사(사업자정보)가 섞여 있어 수기계산서를 등록할 수 없습니다.'); return; }
            setManualOpen(true);
          }}
          style={{ cursor:'pointer' }}
        >
          <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className={`[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] whitespace-nowrap ${activeTab === '기사' ? 'text-white' : 'text-[#2e3238]'}`}>
              <p className="leading-[22px]">수기계산서 등록</p>
            </div>
          </div>
          {activeTab !== '기사' && <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />}
        </div>
        <div
          className="bg-white h-[36px] relative rounded-[4px] shrink-0 cursor-pointer"
          data-name="Button"
          onClick={() => {
            if (selectedRows.size === 0) { setManualErrorToast(true); return; }
            const result = requestCollectionComplete([...selectedRows]);
            if (!result.ok) setStatusErrorToast(result.message ?? '수금완료 처리가 불가능한 오더가 포함되어 있습니다.');
          }}
        >
          <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">수금 완료</p>
            </div>
          </div>
          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
        </div>
      </div>
    </>
  );
}

function TypeStatusDisabled2() {
  const { activeTab } = useContext(SubTabCtx);
  const searchLabel = activeTab === '기사' ? '차량번호' : '오더ID';
  return (
    <div className="bg-white h-[36px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0" style={{ display: 'inline-flex' }} data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px]" />
      <div className="flex flex-row items-center">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">{searchLabel}</p>
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

function TypeStatusDisabled3({ searchType }: { searchType?: string }) {
  const { activeTab } = useContext(SubTabCtx);
  const { searchText, setSearchText, runSearch } = useContext(SearchCtx313);
  const label = searchType || (activeTab === '기사' ? '차량번호' : '오더 ID');
  const placeholder = `${label}를 입력하세요.`;
  return (
    <div className="bg-white h-[36px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            placeholder={placeholder}
            className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Regular'] h-[26px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] leading-[22px]"
            style={{ border: 'none', outline: 'none', background: 'transparent', minWidth: 0 }}
          />
        </div>
      </div>
    </div>
  );
}

const SEARCH_TYPES_HWAJUSA   = ['오더 ID', '화주사 별칭', '화주사 주문번호', '사업자명', '사업자번호', '상차지', '하차지', '매출 거래명세서ID'];
const SEARCH_TYPES_PARTNER   = ['오더ID', '협력사 별칭', '화주사 주문번호', '사업자명', '사업자번호', '상차지', '하차지', '매출 거래명세서ID'];
const SEARCH_TYPES_DRIVER    = ['차량번호', '기사명', '오더ID'];

function SearchTypeDropdown({ dropRef, options, searchType, onSelect }: { dropRef: React.RefObject<HTMLDivElement>; options: string[]; searchType: string; onSelect: (opt: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div ref={dropRef} style={{ position: 'absolute', top: 38, left: 0, minWidth: '100%', background: '#fff', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0 2px 6px 1px rgba(34,34,34,0.06)', zIndex: 200, padding: 8, boxSizing: 'border-box' }}>
      {options.map(opt => (
        <div key={opt}
          onClick={() => onSelect(opt)}
          onMouseEnter={() => setHovered(opt)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 8px', fontSize: 15,
            color: opt === searchType ? '#005FFF' : '#2E3238',
            borderRadius: 4, cursor: 'pointer',
            fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', whiteSpace: 'nowrap',
            background: hovered === opt ? '#F6F7F8' : 'transparent',
          }}
        >
          <span>{opt}</span>
          {opt === searchType && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: 8 }}>
              <path d="M3 8.5L6.5 12L13 4.5" stroke="#005FFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function Component11({ searchType, setSearchType }: { searchType: string; setSearchType: (t: string) => void }) {
  const [dropOpen, setDropOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { activeTab } = useContext(SubTabCtx);

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const options = activeTab === '기사' ? SEARCH_TYPES_DRIVER
                : SEARCH_TYPES_HWAJUSA;

  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name>
      <div ref={btnRef} className="mr-[-1px] relative shrink-0" style={{ width: 'fit-content' }} data-name="Input / 02. Selectbox">
        <div
          className="bg-white h-[36px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 cursor-pointer select-none"
          style={{ display: 'inline-flex', alignItems: 'center' }}
          onClick={() => setDropOpen(o => !o)}
        >
          <div aria-hidden className={`absolute border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px] ${dropOpen ? 'border border-[#005FFF]' : 'border border-[#e3e5e9]'}`} />
          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">{searchType}</p>
            </div>
            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
              <div className="flex items-center justify-center"><div className={dropOpen ? "" : "-scale-y-100"}>
                <div className="h-[4px] relative w-[10px]"><div className="absolute inset-[-17.5%_-7%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                    <path d={svgPaths.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                  </svg>
                </div></div>
              </div></div>
            </div>
          </div>
        </div>
        {dropOpen && (
          <SearchTypeDropdown
            dropRef={dropRef}
            options={options}
            searchType={searchType}
            onSelect={(opt) => { setSearchType(opt); setDropOpen(false); }}
          />
        )}
      </div>
      <div className="relative shrink-0 w-[180px]" data-name="Input / 01. Textfield">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
          <TypeStatusDisabled3 searchType={searchType} />
        </div>
      </div>
    </div>
  );
}

function Component10() {
  const { searchType, setSearchType, runSearch } = useContext(SearchCtx313);

  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="텍스트검색">
      <Component11 searchType={searchType} setSearchType={setSearchType} />
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

function Group3() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="group">
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
    </div>
  );
}

const TableCtrlCtx = createContext({ filteredTotal: 300, selectedCount: 0 });

function Frame601() {
  const { filteredTotal, selectedCount } = useContext(TableCtrlCtx);
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <Frame599 />
      <div className="bg-[#d5d8dd] h-[24px] relative shrink-0 w-px" />
      <Component10 />
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px]">{selectedCount > 0 ? `총 ${filteredTotal.toLocaleString()}건 중 ${selectedCount.toLocaleString()}건 선택` : `총 ${filteredTotal.toLocaleString()}건`}</p>
      </div>
    </div>
  );
}

function TableControlModule() {
  return (
    <div className="content-stretch flex items-center justify-between py-[10px] relative shrink-0 w-full" data-name="Table_Control_Module">
      <Frame601 />
      <Group3 />
    </div>
  );
}

// ─── Data-driven table helpers (매출장부_화주사) ────────────────────────────

const BADGE_STYLES_313S: Record<string, { bg: string; text: string }> = {
  '마감필요': { bg: '#fce9e9', text: '#dd2222' },
  '정산대기': { bg: '#e4fbeb', text: '#18ac42' },
  '수금대기': { bg: '#e6efff', text: '#005fff' },
  '수금완료': { bg: '#ebedef', text: '#454b55' },
  '정산보류': { bg: '#ebedef', text: '#9197a1' },
  '정산제외': { bg: '#ebedef', text: '#c7cbd1' },
};

const VIA_OPTIONS_313S = ['0곳', '1곳', '2곳'];
const EXCLUSIVE_OPTIONS_313S = ['독차', '혼적'];
const ROUNDTRIP_OPTIONS_313S = ['편도', '왕복'];
const TON_TYPES_313S = ['1톤', '1.4톤', '2.5톤', '5톤', '11톤'];
const VEHICLE_TYPES_313S = ['탑', '카고', '윙바디', '냉동탑차', '리프트'];
const VEHICLE_OPTIONS_313S = ['냉장', '냉동', '상온'];
const DRIVER_NAMES_313S = ['김카모', '이민호', '박성준', '최재원', '정우진', '한동현'];
const PLATE_REGIONS_313S = ['12아', '34나', '56다', '78라', '90마'];

function seed313S(n: number) { let h = n ^ (n >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11; return ((h >>> 0) % 1000000) / 1000000; }
function rnd313S(rowIdx: number, salt: number) { return seed313S(rowIdx * 97 + salt); }
function pick313S<T>(arr: T[], rowIdx: number, salt: number): T { return arr[Math.floor(rnd313S(rowIdx, salt) * arr.length)]; }

function getRowData313S(rowIdx: number, overrides: RowOverrides313S = EMPTY_OVERRIDES_313S, isCancelled: boolean = false) {
  const flags = getEffectiveFlags313S(rowIdx, overrides);
  const status = deriveStatus313S(flags, isCancelled);
  const shipperRaw = SHIPPER_ROW_DATA_313[rowIdx % SHIPPER_ROW_DATA_313.length];
  const shipperGroupRaw = getGroupForIndex(rowIdx, shipperRaw);
  const shipper = flags.hasShipperInfo ? shipperRaw : '';
  const shipperGroup = flags.hasShipperInfo ? shipperGroupRaw : '';
  const shipperOrderNum = `CC${String(rowIdx % 100).padStart(3, '0')}C${String(rowIdx % 10).padStart(2, '0')}`;
  const bizName = `${shipperRaw} 사업자`;
  const bizNumber = `${100 + rowIdx % 900}-${10 + rowIdx % 90}-${10000 + rowIdx % 90000}`;
  const loadDate = getLoadingDate313(rowIdx);
  const unloadDate = addDays313(loadDate, 1 + (rowIdx % 3));
  const specDate = addDays313(loadDate, 2);
  const loadLoc = LOAD_PLACES[rowIdx % LOAD_PLACES.length];
  const loadAddr = LOAD_ADDRS[rowIdx % LOAD_ADDRS.length];
  const unloadLoc = UNLOAD_PLACES[rowIdx % UNLOAD_PLACES.length];
  const unloadAddr = UNLOAD_ADDRS[rowIdx % UNLOAD_ADDRS.length];
  const via = pick313S(VIA_OPTIONS_313S, rowIdx, 11);
  const exclusive = pick313S(EXCLUSIVE_OPTIONS_313S, rowIdx, 12);
  const roundTrip = pick313S(ROUNDTRIP_OPTIONS_313S, rowIdx, 13);
  const ton = pick313S(TON_TYPES_313S, rowIdx, 14);
  const vehicleType = pick313S(VEHICLE_TYPES_313S, rowIdx, 15);
  const vehicleOption = pick313S(VEHICLE_OPTIONS_313S, rowIdx, 16);
  const vehicleNum = `${pick313S(PLATE_REGIONS_313S, rowIdx, 17)}${String(Math.floor(rnd313S(rowIdx, 18) * 9000) + 1000)}`;
  const driver = pick313S(DRIVER_NAMES_313S, rowIdx, 19);
  const charge = flags.hasShipperInfo ? getRowChargeAmount(rowIdx) : 0;
  const tax = Math.round(charge * 0.1);
  const total = charge + tax;
  const invoiceTriggered = flags.manualInvoiceRegistered || flags.taxInvoiceIssuedForStatement;
  const statementId = flags.invoiceGenerated ? ORDER_IDS[rowIdx].slice(-6) : '';
  const invoiceDate = invoiceTriggered ? specDate : '';
  const invoiceIssueDate = invoiceTriggered ? addDays313(specDate, 1) : '';
  const collectDeadline = invoiceTriggered ? specDate : '';
  const collectDate = flags.collectionCompleted ? specDate : '';
  return {
    orderId: ORDER_IDS[rowIdx],
    status, flags,
    shipper, shipperGroup, shipperOrderNum, bizName, bizNumber,
    specDate, loadDate, unloadDate,
    loadLoc, loadAddr, unloadLoc, unloadAddr,
    via, exclusive, roundTrip,
    ton, vehicleType, vehicleOption, vehicleNum, driver,
    charge, tax, total, statementId,
    invoiceDate, invoiceIssueDate, collectDeadline, collectDate,
  };
}

type RowData313S = ReturnType<typeof getRowData313S>;

function ColBorder313S() {
  return <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />;
}

function HeaderCell313S({ label }: { label: string }) {
  return (
    <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
      <ColBorder313S />
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

function BadgeDataCell313S({ status, rowIdx }: { status: string; rowIdx: number }) {
  const style = BADGE_STYLES_313S[status] ?? { bg: '#ebedef', text: '#454b55' };
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <ColBorder313S />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge" style={{ background: style.bg }}>
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[13px] tracking-[-0.26px] whitespace-nowrap" style={{ color: style.text }}>
              <p className="leading-[19px]">{status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextDataCell313S({ text, rowIdx, underline, onClick }: { text: string; rowIdx: number; underline?: boolean; onClick?: () => void }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p
                onClick={onClick}
                style={onClick ? { cursor: 'pointer' } : undefined}
                className={underline ? "[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline" : "leading-[22px] overflow-hidden text-[15px] text-ellipsis"}
              >{text}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder313S />
    </div>
  );
}

function ButtonDataCell313S({ rowIdx, text }: { rowIdx: number; text: string }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells" data-table-row={rowIdx}>
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis">{text}</p>
            </div>
          </div>
          <div className="bg-white h-[26px] relative rounded-[2px] shrink-0" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[8px] relative rounded-[inherit] size-full">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] tracking-[-0.28px] whitespace-nowrap">
                <p className="leading-[20px]">보기</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[2px]" />
          </div>
        </div>
      </div>
      <ColBorder313S />
    </div>
  );
}

function CheckboxDataCell313S({ rowIdx }: { rowIdx: number }) {
  return (
    <div className="content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells" data-table-row={rowIdx} data-cb-row={rowIdx}>
      <ColBorder313S />
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
        <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
      </div>
    </div>
  );
}

type RowHandlers313S = {
  onOrderClick: (orderId: string, rowIdx: number) => void;
  onInvoiceDetailClick: () => void;
};

type ColDef313S = {
  label: string;
  width: number;
  render: (d: RowData313S, rowIdx: number, h: RowHandlers313S) => React.ReactNode;
};

const TABLE_COLS_313S_BASE: ColDef313S[] = [
  { label: '매출 상태', width: 100, render: (d, i) => <BadgeDataCell313S key={i} status={d.status} rowIdx={i} /> },
  { label: '오더ID', width: 120, render: (d, i, h) => <TextDataCell313S key={i} text={d.orderId} rowIdx={i} underline onClick={() => h.onOrderClick(d.orderId, i)} /> },
  { label: '화주사', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.shipper || '-'} rowIdx={i} /> },
  { label: '화주사 업무그룹', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.shipperGroup || '-'} rowIdx={i} /> },
  { label: '화주사 주문번호', width: 120, render: (d, i) => <TextDataCell313S key={i} text={d.shipperOrderNum} rowIdx={i} /> },
  { label: '매출 명세서 기준일', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.specDate} rowIdx={i} /> },
  { label: '상차일', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.loadDate} rowIdx={i} /> },
  { label: '하차일', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.unloadDate} rowIdx={i} /> },
  { label: '상차지명', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.loadLoc} rowIdx={i} /> },
  { label: '상차지주소', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.loadAddr} rowIdx={i} /> },
  { label: '하차지명', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.unloadLoc} rowIdx={i} /> },
  { label: '하차지주소', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.unloadAddr} rowIdx={i} /> },
  { label: '경유', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.via} rowIdx={i} /> },
  { label: '독차', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.exclusive} rowIdx={i} /> },
  { label: '왕복', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.roundTrip} rowIdx={i} /> },
  { label: '요청 차량톤수', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.ton} rowIdx={i} /> },
  { label: '요청 차량종류', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.vehicleType} rowIdx={i} /> },
  { label: '요청 차량옵션', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.vehicleOption} rowIdx={i} /> },
  { label: '차량번호', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.vehicleNum} rowIdx={i} /> },
  { label: '기사명', width: 100, render: (d, i) => <TextDataCell313S key={i} text={d.driver} rowIdx={i} /> },
  { label: '청구금액', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.charge.toLocaleString()} rowIdx={i} /> },
  { label: '세액', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.tax.toLocaleString()} rowIdx={i} /> },
  { label: '합계 금액', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.total.toLocaleString()} rowIdx={i} /> },
  { label: '매출 거래명세서ID', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.statementId || '-'} rowIdx={i} /> },
  { label: '계산서 작성일자', width: 140, render: (d, i, h) => d.invoiceDate
    ? <TextDataCell313S key={i} text={d.invoiceDate} rowIdx={i} underline onClick={h.onInvoiceDetailClick} />
    : <TextDataCell313S key={i} text="-" rowIdx={i} /> },
  { label: '계산서 발행일자', width: 140, render: (d, i, h) => d.invoiceIssueDate
    ? <TextDataCell313S key={i} text={d.invoiceIssueDate} rowIdx={i} underline onClick={h.onInvoiceDetailClick} />
    : <TextDataCell313S key={i} text="-" rowIdx={i} /> },
  { label: '수금기한', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.collectDeadline || '-'} rowIdx={i} /> },
  { label: '수금일', width: 140, render: (d, i) => <TextDataCell313S key={i} text={d.collectDate || '-'} rowIdx={i} /> },
  { label: '증빙서류', width: 100, render: (_d, i) => <ButtonDataCell313S key={i} rowIdx={i} text="1장" /> },
];

const TABLE_COLS_313S = TABLE_COLS_313S_BASE;

// 협력사 탭용 업무그룹
const PARTNER_GROUPS_313 = ['영남팀', '호남팀', '충청팀', '강원팀', '제주팀', '전국물류팀', '수도권팀'];

// 협력사 탭: 라벨 변경, 주문번호 제거, 협력사/업무그룹 데이터 파트너 기준으로 교체
const TABLE_COLS_313S_PARTNER: ColDef313S[] = TABLE_COLS_313S_BASE
  .filter(c => c.label !== '화주사 주문번호')
  .map(c => {
    if (c.label === '화주사') return {
      ...c, label: '협력사',
      render: (_d: RowData313S, i: number) => <TextDataCell313S key={i} text={PARTNER_ROW_DATA_313[i % PARTNER_ROW_DATA_313.length]} rowIdx={i} />,
    };
    if (c.label === '화주사 업무그룹') return {
      ...c, label: '협력사 업무그룹',
      render: (_d: RowData313S, i: number) => <TextDataCell313S key={i} text={PARTNER_GROUPS_313[i % PARTNER_GROUPS_313.length]} rowIdx={i} />,
    };
    return c;
  });

function DynamicTable313S({ pageRows, overrides, cancelledIdxSet, handlers }: {
  pageRows: number[];
  overrides: RowOverrides313S;
  cancelledIdxSet: Set<number>;
  handlers: RowHandlers313S;
}) {
  const { activeTab } = useContext(SubTabCtx);
  const cols = activeTab === '협력사'
    ? TABLE_COLS_313S_BASE.map(c =>
        c.label === '화주사' ? { ...c, label: '협력사' } :
        c.label === '화주사 업무그룹' ? { ...c, label: '협력사 업무그룹' } : c
      )
    : TABLE_COLS_313S;
  return (
    <>
      <div className="relative shrink-0">
        <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
          <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center p-[8px] relative shrink-0 w-[34px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells" data-cb-row="header">
            <ColBorder313S />
            <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
              <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            </div>
          </div>
          {pageRows.map((rowIdx) => <CheckboxDataCell313S key={rowIdx} rowIdx={rowIdx} />)}
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-r border-solid inset-0 pointer-events-none" />
      </div>
      {cols.map((col) => (
        <div key={col.label} className="relative shrink-0" style={{ width: col.width }}>
          <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
            <HeaderCell313S label={col.label} />
            {pageRows.map((rowIdx) => col.render(getRowData313S(rowIdx, overrides, cancelledIdxSet.has(rowIdx)), rowIdx, handlers))}
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
        </div>
      ))}
    </>
  );
}

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

const SALE_STATUS_LABELS_313 = ['마감필요', '정산대기', '수금대기', '수금완료', '정산보류'];
const ITEMS_313: { label: string; amount: string }[] = [
  { label: '전체', amount: '' },
  ...SALE_STATUS_LABELS_313.map(label => ({ label, amount: '' })),
];

// 화주사 업무그룹 필터용 (화주사·업무그룹 쌍 목록)
const SHIPPER_GROUP_OPTIONS_313: { shipper: string; group: string }[] = SHIPPER_ROW_DATA_313.flatMap(
  shipper => (GROUPS_BY_SHIPPER[shipper] ?? ['기본 그룹']).map(group => ({ shipper, group }))
);

function Con() {
  const { activeTab } = useContext(SubTabCtx);
  const isPartnerTab = false;
  const isDriverTab = activeTab === '기사';
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [shipperSelected, setShipperSelected] = useState<Set<number>>(new Set());
  const [partnerSelected, setPartnerSelected] = useState<Set<number>>(new Set());
  const [groupSelected, setGroupSelected] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [preSelectedIndices, setPreSelectedIndices] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [invoiceErrorMessage, setInvoiceErrorMessage] = useState<string | undefined>(undefined);
  const [dateRangeStart, setDateRangeStart] = useState<Date|null>(() => { const t = new Date(2026,5,29); t.setMonth(t.getMonth()-2); t.setHours(0,0,0,0); return t; });
  const [dateRangeEnd, setDateRangeEnd] = useState<Date|null>(new Date(2026,5,29));
  const [dateType, setDateType] = useState<string>('상차일');
  const [orderDetailId, setOrderDetailId] = useState<string|null>(null);
  const [orderDetailRowIdx, setOrderDetailRowIdx] = useState<number>(0);
  const [searchType, setSearchType] = useState('오더 ID');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<{ type: string; text: string } | null>(null);
  const [manualInvoiceRegistered, setManualInvoiceRegistered] = useState<Set<number>>(new Set());
  const [invoiceGenerated, setInvoiceGenerated] = useState<Set<number>>(new Set());
  const [collectionCompleted, setCollectionCompleted] = useState<Set<number>>(new Set());
  const [collectConfirmRows, setCollectConfirmRows] = useState<number[] | null>(null);
  const overrides: RowOverrides313S = { manualInvoiceRegistered, invoiceGenerated, collectionCompleted };

  useEffect(() => {
    const handler = (e: Event) => {
      const { orderId, rowIdx } = (e as CustomEvent).detail;
      setOrderDetailId(orderId);
      setOrderDetailRowIdx(rowIdx);
    };
    window.addEventListener('openOrderDetail', handler);
    return () => window.removeEventListener('openOrderDetail', handler);
  }, []);

  const tableRef = useRef<HTMLDivElement>(null);
  const [cancelledTopRows313, setCancelledTopRows313] = useState<CancelledOrderEntry[]>(getCancelledOrders());
  useEffect(() => subscribeCancelledOrders(() => setCancelledTopRows313(getCancelledOrders())), []);
  const cancelledIdxSet313 = useMemo(() => new Set(cancelledTopRows313.map(o => o.rowIdx)), [cancelledTopRows313]);
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx313);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 300;

  const getRow = (i: number) => getRowData313S(i, overrides, cancelledIdxSet313.has(i));

  const openModal = (indices: number[]) => {
    if (indices.length > 0) {
      const rows = indices.map(getRow);
      const hasInvalid = rows.some(r => r.status !== '정산대기');
      if (hasInvalid) { setInvoiceErrorMessage('정산대기 상태의 오더만 거래명세서 생성이 가능합니다.'); setShowErrorToast(true); return; }
      const hasGenerated = rows.some(r => r.statementId);
      if (hasGenerated) { setInvoiceErrorMessage('이미 매출 거래명세서로 생성된 오더입니다.'); setShowErrorToast(true); return; }
      const distinctShippers = new Set(rows.map(r => r.shipper));
      if (distinctShippers.size > 1) { setInvoiceErrorMessage('서로 다른 화주사가 섞여 있어 거래명세서를 생성할 수 없습니다.'); setShowErrorToast(true); return; }
    }
    setInvoiceErrorMessage(undefined);
    setPreSelectedIndices(indices);
    setModalOpen(true);
  };

  const registerManualInvoice = (indices: number[]) => {
    setManualInvoiceRegistered(prev => new Set([...prev, ...indices]));
  };

  // 수금대기 + 수기계산서 등록 경로(거래명세서 경로 제외)만 오더 단위 수금완료 가능
  const requestCollectionComplete = (indices: number[]): { ok: boolean; message?: string } => {
    const rows = indices.map(getRow);
    if (rows.some(r => r.status !== '수금대기')) return { ok: false, message: '수금대기 상태의 오더만 수금완료 처리가 가능합니다.' };
    if (rows.some(r => r.statementId)) return { ok: false, message: '매출 거래명세서로 생성된 오더는 매출 거래명세서 메뉴에서 처리해야 합니다.' };
    setCollectConfirmRows(indices);
    return { ok: true };
  };

  const getRowDateForType313 = (i: number, type: string) => {
    const load = getLoadingDate313(i);
    if (type === '하차일') return addDays313(load, 1 + (i % 3));
    if (type === '매출 명세서 기준일') return addDays313(load, 2);
    return load;
  };

  const matchesSearch313 = (i: number) => {
    if (!appliedSearch) return true;
    const r = getRow(i);
    const FIELD_MAP: Record<string, string> = {
      '오더 ID': r.orderId,
      '화주사 별칭': r.shipper,
      '화주사 주문번호': r.shipperOrderNum,
      '사업자명': r.bizName,
      '사업자번호': r.bizNumber,
      '상차지': r.loadLoc,
      '하차지': r.unloadLoc,
      '매출 거래명세서ID': r.statementId,
    };
    const field = FIELD_MAP[appliedSearch.type] ?? '';
    return field.toLowerCase().includes(appliedSearch.text.toLowerCase());
  };

  const groupMatches313 = (i: number, rowShipper: string) => {
    if (groupSelected.size === 0) return true;
    const rowGroup = getGroupForIndex(i, rowShipper);
    return [...groupSelected].some(idx => {
      const opt = SHIPPER_GROUP_OPTIONS_313[idx];
      return opt && opt.shipper === rowShipper && opt.group === rowGroup;
    });
  };

  const hiddenRows = useMemo(() => {
    const hidden = new Set<number>();
    const filterStatuses = selected.has(0) ? null : new Set([...selected].map(i => ITEMS_313[i].label));
    const lo313 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi313 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo313 !== null ? lo313 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_313[i % SHIPPER_ROW_DATA_313.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS[idx] === rowShipper);
      const status = getRow(i).status;
      const statusMatch = filterStatuses === null || filterStatuses.has(status);
      if (!statusMatch || !shipperMatch || !groupMatches313(i, rowShipper) || !matchesSearch313(i)) { hidden.add(i); continue; }
      if (lo313 !== null) {
        const rowT = parseYMD313(getRowDateForType313(i, dateType)).getTime();
        if (rowT < lo313 || rowT > hi313!) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, shipperSelected, groupSelected, dateRangeStart, dateRangeEnd, dateType, appliedSearch, manualInvoiceRegistered, invoiceGenerated, collectionCompleted, cancelledIdxSet313]);

  const dynamicCounts = useMemo(() => {
    const counts = new Array(ITEMS_313.length).fill(0);
    const amounts = new Array(ITEMS_313.length).fill(0);
    const lo313dc = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi313dc = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo313dc !== null ? lo313dc + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_313[i % SHIPPER_ROW_DATA_313.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS[idx] === rowShipper);
      if (!shipperMatch || !groupMatches313(i, rowShipper) || !matchesSearch313(i)) continue;
      if (lo313dc !== null) {
        const rowT = parseYMD313(getRowDateForType313(i, dateType)).getTime();
        if (rowT < lo313dc || rowT > hi313dc!) continue;
      }
      const d = getRow(i);
      counts[0]++; amounts[0] += d.charge;
      const si = SALE_STATUS_LABELS_313.indexOf(d.status);
      if (si >= 0) { counts[si + 1]++; amounts[si + 1] += d.charge; }
    }
    return { saleCounts: counts, saleAmounts: amounts, saleTotalAmount: amounts[0] };
  }, [shipperSelected, groupSelected, dateRangeStart, dateRangeEnd, dateType, appliedSearch, manualInvoiceRegistered, invoiceGenerated, collectionCompleted, cancelledIdxSet313]);

  const pageRows = useMemo(() => {
    const PAGE_SIZE_LOCAL = 200;
    const cancelledVisible = cancelledTopRows313.map(o => o.rowIdx).filter(i => !hiddenRows.has(i));
    const baseSorted = Array.from({ length: TOTAL_ROWS }, (_, i) => i)
      .filter(i => !cancelledIdxSet313.has(i) && !hiddenRows.has(i))
      .sort((a, b) => {
        // 1차: 매출상태 우선순위, 2차: 선택된 기간구분 기준 날짜 오름차순
        const pa = STATUS_PRIORITY_313[getRow(a).status] ?? 99;
        const pb = STATUS_PRIORITY_313[getRow(b).status] ?? 99;
        if (pa !== pb) return pa - pb;
        const da = parseYMD313(getRowDateForType313(a, dateType)).getTime();
        const db = parseYMD313(getRowDateForType313(b, dateType)).getTime();
        return da - db;
      });
    const allVisible = [...cancelledVisible, ...baseSorted];
    const start = (currentPage - 1) * PAGE_SIZE_LOCAL;
    return allVisible.slice(start, start + PAGE_SIZE_LOCAL);
  }, [hiddenRows, currentPage, cancelledTopRows313, cancelledIdxSet313, dateType, manualInvoiceRegistered, invoiceGenerated, collectionCompleted]);

  const pageRowsRef = useRef(pageRows);
  useEffect(() => { pageRowsRef.current = pageRows; }, [pageRows]);

  useEffect(() => {
    if (!tableRef.current) return;
    const CHECKMARK = `<svg viewBox="0 0 10 8" fill="none" style="position:absolute;inset:0;width:100%;height:100%;padding:1px"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedRows.has(r));
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
        const rows = pageRowsRef.current;
        setSelectedRows((prev) => {
          const allSelected = rows.every((r) => prev.has(r));
          const next = new Set(prev);
          rows.forEach((r) => (allSelected ? next.delete(r) : next.add(r)));
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
  }, []);

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


  useEffect(() => {
    const total = TOTAL_ROWS - hiddenRows.size;
    setFilteredTotal(total);
    setCurrentPage(1);
  }, [hiddenRows]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [currentPage]);

  return (
    <>
    <DateFilterCtx313.Provider value={{ rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd, dateType, setDateType }}>
    <DynamicCountCtx313.Provider value={dynamicCounts}>
    <BubbleCtx313.Provider value={{ shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected, groupSelected, setGroupSelected }}>
    <ModalCtx313.Provider value={{
      openModal: (indices) => openModal(indices.length > 0 ? indices : Array.from(selectedRows)),
      selectedRows, getRow, registerManualInvoice,
      requestCollectionComplete: (indices) => requestCollectionComplete(indices.length > 0 ? indices : Array.from(selectedRows)),
    }}>
    <SearchCtx313.Provider value={{ searchType, searchText, setSearchType, setSearchText, runSearch: () => setAppliedSearch(searchText.trim() ? { type: searchType, text: searchText.trim() } : null) }}>
    {showToast && <InvoiceToast onClose={() => setShowToast(false)} />}
    {showErrorToast && <InvoiceErrorToast onClose={() => setShowErrorToast(false)} message={invoiceErrorMessage} />}
    {modalOpen && <CreateInvoiceModal preSelectedIndices={preSelectedIndices} onClose={() => setModalOpen(false)} onSuccess={() => { setShowToast(true); if (preSelectedIndices.length > 0) setInvoiceGenerated(prev => new Set([...prev, ...preSelectedIndices])); }} />}
    {collectConfirmRows && <CollectCompleteConfirmModal
      onClose={() => setCollectConfirmRows(null)}
      onConfirm={() => { setCollectionCompleted(prev => new Set([...prev, ...collectConfirmRows])); setCollectConfirmRows(null); }}
    />}
    <FilterCtx313.Provider value={{ selected, setSelected }}>
    <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="content-stretch flex flex-col items-start pt-[4px] px-[32px] relative size-full">
        <Frame3 />
        <FilterSorterModule />
        <Frame646 />
        <TableControlModule />
        <div className="content-stretch flex h-[840px] items-start relative shrink-0 overflow-auto w-[1648px] pb-[40px]" data-name="매출장부표_화주사" ref={tableRef}>
          <DynamicTable313S
            pageRows={pageRows}
            overrides={overrides}
            cancelledIdxSet={cancelledIdxSet313}
            handlers={{
              onOrderClick: (orderId, rowIdx) => window.dispatchEvent(new CustomEvent('openOrderDetail', { detail: { orderId, rowIdx } })),
              onInvoiceDetailClick: () => window.dispatchEvent(new CustomEvent('openManualInvoiceDetail')),
            }}
          />
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx313.Provider>
    </SearchCtx313.Provider>
    </ModalCtx313.Provider>
    </BubbleCtx313.Provider>
    </DynamicCountCtx313.Provider>
    </DateFilterCtx313.Provider>
    {orderDetailId && <OrderDetailModal
      orderId={orderDetailId}
      rowIdx={orderDetailRowIdx}
      onClose={() => setOrderDetailId(null)}
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
  const { currentPage, filteredTotal } = useContext(PageCtx313);
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
  const { currentPage, setCurrentPage, filteredTotal } = useContext(PageCtx313);
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

function Frame632() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(300);
  return (
    <PageCtx313.Provider value={{ currentPage, setCurrentPage, filteredTotal, setFilteredTotal }}>
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
    </PageCtx313.Provider>
  );
}

function Right() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-[1180px] relative" data-name="right">
      <div className="bg-white content-stretch flex h-[82px] items-center px-[32px] relative shrink-0 w-[1712px]" data-name>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <Frame600 />
      </div>
      <Frame632 />
    </div>
  );
}

function Ui() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] items-start min-h-px overflow-clip relative w-full" data-name="통합장부 / UI">
      <SharedLnb activeTabIndex={1} />
      <Right />
    </div>
  );
}

export default function Component12() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.3 매출장부_화주사">
      <Ui />
    </div>
  );
}