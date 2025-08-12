'use client';

import React, { useState, useEffect } from 'react';
import { issuerApiService } from '../../lib/services/issuerApi';
import { PendingCredential } from '../../lib/types';
import { formatDate, getTimeUntilExpiry } from '../../lib/utils/dateUtils';
import { STYLES } from '../../lib/styles/constants';

interface PendingCredentialsListProps {
  onRefresh: () => void;
}

const PendingCredentialsList: React.FC<PendingCredentialsListProps> = ({ onRefresh }) => {
  const [pendingCredentials, setPendingCredentials] = useState<PendingCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCredentials, setExpandedCredentials] = useState<Set<string>>(new Set());

  const loadPendingCredentials = async (isInitialLoad = false, isManualRefresh = false) => {
    try {
      setError(null);
      if (isManualRefresh) {
        setRefreshing(true);
      }
      const credentials = await issuerApiService.getPendingCredentials();
      setPendingCredentials(credentials);
    } catch (error) {
      console.error('Failed to load pending credentials:', error);
      setError('Failed to load pending credentials');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadPendingCredentials(true); // Initial load
    
    const interval = setInterval(() => loadPendingCredentials(false), 5000);
    
    return () => clearInterval(interval);
  }, []);


  const toggleExpanded = (credentialId: string) => {
    const newExpanded = new Set(expandedCredentials);
    if (newExpanded.has(credentialId)) {
      newExpanded.delete(credentialId);
    } else {
      newExpanded.add(credentialId);
    }
    setExpandedCredentials(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className={STYLES.SPINNER_LARGE}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white"></h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => loadPendingCredentials(false, true)}
            disabled={refreshing}
            className={`${STYLES.BUTTON_BASE} ${STYLES.BUTTON_PRIMARY} ${STYLES.BUTTON_DISABLED}`}
          >
            {refreshing ? (
              <div className="flex items-center space-x-2">
                <div className={STYLES.SPINNER_SMALL}></div>
                <span>Refreshing...</span>
              </div>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-200 font-medium">{error}</p>
        </div>
      )}

      <div className={STYLES.CARD} style={{boxShadow: STYLES.CARD_SHADOW}}>
        {pendingCredentials.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Pending Credentials</h3>
            <p className="text-slate-300">All credential offers have been processed or expired.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={STYLES.TABLE_BORDER}>
                  <th className={STYLES.TABLE_HEADER}>Student</th>
                  <th className={STYLES.TABLE_HEADER}>Created</th>
                  <th className={`${STYLES.TABLE_HEADER} text-center`}>Status</th>
                  <th className={STYLES.TABLE_HEADER}>Invitation Link</th>
                  <th className={`${STYLES.TABLE_HEADER} text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody className={STYLES.TABLE_DIVIDER}>
                {pendingCredentials.map((credential) => (
                  <React.Fragment key={credential.id}>
                    <tr className={STYLES.TABLE_ROW_HOVER}>
                      <td className="py-4 px-6">
                        <div className="text-white font-semibold">{credential.studentName}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="text-slate-200 text-sm">{formatDate(credential.createdAt)}</div>
                          <div className="text-slate-400 text-xs">{getTimeUntilExpiry(credential.expiresAt)}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={STYLES.STATUS_PENDING}>
                          ⏳ Pending
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {credential.invitationUrl ? (
                          <div className="flex items-center space-x-2">
                            <div className="bg-white/10 rounded-lg p-2 flex-1">
                              <p className="text-xs font-mono text-slate-200 break-all">{credential.invitationUrl}</p>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(credential.invitationUrl!)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold ${STYLES.BUTTON_BASE.replace('px-4 py-2', 'px-2 py-1')} ${STYLES.BUTTON_PRIMARY} shadow-md`}
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Generating...</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toggleExpanded(credential.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${STYLES.BUTTON_BASE.replace('px-4 py-2', 'px-2 py-1')} ${STYLES.BUTTON_PRIMARY} shadow-md`}
                        >
                          {expandedCredentials.has(credential.id) ? 'Hide Details' : 'Show Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedCredentials.has(credential.id) && (
                      <tr key={`${credential.id}-details`} className="bg-white/5">
                        <td colSpan={5} className="py-4 px-6">
                          <div className="bg-white/5 rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-white mb-3">Full Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-300 font-medium">Student ID:</span>
                                <span className="text-slate-200 ml-2 font-mono">{credential.studentId}</span>
                              </div>
                              <div>
                                <span className="text-slate-300 font-medium">University:</span>
                                <span className="text-slate-200 ml-2">{credential.university}</span>
                              </div>
                              <div>
                                <span className="text-slate-300 font-medium">Birth Date:</span>
                                <span className="text-slate-200 ml-2">{credential.birthDate}</span>
                              </div>
                              <div>
                                <span className="text-slate-300 font-medium">Student Status:</span>
                                <span className="text-slate-200 ml-2">{credential.isStudent ? 'Active Student' : 'Not Active'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-slate-400 text-sm">
        Showing {pendingCredentials.length} pending credential{pendingCredentials.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default PendingCredentialsList;