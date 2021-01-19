import * as core from '@actions/core';
import * as installer from './installer-updated';
import * as auth from './auth';
import * as gpg from './gpg';
import {
  INPUT_JAVA_VERSION,
  INPUT_ARCHITECTURE,
  INPUT_JAVA_PACKAGE,
  INPUT_JDK_FILE,
  INPUT_SERVER_ID,
  INPUT_SERVER_USERNAME,
  INPUT_SERVER_PASSWORD,
  INPUT_GPG_PRIVATE_KEY,
  INPUT_DEFAULT_GPG_PRIVATE_KEY,
  INPUT_GPG_PASSPHRASE,
  INPUT_DEFAULT_GPG_PASSPHRASE,
  STATE_GPG_PRIVATE_KEY_FINGERPRINT
} from './constants';
import * as path from 'path';


async function configureAuthentication() {
  const id = core.getInput(INPUT_SERVER_ID, {required: false});
  const username = core.getInput(INPUT_SERVER_USERNAME, {
    required: false
  });
  const password = core.getInput(INPUT_SERVER_PASSWORD, {
    required: false
  });
  const gpgPrivateKey =
    core.getInput(INPUT_GPG_PRIVATE_KEY, {required: false}) ||
    INPUT_DEFAULT_GPG_PRIVATE_KEY;
  const gpgPassphrase =
    core.getInput(INPUT_GPG_PASSPHRASE, {required: false}) ||
    (gpgPrivateKey ? INPUT_DEFAULT_GPG_PASSPHRASE : undefined);

  if (gpgPrivateKey) {
    core.setSecret(gpgPrivateKey);
  }

  await auth.configAuthentication(id, username, password, gpgPassphrase);

  if (gpgPrivateKey) {
    core.info('importing private key');
    const keyFingerprint = (await gpg.importKey(gpgPrivateKey)) || '';
    core.saveState(STATE_GPG_PRIVATE_KEY_FINGERPRINT, keyFingerprint);
  }
}

async function run() {
  try {
    const version = core.getInput(INPUT_JAVA_VERSION, {required: true});
    const arch = core.getInput(INPUT_ARCHITECTURE, {required: true});
    const provider = core.getInput('provider') || 'zulu';
    const javaPackage = core.getInput(INPUT_JAVA_PACKAGE, {
      required: true
    });
    const jdkFile = core.getInput(INPUT_JDK_FILE, {required: false});
    const features = core.getInput("feature");

    await installer.install(version, arch, javaPackage, provider, jdkFile, features);

    const matchersPath = path.join(__dirname, '..', '..', '.github');
    core.info(`##[add-matcher]${path.join(matchersPath, 'java.json')}`);

    await configureAuthentication()
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
