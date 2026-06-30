import { todayYYMMDD } from '../../utils/date';
import React, { useState, createContext, useContext, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { OrderDetailModal } from "../312통합장부/index";
import svgPaths from "./svg-sqafnpr8oo";
import ORDER_IDS from "../shared/orderIds";
import { MaeIpSubTabCtx, type MaeIpSubTab } from "../shared/subTabCtx";
import SharedLnb from "../shared/SharedLnb";
import { getCancelledOrders, subscribeCancelledOrders, CancelledOrderEntry } from "../shared/cancelledOrdersStore";

const ROW_STATUSES_314 = ["마감필요","정산대기","정산대기","정산대기","지급대기","지급대기","지급대기","지급대기","지급완료","정산보류"];
const STATUS_PRIORITY_314_SORT: Record<string, number> = { '마감필요': 0, '정산대기': 1, '지급대기': 2, '지급완료': 3, '정산보류': 4, '정산제외': 5 };

const LOADING_DATES_314 = [
  '26.01.05','26.01.08','26.01.12','26.01.15','26.01.19','26.01.22','26.01.26','26.01.29',
  '26.02.02','26.02.05','26.02.09','26.02.12','26.02.16','26.02.19','26.02.23','26.02.26',
  '26.03.02','26.03.05','26.03.09','26.03.12','26.03.16','26.03.19','26.03.23','26.03.26','26.03.30',
  '26.04.02','26.04.06','26.04.09','26.04.13','26.04.16','26.04.20','26.04.23','26.04.27','26.04.30',
  '26.05.04','26.05.07','26.05.11','26.05.14','26.05.18','26.05.21','26.05.25','26.05.28',
  '26.06.01','26.06.04','26.06.08','26.06.11','26.06.15','26.06.18','26.06.22','26.06.25',todayYYMMDD(),
];
const getLoadingDateIdx314 = (i: number) => { let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11; return ((h >>> 0) % LOADING_DATES_314.length + LOADING_DATES_314.length) % LOADING_DATES_314.length; };
const getLoadingDate314 = (i: number) => LOADING_DATES_314[getLoadingDateIdx314(i)];

// ── 화주사 bubble filter ──────────────────────────────────────────────────────
const BUBBLE_SHIPPERS_314 = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];
const SHIPPER_ROW_DATA_314 = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];

// ── 요청협력사 bubble filter ──────────────────────────────────────────────────
const PARTNERS_314 = [
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
const PARTNER_ROW_DATA_314 = PARTNERS_314;

interface DateFilterCtxType314 { rangeStart: Date|null; rangeEnd: Date|null; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; }
const DateFilterCtx314 = createContext<DateFilterCtxType314>({ rangeStart: null, rangeEnd: null, setRangeStart: () => {}, setRangeEnd: () => {} });

interface BubbleCtxType314 { shipperSelected: Set<number>; setShipperSelected: (s: Set<number>) => void; partnerSelected: Set<number>; setPartnerSelected: (s: Set<number>) => void; }
const BubbleCtx314 = createContext<BubbleCtxType314>({ shipperSelected: new Set(), setShipperSelected: () => {}, partnerSelected: new Set(), setPartnerSelected: () => {} });

const DynamicCountCtx314 = createContext<{ saleCounts: number[]; saleTotalAmount: number }>({ saleCounts: [], saleTotalAmount: 0 });

// Per-row amounts derived from ITEMS_314_RAW counts
const PER_ROW_SALE_AMOUNT_314: Record<string, number> = {
  '마감필요': 0,
  '정산대기': Math.round(198_400_000 / 1500),
  '지급대기': Math.round(423_600_000 / 2000),
  '지급완료': Math.round(876_200_000 / 500),
  '정산보류': Math.round(54_800_000 / 500),
};

const PageCtx314 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 5000, setFilteredTotal: () => {} });
const FilterCtx314 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

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
  const { selected, setSelected } = useContext(FilterCtx314);
  const { saleCounts, saleTotalAmount } = useContext(DynamicCountCtx314);
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
    const perRow = PER_ROW_SALE_AMOUNT_314[rawLabel] ?? 0;
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

function Frame680() {
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

function Frame682() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">매입장부</p>
      <Frame680 />
    </div>
  );
}

function Frame720() {
  const { activeTab, setActiveTab } = useContext(MaeIpSubTabCtx);
  const tabs: MaeIpSubTab[] = ["정보망배차", "정보망배차(바로선지급)", "정보망배차(픽커)", "소속기사배차", "협력사위탁"];
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
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame720 />
    </div>
  );
}

