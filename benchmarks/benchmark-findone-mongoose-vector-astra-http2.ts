import { driver } from '../';
import mongoose from 'mongoose';

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

mongoose.setDriver(driver);

main().then(
    () => { process.exit(0); },
    err => {
        console.error(err);
        process.exit(-1);
    }
);

async function main() {
    if (!process.env.ASTRA_CONNECTION_STRING) {
        console.log('{"name":"benchmark-findone-mongoose-vector-astra"}');
        return;
    }
    await mongoose.connect(process.env.ASTRA_CONNECTION_STRING, {
        isAstra: true,
        useHTTP2: true
    } as mongoose.ConnectOptions);
    const Vector = mongoose.model(
        'Vector',
        new mongoose.Schema({
            $vector: {
                type: [Number]
            },
            prompt: {
                type: String,
                required: true
            }
        }, {
            autoCreate: false
        }),
        process.env.ASTRA_COLLECTION_NAME
    );

    const $meta = [1, ...Array(1535).fill(0)];
    const start = Date.now();
    for (let i = 0; i < 100; ++i) {
        await Vector
            .findOne({})
            .sort({ $vector: { $meta } });
    }
    const results = {
        name: 'benchmark-findone-mongoose-vector-astra-http2',
        totalTimeMS: Date.now() - start
    };
    console.log(JSON.stringify(results, null, '  '));
}
