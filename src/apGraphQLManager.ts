import { ApAxiosManager, CacheDuration } from './apAxiosManager';
import { ArchiveLogger } from './logger';
import { AxiosInstance } from 'axios';

export class ApGraphQLManager {
  constructor(
    private axiosManager: ApAxiosManager,
    private subgraphURL: string,
  ) {}

  public buildGraphQLRequestVariables(userAddress?: string, fromBlock?: number) {
    return {
      ...(fromBlock && { fromBlock: fromBlock }),
      ...(userAddress && { userAddress: userAddress }),
    };
  }

  private selectAxiosInstance(blockNumber?: number): AxiosInstance {
    if (blockNumber && blockNumber > 0) {
      return this.axiosManager.cacheToAxiosInstance.get(CacheDuration.SHORT_CACHE_DURATION);
    }
    return this.axiosManager.cacheToAxiosInstance.get(CacheDuration.NO_CACHE);
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
  */
  async executeGraphQLQueryOrThrowError<T>(payload: string, variables = {}, blockNumber?: number): Promise<T> {
    const axiosInstance = this.selectAxiosInstance(blockNumber);
    // Might throw errors if status not like 2xx or if casting to T yields an error.
    try {
      const response = await axiosInstance.post<T>(
        this.subgraphURL,
        { query: payload, variables: variables },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000, // Sometimes the subgraph takes a long time to respond than 15 seconds, so we increase the timeout
        },
      );

      if ((response.data as any).errors) {
        const msg = `Invalid response from subgraph ${
          this.subgraphURL
        }. payload: ${payload}, variables: ${JSON.stringify(variables)} - ${JSON.stringify(
          (response.data as any).errors,
        )}`;

        ArchiveLogger.getLogger().error(msg);
        throw new Error(msg);
      }
      return response.data as T;
    } catch (e) {
      const baseMsg = `Error when fetching subgraph ${
        this.subgraphURL
      }. payload: ${payload}, variables: ${JSON.stringify(variables)}`;
      const errorMsg = `code: ${e.code}, status: ${e.response?.status}, statusText: ${e.response
        ?.statusText}, errorName: ${e.name}, message: ${e.message}, responseError: ${JSON.stringify(
        e.response?.data?.errors,
      )}, stackTrace: ${e.stack}`;
      ArchiveLogger.getLogger().error(baseMsg + errorMsg);
      throw e;
    }
  }
}
