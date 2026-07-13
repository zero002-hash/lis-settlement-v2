import { todayYYMMDD } from '../../utils/date';
import React, { useState, createContext, useContext, useMemo, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import svgPaths from "./svg-z7kezakb83";
import { MaeIpMyeongseSubTabCtx, type MaeIpMyeongseSubTab } from "../shared/subTabCtx";
import SharedLnb from "../shared/SharedLnb";
import InvoiceDetail from "../315매출거래명세서화주사/detail";

const DESIGN_W = 1920, DESIGN_H = 1080;
function ScaledOverlay({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() => window.innerWidth / DESIGN_W);
  useEffect(() => {
    const u = () => setScale(window.innerWidth / DESIGN_W);
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, overflow:'hidden', background:'#fff' }}>
      <div style={{ width:DESIGN_W, height:DESIGN_H, transform:`scale(${scale})`, transformOrigin:'top left' }}>
        {children}
      </div>
    </div>
  );
}

const ROW_STATUSES_316 = ["확정대기","확정대기","발행대기","지급대기","지급대기","지급대기","지급완료","지급완료","지급완료","지급완료"];
const STATUS_PRIORITY_316: Record<string, number> = { '확정대기': 0, '발행대기': 1, '지급대기': 2, '지급완료': 3 };

const CREATION_DATES_316 = [
  '26.05.01','26.05.04','26.05.06','26.05.08','26.05.11','26.05.13','26.05.15',
  '26.05.18','26.05.20','26.05.22','26.05.25','26.05.27','26.05.29',
  '26.06.01','26.06.03','26.06.05','26.06.08','26.06.10','26.06.12','26.06.15',
  '26.06.17','26.06.19','26.06.22','26.06.24','26.06.25','26.06.26',todayYYMMDD(),
];
const getCreationDateIdx316 = (i: number) => {
  let h = i ^ (i >>> 13); h = Math.imul(h, 0x9e3779b9 | 0); h ^= h >>> 11;
  return ((h >>> 0) % CREATION_DATES_316.length + CREATION_DATES_316.length) % CREATION_DATES_316.length;
};
const getCreationDate316 = (i: number) => CREATION_DATES_316[getCreationDateIdx316(i)];

// 5,000개 고유 거래명세서ID (알파벳 3자 + 숫자 4자, seeded LCG, 중복 없음)
const INVOICE_IDS_316 = (() => {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = 0x5678EFAB;
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

interface DateFilterCtxType316 { rangeStart: Date|null; rangeEnd: Date|null; setRangeStart: (d: Date|null) => void; setRangeEnd: (d: Date|null) => void; }
const DateFilterCtx316 = createContext<DateFilterCtxType316>({ rangeStart: null, rangeEnd: null, setRangeStart: () => {}, setRangeEnd: () => {} });

const PageCtx316 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });
const FilterCtx316 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

const ORIGIN_OPTIONS_316 = ['자사', '타사'];

const VEHICLE_TYPES_316 = ['1톤 카고','1톤 카고','2.5톤 카고','1톤 탑차','5톤 카고','1톤 카고','2.5톤 탑차','1톤 카고','5톤 카고','1톤 탑차'];
const CONTACTS_316 = ['010-1234-5678','010-2345-6789','010-3456-7890','010-4567-8901','010-5678-9012','010-6789-0123','010-7890-1234','010-8901-2345','010-9012-3456','010-0123-4567'];

const PARTNER_LIST_316 = ['카모로지스틱스', '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류', '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스'];

