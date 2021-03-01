# setup-java

<p align="left">
  <a href="https://github.com/actions/setup-java"><img alt="GitHub Actions status" src="https://github.com/actions/setup-java/workflows/Main%20workflow/badge.svg"></a>
</p>

This action provides the following functionality for GitHub Actions runners:
- Downloading and setting up a requested version of Java. See [Usage](#Usage) section for the list of supported distributors
- Extracting and caching custom version of Java from local file
- Configuring runner for publishing using Apache Maven
- Configuring runner for publishing using Gradle
- Configuring runner for using GPG private key
- Registering problem matchers for error output

## V2 vs V1
- V2 has support of custom distributions and provides support of Zulu OpenJDK and Adoptium (former AdoptOpenJDK) out of the box. V1 supports only Zulu OpenJDK
- V2 requires you to specify distributor along with the version. V1 defaults to Zulu OpenJDK, only version input is required. Follow [the migration guide](docs/switching-to-v2.md) to switch from V1 to V2

## Supported distributions
Currently, the following distributors are supported:
| Keyword | Distribution | Official site |
|-|-|-|
| `zulu` | Zulu (Zulu OpenJDK) | Link |
| `adoptium` | Adoptium (former Adopt OpenJDK) | Link |

**NOTE:** The different distributions can provide discrepant list of available versions / supported configurations

## Usage
Input `distribution` is mandatory. See [Supported distributions](../README.md#Supported-distributions) section for the list of available options.

TO-DO: Our recommendation is ---------

### Basic
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-java@v2-preview
  with:
    distribution: '<distribution>' # See 'Supported distributions' for available options
    java-version: '11.x'
- run: java -cp java HelloWorldApp
```

### Advanced
- [Selecting Java distribution](docs/usage.md#Selecting-Java-distribution)
  - [Supported version syntax](docs/usage.md#Supported-version-syntax)
  - [Zulu](docs/usage.md#Zulu)
  - [Adoptium](docs/usage.md#Adoptium)
- [Installing custom Java package type](docs/usage.md#Installing-custom-Java-package-type)
- [Installing custom Java architecture](docs/usage.md#Installing-custom-Java-architecture)
- [Installing custom Java distribution from local file](docs/usage.md#Installing-Java-from-local-file)
- [Testing against different Java versions](docs/usage.md#Testing-against-different-Java-versions)
- [Testing against different Java distributions](docs/usage.md#Testing-against-different-Java-distributions)
- [Publishing using Apache Maven](docs/usage.md#Publishing-using-Apache-Maven)
- [Publishing using Gradle](docs/usage.md#Publishing-using-Gradle)


## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

## Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
