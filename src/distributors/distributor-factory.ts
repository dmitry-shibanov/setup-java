import { AdoptOpenJDKDistributor } from './adoptopenjdk-installer';
import { JavaBase } from './base-installer';
import { JavaInstallerOptions } from './base-models';
import { LocalDistributor } from './local-installer';
import { ZuluDistributor } from './zulu-installer';

// TO-DO: confirm distributor names
enum JavaDistributor {
  AdoptOpenJdk = 'adoptOpenJdk',
  Zulu = 'zulu'
}

export function getJavaDistributor(
  distributorName: string,
  installerOptions: JavaInstallerOptions,
  jdkFile?: string
): JavaBase | null {
  switch (distributorName) {
    case 'jdkFile':
      return new LocalDistributor(installerOptions, jdkFile);
    case JavaDistributor.AdoptOpenJdk:
      return new AdoptOpenJDKDistributor(installerOptions);
    case JavaDistributor.Zulu:
      return new ZuluDistributor(installerOptions);
    default:
      return null;
  }
}
