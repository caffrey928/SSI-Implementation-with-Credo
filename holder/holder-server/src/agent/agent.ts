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
  ProofsModule,
  V2ProofProtocol,
  ProofEventTypes,
  ProofState,
  ProofExchangeRecord,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsProofFormatService,
  AnonCredsModule,
} from "@credo-ts/anoncreds";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";
import {
  CheqdAnonCredsRegistry,
  CheqdModule,
  CheqdDidRegistrar,
  CheqdDidResolver,
} from "@credo-ts/cheqd";

import { createBaseAgent } from "./agentConfig";
import { CredentialData, ProofRequestData } from "../types/types";
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
    proofs: ProofsModule<[V2ProofProtocol<[AnonCredsProofFormatService]>]>;
  }>;
  private initialized = false;

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
        proofs: new ProofsModule({
          proofProtocols: [
            new V2ProofProtocol({
              proofFormats: [new AnonCredsProofFormatService()],
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
    this.agent.events.on(
      ConnectionEventTypes.ConnectionStateChanged,
      async ({ payload }) => {
        const connectionRecord = payload.connectionRecord as ConnectionRecord;
        console.log(`Connection state changed: ${connectionRecord.state}`);

        if (connectionRecord.state === DidExchangeState.Completed) {
          console.log("Connection established!");
        }
      }
    );

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

            if (credentialRecord.connectionId) {
              console.log(
                `Credential received successfully from connection: ${credentialRecord.connectionId}`
              );
            }
            break;
        }
      }
    );

    this.agent.events.on(
      ProofEventTypes.ProofStateChanged,
      async ({ payload }) => {
        const proofRecord = payload.proofRecord as ProofExchangeRecord;
        console.log(`Proof state changed: ${proofRecord.state}`);

        switch (proofRecord.state) {
          case ProofState.RequestReceived:
            console.log("Proof request received!");
            await this.handleProofRequest(proofRecord);
            break;

          case ProofState.Done:
            console.log("Proof exchange completed");
            break;
        }
      }
    );
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

  private async acceptCredential(credentialRecord: CredentialExchangeRecord) {
    try {
      await this.agent.credentials.acceptCredential({
        credentialRecordId: credentialRecord.id,
      });
      console.log(`Credential accepted for record: ${credentialRecord.id}`);
    } catch (error) {
      console.error("Error accepting credential:", error);
      throw error;
    }
  }

  async receiveInvitation(invitationUrl: string): Promise<void> {
    try {
      console.log("Receiving invitation...");
      await this.agent.oob.receiveInvitationFromUrl(invitationUrl);
      console.log(
        "Invitation received, waiting for connection to establish..."
      );
    } catch (error) {
      console.error("Error receiving invitation:", error);
      throw error;
    }
  }

  async getDid(): Promise<string> {
    try {
      const dids = await this.agent.dids.getCreatedDids();

      const cheqdDid = dids.find((did) => did.did.startsWith("did:cheqd:"));
      if (cheqdDid) {
        console.log(`Using existing cheqd DID: ${cheqdDid.did}`);
        return cheqdDid.did;
      }

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

  private async handleProofRequest(proofRecord: ProofExchangeRecord) {
    try {
      console.log(`Processing proof request: ${proofRecord.id}`);

      const formatData = await this.agent.proofs.getFormatData(proofRecord.id);
      if (!formatData.request) {
        console.error("No proof request format data found");
        return;
      }

      const anonCredsRequest = formatData.request.anoncreds;
      if (!anonCredsRequest) {
        console.error("No AnonCreds proof request found");
        return;
      }

      const proofRequestData = anonCredsRequest;

      if (proofRequestData) {
        const requestData: ProofRequestData = {
          proofRequestId: proofRecord.id,
          connectionId: proofRecord.connectionId!,
          requestedAt: new Date(),
          name: proofRequestData.name || "Unknown Proof Request",
          version: proofRequestData.version,
          requestedAttributes: proofRequestData.requested_attributes || {},
          requestedPredicates: proofRequestData.requested_predicates || {},
        };

        await this.processProofRequest(requestData);
      }
    } catch (error) {
      console.error("Error handling proof request:", error);
    }
  }

  async processProofRequest(
    proofRequestData: ProofRequestData
  ): Promise<boolean> {
    try {
      const proofRecord = await this.agent.proofs.getById(
        proofRequestData.proofRequestId
      );

      if (!proofRequestData) {
        console.error("Proof request data not found");
        return false;
      }

      console.log(`Processing proof request: ${proofRequestData.name}`);

      const selectedCredentials =
        await this.agent.proofs.selectCredentialsForRequest({
          proofRecordId: proofRecord.id,
        });

      if (!selectedCredentials.proofFormats.anoncreds) {
        console.log("No AnonCreds credentials selected for this proof request");
        return false;
      }

      await this.agent.proofs.acceptRequest({
        proofRecordId: proofRequestData.proofRequestId,
        proofFormats: {
          anoncreds: selectedCredentials.proofFormats.anoncreds,
        },
      });

      console.log("Proof sent successfully");

      return true;
    } catch (error) {
      console.error("Error processing proof request:", error);

      return false;
    }
  }

  async getStoredCredentials(): Promise<CredentialData[]> {
    try {
      const credentialRecords = await this.agent.credentials.getAll();

      const credentialsWithDetails = await Promise.all(
        credentialRecords
          .filter((record) => record.role === "holder")
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
              attributes,
              schemaId: credentialMetadata?.schemaId,
              credentialDefinitionId:
                credentialMetadata?.credentialDefinitionId,
              issuedAt: record.createdAt,
              issuerId: credDefDetails?.credentialDefinition?.issuerId,
              definitionType: credDefDetails?.credentialDefinition?.type,
              schemaName: schemaDetails?.schema?.name,
            };
          })
      );

      return credentialsWithDetails;
    } catch (error) {
      console.error("Error getting stored credentials:", error);
      return [];
    }
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
  }

  async stop() {
    if (this.agent) {
      await this.agent.shutdown();
      console.log("Holder Agent stopped");
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
    };
  }
}
