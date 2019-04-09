const BN = require("bn.js");
const crypto = require("crypto");
const { EthereumConnection, toChecksummedAddress } = require("@iov/ethereum");
const { networks } = require("../truffle-config");

const { host, port } = networks.test;

const TEST_URL = `http://${host}:${port}`;

async function getErc20Balance(contract, address) {
  return contract.balanceOf(address);
}

async function getEthBalance(address) {
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

async function makeTimeout(blocks = 1000) {
  const connection = await EthereumConnection.establish(TEST_URL);
  const currentHeight = await connection.height();
  connection.disconnect();

  return currentHeight + blocks;
}

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  getErc20Balance,
  getEthBalance,
  makeRandomId,
  makeRandomAddress,
  makeTimeout,
  sleep,
};
