import React, { useState, useEffect } from 'react';
import { DidDocument } from '../types/dashboard';
import { cheqdApiService } from '../services/cheqdApi';

interface DidFilters {
  search: string;
}

interface DidDetailModalProps {
  did: DidDocument;
  onClose: () => void;
}

const DidDetailModal: React.FC<DidDetailModalProps> = ({ did, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">DID Document Details</h3>
              <p className="text-sm text-gray-500 mt-1">Block #{did.blockHeight.toLocaleString()}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* DID Identifier */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">DID Identifier</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-mono text-sm text-gray-900 break-all">{did.id}</p>
              </div>
            </div>

            {/* Controller and Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Controllers</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {did.controller.length > 0 ? (
                    <ul className="space-y-1">
                      {did.controller.map((controller, index) => (
                        <li key={index} className="font-mono text-xs text-gray-900 break-all">
                          {controller}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No controllers</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Authentication Methods</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {did.authentication.length > 0 ? (
                    <ul className="space-y-1">
                      {did.authentication.map((auth, index) => (
                        <li key={index} className="font-mono text-xs text-gray-900 break-all">
                          {auth}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No authentication methods</p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Methods */}
            {did.verificationMethod.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Verification Methods</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="space-y-3">
                    {did.verificationMethod.map((method, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-3">
                        <p className="text-sm font-medium text-gray-900">
                          {method.id || `Method ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-600">{method.type || 'Unknown type'}</p>
                        {method.publicKeyBase58 && (
                          <p className="text-xs font-mono text-gray-500 mt-1 break-all">
                            {method.publicKeyBase58}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps and Blockchain Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Created</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-900">
                    {new Date(did.created).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(did.created).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-900">
                    {new Date(did.updated).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(did.updated).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Blockchain Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Blockchain Information</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Transaction Hash</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{did.transactionHash}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Block Height</p>
                    <p className="text-sm font-semibold text-gray-900">#{did.blockHeight.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DidPage: React.FC = () => {
  const [dids, setDids] = useState<DidDocument[]>([]);
  const [filteredDids, setFilteredDids] = useState<DidDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDid, setSelectedDid] = useState<DidDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [filters, setFilters] = useState<DidFilters>({
    search: ''
  });

  useEffect(() => {
    loadDids();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dids, filters]);

  const loadDids = async () => {
    try {
      setLoading(true);
      const didData = await cheqdApiService.getDidDocuments();
      setDids(didData);
      setError(null);
    } catch (err) {
      console.error('Failed to load DIDs:', err);
      setError('Failed to load DID documents');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...dids];

    // Filter by search (DID ID)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(did => 
        did.id.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDids(filtered);
    setCurrentPage(1);
  };

  const shortenDid = (did: string) => {
    if (did.length <= 40) return did;
    return `${did.substring(0, 20)}...${did.substring(did.length - 20)}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredDids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDids = filteredDids.slice(startIndex, endIndex);

  const resetFilters = () => {
    setFilters({
      search: ''
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading DID documents...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Failed to Load DIDs</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button 
            onClick={loadDids}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        <h1 className="text-2xl font-bold text-gray-900">DID Documents</h1>
        <p className="text-gray-600 mt-1">View and manage decentralized identifiers</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search DIDs</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Search by DID identifier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="ml-4 flex items-center space-x-4">
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Reset
            </button>
            <div className="text-sm text-gray-600">
              {filteredDids.length} of {dids.length} DIDs
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {currentDids.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
          <span className="text-6xl">🆔</span>
          <h3 className="text-lg font-medium text-gray-900 mt-4">No DID documents found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search terms or check back later for new DIDs.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Controllers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Block</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentDids.map((did, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDid(did)}
                    >
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="font-mono text-sm text-gray-900 truncate" title={did.id}>
                            {shortenDid(did.id)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {did.controller.length} controller{did.controller.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{did.blockHeight.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs">
                          <div>{new Date(did.created).toLocaleDateString()}</div>
                          <div className="text-gray-400">{new Date(did.created).toLocaleTimeString()}</div>
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
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredDids.length)} of {filteredDids.length} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedDid && (
        <DidDetailModal 
          did={selectedDid} 
          onClose={() => setSelectedDid(null)} 
        />
      )}
    </div>
  );
};

export default DidPage;