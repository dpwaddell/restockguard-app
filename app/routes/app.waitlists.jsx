import { Form, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { UpgradePrompt } from "../lib/upgrade-prompt";

const PAGE_SIZE = 50;
const STATUS_TABS = ["all", "active", "sent", "unsubscribed"];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { subscribers: [], total: 0, page: 1, q: "", status: "all", plan: "FREE" };

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  const where = {
    shopId: shop.id,
    ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    ...(status !== "all" ? { status: status.toUpperCase() } : {}),
  };

  const [subscribers, total] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        productId: true,
        variantId: true,
        createdAt: true,
        status: true,
      },
    }),
    prisma.subscriber.count({ where }),
  ]);

  return {
    subscribers: subscribers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    page,
    q,
    status,
    totalPages: Math.ceil(total / PAGE_SIZE),
    plan: shop.plan ?? "FREE",
  };
};

// CSV export action
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return new Response("Not found", { status: 404 });

  const all = await prisma.subscriber.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    select: { email: true, productId: true, variantId: true, createdAt: true, status: true },
  });

  const header = ["Email", "Product ID", "Variant ID", "Signed up", "Status"];
  const rows = all.map((s) => [
    s.email,
    s.productId,
    s.variantId ?? "",
    s.createdAt.toISOString(),
    s.status,
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="subscribers-${Date.now()}.csv"`,
    },
  });
};

export default function WaitlistsPage() {
  const { subscribers, total, page, q, status, totalPages, plan } = useLoaderData();

  return (
    <s-page heading="Waitlists">
      <UpgradePrompt feature="CSV export" requiredPlan="STARTER" currentPlan={plan} />

      <s-section>
        <s-stack direction="block" gap="base">
          {/* Search + export row */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <Form method="get" style={{ flex: 1 }}>
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="page" value="1" />
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search by email…"
                  style={inputStyle}
                />
                <button type="submit" style={secondaryBtn}>Search</button>
              </div>
            </Form>
            {plan !== "FREE" && (
              <Form method="post">
                <button type="submit" style={secondaryBtn}>Export CSV</button>
              </Form>
            )}
          </div>

          {/* Status tabs */}
          <div style={{ display: "flex", gap: "8px" }}>
            {STATUS_TABS.map((tab) => (
              <a
                key={tab}
                href={`/app/waitlists?status=${tab}&q=${encodeURIComponent(q)}&page=1`}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  backgroundColor: status === tab ? "#008060" : "#f1f2f3",
                  color: status === tab ? "#fff" : "#202223",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: status === tab ? "600" : "400",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </a>
            ))}
          </div>

          {/* Total */}
          <s-text tone="subdued">{total} subscriber{total !== 1 ? "s" : ""}</s-text>

          {/* Table / empty state */}
          {subscribers.length === 0 ? (
            <div style={emptyBox}>
              <s-heading>No subscribers yet</s-heading>
              <s-text tone="subdued">
                Install the RestockGuard widget on your store theme to start collecting sign-ups.
              </s-text>
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f6f6f7" }}>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Product ID</th>
                    <th style={thStyle}>Variant ID</th>
                    <th style={thStyle}>Signed up</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr key={sub.id} style={{ borderTop: "1px solid #e1e3e5" }}>
                      <td style={tdStyle}>{sub.email}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                        {sub.productId}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>
                        {sub.variantId ?? "—"}
                      </td>
                      <td style={tdStyle}>
                        {new Date(sub.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={sub.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {page > 1 && (
                    <a href={`/app/waitlists?status=${status}&q=${encodeURIComponent(q)}&page=${page - 1}`} style={pageLink}>
                      ← Previous
                    </a>
                  )}
                  <s-text>Page {page} of {totalPages}</s-text>
                  {page < totalPages && (
                    <a href={`/app/waitlists?status=${status}&q=${encodeURIComponent(q)}&page=${page + 1}`} style={pageLink}>
                      Next →
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

function StatusBadge({ status }) {
  const tones = { ACTIVE: "success", SENT: "info", UNSUBSCRIBED: "critical", PENDING: "warning" };
  return (
    <s-badge tone={tones[status] ?? "info"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </s-badge>
  );
}

const inputStyle = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  fontSize: "14px",
};
const secondaryBtn = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  backgroundColor: "#fff",
  fontSize: "14px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const thStyle = { textAlign: "left", padding: "10px 12px", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "10px 12px" };
const pageLink = {
  padding: "6px 14px",
  border: "1px solid #c9cccf",
  borderRadius: "6px",
  textDecoration: "none",
  color: "#202223",
  fontSize: "14px",
};
const emptyBox = {
  border: "1px solid #e1e3e5",
  borderRadius: "8px",
  padding: "40px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  alignItems: "center",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
