import * as httpm from '@actions/http-client';
import * as core from '@actions/core';
import fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = process.platform === 'linux';
export const IS_MACOS = process.platform === 'darwin';
export const PLATFORM = IS_WINDOWS ? 'windows' : process.platform;

const windowsPreInstalled = path.normalize('C:/Program Files/Java');
const linuxPreInstalled = '/usr/lib/jvm';
const macosPreInstalled = '/Library/Java/JavaVirtualMachines';
export const extraMacOs = 'Contents/Home';

export function getTempDir() {
  let tempDirectory = process.env.RUNNER_TEMP;
  if (tempDirectory === undefined) {
    let baseLocation;
    if (isWindows()) {
      // On windows use the USERPROFILE env variable
      baseLocation = process.env['USERPROFILE']
        ? process.env['USERPROFILE']
        : 'C:\\';
    } else {
      if (process.platform === 'darwin') {
        baseLocation = '/Users';
      } else {
        baseLocation = '/home';
      }
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
  }
  return tempDirectory;
}

export function createHttpClient() {
  const http = new httpm.HttpClient('setup-java', undefined, {
    allowRetries: true,
    maxRetries: 3
  });

  return http;
}

export function isWindows() {
  return process.platform === 'win32';
}

export function getJavaVersionsPath() {
  if (IS_WINDOWS) {
    return windowsPreInstalled;
  } else if (IS_LINUX) {
    return linuxPreInstalled;
  } else {
    return macosPreInstalled;
  }
}

export function getJavaReleaseFileContent(javaDirectory: string) {
  let javaReleaseFile = path.join(javaDirectory, 'release');

  if (
    !(fs.existsSync(javaReleaseFile) && fs.lstatSync(javaReleaseFile).isFile())
  ) {
    core.info('Release file for java was not found');
    return null;
  }

  const content: string = fs.readFileSync(javaReleaseFile).toString();

  return content;
}

export function parseFile(keyWord: string, content: string) {
  const re = new RegExp(`${keyWord}="(.*)"$`, 'gm');
  const regexExecArr = re.exec(content);
  if (!regexExecArr) {
    return null;
  }

  let version = regexExecArr[1].startsWith('1.')
    ? regexExecArr[1].replace('1.', '')
    : regexExecArr[1];

  return version;
}

// this function validates and parse java version to its normal semver notation
export function normalizeVersion(version: string): string {
  if (version.slice(0, 2) === '1.') {
    // Trim leading 1. for versions like 1.8
    version = version.slice(2);
    if (!version) {
      throw new Error('1. is not a valid version');
    }
  }

  if (version.endsWith('-ea')) {
    // convert e.g. 14-ea to 14.0.0-ea
    if (version.indexOf('.') == -1) {
      version = version.slice(0, version.length - 3) + '.0.0-ea';
    }
    // match anything in -ea.X (semver won't do .x matching on pre-release versions)
    if (version[0] >= '0' && version[0] <= '9') {
      version = '>=' + version;
    }
  } else if (version.split('.').length < 3) {
    // For non-ea versions, add trailing .x if it is missing
    if (version[version.length - 1] != 'x') {
      version = version + '.x';
    }
  }

  if (!semver.validRange(version)) {
    throw new Error(`The version ${version} is not valid semver notation please check README file for code snippets and 
                more detailed information`);
  }

  return version;
}
