import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Send, ArrowLeftRight, Clock, Gift } from 'lucide-react';
import SendRemittance from './SendRemittance';
import SwapTokens from './SwapTokens';
import RemittanceHistory from './RemittanceHistory';
import RecurringRemittances from './RecurringRemittances';
import TokenFaucet from './TokenFaucet';

const RemitXDashboard = () => {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('send');

  const tabs = [
    { id: 'send', label: 'Send Money', icon: Send },
    { id: 'swap', label: 'Swap Tokens', icon: ArrowLeftRight },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'recurring', label: 'Auto-Pay', icon: Clock },
    { id: 'faucet', label: 'Get Tokens', icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="flex items-center">
                <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                  Remit<span className="font-extrabold">X</span>
                </span>
                <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5">
                  <Send className="w-3 h-3 text-blue-600 mr-1" />
                  <span className="text-xs font-medium text-blue-600">Beta</span>
                </span>
              </h1>
              <span className="ml-2 text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded">
                Morph Testnet
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 bg-gradient-to-b from-blue-50 to-white">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mt-6">
            <div className="w-24 h-24 mx-auto mb-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="flex items-center justify-center transform translate-y-1">
                <Send className="w-9 h-9 text-white" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Cross-Chain Remittances <span className="text-blue-600">Simplified</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Send money globally in seconds, not days. Direct delivery across blockchains.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mt-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Delivery</h3>
              <p className="text-gray-600">Send tokens directly to recipient wallets across multiple blockchains.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <ArrowLeftRight className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Token Flexibility</h3>
              <p className="text-gray-600">Send USDC, USDT or DAI with automatic conversion between stablecoins.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Low Fees</h3>
              <p className="text-gray-600">Save up to 70% compared to traditional remittance services.</p>
            </div>
          </div>

          {/* Powered By Banner */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500 mb-2">Powered by</p>
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-700 font-medium">Chainlink CCIP</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-700 font-medium">Price Feeds</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-700 font-medium">Morph Network</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border">
            {activeTab === 'send' && <SendRemittance />}
            {activeTab === 'swap' && <SwapTokens />}
            {activeTab === 'history' && <RemittanceHistory />}
            {activeTab === 'recurring' && <RecurringRemittances />}
            {activeTab === 'faucet' && <TokenFaucet />}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemitXDashboard;
