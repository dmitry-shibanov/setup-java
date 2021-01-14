import { IJavaProvider } from './IJavaProvider'
import ZuluProvider from "./zulu-provider";

export enum JavaProviders {
    AdopOpenJdk = "adopOpenJdk",
    Zulu = "zulu"
}

export class JavaFactory {

    constructor(private version: string, private arch: string, private javaPackage: string = "jdk") { };

    public getJavaProvider(provider: JavaProviders|string): IJavaProvider | null {
        switch(provider) {
            case JavaProviders.AdopOpenJdk:
                return null;
            case JavaProviders.Zulu:
                return new ZuluProvider(this.version, this.arch, this.javaPackage);
            default:
                return null;
        }
    }
}