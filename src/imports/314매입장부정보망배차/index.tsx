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

const PageCtx314 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });
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
  { label: "마감필요 (30건)",   amountRaw: 0 },
  { label: "정산대기 (90건)", amountRaw: 198_400_000 },
  { label: "지급대기 (120건)", amountRaw: 423_600_000 },
  { label: "지급완료 (30건)",   amountRaw: 876_200_000 },
  { label: "정산보류 (30건)",   amountRaw: 54_800_000 },
];
const ITEMS_314_TOTAL = ITEMS_314_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_314 = [
  { label: "전체 (300건)", amount: formatKorean(ITEMS_314_TOTAL) },
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

const TableCtrlCtx = createContext<{ filteredTotal: number; selectedCount: number; selectedRows: Set<number> }>({ filteredTotal: 300, selectedCount: 0, selectedRows: new Set() });

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

// ─── Data-driven table helpers ──────────────────────────────────────────────
// 이 표는 20개의 "템플릿 행"을 렌더링하고, Con() 내부의 useEffect가 매입 상태별로
// 해당 템플릿 셀을 복제해 최대 5,000행을 만들어낸다 (SRC 매핑: 마감필요=3, 정산대기=0,
// 지급대기=7, 지급완료=9, 정산보류=13). 따라서 getRowData314(rowIdx)의 rowIdx는
// 0~19 범위의 "템플릿 행 인덱스"이며, 매입 상태 시퀀스는 그 매핑과 정확히 일치해야 한다.

const TEMPLATE_ROW_STATUSES_314 = [
  '정산대기', '정산대기', '정산대기', '마감필요', '마감필요',
  '정산대기', '정산대기', '지급대기', '지급대기', '지급완료',
  '정산대기', '지급완료', '지급완료', '정산보류', '정산보류',
  '정산제외', '정산제외', '정산제외', '정산제외', '정산제외',
];

const BADGE_STYLES_314: Record<string, { bg: string; text: string }> = {
  '마감필요': { bg: '#fce9e9', text: '#dd2222' },
  '정산대기': { bg: '#ebedef', text: '#454b55' },
  '지급대기': { bg: '#e4fbeb', text: '#18ac42' },
  '지급완료': { bg: '#e6efff', text: '#005fff' },
  '정산보류': { bg: '#ebedef', text: '#9197a1' },
  '정산제외': { bg: '#ebedef', text: '#c7cbd1' },
};

const DISPATCH_METHODS_314 = ['카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '화물맨', '원콜', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커', '카카오T트럭커'];

function getRowData314(rowIdx: number) {
  const status = TEMPLATE_ROW_STATUSES_314[rowIdx % TEMPLATE_ROW_STATUSES_314.length];
  const dispatchMethod = DISPATCH_METHODS_314[rowIdx % DISPATCH_METHODS_314.length];
  const hasInvoiceDate = rowIdx !== 5 && rowIdx !== 6; // 계산서 작성일자 미등록 행(5,6)은 "계산서 등록" 버튼 노출

  return {
    status,
    orderId: 'KMO1234',
    shipper: '(주)글로벌로지스',
    shipperGroup: '판교본사',
    partner: '카모로지스틱스',
    partnerGroup: '판교본사',
    loadingDate: '25.10.20',
    unloadDate: '25.10.20',
    loadLoc: '판교테크노밸리',
    loadAddr: '경기 성남시 삼평동',
    unloadLoc: '광교물류',
    unloadAddr: '경기 수원시 이의동',
    waypoints: '0곳',
    exclusive: '독차',
    roundTrip: '편도',
    tonType: '1톤',
    cargoType: '탑',
    cargoOption: '냉장',
    dispatchMethod,
    plate: '12아3456',
    driverName: '김카모',
    driverContact: '010-1234-5678',
    dispatchAmt: 300_000,
    tax: 30_000,
    totalAmt: 330_000,
    insurance: 1_880,
    totalWithInsurance: 328_120,
    hasInvoiceDate,
    invoiceDate: hasInvoiceDate ? '25.10.20' : '',
    invoiceCheckDate: '25.10.20',
    payDeadline: '25.10.20',
    payDate: '25.10.20',
    docCount: '1장',
    shipperOrderNum: 'CC120C08',
  };
}

type RowData314 = ReturnType<typeof getRowData314>;

function ColBorder314() {
  return <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />;
}

function HeaderTitle314({ label }: { label: string }) {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px] overflow-hidden text-ellipsis">{label}</p>
        </div>
      </div>
    </div>
  );
}

