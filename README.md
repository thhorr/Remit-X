# RemitX - Cross-Border Remittance dApp

**A decentralized application for cross-border remittances using stablecoins on Morph testnet**

## 🚨 IMPORTANT: Mock Contracts Notice

**This project currently uses MOCK contracts for Morph testnet deployment because:**
- Morph testnet does NOT have official Chainlink Price Feeds support
- Morph testnet does NOT have official Chainlink CCIP support  
- Morph testnet does NOT have official Chainlink Automation support
- These mock contracts are for testing purposes only

**For production deployment on supported networks, all mock contracts must be replaced with official Chainlink addresses.**

## 🏗️ Project Structure

```
RemitX/
├── Backend/                 # Smart contracts & deployment
│   ├── contracts/          # Solidity contracts
│   │   ├── RemitXCore.sol       # Main remittance logic
│   │   ├── MockTokens.sol       # Test stablecoins
│   │   ├── MockPriceFeed.sol    # Mock price feeds
│   │   ├── MockCCIPRouter.sol   # Mock CCIP router
│   │   └── MockLINK.sol         # Mock LINK token
│   ├── deploy/             # Deployment scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.js   # Hardhat configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── config/         # Contract addresses & ABIs
│   │   └── ...
│   └── package.json
```

## 🔧 Features

### ✅ Implemented Features
- **Cross-border remittances** with stablecoins (USDC, USDT, DAI)
- **Token swapping** with mock price feeds
- **Cross-chain messaging** (mocked)
- **Modern React frontend** with wallet integration
- **Token faucet** for testing

### 🔄 Mock Features (Testnet Only)
- **MockPriceFeed**: Simulates Chainlink price feeds
- **MockCCIPRouter**: Simulates cross-chain messaging
- **MockLINK**: Mock LINK token for testing
- **MockTokens**: Test stablecoins (USDC, USDT, DAI)

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MetaMask or compatible wallet
- Morph testnet ETH for gas fees

### 1. Backend Setup
```bash
cd Backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your private key and RPC URL
```

### 3. Deploy Contracts
```bash
# Compile contracts
npm run compile

# Deploy to Morph testnet
npx hardhat deploy --network morphTestnet
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📝 Contract Addresses

After deployment, update the contract addresses in `frontend/src/config/contracts.js`:

```javascript
export const CONTRACTS = {
  REMITX_CORE: "0x...",
  MOCK_USDC: "0x...",
  MOCK_USDT: "0x...",
  MOCK_DAI: "0x...",
  MOCK_CCIP_ROUTER: "0x...",
  MOCK_LINK: "0x...",
  MOCK_PRICE_FEEDS: {
    ETH_USD: "0x...",
    USDC_USD: "0x...",
    USDT_USD: "0x...",
    DAI_USD: "0x...",
  },
};
```

## 🧪 Testing

1. **Get test tokens** from the faucet
2. **Send remittance** to another address
3. **Swap tokens** using mock price feeds
4. **View transaction history**

## 🔮 Future Mainnet Deployment

When deploying to mainnet (or when Chainlink officially supports Morph):

1. **Replace MockPriceFeed** with official Chainlink price feed addresses
2. **Replace MockCCIPRouter** with official CCIP router address
3. **Replace MockLINK** with official LINK token address
4. **Remove mock token contracts**
5. **Update deployment scripts** to use real addresses
6. **Test on supported testnets** before mainnet

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [Morph Testnet](https://docs.morphl2.io/) - Morph network documentation
- [Chainlink Docs](https://docs.chain.link/) - Chainlink documentation

## ⚠️ Disclaimers

- This is a testnet deployment with mock contracts
- Not for production use without proper mainnet integration
- Morph testnet does not have official Chainlink support
- All price feeds and cross-chain functionality are simulated
- Use at your own risk and thoroughly test before any production deployment

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity, Hardhat
- **Frontend**: React, Vite, Tailwind CSS
- **Web3 Integration**: Wagmi, RainbowKit, Ethers.js , Chainlink
- **Network**: Morph Testnet
- **Oracles**: Mock Chainlink contracts

---

**Built for educational and testing purposes. Please use responsibly and verify all functionality before any production use.**
