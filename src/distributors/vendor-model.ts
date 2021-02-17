import * as tc from '@actions/tool-cache';
import semver from 'semver';
import path from 'path';
import * as httpm from '@actions/http-client';

export abstract class JavaBase {
    protected distributor: string;
    constructor(distributor: string) {
        this.distributor = distributor;
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        const toolPath = tc.find(toolName, version, arch);
        const javaVersion = this.getVersionFromPath(toolPath);
        if(!javaVersion) {
            return null;
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

    public abstract getJava(): Promise<IJavaInfo>;
    protected abstract downloadTool(range: semver.Range): Promise<IJavaInfo>;
}

export abstract class BaseFactory {
    abstract getJavaDistributor(        http: httpm.HttpClient,
        version: string,
        arch: string,
        javaPackage: string) : JavaBase;
} 

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}