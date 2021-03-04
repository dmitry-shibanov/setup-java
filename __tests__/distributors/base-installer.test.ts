import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

import path from 'path';
import * as semver from 'semver';

import { JavaBase } from '../../src/distributors/base-installer';
import {
  JavaDownloadRelease,
  JavaInstallerOptions,
  JavaInstallerResults
} from '../../src/distributors/base-models';

class EmptyJavaBase extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions) {
    super('Empty', installerOptions);
  }

  protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
    return {
      javaVersion: '11.0.8',
      javaPath: `/toolcache/${this.toolcacheFolderName}/11.0.8`
    };
  }

  protected async findPackageForDownload(range: semver.Range): Promise<JavaDownloadRelease> {
    const availableVersion = '11.0.8';
    if (!semver.satisfies(availableVersion, range)) {
      throw new Error('Available version not found');
    }

    return {
      version: availableVersion,
      url: `some/random_url/java/${availableVersion}`
    };
  }
}

describe('findInToolcache', () => {
  const actualJavaVersion = '11.1.10';
  const javaPath = path.join('Java_Empty_jdk', actualJavaVersion, 'x64');

  let mockJavaBase: EmptyJavaBase;
  let tcFind: jest.SpyInstance;

  beforeEach(() => {
    tcFind = jest.spyOn(tc, 'find');
    tcFind.mockImplementation((toolname: string, javaVersion: string, architecture: string) => {
      const semverVersion = new semver.Range(javaVersion);

      if (path.basename(javaPath) !== architecture || !javaPath.includes(toolname)) {
        return '';
      }

      return semver.satisfies(actualJavaVersion, semverVersion) ? javaPath : '';
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
      { javaVersion: actualJavaVersion, javaPath }
    ],
    [
      { version: '11.1', arch: 'x64', packageType: 'jdk' },
      { javaVersion: actualJavaVersion, javaPath }
    ],
    [
      { version: '11.1.10', arch: 'x64', packageType: 'jdk' },
      { javaVersion: actualJavaVersion, javaPath }
    ],
    [{ version: '11', arch: 'x64', packageType: 'jre' }, null],
    [{ version: '8', arch: 'x64', packageType: 'jdk' }, null],
    [{ version: '11', arch: 'x86', packageType: 'jdk' }, null],
    [{ version: '11', arch: 'x86', packageType: 'jre' }, null]
  ])(`should find java for path %s -> %s`, (input, expected) => {
    mockJavaBase = new EmptyJavaBase(input);
    expect(mockJavaBase['findInToolcache']()).toEqual(expected);
  });
});

describe('setupJava', () => {
  const actualJavaVersion = '11.1.10';
  const javaPath = path.join('Java_Empty_jdk', actualJavaVersion, 'x86');

  let mockJavaBase: EmptyJavaBase;

  let tcFind: jest.SpyInstance;
  let coreDebug: jest.SpyInstance;
  let coreInfo: jest.SpyInstance;
  let coreExportVariable: jest.SpyInstance;
  let coreAddPath: jest.SpyInstance;
  let coreSetOutput: jest.SpyInstance;

  beforeEach(() => {
    tcFind = jest.spyOn(tc, 'find');
    tcFind.mockImplementation((toolname: string, javaVersion: string, architecture: string) => {
      const semverVersion = new semver.Range(javaVersion);

      if (path.basename(javaPath) !== architecture || !javaPath.includes(toolname)) {
        return '';
      }

      return semver.satisfies(actualJavaVersion, semverVersion) ? javaPath : '';
    });

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
    [
      { version: '11', arch: 'x86', packageType: 'jdk' },
      { javaVersion: actualJavaVersion, javaPath }
    ],
    [
      { version: '11.1', arch: 'x86', packageType: 'jdk' },
      { javaVersion: actualJavaVersion, javaPath }
    ],
    [
      { version: '11.1.10', arch: 'x86', packageType: 'jdk' },
      { javaVersion: actualJavaVersion, javaPath }
    ]
  ])('should find java for path %s -> %s', (input, expected) => {
    mockJavaBase = new EmptyJavaBase(input);
    expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(tcFind).toHaveBeenCalled();
  });

  it.each([
    [
      { version: '11', arch: 'x86', packageType: 'jre' },
      { javaPath: `/toolcache/Java_Empty_jre/11.0.8`, javaVersion: '11.0.8' }
    ],
    [
      { version: '11', arch: 'x64', packageType: 'jdk' },
      { javaPath: `/toolcache/Java_Empty_jdk/11.0.8`, javaVersion: '11.0.8' }
    ],
    [
      { version: '11', arch: 'x64', packageType: 'jre' },
      { javaPath: `/toolcache/Java_Empty_jre/11.0.8`, javaVersion: '11.0.8' }
    ]
  ])('download java', async (input, expected) => {
    mockJavaBase = new EmptyJavaBase(input);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(tcFind).toHaveBeenCalled();
    expect(coreAddPath).toHaveBeenCalled();
    expect(coreExportVariable).toHaveBeenCalled();
    expect(coreSetOutput).toHaveBeenCalled();
  });

  it.each([
    [{ version: '15', arch: 'x86', packageType: 'jre' }],
    [{ version: '11.0.7', arch: 'x64', packageType: 'jre' }]
  ])('should throw an error for Available version not found', async input => {
    mockJavaBase = new EmptyJavaBase(input);
    await expect(mockJavaBase.setupJava()).rejects.toThrowError('Available version not found');
    expect(tcFind).toHaveBeenCalled();
    expect(coreAddPath).not.toHaveBeenCalled();
    expect(coreExportVariable).not.toHaveBeenCalled();
    expect(coreSetOutput).not.toHaveBeenCalled();
  });
});

describe('normalizeVersion', () => {
  const DummyJavaBase = JavaBase as any;

  it.each([
    ['11', { version: new semver.Range('11'), stable: true }],
    ['11.0', { version: new semver.Range('11.0'), stable: true }],
    ['11.0.10', { version: new semver.Range('11.0.10'), stable: true }],
    ['11-ea', { version: new semver.Range('11'), stable: false }],
    ['11.0.2-ea', { version: new semver.Range('11.0.2'), stable: false }]
  ])('normalizeVersion from %s to %s', (input, expected) => {
    expect(DummyJavaBase.prototype.normalizeVersion.call(null, input)).toEqual(expected);
  });

  it('normalizeVersion should throw an error for non semver', () => {
    const version = '11g';
    expect(DummyJavaBase.prototype.normalizeVersion.bind(null, version)).toThrowError(
      `The string '${version}' is not valid SemVer notation for Java version. Please check README file for code snippets and more detailed information`
    );
  });
});
