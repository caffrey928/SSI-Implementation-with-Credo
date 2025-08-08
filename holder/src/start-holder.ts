import { HolderAgent } from "./holder-agent";
import * as readline from 'readline';

const holderAgent = new HolderAgent();

// 初始化 holder agent
async function initializeHolder() {
  try {
    await holderAgent.start();
    console.log("✅ Holder service ready");
    console.log("📱 Ready to receive credentials!");
    console.log("");
    
    // 顯示基本資訊
    const did = await holderAgent.getDid();
    console.log(`🆔 Holder DID: ${did}`);
    console.log("");
    
    // 設置互動界面
    setupInteractiveInterface();
  } catch (error) {
    console.error("❌ Failed to initialize holder:", error);
    process.exit(1);
  }
}

function setupInteractiveInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("請選擇操作:");
  console.log("1. 接收邀請 (輸入 invitation URL)");
  console.log("2. 查看憑證 (輸入 'credentials')");
  console.log("3. 查看連接 (輸入 'connections')"); 
  console.log("4. 查看狀態 (輸入 'status')");
  console.log("5. 退出 (輸入 'exit')");
  console.log("");

  const handleInput = async (input: string) => {
    const trimmed = input.trim();
    
    try {
      if (trimmed === 'exit') {
        console.log("正在關閉 holder agent...");
        await holderAgent.stop();
        rl.close();
        process.exit(0);
      } else if (trimmed === 'credentials') {
        const credentials = await holderAgent.getStoredCredentials();
        console.log(`\n📜 存儲的憑證 (${credentials.length}):`);
        if (credentials.length === 0) {
          console.log("  目前沒有憑證");
        } else {
          credentials.forEach((cred, index) => {
            console.log(`  ${index + 1}. ID: ${cred.credentialId}`);
            console.log(`     發證時間: ${cred.issuedAt}`);
            console.log(`     屬性: ${JSON.stringify(cred.attributes)}`);
            console.log('');
          });
        }
      } else if (trimmed === 'status') {
        const status = holderAgent.getStatus();
        console.log(`\n📊 Holder 狀態:`);
        console.log(`  初始化: ${status.initialized ? '是' : '否'}`);
      } else if (trimmed.startsWith('http') || trimmed.includes('oob=')) {
        console.log("\n📨 正在處理邀請...");
        await holderAgent.receiveInvitation(trimmed);
        console.log(`✅ 邀請已接收! 等待連接建立...`);
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

// 初始化 holder
initializeHolder().catch(console.error);

// 優雅關閉
process.on("SIGINT", async () => {
  console.log("Shutting down holder agent...");
  await holderAgent.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down holder agent...");
  await holderAgent.stop();
  process.exit(0);
});