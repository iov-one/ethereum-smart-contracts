const crypto = require("crypto");
const { EthereumConnection, toChecksummedAddress } = require("@iov/ethereum");

async function getBalanceApproximation(address) {
  const connection = await EthereumConnection.establish("http://localhost:8545");
  const account = await connection.getAccount({ address });
  const ethWallet = account && account.balance.find(({ tokenTicker }) => tokenTicker === "ETH");
  const balance = ethWallet ? ethWallet.quantity : "0";
  return parseInt(balance, 10);
}

function makeRandomId() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

function makeRandomAddress() {
  const addressLowercase = `0x${crypto.randomBytes(20).toString("hex")}`;
  return toChecksummedAddress(addressLowercase);
}

function makeTimeout(seconds = 100) {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);
  return currentUnixTimestamp + seconds;
}

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  getBalanceApproximation,
  makeRandomId,
  makeRandomAddress,
  makeTimeout,
  sleep,
};
