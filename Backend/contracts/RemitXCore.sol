// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./MockAggregatorV3Interface.sol";
import "./MockCCIPReceiver.sol";
import "./MockCCIPRouter.sol";

/**
 * @title RemitXCore
 * @dev Core contract for RemitX stablecoin-based remittance system with direct transfers
 * WARNING: This uses mock CCIP contracts - Morph testnet does not have official Chainlink CCIP support
 * @notice Handles cross-border remittances with immediate token delivery using CCIP
 */
contract RemitXCore is Ownable, ReentrancyGuard, Pausable, MockCCIPReceiver {
    using SafeERC20 for IERC20;

    // Error for message processing
    error MessageAlreadyProcessed();

    // Events
    event RemittanceCreated(
        bytes32 indexed remittanceId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        address sourceToken,
        address targetToken,
        uint64 destinationChain
    );

    // Event for direct transfer completion (no claiming needed)
    event RemittanceCompleted(
        bytes32 indexed remittanceId,
        address indexed recipient,
        uint256 amount,
        address targetToken,
        bool isCrossChain
    );

    // Event for remittance deletion (only for failed transfers)
    event RemittanceDeleted(
        bytes32 indexed remittanceId,
        address indexed sender,
        uint256 refundedAmount,
        address sourceToken,
        uint256 refundedETH
    );

    // Enhanced: Cross-chain event with direct transfer info
    event CrossChainRemittanceSent(
        bytes32 indexed remittanceId,
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address recipient,
        uint256 amount,
        address targetToken
    );

    // Event for cross-chain receipt confirmation
    event CrossChainRemittanceReceived(
        bytes32 indexed remittanceId,
        bytes32 indexed messageId,
        address indexed recipient,
        uint256 amount,
        address targetToken
    );

    event TokenSwapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);

    // Struct for direct transfer model
    struct Remittance {
        address sender;
        address recipient;
        uint256 amount;
        address sourceToken;
        address targetToken;
        uint64 destinationChain;
        uint256 timestamp;
        bool completed; // Changed: From 'claimed' to 'completed' (auto-set to true)
        bool deleted; // Track if remittance is deleted (only for failed transfers)
        uint256 exchangeRate;
        uint256 ccipFee; // Track CCIP fee paid
        bool isCrossChain; // Track if it was cross-chain transfer
        bytes32 ccipMessageId; // Track CCIP message ID for cross-chain transfers
    }

    struct TokenConfig {
        bool isSupported;
        address priceFeed;
        uint256 minAmount;
        uint256 maxAmount;
    }

    // State variables
    mapping(bytes32 => Remittance) public remittances;
    mapping(address => TokenConfig) public supportedTokens;
    mapping(uint64 => bool) public supportedChains;
    mapping(address => bytes32[]) public userRemittances; // Track user's remittances
    mapping(bytes32 => bool) public processedMessages; // Track processed CCIP messages
    
    MockCCIPRouter public ccipRouter;
    address public linkToken;
    
    uint256 public remittanceFee = 50; // 0.5% in basis points
    uint256 public constant MAX_FEE = 1000; // 10% maximum fee
    uint256 public constant BASIS_POINTS = 10000;
    
    bytes32[] public remittanceIds;
    
    // Enhanced: Custom errors
    error RemittanceNotFound();
    error OnlyCreatorCanDelete();
    error RemittanceAlreadyCompleted(); // Changed: From AlreadyClaimed to AlreadyCompleted
    error RemittanceAlreadyDeleted();
    error InvalidRecipient();
    error InvalidAmount();
    error TokenNotSupported();
    error ChainNotSupported();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error SlippageTooHigh();
    error FeeTooHigh();
    error InvalidPriceData();
    error InsufficientCCIPFee();
    error TransferFailed();
    error InsufficientContractBalance(); // For contract liquidity check
    error DirectTransferFailed(); // For direct transfer failures
    
    // Update constructor to initialize MockCCIPReceiver
    constructor(
        address _ccipRouter,
        address _linkToken,
        address initialOwner
    ) Ownable(initialOwner) MockCCIPReceiver(_ccipRouter) {
        ccipRouter = MockCCIPRouter(_ccipRouter);
        linkToken = _linkToken;
    }

    /**
     * COMPLETELY REWRITTEN: Creates remittance with immediate direct transfer
     * @param recipient The recipient address
     * @param amount The amount to send
     * @param sourceToken The source token address
     * @param targetToken The target token address
     * @param destinationChain The destination chain selector
     */
    function createRemittance(
        address recipient,
        uint256 amount,
        address sourceToken,
        address targetToken,
        uint64 destinationChain
    ) external payable nonReentrant whenNotPaused {
        // Enhanced validations
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (!supportedTokens[sourceToken].isSupported) revert TokenNotSupported();
        if (!supportedTokens[targetToken].isSupported) revert TokenNotSupported();
        if (!supportedChains[destinationChain]) revert ChainNotSupported();
        
        TokenConfig memory sourceConfig = supportedTokens[sourceToken];
        if (amount < sourceConfig.minAmount) revert AmountBelowMinimum();
        if (amount > sourceConfig.maxAmount) revert AmountAboveMaximum();

        // Calculate fee
        uint256 fee = (amount * remittanceFee) / BASIS_POINTS;
        uint256 amountAfterFee = amount - fee;

        // Get exchange rate and calculate target amount
        uint256 exchangeRate = getExchangeRate(sourceToken, targetToken);
        uint256 targetAmount = (amountAfterFee * exchangeRate) / 1e18;

        // CRITICAL: Check contract has sufficient target tokens for direct transfer
        uint256 contractBalance = IERC20(targetToken).balanceOf(address(this));
        if (contractBalance < targetAmount) {
            revert InsufficientContractBalance();
        }

        // Transfer source tokens from sender to contract
        IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);

        // Determine if cross-chain transfer
        bool isCrossChain = destinationChain != block.chainid && destinationChain != 2810;
        
        // CRITICAL: Validate CCIP fee for cross-chain transfers
        if (isCrossChain) {
            uint256 requiredCcipFee = getFee(destinationChain, recipient, targetAmount);
            if (msg.value < requiredCcipFee) revert InsufficientCCIPFee();
        }

        // Create unique remittance ID
        bytes32 remittanceId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                amount,
                sourceToken,
                targetToken,
                destinationChain,
                block.timestamp,
                block.number
            )
        );

        // Store remittance as completed (direct transfer model)
        remittances[remittanceId] = Remittance({
            sender: msg.sender,
            recipient: recipient,
            amount: amountAfterFee,
            sourceToken: sourceToken,
            targetToken: targetToken,
            destinationChain: destinationChain,
            timestamp: block.timestamp,
            completed: true, // CRITICAL: Always true for direct transfers
            deleted: false,
            exchangeRate: exchangeRate,
            ccipFee: msg.value,
            isCrossChain: isCrossChain,
            ccipMessageId: bytes32(0) // Will be set for cross-chain transfers
        });

        // Add to tracking arrays
        remittanceIds.push(remittanceId);
        userRemittances[msg.sender].push(remittanceId);

        // Emit creation event
        emit RemittanceCreated(
            remittanceId,
            msg.sender,
            recipient,
            amountAfterFee,
            sourceToken,
            targetToken,
            destinationChain
        );

        // CRITICAL: Execute direct transfer immediately
        if (isCrossChain) {
            // Cross-chain: Send via CCIP with direct delivery to recipient
            _executeDirectCrossChainTransfer(remittanceId, recipient, targetAmount, targetToken, destinationChain);
        } else {
            // Same chain: Direct transfer to recipient immediately
            _executeDirectSameChainTransfer(remittanceId, recipient, targetAmount, targetToken);
        }
    }

    /**
     * FIXED: Execute direct same-chain transfer - replaced try/catch with direct call
     */
    function _executeDirectSameChainTransfer(
        bytes32 remittanceId,
        address recipient,
        uint256 targetAmount,
        address targetToken
    ) internal {
        // FIXED: Removed try/catch that was causing compilation error
        // Instead, use direct transfer and handle failures at the contract level
        IERC20(targetToken).safeTransfer(recipient, targetAmount);
        
        // If we got here without reverting, transfer was successful
        emit RemittanceCompleted(remittanceId, recipient, targetAmount, targetToken, false);
    }

    /**
     * Execute direct cross-chain transfer via CCIP
     */
    function _executeDirectCrossChainTransfer(
        bytes32 remittanceId,
        address recipient,
        uint256 targetAmount,
        address targetToken,
        uint64 destinationChain
    ) internal {
        // Enhanced CCIP message with token transfer
        MockCCIPRouter.EVMTokenAmount[] memory tokenAmounts = new MockCCIPRouter.EVMTokenAmount[](1);
        tokenAmounts[0] = MockCCIPRouter.EVMTokenAmount({
            token: targetToken,
            amount: targetAmount
        });

        MockCCIPRouter.EVM2AnyMessage memory message = MockCCIPRouter.EVM2AnyMessage({
            receiver: abi.encode(recipient), // Direct delivery to recipient
            data: abi.encode(
                "DIRECT_TRANSFER", // Flag for direct transfer
                remittanceId,
                recipient,
                targetAmount,
                targetToken
            ),
            tokenAmounts: tokenAmounts, // CRITICAL: Include token transfer
            feeToken: address(0), // Use ETH for fees
            extraArgs: ""
        });
        
        // FIXED: Replaced try/catch with direct call and handle failures at caller level
        bytes32 messageId = ccipRouter.ccipSend{value: msg.value}(destinationChain, message);
        
        // Update remittance with message ID
        remittances[remittanceId].ccipMessageId = messageId;
        
        emit CrossChainRemittanceSent(
            remittanceId,
            messageId,
            destinationChain,
            recipient,
            targetAmount,
            targetToken
        );
        
        emit RemittanceCompleted(remittanceId, recipient, targetAmount, targetToken, true);
    }

    /**
     * ENHANCED: Delete remittance - now only for failed transfers with full refund
     * @param remittanceId The remittance ID to delete
     */
    function deleteRemittance(bytes32 remittanceId) external nonReentrant whenNotPaused {
        Remittance storage remittance = remittances[remittanceId];
        
        if (remittance.sender == address(0)) revert RemittanceNotFound();
        if (remittance.sender != msg.sender) revert OnlyCreatorCanDelete();
        if (remittance.completed) revert RemittanceAlreadyCompleted(); // CHANGED: Can't delete completed transfers
        if (remittance.deleted) revert RemittanceAlreadyDeleted();

        // Mark as deleted
        remittance.deleted = true;

        // ENHANCED: Calculate full refund including fees
        uint256 feeAmount = (remittance.amount * remittanceFee) / (BASIS_POINTS - remittanceFee);
        uint256 totalTokenRefund = remittance.amount + feeAmount;

        // Refund source tokens
        IERC20(remittance.sourceToken).safeTransfer(msg.sender, totalTokenRefund);

        // ENHANCED: Refund CCIP fee if it was a cross-chain transfer
        uint256 ethRefund = 0;
        if (remittance.ccipFee > 0) {
            ethRefund = remittance.ccipFee;
            payable(msg.sender).transfer(ethRefund);
        }

        emit RemittanceDeleted(
            remittanceId,
            msg.sender,
            totalTokenRefund,
            remittance.sourceToken,
            ethRefund
        );
    }

    /**
     * PRESERVED: Token swapping functionality (unchanged)
     */
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused {
        if (!supportedTokens[tokenIn].isSupported) revert TokenNotSupported();
        if (!supportedTokens[tokenOut].isSupported) revert TokenNotSupported();
        if (amountIn == 0) revert InvalidAmount();

        // Get exchange rate
        uint256 exchangeRate = getExchangeRate(tokenIn, tokenOut);
        uint256 amountOut = (amountIn * exchangeRate) / 1e18;

        if (amountOut < minAmountOut) revert SlippageTooHigh();

        // Check contract has sufficient output tokens
        uint256 contractBalance = IERC20(tokenOut).balanceOf(address(this));
        if (contractBalance < amountOut) revert InsufficientContractBalance();

        // Transfer input tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Transfer output tokens to user
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit TokenSwapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * ENHANCED: Calculate CCIP fee with token transfer support
     */
    function getFee(
        uint64 destinationChainSelector,
        address recipient,
        uint256 amount
    ) public view returns (uint256) {
        // Same chain transfers have no CCIP fee
        if (destinationChainSelector == block.chainid || destinationChainSelector == 2810) {
            return 0;
        }
        
        // Check if chain is supported
        if (!supportedChains[destinationChainSelector]) {
            return 0;
        }
        
        // ENHANCED: Create message with token transfer for accurate fee calculation
        MockCCIPRouter.EVMTokenAmount[] memory tokenAmounts = new MockCCIPRouter.EVMTokenAmount[](1);
        tokenAmounts[0] = MockCCIPRouter.EVMTokenAmount({
            token: address(0), // Placeholder - actual token address will be used in real transfer
            amount: amount
        });

        MockCCIPRouter.EVM2AnyMessage memory message = MockCCIPRouter.EVM2AnyMessage({
            receiver: abi.encode(recipient),
            data: abi.encode("DIRECT_TRANSFER", recipient, amount),
            tokenAmounts: tokenAmounts,
            feeToken: address(0), // Use ETH for fees
            extraArgs: ""
        });
        
        return ccipRouter.getFee(destinationChainSelector, message);
    }

    /**
     * PRESERVED: Exchange rate calculation (unchanged)
     */
    function getExchangeRate(address tokenA, address tokenB) public view returns (uint256) {
        TokenConfig memory configA = supportedTokens[tokenA];
        TokenConfig memory configB = supportedTokens[tokenB];

        require(configA.priceFeed != address(0), "Price feed not set for token A");
        require(configB.priceFeed != address(0), "Price feed not set for token B");

        (, int256 priceA, , , ) = AggregatorV3Interface(configA.priceFeed).latestRoundData();
        (, int256 priceB, , , ) = AggregatorV3Interface(configB.priceFeed).latestRoundData();

        if (priceA <= 0 || priceB <= 0) revert InvalidPriceData();

        // Calculate exchange rate: (priceA / priceB) * 1e18
        return (uint256(priceA) * 1e18) / uint256(priceB);
    }

    /**
     * FIXED: CCIP receive implementation with onlyRouter modifier
     */
    function ccipReceive(MockCCIPRouter.Any2EVMMessage calldata message) 
        external 
        override 
        onlyRouter 
    {
        // Prevent duplicate processing
        if (processedMessages[message.messageId]) revert MessageAlreadyProcessed();
        processedMessages[message.messageId] = true;

        // Decode message data
        (string memory transferType, bytes32 remittanceId, address recipient, uint256 amount, address targetToken) = 
            abi.decode(message.data, (string, bytes32, address, uint256, address));

        if (keccak256(bytes(transferType)) == keccak256(bytes("DIRECT_TRANSFER"))) {
            // Execute direct transfer to recipient
            IERC20(targetToken).safeTransfer(recipient, amount);
            
            emit CrossChainRemittanceReceived(remittanceId, message.messageId, recipient, amount, targetToken);
        }
    }

    // PRESERVED: User query functions (updated for direct transfer model)
    function getUserRemittances(address user) external view returns (bytes32[] memory) {
        return userRemittances[user];
    }

    /**
     * UPDATED: Get user's active remittances (only non-deleted, since all are completed)
     */
    function getUserActiveRemittances(address user) external view returns (bytes32[] memory) {
        bytes32[] memory userIds = userRemittances[user];
        uint256 activeCount = 0;
        
        // Count non-deleted remittances (all completed transfers are considered active)
        for (uint256 i = 0; i < userIds.length; i++) {
            Remittance memory remittance = remittances[userIds[i]];
            if (!remittance.deleted) {
                activeCount++;
            }
        }
        
        // Create array of active remittance IDs
        bytes32[] memory activeIds = new bytes32[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < userIds.length; i++) {
            Remittance memory remittance = remittances[userIds[i]];
            if (!remittance.deleted) {
                activeIds[currentIndex] = userIds[i];
                currentIndex++;
            }
        }
        
        return activeIds;
    }

    /**
     * NEW: Get remittances received by user (for "Received" tab)
     */
    function getUserReceivedRemittances(address user) external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // Count remittances received by user
        for (uint256 i = 0; i < remittanceIds.length; i++) {
            Remittance memory remittance = remittances[remittanceIds[i]];
            if (remittance.recipient == user && remittance.completed && !remittance.deleted) {
                count++;
            }
        }
        
        // Create array of received remittance IDs
        bytes32[] memory receivedIds = new bytes32[](count);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < remittanceIds.length; i++) {
            Remittance memory remittance = remittances[remittanceIds[i]];
            if (remittance.recipient == user && remittance.completed && !remittance.deleted) {
                receivedIds[currentIndex] = remittanceIds[i];
                currentIndex++;
            }
        }
        
        return receivedIds;
    }

    // PRESERVED: Get remittance details
    function getRemittance(bytes32 remittanceId) external view returns (Remittance memory) {
        return remittances[remittanceId];
    }

    // PRESERVED: Admin functions (unchanged)
    function addSupportedToken(
        address token,
        address priceFeed,
        uint256 minAmount,
        uint256 maxAmount
    ) external onlyOwner {
        supportedTokens[token] = TokenConfig({
            isSupported: true,
            priceFeed: priceFeed,
            minAmount: minAmount,
            maxAmount: maxAmount
        });
    }

    function removeSupportedToken(address token) external onlyOwner {
        delete supportedTokens[token];
    }

    function addSupportedChain(uint64 chainSelector) external onlyOwner {
        supportedChains[chainSelector] = true;
    }

    function removeSupportedChain(uint64 chainSelector) external onlyOwner {
        supportedChains[chainSelector] = false;
    }

    function setRemittanceFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_FEE) revert FeeTooHigh();
        emit FeeUpdated(remittanceFee, newFee);
        remittanceFee = newFee;
    }

    function withdrawFees(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    function withdrawETHFees(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
    }

    /**
     * NEW: Emergency function to fund contract with tokens for direct transfers
     */
    function fundContract(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * NEW: Check contract token balance for liquidity
     */
    function getContractTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // PRESERVED: View functions
    function getRemittanceCount() external view returns (uint256) {
        return remittanceIds.length;
    }

    function getRemittancesByUser(address user) external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // Count all remittances involving user
        for (uint256 i = 0; i < remittanceIds.length; i++) {
            Remittance memory remittance = remittances[remittanceIds[i]];
            if ((remittance.sender == user || remittance.recipient == user) && !remittance.deleted) {
                count++;
            }
        }
        
        // Create array
        bytes32[] memory userRemittancesList = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < remittanceIds.length; i++) {
            Remittance memory remittance = remittances[remittanceIds[i]];
            if ((remittance.sender == user || remittance.recipient == user) && !remittance.deleted) {
                userRemittancesList[index] = remittanceIds[i];
                index++;
            }
        }
        
        return userRemittancesList;
    }

    // PRESERVED: Emergency functions
    receive() external payable {
        // Allow contract to receive ETH for CCIP fees
    }

    fallback() external payable {
        // Allow contract to receive ETH for CCIP fees
    }
}
