const AtomicSwapEther = artifacts.require("./AtomicSwapEther.sol");

module.exports = function(deployer) {
  deployer.deploy(AtomicSwapEther);
};
