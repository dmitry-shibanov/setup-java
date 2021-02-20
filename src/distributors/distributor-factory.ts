import { AdoptOpenJDKDistributor } from "./adoptopenjdk-installer";
import { JavaInstallerOptions, JavaBase } from "./base-installer";
import { ZuluDistributor } from "./zulu-installer";

enum JavaDistributor {
    AdoptOpenJdk = 'adoptOpenJdk',
    Zulu = 'zulu'
  }
  
export function getJavaDistributor(distributorName: string, initOptions: JavaInstallerOptions): JavaBase | null {
  switch (distributorName) {
    case JavaDistributor.AdoptOpenJdk:
        return new AdoptOpenJDKDistributor(initOptions);
      case JavaDistributor.Zulu:
        return new ZuluDistributor(initOptions);
      default:
        return null;
  }
}