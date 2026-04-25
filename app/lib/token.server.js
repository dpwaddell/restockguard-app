import { createHmac, timingSafeEqual } from "crypto";

export function generateUnsubscribeToken(subscriberId) {
  const hmac = createHmac("sha256", process.env.SESSION_SECRET)
    .update(subscriberId)
    .digest("hex");
  return Buffer.from(`${subscriberId}.${hmac}`).toString("base64url");
}

export function verifyUnsubscribeToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const dot = decoded.indexOf(".");
    if (dot === -1) return null;

    const subscriberId = decoded.slice(0, dot);
    const providedHmac = decoded.slice(dot + 1);
    const expectedHmac = createHmac("sha256", process.env.SESSION_SECRET)
      .update(subscriberId)
      .digest("hex");

    if (providedHmac.length !== expectedHmac.length) return null;

    const safe = timingSafeEqual(
      Buffer.from(providedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );

    return safe ? subscriberId : null;
  } catch {
    return null;
  }
}
