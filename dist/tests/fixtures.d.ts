export declare const TEST_COLLECTION_NAME = "collection1";
export declare const createSampleDoc: () => {
    _id: string;
    username: string;
};
export interface Employee {
    _id?: string;
    username?: string;
    human?: boolean;
    age?: number;
    password?: string | null;
    address?: {
        number?: number;
        street?: string | null;
        suburb?: string | null;
        city?: string | null;
        is_office?: boolean;
        country?: string | null;
    };
}
export declare const createSampleDocWithMultiLevelWithId: (docId: string) => Employee;
export declare const createSampleDocWithMultiLevel: () => Employee;
export declare const createSampleDoc2WithMultiLevel: () => Employee;
export declare const createSampleDoc3WithMultiLevel: () => Employee;
export declare const sampleUsersList: Employee[];
export declare const getSampleDocs: (numUsers: number) => {
    _id: string;
    username: string;
}[];
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
        useTables?: undefined;
    };
} | {
    isAstra: boolean;
    uri: string;
    options: {
        username: string | undefined;
        password: string | undefined;
        useTables: boolean;
        isAstra?: undefined;
    };
} | null;
