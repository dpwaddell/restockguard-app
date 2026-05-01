import { Form, useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { UpgradePrompt } from "../lib/upgrade-prompt";
import { PageHeader } from "../components/PageHeader";

const PAGE_SIZE = 50;
const STATUS_TABS = ["all", "active", "sent", "unsubscribed"];

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { subscribers: [], total: 0, page: 1, q: "", status: "all", plan: "FREE", productTitleMap: {} };

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

  // Fetch product titles for the current page
  const productTitleMap = {};
  const uniqueProductIds = [...new Set(subscribers.map((s) => s.productId))];
  if (uniqueProductIds.length > 0) {
    try {
      const gids = uniqueProductIds.map((id) => `gid://shopify/Product/${id}`);
      const response = await admin.graphql(
        `query GetProductTitles($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product { id title }
          }
        }`,
        { variables: { ids: gids } }
      );
      const json = await response.json();
      for (const node of json?.data?.nodes ?? []) {
        if (node?.id && node?.title) {
          productTitleMap[node.id.split("/").pop()] = node.title;
        }
      }
    } catch {
      // Non-fatal — fall back to raw IDs
    }
  }

  return {
    subscribers: subscribers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
    productTitleMap,
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

  if (shop.plan === "FREE") {
    return new Response("CSV export requires a Starter plan or above.", { status: 403 });
  }

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
  const { subscribers, total, page, q, status, totalPages, plan, productTitleMap } = useLoaderData();
  const navigate = useNavigate();

  return (
    <s-page heading="Waitlists">
      <PageHeader currentTab="waitlists" plan={plan} />
      <UpgradePrompt feature="CSV export" requiredPlan="STARTER" currentPlan={plan} />

      <s-section>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Search + export row */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <Form method="get" style={{ flex: 1 }}>
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="page" value="1" />
              <div style={{ position: "relative", display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "15px",
                      pointerEvents: "none",
                      color: "#8c9196",
                    }}
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Search by email…"
                    style={{ ...inputStyle, paddingLeft: "36px" }}
                  />
                </div>
                <button type="submit" style={secondaryBtn}>Search</button>
              </div>
            </Form>
            {plan !== "FREE" && (
              <Form method="post">
                <button type="submit" style={secondaryBtn}>Export CSV</button>
              </Form>
            )}
          </div>

          {/* Status pill tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {STATUS_TABS.map((tab) => (
              <a
                key={tab}
                href={`/app/waitlists?status=${tab}&q=${encodeURIComponent(q)}&page=1`}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  backgroundColor: status === tab ? "#1a56db" : "#f1f2f3",
                  color: status === tab ? "#fff" : "#202223",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: status === tab ? "600" : "400",
                  textTransform: "capitalize",
                  border: status === tab ? "1px solid #1a56db" : "1px solid #d1d5db",
                  transition: "all 0.15s",
                }}
              >
                {tab}
              </a>
            ))}
          </div>

          {/* Total count */}
          <div style={{ fontSize: "13px", color: "#6d7175" }}>
            {total} subscriber{total !== 1 ? "s" : ""}
          </div>

          {/* Table / empty state */}
          {subscribers.length === 0 ? (
            <div style={emptyBox}>
              {q || status !== "all" ? (
                <>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔍</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                    No matching subscribers
                  </div>
                  <div style={{ fontSize: "14px", color: "#6d7175", maxWidth: "320px" }}>
                    Try a different search term or clear your filters.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>📧</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                    No subscribers yet
                  </div>
                  <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "16px", maxWidth: "320px" }}>
                    Install the RestockGuard widget on your store theme to start collecting sign-ups.
                  </div>
                  <button
                    onClick={() => navigate("/app/settings")}
                    style={{
                      padding: "8px 20px",
                      backgroundColor: "#1a56db",
                      color: "#fff",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Go to Settings
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f6f6f7" }}>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>Variant ID</th>
                    <th style={thStyle}>Signed up</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub, idx) => (
                    <tr
                      key={sub.id}
                      style={{
                        borderTop: "1px solid #e1e3e5",
                        backgroundColor: idx % 2 === 1 ? "#fafbfc" : "#fff",
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: "500" }}>{sub.email}</td>
                      <td style={tdStyle}>
                        {productTitleMap[sub.productId]
                          ? productTitleMap[sub.productId]
                          : <code style={{ fontSize: "12px", color: "#6d7175" }}>{sub.productId}</code>}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px", color: "#6d7175" }}>
                        {sub.variantId ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, color: "#6d7175" }}>
                        {new Date(sub.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingTop: "8px",
                  }}
                >
                  {page > 1 ? (
                    <a
                      href={`/app/waitlists?status=${status}&q=${encodeURIComponent(q)}&page=${page - 1}`}
                      style={pageBtn}
                    >
                      ← Previous
                    </a>
                  ) : (
                    <span style={pageBtnDisabled}>← Previous</span>
                  )}
                  <span style={{ fontSize: "13px", color: "#6d7175" }}>
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <a
                      href={`/app/waitlists?status=${status}&q=${encodeURIComponent(q)}&page=${page + 1}`}
                      style={pageBtn}
                    >
                      Next →
                    </a>
                  ) : (
                    <span style={pageBtnDisabled}>Next →</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: { backgroundColor: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" },
    SENT: { backgroundColor: "#cce5ff", color: "#004085", border: "1px solid #b8daff" },
    UNSUBSCRIBED: { backgroundColor: "#f1f2f3", color: "#6d7175", border: "1px solid #d1d5db" },
    PENDING: { backgroundColor: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" },
  };
  const style = styles[status] ?? styles.PENDING;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        ...style,
      }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  fontSize: "14px",
  boxSizing: "border-box",
};
const secondaryBtn = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #c9cccf",
  backgroundColor: "#fff",
  fontSize: "14px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontWeight: "500",
};
const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: "600",
  fontSize: "13px",
  color: "#202223",
};
const tdStyle = { padding: "10px 12px" };
const pageBtn = {
  padding: "7px 14px",
  border: "1px solid #c9cccf",
  borderRadius: "6px",
  textDecoration: "none",
  color: "#202223",
  fontSize: "14px",
  fontWeight: "500",
  backgroundColor: "#fff",
};
const pageBtnDisabled = {
  padding: "7px 14px",
  border: "1px solid #e1e3e5",
  borderRadius: "6px",
  color: "#b5b8bc",
  fontSize: "14px",
  fontWeight: "500",
  backgroundColor: "#fafbfc",
  cursor: "default",
};
const emptyBox = {
  border: "1px dashed #d1d5db",
  borderRadius: "8px",
  padding: "48px 20px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  alignItems: "center",
  backgroundColor: "#fafbfc",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
