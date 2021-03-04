import { HttpClient } from '@actions/http-client';

import * as semver from 'semver';

import { AdoptiumDistributor } from '../../src/distributors/adoptium/installer';
import { JavaInstallerOptions } from '../../src/distributors/base-models';

let manifestData = require('../data/adoptium.json') as [];

describe('getAvailableVersions', () => {
  let spyHttpClient: jest.SpyInstance;

  describe('build correct url', () => {
    beforeEach(() => {
      spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
      spyHttpClient.mockReturnValue({
        statusCode: 200,
        headers: {},
        result: []
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it.each([
      [
        { version: '11', arch: 'x64', packageType: 'jdk' },
        'os=mac&architecture=x64&image_type=jdk&release_type=ga&page_size=20&page=0'
      ],
      [
        { version: '11', arch: 'x86', packageType: 'jdk' },
        'os=mac&architecture=x86&image_type=jdk&release_type=ga&page_size=20&page=0'
      ],
      [
        { version: '11', arch: 'x64', packageType: 'jre' },
        'os=mac&architecture=x64&image_type=jre&release_type=ga&page_size=20&page=0'
      ],
      [
        { version: '11-ea', arch: 'x64', packageType: 'jdk' },
        'os=mac&architecture=x64&image_type=jdk&release_type=ea&page_size=20&page=0'
      ]
    ])(
      'build correct url for %o',
      async (installerOptions: JavaInstallerOptions, expectedParameters) => {
        const distributor = new AdoptiumDistributor(installerOptions);
        const baseUrl = 'https://api.adoptopenjdk.net/v3/assets/version/%5B1.0,100.0%5D';
        const expectedUrl = `${baseUrl}?project=jdk&vendor=adoptopenjdk&heap_size=normal&jvm_impl=hotspot&sort_method=DEFAULT&sort_order=DESC&${expectedParameters}`;
        distributor['getPlatformOption'] = () => 'mac';
        await distributor['getAvailableVersions']();
        expect(spyHttpClient.mock.calls).toHaveLength(1);
        expect(spyHttpClient.mock.calls[0][0]).toBe(expectedUrl);
      }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('load available versions', async () => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient
      .mockReturnValueOnce({
        statusCode: 200,
        headers: {},
        result: manifestData
      })
      .mockReturnValueOnce({
        statusCode: 200,
        headers: {},
        result: manifestData
      })
      .mockReturnValueOnce({
        statusCode: 200,
        headers: {},
        result: []
      });

    const distributor = new AdoptiumDistributor({ version: '11', arch: 'x64', packageType: 'jdk' });
    const availableVersions = await distributor['getAvailableVersions']();
    expect(availableVersions).not.toBeNull();
    expect(availableVersions.length).toBe(manifestData.length * 2);
  });
});

describe('findPackageForDownload', () => {
  describe('version is resolved correctly', () => {
    it.each([
      ['9', '9.0.7+10'],
      ['15', '15.0.2+7'],
      ['15.0', '15.0.2+7'],
      ['15.0.2', '15.0.2+7'],
      ['15.0.1', '15.0.1+9.1'],
      //['15.0.1.9', '15.0.1+9.1'], // is not supported yet
      ['11.x', '11.0.10+9'],
      ['x', '15.0.2+7'],
      ['12', '12.0.2+10.3'] // make sure that '12.0.2+10.1', '12.0.2+10.3', '12.0.2+10.2' are sorted correctly
    ])('%s -> %s', async (input, expected) => {
      const distributor = new AdoptiumDistributor({
        version: '11',
        arch: 'x64',
        packageType: 'jdk'
      });
      distributor['getAvailableVersions'] = async () => manifestData;
      const resolvedVersion = await distributor['findPackageForDownload'](new semver.Range(input));
      expect(resolvedVersion.version).toBe(expected);
    });
  });

  it('version is found but binaries list is empty', async () => {
    const distributor = new AdoptiumDistributor({ version: '11', arch: 'x64', packageType: 'jdk' });
    distributor['getAvailableVersions'] = async () => manifestData;
    await expect(
      distributor['findPackageForDownload'](new semver.Range('9.0.8'))
    ).rejects.toThrowError(/Could not find satisfied version for semver */);
  });

  it('version is not found', async () => {
    const distributor = new AdoptiumDistributor({ version: '11', arch: 'x64', packageType: 'jdk' });
    distributor['getAvailableVersions'] = async () => manifestData;
    await expect(
      distributor['findPackageForDownload'](new semver.Range('7.x'))
    ).rejects.toThrowError(/Could not find satisfied version for semver */);
  });

  it('version list is empty', async () => {
    const distributor = new AdoptiumDistributor({ version: '11', arch: 'x64', packageType: 'jdk' });
    distributor['getAvailableVersions'] = async () => [];
    await expect(
      distributor['findPackageForDownload'](new semver.Range('11'))
    ).rejects.toThrowError(/Could not find satisfied version for semver */);
  });
});
