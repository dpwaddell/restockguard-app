import { authenticate } from "../shopify.server";
import { prisma } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await prisma.shop.updateMany({
    where: { shopDomain: shop },
    data: { uninstalledAt: new Date() },
  });

  return new Response();
};
