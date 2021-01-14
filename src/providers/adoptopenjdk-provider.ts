import semver from 'semver';
import * as httpm from '@actions/http-client';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import { IS_WINDOWS, PLATFORM } from "../util";
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
    // https://api.adoptopenjdk.net/v3/assets/feature_releases/8/ga?heap_size=normal&image_type=jdk&page=0&page_size=1000&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk&jvm_impl=hotspot&architecture=x64&os=linux
    // private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    
    constructor(private version: string, private arch: string, private javaPackage: string = "jdk") {
        super("adoptopenjdk");
        this.version = this.fixJavaVersion(version);
        this.platform = PLATFORM === 'darwin' ? 'mac' : PLATFORM;
    }

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        let javaInfo = this.findTool();

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
        const versionSpec = this.fixJavaVersion(this.version);
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

        return { javaPath: toolPath, javaVersion: fullVersion.version_data.semver };
    }

    private fixJavaVersion(versionSpec: string) {
        const version = versionSpec.startsWith('1.') ? versionSpec.replace('1.', '') : versionSpec;
        return version;
    }
}

export default AdopOpenJdkProvider;