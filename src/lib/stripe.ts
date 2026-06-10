import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** サーバー専用 Stripe クライアント（遅延初期化）。STRIPE_SECRET_KEY が必要。 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY が設定されていません。");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
