'use client';

import React, { useState } from 'react';
import { IssuedCredential } from '../../lib/types';
import { formatDate } from '../../lib/utils/dateUtils';

interface IssuedCredentialsListProps {
  credentials: IssuedCredential[];
  onRefresh: () => void;
}

const IssuedCredentialsList: React.FC<IssuedCredentialsListProps> = ({ credentials, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<IssuedCredential | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const openModal = (credential: IssuedCredential) => {
    setSelectedCredential(credential);
  };

  const closeModal = () => {
    setSelectedCredential(null);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Issued Credentials</h2>
          <p className="text-slate-300 mt-1">
            Total: {credentials.length} issued credential
            {credentials.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Refreshing...</span>
              </div>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
        {credentials.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">📜</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Issued Credentials</h3>
            <p className="text-slate-300">Credentials will appear here after they have been successfully issued.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">Schema Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">Student Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">Student ID</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">Issued Date</th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {credentials
                  .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
                  .map((credential) => (
                  <tr key={credential.credentialId} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold">{credential.schemaName || "Unknown Schema"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold">{credential.studentName}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-200 font-mono">{credential.studentId}</td>
                    <td className="py-4 px-6">
                      <div className="text-slate-200 text-sm">{formatDate(credential.issuedAt)}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openModal(credential)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10 shadow-md"
                      >
                        Show Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-slate-400 text-sm">
        Showing {credentials.length} issued credential{credentials.length !== 1 ? 's' : ''}
      </div>

      {/* Modal */}
      {selectedCredential && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto" 
            style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Credential Details</h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Schema Name</p>
                      <p className="text-white font-medium">{selectedCredential.schemaName || "Unknown Schema"}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Definition Type</p>
                      <p className="text-white font-medium">{selectedCredential.definitionType || "Unknown"}</p>
                    </div>
                  </div>
                </div>

                {/* Credential Attributes */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Credential Attributes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedCredential.attributes).map(([key, value]) => (
                      <div key={key} className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{key}</p>
                        <p className="text-white font-medium">
                          {key === 'birthDate' && (value.length === 8 && /^\d{8}$/.test(value))
                            ? `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`
                            : value}
                        </p>
                      </div>
                    ))}
                    <div key="issueddate" className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">issueddate</p>
                      <p className="text-white font-medium">
                        {new Date(selectedCredential.issuedAt).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Credential ID</p>
                      <p className="text-white font-mono text-sm break-all">{selectedCredential.credentialId}</p>
                    </div>
                    
                    {selectedCredential.schemaId && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Schema ID</p>
                        <p className="text-white font-mono text-sm break-all">{selectedCredential.schemaId}</p>
                      </div>
                    )}

                    {selectedCredential.credentialDefinitionId && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Credential Definition ID</p>
                        <p className="text-white font-mono text-sm break-all">{selectedCredential.credentialDefinitionId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuedCredentialsList;