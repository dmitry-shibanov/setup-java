import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as path from 'path';

import {normalizeVersion} from './util';
import AdoptOpenJDKFactory from './distributors/adoptopenjdk-installer';
import {BaseFactory} from './distributors/base-installer';
import ZuluDistributor from './distributors/zulu-installer';

enum JavaDistributor {
  AdoptOpenJdk = 'adoptOpenJdk',
  Zulu = 'zulu'
}

class JavaFactory {
  public getJavaDistributor(
    distributor: JavaDistributor | string
  ): BaseFactory | null {
    switch (distributor) {
      case JavaDistributor.AdoptOpenJdk:
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

  const javaFactory = new JavaFactory();
  const distributorFactory = javaFactory.getJavaDistributor(distributorName);
  const distributor = distributorFactory?.getJavaDistributor(
    normalizeVersion(version),
    arch,
    javaPackage
  );
  if (!distributor) {
    throw new Error('No distributor was found');
  }

  const javaInfo = await distributor.getJava();
  const {javaVersion, javaPath: toolPath} = javaInfo;

  core.info(`Setuped up java ${javaVersion} from ${distributorName}`);
}
