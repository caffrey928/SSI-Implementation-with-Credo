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

      // 創建 schema
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

      // 創建 credential definition
      if (this.schemaId) {
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

        if (connectionRecord.state === DidExchangeState.Completed) {
          console.log(
            "Connection established, checking for pending credentials..."
          );

          // 使用 outOfBandId 查找待發放憑證
          const outOfBandId = connectionRecord.outOfBandId;
          if (outOfBandId && this.pendingCredentials.has(outOfBandId)) {
            const pendingCredential = this.pendingCredentials.get(outOfBandId)!;

            // 建立連接ID到OutOfBandId的映射
            this.connectionToOutOfBand.set(connectionRecord.id, outOfBandId);

            await this.sendCredentialOffer(
              connectionRecord.id,
              pendingCredential
            );

            // 清理待處理憑證
            this.pendingCredentials.delete(outOfBandId);
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
            this.connectionToOutOfBand.delete(credentialRecord.connectionId);
          }
        }
      }
    );
  }

  async getDid(): Promise<string> {
    const dids = await this.agent.dids.getCreatedDids();
    
    if (dids.length === 0) {
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
      return didResult.didState.did!;
    }
    return dids[0].did;
  }

  async createCredentialOffer(studentInfo: StudentCredential) {
    if (!this.schemaId || !this.credentialDefinitionId) {
      throw new Error("Schema and Credential Definition not initialized");
    }

    // 創建 Out-of-Band 邀請
    const outOfBandRecord = await this.agent.oob.createInvitation({
      handshakeProtocols: [HandshakeProtocol.DidExchange],
    });
    const outOfBandId = outOfBandRecord.outOfBandInvitation.id;

    // 儲存待發放的憑證資訊 (使用 outOfBandId)
    this.pendingCredentials.set(outOfBandId, studentInfo);

    console.log(`Credential offer created for student: ${studentInfo.name}`);

    return {
      invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
        domain: "http://localhost:3001",
      }),
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
      await this.agent.credentials.acceptRequest({
        credentialRecordId: credentialRecord.id,
      });

      console.log(`Credential issued for record: ${credentialRecord.id}`);
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
