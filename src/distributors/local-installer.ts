import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import { macOSJavaContentDir, setupFromJdkFile } from '../util';

import { JavaBase } from './base-installer';
import {
  JavaInstallerOptions,
  JavaDownloadRelease,
  JavaInstallerResults
} from './base-models';

export class LocalDistributor extends JavaBase {
  private jdkFile: string;
  constructor(installerOptions: JavaInstallerOptions) {
    super('local_distributor', installerOptions);
    this.jdkFile = installerOptions.jdkFile!;
  }

  protected async findPackageForDownload(
    version: semver.Range
  ): Promise<JavaDownloadRelease> {
    throw new Error('Should not be implemented');
  }

  protected async downloadTool(
    javaRelease: JavaDownloadRelease
  ): Promise<JavaInstallerResults> {
    throw new Error('Should not be implemented');
  }

  public async setupJava(): Promise<JavaInstallerResults> {
    const resolvedVersion = this.version.raw;
    const jdkFilePath = path.normalize(this.jdkFile);
    const stats = fs.statSync(jdkFilePath);
    if (stats.isFile()) {
      const extractedJavaPath = await setupFromJdkFile(jdkFilePath);
      const archiveName = fs.readdirSync(extractedJavaPath)[0];
      const archivePath = path.join(extractedJavaPath, archiveName);
      let javaPath = await tc.cacheDir(
        archivePath,
        this.toolcacheFolderName,
        resolvedVersion,
        this.architecture
      );

      if (process.platform === 'darwin') {
        javaPath = path.join(javaPath, macOSJavaContentDir);
      }

      this.setJavaDefault(javaPath, resolvedVersion);

      return { javaPath, javaVersion: resolvedVersion };
    } else {
      throw new Error(`Jdk argument ${this.jdkFile} is not a file`);
    }
  }
}
