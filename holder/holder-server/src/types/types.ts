import { AnonCredsRequestedAttribute } from "@credo-ts/anoncreds";

export interface CredentialData {
  credentialId: string;
  attributes: Record<string, string>;
  schemaId?: string;
  credentialDefinitionId?: string;
  issuedAt: Date;
  issuerDid?: string;
  issuerId?: string;
  definitionType?: string;
  schemaName?: string;
}

export interface ProofRequestData {
  proofRequestId: string;
  connectionId: string;
  requestedAt: Date;
  name: string;
  version: string;
  requestedAttributes: Record<string, AnonCredsRequestedAttribute>;
  requestedPredicates?: Record<string, AnonCredsRequestedAttribute>;
}
