import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as httpm from '@actions/http-client';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { IJavaInfo, IJavaVendor } from './vendor-model';
import { IZulu, IZuluDetailed } from './zulu-models';
import { getJavaVersionsPath, IS_WINDOWS, IS_MACOS, PLATFORM, extraMacOs, parseFile, getJavaReleaseFileContent } from '../util';

class ZuluVendor extends IJavaVendor {
    private implemetor: string;
    private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    constructor(private http: httpm.HttpClient, private version: string, private arch: string, private javaPackage: string = "jdk") {
        super("zulu");
        this.arch = arch === 'x64' ? 'x86' : arch;
        this.platform = PLATFORM === 'darwin' ? 'macos' : PLATFORM;
        this.implemetor = "Azul Systems, Inc.";
    }

    public async getJava() {
        const range = new semver.Range(this.version);
        const majorVersion = await this.getAvailableMajor(range);
        let javaInfo = this.findTool(`Java_${this.vendor}_${this.javaPackage}`, majorVersion.toString(), this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        let javaInfo = super.findTool(toolName, version, arch);
        if(!javaInfo && this.javaPackage === 'jdk') {
            const javaDist = getJavaVersionsPath();
            const versionsDir = fs.readdirSync(javaDist).filter(item => item.includes('zulu'));
            const javaInformations = versionsDir.map(item => {
                let javaPath = path.join(javaDist, item);
                if(IS_MACOS) {
                    javaPath = path.join(javaPath, extraMacOs);
                }

                const content: string | null = getJavaReleaseFileContent(javaPath);
                if (!content) {
                    return null;
                }

                const javaVersion = parseFile("JAVA_VERSION", content);

                if(!javaVersion) {
                    core.info('No match was found');
                    return null;
                }

                core.debug(`javaVersion.split('_')[0] is ${javaVersion.split('_')[0]}`);

                return javaInfo = {
                    javaVersion: semver.coerce(javaVersion.split('_')[0])!.version,
                    javaPath: javaPath
                }
            });

            javaInfo = javaInformations.find(item => {
                return item && semver.satisfies(item.javaVersion, new semver.Range(version));
            }) || null;

        }
        return javaInfo;
    }

    private async getAvailableMajor(range: semver.Range) {
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/?os=${this.platform}&arch=${this.arch}&hw_bitness=64&ext=${this.extension}&bundle_type=${this.javaPackage}`;
        const zuluJavaJson = (await this.http.getJson<Array<IZulu>>(url)).result;
        if(!zuluJavaJson) {
            throw new Error(`No zulu java was found for all`);
        }

        const javaVersions = zuluJavaJson.map(item => semver.coerce(item.jdk_version.join('.'))!);
        const majorVersion = semver.maxSatisfying(javaVersions, range);

        if(!majorVersion) {
            throw new Error(`No zulu major versions was found`);
        }

        return majorVersion.major;
    }

    protected async downloadTool(range: semver.Range): Promise<IJavaInfo> {
        let toolPath: string;

        const javaVersion = await this.getJavaVersion(this.http, range);
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/latest/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&jdk_version=${javaVersion}&bundle_type=${this.javaPackage}`;
        const zuluJavaJson = (await this.http.getJson<IZuluDetailed>(url)).result;
        core.debug(`url for initilial download tool is ${url}`);
        core.debug(`zuluJavaJson for initilial download tool is ${zuluJavaJson}`);

        if(!zuluJavaJson) {
            throw new Error(`No zulu java was found for version ${javaVersion}`);
        }

        core.info(`Downloading ${this.vendor} java version ${javaVersion}`);
        core.info(`Zulu url is ${zuluJavaJson.url}`);
        const javaPath = await tc.downloadTool(zuluJavaJson.url);
        let downloadDir: string;
        
        core.info(`Ectracting ${this.vendor} java version ${javaVersion}`);
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.vendor}_${this.javaPackage}`, javaVersion, this.arch);

        return { javaPath: toolPath, javaVersion };
    }

    private async getJavaVersion(http: httpm.HttpClient, range: semver.Range): Promise<string> {
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

export default ZuluVendor;