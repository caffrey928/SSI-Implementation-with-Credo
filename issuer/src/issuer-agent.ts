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
  HandshakeProtocol,
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
import { DidsModule } from "@credo-ts/core";

import { createBaseAgent } from "./utils";
import { StudentCredential } from "./types";

import { HttpInboundTransport } from "@credo-ts/node";

export class IssuerAgent {
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
  private studentSchema = {
    name: "Student Identity",
    version: "1.0",
    attributes: ["name", "studentId", "university", "isStudent", "birthDate"],
  };
  private pendingCredentials = new Map<string, StudentCredential>(); // outOfBandId -> StudentCredential
  private connectionToOutOfBand = new Map<string, string>(); // connectionId -> outOfBandId
  private schemaId?: string;
  private credentialDefinitionId?: string;

  async initialize() {
    if (this.initialized) return;

    const baseConfig = await createBaseAgent({
      name: "Issuer",
      port: 3001,
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
                "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
              rpcUrl: "http://localhost:26657",
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
      new HttpInboundTransport({ port: 3001 })
    );

    await this.agent
      .initialize()
      .then(async () => {
        console.log("Agent initialized!");
        await this.setupSchemaAndCredDef();
        this.setupEventListeners();
        this.initialized = true;
      })
      .catch((e) => {
        console.error(
          `Something went wrong while setting up the agent! Message: ${e}`
        );
        throw e;
      });
  }

  private async setupSchemaAndCredDef() {
    try {
      const issuerDid = await this.getDid();

      if (!issuerDid) {
        throw new Error("Issuer DID not found");
      }

      // 先檢查是否已經有相同的 schema
      const existingSchemas = await this.agent.modules.anoncreds.getCreatedSchemas({
        issuerId: issuerDid,
      });

      const existingSchema = existingSchemas.find(schema => 
        schema.schema.name === this.studentSchema.name && 
        schema.schema.version === this.studentSchema.version
      );

      if (existingSchema) {
        this.schemaId = existingSchema.schemaId;
        console.log(`Using existing schema: ${this.schemaId}`);
      } else {
        console.log("Schema not found, creating new one...");
        
        // 創建新的 schema
        const schemaResult = await this.agent.modules.anoncreds.registerSchema({
          schema: {
            name: this.studentSchema.name,
            version: this.studentSchema.version,
            attrNames: this.studentSchema.attributes,
            issuerId: issuerDid,
          },
          options: {},
        });

        // 檢查 Schema 註冊狀態
        if (schemaResult.schemaState.state === "failed") {
          throw new Error(
            `Schema registration failed: ${schemaResult.schemaState.reason}`
          );
        }

        this.schemaId = schemaResult.schemaState.schemaId;
        console.log(`Schema created: ${this.schemaId}`);
      }

      // 處理 credential definition
      if (this.schemaId) {
        // 先檢查是否已經有相同配置的 credential definition
        const existingCredDefs = await this.agent.modules.anoncreds.getCreatedCredentialDefinitions({
          issuerId: issuerDid,
          schemaId: this.schemaId,
        });

        const existingCredDef = existingCredDefs.find(credDef => 
          credDef.credentialDefinition.tag === "default"
        );

        if (existingCredDef) {
          this.credentialDefinitionId = existingCredDef.credentialDefinitionId;
          console.log(`Using existing credential definition: ${this.credentialDefinitionId}`);
        } else {
          console.log("Credential definition not found, creating new one...");
          
          const credDefResult =
            await this.agent.modules.anoncreds.registerCredentialDefinition({
              credentialDefinition: {
                tag: "default",
                issuerId: issuerDid,
                schemaId: this.schemaId,
              },
              options: {
                supportRevocation: false,
              },
            });

          // 檢查 Credential Definition 註冊狀態
          if (credDefResult.credentialDefinitionState.state === "failed") {
            throw new Error(
              `Credential definition registration failed: ${credDefResult.credentialDefinitionState.reason}`
            );
          }

          this.credentialDefinitionId =
            credDefResult.credentialDefinitionState.credentialDefinitionId;
          console.log(
            `Credential Definition created: ${this.credentialDefinitionId}`
          );
        }
      }
    } catch (error) {
      console.error(
        "Error setting up schema and credential definition:",
        error
      );
    }
  }

  private setupEventListeners() {
    // 監聽連接狀態變化
    this.agent.events.on(
      ConnectionEventTypes.ConnectionStateChanged,
      async ({ payload }) => {
        const connectionRecord = payload.connectionRecord as ConnectionRecord;
        console.log(`Connection state changed: ${connectionRecord.state}`);

        // 當收到連接請求時，自動接受
        if (connectionRecord.state === DidExchangeState.RequestReceived) {
          console.log("Connection request received, accepting...");
          try {
            await this.agent.connections.acceptRequest(connectionRecord.id);
            console.log("Connection request accepted");
          } catch (error) {
            console.error("Error accepting connection request:", error);
          }
        }

        if (connectionRecord.state === DidExchangeState.Completed) {
          console.log(
            "Connection established, checking for pending credentials..."
          );

          // 使用 outOfBandId 查找待發放憑證
          const outOfBandId = connectionRecord.outOfBandId;
          console.log(`Connection outOfBandId: ${outOfBandId}`);
          console.log(`Pending credentials keys:`, Array.from(this.pendingCredentials.keys()));
          
          if (outOfBandId && this.pendingCredentials.has(outOfBandId)) {
            const pendingCredential = this.pendingCredentials.get(outOfBandId)!;
            console.log(`Found pending credential for ${pendingCredential.name}`);

            // 建立連接ID到OutOfBandId的映射
            this.connectionToOutOfBand.set(connectionRecord.id, outOfBandId);

            await this.sendCredentialOffer(
              connectionRecord.id,
              pendingCredential
            );

            // 清理待處理憑證
            this.pendingCredentials.delete(outOfBandId);
            console.log(`Cleaned up pending credential for outOfBandId: ${outOfBandId}`);
          } else {
            console.log(`No pending credential found for outOfBandId: ${outOfBandId}`);
          }
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

        if (credentialRecord.state === CredentialState.RequestReceived) {
          console.log("Credential request received, issuing credential...");
          await this.issueCredential(credentialRecord);
        }

        if (credentialRecord.state === CredentialState.Done) {
          console.log("Credential issued successfully");
          // 清理連接映射
          if (credentialRecord.connectionId) {
            const outOfBandId = this.connectionToOutOfBand.get(credentialRecord.connectionId);
            this.connectionToOutOfBand.delete(credentialRecord.connectionId);
            console.log(`Cleaned up connection mapping for connectionId: ${credentialRecord.connectionId}`);
            
            // 確保 pendingCredentials 也被清理（雙重保險）
            if (outOfBandId && this.pendingCredentials.has(outOfBandId)) {
              this.pendingCredentials.delete(outOfBandId);
              console.log(`Final cleanup of pending credential for outOfBandId: ${outOfBandId}`);
            }
          }
          
          console.log(`Remaining pending credentials: ${this.pendingCredentials.size}`);
          console.log(`Remaining connection mappings: ${this.connectionToOutOfBand.size}`);
        }
      }
    );
  }

  async getDid(): Promise<string> {
    const dids = await this.agent.dids.getCreatedDids();
    
    // 尋找 cheqd DID
    const cheqdDid = dids.find(did => did.did.startsWith('did:cheqd:'));
    if (cheqdDid) {
      console.log(`Using existing cheqd DID: ${cheqdDid.did}`);
      return cheqdDid.did;
    }
    
    // 如果沒有 cheqd DID，創建一個
    console.log("Creating new cheqd DID for schema registration...");
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
      throw new Error(`Failed to create cheqd DID: ${JSON.stringify(didResult.didState)}`);
    }
  }

  async createCredentialOffer(studentInfo: StudentCredential) {
    if (!this.schemaId || !this.credentialDefinitionId) {
      throw new Error("Schema and Credential Definition not initialized");
    }

    console.log(`\n🎫 Creating new credential offer for: ${studentInfo.name}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    // 創建 Out-of-Band 邀請
    const outOfBandRecord = await this.agent.oob.createInvitation({
      handshakeProtocols: [HandshakeProtocol.DidExchange],
    });
    const outOfBandId = outOfBandRecord.outOfBandInvitation.id;
    const recordId = outOfBandRecord.id;

    console.log(`📧 OutOfBand invitation ID: ${outOfBandId}`);
    console.log(`📋 OutOfBand record ID: ${recordId}`);

    const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "http://localhost:3001",
    });

    console.log(`🔗 Generated invitation URL: ${invitationUrl}`);
    console.log(`📏 URL length: ${invitationUrl.length} characters`);

    // 使用 record ID 作為 key，因為這是 connection 會引用的
    this.pendingCredentials.set(recordId, studentInfo);
    console.log(`💾 Stored pending credential with key: ${recordId}`);

    console.log(`✅ Credential offer created for student: ${studentInfo.name}\n`);

    return {
      invitationUrl,
      outOfBandId,
      studentInfo,
    };
  }

  private async sendCredentialOffer(
    connectionId: string,
    studentInfo: StudentCredential
  ) {
    try {
      if (!this.credentialDefinitionId) {
        throw new Error("Credential Definition not initialized");
      }

      const credentialRecord = await this.agent.credentials.offerCredential({
        connectionId,
        protocolVersion: "v2",
        credentialFormats: {
          anoncreds: {
            credentialDefinitionId: this.credentialDefinitionId,
            attributes: [
              { name: "name", value: studentInfo.name },
              { name: "studentId", value: studentInfo.studentId },
              { name: "university", value: studentInfo.university },
              { name: "isStudent", value: studentInfo.isStudent.toString() },
              { name: "birthDate", value: studentInfo.birthDate },
            ],
          },
        },
      });

      console.log(`Credential offer sent for ${studentInfo.name}`);
      return credentialRecord;
    } catch (error) {
      console.error("Error sending credential offer:", error);
      throw error;
    }
  }

  private async issueCredential(credentialRecord: CredentialExchangeRecord) {
    try {
      console.log(`Accepting credential request for record: ${credentialRecord.id}`);
      const result = await this.agent.credentials.acceptRequest({
        credentialRecordId: credentialRecord.id,
      });

      console.log(`Credential issued for record: ${credentialRecord.id}`);
      console.log(`Current credential state: ${result.state}`);
      
      // 手動檢查狀態是否為 Done
      if (result.state === CredentialState.Done) {
        console.log("Credential is in Done state - should trigger cleanup");
      } else {
        console.log(`Waiting for state to change to Done, current: ${result.state}`);
      }
    } catch (error) {
      console.error("Error issuing credential:", error);
      throw error;
    }
  }

  async getIssuedCredentials() {
    const credentials = await this.agent.credentials.getAll();
    return credentials
      .filter((cred) => cred.role === "issuer")
      .map((cred) => ({
        id: cred.id,
        type: cred.type,
        state: cred.state,
        createdAt: cred.createdAt,
        metadata: cred.metadata,
      }));
  }

  async getStudentSchema() {
    return this.studentSchema;
  }

  getAgent(): Agent {
    return this.agent;
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }
    console.log("🚀 Issuer Agent started successfully!");
    console.log(`📍 Listening on: http://localhost:3001`);
    console.log(`🔑 Issuer DID: ${await this.getDid()}`);
    console.log(`📋 Schema ID: ${this.schemaId}`);
    console.log(`📜 Credential Definition ID: ${this.credentialDefinitionId}`);
  }

  async stop() {
    if (this.agent) {
      await this.agent.shutdown();
      console.log("Issuer Agent stopped");
    }
  }

  getConnectionStatus() {
    return {
      pendingCredentials: this.pendingCredentials.size,
      schemaId: this.schemaId,
      credentialDefinitionId: this.credentialDefinitionId,
      initialized: this.initialized,
    };
  }
}
