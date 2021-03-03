import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { JavaBase } from '../base-installer';
import { IZuluVersions } from './models';
import { extractJdkFile, getDownloadArchiveExtension } from '../../util';
import { JavaDownloadRelease, JavaInstallerOptions, JavaInstallerResults } from '../base-models';

// TO-DO: issue with 4 digits versions: 15.0.0.36 / 15.0.0+36

export class ZuluDistributor extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions) {
    super('Zulu', installerOptions);
  }

  protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
    const availableVersions = await this.getAvailableVersions();

    const zuluVersions = availableVersions.map(item => {
      return {
        version: semver.coerce(item.jdk_version.join('.'))?.version ?? '',
        url: item.url
      } as JavaDownloadRelease;
    });

    // TO-DO: need to sort by Zulu version after sorting by JDK version?
    const maxSatisfiedVersion = semver.maxSatisfying(
      zuluVersions.map(item => item.version),
      version
    );
    const resolvedVersion = zuluVersions.find(item => item.version === maxSatisfiedVersion);
    if (!resolvedVersion) {
      const availableOptions = zuluVersions?.map(item => item.version).join(', ');
      const availableOptionsMessage = availableOptions
        ? `\nAvailable versions: ${availableOptions}`
        : '';
      throw new Error(
        `Could not find satisfied version for semver ${version.raw}. ${availableOptionsMessage}`
      );
    }

    return resolvedVersion;
  }

  protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
    let extractedJavaPath: string;

    core.info(
      `Downloading Java ${javaRelease.version} (${this.distribution}) from ${javaRelease.url} ...`
    );
    const javaArchivePath = await tc.downloadTool(javaRelease.url);

    core.info(`Extracting Java archive...`);
    let extension = getDownloadArchiveExtension();

    extractedJavaPath = await extractJdkFile(javaArchivePath, extension);

    const archiveName = fs.readdirSync(extractedJavaPath)[0];
    const archivePath = path.join(extractedJavaPath, archiveName);
    const javaPath = await tc.cacheDir(
      archivePath,
      this.toolcacheFolderName,
      javaRelease.version,
      this.architecture
    );

    return { javaPath, javaVersion: javaRelease.version };
  }

  private async getAvailableVersions(): Promise<IZuluVersions[]> {
    const { arch, hw_bitness, abi } = this.getArchitectureOptions();
    const [bundleType, features] = this.packageType.split('+');
    const platform = this.getPlatformOption();
    const extension = getDownloadArchiveExtension();
    const javafx = features?.includes('fx') ?? false;
    const releaseStatus = this.stable ? 'ga' : 'ea';

    console.time('azul-retrieve-available-versions');
    const requestArguments = [
      `os=${platform}`,
      `ext=${extension}`,
      `bundle_type=${bundleType}`,
      `javafx=${javafx}`,
      `arch=${arch}`,
      `hw_bitness=${hw_bitness}`,
      `release_status=${releaseStatus}`,
      abi ? `abi=${abi}` : null,
      features ? `features=${features}` : null
    ]
      .filter(Boolean)
      .join('&');

    const availableVersionsUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/?${requestArguments}`;
    const availableVersions = (await this.http.getJson<Array<IZuluVersions>>(availableVersionsUrl))
      .result;

    if (!availableVersions || availableVersions.length === 0) {
      throw new Error(`No versions were found using url '${availableVersionsUrl}'`);
    }

    if (core.isDebug()) {
      core.startGroup('Print information about available versions');
      console.timeEnd('azul-retrieve-available-versions');
      console.log(`Available versions: [${availableVersions.length}]`);
      console.log(availableVersions.map(item => item.jdk_version.join('.')).join(', '));
      core.endGroup();
      core.startGroup('Print full information about available versions');
      availableVersions.forEach(item => {
        console.log(JSON.stringify(item));
      });
      core.endGroup();
    }

    return availableVersions;
  }

  private getArchitectureOptions(): {
    arch: string;
    hw_bitness: string;
    abi: string;
  } {
    if (this.architecture == 'x64') {
      return { arch: 'x86', hw_bitness: '64', abi: '' };
    } else if (this.architecture == 'x86') {
      return { arch: 'x86', hw_bitness: '32', abi: '' };
    } else {
      return { arch: this.architecture, hw_bitness: '', abi: '' };
    }
  }

  private getPlatformOption(): string {
    // Azul has own platform names so need to map them
    switch (process.platform) {
      case 'darwin':
        return 'macos';
      case 'win32':
        return 'windows';
      default:
        return process.platform;
    }
  }
}
