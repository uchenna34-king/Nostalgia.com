import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/** Stripe client, or null when no key is configured (stub checkout is used). */
export const stripe = key ? new Stripe(key) : null;

export const stripeEnabled = Boolean(key);
