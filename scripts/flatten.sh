#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

outdir="build/flattened"

function flatten() {
  ./node_modules/.bin/truffle-flattener "$1" --output "$2"
}

for inpath in contracts/*.sol; do
  filename=$(basename "$inpath" .sol)

  mkdir -p "$outdir"
  outpath="$outdir/$filename.flattened.sol"
  echo "Flattening $inpath into $outpath ..."
  flatten "$inpath" "$outpath"
done
