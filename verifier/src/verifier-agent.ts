import {
  Agent,
  HttpOutboundTransport,
  WsOutboundTransport,
  ProofEventTypes,
  ProofState,
  DidExchangeState,
  ConnectionEventTypes,
  ProofExchangeRecord,
  ConnectionRecord,
  ProofsModule,
  V2ProofProtocol,
  HandshakeProtocol,
  DidsModule,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
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
import { createBaseAgent } from "./utils";
import { ProofRequest } from "./types";
import { HttpInboundTransport } from "@credo-ts/node";

export class VerifierAgent {
  private agent!: Agent<{
    askar: AskarModule;
    anoncreds: AnonCredsModule;
    dids: DidsModule;
    cheqd: CheqdModule;
    proofs: ProofsModule<[V2ProofProtocol<[AnonCredsProofFormatService]>]>;
  }>;
  private initialized = false;
  private minAge = 18;
  private cred_def_id = process.env.RESTRICTION_CREDENTIALS_DEFINITION_ID || "";
  private schema_id = process.env.RESTRICTION_SCHEMA_ID || "";

  async initialize() {
    if (this.initialized) return;

    const baseConfig = await createBaseAgent({
      name: "Verifier",
      port: 3003,
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
                "slight oblige answer vault project symbol dismiss match match honey forum wood resist exotic inner close foil notice onion acquire sausage boost acquire produce",
              rpcUrl: "http://localhost:26857",
            },
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
      new HttpInboundTransport({ port: 3003 })
    );

    await this.agent
      .initialize()
      .then(async () => {
        console.log("Verifier Agent initialized!");
        this.setupEventListeners();
        this.initialized = true;
      })
      .catch((e) => {
        console.error(
          `Something went wrong while setting up the verifier agent! Message: ${e}`
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
          console.log("Connection established, sending proof request...");

          const proofRequestData = await this.createVerificationRestriction(
            this.minAge,
            this.cred_def_id,
            this.schema_id
          );

          await this.sendProofRequest(connectionRecord.id, proofRequestData);
        }
      }
    );

    this.agent.events.on(
      ProofEventTypes.ProofStateChanged,
      async ({ payload }) => {
        const proofRecord = payload.proofRecord as ProofExchangeRecord;
        console.log(`Proof state changed: ${proofRecord.state}`);

        if (proofRecord.state === ProofState.PresentationReceived) {
          console.log("Presentation received, verifying proof...");

          await this.verifyProof(proofRecord);
        }

        if (proofRecord.state === ProofState.Done) {
          console.log("Proof verification completed");
        }
      }
    );
  }

  async getDid(): Promise<string> {
    const dids = await this.agent.dids.getCreatedDids();

    const cheqdDid = dids.find((did) => did.did.startsWith("did:cheqd:"));
    if (cheqdDid) {
      console.log(`Using existing cheqd DID: ${cheqdDid.did}`);
      return cheqdDid.did;
    }

    console.log("Creating new cheqd DID for verifier...");
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
      throw new Error(
        `Failed to create cheqd DID: ${JSON.stringify(didResult.didState)}`
      );
    }
  }

  async createProofRequest(proofRequestData: ProofRequest) {
    console.log(`\n🔍 Creating new proof request: ${proofRequestData.name}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const outOfBandRecord = await this.agent.oob.createInvitation({
      handshakeProtocols: [HandshakeProtocol.DidExchange],
    });
    const outOfBandId = outOfBandRecord.outOfBandInvitation.id;
    const recordId = outOfBandRecord.id;

    console.log(`📧 OutOfBand invitation ID: ${outOfBandId}`);
    console.log(`📋 OutOfBand record ID: ${recordId}`);

    const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "http://localhost:3003",
    });

    console.log(`🔗 Generated invitation URL: ${invitationUrl}`);
    console.log(`📏 URL length: ${invitationUrl.length} characters`);

    console.log(`✅ Proof request created: ${proofRequestData.name}\n`);

    return {
      invitationUrl,
      outOfBandId,
      proofRequestData,
    };
  }

  private async sendProofRequest(
    connectionId: string,
    proofRequestData: ProofRequest
  ) {
    try {
      const proofRecord = await this.agent.proofs.requestProof({
        connectionId,
        protocolVersion: "v2",
        proofFormats: {
          anoncreds: {
            name: proofRequestData.name,
            version: proofRequestData.version,
            requested_attributes: proofRequestData.requestedAttributes,
            requested_predicates: proofRequestData.requestedPredicates || {},
          },
        },
      });

      console.log(
        `✅ Proof request sent successfully: ${proofRequestData.name}`
      );
      console.log(`Proof record ID: ${proofRecord.id}`);
      return proofRecord;
    } catch (error) {
      console.error("❌ Error sending proof request:", error);
      throw error;
    }
  }

  private async createVerificationRestriction(
    minAge: number = 18,
    cred_def_id?: string,
    schema_id?: string
  ) {
    const currentDate = new Date();
    const maxBirthDate = new Date(
      currentDate.getFullYear() - minAge,
      currentDate.getMonth(),
      currentDate.getDate()
    );
    const maxBirthDateNumber = parseInt(
      maxBirthDate.toISOString().slice(0, 10).replace(/-/g, "")
    );

    const restrictions = [];
    const restriction: any = {};
    
    if (cred_def_id) {
      restriction.cred_def_id = cred_def_id;
    }
    if (schema_id) {
      restriction.schema_id = schema_id;
    }
    restrictions.push(restriction);
    
    const proofRequest: ProofRequest = {
      name: `Student & ${minAge}+ years`,
      version: "1.0",
      requestedAttributes: {
        university: {
          name: "university",
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
        isStudent: {
          name: "isStudent",
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
      },
      requestedPredicates: {
        age_over_18: {
          name: "birthDate",
          p_type: "<=" as const,
          p_value: maxBirthDateNumber,
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
      },
    };

    return proofRequest;
  }

  private async verifyProof(proofRecord: ProofExchangeRecord) {
    try {
      console.log(`Verifying proof for record: ${proofRecord.id}`);

      const result = await this.agent.proofs.acceptPresentation({
        proofRecordId: proofRecord.id,
      });

      const isValid = result.isVerified ?? false;
      const formatData = await this.agent.proofs.getFormatData(result.id);

      let attributes: Record<string, string> = {};
      let predicates: Record<string, boolean> = {};

      if (formatData.presentation && formatData.presentation.anoncreds) {
        const anonCredsPresentation = formatData.presentation.anoncreds;

        if (anonCredsPresentation.requested_proof) {
          if (anonCredsPresentation.requested_proof.revealed_attrs) {
            Object.entries(
              anonCredsPresentation.requested_proof.revealed_attrs
            ).forEach(([key, value]: [string, any]) => {
              attributes[key] = value.raw || value.encoded || "";
            });
          }

          if (anonCredsPresentation.requested_proof.predicates) {
            Object.keys(
              anonCredsPresentation.requested_proof.predicates
            ).forEach((key) => {
              predicates[key] = true;
            });
          }
        }
      }

      const isStudentValid = attributes.isStudent === "true";
      const allChecksPass = isValid && isStudentValid;

      console.log(`Verification result:`, {
        attributes,
        predicates: Object.keys(predicates).length > 0 ? predicates : "none",
      });

      if(allChecksPass) {
        console.log("✅ VERIFICATION PASSED");
      } else {
        console.log("❌ VERIFICATION FAILED");
      }
    } catch (error) {
      console.error("Error verifying proof:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
    };
  }

  getAgent(): Agent {
    return this.agent;
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }
    console.log("🚀 Verifier Agent started successfully!");
    console.log(`📍 Listening on: http://localhost:3003`);
    console.log(`🔑 Verifier DID: ${await this.getDid()}`);
  }

  async stop() {
    if (this.agent) {
      await this.agent.shutdown();
      console.log("Verifier Agent stopped");
    }
  }
}
