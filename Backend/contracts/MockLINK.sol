// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockLINK
 * @dev Mock LINK token for testing on Morph testnet
 * @notice This is a mock contract for testing purposes only
 * WARNING: This is NOT the real LINK token - Morph testnet does not have official LINK token
 */
contract MockLINK is ERC20 {
    uint8 private _decimals = 18;

    constructor() ERC20("Mock Chainlink Token", "LINK") {
        // Mint initial supply to deployer
        _mint(msg.sender, 10000000 * 10**_decimals); // 10M LINK
    }

    /**
     * @dev Returns the number of decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - allows users to claim test LINK tokens
     */
    function faucet(address to, uint256 amount) external {
        require(amount <= 1000 * 10**_decimals, "Max 1000 LINK per request");
        _mint(to, amount);
    }
}
