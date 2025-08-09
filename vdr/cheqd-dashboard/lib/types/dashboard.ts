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

export interface NetworkHealth {
  blockHeight: number;
  syncingStatus: boolean;
  peersConnected: number;
  consensusState: string;
  latestBlockTime: string;
  consensusStep?: string;
  consensusRound?: number;
}


export interface UserData {
  greeting: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isUsingMockData: boolean;
  networkType: string;
}

export interface DidDocument {
  id: string;
  controller: string[];
  verificationMethod: any[];
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
  resourceType: 'Schema' | 'Definition';
  mediaType: string;
  created: string;
  checksum: string;
  blockHeight: number;
  transactionHash: string;
  content?: any; // Actual schema or definition content
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
  proposer_priority: string;
  votingPower: string;
}

export interface DashboardData {
  user: UserData;
  stats: NetworkStats;
  recentTransactions: RecentTransaction[];
  activeValidators: ActiveValidator[];
  networkHealth: NetworkHealth;
  connectionStatus: ConnectionStatus;
}

