import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as path from 'path';
import * as semver from 'semver';

import { JavaFactory } from './providers/java-factory';

export async function install(version: string, arch: string, javaPackage: string, providerName: string, jdkFile?: string) {

    const javaFactory = new JavaFactory(normalizeVersion(version), arch, javaPackage);
    const provider = javaFactory.getJavaProvider(providerName);
    if(!provider) {
        throw new Error('No provider was found');
    }

    const javaInfo = await provider.getJava();
    const { javaVersion, javaPath: toolPath } = javaInfo;

    const extendedJavaHome = `JAVA_HOME_${version}_${arch}`.toUpperCase().replace(/[^0-9A-Z_]/g, '_');
    core.exportVariable('JAVA_HOME', toolPath);
    core.exportVariable(extendedJavaHome, toolPath);
    core.addPath(path.join(toolPath, 'bin'));
    core.setOutput('path', toolPath);
    core.setOutput('version', javaVersion);

    core.info(`Setuped up java ${javaVersion} from ${providerName}`)
}

// this function validates and parse java version to its normal semver notation
function normalizeVersion(version: string): string {
    if (version.slice(0, 2) === '1.') {
      // Trim leading 1. for versions like 1.8
      version = version.slice(2);
      if (!version) {
        throw new Error('1. is not a valid version');
      }
    }
  
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

    if(!semver.coerce(version)) {
        throw new Error(`The version ${version} is not valid semver notation please check README file for code snippets and 
                more detailed information`)
    }
  
    return version;
  }
