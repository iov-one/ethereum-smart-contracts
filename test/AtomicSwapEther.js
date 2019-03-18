const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expectEvent } = require("openzeppelin-test-helpers");

const { makeRandomAddress, makeRandomID, makeTimeout } = require("./utils");

const atomicSwap = artifacts.require("./AtomicSwapEther.sol");

const { expect } = chai;
chai.use(chaiAsPromised);

contract("AtomicSwapEther", accounts => {
  const defaultPreimage = "0x42a990655bffe188c9823a2f914641a32dcbb1b28e8586bd29af291db7dcd4e8";
  const defaultHash = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";

  let testContract;

  before(async () => {
    testContract = await atomicSwap.deployed();
  });

  describe("open()", () => {
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

    it("errors when attempting to claim a swap which has already been aborted");
  });
});
