import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { RecentTransaction } from '../../lib/types/dashboard';
import { cheqdApiService } from '../../lib/services/cheqdApi';
import { getTypeColor, formatHash } from '../../lib/utils/formatters';

interface TransactionFilters {
  type: string;
  search: string;
}

interface TransactionDetailModalProps {
  transaction: RecentTransaction;
  onClose: () => void;
}


const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transaction, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden" 
           style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20 bg-white/5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
              <p className="text-sm text-slate-300 mt-1">Block #{transaction.height.toLocaleString()}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-300 hover:text-white text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Transaction Hash */}
            <div>
              <h4 className="text-sm font-medium text-slate-200 mb-2">Transaction Hash</h4>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="font-mono text-sm text-white break-all">{transaction.hash}</p>
              </div>
            </div>

            {/* Type and Content Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Type</h4>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(transaction.contentType)}`}>
                  {transaction.contentType}
                </span>
              </div>
              
              {transaction.contentId && (
                <div>
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Content ID</h4>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-sm text-white truncate" title={transaction.contentId}>
                      {transaction.contentId}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sender */}
            <div>
              <h4 className="text-sm font-medium text-slate-200 mb-2">Sender Address</h4>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p 
                  className="font-mono text-sm text-white break-all cursor-pointer hover:bg-white/10 p-2 rounded transition-colors"
                  onClick={() => navigator.clipboard.writeText(transaction.sender)}
                  title="Click to copy"
                >
                  {transaction.sender}
                </p>
              </div>
            </div>

            {/* Block and Time Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Block Info</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm font-semibold text-white">#{transaction.height.toLocaleString()}</p>
                  <p className="text-xs text-slate-300 mt-1">Transaction #{transaction.height}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Timestamp</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-white">
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {new Date(transaction.timestamp).toLocaleTimeString()} • {(() => {
                      const now = new Date();
                      const txTime = new Date(transaction.timestamp);
                      const diffMs = now.getTime() - txTime.getTime();
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      const diffHours = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHours / 24);
                      
                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      return `${diffDays}d ago`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/20 bg-white/5">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-cyan-600/80 text-white rounded-lg hover:bg-cyan-500 transition-all duration-200 font-medium shadow-lg hover:shadow-cyan-500/25"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransactionPage = forwardRef<{ refreshData: () => void }>((_, ref) => {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<RecentTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    type: '',
    search: ''
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // Load more transactions for the dedicated page
      const txData = await cheqdApiService.getRecentTransactions();
      setTransactions(txData);
      setError(null);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(tx => tx.contentType === filters.type);
    }

    // Filter by search (hash or content)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchLower) || 
        tx.contentType.toLowerCase().includes(searchLower) ||
        (tx.contentId && tx.contentId.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshData: () => {
      loadTransactions();
    }
  }));




  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const resetFilters = () => {
    setFilters({
      type: '',
      search: ''
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-200">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <span className="text-6xl">⚠️</span>
          <h2 className="text-xl font-semibold text-white mt-4">Failed to Load Transactions</h2>
          <p className="text-slate-200 mt-2">{error}</p>
          <button 
            onClick={loadTransactions}
            className="mt-4 px-4 py-2 bg-cyan-600/80 text-white rounded-lg hover:bg-cyan-500 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-slate-300 mt-1">View and search all network transactions</p>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 shadow-lg border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Hash or type..."
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
            >
              <option value="">All Types</option>
              <option value="DID">DID</option>
              <option value="Schema">Schema</option>
              <option value="Definition">Definition</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={resetFilters}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            Reset Filters
          </button>
          <div className="text-sm text-slate-300">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      </div>

      {/* Results */}
      {currentTransactions.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20" 
             style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
          <span className="text-6xl">📝</span>
          <h3 className="text-lg font-medium text-white mt-4">No transactions found</h3>
          <p className="text-slate-200 mt-2">Try adjusting your filters or check back later for new transactions.</p>
        </div>
      ) : (
        <>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden" 
               style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Hash</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Block</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {currentTransactions.map((transaction, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedTx(transaction)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-slate-200">{formatHash(transaction.hash, 10, 10)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.contentType)}`}>
                          {transaction.contentType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          {transaction.contentId ? (
                            <p className="text-xs text-slate-200 truncate" title={transaction.contentId}>
                              {transaction.contentId}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                        #{transaction.height.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        <div className="text-xs">
                          <div>{new Date(transaction.timestamp).toLocaleDateString()}</div>
                          <div className="text-slate-400">{new Date(transaction.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-200">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-white/20 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/25'
                            : 'text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-white/20 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedTx && (
        <TransactionDetailModal 
          transaction={selectedTx} 
          onClose={() => setSelectedTx(null)} 
        />
      )}
    </div>
  );
});

export default TransactionPage;