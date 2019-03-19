const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expectEvent } = require("openzeppelin-test-helpers");

const { getBalance, makeRandomAddress, makeRandomID, makeTimeout, sleep } = require("./utils");

const atomicSwap = artifacts.require("./AtomicSwapEther.sol");

const { expect } = chai;
chai.use(chaiAsPromised);

contract("AtomicSwapEther", accounts => {
  const defaultPreimage = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  const defaultHash = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";
  const nullPreimage = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const defaultAmount = 50e6;

  let testContract;

  before(async () => {
    testContract = await atomicSwap.deployed();
  });

  describe("open()", () => {
    it("accepts ether", async () => {
      const id = makeRandomID();
      const recipient = makeRandomAddress();
      const timeout = makeTimeout();
      const initialBalanceContract = await getBalance(testContract.address);
      const initialBalanceSender = await getBalance(accounts[1]);

      await testContract.open(id, recipient, defaultHash, timeout, {
        from: accounts[1],
        value: defaultAmount,
      });

      await expect(getBalance(testContract.address)).eventually.to.equal(
        initialBalanceContract + defaultAmount,
      );
      await expect(getBalance(accounts[0])).eventually.to.be.below(initialBalanceSender - defaultAmount);
      await expect(getBalance(recipient)).eventually.to.equal(0);
    });

    it("emits an Opened event", async () => {
      const id = makeRandomID();
      const recipient = makeRandomAddress();
      const timeout = makeTimeout();
      const { tx } = await testContract.open(id, recipient, defaultHash, timeout);

      await expectEvent.inTransaction(tx, atomicSwap, "Opened", {
        id,
        recipient,
        hash: defaultHash,
      });
    });

    it("errors when attempting to open a swap with an existing ID", async () => {
      const id = makeRandomID();

      {
        const recipient = makeRandomAddress();
        const timeout = makeTimeout();
        await testContract.open(id, recipient, defaultHash, timeout);
      }

      {
        const recipient = makeRandomAddress();
        const timeout = makeTimeout();
        await expect(testContract.open(id, recipient, defaultHash, timeout)).to.be.rejectedWith(
          /swap id already exists/i,
        );
      }
    });
  });

  describe("claim()", () => {
    it("disburses ether to recipient", async () => {
      const id = makeRandomID();
      const sender = accounts[1];
      const recipient = accounts[2];
      const timeout = makeTimeout();

      await testContract.open(id, recipient, defaultHash, timeout, {
        from: sender,
        value: defaultAmount,
      });
      const initialBalanceContract = await getBalance(testContract.address);
      const initialBalanceSender = await getBalance(sender);
      const initialBalanceRecipient = await getBalance(recipient);

      await testContract.claim(id, defaultPreimage);

      await expect(getBalance(testContract.address)).eventually.to.equal(
        initialBalanceContract - defaultAmount,
      );
      await expect(getBalance(sender)).eventually.to.equal(initialBalanceSender);
      await expect(getBalance(recipient)).eventually.to.equal(initialBalanceRecipient + defaultAmount);
    });

    it("emits a Claimed event", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], defaultHash, timeout);

      const { tx } = await testContract.claim(id, defaultPreimage);

      await expectEvent.inTransaction(tx, atomicSwap, "Claimed", {
        id,
        preimage: defaultPreimage,
      });
    });

    it("errors when attempting to claim a non-existent swap", async () => {
      const id = makeRandomID();

      await expect(testContract.claim(id, defaultPreimage)).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to claim a swap with incorrect preimage", async () => {
      const preimage = `0x5${defaultPreimage.slice(3)}`;
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], defaultHash, timeout);

      await expect(testContract.claim(id, preimage)).to.be.rejectedWith(/invalid preimage for swap hash/i);
    });

    it("errors when attempting to claim a swap with a preimage which is too short", async () => {
      // 31 bytes
      const preimage = "0xa990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
      const hash = "0xe4632a45b8e39230777acdb63647b9513d5686bb4d9cb7a3be2f89664eb0fd32";
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], hash, timeout);

      await expect(testContract.claim(id, preimage)).to.be.rejectedWith(/invalid preimage for swap hash/i);
    });

    it("errors when attempting to claim a swap with a preimage which is too long", async () => {
      // 33 bytes
      const preimage = "0xa990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
      const hash = "0xe4632a45b8e39230777acdb63647b9513d5686bb4d9cb7a3be2f89664eb0fd32";
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], hash, timeout);

      await expect(testContract.claim(id, preimage)).to.be.rejectedWith(/invalid preimage for swap hash/i);
    });

    it("errors when attempting to claim a swap which has already been claimed", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], defaultHash, timeout);
      await testContract.claim(id, defaultPreimage);

      await expect(testContract.claim(id, defaultPreimage)).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });

    it("errors when attempting to claim a swap which has already been aborted", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout(1);

      await testContract.open(id, accounts[0], defaultHash, timeout);
      await sleep(2);
      await testContract.abort(id);

      await expect(testContract.claim(id, defaultPreimage)).to.be.rejectedWith(
        /no open swap found for the given id/i,
      );
    });
  });

  describe("abort()", () => {
    it("returns ether to sender", async () => {
      const id = makeRandomID();
      const sender = accounts[1];
      const recipient = accounts[2];
      const timeout = makeTimeout(1);

      await testContract.open(id, recipient, defaultHash, timeout, {
        from: sender,
        value: defaultAmount,
      });
      const initialBalanceContract = await getBalance(testContract.address);
      const initialBalanceSender = await getBalance(sender);
      const initialBalanceRecipient = await getBalance(recipient);

      await sleep(2);
      await testContract.abort(id);

      await expect(getBalance(testContract.address)).eventually.to.equal(
        initialBalanceContract - defaultAmount,
      );
      await expect(getBalance(sender)).eventually.to.equal(initialBalanceSender + defaultAmount);
      await expect(getBalance(recipient)).eventually.to.equal(initialBalanceRecipient);
    });

    it("emits an Aborted event", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout(1);

      await testContract.open(id, accounts[0], defaultHash, timeout);
      await sleep(2);

      const { tx } = await testContract.abort(id);

      await expectEvent.inTransaction(tx, atomicSwap, "Aborted", {
        id,
      });
    });

    it("errors when attempting to abort a non-existent swap", async () => {
      const id = makeRandomID();

      await expect(testContract.abort(id)).to.be.rejectedWith(/no open swap found for the given id/i);
    });

    it("errors when attempting to abort before the timeout", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout(1e15);

      await testContract.open(id, accounts[0], defaultHash, timeout);

      await expect(testContract.abort(id)).to.be.rejectedWith(/swap timeout has not been reached/i);
    });

    it("errors when attempting to abort a swap which has already been claimed", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout();

      await testContract.open(id, accounts[0], defaultHash, timeout);
      await testContract.claim(id, defaultPreimage);

      await expect(testContract.abort(id)).to.be.rejectedWith(/no open swap found for the given id/i);
    });

    it("errors when attempting to abort a swap which has already been aborted", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout(1);

      await testContract.open(id, accounts[0], defaultHash, timeout);
      await sleep(2);
      await testContract.abort(id);

      await expect(testContract.abort(id)).to.be.rejectedWith(/no open swap found for the given id/i);
    });
  });

  describe("viewSwap", () => {
    it("shows an open swap by id", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout();
      const sender = accounts[1];
      const recipient = accounts[2];

      await testContract.open(id, recipient, defaultHash, timeout, { from: sender, value: defaultAmount });

      const result = await testContract.viewSwap(id);
      expect(result.sender).to.equal(sender);
      expect(result.recipient).to.equal(recipient);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout.toNumber()).to.equal(timeout);
      expect(result.amount.toNumber()).to.equal(defaultAmount);
      expect(result.preimage).to.equal(nullPreimage);
    });

    it("shows a claimed swap by id including preimage", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout();
      const sender = accounts[1];
      const recipient = accounts[2];

      await testContract.open(id, recipient, defaultHash, timeout, { from: sender, value: defaultAmount });
      await testContract.claim(id, defaultPreimage);

      const result = await testContract.viewSwap(id);
      expect(result.sender).to.equal(sender);
      expect(result.recipient).to.equal(recipient);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout.toNumber()).to.equal(timeout);
      expect(result.amount.toNumber()).to.equal(defaultAmount);
      expect(result.preimage).to.equal(defaultPreimage);
    });

    it("shows an aborted swap by id", async () => {
      const id = makeRandomID();
      const timeout = makeTimeout(1);
      const sender = accounts[1];
      const recipient = accounts[2];

      await testContract.open(id, recipient, defaultHash, timeout, { from: sender, value: defaultAmount });
      await sleep(2);
      await testContract.abort(id);

      const result = await testContract.viewSwap(id);
      expect(result.sender).to.equal(sender);
      expect(result.recipient).to.equal(recipient);
      expect(result.hash).to.equal(defaultHash);
      expect(result.timeout.toNumber()).to.equal(timeout);
      expect(result.amount.toNumber()).to.equal(defaultAmount);
      expect(result.preimage).to.equal(nullPreimage);
    });

    it("errors when attempting to view a non-existent swap", async () => {
      const id = makeRandomID();

      await expect(testContract.viewSwap(id)).to.be.rejectedWith(/no swap found for the given id/i);
    });
  });
});