function HeaderCell314({ label }: { label: string }) {
  return (
    <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
      <ColBorder314 />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center p-[8px] relative size-full">
          <HeaderTitle314 label={label} />
        </div>
      </div>
    </div>
  );
}

function TextDataCell314({ text }: { text: string }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px] overflow-hidden text-ellipsis">{text}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder314 />
    </div>
  );
}

function LinkDataCell314({ text }: { text: string }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{text}</p>
            </div>
          </div>
        </div>
      </div>
      <ColBorder314 />
    </div>
  );
}

function NumberDataCell314({ value }: { value: number }) {
  return <TextDataCell314 text={value.toLocaleString()} />;
}

function BadgeDataCell314({ status }: { status: string }) {
  const style = BADGE_STYLES_314[status] ?? { bg: '#ebedef', text: '#454b55' };
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
      <ColBorder314 />
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

function SmallButton314({ label }: { label: string }) {
  return (
    <div className="bg-white h-[26px] relative rounded-[2px] shrink-0" data-name="Button">
      <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[8px] relative rounded-[inherit] size-full">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[14px] tracking-[-0.28px] whitespace-nowrap">
          <p className="leading-[20px]">{label}</p>
        </div>
      </div>
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[2px]" />
    </div>
  );
}

function InvoiceDateDataCell314({ row }: { row: RowData314 }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          {row.hasInvoiceDate ? (
            <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
              <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`${row.invoiceDate} `}</p>
              </div>
            </div>
          ) : (
            <SmallButton314 label="계산서 등록" />
          )}
        </div>
      </div>
      <ColBorder314 />
    </div>
  );
}

function EvidenceDataCell314({ docCount }: { docCount: string }) {
  return (
    <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
          <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
            <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
              <p className="leading-[22px] overflow-hidden text-ellipsis">{docCount}</p>
            </div>
          </div>
          <SmallButton314 label="보기" />
        </div>
      </div>
      <ColBorder314 />
    </div>
  );
}

