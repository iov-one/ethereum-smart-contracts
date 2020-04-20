const BN = require("bn.js");
const { expect, expectEvent } = require("./setup");
const { getEthBalance, makeRandomId, makeTimeout } = require("./utils");

const atomicSwap = artifacts.require("./EscrowEther.sol");

contract("EscrowEther", accounts => {
  const defaultHash = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const defaultAmount = "50000000";
  const defaultAmountBN = new BN(defaultAmount);
  const defaultSender = accounts[1];
  const defaultRecipient = accounts[2];
  const defaultThirdParty = accounts[3];
  const defaultArbiter = accounts[4];
  const defaultFeeMarginBN = new BN("100000000000000000");

  let testContract;

  before(async () => {
    testContract = await atomicSwap.deployed();
  });

  describe("open()", () => {
    it("accepts ether", async () => {
      const id = makeRandomId();
      //const recipient = makeRandomAddress();
      const timeout = await makeTimeout();
      const initialBalanceContract = await getEthBalance(testContract.address);
      const initialBalanceSender = await getEthBalance(defaultSender);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });

      await expect(getEthBalance(testContract.address)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceContract.add(defaultAmountBN),
      );
      await expect(getEthBalance(defaultSender)).eventually.to.be.a.bignumber.below(
        initialBalanceSender.sub(defaultAmountBN),
      );
      //await expect(getEthBalance(recipient)).eventually.to.be.a.bignumber.that.is.zero;
    });

    it("emits an Opened event", async () => {
      const id = makeRandomId();
      //const recipient = makeRandomAddress();
      const timeout = await makeTimeout();
      const { tx } = await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });

      await expectEvent.inTransaction(tx, atomicSwap, "Opened", {
        id,
        sender: defaultSender,
        recipient: defaultSender,
        arbiter: defaultArbiter,
        hash: defaultHash,
        amount: defaultAmount,
        timeout: new BN(timeout),
      });
    });

    it("errors when attempting to open a swap with an existing ID", async () => {
      const id = makeRandomId();

      {
        const timeout = await makeTimeout();
        await testContract.open(id, defaultArbiter, defaultHash, timeout, {
          from: defaultSender,
          value: defaultAmount,
        });
      }

      {
        const timeout = await makeTimeout();
        await expect(
          testContract.open(id, defaultArbiter, defaultHash, timeout, {
            from: defaultSender,
            value: defaultAmount,
          }),
        ).to.be.rejectedWith(/swap id already exists/i);
      }
    });
  });

  describe("claim()", () => {
    it("disburses ether to recipient when arbiter send a transaction", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });
      const initialBalanceContract = await getEthBalance(testContract.address);
      const initialBalanceSender = await getEthBalance(defaultSender);
      const initialBalanceRecipient = await getEthBalance(defaultRecipient);

      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expect(getEthBalance(testContract.address)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceContract.sub(defaultAmountBN),
      );
      await expect(getEthBalance(defaultSender)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender,
      );
      // Fees can vary or equals
      await expect(getEthBalance(defaultRecipient)).eventually.to.be.a.bignumber.that.is.equals(
        initialBalanceRecipient.add(defaultAmountBN),
      );
      await expect(getEthBalance(defaultRecipient)).eventually.to.be.a.bignumber.that.is.greaterThan(
        initialBalanceRecipient.add(defaultAmountBN).sub(defaultFeeMarginBN),
      );
    });

    it("emits a Claimed event", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });

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

    it("errors when attempting to claim a swap with not an arbiter", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });

      await expect(testContract.claim(id, defaultRecipient, { from: defaultRecipient })).to.be.rejectedWith(
        /Allow only with arbiter address/i,
      );
    });

    it("errors when attempting to claim a swap after the timeout", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });

      await expect(testContract.claim(id, defaultSender, { from: defaultArbiter })).to.be.rejectedWith(
        /swap timeout has been reached/i,
      );
    });

    it("errors when attempting to claim a swap which has already been claimed", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });
      await testContract.claim(id, defaultSender, { from: defaultArbiter });

      await expect(testContract.claim(id, defaultSender, { from: defaultArbiter })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to claim a swap which has already been aborted", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });
      await testContract.abort(id, { from: defaultSender });

      await expect(testContract.claim(id, defaultRecipient, { from: defaultArbiter })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });
  });

  describe("abort()", () => {
    it("returns ether to sender", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });
      const initialBalanceContract = await getEthBalance(testContract.address);
      const initialBalanceSender = await getEthBalance(defaultSender);
      const initialBalanceRecipient = await getEthBalance(defaultRecipient);

      await testContract.abort(id, { from: defaultSender });

      await expect(getEthBalance(testContract.address)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceContract.sub(defaultAmountBN),
      );
      // Fees can vary
      await expect(getEthBalance(defaultSender)).eventually.to.be.a.bignumber.that.is.lessThan(
        initialBalanceSender.add(defaultAmountBN),
      );
      await expect(getEthBalance(defaultSender)).eventually.to.be.a.bignumber.that.is.greaterThan(
        initialBalanceSender.add(defaultAmountBN).sub(defaultFeeMarginBN),
      );
      await expect(getEthBalance(defaultRecipient)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceRecipient,
      );
    });

    it("returns ether to sender when aborted by a third party", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });
      const initialBalanceContract = await getEthBalance(testContract.address);
      const initialBalanceSender = await getEthBalance(defaultSender);
      const initialBalanceRecipient = await getEthBalance(defaultRecipient);

      await testContract.abort(id, { from: defaultThirdParty });

      await expect(getEthBalance(testContract.address)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceContract.sub(defaultAmountBN),
      );
      await expect(getEthBalance(defaultSender)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.add(defaultAmountBN),
      );
      await expect(getEthBalance(defaultRecipient)).eventually.to.be.a.bignumber.that.equals(
        initialBalanceRecipient,
      );
    });

    it("emits an Aborted event", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });

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
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });

      await expect(testContract.abort(id)).to.be.rejectedWith(/swap timeout has not been reached/i);
    });

    it("errors when attempting to abort a swap which has already been claimed", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });
      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to abort a swap which has already been aborted", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, { from: defaultSender });
      await testContract.abort(id, { from: defaultSender });

      await expect(testContract.abort(id, { from: defaultSender })).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });
  });

  describe("get()", () => {
    it("shows an open swap by id", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultSender);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(1));
    });

    it("shows a claimed swap by id", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout();

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });

      await testContract.claim(id, defaultRecipient, { from: defaultArbiter });

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultRecipient);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(2));
    });

    it("shows an aborted swap by id", async () => {
      const id = makeRandomId();
      const timeout = await makeTimeout(1);

      await testContract.open(id, defaultArbiter, defaultHash, timeout, {
        from: defaultSender,
        value: defaultAmount,
      });

      await testContract.abort(id, { from: defaultSender });

      const result = await testContract.get(id);
      expect(result.sender).to.equal(defaultSender);
      expect(result.recipient).to.equal(defaultSender);
      expect(result.arbiter).to.equal(defaultArbiter);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout).to.be.a.bignumber.that.equals(new BN(timeout));
      expect(result.amount).to.be.a.bignumber.that.equals(defaultAmount);
      expect(result.state).to.be.a.bignumber.that.equals(new BN(3));
    });

    it("errors when attempting to view a non-existent swap", async () => {
      const id = makeRandomId();

      await expect(testContract.get(id)).to.be.rejectedWith(/no swap found for the given id/i);
    });
  });
});
