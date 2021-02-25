import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';
import { getVersionFromToolcachePath } from '../util';
import {
  JavaDownloadRelease,
  JavaInstallerOptions,
  JavaInstallerResults
} from './base-models';

export abstract class JavaBase {
  protected http: httpm.HttpClient;
  protected version: semver.Range;
  protected architecture: string;
  protected javaPackage: string;

  constructor(
    protected distributor: string,
    installerOptions: JavaInstallerOptions
  ) {
    this.http = new httpm.HttpClient('setup-java', undefined, {
      allowRetries: true,
      maxRetries: 3
    });

    this.version = this.normalizeVersion(installerOptions.version);
    this.architecture = installerOptions.arch;
    this.javaPackage = installerOptions.javaPackage;
  }

  protected abstract downloadTool(
    javaRelease: JavaDownloadRelease
  ): Promise<JavaInstallerResults>;
  protected abstract findPackageForDownload(
    range: semver.Range
  ): Promise<JavaDownloadRelease>;

  public async setupJava(): Promise<JavaInstallerResults> {
    let foundJava = this.findInToolcache();
    if (foundJava) {
      core.info(`Resolved Java ${foundJava.javaVersion} from tool-cache`);
    } else {
      core.info(
        `Java ${this.version.raw} is not found in tool-cache. Trying to download...`
      );
      const javaRelease = await this.findPackageForDownload(this.version);
      foundJava = await this.downloadTool(javaRelease);
      core.info(`Java ${foundJava.javaVersion} was downloaded`);
    }

    core.info(`Setting Java ${foundJava.javaVersion} as default`);
    this.setJavaDefault(foundJava.javaPath, foundJava.javaVersion);

    return foundJava;
  }

  protected get toolcacheFolderName(): string {
    return `Java_${this.distributor}_${this.javaPackage}`;
  }

  protected findInToolcache(): JavaInstallerResults | null {
    const javaPath = tc.find(
      this.toolcacheFolderName,
      this.version.raw,
      this.architecture
    );
    if (!javaPath) {
      return null;
    }

    return {
      javaVersion: getVersionFromToolcachePath(javaPath),
      javaPath
    };
  }

  protected setJavaDefault(toolPath: string, version: string) {
    core.exportVariable('JAVA_HOME', toolPath);
    core.addPath(path.join(toolPath, 'bin'));
    core.setOutput('distributor', this.distributor);
    core.setOutput('path', toolPath);
    core.setOutput('version', version);
  }

  // this function validates and parse java version to its normal semver notation
  protected normalizeVersion(version: string): semver.Range {
    if (version.startsWith('1.')) {
      // Trim leading 1. for versions like 1.8 and 1.7
      version = version.slice(2);
      if (!version) {
        throw new Error('1. is not a valid version');
      }
    }

    // TO-DO: rework ea/ga logic
    if (version.endsWith('-ea')) {
      // convert e.g. 14-ea to 14.0.0-ea
      if (version.indexOf('.') == -1) {
        version = version.slice(0, version.length - 3) + '.0.0-ea';
      }
      // match anything in -ea.X (semver won't do .x matching on pre-release versions)
      if (version[0] >= '0' && version[0] <= '9') {
        version = '>=' + version;
      }
    } else if (version.split('.').length < 3) {
      // For non-ea versions, add trailing .x if it is missing
      if (version[version.length - 1] != 'x') {
        version = version + '.x';
      }
    }

    if (!semver.validRange(version)) {
      throw new Error(
        `The string '${version}' is not valid semver notation for Java version. Please check README file for code snippets and more detailed information`
      );
    }

    return new semver.Range(version);
  }
}
