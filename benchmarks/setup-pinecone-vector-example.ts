import { Pinecone } from '@pinecone-database/pinecone';

main().then(
    () => { process.exit(0); },
    err => {
        console.error(err);
        process.exit(-1);
    }
);

async function main() {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
        throw new Error('Cannot run pinecone setup without an API key');
    }

    const pinecone = new Pinecone();

    console.log('Creating vectors...');

    const numVectors = 1000;
    const index = process.env.PINECONE_INDEX;
    const start = Date.now();
    for (let i = 0; i < numVectors; ++i) {
        console.log(`${i} / ${numVectors}`);
        const values: number[] = Array(1536).fill(0);
        values[i] = 1;
        await pinecone.index(index).upsert([{
            id: '' + i,
            values,
            metadata: {
                prompt: `Test ${i}`
            }
        }]);
    }

    console.log('Done', Date.now() - start);
    process.exit(0);
}