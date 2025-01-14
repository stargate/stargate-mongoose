import { HTTPClient } from '../client/httpClient';
interface ParsedUri {
    baseUrl: string;
    baseApiPath: string;
    keyspaceName: string;
    applicationToken: string;
    logLevel: string;
    authHeaderName: string;
}
export declare const parseUri: (uri: string) => ParsedUri;
/**
 * Create an Astra connection URI while connecting to Astra Data API
 * @param apiEndpoint the database API Endpoint of the Astra database
 * @param apiToken an Astra application token
 * @param namespace the namespace to connect to
 * @param baseApiPath baseAPI path defaults to /api/json/v1
 * @param logLevel an winston log level (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
 * @param authHeaderName
 * @returns URL as string
 */
export declare function createAstraUri(apiEndpoint: string, apiToken: string, namespace?: string, baseApiPath?: string, logLevel?: string, authHeaderName?: string): string;
/**
 * Create a Data API connection URI while connecting to Open source Data API
 * @param baseUrl the base URL of the Data API
 * @param keyspace the keyspace to connect to
 * @param username the username to connect with
 * @param password the password to connect with
 * @param logLevel an winston log level (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
* @returns URL as string
 */
export declare function createStargateUri(baseUrl: string, keyspace: string, username: string, password: string, logLevel?: string): string;
/**
 * Get an access token from Stargate (this is useful while connecting to open source Data API)
 * @param username Username
 * @param password Password
 * @returns access token as string
 */
export declare function getStargateAccessToken(username: string, password: string): string;
export declare class StargateAuthError extends Error {
    message: string;
    constructor(message: string);
}
export declare const executeOperation: (operation: () => Promise<unknown>) => Promise<any>;
export declare function createNamespace(httpClient: HTTPClient, name: string): Promise<import("../client/httpClient").APIResponse>;
export declare function dropNamespace(httpClient: HTTPClient, name: string): Promise<import("../client/httpClient").APIResponse>;
export declare function setDefaultIdForUpsert(command: Record<string, any>, replace?: boolean): void;
export declare function omit<T extends Record<string, any>>(obj: T | null | undefined, keys: string[]): T | null | undefined;
export {};
