// Contract addresses for Morph testnet
// 🚨 WARNING: These are MOCK contracts for testing on Morph testnet only!
// Morph testnet does NOT have official Chainlink support as of July 2025
export const CONTRACTS = {
  REMITX_CORE: "0x24D11988d717C0B24afD36eaC4939cB0b2b980E7", 
  MOCK_USDC: "0x990eD65B9E55a2b157Fc4ea2e150cD4DDbF86D3f", 
  MOCK_USDT: "0x7605c932F561567cC538a6209084BD69eE9b5188", 
  MOCK_DAI: "0xCd35b98e3a6bA62e0F37782431B530101c420E15", 
  MOCK_CCIP_ROUTER: "0x1B5E93339955383d258aC5881F71AfF837A5933f", 
  MOCK_LINK: "0x9b14B28f6Ce775bD5a55d8858D51D8627747D0e2", 
  MOCK_PRICE_FEEDS: {
    ETH_USD: "0x3F59871468DE826EF8C056E3552DF0b58fD452B4", 
    USDC_USD: "0x3b22D2faF45da955Fb33EEf8D52e60AeB7e4b339", 
    USDT_USD: "0x544565F826340A263CdF72d0409487D0AA9bcA6F", 
    DAI_USD: "0x81B77F36971B9173cb49A7B17ea42F8a52eb3254", 
  },
};

// Morph Testnet configuration
export const MORPH_TESTNET = {
  id: 2810,
  name: 'Morph Testnet',
  network: 'morph-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://rpc-quicknode-holesky.morphl2.io'] },
    default: { http: ['https://rpc-quicknode-holesky.morphl2.io'] },
  },
  blockExplorers: {
    default: { name: 'Morph Explorer', url: 'https://explorer-holesky.morphl2.io' },
  },
};

// Supported tokens configuration
export const SUPPORTED_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: CONTRACTS.MOCK_USDC,
    decimals: 6,
    icon: '💵'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: CONTRACTS.MOCK_USDT,
    decimals: 6,
    icon: '💰'
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: CONTRACTS.MOCK_DAI,
    decimals: 18,
    icon: '🪙'
  }
];

