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

import { createBaseAgent } from "./agentUtils";
import { StudentCredential } from "../types/types";
import { CleanupManager } from "../utils/cleanupManager";

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
  private pendingCredentials = new Map<string, { student: StudentCredential; createdAt: Date; shortUrl?: string }>(); // outOfBandId -> {student, timestamp, shortUrl}
  private connectionToOutOfBand = new Map<string, string>(); // connectionId -> outOfBandId
  private cleanupManager: CleanupManager;
  private schemaId?: string;
  private credentialDefinitionId?: string;

  constructor() {
    this.cleanupManager = new CleanupManager(
      () => this.cleanupExpiredCredentials(),
      5000,
      'Expired Pending Credentials'
    );
  }

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
        this.cleanupManager.start();
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
        
        const schemaResult = await this.agent.modules.anoncreds.registerSchema({
          schema: {
            name: this.studentSchema.name,
            version: this.studentSchema.version,
            attrNames: this.studentSchema.attributes,
            issuerId: issuerDid,
          },
          options: {},
        });

        if (schemaResult.schemaState.state === "failed") {
          throw new Error(
            `Schema registration failed: ${schemaResult.schemaState.reason}`
          );
        }

        this.schemaId = schemaResult.schemaState.schemaId;
        console.log(`Schema created: ${this.schemaId}`);
      }

      if (this.schemaId) {
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
    this.agent.events.on(
      ConnectionEventTypes.ConnectionStateChanged,
      async ({ payload }) => {
        const connectionRecord = payload.connectionRecord as ConnectionRecord;
        console.log(`Connection state changed: ${connectionRecord.state}`);

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

          const outOfBandId = connectionRecord.outOfBandId;
          
          if (outOfBandId && this.pendingCredentials.has(outOfBandId)) {
            const pendingCredentialData = this.pendingCredentials.get(outOfBandId)!;
            const pendingCredential = pendingCredentialData.student;
            console.log(`Found pending credential for ${pendingCredential.name}`);

            this.connectionToOutOfBand.set(connectionRecord.id, outOfBandId);

            await this.sendCredentialOffer(
              connectionRecord.id,
              pendingCredential
            );

            this.pendingCredentials.delete(outOfBandId);
            console.log(`Processed credential for: ${pendingCredential.name}`);
          }
        }
      }
    );

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

          if (credentialRecord.connectionId) {
            const outOfBandId = this.connectionToOutOfBand.get(credentialRecord.connectionId);
            this.connectionToOutOfBand.delete(credentialRecord.connectionId);
            console.log(`Cleaned up connection mapping for connectionId: ${credentialRecord.connectionId}`);
            
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
    
    const cheqdDid = dids.find(did => did.did.startsWith('did:cheqd:'));
    if (cheqdDid) {
      console.log(`Using existing cheqd DID: ${cheqdDid.did}`);
      return cheqdDid.did;
    }
    
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

    console.log(`Creating credential offer for: ${studentInfo.name}`);

    const outOfBandRecord = await this.agent.oob.createInvitation({
      handshakeProtocols: [HandshakeProtocol.DidExchange],
    });
    const recordId = outOfBandRecord.id;

    const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "http://localhost:4001",
    });

    this.pendingCredentials.set(recordId, { 
      student: studentInfo, 
      createdAt: new Date() 
    });
    
    console.log(`Credential offer created for: ${studentInfo.name}`);

    return {
      invitationUrl,
      recordId,
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
              { name: "birthDate", value: studentInfo.birthDate.toString() }, 
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
    } catch (error) {
      console.error("Error issuing credential:", error);
      throw error;
    }
  }

  async getIssuedCredentials() {
    try {
      const credentialRecords = await this.agent.credentials.getAll();

      const credentialsWithDetails = await Promise.all(
        credentialRecords
          .filter((record) => record.role === "issuer" && record.state === "done")
          .map(async (record) => {
            // Extract attributes from credentialAttributes
            const attributes: Record<string, string> = {};
            if (record.credentialAttributes) {
              record.credentialAttributes.forEach((attr) => {
                attributes[attr.name] = attr.value;
              });
            }

            // Get credential metadata from anoncreds
            const credentialMetadata = record.metadata.get(
              "_anoncreds/credential"
            );

            let credDefDetails = null;
            let schemaDetails = null;

            // Try to get credential definition details if credentialDefinitionId exists
            if (credentialMetadata?.credentialDefinitionId) {
              try {
                credDefDetails =
                  await this.agent.modules.anoncreds.getCredentialDefinition(
                    credentialMetadata.credentialDefinitionId
                  );
              } catch (error) {
                console.log(
                  "Could not fetch credential definition details:",
                  error
                );
              }
            }

            // Try to get schema details if schemaId exists
            if (credentialMetadata?.schemaId) {
              try {
                schemaDetails = await this.agent.modules.anoncreds.getSchema(
                  credentialMetadata.schemaId
                );
              } catch (error) {
                console.log("Could not fetch schema details:", error);
              }
            }

            return {
              credentialId: record.id,
              studentName: attributes.name || 'Unknown',
              studentId: attributes.studentId || 'Unknown', 
              university: attributes.university || 'Unknown',
              issuedAt: record.createdAt,
              attributes,
              schemaId: credentialMetadata?.schemaId,
              credentialDefinitionId: credentialMetadata?.credentialDefinitionId,
              issuerId: credDefDetails?.credentialDefinition?.issuerId,
              definitionType: credDefDetails?.credentialDefinition?.type,
              schemaName: schemaDetails?.schema?.name,
            };
          })
      );
      
      return credentialsWithDetails;
    } catch (error) {
      console.error("Error getting issued credentials:", error);
      return [];
    }
  }

  updatePendingCredentialUrl(recordId: string, shortUrl: string) {
    const existing = this.pendingCredentials.get(recordId);
    if (existing) {
      this.pendingCredentials.set(recordId, {
        ...existing,
        shortUrl: shortUrl
      });
    }
  }

  async getPendingCredentials() {
    const pendingList = [];
    for (const [outOfBandId, data] of this.pendingCredentials.entries()) {
      pendingList.push({
        id: outOfBandId,
        studentName: data.student.name,
        studentId: data.student.studentId,
        university: data.student.university,
        birthDate: data.student.birthDate,
        isStudent: data.student.isStudent,
        createdAt: data.createdAt,
        status: 'pending',
        expiresAt: new Date(data.createdAt.getTime() + 60000), // 1 minute expiry
        invitationUrl: data.shortUrl || null
      });
    }
    return pendingList;
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
    console.log("Issuer Agent started successfully!");
    console.log("Listening on: http://localhost:3001");
  }


  private cleanupExpiredCredentials() {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    // Find credentials older than 1 minute (60000 ms)
    for (const [key, data] of this.pendingCredentials.entries()) {
      const timeDiff = now.getTime() - data.createdAt.getTime();
      if (timeDiff > 60000) { // 1 minute
        expiredKeys.push(key);
      }
    }
    
    // Remove expired credentials
    expiredKeys.forEach(key => {
      const data = this.pendingCredentials.get(key);
      if (data) {
        this.pendingCredentials.delete(key);
      }
    });
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired pending credentials`);
    }
  }

  async stop() {
    this.cleanupManager.stop();
    if (this.agent) {
      await this.agent.shutdown();
      console.log("Issuer Agent stopped");
    }
  }

  getAgentStatus() {
    return {
      schemaId: this.schemaId,
      credentialDefinitionId: this.credentialDefinitionId,
      initialized: this.initialized,
    };
  }
}
