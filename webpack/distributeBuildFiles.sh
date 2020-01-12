#!/bin/bash
packages="yasgui yasr yasqe utils"
for p in ${packages}; do
  rm -rf packages/${p}/build
  mkdir packages/${p}/build
  cp -r build/ts/packages/${p} packages/${p}/build/ts
  if ls build/${p}* 1> /dev/null 2>&1; then
    cp build/${p}* packages/${p}/build/
  fi
done
