import semver from 'semver';

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

export interface IJavaInfo {
    javaVersion: string;
    javaPath: string;
}