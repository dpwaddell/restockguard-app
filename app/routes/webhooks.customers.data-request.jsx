import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[${topic}] data request for shop=${shop}`);
  // Sprint 5: query and return customer data
  return new Response(null, { status: 200 });
};
