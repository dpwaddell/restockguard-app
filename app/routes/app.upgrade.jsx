import { redirect, useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { PLANS } from "../lib/billing.server";
import { PageHeader } from "../components/PageHeader";

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
      <PageHeader currentTab="upgrade" plan={currentPlan} />
      {billingError && (
        <s-banner tone="critical" title="Billing unavailable">
          {billingError}
        </s-banner>
      )}

      {/* Trial callout banner */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "20px" }}>🎉</span>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#166534" }}>
          All paid plans include a 14-day free trial — no charge until the trial ends.
        </span>
      </div>

      <s-section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const isGrowth = plan.key === "GROWTH";

              return (
                <div key={plan.key} style={{ position: "relative" }}>
                  {/* "Most popular" badge above Growth */}
                  {isGrowth && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#1a56db",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "3px 12px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        zIndex: 1,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Most popular
                    </div>
                  )}

                  <div
                    style={{
                      border: isCurrent
                        ? "2px solid #1a56db"
                        : isGrowth
                        ? "2px solid #1a56db"
                        : "1px solid #e1e3e5",
                      boxShadow: isCurrent
                        ? "0 0 0 3px rgba(0,128,96,0.15)"
                        : isGrowth
                        ? "0 0 0 2px rgba(0,128,96,0.08)"
                        : "0 1px 4px rgba(0,0,0,0.06)",
                      borderRadius: "10px",
                      padding: "20px 16px 16px",
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      gap: "12px",
                      backgroundColor: "#fff",
                      marginTop: isGrowth ? "12px" : "0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "700", color: "#202223" }}>
                        {plan.label}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            backgroundColor: "#d4edda",
                            color: "#155724",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "700",
                            border: "1px solid #c3e6cb",
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>

                    <div style={{ lineHeight: 1 }}>
                      <span style={{ fontSize: "48px", fontWeight: "800", color: "#202223" }}>
                        {plan.amount === 0 ? "Free" : `$${plan.amount}`}
                      </span>
                      {plan.amount > 0 && (
                        <span style={{ fontSize: "14px", fontWeight: "400", color: "#6d7175" }}>
                          {" "}/month
                        </span>
                      )}
                    </div>

                    <ul
                      style={{
                        margin: 0,
                        padding: "0 0 0 16px",
                        fontSize: "14px",
                        color: "#202223",
                        lineHeight: "1.6",
                        whiteSpace: "normal",
                      }}
                    >
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
                            style={{
                              width: "100%",
                              padding: "11px 16px",
                              backgroundColor: "#1a56db",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "14px",
                              fontWeight: "600",
                              cursor: loading ? "wait" : "pointer",
                            }}
                          >
                            {loading ? "Redirecting…" : `Upgrade to ${plan.label}`}
                          </button>
                        </fetcher.Form>
                      ) : isCurrent ? (
                        <p style={{ margin: 0, fontSize: "14px", color: "#1a56db", fontWeight: "600" }}>
                          ✓ You're on this plan
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
