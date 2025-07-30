import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { Send, ArrowRight, AlertCircle, Wallet, Globe, ArrowUpDown, DollarSign, User, ChevronDown, CheckCircle, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config/contracts';
import { REMITX_CORE_ABI, ERC20_ABI } from '../config/abis';

const SendRemittance = () => {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    sourceToken: CONTRACTS.MOCK_USDC,
    targetToken: CONTRACTS.MOCK_USDT,
    destinationChain: '2810',
  });
  const [step, setStep] = useState('form');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [ethBalance, setEthBalance] = useState(null);

  useEffect(() => {
    console.log('🔧 SendRemittance Component Initialized (DIRECT TRANSFER MODE):', {
      address,
      isConnected,
      contracts: CONTRACTS,
      formData,
      timestamp: new Date().toISOString()
    });
  }, [address, isConnected]);

  // ✅ ENHANCED: Contract write hooks for direct transfers
  const { 
    writeContract: writeApproval, 
    data: approvalHash, 
    isPending: isApproving, 
    error: approvalError,
    reset: resetApproval 
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error('❌ APPROVAL WRITE ERROR:', {
          error,
          message: error.message,
          shortMessage: error.shortMessage,
          cause: error.cause,
          details: error.details,
          stack: error.stack
        });
      },
      onSuccess: (data) => {
        console.log('✅ APPROVAL WRITE SUCCESS:', {
          data,
          hash: data,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  const { 
    writeContract: writeRemittance, 
    data: remittanceHash, 
    isPending: isSending, 
    error: remittanceError,
    reset: resetRemittance 
  } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error('❌ DIRECT TRANSFER WRITE ERROR:', {
          error,
          message: error.message,
          shortMessage: error.shortMessage,
          cause: error.cause,
          details: error.details,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      },
      onSuccess: (data) => {
        console.log('✅ DIRECT TRANSFER WRITE SUCCESS:', {
          data,
          hash: data,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Transaction receipt hooks
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  const { isLoading: isRemittanceConfirming, isSuccess: isRemittanceSuccess } = useWaitForTransactionReceipt({
    hash: remittanceHash,
  });

  // Check current allowance
  const { data: currentAllowance, refetch: refetchAllowance, error: allowanceError } = useReadContract({
    address: formData.sourceToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.REMITX_CORE],
    enabled: isConnected && !!address,
    watch: true,
  });

  // Check user balance
  const { data: userBalance, error: balanceError } = useReadContract({
    address: formData.sourceToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
    watch: true,
  });

  // Get token decimals
  const { data: tokenDecimals, error: decimalsError } = useReadContract({
    address: formData.sourceToken,
    abi: ERC20_ABI,
    functionName: 'decimals',
    enabled: !!formData.sourceToken,
  });

  // Check contract owner to verify deployment
  const { data: contractOwner, error: contractOwnerError } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'owner',
    enabled: !!CONTRACTS.REMITX_CORE,
  });

  // ✅ CRITICAL: Check contract token balances for direct transfer validation
  const { data: contractUSDCBalance } = useReadContract({
    address: CONTRACTS.MOCK_USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    enabled: !!CONTRACTS.REMITX_CORE && !!CONTRACTS.MOCK_USDC,
    watch: true,
  });

  const { data: contractUSDTBalance } = useReadContract({
    address: CONTRACTS.MOCK_USDT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    enabled: !!CONTRACTS.REMITX_CORE && !!CONTRACTS.MOCK_USDT,
    watch: true,
  });

  const { data: contractDAIBalance } = useReadContract({
    address: CONTRACTS.MOCK_DAI,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.REMITX_CORE],
    enabled: !!CONTRACTS.REMITX_CORE && !!CONTRACTS.MOCK_DAI,
    watch: true,
  });

  // ✅ NEW: Monitor contract token balances for direct transfer liquidity
  useEffect(() => {
    const contractBalances = {
      USDC: contractUSDCBalance ? formatUnits(contractUSDCBalance, 6) : '0',
      USDT: contractUSDTBalance ? formatUnits(contractUSDTBalance, 6) : '0',
      DAI: contractDAIBalance ? formatUnits(contractDAIBalance, 18) : '0'
    };

    console.log('🏦 Contract Token Balances (Direct Transfer Liquidity):', {
      contractAddress: CONTRACTS.REMITX_CORE,
      balances: contractBalances,
      raw: {
        USDC: contractUSDCBalance?.toString(),
        USDT: contractUSDTBalance?.toString(),
        DAI: contractDAIBalance?.toString()
      },
      timestamp: new Date().toISOString()
    });

    // ✅ CRITICAL: Validate contract has sufficient target tokens for direct transfer
    if (formData.amount && tokenDecimals && formData.targetToken) {
      const targetTokenBalance = getContractTokenBalance(formData.targetToken);
      const requiredAmount = parseFloat(formData.amount);
      
      if (targetTokenBalance !== null && targetTokenBalance < requiredAmount) {
        console.warn('⚠️ DIRECT TRANSFER LIQUIDITY WARNING:', {
          targetToken: getTokenSymbol(formData.targetToken),
          contractBalance: targetTokenBalance,
          requiredAmount,
          deficit: requiredAmount - targetTokenBalance,
          canDirectTransfer: false
        });
      } else if (targetTokenBalance !== null && targetTokenBalance >= requiredAmount) {
        console.log('✅ DIRECT TRANSFER LIQUIDITY CONFIRMED:', {
          targetToken: getTokenSymbol(formData.targetToken),
          contractBalance: targetTokenBalance,
          requiredAmount,
          surplus: targetTokenBalance - requiredAmount,
          canDirectTransfer: true
        });
      }
    }
  }, [contractUSDCBalance, contractUSDTBalance, contractDAIBalance, formData.amount, formData.targetToken, tokenDecimals]);

  // ✅ CRITICAL: Helper function to get contract token balance for direct transfers
  const getContractTokenBalance = (tokenAddress) => {
    if (tokenAddress === CONTRACTS.MOCK_USDC && contractUSDCBalance) {
      return parseFloat(formatUnits(contractUSDCBalance, 6));
    }
    if (tokenAddress === CONTRACTS.MOCK_USDT && contractUSDTBalance) {
      return parseFloat(formatUnits(contractUSDTBalance, 6));
    }
    if (tokenAddress === CONTRACTS.MOCK_DAI && contractDAIBalance) {
      return parseFloat(formatUnits(contractDAIBalance, 18));
    }
    return null;
  };

  // ✅ CRITICAL: Check if contract has insufficient liquidity for direct transfer
  const hasInsufficientContractBalance = () => {
    if (!formData.amount || !formData.targetToken) return false;
    
    const targetTokenBalance = getContractTokenBalance(formData.targetToken);
    const requiredAmount = parseFloat(formData.amount);
    
    return targetTokenBalance !== null && targetTokenBalance < requiredAmount;
  };

  // Token options
  const tokens = [
    { address: CONTRACTS.MOCK_USDC, symbol: 'USDC', decimals: 6, color: 'bg-blue-500', icon: '💵' },
    { address: CONTRACTS.MOCK_USDT, symbol: 'USDT', decimals: 6, color: 'bg-green-500', icon: '💴' },
    { address: CONTRACTS.MOCK_DAI, symbol: 'DAI', decimals: 18, color: 'bg-yellow-500', icon: '💶' },
  ];

  // Chains array
  const chains = [
    { selector: '2810', name: 'Morph Testnet (Instant)', network: 'current', icon: '🟣', color: 'bg-purple-600' },
    { selector: '16015286601757825753', name: 'Ethereum Sepolia', network: 'testnet', icon: '⟠', color: 'bg-gray-700' },
    { selector: '10344971235874465080', name: 'BSC Testnet', network: 'testnet', icon: '🟡', color: 'bg-yellow-600' },
    { selector: '14767482510784806043', name: 'Avalanche Fuji', network: 'testnet', icon: '🔺', color: 'bg-red-600' },
    { selector: '3478487238524512106', name: 'Arbitrum Sepolia', network: 'testnet', icon: '🔷', color: 'bg-blue-600' },
    { selector: '5224473277236331295', name: 'Optimism Sepolia', network: 'testnet', icon: '🔴', color: 'bg-red-500' },
  ];

  // Check if chain is supported
  const { data: isChainSupported, error: chainSupportError } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'supportedChains',
    args: [BigInt(formData.destinationChain)],
    enabled: !!formData.destinationChain && !!CONTRACTS.REMITX_CORE,
    watch: true,
  });

  // ✅ ENHANCED: CCIP fee calculation for direct transfers with token transfers
  const { data: ccipFee, error: ccipFeeError, isLoading: isCcipFeeLoading } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getFee',
    args: [
      BigInt(formData.destinationChain), 
      formData.recipient && isAddress(formData.recipient) ? formData.recipient : '0x0000000000000000000000000000000000000000', 
      formData.amount && tokenDecimals ? parseUnits(formData.amount, tokenDecimals) : 0n
    ],
    enabled: !!formData.destinationChain && 
             !!formData.recipient && 
             isAddress(formData.recipient) && 
             !!formData.amount && 
             !!tokenDecimals && 
             isChainSupported === true &&
             !!contractOwner,
    watch: true,
    retry: 3,
    retryDelay: 1000,
  });

  // ✅ ENHANCED: ETH balance validation for direct transfer fees
  useEffect(() => {
    const checkETHBalance = async () => {
      if (window.ethereum && isConnected && address) {
        try {
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          });
          const ethBal = BigInt(balance);
          setEthBalance(ethBal);
          
          console.log('💰 ETH Balance Update (Direct Transfer Fees):', {
            address,
            balance: formatUnits(ethBal, 18) + ' ETH',
            balanceWei: ethBal.toString(),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ ETH balance check failed:', error);
          setEthBalance(null);
        }
      }
    };

    checkETHBalance();
    const interval = setInterval(checkETHBalance, 30000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  // Check if approval is needed
  useEffect(() => {
    if (currentAllowance && formData.amount && tokenDecimals) {
      try {
        const requiredAmount = parseUnits(formData.amount, tokenDecimals);
        const hasAllowance = currentAllowance >= requiredAmount;
        setNeedsApproval(!hasAllowance);
        console.log('💳 Allowance Check Result (Direct Transfer):', {
          currentAllowance: formatUnits(currentAllowance, tokenDecimals),
          requiredAmount: formData.amount,
          hasAllowance,
          needsApproval: !hasAllowance,
          token: getTokenSymbol(formData.sourceToken),
          decimals: tokenDecimals
        });
      } catch (error) {
        console.error('❌ Allowance Check Error:', error);
      }
    }
  }, [currentAllowance, formData.amount, tokenDecimals]);

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess) {
      console.log('✅ Approval Transaction Successful (Direct Transfer Ready):', { approvalHash });
      toast.dismiss();
      toast.success('✅ Token approval confirmed! Ready for direct transfer');
      setStep('form');
      refetchAllowance();
    }
  }, [isApprovalSuccess, refetchAllowance, approvalHash]);

  // Monitor approval errors
  useEffect(() => {
    if (approvalError) {
      console.error('❌ Approval Transaction Error:', {
        error: approvalError,
        message: approvalError.message,
        shortMessage: approvalError.shortMessage,
        cause: approvalError.cause,
        stack: approvalError.stack
      });
      toast.dismiss();
      setStep('form');
      toast.error(`Approval failed: ${approvalError.shortMessage || approvalError.message}`);
    }
  }, [approvalError]);

  // Monitor Transaction Hash
  useEffect(() => {
    if (remittanceHash) {
      console.log('✅ Direct Transfer Transaction Hash Received:', {
        hash: remittanceHash,
        timestamp: new Date().toISOString()
      });
      toast.dismiss();
      toast.loading('Processing direct transfer... Tokens will be delivered instantly!');
    }
  }, [remittanceHash]);

  // ✅ CHANGED: Enhanced success handler for direct transfers
  useEffect(() => {
    if (isRemittanceSuccess) {
      console.log('🎉 DIRECT TRANSFER COMPLETED SUCCESSFULLY:', {
        hash: remittanceHash,
        timestamp: new Date().toISOString()
      });
      toast.dismiss();
      toast.success('🚀 Direct transfer completed! Tokens delivered instantly to recipient!'); // ✅ CHANGED message
      setStep('form');
      setFormData({
        recipient: '',
        amount: '',
        sourceToken: CONTRACTS.MOCK_USDC,
        targetToken: CONTRACTS.MOCK_USDT,
        destinationChain: '2810',
      });
    }
  }, [isRemittanceSuccess, remittanceHash]);

  // ✅ ENHANCED: Direct transfer error handling with contract balance errors
  useEffect(() => {
    if (remittanceError) {
      console.error('❌ DIRECT TRANSFER ERROR - COMPREHENSIVE DEBUG:', {
        error: remittanceError,
        message: remittanceError.message,
        shortMessage: remittanceError.shortMessage,
        name: remittanceError.name,
        cause: remittanceError.cause,
        details: remittanceError.details,
        metaMessages: remittanceError.metaMessages,
        stack: remittanceError.stack,
        timestamp: new Date().toISOString()
      });

      toast.dismiss();
      setStep('form');
      
      let errorMessage = 'Direct transfer failed';
      
      // ✅ ENHANCED: Specific error handling for direct transfer issues
      if (remittanceError.message?.includes('InsufficientContractBalance')) {
        errorMessage = 'Contract has insufficient tokens for direct transfer - please try again later';
      } else if (remittanceError.message?.includes('DirectTransferFailed')) {
        errorMessage = 'Direct transfer execution failed - tokens may be locked temporarily';
      } else if (remittanceError.message?.includes('User rejected') || remittanceError.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (remittanceError.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (remittanceError.message?.includes('gas')) {
        errorMessage = 'Gas estimation failed - check contract requirements';
      } else if (remittanceError.message?.includes('revert')) {
        errorMessage = 'Contract execution reverted - check requirements';
      } else if (remittanceError.shortMessage) {
        errorMessage = remittanceError.shortMessage;
      }
      
      console.log('💬 Final error message shown to user:', errorMessage);
      toast.error(errorMessage);
    }
  }, [remittanceError]);

  // Enhanced approval process
  const handleApprove = async () => {
    console.log('🔓 Starting Approval Process (For Direct Transfer):', {
      token: formData.sourceToken,
      tokenSymbol: getTokenSymbol(formData.sourceToken),
      amount: formData.amount,
      spender: CONTRACTS.REMITX_CORE,
      tokenDecimals,
      userAddress: address
    });

    if (!tokenDecimals) {
      console.error('❌ Token decimals not available');
      toast.error('Unable to get token decimals');
      return;
    }

    try {
      resetApproval();
      setStep('approving');
      toast.loading('Approving token spending for direct transfer...');

      const approvalAmount = parseUnits(formData.amount, tokenDecimals);
      
      console.log('📤 Submitting Approval Transaction:', {
        contractAddress: formData.sourceToken,
        spender: CONTRACTS.REMITX_CORE,
        amount: approvalAmount.toString(),
        amountFormatted: formData.amount,
        tokenSymbol: getTokenSymbol(formData.sourceToken)
      });

      await writeApproval({
        address: formData.sourceToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.REMITX_CORE, approvalAmount],
      });

    } catch (error) {
      console.error('❌ Approval Transaction Failed:', {
        error,
        message: error.message,
        shortMessage: error.shortMessage,
        code: error.code,
        cause: error.cause,
        stack: error.stack
      });
      toast.dismiss();
      toast.error(`Approval failed: ${error.shortMessage || error.message}`);
      setStep('form');
    }
  };

  // ✅ ENHANCED: Better fallback fees for direct transfers with CCIP
  const calculateFallbackFee = () => {
    if (formData.destinationChain === '2810') {
      return parseUnits('0.002', 18); // Same chain direct transfer
    } else {
      // Cross-chain direct transfer fees
      const chainFees = {
        '16015286601757825753': parseUnits('0.012', 18),   // Ethereum Sepolia
        '10344971235874465080': parseUnits('0.007', 18),   // BSC Testnet
        '14767482510784806043': parseUnits('0.010', 18),   // Avalanche Fuji
        '3478487238524512106': parseUnits('0.010', 18),    // Arbitrum Sepolia
        '5224473277236331295': parseUnits('0.010', 18),    // Optimism Sepolia
      };
      
      return chainFees[formData.destinationChain] || parseUnits('0.018', 18); // Higher fallback for direct transfers
    }
  };

  // ✅ COMPLETELY REWRITTEN: Direct transfer handler
  const handleSendDirectTransfer = async () => {
    console.log('🚀 STARTING DIRECT TRANSFER - COMPREHENSIVE DEBUG:', {
      timestamp: new Date().toISOString(),
      userAddress: address,
      formData,
      contractAddress: CONTRACTS.REMITX_CORE,
      tokenDecimals,
      userBalance: userBalance?.toString(),
      currentAllowance: currentAllowance?.toString(),
      isChainSupported,
      ccipFee: ccipFee?.toString(),
      ccipFeeError: ccipFeeError?.message,
      needsApproval,
      ethBalance: ethBalance ? formatUnits(ethBalance, 18) + ' ETH' : 'Unknown',
      contractTokenBalances: {
        USDC: contractUSDCBalance ? formatUnits(contractUSDCBalance, 6) : '0',
        USDT: contractUSDTBalance ? formatUnits(contractUSDTBalance, 6) : '0',
        DAI: contractDAIBalance ? formatUnits(contractDAIBalance, 18) : '0'
      }
    });

    try {
      resetRemittance();
      
      // ✅ CRITICAL: Pre-validation checks for direct transfers
      if (!tokenDecimals) {
        throw new Error('Unable to get token decimals');
      }

      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!CONTRACTS.REMITX_CORE) {
        throw new Error('RemitX Core contract address not configured');
      }

      if (!contractOwner) {
        throw new Error('Contract owner not found - contract may not be deployed');
      }

      if (!formData.recipient || !isAddress(formData.recipient)) {
        throw new Error('Invalid recipient address');
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Invalid amount');
      }

      if (isChainSupported !== true) {
        throw new Error(`Chain ${formData.destinationChain} is not supported`);
      }

      // ✅ CRITICAL: Contract liquidity validation for direct transfers
      const targetTokenBalance = getContractTokenBalance(formData.targetToken);
      const requiredAmount = parseFloat(formData.amount);
      
      if (targetTokenBalance !== null && targetTokenBalance < requiredAmount) {
        throw new Error(`Contract has insufficient ${getTokenSymbol(formData.targetToken)} liquidity for direct transfer. Available: ${targetTokenBalance}, Required: ${requiredAmount}`);
      }

      setStep('sending');
      toast.loading('Executing direct transfer...');

      const parsedAmount = parseUnits(formData.amount, tokenDecimals);
      const chainSelector = BigInt(formData.destinationChain);
      
      // ✅ ENHANCED: Fee handling for direct transfers with buffer
      let feeToUse;
      if (ccipFee && ccipFee > 0n) {
        feeToUse = ccipFee + (ccipFee * 60n / 100n); // 60% buffer for direct transfers
        console.log('💰 Using calculated CCIP fee with 60% buffer for direct transfer:', formatUnits(feeToUse, 18), 'ETH');
      } else {
        feeToUse = calculateFallbackFee();
        console.log('💰 Using enhanced fallback fee for direct transfer on chain', formData.destinationChain + ':', formatUnits(feeToUse, 18), 'ETH');
      }

      // ✅ CRITICAL: Enhanced ETH balance validation for direct transfers
      if (ethBalance) {
        const gasBuffer = parseUnits('0.007', 18); // Higher gas buffer for direct transfers
        const totalRequired = feeToUse + gasBuffer;
        
        if (ethBalance < totalRequired) {
          throw new Error(`Insufficient ETH for direct transfer. Need: ${formatUnits(totalRequired, 18)} ETH (including gas), Have: ${formatUnits(ethBalance, 18)} ETH`);
        }
      }

      // Balance checks
      if (userBalance && userBalance < parsedAmount) {
        throw new Error(`Insufficient token balance. Have: ${formatUnits(userBalance, tokenDecimals)}, Need: ${formData.amount}`);
      }

      // Allowance checks
      if (currentAllowance && currentAllowance < parsedAmount) {
        throw new Error(`Insufficient allowance. Have: ${formatUnits(currentAllowance, tokenDecimals)}, Need: ${formData.amount}`);
      }

      // ✅ CRITICAL: Direct transfer transaction parameters
      const transactionParams = {
        address: CONTRACTS.REMITX_CORE,
        abi: REMITX_CORE_ABI,
        functionName: 'createRemittance', // ✅ Same function, but now executes direct transfer
        args: [
          formData.recipient,
          parsedAmount,
          formData.sourceToken,
          formData.targetToken,
          chainSelector
        ],
        value: feeToUse,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
      };

      console.log('📤 SUBMITTING DIRECT TRANSFER TRANSACTION:', {
        ...transactionParams,
        args: transactionParams.args.map(arg => arg.toString()),
        value: transactionParams.value.toString(),
        transferType: 'DIRECT',
        willDeliverInstantly: true,
        timestamp: new Date().toISOString()
      });

      await writeRemittance(transactionParams);
      
      console.log('✅ DIRECT TRANSFER TRANSACTION SUBMITTED - TOKENS WILL BE DELIVERED INSTANTLY');

    } catch (error) {
      console.error('❌ DIRECT TRANSFER FAILED:', error);
      toast.dismiss();
      setStep('form');
      
      let errorMessage = 'Failed to execute direct transfer';
      
      if (error.message?.includes('insufficient liquidity') || error.message?.includes('Contract has insufficient')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Insufficient ETH')) {
        errorMessage = error.message;
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  // ✅ ENHANCED: Form submission handler for direct transfers
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.recipient || !formData.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isAddress(formData.recipient)) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      if (amount <= 0) {
        toast.error('Amount must be greater than 0');
        return;
      }
    } catch (error) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (isChainSupported !== true) {
      toast.error('Destination chain is not supported');
      return;
    }

    if (!contractOwner) {
      toast.error('Contract not accessible - check network connection');
      return;
    }

    // ✅ CRITICAL: Contract liquidity validation for direct transfers
    if (hasInsufficientContractBalance()) {
      const targetTokenBalance = getContractTokenBalance(formData.targetToken);
      toast.error(`Contract has insufficient ${getTokenSymbol(formData.targetToken)} liquidity for direct transfer. Available: ${targetTokenBalance}, Required: ${formData.amount}`);
      return;
    }

    // User balance validation
    if (userBalance && tokenDecimals) {
      try {
        const requiredAmount = parseUnits(formData.amount, tokenDecimals);
        if (userBalance < requiredAmount) {
          toast.error(`Insufficient token balance. You have ${formatUnits(userBalance, tokenDecimals)} ${getTokenSymbol(formData.sourceToken)}`);
          return;
        }
      } catch (error) {
        console.error('❌ Balance check error:', error);
      }
    }

    console.log('✅ ALL VALIDATIONS PASSED - PROCEEDING WITH DIRECT TRANSFER');

    if (needsApproval) {
      await handleApprove();
    } else {
      await handleSendDirectTransfer();
    }
  };

  const getTokenSymbol = (address) => {
    return tokens.find(t => t.address === address)?.symbol || 'Unknown';
  };

  const getTokenDetails = (address) => {
    return tokens.find(t => t.address === address) || { symbol: 'Unknown', icon: '❓', color: 'bg-gray-500' };
  };

  const getChainDetails = (selector) => {
    return chains.find(c => c.selector === selector) || { name: 'Unknown', icon: '❓', color: 'bg-gray-500' };
  };

  const isProcessing = isApproving || isApprovalConfirming || isSending || isRemittanceConfirming;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ✅ UPDATED: Header for Direct Transfers */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Send Instant Remittance</h1>
        <p className="text-gray-600">Send money instantly with direct token delivery - no claiming required!</p>
        <div className="mt-2 inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
          <Zap className="w-4 h-4 mr-1" />
          Direct Transfer Mode
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Recipient Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recipient</h3>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Wallet Address (Direct Delivery)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    placeholder="0x1234...abcd"
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isProcessing}
                  />
                  <Wallet className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-green-600">✅ Tokens will be delivered instantly to this address</p>
              </div>
            </div>

            {/* Amount Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Amount</h3>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Send Amount (Instant Transfer)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent transition-colors text-lg font-medium"
                    disabled={isProcessing}
                  />
                  <div className="absolute right-3 top-3 text-sm font-medium text-gray-500">
                    {getTokenSymbol(formData.sourceToken)}
                  </div>
                </div>
                {userBalance && tokenDecimals && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Available Balance:</span>
                    <span className="font-medium text-gray-900">
                      {formatUnits(userBalance, tokenDecimals)} {getTokenSymbol(formData.sourceToken)}
                    </span>
                  </div>
                )}
                {/* ✅ NEW: Contract liquidity warning */}
                {hasInsufficientContractBalance() && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-red-800 text-xs">⚠️ Contract has insufficient {getTokenSymbol(formData.targetToken)} liquidity for this amount</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tokens & Chain Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <ArrowUpDown className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Conversion & Destination</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Token */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">From</label>
                  <div className="relative">
                    <select
                      value={formData.sourceToken}
                      onChange={(e) => setFormData({ ...formData, sourceToken: e.target.value })}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      disabled={isProcessing}
                    >
                      {tokens.map(token => (
                        <option key={token.address} value={token.address}>
                          {token.icon} {token.symbol}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Target Token */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">To (Direct Delivery)</label>
                  <div className="relative">
                    <select
                      value={formData.targetToken}
                      onChange={(e) => setFormData({ ...formData, targetToken: e.target.value })}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      disabled={isProcessing}
                    >
                      {tokens.map(token => (
                        <option key={token.address} value={token.address}>
                          {token.icon} {token.symbol}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Destination Chain */}
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Destination Blockchain
                </label>
                <div className="relative">
                  <select
                    value={formData.destinationChain}
                    onChange={(e) => setFormData({ ...formData, destinationChain: e.target.value })}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    disabled={isProcessing}
                  >
                    {chains.map(chain => (
                      <option key={chain.selector} value={chain.selector}>
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {/* Chain support indicator */}
                <div className="flex items-center text-sm">
                  {isChainSupported === true && (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Chain supported for direct transfers
                    </span>
                  )}
                  {isChainSupported === false && (
                    <span className="text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" />
                      Chain not supported
                    </span>
                  )}
                  {isChainSupported === undefined && (
                    <span className="text-gray-500">Checking direct transfer support...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Status */}
          <div className="space-y-6">
            {/* ✅ UPDATED: Direct Transfer Summary */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center mb-4">
                <Zap className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Direct Transfer Summary</h3>
              </div>

              {formData.amount ? (
                <div className="space-y-4">
                  {/* Amount Display */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Instant Transfer</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formData.amount} {getTokenSymbol(formData.sourceToken)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <Zap className="w-4 h-4 mr-1" />
                      <span>Delivered instantly as {getTokenSymbol(formData.targetToken)}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">From Token:</span>
                      <div className="flex items-center">
                        <span className="mr-2">{getTokenDetails(formData.sourceToken).icon}</span>
                        <span className="font-medium">{getTokenSymbol(formData.sourceToken)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">To Token (Direct):</span>
                      <div className="flex items-center">
                        <span className="mr-2">{getTokenDetails(formData.targetToken).icon}</span>
                        <span className="font-medium">{getTokenSymbol(formData.targetToken)}</span>
                        <Zap className="w-4 h-4 ml-1 text-green-500" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Destination:</span>
                      <div className="flex items-center">
                        <span className="mr-2">{getChainDetails(formData.destinationChain).icon}</span>
                        <span className="font-medium">{getChainDetails(formData.destinationChain).name}</span>
                        {isChainSupported === false && (
                          <span className="ml-2 text-red-500">❌</span>
                        )}
                        {isChainSupported === true && (
                          <span className="ml-2 text-green-500">✅</span>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Transfer Fee:</span>
                        <div className="text-right">
                          <span className={`font-medium ${ccipFee && ccipFee > 0n ? 'text-blue-600' : 'text-orange-600'}`}>
                            {ccipFee && ccipFee > 0n ? `${formatUnits(ccipFee + (ccipFee * 60n / 100n), 18).slice(0, 8)} ETH (with buffer)` : `${formatUnits(calculateFallbackFee(), 18).slice(0, 8)} ETH (fallback)`}
                          </span>
                          {isCcipFeeLoading && (
                            <div className="text-xs text-gray-500">Calculating...</div>
                          )}
                          {ccipFeeError && (
                            <div className="text-xs text-red-500">Using fallback fee</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ✅ NEW: Direct Transfer Benefits */}
                    <div className="bg-green-50 rounded-lg p-3 mt-4">
                      <div className="flex items-center mb-2">
                        <Zap className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">Direct Transfer Benefits</span>
                      </div>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>✅ Instant token delivery</li>
                        <li>✅ No claiming required</li>
                        <li>✅ Automatic conversion</li>
                        <li>✅ Cross-chain compatible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Enter an amount to see direct transfer details</p>
                </div>
              )}
            </div>

            {/* Approval Status */}
            {needsApproval && formData.amount && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Approval Required for Direct Transfer</h4>
                    <p className="text-sm text-yellow-700">
                      You need to approve {getTokenSymbol(formData.sourceToken)} spending before executing the direct transfer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ ENHANCED: Contract Liquidity Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Contract Liquidity</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Available for Direct Transfers</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${contractUSDCBalance && contractUSDCBalance > 0n ? 'text-green-600' : 'text-red-600'}`}>
                      {contractUSDCBalance ? Math.round(Number(formatUnits(contractUSDCBalance, 6))) : '0'}
                    </div>
                    <div className="text-sm text-gray-500">USDC</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${contractUSDTBalance && contractUSDTBalance > 0n ? 'text-green-600' : 'text-red-600'}`}>
                      {contractUSDTBalance ? Math.round(Number(formatUnits(contractUSDTBalance, 6))) : '0'}
                    </div>
                    <div className="text-sm text-gray-500">USDT</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${contractDAIBalance && contractDAIBalance > 0n ? 'text-green-600' : 'text-red-600'}`}>
                      {contractDAIBalance ? Math.round(Number(formatUnits(contractDAIBalance, 18))) : '0'}
                    </div>
                    <div className="text-sm text-gray-500">DAI</div>
                  </div>
                </div>
                {/* ✅ NEW: Direct transfer liquidity status */}
                {hasInsufficientContractBalance() && (
                  <div className="mt-4 text-center">
                    <p className="text-red-600 text-sm">
                      ⚠️ Insufficient contract liquidity for direct transfer of {getTokenSymbol(formData.targetToken)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2
            ${isProcessing ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                Send Remittance
                <Send className="w-5 h-5 ml-3" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Transaction Hashes */}
      {(approvalHash || remittanceHash) && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Transaction Details</h3>
          <div className="space-y-3">
            {approvalHash && (
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Approval Transaction:</span>
                  <a
                    href={`https://explorer-holesky.morphl2.io/tx/${approvalHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                  >
                    {approvalHash.slice(0, 10)}...{approvalHash.slice(-8)}
                  </a>
                </div>
              </div>
            )}
            {remittanceHash && (
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Remittance Transaction:</span>
                  <a
                    href={`https://explorer-holesky.morphl2.io/tx/${remittanceHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                  >
                    {remittanceHash.slice(0, 10)}...{remittanceHash.slice(-8)}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SendRemittance;
