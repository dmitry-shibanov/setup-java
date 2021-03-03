import fs from 'fs';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import * as ifm from '@actions/http-client/interfaces';
import { HttpClient } from '@actions/http-client';

import path from 'path';
import * as semver from 'semver';

import * as utils from '../../src/util';
import { ZuluDistributor } from '../../src/distributors/zulu/installer';
import { IZuluVersions } from '../../src/distributors/zulu/models';

let manifestData = require('../data/zulu/zulu-releases-default.json');

describe('getAvailableVersions', () => {
  let spyHttpClient: jest.SpyInstance;
  let zuluDistributor: ZuluDistributor;
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockImplementation(
      async (): Promise<ifm.ITypedResponse<IZuluVersions[]>> => {
        const result = JSON.stringify(manifestData);
        return {
          statusCode: 200,
          headers: {},
          result: JSON.parse(result) as IZuluVersions[]
        };
      }
    );

    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'darwin'
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    [
      { version: '11', arch: 'x86', packageType: 'jdk' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=32&release_status=ga`
    ],
    [
      { version: '11', arch: 'x86', packageType: 'jre' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jre&javafx=false&arch=x86&hw_bitness=32&release_status=ga`
    ],
    [
      { version: '11-ea', arch: 'x86', packageType: 'jdk' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=32&release_status=ea`
    ],
    [
      { version: '8', arch: 'x86', packageType: 'jdk' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=32&release_status=ga`
    ],
    [
      { version: '8', arch: 'x86', packageType: 'jdk+fx' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=true&arch=x86&hw_bitness=32&release_status=ga&features=fx`
    ],
    [
      { version: '8-ea', arch: 'x86', packageType: 'jdk+fx' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=true&arch=x86&hw_bitness=32&release_status=ea&features=fx`
    ],
    [
      { version: '8', arch: 'x64', packageType: 'jdk' },
      `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=macos&ext=tar.gz&bundle_type=jdk&javafx=false&arch=x86&hw_bitness=64&release_status=ga`
    ]
  ])('get right url for %o -> $s', async (input, parsedUrl) => {
    spyHttpClient.mockImplementation(
      async (url): Promise<ifm.ITypedResponse<any>> => {
        const result = JSON.stringify(manifestData);
        return {
          statusCode: 200,
          headers: {},
          result: [
            {
              url: url,
              jdk_version: []
            }
          ]
        };
      }
    );

    zuluDistributor = new ZuluDistributor(input);
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    const releaseCheck = await zuluDistributorPrototype.getAvailableVersions.call(zuluDistributor);
    expect(releaseCheck[0].url).toEqual(parsedUrl);
  });

  it('load available versions', async () => {
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    await expect(
      zuluDistributorPrototype.getAvailableVersions.call(zuluDistributor)
    ).resolves.not.toBeNull();
  });

  it('Error is thrown for empty response', async () => {
    spyHttpClient.mockImplementationOnce(
      async (): Promise<ifm.ITypedResponse<IZuluVersions[]>> => {
        return {
          statusCode: 200,
          headers: {},
          result: [] as IZuluVersions[]
        };
      }
    );
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    await expect(
      zuluDistributorPrototype.getAvailableVersions.call(zuluDistributor)
    ).rejects.toThrowError(/No versions were found using url */);
  });

  it('Error is thrown for undefined', async () => {
    spyHttpClient.mockImplementationOnce(
      async (): Promise<ifm.ITypedResponse<IZuluVersions[] | undefined>> => {
        return {
          statusCode: 200,
          headers: {},
          result: undefined
        };
      }
    );
    zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    await expect(
      zuluDistributorPrototype.getAvailableVersions.call(zuluDistributor)
    ).rejects.toThrowError(/No versions were found using url */);
  });
});

describe('getArchitectureOptions', () => {
  let zuluDistributor = new ZuluDistributor({ version: '11', arch: 'x86', packageType: 'jdk' });
  const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);

  it.each([
    [{ architecture: 'x64' }, { arch: 'x86', hw_bitness: '64', abi: '' }],
    [{ architecture: 'x86' }, { arch: 'x86', hw_bitness: '32', abi: '' }],
    [{ architecture: 'x32' }, { arch: 'x32', hw_bitness: '', abi: '' }]
  ])('%o -> %o', (input, expected) => {
    expect(zuluDistributorPrototype.getArchitectureOptions.call(input)).toEqual(expected);
  });
});

