'use client';

import React, { useState } from 'react';
import { IssuedCredential } from '../../lib/types';
import { formatDate } from '../../lib/utils/dateUtils';
import { STYLES } from '../../lib/styles/constants';

interface IssuedCredentialsListProps {
  credentials: IssuedCredential[];
  onRefresh: () => void;
}

const IssuedCredentialsList: React.FC<IssuedCredentialsListProps> = ({ credentials, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => setRefreshing(false), 500);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white"></h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
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

      <div className={STYLES.CARD} style={{boxShadow: STYLES.CARD_SHADOW}}>
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
                <tr className={STYLES.TABLE_BORDER}>
                  <th className={STYLES.TABLE_HEADER}>Student</th>
                  <th className={STYLES.TABLE_HEADER}>Student ID</th>
                  <th className={STYLES.TABLE_HEADER}>University</th>
                  <th className={STYLES.TABLE_HEADER}>Issued Date</th>
                </tr>
              </thead>
              <tbody className={STYLES.TABLE_DIVIDER}>
                {credentials.map((credential) => (
                  <tr key={credential.id} className={STYLES.TABLE_ROW_HOVER}>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-white font-semibold">{credential.studentName}</div>
                        <div className="text-slate-400 text-sm">
                          <span className={STYLES.STATUS_SUCCESS}>
                            ✅ Issued
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-200 font-mono">{credential.studentId}</td>
                    <td className="py-4 px-6 text-slate-200">{credential.university}</td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-slate-200 text-sm">{formatDate(credential.issuedAt)}</div>
                      </div>
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
    </div>
  );
};

export default IssuedCredentialsList;