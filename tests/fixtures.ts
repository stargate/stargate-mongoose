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
import { Client, ClientOptions } from '@/src/collections/client';
import { randFirstName, randLastName } from '@ngneat/falso';

export const TEST_COLLECTION_NAME = 'collection1';

export const astraUri = process.env.JSON_API_URI || createAstraUri(
  process.env.ASTRA_DB_ID ?? '',
  process.env.ASTRA_DB_REGION ?? '',
  process.env.ASTRA_DB_KEYSPACE ?? '',
  process.env.ASTRA_DB_APPLICATION_TOKEN ?? ''
);

export const getAstraClient = async () => {
  if (!process.env.JSON_API_URI && (!process.env.ASTRA_DB_ID || !process.env.ASTRA_DB_APPLICATION_TOKEN)) {
    return null;
  }
  let options:ClientOptions = {authHeaderName: process.env.AUTH_HEADER_NAME};
  if(process.env.STARGATE_AUTH_URL && process.env.STARGATE_USERNAME && process.env.STARGATE_PASSWORD){
    options.authUrl = process.env.STARGATE_AUTH_URL;
    options.username = process.env.STARGATE_USERNAME;
    options.password = process.env.STARGATE_PASSWORD;
  }
  //options.logLevel = 'debug';
  return await Client.connect(astraUri, options);
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

export const createSampleDoc = () => ({
  _id: "doc1",
  username : "aaron"
});

export type Employee = {
  _id?: string;
  username?: string;
  human?: boolean;
  age?: number;
  password?: string | null;
  address?:{
    number?: number;
    street?: string | null;
    suburb?: string | null;
    city?: string | null;
    is_office?: boolean;
    country?: string | null;
  }
}

const sampleMultiLevelDoc:Employee = {
  username : "aaron",
  human : true,
  age: 47,
  password: null,
  address: {
    number: 86,
    street: "monkey street",
    suburb: null,
    city: "big banana",
    is_office: false
  }
} ;

export const createSampleDocWithMultiLevelWithId = (docId:string) => {  
  let sampleMultiLevelDocWithId = JSON.parse(JSON.stringify(sampleMultiLevelDoc)) as Employee; //parse and stringigy is to clone and modify only the new object
  sampleMultiLevelDocWithId._id = docId;
  return sampleMultiLevelDocWithId;
};

export const createSampleDocWithMultiLevel = () => (sampleMultiLevelDoc as Employee);

export const createSampleDoc2WithMultiLevel = () => ({
  username : "jimr",
  human : true,
  age: 52,
  password : "gasxaq==",
  address: {
    number: 45,
    street: "main street",
    suburb: null,
    city: "nyc",
    is_office: true,
    country: "usa"
  }
} as Employee);

export const createSampleDoc3WithMultiLevel = () => ({
  username : "saml",
  human : false,
  age: 25,
  password : "jhkasfka==",
  address: {
    number: 123,
    street: "church street",
    suburb: null,
    city: "la",
    is_office: true,
    country: "usa"
  }
} as Employee);

export const sampleUsersList = Array.of(createSampleDocWithMultiLevel(), createSampleDoc2WithMultiLevel(), createSampleDoc3WithMultiLevel()) as Employee[];

export const getSampleDocs = (numUsers: number) =>
  Array.from({ length: numUsers }, createSampleDoc);

export const sleep = async (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const testClients = {
  'Astra DB': async () => {
    return await getAstraClient();
  }
};
