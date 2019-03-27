const BN = require("bn.js");
const crypto = require("crypto");
const { EthereumConnection, toChecksummedAddress } = require("@iov/ethereum");

const TEST_URL = "http://localhost:8545";

async function getBalance(address) {
  const connection = await EthereumConnection.establish(TEST_URL);
  const account = await connection.getAccount({ address });
  connection.disconnect();

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
  const connection = await EthereumConnection.establish(TEST_URL);
  const currentHeight = await connection.height();
  connection.disconnect();

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
