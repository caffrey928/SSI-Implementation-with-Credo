import axios from 'axios';
import { StudentCredential, IssuedCredential, PendingCredential, CredentialOffer, ApiStatus } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_ISSUER_API_URL || 'http://localhost:4001';

class IssuerApiService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  async issueCredential(studentData: StudentCredential): Promise<CredentialOffer> {
    try {
      const response = await this.api.post('/credentials/issue', studentData);
      return response.data;
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw error;
    }
  }

  async getIssuedCredentials(): Promise<IssuedCredential[]> {
    try {
      const response = await this.api.get('/credentials/issued');
      return response.data;
    } catch (error) {
      console.error('Error fetching issued credentials:', error);
      throw error;
    }
  }

  async getPendingCredentials(): Promise<PendingCredential[]> {
    try {
      const response = await this.api.get('/credentials/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending credentials:', error);
      throw error;
    }
  }

  async getStatus(): Promise<ApiStatus> {
    try {
      const response = await this.api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error;
    }
  }
}

export const issuerApiService = new IssuerApiService();