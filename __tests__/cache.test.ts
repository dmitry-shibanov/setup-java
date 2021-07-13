import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { restore, save } from '../src/cache';
import * as fs from 'fs';
import * as os from 'os';
import * as core from '@actions/core';
import * as cache from '@actions/cache';

describe('dependency cache', () => {
  const ORIGINAL_RUNNER_OS = process.env['RUNNER_OS'];
  const ORIGINAL_GITHUB_WORKSPACE = process.env['GITHUB_WORKSPACE'];
  const ORIGINAL_CWD = process.cwd();
  let workspace: string;
  let spyInfo: jest.SpyInstance<void, Parameters<typeof core.info>>;
  let spyWarning: jest.SpyInstance<void, Parameters<typeof core.warning>>;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'setup-java-cache-'));
    switch (os.platform()) {
      case 'darwin':
        process.env['RUNNER_OS'] = 'macOS';
        break;
      case 'win32':
        process.env['RUNNER_OS'] = 'Windows';
        break;
      case 'linux':
        process.env['RUNNER_OS'] = 'Linux';
        break;
      default:
        throw new Error(`unknown platform: ${os.platform()}`);
    }
    process.chdir(workspace);
    // This hack is necessary because @actions/glob ignores files not in the GITHUB_WORKSPACE
    // https://git.io/Jcxig
    process.env['GITHUB_WORKSPACE'] = projectRoot(workspace);
  });

  beforeEach(() => {
    spyInfo = jest.spyOn(core, 'info');
    spyWarning = jest.spyOn(core, 'warning');
  });

  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    process.env['GITHUB_WORKSPACE'] = ORIGINAL_GITHUB_WORKSPACE;
    process.env['RUNNER_OS'] = ORIGINAL_RUNNER_OS;
  });

  describe('restore', () => {
    let spyCacheRestore: jest.SpyInstance<
      ReturnType<typeof cache.restoreCache>,
      Parameters<typeof cache.restoreCache>
    >;

    beforeEach(() => {
      spyCacheRestore = jest
        .spyOn(cache, 'restoreCache')
        .mockImplementation((paths: string[], primaryKey: string) => Promise.resolve(undefined));
    });

    it('throws error if unsupported package manager specified', () => {
      return expect(restore('ant')).rejects.toThrowError('unknown package manager specified: ant');
    });

    describe('for maven', () => {
      it('warns if no pom.xml found', async () => {
        await restore('maven');
        expect(spyWarning).toBeCalledWith(
          `No file in ${projectRoot(
            workspace
          )} matched to [**/pom.xml], make sure you have checked out the target repository`
        );
      });
      it('downloads cache', async () => {
        createFile(join(workspace, 'pom.xml'));

        await restore('maven');
        expect(spyCacheRestore).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith('maven cache is not found');
      });
    });
    describe('for gradle', () => {
      it('warns if no build.gradle found', async () => {
        await restore('gradle');
        expect(spyWarning).toBeCalledWith(
          `No file in ${projectRoot(
            workspace
          )} matched to [**/*.gradle*,**/gradle-wrapper.properties], make sure you have checked out the target repository`
        );
      });
      it('downloads cache based on build.gradle', async () => {
        createFile(join(workspace, 'build.gradle'));

        await restore('gradle');
        expect(spyCacheRestore).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith('gradle cache is not found');
      });
      it('downloads cache based on build.gradle.kts', async () => {
        createFile(join(workspace, 'build.gradle.kts'));

        await restore('gradle');
        expect(spyCacheRestore).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith('gradle cache is not found');
      });
    });
  });
  describe('save', () => {
    let spyCacheSave: jest.SpyInstance<
      ReturnType<typeof cache.saveCache>,
      Parameters<typeof cache.saveCache>
    >;

    beforeEach(() => {
      spyCacheSave = jest
        .spyOn(cache, 'saveCache')
        .mockImplementation((paths: string[], key: string) => Promise.resolve(0));
    });

    it('throws error if unsupported package manager specified', () => {
      return expect(save('ant')).rejects.toThrowError('unknown package manager specified: ant');
    });

    describe('for maven', () => {
      it('uploads cache even if no pom.xml found', async () => {
        await save('maven');
        expect(spyCacheSave).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith(expect.stringMatching(/^Cache saved with the key:.*/));
      });
      it('uploads cache', async () => {
        createFile(join(workspace, 'pom.xml'));

        await save('maven');
        expect(spyCacheSave).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith(expect.stringMatching(/^Cache saved with the key:.*/));
      });
    });
    describe('for gradle', () => {
      it('uploads cache even if no build.gradle found', async () => {
        await save('gradle');
        expect(spyCacheSave).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith(expect.stringMatching(/^Cache saved with the key:.*/));
      });
      it('uploads cache based on build.gradle', async () => {
        createFile(join(workspace, 'build.gradle'));

        await save('gradle');
        expect(spyCacheSave).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith(expect.stringMatching(/^Cache saved with the key:.*/));
      });
      it('uploads cache based on build.gradle.kts', async () => {
        createFile(join(workspace, 'build.gradle.kts'));

        await save('gradle');
        expect(spyCacheSave).toBeCalled();
        expect(spyWarning).not.toBeCalled();
        expect(spyInfo).toBeCalledWith(expect.stringMatching(/^Cache saved with the key:.*/));
      });
    });
  });
});

function createFile(path: string) {
  core.info(`created a file at ${path}`);
  fs.writeFileSync(path, '');
}

function projectRoot(workspace: string): string {
  if (os.platform() === 'darwin') {
    return `/private${workspace}`;
  } else {
    return workspace;
  }
}
