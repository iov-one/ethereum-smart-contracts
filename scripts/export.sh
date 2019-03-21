#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

artifacts_dir="build/contracts"
exports_dir="build/exports"
mkdir -p "$exports_dir"

# Use source folder to find top leven contracts in artifacts
for inpath in contracts/*.sol; do
  contractName=$(basename "$inpath" .sol)

  compilationArtifact="$artifacts_dir/$contractName.json"
  exportFile="$exports_dir/$contractName.json"

  contractNameFromArtifact=$(jq -r '.contractName' < "$compilationArtifact")
  if [[ "$contractName" != "$contractNameFromArtifact" ]]; then
    echo "Contract name from filename ('$contractName') does not match contract name from artifact ('$contractNameFromArtifact')"
    exit 1
  fi

  echo "Exporting $compilationArtifact into $exportFile ..."

  # Copy some important or interesting fields that do not include developer machine information
  # web3x-codegen only needs abi and bytecode (https://github.com/xf00f/web3x/blob/master/src/codegen/sources/source-truffle.ts)
  jq '{ contractName, abi, bytecode, compiler, userdoc }' \
    < "$compilationArtifact" \
    > "$exportFile"
done
