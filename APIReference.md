## API Reference
## Classes

<dl>
<dt><a href="#Collection">Collection</a></dt>
<dd><p>Collection operations supported by the driver. This class is called &quot;Collection&quot; for consistency with Mongoose, because
in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
an Astra perspective, this class can be a wrapper around a Collection <strong>or</strong> a Table depending on the corresponding db's
<code>isTable</code> option. Needs to be a separate class because Mongoose only supports one collection class.</p></dd>
<dt><a href="#Connection">Connection</a></dt>
<dd><p>Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
connection to Data API.</p></dd>
<dt><a href="#BaseDb">BaseDb</a></dt>
<dd><p>Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
for tables and CollectionsDb class for collections.</p></dd>
<dt><a href="#CollectionsDb">CollectionsDb</a></dt>
<dd></dd>
<dt><a href="#TablesDb">TablesDb</a></dt>
<dd></dd>
<dt><a href="#Vectorize">Vectorize</a></dt>
<dd><p>Vectorize is a custom Mongoose SchemaType that allows you set a vector value to a string
for tables mode vectorize API. A Vectorize path is an array of numbers that can also be set to a string.</p></dd>
<dt><a href="#AstraMongooseError">AstraMongooseError</a></dt>
<dd><p>Base class for astra-mongoose-specific errors.</p></dd>
</dl>

## Members

<dl>
<dt><a href="#BaseDb">BaseDb</a> ⇐ <code><a href="#BaseDb">BaseDb</a></code></dt>
<dd><p>Db instance that creates and manages collections.</p></dd>
<dt><a href="#CollectionsDb">CollectionsDb</a> ⇐ <code><a href="#BaseDb">BaseDb</a></code></dt>
<dd><p>Db instance that creates and manages tables.</p></dd>
</dl>

## Functions

<dl>
<dt><a href="#handleVectorFieldsProjection">handleVectorFieldsProjection()</a></dt>
<dd><p>Mongoose plugin to handle adding <code>$vector</code> to the projection by default if <code>$vector</code> has <code>select: true</code>.
Because <code>$vector</code> is deselected by default, this plugin makes it possible for the user to include <code>$vector</code>
by default from their schema.</p>
<p>You do not need to call this function directly. Mongoose applies this plugin automatically when you call <code>setDriver()</code>.</p></dd>
<dt><a href="#addVectorDimensionValidator">addVectorDimensionValidator()</a></dt>
<dd><p>Mongoose plugin to validate arrays of numbers that have a <code>dimension</code> property. Ensure that the array
is either nullish or has a length equal to the dimension.</p>
<p>You do not need to call this function directly. Mongoose applies this plugin automatically when you call <code>setDriver()</code>.</p></dd>
<dt><a href="#convertSchemaToUDTColumns">convertSchemaToUDTColumns()</a></dt>
<dd><p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p></dd>
<dt><a href="#udtDefinitionsFromSchema">udtDefinitionsFromSchema()</a></dt>
<dd><p>Given a Mongoose schema, get the definitions of all the UDTs used by this schema.
Used to create all UDTs required by the schema before creating the table.</p></dd>
<dt><a href="#convertSchemaToColumns">convertSchemaToColumns()</a></dt>
<dd><p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p></dd>
<dt><a href="#createAstraUri">createAstraUri()</a></dt>
<dd><p>Create an Astra connection URI while connecting to Astra Data API.</p></dd>
<dt><a href="#tableDefinitionFromSchema">tableDefinitionFromSchema()</a></dt>
<dd><p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p></dd>
</dl>

<a name="Collection"></a>

## Collection
<p>Collection operations supported by the driver. This class is called &quot;Collection&quot; for consistency with Mongoose, because
in Mongoose a Collection is the interface that Models and Queries use to communicate with the database. However, from
an Astra perspective, this class can be a wrapper around a Collection <strong>or</strong> a Table depending on the corresponding db's
<code>isTable</code> option. Needs to be a separate class because Mongoose only supports one collection class.</p>

**Kind**: global class  

