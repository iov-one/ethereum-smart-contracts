const BN = require('bn.js');
const crypto = require("crypto");
const { EthereumConnection, toChecksummedAddress } = require("@iov/ethereum");

async function getBalance(address) {
  const connection = await EthereumConnection.establish("http://localhost:8545");
  const account = await connection.getAccount({ address });
  const ethWallet = account && account.balance.find(({ tokenTicker }) => tokenTicker === "ETH");
  const balance = ethWallet ? ethWallet.quantity : "0";
  return new BN(balance, 10);
}

function makeRandomId() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

function makeRandomAddress() {
  const addressLowercase = `0x${crypto.randomBytes(20).toString("hex")}`;
  return toChecksummedAddress(addressLowercase);
}

async function makeTimeout(blocks = 2) {
  const connection = await EthereumConnection.establish("http://localhost:8545");
  const currentHeight = await connection.height();
  return currentHeight + blocks;
}

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  getBalance,
  makeRandomId,
  makeRandomAddress,
  makeTimeout,
  sleep,
};
