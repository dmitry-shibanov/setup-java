export interface JavaInstallerOptions {
  version: string;
  arch: string;
  packageType: string;
}

export interface JavaInstallerResults {
  javaVersion: string;
  javaPath: string;
}

export interface JavaDownloadRelease {
  version: string;
  url: string;
}
