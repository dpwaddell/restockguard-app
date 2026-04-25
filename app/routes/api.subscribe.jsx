import { prisma } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple in-memory rate limiter: 5 requests per IP per minute
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

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

  if (!checkRateLimit(ip)) {
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

  const existing = await prisma.subscriber.findFirst({
    where: { email, shopId: shop.id, productId: String(productId), variantId },
  });

  if (existing) {
    if (existing.status === "UNSUBSCRIBED") {
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
    }
    // Already ACTIVE — idempotent, no-op
  } else {
    await prisma.subscriber.create({
      data: {
        shopId: shop.id,
        email,
        productId: String(productId),
        variantId,
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
