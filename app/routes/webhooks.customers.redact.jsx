import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const customerEmail = payload?.customer?.email;
  const customerId = payload?.customer?.id;

  console.log(`[${topic}] shop=${shop} customer=${customerEmail} id=${customerId}`);

  if (!customerEmail) {
    console.warn(`[${topic}] No customer email in payload for shop=${shop}`);
    return new Response(null, { status: 200 });
  }

  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { id: true },
  });

  if (!shopRecord) {
    console.log(`[${topic}] Shop not found: ${shop} — nothing to redact`);
    return new Response(null, { status: 200 });
  }

  // Find subscribers to get their IDs (needed to delete dependent records)
  const subscribers = await prisma.subscriber.findMany({
    where: { shopId: shopRecord.id, email: customerEmail },
    select: { id: true },
  });

  const subscriberIds = subscribers.map((s) => s.id);

  if (subscriberIds.length === 0) {
    console.log(`[${topic}] No records found for customer=${customerEmail} shop=${shop}`);
    return new Response(null, { status: 200 });
  }

  // Delete in dependency order: conversions → alert_sends → subscribers
  const [deletedConversions, deletedAlertSends, deletedSubscribers] = await prisma.$transaction([
    prisma.conversion.deleteMany({
      where: { subscriberId: { in: subscriberIds } },
    }),
    prisma.alertSend.deleteMany({
      where: { subscriberId: { in: subscriberIds } },
    }),
    prisma.subscriber.deleteMany({
      where: { id: { in: subscriberIds } },
    }),
  ]);

  console.log(
    `[${topic}] Redacted customer=${customerEmail} shop=${shop}: ` +
    `${deletedSubscribers.count} subscriber(s), ` +
    `${deletedAlertSends.count} alert send(s), ` +
    `${deletedConversions.count} conversion(s)`
  );

  return new Response(null, { status: 200 });
};
