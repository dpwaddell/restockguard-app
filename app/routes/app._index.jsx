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
  };
};

export default function Index() {
  const { subscriberCount, alertsSent, conversions, revenue, topProducts, recentActivity, plan } =
    useLoaderData();

  return (
    <s-page heading="Dashboard">
      {subscriberCount === 0 && (
        <s-banner tone="info" title="Get started with RestockGuard">
          <s-paragraph>
            Install the RestockGuard widget snippet on your theme, then mark a product as
            sold-out to test the full alert flow end-to-end.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <KpiCard value={subscriberCount} label="Total Subscribers" />
          <KpiCard value={alertsSent} label="Alerts Sent (30d)" />
          <KpiCard value={conversions} label="Conversions (30d)" />
          <KpiCard value={`£${revenue}`} label="Recovered Revenue" />
        </s-stack>
      </s-section>

      <s-section heading="Top Requested Products">
        {topProducts.length === 0 ? (
          <s-text tone="subdued">No subscribers yet — install the widget to start collecting sign-ups.</s-text>
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
                  <td style={{ ...tdStyle, textAlign: "right" }}>{p.count}</td>
                  {plan === "FREE" && (
                    <td style={tdStyle}>
                      <a href="/app/upgrade" style={{ fontSize: "12px", color: "#008060" }}>
                        Upgrade to see variant breakdown
                      </a>
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
          <s-text tone="subdued">No activity yet.</s-text>
        ) : (
          <s-stack direction="block" gap="tight">
            {recentActivity.map((event, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f2f3",
                }}
              >
                <s-badge tone={event.type === "signup" ? "info" : "success"}>
                  {event.type === "signup" ? "Signup" : "Alert"}
                </s-badge>
                <span style={{ flex: 1, fontSize: "14px" }}>{event.label}</span>
                <span style={{ fontSize: "12px", color: "#6d7175" }}>
                  {new Date(event.date).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

function KpiCard({ value, label }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" style={{ flex: 1 }}>
      <s-stack direction="block" gap="tight">
        <s-heading>{value}</s-heading>
        <s-text>{label}</s-text>
      </s-stack>
    </s-box>
  );
}

const thStyle = { textAlign: "left", padding: "10px 12px", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "10px 12px" };

export const headers = (headersArgs) => boundary.headers(headersArgs);
