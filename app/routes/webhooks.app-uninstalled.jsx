import { authenticate, prisma } from "../shopify.server";
import { restockAlertsQueue, sendAlertQueue } from "../lib/queue.server.js";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[${topic}] shop=${shop} — marking inactive and cancelling queued jobs`);

  // Mark shop inactive; keep data for potential reinstall
  await prisma.shop.updateMany({
    where: { shopDomain: shop },
    data: { isActive: false, uninstalledAt: new Date() },
  });

  console.log(`[${topic}] shop=${shop} deactivated`);

  // Fire-and-forget: job cancellation must not block the 200 response
  Promise.allSettled([
    cancelShopJobs(restockAlertsQueue, shop),
    cancelShopJobs(sendAlertQueue, shop),
  ]).catch(() => {});

  return new Response(null, { status: 200 });
};

async function cancelShopJobs(queue, shopDomain) {
  const [waiting, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getDelayed(),
  ]);

  const toRemove = [...waiting, ...delayed].filter(
    (job) => job.data?.shopDomain === shopDomain
  );

  if (toRemove.length > 0) {
    await Promise.all(toRemove.map((job) => job.remove()));
    console.log(`Removed ${toRemove.length} queued job(s) for shop=${shopDomain} from ${queue.name}`);
  }
}
