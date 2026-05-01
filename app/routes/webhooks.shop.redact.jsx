import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[${topic}] shop=${shop} — beginning full shop redaction`);

  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) {
    console.log(`[${topic}] Shop not found: ${shop} — nothing to redact`);
    return new Response(null, { status: 200 });
  }

  const shopId = shopRecord.id;

  // Delete all shop data in dependency order inside a transaction.
  // Sessions are keyed by shop domain (no FK), so they are cleaned up separately.
  await prisma.session.deleteMany({ where: { shop } });

  const results = await prisma.$transaction([
    // Conversions reference both subscribers and alert_sends — delete first
    prisma.conversion.deleteMany({ where: { shopId } }),
    // AlertSends reference subscribers — delete before subscribers
    prisma.alertSend.deleteMany({ where: { shopId } }),
    // Subscribers
    prisma.subscriber.deleteMany({ where: { shopId } }),
    // Preorder configs
    prisma.preorderConfig.deleteMany({ where: { shopId } }),
    // Analytics
    prisma.analyticsDaily.deleteMany({ where: { shopId } }),
    // Finally delete the shop row itself
    prisma.shop.delete({ where: { id: shopId } }),
  ]);

  console.log(
    `[${topic}] Shop redaction complete for shop=${shop}: ` +
    `conversions=${results[0].count}, ` +
    `alert_sends=${results[1].count}, ` +
    `subscribers=${results[2].count}, ` +
    `preorder_configs=${results[3].count}, ` +
    `analytics_daily=${results[4].count}`
  );

  return new Response(null, { status: 200 });
};
