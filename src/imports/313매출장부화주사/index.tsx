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

const ROW_STATUSES_313 = ["마감필요","정산대기","정산대기","정산대기","정산대기","정산대기","수금대기","수금대기","수금완료","수금완료","정산보류"];
const STATUS_PRIORITY_313: Record<string, number> = { '마감필요': 0, '정산대기': 1, '수금대기': 2, '수금완료': 3, '정산보류': 4, '정산제외': 5 };

const LOADING_DATES_313 = [
  '26.01.05','26.01.08','26.01.12','26.01.15','26.01.19','26.01.22','26.01.26','26.01.29',
  '26.02.02','26.02.05','26.02.09','26.02.12','26.02.16','26.02.19','26.02.23','26.02.26',
  '26.03.02','26.03.05','26.03.09','26.03.12','26.03.16','26.03.19','26.03.23','26.03.26','26.03.30',
  '26.04.02','26.04.06','26.04.09','26.04.13','26.04.16','26.04.20','26.04.23','26.04.27','26.04.30',
  '26.05.04','26.05.07','26.05.11','26.05.14','26.05.18','26.05.21','26.05.25','26.05.28',
  '26.06.01','26.06.04','26.06.08','26.06.11','26.06.15','26.06.18','26.06.22','26.06.25',todayYYMMDD(),
];
const getLoadingDateIdx313 = (i: number) => { let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11; return ((h >>> 0) % LOADING_DATES_313.length + LOADING_DATES_313.length) % LOADING_DATES_313.length; };
const getLoadingDate313 = (i: number) => LOADING_DATES_313[getLoadingDateIdx313(i)];

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

interface DateFilterCtxType313 { rangeStart: Date|null; rangeEnd: Date|null; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; }
const DateFilterCtx313 = createContext<DateFilterCtxType313>({ rangeStart: null, rangeEnd: null, setRangeStart: () => {}, setRangeEnd: () => {} });

interface BubbleCtxType313 { shipperSelected: Set<number>; setShipperSelected: (s: Set<number>) => void; partnerSelected: Set<number>; setPartnerSelected: (s: Set<number>) => void; }
const BubbleCtx313 = createContext<BubbleCtxType313>({ shipperSelected: new Set(), setShipperSelected: () => {}, partnerSelected: new Set(), setPartnerSelected: () => {} });

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

const PageCtx313 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 5000, setFilteredTotal: () => {} });
const ModalCtx313 = createContext<{ openModal: (indices: number[]) => void; selectedRows: Set<number> }>({ openModal: () => {}, selectedRows: new Set() });
const FilterCtx313 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

