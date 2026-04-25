// Re-exports the singleton from shopify.server.js so existing route imports
// (`import db from "../db.server"`) continue to work unchanged.
export { prisma as default } from "./shopify.server.js";
