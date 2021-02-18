import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { IS_WINDOWS, PLATFORM, IS_MACOS, macOSJavaContentDir } from "../util";
import { IJavaInfo, IJavaRelease, JavaBase, JavaInitOptions } from "./base-installer";
import { IRelease, IReleaseVersion } from './adoptopenjdk-models'

export class AdopOpenJdkDistributor extends JavaBase {
    private platform: string;
    
    constructor(initOptions: JavaInitOptions) {
        super("AdoptOpenJDK", initOptions.version, initOptions.arch, initOptions.javaPackage);
        this.platform = IS_MACOS ? 'mac' : PLATFORM;
    }

    private async getAvailableMajor(range: semver.Range) {
        const urlReleaseVersion = "https://api.adoptopenjdk.net/v3/info/available_releases"
        const javaVersionAvailable = (await this.http.getJson<IReleaseVersion>(urlReleaseVersion)).result;

        if (!javaVersionAvailable) {
            throw new Error(`No versions were found for ${this.distributor}`)
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
        const javaRlease = await this.resolveVersion(range);

        core.info(`Downloading ${this.distributor}, java version ${javaRlease.resolvedVersion}`);
        const javaPath = await tc.downloadTool(javaRlease.link);
        let downloadDir: string;
        
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.distributor}_${this.javaPackage}`, javaRlease.resolvedVersion, this.arch);

        if(process.platform === 'darwin') {
            toolPath = path.join(toolPath, macOSJavaContentDir);
        }

        return { javaPath: toolPath, javaVersion: javaRlease.resolvedVersion };
    }

    protected async resolveVersion(range: semver.Range): Promise<IJavaRelease> {
        const majorVersion = await this.getAvailableMajor(range);
        const releasesUrl = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${majorVersion}/ga?heap_size=normal&image_type=${this.javaPackage}&page=0&page_size=1000&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk&jvm_impl=hotspot&architecture=${this.arch}&os=${this.platform}`;
        const javaRleasesVersion = ( await this.http.getJson<IRelease[]>(releasesUrl)).result;
        const fullVersion = javaRleasesVersion?.find(item => semver.satisfies(item.version_data.semver, range));

        if(!fullVersion) {
            throw new Error(`Could not find satisfied version in ${javaRleasesVersion}`);
        }

        const javaRelease: IJavaRelease = {
            resolvedVersion: fullVersion.version_data.semver,
            link: fullVersion.binaries[0].package.link
        }

        return javaRelease;
    }
}