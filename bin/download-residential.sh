 #!/bin/sh

set -e

mkdir -p tmp
pushd tmp
if [ ! -d base-registry-tools ]; then
  git clone https://github.com/geolonia/base-registry-tools.git
fi
pushd base-registry-tools
mkdir -p out
docker build -t geolonia/base-registry-tools:latest .

docker run --rm \
  -v $(pwd):/scripts \
  -v $(pwd)/out:/out \
  -it geolonia/base-registry-tools \
  /scripts/download_mt_rsdtdsp.py

docker run --rm \
  -v $(pwd):/scripts \
  -v $(pwd)/out:/out \
  -it geolonia/base-registry-tools \
  /scripts/download_mt_rsdtdsp_pos.py
popd
popd

if [ -d ./data/base-registry ]; then
  rm -r ./data/base-registry
fi
mv ./tmp/base-registry-tools/out ./data/base-registry
