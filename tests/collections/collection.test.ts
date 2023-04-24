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

import assert from 'assert';
import { Db } from '@/src/collections/db';
import { Collection } from '@/src/collections/collection';
import { Client } from '@/src/collections/client';
import { testClient, createSampleDoc, sampleUsersList, createSampleDocWithMultiLevel, createSampleDocWithMultiLevelWithId, getSampleDocs, sleep, TEST_COLLECTION_NAME } from '@/tests/fixtures';
import _ from 'lodash';


describe(`StargateMongoose - ${testClient} Connection - collections.collection`, async () => {
  let astraClient: Client;
  let db: Db;
  let collection: Collection;
  const sampleDoc = createSampleDoc();
  before(async function() {
    if(testClient == null) {
      return this.skip();
    }
    astraClient = await testClient?.client;
    if (astraClient == null) {
      return this.skip();
    }    

    db = astraClient.db();
    await db.dropCollection(TEST_COLLECTION_NAME);
  });

  beforeEach(async function() {
    await db.createCollection(TEST_COLLECTION_NAME);
    collection = db.collection(TEST_COLLECTION_NAME);
  });

  afterEach(async function() {
    await db.dropCollection(TEST_COLLECTION_NAME);
  });

  describe('Collection initialization', () => {
    it('should initialize a Collection', () => {
      const collection = new Collection(db.httpClient, 'new_collection');
      assert.ok(collection);
    });
    it('should not initialize a Collection without a name', () => {
      let error:any;
      try {
        const collection = new Collection(db.httpClient);
        assert.ok(collection);
      } catch (e) {
        error = e;
      }
      assert.ok(error);
    });
  });

  describe('Collection operations', () => {
    it('should insertOne document', async () => {
      const res = await collection.insertOne(createSampleDocWithMultiLevel());
      assert.ok(res);        
      assert.strictEqual(res.acknowledged, true);
      assert.ok(res.insertedId);        
    });
    it('should insertOne document with id', async () => {
      const docId = "docml1";
      const docToInsert = createSampleDocWithMultiLevelWithId(docId);
      const res = await collection.insertOne(docToInsert);
      assert.ok(res);        
      assert.strictEqual(res.acknowledged, true);
      assert.ok(res.insertedId, docId);        
    });
    it('Should fail insert of doc over size 1 MB', async () => {
      const jsonDocGt1MB = new Array(1024*1024).fill("a").join("");
      const docToInsert = { username : jsonDocGt1MB };
      collection.insertOne(docToInsert).catch((e) => {
        assert.strictEqual(e.errors[0].message, "Request invalid, the field postCommand.command.documents not valid: document size is over the max limit.");
      });
    });
    it('should insertMany documents', async () => {
      const res = await collection.insertMany(sampleUsersList);
      assert.strictEqual(res.insertedCount, sampleUsersList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 3);
    });
    it('should insertMany documents with ids', async () => {
      let sampleDocsWithIdList = JSON.parse(JSON.stringify(sampleUsersList));
      sampleDocsWithIdList[0]._id="docml1";
      sampleDocsWithIdList[1]._id="docml2";
      sampleDocsWithIdList[2]._id="docml3";
      const res = await collection.insertMany(sampleDocsWithIdList);
      assert.strictEqual(res.insertedCount, sampleDocsWithIdList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 3);
    });
    it('should not insert more than allowed number of documents in one insertMany call', async () => {
      let docList = Array.from({ length: 21 }, ()=>({"username": "id"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      let error:any;
      try{
        const res = await collection.insertMany(docList);
      } catch (e: any){
        error = e;          
      }
      assert.ok(error);
      assert.strictEqual(error.errors[0].message, "Request invalid, the field postCommand.command.documents not valid: amount of documents to insert is over the max limit.");
    });
    it('should error out when docs list is empty in insertMany', async () => {        
      let error:any;
      try{
        const res = await collection.insertMany([]);
      } catch (e: any){
        error = e;          
      }
      assert.strictEqual(error.errors[0].message, "Request invalid, the field postCommand.command.documents not valid: must not be empty.");
    });
    it.skip('should error out when one of the docs in insertMany is invalid', async () => {        
      let docList = Array.from({ length: 20 }, ()=>({"username": "id"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const jsonDocGt1MB = new Array(1024*1024).fill("a").join("");
      docList[2] = { username: jsonDocGt1MB };
      let error:any;
      try{
        const res = await collection.insertMany(docList);
        console.log('res : ', JSON.stringify(res));
        console.log('completed');
      } catch (e: any){
        error = e;          
      }
      assert.ok(error);
      console.log('error : ', JSON.stringify(error.errors[0].message));
      console.log('failed');
      //TODO: fix this test
      //assert.strictEqual(error.errors[0].message, "Request invalid, the field postCommand.command.documents not valid: must not be empty.");
    });
    it('should findOne document', async () => {
      const insertDocResp = await collection.insertOne(createSampleDocWithMultiLevel());
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"_id": idToCheck});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne eq document', async () => {
      const insertDocResp = await collection.insertOne(createSampleDocWithMultiLevel());
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"_id": {"$eq":idToCheck}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 String EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"username": doc.username});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 String EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"username": {"$eq":doc.username}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Number EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"age": doc.age});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Number EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"age": {"$eq":doc.age}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Boolean EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"human": doc.human});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Boolean EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"human": {"$eq":doc.human}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Null EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"password": doc.password});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne L1 Null EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"password": {"$eq":doc.password}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level String EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.street": doc.address?.street});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level String EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.street": {"$eq" : doc.address?.street}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Number EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.number": doc.address?.number});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Number EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.number": {"$eq" : doc.address?.number}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Boolean EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.is_office": doc.address?.is_office});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Boolean EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.is_office": {"$eq" : doc.address?.is_office}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Null EQ document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.suburb": doc.address?.suburb});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne any level Null EQ $eq document', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.suburb": {"$eq" : doc.address?.suburb}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne multiple top level conditions', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"age": doc.age, "human": doc.human, "password": doc.password});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne multiple level>=2 conditions', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"address.number": doc.address?.number, "address.street": doc.address?.street, "address.is_office": doc.address?.is_office});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it('should findOne multiple mixed levels conditions', async () => {
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"age": doc.age, "address.street": doc.address?.street, "address.is_office": doc.address?.is_office});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
    });
    it.skip('should findOne doc - return only selected fields', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      //read that back with project
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"_id": idToCheck}, {projection: {username:1, "address.city" : true}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
      assert.strictEqual(resDoc.username, doc.username);
      assert.strictEqual(resDoc.address.city, doc.address?.city);
      assert.strictEqual(resDoc.address.number, undefined);        
    });
    it.skip('should findOne doc - return only selected fields (with exclusion)', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      //read that back with project
      const idToCheck = insertDocResp.insertedId;
      const resDoc = await collection.findOne({"_id": idToCheck}, {projection: {username:1, "address.city" : true, _id: 0}});
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, undefined);
      assert.strictEqual(resDoc.username, doc.username);
      assert.strictEqual(resDoc.address.city, doc.address?.city);
      assert.strictEqual(resDoc.address.number, undefined);        
    });
    it.skip('should find doc - return only selected fields', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      //read that back with projection
      const idToCheck = insertDocResp.insertedId;
      const findCursor = await collection.find({"_id": idToCheck}, {projection: {username:1, "address.city" : true}});
      const resDoc = await findCursor.next();
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, idToCheck);
      assert.strictEqual(resDoc.username, doc.username);
      assert.strictEqual(resDoc.address.city, doc.address?.city);
      assert.strictEqual(resDoc.address.number, undefined);        
    });
    it.skip('should find doc - return only selected fields (with exclusion)', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      //read that back with projection
      const idToCheck = insertDocResp.insertedId;
      const findCursor = await collection.find({"_id": idToCheck}, {projection: {username:1, "address.city" : true, _id: 0}});
      const resDoc = await findCursor.next();
      assert.ok(resDoc);
      assert.strictEqual(resDoc._id, undefined);
      assert.strictEqual(resDoc.username, doc.username);
      assert.strictEqual(resDoc.address.city, doc.address?.city);
      assert.strictEqual(resDoc.address.number, undefined); 
    });
    it('should updateOne document by id', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      //update doc
      const updateOneResp = await collection.updateOne({"_id": idToCheck}, 
                            {
                              "$set": { "username" : "aaronm" },
                              "$unset" : { "address.city" : ""}                                
                            });
      assert.strictEqual(updateOneResp.modifiedCount, 1);
      assert.strictEqual(updateOneResp.matchedCount, 1);
      assert.strictEqual(updateOneResp.acknowledged, true);
      assert.strictEqual(updateOneResp.upsertedId, undefined);
      assert.strictEqual(updateOneResp.upsertedCount, undefined);
      const updatedDoc = await collection.findOne({"username":"aaronm"});
      assert.strictEqual(updatedDoc._id, idToCheck);
      assert.strictEqual(updatedDoc.username, "aaronm");
      assert.strictEqual(updatedDoc.address.city, undefined);
    });    
    it('should updateOne document by col', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      //update doc
      const updateOneResp = await collection.updateOne({"address.city": "big banana"}, 
                            {
                              "$set": { "address.state" : "new state" }                        
                            });
      assert.strictEqual(updateOneResp.modifiedCount, 1);
      assert.strictEqual(updateOneResp.matchedCount, 1);
      assert.strictEqual(updateOneResp.acknowledged, true);
      assert.strictEqual(updateOneResp.upsertedId, undefined);
      assert.strictEqual(updateOneResp.upsertedCount, undefined);
      const updatedDoc = await collection.findOne({"username":"aaron"});
      assert.strictEqual(updatedDoc._id, idToCheck);
      assert.strictEqual(updatedDoc.username, "aaron");
      assert.strictEqual(updatedDoc.address.city, "big banana");
      assert.strictEqual(updatedDoc.address.state, "new state");
    });
    //TODO skip until https://github.com/stargate/jsonapi/issues/275 is fixed
    it.skip('should upsert a doc with upsert flag true in updateOne call', async () => {
      //insert a new doc
      const doc = createSampleDocWithMultiLevel();
      const insertDocResp = await collection.insertOne(doc);
      const idToCheck = insertDocResp.insertedId;
      //update doc
      const updateOneResp = await collection.updateOne({"address.city": "nyc"}, 
                            {
                              "$set": { "address.state" : "ny" }                        
                            },
                            { 
                              "upsert" : true  
                            });
      assert.strictEqual(updateOneResp.modifiedCount, 0);
      assert.strictEqual(updateOneResp.matchedCount, 0);
      assert.strictEqual(updateOneResp.acknowledged, true);
      assert.ok(updateOneResp.upsertedId);
      assert.strictEqual(updateOneResp.upsertedCount, 1);
      const updatedDoc = await collection.findOne({"address.city":"nyc"});
      assert.ok(updatedDoc._id);
      assert.notStrictEqual(updatedDoc._id, idToCheck);
      assert.strictEqual(updatedDoc.address.city, "nyc");
      assert.strictEqual(updatedDoc.address.state, "ny");
    });  
    it('should updateMany documents with ids', async () => {
      let sampleDocsWithIdList = JSON.parse(JSON.stringify(sampleUsersList));
      sampleDocsWithIdList[0]._id="docml1";
      sampleDocsWithIdList[1]._id="docml2";
      sampleDocsWithIdList[2]._id="docml3";
      const res = await collection.insertMany(sampleDocsWithIdList);
      assert.strictEqual(res.insertedCount, sampleDocsWithIdList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 3);
      const idToUpdateAndCheck = sampleDocsWithIdList[0]._id;
      const updateManyResp = await collection.updateMany({"_id": idToUpdateAndCheck},
                                                {
                                                  "$set" : { "username" : "aaronm" },
                                                  "$unset" : { "address.city" : ""}
                                                });
      assert.strictEqual(updateManyResp.matchedCount, 1);
      assert.strictEqual(updateManyResp.modifiedCount, 1);
      assert.strictEqual(updateManyResp.acknowledged, true);
      assert.strictEqual(updateManyResp.upsertedCount, undefined);
      assert.strictEqual(updateManyResp.upsertedId, undefined);
      const updatedDoc = await collection.findOne({"username":"aaronm"});
      assert.strictEqual(updatedDoc._id, idToUpdateAndCheck);
      assert.strictEqual(updatedDoc.username, "aaronm");
      assert.strictEqual(updatedDoc.address.city, undefined);                                                  
    });
    it('should update when updateMany is invoked with updates for records <= 20', async () => {
      let docList = Array.from({ length: 20 }, ()=>({username: "id", city : "nyc"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);    
      assert.strictEqual(res.insertedCount, docList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 20);
      
      //const idToUpdateAndCheck = sampleDocsWithIdList[0]._id;
      const updateManyResp = await collection.updateMany({"city": "nyc"},
                            {
                              "$set" : { "state" : "ny" }
                            });        
      assert.strictEqual(updateManyResp.matchedCount, 20);
      assert.strictEqual(updateManyResp.modifiedCount, 20);
      assert.strictEqual(updateManyResp.acknowledged, true);
      assert.strictEqual(updateManyResp.upsertedCount, undefined);
      assert.strictEqual(updateManyResp.upsertedId, undefined);
    });
    it('should upsert with upsert flag set to false/not set when not found', async () => {
      let docList = Array.from({ length: 20 }, ()=>({username: "id", city : "nyc"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);    
      assert.strictEqual(res.insertedCount, docList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 20);
      
      //const idToUpdateAndCheck = sampleDocsWithIdList[0]._id;
      const updateManyResp = await collection.updateMany({"city": "la"},
                            {
                              "$set" : { "state" : "ca" }
                            });     
      assert.strictEqual(updateManyResp.matchedCount, 0);
      assert.strictEqual(updateManyResp.modifiedCount, 0);
      assert.strictEqual(updateManyResp.acknowledged, true);
      assert.strictEqual(updateManyResp.upsertedCount, undefined);
      assert.strictEqual(updateManyResp.upsertedId, undefined);
    });
    //TODO skipped until https://github.com/stargate/jsonapi/issues/273 is fixed
    it.skip('should upsert with upsert flag set to true when not found', async () => {
      let docList = Array.from({ length: 2 }, ()=>({username: "id", city : "nyc"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);    
      assert.strictEqual(res.insertedCount, docList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, 2);
      
      //const idToUpdateAndCheck = sampleDocsWithIdList[0]._id;
      const updateManyResp = await collection.updateMany({"city": "la"},
                            {
                              "$set" : { "state" : "ca" }
                            },
                            {
                              "upsert": true
                            });     
      assert.strictEqual(updateManyResp.matchedCount, 0);
      assert.strictEqual(updateManyResp.modifiedCount, 0);
      assert.strictEqual(updateManyResp.acknowledged, true);
      assert.strictEqual(updateManyResp.upsertedCount, 1);
      assert.ok(updateManyResp.upsertedId);
    });
    it('should fail when moreData returned by updateMany as true', async () => {
      let docList = Array.from({ length: 20 }, ()=>({username: "id", city : "nyc"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);    
      assert.strictEqual(res.insertedCount, docList.length);
      assert.strictEqual(res.acknowledged, true);
      assert.strictEqual(_.keys(res.insertedIds).length, docList.length);
      //insert next 20
      let docListNextSet = Array.from({ length: 20 }, ()=>({username: "id", city : "nyc"}));
      docListNextSet.forEach((doc, index) => {
        doc.username = doc.username+(index+21);
      });
      const resNextSet = await collection.insertMany(docListNextSet);    
      assert.strictEqual(resNextSet.insertedCount, docListNextSet.length);
      assert.strictEqual(resNextSet.acknowledged, true);
      assert.strictEqual(_.keys(resNextSet.insertedIds).length, docListNextSet.length);

      
      //const idToUpdateAndCheck = sampleDocsWithIdList[0]._id;
      const filter = {"city": "nyc"};
      const update = {
        "$set" : { "state" : "ny" }
      };
      let error;
      try{
        const updateManyResp = await collection.updateMany(filter, update);
      }
      catch(e: any){
        error = e;          
      }        
      assert.ok(error);
      assert.strictEqual(error.message, "Command \"updateMany\" failed with the following error: More than 20 records found for update by the server");
      assert.ok(_.isEqual(error.command.updateMany.filter, filter));
      assert.ok(_.isEqual(error.command.updateMany.update, update));
    });
    it('should findOneAndUpdate', async () => {
      const res = await collection.insertOne(createSampleDocWithMultiLevel());
      const docId = res.insertedId;
      const findOneAndUpdateResp = await collection.findOneAndUpdate({"_id":docId}, 
        {
          "$set": {
            "username": "aaronm"
          },
          "$unset": {
            "address.city": ""
          }            
        },
        {
          "returnDocument": "after"
        }          
      );        
      assert.equal(findOneAndUpdateResp.ok, 1);
      assert.equal(findOneAndUpdateResp.value._id, docId);
      assert.equal(findOneAndUpdateResp.value.username, "aaronm");
      assert.equal(findOneAndUpdateResp.value.address.city, undefined);
    });      
    it('should deleteOne document', async () => {
      const res = await collection.insertOne(createSampleDocWithMultiLevel());
      const docId = res.insertedId;
      const deleteOneResp = await collection.deleteOne({ _id: docId });
      assert.strictEqual(deleteOneResp.deletedCount, 1);
      assert.strictEqual(deleteOneResp.acknowledged, true);
    });
    it('should not delete any when no match in deleteOne', async () => {
      const res = await collection.insertOne(createSampleDocWithMultiLevel());
      const docId = res.insertedId;
      const deleteOneResp = await collection.deleteOne({ "username": "samlxyz" });
      assert.strictEqual(deleteOneResp.deletedCount, 0);
      assert.strictEqual(deleteOneResp.acknowledged, true);
    });
    it('should deleteMany when match is <= 20', async () => {
      let docList = Array.from({ length: 20 }, ()=>({"username": "id", "city" : "trichy"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);
      assert.strictEqual(res.insertedCount, 20);
      const deleteManyResp = await collection.deleteMany({ "city": "trichy" });
      assert.strictEqual(deleteManyResp.deletedCount, 20);
      assert.strictEqual(deleteManyResp.acknowledged, true);
    });
    it('should throw an error when deleteMany finds more than 20 records', async () => {
      let docList = Array.from({ length: 20 }, ()=>({"username": "id", "city" : "trichy"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);
      assert.strictEqual(res.insertedCount, 20);
      //insert next 20
      let docListNextSet = Array.from({ length: 20 }, ()=>({username: "id", city : "trichy"}));
      docListNextSet.forEach((doc, index) => {
        doc.username = doc.username+(index+21);
      });
      const resNextSet = await collection.insertMany(docListNextSet);    
      assert.strictEqual(resNextSet.insertedCount, docListNextSet.length);
      assert.strictEqual(resNextSet.acknowledged, true);
      assert.strictEqual(_.keys(resNextSet.insertedIds).length, docListNextSet.length);
      //test for deleteMany errors
      let exception: any;
      const filter = { "city": "trichy" };
      try{
        const deleteManyResp = await collection.deleteMany(filter);
      } catch(e: any){
        exception = e;          
      }
      assert.ok(exception);
      assert.strictEqual(exception.message, 'Command "deleteMany" failed with the following error: More records found to be deleted even after deleting 20 records');
      assert.ok(_.isEqual(exception.command.deleteMany.filter, filter));
    });
    it('should return count of documents with non id filter', async () => {  
      let docList = Array.from({ length: 20 }, ()=>({"username": "id", "city" : "trichy"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);
      assert.strictEqual(res.insertedCount, 20);
      const count = await collection.countDocuments({ "city": "trichy" });
      assert.strictEqual(count, 20);    
    });
    it('should return count of documents with no filter', async () => {
      let docList = Array.from({ length: 20 }, ()=>({"username": "id", "city" : "trichy"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);
      assert.strictEqual(res.insertedCount, 20);
      const count = await collection.countDocuments({});
      assert.strictEqual(count, 20);    
    });
    it('should return count of documents for more than default page size limit', async () => {
      let docList = Array.from({ length: 20 }, ()=>({"username": "id", "city" : "trichy"}));
      docList.forEach((doc, index) => {
        doc.username = doc.username+(index+1);
      });
      const res = await collection.insertMany(docList);
      assert.strictEqual(res.insertedCount, 20);
      //insert next 20
      let docListNextSet = Array.from({ length: 20 }, ()=>({username: "id", city : "nyc"}));
      docListNextSet.forEach((doc, index) => {
        doc.username = doc.username+(index+21);
      });      
      const resNextSet = await collection.insertMany(docListNextSet);    
      assert.strictEqual(resNextSet.insertedCount, docListNextSet.length);
      assert.strictEqual(resNextSet.acknowledged, true);
      assert.strictEqual(_.keys(resNextSet.insertedIds).length, docListNextSet.length);
      //verify counts
      assert.strictEqual(await collection.countDocuments({ city: "nyc"}), 20);    
      assert.strictEqual(await collection.countDocuments({ city: "trichy"}), 20);    
      assert.strictEqual(await collection.countDocuments({ city: "chennai"}), 0);    
      assert.strictEqual(await collection.countDocuments({}), 40);    
    });
    it('should return 0 when no documents are in the collection', async () => {
      const count = await collection.countDocuments({});
      assert.strictEqual(count, 0);    
    });
  });
});
