import os from 'os';
import path from 'path';

import * as tc from '@actions/tool-cache';

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
  const extension = toolPath.endsWith('.tar.gz')
    ? '.tar.gz'
    : path.extname(toolPath);
  let extractedJavaPath: string;
  switch (extension) {
    case '.tar.gz':
    case '.tar':
      extractedJavaPath = await tc.extractTar(toolPath);
      break;
    case '.zip':
      extractedJavaPath = await tc.extractZip(toolPath);
      break;
    default:
      extractedJavaPath = await tc.extract7z(toolPath);
  }

  return extractedJavaPath;
}
