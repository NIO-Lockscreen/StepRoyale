/**
 * Freemium surface (design doc §14A — the recommended model).
 *
 * One-time, non-consumable "STRIDE Pro" unlock. Fully playable for free; Pro buys
 * convenience + cosmetics ONLY. The hard rule (design doc §11): nothing Pro grants can
 * earn coins or rank. The fair-flex promise is the actual product.
 *
 * This module is a thin facade over `gameStore` so the real iOS build can replace the
 * body of `purchase()` / `restore()` with StoreKit 2 (or RevenueCat) without touching UI.
 */
import { gameStore } from './store';

export const PRO_PRODUCT_ID = 'com.stride.pro.unlock';
export const PRO_DISPLAY_PRICE = '$5.99';

export const IAP = {
  productId: PRO_PRODUCT_ID,
  displayPrice: PRO_DISPLAY_PRICE,

  isUnlocked: () => gameStore.isProUnlocked(),

  /** Prototype: instant simulated success. Real build: `await product.purchase()`. */
  async purchase(): Promise<{ ok: boolean }> {
    gameStore.purchasePro();
    return { ok: true };
  },

  /** App Store requires a visible Restore button for non-consumables. */
  async restore(): Promise<void> {
    gameStore.restorePurchases();
  },
};
