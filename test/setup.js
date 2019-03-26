const BN = require("bn.js");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { expectEvent } = require("openzeppelin-test-helpers");

const { expect } = chai;
chai.use(require("chai-bn")(BN));
chai.use(chaiAsPromised);

module.exports = {
  expect,
  expectEvent,
};
