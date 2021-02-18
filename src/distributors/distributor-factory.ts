import { AdopOpenJdkDistributor } from "./adoptopenjdk-installer";
import { JavaInitOptions, JavaBase } from "./base-installer";
import { ZuluDistributor } from "./zulu-installer";

enum JavaDistributor {
    AdoptOpenJdk = 'adoptOpenJdk',
    Zulu = 'zulu'
  }
  
export function getJavaDistributor(distributorName: string, initOptions: JavaInitOptions): JavaBase | null {
  switch (distributorName) {
    case JavaDistributor.AdoptOpenJdk:
        return new AdopOpenJdkDistributor(initOptions);
      case JavaDistributor.Zulu:
        return new ZuluDistributor(initOptions);
      default:
        return null;
  }
}