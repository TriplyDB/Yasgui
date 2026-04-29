#!/bin/bash
set -eu

docker pull swipl:7.5.11
docker container run --rm \
  --volume $(pwd -P):/app \
  --workdir /app \
  --user 1000:1000 \
  swipl:7.5.11 \
  swipl -s /app/util/gen_sparql11.pl -t go
