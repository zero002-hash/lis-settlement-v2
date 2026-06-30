// 10,000개 고정 오더ID (알파벳 3자 + 숫자 4자, seeded LCG)
// 통합장부: [0..9999], 매출장부: [0..4999], 매입장부: [5000..9999]
const ORDER_IDS = (() => {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = 0x12345678;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return s >>> 0; };
  return Array.from({ length: 10000 }, () => {
    const letters = Array.from({ length: 3 }, () => L[next() % 26]).join('');
    const digits = String(next() % 10000).padStart(4, '0');
    return letters + digits;
  });
})();

export default ORDER_IDS;
