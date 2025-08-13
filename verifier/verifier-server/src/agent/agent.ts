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
import { createBaseAgent } from "./agentConfig";
import {
  ProofRequest,
  PendingProofRequest,
  VerificationRequestType,
} from "../types/types";
import { HttpInboundTransport } from "@credo-ts/node";
import { CleanupManager } from "../utils/cleanupManager";

export class VerifierAgent {
  private agent!: Agent<{
    askar: AskarModule;
    anoncreds: AnonCredsModule;
    dids: DidsModule;
    cheqd: CheqdModule;
    proofs: ProofsModule<[V2ProofProtocol<[AnonCredsProofFormatService]>]>;
  }>;
  private initialized = false;
  private cred_def_id = process.env.RESTRICTION_CREDENTIALS_DEFINITION_ID || "";
  private schema_id = process.env.RESTRICTION_SCHEMA_ID || "";
  private pendingProofRequests = new Map<string, PendingProofRequest>();
  private cleanupManager: CleanupManager;
  private verificationCallback?: (result: any) => void;

  constructor() {
    this.cleanupManager = new CleanupManager(
      () => this.cleanupExpiredProofRequests(),
      5000,
      "Expired Pending Proof Requests"
    );
  }

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

        if (connectionRecord.state === DidExchangeState.RequestReceived) {
          try {
            await this.agent.connections.acceptRequest(connectionRecord.id);
          } catch (error) {
            console.error("❌ Error accepting connection request:", error);
          }
        }

