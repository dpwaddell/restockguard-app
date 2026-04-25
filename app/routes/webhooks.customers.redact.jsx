import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[${topic}] customer redact request for shop=${shop}`);
  // Sprint 5: delete subscriber records for the specified customer
  return new Response(null, { status: 200 });
};
