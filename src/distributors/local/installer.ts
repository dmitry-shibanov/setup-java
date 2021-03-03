import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { JavaBase } from '../base-installer';
import { JavaInstallerOptions, JavaDownloadRelease, JavaInstallerResults } from '../base-models';
import { extractJdkFile } from '../../util';
import { macOSJavaContentDir } from '../../constants';

export class LocalDistributor extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions, private jdkFile?: string) {
    super('LocalJDKFile', installerOptions);
  }

  public async setupJava(): Promise<JavaInstallerResults> {
    let foundJava = this.findInToolcache();

    if (foundJava) {
      core.info(`Resolved Java ${foundJava.javaVersion} from tool-cache`);
    } else {
      core.info(`Java ${this.version.raw} is not found in tool-cache. Trying to download...`);
      if (!this.jdkFile) {
        throw new Error("'jdkFile' is not specified");
      }
      const jdkFilePath = path.resolve(this.jdkFile);
      const stats = fs.statSync(jdkFilePath);

      if (!stats.isFile()) {
        throw new Error(`JDK file is not found in path '${jdkFilePath}'`);
      }

      core.info(`Extracting Java from '${jdkFilePath}'`);

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

      if (
        process.platform === 'darwin' &&
        fs.existsSync(path.join(javaPath, macOSJavaContentDir))
      ) {
        javaPath = path.join(javaPath, macOSJavaContentDir);
      }

      foundJava = {
        javaPath,
        javaVersion
      };
    }

    core.info(`Setting Java ${foundJava.javaVersion} as default`);

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
