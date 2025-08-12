'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import LatestBlocks from './components/LatestBlocks';
import LatestTransactions from './components/LatestTransactions';
import TransactionPage from './components/TransactionPage';
import DidPage from './components/DidPage';
import SchemaDefinitionPage from './components/SchemaDefinitionPage';
import { DashboardData, BlockInfo, ActiveValidator } from '../lib/types/dashboard';
import { cheqdApiService } from '../lib/services/cheqdApi';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(() => {
    // Restore page state from URL hash on browser refresh
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const validPages = ['Dashboard', 'Transaction', 'DID', 'Schema+Definition'];
      return validPages.includes(hash) ? hash : 'Dashboard';
    }
    return 'Dashboard';
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [blockUpdateInterval, setBlockUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [validators, setValidators] = useState<ActiveValidator[]>([]);
  
  // Refs to trigger refresh in child components
  const transactionPageRef = useRef<{ refreshData: () => void } | null>(null);
  const didPageRef = useRef<{ refreshData: () => void } | null>(null);
  const schemaPageRef = useRef<{ refreshData: () => void } | null>(null);

  // Custom setCurrentPage function that also updates URL hash
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.location.hash = page === 'Dashboard' ? '' : page;
    }
  };

  const loadData = async (isInitialLoad = true) => {
    try {
      // Only show full page loading on initial load (page refresh or first visit)
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const networkData = await cheqdApiService.getDashboardData();
      setData(networkData);
      
      // Update validators
      if (networkData.activeValidators) {
        setValidators(networkData.activeValidators);
      }
      
      setError(null);
    } catch (error) {
      console.error('Failed to connect to cheqd network:', error);
      setError('Failed to connect to cheqd network. Please check network connectivity and configuration.');
      setData(null);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };


  const updateBlocks = React.useCallback(async () => {
    try {
      if (validators.length === 0) return;
      
      const latestBlock = await cheqdApiService.getLatestBlock(validators);
      if (latestBlock) {
        setRecentBlocks(prevBlocks => {
          // Check if this block already exists
          const existingBlock = prevBlocks.find(block => block.height === latestBlock.height);
          if (existingBlock) return prevBlocks;
          
          // Check if this is actually newer than what we have
          if (prevBlocks.length > 0 && latestBlock.height <= prevBlocks[0].height) {
            return prevBlocks;
          }
          
          // Add new block and keep only the latest 5
          const updatedBlocks = [latestBlock, ...prevBlocks].slice(0, 5);
          
          // Only update if there's actually a change
          if (JSON.stringify(updatedBlocks) === JSON.stringify(prevBlocks)) {
            return prevBlocks;
          }
          
          return updatedBlocks;
        });
      }
    } catch (error) {
      console.warn('Failed to update blocks:', error);
    }
  }, [validators]);

  const handleRefresh = () => {
    // Refresh data based on current page
    switch (currentPage) {
      case 'Dashboard':
        loadData(false); // Pass false to indicate this is a refresh, not initial load
        break;
      case 'Transaction':
        transactionPageRef.current?.refreshData();
        break;
      case 'DID':
        didPageRef.current?.refreshData();
        break;
      case 'Schema+Definition':
        schemaPageRef.current?.refreshData();
        break;
      default:
        // For unknown pages, try to refresh dashboard data
        loadData(false);
        break;
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Auto-refresh effect (reduced frequency)
  useEffect(() => {
    if (autoRefresh && currentPage === 'Dashboard' && data) {
      const interval = setInterval(() => {
        loadData(false); // Auto-refresh should not show loading screen
      }, 10000); // Refresh every 10 seconds
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, currentPage, data]);


  // Block update effect (every 1 second)
  useEffect(() => {
    if (currentPage === 'Dashboard' && validators.length > 0) {
      const interval = setInterval(() => {
        updateBlocks();
      }, 1000); // Update blocks every 1 second
      
      setBlockUpdateInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      if (blockUpdateInterval) {
        clearInterval(blockUpdateInterval);
        setBlockUpdateInterval(null);
      }
    }
  }, [currentPage, validators]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (blockUpdateInterval) {
        clearInterval(blockUpdateInterval);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.95), rgba(55, 75, 175, 0.9), rgba(75, 95, 195, 0.85), rgba(45, 85, 135, 0.95))'}}>
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-white/80 border-r-blue-400/60 mx-auto mb-8"></div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Connecting to cheqd network</h2>
              <p className="text-slate-200 font-medium">Please wait while we establish connection...</p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.95), rgba(55, 75, 175, 0.9), rgba(75, 95, 195, 0.85), rgba(45, 85, 135, 0.95))'}}>
        <div className="text-center max-w-lg px-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400/20 to-orange-500/20 backdrop-blur-sm border border-red-300/30 flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Network Connection Failed</h2>
            <p className="text-slate-200 mb-6 leading-relaxed">{error}</p>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-6 space-y-2 border border-white/10">
              <div className="text-sm text-slate-300 space-y-1">
                <p><span className="text-blue-300 font-medium">RPC URL:</span> {process.env.NEXT_PUBLIC_CHEQD_RPC_URL || 'http://localhost:27157'}</p>
                <p><span className="text-blue-300 font-medium">REST URL:</span> {process.env.NEXT_PUBLIC_CHEQD_REST_URL || 'http://localhost:1817'}</p>
                <p><span className="text-blue-300 font-medium">Network:</span> {process.env.NEXT_PUBLIC_NETWORK_TYPE || 'localnet'}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white/20 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 transform hover:scale-105 border border-white/20"
              style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'}}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return (
          <div className="h-full flex flex-col space-y-8">
            {/* Top Stats Cards - Modern Design */}
            <div className="flex-shrink-0 mt-6">
              <StatsCards 
                stats={data?.stats} 
                activeValidators={validators}
                onCardClick={handlePageChange}
              />
            </div>
            
            {/* Main Content - Equal Width Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Latest Blocks */}
              <div className="backdrop-blur-sm">
                <LatestBlocks 
                  recentBlocks={recentBlocks}
                />
              </div>
              
              {/* Latest Transactions */}
              <div className="backdrop-blur-sm">
                <LatestTransactions 
                  transactions={data?.recentTransactions}
                  onSeeMore={() => handlePageChange('Transaction')}
                />
              </div>
            </div>
          </div>
        );
      case 'Transaction':
        return <TransactionPage ref={transactionPageRef} />;
      case 'DID':
        return <DidPage ref={didPageRef} />;
      case 'Schema+Definition':
        return <SchemaDefinitionPage ref={schemaPageRef} />;
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
    <div className="flex h-screen" style={{background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.95), rgba(55, 75, 175, 0.9), rgba(75, 95, 195, 0.85), rgba(45, 85, 135, 0.95))'}}>
      <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          userData={{
            greeting: getPageTitle()
          }} 
          connectionStatus={data?.connectionStatus}
          onRefresh={handleRefresh}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 flex flex-col">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}