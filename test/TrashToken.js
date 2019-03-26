const { expect, expectEvent } = require("./setup");
const { makeRandomAddress } = require("./utils");

const trashToken = artifacts.require("./TrashToken.sol");

contract("TrashToken", accounts => {
  const minter = accounts[0];
  let testContract;

  before(async () => {
    testContract = await trashToken.deployed();
  });

  describe("decimals(), symbol(), name()", () => {
    it("has no decimals function", () => {
      expect(testContract.decimals).to.be.undefined;
    });

    it("has no symbol function", () => {
      expect(testContract.symbol).to.be.undefined;
    });

    it("has no name function", () => {
      expect(testContract.name).to.be.undefined;
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
      await testContract.mint(address, 7, { from: minter });

      const balance = await testContract.balanceOf(address);
      expect(balance).to.be.a.bignumber.that.equals("7");

      const totalSupply = await testContract.totalSupply();
      expect(totalSupply).to.be.a.bignumber.that.equals("7");
    });

    it("fails for non-minter", async () => {
      const nonMinter = accounts[1];
      const address = makeRandomAddress();
      await expect(testContract.mint(address, 7, { from: nonMinter })).to.be.rejectedWith(/revert/i);
    });
  });

  describe("transfer()", () => {
    const tokenOwner = accounts[0];

    before(async () => {
      await testContract.mint(tokenOwner, 4, { from: minter });
    });

    it("works", async () => {
      const recipient = makeRandomAddress();
      const { tx } = await testContract.transfer(recipient, 4, { from: tokenOwner });

      await expectEvent.inTransaction(tx, trashToken, "Transfer", {
        // Event argument names not standardized across ERC20 implementation. Use names from contract here.
        from: tokenOwner,
        to: recipient,
        value: "4",
      });

      const balance = await testContract.balanceOf(recipient);
      expect(balance).to.be.a.bignumber.that.equals("4");
    });

    it("fails for insufficient balance", async () => {
      const recipient = makeRandomAddress();
      await expect(testContract.transfer(recipient, 3000000)).to.be.rejectedWith(/revert/i);
    });
  });

  describe("allowance()", () => {
    it("has default allowance of 0", async () => {
      const tokenOwner = makeRandomAddress();
      const spender = makeRandomAddress();
      const allowance = await testContract.allowance(tokenOwner, spender);
      expect(allowance).to.be.a.bignumber.that.equals("0");
    });
  });

  describe("approve()", () => {
    const tokenOwner = accounts[0];

    before(async () => {
      await testContract.mint(tokenOwner, 3, { from: minter });
    });

    it("works", async () => {
      const spender = makeRandomAddress();
      const { tx } = await testContract.approve(spender, 3);

      await expectEvent.inTransaction(tx, trashToken, "Approval", {
        // Event argument names not standardized across ERC20 implementation. Use names from contract here.
        owner: tokenOwner,
        spender: spender,
        value: "3",
      });

      const allowance = await testContract.allowance(tokenOwner, spender);
      expect(allowance).to.be.a.bignumber.that.equals("3");
    });

    it("works for approval greater than balance", async () => {
      const spender = makeRandomAddress();
      await testContract.approve(spender, 3000000);

      const allowance = await testContract.allowance(tokenOwner, spender);
      expect(allowance).to.be.a.bignumber.that.equals("3000000");
    });
  });

  describe("transferFrom()", () => {
    const tokenOwner = accounts[1];
    const spender = accounts[2];

    before(async () => {
      await testContract.mint(tokenOwner, 10, { from: minter });
    });

    it("works", async () => {
      await testContract.approve(spender, 5, { from: tokenOwner });

      const recipient = makeRandomAddress();
      const { tx } = await testContract.transferFrom(tokenOwner, recipient, 4, { from: spender });

      // Transfer event emitted
      await expectEvent.inTransaction(tx, trashToken, "Transfer", {
        "0": tokenOwner,
        "1": recipient,
        "2": "4",
      });

      // money received
      const balance = await testContract.balanceOf(recipient);
      expect(balance).to.be.a.bignumber.that.equals("4");

      // allowance reduced
      const allowance = await testContract.allowance(tokenOwner, spender);
      expect(allowance).to.be.a.bignumber.that.equals("1");
    });

    it("cannot transfer more than approved", async () => {
      await testContract.approve(spender, 2, { from: tokenOwner });

      const recipient = makeRandomAddress();
      await expect(testContract.transferFrom(tokenOwner, recipient, 5, { from: spender })).to.be.rejectedWith(
        /revert/i,
      );
    });

    it("cannot transfer more than balance", async () => {
      await testContract.approve(spender, 1000000, { from: tokenOwner });

      const recipient = makeRandomAddress();
      await expect(
        testContract.transferFrom(tokenOwner, recipient, 500, { from: spender }),
      ).to.be.rejectedWith(/revert/i);
    });
  });
});
