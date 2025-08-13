import axios from 'axios';
import { StoredCredential, AgentStatus } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_HOLDER_API_URL || 'http://localhost:4002';

class HolderApiService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  async getStoredCredentials(): Promise<StoredCredential[]> {
    try {
      const response = await this.api.get('/credentials');
      return response.data;
    } catch (error) {
      console.error('Error fetching stored credentials:', error);
      throw error;
    }
  }

  async receiveInvitation(invitationUrl: string): Promise<any> {
    try {
      const response = await this.api.post('/receive-invitation', {
        invitationUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error receiving invitation:', error);
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

export const holderApiService = new HolderApiService();