import { todayYYMMDD } from '../../utils/date';
import React, { useState, createContext, useContext, useMemo, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import svgPaths from "./svg-2dj4ded117";
import { MaeChulMyeongseSubTabCtx, type MaeChulMyeongseSubTab } from "../shared/subTabCtx";
import InvoiceDetail from "./detail";
import SharedLnb from "../shared/SharedLnb";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

function ScaledOverlay({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() => window.innerWidth / DESIGN_W);
  useEffect(() => {
    const update = () => setScale(window.innerWidth / DESIGN_W);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', background: '#fff' }}>
      <div style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

const ROW_STATUSES_315 = ["확정대기","확정대기","확정대기","발행대기","발행대기","수금대기","수금대기","수금완료","수금완료","수금완료"];
const STATUS_PRIORITY_315: Record<string, number> = { '확정대기': 0, '발행대기': 1, '수금대기': 2, '수금완료': 3 };

const CREATION_DATES_315 = [
  '26.05.01','26.05.04','26.05.06','26.05.08','26.05.11','26.05.13','26.05.15',
  '26.05.18','26.05.20','26.05.22','26.05.25','26.05.27','26.05.29',
  '26.06.01','26.06.03','26.06.05','26.06.08','26.06.10','26.06.12','26.06.15',
  '26.06.17','26.06.19','26.06.22','26.06.24','26.06.25','26.06.26',todayYYMMDD(),
];
// XOR 기반 해시로 날짜가 상태 간에 고르게 섞이도록 분산
const getCreationDateIdx315 = (i: number) => {
  let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11;
  return ((h >>> 0) % CREATION_DATES_315.length + CREATION_DATES_315.length) % CREATION_DATES_315.length;
};
const getCreationDate315 = (i: number) => CREATION_DATES_315[getCreationDateIdx315(i)];

const SHIPPERS_315 = ['(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류'];
const SHIPPER_ROW_DATA_315 = SHIPPERS_315;
const ORIGIN_OPTIONS_315 = ['자사', '타사'];
const SHIPPER_GROUPS_315 = ['판교본사', '수원센터', '동탄물류팀', '강남지사', '분당운영팀', '용인배송팀', '성남본부', '광교지점', '구성센터', '화성팀'];
const getShipperGroup315 = (i: number) => SHIPPER_GROUPS_315[i % SHIPPER_GROUPS_315.length];

const ROW_CHARGE_AMOUNTS = [380000, 520000, 290000, 740000, 450000, 610000, 340000, 820000, 270000, 560000];
const ROW_TAX_AMOUNTS = ROW_CHARGE_AMOUNTS.map(a => Math.round(a * 0.1));

const PER_ROW_AMOUNT_315: Record<string, number> = {
  '확정대기': Math.round(54_200_000 / 1500),
  '발행대기': Math.round(128_500_000 / 1000),
  '수금대기': Math.round(237_800_000 / 1000),
  '수금완료': Math.round(891_450_000 / 1500),
};

// 5,000개 고유 거래명세서ID (알파벳 3자 + 숫자 4자, seeded LCG, 중복 없음)
const INVOICE_IDS_315 = (() => {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = 0xABCD1234;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return s >>> 0; };
  const seen = new Set<string>();
  const result: string[] = [];
  while (result.length < 5000) {
    const letters = Array.from({ length: 3 }, () => L[next() % 26]).join('');
    const digits = String(next() % 10000).padStart(4, '0');
    const id = letters + digits;
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
})();

interface DateFilterCtxType315 { rangeStart: Date|null; rangeEnd: Date|null; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; }
const DateFilterCtx315 = createContext<DateFilterCtxType315>({ rangeStart: null, rangeEnd: null, setRangeStart: () => {}, setRangeEnd: () => {} });

const PageCtx315 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });
const FilterCtx315 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

interface BubbleCtxType315 { shipperSelected: Set<number>; setShipperSelected: (s: Set<number>) => void; originSelected: Set<number>; setOriginSelected: (s: Set<number>) => void; }
const BubbleCtx315 = createContext<BubbleCtxType315>({ shipperSelected: new Set(), setShipperSelected: () => {}, originSelected: new Set(), setOriginSelected: () => {} });

const DynamicCountCtx315 = createContext<{ statusCounts: number[]; totalAmount: number }>({ statusCounts: [], totalAmount: 0 });

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
  const { selected, setSelected } = useContext(FilterCtx315);
  const { statusCounts, totalAmount } = useContext(DynamicCountCtx315);
  const nonTotalCount = items.length - 1;

  // Build display items with dynamic counts when available
  const displayItems = statusCounts.length > 0
    ? items.map((item, i) => {
        const count = statusCounts[i] ?? 0;
        const baseLabel = item.label.split(' (')[0];
        if (i === 0) return { label: `전체 (${count.toLocaleString()}건)`, amount: formatKorean(totalAmount) };
        const perRow = PER_ROW_AMOUNT_315[baseLabel] ?? 0;
        return { label: `${baseLabel} (${count.toLocaleString()}건)`, amount: formatKorean(perRow * count) };
      })
    : items;

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

  return (
    <div className="flex items-start py-[12px] relative shrink-0 w-full" style={{height: 104}}>
      <div className="bg-[#f6f7f8] rounded-[8px] flex-1 flex flex-col justify-center items-start p-[4px] gap-[12px]" style={{height: 80}}>
        <div className="flex gap-[4px] w-full" style={{height: 72}}>
          {displayItems.map((item, i) => (
            <DashboardCard key={i} label={item.label.replace("건)", ")")} amount={item.amount} active={selected.has(i)} onClick={() => handleClick(i)} />
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

function Frame368() {
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

function Frame370() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">매출 거래명세서</p>
      <Frame368 />
    </div>
  );
}

function Frame395() {
  const { activeTab, setActiveTab } = useContext(MaeChulMyeongseSubTabCtx);
  const tabs: MaeChulMyeongseSubTab[] = ["화주사", "협력사"];
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
      <Frame395 />
    </div>
  );
}

const DATE_TYPE_OPTIONS_315 = ['거래명세서 생성일'] as const;

function TypeStatusDisabled() {
  const [selected, setSelected] = useState<string>('거래명세서 생성일');
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
        <div ref={dropRef} style={{ position:'fixed', top: rect.bottom + 2, left: rect.left, width: 176, background:'#FFFFFF', border:'1px solid #E4E5E9', borderRadius:8, boxShadow:'0px 2px 6px 1px rgba(34,34,34,0.06)', zIndex:99999, padding:8, display:'flex', flexDirection:'column' }}>
          {DATE_TYPE_OPTIONS_315.map(opt => (
            <div
              key={opt}
              tabIndex={0}
              onClick={() => { setSelected(opt); setOpen(false); }}
              onFocus={() => setFocusedOpt(opt)}
              onBlur={() => setFocusedOpt(null)}
              onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
              style={{ display:'flex', alignItems:'center', padding:'9px 8px', gap:8, height:40, borderRadius:4, fontSize:15, fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px', color: selected === opt ? '#005FFF' : '#2E3238', fontWeight:400, background:'#FFFFFF', cursor:'pointer', whiteSpace:'nowrap', boxSizing:'border-box', outline: focusedOpt === opt ? '1px solid #005FFF' : 'none', outlineOffset:'-1px' }}
            >
              <span style={{ flex:1 }}>{opt}</span>
              {selected === opt && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
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

function TypeStatusDisabled1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">1개월 전</p>
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
          <p className="leading-[20px]">25.03.23~ 25.04.23</p>
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

function DateRangeCalendar315_UNUSED({ anchorRect, rangeStart, rangeEnd, onSelect, onClose }: {
  anchorRect: DOMRect;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onSelect: (start: Date, end: Date) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date | null>(rangeStart);
  const [tempEnd, setTempEnd] = useState<Date | null>(rangeEnd);
  const [hovered, setHovered] = useState<Date | null>(null);
  const initDate = rangeStart ?? new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const fmtD = (d: Date) => `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const buildCells = (year: number, month: number) => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = first - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
    for (let d = 1; d <= days; d++) cells.push({ date: new Date(year, month, d), inMonth: true });
    while (cells.length % 7 !== 0) cells.push({ date: new Date(year, month + 1, cells.length - days - first + 1), inMonth: false });
    return cells;
  };

  const cells = buildCells(viewYear, viewMonth);

  const handleDayClick = (date: Date) => {
    if (step === 'start') {
      setTempStart(date); setTempEnd(null); setStep('end');
    } else {
      if (tempStart && date < tempStart) { setTempStart(date); setTempEnd(null); setStep('end'); }
      else { setTempEnd(date); onSelect(tempStart!, date); onClose(); }
    }
  };

  const isInRange = (d: Date) => {
    const s = tempStart, e = tempEnd ?? (step === 'end' && hovered ? hovered : null);
    if (!s || !e) return false;
    return d > (s < e ? s : e) && d < (s < e ? e : s);
  };
  const isStart = (d: Date) => !!tempStart && isSameDay(d, tempStart);
  const isEnd = (d: Date) => !!tempEnd && isSameDay(d, tempEnd);
  const isHoverEnd = (d: Date) => step === 'end' && !!hovered && isSameDay(d, hovered);

  const prevMonth = () => { const d = new Date(viewYear, viewMonth - 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); };
  const nextMonth = () => { const d = new Date(viewYear, viewMonth + 1, 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); };

  const quickRanges = [
    { label: '이번달', get: () => { const s = new Date(today.getFullYear(), today.getMonth(), 1); const e = new Date(today.getFullYear(), today.getMonth() + 1, 0); return [s, e]; } },
    { label: '저번달', get: () => { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return [s, e]; } },
    { label: '최근 7일', get: () => { const e = new Date(today); const s = new Date(today); s.setDate(s.getDate() - 6); return [s, e]; } },
    { label: '최근 30일', get: () => { const e = new Date(today); const s = new Date(today); s.setDate(s.getDate() - 29); return [s, e]; } },
    { label: '최근 3개월', get: () => { const e = new Date(today); const s = new Date(today.getFullYear(), today.getMonth() - 2, 1); return [s, e]; } },
  ];

  return createPortal(
    <div ref={ref} style={{ position: 'fixed', top: anchorRect.bottom + 4, left: anchorRect.left, width: 296, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 4px 12px rgba(34,34,34,0.1)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 99999, boxSizing: 'border-box' }}>
      {/* 선택 상태 표시 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5C6370', fontFamily: "'Pretendard GOV', sans-serif" }}>
        <span style={{ padding: '2px 8px', borderRadius: 4, background: step === 'start' ? '#E8F0FF' : '#F6F7F8', color: step === 'start' ? '#005FFF' : '#2E3238', fontWeight: 600 }}>{tempStart ? fmtD(tempStart) : '시작일'}</span>
        <span>~</span>
        <span style={{ padding: '2px 8px', borderRadius: 4, background: step === 'end' ? '#E8F0FF' : '#F6F7F8', color: step === 'end' ? '#005FFF' : '#2E3238', fontWeight: 600 }}>{tempEnd ? fmtD(tempEnd) : '종료일'}</span>
      </div>
      {/* 월 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={prevMonth} style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M4.5 1L0.5 5L4.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2E3238', fontFamily: "'Pretendard GOV:Bold'", letterSpacing: '-0.02em' }}>{viewYear}년 {viewMonth + 1}월</span>
        <button onClick={nextMonth} style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M0.5 1L4.5 5L0.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
        {['일','월','화','수','목','금','토'].map(d => <span key={d} style={{ fontSize: 12, fontWeight: 600, color: '#9197A1', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Pretendard GOV', sans-serif" }}>{d}</span>)}
      </div>
      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((cell, i) => {
          const sel = isStart(cell.date) || isEnd(cell.date) || isHoverEnd(cell.date);
          const inR = isInRange(cell.date);
          return (
            <div key={i}
              onClick={() => cell.inMonth && handleDayClick(cell.date)}
              onMouseEnter={() => setHovered(cell.date)}
              onMouseLeave={() => setHovered(null)}
              style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cell.inMonth ? 'pointer' : 'default', background: inR ? '#EEF3FF' : 'transparent', position: 'relative' }}>
              <div style={{ width: 32, height: 32, borderRadius: 100, background: sel ? '#005FFF' : isSameDay(cell.date, today) ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#C7CBD1', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* 빠른 선택 */}
      <div style={{ borderTop: '1px solid #E4E5E9', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {quickRanges.map(({ label, get }) => (
          <button key={label} onClick={() => { const [s, e] = get(); onSelect(s, e); onClose(); }}
            style={{ border: '1px solid #E4E5E9', borderRadius: 4, background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#2E3238', padding: '0 8px', height: 26, cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif" }}
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

function SwitchModule() {
  const { rangeStart, rangeEnd, setRangeStart, setRangeEnd } = useContext(DateFilterCtx315);
  const F = "'Pretendard GOV:Regular'";
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'current' | 'fixed'>('fixed');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
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
  return (
    <div className="content-stretch flex gap-[3px] items-center relative shrink-0 z-[2]" data-name="calender">
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[91px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled1 />
      </div>
      <SwitchModule />
    </div>
  );
}

// DateFilterCtx315 initializer helper — call once when the provider mounts
function _initDate315() {
  const t = new Date(2026, 5, 29);
  t.setMonth(t.getMonth() - 1);
  t.setHours(0, 0, 0, 0);
  return t;
}

function Component9() {
  return (
    <div className="content-center flex flex-wrap gap-[4px] isolate items-center relative shrink-0" data-name="필터 그룹">
      <Calender />
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

function BubbleFilter315() {
  const { activeTab } = useContext(MaeChulMyeongseSubTabCtx);
  const isPartnerTab = activeTab === '협력사';
  const { shipperSelected, setShipperSelected, originSelected, setOriginSelected } = useContext(BubbleCtx315);
  const [shipperOpen, setShipperOpen] = useState(false);
  const [shipperSearch, setShipperSearch] = useState('');
  const [shipperHovered, setShipperHovered] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number|null>(null);
  const shipperBtnRef = useRef<HTMLDivElement>(null);
  const shipperDropRef = useRef<HTMLDivElement>(null);
  const [shipperDropPos, setShipperDropPos] = useState<{ top: number; left: number } | null>(null);

  const [originOpen, setOriginOpen] = useState(false);
  const [originHovered, setOriginHovered] = useState(false);
  const [originHoveredIdx, setOriginHoveredIdx] = useState<number|null>(null);
  const originBtnRef = useRef<HTMLDivElement>(null);
  const originDropRef = useRef<HTMLDivElement>(null);
  const [originDropPos, setOriginDropPos] = useState<{ top: number; left: number } | null>(null);

  const shipperBg = shipperOpen ? '#eef3ff' : shipperSelected.size > 0 ? '#f5f9ff' : shipperHovered ? '#f6f7f8' : '#f6f7f8';
  const shipperBorder = shipperOpen ? '1px solid transparent' : shipperSelected.size > 0 ? '1px solid transparent' : shipperHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const shipperTextColor = (shipperOpen || shipperSelected.size > 0) ? '#005fff' : '#2e3238';

  const originBg = originOpen ? '#eef3ff' : originSelected.size > 0 ? '#f5f9ff' : originHovered ? '#f6f7f8' : '#f6f7f8';
  const originBorder = originOpen ? '1px solid transparent' : originSelected.size > 0 ? '1px solid transparent' : originHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const originTextColor = (originOpen || originSelected.size > 0) ? '#005fff' : '#2e3238';

  useEffect(() => {
    if (!shipperOpen) return;
    const handler = (e: MouseEvent) => {
      if (!shipperBtnRef.current?.contains(e.target as Node) && !shipperDropRef.current?.contains(e.target as Node)) {
        setShipperOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shipperOpen]);

  useEffect(() => {
    if (!originOpen) return;
    const handler = (e: MouseEvent) => {
      if (!originBtnRef.current?.contains(e.target as Node) && !originDropRef.current?.contains(e.target as Node)) {
        setOriginOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [originOpen]);

  return (
    <div className="content-stretch flex items-center gap-[4px] relative shrink-0 z-[7]">
      {/* 화주사/협력사 dropdown */}
      <div ref={shipperBtnRef} style={{ position: 'relative', display: isPartnerTab ? undefined : undefined }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: shipperBg, border: shipperBorder }}
          data-name="Input / Dropdown_Filter"
          onClick={() => {
            if (!shipperOpen) {
              const rect = shipperBtnRef.current!.getBoundingClientRect();
              setShipperDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setShipperOpen(o => !o);
          }}
          onMouseEnter={() => setShipperHovered(true)}
          onMouseLeave={() => setShipperHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: shipperTextColor }}>
            <p className="leading-[20px]">{isPartnerTab ? '협력사' : '화주사'}</p>
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
                        <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" stroke={shipperOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {shipperOpen && shipperDropPos && createPortal(
          <div ref={shipperDropRef} style={{
            position: 'fixed', top: shipperDropPos.top, left: shipperDropPos.left,
            width: 216, background: '#FFFFFF',
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
                  placeholder={isPartnerTab ? '협력사 검색' : '화주사 검색'}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#767D8A', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', background: 'transparent' }}
                />
              </div>
            </div>
            <div style={{ height: (shipperSelected.size === 0 && (!shipperSearch || SHIPPERS_315.filter(s => s.includes(shipperSearch)).length === 0)) ? 162 : undefined, maxHeight: (shipperSelected.size === 0 && (!shipperSearch || SHIPPERS_315.filter(s => s.includes(shipperSearch)).length === 0)) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {shipperSelected.size === 0 && (!shipperSearch || SHIPPERS_315.filter(s => s.includes(shipperSearch)).length === 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : SHIPPERS_315.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (shipperSearch && name.includes(shipperSearch)) || shipperSelected.has(origIdx)).map(({name, origIdx}) => (
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

      {/* 거래명세서 생성처 dropdown */}
      <div ref={originBtnRef} style={{ position: 'relative' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: originBg, border: originBorder }}
          data-name="Input / Dropdown_Filter"
          onClick={() => {
            if (!originOpen) {
              const rect = originBtnRef.current!.getBoundingClientRect();
              setOriginDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setOriginOpen(o => !o);
          }}
          onMouseEnter={() => setOriginHovered(true)}
          onMouseLeave={() => setOriginHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: originTextColor }}>
            <p className="leading-[20px]">거래명세서 생성처</p>
          </div>
          {originSelected.size > 0 && !originOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{originSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: originOpen ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
              <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                <div className="-scale-y-100 flex-none">
                  <div className="h-[3px] relative w-[7px]">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" stroke={originOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {originOpen && originDropPos && createPortal(
          <div ref={originDropRef} style={{
            position: 'fixed', top: originDropPos.top, left: originDropPos.left,
            width: 176, background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            zIndex: 9999, boxSizing: 'border-box',
          }}>
            <div style={{ height: 116, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 12px', boxSizing: 'border-box' }}>
                {ORIGIN_OPTIONS_315.map((name, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setOriginHoveredIdx(idx)}
                    onMouseLeave={() => setOriginHoveredIdx(null)}
                    onClick={() => {
                      const next = new Set(originSelected);
                      if (next.has(idx)) next.delete(idx); else next.add(idx);
                      setOriginSelected(next);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '9px 8px 9px 4px', gap: 8,
                      height: 40, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box',
                      background: originHoveredIdx === idx ? '#F6F7F8' : '#FFFFFF',
                    }}
                  >
                    <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 16, height: 16,
                        border: originSelected.has(idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9',
                        borderRadius: 3,
                        background: originSelected.has(idx) ? '#005FFF' : '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}>
                        {originSelected.has(idx) && (
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
                  onClick={e => { e.stopPropagation(); setOriginSelected(new Set()); }}
                  style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}
                >
                  필터 초기화
                </span>
              </div>
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
      <Component9 />
      <BubbleFilter315 />
    </div>
  );
}

function TasaBanner() {
  const { originSelected } = useContext(BubbleCtx315);
  // ORIGIN_OPTIONS_315 = ['자사', '타사'] → 타사 index = 1
  const isTasaOnly = originSelected.size > 0 && [...originSelected].every(idx => idx === 1);
  if (!isTasaOnly) return null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      padding: '12px 32px', gap: 4,
      width: 'calc(100% + 64px)', height: 44,
      marginLeft: -32, marginRight: -32,
      background: '#F5F9FF', flexShrink: 0, boxSizing: 'border-box',
    }}>
      {/* Info 아이콘 */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6.35" stroke="#005FFF" strokeWidth="1.3"/>
        <rect x="7.35" y="7" width="1.3" height="4.5" rx="0.65" fill="#005FFF"/>
        <circle cx="8" cy="5.25" r="0.65" fill="#005FFF"/>
      </svg>
      <span style={{
        fontSize: 14, fontWeight: 600, color: '#005FFF',
        fontFamily: "'Pretendard GOV', sans-serif",
        letterSpacing: '-0.02em', lineHeight: '20px',
      }}>
        타사가 생성한 거래명세서만 노출 중입니다. 수정이 필요할 경우, 거래처에 문의해 주세요.
      </span>
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

function Frame372() {
  const { setShipperSelected, setOriginSelected } = useContext(BubbleCtx315);
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button"
        onClick={() => { setShipperSelected(new Set()); setOriginSelected(new Set()); }}>
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

function Frame393() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Filter />
      <Frame372 />
    </div>
  );
}

function FilterSorterModule() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start py-[12px] relative shrink-0 w-full" data-name="Filter_Sorter_Module">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame393 />
    </div>
  );
}

function Frame401() {
  const { statusCounts, totalAmount } = useContext(DynamicCountCtx315);
  const totalCount = statusCounts.length > 0 ? statusCounts[0] : 5000;
  const displayAmount = statusCounts.length > 0 ? totalAmount : ITEMS_315_TOTAL;
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체 ({totalCount.toLocaleString()}건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#005fff] text-[18px] tracking-[-0.36px]">{formatKorean(displayAmount)}</p>
    </div>
  );
}

function Frame400() {
  return (
    <div className="bg-[#f5f9ff] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div aria-hidden className="absolute border border-[#005fff] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame401 />
        </div>
      </div>
    </div>
  );
}

function Frame402() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">확정대기 (1,500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">0원</p>
    </div>
  );
}

function Frame396() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame402 />
        </div>
      </div>
    </div>
  );
}

function Frame403() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">발행대기 (1,000건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">235,304,300원</p>
    </div>
  );
}

function Frame397() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame403 />
        </div>
      </div>
    </div>
  );
}

function Frame404() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">수금대기 (1,000건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">1,504,204,303원</p>
    </div>
  );
}

function Frame398() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame404 />
        </div>
      </div>
    </div>
  );
}

function Frame405() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">수금완료 (1,500건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#2e3238] text-[18px] tracking-[-0.36px]">632,304,392,101원</p>
    </div>
  );
}

function Frame399() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-w-px relative rounded-[8px]">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[20px] py-[16px] relative size-full">
          <Frame405 />
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

const ITEMS_315_RAW = [
  { label: "확정대기 (90건)", amountRaw: 54_200_000 },
  { label: "발행대기 (60건)", amountRaw: 128_500_000 },
  { label: "수금대기 (60건)", amountRaw: 237_800_000 },
  { label: "수금완료 (90건)", amountRaw: 891_450_000 },
];
const ITEMS_315_TOTAL = ITEMS_315_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_315 = [
  { label: "전체 (300건)", amount: formatKorean(ITEMS_315_TOTAL) },
  ...ITEMS_315_RAW.map(x => ({ label: x.label, amount: formatKorean(x.amountRaw) })),
];

function Frame406() {
  return <StatusCardRowLarge items={ITEMS_315} />;
}

const TOAST_ANIMATION_315 = `
  @keyframes toast-slide-in-315 {
    from { transform: translateX(calc(100% + 34px)); opacity: 0; }
    to   { transform: translateX(0);                 opacity: 1; }
  }
`;
const TOAST_STYLE_315: React.CSSProperties = {
  position: 'fixed', bottom: 34, right: 34, width: 400, height: 54,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 20px', zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  animation: 'toast-slide-in-315 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  fontFamily: "'Pretendard GOV', sans-serif",
};
function ToastCloseBtn315({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function ConfirmInvoiceListModal({ onClose, onSuccess, selectedIndices }: { onClose: () => void; onSuccess?: () => void; selectedIndices: number[] }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const [hoveredModalRow, setHoveredModalRow] = useState<number | null>(null);

  const rows = selectedIndices.map(idx => {
    const startDate = getCreationDate315(idx);
    const [sy, sm, sd] = startDate.split('.').map(Number);
    const startDateObj = new Date(2000 + sy, sm - 1, sd);
    const endDateObj = new Date(startDateObj.getTime() + 5 * 86400000);
    const endDate = `${String(endDateObj.getFullYear()).slice(-2)}.${pad2(endDateObj.getMonth() + 1)}.${pad2(endDateObj.getDate())}`;
    const period = `${startDate} ~ ${endDate}`;
    const chargeAmt = 380000 + (idx % 5) * 20000;
    const adjAmt = 10000;
    const supplyAmt = chargeAmt + adjAmt;
    const taxAmt = Math.round(supplyAmt * 0.1);
    return {
      id: INVOICE_IDS_315[idx % INVOICE_IDS_315.length],
      shipper: SHIPPER_ROW_DATA_315[idx % SHIPPER_ROW_DATA_315.length],
      group: getShipperGroup315(idx),
      bizNo: BIZ_NOS_315[idx % BIZ_NOS_315.length],
      orderCount: (idx % 5 + 2) + '건',
      period,
      creationDate: getCreationDate315(idx),
      payDeadline: '26.08.13',
      chargeAmt,
      adjAmt,
      supplyAmt,
      taxAmt,
      totalAmt: supplyAmt + taxAmt,
    };
  });

  const totalSupply = rows.reduce((s, r) => s + r.supplyAmt, 0);
  const totalTax = rows.reduce((s, r) => s + r.taxAmt, 0);
  const totalAmt = totalSupply + totalTax;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const NUMERIC_KEYS = new Set(['chargeAmt','adjAmt','supplyAmt','taxAmt','totalAmt']);
  const COLS: { label: string; w: number; key: keyof typeof rows[0] }[] = [
    { label: '거래명세서ID', w: 120, key: 'id' },
    { label: '화주사', w: 100, key: 'shipper' },
    { label: '화주사 업무그룹', w: 120, key: 'group' },
    { label: '사업자번호', w: 110, key: 'bizNo' },
    { label: '총 오더 수', w: 80, key: 'orderCount' },
    { label: '정산기간', w: 140, key: 'period' },
    { label: '계산서 작성일자', w: 110, key: 'creationDate' },
    { label: '수금기한', w: 90, key: 'payDeadline' },
    { label: '청구금액 합계', w: 110, key: 'chargeAmt' },
    { label: '조정금액 합계', w: 110, key: 'adjAmt' },
    { label: '공급가액', w: 100, key: 'supplyAmt' },
    { label: '세액', w: 90, key: 'taxAmt' },
    { label: '합계 금액', w: 110, key: 'totalAmt' },
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ width: 1600, height: 800, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', ...F }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>매출 거래명세서 확정</span>
            <div onClick={onClose} style={{ cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height: 1, background: '#E4E5E9', marginLeft: -24, marginRight: -24 }}/>
        </div>
        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
          {/* Left: Table area */}
          <div style={{ flex: 1, minWidth: 0, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <div style={{ minWidth: 'max-content' }}>
                <div style={{ display: 'flex', background: '#F6F7F8', position: 'sticky', top: 0, zIndex: 1 }}>
                  {COLS.map((col, ci) => {
                    const isRight = NUMERIC_KEYS.has(col.key as string) || col.key === 'orderCount';
                    return (
                      <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '8px', height: 40, display: 'flex', alignItems: 'center', justifyContent: isRight ? 'flex-end' : 'flex-start', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}) }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                      </div>
                    );
                  })}
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex' }} onMouseEnter={() => setHoveredModalRow(ri)} onMouseLeave={() => setHoveredModalRow(null)}>
                    {COLS.map((col, ci) => {
                      const val = row[col.key];
                      const isNumeric = NUMERIC_KEYS.has(col.key as string);
                      const isRight = isNumeric || col.key === 'orderCount';
                      const display = isNumeric ? (val as number).toLocaleString('ko-KR') + '원' : String(val);
                      return (
                        <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '10px 8px', height: 40, display: 'flex', alignItems: 'center', justifyContent: isRight ? 'flex-end' : 'flex-start', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}), backgroundColor: hoveredModalRow === ri ? 'rgba(246, 247, 248, 0.5)' : '' }}>
                          <span style={{ fontSize: 15, color: '#2E3238', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Vertical divider */}
          <div style={{ width: 1, background: '#E4E5E9', alignSelf: 'stretch', flexShrink: 0 }}/>
          {/* Right: Summary */}
          <div style={{ width: 400, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box', flexShrink: 0 }}>
            <div style={{ background: '#F6F7F8', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>선택된 거래명세서 수</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{rows.length}건</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>공급가액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(totalSupply)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>세액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(totalTax)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 32 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>합계 금액</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>{fmt(totalAmt)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#E4E5E9' }}/>
          <div style={{ padding: '20px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ ...F, width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#2E3238' }}>취소</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width: 102, height: 52, background: '#005FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>확정하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TaxInvoiceListModal({ onClose, onSuccess, selectedIndices }: { onClose: () => void; onSuccess?: () => void; selectedIndices: number[] }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const [hoveredModalRow, setHoveredModalRow] = useState<number | null>(null);

  const rows = selectedIndices.map(idx => {
    const startDate = getCreationDate315(idx);
    const [sy, sm, sd] = startDate.split('.').map(Number);
    const startDateObj = new Date(2000 + sy, sm - 1, sd);
    const endDateObj = new Date(startDateObj.getTime() + 5 * 86400000);
    const endDate = `${String(endDateObj.getFullYear()).slice(-2)}.${pad2(endDateObj.getMonth() + 1)}.${pad2(endDateObj.getDate())}`;
    const period = `${startDate} ~ ${endDate}`;
    const chargeAmt = 380000 + (idx % 5) * 20000;
    const adjAmt = 10000;
    const supplyAmt = chargeAmt + adjAmt;
    const taxAmt = Math.round(supplyAmt * 0.1);
    return {
      id: INVOICE_IDS_315[idx % INVOICE_IDS_315.length],
      shipper: SHIPPER_ROW_DATA_315[idx % SHIPPER_ROW_DATA_315.length],
      group: getShipperGroup315(idx),
      bizNo: BIZ_NOS_315[idx % BIZ_NOS_315.length],
      orderCount: (idx % 5 + 2) + '건',
      period,
      creationDate: getCreationDate315(idx),
      payDeadline: '26.08.13',
      chargeAmt,
      adjAmt,
      supplyAmt,
      taxAmt,
      totalAmt: supplyAmt + taxAmt,
    };
  });

  const totalSupply = rows.reduce((s, r) => s + r.supplyAmt, 0);
  const totalTax = rows.reduce((s, r) => s + r.taxAmt, 0);
  const totalAmt = totalSupply + totalTax;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const NUMERIC_KEYS = new Set(['chargeAmt','adjAmt','supplyAmt','taxAmt','totalAmt']);
  const COLS: { label: string; w: number; key: keyof typeof rows[0] }[] = [
    { label: '거래명세서ID', w: 120, key: 'id' },
    { label: '화주사', w: 100, key: 'shipper' },
    { label: '화주사 업무그룹', w: 120, key: 'group' },
    { label: '사업자번호', w: 110, key: 'bizNo' },
    { label: '총 오더 수', w: 80, key: 'orderCount' },
    { label: '정산기간', w: 140, key: 'period' },
    { label: '계산서 작성일자', w: 110, key: 'creationDate' },
    { label: '수금기한', w: 90, key: 'payDeadline' },
    { label: '청구금액 합계', w: 110, key: 'chargeAmt' },
    { label: '조정금액 합계', w: 110, key: 'adjAmt' },
    { label: '공급가액', w: 100, key: 'supplyAmt' },
    { label: '세액', w: 90, key: 'taxAmt' },
    { label: '합계 금액', w: 110, key: 'totalAmt' },
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ width: 1600, height: 800, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', ...F }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>세금계산서 발행 요청</span>
            <div onClick={onClose} style={{ cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height: 1, background: '#E4E5E9', marginLeft: -24, marginRight: -24 }}/>
        </div>
        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0 }}>
          {/* Left: Table area */}
          <div style={{ flex: 1, minWidth: 0, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <div style={{ minWidth: 'max-content' }}>
                <div style={{ display: 'flex', background: '#F6F7F8', position: 'sticky', top: 0, zIndex: 1 }}>
                  {COLS.map((col, ci) => {
                    const isRight = NUMERIC_KEYS.has(col.key as string) || col.key === 'orderCount';
                    return (
                      <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '8px', height: 40, display: 'flex', alignItems: 'center', justifyContent: isRight ? 'flex-end' : 'flex-start', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}) }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                      </div>
                    );
                  })}
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex' }} onMouseEnter={() => setHoveredModalRow(ri)} onMouseLeave={() => setHoveredModalRow(null)}>
                    {COLS.map((col, ci) => {
                      const val = row[col.key];
                      const isNumeric = NUMERIC_KEYS.has(col.key as string);
                      const isRight = isNumeric || col.key === 'orderCount';
                      const display = isNumeric ? (val as number).toLocaleString('ko-KR') + '원' : String(val);
                      return (
                        <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '10px 8px', height: 40, display: 'flex', alignItems: 'center', justifyContent: isRight ? 'flex-end' : 'flex-start', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}), backgroundColor: hoveredModalRow === ri ? 'rgba(246, 247, 248, 0.5)' : '' }}>
                          <span style={{ fontSize: 15, color: '#2E3238', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Vertical divider */}
          <div style={{ width: 1, background: '#E4E5E9', alignSelf: 'stretch', flexShrink: 0 }}/>
          {/* Right: Date picker + Summary */}
          <div style={{ width: 400, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box', flexShrink: 0 }}>
            {/* Date picker row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>계산서 작성일자</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E4E5E9', borderRadius: 4, padding: '6px 10px', width: 160, height: 36, boxSizing: 'border-box', background: '#F6F7F8' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="1" y="2.5" width="14" height="12.5" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
                  <line x1="1" y1="6" x2="15" y2="6" stroke="#9197A1" strokeWidth="1.3"/>
                  <line x1="5" y1="1" x2="5" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                  <line x1="11" y1="1" x2="11" y2="4" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 15, color: '#2E3238', lineHeight: '22px', flex: 1 }}>{todayYYMMDD()}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {/* Summary gray box */}
            <div style={{ background: '#F6F7F8', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>선택된 거래명세서 수</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{rows.length}건</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>공급가액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(totalSupply)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>세액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(totalTax)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 32 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>합계 금액</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>{fmt(totalAmt)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#E4E5E9' }}/>
          <div style={{ padding: '20px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ ...F, width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#2E3238' }}>취소</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width: 102, height: 52, background: '#005FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>발행하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const BIZ_NOS_315 = [
  '138-28-01123','220-81-33456','104-86-54321','123-45-67890','317-81-12345',
  '206-81-99887','511-81-23456','101-86-75432','234-56-78901','456-78-90123',
];

function CalendarDropdown315({ anchorRect, value, onChange, onClose }: {
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

function ManualInvoiceRegisterModal315({ onClose, selectedIdx, onSuccess }: { onClose: () => void; selectedIdx: number; onSuccess?: () => void }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const invoiceId = INVOICE_IDS_315[selectedIdx] || `INV-${selectedIdx + 1}`;
  const shipper = SHIPPER_ROW_DATA_315[selectedIdx % SHIPPER_ROW_DATA_315.length];
  const shipperGroupStr = getShipperGroup315(selectedIdx);
  const bizNo = BIZ_NOS_315[selectedIdx % BIZ_NOS_315.length];
  const startDate = getCreationDate315(selectedIdx);
  // Add ~5 days to start for end date
  const [sy, sm, sd] = startDate.split('.').map(Number);
  const startDateObj = new Date(2000 + sy, sm - 1, sd);
  const endDateObj = new Date(startDateObj.getTime() + 5 * 86400000);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const endDate = `${String(endDateObj.getFullYear()).slice(-2)}.${pad2(endDateObj.getMonth() + 1)}.${pad2(endDateObj.getDate())}`;
  const period = `${startDate} ~ ${endDate}`;

  const chargeAmt = 380000 + (selectedIdx % 5) * 20000;
  const adjAmt = 10000;
  const supplyAmt = chargeAmt + adjAmt;
  const taxAmt = Math.round(supplyAmt * 0.1);
  const totalAmt = supplyAmt + taxAmt;
  const orderCount = 2;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const [dateValues, setDateValues] = useState({ 작성: todayYYMMDD(), 확인: '26.07.01', 수금: '26.08.13' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // 정산기간 날짜 선택
  const [periodStart, setPeriodStart] = useState(startDate);
  const [periodEnd, setPeriodEnd] = useState(endDate);
  const periodStr = `${periodStart} ~ ${periodEnd}`;
  const [openPeriodCal, setOpenPeriodCal] = useState<'start' | 'end' | null>(null);
  const [periodAnchorRect, setPeriodAnchorRect] = useState<DOMRect | null>(null);

  const calIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="5" y1="1.5" x2="5" y2="4.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="1.5" x2="11" y2="4.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="2" y1="7" x2="14" y2="7" stroke="#9197A1" strokeWidth="1.3"/>
    </svg>
  );

  return (createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ width: 881, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', ...F }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>수기계산서 등록</span>
            <div onClick={onClose} style={{ cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ height: 1, background: '#E4E5E9', marginLeft: -24, marginRight: -24 }}/>
        </div>

        {/* Body: two columns */}
        <div style={{ display: 'flex', flexDirection: 'row', height: 453 }}>

          {/* Left (480px): info rows */}
          <div style={{ width: 480, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>거래명세서ID</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', width: 300 }}>{invoiceId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>화주사</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', width: 300 }}>{shipper}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 7, paddingBottom: 7 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>화주사 업무그룹</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', width: 300 }}>{shipperGroupStr}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>사업자번호</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', width: 300 }}>{bizNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>정산기간</span>
              <div
                onClick={e => {
                  if (openPeriodCal) { setOpenPeriodCal(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  setPeriodAnchorRect(r);
                  setOpenPeriodCal('start');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${openPeriodCal ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '0 10px', width: 300, height: 36, boxSizing: 'border-box', cursor: 'pointer', background: '#FFFFFF' }}
              >
                {calIcon}
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', flex: 1 }}>{periodStr}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: openPeriodCal ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {openPeriodCal === 'start' && periodAnchorRect && (
                <CalendarDropdown315
                  anchorRect={periodAnchorRect}
                  value={periodStart}
                  onChange={v => { setPeriodStart(v); setOpenPeriodCal('end'); }}
                  onClose={() => setOpenPeriodCal(null)}
                />
              )}
              {openPeriodCal === 'end' && periodAnchorRect && (
                <CalendarDropdown315
                  anchorRect={periodAnchorRect}
                  value={periodEnd}
                  onChange={v => { setPeriodEnd(v); setOpenPeriodCal(null); }}
                  onClose={() => setOpenPeriodCal(null)}
                />
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, background: '#E4E5E9', alignSelf: 'stretch', flexShrink: 0 }}/>

          {/* Right: date pickers + summary */}
          <div style={{ flex: 1, minWidth: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>

            {/* 3 date picker rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { label: '계산서 작성일자', key: '작성' },
                { label: '계산서 확인일자', key: '확인' },
                { label: '수금기한', key: '수금' },
              ] as { label: string; key: keyof typeof dateValues }[]).map(({ label, key }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
                  <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', flexShrink: 0 }}>{label}</span>
                  <div onClick={e => { if (openCal === key) { setOpenCal(null); } else { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpenCal(key); } }} style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${openCal === key ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '6px 10px', width: 160, height: 36, boxSizing: 'border-box', cursor: 'pointer' }}>
                    {calIcon}
                    <span style={{ fontSize: 15, color: '#2E3238', lineHeight: '22px', flex: 1 }}>{dateValues[key]}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transform: openCal === key ? 'rotate(180deg)' : undefined }}>
                      <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            {openCal && anchorRect && <CalendarDropdown315 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => { setDateValues(prev => ({ ...prev, [openCal]: v })); setOpenCal(null); }} onClose={() => setOpenCal(null)} />}

            {/* Summary gray box */}
            <div style={{ background: '#F6F7F8', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>선택된 거래명세서 수</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>1건</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>청구금액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(chargeAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>조정금액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(adjAmt)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>공급가액</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(supplyAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>세액</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(taxAmt)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 32 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>합계 금액</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>{fmt(totalAmt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#E4E5E9' }}/>
          <div style={{ padding: '20px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ ...F, width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#2E3238' }}>닫기</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width: 102, height: 52, background: '#005FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>등록하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ));
}

function Frame369() {
  const { selectedRows, confirmedIndices, addConfirmedIndices, addIssuedIndices, clearSelectedRows } = useContext(TableCtrlCtx);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(false), 4000);
    return () => clearTimeout(t);
  }, [successToast]);
  const [errorToast, setErrorToast] = useState(false);
  const [statusErrorToast, setStatusErrorToast] = useState(false);

  useEffect(() => {
    if (!errorToast) return;
    const t = setTimeout(() => setErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [errorToast]);

  useEffect(() => {
    if (!statusErrorToast) return;
    const t = setTimeout(() => setStatusErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [statusErrorToast]);

  const [taxInvoiceOpen, setTaxInvoiceOpen] = useState(false);
  const [taxErrorToast, setTaxErrorToast] = useState(false);
  const [taxStatusErrorToast, setTaxStatusErrorToast] = useState(false);
  const [taxSuccessToast, setTaxSuccessToast] = useState(false);
  const [taxSuccessCount, setTaxSuccessCount] = useState(0);

  useEffect(() => {
    if (!taxErrorToast) return;
    const t = setTimeout(() => setTaxErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [taxErrorToast]);

  useEffect(() => {
    if (!taxStatusErrorToast) return;
    const t = setTimeout(() => setTaxStatusErrorToast(false), 4000);
    return () => clearTimeout(t);
  }, [taxStatusErrorToast]);

  useEffect(() => {
    if (!taxSuccessToast) return;
    const t = setTimeout(() => setTaxSuccessToast(false), 4000);
    return () => clearTimeout(t);
  }, [taxSuccessToast]);

  const [manualRegOpen, setManualRegOpen] = useState(false);
  const [manualRegIdx, setManualRegIdx] = useState(0);
  const [showManualSuccessToast, setShowManualSuccessToast] = useState(false);
  React.useEffect(() => { if (!showManualSuccessToast) return; const t = setTimeout(() => setShowManualSuccessToast(false), 3000); return () => clearTimeout(t); }, [showManualSuccessToast]);
  const [tooManyToast, setTooManyToast] = useState(false);
  const [wrongStatusToastReg, setWrongStatusToastReg] = useState(false);

  useEffect(() => {
    if (!tooManyToast) return;
    const t = setTimeout(() => setTooManyToast(false), 4000);
    return () => clearTimeout(t);
  }, [tooManyToast]);

  useEffect(() => {
    if (!wrongStatusToastReg) return;
    const t = setTimeout(() => setWrongStatusToastReg(false), 4000);
    return () => clearTimeout(t);
  }, [wrongStatusToastReg]);

  const handleManualReg = () => {
    if (selectedRows.size === 0) { setErrorToast(true); return; }
    if (selectedRows.size > 1) { setTooManyToast(true); return; }
    const idx = [...selectedRows][0];
    const s = confirmedIndices.has(idx) ? '발행대기' : ROW_STATUSES_315[idx % ROW_STATUSES_315.length];
    if (s !== '발행대기') { setWrongStatusToastReg(true); return; }
    setManualRegIdx(idx);
    setManualRegOpen(true);
  };

  const handleTaxInvoice = () => {
    if (selectedRows.size === 0) { setTaxErrorToast(true); return; }
    const hasNonIssueWait = [...selectedRows].some(i => {
      const s = confirmedIndices.has(i) ? '발행대기' : ROW_STATUSES_315[i % ROW_STATUSES_315.length];
      return s !== '발행대기';
    });
    if (hasNonIssueWait) { setTaxStatusErrorToast(true); return; }
    setTaxInvoiceOpen(true);
  };

  const handleConfirm = () => {
    if (selectedRows.size === 0) { setErrorToast(true); return; }
    const hasNonConfirmWait = [...selectedRows].some(i => (confirmedIndices.has(i) ? '발행대기' : ROW_STATUSES_315[i % ROW_STATUSES_315.length]) !== '확정대기');
    if (hasNonConfirmWait) { setStatusErrorToast(true); return; }
    setConfirmOpen(true);
  };

  return (
    <>
    <div className="content-stretch flex gap-[4px] h-[36px] items-center relative shrink-0">
      <div className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleConfirm} style={{ cursor: 'pointer' }}>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">거래명세서 확정</p>
        </div>
      </div>
      <div className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleTaxInvoice} style={{ cursor: 'pointer' }}>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">세금계산서 발행</p>
        </div>
      </div>
      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleManualReg} style={{ cursor: 'pointer' }}>
        <div className="content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">수기계산서 등록</p>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
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
    {confirmOpen && <ConfirmInvoiceListModal onClose={() => setConfirmOpen(false)} onSuccess={() => { addConfirmedIndices(selectedRows); clearSelectedRows(); setSuccessToast(true); }} selectedIndices={[...selectedRows]} />}
    {taxInvoiceOpen && <TaxInvoiceListModal onClose={() => setTaxInvoiceOpen(false)} onSuccess={() => { setTaxSuccessCount(selectedRows.size); setTaxSuccessToast(true); }} selectedIndices={[...selectedRows]} />}
    {successToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#222222' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px', flex: 1 }}>거래명세서가 확정되었습니다.</span>
        <ToastCloseBtn315 onClose={() => setSuccessToast(false)} />
      </div>
    </>, document.body)}
    {errorToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838', height: 76, padding: '16px 20px', gap: 16, alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '22px', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>선택한 거래명세서가 없습니다. 거래명세서 선택 후 다시 클릭해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setErrorToast(false)} />
      </div>
    </>, document.body)}
    {statusErrorToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>확정대기 상태인 거래명세서를 선택해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setStatusErrorToast(false)} />
      </div>
    </>, document.body)}
    {taxSuccessToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#222222' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px', flex: 1 }}>{taxSuccessCount}건의 세금계산서가 발행되었습니다.</span>
        <ToastCloseBtn315 onClose={() => setTaxSuccessToast(false)} />
      </div>
    </>, document.body)}
    {taxErrorToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838', height: 'auto', padding: '16px 20px', gap: 16, alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '22px', flex: 1 }}>선택한 거래명세서가 없습니다.<br />거래명세서 선택 후 다시 클릭해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setTaxErrorToast(false)} />
      </div>
    </>, document.body)}
    {taxStatusErrorToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>발행대기 상태인 거래명세서를 선택해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setTaxStatusErrorToast(false)} />
      </div>
    </>, document.body)}
    {manualRegOpen && <ManualInvoiceRegisterModal315 onClose={() => setManualRegOpen(false)} selectedIdx={manualRegIdx} onSuccess={() => { addConfirmedIndices(new Set([manualRegIdx])); addIssuedIndices(new Set([manualRegIdx])); setTaxSuccessToast(false); clearSelectedRows(); setShowManualSuccessToast(true); }} />}
    {showManualSuccessToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#222222' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px', flex: 1 }}>수기계산서가 등록되었습니다.</span>
        <ToastCloseBtn315 onClose={() => setShowManualSuccessToast(false)} />
      </div>
    </>, document.body)}
    {tooManyToast && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838', height: 76, padding: '16px 20px', gap: 16, alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '22px', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>수기계산서를 등록하려면 1개의 거래명세서만 선택해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setTooManyToast(false)} />
      </div>
    </>, document.body)}
    {wrongStatusToastReg && createPortal(<>
      <style>{TOAST_ANIMATION_315}</style>
      <div style={{ ...TOAST_STYLE_315, background: '#E13838' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px' }}>발행대기 상태의 거래명세서를 선택해 주세요.</span>
        <ToastCloseBtn315 onClose={() => setWrongStatusToastReg(false)} />
      </div>
    </>, document.body)}
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
            <p className="leading-[22px]">화주사 별칭</p>
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
      <div className="mr-[-1px] relative shrink-0 w-[108px]" data-name="Input / 02. Selectbox">
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

const TableCtrlCtx = createContext<{
  filteredTotal: number; selectedCount: number; selectedRows: Set<number>;
  confirmedIndices: Set<number>; addConfirmedIndices: (indices: Set<number>) => void;
  issuedIndices: Set<number>; addIssuedIndices: (indices: Set<number>) => void;
  paidIndices: Set<number>;
  clearSelectedRows: () => void;
}>({ filteredTotal: 300, selectedCount: 0, selectedRows: new Set(), confirmedIndices: new Set(), addConfirmedIndices: () => {}, issuedIndices: new Set(), addIssuedIndices: () => {}, paidIndices: new Set(), clearSelectedRows: () => {} });

function Frame371() {
  const { filteredTotal, selectedCount } = useContext(TableCtrlCtx);
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <Frame369 />
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
      <Frame371 />
      <Group3 />
    </div>
  );
}

function Frame373() {
  return (
    <div className="relative shrink-0">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center p-[8px] relative shrink-0 w-[34px] sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center px-[8px] py-[10px] relative shrink-0 w-[34px]" data-name="Table_Data Cells">
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
            <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls">
              <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-r border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Title7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서 상태</p>
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

// 배지 컬럼(거래명세서 상태) - 20개 데이터 셀 템플릿을 상태별로 순환 (Con()의 SRC 매핑이 인덱스 0/6/11/13을 클론 소스로 사용)
const BADGE_STATUS_SEQUENCE_315 = [
  "확정대기","확정대기","확정대기","확정대기","확정대기","확정대기",
  "발행대기","발행대기","발행대기","발행대기","발행대기",
  "수금대기","수금대기",
  "수금완료","수금완료","수금완료","수금완료","수금완료","수금완료","수금완료",
];
const BADGE_STYLE_315: Record<string, { bg: string; text: string }> = {
  "확정대기": { bg: "#fce9e9", text: "#dd2222" },
  "발행대기": { bg: "#ebedef", text: "#454b55" },
  "수금대기": { bg: "#e4fbeb", text: "#18ac42" },
  "수금완료": { bg: "#e6efff", text: "#005fff" },
};

function Frame391() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame4 />
            </div>
          </div>
        </div>
        {BADGE_STATUS_SEQUENCE_315.map((status, i) => {
          const style = BADGE_STYLE_315[status];
          return (
            <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
              <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
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
        })}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서 생성일자</p>
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

function UnderlineTextDataCell315({ text }: { text: string }) {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{text}</p>
      </div>
    </div>
  );
}

function PlainTextDataCell315({ text }: { text: string }) {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{text}</p>
      </div>
    </div>
  );
}

function Frame392() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame5 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <UnderlineTextDataCell315 text={`25.10.20 `} />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title9() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서ID</p>
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

function Frame374() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
                  <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                    <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">QWE5678</p>
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function ColGeneration315() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서 생성처</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
                  <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                    <p className="leading-[22px] overflow-hidden text-ellipsis">자사</p>
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사</p>
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

function Frame375() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame47 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="(주)글로벌로지스" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">화주사 업무그룹</p>
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

function Frame376() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="판교본사" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title12() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">정산기간</p>
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

function Frame380() {
  return (
    <div className="relative shrink-0 w-[160px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame91 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="26.05.07 ~ 26.05.12" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">총 오더 수</p>
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

function Frame387() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame112 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="2건" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">청구금액 합계</p>
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

function Frame377() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame133 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="300,000" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">조정금액 합계</p>
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

function Frame388() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="300,000" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title16() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">공급가액</p>
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

function Frame389() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame175 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="300,000" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title17() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">세액</p>
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

function Frame378() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="30,000" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title18() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">합계 금액</p>
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

function Frame385() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="330,000" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">미수금액</p>
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

function Frame379() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame239 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text="1,880" />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title20() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">수금액</p>
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

// 수금액 컬럼: 19번째 데이터 셀(0-based index 18)만 예외적으로 밑줄 없는 일부수금 값(328,120)
function Frame386() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame260 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                {i === 18
                  ? <PlainTextDataCell315 text="328,120" />
                  : <UnderlineTextDataCell315 text="330,000" />}
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title21() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 작성일자</p>
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

function Frame390() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame283 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <UnderlineTextDataCell315 text={`25.10.20 `} />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title22() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">계산서 발행일자</p>
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

function Frame381() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame304 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text={`25.10.20 `} />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title23() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">수금기한</p>
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

function Frame382() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame325 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <PlainTextDataCell315 text={`25.10.20 `} />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title24() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">수금일</p>
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

function Frame383() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <Frame346 />
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <UnderlineTextDataCell315 text={`25.10.20 `} />
              </div>
            </div>
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">개별 액셀 저장</p>
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

function Frame384() {
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
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
            <div className="flex flex-row items-center justify-center size-full">
              <div className="content-stretch flex items-center justify-center px-[8px] py-[10px] relative size-full">
                <div className="content-stretch flex flex-col items-center justify-center relative rounded-[4px] shrink-0 size-[36px]" data-name="Button">
                  <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Icon_16/download">
                    <div className="absolute inset-[16.67%]" data-name="Vector">
                      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 10.6667">
                        <path d={svgPaths.p30497100} fill="var(--fill-0, #9197A1)" id="Vector" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Con() {
  const { activeTab } = useContext(MaeChulMyeongseSubTabCtx);
  const isPartnerTab = activeTab === '협력사';
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmedIndices, setConfirmedIndices] = useState<Set<number>>(new Set());
  const [issuedIndices, setIssuedIndices] = useState<Set<number>>(new Set());
  const [paidIndices, setPaidIndices] = useState<Set<number>>(new Set());
  const addConfirmedIndices = (indices: Set<number>) => {
    setConfirmedIndices(prev => new Set([...prev, ...indices]));
    // 확정 후 전체 보기로 전환 → 발행대기가 된 행이 필터에 가려지지 않고 보이도록
    setSelected(new Set([0]));
  };
  const getEffectiveStatus = (i: number, confirmed: Set<number>, issued?: Set<number>, paid?: Set<number>) => {
    const _issued = issued ?? issuedIndices;
    const _paid   = paid   ?? paidIndices;
    if (_paid.has(i))    return '수금완료';
    if (_issued.has(i))  return '수금대기';
    if (confirmed.has(i)) return '발행대기';
    return ROW_STATUSES_315[i % ROW_STATUSES_315.length];
  };
  const handleStatusChange = (rowIdx: number, newStatus: string) => {
    if (newStatus === '발행대기') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
    } else if (newStatus === '수금대기') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
      setIssuedIndices(prev => new Set([...prev, rowIdx]));
    } else if (newStatus === '수금완료') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
      setIssuedIndices(prev => new Set([...prev, rowIdx]));
      setPaidIndices(prev => new Set([...prev, rowIdx]));
    }
    // 상태 변경 후 전체 보기로 전환 → 변경된 행이 필터에 가려지지 않고 보이도록
    setSelected(new Set([0]));
  };
  const [detailData, setDetailData] = useState<{ id: string; status: string; shipper: string; shipperGroup: string; period: string; rowIdx: number } | null>(null);
  const [shipperSelected, setShipperSelected] = useState<Set<number>>(new Set());
  const [originSelected, setOriginSelected] = useState<Set<number>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<Date|null>(_initDate315);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date|null>(new Date(2026,5,29));
  const tableRef = useRef<HTMLDivElement>(null);
  // 원본 Figma 템플릿 셀 캐시 (컬럼 Element를 키로 사용 → 헤더 텍스트 충돌 없음)
  const templateCellsRef = useRef<WeakMap<Element, HTMLElement[]>>(new WeakMap());
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx315);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 300;

  const hiddenRows = useMemo(() => {
    const filterStatuses = selected.has(0) ? null : new Set([...selected].map(i => ITEMS_315[i].label.split(" (")[0]));
    const hidden = new Set<number>();
    const parseYYMMDD315 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo315 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi315 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo315 !== null ? lo315 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const status = getEffectiveStatus(i, confirmedIndices, issuedIndices, paidIndices);
      const statusMatch = filterStatuses === null || filterStatuses.has(status);

      const rowShipper = SHIPPER_ROW_DATA_315[i % SHIPPER_ROW_DATA_315.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => SHIPPERS_315[idx] === rowShipper);

      const rowOrigin = ORIGIN_OPTIONS_315[i % ORIGIN_OPTIONS_315.length];
      const originMatch = originSelected.size === 0 || [...originSelected].some(idx => ORIGIN_OPTIONS_315[idx] === rowOrigin);

      if (!statusMatch || !shipperMatch || !originMatch) { hidden.add(i); continue; }
      if (lo315 !== null) {
        const rowT = parseYYMMDD315(getCreationDate315(i));
        if (rowT < lo315 || rowT > hi315!) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, shipperSelected, originSelected, confirmedIndices, issuedIndices, paidIndices, dateRangeStart, dateRangeEnd]);

  const dynamicCounts = useMemo(() => {
    const counts = new Array(ITEMS_315.length).fill(0);
    let totalAmt = 0;
    const parseYYMMDD315dc = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo315dc = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi315dc = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo315dc !== null ? lo315dc + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowShipper = SHIPPER_ROW_DATA_315[i % SHIPPER_ROW_DATA_315.length];
      const shipperMatch = shipperSelected.size === 0 || [...shipperSelected].some(idx => SHIPPERS_315[idx] === rowShipper);
      if (!shipperMatch) continue;
      const rowOrigin = ORIGIN_OPTIONS_315[i % ORIGIN_OPTIONS_315.length];
      const originMatch = originSelected.size === 0 || [...originSelected].some(idx => ORIGIN_OPTIONS_315[idx] === rowOrigin);
      if (!originMatch) continue;
      if (lo315dc !== null) {
        const rowT = parseYYMMDD315dc(getCreationDate315(i));
        if (rowT < lo315dc || rowT > hi315dc!) continue;
      }
      const status = ROW_STATUSES_315[i % ROW_STATUSES_315.length];
      counts[0]++;
      totalAmt += PER_ROW_AMOUNT_315[status] ?? 0;
      for (let si = 1; si < ITEMS_315.length; si++) {
        if (ITEMS_315[si].label.split(' (')[0] === status) counts[si]++;
      }
    }
    return { statusCounts: counts, totalAmount: isPartnerTab ? Math.round(totalAmt * 0.54) : totalAmt };
  }, [shipperSelected, originSelected, dateRangeStart, dateRangeEnd, isPartnerTab]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
      const cells = Array.from(col.querySelectorAll<HTMLElement>('[data-name="Table_Data Cells"]'));
      if (!cells.length) return;
      const parent = cells[0].parentElement!;
      const SRC: Record<string, number> = { '확정대기': 0, '발행대기': 6, '수금대기': 11, '수금완료': 13 };
      const headerText = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim();
      const isInvoiceIdCol = headerText === '거래명세서ID';
      const isShipperCol = isPartnerTab ? headerText === '협력사' : headerText === '화주사';
      const isShipperGroupCol = isPartnerTab ? headerText === '협력사 업무그룹' : headerText === '화주사 업무그룹';
      const isOriginCol = headerText === '거래명세서 생성처';
      const isCreationDateCol = headerText === '거래명세서 생성일자';
      // 컬럼 Element를 키로 원본 Figma 템플릿 셀 최초 1회 캐싱
      if (!templateCellsRef.current.has(col)) {
        templateCellsRef.current.set(col, cells.map(c => c.cloneNode(true) as HTMLElement));
      }
      const tmplCells = templateCellsRef.current.get(col)!;
      cells.forEach((c) => parent.removeChild(c));
      const sortedIndices = Array.from({ length: TOTAL_ROWS }, (_, i) => i).sort((a, b) => {
        const da = getCreationDateIdx315(a);
        const db = getCreationDateIdx315(b);
        if (da !== db) return da - db;
        const sa = STATUS_PRIORITY_315[getEffectiveStatus(a, confirmedIndices, issuedIndices, paidIndices)] ?? 99;
        const sb = STATUS_PRIORITY_315[getEffectiveStatus(b, confirmedIndices, issuedIndices, paidIndices)] ?? 99;
        return sa !== sb ? sa - sb : a - b;
      });
      for (const origIdx of sortedIndices) {
        const s = getEffectiveStatus(origIdx, confirmedIndices, issuedIndices, paidIndices);
        const srcIdx = SRC[s] ?? (origIdx % tmplCells.length);
        const cell = (tmplCells[srcIdx]?.cloneNode(true) ?? tmplCells[0].cloneNode(true)) as HTMLElement;
        cell.dataset.tableRow = String(origIdx);
        if (isShipperCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = SHIPPER_ROW_DATA_315[origIdx % SHIPPER_ROW_DATA_315.length];
        }
        if (isShipperGroupCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = getShipperGroup315(origIdx);
        }
        if (isOriginCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = ORIGIN_OPTIONS_315[origIdx % ORIGIN_OPTIONS_315.length];
        }
        if (isCreationDateCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = getCreationDate315(origIdx);
        }
        if (isInvoiceIdCol) {
          const p = cell.querySelector('p');
          if (p) {
            p.textContent = INVOICE_IDS_315[origIdx];
            p.style.cursor = 'pointer';
            p.style.textDecoration = 'underline';
            const rowIdx = origIdx;
            p.addEventListener('click', (e) => {
              const id = (e.currentTarget as HTMLElement).textContent?.trim() ?? '';
              const status = getEffectiveStatus(rowIdx, confirmedIndices, issuedIndices, paidIndices);
              let shipper = '', shipperGroup = '', period = '';
              if (tableRef.current) {
                tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
                  const header = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim() ?? '';
                  const rowCell = col.querySelector(`[data-table-row="${rowIdx}"]`);
                  const value = rowCell?.querySelector('p')?.textContent?.trim() ?? '';
                  if (header === '화주사') shipper = value;
                  else if (header === '화주사 업무그룹') shipperGroup = value;
                  else if (header === '정산기간') period = value;
                });
              }
              setDetailData({ id, status, shipper, shipperGroup, period, rowIdx });
            });
          }
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
    // 협력사 탭: 헤더 텍스트 교체
    if (isPartnerTab) {
      tableRef.current.querySelectorAll<HTMLElement>('[data-name="Table_Header Cells"]').forEach(header => {
        const p = header.querySelector('p');
        if (!p) return;
        if (p.textContent?.trim() === '화주사') p.textContent = '협력사';
        if (p.textContent?.trim() === '화주사 업무그룹') p.textContent = '협력사 업무그룹';
      });
    } else {
      tableRef.current.querySelectorAll<HTMLElement>('[data-name="Table_Header Cells"]').forEach(header => {
        const p = header.querySelector('p');
        if (!p) return;
        if (p.textContent?.trim() === '협력사') p.textContent = '화주사';
        if (p.textContent?.trim() === '협력사 업무그룹') p.textContent = '화주사 업무그룹';
      });
    }
  }, [confirmedIndices, issuedIndices, paidIndices, isPartnerTab]);
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
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    tableRef.current.querySelectorAll<HTMLElement>('[data-table-row]').forEach((cell) => {
      const row = Number(cell.dataset.tableRow);
      cell.style.display = (!hiddenRows.has(row) && row >= start && row < end) ? '' : 'none';
    });
  }, [hiddenRows, currentPage]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [currentPage]);

  return (
    <>
    <DateFilterCtx315.Provider value={{ rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd }}>
    <BubbleCtx315.Provider value={{ shipperSelected, setShipperSelected, originSelected, setOriginSelected }}>
    <DynamicCountCtx315.Provider value={dynamicCounts}>
    <FilterCtx315.Provider value={{ selected, setSelected }}>
    <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size, selectedRows, confirmedIndices, addConfirmedIndices, issuedIndices, addIssuedIndices: (indices: Set<number>) => setIssuedIndices(prev => new Set([...prev, ...indices])), paidIndices, clearSelectedRows: () => setSelectedRows(new Set()) }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center pt-[4px] px-[32px] relative size-full">
          <Frame3 />
          <FilterSorterModule />
          <TasaBanner />
          <Frame406 />
          <TableControlModule />
          <div className="content-stretch flex items-start relative shrink-0 w-[1648px] h-[840px] overflow-auto pb-[120px]" data-name="매출거래명세서표_화주사" ref={tableRef}>
            <Frame373 />
            <Frame391 />
            <Frame392 />
            <Frame374 />
            <ColGeneration315 />
            <Frame375 />
            <Frame376 />
            <Frame380 />
            <Frame387 />
            <Frame377 />
            <Frame388 />
            <Frame389 />
            <Frame378 />
            <Frame385 />
            <Frame379 />
            <Frame386 />
            <Frame390 />
            <Frame381 />
            <Frame382 />
            <Frame383 />
            <Frame384 />
          </div>
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx315.Provider>
    </DynamicCountCtx315.Provider>
    </BubbleCtx315.Provider>
    </DateFilterCtx315.Provider>
    {detailData && createPortal(
      <ScaledOverlay>
        <InvoiceDetail
          invoiceId={detailData.id}
          rowStatus={detailData.status}
          shipper={detailData.shipper}
          shipperGroup={detailData.shipperGroup}
          period={detailData.period}
          onStatusChange={(newStatus) => handleStatusChange(detailData.rowIdx, newStatus)}
          onClose={() => setDetailData(null)}
        />
      </ScaledOverlay>,
      document.body
    )}
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
  const { currentPage, filteredTotal } = useContext(PageCtx315);
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
  const { currentPage, setCurrentPage, filteredTotal } = useContext(PageCtx315);
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

function Frame394() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(300);
  return (
    <PageCtx315.Provider value={{ currentPage, setCurrentPage, filteredTotal, setFilteredTotal }}>
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
    </PageCtx315.Provider>
  );
}

function Right() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-[1180px] relative" data-name="right">
      <div className="bg-white content-stretch flex h-[82px] items-center px-[32px] relative shrink-0 w-[1712px]" data-name>
        <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        <Frame370 />
      </div>
      <Frame394 />
    </div>
  );
}

function Ui() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] items-start min-h-px overflow-clip relative w-full" data-name="통합장부 / UI">
      <SharedLnb activeTabIndex={3} />
      <Right />
    </div>
  );
}

export default function Component12() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.5 매출 거래명세서_화주사">
      <Ui />
    </div>
  );
}