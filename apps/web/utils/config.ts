
// Fallback configuration since .env.local is gitignored in this environment
// In production, these should be environment variables.

export const PROTOCOL_ADDRESS = process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS || "0xB223BeC6DB3cBfC88418024Eb18F76aE1a70F3A8";
export const DEBUG_MODE = true;
