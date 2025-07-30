// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MockAggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @dev Mock Chainlink Price Feed for testing on networks without official Chainlink feeds
 * @notice This is for testing purposes only - DO NOT USE IN PRODUCTION
 * WARNING: This uses mock Chainlink interfaces - Morph testnet does not have official Chainlink support
 */
contract MockPriceFeed is AggregatorV3Interface {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;
    int256 private _latestPrice;
    uint256 private _latestTimestamp;
    uint80 private _latestRound;

    mapping(uint80 => int256) private _prices;
    mapping(uint80 => uint256) private _timestamps;

    event PriceUpdated(int256 price, uint80 round, uint256 timestamp);

    constructor(
        uint8 decimals_,
        string memory description_,
        int256 initialPrice_
    ) {
        _decimals = decimals_;
        _description = description_;
        _version = 1;
        _latestPrice = initialPrice_;
        _latestTimestamp = block.timestamp;
        _latestRound = 1;
        
        _prices[_latestRound] = _latestPrice;
        _timestamps[_latestRound] = _latestTimestamp;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _latestRound,
            _latestPrice,
            _latestTimestamp,
            _latestTimestamp,
            _latestRound
        );
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _prices[_roundId],
            _timestamps[_roundId],
            _timestamps[_roundId],
            _roundId
        );
    }

    // Admin function to update price (for testing)
    function updatePrice(int256 newPrice) external {
        _latestRound++;
        _latestPrice = newPrice;
        _latestTimestamp = block.timestamp;
        
        _prices[_latestRound] = _latestPrice;
        _timestamps[_latestRound] = _latestTimestamp;
        
        emit PriceUpdated(newPrice, _latestRound, _latestTimestamp);
    }

    // Convenience function to get current price
    function getLatestPrice() external view returns (int256) {
        return _latestPrice;
    }
}
