/** 오늘 날짜를 YY.MM.DD 형식으로 반환 */
export function todayYYMMDD(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

/** N일 후 날짜를 YY.MM.DD 형식으로 반환 */
export function offsetDayYYMMDD(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
