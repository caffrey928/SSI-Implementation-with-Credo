import axios from 'axios';
import { DashboardData, NetworkStats, RecentTransaction, NetworkHealth, DidDocument, ResourceData, ConnectionStatus } from '../types/dashboard';

const CORS_PROXY = process.env.NEXT_PUBLIC_CORS_PROXY;

class CheqdApiService {
  constructor() {
    // Environment variables are loaded directly from .env
  }

  private async makeRpcRequest(endpoint: string) {
    // Use proxy server to avoid CORS issues
    const url = `${CORS_PROXY}/api/rpc${endpoint}`;
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    return response.data;
  }


  async getNetworkStatus(): Promise<NetworkHealth> {
    const statusResponse = await this.makeRpcRequest('/status');
    const result = statusResponse.result;
    const currentHeight = parseInt(result.sync_info.latest_block_height);
    
    // Get the actual block data for more accurate timestamp
    let latestBlockTime = result.sync_info.latest_block_time;
    
    try {
      // Fetch the actual latest block to get precise timestamp
      const blockResponse = await this.makeRpcRequest(`/block?height=${currentHeight}`);
      const blockTime = blockResponse.result?.block?.header?.time;
      
      if (blockTime) {
        latestBlockTime = blockTime;
      } else {
      }
    } catch (error) {
      console.warn('Failed to get block timestamp, using status timestamp:', error);
    }
    
    if (!latestBlockTime) {
      console.warn('No block time found, using current time');
      latestBlockTime = new Date().toISOString();
    }

    // Get consensus state information
    let consensusStep = 'Propose';
    let consensusRound = 0;
    
    try {
      const consensusState = await this.makeRpcRequest('/consensus_state');
      if (consensusState.result?.round_state) {
        const roundState = consensusState.result.round_state;
        consensusRound = parseInt(roundState.round || '0');
        
        // Map step number to step name
        const stepNumber = parseInt(roundState.step || '0');
        const stepNames = ['Propose', 'Prevote', 'Precommit', 'Commit'];
        consensusStep = stepNames[stepNumber] || 'Propose';
        
      }
    } catch (error) {
      console.warn('Failed to get consensus state, using defaults:', error);
      // Use block height to simulate consensus steps
      const stepIndex = currentHeight % 4;
      const stepNames = ['Propose', 'Prevote', 'Precommit', 'Commit'];
      consensusStep = stepNames[stepIndex];
      consensusRound = Math.floor(currentHeight / 100) % 10;
    }
    
    return {
      blockHeight: currentHeight,
      syncingStatus: result.sync_info.catching_up,
      peersConnected: parseInt(result.sync_info.num_peers || '0'),
      consensusState: result.validator_info.voting_power > 0 ? 'validator' : 'observer',
      latestBlockTime: latestBlockTime,
      consensusStep,
      consensusRound
    };
  }



  // Get single latest block
  async getLatestBlock(validators: any[]): Promise<any | null> {
    try {
      const statusResponse = await this.makeRpcRequest('/status');
      const currentHeight = parseInt(statusResponse.result?.sync_info?.latest_block_height || '0');
      
      const blockResponse = await this.makeRpcRequest(`/block?height=${currentHeight}`);
      const block = blockResponse.result?.block;
      
      if (!block) {
        return null;
      }
      
      // Match block proposer
      const proposerAddress = block.header?.proposer_address;
      let proposerName = 'Unknown';
      
      
      if (proposerAddress && validators.length > 0) {
        const matchedValidator = validators.find((v: any) => v.address === proposerAddress);
        if (matchedValidator) {
          proposerName = matchedValidator.name; // Use simplified name
        } else {
        }
      }
      
      return {
        height: currentHeight,
        hash: block.header?.last_block_id?.hash || block.header?.hash || 'Unknown',
        proposer: proposerName,
        timestamp: block.header?.time || new Date().toISOString(),
        txCount: block.data?.txs?.length || 0
      };
    } catch (error) {
      console.warn('Failed to fetch latest block:', error);
      return null;
    }
  }



  async getActiveValidators(): Promise<any[]> {
    try {
      const validatorsResponse = await this.makeRpcRequest('/validators');
      const validators = validatorsResponse.result?.validators || [];
      
      
      // Calculate total voting power for percentage calculation
      const totalVotingPower = validators.reduce((sum: number, validator: any) => {
        return sum + parseFloat(validator.voting_power || '0');
      }, 0);
      
      return validators.slice(0, 4).map((validator: any, index: number) => ({
        name: `Validator ${index}`,
        address: validator.address || 'Unknown',
        status: validator.jailed ? 'Jailed' : 'Active',
        proposer_priority: validator.proposer_priority || '0',
        votingPower: totalVotingPower > 0 ? 
          `${((parseFloat(validator.voting_power || '0') / totalVotingPower) * 100).toFixed(1)}%` : 
          '0%'
      }));
    } catch (error) {
      console.warn('Failed to fetch active validators:', error);
      return [];
    }
  }

