import type { Schema, Query } from 'mongoose';

export function handleVectorFieldsProjection(this: Query<unknown, unknown>, schema: Schema) {
    schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete'], function() {
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