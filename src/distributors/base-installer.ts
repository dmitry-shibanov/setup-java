import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';
import { getJavaPreInstalledPath } from '../util';

export interface JavaInitOptions {
    version: string;
    arch: string;
    javaPackage: string;
}

export abstract class JavaBase {
    protected http: httpm.HttpClient;
    constructor(protected distributor: string, protected version: string, protected arch: string, protected javaPackage: string) {
        this.http = new httpm.HttpClient('setup-java', undefined, {
            allowRetries: true,
            maxRetries: 3
          });
    }

    protected abstract downloadTool(range: semver.Range): Promise<IJavaInfo>;
    protected abstract getAvailableMajor(range: semver.Range): Promise<number>;

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        //const majorVersion = await this.getAvailableMajor(range);
        let javaInfo = this.findTool(`Java_${this.distributor}_${this.javaPackage}`, majorVersion.toString(), this.arch);

        if(!javaInfo) {
            // resolveVersion ()
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
                javaInfo = getJavaPreInstalledPath(version, this.distributor);
    
            }
            return javaInfo;
        }

        return {
            javaVersion,
            javaPath: toolPath
        }
    }

    private getVersionFromPath(toolPath: string) {
        if(toolPath) {
            return path.basename(path.dirname(toolPath));
        }

        return toolPath;
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
}

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}