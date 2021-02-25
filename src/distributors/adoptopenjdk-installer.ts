import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { IS_WINDOWS, macOSJavaContentDir } from '../util';
import { JavaBase } from './base-installer';
import { IRelease, IAdoptAvailableVersions } from './adoptopenjdk-models';
import {
  JavaInstallerOptions,
  JavaDownloadRelease,
  JavaInstallerResults
} from './base-models';

export class AdoptOpenJDKDistributor extends JavaBase {
  constructor(installerOptions: JavaInstallerOptions) {
    super('AdoptOpenJDK', installerOptions);
  }

  protected async findPackageForDownload(
    version: semver.Range
  ): Promise<JavaDownloadRelease> {
    const platform = this.getPlatformOption();
    const arch = this.architecture;
    const imageType = this.javaPackage;

    const resolvedMajorVersion = await this.resolveMajorVersion(version);

    const requestArguments = [
      `os=${platform}`,
      `architecture=${arch}`,
      `image_type=${imageType}`,
      'heap_size=normal',
      'jvm_impl=hotspot',
      'project=jdk',
      'vendor=adoptopenjdk',
      'sort_method=DEFAULT',
      'sort_order=DESC',
      'page=0',
      'page_size=20'
    ]
      .filter(Boolean)
      .join('&');

    const availableVersionsUrl = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${resolvedMajorVersion}/ga?${requestArguments}`;
    const availableVersionsList = (
      await this.http.getJson<IRelease[]>(availableVersionsUrl)
    ).result;
    const resolvedFullVersion = availableVersionsList?.find(item =>
      semver.satisfies(item.version_data.semver, version)
    );

    if (!resolvedFullVersion) {
      const availableOptions = availableVersionsList
        ?.map(item => item.version_data.semver)
        .join(', ');
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

  protected async downloadTool(
    javaRelease: JavaDownloadRelease
  ): Promise<JavaInstallerResults> {
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

  private async resolveMajorVersion(range: semver.Range) {
    const availableMajorVersionsUrl =
      'https://api.adoptopenjdk.net/v3/info/available_releases';
    const availableMajorVersions = (
      await this.http.getJson<IAdoptAvailableVersions>(
        availableMajorVersionsUrl
      )
    ).result;

    if (!availableMajorVersions) {
      throw new Error(
        `Unable to get the list of major versions for '${this.distributor}'`
      );
    }

    const coercedAvailableVersions = availableMajorVersions.available_releases
      .map(item => semver.coerce(item))
      .filter((item): item is semver.SemVer => !!item);
    const resolvedMajorVersion = semver.maxSatisfying(
      coercedAvailableVersions,
      range
    )?.major;

    if (!resolvedMajorVersion) {
      throw new Error(
        `Could not find satisfied major version for semver ${range}. \nAvailable versions: ${availableMajorVersions.available_releases.join(
          ', '
        )}`
      );
    }

    return resolvedMajorVersion;
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
