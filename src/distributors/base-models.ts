export interface JavaInstallerOptions {
  version: string;
  arch: string;
  javaPackage: string;
  jdkFile?: string;
}

export interface JavaInstallerResults {
  javaVersion: string;
  javaPath: string;
}

// TO-DO: rename properties
// resolvedVersion => version
// link => url
export interface JavaDownloadRelease {
  resolvedVersion: string;
  link: string;
}
