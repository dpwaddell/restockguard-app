import { prisma } from "../shopify.server";
import { redis } from "../lib/redis.server.js";

const PLAN_SUBSCRIBER_LIMITS = {
  FREE: 100,
  STARTER: 1_000,
  GROWTH: 5_000,
  PREMIUM: Infinity,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function checkRateLimit(ip) {
  const key = `ratelimit:subscribe:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  return count <= 5;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return new Response(null, { status: 405, headers: CORS_HEADERS });
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!await checkRateLimit(ip)) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { shopDomain, email: rawEmail, productId, variantId: rawVariantId } = body;

  if (!shopDomain) {
    return json({ error: "shopDomain is required" }, 400);
  }
  if (!rawEmail || !emailRe.test(rawEmail.trim())) {
    return json({ error: "A valid email address is required" }, 400);
  }
  if (!productId) {
    return json({ error: "productId is required" }, 400);
  }

  const email = rawEmail.trim().toLowerCase();

  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    return json({ error: "Shop not found" }, 400);
  }

  // FREE plan: product-level only (ignore variantId)
  const variantId = shop.plan === "FREE" ? null : (rawVariantId || null);

  // Enforce per-plan subscriber cap (count only active subscribers)
  const limit = PLAN_SUBSCRIBER_LIMITS[shop.plan] ?? 100;
  if (limit !== Infinity) {
    const activeCount = await prisma.subscriber.count({
      where: { shopId: shop.id, status: { in: ["ACTIVE", "SENT"] } },
    });
    if (activeCount >= limit) {
      return json(
        { error: "This store's notification list is currently full. Please try again later." },
        429,
      );
    }
  }

  const existingSub = await prisma.subscriber.findFirst({
    where: {
      email,
      shopId: shop.id,
      productId: String(productId),
      variantId: variantId ?? null,
    },
  });
  if (existingSub) {
    await prisma.subscriber.update({
      where: { id: existingSub.id },
      data: { status: "ACTIVE" },
    });
  } else {
    await prisma.subscriber.create({
      data: {
        shopId: shop.id,
        email,
        productId: String(productId),
        variantId: variantId ?? null,
        status: "ACTIVE",
        source: "storefront",
      },
    });
  }

  // Increment today's analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.analyticsDaily.upsert({
    where: { shopId_date: { shopId: shop.id, date: today } },
    create: { shopId: shop.id, date: today, newSignups: 1 },
    update: { newSignups: { increment: 1 } },
  });

  return json(
    { success: true, message: "You'll be notified when this item is back in stock." },
    200
  );
};