describe('findPackageForDownload', () => {
  let spyHttpClient: jest.SpyInstance;
  let zuluDistributor: ZuluDistributor;

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockImplementation(
      async (url): Promise<ifm.ITypedResponse<IZuluVersions[]>> => {
        manifestData = require('../data/zulu/zulu-releases-default.json');
        if (url.includes('javafx=true')) {
          manifestData = require('../data/zulu/zulu-releases-fx.json');
        }

        if (url.includes('release_status=ea')) {
          manifestData = require('../data/zulu/zulu-releases-ea.json');
        }

        if (url.includes('bundle_type=jdk')) {
          manifestData = manifestData.filter((item: any) => item.name.includes('-jdk'));
        } else {
          manifestData = manifestData.filter((item: any) => item.name.includes('-jre'));
        }

        const result = JSON.stringify(manifestData);
        return {
          statusCode: 200,
          headers: {},
          result: JSON.parse(result) as IZuluVersions[]
        };
      }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    // jdk

    [
      '8',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-jdk8.0.282-macosx_x64.tar.gz'
      },
      { version: '8', arch: 'x86', packageType: 'jdk' }
    ],
    [
      '11',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-jdk11.0.10-macosx_x64.tar.gz'
      },
      { version: '11', arch: 'x86', packageType: 'jdk' }
    ],
    [
      '8.0',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-jdk8.0.282-macosx_x64.tar.gz'
      },
      { version: '8.0', arch: 'x86', packageType: 'jdk' }
    ],
    [
      '11.0',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-jdk11.0.10-macosx_x64.tar.gz'
      },
      { version: '11.0', arch: 'x86', packageType: 'jdk' }
    ],
    [
      '8',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-fx-jdk8.0.282-macosx_x64.tar.gz'
      },
      { version: '8', arch: 'x86', packageType: 'jdk+fx' }
    ],
    [
      '11',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-fx-jdk11.0.10-macosx_x64.tar.gz'
      },
      { version: '11', arch: 'x86', packageType: 'jdk+fx' }
    ],
    [
      '15',
      {
        version: '15.0.2',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu15.29.15-ca-jdk15.0.2-macosx_x64.tar.gz'
      },
      { version: '15', arch: 'x86', packageType: 'jdk' }
    ],
    [
      '15-ea',
      {
        version: '15.0.0',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu15.0.25-ea-jdk15.0.0-ea.11-macosx_x64.tar.gz'
      },
      { version: '15-ea', arch: 'x86', packageType: 'jdk' }
    ],

    // jre

    [
      '8',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-jre8.0.282-macosx_x64.tar.gz'
      },
      { version: '8', arch: 'x86', packageType: 'jre' }
    ],
    [
      '11',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-jre11.0.10-macosx_x64.tar.gz'
      },
      { version: '11', arch: 'x86', packageType: 'jre' }
    ],
    [
      '8.0',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-jre8.0.282-macosx_x64.tar.gz'
      },
      { version: '8.0', arch: 'x86', packageType: 'jre' }
    ],
    [
      '11.0',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-jre11.0.10-macosx_x64.tar.gz'
      },
      { version: '11.0', arch: 'x86', packageType: 'jre' }
    ],
    [
      '8',
      {
        version: '8.0.282',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu8.52.0.23-ca-fx-jre8.0.282-macosx_x64.tar.gz'
      },
      { version: '8', arch: 'x86', packageType: 'jre+fx' }
    ],
    [
      '11',
      {
        version: '11.0.10',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu11.45.27-ca-fx-jre11.0.10-macosx_x64.tar.gz'
      },
      { version: '11', arch: 'x86', packageType: 'jre+fx' }
    ],
    [
      '15',
      {
        version: '15.0.2',
        url: 'https://fake.cdn.azul.com/zulu/bin/zulu15.29.15-ca-jre15.0.2-macosx_x64.tar.gz'
      },
      { version: '15', arch: 'x86', packageType: 'jre' }
    ]
  ])('version is %s -> %o', async (functionInput, expected, constructorInput) => {
    let zuluDistributor = new ZuluDistributor(constructorInput);
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    const result = await zuluDistributorPrototype.findPackageForDownload.call(
      zuluDistributor,
      zuluDistributor['version']
    );

    expect(result).toEqual(expected);
  });

  it('Should throw an error', async () => {
    zuluDistributor = new ZuluDistributor({ version: '18', arch: 'x86', packageType: 'jdk' });
    const zuluDistributorPrototype = Object.getPrototypeOf(zuluDistributor);
    await expect(
      zuluDistributorPrototype.findPackageForDownload.call(
        zuluDistributor,
        zuluDistributor['version']
      )
    ).rejects.toThrowError(/Could not find satisfied version for semver */);
  });
});

