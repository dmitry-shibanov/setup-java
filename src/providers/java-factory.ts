import AdopOpenJdkProvider from './adoptopenjdk-provider';
import * as httpm from '@actions/http-client';
import { IJavaProvider } from './IJavaProvider'
import ZuluProvider from "./zulu-provider";

export enum JavaProviders {
    AdopOpenJdk = "adopOpenJdk",
    Zulu = "zulu"
}

export class JavaFactory {

    constructor(private http: httpm.HttpClient, private version: string, private arch: string, private javaPackage: string = "jdk", private features?: string) { };

    public getJavaProvider(provider: JavaProviders|string): IJavaProvider | null {
        switch(provider) {
            case JavaProviders.AdopOpenJdk:
                return new AdopOpenJdkProvider(this.http, this.version, this.arch, this.javaPackage);
            case JavaProviders.Zulu:
                return new ZuluProvider(this.http, this.version, this.arch, this.javaPackage, this.features);
            default:
                return null;
        }
    }
}