const PERIOD_OPTIONS_314 = ['상차일', '하차일', '매출 명세서 기준일', '매입 명세서 기준일'] as const;

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
          {PERIOD_OPTIONS_314.map(opt => (
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

const PERIOD_RANGE_OPTIONS_314 = ['1개월 전', '2개월 전', '3개월 전', '이번달', '저번달', '1분기', '2분기', '3분기', '4분기', '올해', '1년', '직접입력'] as const;
const PERIOD_RANGE_OPTIONS_PAY_314 = ['2일 전후', '이번달', '저번달', '1분기', '2분기', '3분기', '4분기', '올해', '1년', '직접입력'] as const;

function TypeStatusDisabled1({ onSelect }: { onSelect?: (opt: string) => void }) {
  const { activeTab } = useContext(MaeIpSubTabCtx);
  const isPayTab = activeTab === '정보망배차(바로선지급)' || activeTab === '정보망배차(픽커)';
  const options = isPayTab ? PERIOD_RANGE_OPTIONS_PAY_314 : PERIOD_RANGE_OPTIONS_314;
  const defaultVal = isPayTab ? '2일 전후' : '2개월 전';
  const [selected, setSelected] = useState<string>(defaultVal);

  useEffect(() => {
    const val = isPayTab ? '2일 전후' : '2개월 전';
    setSelected(val);
    onSelect?.(val);
  }, [isPayTab]);
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
        <div ref={dropRef} style={{ position:'fixed', top: rect.bottom + 2, left: rect.left, width:176, background:'#FFFFFF', border:'1px solid #E4E5E9', borderRadius:8, boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex:99999, boxSizing:'border-box' }}>
          <div style={{ padding:8, overflowY:'auto', maxHeight:216, scrollbarWidth:'thin', scrollbarColor:'#767D8A #FFFFFF', display:'flex', flexDirection:'column' }}>
            {options.map(opt => (
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
          <p className="leading-[20px]">25.02.18 ~ 25.02.22</p>
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

  const { rangeStart, rangeEnd, setRangeStart, setRangeEnd } = useContext(DateFilterCtx314);

  const applyPeriod = (opt: string) => {
    const t = new Date(2026, 5, 29);
    switch (opt) {
      case '2일 전후': { const s = clr(t); s.setDate(s.getDate() - 2); const e = clr(t); e.setDate(e.getDate() + 2); setRangeStart(s); setRangeEnd(e); break; }
      case '1개월 전': { const s = clr(t); s.setMonth(s.getMonth() - 1); setRangeStart(s); setRangeEnd(clr(t)); break; }
      case '2개월 전': { const s = clr(t); s.setMonth(s.getMonth() - 2); setRangeStart(s); setRangeEnd(clr(t)); break; }
      case '3개월 전': { const s = clr(t); s.setMonth(s.getMonth() - 3); setRangeStart(s); setRangeEnd(clr(t)); break; }
      case '이번달': setRangeStart(new Date(t.getFullYear(), t.getMonth(), 1)); setRangeEnd(clr(t)); break;
      case '저번달': { const s = new Date(t.getFullYear(), t.getMonth() - 1, 1); const e = new Date(t.getFullYear(), t.getMonth(), 0); setRangeStart(s); setRangeEnd(e); break; }
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
    <div className="content-stretch flex gap-[3px] items-center relative shrink-0 z-[6]" data-name="calender">
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

function BubbleFilter314() {
  const { shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected } = useContext(BubbleCtx314);
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
      <div ref={btnRef} style={{ position: 'relative' }}>
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
            <div style={{ height: (shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS_314.filter(s => s.includes(shipperSearch)).length === 0)) ? 162 : undefined, maxHeight: (shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS_314.filter(s => s.includes(shipperSearch)).length === 0)) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {shipperSelected.size === 0 && (!shipperSearch || BUBBLE_SHIPPERS_314.filter(s => s.includes(shipperSearch)).length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : BUBBLE_SHIPPERS_314.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (shipperSearch && name.includes(shipperSearch)) || shipperSelected.has(origIdx)).map(({name, origIdx}) => (
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

      {/* 요청협력사 bubble filter */}
      <div ref={partnerBtnRef} style={{ position: 'relative' }}>
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
                  placeholder="요청협력사 검색"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#767D8A', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                />
              </div>
            </div>
            <div style={{ height: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_314.filter(s => s.includes(partnerSearch)).length === 0)) ? 162 : undefined, maxHeight: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_314.filter(s => s.includes(partnerSearch)).length === 0)) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {partnerSelected.size === 0 && (!partnerSearch || PARTNERS_314.filter(s => s.includes(partnerSearch)).length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : PARTNERS_314.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (partnerSearch && name.includes(partnerSearch)) || partnerSelected.has(origIdx)).map(({name, origIdx}) => (
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
    <div className="content-center flex flex-wrap gap-[4px] isolate items-center relative shrink-0" data-name="필터 그룹">
      <Calender />
      <BubbleFilter314 />
    </div>
  );
}

function Frame219() {
  return (
    <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
        <p className="leading-[18px]">1</p>
      </div>
    </div>
  );
}

const INFO_TYPE_OPTIONS_314 = [
  '전국24시콜화물','원콜','화물맨(가맹망)','인성','한국로지스풀','케이엘','한진','미래티엘에스',
  '한국통운','세방','CJ대한통운','한트럭','한익스프레스','티피엠로지스','이맥스물류','판토스',
  '농협물류','롯데글로벌로지스','항만물류주식회사','한솔로지스틱스','오케이종합특송','주식회사룰랩',
  '로지스퀘어','세아엘앤에스','동방','(주)메가로지스틱스','(주)노루로지넷','(주)하나로티앤에스','(주)LG유플러스',
];

function Frame734() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hovered, setHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number|null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);

  const bg = open ? '#eef3ff' : selected.size > 0 ? '#f5f9ff' : '#f6f7f8';
  const border = open ? '1px solid transparent' : selected.size > 0 ? '1px solid transparent' : hovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const textColor = (open || selected.size > 0) ? '#005fff' : '#2e3238';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={btnRef} style={{ position: 'relative' }}>
      <div
        className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
        style={{ background: bg, border }}
        onClick={() => {
          if (!open) {
            const r = btnRef.current!.getBoundingClientRect();
            setDropPos({ top: r.bottom + 2, left: r.left });
          }
          setOpen(o => !o);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: textColor }}>
          <p className="leading-[20px]">정보망유형</p>
        </div>
        {selected.size > 0 && !open ? (
          <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
              <p className="leading-[18px]">{selected.size}</p>
            </div>
          </div>
        ) : (
          <div style={{ transform: open ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]">
            <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
              <div className="-scale-y-100 flex-none">
                <div className="h-[3px] relative w-[7px]">
                  <div className="absolute inset-[-21.67%_-9.29%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                      <path d={svgPaths.p2f848880} stroke={open ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {open && dropPos && createPortal(
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: 200, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 8, zIndex: 9999, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: 8, boxSizing: 'border-box' }}>
          {INFO_TYPE_OPTIONS_314.map((name, idx) => (
            <div key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => { const next = new Set(selected); if (next.has(idx)) next.delete(idx); else next.add(idx); setSelected(next); }}
              style={{ display: 'flex', alignItems: 'center', padding: '7px 8px 7px 4px', gap: 8, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box', background: hoveredIdx === idx ? '#F6F7F8' : '#FFFFFF' }}
            >
              <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, border: selected.has(idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: selected.has(idx) ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  {selected.has(idx) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
              <span style={{ fontSize: 14, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '20px' }}>{name}</span>
            </div>
          ))}
          </div>
          <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
            <span onClick={e => { e.stopPropagation(); setSelected(new Set()); }} style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}>필터 초기화</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Filter() {
  const { activeTab } = useContext(MaeIpSubTabCtx);
  const isPayTab = activeTab === '정보망배차(바로선지급)' || activeTab === '정보망배차(픽커)';
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Filter">
      <Component9 />
      {!isPayTab && <Frame734 />}
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

function Frame684() {
  const { setShipperSelected, setPartnerSelected } = useContext(BubbleCtx314);
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

function Frame718() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Filter />
      <Frame684 />
    </div>
  );
}

function FilterSorterModule() {
  return (
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="Filter_Sorter_Module">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame718 />
    </div>
  );
}

function Frame727() {
  const { saleCounts, saleTotalAmount } = useContext(DynamicCountCtx314);
  const totalCount = saleCounts.length > 0 ? saleCounts[0] : 5000;
  const totalAmount = saleCounts.length > 0 ? saleTotalAmount : ITEMS_314_TOTAL;
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체 ({totalCount.toLocaleString()}건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#005fff] text-[18px] tracking-[-0.36px]">{formatKorean(totalAmount)}</p>
    </div>
  );
}

function Frame726() {
  return (
    <div className="bg-[#f5f9ff] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#005fff] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame727 />
        </div>
      </div>
    </div>
  );
}

function Frame728() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">마감필요 (500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">0원</p>
    </div>
  );
}

function Frame721() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame728 />
        </div>
      </div>
    </div>
  );
}

function Frame729() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">정산대기 (1,500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">235,304,300원</p>
    </div>
  );
}

function Frame722() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame729 />
        </div>
      </div>
    </div>
  );
}

function Frame730() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">지급대기 (2,000건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">1,504,204,303원</p>
    </div>
  );
}

function Frame723() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame730 />
        </div>
      </div>
    </div>
  );
}

function Frame731() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">지급완료 (500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">632,304,392,101원</p>
    </div>
  );
}

function Frame724() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame731 />
        </div>
      </div>
    </div>
  );
}

function Frame732() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">정산보류 (500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">4,392,101원</p>
    </div>
  );
}

function Frame725() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame732 />
        </div>
      </div>
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

