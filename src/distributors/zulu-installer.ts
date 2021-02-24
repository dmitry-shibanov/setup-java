import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { JavaBase } from './base-installer';
import { IZuluVersions, IZuluVersionsDetailed } from './zulu-models';
import { IS_WINDOWS, IS_MACOS, PLATFORM } from '../util';
import {
  JavaDownloadRelease,
  JavaInstallerOptions,
  JavaInstallerResults
} from './base-models';

// TO-DO: validate feature
export class ZuluDistributor extends JavaBase {
  private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
  private platform: string;
  constructor(initOptions: JavaInstallerOptions) {
    super('Zulu', initOptions);
    this.platform = IS_MACOS ? 'macos' : PLATFORM;
    if (this.arch === 'x64') {
      // change architecture to x86 because zulu only provides x86 architecture.
      this.arch = 'x86';
    }
  }

  protected async findPackageForDownload(
    version: semver.Range
  ): Promise<JavaDownloadRelease> {
    const resolvedFullVersion = await this.getAvailableVersion(version);

    // TO-DO: double check all urls and parameters
    const availableZuluReleaseUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/latest/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&jdk_version=${resolvedFullVersion}&bundle_type=${this.javaPackage}`;
    const availableZuluRelease = (
      await this.http.getJson<IZuluVersionsDetailed>(availableZuluReleaseUrl)
    ).result;

    if (!availableZuluRelease) {
      throw new Error(
        `No Zulu packages were found for version ${resolvedFullVersion}`
      );
    }

    return {
      link: availableZuluRelease.url,
      resolvedVersion: resolvedFullVersion
    };
  }

  protected async downloadTool(
    javaRelease: JavaDownloadRelease
  ): Promise<JavaInstallerResults> {
    let extractedJavaPath: string;

    core.info(
      `Downloading ${javaRelease.resolvedVersion} (${this.distributor}) from ${javaRelease.link}...`
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
    const javaPath = await tc.cacheDir(
      archivePath,
      this.toolcacheFolderName,
      javaRelease.resolvedVersion,
      this.arch
    );

    return { javaPath, javaVersion: javaRelease.resolvedVersion };
  }

  private async getAvailableVersion(range: semver.Range): Promise<string> {
    const availableVersionsUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64`;
    const availableVersionsList = (
      await this.http.getJson<Array<IZuluVersions>>(availableVersionsUrl)
    ).result;

    if (!availableVersionsList || availableVersionsList.length === 0) {
      throw new Error(
        `No versions were found for arch '${this.arch}' and platform '${this.platform}'`
      );
    }

    const zuluVersions = availableVersionsList
      .map(item => semver.coerce(item.jdk_version.join('.')))
      .filter((item): item is semver.SemVer => !!item);
    const resolvedVersion = semver.maxSatisfying(zuluVersions, range);

    if (!resolvedVersion) {
      throw new Error(
        `Could not find satisfied version for semver ${range.raw}`
      );
    }

    return resolvedVersion.raw;
  }
}
