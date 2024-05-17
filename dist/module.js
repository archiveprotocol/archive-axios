import $5q6vG$axios from "axios";
import $5q6vG$axiosretry from "axios-retry";
import {config as $5q6vG$config} from "dotenv";
import {LoggerManager as $5q6vG$LoggerManager} from "logging-library/lib/LoggerManager";


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
var $602978080c6cf3eb$exports = {};

$parcel$export($602978080c6cf3eb$exports, "CacheDuration", () => $602978080c6cf3eb$export$4ce520e9555bb0b2);
$parcel$export($602978080c6cf3eb$exports, "ApAxiosManager", () => $602978080c6cf3eb$export$ff5d21df453f62e1);


var $602978080c6cf3eb$export$4ce520e9555bb0b2;
(function(CacheDuration) {
    CacheDuration[CacheDuration["NO_CACHE"] = 0] = "NO_CACHE";
    CacheDuration[CacheDuration["SHORT_CACHE_DURATION"] = 1] = "SHORT_CACHE_DURATION";
})($602978080c6cf3eb$export$4ce520e9555bb0b2 || ($602978080c6cf3eb$export$4ce520e9555bb0b2 = {}));
class $602978080c6cf3eb$export$ff5d21df453f62e1 {
    constructor(blueprintId, kafkaManager, requestId){
        this.blueprintId = blueprintId;
        this.kafkaManager = kafkaManager;
        this.requestId = requestId;
        this.cacheToAxiosInstance = new Map();
    }
    setup(config) {
        this.config = config;
        this.setupNoCacheDurationInstance();
    }
    setRequestId(requestId) {
        this.requestId = requestId;
    }
    setupNoCacheDurationInstance() {
        const shortDurationInstance = (0, $5q6vG$axios).create(this.config);
        (0, $5q6vG$axiosretry)((0, $5q6vG$axios), {
            retries: 2,
            retryDelay: (0, $5q6vG$axiosretry).exponentialDelay
        });
        shortDurationInstance.interceptors.request.use((config)=>this.requestInterceptorOnFulfilled(config), (error)=>this.requestInterceptorOnRejected(error));
        shortDurationInstance.interceptors.response.use((response)=>this.responseInterceptorOnFulfilled(response), (error)=>this.responseInterceptorOnRejected(error));
        this.cacheToAxiosInstance.set(0, shortDurationInstance);
    }
    async requestInterceptorOnFulfilled(config) {
        this.assertRequestAllowed(config.url);
        config.metadata = {
            startTime: new Date()
        };
        return config;
    }
    async requestInterceptorOnRejected(error) {
        this.assertRequestAllowed(error.url);
        return Promise.reject(error);
    }
    async responseInterceptorOnFulfilled(response) {
        this.calculateRequestDuration(response.config);
        if (!response.cached) await this.logResponseTime(response.config, response.status);
        return response;
    }
    async responseInterceptorOnRejected(error) {
        this.calculateRequestDuration(error.config);
        const status = error.response?.status ?? 400;
        await this.logResponseTime(error.config, status);
        await this.kafkaManager.sendLogs([
            {
                logLevel: "error",
                message: this.generateAxiosErrorMessage(error),
                timestamp: Date.now(),
                blueprintId: this.blueprintId,
                extras: {
                    requestId: this.requestId
                }
            }
        ]);
        return Promise.reject(error);
    }
    async logResponseTime(config, status) {
        await this.kafkaManager.sendResponseTimeToKafka(config, status, this.blueprintId, this.requestId);
    }
    calculateRequestDuration(config) {
        config.metadata.endTime = new Date();
        config.metadata.duration = config.metadata.endTime.getTime() - config.metadata.startTime.getTime();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    assertRequestAllowed(_) {
    //Check if request allowed - not implemented yet
    }
    generateAxiosErrorMessage(e) {
        return `Axios Error when calling ${e.config?.method}, url: ${e.request?.url}, params: ${JSON.stringify(e.config?.params)}, code: ${e.code}, status: ${e.response?.status}, statusText: ${e.response?.statusText}, errorName: ${e.name}, message: ${e.message}, stackTrace: ${e.stack}`;
    }
}


var $d742ab2ff803237b$exports = {};

$parcel$export($d742ab2ff803237b$exports, "ApGraphQLManager", () => $d742ab2ff803237b$export$a6ccfe0af633fa72);



(0, $5q6vG$config)();
var $791f5d3cb3f38dc6$export$243e62d78d3b544d;
(function(LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["ERROR"] = "error";
    LogLevel["INFO"] = "info";
    LogLevel["TRACE"] = "trace";
    LogLevel["WARNING"] = "warning";
})($791f5d3cb3f38dc6$export$243e62d78d3b544d || ($791f5d3cb3f38dc6$export$243e62d78d3b544d = {}));
class $791f5d3cb3f38dc6$export$13d947851550bb0 extends (0, $5q6vG$LoggerManager) {
    static getDefaultBlueprintIdentifier() {
        return "archive-axios-default";
    }
}


class $d742ab2ff803237b$export$a6ccfe0af633fa72 {
    constructor(axiosManager, subgraphURL){
        this.axiosManager = axiosManager;
        this.subgraphURL = subgraphURL;
    }
    buildGraphQLRequestVariables(userAddress, fromBlock) {
        return {
            ...fromBlock && {
                fromBlock: fromBlock
            },
            ...userAddress && {
                userAddress: userAddress
            }
        };
    }
    selectAxiosInstance(blockNumber) {
        if (blockNumber && blockNumber > 0) return this.axiosManager.cacheToAxiosInstance.get((0, $602978080c6cf3eb$export$4ce520e9555bb0b2).SHORT_CACHE_DURATION);
        return this.axiosManager.cacheToAxiosInstance.get((0, $602978080c6cf3eb$export$4ce520e9555bb0b2).NO_CACHE);
    }
    /*
  Function for querying subgraphs.
  Note that typings are returned in a "best-effort" basis, i.e. if the subgraph returns a different type
  than what was passed when calling the function, this will simply be passed further without errors.
  Note also that any response with status ~ 2xx will trigger an AxiosError.
  Suggestion for implementing this function:
  try {
    await executeGraphQLQueryOrThrowError<myType>("query {uniswapV3Pools { id }}", 100);
  }
  catch (e: any){
     if (e instanceof AxiosError) {
      log('axios error', e.message, e.status, e.stack);
    } else {
      log('common error', e.stack);
    }
  }
  */ async executeGraphQLQueryOrThrowError(payload, variables = {}, blockNumber) {
        const axiosInstance = this.selectAxiosInstance(blockNumber);
        // Might throw errors if status not like 2xx or if casting to T yields an error.
        try {
            const response = await axiosInstance.post(this.subgraphURL, {
                query: payload,
                variables: variables
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 60000
            });
            if (response.data.errors) {
                const msg = `Invalid response from subgraph ${this.subgraphURL}. payload: ${payload}, variables: ${JSON.stringify(variables)} - ${JSON.stringify(response.data.errors)}`;
                (0, $791f5d3cb3f38dc6$export$13d947851550bb0).getLogger().error(msg);
                throw new Error(msg);
            }
            return response.data;
        } catch (e) {
            const baseMsg = `Error when fetching subgraph ${this.subgraphURL}. payload: ${payload}, variables: ${JSON.stringify(variables)}`;
            const errorMsg = `code: ${e.code}, status: ${e.response?.status}, statusText: ${e.response?.statusText}, errorName: ${e.name}, message: ${e.message}, responseError: ${JSON.stringify(e.response?.data?.errors)}, stackTrace: ${e.stack}`;
            (0, $791f5d3cb3f38dc6$export$13d947851550bb0).getLogger().error(baseMsg + errorMsg);
            throw e;
        }
    }
}




export {$602978080c6cf3eb$export$4ce520e9555bb0b2 as CacheDuration, $602978080c6cf3eb$export$ff5d21df453f62e1 as ApAxiosManager, $d742ab2ff803237b$export$a6ccfe0af633fa72 as ApGraphQLManager};
//# sourceMappingURL=module.js.map
