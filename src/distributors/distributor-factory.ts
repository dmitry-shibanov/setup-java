import { AdoptiumDistributor } from './adoptium/installer';
import { JavaBase } from './base-installer';
import { JavaInstallerOptions } from './base-models';
import { LocalDistributor } from './local/installer';
import { ZuluDistributor } from './zulu/installer';

// TO-DO: confirm distributor names
enum JavaDistributor {
  Adoptium = 'adoptium',
  Zulu = 'zulu',
  JdkFile = 'jdkfile'
}

export function getJavaDistributor(
  distributorName: string,
  installerOptions: JavaInstallerOptions,
  jdkFile?: string
): JavaBase | null {
  switch (distributorName) {
    case JavaDistributor.JdkFile:
      return new LocalDistributor(installerOptions, jdkFile);
    case JavaDistributor.Adoptium:
      return new AdoptiumDistributor(installerOptions);
    case JavaDistributor.Zulu:
      return new ZuluDistributor(installerOptions);
    default:
      return null;
  }
}
