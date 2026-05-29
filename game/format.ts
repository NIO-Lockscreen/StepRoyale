/** Number formatting tuned for a wealth game — short, punchy, screenshot-ready. */

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

export function formatCoins(n: number): string {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  let x = Math.abs(n);
  if (x < 1000) return sign + Math.floor(x).toString();
  let u = 0;
  while (x >= 1000 && u < UNITS.length - 1) {
    x /= 1000;
    u++;
  }
  return `${sign}${x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0)}${UNITS[u]}`;
}

export const formatInt = (n: number): string => Math.floor(n).toLocaleString();

export const formatPct = (x: number): string => `${Math.round(x * 100)}%`;
