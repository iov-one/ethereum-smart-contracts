pragma solidity ^0.5.2;

contract EscrowEther {
    enum State {
        NON_EXISTENT,
        OPEN,
        CLAIMED,
        ABORTED
    }

    struct Swap {
        State state;
        address payable sender;
        address payable recipient;
        address arbiter;
        bytes32 hash;
        uint256 amount;
        uint256 timeout;
    }

    mapping (bytes32 => Swap) private swaps;

    event Opened(
        bytes32 id,
        address sender,
        address recipient,
        address arbiter,
        bytes32 hash,
        uint256 amount,
        uint256 timeout
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
        uint256 timeout
    ) external payable onlyNonExistentSwaps(id) {
        swaps[id] = Swap({
            state: State.OPEN,
            sender: msg.sender,
            recipient: msg.sender,
            arbiter: arbiter,
            hash: hash,
            amount: msg.value,
            timeout: timeout
        });

        emit Opened(id, msg.sender, msg.sender, arbiter, hash, msg.value, timeout);
    }

    function claim(
        bytes32 id,
        address payable recipient
    ) external onlyOpenSwaps(id) onlyNonExpiredSwaps(id) onlyArbiter(id) {
        swaps[id].state = State.CLAIMED;
        swaps[id].recipient = recipient;

        Swap memory swap = swaps[id];
        swap.recipient.transfer(swap.amount);

        emit Claimed(id, recipient);
    }

    function abort(
        bytes32 id
    ) external onlyOpenSwaps(id) onlyExpiredSwaps(id) {
        swaps[id].state = State.ABORTED;

        Swap memory swap = swaps[id];
        swap.sender.transfer(swap.amount);

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
        State state
    ) {
        Swap memory swap = swaps[id];
        return (
            swap.sender,
            swap.recipient,
            swap.arbiter,
            swap.hash,
            swap.timeout,
            swap.amount,
            swap.state
        );
    }
}