* [Collection](#Collection)
    * [.countDocuments(filter)](#Collection+countDocuments)
    * [.find(filter, options, callback)](#Collection+find)
    * [.findOne(filter, options)](#Collection+findOne)
    * [.insertOne(doc)](#Collection+insertOne)
    * [.insertMany(documents, options)](#Collection+insertMany)
    * [.findOneAndUpdate(filter, update, options)](#Collection+findOneAndUpdate)
    * [.findOneAndDelete(filter, options)](#Collection+findOneAndDelete)
    * [.findOneAndReplace(filter, newDoc, options)](#Collection+findOneAndReplace)
    * [.deleteMany(filter)](#Collection+deleteMany)
    * [.deleteOne(filter, options, callback)](#Collection+deleteOne)
    * [.replaceOne(filter, replacement, options)](#Collection+replaceOne)
    * [.updateOne(filter, update, options)](#Collection+updateOne)
    * [.updateMany(filter, update, options)](#Collection+updateMany)
    * [.estimatedDocumentCount()](#Collection+estimatedDocumentCount)
    * [.syncTable(definition, options)](#Collection+syncTable) ⇒
    * [.alterTable(operation)](#Collection+alterTable)
    * [.runCommand(command)](#Collection+runCommand)
    * [.bulkWrite(ops, options)](#Collection+bulkWrite)
    * [.aggregate(pipeline, options)](#Collection+aggregate)
    * [.listIndexes()](#Collection+listIndexes)
    * [.createIndex(indexSpec, options)](#Collection+createIndex)
    * [.dropIndex(name)](#Collection+dropIndex)
    * [.findAndRerank(filter, options)](#Collection+findAndRerank)

<a name="Collection+countDocuments"></a>

### collection.countDocuments(filter)
<p>Count documents in the collection that match the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 

<a name="Collection+find"></a>

### collection.find(filter, options, callback)
<p>Find documents in the collection that match the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| options | 
| callback | 

<a name="Collection+findOne"></a>

### collection.findOne(filter, options)
<p>Find a single document in the collection that matches the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| options | 

<a name="Collection+insertOne"></a>

### collection.insertOne(doc)
<p>Insert a single document into the collection.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| doc | 

<a name="Collection+insertMany"></a>

### collection.insertMany(documents, options)
<p>Insert multiple documents into the collection.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| documents | 
| options | 

<a name="Collection+findOneAndUpdate"></a>

### collection.findOneAndUpdate(filter, update, options)
<p>Update a single document in a collection.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| update | 
| options | 

<a name="Collection+findOneAndDelete"></a>

### collection.findOneAndDelete(filter, options)
<p>Find a single document in the collection and delete it.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| options | 

<a name="Collection+findOneAndReplace"></a>

### collection.findOneAndReplace(filter, newDoc, options)
<p>Find a single document in the collection and replace it.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| newDoc | 
| options | 

<a name="Collection+deleteMany"></a>

### collection.deleteMany(filter)
<p>Delete one or more documents in a collection that match the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 

<a name="Collection+deleteOne"></a>

### collection.deleteOne(filter, options, callback)
<p>Delete a single document in a collection that matches the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| options | 
| callback | 

<a name="Collection+replaceOne"></a>

### collection.replaceOne(filter, replacement, options)
<p>Update a single document in a collection that matches the given filter, replacing it with <code>replacement</code>.
Converted to a <code>findOneAndReplace()</code> under the hood.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| replacement | 
| options | 

<a name="Collection+updateOne"></a>

### collection.updateOne(filter, update, options)
<p>Update a single document in a collection that matches the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| update | 
| options | 

<a name="Collection+updateMany"></a>

### collection.updateMany(filter, update, options)
<p>Update multiple documents in a collection that match the given filter.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| update | 
| options | 

<a name="Collection+estimatedDocumentCount"></a>

### collection.estimatedDocumentCount()
<p>Get the estimated number of documents in a collection based on collection metadata</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  
<a name="Collection+syncTable"></a>

### collection.syncTable(definition, options) ⇒
<p>Sync the underlying table schema with the specified definition: creates a new
table if one doesn't exist, or alters the existing table to match the definition
by adding or dropping columns as necessary.</p>
<p>Note that modifying an existing column is NOT supported and will throw an error.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  
**Returns**: <p>void</p>  

| Param | Description |
| --- | --- |
| definition | <p>new table definition (strict only)</p> |
| options | <p>passed to createTable if the table doesn't exist</p> |

<a name="Collection+alterTable"></a>

### collection.alterTable(operation)
<p>Alter the underlying table with the specified name and operation - can add or drop columns</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param | Description |
| --- | --- |
| operation | <p>add/drop</p> |

<a name="Collection+runCommand"></a>

### collection.runCommand(command)
<p>Run an arbitrary command against this collection</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| command | 

<a name="Collection+bulkWrite"></a>

### collection.bulkWrite(ops, options)
<p>Bulk write not supported.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| ops | 
| options | 

<a name="Collection+aggregate"></a>

### collection.aggregate(pipeline, options)
<p>Aggregate not supported.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| pipeline | 
| options | 

<a name="Collection+listIndexes"></a>

### collection.listIndexes()
<p>Returns a list of all indexes on the collection. Returns a pseudo-cursor for Mongoose compatibility.
Only works in tables mode, throws an error in collections mode.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  
<a name="Collection+createIndex"></a>

### collection.createIndex(indexSpec, options)
<p>Create a new index. Only works in tables mode, throws an error in collections mode.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param | Description |
| --- | --- |
| indexSpec | <p>MongoDB-style index spec for Mongoose compatibility</p> |
| options |  |

<a name="Collection+dropIndex"></a>

### collection.dropIndex(name)
<p>Drop an existing index by name. Only works in tables mode, throws an error in collections mode.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| name | 

<a name="Collection+findAndRerank"></a>

### collection.findAndRerank(filter, options)
<p>Finds documents that match the filter and reranks them based on the provided options.</p>

**Kind**: instance method of [<code>Collection</code>](#Collection)  

| Param |
| --- |
| filter | 
| options | 

<a name="Connection"></a>

## Connection
<p>Extends Mongoose's Connection class to provide compatibility with Data API. Responsible for maintaining the
connection to Data API.</p>

**Kind**: global class  

* [Connection](#Connection)
    * [.debug](#Connection+debug)
    * [.collection(name, options)](#Connection+collection)
    * [.createCollection(name, options)](#Connection+createCollection)
    * [.createTable(name, definition)](#Connection+createTable)
    * [.dropCollection(name)](#Connection+dropCollection)
    * [.dropTable(name)](#Connection+dropTable)
    * [.createKeyspace(name)](#Connection+createKeyspace)
    * [.listCollections()](#Connection+listCollections)
    * [.listTables()](#Connection+listTables)
    * [.listTypes()](#Connection+listTypes) ⇒
    * [.createType(name, definition)](#Connection+createType) ⇒ <code>Promise.&lt;TypeDescriptor&gt;</code>
    * [.dropType(name)](#Connection+dropType) ⇒
    * [.alterType(name, update)](#Connection+alterType) ⇒
    * [.syncTypes(types)](#Connection+syncTypes) ⇒
    * [.runCommand(command)](#Connection+runCommand)
    * [.listDatabases()](#Connection+listDatabases)
    * [.openUri(uri, options)](#Connection+openUri)
    * [.createClient(uri, options)](#Connection+createClient)
    * [.asPromise()](#Connection+asPromise)

<a name="Connection+debug"></a>

### connection.debug
<p>Get current debug setting, accounting for potential changes to global debug config (<code>mongoose.set('debug', true | false)</code>)</p>

**Kind**: instance property of [<code>Connection</code>](#Connection)  
<a name="Connection+collection"></a>

### connection.collection(name, options)
<p>Get a collection by name. Cached in <code>this.collections</code>.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param |
| --- |
| name | 
| options | 

<a name="Connection+createCollection"></a>

### connection.createCollection(name, options)
<p>Create a new collection in the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| name | <p>The name of the collection to create</p> |
| options |  |

<a name="Connection+createTable"></a>

### connection.createTable(name, definition)
<p>Create a new table in the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param |
| --- |
| name | 
| definition | 

<a name="Connection+dropCollection"></a>

### connection.dropCollection(name)
<p>Drop a collection from the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param |
| --- |
| name | 

<a name="Connection+dropTable"></a>

### connection.dropTable(name)
<p>Drop a table from the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| name | <p>The name of the table to drop</p> |

<a name="Connection+createKeyspace"></a>

### connection.createKeyspace(name)
<p>Create a new keyspace.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| name | <p>The name of the keyspace to create</p> |

<a name="Connection+listCollections"></a>

### connection.listCollections()
<p>List all collections in the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
<a name="Connection+listTables"></a>

### connection.listTables()
<p>List all tables in the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
<a name="Connection+listTypes"></a>

### connection.listTypes() ⇒
<p>List all user-defined types (UDTs) in the database.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
**Returns**: <p>An array of type descriptors.</p>  
<a name="Connection+createType"></a>

### connection.createType(name, definition) ⇒ <code>Promise.&lt;TypeDescriptor&gt;</code>
<p>Create a new user-defined type (UDT) with the specified name and fields definition.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
**Returns**: <code>Promise.&lt;TypeDescriptor&gt;</code> - <p>The created type descriptor.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to create.</p> |
| definition | <p>The definition of the fields for the type.</p> |

<a name="Connection+dropType"></a>

### connection.dropType(name) ⇒
<p>Drop (delete) a user-defined type (UDT) by name.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
**Returns**: <p>The result of the dropType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to drop.</p> |

<a name="Connection+alterType"></a>

### connection.alterType(name, update) ⇒
<p>Alter a user-defined type (UDT) by renaming or adding fields.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
**Returns**: <p>The result of the alterType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to alter.</p> |
| update | <p>The alterations to be made: renaming or adding fields.</p> |

<a name="Connection+syncTypes"></a>

### connection.syncTypes(types) ⇒
<p>Synchronizes the set of user-defined types (UDTs) in the database. It makes existing types in the database
match the list provided by <code>types</code>. New types that are missing are created, and types that exist in the database
but are not in the input list are dropped. If a type is present in both, we add all the new type's fields to the existing type.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
**Returns**: <p>An object describing which types were created, updated, or dropped.</p>  
**Throws**:

- [<code>AstraMongooseError</code>](#AstraMongooseError) <p>If an error occurs during type synchronization, with partial progress information in the error.</p>


| Param | Description |
| --- | --- |
| types | <p>An array of objects each specifying the name and CreateTypeDefinition for a UDT to synchronize.</p> |

<a name="Connection+runCommand"></a>

### connection.runCommand(command)
<p>Run an arbitrary Data API command on the database</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| command | <p>The command to run</p> |

<a name="Connection+listDatabases"></a>

### connection.listDatabases()
<p>List all keyspaces. Called &quot;listDatabases&quot; for Mongoose compatibility</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
<a name="Connection+openUri"></a>

### connection.openUri(uri, options)
<p>Logic for creating a connection to Data API. Mongoose calls <code>openUri()</code> internally when the
user calls <code>mongoose.create()</code> or <code>mongoose.createConnection(uri)</code></p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| uri | <p>the connection string</p> |
| options |  |

<a name="Connection+createClient"></a>

### connection.createClient(uri, options)
<p>Create an astra-db-ts client and corresponding objects: client, db, admin.</p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  

| Param | Description |
| --- | --- |
| uri | <p>the connection string</p> |
| options |  |

<a name="Connection+asPromise"></a>

### connection.asPromise()
<p>For consistency with Mongoose's API. <code>mongoose.createConnection(uri)</code> returns the connection, <strong>not</strong> a promise,
so the Mongoose pattern to call <code>createConnection()</code> and wait for connection to succeed is
<code>await createConnection(uri).asPromise()</code></p>

**Kind**: instance method of [<code>Connection</code>](#Connection)  
<a name="BaseDb"></a>

## BaseDb
<p>Defines the base database class for interacting with Astra DB. Responsible for creating collections and tables.
This class abstracts the operations for both collections mode and tables mode. There is a separate TablesDb class
for tables and CollectionsDb class for collections.</p>

**Kind**: global class  

* [BaseDb](#BaseDb)
    * [new BaseDb()](#new_BaseDb_new)
    * [.createTable(name, definition)](#BaseDb+createTable)
    * [.dropCollection(name)](#BaseDb+dropCollection)
    * [.dropTable(name)](#BaseDb+dropTable)
    * [.listCollections(options)](#BaseDb+listCollections)
    * [.listTables()](#BaseDb+listTables)
    * [.listTypes()](#BaseDb+listTypes) ⇒
    * [.createType(name, definition)](#BaseDb+createType) ⇒
    * [.dropType(name)](#BaseDb+dropType) ⇒
    * [.alterType(name, update)](#BaseDb+alterType) ⇒
    * [.syncTypes(types)](#BaseDb+syncTypes) ⇒
    * [.command(command)](#BaseDb+command)

<a name="new_BaseDb_new"></a>

### new BaseDb()
<p>Whether we're using &quot;tables mode&quot; or &quot;collections mode&quot;. If tables mode, then <code>collection()</code> returns
a Table instance, <strong>not</strong> a Collection instance. Also, if tables mode, <code>createCollection()</code> throws an
error for Mongoose <code>syncIndexes()</code> compatibility reasons.</p>

<a name="BaseDb+createTable"></a>

### baseDb.createTable(name, definition)
<p>Create a new table with the specified name and definition</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param |
| --- |
| name | 
| definition | 

<a name="BaseDb+dropCollection"></a>

### baseDb.dropCollection(name)
<p>Drop a collection by name.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| name | <p>The name of the collection to be dropped.</p> |

<a name="BaseDb+dropTable"></a>

### baseDb.dropTable(name)
<p>Drop a table by name. This function does <strong>not</strong> throw an error if the table does not exist.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param |
| --- |
| name | 

<a name="BaseDb+listCollections"></a>

### baseDb.listCollections(options)
<p>List all collections in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| options | <p>Additional options for listing collections.</p> |

<a name="BaseDb+listTables"></a>

### baseDb.listTables()
<p>List all tables in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
<a name="BaseDb+listTypes"></a>

### baseDb.listTypes() ⇒
<p>List all user-defined types (UDTs) in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>An array of type descriptors.</p>  
<a name="BaseDb+createType"></a>

### baseDb.createType(name, definition) ⇒
<p>Create a new user-defined type (UDT) with the specified name and fields definition.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the createType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to create.</p> |
| definition | <p>The definition of the fields for the type.</p> |

<a name="BaseDb+dropType"></a>

### baseDb.dropType(name) ⇒
<p>Drop (delete) a user-defined type (UDT) by name.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the dropType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to drop.</p> |

<a name="BaseDb+alterType"></a>

### baseDb.alterType(name, update) ⇒
<p>Alter a user-defined type (UDT) by renaming or adding fields.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the alterType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to alter.</p> |
| update | <p>The alterations to be made: renaming or adding fields.</p> |

<a name="BaseDb+syncTypes"></a>

### baseDb.syncTypes(types) ⇒
<p>Synchronizes the set of user-defined types (UDTs) in the database. It makes existing types in the database
match the list provided by <code>types</code>. New types that are missing are created, and types that exist in the database
but are not in the input list are dropped. If a type is present in both, we add all the new type's fields to the existing type.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>An object describing which types were created, updated, or dropped.</p>  
**Throws**:

- [<code>AstraMongooseError</code>](#AstraMongooseError) <p>If an error occurs during type synchronization, with partial progress information in the error.</p>


| Param | Description |
| --- | --- |
| types | <p>An array of objects each specifying the name and CreateTypeDefinition for a UDT to synchronize.</p> |

<a name="BaseDb+command"></a>

### baseDb.command(command)
<p>Execute a command against the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| command | <p>The command to be executed.</p> |

<a name="CollectionsDb"></a>

## CollectionsDb
**Kind**: global class  

* [CollectionsDb](#CollectionsDb)
    * [new CollectionsDb(astraDb, keyspaceName)](#new_CollectionsDb_new)
    * [.collection(name)](#CollectionsDb+collection)
    * [.createCollection()](#CollectionsDb+createCollection)

<a name="new_CollectionsDb_new"></a>

### new CollectionsDb(astraDb, keyspaceName)
<p>Creates an instance of CollectionsDb. Do not instantiate this class directly.</p>


| Param | Description |
| --- | --- |
| astraDb | <p>The AstraDb instance to interact with the database.</p> |
| keyspaceName | <p>The name of the keyspace to use.</p> |

<a name="CollectionsDb+collection"></a>

### collectionsDb.collection(name)
<p>Get a collection by name.</p>

**Kind**: instance method of [<code>CollectionsDb</code>](#CollectionsDb)  

| Param | Description |
| --- | --- |
| name | <p>The name of the collection.</p> |

<a name="CollectionsDb+createCollection"></a>

### collectionsDb.createCollection()
<p>Send a CreateCollection command to Data API.</p>

**Kind**: instance method of [<code>CollectionsDb</code>](#CollectionsDb)  
<a name="TablesDb"></a>

## TablesDb
**Kind**: global class  

* [TablesDb](#TablesDb)
    * [new TablesDb(astraDb, keyspaceName)](#new_TablesDb_new)
    * [.collection(name)](#TablesDb+collection)
    * [.createCollection()](#TablesDb+createCollection)

<a name="new_TablesDb_new"></a>

### new TablesDb(astraDb, keyspaceName)
<p>Creates an instance of TablesDb. Do not instantiate this class directly.</p>


| Param | Description |
| --- | --- |
| astraDb | <p>The AstraDb instance to interact with the database.</p> |
| keyspaceName | <p>The name of the keyspace to use.</p> |

<a name="TablesDb+collection"></a>

### tablesDb.collection(name)
<p>Get a table by name. This method is called <code>collection()</code> for compatibility with Mongoose, which calls
this method for getting a Mongoose Collection instance, which may map to a table in Astra DB when using tables mode.</p>

**Kind**: instance method of [<code>TablesDb</code>](#TablesDb)  

| Param | Description |
| --- | --- |
| name | <p>The name of the table.</p> |

<a name="TablesDb+createCollection"></a>

### tablesDb.createCollection()
<p>Throws an error, astra-mongoose does not support creating collections in tables mode.</p>

**Kind**: instance method of [<code>TablesDb</code>](#TablesDb)  
<a name="Vectorize"></a>

## Vectorize
<p>Vectorize is a custom Mongoose SchemaType that allows you set a vector value to a string
for tables mode vectorize API. A Vectorize path is an array of numbers that can also be set to a string.</p>

**Kind**: global class  

* [Vectorize](#Vectorize)
    * [new Vectorize(key, options)](#new_Vectorize_new)
    * [.cast()](#Vectorize+cast)
    * [.clone()](#Vectorize+clone)

<a name="new_Vectorize_new"></a>

### new Vectorize(key, options)
<p>Create a new instance of the Vectorize SchemaType. You may need to instantiate this type to add to your Mongoose
schema using <code>Schema.prototype.path()</code> for better TypeScript support.</p>


| Param | Description |
| --- | --- |
| key | <p>the path to this vectorize field in your schema</p> |
| options | <p>vectorize options that define how to interact with the vectorize service, including the dimension</p> |

<a name="Vectorize+cast"></a>

### vectorize.cast()
<p>Cast a given value to the appropriate type. Defers to the default casting behavior for Mongoose number arrays, with
the one exception being strings.</p>

**Kind**: instance method of [<code>Vectorize</code>](#Vectorize)  
<a name="Vectorize+clone"></a>

### vectorize.clone()
<p>Overwritten to account for Mongoose SchemaArray constructor taking different arguments than Vectorize</p>

**Kind**: instance method of [<code>Vectorize</code>](#Vectorize)  
<a name="AstraMongooseError"></a>

## AstraMongooseError
<p>Base class for astra-mongoose-specific errors.</p>

**Kind**: global class  
<a name="BaseDb"></a>

## BaseDb ⇐ [<code>BaseDb</code>](#BaseDb)
<p>Db instance that creates and manages collections.</p>

**Kind**: global variable  
**Extends**: [<code>BaseDb</code>](#BaseDb)  

* [BaseDb](#BaseDb) ⇐ [<code>BaseDb</code>](#BaseDb)
    * [new BaseDb()](#new_BaseDb_new)
    * [.createTable(name, definition)](#BaseDb+createTable)
    * [.dropCollection(name)](#BaseDb+dropCollection)
    * [.dropTable(name)](#BaseDb+dropTable)
    * [.listCollections(options)](#BaseDb+listCollections)
    * [.listTables()](#BaseDb+listTables)
    * [.listTypes()](#BaseDb+listTypes) ⇒
    * [.createType(name, definition)](#BaseDb+createType) ⇒
    * [.dropType(name)](#BaseDb+dropType) ⇒
    * [.alterType(name, update)](#BaseDb+alterType) ⇒
    * [.syncTypes(types)](#BaseDb+syncTypes) ⇒
    * [.command(command)](#BaseDb+command)

<a name="new_BaseDb_new"></a>

### new BaseDb()
<p>Whether we're using &quot;tables mode&quot; or &quot;collections mode&quot;. If tables mode, then <code>collection()</code> returns
a Table instance, <strong>not</strong> a Collection instance. Also, if tables mode, <code>createCollection()</code> throws an
error for Mongoose <code>syncIndexes()</code> compatibility reasons.</p>

<a name="BaseDb+createTable"></a>

### baseDb.createTable(name, definition)
<p>Create a new table with the specified name and definition</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param |
| --- |
| name | 
| definition | 

<a name="BaseDb+dropCollection"></a>

### baseDb.dropCollection(name)
<p>Drop a collection by name.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| name | <p>The name of the collection to be dropped.</p> |

<a name="BaseDb+dropTable"></a>

### baseDb.dropTable(name)
<p>Drop a table by name. This function does <strong>not</strong> throw an error if the table does not exist.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param |
| --- |
| name | 

<a name="BaseDb+listCollections"></a>

### baseDb.listCollections(options)
<p>List all collections in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| options | <p>Additional options for listing collections.</p> |

<a name="BaseDb+listTables"></a>

### baseDb.listTables()
<p>List all tables in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
<a name="BaseDb+listTypes"></a>

### baseDb.listTypes() ⇒
<p>List all user-defined types (UDTs) in the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>An array of type descriptors.</p>  
<a name="BaseDb+createType"></a>

### baseDb.createType(name, definition) ⇒
<p>Create a new user-defined type (UDT) with the specified name and fields definition.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the createType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to create.</p> |
| definition | <p>The definition of the fields for the type.</p> |

<a name="BaseDb+dropType"></a>

### baseDb.dropType(name) ⇒
<p>Drop (delete) a user-defined type (UDT) by name.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the dropType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to drop.</p> |

<a name="BaseDb+alterType"></a>

### baseDb.alterType(name, update) ⇒
<p>Alter a user-defined type (UDT) by renaming or adding fields.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>The result of the alterType command.</p>  

| Param | Description |
| --- | --- |
| name | <p>The name of the type to alter.</p> |
| update | <p>The alterations to be made: renaming or adding fields.</p> |

<a name="BaseDb+syncTypes"></a>

### baseDb.syncTypes(types) ⇒
<p>Synchronizes the set of user-defined types (UDTs) in the database. It makes existing types in the database
match the list provided by <code>types</code>. New types that are missing are created, and types that exist in the database
but are not in the input list are dropped. If a type is present in both, we add all the new type's fields to the existing type.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  
**Returns**: <p>An object describing which types were created, updated, or dropped.</p>  
**Throws**:

- [<code>AstraMongooseError</code>](#AstraMongooseError) <p>If an error occurs during type synchronization, with partial progress information in the error.</p>


| Param | Description |
| --- | --- |
| types | <p>An array of objects each specifying the name and CreateTypeDefinition for a UDT to synchronize.</p> |

<a name="BaseDb+command"></a>

### baseDb.command(command)
<p>Execute a command against the database.</p>

**Kind**: instance method of [<code>BaseDb</code>](#BaseDb)  

| Param | Description |
| --- | --- |
| command | <p>The command to be executed.</p> |

<a name="CollectionsDb"></a>

## CollectionsDb ⇐ [<code>BaseDb</code>](#BaseDb)
<p>Db instance that creates and manages tables.</p>

**Kind**: global variable  
**Extends**: [<code>BaseDb</code>](#BaseDb)  

* [CollectionsDb](#CollectionsDb) ⇐ [<code>BaseDb</code>](#BaseDb)
    * [new CollectionsDb(astraDb, keyspaceName)](#new_CollectionsDb_new)
    * [.collection(name)](#CollectionsDb+collection)
    * [.createCollection()](#CollectionsDb+createCollection)

<a name="new_CollectionsDb_new"></a>

### new CollectionsDb(astraDb, keyspaceName)
<p>Creates an instance of CollectionsDb. Do not instantiate this class directly.</p>


| Param | Description |
| --- | --- |
| astraDb | <p>The AstraDb instance to interact with the database.</p> |
| keyspaceName | <p>The name of the keyspace to use.</p> |

<a name="CollectionsDb+collection"></a>

### collectionsDb.collection(name)
<p>Get a collection by name.</p>

**Kind**: instance method of [<code>CollectionsDb</code>](#CollectionsDb)  

| Param | Description |
| --- | --- |
| name | <p>The name of the collection.</p> |

<a name="CollectionsDb+createCollection"></a>

### collectionsDb.createCollection()
<p>Send a CreateCollection command to Data API.</p>

**Kind**: instance method of [<code>CollectionsDb</code>](#CollectionsDb)  
<a name="handleVectorFieldsProjection"></a>

## handleVectorFieldsProjection()
<p>Mongoose plugin to handle adding <code>$vector</code> to the projection by default if <code>$vector</code> has <code>select: true</code>.
Because <code>$vector</code> is deselected by default, this plugin makes it possible for the user to include <code>$vector</code>
by default from their schema.</p>
<p>You do not need to call this function directly. Mongoose applies this plugin automatically when you call <code>setDriver()</code>.</p>

**Kind**: global function  
<a name="addVectorDimensionValidator"></a>

## addVectorDimensionValidator()
<p>Mongoose plugin to validate arrays of numbers that have a <code>dimension</code> property. Ensure that the array
is either nullish or has a length equal to the dimension.</p>
<p>You do not need to call this function directly. Mongoose applies this plugin automatically when you call <code>setDriver()</code>.</p>

**Kind**: global function  
<a name="convertSchemaToUDTColumns"></a>

## convertSchemaToUDTColumns()
<p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p>

**Kind**: global function  
<a name="udtDefinitionsFromSchema"></a>

## udtDefinitionsFromSchema()
<p>Given a Mongoose schema, get the definitions of all the UDTs used by this schema.
Used to create all UDTs required by the schema before creating the table.</p>

**Kind**: global function  
<a name="convertSchemaToColumns"></a>

## convertSchemaToColumns()
<p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p>

**Kind**: global function  
<a name="createAstraUri"></a>

## createAstraUri()
<p>Create an Astra connection URI while connecting to Astra Data API.</p>

**Kind**: global function  
<a name="tableDefinitionFromSchema"></a>

## tableDefinitionFromSchema()
<p>Given a Mongoose schema, create an equivalent Data API table definition for use with <code>createTable()</code></p>

**Kind**: global function  
