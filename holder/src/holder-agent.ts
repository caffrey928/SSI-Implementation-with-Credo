import {
  Agent,
  HttpOutboundTransport,
  WsOutboundTransport,
  CredentialEventTypes,
  CredentialState,
  DidExchangeState,
  ConnectionEventTypes,
  CredentialExchangeRecord,
  ConnectionRecord,
  CredentialsModule,
  V2CredentialProtocol,
  DidsModule,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
} from "@credo-ts/anoncreds";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import {
  CheqdAnonCredsRegistry,
  CheqdModule,
  CheqdDidRegistrar,
  CheqdDidResolver,
} from "@credo-ts/cheqd";

import { createBaseAgent } from "./utils";
import { CredentialData, ConnectionInfo } from "./types";
import { HttpInboundTransport } from "@credo-ts/node";

export class HolderAgent {
  private agent!: Agent<{
    askar: AskarModule;
    anoncreds: AnonCredsModule;
    dids: DidsModule;
    cheqd: CheqdModule;
    credentials: CredentialsModule<
      [V2CredentialProtocol<[AnonCredsCredentialFormatService]>]
    >;
  }>;
  private initialized = false;
  private credentials: Map<string, CredentialData> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();

  async initialize() {
    if (this.initialized) return;

    const baseConfig = await createBaseAgent({
      name: "Holder",
      port: 3002,
    });

    this.agent = new Agent({
      config: baseConfig.config,
      dependencies: agentDependencies,
      modules: {
        askar: new AskarModule({
          ariesAskar,
        }),
        anoncreds: new AnonCredsModule({
          anoncreds,
          registries: [new CheqdAnonCredsRegistry()],
        }),
        dids: new DidsModule({
          registrars: [new CheqdDidRegistrar()],
          resolvers: [new CheqdDidResolver()],
        }),
        cheqd: new CheqdModule({
          networks: [
            {
              network: "testnet",
              cosmosPayerSeed:
                "useful case library girl narrow plate knee side supreme base horror fence tent glass leaf okay budget chalk patch forum coil crunch employ need",
              rpcUrl: "http://localhost:26757",
            },
          ],
        }),
        credentials: new CredentialsModule({
          credentialProtocols: [
            new V2CredentialProtocol({
              credentialFormats: [new AnonCredsCredentialFormatService()],
            }),
          ],
        }),
      },
    });

    this.agent.registerOutboundTransport(new HttpOutboundTransport());
    this.agent.registerOutboundTransport(new WsOutboundTransport());

    this.agent.registerInboundTransport(
      new HttpInboundTransport({ port: 3002 })
    );

    await this.agent
      .initialize()
      .then(async () => {
        console.log("Holder Agent initialized!");
        this.setupEventListeners();
        this.initialized = true;
      })
      .catch((e) => {
        console.error(
          `Something went wrong while setting up the holder agent! Message: ${e}`
        );
        throw e;
      });
  }

  private setupEventListeners() {
    // 監聽連接狀態變化
    this.agent.events.on(
      ConnectionEventTypes.ConnectionStateChanged,
      async ({ payload }) => {
        const connectionRecord = payload.connectionRecord as ConnectionRecord;
        console.log(`Connection state changed: ${connectionRecord.state}`);

        if (connectionRecord.state === DidExchangeState.Completed) {
          console.log("Connection established with issuer!");

          // 儲存連接資訊
          const connectionInfo: ConnectionInfo = {
            connectionId: connectionRecord.id,
            theirLabel: connectionRecord.theirLabel,
            state: connectionRecord.state,
            createdAt: connectionRecord.createdAt,
          };
          this.connections.set(connectionRecord.id, connectionInfo);
        }
      }
    );

    // 監聽憑證狀態變化
    this.agent.events.on(
      CredentialEventTypes.CredentialStateChanged,
      async ({ payload }) => {
        const credentialRecord =
          payload.credentialRecord as CredentialExchangeRecord;
        console.log(`Credential state changed: ${credentialRecord.state}`);

        switch (credentialRecord.state) {
          case CredentialState.OfferReceived:
            console.log("Credential offer received, accepting...");
            await this.acceptCredentialOffer(credentialRecord);
            break;

          case CredentialState.CredentialReceived:
            console.log("Credential received, accepting...");
            await this.acceptCredential(credentialRecord);
            break;

          case CredentialState.Done:
            console.log("Credential process completed successfully");
            console.log(`Credential ID: ${credentialRecord.id}`);
            // Credo-TS automatically stores the credential, we just track it
            const credentialData: CredentialData = {
              credentialId: credentialRecord.id,
              attributes: {}, // Will be populated when we query the stored credential
              issuedAt: credentialRecord.createdAt,
            };
            this.credentials.set(credentialRecord.id, credentialData);
            
            // 清理相關連接（如果憑證發放完成後不需要保持連接）
            if (credentialRecord.connectionId) {
              console.log(`Credential received successfully from connection: ${credentialRecord.connectionId}`);
              // 注意：這裡不直接刪除連接，因為可能還會用到
              // 如果需要清理連接，可以取消註解下面的代碼
              this.connections.delete(credentialRecord.connectionId);
              console.log(`Cleaned up connection: ${credentialRecord.connectionId}`);
            }
            
            console.log(`Total credentials stored: ${this.credentials.size}`);
            console.log(`Active connections: ${this.connections.size}`);
            break;
        }
      }
    );

    // Proof handling will be added later
  }

