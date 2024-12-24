import { DataAPIVector } from '@datastax/astra-db-ts';

/**
 * Transforms astra-db-ts document results into something Mongoose can deserialize:
 * 
 * 1. DataAPIVector -> array
 * 2. Map -> POJO since Mongoose doesn't expect maps from the underlying driver
 * 
 * @param doc 
 * @returns void
 */

export default function deserializeDoc(doc: Record<string, unknown> | null) {
    if (doc == null) {
        return doc;
    }
    for (const [key, value] of Object.entries(doc)) {
        if (value instanceof DataAPIVector) {
            doc[key] = value.asArray();
        }
        if (value instanceof Map) {
            doc[key] = Object.fromEntries([...value.entries()]);
        }
    }
    return doc;
}