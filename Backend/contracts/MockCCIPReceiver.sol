// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockCCIPRouter.sol";

/**
 * @title IMockCCIPReceiver
 * @dev Interface for contract that can receive CCIP messages
 */
interface IMockCCIPReceiver {
    function ccipReceive(MockCCIPRouter.Any2EVMMessage calldata message) external;
}

/**
 * @title MockCCIPReceiver
 * @dev Base contract for CCIP receivers
 */
abstract contract MockCCIPReceiver is IMockCCIPReceiver {
    address internal immutable i_router;

    constructor(address router) {
        i_router = router;
    }

    /// @notice Only allow a call to be made by the router
    modifier onlyRouter() {
        require(msg.sender == i_router, "MockCCIPReceiver: caller is not the router");
        _;
    }

    // ✅ FIXED: Abstract functions can't have modifiers
    // The implementing contract should use the onlyRouter modifier
    function ccipReceive(MockCCIPRouter.Any2EVMMessage calldata message) 
        external 
        virtual 
        override;
}
