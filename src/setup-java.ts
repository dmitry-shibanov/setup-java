import * as core from '@actions/core';
import * as auth from './auth';

import * as constants from './constants';
import * as path from 'path';
import { getJavaDistributor } from './distributors/distributor-factory';
import { JavaInstallerOptions } from './distributors/base-models';

async function run() {
  try {
    const version = core.getInput(constants.INPUT_JAVA_VERSION);
    const arch = core.getInput(constants.INPUT_ARCHITECTURE);
    const distributionName = core.getInput(constants.INPUT_DISTRIBUTION);
    const packageType = core.getInput(constants.INPUT_JAVA_PACKAGE);
    const jdkFile = core.getInput(constants.INPUT_JDK_FILE);

    if (version || distributionName) {
      if (!version || !distributionName) {
        throw new Error(`Either ‘${constants.INPUT_JAVA_VERSION}’ or ‘${constants.INPUT_DISTRIBUTION}’ are not specified. Both inputs are required when using together`);
      }

      const installerOptions: JavaInstallerOptions = {
        arch,
        packageType,
        version
      };

      const distributor = getJavaDistributor(distributionName, installerOptions, jdkFile);
      if (!distributor) {
        throw new Error(`No supported distributor was found for input ${distributionName}`);
      }

      const result = await distributor.setupJava();

      core.info('');
      core.info('Java configuration:');
      core.info(`  Java distributor: ${distributionName}`);
      core.info(`  Java version: ${result.javaVersion}`);
      core.info(`  Java path: ${result.javaPath}`);
      core.info('');
    }

    const matchersPath = path.join(__dirname, '..', '..', '.github');
    core.info(`##[add-matcher]${path.join(matchersPath, 'java.json')}`);

    await auth.configureAuthentication();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
