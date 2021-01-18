import * as path from 'path';

export const IS_WINDOWS = process.platform === 'win32';
export const IS_LINUX = process.platform === 'linux';
export const IS_MACOS = process.platform === 'darwin';
export const PLATFORM =  IS_WINDOWS ? "windows" : process.platform;

const windowsPreInstalled = path.normalize('C:/Program Files/Java');
const linuxPreInstalled = "/usr/lib/jvm";
const macosPreInstalled = "/Library/Java/JavaVirtualMachines";
export const extraMacOs = "Contents/Home";

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

export function isWindows() {
  return process.platform === 'win32';
}

export function getMachineJavaPath() {
  if(IS_WINDOWS) {
    return windowsPreInstalled;
  } else if (IS_LINUX) {
    return linuxPreInstalled;
  } else {
    return macosPreInstalled;
  }
}
