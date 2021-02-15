import * as tc from '@actions/tool-cache';
import semver from 'semver';
import path from 'path';

export abstract class IJavaVendor {
    protected vendor: string;
    constructor(vendor: string) {
        this.vendor = vendor;
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

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}