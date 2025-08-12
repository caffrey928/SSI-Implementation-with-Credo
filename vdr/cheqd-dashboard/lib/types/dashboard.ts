export interface NetworkStats {
  totalDids: number;
  totalSchemas: number;
  totalDefinitions: number;
  activeValidators: number;
}



export interface RecentTransaction {
  hash: string;
  height: number;
  timestamp: string;
  status: 'success' | 'failed';
  sender: string;
  contentType: 'DID' | 'Schema' | 'Definition';
  contentId?: string;
}

export interface UserData {
  greeting: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isUsingMockData: boolean;
  networkType: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
  publicKeyBase58?: string;
}

export interface DidDocument {
  id: string;
  controller: string[];
  verificationMethod: VerificationMethod[];
  authentication: string[];
  created: string;
  updated: string;
  blockHeight: number;
  transactionHash: string;
}

export interface ResourceData {
  collectionId: string;
  id: string;
  name: string;
  resourceType: 'DID' | 'Schema' | 'Definition';
  mediaType: string;
  created: string;
  checksum: string;
  blockHeight: number;
  transactionHash: string;
  content?: Record<string, unknown>; // Actual schema or definition content
  relatedSchemaId?: string; // For definitions, link to their schema
  attributes?: string[]; // Schema attributes
  tag?: string; // Definition tag
}

export interface BlockInfo {
  height: number;
  hash: string;
  proposer: string;
  timestamp: string;
  txCount: number;
}

export interface ActiveValidator {
  name: string;
  address: string;
  status: string;
  votingPower: string;
}

export interface DashboardData {
  user: UserData;
  stats: NetworkStats;
  recentTransactions: RecentTransaction[];
  activeValidators: ActiveValidator[];
  connectionStatus: ConnectionStatus;
}

// API Response Types
export interface RpcResponse<T = unknown> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: string;
  };
}

export interface StatusResponse {
  sync_info: {
    latest_block_height: string;
    latest_block_time: string;
    catching_up: boolean;
    num_peers?: string;
  };
  validator_info: {
    voting_power: number;
  };
}

export interface BlockResponse {
  block: {
    header: {
      height: string;
      time: string;
      proposer_address?: string;
      last_block_id?: {
        hash: string;
      };
      hash?: string;
    };
    data?: {
      txs?: unknown[];
    };
  };
}

export interface ValidatorInfo {
  address: string;
  voting_power: string;
  jailed?: boolean;
}

export interface ValidatorsResponse {
  validators: ValidatorInfo[];
}

export interface TransactionSearchResponse {
  txs: TransactionData[];
  total_count: string;
}

export interface TransactionData {
  hash: string;
  height: string;
  tx: string;
  tx_result: {
    code: number;
    events: TransactionEvent[];
  };
  timestamp?: string;
}

export interface TransactionEvent {
  type: string;
  attributes: TransactionAttribute[];
}

export interface TransactionAttribute {
  key: string;
  value: string;
}

