/**
 * Royale Pro perks, made real (prototype-grade but genuinely working).
 *
 * Every perk here is convenience or cosmetic — NEVER earning power (design doc §11).
 * - Themes re-skin the whole app by swapping the accent CSS variables.
 * - Flex Card frames restyle the shareable stat card.
 * - The freeze stash grants a limited number of streak freezes per month.
 * - The extra wager slot lives in `store.maxWagerSlots()`.
 */

export interface ProTheme {
  id: string;
  name: string;
  accent: string;
  accentBright: string;
  accentDeep: string;
}

export const THEMES: ProTheme[] = [
  { id: 'gold',    name: 'Royal Gold', accent: '#e8c15a', accentBright: '#f6d878', accentDeep: '#b98a2f' },
  { id: 'emerald', name: 'Emerald',    accent: '#4ade80', accentBright: '#86efac', accentDeep: '#16a34a' },
  { id: 'ice',     name: 'Ice',        accent: '#7dd3fc', accentBright: '#bae6fd', accentDeep: '#0284c7' },
  { id: 'rose',    name: 'Rosé',       accent: '#fda4af', accentBright: '#fecdd3', accentDeep: '#e11d48' },
];

export interface FlexFrame {
  id: string;
  name: string;
}

export const FLEX_FRAMES: FlexFrame[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'onyx',    name: 'Onyx' },
  { id: 'royal',   name: 'Royal' },
];

/** Streak freezes claimable from the Pro stash each calendar month. */
export const FREEZES_PER_MONTH = 3;

export const proTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const flexFrame = (id: string) => FLEX_FRAMES.find((f) => f.id === id) ?? FLEX_FRAMES[0];
