pragma solidity ^0.5.2;

contract AtomicSwapEther {
    enum State {
        NON_EXISTENT,
        OPEN,
        CLAIMED
    }

    struct Swap {
        State state;
        bytes32 hash;
    }

    mapping (bytes32 => Swap) private swaps;

    event Opened(bytes32 id, address recipient, bytes32 hash);
    event Claimed(bytes32 id, bytes32 preimage);

    modifier onlyNonExistentSwaps(bytes32 id) {
        require(swaps[id].state == State.NON_EXISTENT, "Swap ID already exists");
        _;
    }

    modifier onlyOpenSwaps(bytes32 id) {
        require(swaps[id].state == State.OPEN, "No open swap found for the given ID");
        _;
    }

    modifier onlyWithValidPreimage(bytes32 id, bytes32 preimage) {
        require(swaps[id].hash == sha256(abi.encodePacked(preimage)), "Invalid preimage for swap hash");
        _;
    }

    function open(
        bytes32 id,
        address payable recipient,
        bytes32 hash,
        uint256 timeout
    ) external onlyNonExistentSwaps(id) {
        swaps[id] = Swap({
            state: State.OPEN,
            hash: hash
        });

        emit Opened(id, recipient, hash);
    }

    function claim(
        bytes32 id, bytes32 preimage
    ) external onlyOpenSwaps(id) onlyWithValidPreimage(id, preimage) {
        swaps[id].state = State.CLAIMED;
        
        emit Claimed(id, preimage);
    }
}
