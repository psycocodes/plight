// Simple in-memory storage for MVP
// In production, swap this for Redis or a DB adapter.

// Set of revoked Attestation Hashes
const revokedHashes = new Set<string>();

export const revocationStorage = {
  isRevoked: async (hash: string): Promise<boolean> => {
    return revokedHashes.has(hash);
  },

  revoke: async (hash: string, reason?: string): Promise<void> => {
    revokedHashes.add(hash);
    console.log(`[Storage] Revoked hash: ${hash} (Reason: ${reason || 'Manual'})`);
  },
  
  // Debug helper
  getAll: () => Array.from(revokedHashes)
};
