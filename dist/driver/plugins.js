"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVectorFieldsProjection = handleVectorFieldsProjection;
/**
 * Mongoose plugin to handle adding `$vector` to the projection by default if `$vector` has `select: true`.
 * Because `$vector` is deselected by default, this plugin makes it possible for the user to include `$vector`
 * by default from their schema.
 */
function handleVectorFieldsProjection(schema) {
    schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete'], function () {
        const projection = this.projection();
        if (projection != null) {
            if (Object.keys(projection).length === 1 && projection['*']) {
                return;
            }
        }
        const $vector = this.model.schema.paths['$vector'];
        const $vectorize = this.model.schema.paths['$vectorize'];
        if ($vector?.options?.select && (projection == null || !('$vector' in projection))) {
            this.projection({ ...projection, $vector: 1 });
        }
        if ($vectorize?.options?.select && (projection == null || !('$vectorize' in projection))) {
            this.projection({ ...projection, $vectorize: 1 });
        }
    });
}
//# sourceMappingURL=plugins.js.map