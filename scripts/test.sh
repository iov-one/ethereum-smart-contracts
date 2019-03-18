#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck > /dev/null && shellcheck "$0"

# This must be called from repo root as current directory
# Adapted from https://github.com/OpenZeppelin/openzeppelin-test-helpers/blob/051aa40b13520e30dd2a3c57e73a364b0192bbeb/scripts/test.sh

trap cleanup EXIT

ganache_pid=""
ganache_port=8545

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p "$ganache_pid" > /dev/null; then
    kill -9 "$ganache_pid"
  fi
}

ganache_is_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # Define 10 accounts with balance 1M ether, needed for high-value tests
  local accounts=(
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501205,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501206,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501207,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501208,1000000000000000000000000"
    "--account=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501209,1000000000000000000000000"
  )
  ganache-cli --gasLimit 0xfffffffffff "${accounts[@]}" > /dev/null &
  ganache_pid=$!
  echo "Started a new ganache instance with pid $ganache_pid"
}

if ganache_is_running; then
  echo "Using existing ganache instance"
else
  echo "Starting a new ganache instance..."
  start_ganache
fi

yarn run truffle test "$@"
