export interface NetworkStats {
  totalDids: number;
  totalResources: number;
  activeValidators: number;
  transactionVolume: number;
}


export interface ValidatorInfo {
  moniker: string;
  operatorAddress: string;
  votingPower: number;
  commission: number;
  status: string;
}

export interface RecentTransaction {
  hash: string;
  type: string;
  height: number;
  timestamp: string;
  status: 'success' | 'failed';
  gasUsed: number;
  gasWanted: number;
  fee: string;
  sender: string;
  didId?: string;
  contentType: 'DID' | 'Schema' | 'Definition';
  contentId?: string;
  txIndex: number;
}

export interface NetworkHealth {
  blockHeight: number;
  syncingStatus: boolean;
  peersConnected: number;
  consensusState: string;
  latestBlockTime: string;
}

export interface NodeInfo {
  id: string;
  moniker: string;
  network: string;
  version: string;
  status: 'online' | 'offline' | 'syncing';
}

export interface UserData {
  name: string;
  greeting: string;
  subtitle: string;
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

export interface DashboardData {
  user: UserData;
  stats: NetworkStats;
  validators: ValidatorInfo[];
  recentTransactions: RecentTransaction[];
  networkHealth: NetworkHealth;
  nodeInfo: NodeInfo[];
  recentDids: DidDocument[];
  recentResources: ResourceData[];
  connectionStatus: ConnectionStatus;
}

