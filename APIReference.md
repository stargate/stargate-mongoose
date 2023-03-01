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
</dl>

## Members

<dl>
<dt><a href="#parseUri">parseUri</a> ⇒</dt>
<dd><p>Create a production Astra connection URI</p></dd>
<dt><a href="#createAstraUri">createAstraUri</a> ⇒</dt>
<dd><p>Create a stargate  connection URI</p></dd>
<dt><a href="#createStargateUri">createStargateUri</a></dt>
<dd></dd>
<dt><a href="#StargateAuthError">StargateAuthError</a> ⇒</dt>
<dd><p>executeOperation handles running functions that have a callback parameter and that also can
return a promise.</p></dd>
<dt><a href="#executeOperation">executeOperation</a> ⇒</dt>
<dd><p>Gets the raw value at the given path. Differs from <code>mpath.get()</code> because it doesn't
drill into arrays.</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#parseUri">parseUri(uri)</a> ⇒</dt>
<dd><p>Parse an Astra connection URI</p></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(uri, options)](#new_Client_new)
    * _instance_
        * [.connect()](#Client+connect) ⇒
        * [.db(dbName)](#Client+db) ⇒
        * [.setMaxListeners(maxListeners)](#Client+setMaxListeners) ⇒
        * [.close()](#Client+close) ⇒
    * _static_
        * [.connect(uri)](#Client.connect) ⇒

<a name="new_Client_new"></a>

### new Client(uri, options)
<p>Set up a MongoClient that works with the Stargate/Astra document API</p>


| Param | Type | Description |
| --- | --- | --- |
| uri | <code>databaseId</code> | <p>an Astra/Stargate connection uri. It should be formed like so if using Astra: https://$-${region}.apps.astra.datastax.com</p> |
| options |  | <p>provide the Astra applicationToken here along with the keyspace name (optional)</p> |

<a name="Client+connect"></a>

### client.connect() ⇒
<p>Connect the MongoClient instance to Astra</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>a MongoClient instance</p>  
<a name="Client+db"></a>

### client.db(dbName) ⇒
<p>Use a Astra keyspace</p>

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <p>Db</p>  

| Param | Description |
| --- | --- |
| dbName | <p>the Astra keyspace to connect to</p> |

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
<p>Setup a connection to the Astra/Stargate document API</p>

**Kind**: static method of [<code>Client</code>](#Client)  
**Returns**: <p>MongoClient</p>  

| Param | Type | Description |
| --- | --- | --- |
| uri | <code>databaseId</code> | <p>an Astra/Stargate connection uri. It should be formed like so if using Astra: https://$-${region}.apps.astra.datastax.com/${keyspace}?applicationToken=${applicationToken} You can also have it formed for you using utils.createAstraUri()</p> |

<a name="Collection"></a>

## Collection
**Kind**: global class  

* [Collection](#Collection)
    * [new Collection(httpClient, name)](#new_Collection_new)
    * [.insertOne(mongooseDoc, options)](#Collection+insertOne) ⇒
    * ~~[.count()](#Collection+count)~~
    * [.aggregate(pipeline, options)](#Collection+aggregate)
    * [.bulkWrite(ops, options)](#Collection+bulkWrite)
    * [.createIndex(index, options)](#Collection+createIndex) ⇒
    * [.dropIndexes(index, options)](#Collection+dropIndexes) ⇒

<a name="new_Collection_new"></a>

### new Collection(httpClient, name)

| Param |
| --- |
| httpClient | 
| name | 

<a name="Collection+insertOne"></a>

### collection.insertOne(mongooseDoc, options) ⇒
**Kind**: instance method of [<code>Collection</code>](#Collection)  
**Returns**: <p>Promise</p>  

| Param |
| --- |
| mongooseDoc | 
| options | 

<a name="Collection+count"></a>

### ~~collection.count()~~
***Deprecated***

**Kind**: instance method of [<code>Collection</code>](#Collection)  
<a name="Collection+aggregate"></a>

### collection.aggregate(pipeline, options)
**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| pipeline | 
| options | 

<a name="Collection+bulkWrite"></a>

### collection.bulkWrite(ops, options)
**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| ops | 
| options | 

<a name="Collection+createIndex"></a>

### collection.createIndex(index, options) ⇒
**Kind**: instance method of [<code>Collection</code>](#Collection)  
**Returns**: <p>any</p>  

| Param |
| --- |
| index | 
| options | 

<a name="Collection+dropIndexes"></a>

### collection.dropIndexes(index, options) ⇒
**Kind**: instance method of [<code>Collection</code>](#Collection)  
**Returns**: <p>any</p>  

| Param |
| --- |
| index | 
| options | 

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
**Returns**: <p>Promise</p>  
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
    * [new Db(astraClient, name)](#new_Db_new)
    * [.collection(collectionName)](#Db+collection) ⇒
    * [.createCollection(collectionName, options)](#Db+createCollection) ⇒
    * [.dropCollection(collectionName)](#Db+dropCollection) ⇒
    * [.dropDatabase()](#Db+dropDatabase) ⇒

<a name="new_Db_new"></a>

### new Db(astraClient, name)

| Param |
| --- |
| astraClient | 
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
**Returns**: <p>Promise</p>  

| Param |
| --- |
| collectionName | 

<a name="Db+dropDatabase"></a>

### db.dropDatabase() ⇒
**Kind**: instance method of [<code>Db</code>](#Db)  
**Returns**: <p>Promise</p>  
<a name="parseUri"></a>

## parseUri ⇒
<p>Create a production Astra connection URI</p>

**Kind**: global variable  
**Returns**: <p>string</p>  

| Param | Description |
| --- | --- |
| databaseId | <p>the database id of the Astra database</p> |
| region | <p>the region of the Astra database</p> |
| keyspace | <p>the keyspace to connect to</p> |
| applicationToken | <p>an Astra application token</p> |
| logLevel | <p>an winston log level</p> |

<a name="createAstraUri"></a>

## createAstraUri ⇒
<p>Create a stargate  connection URI</p>

**Kind**: global variable  
**Returns**: <p>string</p>  

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
<p>executeOperation handles running functions that have a callback parameter and that also can
return a promise.</p>

**Kind**: global variable  
**Returns**: <p>Promise</p>  

| Param | Description |
| --- | --- |
| operation | <p>a function that takes no parameters and returns a response</p> |

<a name="executeOperation"></a>

## executeOperation ⇒
<p>Gets the raw value at the given path. Differs from <code>mpath.get()</code> because it doesn't
drill into arrays.</p>

**Kind**: global variable  
**Returns**: <p>any</p>  

| Param | Description |
| --- | --- |
| doc | <p>object to get value from</p> |
| key | <p>path to get</p> |

<a name="parseUri"></a>

## parseUri(uri) ⇒
<p>Parse an Astra connection URI</p>

**Kind**: global function  
**Returns**: <p>ParsedUri</p>  

| Param | Type | Description |
| --- | --- | --- |
| uri | <code>databaseId</code> | <p>a uri in the format of: https://$-${region}.apps.astra.datastax.com/${keyspace}?applicationToken=${applicationToken}</p> |

