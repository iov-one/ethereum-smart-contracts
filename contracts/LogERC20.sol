pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract LogERC20 {

    event hasBeenSent(
        address sender,
        address recipient,
        string target,
        uint256 amount,
        address contractAddress
    );

    address public erc20ContractAddress;
    address public bridgeWalletAddress;

    constructor(address _erc20ContractAddress, address _bridgeWalletAddress ) public {
       erc20ContractAddress = _erc20ContractAddress;
       bridgeWalletAddress = _bridgeWalletAddress;
    }

    function logSendMemo(
        uint256 amount,
        string memory target
    ) public {
        ERC20 erc20Contract = ERC20(erc20ContractAddress);
        require(erc20Contract.transferFrom(msg.sender, bridgeWalletAddress, amount), "ERC20 token transfer was unsuccessful");

        emit hasBeenSent(msg.sender, bridgeWalletAddress, target, amount, erc20ContractAddress);
    }
}
