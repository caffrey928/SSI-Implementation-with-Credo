import React from 'react';
import { UserData, ConnectionStatus } from '../../lib/types/dashboard';

interface HeaderProps {
  userData?: UserData;
  connectionStatus?: ConnectionStatus;
  onRefresh?: () => void;
}

const Header: React.FC<HeaderProps> = ({ userData, connectionStatus, onRefresh }) => {
  const user = userData || {
    greeting: "Dashboard"
  };

  const connection = connectionStatus || {
    isConnected: false,
    isUsingMockData: true,
    networkType: "localnet"
  };

  return (
    <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 px-8 py-6">
      <div className="flex items-center justify-between">
        {/* Left side - Page title */}
        <div>
          <h1 className="text-xl font-bold text-white mb-1">{user.greeting}</h1>
          <p className="text-slate-100 font-medium">Live network data from full node</p>
        </div>

        {/* Right side - Network status and refresh button */}
        <div className="flex items-center space-x-6">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="p-2 text-white hover:text-gray-100 rounded-lg transition-all duration-300 backdrop-blur-sm"
            style={{backgroundColor: 'rgba(35, 45, 65, 0.4)', backgroundImage: 'linear-gradient(135deg, rgba(196, 181, 253, 0.1), rgba(35, 45, 65, 0.4))'}}
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Network status indicator */}
          <div className="flex items-center space-x-3 backdrop-blur-sm rounded-full px-4 py-2" style={{backgroundColor: 'rgba(35, 45, 65, 0.4)', backgroundImage: 'linear-gradient(135deg, rgba(196, 181, 253, 0.1), rgba(35, 45, 65, 0.4))'}}>
            <div className={`w-3 h-3 rounded-full ${
              connection.isConnected 
                ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                : connection.isUsingMockData
                ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                : 'bg-red-400 shadow-lg shadow-red-400/50'
            }`}></div>
            <span className="text-sm text-white font-medium">
              {connection.isConnected 
                ? `Cheqd Network Connected (${connection.networkType})`
                : connection.isUsingMockData
                ? "Mock Data Mode"
                : "Network Disconnected"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;