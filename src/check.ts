import semver from 'semver';

console.log(semver.coerce('1.2.3.4'));

console.log(semver.valid('1.2.3+4') && new semver.SemVer('1.2.3+4'));
