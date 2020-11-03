const LogERC20 = artifacts.require("./LogERC20.sol");
const TrashToken = artifacts.require("./TrashToken.sol");

module.exports = function(deployer) {
  deployer.deploy(LogERC20);
};
