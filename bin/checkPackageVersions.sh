#!/bin/bash

# This script checks whether the package version is in step with the repository version to
# avoid packages being individually versioned and published.

repoDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
repoFile="${repoDir}/../lerna.json"
repoVersion=$(sed -nE 's/^\s*"version": "(.*?)",?$/\1/p' ${repoFile})

packagesDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../packages" && pwd )"
for packageDir in $( ls ${packagesDir} ); do
  packageFile="${packagesDir}/${packageDir}/package.json"
  packageVersion=$(sed -nE 's/^\s*"version": "(.*?)",?$/\1/p' ${packageFile})

  # check if the package version is HIGHER than the repo version
  if [[ $packageVersion != $repoVersion &&
        "$repoVersion" = "`echo -e "$packageVersion\n$repoVersion" | sort -V | head -n1`" ]]; then
    echo "ERROR: Package version for package '${packageDir}' (${packageVersion}) is higher than the repository version (${repoVersion}). In this monorepo all packages are versioned in sync. To version and publish a package, run 'yarn run version' in the root of this repository.\n\n"
    exit 1
  fi
done
