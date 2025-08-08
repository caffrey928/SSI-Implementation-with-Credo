export interface StudentCredential {
  id: string;
  name: string;
  studentId: string;
  university: string;
  isStudent: boolean;
  birthDate: string;
}

export interface ProofRequest {
  name: string;
  version: string;
  requestedAttributes: Record<string, {
    name: string;
    restrictions?: Array<{
      cred_def_id?: string;
      schema_id?: string;
    }>;
  }>;
  requestedPredicates?: Record<string, {
    name: string;
    p_type: "<=" | ">=" | ">" | "<";
    p_value: number;
    restrictions?: Array<{
      cred_def_id?: string;
      schema_id?: string;
    }>;
  }>;
}
