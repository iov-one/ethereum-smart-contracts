pragma solidity ^0.5.2;

contract AtomicSwapEther {
    enum State {
        NON_EXISTENT,
        OPEN
    }

    struct Swap {
        State state;
    }
    
    mapping (bytes32 => Swap) private swaps;
    
    event Opened(bytes32 id, address recipient, bytes32 hash);

    modifier onlyNonExistentSwaps(bytes32 id) {
        require(swaps[id].state == State.NON_EXISTENT, "Swap ID already exists");
        _;
    }
    
    function open(
        bytes32 id,
        address payable recipient,
        bytes32 hash,
        uint256 timeout
    ) external onlyNonExistentSwaps(id) {
        swaps[id] = Swap({
            state: State.OPEN
        });
        
        emit Opened(id, recipient, hash);
    }
}
