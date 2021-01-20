import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as httpm from '@actions/http-client';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { IJavaInfo, IJavaProvider } from './IJavaProvider';
import { getMachineJavaPath, IS_WINDOWS, IS_MACOS, PLATFORM, extraMacOs } from '../util';

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
    private implemetor: string;
    private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    constructor(private http: httpm.HttpClient, private version: string, private arch: string, private javaPackage: string = "jdk", private features?: string) {
        super("zulu");
        this.arch = arch === 'x64' ? 'x86' : arch;
        this.platform = PLATFORM === 'darwin' ? 'macos' : PLATFORM;
        this.implemetor = "Azul Systems, Inc.";
    }

    public async getJava() {
        const range = new semver.Range(this.version);
        const majorVersion = await this.getAvailableMajor(range);
        let javaInfo = this.findTool(`Java_${this.provider}_${this.javaPackage}`, majorVersion.toString(), this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        let javaInfo = super.findTool(toolName, version, arch);
        if(!javaInfo && this.javaPackage === 'jdk') {
            const javaDist = getMachineJavaPath();
            const versionsDir = fs.readdirSync(javaDist).filter(item => item.includes('zulu'));
            const javaInformations = versionsDir.map(item => {
                let javaPath = path.join(javaDist, item);
                if(IS_MACOS) {
                    javaPath = path.join(javaPath, extraMacOs);
                }
                let javaReleaseFile = path.join(javaPath, 'release');

                if(!(fs.existsSync(javaReleaseFile) && fs.lstatSync(javaReleaseFile).isFile())) {
                    core.info('file does not exist')
                    return null;
                }

                const content: string = fs.readFileSync(javaReleaseFile).toString();
                const javaVersion = this.parseFile("JAVA_VERSION", content);

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

    private parseFile(keyWord: string, content: string) {
        const re = new RegExp(`${keyWord}="(.*)"$`, "gm");
        const regexExecArr = re.exec(content);
        core.debug(`regexExecArr is ${regexExecArr}`);
        if(!regexExecArr) {
            return null;
        }

        core.debug(`regexExecArr[1] after exec is ${regexExecArr[1]}`);
        let version = regexExecArr[1].startsWith('1.') ? regexExecArr[1].replace('1.', '') : regexExecArr[1];
        core.debug(`version after exec is ${version}`);
        return version;
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

        if(!zuluJavaJson) {
            throw new Error(`No zulu java was found for version ${javaVersion}`);
        }

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
        toolPath = await tc.cacheDir(archivePath, `Java_${this.provider}_${this.javaPackage}`, javaVersion, this.arch);

        return { javaPath: toolPath, javaVersion };
    }

    private async getJavaVersion(http: httpm.HttpClient, range: semver.Range): Promise<string> {
        let featureCondition = '';
        if(!this.features) {
            featureCondition = `feature=${this.features}`;
        }
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&${featureCondition}`;

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