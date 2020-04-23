pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract EscrowERC20 {
    enum State {
        NON_EXISTENT,
        OPEN,
        CLAIMED,
        ABORTED
    }

    struct Swap {
        State state;
        address sender;
        address recipient;
        address arbiter;
        bytes32 hash;
        uint256 amount;
        uint256 timeout;
        address erc20ContractAddress;
    }

    mapping (bytes32 => Swap) private swaps;

    event Opened(
        bytes32 id,
        address sender,
        address recipient,
        address arbiter,
        bytes32 hash,
        uint256 amount,
        uint256 timeout,
        address erc20ContractAddress
    );
    event Claimed(bytes32 id, address recipient);
    event Aborted(bytes32 id);

    modifier onlyExistentSwaps(bytes32 id) {
        require(swaps[id].state != State.NON_EXISTENT, "No swap found for the given ID");
        _;
    }

    modifier onlyNonExistentSwaps(bytes32 id) {
        require(swaps[id].state == State.NON_EXISTENT, "Swap ID already exists");
        _;
    }

    modifier onlyOpenSwaps(bytes32 id) {
        require(swaps[id].state == State.OPEN, "No open swap found for the given ID");
        _;
    }

    modifier onlyArbiter(bytes32 id) {
        require(swaps[id].arbiter == msg.sender, "Allow only with arbiter address");
        _;
    }

    modifier onlyExpiredSwaps(bytes32 id) {
        require(block.number >= swaps[id].timeout, "Swap timeout has not been reached");
        _;
    }

    modifier onlyNonExpiredSwaps(bytes32 id) {
        require(block.number < swaps[id].timeout, "Swap timeout has been reached");
        _;
    }

    function open(
        bytes32 id,
        address arbiter,
        bytes32 hash,
        uint256 timeout,
        address erc20ContractAddress,
        uint256 amount
    ) external onlyNonExistentSwaps(id) {
        ERC20 erc20Contract = ERC20(erc20ContractAddress);
        require(erc20Contract.transferFrom(msg.sender, address(this), amount), "ERC20 token transfer was unsuccessful");

        swaps[id] = Swap({
            state: State.OPEN,
            sender: msg.sender,
            recipient: msg.sender,
            arbiter: arbiter,
            hash: hash,
            amount: amount,
            timeout: timeout,
            erc20ContractAddress: erc20ContractAddress
        });

        emit Opened(id, msg.sender, msg.sender, arbiter, hash, amount, timeout, erc20ContractAddress);
    }

    function claim(
        bytes32 id,
        address payable recipient
    ) external onlyOpenSwaps(id) onlyNonExpiredSwaps(id) onlyArbiter(id) {
        swaps[id].state = State.CLAIMED;
        swaps[id].recipient = recipient;

        Swap memory swap = swaps[id];
        ERC20 erc20Contract = ERC20(swap.erc20ContractAddress);
        require(erc20Contract.transfer(swap.recipient, swap.amount), "ERC20 token transfer was unsuccessful");

        emit Claimed(id, recipient);
    }

    function abort(
        bytes32 id
    ) external onlyOpenSwaps(id) onlyExpiredSwaps(id) {
        swaps[id].state = State.ABORTED;

        Swap memory swap = swaps[id];
        ERC20 erc20Contract = ERC20(swap.erc20ContractAddress);
        require(erc20Contract.transfer(swap.sender, swap.amount), "ERC20 token transfer was unsuccessful");

        emit Aborted(id);
    }

    function get(
        bytes32 id
    ) external view onlyExistentSwaps(id) returns (
        address sender,
        address recipient,
        address arbiter,
        bytes32 hash,
        uint256 timeout,
        uint256 amount,
        State state,
        address erc20ContractAddress
    ) {
        Swap memory swap = swaps[id];
        return (
            swap.sender,
            swap.recipient,
            swap.arbiter,
            swap.hash,
            swap.timeout,
            swap.amount,
            swap.state,
            swap.erc20ContractAddress
        );
    }
}
