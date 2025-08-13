export interface StoredCredential {
  credentialId: string;
  attributes: Record<string, string>;
  schemaId?: string;
  credentialDefinitionId?: string;
  issuedAt: Date;
  issuerId?: string;
  definitionType?: string;
  schemaName?: string;
}

export interface AgentStatus {
  initialized: boolean;
  connections: number;
  credentials: number;
}