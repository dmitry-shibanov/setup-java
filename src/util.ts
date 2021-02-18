import * as httpm from '@actions/http-client';
import * as core from '@actions/core';
import fs from 'fs';
import os from 'os';
import * as path from 'path';
import * as semver from 'semver';

export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = process.platform === 'linux';
export const IS_MACOS = process.platform === 'darwin';
export const PLATFORM = IS_WINDOWS ? 'windows' : process.platform;
export const macOSJavaContentDir = 'Contents/Home';

export function getTempDir() {
  let tempDirectory = process.env['RUNNER_TEMP'] || os.tmpdir();

  return tempDirectory;
}

export function createHttpClient() {
  const http = new httpm.HttpClient('setup-java', undefined, {
    allowRetries: true,
    maxRetries: 3
  });

  return http;
}

export function getJavaPreInstalledPath(
  version: string,
  distributor: string,
  versionsPath: string
) {
  const versionsDir = fs.readdirSync(versionsPath);
  const javaInformations = versionsDir.map(versionDir => {
    let javaPath = path.join(versionsPath, versionDir);
    if (IS_MACOS) {
      javaPath = path.join(javaPath, macOSJavaContentDir);
    }

    const content: string | null = getJavaReleaseFileContent(javaPath);
    if (!content) {
      return null;
    }

    const implemetation = parseFile('IMPLEMENTOR', content);

    const re = new RegExp(/^[7,8]\./);
    if (!re.test(version) && implemetation !== distributor) {
      return null;
    }

    const javaVersion = parseFile('JAVA_VERSION', content);

    if (!javaVersion) {
      return null;
    }

    core.info(`found java ${javaVersion} version for ${implemetation}`);

    return {
      javaVersion: semver.coerce(javaVersion.split('_')[0])!.version,
      javaPath: javaPath
    };
  });

  const javaInfo =
    javaInformations.find(item => {
      return (
        item && semver.satisfies(item.javaVersion, new semver.Range(version))
      );
    }) || null;

  return javaInfo;
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
