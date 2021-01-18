import semver from 'semver';
import * as httpm from '@actions/http-client';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import { IS_WINDOWS, PLATFORM, getMachineJavaPath, IS_MACOS, extraMacOs } from "../util";
import { IJavaInfo, IJavaProvider } from "./IJavaProvider";

import fs from 'fs';
import path from 'path';

interface IReleaseVersion {
    available_lts_releases: Array<number>,
    available_releases: Array<number>,
    most_recent_feature_release: number,
    most_recent_feature_version: number,
    most_recent_lts: number,
    tip_version: number
}

interface IRelease {
        binaries: [
            {
                architecture: string,
                heap_size: string,
                image_type: string,
                jvm_impl: string,
                os: string,
                package: {
                    checksum: string,
                    checksum_link: string,
                    download_count: number,
                    link: string,
                    metadata_link: string,
                    name: string,
                    size: string
                },
                project: string,
                scm_ref: string,
                updated_at: string
            }
        ],
        id: string,
        release_link: string,
        release_name: string,
        release_type: string,
        vendor: string,
        version_data: {
            build: number,
            major: number,
            minor: number,
            openjdk_version: string,
            security: string,
            semver: string
        }
}

class AdopOpenJdkProvider extends IJavaProvider {
    private platform: string;
    private implemetor: string;
    
    constructor(private version: string, private arch: string, private javaPackage: string = "jdk") {
        super("adoptopenjdk");
        this.platform = PLATFORM === 'darwin' ? 'mac' : PLATFORM;
        //         IMPLEMENTOR="AdoptOpenJDK"
        this.implemetor = "AdoptOpenJDK";
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        let javaInfo = super.findTool(`Java_${this.provider}`, this.version, this.arch);
        if(!javaInfo) {
            const javaDist = getMachineJavaPath();
            const versionsDir = fs.readdirSync(javaDist);
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
                core.info(`content is ${content}`);
                const re1 = /JAVA_VERSION=\"(.*)\"$/gm
                const regexExecArr = re1.exec(content);
                core.info(`java version is ${regexExecArr![1]}`);
                const re2 = /IMPLEMENTOR=\"(.*)\"$/gm;
                const regexExecArr2 = re2.exec(content);
                core.info(`IMPLEMENTOR is ${regexExecArr2![1]}`);
                if(!regexExecArr || !regexExecArr2) {
                    core.info('No match was found');
                    return null;
                }

                return javaInfo = {
                    javaVersion: regexExecArr[1],
                    javaPath: javaPath
                }
            });

            let javaInfoC = javaInformations.find(item => {
                return item && semver.satisfies(item.javaVersion, version);
            });

            if(!javaInfoC) {
                return null;
            }

            javaInfo = javaInfoC;
        }
        return javaInfo;
    }

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        let javaInfo = this.findTool(`Java_${this.provider}`, this.version, this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }

    protected async downloadTool(range: semver.Range): Promise<IJavaInfo> {
        let toolPath: string;
        const http = new httpm.HttpClient('setup-java', undefined, {
            allowRetries: true,
            maxRetries: 3
        });
        const versionSpec = this.version;
        const urlReleaseVersion = "https://api.adoptopenjdk.net/v3/info/available_releases"
        const javaVersionAvailable = (await http.getJson<IReleaseVersion>(urlReleaseVersion)).result;

        if (!javaVersionAvailable) {
            throw new Error("No versions were found")
        }

        const javaVersions = javaVersionAvailable.available_releases.map(item => semver.coerce(item)!)!;

        const majorVersion = semver.maxSatisfying(javaVersions, new semver.Range(versionSpec))?.major;

        if(!majorVersion) {
            throw new Error('Could not get major version');
        }

        const releasesUrl = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${majorVersion}/ga?heap_size=normal&image_type=jdk&page=0&page_size=1000&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk&jvm_impl=hotspot&architecture=${this.arch}&os=${this.platform}`;
        const javaRleasesVersion = ( await http.getJson<IRelease[]>(releasesUrl)).result;

        if(!javaRleasesVersion) {
            throw new Error(`error in ${releasesUrl}`);
        }
        const fullVersion = javaRleasesVersion.find(item => semver.satisfies(item.version_data.semver, range));

        if(!fullVersion) {
            throw new Error('version was not found by find call');
        }

        core.info(`Downloading ${this.provider} java version ${fullVersion.version_data.semver}`);
        core.info(`Zulu url is ${fullVersion.binaries[0].package.link}`);
        const javaPath = await tc.downloadTool(fullVersion.binaries[0].package.link);
        let downloadDir: string;
        
        core.info(`Ectracting ${this.provider} java version ${fullVersion.version_data.semver}`);
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.provider}`, fullVersion.version_data.semver, this.arch);

        if(process.platform === 'darwin') {
            toolPath = path.join(toolPath, 'Contents', 'Home')
        }

        return { javaPath: toolPath, javaVersion: fullVersion.version_data.semver };
    }
}

export default AdopOpenJdkProvider;