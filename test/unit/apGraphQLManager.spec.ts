import { ApAxiosManager, ApGraphQLManager } from '../../src';
import { ArchiveLogger } from '../../src/logger';
import { failTest } from '../utils';
import { expect } from '@jest/globals';
import axios, { AxiosError } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { KafkaManager } from 'logging-library';

const subgraphURL = 'https://api.thegraph.com/subgraphs/name/gammastrategies/algebra-polygon';

type TestData = {
  data: {
    pools: {
      id: string;
    }[];
  };
};

describe('APGraphQLManager', () => {
  let am: ApAxiosManager;
  let mock;
  let graphQL: ApGraphQLManager;
  const expectedFirstSyncBlock = 123;

  function mockSubgraphReply(mock: MockAdapter) {
    mock.onPost().reply(200, {
      data: {
        pools: [{ id: 1 }, { id: 2 }],
      },
    });
  }

  beforeAll(async () => {
    mock = new MockAdapter(axios);
    const kafkaManager = KafkaManager.getInstance();
    am = new ApAxiosManager('BLUEPRINT-ID', kafkaManager);
    am.setup({});
    graphQL = new ApGraphQLManager(am, subgraphURL);

    jest.mock('../../src/logger', () => {
      return {
        ArchiveLogger: jest.fn().mockImplementation(() => {
          return {};
        }),
      };
    });
    // To avoid TypeError: request is not a function of kafkajs
    ArchiveLogger.getKafkaConfig = jest.fn().mockReturnValue({
      brokers: ['mock-broker-url'],
    });
    jest.spyOn(KafkaManager.prototype, 'sendLogs').mockImplementation(async () => {
      jest.fn();
    });
  });

  afterEach(() => {
    mock.reset();
    jest.clearAllMocks();
  });

  it('should throw exception is Axios returns error', async () => {
    mock.onPost().networkErrorOnce();
    try {
      await graphQL.executeGraphQLQueryOrThrowError<TestData>('payload-does-not-matter', 1);
      failTest();
    } catch (e) {
      expect(e).toBeInstanceOf(AxiosError);
    }
  });

  it('should be able to request data if subgraph synced up to that block', async () => {
    const newerBlockNumber = expectedFirstSyncBlock + 1;
    mockSubgraphReply(mock);
    const response = await graphQL.executeGraphQLQueryOrThrowError<TestData>(
      'payload-does-not-matter',
      newerBlockNumber,
    );
    expect(response.data.pools.length).toBe(2);
    expect(response.data.pools[0].id).toBe(1);
    expect(response.data.pools[1].id).toBe(2);
  });
});