const ITEMS_314_RAW = [
  { label: "마감필요 (500건)",   amountRaw: 0 },
  { label: "정산대기 (1,500건)", amountRaw: 198_400_000 },
  { label: "지급대기 (2,000건)", amountRaw: 423_600_000 },
  { label: "지급완료 (500건)",   amountRaw: 876_200_000 },
  { label: "정산보류 (500건)",   amountRaw: 54_800_000 },
];
const ITEMS_314_TOTAL = ITEMS_314_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_314 = [
  { label: "전체 (5,000건)", amount: formatKorean(ITEMS_314_TOTAL) },
  ...ITEMS_314_RAW.map(x => ({ label: x.label, amount: formatKorean(x.amountRaw) })),
];

function Frame733() {
  return <StatusCardRowLarge items={ITEMS_314} />;
}

function MaeipInput({ placeholder, defaultValue, style }: { placeholder?: string; defaultValue?: string; style?: React.CSSProperties }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [value, setValue] = useState(defaultValue ?? '');
  const borderColor = focused ? '#005FFF' : hovered ? '#ADB1B9' : '#E4E5E9';
  return (
    <div
      style={{ flex:1, minWidth:0, height:36, position:'relative', ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position:'absolute', inset:0, border:`1px solid ${borderColor}`, borderRadius:4, pointerEvents:'none', transition:'border-color 0.15s', boxSizing:'border-box' }}/>
      <div style={{ display:'flex', alignItems:'center', height:'100%', padding:'6px 10px', gap:4, boxSizing:'border-box' }}>
        <input
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="placeholder:text-[#767d8a]"
          style={{
            flex:1, minWidth:0, height:'100%',
            border:'none', fontSize:15,
            color:'#2E3238',
            fontFamily:"'Pretendard GOV', sans-serif",
            letterSpacing:'-0.02em', outline:'none',
            background:'transparent',
          }}
        />
        {focused && value && (
          <button onMouseDown={e => e.preventDefault()} onClick={() => setValue('')} style={{ padding:0, background:'none', border:'none', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="7" fill="#9197A1"/>
              <path d="M9.46 4.54C9.206 4.286 8.794 4.286 8.54 4.54L7 6.08L5.46 4.54C5.206 4.286 4.794 4.286 4.54 4.54C4.286 4.794 4.286 5.206 4.54 5.46L6.08 7L4.54 8.54C4.286 8.794 4.286 9.206 4.54 9.46C4.794 9.714 5.206 9.714 5.46 9.46L7 7.92L8.54 9.46C8.794 9.714 9.206 9.714 9.46 9.46C9.714 9.206 9.714 8.794 9.46 8.54L7.92 7L9.46 5.46C9.714 5.206 9.714 4.794 9.46 4.54Z" fill="white"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

const ROW_CHARGE_AMOUNTS_314 = [120000, 180000, 95000, 240000, 150000, 210000, 85000, 320000, 175000, 130000];
const getRowChargeAmount314 = (i: number) => ROW_CHARGE_AMOUNTS_314[i % ROW_CHARGE_AMOUNTS_314.length];
const getRowTaxAmount314 = (i: number) => Math.round(getRowChargeAmount314(i) * 0.1);

function CalendarDropdown314({ anchorRect, value, onChange, onClose }: {
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

function MaeipManualInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { selectedRows } = useContext(TableCtrlCtx);
  const selectedIndices = [...selectedRows];
  const orderCount = selectedIndices.length;
  const chargeTotal = selectedIndices.reduce((sum, i) => sum + getRowChargeAmount314(i), 0);
  const taxTotal = selectedIndices.reduce((sum, i) => sum + getRowTaxAmount314(i), 0);
  const grandTotal = chargeTotal + taxTotal;
  const fmt314 = (n: number) => n.toLocaleString('ko-KR') + '원';
  const [taxType, setTaxType] = useState<'과세'|'면세'>('과세');
  const [dateValues, setDateValues] = useState({ 작성일: todayYYMMDD(), 확인일: '26.07.01', 지급기한: '26.08.13' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const F: React.CSSProperties = { fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em' };
  const inp = (ph?: string): React.CSSProperties => ({
    ...F, flex:1, minWidth:0, height:36,
    border:'1px solid #E4E5E9', borderRadius:4,
    padding:'6px 10px', fontSize:15,
    color: ph ? '#767D8A' : '#2E3238',
    boxSizing:'border-box', outline:'none',
  });
  const calIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
      <rect x="1" y="2.5" width="14" height="12.5" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="1" y1="6" x2="15" y2="6" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="5" y1="1" x2="5" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="1" x2="11" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
  return <>{createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999,
    }} onClick={onClose}>
      <div style={{
        width:881, background:'#FFFFFF', border:'1px solid #E4E5E9',
        boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)',
        borderRadius:12, display:'flex', flexDirection:'column', ...F,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'24px 24px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', lineHeight:'32px' }}>수기계산서 등록</span>
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
        <div style={{ display:'flex', flexDirection:'row', height:434 }}>

          {/* Left column */}
          <div style={{ width:480, minWidth:0, padding:'12px 24px 20px', display:'flex', flexDirection:'column', gap:12, boxSizing:'border-box', overflow:'hidden' }}>

            {/* 기사 정보 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'기사명', value:'김카모' },
                { label:'차량번호', value:'12아3456' },
                { label:'기사 전화번호', value:'010-0000-0000' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:12, height:36 }}>
                  <span style={{ width:110, fontSize:15, color:'#5C6370', lineHeight:'22px', flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ height:1, background:'#E4E5E9' }}/>

            {/* 공급자 정보 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:15, color:'#5C6370', lineHeight:'22px' }}>공급자 정보</span>
              <div style={{ display:'flex', gap:8 }}>
                <MaeipInput defaultValue="138-28-01123" />
                <MaeipInput placeholder="상호" />
                <MaeipInput placeholder="대표자" />
              </div>
              <MaeipInput placeholder="주소" style={{ flex:'none', width:'100%' }} />
              <div style={{ display:'flex', gap:8 }}>
                <MaeipInput placeholder="업태" />
                <MaeipInput placeholder="종목" />
              </div>
            </div>

            <div style={{ height:1, background:'#E4E5E9' }}/>

            {/* 계좌 정보 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:15, color:'#5C6370', lineHeight:'22px' }}>계좌 정보</span>
              <div style={{ display:'flex', gap:8 }}>
                <MaeipInput defaultValue="김카모" />
                <MaeipInput defaultValue="카카오뱅크" />
                <MaeipInput defaultValue="3333-01-8729118" />
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width:1, background:'#E4E5E9', alignSelf:'stretch' }}/>

          {/* Right column */}
          <div style={{ flex:1, minWidth:0, padding:'12px 24px 20px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>

            {/* 날짜 필드 */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {([
                { label:'계산서 작성일자', key:'작성일' },
                { label:'계산서 확인일자', key:'확인일' },
                { label:'지급기한', key:'지급기한' },
              ] as { label: string; key: keyof typeof dateValues }[]).map(({ label, key }) => (
                <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                  <span style={{ fontSize:15, color:'#5C6370', lineHeight:'22px', flexShrink:0 }}>{label}</span>
                  <div onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); if (openCal === key) { setOpenCal(null); } else { setOpenCal(key); setAnchorRect(rect); } }} style={{ display:'flex', alignItems:'center', gap:4, border: openCal === key ? '1px solid #005FFF' : '1px solid #E4E5E9', borderRadius:4, padding:'6px 10px', width:160, height:36, boxSizing:'border-box', cursor:'pointer' }}>
                    {calIcon}
                    <span style={{ fontSize:15, color:'#2E3238', lineHeight:'22px', flex:1 }}>{dateValues[key]}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0, transform: openCal === key ? 'rotate(180deg)' : undefined}}>
                      <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary box */}
            <div style={{ background:'#F6F7F8', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>선택된 오더 수</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>{orderCount}건</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>과세 유형</span>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  {(['과세','면세'] as const).map(v => (
                    <div key={v} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }} onClick={() => setTaxType(v)}>
                      <div style={{ width:20, height:20, borderRadius:'50%', boxSizing:'border-box', border: taxType===v ? '6px solid #005FFF' : '1.3px solid #ADB1B9', background:'#FFFFFF' }}/>
                      <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>배차금액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>{fmt314(chargeTotal)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>세액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>{fmt314(taxTotal)}</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:32 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>합계 금액</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', lineHeight:'32px' }}>{fmt314(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'#E4E5E9' }}/>
          <div style={{ padding:'20px 24px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={onClose} style={{ ...F, width:71, height:52, background:'#FFFFFF', border:'none', borderRadius:4, cursor:'pointer', fontSize:18, fontWeight:600, color:'#2E3238' }}>닫기</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width:102, height:52, background:'#005FFF', border:'none', borderRadius:4, cursor:'pointer', fontSize:18, fontWeight:600, color:'#FFFFFF' }}>등록하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}{openCal && anchorRect && <CalendarDropdown314 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => setDateValues(prev => ({...prev, [openCal]: v}))} onClose={() => setOpenCal(null)} />}</>;
}

function MaeipManualDetailModal({ onClose }: { onClose: () => void }) {
  const F: React.CSSProperties = { fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em' };
  const [dateValues, setDateValues] = useState({ 수금기한: '26.08.13', 작성일: todayYYMMDD(), 확인일: '26.07.01' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const calIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
      <rect x="1" y="2.5" width="14" height="12.5" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="1" y1="6" x2="15" y2="6" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="5" y1="1" x2="5" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="1" x2="11" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
  const row = (label: string, value: string, multiline?: boolean) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems: multiline ? 'flex-start' : 'center', gap:4, paddingTop: multiline ? 7 : 0, paddingBottom: multiline ? 7 : 0, minHeight:36 }}>
      <span style={{ fontSize:15, color:'#5C6370', lineHeight:'22px', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px', width:300 }}>{value}</span>
    </div>
  );
  return <>{createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={onClose}>
      <div style={{ width:881, background:'#FFFFFF', border:'1px solid #E4E5E9', boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius:12, display:'flex', flexDirection:'column', ...F }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'24px 24px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', lineHeight:'32px' }}>수기계산서 상세</span>
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
        <div style={{ display:'flex', flexDirection:'row', height:453 }}>

          {/* Left column */}
          <div style={{ width:480, padding:'20px 24px', display:'flex', flexDirection:'column', gap:8, boxSizing:'border-box' }}>
            {row('거래명세서ID', 'QWE5678')}
            {row('화주사', '$화주사명')}
            {row('화주사 업무그룹', '$화주사 업무그룹 1, 화주사 업무그룹 2, 화주사 업무그룹 3', true)}
            {row('사업자번호', '138-28-01123')}
            {row('정산기간', '26.05.07 ~ 26.05.12')}
          </div>

          {/* Vertical divider */}
          <div style={{ width:1, background:'#E4E5E9', alignSelf:'stretch' }}/>

          {/* Right column */}
          <div style={{ flex:1, minWidth:0, padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, boxSizing:'border-box' }}>

            {/* Date pickers */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {([
                { label:'수금기한', key:'수금기한' },
                { label:'계산서 작성일자', key:'작성일' },
                { label:'계산서 확인일자', key:'확인일' },
              ] as { label: string; key: keyof typeof dateValues }[]).map(({ label, key }) => (
                <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:36 }}>
                  <span style={{ fontSize:15, color:'#5C6370', lineHeight:'22px', flexShrink:0 }}>{label}</span>
                  <div onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); if (openCal === key) { setOpenCal(null); } else { setOpenCal(key); setAnchorRect(rect); } }} style={{ display:'flex', alignItems:'center', gap:4, border: openCal === key ? '1px solid #005FFF' : '1px solid #E4E5E9', borderRadius:4, padding:'6px 10px', width:160, height:36, boxSizing:'border-box', cursor:'pointer' }}>
                    {calIcon}
                    <span style={{ fontSize:15, color:'#2E3238', lineHeight:'22px', flex:1 }}>{dateValues[key]}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0, transform: openCal === key ? 'rotate(180deg)' : undefined}}>
                      <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary gray box */}
            <div style={{ background:'#F6F7F8', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>선택된 오더 수</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>2건</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>청구금액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>380,000원</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>조정금액 합계</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>10,000원</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>공급가액</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>390,000원</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>세액</span>
                <span style={{ fontSize:15, fontWeight:600, color:'#2E3238', lineHeight:'22px' }}>429,000원</span>
              </div>
              <div style={{ height:1, background:'#E4E5E9' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', height:32 }}>
                <span style={{ fontSize:15, fontWeight:600, color:'#5C6370', lineHeight:'22px' }}>합계 금액</span>
                <span style={{ fontSize:22, fontWeight:700, color:'#2E3238', lineHeight:'32px' }}>429,000원</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'#E4E5E9' }}/>
          <div style={{ padding:'20px 24px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button style={{ ...F, width:106, height:52, background:'#EBEDEF', border:'none', borderRadius:4, cursor:'pointer', fontSize:18, fontWeight:600, color:'#2E3238' }}>등록 취소</button>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ ...F, width:71, height:52, background:'#FFFFFF', border:'none', borderRadius:4, cursor:'pointer', fontSize:18, fontWeight:600, color:'#2E3238' }}>닫기</button>
              <button onClick={onClose} style={{ ...F, width:102, height:52, background:'#005FFF', border:'none', borderRadius:4, cursor:'pointer', fontSize:18, fontWeight:600, color:'#FFFFFF' }}>수정하기</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}{openCal && anchorRect && <CalendarDropdown314 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => setDateValues(prev => ({...prev, [openCal]: v}))} onClose={() => setOpenCal(null)} />}</>;
}

function Frame681() {
  const { activeTab } = useContext(MaeIpSubTabCtx);
  const isPayTab = activeTab === '정보망배차(바로선지급)' || activeTab === '정보망배차(픽커)';
  const { selectedCount, selectedRows } = useContext(TableCtrlCtx);
  const [manualOpen, setManualOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [statusErrorToast, setStatusErrorToast] = useState(false);
  useEffect(() => {
    const handler = () => setDetailOpen(true);
    window.addEventListener('openMaeipInvoiceDetail', handler);
    return () => window.removeEventListener('openMaeipInvoiceDetail', handler);
  }, []);
  useEffect(() => {
    if (!errorToast) return;
    const t = setTimeout(() => setErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [errorToast]);
  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(false), 4000);
    return () => clearTimeout(t);
  }, [successToast]);
  useEffect(() => {
    if (!statusErrorToast) return;
    const t = setTimeout(() => setStatusErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [statusErrorToast]);
  const handleManualOpen = () => {
    if (selectedCount === 0) { setErrorToast(true); return; }
    const indices = [...selectedRows];
    const hasNonJeongsan = indices.some(i => ROW_STATUSES_314[i % ROW_STATUSES_314.length] !== '정산대기');
    if (hasNonJeongsan) { setStatusErrorToast(true); return; }
    setManualOpen(true);
  };
  return (
    <>
      {manualOpen && <MaeipManualInvoiceModal onClose={() => setManualOpen(false)} onSuccess={() => setSuccessToast(true)} />}
      {detailOpen && <MaeipManualDetailModal onClose={() => setDetailOpen(false)} />}
      {errorToast && createPortal(<>
        <style>{TOAST_ANIMATION_314}</style>
        <div style={{ ...TOAST_STYLE_314, background:'#E13838' }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>1개 이상의 오더를 선택해 주세요.</span>
          <ToastCloseBtn314 onClose={() => setErrorToast(false)} />
        </div>
      </>, document.body)}
      {successToast && createPortal(<>
        <style>{TOAST_ANIMATION_314}</style>
        <div style={{ ...TOAST_STYLE_314, background:'#222222' }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>수기계산서가 등록되었습니다.</span>
          <ToastCloseBtn314 onClose={() => setSuccessToast(false)} />
        </div>
      </>, document.body)}
      {statusErrorToast && createPortal(<>
        <style>{TOAST_ANIMATION_314}</style>
        <div style={{ ...TOAST_STYLE_314, background:'#E13838' }}>
          <span style={{ color:'#fff', fontSize:15, fontWeight:400, letterSpacing:'-0.3px', lineHeight:'22px', flex:1 }}>정산대기 상태의 오더를 선택해 주세요.</span>
          <ToastCloseBtn314 onClose={() => setStatusErrorToast(false)} />
        </div>
      </>, document.body)}
    <div className="content-stretch flex gap-[4px] h-[36px] items-center relative shrink-0">
      {isPayTab ? (
        /* 정보망배차(바로선지급) / 정보망배차(픽커) 탭: 지급 승인 + 정산 보류 */
        <>
          <div className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button" style={{ cursor:'pointer' }}>
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">지급 승인</p>
            </div>
          </div>
          <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px]">정산 보류</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </div>
        </>
      ) : (
        /* 정보망배차 탭: 기존 버튼 */
        <>
          <div className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleManualOpen} style={{ cursor:'pointer' }}>
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px]">수기계산서 등록</p>
            </div>
          </div>
          <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px]">지급 완료</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </div>
          <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
            <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
                <p className="leading-[22px]">정산 보류</p>
              </div>
            </div>
            <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
          </div>
        </>
      )}
    </div>
    </>
  );
}

function TypeStatusDisabled2() {
  return (
    <div className="bg-white h-[36px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">차량번호</p>
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

function TypeStatusDisabled3() {
  return (
    <div className="bg-white h-[36px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] h-[26px] justify-center leading-[0] min-w-px not-italic relative text-[#767d8a] text-[15px] tracking-[-0.3px]">
            <p className="leading-[22px]">검색어를 입력하세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Component11() {
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

function Component10() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="텍스트검색">
      <Component11 />
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

function Frame683() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <Frame681 />
      <div className="bg-[#d5d8dd] h-[24px] relative shrink-0 w-px" />
      <Component10 />
      <Frame717 />
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

const TOAST_ANIMATION_314 = `
  @keyframes toast-slide-in-314 {
    from { transform: translateX(calc(100% + 34px)); opacity: 0; }
    to   { transform: translateX(0);                 opacity: 1; }
  }
`;
const TOAST_STYLE_314: React.CSSProperties = {
  position: 'fixed', bottom: 34, right: 34, width: 400, height: 54,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 20px', zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  animation: 'toast-slide-in-314 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
};
function ToastCloseBtn314({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

const TableCtrlCtx = createContext<{ filteredTotal: number; selectedCount: number; selectedRows: Set<number> }>({ filteredTotal: 5000, selectedCount: 0, selectedRows: new Set() });

function Frame717() {
  const { filteredTotal, selectedCount } = useContext(TableCtrlCtx);
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px]">{selectedCount > 0 ? `총 ${filteredTotal.toLocaleString()}건 중 ${selectedCount.toLocaleString()}건 선택` : `총 ${filteredTotal.toLocaleString()}건`}</p>
      </div>
    </div>
  );
}

function TableControlModule() {
  return (
    <div className="content-stretch flex items-center justify-between py-[10px] relative shrink-0 w-full" data-name="Table_Control_Module">
      <Frame683 />
      <Group3 />
    </div>
  );
}

function Frame685() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">매입 상태</p>
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

function Frame686() {
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
              <div className="bg-[#e4fbeb] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#18ac42] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">지급대기</p>
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
                  <p className="leading-[19px]">지급대기</p>
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
                  <p className="leading-[19px]">지급완료</p>
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
              <div className="bg-[#e6efff] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#005fff] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">지급완료</p>
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
                  <p className="leading-[19px]">지급완료</p>
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

function Frame716() {
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

function Frame712() {
  return (
    <div className="relative shrink-0 w-[120px]">
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

function Frame713() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청협력사</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카모로지스틱스</p>
      </div>
    </div>
  );
}

function Frame714() {
  return (
    <div className="relative shrink-0 w-[140px]">
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">요청협력사 업무그룹</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame99() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame102() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame110() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">판교본사</p>
      </div>
    </div>
  );
}

function Frame715() {
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

function Frame688() {
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

function Frame689() {
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

function Frame690() {
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

function Frame691() {
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

function Frame692() {
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
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">330,000</p>
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

function Frame708() {
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

function Frame693() {
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

function Frame705() {
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

function Frame706() {
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

function Frame694() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">배차방법</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame369() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame370() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame371() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame372() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame373() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화물맨</p>
      </div>
    </div>
  );
}

function Frame374() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">원콜</p>
      </div>
    </div>
  );
}

function Frame375() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame376() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame377() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame378() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame379() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame380() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame381() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame382() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame383() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame384() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame385() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame386() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame387() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">카카오T트럭커</p>
      </div>
    </div>
  );
}

function Frame710() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">차량번호</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame390() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame391() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame392() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame393() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame394() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame395() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame396() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame397() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame398() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame399() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame400() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame401() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame402() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame403() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame404() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame405() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame406() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame407() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame408() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame695() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사명</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame411() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame412() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame413() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame414() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame415() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame416() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame417() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame418() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame419() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame420() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame421() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame422() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame423() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame424() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame425() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame426() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame427() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame428() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame429() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame696() {
  return (
    <div className="relative shrink-0 w-[100px]">
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사 전화번호</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame432() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame433() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame434() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame435() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame436() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame437() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame438() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame439() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame440() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame441() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame442() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame443() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame444() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame445() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame446() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame447() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame448() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame449() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame450() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">010-1234-5678</p>
      </div>
    </div>
  );
}

function Frame697() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">배차금액</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame453() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame454() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame455() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame456() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame457() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame458() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame459() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame460() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame461() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame462() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame463() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame464() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame465() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame466() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame467() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame468() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame469() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame470() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame471() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame698() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">세액</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame474() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame475() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame476() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame477() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame478() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame479() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame480() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame481() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame482() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame483() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame484() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame485() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame486() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame487() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame488() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame489() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame490() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame491() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame492() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame699() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">합계 금액</p>
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
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame495() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame496() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame497() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame498() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame499() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame500() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame501() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame502() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame503() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame504() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame505() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame506() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame507() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame508() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame509() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame510() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame511() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame512() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame513() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame704() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사 산재보험료</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame516() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame517() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame518() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame519() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame520() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame521() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame522() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame523() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame524() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame525() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame526() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame527() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame528() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame529() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame530() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame531() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame532() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame533() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame534() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame700() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">합계 금액 (산재 포함)</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame537() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame538() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame539() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame540() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame541() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame542() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame543() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame544() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame545() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame546() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame547() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame548() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame549() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame550() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame551() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame552() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame553() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame554() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame555() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame707() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 작성일자</p>
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

function Frame709() {
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
              <div className="bg-white h-[26px] relative rounded-[2px] shrink-0" data-name="Button">
                <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[8px] relative rounded-[inherit] size-full">
                  <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] tracking-[-0.28px] whitespace-nowrap">
                    <p className="leading-[20px]">계산서 등록</p>
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
              <div className="bg-white h-[26px] relative rounded-[2px] shrink-0" data-name="Button">
                <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[8px] relative rounded-[inherit] size-full">
                  <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] tracking-[-0.28px] whitespace-nowrap">
                    <p className="leading-[20px]">계산서 등록</p>
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
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 확인일자</p>
      </div>
    </div>
  );
}

function Frame575() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title35 />
    </div>
  );
}

function Frame576() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame577() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame578() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame579() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame580() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame581() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame582() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame583() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame584() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame585() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame586() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame587() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame588() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame589() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame590() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame591() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame592() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame593() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame594() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame595() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame701() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame575 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame576 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame577 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame578 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame579 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame580 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame581 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame582 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame583 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame584 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame585 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame586 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame587 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame588 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame589 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame590 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame591 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame592 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame593 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame594 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame595 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title36() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">지급기한</p>
      </div>
    </div>
  );
}

function Frame596() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title36 />
    </div>
  );
}

function Frame597() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame598() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame599() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame600() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame601() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame602() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame603() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame604() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame605() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame606() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame607() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame608() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame609() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame610() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame611() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame612() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame613() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame614() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame615() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame616() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame702() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame596 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame597 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame598 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame599 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame600 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame601 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame602 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame603 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame604 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame605 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame606 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame607 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame608 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame609 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame610 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame611 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame612 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame613 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame614 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame615 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame616 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title37() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">지급일</p>
      </div>
    </div>
  );
}

function Frame617() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title37 />
    </div>
  );
}

function Frame618() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame619() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame620() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame621() {
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
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame623() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame624() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame625() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame626() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame627() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame628() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame629() {
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
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame631() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame632() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame633() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame634() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame635() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame636() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame637() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame711() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame617 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame618 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame619 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame620 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame621 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame622 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame623 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame624 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame625 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame626 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame627 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame628 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame629 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame630 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame631 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame632 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame633 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame634 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame635 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame636 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame637 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title38() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">증빙서류</p>
      </div>
    </div>
  );
}

function Frame638() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title38 />
    </div>
  );
}

function Frame639() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame640() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame641() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame642() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame643() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame644() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame645() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame646() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame647() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame648() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame649() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame650() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame651() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame652() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame653() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame654() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame655() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame656() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame657() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame658() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1장</p>
      </div>
    </div>
  );
}

function Frame703() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame638 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame639 />
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
              <Frame640 />
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
              <Frame641 />
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
              <Frame642 />
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
              <Frame643 />
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
              <Frame644 />
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
              <Frame645 />
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
              <Frame646 />
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
              <Frame647 />
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
              <Frame648 />
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
              <Frame649 />
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
              <Frame650 />
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
              <Frame651 />
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
              <Frame652 />
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
              <Frame653 />
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
              <Frame654 />
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
              <Frame655 />
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
              <Frame656 />
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
              <Frame657 />
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
              <Frame658 />
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

function Title39() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사 주문번호</p>
      </div>
    </div>
  );
}

function Frame659() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <Title39 />
    </div>
  );
}

function Frame660() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame661() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame662() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame663() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame664() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame665() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame666() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame667() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame668() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame669() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame670() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame671() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame672() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame673() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame674() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame675() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame676() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame677() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame678() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame679() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">CC120C08</p>
      </div>
    </div>
  );
}

function Frame687() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame659 />
            </div>
          </div>
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame660 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame661 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame662 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame663 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame664 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame665 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame666 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame667 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame668 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame669 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame670 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame671 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame672 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame673 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame674 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame675 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame676 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame677 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame678 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame679 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Con() {
  const { activeTab } = useContext(MaeIpSubTabCtx);
  const isPayTab = activeTab === '정보망배차(바로선지급)' || activeTab === '정보망배차(픽커)';
  const isExtraTab = activeTab === '소속기사배차' || activeTab === '협력사위탁';
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [shipperSelected, setShipperSelected] = useState<Set<number>>(new Set());
  const [partnerSelected, setPartnerSelected] = useState<Set<number>>(new Set());
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

  const tableRef = useRef<HTMLDivElement>(null);
  const [cancelledTopRows314, setCancelledTopRows314] = useState<CancelledOrderEntry[]>(getCancelledOrders());
  useEffect(() => subscribeCancelledOrders(() => setCancelledTopRows314(getCancelledOrders())), []);
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx314);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 5000;

  const hiddenRows = useMemo(() => {
    const filterStatuses = selected.has(0) ? null : new Set([...selected].map(i => ITEMS_314[i].label.split(" (")[0]));
    const hidden = new Set<number>();
    const parseYYMMDD314 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo314 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi314 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo314 !== null ? lo314 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_314[i % SHIPPER_ROW_DATA_314.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS_314[idx] === rowShipper);
      const statusMatch = filterStatuses === null || filterStatuses.has(ROW_STATUSES_314[i % ROW_STATUSES_314.length]);
      const rowPartner = PARTNER_ROW_DATA_314[i % PARTNER_ROW_DATA_314.length];
      const partnerMatch = partnerSelected.size === 0 || [...partnerSelected].some(idx => PARTNERS_314[idx] === rowPartner);
      if (!statusMatch || !shipperMatch || !partnerMatch) { hidden.add(i); continue; }
      if (lo314 !== null) {
        const rowT = parseYYMMDD314(getLoadingDate314(i));
        if (rowT < lo314 || rowT > hi314!) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, shipperSelected, partnerSelected, dateRangeStart, dateRangeEnd]);

  const dynamicCounts = useMemo(() => {
    const counts = new Array(ITEMS_314.length).fill(0);
    let totalAmount = 0;
    const parseYYMMDD314dc = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo314dc = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi314dc = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo314dc !== null ? lo314dc + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_314[i % SHIPPER_ROW_DATA_314.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => BUBBLE_SHIPPERS_314[idx] === rowShipper);
      if (!shipperMatch) continue;
      const rowPartner = PARTNER_ROW_DATA_314[i % PARTNER_ROW_DATA_314.length];
      const partnerMatch = partnerSelected.size === 0 || [...partnerSelected].some(idx => PARTNERS_314[idx] === rowPartner);
      if (!partnerMatch) continue;
      if (lo314dc !== null) {
        const rowT = parseYYMMDD314dc(getLoadingDate314(i));
        if (rowT < lo314dc || rowT > hi314dc!) continue;
      }
      const status = ROW_STATUSES_314[i % ROW_STATUSES_314.length];
      counts[0]++;
      totalAmount += PER_ROW_SALE_AMOUNT_314[status] ?? 0;
      for (let si = 1; si < ITEMS_314.length; si++) {
        if (ITEMS_314[si].label.split(' (')[0] === status) counts[si]++;
      }
    }
    const scale = activeTab === '정보망배차(바로선지급)' ? 0.58
                : activeTab === '정보망배차(픽커)' ? 0.34
                : 1;
    return { saleCounts: counts, saleTotalAmount: Math.round(totalAmount * scale) };
  }, [shipperSelected, partnerSelected, dateRangeStart, dateRangeEnd, activeTab]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
      const cells = Array.from(col.querySelectorAll<HTMLElement>('[data-name="Table_Data Cells"]'));
      if (!cells.length) return;
      const parent = cells[0].parentElement!;
      const SRC: Record<string, number> = { '마감필요': 3, '정산대기': 0, '지급대기': 7, '지급완료': 9, '정산보류': 13 };
      const headerText = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim();
      const isOrderIdCol = headerText === '오더ID';
      const isShipperCol = headerText === '화주사';
      const isPartnerCol = headerText === '요청협력사' || headerText === '협력사';
      const isInvoiceDateCol = headerText === '계산서 작성일자';
      const isLoadingDateCol = headerText === '상차일';
      cells.forEach((c) => parent.removeChild(c));
      const parseLD314 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
      const cancelled314 = getCancelledOrders();
      const cancelledIdxSet314 = new Set(cancelled314.map(o => o.rowIdx));
      const baseSorted314 = Array.from({ length: TOTAL_ROWS }, (_, i) => i).filter(i => !cancelledIdxSet314.has(i)).sort((a, b) => {
        const da = parseLD314(getLoadingDate314(a)), db = parseLD314(getLoadingDate314(b));
        if (da !== db) return da - db;
        const sa = STATUS_PRIORITY_314_SORT[ROW_STATUSES_314[a % ROW_STATUSES_314.length]] ?? 99;
        const sb = STATUS_PRIORITY_314_SORT[ROW_STATUSES_314[b % ROW_STATUSES_314.length]] ?? 99;
        return sa !== sb ? sa - sb : a - b;
      });
      const sortedIndices = [...cancelled314.map(o => o.rowIdx), ...baseSorted314];
      for (const origIdx of sortedIndices) {
        const s = cancelledIdxSet314.has(origIdx) ? '마감필요' : ROW_STATUSES_314[origIdx % ROW_STATUSES_314.length];
        const cell = (cells[SRC[s] ?? (origIdx % cells.length)].cloneNode(true)) as HTMLElement;
        cell.dataset.tableRow = String(origIdx);
        if (isOrderIdCol) {
          const p = cell.querySelector('p');
          if (p) {
            p.textContent = ORDER_IDS[5000 + origIdx];
            p.style.cursor = 'pointer';
            p.style.textDecoration = 'underline';
            const _idx = origIdx;
            p.addEventListener('click', () => {
              window.dispatchEvent(new CustomEvent('openOrderDetail', { detail: { orderId: ORDER_IDS[5000 + _idx], rowIdx: 5000 + _idx } }));
            });
          }
        }
        if (isShipperCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = SHIPPER_ROW_DATA_314[origIdx % SHIPPER_ROW_DATA_314.length];
        }
        if (isPartnerCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = PARTNER_ROW_DATA_314[origIdx % PARTNER_ROW_DATA_314.length];
        }
        if (isLoadingDateCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = getLoadingDate314(origIdx);
        }
        if (isInvoiceDateCol) {
          cell.style.cursor = 'pointer';
          cell.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('openMaeipInvoiceDetail'));
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
    // Remove static Figma checkmarks to prevent double SVG on selection
    tableRef.current.querySelectorAll('[data-name="Selection Controls"] [data-name="Vector"]').forEach((el) => (el as HTMLElement).remove());
  }, [cancelledTopRows314, activeTab]);
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
    const cancelledIdxSetPage314 = new Set(getCancelledOrders().map(o => o.rowIdx));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    tableRef.current.querySelectorAll<HTMLElement>('[data-table-row]').forEach((cell) => {
      const row = Number(cell.dataset.tableRow);
      const isCancelled = cancelledIdxSetPage314.has(row);
      cell.style.display = (isCancelled ? currentPage === 1 : (!hiddenRows.has(row) && row >= start && row < end)) ? '' : 'none';
    });
  }, [hiddenRows, currentPage, cancelledTopRows314, activeTab]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [currentPage]);

  // 정보망배차(바로선지급) / 정보망배차(픽커) 탭: 배차방법 제거 + 매입 유형 추가
  useEffect(() => {
    if (!tableRef.current) return;
    const PURCHASE_TYPES = ['예치금', '한도', '예치금', '예치금', '한도', '예치금', '한도', '예치금', '예치금', '한도'];

    if (isPayTab) {
      // 배차방법 컬럼 숨기기
      tableRef.current.querySelectorAll(':scope > *').forEach(col => {
        const h = col.querySelector('[data-name="Table_Header Cells"] p');
        if (h?.textContent?.trim() === '배차방법') (col as HTMLElement).style.display = 'none';
      });

      // 매입 유형 컬럼 추가
      if (!tableRef.current.querySelector('[data-name="purchase-type-col"]')) {
        let targetCol: Element | null = null;
        tableRef.current.querySelectorAll(':scope > *').forEach(col => {
          const h = col.querySelector('[data-name="Table_Header Cells"] p');
          if (h?.textContent?.trim() === '기사 전화번호') targetCol = col;
        });
        if (targetCol) {
          const newCol = (targetCol as HTMLElement).cloneNode(true) as HTMLElement;
          newCol.setAttribute('data-name', 'purchase-type-col');
          const headerP = newCol.querySelector('[data-name="Table_Header Cells"] p');
          if (headerP) headerP.textContent = '매입 유형';
          newCol.querySelectorAll<HTMLElement>('[data-table-row]').forEach(cell => {
            const p = cell.querySelector('p') || cell;
            p.textContent = PURCHASE_TYPES[Number(cell.dataset.tableRow) % PURCHASE_TYPES.length];
            cell.style.fontFamily = "'Pretendard GOV'";
            cell.style.fontWeight = '400';
          });
          (targetCol as HTMLElement).insertAdjacentElement('afterend', newCol);
        }
      }
    } else {
      // 정보망배차 탭: 원복
      tableRef.current.querySelectorAll(':scope > *').forEach(col => {
        const h = col.querySelector('[data-name="Table_Header Cells"] p');
        if (h?.textContent?.trim() === '배차방법') (col as HTMLElement).style.display = '';
      });
      tableRef.current.querySelector('[data-name="purchase-type-col"]')?.remove();
    }
  }, [isPayTab, cancelledTopRows314]);

  // 소속기사배차 / 협력사위탁 탭: 컬럼 조작
  useEffect(() => {
    if (!tableRef.current) return;
    const REMOVE_COLS = ['화주사', '화주사 업무그룹', '요청협력사', '요청협력사 업무그룹'];
    const PARTNER_DATA = ['카모로지스틱스', '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류', '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스'];

    if (isExtraTab) {
      // 먼저 partner-col 제거 후 재추가 (탭 전환 시 중복 방지)
      tableRef.current.querySelector('[data-name="partner-col"]')?.remove();

      // 제거 컬럼 숨기기 (width: 0 으로 완전히 접기)
      tableRef.current.querySelectorAll(':scope > *').forEach(col => {
        const h = col.querySelector('[data-name="Table_Header Cells"] p');
        if (REMOVE_COLS.includes(h?.textContent?.trim() ?? '')) {
          const el = col as HTMLElement;
          el.style.width = '0';
          el.style.minWidth = '0';
          el.style.overflow = 'hidden';
          el.style.flexShrink = '1';
          el.style.padding = '0';
        }
      });

      // 협력사위탁 탭에서만 배차방법 우측에 협력사 컬럼 추가
      if (activeTab === '협력사위탁' && !tableRef.current.querySelector('[data-name="partner-col"]')) {
        let targetCol: Element | null = null;
        tableRef.current.querySelectorAll(':scope > *').forEach(col => {
          const h = col.querySelector('[data-name="Table_Header Cells"] p');
          if (h?.textContent?.trim() === '배차방법') targetCol = col;
        });
        if (targetCol) {
          const newCol = (targetCol as HTMLElement).cloneNode(true) as HTMLElement;
          newCol.setAttribute('data-name', 'partner-col');
          const headerP = newCol.querySelector('[data-name="Table_Header Cells"] p');
          if (headerP) headerP.textContent = '협력사';
          newCol.querySelectorAll<HTMLElement>('[data-table-row]').forEach(cell => {
            const p = cell.querySelector('p') || cell;
            p.textContent = PARTNER_DATA[Number(cell.dataset.tableRow) % PARTNER_DATA.length];
            cell.style.fontFamily = "'Pretendard GOV'";
            cell.style.fontWeight = '400';
          });
          (targetCol as HTMLElement).insertAdjacentElement('afterend', newCol);
        }
      }

      // 협력사위탁이 아닌 경우 partner-col 제거
      if (activeTab !== '협력사위탁') {
        tableRef.current.querySelector('[data-name="partner-col"]')?.remove();
      }
    } else {
      // 다른 탭: 숨겨진 컬럼 복원 + partner-col 제거
      tableRef.current.querySelectorAll(':scope > *').forEach(col => {
        const h = col.querySelector('[data-name="Table_Header Cells"] p');
        if (REMOVE_COLS.includes(h?.textContent?.trim() ?? '')) {
          const el = col as HTMLElement;
          el.style.width = '';
          el.style.minWidth = '';
          el.style.overflow = '';
          el.style.flexShrink = '';
          el.style.padding = '';
        }
      });
      tableRef.current.querySelector('[data-name="partner-col"]')?.remove();
    }
  }, [isExtraTab, activeTab, cancelledTopRows314]);

  return (
    <>
    <DateFilterCtx314.Provider value={{ rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd }}>
    <DynamicCountCtx314.Provider value={dynamicCounts}>
    <BubbleCtx314.Provider value={{ shipperSelected, setShipperSelected, partnerSelected, setPartnerSelected }}>
    <FilterCtx314.Provider value={{ selected, setSelected }}>
    <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size, selectedRows }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="content-stretch flex flex-col items-start pt-[4px] px-[32px] relative size-full">
        <Frame3 />
        <FilterSorterModule />
        <Frame733 />
        <TableControlModule />
        <div className="content-stretch flex h-[840px] items-start relative shrink-0 w-[1648px] overflow-auto pb-[120px]" data-name="매입장부표_정보망배차" ref={tableRef}>
          <Frame685 />
          <Frame686 />
          <Frame716 />
          <Frame712 />
          <Frame713 />
          <Frame714 />
          <Frame715 />
          <TableColumns />
          <TableColumns1 />
          <Frame688 />
          <Frame689 />
          <Frame690 />
          <Frame691 />
          <Frame692 />
          <Frame708 />
          <Frame693 />
          <Frame705 />
          <Frame706 />
          <Frame694 />
          <Frame710 />
          <Frame695 />
          <Frame696 />
          <Frame697 />
          <Frame698 />
          <Frame699 />
          <Frame704 />
          <Frame700 />
          <Frame707 />
          <Frame709 />
          <Frame701 />
          <Frame702 />
          <Frame711 />
          <Frame703 />
          <Frame687 />
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx314.Provider>
    </BubbleCtx314.Provider>
    </DynamicCountCtx314.Provider>
    </DateFilterCtx314.Provider>
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
  const { currentPage, filteredTotal } = useContext(PageCtx314);
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
  const { currentPage, setCurrentPage, filteredTotal } = useContext(PageCtx314);
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

function Frame719() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(5000);
  return (
    <PageCtx314.Provider value={{ currentPage, setCurrentPage, filteredTotal, setFilteredTotal }}>
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
    </PageCtx314.Provider>
  );
}

function Right() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-[1180px] relative" data-name="right">
      <div className="bg-white content-stretch flex h-[82px] items-center px-[32px] relative shrink-0 w-[1712px]" data-name>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <Frame682 />
      </div>
      <Frame719 />
    </div>
  );
}

function Ui() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] items-start min-h-px overflow-clip relative w-full" data-name="통합장부 / UI">
      <SharedLnb activeTabIndex={2} />
      <Right />
    </div>
  );
}

export default function Component12() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.4 매입장부_정보망배차">
      <Ui />
    </div>
  );
}