  private async acceptCredentialOffer(
    credentialRecord: CredentialExchangeRecord
  ) {
    try {
      await this.agent.credentials.acceptOffer({
        credentialRecordId: credentialRecord.id,
      });
      console.log(
        `Credential offer accepted for record: ${credentialRecord.id}`
      );
    } catch (error) {
      console.error("Error accepting credential offer:", error);
      throw error;
    }
  }

  private async acceptCredential(
    credentialRecord: CredentialExchangeRecord
  ) {
    try {
      await this.agent.credentials.acceptCredential({
        credentialRecordId: credentialRecord.id,
      });
      console.log(
        `Credential accepted for record: ${credentialRecord.id}`
      );
    } catch (error) {
      console.error("Error accepting credential:", error);
      throw error;
    }
  }


  // 先移除proof handling，專注於credential接收

  async receiveInvitation(invitationUrl: string): Promise<void> {
    try {
      console.log("Receiving invitation...");
      await this.agent.oob.receiveInvitationFromUrl(invitationUrl);
      console.log("Invitation received, waiting for connection to establish...");
    } catch (error) {
      console.error("Error receiving invitation:", error);
      throw error;
    }
  }

  async getDid(): Promise<string> {
    try {
      const dids = await this.agent.dids.getCreatedDids();

      // 尋找 cheqd DID
      const cheqdDid = dids.find(did => did.did.startsWith('did:cheqd:'));
      if (cheqdDid) {
        console.log(`Using existing cheqd DID: ${cheqdDid.did}`);
        return cheqdDid.did;
      }

      // 如果沒有 cheqd DID，創建一個
      console.log("Creating new cheqd DID...");
      const didResult = await this.agent.dids.create({
        method: "cheqd",
        secret: {
          verificationMethod: {
            id: "key-1",
            type: "Ed25519VerificationKey2020",
          },
        },
        options: {
          network: "testnet",
          methodSpecificIdAlgo: "uuid",
        },
      });

      if (didResult.didState.state === "finished") {
        console.log(`Created new cheqd DID: ${didResult.didState.did}`);
        return didResult.didState.did!;
      } else {
        console.log("DID creation failed:", didResult.didState);
        return "DID creation failed";
      }
    } catch (error) {
      console.error("Error getting/creating DID:", error);
      return "Error creating DID";
    }
  }

  async getStoredCredentials(): Promise<CredentialData[]> {
    try {
      // 使用Credo-TS內建的API獲取所有憑證
      const credentialRecords = await this.agent.credentials.getAll();
      
      return credentialRecords
        .filter(record => record.role === 'holder')
        .map(record => ({
          credentialId: record.id,
          attributes: {}, // TODO: 從實際的credential中提取屬性
          schemaId: record.metadata.get('schemaId')?.toString(),
          credentialDefinitionId: record.metadata.get('credentialDefinitionId')?.toString(),
          issuedAt: record.createdAt,
          issuerDid: record.metadata.get('issuerId')?.toString(),
        }));
    } catch (error) {
      console.error("Error getting stored credentials:", error);
      return Array.from(this.credentials.values()); // fallback to local storage
    }
  }

  async getConnections(): Promise<ConnectionInfo[]> {
    return Array.from(this.connections.values());
  }

  async getCredentialById(
    credentialId: string
  ): Promise<CredentialData | undefined> {
    return this.credentials.get(credentialId);
  }

  getAgent(): Agent {
    return this.agent;
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }
    console.log("🚀 Holder Agent started successfully!");
    console.log(`📍 Listening on: http://localhost:3002`);
    console.log(`🔑 Holder DID: ${await this.getDid()}`);
    console.log(`📋 Stored credentials: ${this.credentials.size}`);
    console.log(`🔗 Active connections: ${this.connections.size}`);
  }

  async stop() {
    if (this.agent) {
      await this.agent.shutdown();
      console.log("Holder Agent stopped");
    }
  }

  async cleanupConnection(connectionId: string): Promise<boolean> {
    try {
      if (this.connections.has(connectionId)) {
        this.connections.delete(connectionId);
        console.log(`Cleaned up connection: ${connectionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cleaning up connection:", error);
      return false;
    }
  }

  async cleanupAllConnections(): Promise<void> {
    console.log(`Cleaning up ${this.connections.size} connections...`);
    this.connections.clear();
    console.log("All connections cleaned up");
  }

  getStatus() {
    return {
      initialized: this.initialized,
      credentialCount: this.credentials.size,
      connectionCount: this.connections.size,
      credentials: Array.from(this.credentials.values()),
      connections: Array.from(this.connections.values()),
    };
  }
}
