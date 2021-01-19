import * as core from '@actions/core';
import * as httpm from '@actions/http-client';
import * as path from 'path';

import { JavaFactory } from './providers/java-factory';
import { normalizeVersion } from './util';

export async function install(version: string, arch: string, javaPackage: string, providerName: string, features: string, jdkFile?: string) {

    const http = new httpm.HttpClient('setup-java', undefined, {
        allowRetries: true,
        maxRetries: 3
    });

    const javaFactory = new JavaFactory(http, normalizeVersion(version), arch, javaPackage, features);
    const provider = javaFactory.getJavaProvider(providerName);
    if(!provider) {
        throw new Error('No provider was found');
    }

    const javaInfo = await provider.getJava();
    const { javaVersion, javaPath: toolPath } = javaInfo;

    const extendedJavaHome = `JAVA_HOME_${version}_${arch}`.toUpperCase().replace(/[^0-9A-Z_]/g, '_');
    core.exportVariable('JAVA_HOME', toolPath);
    core.exportVariable(extendedJavaHome, toolPath);
    core.addPath(path.join(toolPath, 'bin'));
    core.setOutput('path', toolPath);
    core.setOutput('version', javaVersion);

    core.info(`Setuped up java ${javaVersion} from ${providerName}`)
}
