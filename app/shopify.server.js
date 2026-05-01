import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => new PrismaClient();

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function createBillingConfig() {
  return {
    Starter: {
      lineItems: [
        { amount: 9, currencyCode: "USD", interval: BillingInterval.Every30Days },
      ],
      trialDays: 14,
    },
    Growth: {
      lineItems: [
        { amount: 29, currencyCode: "USD", interval: BillingInterval.Every30Days },
      ],
      trialDays: 14,
    },
    Premium: {
      lineItems: [
        { amount: 79, currencyCode: "USD", interval: BillingInterval.Every30Days },
      ],
      trialDays: 14,
    },
  };
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: createBillingConfig(),
  future: {
    expiringOfflineAccessTokens: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app-uninstalled",
    },
    INVENTORY_LEVELS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/inventory-update",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders-paid",
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/data-request",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/redact",
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/shop/redact",
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      shopify.registerWebhooks({ session });

      let shopName;
      try {
        const shopInfoRes = await admin.graphql(`{ shop { name } }`);
        const shopInfoJson = await shopInfoRes.json();
        shopName = shopInfoJson?.data?.shop?.name || undefined;
      } catch {
        // Non-fatal — shopName stays undefined and falls back at send time
      }

      await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: { accessToken: session.accessToken, uninstalledAt: null, ...(shopName ? { shopName } : {}) },
        create: { shopDomain: session.shop, accessToken: session.accessToken, ...(shopName ? { shopName } : {}) },
      });

      // Sync billing plan — handles the post-billing-approval redirect that triggers re-auth
      try {
        const response = await admin.graphql(
          `#graphql
          query {
            currentAppInstallation {
              activeSubscriptions { name id status }
            }
          }`
        );
        const data = await response.json();
        const subs = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];
        const activeSub = subs.find((s) => s.status === "ACTIVE");
        if (activeSub) {
          const nameToKey = { Starter: "STARTER", Growth: "GROWTH", Premium: "PREMIUM" };
          const newPlan = nameToKey[activeSub.name];
          if (newPlan) {
            await prisma.shop.update({
              where: { shopDomain: session.shop },
              data: { plan: newPlan },
            });
          }
        }
      } catch (e) {
        console.warn("[afterAuth] billing sync failed:", e?.message);
      }
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export { prisma };
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
