import { Collection } from './collection';
import { FindOptionsForDataAPI } from './options';
export declare class FindCursor {
    collection: Collection;
    filter: Record<string, unknown>;
    options: FindOptionsForDataAPI;
    documents: Record<string, unknown>[];
    status: string;
    nextPageState?: string;
    limit: number;
    includeSortVector?: boolean;
    page: Record<string, unknown>[];
    pageIndex: number;
    exhausted: boolean;
    sortVector?: number[];
    constructor(collection: Collection, filter: Record<string, unknown>, options?: FindOptionsForDataAPI);
    /**
   *
   * @returns void
   */
    private getAll;
    getSortVector(): Promise<number[] | undefined>;
    /**
   *
   * @returns Record<string, unknown>[]
   */
    toArray(): Promise<Record<string, unknown>[]>;
    /**
   * @returns Promise
   */
    next(): Promise<Record<string, unknown>>;
    _getMore(): Promise<void>;
    /**
   *
   * @param iterator
   */
    forEach(iterator: (doc: Record<string, unknown>) => void): Promise<any>;
    /**
     *
     * @returns Promise<number>
     * @param options
     */
    count(_options?: Record<string, unknown>): Promise<any>;
    /**
     *
     * @param options
     */
    stream(_options?: Record<string, unknown>): void;
}
