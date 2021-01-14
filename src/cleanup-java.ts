import * as core from '@actions/core';
import * as gpg from './gpg';
import { INPUT_GPG_PRIVATE_KEY, STATE_GPG_PRIVATE_KEY_FINGERPRINT } from './constants';

async function run() {
  if (core.getInput(INPUT_GPG_PRIVATE_KEY, {required: false})) {
    core.info('removing private key from keychain');
    try {
      const keyFingerprint = core.getState(
        STATE_GPG_PRIVATE_KEY_FINGERPRINT
      );
      await gpg.deleteKey(keyFingerprint);
    } catch (error) {
      core.setFailed('failed to remove private key');
    }
  }
}

run();
