import semver from 'semver';
import ZuluProvider from './zulu-provider';

export abstract class IJavaProvider {
    protected provider: string;
    constructor(provider: string) {
        this.provider = provider;
    }

    protected findTool(toolName?: string): IJavaInfo | null {
        return null;
    }

    public abstract async getJava(): Promise<IJavaInfo>;
    protected abstract async downloadTool(range: semver.Range): Promise<IJavaInfo>;
}

export class JavaFactory {

    constructor(private version: string, private arch: string, private javaPackage: string = "jdk") { };

    public getJavaProvider(provider: JavaProviders|string): IJavaProvider | null {
        switch(provider) {
            case JavaProviders.AdopOpenJdk:
                return null;
            case JavaProviders.Zulu:
                return new ZuluProvider(this.version, this.arch, this.javaPackage);
            default:
                return null;
        }
    }
}

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}

export enum JavaProviders {
    AdopOpenJdk = "adopOpenJdk",
    Zulu = "zulu"
}