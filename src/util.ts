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

export async function extractJdkFile(toolPath: string, extension?: string) {
  if (!extension) {
    extension = toolPath.endsWith('.tar.gz') ? '.tar.gz' : path.extname(toolPath);
  }

  switch (extension) {
    case '.tar.gz':
    case '.tar':
      return await tc.extractTar(toolPath);
    case '.zip':
      return await tc.extractZip(toolPath);
    default:
      return await tc.extract7z(toolPath);
  }
}