        if (connectionRecord.state === DidExchangeState.Completed) {
          // Find the pending proof request using the outOfBandId from the connection
          const outOfBandId = connectionRecord.outOfBandId;

          if (outOfBandId && this.pendingProofRequests.has(outOfBandId)) {
            const pendingRequest = this.pendingProofRequests.get(outOfBandId)!;

            // Generate the appropriate proof request based on type
            let proofRequestData: ProofRequest;
            if (pendingRequest.type === "age") {
              proofRequestData = this.createAgeVerificationRequest();
            } else {
              proofRequestData = this.createStudentVerificationRequest();
            }

            // Send the proof request
            await this.sendProofRequest(connectionRecord.id, proofRequestData);

            // Clean up the pending request
            this.pendingProofRequests.delete(outOfBandId);
          }
        }
      }
    );

    this.agent.events.on(
      ProofEventTypes.ProofStateChanged,
      async ({ payload }) => {
        const proofRecord = payload.proofRecord as ProofExchangeRecord;

        if (proofRecord.state === ProofState.PresentationReceived) {
          await this.verifyProof(proofRecord);
        }

        if (proofRecord.state === ProofState.Done) {
        }
      }
    );
  }

  async getDid(): Promise<string> {
    const dids = await this.agent.dids.getCreatedDids();

    const cheqdDid = dids.find((did) => did.did.startsWith("did:cheqd:"));
    if (cheqdDid) {
      return cheqdDid.did;
    }

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
      return didResult.didState.did!;
    } else {
      throw new Error(
        `Failed to create cheqd DID: ${JSON.stringify(didResult.didState)}`
      );
    }
  }

  async createProofRequest(requestType: VerificationRequestType) {
    const outOfBandRecord = await this.agent.oob.createInvitation({
      handshakeProtocols: [HandshakeProtocol.DidExchange],
    });
    const outOfBandId = outOfBandRecord.id;

    // Store the pending proof request with its type
    this.pendingProofRequests.set(outOfBandId, {
      outOfBandId,
      type: requestType,
      createdAt: new Date(),
    });

    const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "http://localhost:3003",
    });

    return {
      invitationUrl,
      outOfBandId,
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

      return proofRecord;
    } catch (error) {
      console.error("❌ Error sending proof request:", error);
      throw error;
    }
  }

  private createAgeVerificationRequest(minAge: number = 18): ProofRequest {
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

    if (this.cred_def_id) {
      restriction.cred_def_id = this.cred_def_id;
    }
    if (this.schema_id) {
      restriction.schema_id = this.schema_id;
    }
    if (Object.keys(restriction).length > 0) {
      restrictions.push(restriction);
    }

    return {
      name: `Age Verification (${minAge}+ years)`,
      version: "1.0",
      requestedAttributes: {},
      requestedPredicates: {
        age_verification: {
          name: "birthDate",
          p_type: "<=" as const,
          p_value: maxBirthDateNumber,
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
      },
    };
  }

  private createStudentVerificationRequest(): ProofRequest {
    const restrictions = [];
    const restriction: any = {};

    if (this.cred_def_id) {
      restriction.cred_def_id = this.cred_def_id;
    }
    if (this.schema_id) {
      restriction.schema_id = this.schema_id;
    }
    if (Object.keys(restriction).length > 0) {
      restrictions.push(restriction);
    }

    return {
      name: "Student Status Verification",
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
        name: {
          name: "name",
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
        studentId: {
          name: "studentId",
          restrictions: restrictions.length > 0 ? restrictions : undefined,
        },
      },
      requestedPredicates: {},
    };
  }

  private async verifyProof(proofRecord: ProofExchangeRecord) {
    try {
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

      // Determine verification type based on what was requested
      const hasStudentAttributes =
        "isStudent" in attributes || "university" in attributes;
      const hasAgeVerification = "age_verification" in predicates;

      let verificationPassed = false;

      if (hasStudentAttributes && hasAgeVerification) {
        const isStudentValid = attributes.isStudent === "true";
        const isUniversityValid =
          attributes.university === "National Taiwan University";
        const hasAllRequiredFields =
          "name" in attributes &&
          "studentId" in attributes &&
          "university" in attributes &&
          "isStudent" in attributes;
        verificationPassed =
          isValid &&
          isStudentValid &&
          isUniversityValid &&
          hasAllRequiredFields;
      } else if (hasStudentAttributes) {
        const isStudentValid = attributes.isStudent === "true";
        const isUniversityValid =
          attributes.university === "National Taiwan University";
        const hasAllRequiredFields =
          "name" in attributes &&
          "studentId" in attributes &&
          "university" in attributes &&
          "isStudent" in attributes;
        verificationPassed =
          isValid &&
          isStudentValid &&
          isUniversityValid &&
          hasAllRequiredFields;
      } else if (hasAgeVerification) {
        verificationPassed = isValid;
      }

      if (!verificationPassed) {
        console.error(
          "❌ Proof verification failed. Invalid attributes or predicates."
        );
      } else {
        console.log("✅ Proof verified successfully!");
        // Send success to frontend with complete VP
        if (this.verificationCallback) {
          this.verificationCallback({
            attributes,
            predicates,
          });
        }
      }
    } catch (error) {
      console.error("Error verifying proof:", error);
      throw error;
    }
  }

  private cleanupExpiredProofRequests() {
    const now = new Date();
    const expiredKeys: string[] = [];

    // Find proof requests older than 1 minute (60000 ms)
    for (const [key, data] of this.pendingProofRequests.entries()) {
      const timeDiff = now.getTime() - data.createdAt.getTime();
      if (timeDiff > 60000) {
        // 1 minute
        expiredKeys.push(key);
      }
    }

    // Remove expired proof requests
    expiredKeys.forEach((key) => {
      this.pendingProofRequests.delete(key);
    });

    if (expiredKeys.length > 0) {
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

  setVerificationCallback(callback: (result: any) => void) {
    this.verificationCallback = callback;
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }
    this.cleanupManager.start();
    console.log("🚀 Verifier Agent started successfully!");
    console.log(`📍 Listening on: http://localhost:3003`);
  }

  async stop() {
    this.cleanupManager.stop();
    if (this.agent) {
      await this.agent.shutdown();
    }
  }
}
