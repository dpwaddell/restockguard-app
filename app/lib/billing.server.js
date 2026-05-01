import { redirect } from "react-router";
import { authenticate, prisma } from "../shopify.server";

export const PLANS = {
  FREE: {
    key: "FREE",
    label: "Free",
    amount: 0,
    billingName: null,
    features: [
      "Up to 100 subscribers",
      "Basic restock alerts",
      "Product-level tracking only",
      'RestockGuard "Powered by" branding',
    ],
  },
  STARTER: {
    key: "STARTER",
    label: "Starter",
    amount: 9,
    billingName: "Starter",
    features: [
      "Up to 1,000 subscribers",
      "Variant-level demand tracking",
      "Custom button text & messages",
      "Remove RestockGuard branding",
      "CSV export",
      "14-day free trial",
    ],
  },
  GROWTH: {
    key: "GROWTH",
    label: "Growth",
    amount: 29,
    billingName: "Growth",
    features: [
      "Up to 5,000 subscribers",
      "Everything in Starter",
      "Priority email support",
      "14-day free trial",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    label: "Premium",
    amount: 79,
    billingName: "Premium",
    features: [
      "Unlimited subscribers",
      "Everything in Growth",
      "Custom from-email domain (coming soon)",
      "14-day free trial",
    ],
  },
};

const PLAN_HIERARCHY = ["FREE", "STARTER", "GROWTH", "PREMIUM"];

export async function checkPlan(request) {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { plan: true },
  });
  return shop?.plan ?? "FREE";
}

export async function requirePlan(planName, request) {
  const current = await checkPlan(request);
  if (PLAN_HIERARCHY.indexOf(current) < PLAN_HIERARCHY.indexOf(planName)) {
    throw redirect("/app/upgrade");
  }
  return current;
}
