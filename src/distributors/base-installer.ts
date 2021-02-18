import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';
import {  getVersionFromToolcachePath, parseLocalVersions } from '../util';

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

    protected abstract downloadTool(javaRelease: IJavaRelease): Promise<IJavaInfo>;
    protected abstract resolveVersion(range: semver.Range): Promise<IJavaRelease>;

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        let foundJava = this.findInToolcache(range);
        if (!foundJava) {
            // try to find Java in default system locations outside tool-cache
            foundJava = this.findInKnownLocations(range)
        }

        if(!foundJava) {
            // download Java if it is not found locally
            const javaRelease = await this.resolveVersion(range)
            foundJava = await this.downloadTool(javaRelease);
        }

        this.setJavaDefault(foundJava.javaPath);

        return foundJava;
    }

    protected findInToolcache(version: semver.Range): IJavaInfo | null {
        const toolPath = tc.find(`Java_${this.distributor}_${this.javaPackage}`, version.raw, this.arch);
        if (!toolPath) {
            return null;
        }

        return {
            javaVersion: getVersionFromToolcachePath(toolPath),
            javaPath: toolPath
        };
    }

    protected findInKnownLocations(version: semver.Range): IJavaInfo | null {
        if(this.javaPackage !== 'jdk') {
            return null;
        }
        
        let knownLocation;
        switch(process.platform) {
            case "win32": knownLocation = path.normalize('C:/Program Files/Java');
            break;
            case "darwin": knownLocation = '/Library/Java/JavaVirtualMachines';
            break;
            default: knownLocation = '/usr/lib/jvm'
        }

        const localVersions = parseLocalVersions(knownLocation, this.distributor);
        return localVersions.find(localVersion => semver.satisfies(localVersion.javaVersion, version)) ?? null;
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

    protected getJavaVersionsPath(): string {
        switch(process.platform) {
            case "win32": return path.normalize('C:/Program Files/Java');
            case "darwin": return '/Library/Java/JavaVirtualMachines'
            default: return '/usr/lib/jvm'
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
}