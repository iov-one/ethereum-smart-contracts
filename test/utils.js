const crypto = require("crypto");
const { Algorithm } = require("@iov/bcp-types");
const { ethereumCodec, EthereumConnection } = require("@iov/ethereum");

async function getBalance(address) {
  const connection = await EthereumConnection.establish("http://localhost:7545");
  const account = await connection.getAccount({ address });
  const balance = account ? account.balance[0].quantity : "0";
  return parseInt(balance, 10);
}

function makeRandomID() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

function makeRandomAddress() {
  const dataPrefix = 0x04;
  return ethereumCodec.identityToAddress({
    chainId: "dummy-chain",
    pubkey: {
      algo: Algorithm.Secp256k1,
      data: new Uint8Array([dataPrefix, ...crypto.randomBytes(64)]),
    },
  });
}

function makeTimeout(seconds = 100) {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);
  return currentUnixTimestamp + seconds;
}

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  getBalance,
  makeRandomID,
  makeRandomAddress,
  makeTimeout,
  sleep,
};
