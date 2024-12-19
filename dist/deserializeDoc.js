"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deserializeDoc;
const astra_db_ts_1 = require("@datastax/astra-db-ts");
/**
 * Replaces any DataAPIVector instances with array equivalent because Mongoose can't deserialize DataAPIVector.
 *
 * @param doc
 * @returns void
 */
function deserializeDoc(doc) {
    if (doc == null) {
        return doc;
    }
    if ('$vector' in doc && doc.$vector instanceof astra_db_ts_1.DataAPIVector) {
        doc.$vector = doc.$vector.asArray();
    }
    return doc;
}
//# sourceMappingURL=deserializeDoc.js.map