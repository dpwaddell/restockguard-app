import { redirect, useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { PLANS } from "../lib/billing.server";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { plan: true },
  });
  let currentPlan = shop?.plan ?? "FREE";

  // Handle post-billing confirmation redirect from Shopify
  const url = new URL(request.url);
  if (url.searchParams.get("confirming") === "true") {
    try {
      const { hasActivePayment, appSubscriptions } = await billing.check({
        plans: ["Starter", "Growth", "Premium"],
        isTest: process.env.SHOPIFY_BILLING_TEST !== "false",
      });

      if (hasActivePayment && appSubscriptions?.length > 0) {
        const nameToKey = { Starter: "STARTER", Growth: "GROWTH", Premium: "PREMIUM" };
        const sub = appSubscriptions[0];
        const newPlan = nameToKey[sub.name] ?? currentPlan;
        await prisma.shop.update({
          where: { shopDomain: session.shop },
          data: { plan: newPlan, billingId: sub.id },
        });
        throw redirect("/app");
      }
    } catch (err) {
      // Re-throw redirects, swallow billing check errors
      if (err instanceof Response) throw err;
    }
  }

  return { currentPlan, plans: Object.values(PLANS) };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const planName = formData.get("plan"); // "Starter" | "Growth" | "Premium"

  const url = new URL(request.url);
  const returnUrl = `${url.origin}/app/upgrade?confirming=true`;

  try {
    await billing.request({
      plan: planName,
      isTest: process.env.SHOPIFY_BILLING_TEST !== "false",
      returnUrl,
    });
  } catch (err) {
    // billing.request throws a redirect Response on success — re-throw it
    if (err instanceof Response) throw err;
    // Surface billing errors to the UI instead of crashing to error boundary
    const message = err?.errorData?.[0]?.message ?? err?.message ?? "Billing unavailable";
    return { error: message };
  }
};

export default function UpgradePage() {
  const { currentPlan, plans } = useLoaderData();
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";
  const billingError = fetcher.data?.error;

  return (
    <s-page heading="Choose your plan">
      {billingError && (
        <s-banner tone="critical" title="Billing unavailable">
          {billingError}
        </s-banner>
      )}
      <s-section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                style={{
                  border: isCurrent ? "2px solid #008060" : "1px solid #e1e3e5",
                  borderRadius: "8px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700" }}>{plan.label}</span>
                  {isCurrent && (
                    <s-badge tone="success">Current plan</s-badge>
                  )}
                </div>

                <div style={{ fontSize: "24px", fontWeight: "700", color: "#202223" }}>
                  {plan.amount === 0 ? "Free" : `$${plan.amount}`}
                  {plan.amount > 0 && (
                    <span style={{ fontSize: "14px", fontWeight: "400", color: "#6d7175" }}>
                      {" "}/month
                    </span>
                  )}
                </div>

                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "14px", color: "#202223", lineHeight: "1.8" }}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                  {plan.billingName && !isCurrent ? (
                    <fetcher.Form method="post">
                      <input type="hidden" name="plan" value={plan.billingName} />
                      <button
                        type="submit"
                        disabled={loading}
                        style={primaryBtn}
                      >
                        {loading ? "Redirecting…" : `Upgrade to ${plan.label}`}
                      </button>
                    </fetcher.Form>
                  ) : isCurrent ? (
                    <p style={{ margin: 0, fontSize: "14px", color: "#008060", fontWeight: "500" }}>
                      ✓ You're on this plan
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </s-section>
    </s-page>
  );
}

const primaryBtn = {
  width: "100%",
  padding: "10px 16px",
  backgroundColor: "#008060",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
