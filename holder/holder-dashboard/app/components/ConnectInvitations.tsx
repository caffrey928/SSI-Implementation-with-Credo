import React, { useState } from 'react';
import { holderApiService } from '../../lib/services/holderApi';

interface ConnectInvitationsProps {
  onInvitationReceived?: (data: any) => void;
}

const ConnectInvitations: React.FC<ConnectInvitationsProps> = ({ onInvitationReceived }) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [invitationUrl, setInvitationUrl] = useState('');

  const handleInvitation = async () => {
    if (!invitationUrl.trim()) {
      setMessage('Please enter a valid invitation URL');
      setMessageType('error');
      return;
    }

    try {
      setMessage('Processing invitation...');
      setMessageType('info');
      
      const result = await holderApiService.receiveInvitation(invitationUrl);
      
      setMessage('Invitation received successfully!');
      setMessageType('success');
      setInvitationUrl('');
      
      if (onInvitationReceived) {
        onInvitationReceived(result);
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      setMessage('Failed to process invitation. Please check the URL.');
      setMessageType('error');
    }
  };


  return (
    <div className="space-y-6">

      {/* Invitation URL Section */}
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20" style={{boxShadow: '0 0 25px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
        <h2 className="text-lg font-bold text-white mb-4">🔗 Connection Invitation</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Paste invitation URL to connect with issuers or verifiers
            </label>
            <input
              type="url"
              value={invitationUrl}
              onChange={(e) => setInvitationUrl(e.target.value)}
              placeholder="https://example.com/invitation?..."
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleInvitation}
            disabled={!invitationUrl.trim()}
            className="w-full px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-purple-400 bg-purple-500/70 hover:bg-purple-500/90 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect
          </button>
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

      {/* Instructions */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 className="text-white font-semibold mb-3">Instructions</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>• Paste any invitation URL to connect with issuers or verifiers</li>
          <li>• The wallet will automatically detect the type of connection and handle it appropriately</li>
          <li>• Credential offers and proof requests will be processed automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectInvitations;