pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract AshToken is ERC20Mintable {
    string public name = "Ash Token";
    string public symbol = "ASH";
    uint8 public decimals = 12;
}
