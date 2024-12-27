/**
 * Transforms astra-db-ts document results into something Mongoose can deserialize:
 *
 * 1. DataAPIVector -> array
 * 2. Map -> POJO since Mongoose doesn't expect maps from the underlying driver
 *
 * @param doc
 * @returns void
 */
export default function deserializeDoc(doc: Record<string, unknown> | null): Record<string, unknown> | null;
