const EscrowEther = artifacts.require("./EscrowEther.sol");

module.exports = function(deployer) {
  deployer.deploy(EscrowEther);
};
