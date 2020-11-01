const LogERC20 = artifacts.require("./LogERC20.sol");
const TrashToken = artifacts.require("./TrashToken.sol");

module.exports = function(deployer) {
  deployer.deploy(LogERC20, TrashToken.address, "0x94566bB2483022cc96D4555f7710Cffc00222F7c");
};
