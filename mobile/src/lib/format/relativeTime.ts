const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeRu(input: string | Date | null | undefined): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0) return 'только что';
  if (diff < MINUTE) return 'только что';
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} ${plural(m, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
