#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

outdir="build/flattened"

mkdir -p "$outdir"

for inpath in contracts/*.sol; do
  filename=$(basename "$inpath" .sol)
  outpath="$outdir/$filename.flattened.sol"
  echo "Flattening $inpath into $outpath ..."
  ./node_modules/.bin/truffle-flattener "$inpath" --output "$outpath"
done
