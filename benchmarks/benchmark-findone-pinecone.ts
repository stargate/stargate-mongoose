main().then(
    () => { process.exit(0); },
    err => {
        console.error(err);
        process.exit(-1);
    }
);

async function main() {
    let Pinecone;
    try {
        Pinecone = require('@pinecone-database/pinecone').Pinecone;
    } catch (err) {
        console.log('{"name":"benchmark-findone-pinecone"}');
        return;
    }

    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
        console.log('{"name":"benchmark-findone-pinecone"}');
        return;
    }

    const pinecone = new Pinecone();

    const vector = [1, ...Array(1535).fill(0)];
    const index = process.env.PINECONE_INDEX;
    const start = Date.now();
    for (let i = 0; i < 100; ++i) {
        await pinecone.index(index).query({ topK: 1, vector, includeValues: true });
    }
    const results = {
        name: 'benchmark-findone-pinecone',
        totalTimeMS: Date.now() - start
    };
    console.log(JSON.stringify(results, null, '  '));
}
