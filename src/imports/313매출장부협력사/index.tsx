import { useState, createContext, useContext, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { SubTabCtx, type MaeChulSubTab } from "../shared/subTabCtx";
import svgPaths from "../313매출장부화주사/svg-iyfriqgqjg";
import ORDER_IDS from "../shared/orderIds";
import { modalSvg, emptySvg } from "../313매출장부화주사/svg-modal";

// ── 매출 상태 전환 조건 ────────────────────────────────────────────────────
// 마감필요: 협력사 정보 미입력 또는 청구금액 미확인
// 정산대기: 협력사 정보 입력 그리고 청구금액 확인
// 수금대기: 수기계산서 등록 또는 매출 거래명세서 페이지에서 수기계산서 또는 전자 세금계산서 발행
// 수금완료: 수금완료 처리 또는 매출 거래명세서 페이지에서 수금완료 처리
// 정산보류: 상위 거래처가 매입장부에서 정산보류 처리한 경우 매출장부에 정산보류로 보여짐
const ROW_STATUSES_313 = ["마감필요","정산대기","정산대기","정산대기","정산대기","정산대기","수금대기","수금대기","수금완료","수금완료","정산보류"];

function formatKorean313(n: number): string {
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

const PARTNERS_313C = [
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
const PARTNER_ROW_DATA_313C = PARTNERS_313C;

const PageCtx313 = createContext<{ currentPage: number; setCurrentPage: (n: number) => void; filteredTotal: number; setFilteredTotal: (n: number) => void }>({ currentPage: 1, setCurrentPage: () => {}, filteredTotal: 300, setFilteredTotal: () => {} });
const ModalCtx313 = createContext<{ openModal: (indices: number[]) => void }>({ openModal: () => {} });
const FilterCtx313 = createContext<{ selected: Set<number>; setSelected: (s: Set<number>) => void }>({ selected: new Set([0]), setSelected: () => {} });

interface BubbleCtx313Type {
  partnerSelected: Set<number>;
  setPartnerSelected: (s: Set<number>) => void;
}
const BubbleCtx313 = createContext<BubbleCtx313Type>({
  partnerSelected: new Set(), setPartnerSelected: () => {},
});

const DynamicCountCtx313 = createContext<{ statusCounts: number[]; totalAmount: number }>({
  statusCounts: [], totalAmount: 0,
});

function DashboardCard({ label, amount, active, onClick }: { label: string; amount: string; active: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[8px] flex-1 min-w-0 h-[72px] flex flex-col justify-center items-center px-[8px] py-[12px] ${active ? "bg-white" : "bg-[#f6f7f8] hover:bg-[#EBEDEF]"} ${onClick ? "cursor-pointer select-none" : ""}`}
    >
      {active && <div aria-hidden className="absolute border border-[#EBEDEF] border-solid inset-0 pointer-events-none rounded-[8px]" />}
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#5c6370] text-[15px] leading-[22px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#2e3238] text-[18px] leading-[26px] tracking-[-0.36px] whitespace-nowrap overflow-hidden text-ellipsis">{amount}</p>
    </div>
  );
}

function StatusCardRowLarge({ items }: { items: { label: string; amount: string }[] }) {
  const { selected, setSelected } = useContext(FilterCtx313);
  const { statusCounts, totalAmount } = useContext(DynamicCountCtx313);
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

  const getDynamicLabel = (origLabel: string, i: number): string => {
    if (statusCounts.length === 0) return origLabel.replace("건)", ")");
    const base = origLabel.split(" (")[0];
    const count = i === 0 ? statusCounts.reduce((a, b) => a + b, 0) : (statusCounts[i - 1] ?? 0);
    return `${base} (${count.toLocaleString()}건)`.replace("건)", ")");
  };

  const getDynamicAmount = (origAmount: string, i: number): string => {
    if (statusCounts.length === 0) return origAmount;
    if (i === 0) return formatKorean313(totalAmount);
    const perRowAmounts: Record<string, number> = {
      '마감필요': 0,
      '정산대기': Math.round(312_000_000 / 2273),
      '수금대기': Math.round(548_700_000 / 909),
      '수금완료': Math.round(1_240_500_000 / 909),
      '정산보류': Math.round(87_300_000 / 454),
    };
    const statusNames = ['마감필요','정산대기','수금대기','수금완료','정산보류'];
    const statusName = statusNames[i - 1] ?? '';
    return formatKorean313((statusCounts[i - 1] ?? 0) * (perRowAmounts[statusName] ?? 0));
  };

  return (
    <div className="flex items-start py-[12px] relative shrink-0 w-full" style={{height: 112}}>
      <div className="bg-[#f6f7f8] rounded-[8px] flex-1 flex flex-col justify-center items-start p-[8px] gap-[12px]" style={{height: 88}}>
        <div className="flex gap-[4px] w-full" style={{height: 72}}>
          {items.map((item, i) => (
            <DashboardCard key={item.label} label={getDynamicLabel(item.label, i)} amount={getDynamicAmount(item.amount, i)} active={selected.has(i)} onClick={() => handleClick(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-px items-start min-w-px not-italic relative">
      <p className="font-['Pretendard_GOV:Bold'] leading-[22px] overflow-hidden relative shrink-0 text-[#2e3238] text-[15px] text-ellipsis tracking-[-0.3px] w-full whitespace-nowrap">쿠팡로지스틱스</p>
      <p className="font-['Pretendard_GOV:Regular'] leading-[19px] relative shrink-0 text-[#5c6370] text-[13px] tracking-[-0.26px] w-full">김카모</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative">
      <Frame />
    </div>
  );
}

function Icon() {
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

function Title() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="relative shrink-0 size-[24px]" data-name="type=location">
        <div className="absolute inset-[12.5%_20.84%_12.76%_20.83%]" data-name="2021.11">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.9995 17.9384">
            <path d={svgPaths.p7556800} fill="var(--fill-0, #9197A1)" id="2021.11" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">실시간 운송관제</p>
    </div>
  );
}

function Frame280() {
  return (
    <svg width="35" height="24" viewBox="0 0 35 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="2.5" width="34.0001" height="19" rx="9.5" fill="url(#ai_grad0)"/>
      <rect x="0.5" y="2.5" width="34.0001" height="19" rx="9.5" stroke="url(#ai_grad1)"/>
      <path d="M12.119 16.2806C12.6533 14.5029 13.9923 13.0735 15.7147 12.4101C15.8855 12.3441 16.0001 12.1831 16.0001 12.0002C16.0001 11.8173 15.8855 11.6563 15.7147 11.5903C13.9923 10.9269 12.6533 9.49678 12.119 7.7198C12.0704 7.55812 11.9239 7.44653 11.7546 7.44653H10.2076C10.1013 7.44653 10.0034 7.49132 9.93359 7.56495C10.1773 9.38368 11.1625 10.9671 12.5752 12.001C11.1625 13.0356 10.178 14.619 9.93359 16.437C10.0034 16.5106 10.1013 16.5554 10.2076 16.5554H11.7546C11.9231 16.5554 12.0704 16.443 12.119 16.2821V16.2806Z" fill="url(#ai_grad2)"/>
      <path d="M9.38773 11.999C10.8004 10.9644 11.7849 9.38097 12.0293 7.563C11.9595 7.48937 11.8615 7.44458 11.7553 7.44458H10.2083C10.0398 7.44458 9.89252 7.55692 9.84393 7.7186C9.31334 9.4842 7.98877 10.9067 6.28237 11.5762C6.1131 11.643 6 11.8032 6 11.9853V12.0127C6 12.1948 6.1131 12.355 6.28237 12.4218C7.98801 13.0913 9.31334 14.5138 9.84393 16.2802C9.89252 16.4418 10.039 16.5542 10.2083 16.5542H11.7553C11.8615 16.5542 11.9595 16.5094 12.0293 16.4358C11.7856 14.617 10.8004 13.0336 9.38773 11.9998V11.999Z" fill="url(#ai_grad3)"/>
      <path d="M20.9329 9.36813L18.7547 16H17L19.9758 8H21.0924L20.9329 9.36813ZM22.7426 16L20.5589 9.36813L20.3828 8H21.5105L24.5028 16H22.7426ZM22.6436 13.022V14.3132H18.4136V13.022H22.6436Z" fill="white"/>
      <path d="M27 8V16H25.3553V8H27Z" fill="white"/>
      <defs>
        <linearGradient id="ai_grad0" x1="0" y1="2" x2="34.9998" y2="21.9996" gradientUnits="userSpaceOnUse">
          <stop stopColor="#337FFF"/><stop offset="1" stopColor="#9966FF"/>
        </linearGradient>
        <linearGradient id="ai_grad1" x1="4.39399e-07" y1="3" x2="20.2908" y2="18.2986" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.5"/><stop offset="1" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="ai_grad2" x1="12.9668" y1="6.60776" x2="12.9668" y2="18.9055" gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="white"/><stop offset="0.5" stopColor="#E4EEFF"/><stop offset="0.69" stopColor="#B8D3FF"/>
        </linearGradient>
        <linearGradient id="ai_grad3" x1="9.01503" y1="6.60732" x2="9.01503" y2="18.905" gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="white"/><stop offset="0.7" stopColor="white"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function Title1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <div className="absolute h-[17.658px] left-[4px] top-[3.09px] w-[16px]" data-name="Exclude">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 17.6582">
            <path d={svgPaths.pc21c880} fill="var(--fill-0, #9197A1)" id="Exclude" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Pretendard_GOV:Bold'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">배차 관리</p>
      <Frame280 />
    </div>
  );
}

function MenuList() {
  return (
    <div className="h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center pl-[4px] pr-[8px] py-[8px] relative size-full">
          <Title1 />
        </div>
      </div>
    </div>
  );
}

function MenuSet() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[184px]" data-name="menu_set">
      <MenuList />
    </div>
  );
}

function Title2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <div className="absolute left-[4px] size-[16px] top-[4px]" data-name="Subtract">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
            <path d={svgPaths.p28d42880} fill="var(--fill-0, #9197A1)" id="Subtract" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">정산</p>
    </div>
  );
}

function Component1() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="우측">
      <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_up">
        <div className="flex items-center justify-center relative shrink-0">
          <div className="-scale-y-100 flex-none rotate-180">
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
  );
}

function Title3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <div className="absolute inset-[23.47%_16.24%_23.48%_17.45%]" data-name="Shape">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9141 12.7312">
            <path clipRule="evenodd" d={svgPaths.p20784231} fill="var(--fill-0, #9197A1)" fillRule="evenodd" id="Shape" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">바로선지급</p>
    </div>
  );
}

function Component2() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="우측">
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
  );
}

function Component13() {
  return (
    <div className="absolute inset-[19.58%_16.64%_20.38%_16.65%]" data-name="2021.11">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.01 14.4096">
        <g id="2021.11">
          <path d={svgPaths.p1d817400} fill="var(--fill-0, #9197A1)" id="Rectangle 3" />
          <path d={svgPaths.p1c77d300} fill="var(--fill-0, #9197A1)" id="Rectangle 6" />
          <path d={svgPaths.p3977d980} fill="var(--fill-0, #9197A1)" id="Rectangle 4" />
          <line id="Line 2" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="3.05039" x2="3.35148" y1="5.7543" y2="5.7543" />
          <line id="Line 9" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="7.85508" x2="8.15617" y1="5.7543" y2="5.7543" />
          <line id="Line 10" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="7.85508" x2="8.15617" y1="3.35244" y2="3.35244" />
          <line id="Line 3" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="3.05039" x2="3.35148" y1="8.15566" y2="8.15566" />
          <line id="Line 11" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="7.85508" x2="8.15617" y1="8.15566" y2="8.15566" />
          <line id="Line 8" stroke="var(--stroke-0, #F6F7F8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" x1="12.6578" x2="12.9589" y1="8.15547" y2="8.15547" />
        </g>
      </svg>
    </div>
  );
}

function Title4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <Component13 />
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">거래처</p>
    </div>
  );
}

function Component3() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="우측">
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
  );
}

function Group4() {
  return (
    <div className="absolute h-[12.17px] left-[3.5px] top-[6px] w-[17.151px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.151 12.1698">
        <g id="Group 1410080888">
          <path d={svgPaths.p132b4c80} fill="var(--fill-0, #9197A1)" id="Subtract" />
          <path d={svgPaths.p9939440} fill="var(--fill-0, #9197A1)" id="Subtract_2" />
          <path d={svgPaths.p14fe5100} fill="var(--fill-0, #9197A1)" id="Ellipse 1007" />
          <path d={svgPaths.p10410780} fill="var(--fill-0, #9197A1)" id="Ellipse 1008" />
        </g>
      </svg>
    </div>
  );
}

function Title5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <Group4 />
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">기사</p>
    </div>
  );
}

function Component4() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="우측">
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
  );
}

function Title6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="title">
      <div className="relative shrink-0 size-[24px]" data-name="Icon_24_menu">
        <div className="absolute inset-[19.58%_16.78%_20.33%_16.8%]" data-name="2021.11">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9404 14.4219">
            <path d={svgPaths.p465c800} fill="var(--fill-0, #9197A1)" id="2021.11" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Pretendard_GOV:Bold'] leading-[22px] min-w-px not-italic relative text-[#2e3238] text-[15px] tracking-[-0.3px]">회사</p>
    </div>
  );
}

function Component5() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="우측">
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
  );
}

function Frame282() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0">
      <div className="bg-[#f6f7f8] content-stretch flex gap-[8px] h-[40px] items-center justify-center overflow-clip pl-[4px] pr-[8px] py-[8px] relative rounded-[4px] shrink-0 w-[184px]" data-name="menu_list">
        <Title />
      </div>
      <MenuSet />
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[184px]" data-name="menu_set">
        <div className="bg-[#f6f7f8] h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between pl-[4px] pr-[8px] py-[8px] relative size-full">
              <Title2 />
              <Component1 />
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center pl-[36px] pr-[8px] py-[6px] relative size-full">
              <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">통합장부</p>
            </div>
          </div>
        </div>
        <div className="bg-[#ebedef] h-[34px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center pl-[36px] pr-[8px] py-[6px] relative size-full">
              <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">매출장부</p>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center pl-[36px] pr-[8px] py-[6px] relative size-full">
              <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">매입장부</p>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center pl-[36px] pr-[8px] py-[6px] relative size-full">
              <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">매출 거래명세서</p>
            </div>
          </div>
        </div>
        <div className="bg-[#f6f7f8] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center pl-[36px] pr-[8px] py-[6px] relative size-full">
              <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">매입 거래명세서</p>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-[184px]" data-name="menu_set">
        <div className="bg-[#f6f7f8] h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between pl-[4px] pr-[8px] py-[8px] relative size-full">
              <Title3 />
              <Component2 />
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-[184px]" data-name="menu_set">
        <div className="bg-[#f6f7f8] h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between pl-[4px] pr-[8px] py-[8px] relative size-full">
              <Title4 />
              <Component3 />
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-[184px]" data-name="menu_set">
        <div className="bg-[#f6f7f8] h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between pl-[4px] pr-[8px] py-[8px] relative size-full">
              <Title5 />
              <Component4 />
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-[184px]" data-name="menu_set">
        <div className="bg-[#f6f7f8] h-[40px] relative rounded-[4px] shrink-0 w-full" data-name="menu_list">
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between pl-[4px] pr-[8px] py-[8px] relative size-full">
              <Title6 />
              <Component5 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col h-[440px] items-start relative shrink-0 w-[184px]">
      <Frame282 />
    </div>
  );
}

function Component() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="컨텐츠 영역">
      <div className="h-px relative shrink-0 w-[208px]" data-name="Vector 2553 (Stroke)">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 208 1">
          <path d="M208 0V1H0V0H208Z" fill="var(--fill-0, #E4E5E9)" id="Vector 2553 (Stroke)" />
        </svg>
      </div>
      <Frame2 />
    </div>
  );
}

function Top() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[12px] items-center left-0 top-[13px] w-[208px]" data-name="top">
      <div className="content-stretch flex gap-[8px] items-center overflow-clip pl-[10px] pr-[8px] py-[7px] relative rounded-[8px] shrink-0 w-[184px]" data-name="menu_profile">
        <Frame1 />
        <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Icon_16/arrow_right">
          <Icon />
        </div>
      </div>
      <Component />
    </div>
  );
}

function Component6() {
  return (
    <div className="absolute contents left-0 top-[122px]" data-name="닫힘/펼침">
      <div className="absolute flex h-[62.836px] items-center justify-center left-0 top-[123.16px] w-[208px]">
        <div className="-scale-y-100 flex-none">
          <div className="bg-[#e3e5e9] h-[62.836px] opacity-0 relative w-[208px]" />
        </div>
      </div>
      <div className="absolute content-stretch flex flex-col h-[30.255px] items-center justify-center left-[16px] rounded-[4px] top-[139.45px] w-[26px]" data-name="Button">
        <div className="relative shrink-0 size-[24px]" data-name="Icon_24/arrow_double_left">
          <div className="absolute flex h-[16px] items-center justify-center left-[5px] top-[4px] w-[7px]">
            <div className="-scale-y-100 flex-none">
              <div className="h-[16px] relative w-[7px]" data-name="2021.11">
                <div className="absolute inset-[-4.69%_-10.71%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.50001 17.5">
                    <path d={svgPaths.p17a5f496} id="2021.11" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute flex h-[16px] items-center justify-center left-[12px] top-[4px] w-[7px]">
            <div className="-scale-y-100 flex-none">
              <div className="h-[16px] relative w-[7px]" data-name="2021.11">
                <div className="absolute inset-[-4.69%_-10.71%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.50001 17.5">
                    <path d={svgPaths.p17a5f496} id="2021.11" stroke="var(--stroke-0, #9197A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bg-[#e3e5e9] h-[1.164px] left-0 top-[122px] w-[208px]" />
    </div>
  );
}

function Btns() {
  return (
    <div className="content-stretch flex gap-[4px] h-[18px] items-center relative shrink-0 w-full" data-name="btns">
      <div className="content-stretch flex gap-[4px] h-[18px] items-center justify-center overflow-clip px-[8px] relative rounded-[2px] shrink-0 w-[38px]" data-name="lnb_footer_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[11px] tracking-[-0.22px] whitespace-nowrap">
          <p className="leading-[18px]">공지사항</p>
        </div>
      </div>
      <div className="relative shrink-0 size-[2px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 2">
          <circle cx="1" cy="1" fill="var(--fill-0, #C7CBD1)" id="Ellipse 1006" r="1" />
        </svg>
      </div>
      <div className="content-stretch flex gap-[4px] h-[18px] items-center justify-center overflow-clip px-[8px] relative rounded-[2px] shrink-0 w-[38px]" data-name="lnb_footer_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[11px] tracking-[-0.22px] whitespace-nowrap">
          <p className="leading-[18px]">이용약관</p>
        </div>
      </div>
      <div className="relative shrink-0 size-[2px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2 2">
          <circle cx="1" cy="1" fill="var(--fill-0, #C7CBD1)" id="Ellipse 1006" r="1" />
        </svg>
      </div>
      <div className="content-stretch flex gap-[4px] h-[18px] items-center justify-center overflow-clip px-[8px] relative rounded-[2px] shrink-0 w-[75px]" data-name="lnb_footer_btn">
        <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#9197a1] text-[11px] tracking-[-0.22px] whitespace-nowrap">
          <p className="leading-[18px]">개인정보처리방침</p>
        </div>
      </div>
    </div>
  );
}

function Frame62() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-start left-[16px] top-[12px] w-[176px]">
      <p className="[word-break:break-word] font-['Pretendard_GOV:Regular'] leading-[18px] not-italic relative shrink-0 text-[#9197a1] text-[11px] tracking-[-0.22px] w-full">고객센터 1899-8287</p>
      <Btns />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[55.06%_21.42%_3.57%_26.43%]" data-name="Group">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 85.7164 13.2386">
        <g id="Group">
          <path d={svgPaths.p299ad400} fill="var(--fill-0, #9197A1)" id="Vector" />
          <path d={svgPaths.p3192dc00} fill="var(--fill-0, #9197A1)" id="Vector_2" />
          <path d={svgPaths.p14ed4600} fill="var(--fill-0, #9197A1)" id="Vector_3" />
          <path d={svgPaths.p2f427e00} fill="var(--fill-0, #9197A1)" id="Vector_4" />
          <path d={svgPaths.p281a1b00} fill="var(--fill-0, #9197A1)" id="Vector_5" />
          <path d={svgPaths.p8d99a80} fill="var(--fill-0, #9197A1)" id="Vector_6" />
          <path d={svgPaths.p6cf6c00} fill="var(--fill-0, #9197A1)" id="Vector_7" />
        </g>
      </svg>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute inset-[3.57%_45.29%_56.46%_26.43%]" data-name="Group">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 46.4865 12.7884">
        <g id="Group">
          <path d={svgPaths.p1412f380} fill="var(--fill-0, #9197A1)" id="Vector" />
          <path d={svgPaths.p21128b00} fill="var(--fill-0, #9197A1)" id="Vector_2" />
          <path d={svgPaths.p211fe180} fill="var(--fill-0, #9197A1)" id="Vector_3" />
          <path d={svgPaths.p1a8de500} fill="var(--fill-0, #9197A1)" id="Vector_4" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-[3.57%_21.42%_3.57%_26.43%]" data-name="Group">
      <Group1 />
      <Group2 />
    </div>
  );
}

function Group5() {
  return (
    <div className="absolute contents inset-[3.57%_0_2.32%_26.43%]">
      <div className="absolute inset-[54.82%_0_2.32%_81.02%]" data-name="Subtract">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 31.2012 13.7148">
          <path d={svgPaths.p2da39d80} fill="var(--fill-0, #9197A1)" id="Subtract" />
        </svg>
      </div>
      <Group />
    </div>
  );
}

function Logo() {
  return (
    <div className="-translate-y-1/2 absolute h-[32px] left-[16px] overflow-clip top-[calc(50%-11px)] w-[176px]" data-name="logo">
      <div className="-translate-y-1/2 absolute h-[32px] left-0 top-1/2 w-[164.349px]" data-name="Logo">
        <Group5 />
        <div className="absolute inset-[0_80.53%_0_0]" data-name="Subtract">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32.001 32">
            <path d={svgPaths.p1d567500} fill="var(--fill-0, #9197A1)" id="Subtract" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MenuBelow() {
  return (
    <div className="bg-[#f6f7f8] flex-[1_0_0] min-h-px relative w-[208px]" data-name="menu_below">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <Component6 />
        <Frame62 />
        <Logo />
      </div>
      <div aria-hidden className="absolute border-0 border-[#e3e5e9] border-solid inset-0 pointer-events-none" />
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
      <div className="flex h-[12px] items-center justify-center relative shrink-0 w-0">
        <div className="flex-none rotate-90">
          <div className="h-0 relative w-[12px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 1">
                <line id="Line 408" stroke="var(--stroke-0, #E4E5E9)" x2="12" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
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
            className={`content-stretch flex gap-[4px] h-[44px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer ${isActive ? "bg-[#f6f7f8] rounded-[8px]" : ""}`}
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

function TypeStatusDisabled() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">상차일</p>
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

function TypeStatusDisabled1() {
  return (
    <div className="bg-white h-[36px] relative rounded-[4px] shrink-0 w-full" data-name="type=입력형_버튼, status=Disabled">
      <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:Regular'] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">2개월 전</p>
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

function SwitchModule() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="switch_Module">
      <SwitchAtom />
      <SwitchAtom1 />
      <SwitchAtom2 />
    </div>
  );
}

function Calender() {
  return (
    <div className="content-stretch flex gap-[3px] items-center relative shrink-0 z-[8]" data-name="calender">
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[79px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-end relative shrink-0 w-[91px]" data-name="Input / 02. Selectbox">
        <TypeStatusDisabled1 />
      </div>
      <SwitchModule />
    </div>
  );
}

function Frame647() {
  const { partnerSelected, setPartnerSelected } = useContext(BubbleCtx313);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [partnerHoveredIdx, setPartnerHoveredIdx] = useState<number|null>(null);
  const partnerBtnRef = useRef<HTMLDivElement>(null);
  const partnerDropRef = useRef<HTMLDivElement>(null);
  const [partnerDropPos, setPartnerDropPos] = useState<{ top: number; left: number } | null>(null);

  const partnerBg = partnerOpen ? '#eef3ff' : partnerSelected.size > 0 ? '#f5f9ff' : partnerHovered ? '#ebedef' : '#f6f7f8';
  const partnerTextColor = (partnerOpen || partnerSelected.size > 0) ? '#005fff' : '#2e3238';

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
    <div className="content-stretch flex items-center relative shrink-0 z-[7]">
      <div ref={partnerBtnRef} style={{ position: 'relative' }}>
        <div
          className="content-stretch flex gap-[8px] h-[32px] items-center justify-center pl-[12px] pr-[10px] py-[6px] relative rounded-[30px] shrink-0 cursor-pointer select-none"
          style={{ background: partnerBg }}
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
            <p className="leading-[20px]">협력사</p>
          </div>
          {partnerSelected.size > 0 && !partnerOpen ? (
            <div className="bg-[#ccdfff] content-stretch flex flex-col items-center justify-center relative rounded-[100px] shrink-0">
              <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 size-[16px] text-[#005fff] text-[11px] text-center tracking-[-0.22px]">
                <p className="leading-[18px]">{partnerSelected.size}</p>
              </div>
            </div>
          ) : (
            <div style={{ transform: partnerOpen ? 'rotate(180deg)' : undefined, width:12, height:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke={partnerOpen ? '#005fff' : '#9197A1'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
            <div style={{ height: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313C.filter(s => s.includes(partnerSearch)).length === 0)) ? 162 : undefined, maxHeight: (partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313C.filter(s => s.includes(partnerSearch)).length === 0)) ? undefined : 162, overflowY:'auto', padding:8, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
              {partnerSelected.size === 0 && (!partnerSearch || PARTNERS_313C.filter(s => s.includes(partnerSearch)).length === 0) ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:4 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#9197A1"/>
                    <line x1="12" y1="7" x2="12" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="17.5" r="1" fill="white"/>
                  </svg>
                  <span style={{ fontSize: Math.round(15 * (window.innerWidth / 1920)), color:'#5C6370', textAlign:'center', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>검색 결과가 없습니다.</span>
                </div>
              ) : PARTNERS_313C.map((name, origIdx) => ({name, origIdx})).filter(({name, origIdx}) => (partnerSearch && name.includes(partnerSearch)) || partnerSelected.has(origIdx)).map(({name, origIdx}) => (
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
                  <span style={{ fontSize:15, color:'#2E3238', fontFamily:"'Pretendard GOV', sans-serif", letterSpacing:'-0.02em', lineHeight:'22px' }}>{name}</span>
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
    </div>
  );
}

function Component9() {
  return (
    <div className="content-stretch flex gap-[8px] isolate items-center relative shrink-0" data-name="필터 그룹">
      <Calender />
      <Frame647 />
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
  const { setPartnerSelected } = useContext(BubbleCtx313);
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <div className="content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button"
        onClick={() => { setPartnerSelected(new Set()); }}>
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
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px not-italic relative whitespace-nowrap">
      <p className="font-['Pretendard_GOV:SemiBold'] leading-[22px] relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px]">전체 (5,000건)</p>
      <p className="font-['Pretendard_GOV:Bold'] leading-[26px] relative shrink-0 text-[#005fff] text-[18px] tracking-[-0.36px]">633,502,305,305원</p>
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
  { alias: "협력사 별칭", name: "(주)글로벌로지스" },
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
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
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
  animation: "toast-slide-in 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
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

// 오더 인덱스 → 협력사/그룹 결정 (5000개를 5개 협력사에 균등 배분)
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

  // 사전 선택된 오더로 협력사/그룹 자동 결정
  const autoShipper = hasPreSelected ? getShipperForIndex(preSelectedIndices[0]) : null;
  const autoGroup   = hasPreSelected && autoShipper ? getGroupForIndex(preSelectedIndices[0], autoShipper.name) : null;

  const [shipperQuery, setShipperQuery] = useState(autoShipper?.name ?? "");
  const [selectedShipper, setSelectedShipper] = useState<typeof SHIPPERS[0] | null>(autoShipper);
  const [shipperOpen, setShipperOpen] = useState(false);
  const shipperRef = useRef<HTMLDivElement>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(autoGroup ? [autoGroup] : []);
  const groupRef = useRef<HTMLDivElement>(null);
  const [hasData, setHasData] = useState(hasPreSelected);
  const [adjItems, setAdjItems] = useState<AdjItem[]>([{ id: 1, amount: 0, sign: '+', note: '' }]);
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
  const filteredShippers = SHIPPERS.filter(s => s.name.includes(shipperQuery) || s.alias.includes(shipperQuery));

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (shipperRef.current && !shipperRef.current.contains(e.target as Node)) setShipperOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function selectShipper(s: typeof SHIPPERS[0]) {
    setSelectedShipper(s); setSelectedGroups([]); setHasData(false);
    setShipperOpen(false); setShipperQuery(s.name);
  }
  function toggleGroup(g: string) {
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
  const TABLE_COLS = ["오더ID","협력사 업무그룹","매출 명세서 기준일","상차일","하차일","상차지명","상차지주소","하차지명","하차지주소","청구금액 합계"];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(46,50,56,0.4)]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[rgba(46,50,56,0.04)] flex flex-col items-start overflow-clip relative rounded-[12px]" style={{ width: 1600, height: 800 }}>
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
                  {/* 협력사 */}
                  <div className="content-stretch flex h-[36px] items-center relative shrink-0 w-full">
                    <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">협력사</p>
                    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" ref={shipperRef}>
                      <div className="mr-[-1px] relative shrink-0 w-[108px]">
                        <div className="bg-white h-[36px] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 w-full">
                          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-bl-[4px] rounded-tl-[4px]" />
                          <div className="flex flex-row items-center size-full">
                            <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
                              <p className="[word-break:break-word] flex-1 font-['Pretendard_GOV:Regular'] leading-[22px] not-italic text-[#2e3238] text-[15px] tracking-[-0.3px] whitespace-nowrap overflow-hidden text-ellipsis">
                                {selectedShipper ? selectedShipper.alias : "협력사 별칭"}
                              </p>
                              <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
                                <div className="flex items-center justify-center"><div className="-scale-y-100">
                                  <div className="h-[4px] relative w-[10px]"><div className="absolute inset-[-17.5%_-7%]">
                                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                                      <path d={modalSvg.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                                    </svg>
                                  </div></div>
                                </div></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-[1_0_0] min-w-px relative">
                        <div className="bg-white h-[36px] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 w-full">
                          <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-br-[4px] rounded-tr-[4px]" />
                          <div className="flex flex-row items-center size-full">
                            <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
                              <div className="relative shrink-0 size-[16px] flex items-center justify-center">
                                <svg width="14" height="14" fill="none" viewBox="0 0 13.9969 13.997"><path d={modalSvg.p2edcf270} fill="#9197A1" /></svg>
                              </div>
                              <input className="flex-1 min-w-0 bg-transparent border-none outline-none font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238] placeholder:text-[#767d8a]"
                                placeholder="협력사를 검색하세요" value={shipperQuery}
                                onChange={e => { setShipperQuery(e.target.value); setShipperOpen(true); }}
                                onFocus={() => setShipperOpen(true)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {shipperOpen && filteredShippers.length > 0 && (
                        <div className="absolute top-[38px] left-0 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#e3e5e9] overflow-hidden">
                          {filteredShippers.map(s => (
                            <button key={s.name} onClick={() => selectShipper(s)}
                              className={`w-full flex items-center gap-[8px] px-[12px] py-[10px] text-left hover:bg-[#f6f7f8] transition-colors ${selectedShipper?.name === s.name ? "bg-[#f0f5ff]" : ""}`}>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-['Pretendard_GOV:SemiBold'] text-[15px] tracking-[-0.3px] leading-[22px] text-[#2e3238]">{s.name}</span>
                                <span className="font-['Pretendard_GOV:Regular'] text-[13px] tracking-[-0.26px] leading-[20px] text-[#767d8a]">{s.alias}</span>
                              </div>
                              {selectedShipper?.name === s.name && (
                                <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><path d="M2 7L5.5 10.5L12 3.5" stroke="#005FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 협력사 업무그룹 */}
                  <div className="content-stretch flex h-[36px] items-center relative shrink-0 w-full" ref={groupRef}>
                    <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-[120px]">협력사 업무그룹</p>
                    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative">
                      <button onClick={() => selectedShipper && setGroupOpen(o => !o)}
                        className={`bg-white h-[36px] relative rounded-[4px] shrink-0 w-full text-left ${!selectedShipper ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                        <div aria-hidden className="absolute border border-[#e3e5e9] border-solid inset-0 pointer-events-none rounded-[4px]" />
                        <div className="flex flex-row items-center size-full">
                          <div className="content-stretch flex gap-[4px] items-center px-[10px] py-[6px] relative size-full">
                            <p className={`[word-break:break-word] flex-1 font-['Pretendard_GOV:Regular'] h-[26px] leading-[22px] min-w-px not-italic text-[15px] tracking-[-0.3px] overflow-hidden text-ellipsis whitespace-nowrap ${groupLabel ? "text-[#2e3238]" : "text-[#767d8a]"}`}>
                              {groupLabel ?? "협력사 업무그룹"}
                            </p>
                            <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]">
                              <div className="flex items-center justify-center"><div className={groupOpen ? "" : "-scale-y-100"}>
                                <div className="h-[4px] relative w-[10px]"><div className="absolute inset-[-17.5%_-7%]">
                                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.4001 5.40003">
                                    <path d={modalSvg.p609440} stroke="#9197A1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                                  </svg>
                                </div></div>
                              </div></div>
                            </div>
                          </div>
                        </div>
                      </button>
                      {groupOpen && selectedShipper && (
                        <div className="absolute top-[38px] left-0 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#e3e5e9] overflow-hidden">
                          {availableGroups.map(g => {
                            const checked = selectedGroups.includes(g);
                            return (
                              <button key={g} onClick={() => toggleGroup(g)}
                                className={`w-full flex items-center gap-[8px] px-[12px] py-[10px] text-left hover:bg-[#f6f7f8] transition-colors ${checked ? "bg-[#f0f5ff]" : ""}`}>
                                <div className={`flex-none w-[16px] h-[16px] rounded-[3px] border flex items-center justify-center ${checked ? "bg-[#005FFF] border-[#005FFF]" : "border-[#c7cbd1] bg-white"}`}>
                                  {checked && <svg width="10" height="8" fill="none" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>}
                                </div>
                                <span className={`font-['Pretendard_GOV:Regular'] text-[15px] tracking-[-0.3px] leading-[22px] ${checked ? "text-[#2e3238] font-['Pretendard_GOV:SemiBold']" : "text-[#454b55]"}`}>{g}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                      <div className="relative shrink-0 w-[198px]"><ModalCalendarBtn label="25.08.13 ~ 25.08.13" /></div>
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
                      <ModalTableColumn width={120} header="협력사 업무그룹" rows={tableData.map(r => r.group)} />
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
                    <div className="flex items-start w-full relative" style={{ minHeight: 240 }}>
                      {TABLE_COLS.map((col, i) => (
                        <div key={i} className="relative shrink-0" style={{ width: i < 2 ? 120 : 140 }}>
                          <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
                            <ModalTableHeaderCell label={col} />
                          </div>
                          <div aria-hidden className="absolute border-[#e3e5e9] border-l border-solid inset-[0_0_0_-1px] pointer-events-none" />
                        </div>
                      ))}
                      <div className="absolute inset-0 flex flex-col gap-[8px] items-center justify-center" style={{ top: 40 }}>
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
                          협력사와 업무그룹을 선택한 후 오더를 조회해 주세요.
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
                    <div className="shrink-0 w-[160px]"><ModalCalendarBtn label="25.08.13" /></div>
                  </div>
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <p className="font-['Pretendard_GOV:Regular'] leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] whitespace-nowrap">수금기한</p>
                    <div className="shrink-0 w-[160px]"><ModalCalendarBtn label="25.08.13" /></div>
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
                          <p className="relative shrink-0">협력사 업무그룹 1 청구금액</p>
                          <p className="relative shrink-0">{fmt(group1Amt)}</p>
                        </div>
                        {selectedGroups.length > 1 && (
                          <div className="content-stretch flex font-['Pretendard_GOV:Regular'] items-center justify-between leading-[22px] not-italic relative shrink-0 text-[#5c6370] text-[15px] tracking-[-0.3px] w-full whitespace-nowrap">
                            <p className="relative shrink-0">협력사 업무그룹 2 청구금액</p>
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
                    {hasData && adjItems.map((item, idx) => (
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
  );
}
/* ────────────────────────────────────────────── */

function Frame599() {
  const { openModal } = useContext(ModalCtx313);
  return (
    <>
      <div className="content-stretch flex gap-[4px] h-[36px] items-center relative shrink-0">
        <button onClick={() => openModal([])} className="bg-[#005fff] content-stretch flex gap-[4px] h-[36px] items-center justify-center overflow-clip px-[12px] relative rounded-[4px] shrink-0 cursor-pointer" data-name="Button">
          <div className="[word-break:break-word] flex flex-col font-['Pretendard_GOV:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[15px] text-white tracking-[-0.3px] whitespace-nowrap">
            <p className="leading-[22px]">매출 거래명세서 생성</p>
          </div>
        </button>
      <div className="bg-white h-[36px] relative rounded-[4px] shrink-0" data-name="Button">
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
            <p className="leading-[22px]">협력사 별칭</p>
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


const ITEMS_313_RAW = [
  { label: "마감필요 (27건)",   amountRaw: 0 },
  { label: "정산대기 (136건)", amountRaw: 312_000_000 },
  { label: "수금대기 (55건)",   amountRaw: 548_700_000 },
  { label: "수금완료 (55건)",   amountRaw: 1_240_500_000 },
  { label: "정산보류 (27건)",   amountRaw: 87_300_000 },
];
const ITEMS_313_TOTAL = ITEMS_313_RAW.reduce((s, x) => s + x.amountRaw, 0);
const ITEMS_313 = [
  { label: "전체 (300건)", amount: formatKorean313(ITEMS_313_TOTAL) },
  ...ITEMS_313_RAW.map(x => ({ label: x.label, amount: formatKorean313(x.amountRaw) })),
];

const BADGE_STYLES_313C: Record<string, { bg: string; color: string }> = {
  '마감필요': { bg: '#fce9e9', color: '#dd2222' },
  '정산대기': { bg: '#ebedef', color: '#454b55' },
  '수금대기': { bg: '#e4fbeb', color: '#18ac42' },
  '수금완료': { bg: '#e6efff', color: '#005fff' },
  '정산보류': { bg: '#ebedef', color: '#9197a1' },
  '정산제외': { bg: '#ebedef', color: '#c7cbd1' },
};

function lcg313C(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0xFFFFFFFF; };
}

const DRIVERS_313C = ['김민준', '이서준', '박도윤', '최예준', '정시우', '이주원', '오하준', '황지호', '임준서', '신준혁'];
const CARGO_TONS_313C = ['1t', '1.4t', '2.5t', '5t', '11t', '25t'];
const VEHICLE_TYPES_313C = ['카고', '윙바디', '탑차', '냉동탑차', '리프트카'];
const VEHICLE_OPTIONS_313C = ['없음', '리프트', '로프', '알루미늄', '특수'];
const LOCATIONS_313C = ['서울 강남구', '서울 강서구', '인천 남동구', '경기 성남시', '경기 수원시', '부산 해운대구', '대구 달서구', '광주 서구', '대전 유성구', '울산 남구'];
const ADDRESSES_313C = ['강남대로 123', '서부간선도로 45', '논현로 78', '테헤란로 200', '영동대로 300', '해운대로 100', '달구벌대로 50', '광주천변로 22', '대덕대로 88', '삼산로 77'];
const BUSINESS_GROUPS_313C = ['전국물류팀', '수도권팀', '영남팀', '호남팀', '충청팀', '강원팀', '제주팀'];

function getRowData313C(rowIdx: number) {
  const rng = lcg313C(rowIdx * 31337 + 7919);
  const status = ROW_STATUSES_313[rowIdx % ROW_STATUSES_313.length];
  const partner = PARTNER_ROW_DATA_313C[rowIdx % PARTNER_ROW_DATA_313C.length];
  const businessGroup = BUSINESS_GROUPS_313C[Math.floor(rng() * BUSINESS_GROUPS_313C.length)];
  const partnerOrderNum = `P-${String(Math.floor(rng() * 900000) + 100000)}`;
  const yy = 26;
  const mm = 5 + Math.floor(rng() * 2);
  const toDate = (y: number, m: number, d: number) => `${y}.${String(m).padStart(2,'0')}.${String(d).padStart(2,'0')}`;
  const specDate = toDate(yy, mm, 1 + Math.floor(rng() * 28));
  const loadDd = 1 + Math.floor(rng() * 28);
  const loadDate = toDate(yy, mm, loadDd);
  const unloadDate = toDate(yy, mm, Math.min(loadDd + Math.floor(rng() * 3) + 1, 28));
  const loadLoc = LOCATIONS_313C[Math.floor(rng() * LOCATIONS_313C.length)];
  const loadAddr = ADDRESSES_313C[Math.floor(rng() * ADDRESSES_313C.length)];
  const unloadLoc = LOCATIONS_313C[Math.floor(rng() * LOCATIONS_313C.length)];
  const unloadAddr = ADDRESSES_313C[Math.floor(rng() * ADDRESSES_313C.length)];
  const via = rng() > 0.7 ? '있음' : '없음';
  const exclusive = rng() > 0.5 ? '독차' : '혼재';
  const roundTrip = rng() > 0.7 ? '왕복' : '편도';
  const ton = CARGO_TONS_313C[Math.floor(rng() * CARGO_TONS_313C.length)];
  const vehicleType = VEHICLE_TYPES_313C[Math.floor(rng() * VEHICLE_TYPES_313C.length)];
  const vehicleOption = VEHICLE_OPTIONS_313C[Math.floor(rng() * VEHICLE_OPTIONS_313C.length)];
  const regionPfx = ['서울', '경기', '인천', '부산'][Math.floor(rng() * 4)];
  const plateAlpha = ['가','나','다','라'][Math.floor(rng() * 4)];
  const vehicleNum = `${regionPfx}${String(Math.floor(rng() * 90) + 10)}${plateAlpha}${String(Math.floor(rng() * 9000) + 1000)}`;
  const driver = DRIVERS_313C[Math.floor(rng() * DRIVERS_313C.length)];
  const charge = Math.floor(rng() * 500 + 50) * 1000;
  const tax = Math.round(charge * 0.1);
  const total = charge + tax;
  const statementId = `S-${String(rowIdx).padStart(6, '0')}`;
  const billDd1 = 1 + Math.floor(rng() * 28);
  const billDate1 = toDate(yy, mm, billDd1);
  const billDd2 = Math.min(billDd1 + Math.floor(rng() * 5) + 1, 28);
  const billDate2 = toDate(yy, mm, billDd2);
  const collectDeadlineDd = Math.min(28, billDd2 + Math.floor(rng() * 10) + 5);
  const collectDeadline = toDate(yy, mm, collectDeadlineDd);
  const collectDate = status === '수금완료' ? toDate(yy, mm, Math.min(28, collectDeadlineDd + Math.floor(rng() * 5))) : '-';
  return { orderId: ORDER_IDS[rowIdx % 10000], status, partner, businessGroup, partnerOrderNum, specDate, loadDate, unloadDate, loadLoc, loadAddr, unloadLoc, unloadAddr, via, exclusive, roundTrip, ton, vehicleType, vehicleOption, vehicleNum, driver, charge, tax, total, statementId, billDate1, billDate2, collectDeadline, collectDate };
}

type RowData313C = ReturnType<typeof getRowData313C>;

function CellWrap313C({ width, rowIdx, children, style }: { width: number; rowIdx: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="content-stretch flex h-[40px] items-center px-[8px] relative shrink-0 overflow-hidden"
      data-table-row={rowIdx}
      style={{ width, borderBottom: '1px solid #e3e5e9', ...style }}
    >
      {children}
    </div>
  );
}

function HeaderCell313C({ label, width }: { label: string; width: number }) {
  return (
    <div
      className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center px-[8px] relative shrink-0"
      style={{ width, borderBottom: '1px solid #e3e5e9' }}
      data-name="Table_Header Cells"
    >
      <p className="font-['Pretendard_GOV:SemiBold'] text-[#454b55] text-[13px] leading-[19px] tracking-[-0.26px] whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
    </div>
  );
}

function CheckboxCol313C({ pageRows }: { pageRows: number[] }) {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" style={{ width: 34 }}>
      <div className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[34px]" data-name="Table_Header Cells" style={{ borderBottom: '1px solid #e3e5e9' }}>
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls" data-cb-row="header" style={{ cursor: 'pointer' }}>
          <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
        </div>
      </div>
      {pageRows.map((rowIdx) => (
        <div key={rowIdx} className="bg-[#f6f7f8] content-stretch flex h-[40px] items-center justify-center relative shrink-0 w-[34px]" data-table-row={rowIdx} style={{ borderBottom: '1px solid #e3e5e9' }}>
          <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Selection Controls" data-cb-row={String(rowIdx)} style={{ cursor: 'pointer' }}>
            <div className="absolute bg-white border-[#adb1b9] border-[1.3px] border-solid inset-[10%] rounded-[4px]" data-name="2021.11" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeCell313C({ rowIdx, width, value }: { rowIdx: number; width: number; value: string }) {
  const bs = BADGE_STYLES_313C[value] ?? { bg: '#ebedef', color: '#454b55' };
  return (
    <CellWrap313C width={width} rowIdx={rowIdx}>
      <span style={{ background: bs.bg, color: bs.color, borderRadius: 4, padding: '2px 6px', fontSize: 12, fontFamily: "'Pretendard GOV', sans-serif", fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</span>
    </CellWrap313C>
  );
}

function TextCell313C({ rowIdx, width, value }: { rowIdx: number; width: number; value: string }) {
  return (
    <CellWrap313C width={width} rowIdx={rowIdx}>
      <p className="font-['Pretendard_GOV:Regular'] text-[#2e3238] text-[13px] leading-[19px] tracking-[-0.26px] whitespace-nowrap overflow-hidden text-ellipsis w-full">{value}</p>
    </CellWrap313C>
  );
}

function LinkCell313C({ rowIdx, width, value, onOrderClick }: { rowIdx: number; width: number; value: string; onOrderClick: (id: string, ri: number) => void }) {
  return (
    <CellWrap313C width={width} rowIdx={rowIdx}>
      <p onClick={() => onOrderClick(value, rowIdx)} className="font-['Pretendard_GOV:Regular'] text-[#005fff] text-[13px] leading-[19px] tracking-[-0.26px] whitespace-nowrap overflow-hidden text-ellipsis w-full cursor-pointer underline">{value}</p>
    </CellWrap313C>
  );
}

function NumberCell313C({ rowIdx, width, value }: { rowIdx: number; width: number; value: number }) {
  return (
    <CellWrap313C width={width} rowIdx={rowIdx} style={{ justifyContent: 'flex-end' }}>
      <p className="font-['Pretendard_GOV:Regular'] text-[#2e3238] text-[13px] leading-[19px] tracking-[-0.26px] whitespace-nowrap text-right">{value.toLocaleString()}</p>
    </CellWrap313C>
  );
}

function ButtonCell313C({ rowIdx, width }: { rowIdx: number; width: number }) {
  return (
    <CellWrap313C width={width} rowIdx={rowIdx}>
      <div className="content-stretch flex gap-[4px] h-[28px] items-center justify-center overflow-clip px-[8px] relative rounded-[4px] shrink-0 border border-[#d5d8dd] cursor-pointer hover:bg-[#f6f7f8]">
        <p className="font-['Pretendard_GOV:Regular'] text-[#454b55] text-[12px] leading-[18px] tracking-[-0.24px] whitespace-nowrap">보기</p>
      </div>
    </CellWrap313C>
  );
}

interface ColDef313C {
  label: string;
  width: number;
  renderHeader: () => React.ReactNode;
  renderCell: (row: RowData313C, rowIdx: number, onOrderClick: (id: string, ri: number) => void) => React.ReactNode;
}

const TABLE_COLS_313C: ColDef313C[] = [
  { label: '매출 상태', width: 100, renderHeader: () => <HeaderCell313C label="매출 상태" width={100} />, renderCell: (row, ri) => <BadgeCell313C key={ri} rowIdx={ri} width={100} value={row.status} /> },
  { label: '오더ID', width: 120, renderHeader: () => <HeaderCell313C label="오더ID" width={120} />, renderCell: (row, ri, cb) => <LinkCell313C key={ri} rowIdx={ri} width={120} value={row.orderId} onOrderClick={cb} /> },
  { label: '협력사', width: 140, renderHeader: () => <HeaderCell313C label="협력사" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.partner} /> },
  { label: '협력사 업무그룹', width: 140, renderHeader: () => <HeaderCell313C label="협력사 업무그룹" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.businessGroup} /> },
  { label: '협력사 주문번호', width: 120, renderHeader: () => <HeaderCell313C label="협력사 주문번호" width={120} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={120} value={row.partnerOrderNum} /> },
  { label: '매출 명세서 기준일', width: 140, renderHeader: () => <HeaderCell313C label="매출 명세서 기준일" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.specDate} /> },
  { label: '상차일', width: 140, renderHeader: () => <HeaderCell313C label="상차일" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.loadDate} /> },
  { label: '하차일', width: 140, renderHeader: () => <HeaderCell313C label="하차일" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.unloadDate} /> },
  { label: '상차지명', width: 140, renderHeader: () => <HeaderCell313C label="상차지명" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.loadLoc} /> },
  { label: '상차지주소', width: 140, renderHeader: () => <HeaderCell313C label="상차지주소" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.loadAddr} /> },
  { label: '하차지명', width: 140, renderHeader: () => <HeaderCell313C label="하차지명" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.unloadLoc} /> },
  { label: '하차지주소', width: 140, renderHeader: () => <HeaderCell313C label="하차지주소" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.unloadAddr} /> },
  { label: '경유', width: 100, renderHeader: () => <HeaderCell313C label="경유" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.via} /> },
  { label: '독차', width: 100, renderHeader: () => <HeaderCell313C label="독차" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.exclusive} /> },
  { label: '왕복', width: 100, renderHeader: () => <HeaderCell313C label="왕복" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.roundTrip} /> },
  { label: '요청 차량톤수', width: 100, renderHeader: () => <HeaderCell313C label="요청 차량톤수" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.ton} /> },
  { label: '요청 차량종류', width: 100, renderHeader: () => <HeaderCell313C label="요청 차량종류" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.vehicleType} /> },
  { label: '요청 차량옵션', width: 100, renderHeader: () => <HeaderCell313C label="요청 차량옵션" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.vehicleOption} /> },
  { label: '차량번호', width: 100, renderHeader: () => <HeaderCell313C label="차량번호" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.vehicleNum} /> },
  { label: '기사명', width: 100, renderHeader: () => <HeaderCell313C label="기사명" width={100} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={100} value={row.driver} /> },
  { label: '청구금액', width: 140, renderHeader: () => <HeaderCell313C label="청구금액" width={140} />, renderCell: (row, ri) => <NumberCell313C key={ri} rowIdx={ri} width={140} value={row.charge} /> },
  { label: '세액', width: 140, renderHeader: () => <HeaderCell313C label="세액" width={140} />, renderCell: (row, ri) => <NumberCell313C key={ri} rowIdx={ri} width={140} value={row.tax} /> },
  { label: '합계 금액', width: 140, renderHeader: () => <HeaderCell313C label="합계 금액" width={140} />, renderCell: (row, ri) => <NumberCell313C key={ri} rowIdx={ri} width={140} value={row.total} /> },
  { label: '매출 거래명세서ID', width: 140, renderHeader: () => <HeaderCell313C label="매출 거래명세서ID" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.statementId} /> },
  { label: '계산서 작성일자', width: 140, renderHeader: () => <HeaderCell313C label="계산서 작성일자" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.billDate1} /> },
  { label: '계산서 작성일자 2', width: 140, renderHeader: () => <HeaderCell313C label="계산서 작성일자 2" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.billDate2} /> },
  { label: '수금기한', width: 140, renderHeader: () => <HeaderCell313C label="수금기한" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.collectDeadline} /> },
  { label: '수금일', width: 140, renderHeader: () => <HeaderCell313C label="수금일" width={140} />, renderCell: (row, ri) => <TextCell313C key={ri} rowIdx={ri} width={140} value={row.collectDate} /> },
  { label: '증빙서류', width: 100, renderHeader: () => <HeaderCell313C label="증빙서류" width={100} />, renderCell: (_, ri) => <ButtonCell313C key={ri} rowIdx={ri} width={100} /> },
];

function DynamicTable313C({ pageRows, onOrderClick }: {
  pageRows: number[];
  onOrderClick: (orderId: string, rowIdx: number) => void;
}) {
  return (
    <>
      <CheckboxCol313C pageRows={pageRows} />
      {TABLE_COLS_313C.map((col) => (
        <div key={col.label} className="content-stretch flex flex-col items-center relative shrink-0" style={{ width: col.width }}>
          {col.renderHeader()}
          {pageRows.map((rowIdx) => col.renderCell(getRowData313C(rowIdx), rowIdx, onOrderClick))}
        </div>
      ))}
    </>
  );
}

function Con() {
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [preSelectedIndices, setPreSelectedIndices] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [partnerSelected, setPartnerSelected] = useState<Set<number>>(new Set());

  const openModal = (indices: number[]) => {
    if (indices.length > 0) {
      const hasInvalid = indices.some(i => ROW_STATUSES_313[i % ROW_STATUSES_313.length] !== "정산대기");
      if (hasInvalid) { setShowErrorToast(true); return; }
    }
    setPreSelectedIndices(indices);
    setModalOpen(true);
  };
  const tableRef = useRef<HTMLDivElement>(null);
  const { currentPage, setCurrentPage, setFilteredTotal } = useContext(PageCtx313);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const TOTAL_ROWS = 300;
  const PAGE_SIZE = 200;
  const LEN_313C = PARTNER_ROW_DATA_313C.length;

  const hiddenRows = useMemo(() => {
    const statusFiltered = !selected.has(0);
    const partnerFiltered = partnerSelected.size > 0;
    if (!statusFiltered && !partnerFiltered) return new Set<number>();
    const filterStatuses = statusFiltered ? new Set([...selected].map(i => ITEMS_313[i].label.split(" (")[0])) : null;
    const hidden = new Set<number>();
    for (let i = 0; i < TOTAL_ROWS; i++) {
      if (filterStatuses && !filterStatuses.has(ROW_STATUSES_313[i % ROW_STATUSES_313.length])) { hidden.add(i); continue; }
      if (partnerFiltered) {
        const rowPartner = PARTNER_ROW_DATA_313C[i % LEN_313C];
        const match = [...partnerSelected].some(idx => PARTNER_ROW_DATA_313C[idx] === rowPartner);
        if (!match) hidden.add(i);
      }
    }
    return hidden;
  }, [selected, partnerSelected]);

  const dynamicCounts = useMemo(() => {
    const statusNames = ['마감필요','정산대기','수금대기','수금완료','정산보류'];
    const perRowAmounts: Record<string, number> = {
      '마감필요': 0,
      '정산대기': Math.round(312_000_000 / 2273),
      '수금대기': Math.round(548_700_000 / 909),
      '수금완료': Math.round(1_240_500_000 / 909),
      '정산보류': Math.round(87_300_000 / 454),
    };
    const counts = statusNames.map(() => 0);
    let totalAmount = 0;
    for (let i = 0; i < TOTAL_ROWS; i++) {
      if (hiddenRows.has(i)) continue;
      const s = ROW_STATUSES_313[i % ROW_STATUSES_313.length];
      const si = statusNames.indexOf(s);
      if (si >= 0) counts[si]++;
      totalAmount += perRowAmounts[s] ?? 0;
    }
    return { statusCounts: counts, totalAmount };
  }, [hiddenRows]);

  const pageRows = useMemo(() => {
    const visible = Array.from({ length: TOTAL_ROWS }, (_, i) => i).filter(i => !hiddenRows.has(i));
    const start = (currentPage - 1) * PAGE_SIZE;
    return visible.slice(start, start + PAGE_SIZE);
  }, [hiddenRows, currentPage]);

  const pageRowsRef = useRef<number[]>([]);
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

  const handleOrderClick = (_orderId: string, _rowIdx: number) => {};

  return (
    <DynamicCountCtx313.Provider value={dynamicCounts}>
    <BubbleCtx313.Provider value={{ partnerSelected, setPartnerSelected }}>
    <ModalCtx313.Provider value={{ openModal: (indices) => openModal(indices.length > 0 ? indices : Array.from(selectedRows)) }}>
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
        <div className="content-stretch flex h-[840px] items-start relative shrink-0 overflow-auto pb-[120px] w-[1648px]" data-name="매출장부표_협력사" ref={tableRef}>
          <DynamicTable313C pageRows={pageRows} onOrderClick={handleOrderClick} />
        </div>
      </div>
    </div>
    </TableCtrlCtx.Provider>
    </FilterCtx313.Provider>
    </ModalCtx313.Provider>
    </BubbleCtx313.Provider>
    </DynamicCountCtx313.Provider>
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
      <div className="bg-[#f6f7f8] h-[1080px] relative shrink-0 w-[208px]" data-name="LNB">
        <div className="overflow-clip relative rounded-[inherit] size-full">
          <Top />
          <div className="absolute bg-[#f6f7f8] bottom-0 h-[186px] left-0 w-[208px]" data-name="menu_below">
            <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative rounded-[inherit] size-full">
              <MenuBelow />
            </div>
            <div aria-hidden className="absolute border-0 border-[#d5d8dd] border-solid inset-0 pointer-events-none" />
          </div>
        </div>
        <div aria-hidden className="absolute border-[#e3e5e9] border-r border-solid inset-0 pointer-events-none" />
      </div>
      <Right />
    </div>
  );
}

export default function Component12() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="3.1.3 매출장부_협력사">
      <Ui />
    </div>
  );
}