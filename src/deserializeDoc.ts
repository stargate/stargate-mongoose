import { DataAPIVector } from '@datastax/astra-db-ts';

/**
 * Replaces any DataAPIVector instances with array equivalent because Mongoose can't deserialize DataAPIVector.
 * 
 * @param doc 
 * @returns void
 */

export default function deserializeDoc(doc: Record<string, unknown> | null) {
    if (doc == null) {
        return doc;
    }
    if ('$vector' in doc && doc.$vector instanceof DataAPIVector) {
        doc.$vector = doc.$vector.asArray();
    }
    for (const [key, value] of Object.entries(doc)) {
        if (value instanceof Map) {
            doc[key] = Object.fromEntries([...value.entries()]);
        }
    }
    return doc;
}