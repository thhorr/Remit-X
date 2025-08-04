import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { Clock, ExternalLink, Trash2, AlertTriangle, Zap, Globe, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../config/contracts';
import { REMITX_CORE_ABI } from '../config/abis';

const RemittanceHistory = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  // Delete remittance hook
  const { writeContract: deleteRemittance, data: deleteHash, isPending: isDeleting } = useWriteContract();
  const { isLoading: isDeleteConfirming, isSuccess: isDeleteSuccess } = useWaitForTransactionReceipt({
    hash: deleteHash,
  });

  // Fetch user sent and received remittance IDs
  const {
    data: userSentRemittanceIds,
    refetch: refetchSentRemittances,
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

  const {
    data: userReceivedRemittanceIds,
    refetch: refetchReceivedRemittances,
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

  // Dynamically fetch all remittance data for sent and received
  useEffect(() => {
    const fetchAllRemittances = async () => {
      setLoading(true);

      try {
        if (
          isLoadingSentIds ||
          isLoadingReceivedIds ||
          !userSentRemittanceIds ||
          !userReceivedRemittanceIds
        ) {
          setLoading(true);
          return;
        }

        // Fetch all sent and received remittances
        const sentIds = Array.isArray(userSentRemittanceIds) ? userSentRemittanceIds : [];
        const receivedIds = Array.isArray(userReceivedRemittanceIds) ? userReceivedRemittanceIds : [];

        const fetchRemittance = async (id) => {
          if (!id) return null;
          try {
            const result = await publicClient.readContract({
              address: CONTRACTS.REMITX_CORE,
              abi: REMITX_CORE_ABI,
              functionName: 'getRemittance',
              args: [id],
              chainId: 2810
            });
            return { data: result, id };
          } catch {
            return null;
          }
        };

        const sentPromises = sentIds.map((id) => fetchRemittance(id));
        const receivedPromises = receivedIds.map((id) => fetchRemittance(id));
        const sentResults = await Promise.all(sentPromises);
        const receivedResults = await Promise.all(receivedPromises);

        const processedRemittances = [];

        sentResults.forEach((item) => {
          if (item && item.data && item.id) {
            processedRemittances.push({
              ...item.data,
              id: item.id,
              direction: 'sent',
              isCompleted: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              isDeleted: item.data.deleted === true || item.data.deleted === 1 || item.data.deleted === 'true' || item.data.deleted === 1n,
              deleted: item.data.deleted === true || item.data.deleted === 1 || item.data.deleted === 'true' || item.data.deleted === 1n,
              completed: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              claimed: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              sourceChain: item.data.sourceChain !== undefined && item.data.sourceChain !== null
                ? String(item.data.sourceChain)
                : '2810',
              destinationChain: item.data.destinationChain !== undefined && item.data.destinationChain !== null
                ? String(item.data.destinationChain)
                : '',
              timestamp: typeof item.data.timestamp === 'bigint' ? Number(item.data.timestamp) : item.data.timestamp,
            });
          }
        });

        receivedResults.forEach((item) => {
          if (item && item.data && item.id) {
            processedRemittances.push({
              ...item.data,
              id: item.id,
              direction: 'received',
              isCompleted: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              isDeleted: item.data.deleted === true || item.data.deleted === 1 || item.data.deleted === 'true' || item.data.deleted === 1n,
              deleted: item.data.deleted === true || item.data.deleted === 1 || item.data.deleted === 'true' || item.data.deleted === 1n,
              completed: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              claimed: item.data.completed === true || item.data.completed === 1 || item.data.completed === 'true' || item.data.completed === 1n,
              sourceChain: item.data.sourceChain !== undefined && item.data.sourceChain !== null
                ? String(item.data.sourceChain)
                : '2810',
              destinationChain: item.data.destinationChain !== undefined && item.data.destinationChain !== null
                ? String(item.data.destinationChain)
                : '',
              timestamp: typeof item.data.timestamp === 'bigint' ? Number(item.data.timestamp) : item.data.timestamp,
            });
          }
        });

        processedRemittances.sort((a, b) => b.timestamp - a.timestamp);

        setRemittances(processedRemittances);
        setLoading(false);
      } catch (error) {
        setRemittances([]);
        setLoading(false);
      }
    };

    fetchAllRemittances();
  }, [userSentRemittanceIds, userReceivedRemittanceIds, isLoadingSentIds, isLoadingReceivedIds, publicClient]);

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

  // Delete confirmation loading
  useEffect(() => {
    if (isDeleteConfirming && deleteHash) {
      toast.dismiss();
      toast.loading('Confirming deletion and processing refund...');
    }
  }, [isDeleteConfirming, deleteHash]);

  // Force re-render after delete confirmation
  useEffect(() => {
    if (isDeleteSuccess && !isDeleteConfirming && deleteHash) {
      setTimeout(() => {
        setLoading(true);
        Promise.all([
          refetchSentRemittances(),
          refetchReceivedRemittances()
        ]).then(() => {
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      }, 1000);
      setDeletingId(null);
      toast.dismiss();
      toast.success('Failed transfer deleted and tokens refunded!');
    }
  }, [isDeleteSuccess, isDeleteConfirming, deleteHash, refetchSentRemittances, refetchReceivedRemittances]);

  // Delete handler for failed direct transfers
  const handleDeleteRemittance = async (remittanceId) => {
    const remittance = remittances.find(r => r.id === remittanceId);
    if (!remittance) {
      toast.error('Transfer not found');
      return;
    }
    if (remittance.isCompleted || remittance.completed) {
      toast.error('Cannot delete completed transfer');
      return;
    }
    if (remittance.isDeleted || remittance.deleted) {
      toast.error('Transfer already deleted');
      return;
    }
    if (remittance.sender.toLowerCase() !== address.toLowerCase()) {
      toast.error('You can only delete your own failed transfers');
      return;
    }
    const tokenInfo = tokens[remittance.sourceToken] || { symbol: 'Unknown', decimals: 18 };
    const formattedAmount = formatUnits(remittance.amount, tokenInfo.decimals);
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
      await deleteRemittance({
        address: CONTRACTS.REMITX_CORE,
        abi: REMITX_CORE_ABI,
        functionName: 'deleteRemittance',
        args: [remittanceId],
        gas: 500000n,
        gasPrice: undefined,
        value: 0n,
      });
      toast.dismiss();
      toast.loading('Delete transaction submitted...');
    } catch (error) {
      toast.dismiss();
      setDeletingId(null);
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

  // Filter remittances for direct transfers
  const filteredRemittances = remittances.filter(remittance => {
    const isPending = !remittance.isCompleted && !remittance.completed && !remittance.isDeleted && !remittance.deleted;
    const isCompleted = remittance.isCompleted || remittance.completed;
    const isDeleted = remittance.isDeleted || remittance.deleted;
    const isReceived = remittance.direction === 'received';
    const isSent = remittance.direction === 'sent';
    const isFailed = !remittance.isCompleted && !remittance.completed && !remittance.isDeleted && !remittance.deleted;
    switch (filter) {
      case 'pending':
        return isPending;
      case 'completed':
        return isCompleted;
      case 'deleted':
        return isDeleted;
      case 'sent':
        return isSent;
      case 'received':
        return isReceived;
      case 'failed':
        return isFailed;
      default:
        return true;
    }
  });

  const getStatusInfo = (remittance) => {
    if (remittance.isDeleted || remittance.deleted) {
      return {
        label: 'Deleted',
        icon: <Trash2 className="w-4 h-4" />,
        className: 'bg-gray-100 text-gray-700 border-gray-300'
      };
    }
    if (remittance.isCompleted || remittance.completed) {
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
    if (!chainId) return { name: 'Unknown Chain', icon: '❓' };
    const key = typeof chainId === 'bigint' ? chainId.toString() : String(chainId);
    return chains[key] || { name: 'Unknown Chain', icon: '❓' };
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
                label: 'Delivered',
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
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${filter === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${filter === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
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
