import { Db } from './db';
import { HTTPClient } from '../client';
export interface ClientOptions {
    applicationToken?: string;
    baseApiPath?: string;
    logLevel?: string;
    authHeaderName?: string;
    createNamespaceOnConnect?: boolean;
    username?: string;
    password?: string;
    isAstra?: boolean;
    logSkippedOptions?: boolean;
    useHTTP2?: boolean;
    featureFlags?: string[];
}
export declare class Client {
    httpClient: HTTPClient;
    keyspaceName?: string;
    createNamespaceOnConnect?: boolean;
    dbs: Map<string, Db>;
    constructor(baseUrl: string, keyspaceName: string, options: ClientOptions);
    /**
   * Setup a connection to the Astra/Stargate Data API
   * @param uri an Stargate Data API uri (Eg. http://localhost:8181/v1/testks1) where testks1 is the name of the keyspace/Namespace which should always be the last part of the URL
   * @returns MongoClient
   */
    static connect(uri: string, options?: ClientOptions | null): Promise<Client>;
    /**
   * Connect the MongoClient instance to Data API (create Namespace automatically when the 'createNamespaceOnConnect' flag is set to true)
   * @returns a MongoClient instance
   */
    connect(): Promise<Client>;
    /**
   * Use a Data API keyspace
   * @param dbName the Data API keyspace to connect to
   * @returns Db
   */
    db(dbName?: string): Db;
    findNamespaces(): Promise<any>;
    /**
   *
   * @param maxListeners
   * @returns number
   */
    setMaxListeners(maxListeners: number): number;
    /**
   *
   * @returns Client
   */
    close(): this;
    startSession(): void;
}
