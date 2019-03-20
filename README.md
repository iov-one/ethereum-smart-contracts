# IOV's smart contracts for Ethereum

## Build system

The truffle build system uses a different artifacts directory for
compiling (a) and testing (b). We prepand a custom flattening step.

### Step 1

Implicit `yarn flatten` flattens contracts from `./contracts` into `./build/flattened`.

### Step 2a

`yarn build` compiles contracts from `./build/flattened` into `./build/contracts`.

### Step 2b

`yarn test` compiles contracts from `./build/flattened` into a temporary folder.
