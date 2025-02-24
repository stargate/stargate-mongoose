export declare const TEST_COLLECTION_NAME = "collection1";
export declare const TEST_TABLE_NAME = "table1";
export declare const sleep: (ms?: number) => Promise<unknown>;
export declare const testClientName: string | undefined;
export declare const isAstra: boolean;
export declare const testClient: {
    isAstra: boolean;
    uri: string;
    options: {
        isAstra: boolean;
        username?: undefined;
        password?: undefined;
    };
} | {
    isAstra: boolean;
    uri: string;
    options: {
        username: string | undefined;
        password: string | undefined;
        isAstra?: undefined;
    };
} | null;
