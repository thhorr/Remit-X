import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { Clock, CheckCircle, ExternalLink, Trash2, AlertTriangle, Zap, Globe, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config/contracts';
import { REMITX_CORE_ABI } from '../config/abis';

const RemittanceHistory = () => {
  const { address, isConnected } = useAccount();
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);
  // ✅ UPDATED: Changed 'claimed' to 'completed' for direct transfers
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed', 'failed', 'deleted'
  const [deletingId, setDeletingId] = useState(null);

  // Delete remittance hook
  const { writeContract: deleteRemittance, data: deleteHash, isPending: isDeleting } = useWriteContract();
  
  const { isLoading: isDeleteConfirming, isSuccess: isDeleteSuccess } = useWaitForTransactionReceipt({
    hash: deleteHash,
  });

  // ✅ ENHANCED: Get both sent and received remittances
  const { 
    data: userSentRemittanceIds, 
    refetch: refetchSentRemittances, 
    error: getSentRemittancesError,
    isLoading: isLoadingSentIds,
    isError: isGetSentRemittancesError
  } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getUserRemittances',
    args: [address],
    enabled: isConnected && !!address && CONTRACTS.REMITX_CORE,
    watch: true,
    retry: 3,
    retryDelay: 1000,
  });

  // ✅ NEW: Get remittances received by user (direct transfers)
  const {
    data: userReceivedRemittanceIds,
    refetch: refetchReceivedRemittances,
    error: getReceivedRemittancesError,
    isLoading: isLoadingReceivedIds,
    isError: isGetReceivedRemittancesError
  } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getUserReceivedRemittances',
    args: [address],
    enabled: isConnected && !!address && CONTRACTS.REMITX_CORE,
    watch: true,
    retry: 3,
    retryDelay: 1000,
  });

  // Individual remittance data hooks - for sent
  const { data: sentRemittance1Data, isLoading: isLoadingSent1, refetch: refetchSentRemittance1 } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getRemittance',
    args: [userSentRemittanceIds?.[0]],
    enabled: userSentRemittanceIds?.length > 0,
    watch: true,
  });

  const { data: sentRemittance2Data, isLoading: isLoadingSent2, refetch: refetchSentRemittance2 } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getRemittance',
    args: [userSentRemittanceIds?.[1]],
    enabled: userSentRemittanceIds?.length > 1,
    watch: true,
  });

  const { data: sentRemittance3Data, isLoading: isLoadingSent3, refetch: refetchSentRemittance3 } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getRemittance',
    args: [userSentRemittanceIds?.[2]],
    enabled: userSentRemittanceIds?.length > 2,
    watch: true,
  });

  // ✅ NEW: Individual remittance data hooks - for received
  const { data: recvRemittance1Data, isLoading: isLoadingRecv1, refetch: refetchRecvRemittance1 } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getRemittance',
    args: [userReceivedRemittanceIds?.[0]],
    enabled: userReceivedRemittanceIds?.length > 0,
    watch: true,
  });

  const { data: recvRemittance2Data, isLoading: isLoadingRecv2, refetch: refetchRecvRemittance2 } = useReadContract({
    address: CONTRACTS.REMITX_CORE,
    abi: REMITX_CORE_ABI,
    functionName: 'getRemittance',
    args: [userReceivedRemittanceIds?.[1]],
    enabled: userReceivedRemittanceIds?.length > 1,
    watch: true,
  });

  // Token configuration
  const tokens = {
    [CONTRACTS.MOCK_USDC]: { symbol: 'USDC', decimals: 6, icon: '💵' },
    [CONTRACTS.MOCK_USDT]: { symbol: 'USDT', decimals: 6, icon: '💴' },
    [CONTRACTS.MOCK_DAI]: { symbol: 'DAI', decimals: 18, icon: '💶' },
  };

  // Chain configuration
  const chains = {
    '2810': { name: 'Morph Holesky', icon: '🟣' },
    '16015286601757825753': { name: 'Ethereum Sepolia', icon: '⟠' },
    '10344971235874465080': { name: 'BSC Testnet', icon: '🟡' },
    '16281711391670634445': { name: 'Polygon Amoy', icon: '🟣' },
    '14767482510784806043': { name: 'Avalanche Fuji', icon: '🔺' },
    '3478487238524512106': { name: 'Arbitrum Sepolia', icon: '🔷' },
    '5224473277236331295': { name: 'Optimism Sepolia', icon: '🔴' },
  };

  // ✅ UPDATED: Delete success handler with enhanced status updates
  useEffect(() => {
    if (isDeleteSuccess && deleteHash && deletingId) {
      console.log('✅ Delete transaction confirmed:', deleteHash);
      console.log('🗑️ Deleted failed direct transfer ID:', deletingId);
      
      toast.dismiss();
      toast.success('Failed transfer deleted and tokens refunded!');
      
      // Update state to mark as deleted
      setRemittances(prevRemittances => {
        const updated = prevRemittances.map(r => {
          if (r.id === deletingId) {
            console.log(`🔄 Marking transfer ${r.id} as deleted`);
            return {
              ...r,
              isDeleted: true,
              deleted: true,
            };
          }
          return r;
        });
        console.log('✅ Updated transfer state to deleted');
        return updated;
      });
      
      // Force refetch after a delay
      setTimeout(async () => {
        try {
          console.log('🔄 Refetching blockchain data after delete...');
          await Promise.all([
            refetchSentRemittances(),
            refetchReceivedRemittances()
          ]);
          
          // Refetch individual data
          setTimeout(async () => {
            try {
              // Refetch sent remittances
              if (userSentRemittanceIds?.length > 0) await refetchSentRemittance1?.();
              if (userSentRemittanceIds?.length > 1) await refetchSentRemittance2?.(); 
              if (userSentRemittanceIds?.length > 2) await refetchSentRemittance3?.();
              
              // Refetch received remittances
              if (userReceivedRemittanceIds?.length > 0) await refetchRecvRemittance1?.();
              if (userReceivedRemittanceIds?.length > 1) await refetchRecvRemittance2?.();
            } catch (error) {
              console.error('❌ Individual refetch error:', error);
            }
          }, 500);
          
        } catch (error) {
          console.error('❌ Refetch error:', error);
        }
      }, 2000);
      
      setDeletingId(null);
    }
  }, [isDeleteSuccess, deleteHash, deletingId, 
      refetchSentRemittances, refetchReceivedRemittances,
      refetchSentRemittance1, refetchSentRemittance2, refetchSentRemittance3, 
      refetchRecvRemittance1, refetchRecvRemittance2,
      userSentRemittanceIds, userReceivedRemittanceIds]);

  // Delete confirmation loading
  useEffect(() => {
    if (isDeleteConfirming && deleteHash) {
      console.log('⏳ Delete transaction confirming...');
      toast.dismiss();
      toast.loading('Confirming deletion and processing refund...');
    }
  }, [isDeleteConfirming, deleteHash]);

  // Force re-render after delete confirmation
  useEffect(() => {
    if (isDeleteSuccess && !isDeleteConfirming && deleteHash) {
      console.log('🔄 Delete confirmed, forcing data refresh...');
      
      setTimeout(() => {
        setLoading(true);
        
        // Trigger a complete re-fetch cycle for both sent and received
        Promise.all([
          refetchSentRemittances(),
          refetchReceivedRemittances()
        ]).then(() => {
          console.log('✅ Forced refresh complete');
        }).catch((error) => {
          console.error('❌ Forced refresh error:', error);
          setLoading(false);
        });
      }, 1000);
    }
  }, [isDeleteSuccess, isDeleteConfirming, deleteHash, refetchSentRemittances, refetchReceivedRemittances]);

  // ✅ ENHANCED: Process both sent and received remittance data
  useEffect(() => {
    console.log('🔍 Processing remittance data (Direct Transfer Mode)...');
    console.log('- isConnected:', isConnected);
    console.log('- address:', address);
    console.log('- Sent IDs loading:', isLoadingSentIds);
    console.log('- Received IDs loading:', isLoadingReceivedIds);
    console.log('- Sent remittance IDs:', userSentRemittanceIds);
    console.log('- Received remittance IDs:', userReceivedRemittanceIds);
    
    // Show loading while fetching IDs
    if (isLoadingSentIds || isLoadingReceivedIds) {
      setLoading(true);
      return;
    }
    
    // Handle error state
    if (isGetSentRemittancesError && isGetReceivedRemittancesError) {
      setRemittances([]);
      setLoading(false);
      return;
    }
    
    // Handle no IDs found
    const noSentIds = !userSentRemittanceIds || userSentRemittanceIds.length === 0;
    const noReceivedIds = !userReceivedRemittanceIds || userReceivedRemittanceIds.length === 0;
    
    if (noSentIds && noReceivedIds) {
      console.log('❌ No direct transfer IDs found');
      setRemittances([]);
      setLoading(false);
      return;
    }

    // Wait for individual remittance data to load
    const isStillLoadingSent = 
      (userSentRemittanceIds?.length > 0 && isLoadingSent1) || 
      (userSentRemittanceIds?.length > 1 && isLoadingSent2) ||
      (userSentRemittanceIds?.length > 2 && isLoadingSent3);
      
    const isStillLoadingReceived = 
      (userReceivedRemittanceIds?.length > 0 && isLoadingRecv1) || 
      (userReceivedRemittanceIds?.length > 1 && isLoadingRecv2);
      
    if (isStillLoadingSent || isStillLoadingReceived) {
      console.log('⏳ Still loading individual remittance data...');
      setLoading(true);
      return;
    }

    const processedRemittances = [];

    // ✅ ENHANCED: Process sent remittance data
    const sentRemittanceDataArray = [
      { data: sentRemittance1Data, id: userSentRemittanceIds?.[0] },
      { data: sentRemittance2Data, id: userSentRemittanceIds?.[1] },
      { data: sentRemittance3Data, id: userSentRemittanceIds?.[2] },
    ];

    // ✅ ENHANCED: Process received remittance data
    const receivedRemittanceDataArray = [
      { data: recvRemittance1Data, id: userReceivedRemittanceIds?.[0] },
      { data: recvRemittance2Data, id: userReceivedRemittanceIds?.[1] },
    ];

    // ✅ DEBUG: Add debug logging to see contract response
    [...sentRemittanceDataArray, ...receivedRemittanceDataArray].forEach(({ data, id }) => {
      if (data && id) {
        console.log(`🔍 RAW CONTRACT DATA for ${id}:`, {
          hasDeleted: 'deleted' in data,
          deletedValue: data.deleted,
          // ✅ CHANGED: From claimed to completed for direct transfers
          hasCompleted: 'completed' in data,
          completedValue: data.completed,
          isCrossChain: data.isCrossChain,
          ccipMessageId: data.ccipMessageId,
          allKeys: Object.keys(data)
        });
      }
    });

    // ✅ ENHANCED: Process sent remittances
    sentRemittanceDataArray.forEach(({ data, id }) => {
      if (data && id && typeof data === 'object' && data.sender && data.recipient) {
        console.log(`✅ Processing sent direct transfer ${id}:`, data);
        
        // ✅ UPDATED: Use correct field names from contract
        const isDeleted = Boolean(data.deleted);
        const isCompleted = Boolean(data.completed); // ✅ CHANGED from claimed to completed
        const isCrossChain = Boolean(data.isCrossChain);
        
        console.log(`🔍 Direct Transfer ${id} states:`, {
          isDeleted,
          isCompleted,
          isCrossChain,
          rawDeleted: data.deleted,
          rawCompleted: data.completed,
          ccipMessageId: data.ccipMessageId?.toString()
        });
        
        const mappedRemittance = {
          id: id,
          sender: data.sender,
          recipient: data.recipient,
          amount: data.amount,
          sourceToken: data.sourceToken,
          targetToken: data.targetToken,
          destinationChain: data.destinationChain?.toString(),
          timestamp: Number(data.timestamp),
          // ✅ CHANGED: Use completed instead of claimed for direct transfers
          isCompleted: isCompleted,
          isDeleted: isDeleted,
          isCrossChain: isCrossChain,
          ccipFee: data.ccipFee,
          ccipMessageId: data.ccipMessageId,
          exchangeRate: data.exchangeRate,
          sourceChain: '2810',
          // Direction of transfer
          direction: 'sent',
          // Keep these for compatibility
          deleted: isDeleted,
          completed: isCompleted, // ✅ CHANGED from claimed to completed
          claimed: isCompleted,   // For backward compatibility
        };

        console.log(`✅ Mapped sent direct transfer ${id}:`, mappedRemittance);
        processedRemittances.push(mappedRemittance);
      } else if (id) {
        console.log(`⚠️ Missing or invalid data for sent transfer ${id}:`, data);
      }
    });
    
    // ✅ NEW: Process received remittances
    receivedRemittanceDataArray.forEach(({ data, id }) => {
      if (data && id && typeof data === 'object' && data.sender && data.recipient) {
        console.log(`✅ Processing received direct transfer ${id}:`, data);
        
        const isDeleted = Boolean(data.deleted);
        const isCompleted = Boolean(data.completed);
        const isCrossChain = Boolean(data.isCrossChain);
        
        const mappedRemittance = {
          id: id,
          sender: data.sender,
          recipient: data.recipient,
          amount: data.amount,
          sourceToken: data.sourceToken,
          targetToken: data.targetToken,
          destinationChain: data.destinationChain?.toString(),
          timestamp: Number(data.timestamp),
          isCompleted: isCompleted,
          isDeleted: isDeleted,
          isCrossChain: isCrossChain,
          ccipFee: data.ccipFee,
          ccipMessageId: data.ccipMessageId,
          exchangeRate: data.exchangeRate,
          sourceChain: '2810',
          // Direction of transfer
          direction: 'received',
          // Keep these for compatibility
          deleted: isDeleted,
          completed: isCompleted,
          claimed: isCompleted,
        };

        console.log(`✅ Mapped received direct transfer ${id}:`, mappedRemittance);
        processedRemittances.push(mappedRemittance);
      } else if (id) {
        console.log(`⚠️ Missing or invalid data for received transfer ${id}:`, data);
      }
    });

    // Sort by timestamp (newest first)
    processedRemittances.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('✅ Final processed direct transfers:', processedRemittances);
    
    // Update state
    setRemittances(processedRemittances);
    setLoading(false);
    
  }, [isConnected, address, 
      isLoadingSentIds, isLoadingReceivedIds, 
      isGetSentRemittancesError, isGetReceivedRemittancesError, 
      userSentRemittanceIds, userReceivedRemittanceIds, 
      sentRemittance1Data, sentRemittance2Data, sentRemittance3Data,
      recvRemittance1Data, recvRemittance2Data,
      isLoadingSent1, isLoadingSent2, isLoadingSent3,
      isLoadingRecv1, isLoadingRecv2]);

  // ✅ ENHANCED: Delete handler for failed direct transfers
  const handleDeleteRemittance = async (remittanceId) => {
    console.log('🔄 Starting delete for failed transfer:', remittanceId);
    
    const remittance = remittances.find(r => r.id === remittanceId);
    
    if (!remittance) {
      toast.error('Transfer not found');
      return;
    }

    console.log('📋 Transfer data:', remittance);

    // ✅ CHANGED: Check completed instead of claimed
    if (remittance.isCompleted || remittance.completed) {
      toast.error('Cannot delete completed transfer');
      return;
    }

    if (remittance.isDeleted || remittance.deleted) {
      toast.error('Transfer already deleted');
      return;
    }

    // Check ownership
    if (remittance.sender.toLowerCase() !== address.toLowerCase()) {
      toast.error('You can only delete your own failed transfers');
      return;
    }

    const tokenInfo = tokens[remittance.sourceToken] || { symbol: 'Unknown', decimals: 18 };
    const formattedAmount = formatUnits(remittance.amount, tokenInfo.decimals);

    // ✅ UPDATED: Show enhanced confirmation dialog for direct transfer deletion
    const confirmed = window.confirm(
      `Delete this failed direct transfer?\n\n` +
      `Amount: ${formattedAmount} ${tokenInfo.symbol}\n` +
      `Recipient: ${remittance.recipient}\n\n` +
      `This will refund your tokens and any CCIP fees.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(remittanceId);
      toast.loading('Preparing delete transaction...');

      console.log('🔄 Calling deleteRemittance with:', {
        address: CONTRACTS.REMITX_CORE,
        functionName: 'deleteRemittance',
        args: [remittanceId],
      });

      // Add gas estimation and better configuration
      const result = await deleteRemittance({
        address: CONTRACTS.REMITX_CORE,
        abi: REMITX_CORE_ABI,
        functionName: 'deleteRemittance',
        args: [remittanceId],
        gas: 500000n, // 500k gas limit
        gasPrice: undefined, // Let wallet estimate
        value: 0n, // Explicitly set value to 0
      });

      console.log('✅ Delete transaction sent, result:', result);
      toast.dismiss();
      toast.loading('Delete transaction submitted...');

    } catch (error) {
      toast.dismiss();
      setDeletingId(null);
      
      console.error('❌ Delete error:', error);
      console.error('Error details:', {
        message: error.message,
        shortMessage: error.shortMessage,
        code: error.code,
        data: error.data,
        cause: error.cause,
      });

      // ✅ UPDATED: Error messages for direct transfer deletions
      let errorMessage = 'Failed to delete transfer';
      
      if (error.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.message?.includes('execution reverted')) {
        if (error.message?.includes('AlreadyCompleted') || error.message?.includes('Already completed')) {
          errorMessage = 'Transfer already completed - cannot delete';
        } else if (error.message?.includes('Already deleted')) {
          errorMessage = 'Transfer already deleted';
        } else if (error.message?.includes('Not authorized') || error.message?.includes('Unauthorized')) {
          errorMessage = 'You are not authorized to delete this transfer';
        } else if (error.message?.includes('Remittance not found') || error.message?.includes('Transfer not found')) {
          errorMessage = 'Transfer not found';
        } else {
          errorMessage = `Transaction failed: ${error.shortMessage || 'Unknown error'}`;
        }
      } else if (error.message?.includes('already deleted')) {
        errorMessage = 'Transfer already deleted';
      } else if (error.message?.includes('already completed')) {
        errorMessage = 'Cannot delete completed transfer';
      }
      
      toast.error(errorMessage);
    }
  };

  // ✅ UPDATED: Filter remittances for direct transfers
  const filteredRemittances = remittances.filter(remittance => {
    // ✅ CHANGED: Pending = !completed && !deleted (failed transfers)
    const isPending = !remittance.isCompleted && !remittance.completed && !remittance.isDeleted && !remittance.deleted;
    const isCompleted = remittance.isCompleted || remittance.completed;
    const isDeleted = remittance.isDeleted || remittance.deleted;
    
    // ✅ NEW: Filter for received transfers
    const isReceived = remittance.direction === 'received';
    // ✅ NEW: Filter for sent transfers
    const isSent = remittance.direction === 'sent';
    // ✅ NEW: Filter for failed transfers that can be deleted (not completed, not deleted)
    const isFailed = !remittance.isCompleted && !remittance.completed && !remittance.isDeleted && !remittance.deleted;
    
    switch (filter) {
      case 'pending':
        return isPending;
      case 'completed': // ✅ CHANGED: from claimed to completed
        return isCompleted;
      case 'deleted':
        return isDeleted;
      case 'sent': // ✅ NEW: Filter for sent transfers
        return isSent;
      case 'received': // ✅ NEW: Filter for received transfers
        return isReceived;
      case 'failed': // ✅ NEW: Filter for failed transfers
        return isFailed;
      default:
        return true;
    }
  });

  // ✅ UPDATED: Helper functions for direct transfers
  const getStatusInfo = (remittance) => {
    if (remittance.isDeleted || remittance.deleted) {
      return {
        label: 'Deleted',
        icon: <Trash2 className="w-4 h-4" />,
        className: 'bg-gray-100 text-gray-700 border-gray-300'
      };
    }
    
    // ✅ CHANGED: Check for completed instead of claimed
    if (remittance.isCompleted || remittance.completed) {
      // ✅ ENHANCED: Show different status for cross-chain vs same-chain
      if (remittance.isCrossChain) {
        return {
          label: 'Delivered (Cross-Chain)',
          icon: <Globe className="w-4 h-4" />,
          className: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      } else {
        return {
          label: 'Delivered',
          icon: <Zap className="w-4 h-4" />,
          className: 'bg-green-100 text-green-700 border-green-300'
        };
      }
    }
    
    // Pending means failed direct transfer
    return {
      label: 'Failed',
      icon: <AlertTriangle className="w-4 h-4" />,
      className: 'bg-red-100 text-red-700 border-red-300'
    };
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTokenInfo = (address) => {
    return tokens[address] || { symbol: 'Unknown', decimals: 18, icon: '❓' };
  };

  const getChainInfo = (chainId) => {
    return chains[chainId] || { name: 'Unknown Chain', icon: '❓' };
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-500">Please connect your wallet to view your transfer history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ✅ UPDATED: Header for direct transfers */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Transfer History</h1>
          <div className="ml-3 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center">
            <Zap className="w-4 h-4 mr-1" />
            Direct Transfer Mode
          </div>
        </div>
        <p className="text-gray-600">Track your direct token transfers and their status</p>
      </div>

      {/* ✅ UPDATED: Filter tabs for direct transfers */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
          {[
              {
                id: 'all',
                label: 'All Transfers',
                count: remittances.length
              },
              {
                id: 'sent',
                label: 'Sent',
                count: remittances.filter(r => r.direction === 'sent').length
              },
              {
                id: 'received',
                label: 'Received',
                count: remittances.filter(r => r.direction === 'received').length
              },
              {
                id: 'completed',
                label: 'Delivered', // ✅ CHANGED: from 'Claimed' to 'Delivered'
                count: remittances.filter(r => r.isCompleted || r.completed).length
              },
              {
                id: 'failed',
                label: 'Failed',
                count: remittances.filter(r => 
                  !(r.isCompleted || r.completed) && 
                  !(r.isDeleted || r.deleted)
                ).length
              },
              {
                id: 'deleted',
                label: 'Deleted',
                count: remittances.filter(r => r.isDeleted || r.deleted).length
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  filter === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your transfer history...</p>
        </div>
      ) : filteredRemittances.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No Transfers Found' : `No ${filter} transfers`}
          </h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'You haven\'t created any transfers yet'
              : filter === 'received'
                ? 'You haven\'t received any direct transfers yet'
                : filter === 'sent'
                  ? 'You haven\'t sent any transfers yet'
                  : filter === 'failed'
                    ? 'You don\'t have any failed transfers'
                    : `You don't have any ${filter} transfers`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRemittances.map((remittance) => {
            const status = getStatusInfo(remittance);
            const sourceToken = getTokenInfo(remittance.sourceToken);
            const targetToken = getTokenInfo(remittance.targetToken);
            const sourceChain = getChainInfo(remittance.sourceChain);
            const destChain = getChainInfo(remittance.destinationChain);
            
            // ✅ NEW: Determine if this is a direct transfer
            const isDirectTransfer = remittance.isCompleted || remittance.completed;
            const isCrossChainTransfer = remittance.isCrossChain;

            return (
              <div key={remittance.id} className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow 
                ${remittance.direction === 'sent' ? 'border-blue-200' : 'border-green-200'}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    {/* ✅ ENHANCED: Status Badge with Direction */}
                    <div className="flex items-center space-x-2">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${status.className}`}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </div>
                      
                      {/* Direction Badge */}
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
                        ${remittance.direction === 'sent' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {remittance.direction === 'sent' ? 'Outgoing' : 'Incoming'}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                      {/* ✅ UPDATED: Delete Button - Only show for failed transfers created by user */}
                      {!(remittance.isCompleted || remittance.completed) && 
                       !(remittance.isDeleted || remittance.deleted) && 
                       remittance.sender && remittance.sender.toLowerCase() === address.toLowerCase() && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteRemittance(remittance.id);
                          }}
                          disabled={isDeleting || deletingId === remittance.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Delete failed transfer and get refund"
                        >
                          {deletingId === remittance.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span className="ml-1">
                            {deletingId === remittance.id ? 'Deleting...' : 'Delete & Refund'}
                          </span>
                        </button>
                      )}

                      {/* View in Explorer */}
                      <a
                        href={`https://explorer-holesky.morphl2.io/tx/${remittance.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="ml-1">Explorer</span>
                      </a>
                    </div>
                  </div>

                  {/* Transaction details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Amount */}
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {sourceToken.icon} {formatUnits(remittance.amount, sourceToken.decimals)} {sourceToken.symbol}
                      </p>
                      {/* ✅ NEW: Direct Transfer Indicator */}
                      {isDirectTransfer && (
                        <p className="text-xs flex items-center text-green-600 mt-1">
                          <Zap className="w-3 h-3 mr-1" />
                          Direct Transfer
                        </p>
                      )}
                    </div>

                    {/* ✅ UPDATED: Show sender for received, recipient for sent */}
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {remittance.direction === 'received' ? 'From' : 'To'}
                      </p>
                      <p className="text-sm font-mono text-gray-900">
                        {remittance.direction === 'received' 
                          ? truncateAddress(remittance.sender)
                          : truncateAddress(remittance.recipient)
                        }
                      </p>
                      {remittance.direction === 'sent' && isDirectTransfer && (
                        <p className="text-xs text-green-600 mt-1">Delivered instantly</p>
                      )}
                    </div>

                    {/* Source Chain */}
                    <div>
                      <p className="text-sm font-medium text-gray-500">From</p>
                      <p className="text-sm text-gray-900">
                        {sourceChain.icon} {sourceChain.name}
                      </p>
                    </div>

                    {/* Destination Chain */}
                    <div>
                      <p className="text-sm font-medium text-gray-500">To</p>
                      <p className="text-sm text-gray-900">
                        {destChain.icon} {destChain.name}
                      </p>
                    </div>
                  </div>

                  {/* Token conversion */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">Converting:</span>
                        <span className="ml-2 font-medium">
                          {sourceToken.icon} {sourceToken.symbol}
                        </span>
                      </div>
                      <ArrowUpDown className="text-gray-400 w-4 h-4" />
                      <div className="flex items-center">
                        <span className="font-medium">
                          {targetToken.icon} {targetToken.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created: {formatDate(remittance.timestamp)}</span>
                    <span className="font-mono">ID: {truncateAddress(remittance.id)}</span>
                  </div>

                  {/* ✅ UPDATED: CCIP Message ID for cross-chain transfers */}
                  {isCrossChainTransfer && remittance.ccipMessageId && remittance.ccipMessageId !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                    <div className="mt-2 text-xs text-blue-600">
                      <span className="font-semibold">CCIP Message ID:</span> {truncateAddress(remittance.ccipMessageId)}
                    </div>
                  )}

                  {/* ✅ UPDATED: Delete warning for failed direct transfers */}
                  {!(remittance.isCompleted || remittance.completed) && 
                   !(remittance.isDeleted || remittance.deleted) && 
                   remittance.sender && remittance.sender.toLowerCase() === address.toLowerCase() && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <div className="flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span>This direct transfer failed. Delete it to get your tokens refunded.</span>
                      </div>
                    </div>
                  )}

                  {/* ✅ UPDATED: Deleted status info */}
                  {(remittance.isDeleted || remittance.deleted) && (
                    <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                      <span>This failed transfer was deleted and tokens were refunded</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete transaction status */}
      {deleteHash && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Delete Transaction</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Transaction Hash:</span>
            <a
              href={`https://explorer-holesky.morphl2.io/tx/${deleteHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-mono"
            >
              {deleteHash.slice(0, 10)}...{deleteHash.slice(-8)}
            </a>
          </div>
          {isDeleteConfirming && (
            <div className="mt-2 text-sm text-blue-600">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Confirming deletion and processing refund...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RemittanceHistory;
