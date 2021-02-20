import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { JavaInstallerResults, JavaDownloadRelease, JavaBase, JavaInstallerOptions } from './base-installer';
import { IZulu, IZuluDetailed } from './zulu-models';
import { IS_WINDOWS, IS_MACOS, PLATFORM } from '../util';

export class ZuluDistributor extends JavaBase {
    private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    constructor(initOptions: JavaInstallerOptions) {
        super("Zulu", initOptions);
        this.platform = IS_MACOS ? 'macos' : PLATFORM;
        this.arch = this.arch === 'x64' ? 'x86' : this.arch;
    }

    protected async downloadTool(javaRelease: JavaDownloadRelease): Promise<JavaInstallerResults> {
        let toolPath: string;
        let extractedJavaPath: string;

        const javaArchivePath = await tc.downloadTool(javaRelease.link);
        
        core.info(`Ectracting ${this.distributor} java version ${javaRelease.resolvedVersion}`);
        if(IS_WINDOWS) {
            extractedJavaPath = await tc.extractZip(javaArchivePath);
        } else {
            extractedJavaPath = await tc.extractTar(javaArchivePath);
        }

        const archiveName = fs.readdirSync(extractedJavaPath)[0];
        const archivePath = path.join(extractedJavaPath, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.distributor}_${this.javaPackage}`, javaRelease.resolvedVersion, this.arch);

        return { javaPath: toolPath, javaVersion: javaRelease.resolvedVersion };
    }

    protected async findPackageForDownload(version: semver.Range): Promise<JavaDownloadRelease> {
        const resolvedFullVersion = await this.getAvailableVersion(version);

        const availableZuluReleaseUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/latest/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&jdk_version=${resolvedFullVersion}&bundle_type=${this.javaPackage}`;
        const availableZuluRelease = (await this.http.getJson<IZuluDetailed>(availableZuluReleaseUrl)).result;

        if (!availableZuluRelease) {
            throw new Error(`No zulu java was found for version ${resolvedFullVersion}`);
        }

        return {link: availableZuluRelease.url, resolvedVersion: resolvedFullVersion};
    }

    private async getAvailableVersion(range: semver.Range): Promise<string> {
        const availableVersionsUrl = `https://api.azul.com/zulu/download/community/v1.0/bundles/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64`;

        const availableVersionsList = (await this.http.getJson<Array<IZulu>>(availableVersionsUrl)).result;

        if (!availableVersionsList || availableVersionsList.length === 0) {
            throw new Error(`No Zulu java versions were not found for arch ${this.arch}, extenstion ${this.extension}, platform ${this.platform}`);
        }

        const zuluVersions = availableVersionsList.map(item => semver.coerce(item.jdk_version.join('.'))).filter((item): item is semver.SemVer => !!item);
        const resolvedVersion = semver.maxSatisfying(zuluVersions, range);

        if(!resolvedVersion) {
            throw new Error('No versions are satisfying');
        }

        return resolvedVersion.raw;
    }
    
}