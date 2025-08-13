'use client';

import React, { useState } from 'react';
import { issuerApiService } from '../../lib/services/issuerApi';
import { StudentCredential, CredentialOffer } from '../../lib/types';

interface IssueCredentialFormProps {
  onCredentialIssued: (offer: CredentialOffer) => void;
  credentialOffer: CredentialOffer | null;
  onResetOffer: () => void;
}

const IssueCredentialForm: React.FC<IssueCredentialFormProps> = ({ onCredentialIssued, credentialOffer, onResetOffer }) => {
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    university: '',
    birthDate: '',
    isStudent: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.studentId || !formData.university || !formData.birthDate) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate birthDate format and value
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthDateRegex.test(formData.birthDate)) {
      setError('Please enter a valid birth date');
      return;
    }

    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    if (isNaN(birthDate.getTime())) {
      setError('Please enter a valid birth date');
      return;
    }
    
    if (birthDate > today) {
      setError('Birth date cannot be in the future');
      return;
    }
    
    if (birthDate < minDate) {
      setError('Birth date cannot be before 1900');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const studentCredential: StudentCredential = {
        ...formData,
        birthDate: parseInt(formData.birthDate.replace(/-/g, ''), 10) // Convert YYYY-MM-DD to YYYYMMDD number
      };

      const offer = await issuerApiService.issueCredential(studentCredential);
      
      // Validate response structure
      if (!offer || !offer.invitationUrl || !offer.recordId) {
        throw new Error('Invalid response from server: missing required fields');
      }
      
      onCredentialIssued(offer);
      
      // Don't reset form here - it will be reset when user clicks "Issue Another"
    } catch (error) {
      console.error('Error issuing credential:', error);
      setError(error instanceof Error ? error.message : 'Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  const resetOffer = () => {
    onResetOffer();
    setError(null);
    // Reset form when starting a new credential offer
    setFormData({
      name: '',
      studentId: '',
      university: '',
      birthDate: '',
      isStudent: true
    });
  };

  if (credentialOffer) {
    return (
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Credential Offer Created</h2>
              <p className="text-slate-200">Credential offer for <span className="font-semibold">{credentialOffer.studentInfo.name}</span> has been generated successfully.</p>
            </div>


            {/* Invitation URL */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Invitation URL</h4>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs font-mono text-slate-200 break-all">{credentialOffer.invitationUrl}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => navigator.clipboard.writeText(credentialOffer.invitationUrl)}
                className="px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-green-400 bg-green-500/30 hover:bg-green-500/50 hover:border-green-300"
              >
                Copy URL
              </button>
              <button
                onClick={resetOffer}
                className="px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-pink-400 bg-pink-500/35 hover:bg-pink-500/55 hover:border-pink-300"
              >
                Issue Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20" style={{boxShadow: '0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'}}>
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-200 font-medium">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                placeholder="Enter student's full name"
              />
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Student ID *
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                placeholder="e.g., STU2024001"
              />
            </div>

            {/* University */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                University *
              </label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                placeholder="Enter university name"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Birth Date *
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
              />
            </div>
          </div>

          {/* Student Status */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="isStudent"
                checked={formData.isStudent}
                onChange={handleInputChange}
                className="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-white font-medium">Currently enrolled as a student</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-white/70 hover:bg-white/20 hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Creating Credential Offer...</span>
                </div>
              ) : (
                'Issue Credential'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueCredentialForm;