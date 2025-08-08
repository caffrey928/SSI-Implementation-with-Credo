import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import StatsCards from './StatsCards';
import ValidatorInsight from './ValidatorInsight';
import NetworkHealthCard from './NetworkHealth';
import RecentItems from './RecentItems';
import TransactionPage from './TransactionPage';
import DidPage from './DidPage';
import SchemaDefinitionPage from './SchemaDefinitionPage';
import { DashboardData } from '../types/dashboard';
import { cheqdApiService } from '../services/cheqdApi';

const Dashboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Connecting to cheqd network...');
        const networkData = await cheqdApiService.getDashboardData();
        console.log('Successfully connected to cheqd network');
        setData(networkData);
        setError(null);
      } catch (error) {
        console.error('Failed to connect to cheqd network:', error);
        setError('Failed to connect to cheqd network. Please check network connectivity and configuration.');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to cheqd network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-lg px-6">
          <div className="mb-4">
            <span className="text-6xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Network Connection Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500 mb-4 space-y-1">
            <p>RPC URL: {process.env.REACT_APP_CHEQD_RPC_URL || 'http://localhost:27157'}</p>
            <p>REST URL: {process.env.REACT_APP_CHEQD_REST_URL || 'http://localhost:1817'}</p>
            <p>Network: {process.env.REACT_APP_NETWORK_TYPE || 'localnet'}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return (
          <div className="grid grid-cols-1 gap-6">
            <StatsCards stats={data?.stats} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-3">
                <ValidatorInsight validators={data?.validators} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NetworkHealthCard networkHealth={data?.networkHealth} />
              <RecentItems recentDids={data?.recentDids} recentResources={data?.recentResources} />
            </div>
          </div>
        );
      case 'Transaction':
        return <TransactionPage />;
      case 'DID':
        return <DidPage />;
      case 'Schema+Definition':
        return <SchemaDefinitionPage />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Page Not Found</h2>
          </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'Dashboard': return 'Dashboard';
      case 'Transaction': return 'Transactions';
      case 'DID': return 'DID Management';
      case 'Schema+Definition': return 'Schema & Definition';
      default: return 'Unknown Page';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          userData={{
            name: data?.user?.name || 'Administrator',
            greeting: getPageTitle(),
            subtitle: data?.user?.subtitle || ''
          }} 
          connectionStatus={data?.connectionStatus} 
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;