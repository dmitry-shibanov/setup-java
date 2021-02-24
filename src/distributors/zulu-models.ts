export interface IZuluVersions {
  id: number;
  name: string;
  url: string;
  jdk_version: Array<number>;
  zulu_version: Array<number>;
}

export interface IZuluVersionsDetailed extends IZuluVersions {
  arch: string;
  abi: string;
  hw_bitness: string;
  os: string;
  ext: string;
  bundle_type: string;
  release_status: string;
  support_term: string;
  last_modified: string;
  size: string;
  md5_hash: string;
  sha256_hash: string;
  javafx: boolean;
  features: Array<string>;
}
