// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockCCIPRouter
 * @dev Mock CCIP Router for testing on Morph testnet
 * @notice This is a mock contract for testing purposes only
 * WARNING: This is NOT a real CCIP Router - Morph testnet does not have Chainlink CCIP support
 */
contract MockCCIPRouter {
    event CCIPSendRequested(
        uint64 indexed destinationChainSelector,
        address indexed receiver,
        bytes data,
        address indexed sender
    );

    event MessageExecuted(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed sender,
        address receiver,
        bytes data
    );

    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        EVMTokenAmount[] tokenAmounts;
        address feeToken;
        bytes extraArgs;
    }

    struct EVMTokenAmount {
        address token;
        uint256 amount;
    }
    
    // ✅ ADDED: Missing struct that was causing the compilation error
    struct Any2EVMMessage {
        bytes32 messageId;
        uint64 sourceChainSelector;
        bytes sender;
        bytes data;
        EVMTokenAmount[] tokenAmounts;
    }
    
    mapping(uint64 => bool) public supportedChains;
    mapping(bytes32 => bool) public executedMessages;
    
    uint256 public constant MOCK_FEE = 0.001 ether;
    uint256 private messageIdCounter = 1;

    constructor() {
        // Add all chains that your frontend supports
        supportedChains[2810] = true; // Morph testnet
        supportedChains[16015286601757825753] = true; // Ethereum Sepolia
        supportedChains[10344971235874465080] = true; // BSC Testnet
        supportedChains[14767482510784806043] = true; // Avalanche Fuji
        supportedChains[3478487238524512106] = true; // Arbitrum Sepolia
        supportedChains[5224473277236331295] = true; // Optimism Sepolia
    }

    /**
     * @dev Mock function to simulate sending a CCIP message
     */
    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        require(supportedChains[destinationChainSelector], "Unsupported chain");
        require(msg.value >= MOCK_FEE, "Insufficient fee");

        bytes32 messageId = keccak256(abi.encodePacked(messageIdCounter++, block.timestamp, msg.sender));
        
        emit CCIPSendRequested(
            destinationChainSelector,
            abi.decode(message.receiver, (address)),
            message.data,
            msg.sender
        );

        return messageId;
    }

    /**
     * @dev Mock function to get the fee for sending a message
     */
    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external view returns (uint256) {
        require(supportedChains[destinationChainSelector], "Unsupported chain");
        return MOCK_FEE;
    }

    /**
     * @dev Mock function to simulate receiving a CCIP message
     */
    function mockReceiveMessage(
        bytes32 messageId,
        uint64 sourceChainSelector,
        address sender,
        address receiver,
        bytes calldata data
    ) external {
        require(!executedMessages[messageId], "Message already executed");
        executedMessages[messageId] = true;

        emit MessageExecuted(messageId, sourceChainSelector, sender, receiver, data);
        
        // In a real implementation, this would call the receiver's ccipReceive function
        // For testing, we just emit the event
    }

    /**
     * @dev Add supported chain (admin function)
     */
    function addSupportedChain(uint64 chainSelector) external {
        supportedChains[chainSelector] = true;
    }

    /**
     * @dev Check if a chain is supported
     */
    function isChainSupported(uint64 chainSelector) external view returns (bool) {
        return supportedChains[chainSelector];
    }

    /**
     * @dev Withdraw collected fees (for testing)
     */
    function withdrawFees() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
