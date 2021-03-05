import fs from 'fs';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

import path from 'path';
import * as semver from 'semver';
import * as utils from '../../src/util';

import { LocalDistributor } from '../../src/distributors/local/installer';

describe('setupJava', () => {
  const actualJavaVersion = '11.1.10';
  const javaPath = path.join('Java_jdkfile_jdk', actualJavaVersion, 'x86');

  let mockJavaBase: LocalDistributor;

  let spyTcFind: jest.SpyInstance;
  let spyTcCacheDir: jest.SpyInstance;
  let spyCoreDebug: jest.SpyInstance;
  let spyCoreInfo: jest.SpyInstance;
  let spyCoreExportVariable: jest.SpyInstance;
  let spyCoreAddPath: jest.SpyInstance;
  let spyCoreSetOutput: jest.SpyInstance;
  let spyFsStat: jest.SpyInstance;
  let spyFsReadDir: jest.SpyInstance;
  let spyUtilsExtractJdkFile: jest.SpyInstance;
  let spyPathResolve: jest.SpyInstance;
  let expectedJdkFile = 'JavaLocalJdkFile';

  beforeEach(() => {
    spyTcFind = jest.spyOn(tc, 'find');
    spyTcFind.mockImplementation((toolname: string, javaVersion: string, architecture: string) => {
      const semverVersion = new semver.Range(javaVersion);

      if (path.basename(javaPath) !== architecture || !javaPath.includes(toolname)) {
        return '';
      }

      return semver.satisfies(actualJavaVersion, semverVersion) ? javaPath : '';
    });

    spyTcCacheDir = jest.spyOn(tc, 'cacheDir');
    spyTcCacheDir.mockImplementation(
      (archivePath: string, toolcacheFolderName: string, version: string, architecture: string) =>
        path.join(toolcacheFolderName, version, architecture)
    );

    // Spy on core methods
    spyCoreDebug = jest.spyOn(core, 'debug');
    spyCoreDebug.mockImplementation(() => undefined);

    spyCoreInfo = jest.spyOn(core, 'info');
    spyCoreInfo.mockImplementation(() => undefined);

    spyCoreAddPath = jest.spyOn(core, 'addPath');
    spyCoreAddPath.mockImplementation(() => undefined);

    spyCoreExportVariable = jest.spyOn(core, 'exportVariable');
    spyCoreExportVariable.mockImplementation(() => undefined);

    spyCoreSetOutput = jest.spyOn(core, 'setOutput');
    spyCoreSetOutput.mockImplementation(() => undefined);

    // Spy on fs methods
    spyFsReadDir = jest.spyOn(fs, 'readdirSync');
    spyFsReadDir.mockImplementation(() => ['JavaTest']);

    spyFsStat = jest.spyOn(fs, 'statSync');
    spyFsStat.mockImplementation((file: string) => {
      return { isFile: () => file === expectedJdkFile };
    });

    // Spy on util methods
    spyUtilsExtractJdkFile = jest.spyOn(utils, 'extractJdkFile');
    spyUtilsExtractJdkFile.mockImplementation(() => 'some/random/path/');

    // Spy on path methods
    spyPathResolve = jest.spyOn(path, 'resolve');
    spyPathResolve.mockImplementation((path: string) => path);
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
      javaPath: path.join('Java_jdkfile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_jdkfile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(spyTcFind).toHaveBeenCalled();
    expect(spyCoreInfo).toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(spyCoreInfo).not.toHaveBeenCalledWith(
      `Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`
    );
  });

  it("java is resolved from toolcache, jdkfile doesn't exist", async () => {
    const inputs = { version: actualJavaVersion, arch: 'x86', packageType: 'jdk' };
    const jdkFile = undefined;
    const expected = {
      javaVersion: actualJavaVersion,
      javaPath: path.join('Java_jdkfile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_jdkfile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(spyTcFind).toHaveBeenCalled();
    expect(spyCoreInfo).toHaveBeenCalledWith(`Resolved Java ${actualJavaVersion} from tool-cache`);
    expect(spyCoreInfo).not.toHaveBeenCalledWith(
      `Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`
    );
  });

  it('java is unpacked from jdkfile', async () => {
    const inputs = { version: '11.0.289', arch: 'x86', packageType: 'jdk' };
    const jdkFile = expectedJdkFile;
    const expected = {
      javaVersion: '11.0.289',
      javaPath: path.join('Java_jdkfile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_jdkfile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).resolves.toEqual(expected);
    expect(spyTcFind).toHaveBeenCalled();
    expect(spyCoreInfo).not.toHaveBeenCalledWith(
      `Resolved Java ${actualJavaVersion} from tool-cache`
    );
    expect(spyCoreInfo).toHaveBeenCalledWith(`Extracting Java from '${jdkFile}'`);
    expect(spyCoreInfo).toHaveBeenCalledWith(
      `Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`
    );
  });

  it('jdk file is not found', async () => {
    const inputs = { version: '11.0.289', arch: 'x86', packageType: 'jdk' };
    const jdkFile = 'not_existing_one';
    const expected = {
      javaVersion: '11.0.289',
      javaPath: path.join('Java_jdkfile_jdk', inputs.version, inputs.arch)
    };

    mockJavaBase = new LocalDistributor(inputs, jdkFile);
    expected.javaPath = path.join('Java_jdkfile_jdk', inputs.version, inputs.arch);
    await expect(mockJavaBase.setupJava()).rejects.toThrowError(
      "JDK file is not found in path 'not_existing_one'"
    );
    expect(spyTcFind).toHaveBeenCalled();
    expect(spyCoreInfo).not.toHaveBeenCalledWith(
      `Resolved Java ${actualJavaVersion} from tool-cache`
    );
    expect(spyCoreInfo).not.toHaveBeenCalledWith(`Extracting Java from '${jdkFile}'`);
    expect(spyCoreInfo).toHaveBeenCalledWith(
      `Java ${inputs.version} is not found in tool-cache. Trying to unpack JDK file...`
    );
  });

  it.each([
    [{ version: '8.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '11.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '12.0.289', arch: 'x64', packageType: 'jdk' }, 'otherJdkFile'],
    [{ version: '11.1.11', arch: 'x64', packageType: 'jdk' }, 'not_existing_one']
  ])(
    `Throw an error if jdkfile has wrong path, inputs %s, jdkfile %s, real name ${expectedJdkFile}`,
    async (inputs, jdkFile) => {
      mockJavaBase = new LocalDistributor(inputs, jdkFile);
      await expect(mockJavaBase.setupJava()).rejects.toThrowError(
        /JDK file is not found in path */
      );
      expect(spyTcFind).toHaveBeenCalled();
    }
  );

  it.each([
    [{ version: '8.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '13.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '16.0.289', arch: 'x64', packageType: 'jdk' }, ''],
    [{ version: '7.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '11.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '12.0.289', arch: 'x64', packageType: 'jdk' }, undefined],
    [{ version: '15.0.289', arch: 'x64', packageType: 'jdk' }, undefined]
  ])(
    'Throw an error if jdkfile is not specified, inputs %s, jdkfile %s',
    async (inputs, jdkFile) => {
      mockJavaBase = new LocalDistributor(inputs, jdkFile);
      await expect(mockJavaBase.setupJava()).rejects.toThrowError("'jdkFile' is not specified");
      expect(spyTcFind).toHaveBeenCalled();
    }
  );
});
