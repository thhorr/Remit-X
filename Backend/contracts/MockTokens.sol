// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 */
contract MockUSDC is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock USD Coin", "USDC") Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10**6); // 1M USDC with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**6, "Max 1000 USDC per request");
        _mint(msg.sender, amount);
    }
}

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing purposes
 */
contract MockUSDT is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock Tether USD", "USDT") Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10**6); // 1M USDT with 6 decimals
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**6, "Max 1000 USDT per request");
        _mint(msg.sender, amount);
    }
}

/**
 * @title MockDAI
 * @dev Mock DAI token for testing purposes
 */
contract MockDAI is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock Dai Stablecoin", "DAI") Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10**18); // 1M DAI with 18 decimals
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**18, "Max 1000 DAI per request");
        _mint(msg.sender, amount);
    }
}
