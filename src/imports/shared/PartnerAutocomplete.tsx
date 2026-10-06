import { useState } from "react";
import type { TradePartner } from "./geoRaecheoStore";

const ff = "'Pretendard GOV:Regular'";

export default function PartnerAutocomplete({ value, onChange, onSelect, partners, placeholder, inputStyle }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: TradePartner) => void;
  partners: TradePartner[];
  placeholder?: string;
  inputStyle: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  const q = value.trim();
  const results = q === '' ? [] : partners.filter(p => p.alias.includes(q) || p.bizName.includes(q)).slice(0, 6);

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder ?? '거래처명으로 검색'}
        style={inputStyle}
      />
      {focused && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', marginTop: 4, left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E4E5E9', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
          {results.map(p => (
            <div
              key={p.id}
              onMouseDown={() => onSelect(p)}
              style={{ padding: '10px 14px', borderBottom: '1px solid #F1F2F4', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2E3238', fontFamily: ff }}>{p.alias}</div>
              <div style={{ fontSize: 12, color: '#9197A1', fontFamily: ff }}>{p.bizName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
