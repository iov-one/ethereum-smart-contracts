#!/bin/bash
set -o errexit -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# shellcheck disable=SC1090
source "$SCRIPT_DIR/_includes.sh";

fold_start "yarn-install"
retry 3 yarn install
fold_end

fold_start "lint-js"
yarn run lint:js
fold_end

fold_start "lint-sol"
yarn run lint:sol
fold_end

fold_start "build"
yarn run build
fold_end

fold_start "test"
yarn run test
fold_end

# Requires an authenticated MythX account or risk rate limiting
# See https://github.com/ConsenSys/truffle-security#configuration
# fold_start "verify"
# yarn run verify --no-progress
# fold_end
