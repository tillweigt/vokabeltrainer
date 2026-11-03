// Zeitpunkte im Protokoll sehen so aus: "2026-11-01T11:00:25+01:00".
// Datum und Uhrzeit lesen wir direkt aus dem Text, also in der Zeitzone des iPhones.

export const toMs = (zeit: string): number => Date.parse(zeit);

/** "2026-11-01T11:00:25+01:00" → "2026-11-01" */
export const dateOf = (zeit: string): string => zeit.slice(0, 10);

/** Sekunden seit Mitternacht: "…T11:00:25…" → 39625 */
export function secondsOfDay(zeit: string): number {
  const [hours, minutes, seconds] = zeit.slice(11, 19).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Für Plotly: "2026-11-01 11:00:25", ohne Zeitzone, wird also als lokale Zeit gezeichnet */
export const plotTime = (zeit: string): string => zeit.slice(0, 19).replace("T", " ");

/** "2026-11-01" + 3 → "2026-11-04" */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Alle Tage von `from` bis `to`, beide eingeschlossen */
export function dateRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** "2026-11-02" → "Mo" */
export const weekdayName = (isoDate: string): string => WEEKDAYS[weekdayIndex(isoDate)];

/** Montag der Woche, in der `isoDate` liegt */
export function weekStart(isoDate: string): string {
  return addDays(isoDate, -((weekdayIndex(isoDate) + 6) % 7));
}

/** Die Montage aller Wochen von `from` bis `to` */
export function weekStarts(from: string, to: string): string[] {
  const weeks: string[] = [];
  for (let week = weekStart(from); week <= to; week = addDays(week, 7)) weeks.push(week);
  return weeks;
}

/** 39625 → "11:00" */
export function clockTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
