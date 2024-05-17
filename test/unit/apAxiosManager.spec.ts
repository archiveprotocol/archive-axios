import { ApAxiosManager, CacheDuration, MyRequestConfig } from '../../src';
import { expect } from '@jest/globals';
import axios from 'axios';
import { AxiosCacheInstance } from 'axios-cache-interceptor';
import MockAdapter from 'axios-mock-adapter';
import { KafkaManager } from 'logging-library';

describe('AxiosManager', () => {
  let am: ApAxiosManager;
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
});
