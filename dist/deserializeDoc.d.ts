/**
 * Replaces any DataAPIVector instances with array equivalent because Mongoose can't deserialize DataAPIVector.
 *
 * @param doc
 * @returns void
 */
export default function deserializeDoc(doc: Record<string, unknown> | null): Record<string, unknown> | null;
