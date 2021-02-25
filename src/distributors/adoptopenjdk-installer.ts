import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { IS_WINDOWS, macOSJavaContentDir } from '../util';
import { JavaBase } from './base-installer';
import { IAdoptAvailableVersions } from './adoptopenjdk-models';
import { JavaInstallerOptions, JavaDownloadRelease, JavaInstallerResults } from './base-models';

export class AdoptOpenJDKDistributor extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions) {
    super('AdoptOpenJDK', installerOptions);
  }

  // TO-DO: Validate that all versions are available through API

  protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
    const availableVersions = await this.getAvailableVersions();

    const resolvedFullVersion = availableVersions.find(item =>
      semver.satisfies(item.version_data.semver, version)
    );

    if (!resolvedFullVersion) {
      const availableOptions = availableVersions.map(item => item.version_data.semver).join(', ');
      const availableOptionsMessage = availableOptions
        ? `\nAvailable versions: ${availableOptions}`
        : '';
      throw new Error(
        `Could not find satisfied version for semver ${version.raw}. ${availableOptionsMessage}`
      );
    }

    if (resolvedFullVersion.binaries.length < 0) {
      throw new Error(`No binaries were found for semver ${version.raw}`);
    }

    // take the first element in 'binaries' array
    // because it is already filtered by arch and platform options and can't contain > 1 elements
    return {
      resolvedVersion: resolvedFullVersion.version_data.semver,
      link: resolvedFullVersion.binaries[0].package.link
    };
  }

  protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
    let javaPath: string;
    let extractedJavaPath: string;

    core.info(
      `Downloading ${javaRelease.resolvedVersion} (${this.distributor}) from ${javaRelease.link} ...`
    );
    const javaArchivePath = await tc.downloadTool(javaRelease.link);

    core.info(`Extracting Java archive...`);
    if (IS_WINDOWS) {
      extractedJavaPath = await tc.extractZip(javaArchivePath);
    } else {
      extractedJavaPath = await tc.extractTar(javaArchivePath);
    }

    const archiveName = fs.readdirSync(extractedJavaPath)[0];
    const archivePath = path.join(extractedJavaPath, archiveName);
    javaPath = await tc.cacheDir(
      archivePath,
      this.toolcacheFolderName,
      javaRelease.resolvedVersion,
      this.architecture
    );

    if (process.platform === 'darwin') {
      javaPath = path.join(javaPath, macOSJavaContentDir);
    }

    return { javaPath, javaVersion: javaRelease.resolvedVersion };
  }

  private async getAvailableVersions(): Promise<IAdoptAvailableVersions[]> {
    const platform = this.getPlatformOption();
    const arch = this.architecture;
    const imageType = this.javaPackage;
    const heapSize = 'normal';
    const jvmImpl = 'hotspot';
    const versionRange = '[1.0,100.0]';
    const encodedVersionRange = encodeURI(versionRange);

    console.time('adopt-retrieve-available-versions');
    const baseRequestArguments = [
      `os=${platform}`,
      `architecture=${arch}`,
      `heap_size=${heapSize}`,
      `image_type=${imageType}`,
      `jvm_impl=${jvmImpl}`,
      `project=jdk`,
      'vendor=adoptopenjdk',
      'sort_method=DEFAULT',
      'sort_order=DESC',
      'release_type=ga'
    ].join('&');

    // need to iterate through all pages to retrieve the list of all versions
    // Adopt API doesn't provide way to retrieve the count of pages to iterate so infinity loop
    let page_index = 0;
    const availableVersions: IAdoptAvailableVersions[] = [];
    while (true) {
      const requestArguments = `${baseRequestArguments}&page_size=20&page=${page_index}`;
      const availableVersionsUrl = `https://api.adoptopenjdk.net/v3/assets/version/${encodedVersionRange}?${requestArguments}`;

      const paginationPage = (
        await this.http.getJson<IAdoptAvailableVersions[]>(availableVersionsUrl)
      ).result;
      if (paginationPage === null || paginationPage.length === 0) {
        // break infinity loop because we have reached end of pagination
        break;
      }

      availableVersions.push(...paginationPage);
      page_index++;
    }

    // TO-DO: Debug information, should be removed before release
    core.startGroup('Print debug information about available versions');
    console.timeEnd('adopt-retrieve-available-versions');
    console.log(`Available versions: [${availableVersions.length}]`);
    console.log(availableVersions.map(item => item.version_data.semver).join(', '));
    core.endGroup();
    core.startGroup('Print detailed debug information about available versions');
    availableVersions.forEach(item => {
      console.log(JSON.stringify(item));
    });
    core.endGroup();

    return availableVersions;
  }

  private getPlatformOption(): string {
    // Adopt has own platform names so need to map them
    switch (process.platform) {
      case 'darwin':
        return 'mac';
      case 'win32':
        return 'windows';
      default:
        return process.platform;
    }
  }
}
