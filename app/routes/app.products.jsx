import { useState, Fragment } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";
import { UpgradePrompt } from "../lib/upgrade-prompt";
import { PageHeader } from "../components/PageHeader";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) return { products: [], plan: "FREE" };

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
  const preorderProducts = settings.preorderProducts ?? {};
  const preorderConfigs = settings.preorderConfigs ?? {};

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
      preorder: preorderProducts[id] === true,
      preorderConfig: preorderConfigs[id] ?? { preorderMessage: "", shipsBy: "" },
      subscriberCount: productCountMap[id] ?? 0,
      variants: (p.variants ?? []).map((v) => ({
        id: String(v.id),
        title: v.title,
        subscriberCount: variantCountMap[id]?.[String(v.id)] ?? 0,
      })),
    };
  });

  return { products, plan: shop.plan ?? "FREE" };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") || "toggle";

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    select: { settings: true },
  });

  const settings = shop?.settings ?? {};

  if (intent === "preorder") {
    const productId = formData.get("productId");
    const enablePreorder = formData.get("enablePreorder") === "true";
    const preorderMessage = formData.get("preorderMessage") || "";
    const shipsBy = formData.get("shipsBy") || "";

    const preorderProducts = { ...(settings.preorderProducts ?? {}), [productId]: enablePreorder };
    const preorderConfigs = {
      ...(settings.preorderConfigs ?? {}),
      [productId]: { enabled: enablePreorder, preorderMessage, shipsBy },
    };

    await prisma.shop.update({
      where: { shopDomain: session.shop },
      data: { settings: { ...settings, preorderProducts, preorderConfigs } },
    });

    return { ok: true };
  }

  // Default: toggle RestockGuard enable/disable
  const productId = formData.get("productId");
  const enable = formData.get("enable") === "true";
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
  const preorderFetcher = useFetcher();
  const [expandedId, setExpandedId] = useState(null);
  const [preorderOn, setPreorderOn] = useState(
    Object.fromEntries(products.map((p) => [p.id, p.preorder])),
  );
  const [preorderConfigs, setPreorderConfigs] = useState(
    Object.fromEntries(products.map((p) => [p.id, p.preorderConfig])),
  );

  function handlePreorderToggle(productId) {
    const newValue = !preorderOn[productId];
    setPreorderOn((prev) => ({ ...prev, [productId]: newValue }));
    preorderFetcher.submit(
      {
        intent: "preorder",
        productId,
        enablePreorder: String(newValue),
        preorderMessage: preorderConfigs[productId]?.preorderMessage || "",
        shipsBy: preorderConfigs[productId]?.shipsBy || "",
      },
      { method: "post" },
    );
  }

  return (
    <s-page heading="Products">
      <PageHeader currentTab="products" plan={plan} />
      <UpgradePrompt
        feature="variant-level demand tracking"
        requiredPlan="STARTER"
        currentPlan={plan}
      />

      <s-section>
        {products.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📦</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
              No products found
            </div>
            <div style={{ fontSize: "14px", color: "#6d7175", maxWidth: "320px" }}>
              Make sure your Shopify store has products and the app has read_products access.
            </div>
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
                <th style={{ ...thStyle, textAlign: "center" }}>Preorder</th>
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
                    <td style={{ ...tdStyle, fontWeight: "600", fontSize: "15px" }}>
                      <span style={{ marginRight: "6px", fontSize: "12px", color: "#8c9196" }}>
                        {expandedId === product.id ? "▾" : "▸"}
                      </span>
                      {product.title}
                    </td>
                    <td style={tdStyle}>
                      <ProductStatusBadge status={product.status} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>
                      {product.subscriberCount}
                    </td>
                    <td style={tdStyle}>
                      {plan === "FREE" ? (
                        <span style={{ fontSize: "13px", color: "#6d7175" }}>
                          🔒{" "}
                          <a href="/app/upgrade" style={{ color: "#008060", textDecoration: "none", fontWeight: "500" }}>
                            Starter+
                          </a>
                        </span>
                      ) : (
                        <span style={{ fontSize: "13px", color: "#6d7175" }}>
                          {product.variants.length} variant
                          {product.variants.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td
                      style={{ ...tdStyle, textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="productId" value={product.id} />
                        <input
                          type="hidden"
                          name="enable"
                          value={product.enabled ? "false" : "true"}
                        />
                        <ToggleSwitch
                          isOn={product.enabled}
                          title={product.enabled ? "Click to disable" : "Click to enable"}
                        />
                        {plan === "FREE" && product.enabled && (
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <a
                              href="/app/upgrade"
                              style={{ color: "#6d7175", textDecoration: "none" }}
                            >
                              🔒 Starter+
                            </a>
                          </div>
                        )}
                      </fetcher.Form>
                    </td>
                    <td
                      style={{ ...tdStyle, textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ToggleSwitch
                        isOn={preorderOn[product.id]}
                        title={
                          preorderOn[product.id]
                            ? "Click to disable preorder mode"
                            : "Click to enable preorder mode"
                        }
                        onClick={() => handlePreorderToggle(product.id)}
                        asButton
                      />
                    </td>
                  </tr>

                  {/* Preorder config row */}
                  {preorderOn[product.id] && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "14px 16px 14px 40px",
                          backgroundColor: "#fffbf0",
                          borderTop: "1px solid #f0e6b2",
                          borderBottom: "1px solid #f0e6b2",
                        }}
                      >
                        <preorderFetcher.Form method="post">
                          <input type="hidden" name="intent" value="preorder" />
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="enablePreorder" value="true" />
                          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "12px", fontWeight: "600", color: "#856404" }}>
                                Preorder message
                              </label>
                              <input
                                type="text"
                                name="preorderMessage"
                                defaultValue={preorderConfigs[product.id]?.preorderMessage || ""}
                                placeholder="Ships next week"
                                onChange={(e) =>
                                  setPreorderConfigs((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      preorderMessage: e.target.value,
                                    },
                                  }))
                                }
                                style={miniInput}
                              />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "12px", fontWeight: "600", color: "#856404" }}>
                                Ships by date
                              </label>
                              <input
                                type="text"
                                name="shipsBy"
                                defaultValue={preorderConfigs[product.id]?.shipsBy || ""}
                                placeholder="January 20"
                                onChange={(e) =>
                                  setPreorderConfigs((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      shipsBy: e.target.value,
                                    },
                                  }))
                                }
                                style={miniInput}
                              />
                            </div>
                            <button type="submit" style={smallBtn}>
                              Save
                            </button>
                          </div>
                        </preorderFetcher.Form>
                      </td>
                    </tr>
                  )}

                  {/* Variant breakdown row */}
                  {expandedId === product.id && plan !== "FREE" && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: "0 12px 12px 40px", backgroundColor: "#f9fafb" }}
                      >
                        <table style={{ width: "100%", fontSize: "13px" }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, fontWeight: "500" }}>Variant</th>
                              <th style={{ ...thStyle, textAlign: "right", fontWeight: "500" }}>
                                Subscribers
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.variants.map((v) => (
                              <tr key={v.id} style={{ borderTop: "1px solid #e1e3e5" }}>
                                <td style={tdStyle}>{v.title}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>
                                  {v.subscriberCount}
                                </td>
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

function ToggleSwitch({ isOn, title, onClick, asButton }) {
  const track = {
    display: "inline-flex",
    alignItems: "center",
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    backgroundColor: isOn ? "#008060" : "#d1d5db",
    position: "relative",
    cursor: "pointer",
    transition: "background-color 0.2s",
    border: "none",
    padding: 0,
    flexShrink: 0,
  };
  const thumb = {
    position: "absolute",
    left: isOn ? "22px" : "2px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "left 0.2s",
  };

  if (asButton) {
    return (
      <button type="button" style={track} title={title} onClick={onClick}>
        <span style={thumb} />
      </button>
    );
  }
  return (
    <button type="submit" style={track} title={title}>
      <span style={thumb} />
    </button>
  );
}

function ProductStatusBadge({ status }) {
  const styles = {
    active: { backgroundColor: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" },
    draft: { backgroundColor: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" },
    archived: { backgroundColor: "#f1f2f3", color: "#6d7175", border: "1px solid #d1d5db" },
  };
  const style = styles[status] ?? styles.draft;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        textTransform: "capitalize",
        ...style,
      }}
    >
      {status}
    </span>
  );
}

const thStyle = { textAlign: "left", padding: "10px 12px", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "10px 12px" };
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
const miniInput = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #d0c090",
  fontSize: "13px",
  width: "200px",
  backgroundColor: "#fff",
};
const smallBtn = {
  padding: "7px 16px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#008060",
  color: "#fff",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
