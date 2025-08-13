export interface StudentCredential {
  name: string;
  studentId: string;
  university: string;
  isStudent: boolean;
  birthDate: number;
}

export interface IssuedCredential {
  credentialId: string;
  studentName: string;
  studentId: string;
  university: string;
  issuedAt: Date;
  attributes: Record<string, string>;
  schemaId?: string;
  credentialDefinitionId?: string;
  schemaName?: string;
  definitionType?: string;
}

export interface PendingCredential {
  id: string;
  studentName: string;
  studentId: string;
  university: string;
  birthDate: number;
  isStudent: boolean;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending';
  invitationUrl?: string;
}

export interface CredentialOffer {
  invitationUrl: string;
  recordId: string;
  studentInfo: StudentCredential;
}

export interface AgentStatus {
  schemaId?: string;
  credentialDefinitionId?: string;
  initialized: boolean;
}

export interface ApiStatus {
  status: string;
  agent: AgentStatus;
  timestamp: string;
}