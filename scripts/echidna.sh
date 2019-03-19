#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

if [ -z "${1:-}" ]; then
  echo "USAGE: ./scripts/echidna.sh ./relative/path/to/file.sol"
  exit 1
fi

image="trailofbits/eth-security-toolbox"
contract=$(basename "$1" .sol)

# Download docker image if not present locally
if [ -z "$(docker images -q "$image")" ]; then
  docker pull "$image"
fi

# Run echidna on specified file
docker run --rm --entrypoint="" -v "$PWD/contracts:/share/contracts:ro" "$image" echidna-test "/share/$1" "$contract"
