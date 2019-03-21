const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expect } = chai;
chai.use(chaiAsPromised);
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));

const ashToken = artifacts.require("./AshToken.sol");

const { makeRandomAddress } = require("./utils");

contract("AshToken", () => {
  let testContract;

  before(async () => {
    testContract = await ashToken.deployed();
  });

  describe("decimals()", () => {
    it("has 12 decimals", async () => {
      const result = await testContract.decimals();
      expect(result).to.be.a.bignumber.that.equals("12");
    });
  });

  describe("symbol()", () => {
    it("has symbol ASH", async () => {
      const result = await testContract.symbol();
      expect(result).to.eql("ASH");
    });
  });

  describe("name()", () => {
    it("has name Ash Token", async () => {
      const result = await testContract.name();
      expect(result).to.eql("Ash Token");
    });
  });

  describe("totalSupply()", () => {
    it("has initial supply of 0", async () => {
      const result = await testContract.totalSupply();
      expect(result).to.be.a.bignumber.that.equals("0");
    });
  });

  describe("balanceOf()", () => {
    it("has initial balance of 0", async () => {
      const address = makeRandomAddress();
      const balance = await testContract.balanceOf(address);
      expect(balance).to.be.a.bignumber.that.equals("0");
    });
  });

  describe("mint()", () => {
    it("works", async () => {
      const address = makeRandomAddress();
      await testContract.mint(address, 7);

      const balance = await testContract.balanceOf(address);
      expect(balance).to.be.a.bignumber.that.equals("7");

      const totalSupply = await testContract.totalSupply();
      expect(totalSupply).to.be.a.bignumber.that.equals("7");
    });
  });
});
