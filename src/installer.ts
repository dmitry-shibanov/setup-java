import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as path from 'path';

import {normalizeVersion} from './util';
import AdoptOpenJDKFactory from './distributors/adoptopenjdk-installer';
import {BaseFactory} from './distributors/vendor-model';
import ZuluDistributor from './distributors/zulu-installer';

enum JavaDistributor {
  AdopOpenJdk = 'adopOpenJdk',
  Zulu = 'zulu'
}

class JavaFactory {
  public getJavaDistributor(
    distributor: JavaDistributor | string
  ): BaseFactory | null {
    switch (distributor) {
      case JavaDistributor.AdopOpenJdk:
        return new AdoptOpenJDKFactory();
      case JavaDistributor.Zulu:
        return new ZuluDistributor();
      default:
        return null;
    }
  }
}

export async function install(
  version: string,
  arch: string,
  javaPackage: string,
  distributorName: string,
  jdkFile?: string
) {
  const http = new httpm.HttpClient('setup-java', undefined, {
    allowRetries: true,
    maxRetries: 3
  });

  const javaFactory = new JavaFactory();
  const distributorFactory = javaFactory.getJavaDistributor(distributorName);
  const distributor = distributorFactory?.getJavaDistributor(
    http,
    normalizeVersion(version),
    arch,
    javaPackage
  );
  if (!distributor) {
    throw new Error('No distributor was found');
  }

  const javaInfo = await distributor.getJava();
  const {javaVersion, javaPath: toolPath} = javaInfo;

  const extendedJavaHome = `JAVA_HOME_${version}_${arch}`
    .toUpperCase()
    .replace(/[^0-9A-Z_]/g, '_');
  core.exportVariable('JAVA_HOME', toolPath);
  core.exportVariable(extendedJavaHome, toolPath);
  core.addPath(path.join(toolPath, 'bin'));
  core.setOutput('path', toolPath);
  core.setOutput('version', javaVersion);

  core.info(`Setuped up java ${javaVersion} from ${distributorName}`);
}
