import { createContext } from "react";

// 전역 페이지 탭 네비게이션 컨텍스트
export const NavCtx = createContext<{ navigateTo: (tabIndex: number) => void }>({ navigateTo: () => {} });

export type MaeChulSubTab = "화주사" | "협력사" | "기사";

export const SubTabCtx = createContext<{
  activeTab: MaeChulSubTab;
  setActiveTab: (t: MaeChulSubTab) => void;
}>({ activeTab: "화주사", setActiveTab: () => {} });

export type MaeIpSubTab = "정보망배차" | "정보망배차(바로선지급)" | "정보망배차(픽커)" | "소속기사배차" | "협력사위탁";

export const MaeIpSubTabCtx = createContext<{
  activeTab: MaeIpSubTab;
  setActiveTab: (t: MaeIpSubTab) => void;
}>({ activeTab: "정보망배차", setActiveTab: () => {} });

export type MaeChulMyeongseSubTab = "화주사" | "협력사";

export const MaeChulMyeongseSubTabCtx = createContext<{
  activeTab: MaeChulMyeongseSubTab;
  setActiveTab: (t: MaeChulMyeongseSubTab) => void;
}>({ activeTab: "화주사", setActiveTab: () => {} });

export type MaeIpMyeongseSubTab = "소속기사" | "협력사";

export const MaeIpMyeongseSubTabCtx = createContext<{
  activeTab: MaeIpMyeongseSubTab;
  setActiveTab: (t: MaeIpMyeongseSubTab) => void;
}>({ activeTab: "소속기사", setActiveTab: () => {} });
