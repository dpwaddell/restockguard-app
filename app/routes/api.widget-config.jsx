import { prisma } from "../shopify.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const shopDomain = new URL(request.url).searchParams.get("shop");
  if (!shopDomain) {
    return Response.json({ error: "Missing shop" }, { status: 400, headers: CORS });
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { settings: true },
  });

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404, headers: CORS });
  }

  const s = shop.settings ?? {};

  return Response.json(
    {
      styling: s.styling ?? {},
      messages: {
        buttonText: s.buttonText || "Notify me when back in stock",
        successMessage: s.successMessage || "Thanks! We'll email you when it's back.",
        emailPlaceholder: s.emailPlaceholder || "Enter your email address",
        preorderButtonText: s.preorderButtonText || "Reserve yours now",
      },
      preorderConfigs: s.preorderConfigs ?? {},
    },
    { headers: CORS },
  );
};
