import type { PrismaClient } from "../generated/prisma/client.js";

/**
 * Bumps the updatedAt timestamp on a Map.
 * Call this after any child entity (node, tag, attachment, node-tag) is created, updated, or deleted.
 * Accepts either the main PrismaClient or a transaction client.
 */
export async function bumpMapUpdatedAt(
  client: Pick<PrismaClient, "map">,
  mapId: string
) {
  await client.map.update({
    where: { id: mapId },
    data: { updatedAt: new Date() },
  });
}
