# cheqd Local Network 使用指南

本目錄包含一個完整的 cheqd 本地區塊鏈網路，用於 SSI (Self-Sovereign Identity) 開發和測試。

## 快速啟動

### 1. 啟動本地網路

```bash
cd /path/to/vdr/cheqd-node/docker/localnet
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d
```

### 2. 檢查網路狀態

```bash
# 檢查區塊高度和同步狀態
curl -s http://localhost:26657/status | jq '.result.sync_info'

# 檢查網路信息
curl -s http://localhost:26657/status | jq '.result.node_info.network'
```

### 3. 停止網路

```bash
cd /path/to/vdr/cheqd-node/docker/localnet
docker compose down
```

## 網路配置

### 節點信息
- **Chain ID**: `cheqd-localnet`
- **節點數量**: 6 個 (4個驗證者 + 1個種子 + 1個觀察者)
- **共識機制**: Tendermint BFT

### 端點配置

| 節點 | RPC 端口 | REST API 端口 | gRPC 端口 | gRPC-Gateway 端口 |
|------|----------|---------------|-----------|-------------------|
| Validator-0 | 26657 | 1317 | 9090 | 9091 |
| Validator-1 | 26757 | 1417 | 9190 | 9191 |
| Validator-2 | 26857 | 1517 | 9290 | 9291 |
| Validator-3 | 26957 | 1617 | 9390 | 9391 |
| Seed-0 | 27057 | 1717 | 9490 | 9491 |
| Observer-0 | 27157 | 1817 | 9590 | 9591 |

### 測試帳戶

網路預先配置了以下測試帳戶：

```javascript
const testMnemonics = [
  "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
  "useful case library girl narrow plate knee side supreme base horror fence tent glass leaf okay budget chalk patch forum coil crunch employ need",
  "slight oblige answer vault project symbol dismiss match match honey forum wood resist exotic inner close foil notice onion acquire sausage boost acquire produce",
  "prefer spring subject mimic shadow biology connect option east dirt security surge thrive kiwi nothing pulse holiday license hub pitch motion sunny pelican birth"
];
```

第一個助記詞對應的帳戶有充足的測試代幣，可用於支付交易費用。

## 常用操作

### 1. 查詢帳戶餘額

```bash
# 使用第一個測試帳戶地址
curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1rnr5jrt4exl0samwj0yegv99jeskl0hsxmcz96"
```

### 2. 查詢 DID 文檔

```bash
# 查詢特定 DID
curl -s "http://localhost:1317/cheqd/did/v2/did-documents/{did-id}"
```

### 3. 監控網路狀態

```bash
# 實時查看區塊生成
watch -n 2 'curl -s http://localhost:26657/status | jq ".result.sync_info.latest_block_height"'

# 查看網路中的驗證者
curl -s http://localhost:26657/validators | jq '.result.validators[].address'
```

### 4. 查看日誌

```bash
# 查看所有容器日誌
docker compose logs -f

# 查看特定節點日誌
docker compose logs -f validator-0
```

## 開發整合

### 在 Credo-TS 中使用

修改你的 CheqdModule 配置：

```typescript
cheqd: new CheqdModule({
  networks: [
    {
      network: "localnet",
      cosmosPayerSeed: "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
      rpcUrl: "http://localhost:26657",
    },
  ],
}),
```

### DID 創建選項

```typescript
const didResult = await agent.dids.create({
  method: "cheqd",
  secret: {
    verificationMethod: {
      id: "key-1",
      type: "Ed25519VerificationKey2020",
    },
  },
  options: {
    network: "localnet",
    methodSpecificIdAlgo: "uuid",
  },
});
```

## 疑難排解

### 網路無法啟動

1. 檢查 Docker 是否正在運行：
   ```bash
   docker info
   ```

2. 檢查端口是否被佔用：
   ```bash
   lsof -i :26657
   ```

3. 重新生成網路配置：
   ```bash
   rm -rf network-config
   docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" ghcr.io/cheqd/cheqd-node:latest sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1"
   ```

### 交易失敗

1. 檢查帳戶餘額是否足夠
2. 確認使用正確的 chain-id: `cheqd-localnet`
3. 檢查 gas 費用設置

### 連接問題

1. 確認網路已完全啟動（等待 15-30 秒）
2. 檢查防火牆設置
3. 驗證端點是否可達：
   ```bash
   curl http://localhost:26657/health
   ```

## 進階配置

### 修改網路參數

如需修改驗證者數量或其他網路參數，編輯並重新執行：

```bash
./gen-network-config.sh <chain-id> <validators> <seeds> <observers>
```

### 自定義創世帳戶

編輯 `gen-network-config.sh` 中的 `configure_genesis` 函數來添加自定義帳戶和餘額。

### 網路重置

完全重置網路（將刪除所有數據）：

```bash
docker compose down -v
rm -rf network-config
# 重新生成配置和啟動
```

## 相關資源

- [cheqd 官方文檔](https://docs.cheqd.io)
- [Credo-TS cheqd 指南](https://credo.js.org/guides/getting-started/set-up/cheqd)
- [Cosmos SDK 文檔](https://docs.cosmos.network)