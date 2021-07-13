/**
 * @fileoverview this file provides methods handling dependency cache
 */

import { join } from 'path';
import os from 'os';
import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';

const STATE_CACHE_PRIMARY_KEY = 'cache-primary-key';
const CACHE_MATCHED_KEY = 'cache-matched-key';

interface PackageManager {
  id: 'maven' | 'gradle';
  /**
   * Paths of the file that specify the files to cache.
   */
  path: string[];
  pattern: string[];
}
const supportedPackageManager: PackageManager[] = [
  {
    id: 'maven',
    path: [join(os.homedir(), '.m2', 'repository')],
    // https://github.com/actions/cache/blob/0638051e9af2c23d10bb70fa9beffcad6cff9ce3/examples.md#java---maven
    pattern: ['**/pom.xml']
  },
  {
    id: 'gradle',
    path: [join(os.homedir(), '.gradle', 'caches'), join(os.homedir(), '.gradle', 'wrapper')],
    // https://github.com/actions/cache/blob/0638051e9af2c23d10bb70fa9beffcad6cff9ce3/examples.md#java---gradle
    pattern: ['**/*.gradle*', '**/gradle-wrapper.properties']
  }
];

function findPackageManager(id: string): PackageManager {
  const packageManager = supportedPackageManager.find(packageManager => packageManager.id === id);
  if (packageManager === undefined) {
    throw new Error(`unknown package manager specified: ${id}`);
  }
  return packageManager;
}

/**
 * A function that generates a cache key to use.
 * Format of the generated key will be "${{ platform }}-${{ id }}-${{ fileHash }}"".
 * If there is no file matched to {@link PackageManager.path}, the generated key ends with a dash (-).
 * @see {@link https://docs.github.com/en/actions/guides/caching-dependencies-to-speed-up-workflows#matching-a-cache-key|spec of cache key}
 */
async function computeCacheKey(packageManager: PackageManager) {
  return `${process.env['RUNNER_OS']}-${packageManager.id}-${await glob.hashFiles(
    packageManager.pattern.join('\n')
  )}`;
}

/**
 * Restore the dependency cache
 * @param id ID of the package manager, should be "maven" or "gradle"
 */
export async function restore(id: string) {
  const packageManager = findPackageManager(id);
  const primaryKey = await computeCacheKey(packageManager);

  core.debug(`primary key is ${primaryKey}`);
  core.saveState(STATE_CACHE_PRIMARY_KEY, primaryKey);
  if (primaryKey.endsWith('-')) {
    core.warning(
      `No file in ${process.cwd()} matched to [${
        packageManager.pattern
      }], make sure you have checked out the target repository`
    );
    return;
  }

  const matchedKey = await cache.restoreCache(packageManager.path, primaryKey, [
    `${process.env['RUNNER_OS']}-${id}`
  ]);
  if (matchedKey) {
    core.saveState(CACHE_MATCHED_KEY, matchedKey);
    core.info(`Cache restored from key: ${matchedKey}`);
  } else {
    core.info(`${packageManager.id} cache is not found`);
  }
}

/**
 * Save the dependency cache
 * @param id ID of the package manager, should be "maven" or "gradle"
 */
export async function save(id: string) {
  const packageManager = findPackageManager(id);
  const primaryKey = await computeCacheKey(packageManager);
  const matchedKey = core.getState(CACHE_MATCHED_KEY);
  if (matchedKey === primaryKey) {
    // no change in target directories
    core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);
    return;
  }
  try {
    await cache.saveCache(packageManager.path, primaryKey);
    core.info(`Cache saved with the key: ${primaryKey}`);
  } catch (error) {
    if (error.name === cache.ReserveCacheError.name) {
      core.info(error.message);
    } else {
      throw error;
    }
  }
}
