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
  initOptions: JavaInstallerOptions,
  jdkFile?: string
): JavaBase | null {
  switch (distributorName) {
    case 'jdkFile':
      if(!jdkFile){
        throw new Error('jdkfile is not specified');
      }
      return new LocalDistributor(initOptions, jdkFile);
    case JavaDistributor.AdoptOpenJdk:
      return new AdoptOpenJDKDistributor(initOptions);
    case JavaDistributor.Zulu:
      return new ZuluDistributor(initOptions);
    default:
      return null;
  }
}
