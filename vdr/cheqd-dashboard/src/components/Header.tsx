import React from 'react';
import { UserData, ConnectionStatus } from '../types/dashboard';

interface HeaderProps {
  userData?: UserData;
  connectionStatus?: ConnectionStatus;
}

const Header: React.FC<HeaderProps> = ({ userData, connectionStatus }) => {
  const user = userData || {
    name: "Maria",
    greeting: "Good morning",
    subtitle: "long time no see"
  };

  const connection = connectionStatus || {
    isConnected: false,
    isUsingMockData: true,
    networkType: "localnet"
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{user.subtitle}</p>
        </div>

        {/* Right side - Network status and user */}
        <div className="flex items-center space-x-6">
          {/* Network status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connection.isConnected 
                ? 'bg-green-400 animate-pulse' 
                : connection.isUsingMockData
                ? 'bg-yellow-400'
                : 'bg-red-400'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connection.isConnected 
                ? `cheqd Network Connected (${connection.networkType})`
                : connection.isUsingMockData
                ? "Mock Data Mode"
                : "Network Disconnected"}
            </span>
          </div>
          
          {/* User avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">{user.name[0]}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;