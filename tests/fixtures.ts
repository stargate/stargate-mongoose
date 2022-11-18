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

import { createAstraUri, createStargateUri } from '@/src/collections/utils';
import { Client } from '@/src/collections/client';
import { randFirstName, randLastName } from '@ngneat/falso';

export const astraUri = process.env.ASTRA_URI || createAstraUri(
  process.env.ASTRA_DB_ID ?? '',
  process.env.ASTRA_DB_REGION ?? '',
  process.env.ASTRA_DB_KEYSPACE ?? '',
  process.env.ASTRA_DB_APPLICATION_TOKEN ?? ''
);

export const getAstraClient = async () => {
  if (!process.env.ASTRA_URI && (!process.env.ASTRA_DB_ID || !process.env.ASTRA_DB_APPLICATION_TOKEN)) {
    return null;
  }
  return await Client.connect(astraUri);
};

export const getStargateUri = async () =>
  await createStargateUri(
    process.env.STARGATE_BASE_URL ?? '',
    process.env.STARGATE_AUTH_URL ?? '',
    process.env.ASTRA_DB_KEYSPACE ?? '',
    process.env.STARGATE_USERNAME ?? '',
    process.env.STARGATE_PASSWORD ?? ''
  );

export const getStargateClient = async () => {
  const stargateUri = await getStargateUri();
  return await Client.connect(stargateUri);
};

export const createSampleUser = () => ({
  firstName: randFirstName(),
  lastName: randLastName()
});

export const getSampleUsers = (numUsers: number) =>
  Array.from({ length: numUsers }, createSampleUser);

export const sleep = async (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const testClients = {
  'Astra DB': async () => {
    return await getAstraClient();
  },
  Stargate: async () => {
    const stargateClient = await getStargateClient();
    try {
      await stargateClient.httpClient.post('/v2/schemas/namespaces', {
        name: process.env.ASTRA_DB_KEYSPACE
      });
    } catch (e) {
      console.error(e);
    }
    return stargateClient;
  }
};
