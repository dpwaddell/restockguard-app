import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return { subscriberCount: 0, alertCount: 0, revenue: "0.00" };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [subscriberCount, alertCount, revenueResult] = await Promise.all([
    prisma.subscriber.count({ where: { shopId: shop.id } }),
    prisma.alertSend.count({
      where: { shopId: shop.id, sentAt: { gte: thirtyDaysAgo } },
    }),
    prisma.conversion.aggregate({
      where: { shopId: shop.id },
      _sum: { orderValue: true },
    }),
  ]);

  const revenue = revenueResult._sum.orderValue
    ? Number(revenueResult._sum.orderValue).toFixed(2)
    : "0.00";

  return { subscriberCount, alertCount, revenue };
};

export default function Index() {
  const { subscriberCount, alertCount, revenue } = useLoaderData();

  return (
    <s-page heading="RestockGuard">
      <s-banner tone="info">
        <s-paragraph>
          Get started by installing the widget on your store, then set a
          product to sold-out to test the alert flow.
        </s-paragraph>
      </s-banner>

      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-heading>{subscriberCount}</s-heading>
              <s-text>Total Subscribers</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-heading>{alertCount}</s-heading>
              <s-text>Alerts Sent (30d)</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-heading>£{revenue}</s-heading>
              <s-text>Recovered Revenue</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
