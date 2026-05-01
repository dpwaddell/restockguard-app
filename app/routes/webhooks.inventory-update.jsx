import { authenticate } from "../shopify.server";
import { prisma } from "../shopify.server";
import { redis } from "../lib/redis.server.js";
import { restockAlertsQueue } from "../lib/queue.server.js";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const { inventory_item_id, location_id, available } = payload;

  console.log(
    `[${topic}] shop=${shop} inventory_item_id=${inventory_item_id} location_id=${location_id} available=${available}`
  );

  // Only proceed when stock goes positive
  if (!available || available <= 0) {
    return new Response(null, { status: 200 });
  }

  // Dedup: only enqueue when transitioning from 0 (or unknown) → positive
  const redisKey = `inv:${shop}:${inventory_item_id}`;
  const previous = await redis.get(redisKey);
  const previousQty = previous === null ? 0 : parseInt(previous, 10);

  await redis.set(redisKey, available, "EX", 86400 * 90);

  if (previousQty > 0) {
    // Already had stock — not a restock transition
    return new Response(null, { status: 200 });
  }

  const shopRecord = await prisma.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord || shopRecord.uninstalledAt) {
    return new Response(null, { status: 200 });
  }

  await restockAlertsQueue.add(
    "restock-check",
    {
      shopId: shopRecord.id,
      shopDomain: shop,
      inventoryItemId: String(inventory_item_id),
      productId: null,
      variantId: null,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );

  console.log(
    `[${topic}] enqueued restock-check for shop=${shop} inventoryItemId=${inventory_item_id}`
  );

  return new Response(null, { status: 200 });
};
