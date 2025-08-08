import React from 'react';
import { NetworkHealth } from '../types/dashboard';

interface NetworkHealthProps {
  networkHealth?: NetworkHealth;
}

const NetworkHealthCard: React.FC<NetworkHealthProps> = ({ networkHealth }) => {
  const defaultHealth: NetworkHealth = {
    blockHeight: 156234,
    syncingStatus: false,
    peersConnected: 8,
    consensusState: "consensus",
    latestBlockTime: "2025-01-15T10:30:00Z"
  };

  const data = networkHealth || defaultHealth;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Network Health</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xl">{data.syncingStatus ? '🔄' : '✅'}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Network Status</h3>
            <p className={`text-sm ${
              data.syncingStatus ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {data.syncingStatus ? 'Syncing' : 'Synced'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Block Height</p>
            <p className="text-lg font-bold text-blue-600">{data.blockHeight.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Peers</p>
            <p className="text-lg font-bold text-green-600">{data.peersConnected}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Consensus State</p>
            <p className="text-sm text-gray-600 capitalize">{data.consensusState}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Latest Block</p>
            <p className="text-xs text-gray-600">{formatTime(data.latestBlockTime)}</p>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            View Network Details
          </button>
          <button className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkHealthCard;