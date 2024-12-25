"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deserializeDoc;
const astra_db_ts_1 = require("@datastax/astra-db-ts");
/**
 * Transforms astra-db-ts document results into something Mongoose can deserialize:
 *
 * 1. DataAPIVector -> array
 * 2. Map -> POJO since Mongoose doesn't expect maps from the underlying driver
 *
 * @param doc
 * @returns void
 */
function deserializeDoc(doc) {
    if (doc == null) {
        return doc;
    }
    for (const [key, value] of Object.entries(doc)) {
        if (value instanceof astra_db_ts_1.DataAPIVector) {
            doc[key] = value.asArray();
        }
        if (value instanceof Map) {
            doc[key] = Object.fromEntries([...value.entries()]);
        }
    }
    return doc;
}
//# sourceMappingURL=deserializeDoc.js.map