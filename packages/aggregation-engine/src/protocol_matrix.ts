// Canonical Protocol Deployment Address Matrix
// Loaded from external JSON configuration for easy updates
// Last verified: December 2024

import protocolConfig from './config/contracts.json';

export interface ProtocolAddresses {
  [protocol: string]: {
    [primitive: string]: {
      [chainId: number]: {
        [contractName: string]: string;
      };
    };
  };
}

export interface ProtocolApplicability {
  lending: {
    [protocol: string]: number[];
  };
  dex: {
    [protocol: string]: number[];
  };
  yield: {
    [protocol: string]: number[];
  };
  governance: {
    [protocol: string]: number[];
  };
}

// Transform JSON config to runtime format
function transformProtocolAddresses(): ProtocolAddresses {
  const result: ProtocolAddresses = {};
  
  for (const [protocol, primitives] of Object.entries(protocolConfig.protocols)) {
    result[protocol] = {};
    
    for (const [primitive, chains] of Object.entries(primitives as Record<string, any>)) {
      result[protocol][primitive] = {};
      
      for (const [chainId, contracts] of Object.entries(chains as Record<string, any>)) {
        const chainNum = parseInt(chainId);
        result[protocol][primitive][chainNum] = {};
        
        // Extract only contract addresses (exclude source/verified metadata)
        for (const [key, value] of Object.entries(contracts as Record<string, any>)) {
          if (key !== 'source' && key !== 'verified' && typeof value === 'string') {
            result[protocol][primitive][chainNum][key] = value;
          }
        }
      }
    }
  }
  
  return result;
}

// Load protocol addresses from JSON config
export const PROTOCOL_ADDRESSES: ProtocolAddresses = transformProtocolAddresses();

// Load applicability matrix from JSON config
export const PROTOCOL_MATRIX: ProtocolApplicability = protocolConfig.applicability as ProtocolApplicability;

export function isProtocolApplicable(
  primitive: keyof ProtocolApplicability,
  protocol: string,
  chainId: number
): boolean {
  const protocols = PROTOCOL_MATRIX[primitive] as Record<string, number[]>;
  const chains = protocols[protocol];
  return chains ? chains.includes(chainId) : false;
}

export function getApplicableProtocols(
  primitive: keyof ProtocolApplicability,
  chainId: number
): string[] {
  const protocols = PROTOCOL_MATRIX[primitive] as Record<string, number[]>;
  return Object.entries(protocols)
    .filter(([_, chains]) => chains.includes(chainId))
    .map(([protocol, _]) => protocol);
}

export function getProtocolAddress(
  protocol: string,
  primitive: string,
  chainId: number,
  contractName: string
): string {
  const protocolData = PROTOCOL_ADDRESSES[protocol];
  if (!protocolData) {
    throw new Error(`Unknown protocol: ${protocol}`);
  }

  const primitiveData = protocolData[primitive];
  if (!primitiveData) {
    throw new Error(`Protocol ${protocol} does not support primitive: ${primitive}`);
  }

  const chainData = primitiveData[chainId];
  if (!chainData) {
    throw new Error(`Protocol ${protocol} not deployed on chain ${chainId}`);
  }

  const address = chainData[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not found for ${protocol} on chain ${chainId}`);
  }

  return address;
}
