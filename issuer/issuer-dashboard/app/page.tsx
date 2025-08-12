'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import IssueCredentialForm from './components/IssueCredentialForm';
import IssuedCredentialsList from './components/IssuedCredentialsList';
import PendingCredentialsList from './components/PendingCredentialsList';
import { issuerApiService } from '../lib/services/issuerApi';
import { IssuedCredential, AgentStatus, CredentialOffer } from '../lib/types';

export default function IssuerDashboard() {
  const [currentPage, setCurrentPage] = useState('issue');
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [currentCredentialOffer, setCurrentCredentialOffer] = useState<CredentialOffer | null>(null);

  useEffect(() => {
    loadInitialData(true); // Initial load with loading state
    const dataInterval = setInterval(() => loadInitialData(false), 5000);
    return () => {
      clearInterval(dataInterval);
    };
  }, []);

  const loadInitialData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      const [credentials] = await Promise.all([
        issuerApiService.getIssuedCredentials().catch(() => []),
      ]);
      setIssuedCredentials(credentials);
      // Also check status on initial load
      await checkStatus();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const checkStatus = async () => {
    try {
      const status = await issuerApiService.getStatus();
      setAgentStatus(status.agent);
    } catch (error) {
      console.error('Failed to check status:', error);
      setAgentStatus({ initialized: false, pendingCredentials: 0 });
    }
  };

  const handleCredentialIssued = (credentialOffer: CredentialOffer) => {
    setCurrentCredentialOffer(credentialOffer);
    // Refresh the credentials list (without loading state since user just issued)
    loadInitialData(false);
  };

  const handleManualRefresh = () => {
    // Manual refresh should show loading
    loadInitialData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.95), rgba(55, 75, 175, 0.9), rgba(75, 95, 195, 0.85), rgba(45, 85, 135, 0.95))'}}>
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-white/80 border-r-blue-400/60 mx-auto mb-8"></div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Initializing Issuer Dashboard</h2>
              <p className="text-slate-200 font-medium">Connecting to issuer agent...</p>
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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'issue':
        return <IssueCredentialForm 
          onCredentialIssued={handleCredentialIssued} 
          credentialOffer={currentCredentialOffer}
          onResetOffer={() => setCurrentCredentialOffer(null)}
        />;
      case 'pending':
        return <PendingCredentialsList onRefresh={handleManualRefresh} />;
      case 'issued':
        return <IssuedCredentialsList credentials={issuedCredentials} onRefresh={handleManualRefresh} />;
      default:
        return <IssueCredentialForm 
          onCredentialIssued={handleCredentialIssued} 
          credentialOffer={currentCredentialOffer}
          onResetOffer={() => setCurrentCredentialOffer(null)}
        />;
    }
  };

  return (
    <div className="flex h-screen" style={{background: 'linear-gradient(135deg, rgba(40, 45, 95, 0.95), rgba(55, 75, 175, 0.9), rgba(75, 95, 195, 0.85), rgba(45, 85, 135, 0.95))'}}>
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          currentPage={currentPage}
          agentStatus={agentStatus}
          onRefresh={loadInitialData}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 flex flex-col">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}