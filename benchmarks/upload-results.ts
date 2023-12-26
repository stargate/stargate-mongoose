import { driver } from '../';
import { execSync } from 'child_process';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';

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
    if (!process.env.ASTRA_UPLOAD_CONNECTION_STRING) {
        return;
    }

    const githash = execSync('git rev-parse HEAD').toString().trim();

    await mongoose.connect(process.env.ASTRA_UPLOAD_CONNECTION_STRING, {
        isAstra: true
    } as mongoose.ConnectOptions);
    const BenchmarkResult = mongoose.model(
        'BenchmarkResult',
        new mongoose.Schema({
            githash: {
              type: String,
              required: true
            },
            name: {
              type: String,
              required: true
            },
            totalTimeMS: {
              type: Number
            }
        }, { autoCreate: true, timestamps: true })
    );
    await BenchmarkResult.init();

    const files = fs
        .readdirSync(path.join('.', 'benchmarks'))
        .filter(file => file.endsWith('.out'));
    for (const file of files) {
        const { name, totalTimeMS } = JSON.parse(
            fs.readFileSync(path.join('.', 'benchmarks', file), 'utf8')
        );
        if (totalTimeMS == null) {
          continue;
        }
        const doc = await BenchmarkResult.findOneAndUpdate(
          { githash, name },
          { totalTimeMS },
          { upsert: true, returnDocument: 'after' }
        );
        console.log(doc);
    }
}