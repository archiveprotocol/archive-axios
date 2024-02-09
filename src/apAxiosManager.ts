import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { InternalAxiosRequestConfig } from 'axios';
import { buildMemoryStorage, setupCache } from 'axios-cache-interceptor';
import { CacheAxiosResponse } from 'axios-cache-interceptor/dist/cache/axios';
import axiosRetry from 'axios-retry';
import { CreateAxiosDefaults } from 'axios/index';
import { KafkaManager } from 'logging-library';

export interface MyRequestConfig extends InternalAxiosRequestConfig {
  metadata: {
    startTime: Date;
    duration?: number;
    endTime?: Date;
  };
}

export enum CacheDuration {
  NO_CACHE,
  SHORT_CACHE_DURATION,
}

// Note that only GET requests are cached.
export class ApAxiosManager {
  public cacheToAxiosInstance: Map<CacheDuration, AxiosInstance>;
  private config?: CreateAxiosDefaults;

  constructor(
    private blueprintId: string,
    private kafkaManager: KafkaManager,
    private requestId?: string,
  ) {
    this.cacheToAxiosInstance = new Map();
  }

  setup(config?: CreateAxiosDefaults): void {
    this.config = config;
    this.setupNoCacheDurationInstance();
    this.setupShortCacheDurationAxiosInstance();
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  private setupNoCacheDurationInstance() {
    const shortDurationInstance = axios.create(this.config);
    axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });
    shortDurationInstance.interceptors.request.use(
      (config: MyRequestConfig) => this.requestInterceptorOnFulfilled(config),
      (error: any) => this.requestInterceptorOnRejected(error),
    );

    shortDurationInstance.interceptors.response.use(
      (response: AxiosResponse) => this.responseInterceptorOnFulfilled(response),
      (error: AxiosError) => this.responseInterceptorOnRejected(error),
    );

    this.cacheToAxiosInstance.set(CacheDuration.NO_CACHE, shortDurationInstance);
  }

  private setupShortCacheDurationAxiosInstance() {
    const shortDurationInstance = axios.create(this.config);
    axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });
    shortDurationInstance.interceptors.request.use(
      (config: MyRequestConfig) => this.requestInterceptorOnFulfilled(config),
      (error: any) => this.requestInterceptorOnRejected(error),
    );

    shortDurationInstance.interceptors.response.use(
      (response: AxiosResponse) => this.responseInterceptorOnFulfilled(response),
      (error: AxiosError) => this.responseInterceptorOnRejected(error),
    );
    setupCache(shortDurationInstance, { storage: buildMemoryStorage(false) });
    this.cacheToAxiosInstance.set(CacheDuration.SHORT_CACHE_DURATION, shortDurationInstance);
  }

  private async requestInterceptorOnFulfilled(config: MyRequestConfig) {
    this.assertRequestAllowed(config.url);
    config.metadata = { startTime: new Date() };
    return config;
  }

  private async requestInterceptorOnRejected(error: any) {
    this.assertRequestAllowed(error.url);
    return Promise.reject(error);
  }

  private async responseInterceptorOnFulfilled(response: AxiosResponse) {
    this.calculateRequestDuration(response.config as MyRequestConfig);
    if (!(response as CacheAxiosResponse).cached) {
      await this.logResponseTime(response.config as MyRequestConfig, response.status);
    }
    return response;
  }

  private async responseInterceptorOnRejected(error: AxiosError): Promise<never> {
    this.calculateRequestDuration(error.config as MyRequestConfig);
    const status = error.response?.status ?? 400;
    await this.logResponseTime(error.config as MyRequestConfig, status);
    await this.kafkaManager.sendLogs([
      {
        logLevel: 'error',
        message: this.generateAxiosErrorMessage(error),
        timestamp: Date.now(),
        blueprintId: this.blueprintId,
        extras: { requestId: this.requestId },
      },
    ]);
    return Promise.reject(error);
  }

  private async logResponseTime(config: MyRequestConfig, status: number) {
    await this.kafkaManager.sendResponseTimeToKafka(config, status, this.blueprintId, this.requestId);
  }

  private calculateRequestDuration(config: MyRequestConfig) {
    config.metadata.endTime = new Date();
    config.metadata.duration = config.metadata.endTime.getTime() - config.metadata.startTime.getTime();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private assertRequestAllowed(_: string) {
    //Check if request allowed - not implemented yet
  }

  private generateAxiosErrorMessage(e: AxiosError) {
    return `Axios Error when calling ${e.config?.method}, url: ${e.request?.url}, params: ${JSON.stringify(
      e.config?.params,
    )}, code: ${e.code}, status: ${e.response?.status}, statusText: ${e.response?.statusText}, errorName: ${
      e.name
    }, message: ${e.message}, stackTrace: ${e.stack}`;
  }
}