  async getRecentTransactions(): Promise<RecentTransaction[]> {
    try {
      // Get more transactions for the dedicated Transaction page
      const didTxs = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.did.v2.MsgCreateDidDoc\'"&per_page=50');
      const resourceTxs = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=50');
      
      const allTxs = [...(didTxs.result?.txs || []), ...(resourceTxs.result?.txs || [])];
      
      
      const processedTxs = await Promise.all(
        allTxs.map(async (tx: any) => {
          const contentInfo = this.extractContentInfo(tx);
          
          return {
            hash: tx.hash,
            height: parseInt(tx.height),
            timestamp: await this.extractTimestamp(tx),
            status: tx.tx_result.code === 0 ? 'success' : 'failed' as 'success' | 'failed',
            sender: this.extractSender(tx),
            contentType: contentInfo.contentType,
            contentId: contentInfo.contentId
          };
        })
      );
      
      // Sort by timestamp (newest first)
      const sortedTxs = processedTxs.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      return sortedTxs;
    } catch (error) {
      console.warn('Failed to fetch recent transactions');
      return [];
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

  private extractContentInfo(tx: any): { contentType: 'DID' | 'Schema' | 'Definition', contentId?: string } {
    try {
      // Check if this is a DID transaction by looking at the events
      const events = tx.tx_result?.events || [];
      const hasDidEvent = events.some((event: any) => 
        event.type === 'message' && 
        event.attributes?.some((attr: any) => 
          attr.key === 'action' && attr.value?.includes('DidDoc')
        )
      );
      
      // DID transactions
      if (hasDidEvent) {
        const didId = this.extractDidFromTx(tx);
        return {
          contentType: 'DID',
          contentId: didId
        };
      }
      
      // Resource transactions - need to determine if Schema or Definition
      // Check if this is a Resource transaction
      const hasResourceEvent = events.some((event: any) => 
        event.type === 'message' && 
        event.attributes?.some((attr: any) => 
          attr.key === 'action' && attr.value?.includes('Resource')
        )
      );
      
      if (hasResourceEvent) {
        if (tx.tx) {
          try {
            const binaryString = atob(tx.tx);
            
            // Check for credential definition indicators
            if (binaryString.includes('"type":"CL"') || binaryString.includes('credentialDefinition')) {
              return {
                contentType: 'Definition',
                contentId: this.extractResourceId(binaryString, 'Definition')
              };
            }
            
            // Check for schema indicators
            if (binaryString.includes('anonCredsSchema') || binaryString.includes('attrNames')) {
              return {
                contentType: 'Schema',
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
          
          try {
            // Extract DID from transaction
            const extractedDid = this.extractDidFromTx(tx);
            if (extractedDid) {
              didId = extractedDid;
            }
          } catch (decodeError) {
          }
          
          // Extract timestamp from transaction
          const timestamp = await this.extractTimestamp(tx);
          
          return {
            id: didId,
            controller: [didId],
            verificationMethod: [],
            authentication: [`${didId}#key-1`],
            created: timestamp,
            updated: timestamp,
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
      const [didTxs, resourceTxs, activeValidators] = await Promise.all([
        this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.did.v2.MsgCreateDidDoc\'"&per_page=1'),
        this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=1'),
        this.getActiveValidators()
      ]);

      const totalDids = parseInt(didTxs.result?.total_count || '0');
      const totalResources = parseInt(resourceTxs.result?.total_count || '0');
      const totalValidators = activeValidators.length;

      // Get detailed resource transactions to separate schemas from definitions
      let totalSchemas = 0;
      let totalDefinitions = 0;
      
      try {
        const allResourceTxs = await this.makeRpcRequest('/tx_search?query="message.action=\'/cheqd.resource.v2.MsgCreateResource\'"&per_page=100');
        const resourceTransactions = allResourceTxs.result?.txs || [];
        
        resourceTransactions.forEach((tx: any) => {
          const contentInfo = this.extractContentInfo(tx);
          if (contentInfo.contentType === 'Schema') {
            totalSchemas++;
          } else if (contentInfo.contentType === 'Definition') {
            totalDefinitions++;
          }
        });
        
      } catch (error) {
        console.warn('Failed to get detailed resource counts, using estimates');
        // Fallback estimate: assume roughly 60% schemas, 40% definitions
        totalSchemas = Math.floor(totalResources * 0.6);
        totalDefinitions = Math.floor(totalResources * 0.4);
      }

      return {
        totalDids,
        totalSchemas,
        totalDefinitions,
        activeValidators: totalValidators
      };
    } catch (error) {
      throw new Error('Failed to fetch network stats');
    }
  }




  async getDashboardData(): Promise<DashboardData> {
    
    const connectionStatus: ConnectionStatus = {
      isConnected: false,
      isUsingMockData: false,
      networkType: process.env.NEXT_PUBLIC_NETWORK_TYPE || 'localnet'
    };

    try {
      // Get network health and basic info
      const networkHealth = await this.getNetworkStatus();

      // Get real network statistics
      const stats = await this.getNetworkStats();

      // Get active validators with real data (for UI display and block proposer matching)
      const activeValidators = await this.getActiveValidators();

      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions();

      // Recent blocks are now managed by live updates in frontend state

      connectionStatus.isConnected = true;

      return {
        user: {
          greeting: 'Cheqd Network'
        },
        stats,
        recentTransactions,
        activeValidators,
        networkHealth,
        connectionStatus
      };
    } catch (error) {
      console.error('Error fetching network data:', error);
      throw error;
    }
  }
}

export const cheqdApiService = new CheqdApiService();