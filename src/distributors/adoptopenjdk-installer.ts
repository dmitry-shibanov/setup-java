import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import fs from 'fs';
import path from 'path';
import semver from 'semver';

import { IS_WINDOWS, PLATFORM, IS_MACOS, macOSJavaContentDir } from "../util";
import { JavaInstallerResults, JavaDownloadRelease, JavaBase, JavaInstallerOptions } from "./base-installer";
import { IRelease, IReleaseVersion } from './adoptopenjdk-models'

export class AdoptOpenJDKDistributor extends JavaBase {
    
    constructor(initOptions: JavaInstallerOptions) {
        super("AdoptOpenJDK", initOptions);
    }

    protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
        let toolPath: string;
        let extractedJavaPath: string;

        core.info(`Downloading ${this.distributor}, java version ${javaRelease.resolvedVersion}`);
        const javaArchivePath = await tc.downloadTool(javaRelease.link);
        
        if(IS_WINDOWS) {
            extractedJavaPath = await tc.extractZip(javaArchivePath);
        } else {
            extractedJavaPath = await tc.extractTar(javaArchivePath);
        }

        const archiveName = fs.readdirSync(extractedJavaPath)[0];
        const archivePath = path.join(extractedJavaPath, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.distributor}_${this.javaPackage}`, javaRelease.resolvedVersion, this.arch);

        if (process.platform === 'darwin') {
            toolPath = path.join(toolPath, macOSJavaContentDir);
        }

        return { javaPath: toolPath, javaVersion: javaRelease.resolvedVersion };
    }

    protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
        const platform = IS_MACOS ? 'mac' : PLATFORM;

        const resolvedMajorVersion = await this.resolveMajorVersion(version);
        const availableVersionsUrl = `https://api.adoptopenjdk.net/v3/assets/feature_releases/${resolvedMajorVersion}/ga?heap_size=normal&image_type=${this.javaPackage}&page=0&page_size=1000&project=jdk&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk&jvm_impl=hotspot&architecture=${this.arch}&os=${platform}`;
        const availableVersionsList = ( await this.http.getJson<IRelease[]>(availableVersionsUrl)).result;
        const resolvedFullVersion = availableVersionsList?.find(item => semver.satisfies(item.version_data.semver, version));

        if(!resolvedFullVersion) {
            throw new Error(`Could not find satisfied version in ${availableVersionsList}`);
        }

        return {
            resolvedVersion: resolvedFullVersion.version_data.semver,
            link: resolvedFullVersion.binaries[0].package.link
        }
    }

    private async resolveMajorVersion(range: semver.Range) {
        const availableMajorVersionsUrl = "https://api.adoptopenjdk.net/v3/info/available_releases"
        const availableMajorVersions = (await this.http.getJson<IReleaseVersion>(availableMajorVersionsUrl)).result;

        if (!availableMajorVersions) {
            throw new Error(`No versions were found for ${this.distributor}`)
        }

        const coercedAvailableVersions = availableMajorVersions.available_releases.map(item => semver.coerce(item)).filter((item): item is semver.SemVer => !!item);
        const resolvedMajorVersion = semver.maxSatisfying(coercedAvailableVersions, range)?.major;

        if(!resolvedMajorVersion) {
            throw new Error(`Could find version which satisfying. Versions: ${availableMajorVersions.available_releases}`);
        }

        return resolvedMajorVersion;
    }
}