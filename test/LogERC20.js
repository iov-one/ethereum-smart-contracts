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
  const defaultThirdParty = accounts[3];

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
      const initialBalanceReceiver = await getErc20Balance(erc20Contract, "0xA39a3c43d59a79954Cd917624C05aDDeBCac4aF4");

      const balance = await erc20Contract.balanceOf(defaultSender);
      console.log(balance.toString());

      await testContract.logSendMemo(defaultAmount, "blini",  { from: defaultSender });
      
      await expect(
        getErc20Balance(erc20Contract, "0xA39a3c43d59a79954Cd917624C05aDDeBCac4aF4"),
      ).eventually.to.be.a.bignumber.that.equals(initialBalanceReceiver.add(defaultAmountBN));

      await expect(getErc20Balance(erc20Contract, accounts[1])).eventually.to.be.a.bignumber.that.equals(
        initialBalanceSender.sub(defaultAmountBN),
      );
      await expect(getErc20Balance(erc20Contract, recipient)).eventually.to.be.a.bignumber.that.is.zero;
    });

    it("emits an Opened event", async () => {
      const id = makeRandomId();
      const recipient = makeRandomAddress();
      const timeout = await makeTimeout();
      const { tx } = await testContract.logSendMemo(
        defaultAmount,
        "blini2",
        {
          from: defaultSender,
        },
      );

      await expectEvent.inTransaction(tx, logERC20, "hasBenSent", {
        sender: defaultSender,
        recipient: "0xA39a3c43d59a79954Cd917624C05aDDeBCac4aF4",
        memo: "blini",
        amount: defaultAmount,
        contractAddress: erc20Contract.address,
      });
    });

   
  });
});
