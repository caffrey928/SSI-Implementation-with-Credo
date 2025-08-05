export interface StudentCredential {
  id: string;
  name: string;
  studentId: string;
  university: string;
  isStudent: boolean;
  birthDate: string;
}

export interface CredentialData {
  credentialId: string;
  attributes: Record<string, string>;
  schemaId?: string;
  credentialDefinitionId?: string;
  issuedAt: Date;
  issuerDid?: string;
}

export interface ProofRequest {
  name: string;
  version: string;
  requestedAttributes: Record<string, {
    name: string;
    restrictions?: Array<{
      cred_def_id?: string;
      schema_id?: string;
      issuer_did?: string;
    }>;
  }>;
}

export interface ConnectionInfo {
  connectionId: string;
  theirLabel?: string;
  state: string;
  createdAt: Date;
}