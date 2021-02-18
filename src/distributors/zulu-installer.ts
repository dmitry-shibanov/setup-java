import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

import path from 'path';
import fs from 'fs';
import semver from 'semver';

import { IJavaInfo, IJavaRelease, JavaBase, JavaInitOptions } from './base-installer';
import { IZulu, IZuluDetailed } from './zulu-models';
import { IS_WINDOWS, IS_MACOS, PLATFORM } from '../util';

export class ZuluDistributor extends JavaBase {
    private extension = IS_WINDOWS ? 'zip' : 'tar.gz';
    private platform: string;
    constructor(initOptions: JavaInitOptions) {
        super("Azul Systems, Inc.", initOptions.version, initOptions.arch, initOptions.javaPackage);
        this.platform = IS_MACOS ? 'macos' : PLATFORM;
        this.arch = this.arch === 'x64' ? 'x86' : this.arch;
    }

    protected async downloadTool(javaRelease: IJavaRelease): Promise<IJavaInfo> {
        let toolPath: string;
        let downloadDir: string;

        const javaPath = await tc.downloadTool(javaRelease.link);
        
        core.info(`Ectracting ${this.distributor} java version ${javaRelease.resolvedVersion}`);
        if(IS_WINDOWS) {
            downloadDir = await tc.extractZip(javaPath);
        } else {
            downloadDir = await tc.extractTar(javaPath);
        }

        const archiveName = fs.readdirSync(downloadDir)[0];
        const archivePath = path.join(downloadDir, archiveName);
        toolPath = await tc.cacheDir(archivePath, `Java_${this.distributor.replace(' ', '')}_${this.javaPackage}`, javaRelease.resolvedVersion, this.arch);

        return { javaPath: toolPath, javaVersion: javaRelease.resolvedVersion };
    }

    protected async resolveVersion(range: semver.Range): Promise<IJavaRelease> {
        const resolvedVersion = await this.getAvailableVersion(range);

        const urlBinary = `https://api.azul.com/zulu/download/community/v1.0/bundles/latest/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64&jdk_version=${resolvedVersion}&bundle_type=${this.javaPackage}`;
        const zuluJavaJson = (await this.http.getJson<IZuluDetailed>(urlBinary)).result;

        if(!zuluJavaJson) {
            throw new Error(`No zulu java was found for version ${resolvedVersion}`);
        }

        return {link: zuluJavaJson.url, resolvedVersion};
    }

    private async getAvailableVersion(range: semver.Range): Promise<string> {
        const url = `https://api.azul.com/zulu/download/community/v1.0/bundles/?ext=${this.extension}&os=${this.platform}&arch=${this.arch}&hw_bitness=64`;

        const zuluJson = (await this.http.getJson<Array<IZulu>>(url)).result;

        if(!zuluJson || zuluJson.length === 0) {
            throw new Error(`No Zulu java versions were not found for arch ${this.arch}, extenstion ${this.extension}, platform ${this.platform}`);
        }

        const zuluVersions = zuluJson.map(item => semver.coerce(item.jdk_version.join('.'))?? "");
        const maxVersion = semver.maxSatisfying(zuluVersions, range);

        if(!maxVersion) {
            throw new Error('No versions are satisfying');
        }

        return maxVersion.raw;
    }
    
}