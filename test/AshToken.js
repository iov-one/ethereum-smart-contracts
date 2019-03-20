const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expect } = chai;
chai.use(chaiAsPromised);
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const ashToken = artifacts.require("./AshToken.sol");

contract("AshToken", () => {
  let testContract;

  before(async () => {
    testContract = await ashToken.deployed();
  });

  describe("totalSupply()", () => {
    it("has initial supply of 0", async () => {
      const result = await testContract.totalSupply();
      expect(result).to.be.a.bignumber.that.equals("0");
    });
  });
});