function CheckboxHeaderCell314() {
  return (
    <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center p-[8px] relative shrink-0 w-[34px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
      <ColBorder314 />
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
        <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
      </div>
    </div>
  );
}

function CheckboxDataCell314() {
  return (
    <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
      <ColBorder314 />
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
        <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
      </div>
    </div>
  );
}

function CheckboxCol314() {
  return (
    <div className="relative shrink-0">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <CheckboxHeaderCell314 />
        {Array.from({ length: 20 }, (_, i) => <CheckboxDataCell314 key={i} />)}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-r border-solid inset-0 pointer-events-none" />
    </div>
  );
}

type ColDef314 = {
  label: string;
  width: number;
  render: (d: RowData314) => React.ReactNode;
};

const TABLE_COLS_314: ColDef314[] = [
  { label: '매입 상태', width: 100, render: (d) => <BadgeDataCell314 status={d.status} /> },
  { label: '오더ID', width: 120, render: (d) => <LinkDataCell314 text={d.orderId} /> },
  { label: '화주사', width: 120, render: (d) => <TextDataCell314 text={d.shipper} /> },
  { label: '화주사 업무그룹', width: 140, render: (d) => <TextDataCell314 text={d.shipperGroup} /> },
  { label: '요청협력사', width: 140, render: (d) => <TextDataCell314 text={d.partner} /> },
  { label: '요청협력사 업무그룹', width: 140, render: (d) => <TextDataCell314 text={d.partnerGroup} /> },
  { label: '상차일', width: 140, render: (d) => <TextDataCell314 text={d.loadingDate} /> },
  { label: '하차일', width: 140, render: (d) => <TextDataCell314 text={d.unloadDate} /> },
  { label: '상차지명', width: 140, render: (d) => <TextDataCell314 text={d.loadLoc} /> },
  { label: '상차지주소', width: 140, render: (d) => <TextDataCell314 text={d.loadAddr} /> },
  { label: '하차지명', width: 140, render: (d) => <TextDataCell314 text={d.unloadLoc} /> },
  { label: '하차지주소', width: 140, render: (d) => <TextDataCell314 text={d.unloadAddr} /> },
  { label: '경유', width: 100, render: (d) => <TextDataCell314 text={d.waypoints} /> },
  { label: '독차', width: 100, render: (d) => <TextDataCell314 text={d.exclusive} /> },
  { label: '왕복', width: 100, render: (d) => <TextDataCell314 text={d.roundTrip} /> },
  { label: '요청 차량톤수', width: 100, render: (d) => <TextDataCell314 text={d.tonType} /> },
  { label: '요청 차량종류', width: 100, render: (d) => <TextDataCell314 text={d.cargoType} /> },
  { label: '요청 차량옵션', width: 100, render: (d) => <TextDataCell314 text={d.cargoOption} /> },
  { label: '배차방법', width: 100, render: (d) => <TextDataCell314 text={d.dispatchMethod} /> },
  { label: '차량번호', width: 100, render: (d) => <TextDataCell314 text={d.plate} /> },
  { label: '기사명', width: 100, render: (d) => <TextDataCell314 text={d.driverName} /> },
  { label: '기사 전화번호', width: 140, render: (d) => <TextDataCell314 text={d.driverContact} /> },
  { label: '배차금액', width: 140, render: (d) => <NumberDataCell314 value={d.dispatchAmt} /> },
  { label: '세액', width: 140, render: (d) => <NumberDataCell314 value={d.tax} /> },
  { label: '합계 금액', width: 140, render: (d) => <NumberDataCell314 value={d.totalAmt} /> },
  { label: '기사 산재보험료', width: 140, render: (d) => <NumberDataCell314 value={d.insurance} /> },
  { label: '합계 금액 (산재 포함)', width: 140, render: (d) => <NumberDataCell314 value={d.totalWithInsurance} /> },
  { label: '계산서 작성일자', width: 140, render: (d) => <InvoiceDateDataCell314 row={d} /> },
  { label: '계산서 확인일자', width: 140, render: (d) => <TextDataCell314 text={`${d.invoiceCheckDate} `} /> },
  { label: '지급기한', width: 140, render: (d) => <TextDataCell314 text={`${d.payDeadline} `} /> },
  { label: '지급일', width: 140, render: (d) => <LinkDataCell314 text={`${d.payDate} `} /> },
  { label: '증빙서류', width: 100, render: (d) => <EvidenceDataCell314 docCount={d.docCount} /> },
  { label: '화주사 주문번호', width: 120, render: (d) => <TextDataCell314 text={d.shipperOrderNum} /> },
];

function DynamicTable314() {
  return (
    <>
      <CheckboxCol314 />
      {TABLE_COLS_314.map((col) => (
        <div key={col.label} className="relative shrink-0" style={{ width: col.width }}>
          <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
            <HeaderCell314 label={col.label} />
            {Array.from({ length: 20 }, (_, i) => (
              <React.Fragment key={i}>{col.render(getRowData314(i))}</React.Fragment>
            ))}
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
        </div>
      ))}
    </>
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

  const TOTAL_ROWS = 300;

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
          <DynamicTable314 />
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
  const [filteredTotal, setFilteredTotal] = useState(300);
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