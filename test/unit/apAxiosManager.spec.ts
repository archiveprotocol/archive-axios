import { ApAxiosManager, CacheDuration, MyRequestConfig } from '../../src';
import { expect } from '@jest/globals';
import axios from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import { CacheAxiosResponse } from 'axios-cache-interceptor/src/cache/axios';
import MockAdapter from 'axios-mock-adapter';
import { KafkaManager } from 'logging-library';

describe('AxiosManager', () => {
  let am: ApAxiosManager;
  let url: string;
  let mock;

  beforeAll(async () => {
    mock = new MockAdapter(axios);
    const kafkaManager = KafkaManager.getInstance();
    am = new ApAxiosManager('BLUEPRINT-ID', kafkaManager);
    am.setup({});
  });

  afterEach(() => {
    mock.reset();
  });

  it('should set the duration correctly', async function () {
    mock.onGet().reply(200, { data: 1 });
    mock.onPost().reply(200, { data: 1 });
    const axiosInstance = (await am.cacheToAxiosInstance.get(CacheDuration.NO_CACHE)) as AxiosCacheInstance;
    const response = await axiosInstance.get('http://localhost:1234');
    expect((response.config as MyRequestConfig).metadata.duration).toBeDefined();
  });

  it('make sure requests are cached', async function () {
    mock.onGet().reply(200, { data: 1 });
    mock.onPost().reply(200, { data: 1 });
    const axiosInstance = await am.cacheToAxiosInstance.get(CacheDuration.SHORT_CACHE_DURATION);

    const req1: Promise<CacheAxiosResponse> = axiosInstance.get(url);
    const req2: Promise<CacheAxiosResponse> = axiosInstance.get(url);
    await axiosInstance.get<{ auth: { status: string } }>('url', {});
    const res1 = await req1;
    const res2 = await req2;
    expect(res1.cached).toBeFalsy();
    expect(res2.cached).toBeTruthy();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });
});
