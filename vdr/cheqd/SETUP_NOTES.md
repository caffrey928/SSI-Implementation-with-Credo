# cheqd Local Network 建立筆記

本文件記錄建立本地 cheqd 網路的實際步驟、遇到的問題及解決方式。

## 建立步驟

### 1. 獲取官方配置
```bash
cd vdr/
git clone https://github.com/cheqd/cheqd-node.git
cd cheqd-node/docker/localnet/
```

### 2. 下載所需 Docker 映像
```bash
docker pull ghcr.io/cheqd/cheqd-node:latest
```

### 3. 生成網路配置
```bash
# 使用 Docker 容器運行配置生成腳本（因為需要 jq 和 cheqd-noded 工具）
docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" \
  ghcr.io/cheqd/cheqd-node:latest \
  sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1"
```

**參數說明：**
- `cheqd-localnet`: Chain ID
- `4`: 驗證者節點數量
- `1`: 種子節點數量  
- `1`: 觀察者節點數量

### 4. 更新 Docker Compose 配置
編輯 `build-latest.env`：
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest
```

### 5. 啟動網路
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d
```

### 6. 驗證網路狀態
```bash
# 檢查網路是否正常運行
curl -s http://localhost:26657/status | jq '.result.sync_info'

# 檢查帳戶餘額
curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1eqt75k80sh3wcqz..." | jq '.balances'
```

## 遇到的問題與解決方式

### 問題 1: jq 工具缺失
**錯誤訊息：**
```
./gen-network-config.sh: line 72: jq: command not found
```

**原因：** 
cheqd Docker 映像中沒有預裝 `jq` 工具，但腳本需要用它來處理 JSON 配置。

**解決方式：**
```bash
# 使用 root 權限在容器中安裝 jq
docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" \
  ghcr.io/cheqd/cheqd-node:latest \
  sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1 && ./import-keys.sh"
```

### 問題 2: Docker 映像名稱不正確
**錯誤訊息：**
```
pull access denied for cheqd/cheqd-node, repository does not exist
```

**原因：**
官方配置文件中的映像名稱 `cheqd/cheqd-node:build-latest` 不存在於 Docker Hub。

**解決方式：**
使用正確的 GitHub Container Registry 映像：
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest
```

### 問題 3: Credo-TS 配置不匹配
**錯誤訊息：**
```
unknownError: Network not configured
unknownError: Invalid DID
```

**原因：**
本地網路的 DID 命名空間配置與 Credo-TS 模組配置不一致：
- 本地網路創世文件：`"did_namespace": "testnet"`
- Credo-TS 配置：`network: "localnet"`

**解決方式：**
統一使用 "testnet" 作為網路名稱：

```typescript
// 正確的配置
cheqd: new CheqdModule({
  networks: [
    {
      network: "testnet",  // 匹配創世文件中的 did_namespace
      cosmosPayerSeed: "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
      rpcUrl: "http://localhost:26657",
    },
  ],
}),

// DID 創建選項
options: {
  network: "testnet",  // 與 CheqdModule 保持一致
  methodSpecificIdAlgo: "uuid",
}
```

### 問題 4: TypeScript 類型錯誤
**錯誤訊息：**
```
Object literal may only specify known properties, and 'restUrl' does not exist in type 'NetworkConfig'
```

**原因：**
Credo-TS cheqd 模組不支援 `restUrl` 參數。

**解決方式：**
移除不支援的參數，只保留 `rpcUrl`：
```typescript
{
  network: "testnet",
  cosmosPayerSeed: "...",
  rpcUrl: "http://localhost:26657",
  // restUrl: "http://localhost:1317",  // 移除此行
}
```

### 問題 5: 測試帳戶助記詞來源
**問題：** 
不清楚 `cosmosPayerSeed` 的助記詞從何而來。

**解決方式：**
查看 `gen-network-config.sh` 腳本第 189-194 行，發現預定義的測試助記詞：
```bash
mnemonics=(
  "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect"
  "useful case library girl narrow plate knee side supreme base horror fence tent glass leaf okay budget chalk patch forum coil crunch employ need"
  "slight oblige answer vault project symbol dismiss match match honey forum wood resist exotic inner close foil notice onion acquire sausage boost acquire produce"
  "prefer spring subject mimic shadow biology connect option east dirt security surge thrive kiwi nothing pulse holiday license hub pitch motion sunny pelican birth"
)
```
每個驗證者使用不同的助記詞，第一個助記詞對應的帳戶有足夠的測試代幣。

## 網路架構理解

### Node vs Validator 關係
- **Node（節點）**: 運行區塊鏈軟體的電腦/容器
- **Validator（驗證者）**: 參與共識的特殊節點，有質押代幣
- **其他節點類型**:
  - **Seed Node**: 幫助新節點發現網路中的其他節點
  - **Observer Node**: 只同步數據，不參與共識

### 助記詞分配
- 每個 Validator 使用獨立的助記詞確保去中心化
- Validator-0 使用 `mnemonics[0]`
- Validator-1 使用 `mnemonics[1]`
- 以此類推...
- SSI 應用只需要一個有代幣的帳戶來支付交易費用

## 成功指標

### 網路層面
```bash
# 區塊持續生成
curl -s http://localhost:26657/status | jq '.result.sync_info.latest_block_height'

# 網路 ID 正確
curl -s http://localhost:26657/status | jq '.result.node_info.network'
# 應該返回: "cheqd-localnet"
```

### SSI 應用層面
```bash
# 執行 issuer 測試
npm run issuer

# 成功訊息應包含：
# ✅ Agent initialized!
# ✅ Schema created: did:cheqd:testnet:...
# ✅ Credential Definition created: did:cheqd:testnet:...
# ✅ 🚀 Issuer Agent started successfully!
```

### DID 創建測試
```bash
# 執行診斷測試
npx ts-node diagnose-did-issue.ts

# 成功訊息：
# ✅ 🎉 cheqd 本地網路 DID 創建成功！
# 📍 DID: did:cheqd:testnet:xxx
```

## 常用操作指令

### 網路管理
```bash
# 啟動網路
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d

# 停止網路
docker compose down

# 查看日誌
docker compose logs -f

# 重置網路（刪除所有數據）
docker compose down -v
rm -rf network-config
```

### 監控指令
```bash
# 實時監控區塊高度
watch -n 2 'curl -s http://localhost:26657/status | jq ".result.sync_info.latest_block_height"'

# 查看驗證者列表
curl -s http://localhost:26657/validators | jq '.result.validators[].address'

# 查看網路健康狀態
curl http://localhost:26657/health
```

## 疑難排解快速檢查清單

1. **Docker 服務是否運行？**
   ```bash
   docker info
   ```

2. **端口是否被佔用？**
   ```bash
   lsof -i :26657
   ```

3. **網路是否完全啟動？**
   ```bash
   curl http://localhost:26657/status
   ```

4. **帳戶餘額是否充足？**
   ```bash
   curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1eqt75k80sh3wcqzkr07k0ynyydc5093276tudc"
   ```

5. **配置是否一致？**
   - CheqdModule network: "testnet"
   - DID 創建 options network: "testnet"
   - 創世文件 did_namespace: "testnet"

## 總結

建立本地 cheqd 網路的關鍵是：
1. 使用正確的 Docker 映像和工具
2. 確保網路配置的一致性
3. 理解 node/validator 的關係和助記詞分配
4. 正確配置 SSI 應用的網路參數

成功建立後，你將擁有一個完全可控的 SSI 測試環境，適合開發和測試去中心化身份應用。