import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as httpm from '@actions/http-client';

import path from 'path';
import fs from 'fs';
import semver from 'semver';
import { IJavaInfo, IJavaProvider } from './IJavaProvider';
import { IS_WINDOWS, PLATFORM } from '../util';
import { URL } from 'url';

interface IZulu {
    id: number;
    name: string;
    url: string;
    jdk_version: Array<number>;
    zulu_version: Array<number>;
}

interface IZuluDetailed extends IZulu {
    arch: string;
    abi: string;
    hw_bitness: string;
    os: string;
    ext: string;
    bundle_type: string;
    release_status: string;
    support_term: string;
    last_modified: string;
    size: string;
    md5_hash: string;
    sha256_hash: string;
    javafx: boolean;
    features: Array<string>;
}

class ZuluProvider extends IJavaProvider {
    private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    constructor(private version: string, private arch: string, private javaPackage: string = "jdk") {
        super("zulu");
        this.arch = arch === 'x64' ? 'x86' : arch;
        this.platform = PLATFORM === 'darwin' ? 'macos' : PLATFORM;
    }

    public async getJava() {
        const range = new semver.Range(this.version);
        let javaInfo = super.findTool(this.javaPackage, this.version, this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }

    // protected findTool(): string | null;
    // protected findTool(toolName?: string): string | null {
    //     toolName ??= this.javaPackage;
    //     return tc.find(toolName, this.version, this.arch);
    // }    

    protected async downloadTool(range: semver.Range): Promise<IJavaInfo> {
        let toolPath: string;
        const http = new httpm.HttpClient('setup-java', undefined, {
            allowRetries: true,
            maxRetries: 3
        });

        const javaVersion = await this.getJavaVersion(http, range);
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/latest/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&jdk_version=${javaVersion}`;
        const zuluJavaJson = (await http.getJson<IZuluDetailed>(url)).result;

        if(!zuluJavaJson) {
            throw new Error(`No zulu java was found for version ${javaVersion}`);
        }
        const downloadUrl = new URL(`https://api.azul.com/zulu/download/community/v1.0/bundles/${zuluJavaJson.id}/binary`);

        core.info(`Downloading ${this.provider} java version ${javaVersion}`);
        core.info(`Zulu url is ${zuluJavaJson.url}`);
        const javaPath = await tc.downloadTool(zuluJavaJson.url);
        let downloadDir: string;
        
        core.info(`Ectracting ${this.provider} java version ${javaVersion}`);
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.provider}`, javaVersion, this.arch);

        return { javaPath: toolPath, javaVersion };
    }

    private async getJavaVersion(http: httpm.HttpClient, range: semver.Range): Promise<string> {
        const featureCondition = '&feature=';
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64`;

        core.debug(`url get all java versions: ${url}`);
        const zuluJson = (await http.getJson<Array<IZulu>>(url)).result;

        if(!zuluJson || zuluJson.length === 0) {
            throw new Error(`No Zulu java versions were not found for arch ${this.arch}, extenstion ${this.extension}, platform ${this.platform}`);
        }
        core.debug(`get id: ${zuluJson[0].id}`);

        core.debug('Get the list of zulu java versions');
        const zuluVersions = zuluJson.map(item => semver.coerce(item.jdk_version.join('.'))?? "");
        const maxVersion = semver.maxSatisfying(zuluVersions, range);

        if(!maxVersion) {
            throw new Error('No versions are satisfying');
        }

        return maxVersion.raw;
    }
    
}

export default ZuluProvider;