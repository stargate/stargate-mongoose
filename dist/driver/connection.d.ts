import type { Db, RawDataAPIResponse } from '@datastax/astra-db-ts';
import { default as MongooseConnection } from 'mongoose/lib/connection';
import type { ConnectOptions, Mongoose } from 'mongoose';
import { DataAPIClient } from '@datastax/astra-db-ts';
interface ConnectOptionsInternal extends ConnectOptions {
    isAstra?: boolean;
    _fireAndForget?: boolean;
    sanitizeFilter?: boolean;
    featureFlags?: string[];
    username?: string;
    password?: string;
}
export declare class Connection extends MongooseConnection {
    debugType: string;
    initialConnection: Promise<Connection> | null;
    client: DataAPIClient | null;
    db: Db | null;
    namespace: string | null;
    constructor(base: Mongoose);
    _waitForClient(): Promise<void>;
    collection(name: string, options?: {
        modelName?: string;
    }): any;
    createCollection(name: string, options?: Record<string, unknown>): Promise<import("@datastax/astra-db-ts").Collection<import("@datastax/astra-db-ts").SomeDoc>>;
    dropCollection(name: string): Promise<boolean>;
    createNamespace(namespace: string): Promise<any>;
    dropDatabase(): Promise<void>;
    listCollections(): Promise<import("@datastax/astra-db-ts").FullCollectionInfo[]>;
    runCommand(command: Record<string, unknown>): Promise<RawDataAPIResponse>;
    openUri(uri: string, options: ConnectOptionsInternal): Promise<this>;
    createClient(uri: string, options: ConnectOptionsInternal): Promise<this>;
    setClient(_client: DataAPIClient): void;
    asPromise(): Promise<Connection> | null;
    startSession(): void;
    /**
     *
     * @returns Client
     */
    doClose(_force?: boolean): this;
}
interface ParsedUri {
    baseUrl: string;
    baseApiPath: string;
    keyspaceName: string;
    applicationToken?: string;
    logLevel?: string;
    authHeaderName?: string;
}
export declare const parseUri: (uri: string) => ParsedUri;
export {};
