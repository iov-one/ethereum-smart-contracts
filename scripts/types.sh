#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

function inline_jq() {
  file="$2"
  cmd="$1"
  cp "$file" tmp.json
  jq "$cmd" tmp.json > "$file"
  rm tmp.json
}

mkdir -p ./build/typescript

contractsFile="./build/contracts,json"

# Generate contracts.json for web3x-codegen
# See https://github.com/xf00f/web3x#contract-type-safety
(
  echo '{'
  echo '  "outputPath": "./build/typescript",'
  echo '  "contracts": {}';
  echo '}'
) > "$contractsFile"
for artifact in build/contracts/*.json; do
  contractName=$(jq .contractName -r < "$artifact")
  inline_jq ".contracts[\"$contractName\"] = { \"source\": \"truffle\", \"buildFile\": \"$artifact\" }" "$contractsFile"
done

./node_modules/.bin/web3x-codegen "$contractsFile"
