const BN = require("bn.js");
const { expect, expectEvent } = require("./setup");
const { getErc20Balance, makeRandomAddress, makeRandomId, makeTimeout } = require("./utils");

const logERC20 = artifacts.require("./LogERC20.sol");
const erc20 = artifacts.require("./TrashToken.sol");

contract("LogERC20", accounts => {
  const defaultAmount = "50000000";
  const defaultAmountBN = new BN(defaultAmount);
  const defaultSender = accounts[1];
  const defaultRecipient = accounts[2];

  let testContract;
  let erc20Contract;

  before(async () => {
    erc20Contract = await erc20.deployed();
    testContract = await logERC20.deployed();

    
    await erc20Contract.mint(defaultSender, "2" + "0".repeat(15));
    await erc20Contract.mint(defaultRecipient, "1" + "0".repeat(15));
  });

  describe("open()", () => {
    beforeEach(async () => {
      await erc20Contract.approve(testContract.address, defaultAmount, { from: defaultSender });
    });

    it("accepts tokens", async () => {
      const id = makeRandomId();
      const recipient = makeRandomAddress();
      const timeout = await makeTimeout();
      
      const initialBalanceSender = await getErc20Balance(erc20Contract, defaultSender);
      const initialBalanceReceiver = await getErc20Balance(erc20Contract, "0xb84dfa9cc6bf0ce32e11fe259b9311ce8d30ac4c");

      const balance = await erc20Contract.balanceOf(defaultSender);

      await testContract.logSendMemo(defaultAmount, "blini",  { from: defaultSender });
      
      await expect(
        getErc20Balance(erc20Contract, "0xb84dfa9cc6bf0ce32e11fe259b9311ce8d30ac4c"),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceReceiver.add(defaultAmountBN));

      await expect(getErc20Balance(erc20Contract, accounts[1])).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.sub(defaultAmountBN),
      );
      await expect(getErc20Balance(erc20Contract, recipient)).eventually.to.be.a.bignumber.that.is.zero;
    });

    it("emits an Opened event", async () => {
      const { tx } = await testContract.logSendMemo(
        defaultAmount,
        "blini",
        {
          from: defaultSender,
        },
      );

      await expectEvent.inTransaction(tx, logERC20, "hasBeenSent", {
        sender: defaultSender,
        recipient: "0xB84DFa9CC6Bf0ce32E11FE259b9311CE8d30ac4c",
        target: "blini",
        amount: defaultAmount,
        contractAddress: erc20Contract.address,
      });
    });

   
  });
});
