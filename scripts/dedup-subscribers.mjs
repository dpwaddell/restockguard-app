/**
 * Finds duplicate Subscriber rows sharing the same (shopId, email, productId),
 * keeps the earliest (lowest createdAt), and removes the rest.
 *
 * Dry-run by default. Pass --delete to commit deletions.
 *
 * Usage:
 *   node scripts/dedup-subscribers.mjs
 *   node scripts/dedup-subscribers.mjs --delete
 */

import { PrismaClient } from '@prisma/client';

const dryRun = !process.argv.includes('--delete');
const prisma = new PrismaClient();

async function main() {
  console.log(dryRun ? '--- DRY RUN (pass --delete to commit) ---\n' : '--- DELETE MODE ---\n');

  // Pull all subscribers ordered oldest-first so the first row in each group
  // is always the keeper.
  const all = await prisma.subscriber.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, shopId: true, email: true, productId: true, variantId: true, status: true, createdAt: true },
  });

  // Group by (shopId, email, productId) — intentionally ignoring variantId so
  // that e.g. the same email signed up for two variants of the same product is
  // also caught.
  const groups = new Map();
  for (const row of all) {
    const key = `${row.shopId}||${row.email.toLowerCase()}||${row.productId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicateGroups = [...groups.values()].filter(g => g.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} group(s) with duplicates:\n`);

  const toDelete = [];

  for (const group of duplicateGroups) {
    const [keeper, ...dupes] = group; // first = earliest createdAt
    console.log(`  KEEP   ${keeper.id}  email=${keeper.email}  productId=${keeper.productId}  variantId=${keeper.variantId ?? 'null'}  status=${keeper.status}  createdAt=${keeper.createdAt.toISOString()}`);
    for (const d of dupes) {
      console.log(`  DELETE ${d.id}  email=${d.email}  productId=${d.productId}  variantId=${d.variantId ?? 'null'}  status=${d.status}  createdAt=${d.createdAt.toISOString()}`);
      toDelete.push(d.id);
    }
    console.log();
  }

  console.log(`Total to delete: ${toDelete.length} row(s) across ${duplicateGroups.length} group(s).`);

  if (dryRun) {
    console.log('\nDry run complete — nothing was deleted. Re-run with --delete to commit.');
    return;
  }

  // Cascade: null out foreign-key references in alert_sends and conversions
  // before deleting, since Prisma won't do SET NULL automatically here.
  console.log('\nNulling subscriber references in conversions...');
  const convResult = await prisma.conversion.updateMany({
    where: { subscriberId: { in: toDelete } },
    data: { subscriberId: null },
  });
  console.log(`  ${convResult.count} conversion row(s) updated.`);

  // AlertSend has a non-nullable subscriberId (required relation), so we delete
  // those rows rather than null them out.
  console.log('Deleting orphaned alert_sends...');
  const alertResult = await prisma.alertSend.deleteMany({
    where: { subscriberId: { in: toDelete } },
  });
  console.log(`  ${alertResult.count} alert_send row(s) deleted.`);

  console.log('Deleting duplicate subscribers...');
  const delResult = await prisma.subscriber.deleteMany({
    where: { id: { in: toDelete } },
  });
  console.log(`  ${delResult.count} subscriber row(s) deleted.`);

  console.log('\nDone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
