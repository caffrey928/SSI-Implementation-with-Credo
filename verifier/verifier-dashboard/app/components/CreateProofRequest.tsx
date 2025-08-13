import React, { useState, useEffect } from 'react';
import { verifierApiService } from '../../lib/services/verifierApi';
import { ProofRequestOffer } from '../../lib/types';

interface CreateProofRequestProps {
  onProofRequestCreated?: (proofRequest: ProofRequestOffer) => void;
}

const CreateProofRequest: React.FC<CreateProofRequestProps> = ({ onProofRequestCreated }) => {
  const [loading, setLoading] = useState(false);
  const [currentProofRequest, setCurrentProofRequest] = useState<ProofRequestOffer | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showModal, setShowModal] = useState(false);
  const [showVerificationResult, setShowVerificationResult] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:4003/events');
    
    eventSource.onmessage = (event) => {
      const result = JSON.parse(event.data);
      setVerificationData(result);
      setShowVerificationResult(true);

      // Close other modals when verification result arrives
      setShowModal(false);
      setCurrentProofRequest(null);
      setMessage('');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAgeVerification = async () => {
    setLoading(true);
    setMessage('Creating age verification request...');
    setMessageType('info');
    
    try {
      const proofRequest = await verifierApiService.createAgeVerificationRequest();
      
      if (!proofRequest || !proofRequest.invitationUrl) {
        throw new Error('Invalid response: missing invitationUrl');
      }
      
      setCurrentProofRequest(proofRequest);
      setMessage('Age verification request created successfully!');
      setMessageType('success');
      setShowModal(true);
      
      if (onProofRequestCreated) {
        onProofRequestCreated(proofRequest);
      }
    } catch (error) {
      console.error('Error creating age verification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage(`Failed to create age verification request: ${errorMessage}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentVerification = async () => {
    setLoading(true);
    setMessage('Creating student verification request...');
    setMessageType('info');
    
    try {
      const proofRequest = await verifierApiService.createStudentVerificationRequest();
      
      setCurrentProofRequest(proofRequest);
      setMessage('Student verification request created successfully!');
      setMessageType('success');
      setShowModal(true);
      
      if (onProofRequestCreated) {
        onProofRequestCreated(proofRequest);
      }
    } catch (error) {
      console.error('Error creating student verification:', error);
      setMessage('Failed to create student verification request. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };


  const handleModalClose = () => {
    setShowModal(false);
    setCurrentProofRequest(null);
    setMessage('');
  };

  const handleVerificationResultClose = () => {
    setShowVerificationResult(false);
    setVerificationData(null);
  };

  return (
    <div className="space-y-6">
      {/* Quick Verification Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Age Verification */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20" style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
          <div className="text-center">
            <div className="text-4xl mb-4">🎂</div>
            <h3 className="text-lg font-bold text-white mb-2">Age Verification</h3>
            <p className="text-slate-300 text-sm mb-4">Verify that the holder is 18 years or older</p>
            <button
              onClick={handleAgeVerification}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg transition-all duration-300 hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'}}
            >
              {loading ? 'Creating...' : 'Create Age Verification'}
            </button>
          </div>
        </div>

        {/* Student Verification */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20" style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
          <div className="text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-bold text-white mb-2">Student Status</h3>
            <p className="text-slate-300 text-sm mb-4">Verify student status and university enrollment</p>
            <button
              onClick={handleStudentVerification}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg transition-all duration-300 hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'}}
            >
              {loading ? 'Creating...' : 'Create Student Verification'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg backdrop-blur-md ${
          messageType === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
          messageType === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
          'bg-blue-500/20 border border-blue-500/30 text-blue-300'
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}

      {/* Modal for Proof Request Display */}
      {showModal && currentProofRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 max-w-lg w-full max-h-[80vh] overflow-y-auto" style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">✅ Verification Request Created</h3>
                <p className="text-slate-300">Your verification request has been created successfully</p>
              </div>
              <button
                onClick={handleModalClose}
                className="p-2 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Invitation URL</label>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white font-mono text-xs break-all">{currentProofRequest.invitationUrl}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentProofRequest.invitationUrl);
                      setMessage('URL copied to clipboard!');
                      setMessageType('success');
                    }}
                    className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    📋 Copy URL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Created At</label>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white text-sm">{new Date().toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  💡 Share this URL with the credential holder to start the verification.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleModalClose}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg transition-all duration-300 hover:from-purple-600 hover:to-indigo-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result Modal */}
      {showVerificationResult && verificationData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto" style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">🎉 Verification Successful!</h3>
                <p className="text-slate-300">Received proof verification results</p>
              </div>
              <button
                onClick={handleVerificationResultClose}
                className="p-2 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Attributes */}
              {verificationData.attributes && Object.keys(verificationData.attributes).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Received Attributes</label>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    {Object.entries(verificationData.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-slate-300 font-medium">{key}:</span>
                        <span className="text-white">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predicates */}
              {verificationData.predicates && Object.keys(verificationData.predicates).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Verification Predicates</label>
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    {Object.entries(verificationData.predicates).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-slate-300 font-medium">{key}:</span>
                        <span className="text-white">{value ? 'Passed' : 'Failed'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleVerificationResultClose}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg transition-all duration-300 hover:from-green-600 hover:to-emerald-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-3">How to Use</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>• Choose a verification type (Age or Student Status) to create a proof request</li>
          <li>• Share the generated invitation URL with the credential holder</li>
          <li>• The holder opens the invitation URL in their wallet application</li>
          <li>• Once verified, the results will appear in the "Verification Results" page</li>
          <li>• Age verification checks if the holder is 18 years or older</li>
          <li>• Student verification confirms university enrollment and student status</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateProofRequest;