import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const orderId = String(payload.id);
  const lineItems = payload.line_items ?? [];

  console.log(`[${topic}] shop=${shop} orderId=${orderId} lineItems=${lineItems.length}`);

  const shopRecord = await prisma.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord || shopRecord.uninstalledAt) {
    return new Response(null, { status: 200 });
  }

  for (const item of lineItems) {
    // Skip custom line items that have no product
    if (!item.product_id) continue;

    const productId = String(item.product_id);
    const itemTotal = parseFloat(item.price) * item.quantity;

    // Find one SENT subscriber for this product, with their most recent AlertSend
    const subscriber = await prisma.subscriber.findFirst({
      where: { shopId: shopRecord.id, productId, status: "SENT" },
      include: {
        alertSends: {
          where: { productId },
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    });

    if (!subscriber) continue;

    const alertSendId = subscriber.alertSends[0]?.id ?? null;

    try {
      await prisma.$transaction([
        prisma.conversion.create({
          data: {
            shopId: shopRecord.id,
            subscriberId: subscriber.id,
            alertSendId,
            orderId,
            productId,
            orderValue: itemTotal,
          },
        }),
        prisma.subscriber.update({
          where: { id: subscriber.id },
          data: { status: "CONVERTED" },
        }),
      ]);

      console.log(
        `[${topic}] conversion recorded shop=${shop} product=${productId} order=${orderId} subscriber=${subscriber.id} value=${itemTotal}`
      );
    } catch (e) {
      if (e?.code === "P2002") {
        // Unique constraint hit — this order+product was already processed (duplicate webhook delivery)
        console.log(`[${topic}] duplicate skipped order=${orderId} product=${productId}`);
        continue;
      }
      throw e;
    }
  }

  return new Response(null, { status: 200 });
};
