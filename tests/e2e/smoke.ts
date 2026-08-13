// Copyright DataStax, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Compile-only smoke test: exercises the published type definitions the way a
// typical application would use them. Checked with `tsc --noEmit`, never executed.

import { AstraMongoose, createAstraUri, driver } from '@datastax/astra-mongoose';
import mongoose, { Schema } from 'mongoose';

const astraMongoose: AstraMongoose = mongoose.setDriver(driver);

const movieSchema = new Schema({
    title: { type: String, required: true },
    year: Number
});

const Movie = astraMongoose.model('Movie', movieSchema);

async function main() {
    const uri = createAstraUri(
        process.env.ASTRA_API_ENDPOINT!,
        process.env.ASTRA_APPLICATION_TOKEN!
    );
    await astraMongoose.connect(uri, { isAstra: true });

    const movie = await Movie.create({ title: 'Test', year: 2005 });
    console.log(movie.title);

    const movies = await Movie.find({ year: { $gte: 2000 } });
    console.log(movies.length);

    await astraMongoose.disconnect();
}

void main();
