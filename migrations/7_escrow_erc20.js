const EscrowERC20 = artifacts.require("./EscrowERC20.sol");

module.exports = function(deployer) {
  deployer.deploy(EscrowERC20);
};
