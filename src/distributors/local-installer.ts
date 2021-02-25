import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';
import { macOSJavaContentDir, extractJdkFile } from '../util';

import { JavaBase } from './base-installer';
import { JavaInstallerOptions, JavaDownloadRelease, JavaInstallerResults } from './base-models';

export class LocalDistributor extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions, private jdkFile: string) {
    super('LocalJDKFile', installerOptions);
  }

  public async setupJava(): Promise<JavaInstallerResults> {
    let foundJava = this.findInToolcache();

    if (!foundJava) {
      const jdkFilePath = path.normalize(this.jdkFile);
      const stats = fs.statSync(jdkFilePath);
      if (stats.isFile()) {
        throw new Error(`Jdk argument ${this.jdkFile} is not a file`);
      }
      const extractedJavaPath = await extractJdkFile(jdkFilePath);
      const archiveName = fs.readdirSync(extractedJavaPath)[0];
      const archivePath = path.join(extractedJavaPath, archiveName);
      const javaVersion = this.version.raw;
      let javaPath = await tc.cacheDir(
        archivePath,
        this.toolcacheFolderName,
        javaVersion,
        this.architecture
      );
      if (process.platform === 'darwin') {
        javaPath = path.join(javaPath, macOSJavaContentDir);
      }
      foundJava = {
        javaPath,
        javaVersion
      };
    }

    this.setJavaDefault(foundJava.javaPath, foundJava.javaVersion);
    return foundJava;
  }

  protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
    throw new Error('Should not be implemented');
  }

  protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
    throw new Error('Should not be implemented');
  }
}
