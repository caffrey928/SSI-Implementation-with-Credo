import React from 'react';
import { DidDocument, ResourceData } from '../types/dashboard';

interface RecentItemsProps {
  recentDids?: DidDocument[];
  recentResources?: ResourceData[];
}

const RecentItems: React.FC<RecentItemsProps> = ({ recentDids, recentResources }) => {
  const defaultDids: DidDocument[] = [
    {
      id: "did:cheqd:localnet:abc123def456",
      controller: ["did:cheqd:localnet:abc123def456"],
      verificationMethod: [],
      authentication: ["did:cheqd:localnet:abc123def456#key-1"],
      created: "2025-01-15T10:30:00Z",
      updated: "2025-01-15T10:30:00Z",
      blockHeight: 12345,
      transactionHash: "abc123def456ghi789"
    },
    {
      id: "did:cheqd:localnet:def456ghi789",
      controller: ["did:cheqd:localnet:def456ghi789"],
      verificationMethod: [],
      authentication: ["did:cheqd:localnet:def456ghi789#key-1"],
      created: "2025-01-15T10:25:00Z",
      updated: "2025-01-15T10:25:00Z",
      blockHeight: 12344,
      transactionHash: "def456ghi789jkl012"
    }
  ];

  const defaultResources: ResourceData[] = [
    {
      collectionId: "did:cheqd:localnet:abc123def456",
      id: "resource-1",
      name: "EmployeeCredentialSchema",
      resourceType: "Schema",
      mediaType: "application/json",
      created: "2025-01-15T10:29:45Z",
      checksum: "7b2282018c4ac87fb6e6e7f2...",
      blockHeight: 12346,
      transactionHash: "ghi789jkl012mno345"
    }
  ];

  const dids = recentDids || defaultDids;
  const resources = recentResources || defaultResources;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateId = (id: string) => {
    return id.length > 40 ? id.substring(0, 40) + '...' : id;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent DIDs</h3>
          {dids.slice(0, 2).map((did, index) => (
            <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors mb-2">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🆔</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-mono text-xs text-gray-900 truncate">{truncateId(did.id)}</h4>
                  <p className="text-xs text-gray-600">{formatTime(did.created)}</p>
                </div>
              </div>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
                View DID
              </button>
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Resources</h3>
          {resources.slice(0, 2).map((resource, index) => (
            <div key={index} className="flex items-start p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors mb-2">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 truncate">{resource.name}</h4>
                  <p className="text-xs text-gray-600">{resource.resourceType}</p>
                  <p className="text-xs text-gray-500">{formatTime(resource.created)}</p>
                </div>
              </div>
              <button className="text-xs text-green-600 hover:text-green-700 font-medium whitespace-nowrap">
                View Resource
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentItems;