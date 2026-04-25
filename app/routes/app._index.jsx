import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return {
      subscriberCount: 0,
      alertsSent: 0,
      conversions: 0,
      revenue: "0.00",
      topProducts: [],
      recentActivity: [],
      plan: "FREE",
      shopDomain: session.shop,
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    subscriberCount,
    alertsSent,
    conversionsResult,
    recentSignups,
    recentAlerts,
    topProductsRaw,
  ] = await Promise.all([
    prisma.subscriber.count({
      where: { shopId: shop.id, status: "ACTIVE" },
    }),
    prisma.alertSend.count({
      where: { shopId: shop.id, sentAt: { gte: thirtyDaysAgo } },
    }),
    prisma.conversion.aggregate({
      where: { shopId: shop.id, convertedAt: { gte: thirtyDaysAgo } },
      _sum: { orderValue: true },
      _count: true,
    }),
    prisma.subscriber.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { email: true, productId: true, createdAt: true },
    }),
    prisma.alertSend.findMany({
      where: { shopId: shop.id },
      orderBy: { sentAt: "desc" },
      take: 10,
      select: { productId: true, variantId: true, sentAt: true },
    }),
    prisma.subscriber.groupBy({
      by: ["productId"],
      where: { shopId: shop.id },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
  ]);

  const revenue = conversionsResult._sum.orderValue
    ? Number(conversionsResult._sum.orderValue).toFixed(2)
    : "0.00";

  const recentActivity = [
    ...recentSignups.map((s) => ({
      type: "signup",
      label: `${s.email} subscribed`,
      productId: s.productId,
      date: s.createdAt.toISOString(),
    })),
    ...recentAlerts.map((a) => ({
      type: "alert",
      label: `Alert sent for product …${a.productId.slice(-8)}`,
      productId: a.productId,
      date: a.sentAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return {
    subscriberCount,
    alertsSent,
    conversions: conversionsResult._count,
    revenue,
    topProducts: topProductsRaw.map((p) => ({
      productId: p.productId,
      count: p._count.productId,
    })),
    recentActivity,
    plan: shop.plan,
    shopDomain: session.shop,
  };
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function storeName(domain) {
  return domain
    .replace(/\.myshopify\.com$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString() : n;
}

export default function Index() {
  const { subscriberCount, alertsSent, conversions, revenue, topProducts, recentActivity, plan, shopDomain } =
    useLoaderData();

  return (
    <s-page heading={`${getGreeting()}, ${storeName(shopDomain)}`}>
      {subscriberCount === 0 && (
        <s-banner tone="info" title="Get started with RestockGuard">
          <s-paragraph>
            Install the RestockGuard widget snippet on your theme, then mark a product as
            sold-out to test the full alert flow end-to-end.
          </s-paragraph>
          <div style={{ marginTop: "12px" }}>
            <a
              href="/app/settings"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#008060",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              View setup guide →
            </a>
          </div>
        </s-banner>
      )}

      <s-section heading="Overview">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
          }}
        >
          <KpiCard value={fmt(subscriberCount)} label="Total Subscribers" />
          <KpiCard value={fmt(alertsSent)} label="Alerts Sent (30d)" />
          <KpiCard value={fmt(conversions)} label="Conversions (30d)" />
          <KpiCard value={`£${revenue}`} label="Recovered Revenue (30d)" />
        </div>
      </s-section>

      <s-section heading="Top Requested Products">
        {topProducts.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📦</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
              No products yet
            </div>
            <div style={{ fontSize: "14px", color: "#6d7175", maxWidth: "320px" }}>
              Install the RestockGuard widget on your theme to start collecting sign-ups.
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f6f6f7" }}>
                <th style={thStyle}>Product ID</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Subscribers</th>
                {plan === "FREE" && <th style={thStyle}></th>}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.productId} style={{ borderTop: "1px solid #e1e3e5" }}>
                  <td style={tdStyle}>
                    <code style={{ fontSize: "12px" }}>…{p.productId.slice(-16)}</code>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{p.count}</td>
                  {plan === "FREE" && (
                    <td style={tdStyle}>
                      <span style={{ fontSize: "12px", color: "#6d7175" }}>
                        🔒 <a href="/app/upgrade" style={{ color: "#008060", textDecoration: "none" }}>Starter+</a>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </s-section>

      <s-section heading="Recent Activity">
        {recentActivity.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📋</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
              No activity yet
            </div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>
              Activity will appear here once customers start signing up.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {recentActivity.map((event, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderLeft: `3px solid ${event.type === "signup" ? "#008060" : "#2c6ecb"}`,
                  borderBottom: "1px solid #f1f2f3",
                  backgroundColor: "#fff",
                  borderRadius: "0 4px 4px 0",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: event.type === "signup" ? "#008060" : "#2c6ecb",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: "14px", color: "#202223" }}>{event.label}</span>
                <span style={{ fontSize: "12px", color: "#6d7175", whiteSpace: "nowrap" }}>
                  {new Date(event.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </s-section>
    </s-page>
  );
}

function KpiCard({ value, label }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e1e3e5",
        borderRadius: "10px",
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        minWidth: "160px",
      }}
    >
      <div style={{ fontSize: "40px", fontWeight: "700", color: "#202223", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "6px", fontWeight: "500", whiteSpace: "nowrap" }}>
        {label}
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "10px 12px", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "10px 12px" };
const emptyBox = {
  border: "1px dashed #d1d5db",
  borderRadius: "8px",
  padding: "40px 20px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  alignItems: "center",
  backgroundColor: "#fafbfc",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
