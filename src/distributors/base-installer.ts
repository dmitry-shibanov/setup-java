import * as tc from '@actions/tool-cache';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';
import { getJavaPreInstalledPath } from '../util';

export abstract class JavaBase {
    constructor(protected distributor: string, protected version: string, protected arch: string, protected javaPackage: string) {
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

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        const majorVersion = await this.getAvailableMajor(range);
        let javaInfo = this.findTool(`Java_${this.distributor}_${this.javaPackage}`, majorVersion.toString(), this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }
    protected abstract downloadTool(range: semver.Range): Promise<IJavaInfo>;
    protected abstract getAvailableMajor(range: semver.Range): Promise<number>;
}

export abstract class BaseFactory {
    abstract getJavaDistributor(        
        http: httpm.HttpClient,
        version: string,
        arch: string,
        javaPackage: string) : JavaBase;
} 

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}