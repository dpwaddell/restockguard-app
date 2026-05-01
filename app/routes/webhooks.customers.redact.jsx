import { authenticate, prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const customerEmail = payload?.customer?.email;
  const customerId = payload?.customer?.id;

  console.log(`[${topic}] shop=${shop} customer_id=${customerId}`);

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
    console.log(`[${topic}] No records found for customer_id=${customerId} shop=${shop}`);
    return new Response(null, { status: 200 });
  }

  // Collect alertSend IDs so we can safely delete conversions that reference
  // them via alertSendId (which is nullable and may differ from subscriberId).
  const alertSends = await prisma.alertSend.findMany({
    where: { subscriberId: { in: subscriberIds } },
    select: { id: true },
  });
  const alertSendIds = alertSends.map((a) => a.id);

  // Delete in dependency order: conversions → alert_sends → subscribers.
  // Conversions are matched by subscriberId OR alertSendId to avoid FK violations.
  const [deletedConversions, deletedAlertSends, deletedSubscribers] = await prisma.$transaction([
    prisma.conversion.deleteMany({
      where: {
        OR: [
          { subscriberId: { in: subscriberIds } },
          { alertSendId: { in: alertSendIds } },
        ],
      },
    }),
    prisma.alertSend.deleteMany({
      where: { subscriberId: { in: subscriberIds } },
    }),
    prisma.subscriber.deleteMany({
      where: { id: { in: subscriberIds } },
    }),
  ]);

  console.log(
    `[${topic}] Redacted customer_id=${customerId} shop=${shop}: ` +
    `${deletedSubscribers.count} subscriber(s), ` +
    `${deletedAlertSends.count} alert send(s), ` +
    `${deletedConversions.count} conversion(s)`
  );

  return new Response(null, { status: 200 });
};
