import os from 'os';
import path from 'path';

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
