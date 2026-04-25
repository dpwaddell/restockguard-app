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

export default function App() {
  const { apiKey, plan } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/waitlists">Waitlists</s-link>
        <s-link href="/app/products">Products</s-link>
        <s-link href="/app/styling">Styling</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/upgrade">
          {plan === "FREE" ? "⬆ Upgrade" : `Plan: ${plan}`}
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
