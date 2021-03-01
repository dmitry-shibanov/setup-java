# setup-java

<p align="left">
  <a href="https://github.com/actions/setup-java"><img alt="GitHub Actions status" src="https://github.com/actions/setup-java/workflows/Main%20workflow/badge.svg"></a>
</p>

This action provides the following functionality for GitHub Actions runners:
- Downloading and set up a requested version of Java. See [Usage](#Usage) section for supported distributors
- Extracting and caching custom version of Java from local file
- Configuring runner for publishing using Apache Maven
- Configuring runner for publishing using Gradle
- Configuring runner for using GPG private key
- Registering problem matchers for error output

## What's new in V2
Release v2 brings support for custom distributions and include support for Zulu OpenJDK and Adopt OpenJDK from the box.
Also major release contains a set of breaking changes. Please follow [the guide](docs/switching-to-v2.md) to switch to the new version.

## Supported distributions
Currently, the following distributors are supported:
| Keyword | Distribution | Official site |
|-|-|-|
| `zulu` | Zulu (Zulu OpenJDK) | Link |
| `adoptium` | Adoptium (former Adopt OpenJDK) | Link |

**NOTE:** The different distributions can provide discrepant list of available versions / supported configurations

## Usage
Input `distribution` is mandatory and should be provided to use action.

TO-DO: Our recommendation is ---------

### Basic
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-java@v2-preview
  with:
    distribution: '<distribution>' # Mandatory input - see 'Supported distributions' for available options
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
