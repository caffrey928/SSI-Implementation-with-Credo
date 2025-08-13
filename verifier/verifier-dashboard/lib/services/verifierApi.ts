import axios from 'axios';
import { ProofRequestOffer, AgentStatus } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_VERIFIER_API_URL || 'http://localhost:4003';

class VerifierApiService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  async createAgeVerificationRequest(): Promise<ProofRequestOffer> {
    try {
      const response = await this.api.post('/proof-requests/age-verification');
      return response.data;
    } catch (error) {
      console.error('Error creating age verification request:', error);
      throw error;
    }
  }

  async createStudentVerificationRequest(): Promise<ProofRequestOffer> {
    try {
      const response = await this.api.post('/proof-requests/student-verification');
      return response.data;
    } catch (error) {
      console.error('Error creating student verification request:', error);
      throw error;
    }
  }

  async getAgentStatus(): Promise<AgentStatus> {
    try {
      const response = await this.api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching agent status:', error);
      throw error;
    }
  }

}

export const verifierApiService = new VerifierApiService();