import { useState, Fragment } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { products: [], plan: "FREE" };

  // Fetch products from Shopify REST API
  let shopifyProducts = [];
  try {
    const res = await fetch(
      `https://${session.shop}/admin/api/2025-10/products.json?limit=50&fields=id,title,status,variants`,
      { headers: { "X-Shopify-Access-Token": session.accessToken } },
    );
    const json = await res.json();
    shopifyProducts = json.products ?? [];
  } catch {
    // Non-fatal — show empty product list
  }

  const settings = shop.settings ?? {};
  const enabledProducts = settings.enabledProducts ?? [];

  // Subscriber counts per product
  const [productGroups, variantGroups] = await Promise.all([
    prisma.subscriber.groupBy({
      by: ["productId"],
      where: { shopId: shop.id },
      _count: { productId: true },
    }),
    prisma.subscriber.groupBy({
      by: ["productId", "variantId"],
      where: { shopId: shop.id, variantId: { not: null } },
      _count: { variantId: true },
    }),
  ]);

  const productCountMap = Object.fromEntries(
    productGroups.map((g) => [g.productId, g._count.productId]),
  );
  // variantCountMap[productId][variantId] = count
  const variantCountMap = {};
  for (const g of variantGroups) {
    if (!variantCountMap[g.productId]) variantCountMap[g.productId] = {};
    variantCountMap[g.productId][g.variantId] = g._count.variantId;
  }

  const products = shopifyProducts.map((p) => {
    const id = String(p.id);
    return {
      id,
      title: p.title,
      status: p.status,
      enabled: enabledProducts.includes(id),
      subscriberCount: productCountMap[id] ?? 0,
      variants: (p.variants ?? []).map((v) => ({
        id: String(v.id),
        title: v.title,
        subscriberCount: variantCountMap[id]?.[String(v.id)] ?? 0,
      })),
    };
  });

  return { products, plan: shop.plan };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const enable = formData.get("enable") === "true";

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true },
  });

  const settings = shop?.settings ?? {};
  let enabledProducts = settings.enabledProducts ?? [];

  if (enable) {
    enabledProducts = [...new Set([...enabledProducts, productId])];
  } else {
    enabledProducts = enabledProducts.filter((id) => id !== productId);
  }

  await prisma.shop.update({
    where: { shopDomain: session.shop },
    data: { settings: { ...settings, enabledProducts } },
  });

  return { ok: true };
};

export default function ProductsPage() {
  const { products, plan } = useLoaderData();
  const fetcher = useFetcher();
  const [expandedId, setExpandedId] = useState(null);

  return (
    <s-page heading="Products">
      <s-section>
        {products.length === 0 ? (
          <div style={emptyBox}>
            <s-heading>No products found</s-heading>
            <s-text tone="subdued">Make sure your Shopify store has products and the app has read_products access.</s-text>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f6f6f7" }}>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Subscribers</th>
                <th style={thStyle}>Variant demand</th>
                <th style={{ ...thStyle, textAlign: "center" }}>RestockGuard</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <Fragment key={product.id}>
                  <tr
                    style={{ borderTop: "1px solid #e1e3e5", cursor: "pointer" }}
                    onClick={() =>
                      setExpandedId(expandedId === product.id ? null : product.id)
                    }
                  >
                    <td style={{ ...tdStyle, fontWeight: "500" }}>
                      {expandedId === product.id ? "▾ " : "▸ "}
                      {product.title}
                    </td>
                    <td style={tdStyle}>
                      <s-badge tone={product.status === "active" ? "success" : "warning"}>
                        {product.status}
                      </s-badge>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {product.subscriberCount}
                    </td>
                    <td style={tdStyle}>
                      {plan === "FREE" ? (
                        <a href="/app/upgrade" style={{ fontSize: "12px", color: "#008060" }}>
                          Upgrade to see variant breakdown
                        </a>
                      ) : (
                        <span style={{ fontSize: "13px", color: "#6d7175" }}>
                          {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <fetcher.Form method="post">
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="enable" value={product.enabled ? "false" : "true"} />
                        <button
                          type="submit"
                          style={product.enabled ? toggleOnBtn : toggleOffBtn}
                          title={product.enabled ? "Click to disable" : "Click to enable"}
                        >
                          {product.enabled ? "On" : "Off"}
                        </button>
                      </fetcher.Form>
                    </td>
                  </tr>

                  {/* Variant breakdown row */}
                  {expandedId === product.id && plan !== "FREE" && (
                    <tr>
                      <td colSpan={5} style={{ padding: "0 12px 12px 40px", backgroundColor: "#f9fafb" }}>
                        <table style={{ width: "100%", fontSize: "13px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, fontWeight: "500" }}>Variant</th>
                              <th style={{ ...thStyle, textAlign: "right", fontWeight: "500" }}>Subscribers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.variants.map((v) => (
                              <tr key={v.id} style={{ borderTop: "1px solid #e1e3e5" }}>
                                <td style={tdStyle}>{v.title}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{v.subscriberCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </s-section>
    </s-page>
  );
}

const thStyle = { textAlign: "left", padding: "10px 12px", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "10px 12px" };
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
const toggleBase = {
  padding: "4px 12px",
  borderRadius: "20px",
  border: "none",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};
const toggleOnBtn = { ...toggleBase, backgroundColor: "#008060", color: "#fff" };
const toggleOffBtn = { ...toggleBase, backgroundColor: "#f1f2f3", color: "#202223" };

export const headers = (headersArgs) => boundary.headers(headersArgs);
