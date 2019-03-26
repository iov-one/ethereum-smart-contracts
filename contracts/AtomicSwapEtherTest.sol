pragma solidity ^0.5.2;

import "./AtomicSwapEther.sol";

contract AtomicSwapEtherTest is AtomicSwapEther {
    bytes32 openID;
    bytes32 claimedID;
    bytes32 abortedID;

    // Override parent because private and we need access here
    mapping (bytes32 => Swap) private swaps;

    constructor() public {
        openID = "open";
        claimedID = "claimed";
        abortedID = "aborted";

        swaps[openID] = Swap({
            state: State.OPEN,
            sender: msg.sender,
            recipient: msg.sender,
            hash: "open",
            amount: 50000,
            timeout: 100,
            preimage: bytes32(0)
        });

        swaps[claimedID] = Swap({
            state: State.CLAIMED,
            sender: msg.sender,
            recipient: msg.sender,
            hash: "claimed",
            amount: 50000,
            timeout: 100,
            preimage: "preimage"
        });

        swaps[abortedID] = Swap({
            state: State.ABORTED,
            sender: msg.sender,
            recipient: msg.sender,
            hash: "aborted",
            amount: 50000,
            timeout: 100,
            preimage: bytes32(0)
        });
    }

    function echidna_open_never_nonexistent() public view returns(bool) {
        return swaps[openID].state != State.NON_EXISTENT;
    }

    function echidna_open_never_claimed_with_incorrect_preimage() public view returns(bool) {
        Swap memory swap = swaps[openID];
        return swap.state != State.CLAIMED || swap.hash == sha256(abi.encodePacked(swap.preimage));
    }

    function echidna_claimed_never_nonexistent() public view returns(bool) {
        return swaps[claimedID].state != State.NON_EXISTENT;
    }

    function echidna_claimed_never_open() public view returns(bool) {
        return swaps[claimedID].state != State.OPEN;
    }

    function echidna_claimed_never_aborted() public view returns(bool) {
        return swaps[claimedID].state != State.ABORTED;
    }

    function echidna_aborted_never_nonexistent() public view returns(bool) {
        return swaps[abortedID].state != State.NON_EXISTENT;
    }

    function echidna_aborted_never_open() public view returns(bool) {
        return swaps[abortedID].state != State.OPEN;
    }

    function echidna_aborted_never_claimed() public view returns(bool) {
        return swaps[abortedID].state != State.CLAIMED;
    }
}
