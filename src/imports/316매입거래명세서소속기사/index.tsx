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
  '26.01.05','26.01.07','26.01.09','26.01.12','26.01.14','26.01.16','26.01.19','26.01.21',
  '26.01.23','26.01.26','26.01.28','26.01.30','26.02.02','26.02.04','26.02.06','26.02.09',
  '26.02.11','26.02.13','26.02.16','26.02.18','26.02.20','26.02.23','26.02.25','26.02.27',
  '26.03.02','26.03.04','26.03.06','26.03.09','26.03.11','26.03.13','26.03.16','26.03.18',
  '26.03.20','26.03.23','26.03.25','26.03.27','26.03.30','26.04.01','26.04.03','26.04.06',
  '26.04.08','26.04.10','26.04.13','26.04.15','26.04.17','26.04.20','26.04.22','26.04.24',
  '26.04.27','26.04.29',
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

const PageCtx316 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 5000, setFilteredTotal: () => {} });
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
  { label: "확정대기 (1,000건)", amountRaw: 21_600_000 },
  { label: "발행대기 (500건)",   amountRaw: 97_300_000 },
  { label: "지급대기 (1,500건)", amountRaw: 184_600_000 },
  { label: "지급완료 (2,000건)", amountRaw: 654_800_000 },
];
const ITEMS_316_TOTAL = ITEMS_316_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_316 = [
  { label: "전체 (5,000건)", amount: formatKorean(ITEMS_316_TOTAL) },
  ...ITEMS_316_RAW.map(x => ({ label: x.label, amount: formatKorean(x.amountRaw) })),
];

const ITEMS_316_PARTNER = [
  { label: "전체 (5,000건)", amount: formatKorean(Math.round(ITEMS_316_TOTAL * 0.47)) },
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
}>({ filteredTotal: 5000, selectedCount: 0, selectedRows: new Set(), confirmedIndices: new Set(), addConfirmedIndices: () => {}, issuedIndices: new Set(), addIssuedIndices: () => {}, paidIndices: new Set(), clearSelectedRows: () => {} });

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

function Frame389() {
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center px-[8px] py-[10px] relative size-full">
              <div className="bg-[#fce9e9] content-stretch flex gap-[2px] h-[26px] items-center justify-center overflow-clip px-[6px] relative rounded-[4px] shrink-0" data-name="badge">
                <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[#d22] text-[13px] tracking-[-0.26px] whitespace-nowrap">
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">확정대기</p>
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
                  <p className="leading-[19px]">발행대기</p>
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
                  <p className="leading-[19px]">발행대기</p>
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
                  <p className="leading-[19px]">발행대기</p>
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
                  <p className="leading-[19px]">발행대기</p>
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
                  <p className="leading-[19px]">발행대기</p>
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

function Frame6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
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

function Frame27() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-[15px] text-ellipsis underline cursor-pointer">ZXC9123</p>
      </div>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">차량번호</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame66() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">12아3456</p>
      </div>
    </div>
  );
}

function Frame68() {
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
    <div className="relative shrink-0 w-[100px]">
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사명</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">김카모</p>
      </div>
    </div>
  );
}

function Frame376() {
  return (
    <div className="relative shrink-0 w-[100px]">
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

function Frame92() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame99() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame102() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame110() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">26.05.07 ~ 26.05.12</p>
      </div>
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

function Frame113() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame116() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame117() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame118() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame119() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame120() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame122() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame124() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame130() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame131() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame132() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">2건</p>
      </div>
    </div>
  );
}

function Frame386() {
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
      <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
    </div>
  );
}

function Title14() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="title">
      <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic overflow-hidden relative shrink-0 text-[#5c6370] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">배차금액 합계</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame135() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame143() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame144() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame145() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame146() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame147() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame148() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame149() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame151() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame153() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
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

function Frame155() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame156() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame157() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame160() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame161() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame162() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame163() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame164() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame165() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame166() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame167() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame168() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame169() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame170() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame171() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame172() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame173() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame174() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame387() {
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

function Frame176() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame177() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame178() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame179() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame180() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame181() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame182() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame183() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame184() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame185() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame186() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame187() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame188() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame189() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame190() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame191() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame192() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame193() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame194() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
    </div>
  );
}

function Frame195() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">300,000</p>
      </div>
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
              <Frame175 />
            </div>
          </div>
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame194 />
            </div>
          </div>
          <div aria-hidden className="absolute border-[#e3e5e9] border-b border-solid inset-0 pointer-events-none" />
        </div>
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
          <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[10px] relative size-full">
              <Frame195 />
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

function Frame197() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame198() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame199() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame200() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame201() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame202() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame203() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame204() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame205() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame206() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame207() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame208() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame209() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame210() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame211() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame212() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame213() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame214() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame215() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
    </div>
  );
}

function Frame216() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">30,000</p>
      </div>
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

function Frame218() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame220() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame221() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame222() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame223() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame224() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame225() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame226() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame227() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame228() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame229() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame230() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame231() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame232() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame233() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame234() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame235() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame236() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame237() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame238() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">330,000</p>
      </div>
    </div>
  );
}

function Frame384() {
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">기사 산재보험료</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame241() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame242() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame243() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame244() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame245() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame246() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame247() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame248() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame249() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame250() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame251() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame252() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame253() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame254() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame255() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame256() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame257() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame258() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
    </div>
  );
}

function Frame259() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">1,880</p>
      </div>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">합계 금액 (산재 포함)</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame262() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame263() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame264() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame265() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame266() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame267() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame268() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame269() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame270() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame271() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame272() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame273() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame274() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame275() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame276() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame277() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame278() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame279() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
    </div>
  );
}

function Frame281() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">328,120</p>
      </div>
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

function Frame284() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame285() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame286() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame287() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame288() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame289() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame290() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame291() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame292() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame293() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame294() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame295() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame296() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame297() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame298() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame299() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame300() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame301() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame302() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame303() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
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

function Frame305() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame306() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame307() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame308() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame309() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame310() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame311() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame312() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame313() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame314() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame315() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame316() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame317() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame318() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame319() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame320() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame321() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame322() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame323() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame324() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">지급기한</p>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame327() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame328() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame329() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame330() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame331() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame332() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame333() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame334() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame335() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame336() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame337() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame338() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame339() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame340() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame341() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame342() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame343() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame344() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame345() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="leading-[22px] overflow-hidden text-ellipsis">{`25.10.20 `}</p>
      </div>
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
        <p className="leading-[22px] overflow-hidden text-ellipsis">지급일</p>
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
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame348() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame349() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame350() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame351() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame352() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame353() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame354() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame355() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame356() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame357() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame358() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame359() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame360() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame361() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame362() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame363() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame364() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame365() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
      </div>
    </div>
  );
}

function Frame366() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative">
      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] min-w-px not-italic overflow-hidden relative text-[#2e3238] text-[0px] text-ellipsis tracking-[-0.3px] whitespace-nowrap">
        <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid leading-[22px] overflow-hidden text-[15px] text-ellipsis underline">{`25.10.20 `}</p>
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

function Frame383() {
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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
        <div className="bg-white h-[40px] relative shrink-0 w-full" data-name="Table_Data Cells">
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

  const TOTAL_ROWS = 5000;

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
  const [filteredTotal, setFilteredTotal] = useState(5000);
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