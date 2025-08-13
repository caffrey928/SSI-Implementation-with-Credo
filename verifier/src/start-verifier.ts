import { VerifierAgent } from "./verifier-agent";
import * as readline from 'readline';

const verifierAgent = new VerifierAgent();

async function main() {
  try {
    // Start Verifier Agent
    await verifierAgent.start();
    
    console.log('\n🔍 Verifier Agent Started');
    console.log('📋 Ready for identity verification');
    
    // Setup interactive interface
    setupInteractiveInterface();
    
  } catch (error) {
    console.error('❌ Failed to start Verifier Agent:', error);
    process.exit(1);
  }
}

function setupInteractiveInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\nPlease select an operation:");
  console.log("1. Create verification request (enter 'verify')");
  console.log("2. View status (enter 'status')");
  console.log("3. Exit (enter 'exit')");
  console.log("");

  const handleInput = async (input: string) => {
    const trimmed = input.trim().toLowerCase();
    
    try {
      if (trimmed === 'exit') {
        console.log("Shutting down verifier agent...");
        await verifierAgent.stop();
        rl.close();
        process.exit(0);
      } else if (trimmed === 'status') {
        const status = verifierAgent.getStatus();
        console.log(`\n📊 Verifier Status:`);
        console.log(`  Initialized: ${status.initialized ? 'Yes' : 'No'}`);
        console.log(`  Listening on port: 3003`);
        const did = await verifierAgent.getDid();
        console.log(`  DID: ${did}`);
      } else if (trimmed === 'verify') {
        console.log("\n🔍 Creating age verification request (18+ years old)...");
        
        // Create default verification request
        const proofRequestData = {
          name: "Student Identity and Age Verification",
          version: "1.0",
          requestedAttributes: {
            university: {
              name: "university"
            },
            isStudent: {
              name: "isStudent"
            },
          },
          requestedPredicates: {
            age_over_18: {
              name: "birthDate",
              p_type: "<=" as const,
              p_value: parseInt(new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().slice(0, 10).replace(/-/g, ""))
            },
          }
        };

        const result = await verifierAgent.createProofRequest(proofRequestData);
        
        console.log(`\n✅ Verification request created:`);
        console.log(`🔗 Invitation URL: ${result.invitationUrl}`);
        console.log(`📏 URL length: ${result.invitationUrl.length} characters`);
        console.log(`\n📋 Request details:`);
        console.log(`  Name: ${result.proofRequestData.name}`);
        console.log(`  Version: ${result.proofRequestData.version}`);
        console.log(`  Required attributes: university, isStudent`);
        console.log(`  Required predicates: birthDate <= ${new Date().getFullYear() - 18} (18+ years old)`);
        console.log(`\n💡 Provide this URL to the Holder to complete verification`);
        
      } else {
        console.log("❓ Invalid input, please select another operation");
      }
    } catch (error) {
      console.error(`❌ Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log("\nEnter next operation:");
    rl.question('> ', handleInput);
  };

  rl.question('> ', handleInput);
}

// Handle process exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Verifier Agent...');
  await verifierAgent.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Verifier Agent...');
  await verifierAgent.stop();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { main };