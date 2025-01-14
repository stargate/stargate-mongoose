/// <reference types="node" />
import { AxiosRequestConfig } from 'axios';
import http2 from 'http2';
interface APIClientOptions {
    applicationToken?: string;
    baseApiPath?: string;
    baseUrl?: string;
    authHeaderName?: string;
    logLevel?: string;
    username?: string;
    password?: string;
    isAstra?: boolean;
    logSkippedOptions?: boolean;
    useHTTP2?: boolean;
    featureFlags?: string[];
}
export interface APIResponse {
    status?: any;
    data?: any;
    errors?: unknown[];
}
declare class HTTP2Session {
    session: http2.ClientHttp2Session;
    numInFlightRequests: number;
    numRequests: number;
    gracefulCloseInProgress: boolean;
    closed: boolean;
    origin: string;
    constructor(origin: string);
    _createSession(): void;
    close(): void;
    gracefulClose(): void;
    completeHTTP2Request(): void;
    request(path: string, token: string, body: Record<string, unknown>, timeout: number, additionalParams: Record<string, unknown>): Promise<{
        status: number;
        data: Record<string, unknown>;
    }>;
}
export declare class HTTPClient {
    origin: string;
    baseUrl: string;
    applicationToken: string;
    authHeaderName: string;
    username: string;
    password: string;
    isAstra: boolean;
    logSkippedOptions: boolean;
    http2Session?: HTTP2Session;
    closed: boolean;
    featureFlagHeaders: Record<string, 'true'>;
    constructor(options: APIClientOptions);
    close(): void;
    _createHTTP2Session(): void;
    _request(requestInfo: AxiosRequestConfig): Promise<APIResponse>;
    makeHTTP2Request(path: string, token: string, body: Record<string, unknown>, timeout: number, additionalParams: Record<string, unknown>): Promise<{
        status: number;
        data: Record<string, unknown>;
    }>;
    executeCommandWithUrl(url: string, data: Record<string, any>, optionsToRetain: Set<string> | null): Promise<APIResponse>;
}
export declare class StargateServerError extends Error {
    errors: {
        message: string;
        errorCode: string;
    }[];
    command: Record<string, any>;
    status: any;
    constructor(response: any, command: Record<string, unknown>);
}
export declare const handleIfErrorResponse: (response: any, data: Record<string, unknown>) => void;
export {};
