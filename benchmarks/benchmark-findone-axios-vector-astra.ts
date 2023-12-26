import axios from 'axios';
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
        console.log('{"name":"benchmark-findone-axios-vector-astra"}');
        return;
    }
    await mongoose.connect(process.env.ASTRA_CONNECTION_STRING, {
        isAstra: true
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

    // @ts-ignore
    const dbName = Vector.db.db.name;

    const collectionName = process.env.ASTRA_COLLECTION_NAME ?? '';

    // @ts-ignore
    const baseUrl = mongoose.connection.getClient().httpClient.baseUrl;
  
    // @ts-ignore
    const token = mongoose.connection.getClient().httpClient.applicationToken;
    const $meta = [1, ...Array(1535).fill(0)];
    const start = Date.now();
    for (let i = 0; i < 100; ++i) {
        await axios.post(
            `${baseUrl}/${dbName}/${collectionName}`,
            {
                findOne: {
                    filter: {},
                    sort: { $vector: $meta }
                }
            },
            {
                headers: {
                    Token: token
                }
            }
        );
    }
    const results = {
        name: 'benchmark-findone-axios-vector-astra',
        totalTimeMS: Date.now() - start
    };
    console.log(JSON.stringify(results, null, '  '));
}
