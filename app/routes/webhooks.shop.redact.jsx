import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[${topic}] shop redact request for shop=${shop}`);
  // Sprint 5: delete all data for this shop
  return new Response(null, { status: 200 });
};
