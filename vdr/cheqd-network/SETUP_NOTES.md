# cheqd Local Network Setup Notes

This document records the actual steps for setting up a local cheqd network, problems encountered, and their solutions.

## Setup Steps

### 1. Obtain Official Configuration
```bash
cd vdr/
git clone https://github.com/cheqd/cheqd-node.git
cd cheqd-node/docker/localnet/
```

### 2. Download Required Docker Images
```bash
docker pull ghcr.io/cheqd/cheqd-node:latest
```

### 3. Generate Network Configuration
```bash
# Use Docker container to run configuration generation script (requires jq and cheqd-noded tools)
docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" \
  ghcr.io/cheqd/cheqd-node:latest \
  sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1"
```

**Parameter Explanation:**
- `cheqd-localnet`: Chain ID
- `4`: Number of validator nodes
- `1`: Number of seed nodes
- `1`: Number of observer nodes

### 4. Update Docker Compose Configuration
Edit `build-latest.env`:
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest
```

### 5. Start Network
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d
```

### 6. Verify Network Status
```bash
# Check if network is running properly
curl -s http://localhost:26657/status | jq '.result.sync_info'

# Check account balance
curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1eqt75k80sh3wcqz..." | jq '.balances'
```

## Problems Encountered and Solutions

### Problem 1: Missing jq Tool
**Error Message:**
```
./gen-network-config.sh: line 72: jq: command not found
```

**Cause:** 
The cheqd Docker image doesn't have the `jq` tool pre-installed, but the script needs it to process JSON configurations.

**Solution:**
```bash
# Use root privileges to install jq in the container
docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" \
  ghcr.io/cheqd/cheqd-node:latest \
  sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1 && ./import-keys.sh"
```

### Problem 2: Incorrect Docker Image Name
**Error Message:**
```
pull access denied for cheqd/cheqd-node, repository does not exist
```

**Cause:**
The image name `cheqd/cheqd-node:build-latest` in the official configuration file doesn't exist on Docker Hub.

**Solution:**
Use the correct GitHub Container Registry image:
```bash
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest
```

### Problem 3: Credo-TS Configuration Mismatch
**Error Messages:**
```
unknownError: Network not configured
unknownError: Invalid DID
```

**Cause:**
Inconsistency between local network DID namespace configuration and Credo-TS module configuration:
- Local network genesis file: `"did_namespace": "testnet"`
- Credo-TS configuration: `network: "localnet"`

**Solution:**
Use "testnet" consistently as the network name:

```typescript
// Correct configuration
cheqd: new CheqdModule({
  networks: [
    {
      network: "testnet",  // Match did_namespace in genesis file
      cosmosPayerSeed: "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
      rpcUrl: "http://localhost:26657",
    },
  ],
}),

// DID creation options
options: {
  network: "testnet",  // Keep consistent with CheqdModule
  methodSpecificIdAlgo: "uuid",
}
```

### Problem 4: TypeScript Type Error
**Error Message:**
```
Object literal may only specify known properties, and 'restUrl' does not exist in type 'NetworkConfig'
```

**Cause:**
The Credo-TS cheqd module doesn't support the `restUrl` parameter.

**Solution:**
Remove the unsupported parameter, keep only `rpcUrl`:
```typescript
{
  network: "testnet",
  cosmosPayerSeed: "...",
  rpcUrl: "http://localhost:26657",
  // restUrl: "http://localhost:1317",  // Remove this line
}
```

### Problem 5: Test Account Mnemonic Source
**Problem:** 
Unclear where the `cosmosPayerSeed` mnemonic comes from.

**Solution:**
Found predefined test mnemonics in lines 189-194 of `gen-network-config.sh` script:
```bash
mnemonics=(
  "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect"
  "useful case library girl narrow plate knee side supreme base horror fence tent glass leaf okay budget chalk patch forum coil crunch employ need"
  "slight oblige answer vault project symbol dismiss match match honey forum wood resist exotic inner close foil notice onion acquire sausage boost acquire produce"
  "prefer spring subject mimic shadow biology connect option east dirt security surge thrive kiwi nothing pulse holiday license hub pitch motion sunny pelican birth"
)
```
Each validator uses a different mnemonic, and the account corresponding to the first mnemonic has sufficient test tokens.

## Network Architecture Understanding

### Node vs Validator Relationship
- **Node**: Computer/container running blockchain software
- **Validator**: Special node that participates in consensus with staked tokens
- **Other Node Types**:
  - **Seed Node**: Helps new nodes discover other nodes in the network
  - **Observer Node**: Only syncs data, doesn't participate in consensus

### Mnemonic Allocation
- Each Validator uses an independent mnemonic to ensure decentralization
- Validator-0 uses `mnemonics[0]`
- Validator-1 uses `mnemonics[1]`
- And so on...
- SSI applications only need one account with tokens to pay transaction fees

## Success Indicators

### Network Level
```bash
# Blocks continuously generated
curl -s http://localhost:26657/status | jq '.result.sync_info.latest_block_height'

# Correct network ID
curl -s http://localhost:26657/status | jq '.result.node_info.network'
# Should return: "cheqd-localnet"
```

### SSI Application Level
```bash
# Run issuer test
npm run issuer

# Success messages should include:
# ✅ Agent initialized!
# ✅ Schema created: did:cheqd:testnet:...
# ✅ Credential Definition created: did:cheqd:testnet:...
# ✅ 🚀 Issuer Agent started successfully!
```

### DID Creation Test
```bash
# Run diagnostic test
npx ts-node diagnose-did-issue.ts

# Success message:
# ✅ 🎉 cheqd local network DID creation successful!
# 📍 DID: did:cheqd:testnet:xxx
```

## Common Operation Commands

### Network Management
```bash
# Start network
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d

# Stop network
docker compose down

# View logs
docker compose logs -f

# Reset network (delete all data)
docker compose down -v
rm -rf network-config
```

### Monitoring Commands
```bash
# Real-time monitor block height
watch -n 2 'curl -s http://localhost:26657/status | jq ".result.sync_info.latest_block_height"'

# View validator list
curl -s http://localhost:26657/validators | jq '.result.validators[].address'

# View network health status
curl http://localhost:26657/health
```

## Troubleshooting Quick Checklist

1. **Is Docker service running?**
   ```bash
   docker info
   ```

2. **Are ports occupied?**
   ```bash
   lsof -i :26657
   ```

3. **Is network fully started?**
   ```bash
   curl http://localhost:26657/status
   ```

4. **Is account balance sufficient?**
   ```bash
   curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1eqt75k80sh3wcqzkr07k0ynyydc5093276tudc"
   ```

5. **Is configuration consistent?**
   - CheqdModule network: "testnet"
   - DID creation options network: "testnet"
   - Genesis file did_namespace: "testnet"

## Summary

The key to setting up a local cheqd network is:
1. Using correct Docker images and tools
2. Ensuring network configuration consistency
3. Understanding node/validator relationships and mnemonic allocation
4. Properly configuring SSI application network parameters

After successful setup, you'll have a fully controllable SSI testing environment, suitable for developing and testing decentralized identity applications.