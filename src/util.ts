import fs from 'fs';
import os, {EOL} from 'os';
import * as path from 'path';
import {IJavaInfo} from './distributors/base-installer';

export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = process.platform === 'linux';
export const IS_MACOS = process.platform === 'darwin';
export const PLATFORM = IS_WINDOWS ? 'windows' : process.platform;
export const macOSJavaContentDir = 'Contents/Home';

export function getTempDir() {
  let tempDirectory = process.env['RUNNER_TEMP'] || os.tmpdir();

  return tempDirectory;
}

export function getVersionFromToolcachePath(toolPath: string) {
  if (toolPath) {
    return path.basename(path.dirname(toolPath));
  }

  return toolPath;
}

export function parseLocalVersions(
  rootLocation: string,
  distributor: string
): IJavaInfo[] {
  const potentialVersions = fs.readdirSync(rootLocation);
  const foundVersions: IJavaInfo[] = [];

  potentialVersions.forEach(potentialVersion => {
    let javaPath = path.join(rootLocation, potentialVersion);
    if (IS_MACOS) {
      javaPath = path.join(javaPath, macOSJavaContentDir);
    }
    const javaReleaseFile = path.join(javaPath, 'release');
    if (!fs.existsSync(javaReleaseFile)) {
      return;
    }

    const dict = parseReleaseFile(javaReleaseFile);
    if (dict['IMPLEMENTOR'] && dict['IMPLEMENTOR'].includes(distributor)) {
      foundVersions.push({
        javaVersion: dict['JAVA_VERSION'],
        javaPath: javaPath
      });
    }
  });

  return foundVersions;
}

function parseReleaseFile(releaseFilePath: string): {[key: string]: string} {
  const content: string = fs.readFileSync(releaseFilePath).toString();
  const lines = content.split(EOL);
  const dict: {[key: string]: string} = {};
  lines.forEach(line => {
    const [key, value] = line.split('=', 2);
    dict[key] = value;
  });

  return dict;
}
