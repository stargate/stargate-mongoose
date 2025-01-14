import { HTTPClient } from '../client';
import { CreateCollectionOptions, ListCollectionOptions } from './options';
import { Collection } from './collection';
export declare class Db {
    rootHttpClient: HTTPClient;
    httpClient: HTTPClient;
    name: string;
    collections: Map<string, Collection>;
    httpBasePath: string;
    constructor(httpClient: HTTPClient, name: string);
    /**
   *
   * @param collectionName
   * @returns Collection
   */
    collection(collectionName: string): Collection;
    /**
   *
   * @param collectionName
   * @param options
   * @returns Promise
   */
    createCollection(collectionName: string, options?: CreateCollectionOptions): Promise<any>;
    /**
   *
   * @param collectionName
   * @returns APIResponse
   */
    dropCollection(collectionName: string): Promise<import("../client/httpClient").APIResponse>;
    /**
   *
   * @returns Promise
   */
    dropDatabase(): Promise<import("../client/httpClient").APIResponse>;
    /**
   *
   * @returns Promise
   */
    createDatabase(): Promise<import("../client/httpClient").APIResponse>;
    findCollections(options?: ListCollectionOptions): Promise<any>;
    runCommand(command: Record<string, unknown>): Promise<any>;
}
export declare class StargateAstraError extends Error {
    message: string;
    constructor(message: string);
}
