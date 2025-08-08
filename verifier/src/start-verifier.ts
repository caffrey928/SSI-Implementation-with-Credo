import { VerifierAgent } from "./verifier-agent";
import * as readline from 'readline';

const verifierAgent = new VerifierAgent();

async function main() {
  try {
    // 啟動 Verifier Agent
    await verifierAgent.start();
    
    console.log('\n🔍 Verifier Agent 已啟動');
    console.log('📋 準備進行身份驗證');
    
    // 設置互動界面
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

  console.log("\n請選擇操作:");
  console.log("1. 創建驗證請求 (輸入 'verify')");
  console.log("2. 查看狀態 (輸入 'status')");
  console.log("3. 退出 (輸入 'exit')");
  console.log("");

  const handleInput = async (input: string) => {
    const trimmed = input.trim().toLowerCase();
    
    try {
      if (trimmed === 'exit') {
        console.log("正在關閉 verifier agent...");
        await verifierAgent.stop();
        rl.close();
        process.exit(0);
      } else if (trimmed === 'status') {
        const status = verifierAgent.getStatus();
        console.log(`\n📊 Verifier 狀態:`);
        console.log(`  初始化: ${status.initialized ? '是' : '否'}`);
        console.log(`  監聽端口: 3003`);
        const did = await verifierAgent.getDid();
        console.log(`  DID: ${did}`);
      } else if (trimmed === 'verify') {
        console.log("\n🔍 創建年齡驗證請求 (18歲以上)...");
        
        // 創建預設的驗證請求
        const proofRequestData = {
          name: "學生身份與年齡驗證",
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
        
        console.log(`\n✅ 驗證請求已創建:`);
        console.log(`🔗 邀請 URL: ${result.invitationUrl}`);
        console.log(`📏 URL 長度: ${result.invitationUrl.length} 字符`);
        console.log(`\n📋 請求內容:`);
        console.log(`  名稱: ${result.proofRequestData.name}`);
        console.log(`  版本: ${result.proofRequestData.version}`);
        console.log(`  要求屬性: university, isStudent`);
        console.log(`  要求謂詞: 出生日期 <= ${new Date().getFullYear() - 18} (18歲以上)`);
        console.log(`\n💡 請將此 URL 提供給 Holder 來完成驗證`);
        
      } else {
        console.log("❓ 無效的輸入，請重新選擇操作");
      }
    } catch (error) {
      console.error(`❌ 操作失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log("\n請輸入下一個操作:");
    rl.question('> ', handleInput);
  };

  rl.question('> ', handleInput);
}

// 處理程序退出
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