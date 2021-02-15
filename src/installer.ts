import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as path from 'path';

import {normalizeVersion} from './util';
import AdopOpenJdkVendor from './vendors/adoptopenjdk-vendor';
import {IJavaVendor} from './vendors/vendor-model';
import ZuluVendor from './vendors/zulu-vendor';

enum JavaVendors {
  AdopOpenJdk = 'adopOpenJdk',
  Zulu = 'zulu'
}

class JavaFactory {
  constructor(
    private http: httpm.HttpClient,
    private version: string,
    private arch: string,
    private javaPackage: string = 'jdk'
  ) {}

  public getJavaVendor(vendor: JavaVendors | string): IJavaVendor | null {
    switch (vendor) {
      case JavaVendors.AdopOpenJdk:
        return new AdopOpenJdkVendor(
          this.http,
          this.version,
          this.arch,
          this.javaPackage
        );
      case JavaVendors.Zulu:
        return new ZuluVendor(
          this.http,
          this.version,
          this.arch,
          this.javaPackage
        );
      default:
        return null;
    }
  }
}

export async function install(
  version: string,
  arch: string,
  javaPackage: string,
  vendorName: string,
  jdkFile?: string
) {
  const http = new httpm.HttpClient('setup-java', undefined, {
    allowRetries: true,
    maxRetries: 3
  });

  const javaFactory = new JavaFactory(
    http,
    normalizeVersion(version),
    arch,
    javaPackage
  );
  const vendor = javaFactory.getJavaVendor(vendorName);
  if (!vendor) {
    throw new Error('No vendor was found');
  }

  const javaInfo = await vendor.getJava();
  const {javaVersion, javaPath: toolPath} = javaInfo;

  const extendedJavaHome = `JAVA_HOME_${version}_${arch}`
    .toUpperCase()
    .replace(/[^0-9A-Z_]/g, '_');
  core.exportVariable('JAVA_HOME', toolPath);
  core.exportVariable(extendedJavaHome, toolPath);
  core.addPath(path.join(toolPath, 'bin'));
  core.setOutput('path', toolPath);
  core.setOutput('version', javaVersion);

  core.info(`Setuped up java ${javaVersion} from ${vendorName}`);
}
