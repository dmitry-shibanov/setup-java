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

# Usage
Input `distribution` is mandatory and should be provided to use action.
Currently, the following distributors are supported:
| Keyword | Distribution | Documentation | Official site |
|-|-|-|-|
| `zulu` | Zulu (Zulu OpenJDK) | Link | Link |
| `adoptium` | Adoptium (former Adopt OpenJDK) | Link | Link |

Our recommendation is ---------

See [action.yml](action.yml) for details on all task inputs.
## Basic usage
### Supported version syntax
Input `java-version` supports version range or exact version in SemVer format:
- major versions: `8`, `11`, `15`, `11.x`
- more specific versions: `8.0.232`, `11.0.4`, `11.0`, `11.0.x`
- an early access (EA) versions: `15-ea`, `15.0.0-ea`, `15.0.0-ea.2`
- legacy 1.x syntax: `1.8` (same as `8`), `1.8.0.212` (same as `8.0.212`)

TO-DO: Do we really want to support this `1.` syntax? Is it a time to drop it in V2?  
TO-DO: Clarify docs about using syntax with 4 digits  

### Zulu
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-java@v2-preview
  with:
    distribution: 'zulu'
    java-version: '11.x'
    java-package: jdk # optional (jdk or jre) - defaults to jdk
    architecture: x64 # optional - defaults to x64
- run: java -cp java HelloWorldApp
```

### Adoptium
```yaml
steps:
- uses: actions/checkout@v2
- uses: actions/setup-java@v2-preview
  with:
    distribution: 'adoptium'
    java-version: '11.x'
    java-package: jdk # optional (jdk or jre) - defaults to jdk
    architecture: x64 # optional - defaults to x64
- run: java -cp java HelloWorldApp
```

## Advanced usage
- [Installing custom Java distribution from local file](docs/advanced-usage.md#Local-file)
- [Testing against different Java versions](docs/advanced-usage.md#Testing-against-different-Java-versions)
- [Testing against different Java distributions](docs/advanced-usage.md#Testing-against-different-Java-distributions)
- [Publishing using Apache Maven](docs/advanced-usage.md#Publishing-using-Apache-Maven)
- [Publishing using Gradle](docs/advanced-usage.md#Publishing-using-Gradle)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
