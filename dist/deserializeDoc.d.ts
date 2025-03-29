/**
 * Transforms astra-db-ts document results into something Mongoose can deserialize:
 *
 * 1. DataAPIVector -> array
 * 2. Map -> POJO since Mongoose doesn't expect maps from the underlying driver
 *
 * @param doc
 * @returns void
 * @ignore
 */
export default function deserializeDoc<DocType extends Record<string, unknown> = Record<string, unknown>>(doc: Record<string, unknown> | null): DocType | null;
