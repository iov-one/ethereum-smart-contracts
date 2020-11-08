const TrashToken = artifacts.require("./TrashToken.sol");
const LogERC20 = artifacts.require("./LogERC20.sol");

module.exports = function(deployer) {
  deployer.deploy(TrashToken).then(function() {
    return deployer.deploy(LogERC20, TrashToken.address, "0xb84dfa9cc6bf0ce32e11fe259b9311ce8d30ac4c")
  });
};
