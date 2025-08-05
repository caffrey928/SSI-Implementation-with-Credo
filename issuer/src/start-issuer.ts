import { IssuerAgent } from './issuer-agent';
import { StudentCredential } from './types';

async function main() {
  const issuerAgent = new IssuerAgent();
  
  try {
    // 啟動 Issuer Agent
    await issuerAgent.start();
    
    // 示例：創建學生憑證 offer
    const exampleStudent: StudentCredential = {
      id: "student-001",
      name: "張三",
      studentId: "STU2024001",
      university: "台灣大學",
      isStudent: true,
      birthDate: "2000-01-01"
    };
    
    console.log('\n📋 Example usage:');
    console.log('To create a credential offer for a student, call:');
    console.log('const offer = await issuerAgent.createCredentialOffer(studentInfo);');
    console.log('\n🔗 The generated invitation URL can be scanned by a holder wallet');
    
    // 示例創建憑證 offer
    setTimeout(async () => {
      try {
        const offer = await issuerAgent.createCredentialOffer(exampleStudent);
        console.log('\n✅ Example credential offer created:');
        console.log(`🔗 Invitation URL: ${offer.invitationUrl}`);
        console.log(`🆔 OutOfBand ID: ${offer.outOfBandId}`);
        console.log(`👤 Student: ${offer.studentInfo.name}`);
      } catch (error) {
        console.error('❌ Error creating example offer:', error);
      }
    }, 3000);
    
    // 處理程序退出
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Issuer Agent...');
      await issuerAgent.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Issuer Agent:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };