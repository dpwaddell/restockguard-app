import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { plan: true },
  });

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    plan: shop?.plan ?? "FREE",
  };
};

const PLAN_PILL = {
  FREE:     { bg: "#f1f2f3", color: "#6d7175", label: "Free" },
  STARTER:  { bg: "#e3f1ec", color: "#006640", label: "Starter" },
  GROWTH:   { bg: "#ddf0e8", color: "#004c3f", label: "Growth" },
  PREMIUM:  { bg: "#f3e8fd", color: "#6832a8", label: "Premium" },
};

function PlanBadge({ plan }) {
  const pill = PLAN_PILL[plan] ?? PLAN_PILL.FREE;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: pill.bg,
        color: pill.color,
        lineHeight: "18px",
        verticalAlign: "middle",
      }}
    >
      {pill.label}
    </span>
  );
}

function AppHeader({ plan }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e1e3e5",
        borderLeft: "3px solid #008060",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "24px", color: "#008060", lineHeight: 1 }}>🛡️</span>
        <span style={{ fontSize: "20px", fontWeight: "800", color: "#202223" }}>RestockGuard</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <PlanBadge plan={plan} />
        <span style={{ fontSize: "12px", color: "#6d7175" }}>v1.0</span>
      </div>
    </div>
  );
}

export default function App() {
  const { apiKey, plan } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <AppHeader plan={plan} />
      <s-app-nav>
        <s-link href="/app">🏠 Home</s-link>
        <s-link href="/app/waitlists">📋 Waitlists</s-link>
        <s-link href="/app/products">📦 Products</s-link>
        <s-link href="/app/styling">🎨 Styling</s-link>
        <s-link href="/app/settings">⚙️ Settings</s-link>
        <s-link href="/app/upgrade">
          {plan === "FREE" ? "⬆️ Upgrade" : <PlanBadge plan={plan} />}
        </s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
