const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expectEvent } = require("openzeppelin-test-helpers");

const { makeRandomAddress, makeRandomID, makeTimeout } = require("./utils");

const atomicSwap = artifacts.require("./AtomicSwapEther.sol");

const { expect } = chai;
chai.use(chaiAsPromised);

contract("AtomicSwapEther", (/*accounts*/) => {
  const defaultHash = "0x261c74f7dd1ed6a069e18375ab2bee9afcb1095613f53b07de11829ac66cdfcc";

  let testContract;

  before(async () => {
    testContract = await atomicSwap.deployed();
  });

  describe("open()", () => {
    it("emits an Open event", async () => {
      const id = makeRandomID();
      const recipient = makeRandomAddress();
      const timeout = makeTimeout();
      const { tx } = await testContract.open(id, recipient, defaultHash, timeout);

      await expectEvent.inTransaction(tx, atomicSwap, "Open", {
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
});
