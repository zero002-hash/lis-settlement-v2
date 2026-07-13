import { useState, useEffect, lazy, Suspense } from "react";
import { SubTabCtx, type MaeChulSubTab, MaeIpSubTabCtx, type MaeIpSubTab, MaeChulMyeongseSubTabCtx, type MaeChulMyeongseSubTab, MaeIpMyeongseSubTabCtx, type MaeIpMyeongseSubTab, NavCtx } from "@/imports/shared/subTabCtx";

const BaechaManagement = lazy(() => import("@/imports/배차관리/index"));
const TonghapJangbu = lazy(() => import("@/imports/312통합장부/index"));
const MaeChulJangbuHwaju = lazy(() => import("@/imports/313매출장부화주사/index"));
const MaeChulJangbuHyeop = lazy(() => import("@/imports/313매출장부협력사/index"));
const MaeIpJangbu = lazy(() => import("@/imports/314매입장부정보망배차/index"));
const MaeChulMyeongse = lazy(() => import("@/imports/315매출거래명세서화주사/index"));
const MaeIpMyeongse = lazy(() => import("@/imports/316매입거래명세서소속기사/index"));

function TabFallback() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <div style={{ color: "#888", fontSize: 14 }}>로딩 중...</div>
    </div>
  );
}

function MaeChulJangbu() {
  const [activeTab, setActiveTab] = useState<MaeChulSubTab>("화주사");
  return (
    <SubTabCtx.Provider value={{ activeTab, setActiveTab }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<TabFallback />}>
          {activeTab === "화주사" && <MaeChulJangbuHwaju />}
          {activeTab === "협력사" && <MaeChulJangbuHyeop />}
          {activeTab === "기사" && <MaeChulJangbuHwaju />}
        </Suspense>
      </div>
    </SubTabCtx.Provider>
  );
}

function MaeIpJangbuWrapper() {
  const [activeTab, setActiveTab] = useState<MaeIpSubTab>("정보망배차");
  return (
    <MaeIpSubTabCtx.Provider value={{ activeTab, setActiveTab }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<TabFallback />}>
          <MaeIpJangbu />
        </Suspense>
      </div>
    </MaeIpSubTabCtx.Provider>
  );
}

function MaeChulMyeongseWrapper() {
  const [activeTab, setActiveTab] = useState<MaeChulMyeongseSubTab>("화주사");
  return (
    <MaeChulMyeongseSubTabCtx.Provider value={{ activeTab, setActiveTab }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<TabFallback />}>
          <MaeChulMyeongse />
        </Suspense>
      </div>
    </MaeChulMyeongseSubTabCtx.Provider>
  );
}

function MaeIpMyeongseWrapper() {
  const [activeTab, setActiveTab] = useState<MaeIpMyeongseSubTab>("소속기사");
  return (
    <MaeIpMyeongseSubTabCtx.Provider value={{ activeTab, setActiveTab }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Suspense fallback={<TabFallback />}>
          <MaeIpMyeongse />
        </Suspense>
      </div>
    </MaeIpMyeongseSubTabCtx.Provider>
  );
}

const TABS = [
  { Component: TonghapJangbu, label: "통합장부" },
  { Component: MaeChulJangbu, label: "매출장부" },
  { Component: MaeIpJangbuWrapper, label: "매입장부" },
  { Component: MaeChulMyeongseWrapper, label: "매출 거래명세서" },
  { Component: MaeIpMyeongseWrapper, label: "매입 거래명세서" },
  { Component: BaechaManagement, label: "배차 관리" },
];

/**
 * LNB submenu items: absolute positions calculated from design structure.
 *
 * Left nav sidebar is 208px wide. Sub-menu items under 정산 start at:
 *   Top (absolute top-13px) → profile (56px) → gap(12) → separator(1) → gap(12) = y=94 for Frame2
 *   Within Frame281 (flex-col gap-6):
 *     실시간 운송관제 h=40 → ends y=134, +gap6 → y=140
 *     배차관리 h=40 → ends y=180, +gap6 → y=186
 *     정산 header h=40 → ends y=226, +gap4 → y=230
 *     통합장부 h=34 y=230 → ends y=264, +gap4 → y=268
 *     매출장부 h=34 y=268 → ends y=302, +gap4 → y=306
 *     매입장부 h=34 y=306 → ends y=340, +gap4 → y=344
 *     매출거래명세서 h=34 y=344 → ends y=378, +gap4 → y=382
 *     매입거래명세서 h=34 y=382 → ends y=416
 */
const LNB_SUB_ITEMS = [
  { top: 140, height: 40, tabIndex: 5 }, // 배차 관리
  { top: 230, height: 34, tabIndex: 0 },
  { top: 268, height: 34, tabIndex: 1 },
  { top: 306, height: 34, tabIndex: 2 },
  { top: 344, height: 34, tabIndex: 3 },
  { top: 382, height: 34, tabIndex: 4 },
];

const DESIGN_W = 1920;
const DESIGN_H = 1080;

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [scale, setScale] = useState(() => window.innerWidth / DESIGN_W);

  useEffect(() => {
    function updateScale() {
      setScale(window.innerWidth / DESIGN_W);
    }
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <NavCtx.Provider value={{ navigateTo: setActiveTab }}>
    <div style={{ width: "100vw", minHeight: "100vh", background: "#ffffff", overflow: "hidden" }}>
    <div
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        position: "absolute",
        top: 0,
        left: 0,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        overflow: "hidden",
      }}
    >
      {TABS.map(({ Component, label }, i) => (
        <div
          key={label}
          style={{
            position: "absolute",
            inset: 0,
            visibility: i === activeTab ? "visible" : "hidden",
            pointerEvents: i === activeTab ? "auto" : "none",
          }}
        >
          {i === activeTab && (
            <Suspense fallback={<TabFallback />}>
              <Component />
            </Suspense>
          )}
        </div>
      ))}

      {/* Transparent overlay buttons for LNB submenu navigation */}
      {LNB_SUB_ITEMS.map((item) => (
        <button
          key={item.tabIndex}
          onClick={() => setActiveTab(item.tabIndex)}
          aria-label={TABS[item.tabIndex].label}
          style={{
            position: "absolute",
            left: 0,
            top: item.top,
            width: 208,
            height: item.height,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            zIndex: 200,
            padding: 0,
          }}
        />
      ))}
    </div>
    </div>
    </NavCtx.Provider>
  );
}