function DashboardCard({ label, amount, active, onClick }: { label: string; amount: string; active: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[8px] flex-1 min-w-0 h-[72px] flex flex-col items-start px-[16px] py-[12px] ${active ? "bg-white" : "bg-[#f6f7f8] hover:bg-[#EBEDEF]"} ${onClick ? "cursor-pointer select-none" : ""}`}
    >
      {active && <div aria-hidden className="absolute border border-[#EBEDEF] border-solid inset-0 pointer-events-none rounded-[8px]" />}
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#5c6370] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap overflow-hidden text-ellipsis">{amount}</p>
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

const PERIOD_OPTIONS_313 = ['상차일', '하차일', '매출 명세서 기준일', '매입 명세서 기준일'] as const;

function TypeStatusDisabled() {
  const [selected, setSelected] = useState<string>('상차일');
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

function BubbleFilter313() {
  const { activeTab } = useContext(SubTabCtx);
  const isPartnerTab = activeTab === '협력사';
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

      {/* 협력사 bubble filter - 협력사 탭에서만 표시 */}
      <div ref={partnerBtnRef} style={{ position: 'relative', display: (isPartnerTab || isDriverTab) ? undefined : 'none' }}>
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

function InvoiceErrorToast({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <>
      <style>{TOAST_ANIMATION}</style>
      <div style={{ ...TOAST_STYLE, background: "#E13838" }}>
        <span style={{ color: "#fff", fontFamily: "'Pretendard GOV', sans-serif", fontSize: 15, fontWeight: 400, letterSpacing: "-0.3px", lineHeight: "22px" }}>
          정산대기 상태의 오더만 거래명세서 생성이 가능합니다.
        </span>
        <ToastCloseBtn onClose={onClose} />
      </div>
    </>,
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
  const { openModal, selectedRows } = useContext(ModalCtx313);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualErrorToast, setManualErrorToast] = useState(false);
  const [manualSuccessToast, setManualSuccessToast] = useState(false);
  const [statusErrorToast, setStatusErrorToast] = useState(false);
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
      {manualOpen && <ManualInvoiceModal onClose={() => setManualOpen(false)} onSuccess={() => setManualSuccessToast(true)} selectedIndices={[...selectedRows]} />}
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
              정산대기 상태의 오더를 선택해 주세요.
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
          onClick={() => { if (selectedRows.size === 0) { setManualErrorToast(true); return; } const indices = [...selectedRows]; const hasNonJeongsan = indices.some(i => ROW_STATUSES_313[i % ROW_STATUSES_313.length] !== '정산대기'); if (hasNonJeongsan) { setStatusErrorToast(true); return; } setManualOpen(true); }}
          style={{ cursor:'pointer' }}
        >
          <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
            <div className={`[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] tracking-[-0.3px] whitespace-nowrap ${activeTab === '기사' ? 'text-white' : 'text-[#2e3238]'}`}>
              <p className="leading-[22px]">수기계산서 등록</p>
            </div>
          </div>
          {activeTab !== '기사' && <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />}
        </div>
        <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
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
  const label = searchType || (activeTab === '기사' ? '차량번호' : '오더 ID');
  const placeholder = `${label}를 입력하세요.`;
  return (
    <div className="bg-white h-[36px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#767d8a] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">{placeholder}</p>
          </div>
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
                : activeTab === '협력사' ? SEARCH_TYPES_PARTNER
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
  const { activeTab } = useContext(SubTabCtx);
  const getDefault = (tab: string) => tab === '기사' ? '차량번호' : '오더 ID';
  const [searchType, setSearchType] = useState(() => getDefault(activeTab));
  useEffect(() => { setSearchType(getDefault(activeTab)); }, [activeTab]);

  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="텍스트검색">
      <Component11 searchType={searchType} setSearchType={setSearchType} />
      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
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

const TableCtrlCtx = createContext({ filteredTotal: 5000, selectedCount: 0 });

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

function Frame603() {
  return (
    <div className="relative shrink-0">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center p-[8px] relative shrink-0 w-[34px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            <div className="absolute inset-[37.25%_30.38%]" data-name="Vector">
              <div className="absolute inset-[-15.68%_-10.19%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.44766 6.70098">
                  <path d={svgPaths.p3893640} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            <div className="absolute inset-[37.25%_30.38%]" data-name="Vector">
              <div className="absolute inset-[-15.68%_-10.19%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.44766 6.70098">
                  <path d={svgPaths.p3893640} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            <div className="absolute inset-[37.25%_30.38%]" data-name="Vector">
              <div className="absolute inset-[-15.68%_-10.19%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.44766 6.70098">
                  <path d={svgPaths.p3893640} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-r border-solid inset-0 pointer-events-none" />
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

function Frame4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title7 />
    </div>
  );
}

function Frame628() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame4 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">마감필요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산대기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산대기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#454b55] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산대기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#e4fbeb] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#18ac42] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">수금대기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#e4fbeb] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#18ac42] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">수금대기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#e6efff] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#005fff] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">수금완료</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#e6efff] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#005fff] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">수금완료</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산보류</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산보류</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#c7cbd1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산제외</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#c7cbd1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산제외</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#c7cbd1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산제외</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#c7cbd1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산제외</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#ebedef] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#c7cbd1] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">정산제외</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">오더ID</p>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title8 />
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

function Frame24() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">KMO1234</p>
      </div>
    </div>
  );
}

function Frame604() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame5 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame24 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame25 />
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사</p>
      </div>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title9 />
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">(주)글로벌로지스</p>
      </div>
    </div>
  );
}

function Frame606() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame26 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame45 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame46 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사 업무그룹</p>
      </div>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title10 />
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame66() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame607() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame47 />
            </div>
          </div>
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
              <Frame61 />
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame67 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame68 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사 주문번호</p>
      </div>
    </div>
  );
}

function Frame69() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title11 />
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame605() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame69 />
            </div>
          </div>
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
              <Frame77 />
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame89 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame90 />
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">매출 명세서 기준일</p>
      </div>
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title12 />
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame99() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame102() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame110() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame619() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame91 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame110 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame111 />
            </div>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차일</p>
      </div>
    </div>
  );
}

function Frame112() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title13 />
    </div>
  );
}

function Frame113() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame116() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame117() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame118() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame119() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame120() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame122() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame124() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame130() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame131() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame132() {
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
      <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center p-[8px] relative size-full">
            <Frame112 />
          </div>
        </div>
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame113 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame114 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame115 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame116 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame117 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame118 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame119 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame120 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame121 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame122 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame123 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame124 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame125 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame126 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame127 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame128 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame129 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame130 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame131 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame132 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Title14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차일</p>
      </div>
    </div>
  );
}

function Frame133() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title14 />
    </div>
  );
}

function Frame134() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame135() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame143() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame144() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame145() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame146() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame147() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame148() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame149() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame151() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">25.10.20</p>
      </div>
    </div>
  );
}

function Frame153() {
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
      <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <div className="flex flex-row items-center size-full">
          <div className="content-stretch flex items-center p-[8px] relative size-full">
            <Frame133 />
          </div>
        </div>
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
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame152 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
          <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
            <Frame153 />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Title15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차지명</p>
      </div>
    </div>
  );
}

function Frame154() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title15 />
    </div>
  );
}

function Frame155() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame156() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame157() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame160() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame161() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame162() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame163() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame164() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame165() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame166() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame167() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame168() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame169() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame170() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame171() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame172() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame173() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame174() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교테크노밸리</p>
      </div>
    </div>
  );
}

function Frame608() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame154 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame173 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame174 />
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">상차지주소</p>
      </div>
    </div>
  );
}

function Frame175() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title16 />
    </div>
  );
}

function Frame176() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame177() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame178() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame179() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame180() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame181() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame182() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame183() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame184() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame185() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame186() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame187() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame188() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame189() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame190() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame191() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame192() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame193() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame194() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame195() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 성남시 삼평동</p>
      </div>
    </div>
  );
}

function Frame609() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center p-[8px] relative shrink-0 w-[140px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <Frame175 />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame176 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame177 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame178 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame179 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame180 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame181 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame182 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame183 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame184 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame185 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame186 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame187 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame188 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame189 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame190 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame191 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame192 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame193 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame194 />
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-[140px]" data-name="Table_Data Cells">
          <div className="content-stretch flex gap-[6px] items-center overflow-clip px-[8px] py-[10px] relative rounded-[inherit] size-full">
            <Frame195 />
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차지명</p>
      </div>
    </div>
  );
}

function Frame196() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title17 />
    </div>
  );
}

function Frame197() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame198() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame199() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame200() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame201() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame202() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame203() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame204() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame205() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame206() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame207() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame208() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame209() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame210() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame211() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame212() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame213() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame214() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame215() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame216() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">광교물류</p>
      </div>
    </div>
  );
}

function Frame610() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame196 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame215 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame216 />
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">하차지주소</p>
      </div>
    </div>
  );
}

function Frame217() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title18 />
    </div>
  );
}

function Frame218() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame220() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame221() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame222() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame223() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame224() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame225() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame226() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame227() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame228() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame229() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame230() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame231() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame232() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame233() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame234() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame235() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame236() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame237() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame238() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경기 수원시 이의동</p>
      </div>
    </div>
  );
}

function Frame611() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame217 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame236 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">경유</p>
      </div>
    </div>
  );
}

function Frame239() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title19 />
    </div>
  );
}

function Frame240() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame241() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame242() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame243() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame244() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame245() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame246() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame247() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame248() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame249() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame250() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame251() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame252() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame253() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame254() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame255() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame256() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame257() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame258() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame259() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">0곳</p>
      </div>
    </div>
  );
}

function Frame612() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame239 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame257 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title20() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame260() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title20 />
    </div>
  );
}

function Frame261() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame262() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame263() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame264() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame265() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame266() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame267() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame268() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame269() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame270() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame271() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame272() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame273() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame274() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame275() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame276() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame277() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame278() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame279() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame281() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">독차</p>
      </div>
    </div>
  );
}

function Frame629() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame260 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame278 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
              <Frame281 />
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
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">왕복</p>
      </div>
    </div>
  );
}

function Frame283() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title21 />
    </div>
  );
}

function Frame284() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame285() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame286() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame287() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame288() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame289() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame290() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame291() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame292() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame293() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame294() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame295() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame296() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame297() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame298() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame299() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame300() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame301() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame302() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame303() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">편도</p>
      </div>
    </div>
  );
}

function Frame613() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame283 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame300 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title22() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청 차량톤수</p>
      </div>
    </div>
  );
}

function Frame304() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title22 />
    </div>
  );
}

function Frame305() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame306() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame307() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame308() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame309() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame310() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame311() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame312() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame313() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame314() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame315() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame316() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame317() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame318() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame319() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame320() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame321() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame322() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame323() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame324() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1톤</p>
      </div>
    </div>
  );
}

function Frame626() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame304 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame321 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title23() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청 차량종류</p>
      </div>
    </div>
  );
}

function Frame325() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title23 />
    </div>
  );
}

function Frame326() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame327() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame328() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame329() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame330() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame331() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame332() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame333() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame334() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame335() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame336() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame337() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame338() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame339() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame340() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame341() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame342() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame343() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame344() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame345() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">탑</p>
      </div>
    </div>
  );
}

function Frame627() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame325 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame342 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame343 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame344 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame345 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title24() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청 차량옵션</p>
      </div>
    </div>
  );
}

function Frame346() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title24 />
    </div>
  );
}

function Frame347() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame348() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame349() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame350() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame351() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame352() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame353() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame354() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame355() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame356() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame357() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame358() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame359() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame360() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame361() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame362() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame363() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame364() {
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
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame366() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">냉장</p>
      </div>
    </div>
  );
}

function Frame614() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame346 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame347 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame348 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame349 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame350 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame351 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame352 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame353 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame354 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame355 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame356 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame357 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame358 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame359 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame360 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame361 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame362 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame363 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame364 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame365 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame366 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">차량번호</p>
      </div>
    </div>
  );
}

function Frame367() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title25 />
    </div>
  );
}

function Frame368() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame369() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame370() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame371() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame372() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame373() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame374() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame375() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame376() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame377() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame378() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame379() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame380() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame381() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame382() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame383() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame384() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame385() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame386() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame387() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame615() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame367 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame368 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame369 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame370 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame371 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame372 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame373 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame374 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame375 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame376 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame377 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame378 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame379 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame380 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame381 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame382 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame383 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame384 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame385 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame386 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame387 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title26() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사명</p>
      </div>
    </div>
  );
}

function Frame388() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title26 />
    </div>
  );
}

function Frame389() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame390() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame391() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame392() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame393() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame394() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame395() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame396() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame397() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame398() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame399() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame400() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame401() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame402() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame403() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame404() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame405() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame406() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame407() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame408() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame616() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame388 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame389 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame390 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame391 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame392 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame393 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame394 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame395 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame396 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame397 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame398 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame399 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame400 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame401 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame402 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame403 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame404 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame405 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame406 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame407 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame408 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title27() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">청구금액</p>
      </div>
    </div>
  );
}

function Frame409() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title27 />
    </div>
  );
}

function Frame410() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame411() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame412() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame413() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame414() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame415() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame416() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame417() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame418() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame419() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame420() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame421() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame422() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame423() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame424() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame425() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame426() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame427() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame428() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame429() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame617() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame409 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame410 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame411 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame412 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame413 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame414 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame415 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame416 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame417 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame418 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame419 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame420 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame421 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame422 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame423 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame424 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame425 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame426 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame427 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame428 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame429 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title28() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">세액</p>
      </div>
    </div>
  );
}

function Frame430() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title28 />
    </div>
  );
}

function Frame431() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame432() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame433() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame434() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame435() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame436() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame437() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame438() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame439() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame440() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame441() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame442() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame443() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame444() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame445() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame446() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame447() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame448() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame449() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame450() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame618() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame430 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame431 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame432 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame433 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame434 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame435 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame436 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame437 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame438 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame439 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame440 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame441 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame442 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame443 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame444 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame445 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame446 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame447 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame448 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame449 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame450 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title29() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">합계 금액</p>
      </div>
    </div>
  );
}

function Frame451() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title29 />
    </div>
  );
}

function Frame452() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame453() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame454() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame455() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame456() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame457() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame458() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame459() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame460() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame461() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame462() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame463() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame464() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame465() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame466() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame467() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame468() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame469() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame470() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame471() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame625() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame451 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame452 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame453 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame454 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame455 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame456 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame457 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame458 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame459 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame460 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame461 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame462 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame463 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame464 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame465 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame466 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame467 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame468 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame469 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame470 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame471 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title30() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">매출 거래명세서ID</p>
      </div>
    </div>
  );
}

function Frame472() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title30 />
    </div>
  );
}

function Frame473() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame474() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame475() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame476() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame477() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame478() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame479() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame480() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame481() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame482() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame483() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame484() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame485() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame486() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame487() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame488() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame489() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame490() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame491() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame492() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">D7N3Y6</p>
      </div>
    </div>
  );
}

function Frame620() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame472 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame473 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame474 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame475 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame476 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame477 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame478 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame479 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame480 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame481 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame482 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame483 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame484 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame485 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame486 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame487 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame488 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame489 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame490 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame491 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame492 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title31() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 작성일자</p>
      </div>
    </div>
  );
}

function Frame493() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title31 />
    </div>
  );
}

function Frame494() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame495() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame496() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame497() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame498() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame499() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame500() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame501() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame502() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame503() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame504() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame505() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame506() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame507() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame508() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame509() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame510() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame511() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame512() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame513() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame622() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame493 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame494 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame495 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame496 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame497 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame498 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame499 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame500 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame501 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame502 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame503 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame504 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame505 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame506 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame507 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame508 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame509 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame510 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame511 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame512 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame513 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title32() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 작성일자</p>
      </div>
    </div>
  );
}

function Frame514() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title32 />
    </div>
  );
}

function Frame515() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame516() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame517() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame518() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame519() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame520() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame521() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame522() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame523() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame524() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame525() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame526() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame527() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame528() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame529() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame530() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame531() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame532() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame533() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame534() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame621() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame514 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame515 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame516 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame517 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame518 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame519 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame520 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame521 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame522 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame523 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame524 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame525 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame526 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame527 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame528 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame529 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame530 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame531 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame532 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame533 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame534 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title33() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">수금기한</p>
      </div>
    </div>
  );
}

function Frame535() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title33 />
    </div>
  );
}

function Frame536() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame537() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame538() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame539() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame540() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame541() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame542() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame543() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame544() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame545() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame546() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame547() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame548() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame549() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame550() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame551() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame552() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame553() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame554() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame555() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame623() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame535 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame536 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame537 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame538 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame539 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame540 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame541 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame542 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame543 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame544 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame545 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame546 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame547 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame548 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame549 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame550 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame551 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame552 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame553 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame554 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame555 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">수금일</p>
      </div>
    </div>
  );
}

function Frame556() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title34 />
    </div>
  );
}

function Frame557() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame558() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame559() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame560() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame561() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame562() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame563() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame564() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame565() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame566() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame567() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame568() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame569() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame570() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame571() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame572() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame573() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame574() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame575() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame576() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame630() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame556 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame557 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame558 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame559 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame560 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame561 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame562 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame563 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame564 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame565 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame566 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame567 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame568 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame569 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame570 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame571 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame572 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame573 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame574 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame575 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame576 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">증빙서류</p>
      </div>
    </div>
  );
}

function Frame577() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title35 />
    </div>
  );
}

function Frame578() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame579() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame580() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame581() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame582() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame583() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame584() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame585() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame586() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame587() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame588() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame589() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame590() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame591() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame592() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame593() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame594() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame595() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame596() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame597() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame624() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame577 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame578 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame579 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame580 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame581 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame582 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame583 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame584 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame585 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame586 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame587 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame588 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame589 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame590 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame591 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame592 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame593 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame594 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame595 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame596 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame597 />
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
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
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

const ITEMS_313_RAW = [
  { label: "마감필요 (455건)",   amountRaw: 0 },
  { label: "정산대기 (2,273건)", amountRaw: 312_000_000 },
  { label: "수금대기 (909건)",   amountRaw: 548_700_000 },
  { label: "수금완료 (909건)",   amountRaw: 1_240_500_000 },
  { label: "정산보류 (454건)",   amountRaw: 87_300_000 },
];
const ITEMS_313_TOTAL = ITEMS_313_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_313 = [
  { label: "전체 (5,000건)", amount: formatKorean(ITEMS_313_TOTAL) },
  ...ITEMS_313_RAW.map(x => ({ label: x.label, amount: formatKorean(x.amountRaw) })),
];
const ITEMS_313_MID = [
  { label: "전체 (5,000건)",      amount: formatKorean(ITEMS_313_TOTAL) },
  { label: "세금계산서 (1,834건)", amount: formatKorean(831_200_000) },
  { label: "계산서 (1,211건)",    amount: formatKorean(520_800_000) },
  { label: "무증빙 (982건)",      amount: formatKorean(412_500_000) },
  { label: "전자세금 (614건)",    amount: formatKorean(290_100_000) },
  { label: "기타 (359건)",        amount: formatKorean(133_000_000) },
];

function Con() {
  const { activeTab } = useContext(SubTabCtx);
  const isPartnerTab = activeTab === '협력사';
  const isDriverTab = activeTab === '기사';
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [shipperSelected, setShipperSelected] = useState<Set<number>>(new Set());
  const [partnerSelected, setPartnerSelected] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [preSelectedIndices, setPreSelectedIndices] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState<Date|null>(() => { const t = new Date(2026,5,29); t.setMonth(t.getMonth()-2); t.setHours(0,0,0,0); return t; });
  const [dateRangeEnd, setDateRangeEnd] = useState<Date|null>(new Date(2026,5,29));
  const [orderDetailId, setOrderDetailId] = useState<string|null>(null);
  const [orderDetailRowIdx, setOrderDetailRowIdx] = useState<number>(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const { orderId, rowIdx } = (e as CustomEvent).detail;
      setOrderDetailId(orderId);
      setOrderDetailRowIdx(rowIdx);
    };
    window.addEventListener('openOrderDetail', handler);
    return () => window.removeEventListener('openOrderDetail', handler);
  }, []);

  const openModal = (indices: number[]) => {
    if (indices.length > 0) {
      const hasInvalid = indices.some(i => ROW_STATUSES_313[i % ROW_STATUSES_313.length] !== "정산대기");
      if (hasInvalid) { setShowErrorToast(true); return; }
    }
    setPreSelectedIndices(indices);
    setModalOpen(true);
  };
  const tableRef = useRef<HTMLDivElement>(null);
  const [cancelledTopRows313, setCancelledTopRows313] = useState<CancelledOrderEntry[]>(getCancelledOrders());
  useEffect(() => subscribeCancelledOrders(() => setCancelledTopRows313(getCancelledOrders())), []);
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx313);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 5000;

  const hiddenRows = useMemo(() => {
    const hidden = new Set<number>();
    const filterStatuses = selected.has(0) ? null : new Set([...selected].map(i => ITEMS_313[i].label.split(" (")[0]));
    const parseYYMMDD313 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo313 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi313 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo313 !== null ? lo313 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_313[i % SHIPPER_ROW_DATA_313.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS[idx] === rowShipper);
      const statusMatch = filterStatuses === null || filterStatuses.has(ROW_STATUSES_313[i % ROW_STATUSES_313.length]);
      const rowPartner = PARTNER_ROW_DATA_313[i % PARTNER_ROW_DATA_313.length];
      const partnerMatch = partnerSelected.size === 0 ||
        [...partnerSelected].some(idx => PARTNERS_313[idx] === rowPartner);
      if (!statusMatch || !shipperMatch || !partnerMatch) { hidden.add(i); continue; }
      if (lo313 !== null) {
        const rowT = parseYYMMDD313(getLoadingDate313(i));
        if (rowT < lo313 || rowT > hi313!) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, shipperSelected, partnerSelected, dateRangeStart, dateRangeEnd]);

  const dynamicCounts = useMemo(() => {
    const counts = new Array(ITEMS_313.length).fill(0);
    let totalAmount = 0;
    const parseYYMMDD313dc = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo313dc = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi313dc = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo313dc !== null ? lo313dc + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_313[i % SHIPPER_ROW_DATA_313.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS[idx] === rowShipper);
      if (!shipperMatch) continue;
      const rowPartner = PARTNER_ROW_DATA_313[i % PARTNER_ROW_DATA_313.length];
      const partnerMatch = partnerSelected.size === 0 || [...partnerSelected].some(idx => PARTNERS_313[idx] === rowPartner);
      if (!partnerMatch) continue;
      if (lo313dc !== null) {
        const rowT = parseYYMMDD313dc(getLoadingDate313(i));
        if (rowT < lo313dc || rowT > hi313dc!) continue;
      }
      const status = ROW_STATUSES_313[i % ROW_STATUSES_313.length];
      counts[0]++;
      totalAmount += PER_ROW_SALE_AMOUNT_313[status] ?? 0;
      for (let si = 1; si < ITEMS_313.length; si++) {
        if (ITEMS_313[si].label.split(' (')[0] === status) counts[si]++;
      }
    }
    if (isPartnerTab) return { saleCounts: counts, saleTotalAmount: Math.round(totalAmount * 0.62) };
    if (isDriverTab) return { saleCounts: counts, saleTotalAmount: Math.round(totalAmount * 0.41) };
    return { saleCounts: counts, saleTotalAmount: totalAmount };
  }, [shipperSelected, partnerSelected, dateRangeStart, dateRangeEnd, isPartnerTab, isDriverTab]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
      const cells = Array.from(col.querySelectorAll<HTMLElement>('[data-name="Table_Data Cells"]'));
      if (!cells.length) return;
      const parent = cells[0].parentElement!;
      const SRC: Record<string, number> = { '마감필요': 0, '정산대기': 6, '수금대기': 9, '수금완료': 11, '정산보류': 13 };
      const headerText = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim();
      const isOrderIdCol = headerText === '오더ID';
      const isShipperCol = isPartnerTab ? false : headerText === '화주사';
      const isPartnerCol = isPartnerTab ? (headerText === '화주사') : (headerText === '협력사' || headerText === '요청협력사');
      const isGroupCol = headerText === '화주사 업무그룹';
      const isInvoiceDateCol = headerText === '계산서 작성일자';
      const isLoadingDateCol = headerText === '상차일';
      cells.forEach((c) => parent.removeChild(c));
      const parseLD313 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
      const cancelled313 = getCancelledOrders();
      const cancelledIdxSet313 = new Set(cancelled313.map(o => o.rowIdx));
      const baseSorted313 = Array.from({ length: TOTAL_ROWS }, (_, i) => i).filter(i => !cancelledIdxSet313.has(i)).sort((a, b) => {
        const da = parseLD313(getLoadingDate313(a)), db = parseLD313(getLoadingDate313(b));
        if (da !== db) return da - db;
        const sa = STATUS_PRIORITY_313[ROW_STATUSES_313[a % ROW_STATUSES_313.length]] ?? 99;
        const sb = STATUS_PRIORITY_313[ROW_STATUSES_313[b % ROW_STATUSES_313.length]] ?? 99;
        return sa !== sb ? sa - sb : a - b;
      });
      const sortedIndices = [...cancelled313.map(o => o.rowIdx), ...baseSorted313];
      for (const origIdx of sortedIndices) {
        const s = cancelledIdxSet313.has(origIdx) ? '마감필요' : ROW_STATUSES_313[origIdx % ROW_STATUSES_313.length];
        const cell = (cells[SRC[s] ?? (origIdx % cells.length)].cloneNode(true)) as HTMLElement;
        cell.dataset.tableRow = String(origIdx);
        if (isOrderIdCol) {
          const p = cell.querySelector('p');
          if (p) {
            // 협력사 탭: 오더ID를 다른 시리즈로 표시 (KMP 접두사)
            const baseId = ORDER_IDS[origIdx];
            p.textContent = isPartnerTab ? baseId.replace(/^[A-Z]+/, 'KMP') : baseId;
            p.style.cursor = 'pointer';
            p.style.textDecoration = 'underline';
            const _idx = origIdx;
            p.addEventListener('click', () => {
              window.dispatchEvent(new CustomEvent('openOrderDetail', { detail: { orderId: ORDER_IDS[_idx], rowIdx: _idx } }));
            });
          }
        }
        if (isShipperCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = SHIPPER_ROW_DATA_313[origIdx % SHIPPER_ROW_DATA_313.length];
        }
        if (isPartnerCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = PARTNER_ROW_DATA_313[origIdx % PARTNER_ROW_DATA_313.length];
        }
        if (isGroupCol) {
          const p = cell.querySelector('p') || cell;
          if (isPartnerTab) {
            p.textContent = PARTNER_ROW_DATA_313[origIdx % PARTNER_ROW_DATA_313.length] + ' 그룹';
          } else {
            const shipper = SHIPPER_ROW_DATA_313[origIdx % SHIPPER_ROW_DATA_313.length];
            p.textContent = getGroupForIndex(origIdx, shipper);
          }
        }
        if (isLoadingDateCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = getLoadingDate313(origIdx);
        }
        if (isInvoiceDateCol) {
          cell.style.cursor = 'pointer';
          cell.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('openManualInvoiceDetail'));
          });
        }
        parent.appendChild(cell);
      }
    });
    // Annotate checkboxes with row index
    Array.from(tableRef.current.querySelectorAll<HTMLElement>('[data-table-row]')).forEach((cell) => {
      const row = Number(cell.dataset.tableRow);
      const cb = cell.querySelector<HTMLElement>('[data-name="Selection Controls"]');
      if (cb) { cb.dataset.cbRow = String(row); cb.style.cursor = 'pointer'; }
    });
    // Annotate header checkboxes
    Array.from(tableRef.current.querySelectorAll<HTMLElement>('[data-name="Table_Header Cells"]')).forEach((header) => {
      const cb = header.querySelector<HTMLElement>('[data-name="Selection Controls"]');
      if (cb) { cb.dataset.cbRow = 'header'; cb.style.cursor = 'pointer'; }
    });
    // 협력사 탭: 헤더 텍스트 교체
    if (isPartnerTab) {
      tableRef.current.querySelectorAll<HTMLElement>('[data-name="Table_Header Cells"]').forEach(header => {
        const p = header.querySelector('p');
        if (!p) return;
        if (p.textContent?.trim() === '화주사') p.textContent = '협력사';
        if (p.textContent?.trim() === '화주사 업무그룹') p.textContent = '협력사 업무그룹';
      });
    }
    // Remove static Figma checkmarks to prevent double SVG on selection
    tableRef.current.querySelectorAll('[data-name="Selection Controls"] [data-name="Vector"]').forEach((el) => (el as HTMLElement).remove());

    // 협력사 탭: 기사명 컬럼 우측에 정산 유형 컬럼 추가
    if (isPartnerTab) {
      const SETTLEMENT_TYPES = ['후불', '선착불', '후불', '후불', '선착불', '후불', '선착불', '후불', '후불', '선착불'];
      const existingSettlementCol = tableRef.current.querySelector('[data-name="settlement-type-col"]');
      if (!existingSettlementCol) {
        // 기사명 컬럼 찾기
        let driverCol: Element | null = null;
        tableRef.current.querySelectorAll(':scope > *').forEach(col => {
          const h = col.querySelector('[data-name="Table_Header Cells"] p');
          if (h?.textContent?.trim() === '기사명') driverCol = col;
        });
        if (driverCol) {
          // 기사명 컬럼 복제해서 정산 유형 컬럼 생성
          const newCol = (driverCol as HTMLElement).cloneNode(true) as HTMLElement;
          newCol.setAttribute('data-name', 'settlement-type-col');
          // 헤더 교체
          const headerP = newCol.querySelector('[data-name="Table_Header Cells"] p');
          if (headerP) headerP.textContent = '정산 유형';
          // 데이터 셀 교체
          newCol.querySelectorAll<HTMLElement>('[data-table-row]').forEach(cell => {
            const rowIdx = Number(cell.dataset.tableRow);
            const p = cell.querySelector('p') || cell;
            p.textContent = SETTLEMENT_TYPES[rowIdx % SETTLEMENT_TYPES.length];
            cell.style.fontFamily = "'Pretendard GOV'";
            cell.style.fontWeight = '400';
          });
          (driverCol as HTMLElement).insertAdjacentElement('afterend', newCol);
        }
      }
    } else {
      // 화주사/기사 탭: 정산 유형 컬럼 제거
      tableRef.current.querySelector('[data-name="settlement-type-col"]')?.remove();
    }

    // 기사 탭: 화주사 업무그룹 우측에 요청협력사·요청협력사 업무그룹, 맨 끝에 화주사주문번호 추가
    if (isDriverTab) {
      const addColAfter = (afterName: string, colDataName: string, header: string, getValue: (rowIdx: number) => string) => {
        if (tableRef.current!.querySelector(`[data-name="${colDataName}"]`)) return;
        let targetCol: Element | null = null;
        tableRef.current!.querySelectorAll(':scope > *').forEach(col => {
          const h = col.querySelector('[data-name="Table_Header Cells"] p');
          if (h?.textContent?.trim() === afterName) targetCol = col;
        });
        if (!targetCol) return;
        const newCol = (targetCol as HTMLElement).cloneNode(true) as HTMLElement;
        newCol.setAttribute('data-name', colDataName);
        const headerP = newCol.querySelector('[data-name="Table_Header Cells"] p');
        if (headerP) headerP.textContent = header;
        newCol.querySelectorAll<HTMLElement>('[data-table-row]').forEach(cell => {
          const p = cell.querySelector('p') || cell;
          p.textContent = getValue(Number(cell.dataset.tableRow));
          cell.style.fontFamily = "'Pretendard GOV'";
          cell.style.fontWeight = '400';
        });
        (targetCol as HTMLElement).insertAdjacentElement('afterend', newCol);
      };

      const appendColAtEnd = (colDataName: string, header: string, getValue: (rowIdx: number) => string) => {
        if (tableRef.current!.querySelector(`[data-name="${colDataName}"]`)) return;
        const cols = Array.from(tableRef.current!.querySelectorAll(':scope > *'));
        const lastCol = cols[cols.length - 1] as HTMLElement;
        if (!lastCol) return;
        const newCol = lastCol.cloneNode(true) as HTMLElement;
        newCol.setAttribute('data-name', colDataName);
        const headerP = newCol.querySelector('[data-name="Table_Header Cells"] p');
        if (headerP) headerP.textContent = header;
        newCol.querySelectorAll<HTMLElement>('[data-table-row]').forEach(cell => {
          const p = cell.querySelector('p') || cell;
          p.textContent = getValue(Number(cell.dataset.tableRow));
          cell.style.fontFamily = "'Pretendard GOV'";
          cell.style.fontWeight = '400';
        });
        tableRef.current!.appendChild(newCol);
      };

      addColAfter('화주사 업무그룹', 'driver-partner-col',
        '요청협력사',
        (i) => REQUEST_PARTNER_ROW_DATA_313[i % REQUEST_PARTNER_ROW_DATA_313.length]
      );
      addColAfter('요청협력사', 'driver-partner-group-col',
        '요청협력사 업무그룹',
        (i) => REQUEST_PARTNER_ROW_DATA_313[i % REQUEST_PARTNER_ROW_DATA_313.length] + ' 그룹'
      );
      appendColAtEnd('driver-order-no-col',
        '화주사주문번호',
        (i) => `ORD-${String(10000 + (i * 7 + 3) % 90000).padStart(5, '0')}`
      );
    } else {
      ['driver-partner-col', 'driver-partner-group-col', 'driver-order-no-col'].forEach(name => {
        tableRef.current!.querySelector(`[data-name="${name}"]`)?.remove();
      });
    }
  }, [cancelledTopRows313, isPartnerTab, isDriverTab]);
  useEffect(() => {
    if (!tableRef.current) return;
    const CHECKMARK = `<svg viewBox="0 0 10 8" fill="none" style="position:absolute;inset:0;width:100%;height:100%;padding:1px"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const PAGE_SIZE = 200;
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, TOTAL_ROWS);
    const allPageSelected = pageEnd > pageStart && Array.from({ length: pageEnd - pageStart }, (_, i) => pageStart + i).every((r) => selectedRows.has(r));
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
  }, [selectedRows, currentPage]);

  useEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const handleClick = (e: Event) => {
      const cb = (e.target as HTMLElement).closest<HTMLElement>('[data-cb-row]');
      if (!cb) return;
      if (cb.dataset.cbRow === 'header') {
        const PAGE_SIZE = 200;
        const start = (currentPageRef.current - 1) * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, TOTAL_ROWS);
        const pageRows = Array.from({ length: end - start }, (_, i) => start + i);
        setSelectedRows((prev) => {
          const allSelected = pageRows.every((r) => prev.has(r));
          const next = new Set(prev);
          pageRows.forEach((r) => (allSelected ? next.delete(r) : next.add(r)));
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


  const PAGE_SIZE = 200;

  useEffect(() => {
    const total = TOTAL_ROWS - hiddenRows.size;
    setFilteredTotal(total);
    setCurrentPage(1);
  }, [hiddenRows]);

  useEffect(() => {
    if (!tableRef.current) return;
    const cancelledIdxSetPage313 = new Set(getCancelledOrders().map(o => o.rowIdx));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    tableRef.current.querySelectorAll<HTMLElement>('[data-table-row]').forEach((cell) => {
      const row = Number(cell.dataset.tableRow);
      const isCancelled = cancelledIdxSetPage313.has(row);
      cell.style.display = (isCancelled ? currentPage === 1 : (!hiddenRows.has(row) && row >= start && row < end)) ? '' : 'none';
    });
  }, [hiddenRows, currentPage, cancelledTopRows313]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [currentPage]);

  return (
    <>
    <DateFilterCtx313.Provider value={{ rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd }}>
    <DynamicCountCtx313.Provider value={dynamicCounts}>
    <BubbleCtx313.Provider value={{ shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected }}>
    <ModalCtx313.Provider value={{ openModal: (indices) => openModal(indices.length > 0 ? indices : Array.from(selectedRows)), selectedRows }}>
    {showToast && <InvoiceToast onClose={() => setShowToast(false)} />}
    {showErrorToast && <InvoiceErrorToast onClose={() => setShowErrorToast(false)} />}
    {modalOpen && <CreateInvoiceModal preSelectedIndices={preSelectedIndices} onClose={() => setModalOpen(false)} onSuccess={() => setShowToast(true)} />}
    <FilterCtx313.Provider value={{ selected, setSelected }}>
    <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="content-stretch flex flex-col items-start pt-[4px] px-[32px] relative size-full">
        <Frame3 />
        <FilterSorterModule />
        <Frame646 />
        <TableControlModule />
        <div className="content-stretch flex h-[840px] items-start relative shrink-0 overflow-auto w-[1648px] pb-[40px]" data-name="매출장부표_화주사" ref={tableRef}>
          <Frame603 />
          <Frame628 />
          <Frame604 />
          <Frame606 />
          <Frame607 />
          <Frame605 />
          <Frame619 />
          <TableColumns />
          <TableColumns1 />
          <Frame608 />
          <Frame609 />
          <Frame610 />
          <Frame611 />
          <Frame612 />
          <Frame629 />
          <Frame613 />
          <Frame626 />
          <Frame627 />
          <Frame614 />
          <Frame615 />
          <Frame616 />
          <Frame617 />
          <Frame618 />
          <Frame625 />
          <Frame620 />
          <Frame622 />
          <Frame623 />
          <Frame630 />
          <Frame624 />
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx313.Provider>
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
  const [filteredTotal, setFilteredTotal] = useState(5000);
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