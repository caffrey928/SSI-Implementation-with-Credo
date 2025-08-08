import axios from 'axios';
import { DashboardData, NetworkStats, ValidatorInfo, RecentTransaction, NetworkHealth, NodeInfo, DidDocument, ResourceData, ConnectionStatus } from '../types/dashboard';

const RPC_URL = process.env.REACT_APP_CHEQD_RPC_URL || 'http://localhost:27157';
const REST_URL = process.env.REACT_APP_CHEQD_REST_URL || 'http://localhost:1817';
const CORS_PROXY = process.env.REACT_APP_CORS_PROXY || 'http://localhost:3030';

class CheqdApiService {
  private rpcUrl: string;
  private restUrl: string;
  private corsProxy: string;

  constructor() {
    this.rpcUrl = RPC_URL;
    this.restUrl = REST_URL;
    this.corsProxy = CORS_PROXY;
  }

  private async makeRpcRequest(endpoint: string) {
    // Use proxy server to avoid CORS issues
    const url = `http://localhost:3031/api/rpc${endpoint}`;
    console.log(`Making RPC request to: ${url}`);
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`RPC response status: ${response.status}`);
    return response.data;
  }

  private async makeRestRequest(endpoint: string) {
    try {
      // Try direct connection first, then through CORS proxy if needed
      let url = `${this.restUrl}${endpoint}`;
      console.log(`Making REST request to: ${url}`);
      
      try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data;
      } catch (directError) {
        console.log('Direct REST connection failed, trying CORS proxy...');
        url = `${this.corsProxy}/${this.restUrl}${endpoint}`;
        const response = await axios.get(url, { timeout: 5000 });
        return response.data;
      }
    } catch (error) {
      console.error(`REST request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getNetworkStatus(): Promise<NetworkHealth> {
    const statusResponse = await this.makeRpcRequest('/status');
    const result = statusResponse.result;
    
    return {
      blockHeight: parseInt(result.sync_info.latest_block_height),
      syncingStatus: result.sync_info.catching_up,
      peersConnected: parseInt(result.sync_info.num_peers || '0'),
      consensusState: result.validator_info.voting_power > 0 ? 'validator' : 'observer',
      latestBlockTime: result.sync_info.latest_block_time
    };
  }

  async getValidators(): Promise<ValidatorInfo[]> {
    try {
      const validatorsResponse = await this.makeRpcRequest('/validators');
      const validators = validatorsResponse.result.validators;
      
      return validators.map((validator: any, index: number) => ({
        moniker: validator.description?.moniker || `Validator ${index}`,
        operatorAddress: validator.operator_address || `validator${index}`,
        votingPower: parseFloat(validator.voting_power) / 1000000, // Convert to percentage
        commission: parseFloat(validator.commission?.commission_rates?.rate || '0.05'),
        status: validator.jailed ? 'jailed' : 'bonded'
      }));
    } catch (error) {
      console.warn('Failed to fetch validators, using mock data');
      return [];
    }
  }

  async getRecentTransactions(): Promise<RecentTransaction[]> {
    try {
      // Get more transactions for the dedicated Transaction page
      const didTxs = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.did.v2.MsgCreateDidDoc\'"&per_page=50');
      const resourceTxs = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=50');
      
      const allTxs = [...(didTxs.result?.txs || []), ...(resourceTxs.result?.txs || [])];
      
      console.log(`Found ${allTxs.length} transactions total`);
      
      const processedTxs = await Promise.all(
        allTxs.map(async (tx: any) => {
          const contentInfo = this.extractContentInfo(tx);
          console.log(`Processing TX ${tx.hash.substring(0, 8)}: ${contentInfo.contentType} - ${contentInfo.contentId || 'No ID'}`);
          
          return {
            hash: tx.hash,
            type: this.extractMessageType(tx),
            height: parseInt(tx.height),
            timestamp: await this.extractTimestamp(tx),
            status: tx.tx_result.code === 0 ? 'success' : 'failed' as 'success' | 'failed',
            gasUsed: parseInt(tx.tx_result.gas_used || '0'),
            gasWanted: parseInt(tx.tx_result.gas_wanted || '0'),
            fee: this.extractFee(tx),
            sender: this.extractSender(tx),
            didId: contentInfo.didId,
            contentType: contentInfo.contentType,
            contentId: contentInfo.contentId,
            txIndex: parseInt(tx.index || '0')
          };
        })
      );
      
      // Sort by timestamp (newest first)
      const sortedTxs = processedTxs.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      console.log(`Returning ${sortedTxs.length} processed and sorted transactions`);
      return sortedTxs;
    } catch (error) {
      console.warn('Failed to fetch recent transactions');
      return [];
    }
  }

  private extractMessageType(tx: any): string {
    try {
      const events = tx.tx_result.events || [];
      for (const event of events) {
        if (event.type === 'message') {
          const actionAttr = event.attributes.find((attr: any) => attr.key === 'action');
          if (actionAttr) {
            return actionAttr.value.split('.').pop() || 'Unknown';
          }
        }
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private async extractTimestamp(tx: any): Promise<string> {
    try {
      // First try to get timestamp from the transaction itself
      if (tx.timestamp) {
        return tx.timestamp;
      }

      // If no timestamp, get it from the block
      const blockHeight = tx.height;
      if (blockHeight) {
        try {
          const blockResponse = await this.makeRpcRequest(`/block?height=${blockHeight}`);
          const blockTime = blockResponse.result?.block?.header?.time;
          if (blockTime) {
            return blockTime;
          }
        } catch (blockError) {
          console.warn(`Failed to get block time for height ${blockHeight}`);
        }
      }

      // Fallback: estimate based on block height (assuming 6 seconds per block)
      const currentStatus = await this.makeRpcRequest('/status');
      const currentHeight = parseInt(currentStatus.result?.sync_info?.latest_block_height || '0');
      const currentTime = new Date(currentStatus.result?.sync_info?.latest_block_time || new Date());
      
      const blockDiff = currentHeight - parseInt(blockHeight);
      const timeDiff = blockDiff * 6 * 1000; // 6 seconds per block in milliseconds
      const estimatedTime = new Date(currentTime.getTime() - timeDiff);
      
      return estimatedTime.toISOString();
    } catch (error) {
      console.warn('Failed to extract timestamp, using current time');
      return new Date().toISOString();
    }
  }

  private extractFee(tx: any): string {
    try {
      // Look for fee in events
      const events = tx.tx_result?.events || [];
      for (const event of events) {
        if (event.type === 'tx') {
          const feeAttr = event.attributes?.find((attr: any) => attr.key === 'fee');
          if (feeAttr && feeAttr.value) {
            return feeAttr.value;
          }
        }
      }
      return '0ncheq';
    } catch (error) {
      return '0ncheq';
    }
  }

  private extractSender(tx: any): string {
    try {
      // Look for sender in message events
      const events = tx.tx_result?.events || [];
      for (const event of events) {
        if (event.type === 'message') {
          const senderAttr = event.attributes?.find((attr: any) => attr.key === 'sender');
          if (senderAttr && senderAttr.value) {
            return senderAttr.value;
          }
        }
      }
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  private extractContentInfo(tx: any): { contentType: 'DID' | 'Schema' | 'Definition', didId?: string, contentId?: string } {
    try {
      const messageType = this.extractMessageType(tx);
      
      // DID transactions
      if (messageType.includes('DidDoc')) {
        const didId = this.extractDidFromTx(tx);
        return {
          contentType: 'DID',
          didId: didId,
          contentId: didId
        };
      }
      
      // Resource transactions - need to determine if Schema or Definition
      if (messageType.includes('Resource')) {
        if (tx.tx) {
          try {
            const binaryString = atob(tx.tx);
            
            // Check for credential definition indicators
            if (binaryString.includes('"type":"CL"') || binaryString.includes('credentialDefinition')) {
              const didId = this.extractDidFromTx(tx);
              return {
                contentType: 'Definition',
                didId: didId,
                contentId: this.extractResourceId(binaryString, 'Definition')
              };
            }
            
            // Check for schema indicators
            if (binaryString.includes('anonCredsSchema') || binaryString.includes('attrNames')) {
              const didId = this.extractDidFromTx(tx);
              return {
                contentType: 'Schema',
                didId: didId,
                contentId: this.extractResourceId(binaryString, 'Schema')
              };
            }
          } catch (error) {
            console.warn('Failed to parse resource transaction:', error);
          }
        }
        
        // Default to Schema for resource transactions
        return {
          contentType: 'Schema',
          contentId: undefined
        };
      }
      
      // Default fallback
      return {
        contentType: 'DID',
        contentId: undefined
      };
    } catch (error) {
      console.warn('Failed to extract content info:', error);
      return {
        contentType: 'DID',
        contentId: undefined
      };
    }
  }

  private extractDidFromTx(tx: any): string | undefined {
    try {
      if (tx.tx) {
        const binaryString = atob(tx.tx);
        
        // Use a more specific pattern that works with binary data
        const didMatch = binaryString.match(/did:cheqd:testnet:[a-f0-9\-]{36}/);
        if (didMatch) {
          return didMatch[0];
        }
        
        // Fallback: try with broader pattern
        const broadMatch = binaryString.match(/did:cheqd:[^"'\s\x00\x1A\x12]+/);
        if (broadMatch) {
          return broadMatch[0].replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractResourceId(binaryString: string, type: 'Schema' | 'Definition'): string | undefined {
    try {
      if (type === 'Schema') {
        // Look for schema name
        const nameMatch = binaryString.match(/"name":"([^"]+)"/);
        if (nameMatch) {
          return nameMatch[1];
        }
      } else if (type === 'Definition') {
        // Look for credential definition tag
        const tagMatch = binaryString.match(/"tag":"([^"]+)"/);
        if (tagMatch) {
          return `CL Definition (${tagMatch[1]})`;
        }
        return 'CL Definition';
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  async getDidDocuments(): Promise<DidDocument[]> {
    try {
      const response = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.did.v2.MsgCreateDidDoc\'"&per_page=50');
      const txs = response.result?.txs || [];
      
      const didDocuments = await Promise.all(
        txs.map(async (tx: any) => {
          let didId = `did:cheqd:testnet:${tx.hash.substring(0, 16)}`;
          let didDocument = null;
          
          try {
            // Extract DID from transaction
            const extractedDid = this.extractDidFromTx(tx);
            if (extractedDid) {
              didId = extractedDid;
              
              // Try to fetch complete DID document from REST API
              try {
                const didResponse = await this.makeRestRequest(`/cheqd/did/v2/did-documents/${encodeURIComponent(didId)}`);
                if (didResponse?.didDocument) {
                  didDocument = didResponse.didDocument;
                }
              } catch (restError) {
                console.log(`Could not fetch DID document for ${didId} from REST API`);
              }
            }
          } catch (decodeError) {
            console.log('Could not decode transaction data, using fallback DID');
          }
          
          // Extract timestamp from transaction
          const timestamp = await this.extractTimestamp(tx);
          
          return {
            id: didId,
            controller: didDocument?.controller || [didId],
            verificationMethod: didDocument?.verificationMethod || [],
            authentication: didDocument?.authentication || [`${didId}#key-1`],
            created: didDocument?.created || timestamp,
            updated: didDocument?.updated || timestamp,
            blockHeight: parseInt(tx.height),
            transactionHash: tx.hash
          };
        })
      );
      
      // Sort by block height (newest first)
      return didDocuments.sort((a, b) => b.blockHeight - a.blockHeight);
    } catch (error) {
      console.warn('Failed to fetch DID documents');
      return [];
    }
  }

  async getResources(): Promise<ResourceData[]> {
    try {
      const response = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=50');
      const txs = response.result?.txs || [];
      
      const resources = await Promise.all(
        txs.map(async (tx: any) => {
          const contentInfo = this.extractContentInfo(tx);
          const didId = this.extractDidFromTx(tx);
          const timestamp = await this.extractTimestamp(tx);
          
          let content = null;
          let attributes: string[] = [];
          let relatedSchemaId: string | undefined;
          let tag: string | undefined;
          let name = 'Unknown Resource';
          
          try {
            if (tx.tx) {
              const binaryString = atob(tx.tx);
              
              if (contentInfo.contentType === 'Schema') {
                // Extract schema details
                const nameMatch = binaryString.match(/"name":"([^"]+)"/);
                if (nameMatch) name = nameMatch[1];
                
                const versionMatch = binaryString.match(/"version":"([^"]+)"/);
                const version = versionMatch ? versionMatch[1] : '1.0';
                
                // Extract attribute names
                const attrMatch = binaryString.match(/"attrNames":\[([^\]]+)\]/);
                if (attrMatch) {
                  attributes = attrMatch[1]
                    .split(',')
                    .map(attr => attr.replace(/["\s]/g, ''))
                    .filter(attr => attr.length > 0);
                }
                
                name = `${name} v${version}`;
              } else if (contentInfo.contentType === 'Definition') {
                // Extract definition details
                const tagMatch = binaryString.match(/"tag":"([^"]+)"/);
                if (tagMatch) {
                  tag = tagMatch[1];
                  name = `Credential Definition (${tag})`;
                }
                
                // Try to find related schema ID
                const schemaIdMatch = binaryString.match(/"schemaId":"([^"]+)"/);
                if (schemaIdMatch) {
                  relatedSchemaId = schemaIdMatch[1];
                } else {
                  // Look for schema reference in the transaction
                  const schemaRefMatch = binaryString.match(/did:cheqd:[^"'\s\x00\x1A\x12]+/g);
                  if (schemaRefMatch && schemaRefMatch.length > 1) {
                    relatedSchemaId = schemaRefMatch[1]; // First is usually the DID, second might be schema
                  }
                }
              }
              
              // Try to extract some content for display
              try {
                // Look for JSON-like structures in the binary data
                const jsonMatch = binaryString.match(/\{[^{}]*"[^"]+"\s*:[^{}]*\}/);
                if (jsonMatch) {
                  content = { preview: jsonMatch[0].substring(0, 200) + '...' };
                }
              } catch (contentError) {
                console.log('Could not extract content preview');
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse resource details:', parseError);
          }
          
          return {
            collectionId: didId || `did:cheqd:testnet:${tx.hash.substring(0, 16)}`,
            id: `${contentInfo.contentType.toLowerCase()}-${tx.hash.substring(0, 8)}`,
            name,
            resourceType: contentInfo.contentType,
            mediaType: 'application/json',
            created: timestamp,
            checksum: tx.hash.substring(0, 32),
            blockHeight: parseInt(tx.height),
            transactionHash: tx.hash,
            content,
            relatedSchemaId,
            attributes,
            tag
          };
        })
      );
      
      // Sort by block height (newest first)
      return resources.sort((a, b) => b.blockHeight - a.blockHeight);
    } catch (error) {
      console.warn('Failed to fetch resources');
      return [];
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const [didTxs, resourceTxs, validators] = await Promise.all([
        this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.did.v2.MsgCreateDidDoc\'"&per_page=1'),
        this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=1'),
        this.getValidators()
      ]);

      const totalDids = parseInt(didTxs.result?.total_count || '0');
      const totalResources = parseInt(resourceTxs.result?.total_count || '0');
      const totalValidators = validators.length;

      // Get recent transaction count for volume
      const recentTxs = await this.makeRpcRequest('/tx_search?query="tx.height>0"&per_page=100');
      const transactionVolume = parseInt(recentTxs.result?.total_count || '0');

      return {
        totalDids,
        totalResources,
        activeValidators: totalValidators,
        transactionVolume
      };
    } catch (error) {
      throw new Error('Failed to fetch network stats');
    }
  }


  async getNodeInfo(): Promise<NodeInfo[]> {
    try {
      const statusResponse = await this.makeRpcRequest('/status');
      const result = statusResponse.result;
      
      return [{
        id: result.node_info.id,
        moniker: result.node_info.moniker,
        network: result.node_info.network,
        version: result.node_info.version,
        status: result.sync_info.catching_up ? 'syncing' : 'online' as 'online' | 'offline' | 'syncing'
      }];
    } catch (error) {
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connectivity to cheqd network via proxy...');
      console.log(`Proxy URL: http://localhost:3031/api/rpc`);
      
      // Try to get basic status first
      const statusResponse = await this.makeRpcRequest('/status');
      console.log('Successfully connected to RPC endpoint');
      console.log('Network ID:', statusResponse.result?.node_info?.network);
      return true;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    console.log('Attempting to connect to cheqd network...');
    
    // Test basic connectivity first
    await this.testConnection();
    
    const connectionStatus: ConnectionStatus = {
      isConnected: false,
      isUsingMockData: false,
      networkType: process.env.REACT_APP_NETWORK_TYPE || 'localnet'
    };

    try {
      // Get network health and basic info
      console.log('Getting network status...');
      const networkHealth = await this.getNetworkStatus();
      console.log('Network status retrieved successfully');

      // Get node info
      const nodeInfo = await this.getNodeInfo();

      // Get real network statistics
      const stats = await this.getNetworkStats();

      // Get validators
      const validators = await this.getValidators();

      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions();

      // Get DIDs and Resources
      const recentDids = await this.getDidDocuments();
      const recentResources = await this.getResources();


      connectionStatus.isConnected = true;
      console.log('Successfully connected to cheqd network');

      return {
        user: {
          name: '',
          greeting: 'Cheqd Network',
          subtitle: `Live network data from ${networkHealth.consensusState === 'validator' ? 'validator' : 'full'} node`
        },
        stats,
        validators,
        recentTransactions,
        networkHealth,
        nodeInfo,
        recentDids,
        recentResources,
        connectionStatus
      };
    } catch (error) {
      console.error('Error fetching network data:', error);
      throw error;
    }
  }
}

export const cheqdApiService = new CheqdApiService();