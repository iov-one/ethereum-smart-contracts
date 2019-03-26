const TrashToken = artifacts.require("./TrashToken.sol");

module.exports = function(deployer) {
  deployer.deploy(TrashToken);
};
