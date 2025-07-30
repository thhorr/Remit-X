// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockAggregatorV3Interface
 * @dev Mock Chainlink AggregatorV3Interface for testing purposes
 * @notice This is a mock contract for testing purposes only
 * WARNING: This is NOT the real AggregatorV3Interface - for testing only
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
