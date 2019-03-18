pragma solidity ^0.5.2;

contract AtomicSwapEther {
    enum State {
        NON_EXISTENT,
        OPEN,
        CLAIMED,
        ABORTED
    }

    struct Swap {
        State state;
        bytes32 hash;
        uint256 timeout;
    }

    mapping (bytes32 => Swap) private swaps;

    event Opened(bytes32 id, address recipient, bytes32 hash);
    event Claimed(bytes32 id, bytes32 preimage);
    event Aborted(bytes32 id);

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

    modifier onlyAbortableSwaps(bytes32 id) {
        require(now >= swaps[id].timeout, "Swap timeout has not been reached");
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
            hash: hash,
            timeout: timeout
        });

        emit Opened(id, recipient, hash);
    }

    function claim(
        bytes32 id, bytes32 preimage
    ) external onlyOpenSwaps(id) onlyWithValidPreimage(id, preimage) {
        swaps[id].state = State.CLAIMED;
        
        emit Claimed(id, preimage);
    }

    function abort(
        bytes32 id
    ) external onlyOpenSwaps(id) onlyAbortableSwaps(id) {
        swaps[id].state = State.ABORTED;
        
        emit Aborted(id);
    }
}
