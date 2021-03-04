import fs from 'fs';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

import path from 'path';
import * as semver from 'semver';
import * as utils from '../../src/util';

import { LocalDistributor } from '../../src/distributors/local/installer';

describe('setupJava', () => {
  const actualJavaVersion = '11.1.10';
  const javaPath = path.join('Java_LocalJDKFile_jdk', actualJavaVersion, 'x86');

  let mockJavaBase: LocalDistributor;

  let tcFind: jest.SpyInstance;
  let coreDebug: jest.SpyInstance;
  let coreInfo: jest.SpyInstance;
  let coreExportVariable: jest.SpyInstance;
  let coreAddPath: jest.SpyInstance;
  let coreSetOutput: jest.SpyInstance;
  let fsStat: jest.SpyInstance;
  let spyFsReadDir: jest.SpyInstance;
  let utilsExtractJdkFile: jest.SpyInstance;
  let resolvePath: jest.SpyInstance;
  let tcCacheDir: jest.SpyInstance;
  let expectedJdkFile = 'JavaLocalJdkFile';

  beforeEach(() => {
    tcFind = jest.spyOn(tc, 'find');
    tcFind.mockImplementation((toolname: string, javaVersion: string, architecture: string) => {
      const semverVersion = new semver.Range(javaVersion);

      if (path.basename(javaPath) !== architecture || !javaPath.includes(toolname)) {
        return '';
      }

      return semver.satisfies(actualJavaVersion, semverVersion) ? javaPath : '';
    });

    tcCacheDir = jest.spyOn(tc, 'cacheDir');
    tcCacheDir.mockImplementation(
      (archivePath: string, toolcacheFolderName: string, version: string, architecture: string) =>
        path.join(toolcacheFolderName, version, architecture)
    );

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

    // Spy on fs methods
    spyFsReadDir = jest.spyOn(fs, 'readdirSync');
    spyFsReadDir.mockImplementation(() => ['JavaTest']);

    fsStat = jest.spyOn(fs, 'statSync');
    fsStat.mockImplementation((file: string) => {
      return { isFile: () => file === expectedJdkFile };
    });

    // Spy on util methods
    utilsExtractJdkFile = jest.spyOn(utils, 'extractJdkFile');
    utilsExtractJdkFile.mockImplementation(() => 'some/random/path/');

    // Spy on path methods
    resolvePath = jest.spyOn(path, 'resolve');
    resolvePath.mockImplementation((path: string) => path);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('java is resolved from toolcache, jdkfile is untouched', async () => {
    const inputs = { version: actualJavaVersion, arch: 'x86', packageType: 'jdk' };
    const jdkFile = 'not_existing_one';
    const expected = {
      javaVersion: actualJavaVersion,
      javaPath: path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(tcFind).toHaveBeenCalled();
    expect(coreInfo).toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(coreInfo).not.toHaveBeenCalledWith(`Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`)
  });

  it("java is resolved from toolcache, jdkfile doesn't exist", async () => {
    const inputs = { version: actualJavaVersion, arch: 'x86', packageType: 'jdk' };
    const jdkFile = undefined;
    const expected = {
      javaVersion: actualJavaVersion,
      javaPath: path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(tcFind).toHaveBeenCalled();
    expect(coreInfo).toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(coreInfo).not.toHaveBeenCalledWith(`Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`)
  });

  it('java is unpacked from jdkfile', async () => {
    const inputs = { version: '11.0.289', arch: 'x86', packageType: 'jdk' };
    const jdkFile = expectedJdkFile;
    const expected = {
      javaVersion: '11.0.289',
      javaPath: path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(tcFind).toHaveBeenCalled();
    expect(coreInfo).not.toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(coreInfo).toHaveBeenCalledWith(`Extracting Java from '${jdkFile}'`);
    expect(coreInfo).toHaveBeenCalledWith(`Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`);
  });

  it('jdk file is not found', async () => {
    const inputs = { version: '11.0.289', arch: 'x86', packageType: 'jdk' };
    const jdkFile = 'not_existing_one';
    const expected = {
      javaVersion: '11.0.289',
      javaPath: path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_LocalJDKFile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).rejects.toThrowError(
      "JDK file is not found in path 'not_existing_one'"
    );
    expect(tcFind).toHaveBeenCalled();
    expect(coreInfo).not.toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(coreInfo).not.toHaveBeenCalledWith(`Extracting Java from '${jdkFile}'`)
    expect(coreInfo).toHaveBeenCalledWith(`Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`)
  });

  it.each([
    [{ version: '8.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '11.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '12.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '11.1.11', arch: 'x64', packageType: 'jdk' }, 'not_existing_one']
  ])('inputs %o, jdkfile %s', async (inputs, jdkFile) => {
    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    await expect(mockJavaBase.setupJava()).rejects.toThrowError(/JDK file is not found in path */);
    expect(tcFind).toHaveBeenCalled();
  });

  it.each([
    [{ version: '8.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '13.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '16.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '7.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '11.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '12.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '15.0.289', arch: 'x64', packageType: 'jdk' }, undefined]
  ])('inputs %o, jdkfile %s', async (inputs, jdkFile) => {
    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    await expect(mockJavaBase.setupJava()).rejects.toThrowError("'jdkFile' is not specified");
    expect(tcFind).toHaveBeenCalled();
  });
});
