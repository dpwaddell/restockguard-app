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

  // Always update the dedup key so "went to 0" is recorded.
  // If we only update it on available > 0 (old behaviour), the key retains a
  // stale positive value when stock drops, and the next restock is incorrectly
  // blocked by the previousQty > 0 check.
  const redisKey = `inv:${shop}:${inventory_item_id}`;
  const previous = await redis.get(redisKey);
  const previousQty = previous === null ? 0 : parseInt(previous, 10);

  await redis.set(redisKey, available ?? 0, "EX", 86400 * 90);

  // Only proceed when stock goes positive
  if (!available || available <= 0) {
    return new Response(null, { status: 200 });
  }

  // Dedup: only enqueue when transitioning from 0 (or unknown) → positive
  if (previousQty > 0) {
    console.log(
      `[${topic}] skipping — previousQty=${previousQty} already positive for inventoryItemId=${inventory_item_id}`
    );
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
