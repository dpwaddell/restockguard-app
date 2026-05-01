import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/components";
import { BackInStock } from "./emails/BackInStock.jsx";
import { sendAlertQueue } from "./app/lib/queue.server.js";
import { generateUnsubscribeToken } from "./app/lib/token.server.js";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Workers use their own connection (separate from the Queue instances)
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 500 },
};

// ---------------------------------------------------------------------------
// Queue: restock-alerts
// Resolves inventoryItemId → productId/variantId, then fans out send-alert jobs
// ---------------------------------------------------------------------------

const restockWorker = new Worker(
  "restock-alerts",
  async (job) => {
    const { shopId, shopDomain, inventoryItemId, productId: rawProductId, variantId: rawVariantId } =
      job.data;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.uninstalledAt) {
      console.log(`[restock-alerts] skipping uninstalled/missing shop ${shopId}`);
      return;
    }

    let productId = rawProductId;
    let variantId = rawVariantId ?? null;

    if (!productId && inventoryItemId) {
      const resolved = await resolveInventoryItem(
        shop.shopDomain,
        shop.accessToken,
        inventoryItemId
      );
      if (!resolved) {
        console.warn(`[restock-alerts] could not resolve inventoryItemId=${inventoryItemId} for shop=${shop.shopDomain}`);
        return;
      }
      productId = resolved.productId;
      variantId = resolved.variantId;
    }

    // Match subscribers for this specific variant AND product-level subscribers
    // (variantId = null means "any variant" — always notify them on any restock)
    const subscribers = await prisma.subscriber.findMany({
      where: {
        shopId,
        productId: String(productId),
        status: "ACTIVE",
        ...(variantId
          ? { OR: [{ variantId: String(variantId) }, { variantId: null }] }
          : { variantId: null }),
      },
    });

    if (!subscribers.length) {
      console.log(
        `[restock-alerts] no active subscribers for shop=${shop.shopDomain} product=${productId} variant=${variantId}`
      );
      return;
    }

    console.log(
      `[restock-alerts] fanning out ${subscribers.length} send-alert jobs for product=${productId}`
    );

    for (const sub of subscribers) {
      await sendAlertQueue.add(
        "send-alert",
        {
          subscriberId: sub.id,
          shopId,
          shopDomain: shop.shopDomain,
          productId: String(productId),
          // Use the subscriber's own variantId so the email reflects what they signed up for
          variantId: sub.variantId ? String(sub.variantId) : null,
        },
        {
          ...defaultJobOptions,
          jobId: `send-${sub.id}-${productId}`,
        }
      );
    }
  },
  { connection, concurrency: 5 }
);

// ---------------------------------------------------------------------------
// Queue: send-alert
// Fetches product data, renders email, sends via Resend, records AlertSend
// ---------------------------------------------------------------------------

const sendWorker = new Worker(
  "send-alert",
  async (job) => {
    const { subscriberId, shopId, shopDomain, productId, variantId } = job.data;

    const [subscriber, shop] = await Promise.all([
      prisma.subscriber.findUnique({ where: { id: subscriberId } }),
      prisma.shop.findUnique({ where: { id: shopId } }),
    ]);

    if (!subscriber || subscriber.status !== "ACTIVE") {
      console.log(`[send-alert] skipping subscriber ${subscriberId} (status=${subscriber?.status})`);
      return;
    }
    if (!shop || shop.uninstalledAt) {
      console.log(`[send-alert] skipping uninstalled shop ${shopId}`);
      return;
    }

    const product = await fetchProduct(shop.shopDomain, shop.accessToken, productId, variantId);

    const token = generateUnsubscribeToken(subscriber.id);
    const unsubscribeUrl = `${process.env.SHOPIFY_APP_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;

    const emailHtml = await render(
      React.createElement(BackInStock, {
        shopName: shop.settings?.emailFromName || shopDomain,
        productTitle: product.title,
        productImageUrl: product.imageUrl,
        productUrl: `https://${shopDomain}/products/${product.handle}`,
        variantTitle: product.variantTitle || null,
        unsubscribeUrl,
      })
    );

    const fromName = shop.settings?.emailFromName || shopDomain;
    const fromAddress = shop.settings?.fromEmail || process.env.EMAIL_FROM_ADDRESS;

    const { data, error } = await resend.emails.send(
      {
        from: `${fromName} <${fromAddress}>`,
        to: subscriber.email,
        subject: `Back in stock: ${product.title}`,
        html: emailHtml,
      },
      { idempotencyKey: job.id }
    );

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    await prisma.$transaction([
      prisma.alertSend.create({
        data: {
          shopId,
          subscriberId: subscriber.id,
          productId: String(productId),
          variantId: variantId ? String(variantId) : null,
          emailId: data.id,
        },
      }),
      prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: "SENT" },
      }),
    ]);

    console.log(`[send-alert] sent email id=${subscriber.id} for product=${productId}`);
  },
  { connection, concurrency: 5 }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveInventoryItem(shopDomain, accessToken, inventoryItemId) {
  const query = `{
    inventoryItem(id: "gid://shopify/InventoryItem/${inventoryItemId}") {
      variant { id product { id } }
    }
  }`;

  const res = await fetch(`https://${shopDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error(`[resolveInventoryItem] API error ${res.status} for shop=${shopDomain}`);
    return null;
  }

  const json = await res.json();
  const variant = json?.data?.inventoryItem?.variant;
  if (!variant) return null;

  return {
    variantId: variant.id.split("/").pop(),
    productId: variant.product.id.split("/").pop(),
  };
}

async function fetchProduct(shopDomain, accessToken, productId, variantId) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/2025-10/products/${productId}.json`,
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );

  if (!res.ok) {
    return { title: "Your item", imageUrl: null, handle: "", variantTitle: null };
  }

  const { product } = await res.json();

  let variantTitle = null;
  if (variantId) {
    const v = product.variants?.find((v) => String(v.id) === String(variantId));
    if (v && v.title !== "Default Title") variantTitle = v.title;
  }

  return {
    title: product.title,
    imageUrl: product.images?.[0]?.src || null,
    handle: product.handle,
    variantTitle,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

for (const w of [restockWorker, sendWorker]) {
  w.on("completed", (job) =>
    console.log(`[worker] completed id=${job.id} queue=${job.queueName}`)
  );
  w.on("failed", (job, err) =>
    console.error(`[worker] failed id=${job?.id} queue=${job?.queueName}: ${err.message}`)
  );
}

process.on("SIGTERM", async () => {
  console.log("[worker] graceful shutdown...");
  await Promise.all([restockWorker.close(), sendWorker.close()]);
  connection.disconnect();
  await prisma.$disconnect();
});
