export interface JavaInstallerOptions {
  version: string;
  arch: string;
  javaPackage: string;
}

export interface JavaInstallerResults {
  javaVersion: string;
  javaPath: string;
}

export interface JavaDownloadRelease {
  version: string;
  url: string;
}
