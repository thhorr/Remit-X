import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config/contracts';
import { ERC20_ABI } from '../config/abis';

function TokenFaucet() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [fundingAmount, setFundingAmount] = useState('1000');
  
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Debug contract addresses
  useEffect(() => {
    console.log("🔍 Contract Addresses:");
    console.log("REMITX_CORE:", CONTRACTS.REMITX_CORE);
    console.log("MOCK_USDC:", CONTRACTS.MOCK_USDC);
    console.log("MOCK_USDT:", CONTRACTS.MOCK_USDT);
    console.log("MOCK_DAI:", CONTRACTS.MOCK_DAI);
    console.log("User Address:", address);
    console.log("Connected:", isConnected);
  }, [address, isConnected]);

  // ✅ Read contract balances for RemitX Core
  const { data: contractUsdcBalance } = useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    watch: true,
  });

  const { data: contractUsdtBalance } = useReadContract({
    address: CONTRACTS.MOCK_USDT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    watch: true,
  });

  const { data: contractDaiBalance } = useReadContract({
    address: CONTRACTS.MOCK_DAI,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    watch: true,
  });

  const tokens = {
    USDC: {
      address: CONTRACTS.MOCK_USDC,
      decimals: 6,
      contractBalance: contractUsdcBalance,
      icon: '💵',
      color: 'blue',
    },
    USDT: {
      address: CONTRACTS.MOCK_USDT,
      decimals: 6,
      contractBalance: contractUsdtBalance,
      icon: '💴',
      color: 'green',
    },
    DAI: {
      address: CONTRACTS.MOCK_DAI,
      decimals: 18,
      contractBalance: contractDaiBalance,
      icon: '💶',
      color: 'yellow',
    }
  };

  // ✅ Helper function to get button classes with proper colors
  const getButtonClasses = (tokenSymbol) => {
    const baseClasses = "text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-gray-400";
    
    switch (tokenSymbol) {
      case 'USDC':
        return `bg-blue-600 hover:bg-blue-700 ${baseClasses}`;
      case 'USDT':
        return `bg-green-600 hover:bg-green-700 ${baseClasses}`;
      case 'DAI':
        return `bg-yellow-600 hover:bg-yellow-700 ${baseClasses}`;
      default:
        return `bg-gray-600 hover:bg-gray-700 ${baseClasses}`;
    }
  };

  // ✅ Handle direct contract funding only
  const handleFundContract = async (tokenSymbol) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const token = tokens[tokenSymbol];
    const recipient = CONTRACTS.REMITX_CORE;
    
    // Validate contract address
    if (!token.address || token.address === "0xYOUR_DEPLOYED_ADDRESS") {
      toast.error("❌ Contract address not configured. Please update contracts.js");
      console.error("Invalid contract address:", token.address);
      return;
    }

    console.log(`🚀 Funding contract with ${tokenSymbol}:`, {
      address: token.address,
      amount: fundingAmount,
      decimals: token.decimals,
      recipient: recipient,
      parsedAmount: parseUnits(fundingAmount, token.decimals).toString()
    });
    
    try {
      setSelectedToken(tokenSymbol);
      toast.loading(`Funding contract with ${fundingAmount} ${tokenSymbol}...`);
      
      await writeContract({
        address: token.address,
        abi: [
          ...ERC20_ABI,
          {
            "inputs": [
              {"name": "to", "type": "address"}, 
              {"name": "amount", "type": "uint256"}
            ],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'mint',
        args: [recipient, parseUnits(fundingAmount, token.decimals)],
      });
      
    } catch (error) {
      toast.dismiss();
      console.error('❌ Funding error:', error);
      toast.error(`Failed to fund contract with ${tokenSymbol}: ${error.shortMessage || error.message}`);
    }
  };

  // ✅ Helper function to truncate addresses
  const truncateAddress = (addr) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Handle transaction states with better logging
  useEffect(() => {
    if (writeError) {
      toast.dismiss();
      console.error("❌ Write Contract Error:", writeError);
      toast.error(`Transaction failed: ${writeError.shortMessage || writeError.message}`);
    }
  }, [writeError]);

  useEffect(() => {
    if (receiptError) {
      toast.dismiss();
      console.error("❌ Receipt Error:", receiptError);
      toast.error(`Transaction receipt failed: ${receiptError.message}`);
    }
  }, [receiptError]);

  useEffect(() => {
    if (isPending) {
      toast.dismiss();
      toast.loading("📝 Check your wallet to confirm the transaction...");
    }
  }, [isPending]);
  
  useEffect(() => {
    if (isConfirming) {
      toast.dismiss();
      toast.loading("⏳ Transaction submitted, waiting for confirmation...");
      console.log("🔗 Transaction hash:", hash);
    }
  }, [isConfirming, hash]);
  
  useEffect(() => {
    if (isSuccess) {
      toast.dismiss();
      toast.success(`✅ Successfully funded contract with ${fundingAmount} ${selectedToken}!`);
      console.log("✅ Transaction successful:", hash);
    }
  }, [isSuccess, selectedToken, hash, fundingAmount]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
        🏦 Fund Contract
      </h2>
      <p className="text-gray-600 mb-6">Fund the RemitX Core contract with tokens to enable claims</p>
      
      {/* ✅ Funding Amount Input */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">💰 Funding Amount:</h3>
        
        <div className="p-3 bg-white rounded border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to mint to contract:
          </label>
          <input
            type="number"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="1000"
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher amounts ensure contract can fulfill more claims
          </p>
        </div>
      </div>

      {/* ✅ Contract Balance Display */}
      <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
        <h3 className="font-semibold text-red-900 mb-3">🏦 Current Contract Balances:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(tokens).map(([symbol, token]) => (
            <div key={symbol} className="bg-white rounded p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">
                  {token.icon} {symbol}
                </span>
                <span className="font-mono text-sm text-gray-900">
                  {token.contractBalance 
                    ? formatUnits(token.contractBalance, token.decimals)
                    : '0'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-red-700 mt-2">
          ⚠️ Contract needs sufficient tokens to fulfill claims
        </p>
      </div>
      
      {/* ✅ Fund Contract Buttons - FIXED COLORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(tokens).map(([symbol, token]) => {
          return (
            <button
              key={symbol}
              onClick={() => handleFundContract(symbol)}
              disabled={isPending || isConfirming || !isConnected}
              className={getButtonClasses(symbol)}
            >
              <span className="mr-2">{token.icon}</span>
              {isPending && selectedToken === symbol
                ? "Funding..."
                : isConfirming && selectedToken === symbol
                ? "Confirming..."
                : `Fund ${fundingAmount} ${symbol}`
              }
            </button>
          );
        })}
      </div>

      {/* Status Messages */}
      {!isConnected && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Please connect your wallet to fund the contract</p>
        </div>
      )}

      {/* ✅ Contract Destination Display */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">
            Funding target: 
          </span>
          <span className="font-mono text-blue-700">
            🏦 RemitX Core ({truncateAddress(CONTRACTS.REMITX_CORE)})
          </span>
        </div>
        <div className="mt-2 text-xs text-green-700">
          ✅ Tokens funded to contract enable immediate claims!
        </div>
      </div>

      {/* Transaction Hash */}
      {hash && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            Transaction: <a 
              href={`https://explorer-holesky.morphl2.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

export default TokenFaucet;
