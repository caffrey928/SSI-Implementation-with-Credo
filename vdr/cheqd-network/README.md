# cheqd Local Network Usage Guide

This directory contains a complete cheqd local blockchain network for SSI (Self-Sovereign Identity) development and testing.

## Quick Start

### 1. Start Local Network

```bash
cd /path/to/vdr/cheqd-node/docker/localnet
BUILD_IMAGE=ghcr.io/cheqd/cheqd-node:latest docker compose up -d
```

### 2. Check Network Status

```bash
# Check block height and sync status
curl -s http://localhost:26657/status | jq '.result.sync_info'

# Check network information
curl -s http://localhost:26657/status | jq '.result.node_info.network'
```

### 3. Stop Network

```bash
cd /path/to/vdr/cheqd-node/docker/localnet
docker compose down
```

## Network Configuration

### Node Information
- **Chain ID**: `cheqd-localnet`
- **Number of Nodes**: 6 (4 validators + 1 seed + 1 observer)
- **Consensus Mechanism**: Tendermint BFT

### Endpoint Configuration

| Node | RPC Port | REST API Port | gRPC Port | gRPC-Gateway Port |
|------|----------|---------------|-----------|-------------------|
| Validator-0 | 26657 | 1317 | 9090 | 9091 |
| Validator-1 | 26757 | 1417 | 9190 | 9191 |
| Validator-2 | 26857 | 1517 | 9290 | 9291 |
| Validator-3 | 26957 | 1617 | 9390 | 9391 |
| Seed-0 | 27057 | 1717 | 9490 | 9491 |
| Observer-0 | 27157 | 1817 | 9590 | 9591 |

### Test Accounts

The network is pre-configured with the following test accounts:

```javascript
const testMnemonics = [
  "mix around destroy web fever address comfort vendor tank sudden abstract cabin acoustic attitude peasant hospital vendor harsh void current shield couple barrel suspect",
  "useful case library girl narrow plate knee side supreme base horror fence tent glass leaf okay budget chalk patch forum coil crunch employ need",
  "slight oblige answer vault project symbol dismiss match match honey forum wood resist exotic inner close foil notice onion acquire sausage boost acquire produce",
  "prefer spring subject mimic shadow biology connect option east dirt security surge thrive kiwi nothing pulse holiday license hub pitch motion sunny pelican birth"
];
```

The account corresponding to the first mnemonic has sufficient test tokens for paying transaction fees.

## Common Operations

### 1. Query Account Balance

```bash
# Using the first test account address
curl -s "http://localhost:1317/cosmos/bank/v1beta1/balances/cheqd1rnr5jrt4exl0samwj0yegv99jeskl0hsxmcz96"
```

### 2. Query DID Document

```bash
# Query specific DID
curl -s "http://localhost:1317/cheqd/did/v2/did-documents/{did-id}"
```

### 3. Monitor Network Status

```bash
# Real-time view of block generation
watch -n 2 'curl -s http://localhost:26657/status | jq ".result.sync_info.latest_block_height"'

# View validators in the network
curl -s http://localhost:26657/validators | jq '.result.validators[].address'
```

### 4. View Logs

```bash
# View all container logs
docker compose logs -f

# View specific node logs
docker compose logs -f validator-0
```

## Development Integration

### Usage in Credo-TS

Modify your CheqdModule configuration:

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

### DID Creation Options

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

## Troubleshooting

### Network Won't Start

1. Check if Docker is running:
   ```bash
   docker info
   ```

2. Check if ports are occupied:
   ```bash
   lsof -i :26657
   ```

3. Regenerate network configuration:
   ```bash
   rm -rf network-config
   docker run --rm -v "$(pwd)":/workspace -w /workspace --user root --entrypoint="" ghcr.io/cheqd/cheqd-node:latest sh -c "apk add --no-cache jq && ./gen-network-config.sh cheqd-localnet 4 1 1"
   ```

### Transaction Failures

1. Check if account balance is sufficient
2. Confirm using correct chain-id: `cheqd-localnet`
3. Check gas fee settings

### Connection Issues

1. Confirm network is fully started (wait 15-30 seconds)
2. Check firewall settings
3. Verify endpoints are reachable:
   ```bash
   curl http://localhost:26657/health
   ```

## Advanced Configuration

### Modify Network Parameters

To modify the number of validators or other network parameters, edit and re-run:

```bash
./gen-network-config.sh <chain-id> <validators> <seeds> <observers>
```

### Custom Genesis Accounts

Edit the `configure_genesis` function in `gen-network-config.sh` to add custom accounts and balances.

### Network Reset

Complete network reset (will delete all data):

```bash
docker compose down -v
rm -rf network-config
# Regenerate configuration and start
```

## Related Resources

- [cheqd Official Documentation](https://docs.cheqd.io)
- [Credo-TS cheqd Guide](https://credo.js.org/guides/getting-started/set-up/cheqd)
- [Cosmos SDK Documentation](https://docs.cosmos.network)