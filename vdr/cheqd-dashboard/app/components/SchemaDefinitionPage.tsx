import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ResourceData } from '../../lib/types/dashboard';
import { cheqdApiService } from '../../lib/services/cheqdApi';

interface ResourceFilters {
  type: 'all' | 'Schema' | 'Definition';
  search: string;
}

interface ResourceDetailModalProps {
  resource: ResourceData;
  onClose: () => void;
  allResources: ResourceData[]; // To find related resources
}

const getTypeColorBackground = (type: 'DID' | 'Schema' | 'Definition') => {
  if (type === 'Schema') return 'bg-green-100 text-green-800';
  if (type === 'Definition') return 'bg-purple-100 text-purple-800';
  if (type === 'DID') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({ resource, onClose, allResources }) => {
  const relatedSchema = resource.resourceType === 'Definition' && resource.relatedSchemaId 
    ? allResources.find(r => r.resourceType === 'Schema' && (r.collectionId === resource.relatedSchemaId || r.id === resource.relatedSchemaId))
    : null;

  const relatedDefinitions = resource.resourceType === 'Schema'
    ? allResources.filter(r => r.resourceType === 'Definition' && r.relatedSchemaId === resource.collectionId)
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" 
           style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20 bg-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColorBackground(resource.resourceType)}`}>
                {resource.resourceType}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-white">{resource.name}</h3>
                <p className="text-sm text-slate-300">Block #{resource.blockHeight.toLocaleString()}</p>
              </div>
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
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Resource ID</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="font-mono text-sm text-white break-all">{resource.id}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Collection ID (DID)</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="font-mono text-sm text-white break-all">{resource.collectionId}</p>
                </div>
              </div>
            </div>

            {/* Schema-specific Information */}
            {resource.resourceType === 'Schema' && (
              <>
                {resource.attributes && resource.attributes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Schema Attributes</h4>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {resource.attributes.map((attr, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-cyan-100/20 text-cyan-300 text-xs rounded-full border border-cyan-400/30">
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Definitions */}
                {relatedDefinitions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-2">
                      Related Credential Definitions ({relatedDefinitions.length})
                    </h4>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="space-y-2">
                        {relatedDefinitions.map((def, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                            <div>
                              <p className="text-sm font-medium text-white">{def.name}</p>
                              <p className="text-xs text-slate-300">Block #{def.blockHeight.toLocaleString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColorBackground('Definition')}`}>
                              Definition
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Definition-specific Information */}
            {resource.resourceType === 'Definition' && (
              <>
                {resource.tag && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Definition Tag</h4>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <span className="inline-block px-3 py-1 bg-purple-100/20 text-purple-300 text-sm rounded-full border border-purple-400/30">
                        {resource.tag}
                      </span>
                    </div>
                  </div>
                )}

                {/* Related Schema */}
                {relatedSchema && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Based on Schema</h4>
                    <div className="bg-green-500/10 rounded-lg p-3 border-l-4 border-green-400/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{relatedSchema.name}</p>
                          <p className="text-xs text-slate-300">Block #{relatedSchema.blockHeight.toLocaleString()}</p>
                          {relatedSchema.attributes && relatedSchema.attributes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-200 mb-1">Attributes:</p>
                              <div className="flex flex-wrap gap-1">
                                {relatedSchema.attributes.slice(0, 5).map((attr, index) => (
                                  <span key={index} className="inline-block px-2 py-1 bg-cyan-100/20 text-cyan-300 text-xs rounded border border-cyan-400/30">
                                    {attr}
                                  </span>
                                ))}
                                {relatedSchema.attributes.length > 5 && (
                                  <span className="text-xs text-slate-300">+{relatedSchema.attributes.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColorBackground('Schema')}`}>
                          Schema
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {resource.relatedSchemaId && !relatedSchema && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Related Schema ID</h4>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="font-mono text-sm text-white break-all">{resource.relatedSchemaId}</p>
                      <p className="text-xs text-slate-300 mt-1">Schema not found in current data set</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Content Preview */}
            {resource.content && (
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Content Preview</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <pre className="text-xs text-slate-200 whitespace-pre-wrap">
                    {typeof resource.content === 'object' 
                      ? JSON.stringify(resource.content, null, 2)
                      : resource.content
                    }
                  </pre>
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Media Type</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-white">{resource.mediaType}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Checksum</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="font-mono text-sm text-white">{resource.checksum}</p>
                </div>
              </div>
            </div>

            {/* Timestamps and Blockchain Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Created</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-white">
                    {new Date(resource.created).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {new Date(resource.created).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-200 mb-2">Blockchain Info</h4>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-sm text-white">Block #{resource.blockHeight.toLocaleString()}</p>
                  <p className="font-mono text-xs text-slate-300 mt-1 break-all">{resource.transactionHash}</p>
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

const SchemaDefinitionPage = forwardRef<{ refreshData: () => void }>((_, ref) => {
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [filters, setFilters] = useState<ResourceFilters>({
    type: 'all',
    search: ''
  });

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [resources, filters]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const resourceData = await cheqdApiService.getResources();
      setResources(resourceData);
      setError(null);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setError('Failed to load schemas and definitions');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshData: () => {
      loadResources();
    }
  }));

  const applyFilters = () => {
    let filtered = [...resources];

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(resource => resource.resourceType === filters.type);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(resource => 
        resource.name.toLowerCase().includes(searchLower) ||
        resource.id.toLowerCase().includes(searchLower) ||
        resource.collectionId.toLowerCase().includes(searchLower) ||
        (resource.tag && resource.tag.toLowerCase().includes(searchLower)) ||
        (resource.attributes && resource.attributes.some(attr => attr.toLowerCase().includes(searchLower)))
      );
    }

    setFilteredResources(filtered);
    setCurrentPage(1);
  };

  const getStats = () => {
    const schemas = resources.filter(r => r.resourceType === 'Schema').length;
    const definitions = resources.filter(r => r.resourceType === 'Definition').length;
    return { schemas, definitions };
  };

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResources = filteredResources.slice(startIndex, endIndex);

  const resetFilters = () => {
    setFilters({
      type: 'all',
      search: ''
    });
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-200">Loading schemas and definitions...</p>
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
          <h2 className="text-xl font-semibold text-white mt-4">Failed to Load Resources</h2>
          <p className="text-slate-200 mt-2">{error}</p>
          <button 
            onClick={loadResources}
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
        <h1 className="text-2xl font-bold text-white">Schemas & Credential Definitions</h1>
        <p className="text-slate-300 mt-1">Manage schemas and their credential definitions</p>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20" 
               style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${getTypeColorBackground('Schema')}`}>
                <span className="text-lg">📋</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-200">Schemas</p>
                <p className="text-2xl font-bold text-white">{stats.schemas}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20" 
               style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${getTypeColorBackground('Definition')}`}>
                <span className="text-lg">🏷️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-200">Definitions</p>
                <p className="text-2xl font-bold text-white">{stats.definitions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20" 
               style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-cyan-100/20 text-cyan-300 border border-cyan-400/30">
                <span className="text-lg">🔗</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-200">Total Resources</p>
                <p className="text-2xl font-bold text-white">{resources.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-white/20" 
           style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Search by name, ID, attributes..."
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value as ResourceFilters['type']})}
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
            >
              <option value="all">All Types</option>
              <option value="Schema">Schemas</option>
              <option value="Definition">Definitions</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={resetFilters}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
          >
            Reset Filters
          </button>
          <div className="text-sm text-slate-300">
            Showing {filteredResources.length} of {resources.length} resources
          </div>
        </div>
      </div>

      {/* Results */}
      {currentResources.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20" 
             style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
          <span className="text-6xl">📄</span>
          <h3 className="text-lg font-medium text-white mt-4">No resources found</h3>
          <p className="text-slate-200 mt-2">Try adjusting your filters or check back later for new schemas and definitions.</p>
        </div>
      ) : (
        <>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden" 
               style={{ boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Block</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {currentResources.map((resource, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedResource(resource)}
                    >
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-white truncate" title={resource.name}>
                            {resource.name}
                          </p>
                          <p className="text-xs text-slate-300 truncate" title={resource.id}>
                            {resource.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColorBackground(resource.resourceType)}`}>
                          {resource.resourceType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-white">
                          {resource.resourceType === 'Schema' && resource.attributes && resource.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.attributes.slice(0, 2).map((attr, i) => (
                                <span key={i} className="inline-block px-2 py-1 bg-cyan-100/20 text-cyan-300 text-xs rounded border border-cyan-400/30">
                                  {attr}
                                </span>
                              ))}
                              {resource.attributes.length > 2 && (
                                <span className="text-xs text-slate-300">+{resource.attributes.length - 2}</span>
                              )}
                            </div>
                          )}
                          {resource.resourceType === 'Definition' && resource.tag && (
                            <span className="inline-block px-2 py-1 bg-purple-100/20 text-purple-300 text-xs rounded border border-purple-400/30">
                              {resource.tag}
                            </span>
                          )}
                          {resource.resourceType === 'Definition' && resource.relatedSchemaId && (
                            <p className="text-xs text-slate-300 mt-1">
                              → Schema: {resource.relatedSchemaId.substring(0, 20)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                        #{resource.blockHeight.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        <div className="text-xs">
                          <div>{new Date(resource.created).toLocaleDateString()}</div>
                          <div className="text-slate-400">{new Date(resource.created).toLocaleTimeString()}</div>
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredResources.length)} of {filteredResources.length} results
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

      {selectedResource && (
        <ResourceDetailModal 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)}
          allResources={resources}
        />
      )}
    </div>
  );
});

export default SchemaDefinitionPage;