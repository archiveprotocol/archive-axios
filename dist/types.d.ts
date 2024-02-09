import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { CreateAxiosDefaults } from "axios/index";
import { KafkaManager } from "logging-library";
export interface MyRequestConfig extends InternalAxiosRequestConfig {
    metadata: {
        startTime: Date;
        duration?: number;
        endTime?: Date;
    };
}
export enum CacheDuration {
    NO_CACHE = 0,
    SHORT_CACHE_DURATION = 1
}
export class ApAxiosManager {
    cacheToAxiosInstance: Map<CacheDuration, AxiosInstance>;
    constructor(blueprintId: string, kafkaManager: KafkaManager, requestId?: string);
    setup(config?: CreateAxiosDefaults): void;
    setRequestId(requestId: string): void;
}
export class ApGraphQLManager {
    constructor(axiosManager: ApAxiosManager, subgraphURL: string);
    buildGraphQLRequestVariables(userAddress?: string, fromBlock?: number): {
        userAddress: string;
        fromBlock: number;
    };
    executeGraphQLQueryOrThrowError<T>(payload: string, variables?: {}, blockNumber?: number): Promise<T>;
}

//# sourceMappingURL=types.d.ts.map