describe('setupJava', () => {
  let spyHttpClient: jest.SpyInstance;
  const actualJavaVersion = '18.1.10';
  const javaPath = path.join('Java_Zulu_jdk', actualJavaVersion, 'x86');
  let zuluDistributor: ZuluDistributor;
  let tcFind: jest.SpyInstance;
  let tcDownloadTool: jest.SpyInstance;
  let tcCacheDir: jest.SpyInstance;
  let coreDebug: jest.SpyInstance;
  let coreInfo: jest.SpyInstance;
  let coreExportVariable: jest.SpyInstance;
  let coreAddPath: jest.SpyInstance;
  let coreSetOutput: jest.SpyInstance;
  let spyFsReadDir: jest.SpyInstance;

  let utilsExtractJdkFile: jest.SpyInstance;

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockImplementation(
      async (url): Promise<ifm.ITypedResponse<IZuluVersions[]>> => {
        manifestData = require('../data/zulu/zulu-releases-default.json');
        if (url.includes('javafx=true')) {
          manifestData = require('../data/zulu/zulu-releases-fx.json');
        }

        if (url.includes('release_status=ea')) {
          manifestData = require('../data/zulu/zulu-releases-ea.json');
        }

        if (url.includes('bundle_type=jdk')) {
          manifestData = manifestData.filter((item: any) => item.name.includes('-jdk'));
        } else {
          manifestData = manifestData.filter((item: any) => item.name.includes('-jre'));
        }

        const result = JSON.stringify(manifestData);
        return {
          statusCode: 200,
          headers: {},
          result: JSON.parse(result) as IZuluVersions[]
        };
      }
    );

    // Spy on toolcache methods

    tcFind = jest.spyOn(tc, 'find');
    tcFind.mockImplementation((toolname: string, javaVersion: string, architecture: string) => {
      const semverVersion = new semver.Range(javaVersion);

      if (path.basename(javaPath) !== architecture || !javaPath.includes(toolname)) {
        return '';
      }

      return semver.satisfies(actualJavaVersion, semverVersion) ? javaPath : '';
    });

    tcDownloadTool = jest.spyOn(tc, 'downloadTool');
    tcDownloadTool.mockImplementation(() => 'javaArchive');

    tcCacheDir = jest.spyOn(tc, 'cacheDir');
    tcCacheDir.mockImplementation(
      (archivePath: string, toolcacheFolderName: string, version: string, architecture: string) =>
        path.join(toolcacheFolderName, version, architecture)
    );

    // Spy on util methods

    utilsExtractJdkFile = jest.spyOn(utils, 'extractJdkFile');
    utilsExtractJdkFile.mockImplementation(() => 'some/random/path/');

    // Spy on fs methods
    spyFsReadDir = jest.spyOn(fs, 'readdirSync');
    spyFsReadDir.mockImplementation(() => ['JavaTest']);

    // Spy on core methods

    coreDebug = jest.spyOn(core, 'debug');
    coreDebug.mockImplementation(() => undefined);

    coreInfo = jest.spyOn(core, 'info');
    coreInfo.mockImplementation(() => undefined);

    coreAddPath = jest.spyOn(core, 'addPath');
    coreAddPath.mockImplementation(() => undefined);

    coreExportVariable = jest.spyOn(core, 'exportVariable');
    coreExportVariable.mockImplementation(() => undefined);

    coreSetOutput = jest.spyOn(core, 'setOutput');
    coreSetOutput.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    // jdk

    [
      { version: '8', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jdk/8.0.282/x86' }
    ],
    [
      { version: '11', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jdk/11.0.10/x86' }
    ],
    [
      { version: '8.0', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jdk/8.0.282/x86' }
    ],
    [
      { version: '11.0', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jdk/11.0.10/x86' }
    ],
    [
      { version: '8', arch: 'x86', packageType: 'jdk+fx' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jdk+fx/8.0.282/x86' }
    ],
    [
      { version: '11', arch: 'x86', packageType: 'jdk+fx' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jdk+fx/11.0.10/x86' }
    ],
    [
      { version: '15', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '15.0.2', javaPath: 'Java_Zulu_jdk/15.0.2/x86' }
    ],
    [
      { version: '15-ea', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '15.0.0', javaPath: 'Java_Zulu_jdk/15.0.0/x86' }
    ],

    // jre

    [
      { version: '8', arch: 'x86', packageType: 'jre' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jre/8.0.282/x86' }
    ],
    [
      { version: '11', arch: 'x86', packageType: 'jre' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jre/11.0.10/x86' }
    ],
    [
      { version: '8.0', arch: 'x86', packageType: 'jre' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jre/8.0.282/x86' }
    ],
    [
      { version: '11.0', arch: 'x86', packageType: 'jre' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jre/11.0.10/x86' }
    ],
    [
      { version: '8', arch: 'x86', packageType: 'jre+fx' },
      { javaVersion: '8.0.282', javaPath: 'Java_Zulu_jre+fx/8.0.282/x86' }
    ],
    [
      { version: '11', arch: 'x86', packageType: 'jre+fx' },
      { javaVersion: '11.0.10', javaPath: 'Java_Zulu_jre+fx/11.0.10/x86' }
    ],
    [
      { version: '15', arch: 'x86', packageType: 'jre' },
      { javaVersion: '15.0.2', javaPath: 'Java_Zulu_jre/15.0.2/x86' }
    ],

    // in toolcache
    [
      { version: '18', arch: 'x86', packageType: 'jdk' },
      { javaVersion: '18.1.10', javaPath: 'Java_Zulu_jdk/18.1.10/x86' }
    ]
  ])('input %o -> result %o', async (input, expected) => {
    let zuluDistributor = new ZuluDistributor(input);
    await expect(zuluDistributor.setupJava()).resolves.toEqual(expected);
    if (input.version.startsWith('18')) {
      expect(tcCacheDir).not.toHaveBeenCalled();
    }
  });
});
