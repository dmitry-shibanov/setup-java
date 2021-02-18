import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';
import { getJavaPreInstalledPath, IS_LINUX, IS_WINDOWS } from '../util';

export interface JavaInitOptions {
    version: string;
    arch: string;
    javaPackage: string;
}

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}

export interface IJavaRelease {
    resolvedVersion: string;
    link: string;
}

export abstract class JavaBase {
    protected http: httpm.HttpClient;
    constructor(protected distributor: string, protected version: string, protected arch: string, protected javaPackage: string) {
        this.http = new httpm.HttpClient('setup-java', undefined, {
            allowRetries: true,
            maxRetries: 3
          });
          this.version = this.normalizeVersion(version);
    }

    protected abstract downloadTool(range: semver.Range): Promise<IJavaInfo>;
    protected abstract resolveVersion(range: semver.Range): Promise<IJavaRelease>;

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        let javaInfo = this.findTool(`Java_${this.distributor}_${this.javaPackage}`, range.raw, this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        this.setJavaDefault(javaInfo.javaPath);

        return javaInfo;
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        const toolPath = tc.find(toolName, version, arch);
        let javaInfo: IJavaInfo | null = null;
        const javaVersion = this.getVersionFromPath(toolPath);
        if(!javaVersion) {
            if(this.javaPackage === 'jdk') {
                javaInfo = getJavaPreInstalledPath(version, this.distributor, this.getJavaVersionsPath());
    
            }
            return javaInfo;
        }

        return {
            javaVersion,
            javaPath: toolPath
        }
    }

    protected setJavaDefault(toolPath: string) {
        const extendedJavaHome = `JAVA_HOME_${this.version}_${this.arch}`
            .toUpperCase()
            .replace(/[^0-9A-Z_]/g, '_');
        core.exportVariable('JAVA_HOME', toolPath);
        core.exportVariable(extendedJavaHome, toolPath);
        core.addPath(path.join(toolPath, 'bin'));
        core.setOutput('path', toolPath);
        core.setOutput('version', this.version);
    }

    protected getJavaVersionsPath() {
        const windowsPreInstalled = path.normalize('C:/Program Files/Java');
        const linuxPreInstalled = '/usr/lib/jvm';
        const macosPreInstalled = '/Library/Java/JavaVirtualMachines';
      
        if (IS_WINDOWS) {
          return windowsPreInstalled;
        } else if (IS_LINUX) {
          return linuxPreInstalled;
        } else {
          return macosPreInstalled;
        }
      }

    // this function validates and parse java version to its normal semver notation
    protected normalizeVersion(version: string): string {
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
    
        if (!semver.validRange(version)) {
          throw new Error(`The version ${version} is not valid semver notation please check README file for code snippets and 
                      more detailed information`);
        }
    
        return version;
    }

      private getVersionFromPath(toolPath: string) {
        if(toolPath) {
            return path.basename(path.dirname(toolPath));
        }

        return toolPath;
    }
}