## API Reference
## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
<dt><a href="#Collection">Collection</a></dt>
<dd></dd>
<dt><a href="#FindCursor">FindCursor</a></dt>
<dd></dd>
<dt><a href="#Db">Db</a></dt>
<dd></dd>
<dt><a href="#_FindOptionsInternal">_FindOptionsInternal</a></dt>
<dd><p>findOptions</p></dd>
<dt><a href="#_FindOneAndReplaceOptions">_FindOneAndReplaceOptions</a></dt>
<dd><p>findOneAndReplaceOptions</p></dd>
</dl>

## Members

<dl>
<dt><a href="#findInternalOptionsKeys">findInternalOptionsKeys</a></dt>
<dd><p>findOneAndDeleteOptions</p></dd>
<dt><a href="#findOneAndReplaceInternalOptionsKeys">findOneAndReplaceInternalOptionsKeys</a></dt>
<dd><p>findOneAndUpdateOptions</p></dd>
<dt><a href="#findOneAndUpdateInternalOptionsKeys">findOneAndUpdateInternalOptionsKeys</a></dt>
<dd><p>insertManyOptions</p></dd>
<dt><a href="#insertManyInternalOptionsKeys">insertManyInternalOptionsKeys</a></dt>
<dd><p>updateManyOptions</p></dd>
<dt><a href="#updateManyInternalOptionsKeys">updateManyInternalOptionsKeys</a></dt>
<dd><p>updateOneOptions</p></dd>
<dt><a href="#updateOneInternalOptionsKeys">updateOneInternalOptionsKeys</a></dt>
<dd><p>CreateCollectionOptions</p></dd>
<dt><a href="#createAstraUri">createAstraUri</a> ⇒</dt>
<dd><p>Create a stargate  connection URI</p></dd>
<dt><a href="#createStargateUri">createStargateUri</a></dt>
<dd></dd>
<dt><a href="#StargateAuthError">StargateAuthError</a> ⇒</dt>
<dd><p>executeOperation handles running functions
return a promise.</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#parseUri">parseUri(uri)</a> ⇒</dt>
<dd><p>Parse a connection URI</p></dd>
<dt><a href="#createAstraUri">createAstraUri(databaseId, region, keyspace, applicationToken, logLevel, authHeaderName)</a> ⇒</dt>
<dd><p>Create a production Astra connection URI</p></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(baseUrl, keyspaceName, options)](#new_Client_new)
    * _instance_
        * [.connect()](#Client+connect) ⇒
        * [.db(dbName)](#Client+db) ⇒
        * [.setMaxListeners(maxListeners)](#Client+setMaxListeners) ⇒
        * [.close()](#Client+close) ⇒
    * _static_
        * [.connect(uri)](#Client.connect) ⇒

<a name="new_Client_new"></a>

### new Client(baseUrl, keyspaceName, options)
<p>Set up a MongoClient that works with the Stargate JSON API</p>


| Param | Description |
| --- | --- |
| baseUrl | <p>A JSON API Connection URI (Eg. http://localhost:8181/v1)</p> |
| keyspaceName | <p>Name of the Namespace (or Keyspace in Apache Cassandra terminology)</p> |
| options | <p>ClientOptions</p> |

<a name="Client+connect"></a>

### client.connect() ⇒
<p>Connect the MongoClient instance to JSON API (create Namespace automatically when the 'createNamespaceOnConnect' flag is set to true)</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>a MongoClient instance</p>  
<a name="Client+db"></a>

### client.db(dbName) ⇒
<p>Use a JSON API keyspace</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>Db</p>  

| Param | Description |
| --- | --- |
| dbName | <p>the JSON API keyspace to connect to</p> |

<a name="Client+setMaxListeners"></a>

### client.setMaxListeners(maxListeners) ⇒
**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>number</p>  

| Param |
| --- |
| maxListeners | 

<a name="Client+close"></a>

### client.close() ⇒
**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>Client</p>  
<a name="Client.connect"></a>

### Client.connect(uri) ⇒
<p>Setup a connection to the Astra/Stargate JSON API</p>

**Kind**: static method of [<code>Client</code>](#Client)  
**Returns**: <p>MongoClient</p>  

| Param | Description |
| --- | --- |
| uri | <p>an Stargate JSON API uri (Eg. http://localhost:8181/v1/testks1) where testks1 is the name of the keyspace/Namespace which should always be the last part of the URL</p> |

<a name="Collection"></a>

## Collection
**Kind**: global class  

* [Collection](#Collection)
    * [new Collection(httpClient, name)](#new_Collection_new)
    * ~~[.count()](#Collection+count)~~
    * ~~[.count()](#Collection+count)~~

<a name="new_Collection_new"></a>

### new Collection(httpClient, name)

| Param |
| --- |
| httpClient | 
| name | 

<a name="Collection+count"></a>

### ~~collection.count()~~
***Deprecated***

**Kind**: instance method of [<code>Collection</code>](#Collection)  
<a name="Collection+count"></a>

### ~~collection.count()~~
***Deprecated***

**Kind**: instance method of [<code>Collection</code>](#Collection)  
<a name="FindCursor"></a>

## FindCursor
**Kind**: global class  

* [FindCursor](#FindCursor)
    * [new FindCursor(collection, filter, options)](#new_FindCursor_new)
    * [.getAll()](#FindCursor+getAll) ⇒
    * [.toArray()](#FindCursor+toArray) ⇒
    * [.next()](#FindCursor+next) ⇒
    * [.forEach(iterator)](#FindCursor+forEach)
    * [.count(options)](#FindCursor+count) ⇒
    * [.stream(options)](#FindCursor+stream)

<a name="new_FindCursor_new"></a>

### new FindCursor(collection, filter, options)

| Param |
| --- |
| collection | 
| filter | 
| options | 

<a name="FindCursor+getAll"></a>

### findCursor.getAll() ⇒
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  
**Returns**: <p>void</p>  
<a name="FindCursor+toArray"></a>

### findCursor.toArray() ⇒
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  
**Returns**: <p>Record&lt;string, any&gt;[]</p>  
<a name="FindCursor+next"></a>

### findCursor.next() ⇒
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  
**Returns**: <p>Promise</p>  
<a name="FindCursor+forEach"></a>

### findCursor.forEach(iterator)
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  

| Param |
| --- |
| iterator | 

<a name="FindCursor+count"></a>

### findCursor.count(options) ⇒
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  
**Returns**: <p>Promise<number></p>  

| Param |
| --- |
| options | 

<a name="FindCursor+stream"></a>

### findCursor.stream(options)
**Kind**: instance method of [<code>FindCursor</code>](#FindCursor)  

| Param |
| --- |
| options | 

<a name="Db"></a>

## Db
**Kind**: global class  

* [Db](#Db)
    * [new Db(httpClient, name)](#new_Db_new)
    * [.collection(collectionName)](#Db+collection) ⇒
    * [.createCollection(collectionName, options)](#Db+createCollection) ⇒
    * [.dropCollection(collectionName)](#Db+dropCollection) ⇒
    * [.dropDatabase()](#Db+dropDatabase) ⇒
    * [.createDatabase()](#Db+createDatabase) ⇒

<a name="new_Db_new"></a>

### new Db(httpClient, name)

| Param |
| --- |
| httpClient | 
| name | 

<a name="Db+collection"></a>

### db.collection(collectionName) ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>Collection</p>  

| Param |
| --- |
| collectionName | 

<a name="Db+createCollection"></a>

### db.createCollection(collectionName, options) ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>Promise</p>  

| Param |
| --- |
| collectionName | 
| options | 

<a name="Db+dropCollection"></a>

### db.dropCollection(collectionName) ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>APIResponse</p>  

| Param |
| --- |
| collectionName | 

<a name="Db+dropDatabase"></a>

### db.dropDatabase() ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>Promise</p>  
<a name="Db+createDatabase"></a>

### db.createDatabase() ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>Promise</p>  
<a name="_FindOptionsInternal"></a>

## \_FindOptionsInternal
<p>findOptions</p>

**Kind**: global class  
<a name="_FindOneAndReplaceOptions"></a>

## \_FindOneAndReplaceOptions
<p>findOneAndReplaceOptions</p>

**Kind**: global class  
<a name="findInternalOptionsKeys"></a>

## findInternalOptionsKeys
<p>findOneAndDeleteOptions</p>

**Kind**: global variable  
<a name="findOneAndReplaceInternalOptionsKeys"></a>

## findOneAndReplaceInternalOptionsKeys
<p>findOneAndUpdateOptions</p>

**Kind**: global variable  
<a name="findOneAndUpdateInternalOptionsKeys"></a>

## findOneAndUpdateInternalOptionsKeys
<p>insertManyOptions</p>

**Kind**: global variable  
<a name="insertManyInternalOptionsKeys"></a>

## insertManyInternalOptionsKeys
<p>updateManyOptions</p>

**Kind**: global variable  
<a name="updateManyInternalOptionsKeys"></a>

## updateManyInternalOptionsKeys
<p>updateOneOptions</p>

**Kind**: global variable  
<a name="updateOneInternalOptionsKeys"></a>

## updateOneInternalOptionsKeys
<p>CreateCollectionOptions</p>

**Kind**: global variable  
<a name="createAstraUri"></a>

## createAstraUri ⇒
<p>Create a stargate  connection URI</p>

**Kind**: global variable  
**Returns**: <p>URL as string</p>  

| Param |
| --- |
| baseUrl | 
| baseAuthUrl | 
| keyspace | 
| username | 
| password | 
| logLevel | 

<a name="createStargateUri"></a>

## createStargateUri
**Kind**: global variable  

| Param |
| --- |
| authUrl | 
| username | 
| password | 

<a name="StargateAuthError"></a>

## StargateAuthError ⇒
<p>executeOperation handles running functions
return a promise.</p>

**Kind**: global variable  
**Returns**: <p>Promise</p>  

| Param | Description |
| --- | --- |
| operation | <p>a function that takes no parameters and returns a response</p> |

<a name="parseUri"></a>

## parseUri(uri) ⇒
<p>Parse a connection URI</p>

**Kind**: global function  
**Returns**: <p>ParsedUri</p>  

| Param | Type | Description |
| --- | --- | --- |
| uri | <code>baseUrl</code> | <p>a uri in the format of: https://$/${baseAPIPath}/${keyspace}?applicationToken=${applicationToken}</p> |

<a name="createAstraUri"></a>

## createAstraUri(databaseId, region, keyspace, applicationToken, logLevel, authHeaderName) ⇒
<p>Create a production Astra connection URI</p>

**Kind**: global function  
**Returns**: <p>URL as string</p>  

| Param | Description |
| --- | --- |
| databaseId | <p>the database id of the Astra database</p> |
| region | <p>the region of the Astra database</p> |
| keyspace | <p>the keyspace to connect to</p> |
| applicationToken | <p>an Astra application token</p> |
| logLevel | <p>an winston log level</p> |
| authHeaderName |  |

