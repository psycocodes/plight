# Protocol Configuration

This directory contains the external JSON configuration for protocol deployments.

## Files

### `contracts.json`
**Canonical registry of all protocol deployment addresses across chains.**

**Structure:**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-12-26",
  "protocols": {
    "[protocol_name]": {
      "[primitive]": {
        "[chainId]": {
          "[contractName]": "0x...",
          "source": "https://docs...",
          "verified": "https://etherscan.io/..."
        }
      }
    }
  },
  "applicability": {
    "[primitive]": {
      "[protocol_name]": [chainId1, chainId2, ...]
    }
  }
}
```

**Usage:**
- Loaded by `protocol_matrix.ts` at build time
- Provides single source of truth for all contract addresses
- Includes verification links for auditing

**Benefits:**
- ✅ Easy to update without code changes
- ✅ Includes source documentation links
- ✅ Includes block explorer verification links
- ✅ Validated against JSON Schema
- ✅ Version tracked

### `contracts.schema.json`
**JSON Schema for validating contracts.json**

Ensures:
- All addresses are valid Ethereum addresses (0x + 40 hex chars)
- All required fields are present
- Version follows semver format
- Dates are in YYYY-MM-DD format
- URLs are valid

## Adding New Protocols

1. **Add to `protocol_addresses.json`:**
```json
{
  "protocols": {
    "new_protocol": {
      "lending": {
        "1": {
          "pool": "0x...",
          "source": "https://docs.newprotocol.com/",
          "verified": "https://etherscan.io/address/0x..."
        }
      }
    }
  },
  "applicability": {
    "lending": {
      "new_protocol": [1]
    }
  }
}
```

2. **Verify JSON Schema compliance:**
```bash
# Use a JSON Schema validator
jsonschema -i contracts.json contracts.schema.json
```

3. **Rebuild:**
```bash
npm run build
```

4. **Create adapter:**
- Follow existing adapter patterns
- Use `getProtocolAddress('new_protocol', 'lending', chainId, 'pool')`

## Updating Addresses

1. **Edit `contracts.json`**
2. **Update `lastUpdated` field**
3. **Increment `version` if major changes**
4. **Add verification links**
5. **Rebuild and test**

## Validation

The JSON file is validated at build time by TypeScript's JSON module resolution.

Runtime validation can be added using AJV:
```typescript
import Ajv from 'ajv';
import schema from './contracts.schema.json';
import config from './contracts.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(config);
```

## Chain IDs Reference

| Chain ID | Network | Explorer |
|----------|---------|----------|
| 1 | Ethereum | etherscan.io |
| 10 | Optimism | optimistic.etherscan.io |
| 137 | Polygon | polygonscan.com |
| 8453 | Base | basescan.org |
| 42161 | Arbitrum | arbiscan.io |
| 43114 | Avalanche | snowtrace.io |

## Best Practices

1. **Always verify addresses** on block explorers before adding
2. **Include source documentation** links for auditability
3. **Test on testnets first** when possible
4. **Update version number** for breaking changes
5. **Keep verification links** up to date
6. **Document any special cases** in comments (not supported in JSON, use separate docs)

## Security

⚠️ **Critical:** All addresses in this file are used directly by the aggregation engine.

- Verify all addresses before deployment
- Use official documentation sources
- Cross-reference with block explorers
- Test with small amounts first
- Review changes carefully in PRs

## Maintenance

**Regular tasks:**
- [ ] Verify addresses are still current (quarterly)
- [ ] Check for new protocol deployments
- [ ] Update verification links if explorers change
- [ ] Test on new chains as they're added
- [ ] Keep documentation in sync

**When protocols upgrade:**
1. Add new version as separate protocol (e.g., `aave_v4`)
2. Keep old version for historical data
3. Update applicability matrix
4. Document migration path

## Example: Adding Aave v3 on New Chain

```json
{
  "protocols": {
    "aave_v3": {
      "lending": {
        // ... existing chains
        "59144": {
          "pool": "0x...",
          "source": "https://docs.aave.com/developers/deployed-contracts/v3-mainnet",
          "verified": "https://lineascan.build/address/0x..."
        }
      }
    }
  },
  "applicability": {
    "lending": {
      "aave_v3": [1, 10, 137, 8453, 42161, 43114, 59144]
    }
  }
}
```

Then rebuild and the new chain is automatically available to all adapters!
