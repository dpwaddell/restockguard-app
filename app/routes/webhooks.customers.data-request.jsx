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
    console.log(`[${topic}] Shop not found: ${shop} — nothing to report`);
    return new Response(null, { status: 200 });
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { shopId: shopRecord.id, email: customerEmail },
    select: {
      id: true,
      email: true,
      productId: true,
      variantId: true,
      status: true,
      source: true,
      createdAt: true,
    },
  });

  const subscriberIds = subscribers.map((s) => s.id);

  const alertSends = subscriberIds.length > 0
    ? await prisma.alertSend.findMany({
        where: { subscriberId: { in: subscriberIds } },
        select: { id: true, productId: true, variantId: true, sentAt: true },
      })
    : [];

  const responseData = {
    shop_domain: shop,
    customer_email: customerEmail,
    customer_id: customerId,
    data_found: subscribers.length > 0,
    records: {
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        product_id: s.productId,
        variant_id: s.variantId,
        status: s.status,
        source: s.source,
        signed_up_at: s.createdAt.toISOString(),
      })),
      alert_sends: alertSends.map((a) => ({
        id: a.id,
        product_id: a.productId,
        variant_id: a.variantId,
        sent_at: a.sentAt.toISOString(),
      })),
    },
  };

  console.log(
    `[${topic}] Returning ${subscribers.length} subscriber(s), ${alertSends.length} alert send(s) for customer_id=${customerId} shop=${shop}`
  );

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
