import SharedLnb from "./SharedLnb";

export default function PlaceholderPage({ title, tabIndex }: { title: string; tabIndex: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row', background: '#FFFFFF' }}>
      <SharedLnb activeTabIndex={tabIndex} />
      <div style={{ position: 'absolute', left: 208, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 82, borderBottom: '1px solid #E4E5E9', background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, boxSizing: 'border-box' }}>
          <span style={{ fontFamily: "'Pretendard GOV:Bold'", fontWeight: 700, fontSize: 28, lineHeight: '40px', letterSpacing: '-0.02em', color: '#000000' }}>{title}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Pretendard GOV:Regular'", fontSize: 15, color: '#9197A1', letterSpacing: '-0.02em' }}>준비 중입니다.</span>
        </div>
      </div>
    </div>
  );
}
