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

export interface JavaDownloadRelease {
  resolvedVersion: string;
  link: string;
}
