import { prisma } from "../shopify.server";
import { verifyUnsubscribeToken } from "../lib/token.server.js";

const html = (content, status = 200) =>
  new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
     <title>RestockGuard</title>
     <style>body{font-family:sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#333}
     h2{font-weight:600}p{line-height:1.6;color:#555}</style></head>
     <body>${content}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return html(
      "<h2>Invalid link</h2><p>This unsubscribe link is invalid or has expired.</p>",
      400
    );
  }

  const subscriberId = verifyUnsubscribeToken(token);
  if (!subscriberId) {
    return html(
      "<h2>Invalid link</h2><p>This unsubscribe link is invalid or has expired.</p>",
      400
    );
  }

  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { status: "UNSUBSCRIBED" },
    });
  } catch {
    // Subscriber already deleted or not found — treat as success
  }

  return html(
    `<h2>Unsubscribed</h2>
     <p>You have been unsubscribed. You will no longer receive alerts for this product.</p>`
  );
};
