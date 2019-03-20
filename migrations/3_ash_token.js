const AshToken = artifacts.require("./AshToken.sol");

module.exports = function(deployer) {
  deployer.deploy(AshToken);
};
