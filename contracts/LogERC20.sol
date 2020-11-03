pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract LogERC20 {

    event hasBenSent(
        address sender,
        address recipient,
        string memo,
        uint256 amount,
        address contractAddress
    );

    function logSendMemo(
        uint256 amount,
        string memory memo,
        address erc20ContractAddress,
        address bridgeWalletAddress
    ) public {
        ERC20 erc20Contract = ERC20(erc20ContractAddress);
        require(erc20Contract.transferFrom(msg.sender, bridgeWalletAddress, amount), "ERC20 token transfer was unsuccessful");

        emit hasBenSent(msg.sender, bridgeWalletAddress, memo, amount, erc20ContractAddress);
    }
}
