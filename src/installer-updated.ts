import * as core from '@actions/core';
import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as httpm from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import * as util from './util';

import { JavaFactory } from './providers/java-factory';

export async function install(version: string, arch: string, javaPackage: string, jdkFile?: string) {

    const javaFactory = new JavaFactory(normalizeVersion(version), arch, javaPackage);
    const providerName = 'adopOpenJdk';//'zulu';
    const provider = javaFactory.getJavaProvider(providerName);
    if(!provider) {
        throw new Error('No provider was found');
    }

    const javaInfo = await provider.getJava();
    const javaVersion = javaInfo.javaVersion;
    const toolPath = javaInfo.javaPath;

    let extendedJavaHome = 'JAVA_HOME_' + version + '_' + arch;
    core.exportVariable(extendedJavaHome, toolPath); //TODO: remove for v2
    // For portability reasons environment variables should only consist of
    // uppercase letters, digits, and the underscore. Therefore we convert
    // the extendedJavaHome variable to upper case and replace '.' symbols and
    // any other non-alphanumeric characters with an underscore.
    extendedJavaHome = extendedJavaHome.toUpperCase().replace(/[^0-9A-Z_]/g, '_');
    core.exportVariable('JAVA_HOME', toolPath);
    core.exportVariable(extendedJavaHome, toolPath);
    core.addPath(path.join(toolPath, 'bin'));
    core.setOutput('path', toolPath);
    core.setOutput('version', javaVersion);

    core.info(`Setuped up java ${javaVersion} from ${providerName}`)
}

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
  
    return version;
  }

function parseJavaVersion(versionSpec: string) {

}

function validateJavaVersion(versionSpec: string) {
    
}