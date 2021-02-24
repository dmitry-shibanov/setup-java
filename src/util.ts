import os from 'os';
import path from 'path';
import fs from 'fs';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

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

export async function setupFromJdkFile(toolPath: string) {
  core.info(`toolPath is ${toolPath}`);
  let extension = toolPath.endsWith('.tar.gz')
    ? '.tar.gz'
    : path.extname(toolPath);
  if (!extension) {
    const archiveName = fs.readdirSync(toolPath)[0];
    extension = path.extname(archiveName);
  }
  core.info(`extension is ${extension}`);
  let extractedJavaPath: string;
  switch (extension) {
    case '.tar.gz':
    case '.tar':
      core.info('came to tar');
      extractedJavaPath = await tc.extractTar(toolPath);
      break;
    case '.zip':
      core.info('came to zip');
      extractedJavaPath = await tc.extractZip(toolPath);
      break;
    default:
      core.info('came to default');
      extractedJavaPath = await tc.extract7z(toolPath);
  }

  return extractedJavaPath;
}
