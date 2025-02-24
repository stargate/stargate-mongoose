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
        const $vector = this.model.schema.paths['$vector'];
        const $vectorize = this.model.schema.paths['$vectorize'];
        if (projection != null) {
            if (Object.keys(projection).length === 1 && projection['*']) {
                // If schema has `select: true` for $vector or $vectorize, select: '*' will break with
                // "wildcard ('*') only allowed as the only root-level path" error because Mongoose will
                // add `$vector: 1` or `$vectorize: 1`. As a workaround, replace '*: 1' with including
                // vector and vectorize.
                if ($vector?.options?.select || $vectorize?.options?.select) {
                    this.projection({ $vector: 1, $vectorize: 1 });
                }
                return;
            }
        }
        if ($vector?.options?.select && projectionDoesNotHaveProperty(projection, '$vector')) {
            this.projection({ ...projection, $vector: 1 });
        }
        if ($vectorize?.options?.select && projectionDoesNotHaveProperty(projection, '$vectorize')) {
            this.projection({ ...projection, $vectorize: 1 });
        }
    });
}
function projectionDoesNotHaveProperty(projection, property) {
    return projection == null || !(property in projection);
}
//# sourceMappingURL=plugins.js.map