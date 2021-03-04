import { HttpClient } from '@actions/http-client';
import { ZuluDistributor } from '../../src/distributors/zulu/installer';
import { IZuluVersions } from '../../src/distributors/zulu/models';

let manifestData = require('../data/zulu/zulu-releases-default.json');

describe('getAvailableVersions', () => {
  let spyHttpClient: jest.SpyInstance;
  let zuluDistributor: ZuluDistributor;
  const result = JSON.stringify(manifestData);

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockReturnValue({
      statusCode: 200,
      headers: {},
      result: JSON.parse(result) as IZuluVersions[]
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    [
      { version: '11', arch: 'x86', packageType: 'jdk' },
      '?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=32&release_status=ga'
    ],
    [
      { version: '11-ea', arch: 'x86', packageType: 'jdk' },
      '?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=32&release_status=ea'
    ],
    [
      { version: '8', arch: 'x64', packageType: 'jdk' },
      '?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=64&release_status=ga'
    ],
    [
      { version: '8', arch: 'x64', packageType: 'jre' },
      '?os=macos&ext=tar.gz&bundle_type=jre&javafx=false&arch=x86&hw_bitness=64&release_status=ga'
    ],
    [
      { version: '8', arch: 'x64', packageType: 'jdk+fx' },
      '?os=macos&ext=tar.gz&bundle_type=jdk&javafx=true&arch=x86&hw_bitness=64&release_status=ga&features=fx'
    ],
    [
      { version: '8', arch: 'x64', packageType: 'jre+fx' },
      '?os=macos&ext=tar.gz&bundle_type=jre&javafx=true&arch=x86&hw_bitness=64&release_status=ga&features=fx'
    ]
  ])('build correct url for %s -> $s', async (input, parsedUrl) => {
    zuluDistributor = new ZuluDistributor(input);
    zuluDistributor['getPlatformOption'] = () => 'macos';
    const buildUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/${parsedUrl}`;
    const releaseCheck = await zuluDistributor['getAvailableVersions']();
    expect(spyHttpClient.mock.calls).toHaveLength(1);
    expect(spyHttpClient.mock.calls[0][0]).toBe(buildUrl);
  });

  it('load available versions', async () => {
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    await expect(zuluDistributor['getAvailableVersions']()).resolves.not.toBeNull();
  });

  it('Error is thrown for empty response', async () => {
    spyHttpClient.mockReturnValue({
      statusCode: 200,
      headers: {},
      result: [] as IZuluVersions[]
    });
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    await expect(zuluDistributor['getAvailableVersions']()).rejects.toThrowError(
      /No versions were found using url */
    );
  });

  it('Error is thrown for undefined', async () => {
    spyHttpClient.mockReturnValue({
      statusCode: 200,
      headers: {},
      result: undefined
    });
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    await expect(zuluDistributor['getAvailableVersions']()).rejects.toThrowError(
      /No versions were found using url */
    );
  });
});

describe('getArchitectureOptions', () => {
  it.each([
    [{ architecture: 'x64' }, { arch: 'x86', hw_bitness: '64', abi: '' }],
    [{ architecture: 'x86' }, { arch: 'x86', hw_bitness: '32', abi: '' }],
    [{ architecture: 'x32' }, { arch: 'x32', hw_bitness: '', abi: '' }],
    [{ architecture: 'arm' }, { arch: 'arm', hw_bitness: '', abi: '' }]
  ])('%s -> %', (input, expected) => {
    let zuluDistributor = new ZuluDistributor({
      version: '11',
      arch: input.architecture,
      packageType: 'jdk'
    });
    expect(zuluDistributor['getArchitectureOptions']()).toEqual(expected);
  });
});

describe('findPackageForDownload', () => {
  let spyHttpClient: jest.SpyInstance;
  let zuluDistributor: ZuluDistributor;
  const result = JSON.stringify(manifestData);

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockReturnValue({
      statusCode: 200,
      headers: {},
      result: JSON.parse(result)
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    // jdk

    [{ version: '8', arch: 'x86', packageType: 'jdk' }, '8.0.282'],
    [{ version: '11', arch: 'x86', packageType: 'jdk' }, '11.0.10'],
    [{ version: '8.0', arch: 'x86', packageType: 'jdk' }, '8.0.282'],
    [{ version: '11.0', arch: 'x86', packageType: 'jdk' }, '11.0.10'],
    [{ version: '8', arch: 'x86', packageType: 'jdk+fx' }, '8.0.282'],
    [{ version: '11', arch: 'x86', packageType: 'jdk+fx' }, '11.0.10'],
    [{ version: '15', arch: 'x86', packageType: 'jdk' }, '15.0.2'],
    [{ version: '15-ea', arch: 'x86', packageType: 'jdk' }, '15.0.2']
  ])('version is %s -> %s', async (constructorInput, expected) => {
    let zuluDistributor = new ZuluDistributor(constructorInput);
    const result = await zuluDistributor['findPackageForDownload'](zuluDistributor['version']);

    expect(result.version).toBe(expected);
  });

  it('Should throw an error', async () => {
    zuluDistributor = new ZuluDistributor({ version: '18', arch: 'x86', packageType: 'jdk' });
    await expect(
      zuluDistributor['findPackageForDownload'](zuluDistributor['version'])
    ).rejects.toThrowError(/Could not find satisfied version for semver */);
  });
});
