import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { JavaBase } from './base-installer';
import { IZuluVersions } from './zulu-models';
import { IS_WINDOWS } from '../util';
import { JavaDownloadRelease, JavaInstallerOptions, JavaInstallerResults } from './base-models';

// TO-DO: issue with 4 digits versions: 15.0.0.36 / 15.0.0+36

export class ZuluDistributor extends JavaBase {
  constructor(initOptions: JavaInstallerOptions) {
    super('Zulu', initOptions);
  }

  protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
    const availableVersions = await this.getAvailableVersions();

    const zuluVersions = availableVersions.map(item => {
      return {
        resolvedVersion: semver.coerce(item.jdk_version.join('.'))?.version ?? '',
        link: item.url
      } as JavaDownloadRelease;
    });

    // TO-DO: need to sort by Zulu version after sorting by JDK version?
    const maxSatisfiedVersion = semver.maxSatisfying(
      zuluVersions.map(item => item.resolvedVersion),
      version
    );
    const resolvedVersion = zuluVersions.find(item => item.resolvedVersion === maxSatisfiedVersion);
    if (!resolvedVersion) {
      const availableOptions = zuluVersions?.map(item => item.resolvedVersion).join(', ');
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
      this.architecture
    );

    return { javaPath, javaVersion: javaRelease.resolvedVersion };
  }

  private async getAvailableVersions(): Promise<IZuluVersions[]> {
    const { arch, hw_bitness, abi } = this.getArchitectureOptions();
    const [bundleType, features] = this.javaPackage.split('+');
    const platform = this.getPlatformOption();
    const extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    const javafx = features?.includes('fx') ?? false;

    // TO-DO: Remove after updating README
    // java-package field supports features for Azul
    // if you specify 'jdk+fx', 'fx' will be passed to features
    // any number of features can be specified with comma

    console.time('azul-retrieve-available-versions');
    const requestArguments = [
      `os=${platform}`,
      `ext=${extension}`,
      `bundle_type=${bundleType}`,
      `javafx=${javafx}`,
      `arch=${arch}`,
      `hw_bitness=${hw_bitness}`,
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

    // TO-DO: Debug information, should be removed before release
    core.startGroup('Print debug information about available versions');
    console.timeEnd('azul-retrieve-available-versions');
    console.log(`Available versions: [${availableVersions.length}]`);
    console.log(availableVersions.map(item => item.jdk_version.join('.')).join(', '));
    core.endGroup();
    core.startGroup('Print detailed debug information about available versions');
    availableVersions.forEach(item => {
      console.log(JSON.stringify(item));
    });
    core.endGroup();

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
      // TO-DO: Remove after updating README
      // support for custom architectures
      // on Hosted images we have only x64 and x86, we should always specify arch as x86 and hw_bitness depends on arch
      // on Self-Hosted, there are additional architectures and it is characterized by a few fields: arch, hw_bitness, abi
      // allow customer to specify every parameter by providing arch in format: '<arch>+<hw_bitness>+<abi>'
      // examples: 'x86+32+hard_float', 'arm+64+soft_float'
      const [arch, hw_bitness, abi] = this.architecture.split('+');
      return { arch, hw_bitness, abi };
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
