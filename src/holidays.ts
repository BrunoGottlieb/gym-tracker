// Brazilian national holidays. Local holidays and optional observances are not
// included without a city/state. Calculated locally so the calendar works offline.
const cache = new Map<number, ReadonlyMap<string, string>>();

export function brazilianHolidays(year: number): ReadonlyMap<string, string> {
  const saved = cache.get(year);
  if (saved) return saved;
  const entries: [string, string][] = [
    ['01-01', 'Confraternização Universal'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência do Brasil'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['12-25', 'Natal'],
  ];
  if (year >= 2024) entries.push(['11-20', 'Dia Nacional de Zumbi e da Consciência Negra']);
  const holidays = new Map(entries.map(([day, name]) => [`${year}-${day}`, name]));
  // Gregorian Easter (Meeus/Jones/Butcher); Good Friday is two days earlier.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451), base = h + l - 7 * m + 114;
  const goodFriday = new Date(Date.UTC(year, Math.floor(base / 31) - 1, base % 31 + 1));
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  holidays.set(goodFriday.toISOString().slice(0, 10), 'Sexta-feira Santa');
  cache.set(year, holidays);
  return holidays;
}

export function holidayName(date: string): string | undefined {
  return brazilianHolidays(Number(date.slice(0, 4))).get(date);
}