interface BubbleCtxType316 { originSelected: Set<number>; setOriginSelected: (s: Set<number>) => void; driverSelected: Set<number>; setDriverSelected: (s: Set<number>) => void; partnerSelected316: Set<number>; setPartnerSelected316: (s: Set<number>) => void; }
const BubbleCtx316 = createContext<BubbleCtxType316>({ originSelected: new Set(), setOriginSelected: () => {}, driverSelected: new Set(), setDriverSelected: () => {}, partnerSelected316: new Set(), setPartnerSelected316: () => {} });

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
  const { selected, setSelected } = useContext(FilterCtx316);
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

  return (
    <div className="flex items-start py-[12px] relative shrink-0 w-full" style={{height: 104}}>
      <div className="bg-[#f6f7f8] rounded-[8px] flex-1 flex flex-col justify-center items-start p-[4px] gap-[12px]" style={{height: 80}}>
        <div className="flex gap-[4px] w-full" style={{height: 72}}>
          {items.map((item, i) => (
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
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[40px] not-italic relative shrink-0 text-[28px] text-black tracking-[-0.56px] whitespace-nowrap">매입 거래명세서</p>
      <Frame368 />
    </div>
  );
}

function Frame395() {
  const { activeTab, setActiveTab } = useContext(MaeIpMyeongseSubTabCtx);
  const tabs: MaeIpMyeongseSubTab[] = ["소속기사", "협력사"];
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

const DATE_TYPE_OPTIONS_316 = ['거래명세서 생성일'] as const;

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
          {DATE_TYPE_OPTIONS_316.map(opt => (
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
          <p className="leading-[20px]">25.03.23 ~ 25.04.23</p>
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

function DateRangeCalendar316_UNUSED({ anchorRect, rangeStart, rangeEnd, onSelect, onClose }: {
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
    if (step === 'start') { setTempStart(date); setTempEnd(null); setStep('end'); }
    else {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5C6370', fontFamily: "'Pretendard GOV', sans-serif" }}>
        <span style={{ padding: '2px 8px', borderRadius: 4, background: step === 'start' ? '#E8F0FF' : '#F6F7F8', color: step === 'start' ? '#005FFF' : '#2E3238', fontWeight: 600 }}>{tempStart ? fmtD(tempStart) : '시작일'}</span>
        <span>~</span>
        <span style={{ padding: '2px 8px', borderRadius: 4, background: step === 'end' ? '#E8F0FF' : '#F6F7F8', color: step === 'end' ? '#005FFF' : '#2E3238', fontWeight: 600 }}>{tempEnd ? fmtD(tempEnd) : '종료일'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={prevMonth} style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M4.5 1L0.5 5L4.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2E3238', fontFamily: "'Pretendard GOV:Bold'", letterSpacing: '-0.02em' }}>{viewYear}년 {viewMonth + 1}월</span>
        <button onClick={nextMonth} style={{ width: 26, height: 26, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#F6F7F8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <svg width="5" height="10" viewBox="0 0 5 10" fill="none"><path d="M0.5 1L4.5 5L0.5 9" stroke="#2E3238" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
        {['일','월','화','수','목','금','토'].map(d => <span key={d} style={{ fontSize: 12, fontWeight: 600, color: '#9197A1', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Pretendard GOV', sans-serif" }}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((cell, i) => {
          const sel = isStart(cell.date) || isEnd(cell.date) || isHoverEnd(cell.date);
          const inR = isInRange(cell.date);
          return (
            <div key={i} onClick={() => cell.inMonth && handleDayClick(cell.date)} onMouseEnter={() => setHovered(cell.date)} onMouseLeave={() => setHovered(null)}
              style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cell.inMonth ? 'pointer' : 'default', background: inR ? '#EEF3FF' : 'transparent' }}>
              <div style={{ width: 32, height: 32, borderRadius: 100, background: sel ? '#005FFF' : isSameDay(cell.date, today) ? '#F6F7F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? '#FFFFFF' : cell.inMonth ? '#2E3238' : '#C7CBD1', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>{cell.date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>
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
  const { rangeStart, rangeEnd, setRangeStart, setRangeEnd } = useContext(DateFilterCtx316);
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

function Frame407() {
  const { originSelected, setOriginSelected, driverSelected, setDriverSelected, partnerSelected316, setPartnerSelected316 } = useContext(BubbleCtx316);
  const [originOpen, setOriginOpen] = useState(false);
  const [originHovered, setOriginHovered] = useState(false);
  const [originHoveredIdx, setOriginHoveredIdx] = useState<number|null>(null);
  const originBtnRef = useRef<HTMLDivElement>(null);
  const originDropRef = useRef<HTMLDivElement>(null);
  const [originDropPos, setOriginDropPos] = useState<{ top: number; left: number } | null>(null);

  // 소속기사 드롭다운 state
  const [driverOpen, setDriverOpen] = useState(false);
  const [driverHovered, setDriverHovered] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const driverBtnRef = useRef<HTMLDivElement>(null);
  const driverDropRef = useRef<HTMLDivElement>(null);
  const [driverDropPos, setDriverDropPos] = useState<{ top: number; left: number } | null>(null);

  // 협력사 드롭다운 state
  const [partnerOpen316, setPartnerOpen316] = useState(false);
  const [partnerHovered316, setPartnerHovered316] = useState(false);
  const [partnerSearch316, setPartnerSearch316] = useState('');
  const partnerBtnRef316 = useRef<HTMLDivElement>(null);
  const partnerDropRef316 = useRef<HTMLDivElement>(null);
  const [partnerDropPos316, setPartnerDropPos316] = useState<{ top: number; left: number } | null>(null);

  const originBg = originOpen ? '#eef3ff' : originSelected.size > 0 ? '#f5f9ff' : originHovered ? '#f6f7f8' : '#f6f7f8';
  const originBorder = originOpen ? '1px solid transparent' : originSelected.size > 0 ? '1px solid transparent' : originHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const originTextColor = (originOpen || originSelected.size > 0) ? '#005fff' : '#2e3238';

  const driverBg = driverOpen ? '#eef3ff' : driverSelected.size > 0 ? '#f5f9ff' : '#f6f7f8';
  const driverBorder = driverOpen ? '1px solid transparent' : driverSelected.size > 0 ? '1px solid transparent' : driverHovered ? '1px solid #E4E5E9' : '1px solid transparent';
  const driverTextColor = (driverOpen || driverSelected.size > 0) ? '#005fff' : '#2e3238';

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

  useEffect(() => {
    if (!driverOpen) return;
    const handler = (e: MouseEvent) => {
      if (!driverBtnRef.current?.contains(e.target as Node) && !driverDropRef.current?.contains(e.target as Node)) {
        setDriverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [driverOpen]);

  const highlight = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return <span>{text.slice(0, idx)}<span style={{ color: '#005FFF' }}>{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</span>;
  };

  const filteredDrivers = DRIVER_ROW_DATA_316.map((name, idx) => ({ name, idx, plate: PLATE_NOS_316[idx], contact: CONTACTS_316[idx], vehicleType: VEHICLE_TYPES_316[idx] })).filter(d => {
    if (driverSelected.has(d.idx)) return true;
    const q = driverSearch.toLowerCase();
    if (!q) return false;
    return d.name.includes(q) || d.plate.toLowerCase().includes(q) || d.contact.includes(q);
  });

  useEffect(() => {
    if (!partnerOpen316) return;
    const handler = (e: MouseEvent) => {
      if (!partnerBtnRef316.current?.contains(e.target as Node) && !partnerDropRef316.current?.contains(e.target as Node)) {
        setPartnerOpen316(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [partnerOpen316]);

  const partnerBg316 = partnerOpen316 ? '#eef3ff' : partnerSelected316.size > 0 ? '#f5f9ff' : partnerHovered316 ? '#f6f7f8' : '#f6f7f8';
  const partnerBorder316 = partnerOpen316 ? '1px solid transparent' : partnerSelected316.size > 0 ? '1px solid transparent' : partnerHovered316 ? '1px solid #E4E5E9' : '1px solid transparent';
  const partnerTextColor316 = (partnerOpen316 || partnerSelected316.size > 0) ? '#005fff' : '#2e3238';

  const filteredPartners316 = PARTNER_LIST_316.map((name, idx) => ({ name, idx })).filter(p => {
    if (partnerSelected316.has(p.idx)) return true;
    const q = partnerSearch316.toLowerCase();
    if (!q) return false;
    return p.name.toLowerCase().includes(q);
  });

  const { activeTab: filterActiveTab } = useContext(MaeIpMyeongseSubTabCtx);
  const isPartnerFilterTab = filterActiveTab === '협력사';

  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      {/* 소속기사 드롭다운 버튼 - 협력사 탭에서 숨김 */}
      <div ref={driverBtnRef} style={{ position: 'relative', display: isPartnerFilterTab ? 'none' : undefined }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: driverBg, border: driverBorder }}
          data-name="Input / 04. Filter"
          onClick={() => {
            if (!driverOpen) {
              const rect = driverBtnRef.current!.getBoundingClientRect();
              setDriverDropPos({ top: rect.bottom + 2, left: rect.left });
            }
            setDriverOpen(o => !o);
          }}
          onMouseEnter={() => setDriverHovered(true)}
          onMouseLeave={() => setDriverHovered(false)}
        >
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: driverTextColor }}>
            <p className="leading-[20px]">소속기사</p>
          </div>
          {driverSelected.size > 0 && !driverOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{driverSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: driverOpen ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]" data-name="Icon_12/arrow_down">
              <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                <div className="-scale-y-100 flex-none">
                  <div className="h-[3px] relative w-[7px]">
                    <div className="absolute inset-[-21.67%_-9.29%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                        <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" stroke={driverOpen ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {driverOpen && driverDropPos && createPortal(
          <div ref={driverDropRef} style={{
            position: 'fixed', top: driverDropPos.top, left: driverDropPos.left,
            width: 257, background: '#FFFFFF',
            border: '1px solid #E4E5E9',
            boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
            borderRadius: 8,
            display: 'flex', flexDirection: 'column',
            zIndex: 9999, boxSizing: 'border-box',
          }}>
            {/* 검색 영역 */}
            <div style={{ padding: '8px 8px 2px', boxSizing: 'border-box' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg style={{ position: 'absolute', left: 10, flexShrink: 0 }} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.07129 1C10.4245 1 13.1434 3.71863 13.1436 7.07227L13.1357 7.38477C13.0688 8.70557 12.5786 9.91398 11.7998 10.8799L14.8066 13.8867C15.0604 14.1405 15.0602 14.5528 14.8066 14.8066C14.5528 15.0605 14.1405 15.0605 13.8867 14.8066L10.8799 11.7998C9.83804 12.6401 8.51389 13.1445 7.07129 13.1445C3.71817 13.1443 1 10.4258 1 7.07227C1.0001 3.71877 3.71823 1.00023 7.07129 1ZM7.07129 2.2998C4.43635 2.30004 2.29991 4.43659 2.2998 7.07227C2.2998 9.70803 4.43629 11.8445 7.07129 11.8447C9.70649 11.8447 11.8438 9.70817 11.8438 7.07227C11.8436 4.43645 9.70642 2.2998 7.07129 2.2998Z" fill="#9197A1"/>
                </svg>
                <input
                  autoFocus
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  placeholder="기사명, 차량번호, 연락처 검색"
                  style={{
                    width: '100%', height: 36,
                    border: '1px solid #E4E5E9', borderRadius: 4,
                    padding: '6px 10px 6px 32px',
                    fontSize: 14, fontFamily: "'Pretendard GOV', sans-serif",
                    color: '#2E3238', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            {/* 리스트 영역 */}
            <div style={{ height: (filteredDrivers.length === 0) ? 162 : undefined, maxHeight: (filteredDrivers.length === 0) ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              {filteredDrivers.map(d => (
                <div
                  key={d.idx}
                  onClick={() => { const next = new Set(driverSelected); if (next.has(d.idx)) next.delete(d.idx); else next.add(d.idx); setDriverSelected(next); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 8, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F6F7F8'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                >
                  <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 16, height: 16, border: driverSelected.has(d.idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: driverSelected.has(d.idx) ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                      {driverSelected.has(d.idx) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '24px' }}>{highlight(d.name, driverSearch)}</span>
                      <span style={{ fontSize: 14, fontWeight: 400, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '20px' }}>{d.vehicleType}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 400, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>{highlight(d.plate, driverSearch)} / {highlight(d.contact, driverSearch)}</span>
                  </div>
                </div>
              ))}
              {filteredDrivers.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                </div>
              )}
              {false && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <svg width="176" height="162" viewBox="0 0 176 162" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="10" transform="matrix(-1 8.74228e-08 8.74228e-08 1 98 58)" fill="#9197A1"/>
                    <path d="M88 68.5L88 63.75" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="1" cy="1" r="1" transform="matrix(-1 8.74228e-08 8.74228e-08 1 89 71)" fill="white"/>
                  </svg>
                </div>
              )}
            </div>
            <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
              <span onClick={e => { e.stopPropagation(); setDriverSelected(new Set()); setDriverSearch(''); }} style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}>필터 초기화</span>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* 협력사 탭 전용 협력사 필터 */}
      {isPartnerFilterTab && (
        <div ref={partnerBtnRef316} style={{ position: 'relative' }}>
          <div
            className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
            style={{ background: partnerBg316, border: partnerBorder316 }}
            onClick={() => {
              if (!partnerOpen316) {
                const rect = partnerBtnRef316.current!.getBoundingClientRect();
                setPartnerDropPos316({ top: rect.bottom + 2, left: rect.left });
              }
              setPartnerOpen316(o => !o);
            }}
            onMouseEnter={() => setPartnerHovered316(true)}
            onMouseLeave={() => setPartnerHovered316(false)}
          >
            <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center tracking-[-0.28px] whitespace-nowrap" style={{ color: partnerTextColor316 }}>
              <p className="leading-[20px]">협력사</p>
            </div>
            {partnerSelected316.size > 0 && !partnerOpen316 ? (
              <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                  <p className="leading-[18px]">{partnerSelected316.size}</p>
                </div>
              </div>
            ) : (
              <div style={{ transform: partnerOpen316 ? 'rotate(180deg)' : undefined }} className="relative shrink-0 size-[12px]">
                <div className="-translate-y-1/2 absolute flex h-[3px] items-center justify-center left-[2.5px] top-1/2 w-[7px]">
                  <div className="-scale-y-100 flex-none">
                    <div className="h-[3px] relative w-[7px]">
                      <div className="absolute inset-[-21.67%_-9.29%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.30002 4.30001">
                          <path d="M1 3.30002L4.15001 0.650024L7.30002 3.30002" stroke={partnerOpen316 ? '#005fff' : '#9197A1'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {partnerOpen316 && partnerDropPos316 && createPortal(
            <div ref={partnerDropRef316} style={{
              position: 'fixed', top: partnerDropPos316.top, left: partnerDropPos316.left,
              width: 257, background: '#FFFFFF',
              border: '1px solid #E4E5E9',
              boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)',
              borderRadius: 8,
              display: 'flex', flexDirection: 'column',
              zIndex: 9999, boxSizing: 'border-box',
            }}>
              {/* 검색 영역 */}
              <div style={{ padding: '8px 8px 2px', boxSizing: 'border-box' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <svg style={{ position: 'absolute', left: 10, flexShrink: 0 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M7.07129 1C10.4245 1 13.1434 3.71863 13.1436 7.07227L13.1357 7.38477C13.0688 8.70557 12.5786 9.91398 11.7998 10.8799L14.8066 13.8867C15.0604 14.1405 15.0602 14.5528 14.8066 14.8066C14.5528 15.0605 14.1405 15.0605 13.8867 14.8066L10.8799 11.7998C9.83804 12.6401 8.51389 13.1445 7.07129 13.1445C3.71817 13.1443 1 10.4258 1 7.07227C1.0001 3.71877 3.71823 1.00023 7.07129 1ZM7.07129 2.2998C4.43635 2.30004 2.29991 4.43659 2.2998 7.07227C2.2998 9.70803 4.43629 11.8445 7.07129 11.8447C9.70649 11.8447 11.8438 9.70817 11.8438 7.07227C11.8436 4.43645 9.70642 2.2998 7.07129 2.2998Z" fill="#9197A1"/>
                  </svg>
                  <input
                    autoFocus
                    value={partnerSearch316}
                    onChange={e => setPartnerSearch316(e.target.value)}
                    placeholder="협력사명 검색"
                    style={{
                      width: '100%', height: 36,
                      border: '1px solid #E4E5E9', borderRadius: 4,
                      padding: '6px 10px 6px 32px',
                      fontSize: 14, fontFamily: "'Pretendard GOV', sans-serif",
                      color: '#2E3238', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              {/* 리스트 영역 */}
              <div style={{ height: filteredPartners316.length === 0 ? 162 : undefined, maxHeight: filteredPartners316.length === 0 ? undefined : 162, overflowY: 'auto', padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                {filteredPartners316.map(p => (
                  <div
                    key={p.idx}
                    onClick={() => { const next = new Set(partnerSelected316); if (next.has(p.idx)) next.delete(p.idx); else next.add(p.idx); setPartnerSelected316(next); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px 9px 4px', height: 40, borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F6F7F8'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, border: partnerSelected316.has(p.idx) ? '1.3px solid #005FFF' : '1.3px solid #ADB1B9', borderRadius: 3, background: partnerSelected316.has(p.idx) ? '#005FFF' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                        {partnerSelected316.has(p.idx) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <span style={{ fontSize: 15, color: '#2E3238', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>
                      {partnerSearch316 ? (() => {
                        const q = partnerSearch316.toLowerCase();
                        const idx2 = p.name.toLowerCase().indexOf(q);
                        if (idx2 === -1) return p.name;
                        return <>{p.name.slice(0, idx2)}<span style={{ color: '#005FFF' }}>{p.name.slice(idx2, idx2 + partnerSearch316.length)}</span>{p.name.slice(idx2 + partnerSearch316.length)}</>;
                      })() : p.name}
                    </span>
                  </div>
                ))}
                {filteredPartners316.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                      <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="12" cy="17.5" r="1" fill="white"/>
                    </svg>
                    <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color: '#5C6370', textAlign: 'center', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px' }}>검색 결과가 없습니다.</span>
                  </div>
                )}
              </div>
              <div style={{ height: 28, padding: '0 8px', borderTop: '1px solid #E4E5E9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
                <span onClick={e => { e.stopPropagation(); setPartnerSelected316(new Set()); setPartnerSearch316(''); }} style={{ fontSize: 12, color: '#9197A1', cursor: 'pointer', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '18px' }}>필터 초기화</span>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

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
                {ORIGIN_OPTIONS_316.map((name, idx) => (
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

function TasaBanner316() {
  const { originSelected } = useContext(BubbleCtx316);
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="6.35" stroke="#005FFF" strokeWidth="1.3"/>
        <rect x="7.35" y="7" width="1.3" height="4.5" rx="0.65" fill="#005FFF"/>
        <circle cx="8" cy="5.25" r="0.65" fill="#005FFF"/>
      </svg>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#005FFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '20px' }}>
        타사가 생성한 거래명세서만 노출 중입니다. 수정이 필요할 경우, 거래처에 문의해 주세요.
      </span>
    </div>
  );
}

function Filter() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Filter">
      <Component9 />
      <Frame407 />
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
  const { setOriginSelected, setDriverSelected, setPartnerSelected316 } = useContext(BubbleCtx316);
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button"
        onClick={() => { setOriginSelected(new Set()); setDriverSelected(new Set()); setPartnerSelected316(new Set()); }}>
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
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="Filter_Sorter_Module">
      <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
      <Frame393 />
    </div>
  );
}

function Frame401() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체 (5,000건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#005fff] text-[18px] tracking-[-0.36px]">633,502,305,305원</p>
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
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">확정대기 (1,000건)</p>
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
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">발행대기 (500건)</p>
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
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">지급대기 (1,500건)</p>
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
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">지급완료 (2,000건)</p>
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

const ITEMS_316_RAW = [
  { label: "확정대기 (60건)", amountRaw: 21_600_000 },
  { label: "발행대기 (30건)",   amountRaw: 97_300_000 },
  { label: "지급대기 (90건)", amountRaw: 184_600_000 },
  { label: "지급완료 (120건)", amountRaw: 654_800_000 },
];
const ITEMS_316_TOTAL = ITEMS_316_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_316 = [
  { label: "전체 (300건)", amount: formatKorean(ITEMS_316_TOTAL) },
  ...ITEMS_316_RAW.map(x => ({ label: x.label, amount: formatKorean(x.amountRaw) })),
];

const ITEMS_316_PARTNER = [
  { label: "전체 (300건)", amount: formatKorean(Math.round(ITEMS_316_TOTAL * 0.47)) },
  ...ITEMS_316_RAW.map(x => ({ label: x.label, amount: formatKorean(Math.round(x.amountRaw * 0.47)) })),
];

function Frame406() {
  const { activeTab } = useContext(MaeIpMyeongseSubTabCtx);
  return <StatusCardRowLarge items={activeTab === '협력사' ? ITEMS_316_PARTNER : ITEMS_316} />;
}

function Frame369() {
  const { selectedRows, confirmedIndices, addConfirmedIndices, addIssuedIndices, clearSelectedRows } = useContext(TableCtrlCtx);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorToast, setErrorToast] = useState(false);
  const [statusErrorToast, setStatusErrorToast] = useState(false);
  const [manualRegOpen316, setManualRegOpen316] = useState(false);
  const [manualRegIdx316, setManualRegIdx316] = useState(0);
  const [showManualSuccessToast316, setShowManualSuccessToast316] = useState(false);
  React.useEffect(() => { if (!showManualSuccessToast316) return; const t = setTimeout(() => setShowManualSuccessToast316(false), 3000); return () => clearTimeout(t); }, [showManualSuccessToast316]);
  const [tooManyToastReg316, setTooManyToastReg316] = useState(false);
  const [wrongStatusToastReg316, setWrongStatusToastReg316] = useState(false);
  const [taxInvoiceOpen316, setTaxInvoiceOpen316] = useState(false);
  const [taxSuccessCount316, setTaxSuccessCount316] = useState(0);
  const [taxSuccessToast316, setTaxSuccessToast316] = useState(false);
  const [taxStatusErrorToast316, setTaxStatusErrorToast316] = useState(false);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(false), 4000);
    return () => clearTimeout(t);
  }, [successToast]);

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

  useEffect(() => {
    if (!tooManyToastReg316) return;
    const t = setTimeout(() => setTooManyToastReg316(false), 4000);
    return () => clearTimeout(t);
  }, [tooManyToastReg316]);

  useEffect(() => {
    if (!wrongStatusToastReg316) return;
    const t = setTimeout(() => setWrongStatusToastReg316(false), 4000);
    return () => clearTimeout(t);
  }, [wrongStatusToastReg316]);

  const handleManualReg316 = () => {
    if (selectedRows.size === 0) { setErrorToast(true); return; }
    if (selectedRows.size > 1) { setTooManyToastReg316(true); return; }
    const idx = [...selectedRows][0];
    const status = confirmedIndices.has(idx) ? '발행대기' : ROW_STATUSES_316[idx % ROW_STATUSES_316.length];
    if (status !== '발행대기') { setWrongStatusToastReg316(true); return; }
    setManualRegIdx316(idx);
    setManualRegOpen316(true);
  };

  useEffect(() => {
    if (!taxSuccessToast316) return;
    const t = setTimeout(() => setTaxSuccessToast316(false), 4000);
    return () => clearTimeout(t);
  }, [taxSuccessToast316]);

  const handleTaxInvoice316 = () => {
    if (selectedRows.size === 0) { setErrorToast(true); return; }
    const hasNonIssueWait = [...selectedRows].some(i => {
      const s = confirmedIndices.has(i) ? '발행대기' : ROW_STATUSES_316[i % ROW_STATUSES_316.length];
      return s !== '발행대기';
    });
    if (hasNonIssueWait) { setTaxStatusErrorToast316(true); return; }
    setTaxInvoiceOpen316(true);
  };

  const handleConfirm = () => {
    if (selectedRows.size === 0) { setErrorToast(true); return; }
    const hasNonConfirmWait = [...selectedRows].some(i => {
      const s = confirmedIndices.has(i) ? '발행대기' : ROW_STATUSES_316[i % ROW_STATUSES_316.length];
      return s !== '확정대기';
    });
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
      <div className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleTaxInvoice316} style={{ cursor: 'pointer' }}>
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
          <p className="leading-[22px]">세금계산서 발행</p>
        </div>
      </div>
      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button" onClick={handleManualReg316} style={{ cursor: 'pointer' }}>
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
            <p className="leading-[22px]">지급 완료</p>
          </div>
        </div>
        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      </div>
    </div>
    {confirmOpen && <ConfirmInvoiceListModal316 onClose={() => setConfirmOpen(false)} onSuccess={() => { addConfirmedIndices(selectedRows); clearSelectedRows(); setSuccessToast(true); }} selectedIndices={[...selectedRows]} />}
    {successToast && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#222222' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>거래명세서가 확정되었습니다.</span>
          <ToastCloseBtn316 onClose={() => setSuccessToast(false)} />
        </div>
      </>,
      document.body
    )}
    {errorToast && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#E13838', height: 76, padding: '16px 20px', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>선택한 거래명세서가 없습니다. 거래명세서 선택 후 다시 클릭해 주세요.</span>
          <ToastCloseBtn316 onClose={() => setErrorToast(false)} />
        </div>
      </>,
      document.body
    )}
    {statusErrorToast && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#E13838' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>확정대기 상태인 거래명세서를 선택해 주세요.</span>
          <ToastCloseBtn316 onClose={() => setStatusErrorToast(false)} />
        </div>
      </>,
      document.body
    )}
    {taxInvoiceOpen316 && <TaxInvoiceListModal316 onClose={() => setTaxInvoiceOpen316(false)} onSuccess={() => { setTaxSuccessCount316(selectedRows.size); setTaxSuccessToast316(true); }} selectedIndices={[...selectedRows]} />}
    {taxStatusErrorToast316 && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#E13838' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>발행대기 상태의 거래명세서를 선택해 주세요.</span>
          <ToastCloseBtn316 onClose={() => setTaxStatusErrorToast316(false)} />
        </div>
      </>,
      document.body
    )}
    {taxSuccessToast316 && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#222222' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>{taxSuccessCount316}건의 세금계산서가 발행되었습니다.</span>
          <ToastCloseBtn316 onClose={() => setTaxSuccessToast316(false)} />
        </div>
      </>,
      document.body
    )}
    {manualRegOpen316 && <ManualInvoiceRegisterModal316 idx={manualRegIdx316} onClose={() => setManualRegOpen316(false)} onSuccess={() => { addConfirmedIndices(new Set([manualRegIdx316])); addIssuedIndices(new Set([manualRegIdx316])); setTaxSuccessToast316(false); clearSelectedRows(); setShowManualSuccessToast316(true); }} />}
    {showManualSuccessToast316 && createPortal(<>
      <style>{TOAST_ANIMATION_316}</style>
      <div style={{ ...TOAST_STYLE_316, background: '#222222' }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 400, letterSpacing: '-0.3px', lineHeight: '22px', flex: 1 }}>수기계산서가 등록되었습니다.</span>
        <ToastCloseBtn316 onClose={() => setShowManualSuccessToast316(false)} />
      </div>
    </>, document.body)}
    {tooManyToastReg316 && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#E13838', height: 76, padding: '16px 20px', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em', lineHeight: '22px', flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>수기계산서를 등록하려면 1개의 거래명세서만 선택해 주세요.</span>
          <ToastCloseBtn316 onClose={() => setTooManyToastReg316(false)} />
        </div>
      </>,
      document.body
    )}
    {wrongStatusToastReg316 && createPortal(
      <>
        <style>{TOAST_ANIMATION_316}</style>
        <div style={{ ...TOAST_STYLE_316, background: '#E13838' }}>
          <span style={{ fontSize: 15, color: '#FFFFFF', fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' }}>발행대기 상태의 거래명세서를 선택해 주세요.</span>
          <ToastCloseBtn316 onClose={() => setWrongStatusToastReg316(false)} />
        </div>
      </>,
      document.body
    )}
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

const TOAST_ANIMATION_316 = `
  @keyframes toast-slide-in-316 {
    from { transform: translateX(calc(100% + 34px)); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
`;
const TOAST_STYLE_316: React.CSSProperties = {
  position: 'fixed', bottom: 34, right: 34, width: 400, height: 54,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 20px', zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  animation: 'toast-slide-in-316 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  fontFamily: "'Pretendard GOV', sans-serif",
};
function ToastCloseBtn316({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M12 4L4 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M4 4L12 12" stroke="#F1F2F4" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

const ROW_CHARGE_AMOUNTS_316 = [120000, 180000, 95000, 240000, 150000, 210000, 85000, 320000, 175000, 130000];
const getRowChargeAmount316 = (i: number) => ROW_CHARGE_AMOUNTS_316[i % ROW_CHARGE_AMOUNTS_316.length];
const getRowTaxAmount316 = (i: number) => Math.round(getRowChargeAmount316(i) * 0.1);

const DRIVER_ROW_DATA_316 = ['김민준','이서준','박도윤','최예준','정시우','강주원','윤하준','장지호','임준서','한지후'];
const BIZ_NOS_316 = ['138-28-01123','220-81-33456','314-81-09871','123-45-67890','507-12-34567','602-87-12345','719-34-56789','834-56-12378','905-67-23456','101-23-45678'];
const PLATE_NOS_316 = ['12가3456','34나5678','56다7890','78라9012','90마1234','11바2345','22사3456','33아4567','44자5678','55차6789'];
const PERIODS_316 = ['26.05.01~26.05.07','26.05.08~26.05.14','26.05.15~26.05.21','26.05.22~26.05.28','26.04.01~26.04.07','26.04.08~26.04.14','26.04.15~26.04.21','26.04.22~26.04.28','26.03.01~26.03.07','26.03.08~26.03.14'];
const COMPANIES_316 = ['(주)글로벌운송','(주)케이로지스','(주)동탄배송','(주)수원물류','(주)판교익스프레스'];

function CalendarDropdown316({ anchorRect, value, onChange, onClose }: {
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

function ManualInvoiceRegisterModal316({ idx, onClose, onSuccess }: { idx: number; onClose: () => void; onSuccess?: () => void }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const chargeAmt = 380000 + (idx % 5) * 20000;
  const adjAmt = 10000;
  const supplyAmt = chargeAmt + adjAmt;
  const taxAmt = Math.round(supplyAmt * 0.1);
  const totalAmt = supplyAmt + taxAmt;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const invoiceId = INVOICE_IDS_316[idx] || `INV-${idx + 1}`;
  const driverName = DRIVER_ROW_DATA_316[idx % DRIVER_ROW_DATA_316.length];
  const plateNo = PLATE_NOS_316[idx % PLATE_NOS_316.length];
  const bizNo = BIZ_NOS_316[idx % BIZ_NOS_316.length];
  const rawPeriod = PERIODS_316[idx % PERIODS_316.length];
  const [rawStart, rawEnd] = rawPeriod.split('~');
  const company = COMPANIES_316[idx % COMPANIES_316.length];

  const labelStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px', whiteSpace: 'nowrap', flexShrink: 0 };
  const valueStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', width: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  const infoRows = [
    { label: '거래명세서ID', value: invoiceId },
    { label: '기사명', value: driverName },
    { label: '차량번호', value: plateNo },
    { label: '사업자번호', value: bizNo },
    { label: '소속업체', value: company },
  ];

  const [dateValues, setDateValues] = useState({ 작성: todayYYMMDD(), 확인: '26.07.01', 지급: '26.08.13' });
  const [openCal, setOpenCal] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // 정산기간 날짜 선택
  const [periodStart, setPeriodStart] = useState(rawStart);
  const [periodEnd, setPeriodEnd] = useState(rawEnd);
  const periodStr = `${periodStart} ~ ${periodEnd}`;
  const [openPeriodCal, setOpenPeriodCal] = useState<'start' | 'end' | null>(null);
  const [periodAnchorRect, setPeriodAnchorRect] = useState<DOMRect | null>(null);

  const calIcon316 = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#9197A1" strokeWidth="1.3"/>
      <line x1="5" y1="1.5" x2="5" y2="4.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="11" y1="1.5" x2="11" y2="4.5" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="2" y1="7" x2="14" y2="7" stroke="#9197A1" strokeWidth="1.3"/>
    </svg>
  );

  return (createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ width: 881, height: 623, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', ...F }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ height: 74, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>수기계산서 등록</span>
          <div onClick={onClose} style={{ cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="2" x2="14" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="14" y1="2" x2="2" y2="14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: '#E4E5E9' }}/>
        </div>
        {/* Body */}
        <div style={{ height: 453, display: 'flex', flexDirection: 'row', flexShrink: 0 }}>
          {/* Left panel */}
          <div style={{ width: 480, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box', flexShrink: 0 }}>
            {infoRows.map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', height: 36, justifyContent: 'space-between' }}>
                <span style={labelStyle}>{row.label}</span>
                <span style={valueStyle}>{row.value}</span>
              </div>
            ))}
            {/* 정산기간 - 날짜 선택 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 36 }}>
              <span style={labelStyle}>정산기간</span>
              <div
                onClick={e => {
                  if (openPeriodCal) { setOpenPeriodCal(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  setPeriodAnchorRect(r);
                  setOpenPeriodCal('start');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${openPeriodCal ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '0 10px', width: 300, height: 36, boxSizing: 'border-box', cursor: 'pointer', background: '#FFFFFF' }}
              >
                {calIcon316}
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px', flex: 1 }}>{periodStr}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: openPeriodCal ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M4 6l4 4 4-4" stroke="#9197A1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {openPeriodCal === 'start' && periodAnchorRect && (
                <CalendarDropdown316
                  anchorRect={periodAnchorRect}
                  value={periodStart}
                  onChange={v => { setPeriodStart(v); setOpenPeriodCal('end'); }}
                  onClose={() => setOpenPeriodCal(null)}
                />
              )}
              {openPeriodCal === 'end' && periodAnchorRect && (
                <CalendarDropdown316
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
          {/* Right panel */}
          <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box' }}>
            {/* Date pickers */}
            {([
              { label: '계산서 작성일자', key: '작성' },
              { label: '계산서 확인일자', key: '확인' },
              { label: '지급기한', key: '지급' },
            ] as { label: string; key: keyof typeof dateValues }[]).map(dp => (
              <div key={dp.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 36 }}>
                <span style={{ fontSize: 15, color: '#5C6370', lineHeight: '22px', whiteSpace: 'nowrap', flexShrink: 0 }}>{dp.label}</span>
                <div onClick={e => { if (openCal === dp.key) { setOpenCal(null); } else { setAnchorRect(e.currentTarget.getBoundingClientRect()); setOpenCal(dp.key); } }} style={{ width: 160, border: `1px solid ${openCal === dp.key ? '#005FFF' : '#E4E5E9'}`, borderRadius: 4, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, boxSizing: 'border-box', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="#9197A1" strokeWidth="1.2"/>
                    <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="#9197A1" strokeWidth="1.2"/>
                    <line x1="4.5" y1="1" x2="4.5" y2="4" stroke="#9197A1" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="9.5" y1="1" x2="9.5" y2="4" stroke="#9197A1" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ flex: 1, fontSize: 14, color: '#2E3238', lineHeight: '20px' }}>{dateValues[dp.key]}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, transform: openCal === dp.key ? 'rotate(180deg)' : undefined }}>
                    <path d="M1 1L5 5L9 1" stroke="#9197A1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
            {openCal && anchorRect && <CalendarDropdown316 anchorRect={anchorRect} value={dateValues[openCal as keyof typeof dateValues]} onChange={v => { setDateValues(prev => ({ ...prev, [openCal]: v })); setOpenCal(null); }} onClose={() => setOpenCal(null)} />}
            {/* Summary gray box */}
            <div style={{ background: '#F6F7F8', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>선택된 거래명세서 수</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>1건</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>배차금액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(chargeAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>조정금액 합계</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(adjAmt)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>공급가액</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(supplyAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>세액</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2E3238', lineHeight: '22px' }}>{fmt(taxAmt)}</span>
              </div>
              <div style={{ height: 1, background: '#E4E5E9' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px' }}>합계 금액</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>{fmt(totalAmt)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ position: 'relative', flexShrink: 0, flex: 1 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#E4E5E9' }}/>
          <div style={{ height: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ ...F, width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#2E3238' }}>닫기</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width: 102, height: 52, background: '#005FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>등록하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ));
}

function ConfirmInvoiceListModal316({ onClose, onSuccess, selectedIndices }: { onClose: () => void; onSuccess?: () => void; selectedIndices: number[] }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const [hoveredModalRow, setHoveredModalRow] = useState<number | null>(null);
  const SAMPLE_DATES = ['26.01.05','26.01.12','26.01.19','26.01.26','26.02.02','26.02.09','26.02.16','26.02.23','26.03.02','26.03.09'];
  const GROUPS = ['기본 그룹', '전국 배송', '수도권 배송', '지방 배송', '특수 배송'];
  const PLATE_NOS = ['12가3456','34나5678','56다7890','78라9012','90마1234','11바2345','22사3456','33아4567','44자5678','55차6789'];
  const PHONES = ['010-1234-5678','010-2345-6789','010-3456-7890','010-4567-8901','010-5678-9012','010-6789-0123','010-7890-1234','010-8901-2345','010-9012-3456','010-0123-4567'];

  const BIZ_NOS = ['138-28-01123','220-81-34567','123-45-67890','456-78-90123','789-01-23456','321-54-09876','654-87-43210','987-20-76543','111-22-33344','555-66-77788'];
  const ORDERS = ['2건','3건','5건','7건','4건','6건','2건','8건','3건','5건'];
  const PERIODS = ['26.05.01~26.05.07','26.05.08~26.05.14','26.05.15~26.05.21','26.05.22~26.05.28','26.04.01~26.04.07','26.04.08~26.04.14','26.04.15~26.04.21','26.04.22~26.04.28','26.03.01~26.03.07','26.03.08~26.03.14'];

  const rows = selectedIndices.map(i => {
    const charge = getRowChargeAmount316(i);
    const adj = 10000;
    const supply = charge + adj;
    const tax = Math.round(supply * 0.1);
    return {
      id: INVOICE_IDS_316[i] || `INV-${i + 1}`,
      plateNo: PLATE_NOS[i % PLATE_NOS.length],
      driver: DRIVER_ROW_DATA_316[i % DRIVER_ROW_DATA_316.length],
      bizNo: BIZ_NOS[i % BIZ_NOS.length],
      orderCount: ORDERS[i % ORDERS.length],
      period: PERIODS[i % PERIODS.length],
      writeDate: todayYYMMDD(),
      payDate: SAMPLE_DATES[(i + 3) % SAMPLE_DATES.length],
      chargeAmt: charge,
      adjAmt: adj,
      supplyAmt: supply,
      taxAmt: tax,
      totalAmt: supply + tax,
    };
  });

  // 공급가액 = 배차금액 + 조정금액
  const totalSupply = rows.reduce((s, r) => s + r.supplyAmt, 0);
  const totalTax = Math.round(totalSupply * 0.1);
  const totalAmt = totalSupply + totalTax;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const COLS: { label: string; w: number; key: keyof typeof rows[0] }[] = [
    { label: '거래명세서ID', w: 130, key: 'id' },
    { label: '차량번호', w: 110, key: 'plateNo' },
    { label: '기사명', w: 100, key: 'driver' },
    { label: '사업자번호', w: 130, key: 'bizNo' },
    { label: '총 오더 수', w: 90, key: 'orderCount' },
    { label: '정산기간', w: 160, key: 'period' },
    { label: '계산서 작성일자', w: 140, key: 'writeDate' },
    { label: '지급기한', w: 110, key: 'payDate' },
    { label: '배차금액 합계', w: 130, key: 'chargeAmt' },
    { label: '조정금액 합계', w: 130, key: 'adjAmt' },
    { label: '공급가액', w: 120, key: 'supplyAmt' },
    { label: '세액', w: 100, key: 'taxAmt' },
    { label: '합계 금액', w: 120, key: 'totalAmt' },
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={onClose}>
      <div style={{ width: 1600, height: 800, background: '#FFFFFF', border: '1px solid #E4E5E9', boxShadow: '0px 2px 6px 1px rgba(34,34,34,0.06)', borderRadius: 12, display: 'flex', flexDirection: 'column', ...F }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2E3238', lineHeight: '32px' }}>매입 거래명세서 확정</span>
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
                  {COLS.map((col, ci) => (
                    <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '8px', height: 40, display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}) }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                    </div>
                  ))}
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex' }} onMouseEnter={() => setHoveredModalRow(ri)} onMouseLeave={() => setHoveredModalRow(null)}>
                    {COLS.map((col, ci) => {
                      const val = row[col.key];
                      const display = typeof val === 'number' ? val.toLocaleString('ko-KR') + '원' : String(val);
                      return (
                        <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '10px 8px', height: 40, display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}), backgroundColor: hoveredModalRow === ri ? 'rgba(246, 247, 248, 0.5)' : '' }}>
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

function TaxInvoiceListModal316({ onClose, onSuccess, selectedIndices }: { onClose: () => void; onSuccess?: () => void; selectedIndices: number[] }) {
  const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: '-0.02em' };
  const [hoveredModalRow, setHoveredModalRow] = useState<number | null>(null);
  const SAMPLE_DATES = ['26.01.05','26.01.12','26.01.19','26.01.26','26.02.02','26.02.09','26.02.16','26.02.23','26.03.02','26.03.09'];
  const PLATE_NOS = ['12가3456','34나5678','56다7890','78라9012','90마1234','11바2345','22사3456','33아4567','44자5678','55차6789'];
  const ORDERS = ['2건','3건','5건','7건','4건','6건','2건','8건','3건','5건'];
  const PERIODS = ['26.05.01~26.05.07','26.05.08~26.05.14','26.05.15~26.05.21','26.05.22~26.05.28','26.04.01~26.04.07','26.04.08~26.04.14','26.04.15~26.04.21','26.04.22~26.04.28','26.03.01~26.03.07','26.03.08~26.03.14'];

  const rows = selectedIndices.map(i => {
    const charge = getRowChargeAmount316(i);
    const adj = 10000;
    const supply = charge + adj;
    const tax = Math.round(supply * 0.1);
    return {
      id: INVOICE_IDS_316[i] || `INV-${i + 1}`,
      plateNo: PLATE_NOS[i % PLATE_NOS.length],
      driver: DRIVER_ROW_DATA_316[i % DRIVER_ROW_DATA_316.length],
      bizNo: BIZ_NOS_316[i % BIZ_NOS_316.length],
      orderCount: ORDERS[i % ORDERS.length],
      period: PERIODS[i % PERIODS.length],
      writeDate: todayYYMMDD(),
      payDate: SAMPLE_DATES[(i + 3) % SAMPLE_DATES.length],
      chargeAmt: charge,
      adjAmt: adj,
      supplyAmt: supply,
      taxAmt: tax,
      totalAmt: supply + tax,
    };
  });

  const totalSupply = rows.reduce((s, r) => s + r.supplyAmt, 0);
  const totalTax = Math.round(totalSupply * 0.1);
  const totalAmt = totalSupply + totalTax;
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

  const COLS: { label: string; w: number; key: keyof typeof rows[0] }[] = [
    { label: '거래명세서ID', w: 130, key: 'id' },
    { label: '차량번호', w: 110, key: 'plateNo' },
    { label: '기사명', w: 100, key: 'driver' },
    { label: '사업자번호', w: 130, key: 'bizNo' },
    { label: '총 오더 수', w: 90, key: 'orderCount' },
    { label: '정산기간', w: 160, key: 'period' },
    { label: '계산서 작성일자', w: 140, key: 'writeDate' },
    { label: '지급기한', w: 110, key: 'payDate' },
    { label: '배차금액 합계', w: 130, key: 'chargeAmt' },
    { label: '조정금액 합계', w: 130, key: 'adjAmt' },
    { label: '공급가액', w: 120, key: 'supplyAmt' },
    { label: '세액', w: 100, key: 'taxAmt' },
    { label: '합계 금액', w: 120, key: 'totalAmt' },
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
                  {COLS.map((col, ci) => (
                    <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '8px', height: 40, display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}) }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#5C6370', lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                    </div>
                  ))}
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex' }} onMouseEnter={() => setHoveredModalRow(ri)} onMouseLeave={() => setHoveredModalRow(null)}>
                    {COLS.map((col, ci) => {
                      const val = row[col.key];
                      const display = typeof val === 'number' ? val.toLocaleString('ko-KR') + '원' : String(val);
                      return (
                        <div key={col.label} style={{ width: col.w, minWidth: col.w, padding: '10px 8px', height: 40, display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0, borderBottom: '1px solid #E4E5E9', ...(ci < COLS.length - 1 ? { borderRight: '1px solid #E4E5E9' } : {}), backgroundColor: hoveredModalRow === ri ? 'rgba(246, 247, 248, 0.5)' : '' }}>
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
            <button onClick={onClose} style={{ ...F, width: 71, height: 52, background: '#FFFFFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#2E3238' }}>닫기</button>
            <button onClick={() => { onSuccess?.(); onClose(); }} style={{ ...F, width: 102, height: 52, background: '#005FFF', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>발행하기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
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

// ─── Data-driven table columns ──────────────────────────────────────────────
// 아래 정적 20행 블록들은 Con()의 useEffect가 각 컬럼의 "Table_Data Cells" 노드를
// 템플릿으로 복제/재배치하며 실제 5,000행을 렌더링하는 데 사용된다 (상태별 SRC 인덱스,
// 거래명세서ID/생성일자 텍스트 주입 등). 따라서 각 컬럼은 20개의 동일한 셀만 생성하면 되고,
// 원본 Figma 마크업(className, badge 색상, underline 여부 등)은 그대로 유지한다.

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

const STATUS_BADGE_STYLES_316: Record<string, { bg: string; text: string }> = {
  '확정대기': { bg: '#fce9e9', text: '#d22' },
  '발행대기': { bg: '#ebedef', text: '#454b55' },
  '지급대기': { bg: '#e4fbeb', text: '#18ac42' },
  '지급완료': { bg: '#e6efff', text: '#005fff' },
};
// Con()의 SRC 매핑과 순서가 일치해야 함: 확정대기(6) → 발행대기(5) → 지급대기(2) → 지급완료(7)
const STATUS_ROW_ORDER_316 = [
  ...Array(6).fill('확정대기'),
  ...Array(5).fill('발행대기'),
  ...Array(2).fill('지급대기'),
  ...Array(7).fill('지급완료'),
];

function Frame389() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서 상태</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {STATUS_ROW_ORDER_316.map((status, i) => {
          const style = STATUS_BADGE_STYLES_316[status];
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

function Frame391() {
  return (
    <div className="relative shrink-0 w-[140px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서 생성일자</p>
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
                  <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                    <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
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

function Frame374() {
  return (
    <div className="relative shrink-0 w-[120px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">거래명세서ID</p>
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
                  <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                    <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
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

function ColGeneration316() {
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

const PARTNER_COL_DATA_316 = ['카모로지스틱스', '(주)글로벌로지스', '(주)케이로지스틱스', '(주)판교물류솔루션', '(주)수원익스프레스', '(주)동탄스마트물류', '(주)한국물류', '(주)대한통운파트너스', '(주)신세계물류', '(주)롯데로지스'];
function PartnerCol316() {
  const { activeTab } = useContext(MaeIpMyeongseSubTabCtx);
  const isPartnerTab = activeTab === '협력사';
  return (
    <div className="relative shrink-0 w-[140px]" style={{ display: isPartnerTab ? undefined : 'none' }}>
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">협력사</p>
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
                    <p className="leading-[22px] overflow-hidden text-ellipsis">{PARTNER_COL_DATA_316[i % PARTNER_COL_DATA_316.length]}</p>
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

// 나머지 정적 컬럼: 헤더 라벨 + 폭 + 셀 본문(row 값 텍스트)만 다르고 마크업 구조는 동일
type StaticColSpec316 = { label: string; width: number; value: string; underline?: boolean };

function StaticTextCell316({ value, underline }: { value: string; underline?: boolean }) {
  return underline ? (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{value}</p>
      </div>
    </div>
  ) : (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{value}</p>
      </div>
    </div>
  );
}

function StaticDataColumn316({ label, width, value, underline }: StaticColSpec316) {
  return (
    <div className="relative shrink-0" style={{ width }}>
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">{label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
            <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
              <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
                <StaticTextCell316 value={value} underline={underline} />
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

const STATIC_COLS_316: StaticColSpec316[] = [
  { label: '차량번호', width: 100, value: '12아3456' },
  { label: '기사명', width: 100, value: '김카모' },
  { label: '정산기간', width: 160, value: '26.05.07 ~ 26.05.12' },
  { label: '총 오더 수', width: 100, value: '2건' },
  { label: '배차금액 합계', width: 140, value: '300,000' },
  { label: '조정금액 합계', width: 140, value: '300,000' },
  { label: '공급가액', width: 140, value: '300,000' },
  { label: '세액', width: 140, value: '30,000' },
  { label: '합계 금액', width: 140, value: '330,000' },
  { label: '기사 산재보험료', width: 140, value: '1,880' },
  { label: '합계 금액 (산재 포함)', width: 140, value: '328,120', underline: true },
  { label: '계산서 작성일자', width: 140, value: '25.10.20 ', underline: true },
  { label: '계산서 발행일자', width: 140, value: '25.10.20 ' },
  { label: '지급기한', width: 140, value: '25.10.20 ' },
  { label: '지급일', width: 140, value: '25.10.20 ', underline: true },
];

function Frame375() { const c = STATIC_COLS_316[0]; return <StaticDataColumn316 {...c} />; }
function Frame376() { const c = STATIC_COLS_316[1]; return <StaticDataColumn316 {...c} />; }
function Frame380() { const c = STATIC_COLS_316[2]; return <StaticDataColumn316 {...c} />; }
function Frame386() { const c = STATIC_COLS_316[3]; return <StaticDataColumn316 {...c} />; }
function Frame377() { const c = STATIC_COLS_316[4]; return <StaticDataColumn316 {...c} />; }
function Frame387() { const c = STATIC_COLS_316[5]; return <StaticDataColumn316 {...c} />; }
function Frame388() { const c = STATIC_COLS_316[6]; return <StaticDataColumn316 {...c} />; }
function Frame378() { const c = STATIC_COLS_316[7]; return <StaticDataColumn316 {...c} />; }
function Frame384() { const c = STATIC_COLS_316[8]; return <StaticDataColumn316 {...c} />; }
function Frame379() { const c = STATIC_COLS_316[9]; return <StaticDataColumn316 {...c} />; }
function Frame385() { const c = STATIC_COLS_316[10]; return <StaticDataColumn316 {...c} />; }
function Frame390() { const c = STATIC_COLS_316[11]; return <StaticDataColumn316 {...c} />; }
function Frame381() { const c = STATIC_COLS_316[12]; return <StaticDataColumn316 {...c} />; }
function Frame382() { const c = STATIC_COLS_316[13]; return <StaticDataColumn316 {...c} />; }
function Frame392() { const c = STATIC_COLS_316[14]; return <StaticDataColumn316 {...c} />; }

function Frame383() {
  return (
    <div className="relative shrink-0 w-[100px]">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] w-full">
        <div className="bg-[#f6f7f8] h-[40px] relative shrink-0 w-full sticky top-0 z-[1] border-r border-[#E4E5E9]" data-name="Table_Header Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center p-[8px] relative size-full">
              <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
                  <p className="leading-[22px] overflow-hidden text-ellipsis">개별 액셀 저장</p>
                </div>
              </div>
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
  const { activeTab } = useContext(MaeIpMyeongseSubTabCtx);
  const isPartnerTab = activeTab === '협력사';
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [confirmedIndices, setConfirmedIndices] = useState<Set<number>>(new Set());
  const [issuedIndices, setIssuedIndices] = useState<Set<number>>(new Set());
  const [paidIndices, setPaidIndices] = useState<Set<number>>(new Set());
  const addConfirmedIndices = (indices: Set<number>) => {
    setConfirmedIndices(prev => { const next = new Set(prev); indices.forEach(i => next.add(i)); return next; });
    setSelectedRows(new Set());
    // 확정 후 전체 보기로 전환 → 발행대기가 된 행이 필터에 가려지지 않고 보이도록
    setSelected(new Set([0]));
  };
  const getEffectiveStatus316 = (i: number) => {
    if (paidIndices.has(i))    return '지급완료';
    if (issuedIndices.has(i))  return '지급대기';
    if (confirmedIndices.has(i)) return '발행대기';
    return ROW_STATUSES_316[i % ROW_STATUSES_316.length];
  };
  const handleStatusChange316 = (rowIdx: number, newStatus: string) => {
    if (newStatus === '발행대기') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
    } else if (newStatus === '지급대기') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
      setIssuedIndices(prev => new Set([...prev, rowIdx]));
    } else if (newStatus === '지급완료') {
      setConfirmedIndices(prev => new Set([...prev, rowIdx]));
      setIssuedIndices(prev => new Set([...prev, rowIdx]));
      setPaidIndices(prev => new Set([...prev, rowIdx]));
    }
    // 상태 변경 후 전체 보기로 전환 → 변경된 행이 필터에 가려지지 않고 보이도록
    setSelected(new Set([0]));
  };
  const [originSelected, setOriginSelected] = useState<Set<number>>(new Set());
  const [driverSelected, setDriverSelected] = useState<Set<number>>(new Set());
  const [partnerSelected316, setPartnerSelected316] = useState<Set<number>>(new Set());
  const [detailData, setDetailData] = useState<{ id: string; status: string; shipper: string; shipperGroup: string; period: string; rowIdx: number } | null>(null);
  const [dateRangeStart, setDateRangeStart] = useState<Date|null>(() => { const t = new Date(2026,5,29); t.setMonth(t.getMonth()-1); t.setHours(0,0,0,0); return t; });
  const [dateRangeEnd, setDateRangeEnd] = useState<Date|null>(new Date(2026,5,29));
  const tableRef = useRef<HTMLDivElement>(null);
  const templateCellsRef316 = useRef<WeakMap<Element, HTMLElement[]>>(new WeakMap());
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx316);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 300;

  const hiddenRows = useMemo(() => {
    const filterStatuses = selected.has(0) ? null : new Set([...selected].map(i => ITEMS_316[i].label.split(" (")[0]));
    const hidden = new Set<number>();
    const parseYYMMDD316 = (s: string) => { const [yy,mm,dd]=s.split('.').map(Number); return new Date(2000+yy,mm-1,dd).getTime(); };
    const lo316 = dateRangeStart ? dateRangeStart.getTime() : null;
    const hi316 = dateRangeEnd ? dateRangeEnd.getTime() + 86399999 : (lo316 !== null ? lo316 + 86399999 : null);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const statusMatch = !filterStatuses || filterStatuses.has(ROW_STATUSES_316[i % ROW_STATUSES_316.length]);
      const rowOrigin = ORIGIN_OPTIONS_316[i % ORIGIN_OPTIONS_316.length];
      const originMatch = originSelected.size === 0 || [...originSelected].some(idx => ORIGIN_OPTIONS_316[idx] === rowOrigin);
      if (!statusMatch || !originMatch) { hidden.add(i); continue; }
      if (lo316 !== null) {
        const rowT = parseYYMMDD316(getCreationDate316(i));
        if (rowT < lo316 || rowT > hi316!) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, originSelected, confirmedIndices, issuedIndices, paidIndices, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
      const cells = Array.from(col.querySelectorAll<HTMLElement>('[data-name="Table_Data Cells"]'));
      if (!cells.length) return;
      const parent = cells[0].parentElement!;
      const SRC: Record<string, number> = { '확정대기': 0, '발행대기': 6, '지급대기': 11, '지급완료': 13 };
      const headerText316 = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim();
      const isInvoiceIdCol = headerText316 === '거래명세서ID';
      const isCreationDateCol = headerText316 === '거래명세서 생성일자';
      // 컬럼 Element를 키로 원본 Figma 템플릿 셀 최초 1회 캐싱
      if (!templateCellsRef316.current.has(col)) {
        templateCellsRef316.current.set(col, cells.map(c => c.cloneNode(true) as HTMLElement));
      }
      const tmplCells316 = templateCellsRef316.current.get(col)!;
      cells.forEach((c) => parent.removeChild(c));
      const sortedIndices = Array.from({ length: TOTAL_ROWS }, (_, i) => i).sort((a, b) => {
        const da = getCreationDateIdx316(a);
        const db = getCreationDateIdx316(b);
        if (da !== db) return da - db;
        const sa = STATUS_PRIORITY_316[getEffectiveStatus316(a)] ?? 99;
        const sb = STATUS_PRIORITY_316[getEffectiveStatus316(b)] ?? 99;
        return sa !== sb ? sa - sb : a - b;
      });
      for (const origIdx of sortedIndices) {
        const s = getEffectiveStatus316(origIdx);
        const srcIdx316 = SRC[s] ?? (origIdx % tmplCells316.length);
        const cell = (tmplCells316[srcIdx316]?.cloneNode(true) ?? tmplCells316[0].cloneNode(true)) as HTMLElement;
        cell.dataset.tableRow = String(origIdx);
        if (isCreationDateCol) {
          const p = cell.querySelector('p') || cell;
          p.textContent = getCreationDate316(origIdx);
        }
        if (isInvoiceIdCol) {
          const p = cell.querySelector('p');
          if (p) {
            p.textContent = INVOICE_IDS_316[origIdx];
            p.style.cursor = 'pointer';
            p.style.textDecoration = 'underline';
            const rowIdx = origIdx;
            p.addEventListener('click', (e) => {
              const id = (e.currentTarget as HTMLElement).textContent?.trim() ?? '';
              const status = getEffectiveStatus316(rowIdx);
              let shipper = '', shipperGroup = '', period = '';
              if (tableRef.current) {
                tableRef.current.querySelectorAll(':scope > *').forEach((col) => {
                  const header = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim() ?? '';
                  const rowCell = col.querySelector(`[data-table-row="${rowIdx}"]`);
                  const value = rowCell?.querySelector('p')?.textContent?.trim() ?? '';
                  if (header === '기사명') shipper = value;
                  else if (header === '정산기간') period = value;
                });
              }
              setDetailData({ id, status, shipper, shipperGroup: '', period, rowIdx });
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
  }, [confirmedIndices, issuedIndices, paidIndices]);
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


  // 협력사 탭: 차량번호/기사명 컬럼 숨기기 + 기사 산재보험료 컬럼명 변경
  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.querySelectorAll<HTMLElement>(':scope > *').forEach((col) => {
      const headerText = col.querySelector('[data-name="Table_Header Cells"]')?.textContent?.trim();
      if (headerText === '차량번호' || headerText === '기사명') {
        if (isPartnerTab) {
          (col as HTMLElement).style.width = '0';
          (col as HTMLElement).style.minWidth = '0';
          (col as HTMLElement).style.overflow = 'hidden';
          (col as HTMLElement).style.flexShrink = '1';
        } else {
          (col as HTMLElement).style.width = '';
          (col as HTMLElement).style.minWidth = '';
          (col as HTMLElement).style.overflow = '';
          (col as HTMLElement).style.flexShrink = '';
        }
      }
      if (headerText === '기사 산재보험료' || headerText === '협력사 산재보험료') {
        const headerCell = col.querySelector<HTMLElement>('[data-name="Table_Header Cells"] p');
        if (headerCell) headerCell.textContent = isPartnerTab ? '협력사 산재보험료' : '기사 산재보험료';
      }
    });
  }, [isPartnerTab]);

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
    <DateFilterCtx316.Provider value={{ rangeStart: dateRangeStart, rangeEnd: dateRangeEnd, setRangeStart: setDateRangeStart, setRangeEnd: setDateRangeEnd }}>
    <BubbleCtx316.Provider value={{ originSelected, setOriginSelected, driverSelected, setDriverSelected, partnerSelected316, setPartnerSelected316 }}>
    <FilterCtx316.Provider value={{ selected, setSelected }}>
    <TableCtrlCtx.Provider value={{ filteredTotal: TOTAL_ROWS - hiddenRows.size, selectedCount: selectedRows.size, selectedRows, confirmedIndices, addConfirmedIndices, issuedIndices, addIssuedIndices: (indices: Set<number>) => setIssuedIndices(prev => new Set([...prev, ...indices])), paidIndices, clearSelectedRows: () => setSelectedRows(new Set()) }}>
    <div className="flex-[1_0_0] min-h-px relative w-full" data-name="con">
      <div className="content-stretch flex flex-col items-start pt-[4px] px-[32px] relative size-full">
        <Frame3 />
        <FilterSorterModule />
        <TasaBanner316 />
        <Frame406 />
        <TableControlModule />
        <div className="content-stretch flex items-start relative shrink-0 w-[1648px] h-[840px] overflow-auto pb-[120px]" data-name="매입거래명세서표_소속기사" ref={tableRef}>
          <Frame373 />
          <Frame389 />
          <Frame391 />
          <Frame374 />
          <ColGeneration316 />
          <PartnerCol316 />
          <Frame375 />
          <Frame376 />
          <Frame380 />
          <Frame386 />
          <Frame377 />
          <Frame387 />
          <Frame388 />
          <Frame378 />
          <Frame384 />
          <Frame379 />
          <Frame385 />
          <Frame390 />
          <Frame381 />
          <Frame382 />
          <Frame392 />
          <Frame383 />
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx316.Provider>
    </BubbleCtx316.Provider>
    </DateFilterCtx316.Provider>
    {detailData && createPortal(
      <ScaledOverlay>
        <InvoiceDetail
          invoiceId={detailData.id}
          rowStatus={detailData.status}
          invoiceType="매입"
          shipper={detailData.shipper}
          shipperGroup={detailData.shipperGroup}
          period={detailData.period}
          onStatusChange={(newStatus) => handleStatusChange316(detailData.rowIdx, newStatus)}
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
  const { currentPage, filteredTotal } = useContext(PageCtx316);
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
  const { currentPage, setCurrentPage, filteredTotal } = useContext(PageCtx316);
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
    <PageCtx316.Provider value={{ currentPage, setCurrentPage, filteredTotal, setFilteredTotal }}>
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
    </PageCtx316.Provider>
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
      <SharedLnb activeTabIndex={4} />
      <Right />
    </div>
  );
}

export default function Component12() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.6 매입 거래명세서_소속기사">
      <Ui />
    </div>
  );
}