import * as httpm from '@actions/http-client';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { IS_WINDOWS, PLATFORM, getJavaPreInstalledPath, IS_MACOS, macOSJavaContentDir, getJavaReleaseFileContent, parseFile } from "../util";
import { IJavaInfo, IJavaVendor } from "./vendor-model";
import { IRelease, IReleaseVersion } from './adoptopenjdk-models'

class AdopOpenJdkVendor extends IJavaVendor {
    private platform: string;
    private implemetor: string;
    
    constructor(private http: httpm.HttpClient, private version: string, private arch: string, private javaPackage: string = "jdk") {
        super("adoptopenjdk");
        this.platform = IS_MACOS ? 'mac' : PLATFORM;
        this.implemetor = "AdoptOpenJDK";
    }

    protected findTool(toolName: string, version: string, arch: string): IJavaInfo | null {
        let javaInfo = super.findTool(toolName, version, arch);
        if(!javaInfo && this.javaPackage === 'jdk') {
            javaInfo = getJavaPreInstalledPath(version, this.implemetor);

        }
        return javaInfo;
    }

    public async getJava(): Promise<IJavaInfo> {
        const range = new semver.Range(this.version);
        const majorVersion = await this.getAvailableReleases(range);

        let javaInfo = this.findTool(`Java_${this.vendor}_${this.javaPackage}`, majorVersion.toString(), this.arch);

        if(!javaInfo) {
            javaInfo = await this.downloadTool(range);
        }

        return javaInfo;
    }

    private async getAvailableReleases(range: semver.Range) {
        const urlReleaseVersion = "https://api.adoptopenjdk.net/v3/info/available_releases"
        const javaVersionAvailable = (await this.http.getJson<IReleaseVersion>(urlReleaseVersion)).result;

        if (!javaVersionAvailable) {
            throw new Error(`No versions were found for ${this.implemetor}`)
        }

        const javaSemVer = javaVersionAvailable.available_releases.map(item => semver.coerce(item)!)!;
        const majorVersion = semver.maxSatisfying(javaSemVer, range)?.major;

        if(!majorVersion) {
            throw new Error(`Could find version which satisfying. Versions: ${javaVersionAvailable.available_releases}`);
        }

        return majorVersion;
    }

    protected async downloadTool(range: semver.Range): Promise<IJavaInfo> {
        let toolPath: string;

        const majorVersion = await this.getAvailableReleases(range);
        const releasesUrl = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${majorVersion}/ga?heap_size=normal&image_type=${this.javaPackage}&page=0&page_size=1000&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk&jvm_impl=hotspot&architecture=${this.arch}&os=${this.platform}`;
        const javaRleasesVersion = ( await this.http.getJson<IRelease[]>(releasesUrl)).result;
        const fullVersion = javaRleasesVersion?.find(item => semver.satisfies(item.version_data.semver, range));

        if(!fullVersion) {
            throw new Error(`Could not find satisfied version in ${javaRleasesVersion}`);
        }

        core.info(`Downloading ${this.vendor}, java version ${fullVersion.version_data.semver}`);
        const javaPath = await tc.downloadTool(fullVersion.binaries[0].package.link);
        let downloadDir: string;
        
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.vendor}_${this.javaPackage}`, fullVersion.version_data.semver, this.arch);

        if(process.platform === 'darwin') {
            toolPath = path.join(toolPath, macOSJavaContentDir);
        }

        return { javaPath: toolPath, javaVersion: fullVersion.version_data.semver };
    }
}

export default AdopOpenJdkVendor;