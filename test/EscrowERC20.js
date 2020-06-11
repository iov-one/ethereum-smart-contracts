const BN = require("bn.js");
const { expect, expectEvent } = require("./setup");
const { getErc20Balance, makeRandomAddress, makeRandomId, makeTimeout } = require("./utils");

const atomicSwap = artifacts.require("./EscrowERC20.sol");
const erc20 = artifacts.require("./AshToken.sol");

contract("EscrowERC20", accounts => {
  const defaultHash = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const defaultAmount = "50000000";
  const defaultAmountBN = new BN(defaultAmount);
  const defaultSender = accounts[1];
  const defaultRecipient = accounts[2];
  const defaultThirdParty = accounts[3];
  const defaultArbiter = accounts[4];

  let testContract;
  let erc20Contract;

  before(async () => {
    testContract = await atomicSwap.deployed();
    erc20Contract = await erc20.deployed();

    await erc20Contract.mint(defaultSender, "1" + "0".repeat(15));
    await erc20Contract.mint(defaultRecipient, "1" + "0".repeat(15));
    await erc20Contract.mint(defaultArbiter, "1" + "0".repeat(15));
  });

  describe("open()", () => {
    beforeEach(async () => {
      await erc20Contract.approve(testContract.address, defaultAmount, { from: defaultSender });
    });

    it("accepts tokens", async () => {
      const id = makeRandomId();
      const recipient = makeRandomAddress();
      const timeout = await makeTimeout();
      const initialBalanceContract = await getErc20Balance(erc20Contract, testContract.address);
      const initialBalanceSender = await getErc20Balance(erc20Contract, defaultSender);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, erc20Contract.address, defaultAmount, {
        from: defaultSender,
      });

      await expect(
        getErc20Balance(erc20Contract, testContract.address),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceContract.add(defaultAmountBN));
      await expect(getErc20Balance(erc20Contract, accounts[1])).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.sub(defaultAmountBN),
      );
      await expect(getErc20Balance(erc20Contract, recipient)).eventually.to.be.a.bignumber.that.is.zero;
    });

    it("emits an Opened event", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();
      const { tx } = await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );

      await expectEvent.inTransaction(tx, atomicSwap, "Opened", {
        id,
        sender: defaultSender,
        recipient: defaultSender,
        arbiter: defaultArbiter,
        hash: defaultHash,
        amount: defaultAmount,
        timeout: new BN(timeout),
        erc20ContractAddress: erc20Contract.address,
      });
    });

    it("errors when attempting to open a swap with an existing ID", async () => {
      const id = makeRandomId();

      {
        const timeout = await makeTimeout();
        await testContract.open(id, defaultArbiter, defaultHash, timeout, erc20Contract.address, defaultAmount, {
          from: defaultSender,
        });
      }

      {
        const timeout = await makeTimeout();
        await expect(
          testContract.open(id, defaultArbiter, defaultHash, timeout, erc20Contract.address, defaultAmount, {
            from: defaultSender,
          }),
        ).to.be.rejectedWith(/swap id already exists/i);
      }
    });

    it("errors when attempting to open a swap from a non-erc20 token", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();
      await expect(
        testContract.open(id, defaultArbiter, defaultHash, timeout, defaultRecipient, defaultAmount, {
          from: defaultSender,
        }),
      ).to.be.rejectedWith(/revert/i);
    });

    it("errors when attempting to open a swap without enough approval", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();
      const tooMuch = "1" + "0".repeat(16);
      await expect(
        testContract.open(id, defaultArbiter, defaultHash, timeout, erc20Contract.address, tooMuch, {
          from: defaultSender,
        }),
      ).to.be.rejectedWith(/revert/i);
    });
  });

  describe("claim()", () => {
    beforeEach(async () => {
      await erc20Contract.approve(testContract.address, defaultAmount, { from: defaultSender });
    });

    it("disburses tokens to recipient", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );
      const initialBalanceContract = await getErc20Balance(erc20Contract, testContract.address);
      const initialBalanceSender = await getErc20Balance(erc20Contract, defaultSender);
      const initialBalanceRecipient = await getErc20Balance(erc20Contract, defaultRecipient);

      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expect(
        getErc20Balance(erc20Contract, testContract.address),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceContract.sub(defaultAmountBN));
      await expect(getErc20Balance(erc20Contract, defaultSender)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender,
      );
      await expect(getErc20Balance(erc20Contract, defaultRecipient)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceRecipient.add(defaultAmountBN),
      );
    });

    it("emits a Claimed event", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );

      const { tx } = await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expectEvent.inTransaction(tx, atomicSwap, "Claimed", {
        id,
        recipient: defaultRecipient,
      });
    });

    it("errors when attempting to claim a non-existent swap", async () => {
      const id = makeRandomId();

      await expect(testContract.claim(id, defaultRecipient, { from: defaultArbiter })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to claim a swap with incorrect preimage", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );

      await expect(testContract.claim(id, defaultRecipient, { from: defaultRecipient })).to.be.rejectedWith(
        /Allow only with arbiter address/i,
      );
    });

    it("errors when attempting to claim a swap after the timeout", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );

      await expect(testContract.claim(id, defaultRecipient, { from: defaultArbiter })).to.be.rejectedWith(
        /swap timeout has been reached/i,
      );
    });

    it("errors when attempting to claim a swap which has already been claimed", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );
      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expect(testContract.claim(id, defaultRecipient, { from: defaultArbiter })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to claim a swap which has already been aborted", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );
      await testContract.abort(id, { from: defaultSender });

      await expect(testContract.claim(id, defaultRecipient, { from: defaultArbiter })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });
  });

  describe("abort()", () => {
    beforeEach(async () => {
      await erc20Contract.approve(testContract.address, defaultAmount, { from: defaultSender });
    });

    it("returns tokens to sender", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );
      const initialBalanceContract = await getErc20Balance(erc20Contract, testContract.address);
      const initialBalanceSender = await getErc20Balance(erc20Contract, defaultSender);
      const initialBalanceRecipient = await getErc20Balance(erc20Contract, defaultRecipient);

      await testContract.abort(id, { from: defaultSender });

      await expect(
        getErc20Balance(erc20Contract, testContract.address),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceContract.sub(defaultAmountBN));
      await expect(getErc20Balance(erc20Contract, defaultSender)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.add(defaultAmountBN),
      );
      await expect(getErc20Balance(erc20Contract, defaultRecipient)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceRecipient,
      );
    });

    it("returns tokens to sender when aborted by a third party", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        {
          from: defaultSender,
        },
      );
      const initialBalanceContract = await getErc20Balance(erc20Contract, testContract.address);
      const initialBalanceSender = await getErc20Balance(erc20Contract, defaultSender);
      const initialBalanceRecipient = await getErc20Balance(erc20Contract, defaultRecipient);

      await testContract.abort(id, { from: defaultThirdParty });

      await expect(
        getErc20Balance(erc20Contract, testContract.address),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceContract.sub(defaultAmountBN));
      await expect(getErc20Balance(erc20Contract, defaultSender)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.add(defaultAmountBN),
      );
      await expect(getErc20Balance(erc20Contract, defaultRecipient)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceRecipient,
      );
    });

    it("emits an Aborted event", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );

      const { tx } = await testContract.abort(id, { from: defaultSender });

      await expectEvent.inTransaction(tx, atomicSwap, "Aborted", {
        id,
      });
    });

    it("errors when attempting to abort a non-existent swap", async () => {
      const id = makeRandomId();

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to abort before the timeout", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1e5);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /swap timeout has not been reached/i,
      );
    });

    it("errors when attempting to abort a swap which has already been claimed", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );
      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to abort a swap which has already been aborted", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );
      await testContract.abort(id, { from: defaultSender });

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });
  });

  describe("get()", () => {
    beforeEach(async () => {
      await erc20Contract.approve(testContract.address, defaultAmount, { from: defaultSender });
    });

    it("shows an open swap by id", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultSender);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.erc20ContractAddress).to.equal(erc20Contract.address);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(1));
    });

    it("shows a claimed swap by id including preimage", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );
      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultRecipient);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.erc20ContractAddress).to.equal(erc20Contract.address);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(2));
    });

    it("shows an aborted swap by id", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(
        id,
        defaultArbiter,
        defaultHash,
        timeout,
        erc20Contract.address,
        defaultAmount,
        { from: defaultSender },
      );
      await testContract.abort(id, { from: defaultSender });

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultSender);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.erc20ContractAddress).to.equal(erc20Contract.address);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(3));
    });

    it("errors when attempting to view a non-existent swap", async () => {
      const id = makeRandomId();

      await expect(testContract.get(id)).to.be.rejectedWith(/no swap found for the given id/i);
    });
  });
});
